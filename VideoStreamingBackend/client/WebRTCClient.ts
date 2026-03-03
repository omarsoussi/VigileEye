/**
 * WebRTC Client – Browser-side module for consuming camera streams via mediasoup SFU.
 *
 * Usage:
 * ```ts
 * import { WebRTCClient } from './WebRTCClient';
 *
 * const client = new WebRTCClient({
 *   signalingUrl: 'ws://localhost:8003/ws/signaling/CAMERA_UUID',
 *   token: 'jwt-token',
 *   onTrack: (track, kind) => {
 *     const video = document.getElementById('video') as HTMLVideoElement;
 *     if (kind === 'video') {
 *       video.srcObject = new MediaStream([track]);
 *     }
 *   },
 *   onStats: (stats) => console.log('FPS:', stats.current_fps),
 *   onStateChange: (state) => console.log('Connection state:', state),
 * });
 *
 * await client.connect();
 * // ...later
 * client.disconnect();
 * ```
 *
 * Requires: mediasoup-client (npm install mediasoup-client)
 */

import { Device, types as msTypes } from 'mediasoup-client';

// ─── Types ──────────────────────────────────────────────────────

export type ConnectionState =
  | 'new'
  | 'connecting'
  | 'connected'
  | 'reconnecting'
  | 'disconnected'
  | 'failed';

export interface WebRTCClientOptions {
  /** Full WebSocket URL: ws(s)://host:port/ws/signaling/:cameraId?token=JWT */
  signalingUrl: string;
  /** JWT bearer token (appended as ?token= query param if not already in URL) */
  token: string;
  /** Called when a media track is received from the SFU */
  onTrack?: (track: MediaStreamTrack, kind: 'video' | 'audio') => void;
  /** Called periodically with real-time stream statistics */
  onStats?: (stats: StreamStats) => void;
  /** Called when the connection state changes */
  onStateChange?: (state: ConnectionState) => void;
  /** Called on unrecoverable error */
  onError?: (error: Error) => void;
  /** ICE servers override (fetched from REST if not provided) */
  iceServers?: RTCIceServer[];
  /** Max auto-reconnect attempts (default: 5) */
  maxReconnectAttempts?: number;
}

export interface StreamStats {
  camera_id: string;
  current_fps: number;
  viewer_count: number;
  has_audio: boolean;
  status: string;
  uptime: number;
  bitrate: number;
}

interface SignalingMessage {
  type: string;
  [key: string]: unknown;
}

// ─── Client ─────────────────────────────────────────────────────

export class WebRTCClient {
  private opts: Required<
    Pick<WebRTCClientOptions, 'maxReconnectAttempts'>
  > & WebRTCClientOptions;

  private ws: WebSocket | null = null;
  private device: Device | null = null;
  private recvTransport: msTypes.Transport | null = null;
  private videoConsumer: msTypes.Consumer | null = null;
  private audioConsumer: msTypes.Consumer | null = null;

  private state: ConnectionState = 'new';
  private reconnectAttempts = 0;
  private reconnectTimer: ReturnType<typeof setTimeout> | null = null;

  // Track pending promises keyed by signaling message type
  private pending = new Map<
    string,
    { resolve: (data: any) => void; reject: (err: Error) => void }
  >();

  constructor(opts: WebRTCClientOptions) {
    this.opts = {
      maxReconnectAttempts: 5,
      ...opts,
    };
  }

  // ─── Public API ─────────────────────────────────────────────

  /** Initiate WebRTC connection to the camera stream. */
  async connect(): Promise<void> {
    this.setState('connecting');
    this.reconnectAttempts = 0;
    await this.openSignaling();
  }

  /** Gracefully disconnect. */
  disconnect(): void {
    this.cleanup();
    this.setState('disconnected');
  }

  /** Current connection state. */
  getState(): ConnectionState {
    return this.state;
  }

  // ─── Signaling ──────────────────────────────────────────────

  private openSignaling(): Promise<void> {
    return new Promise((resolve, reject) => {
      const url = this.buildUrl();
      this.ws = new WebSocket(url);

      this.ws.onopen = () => {
        // Server will push router-rtp-capabilities automatically
        resolve();
      };

      this.ws.onmessage = (ev) => this.handleMessage(ev);

      this.ws.onerror = (ev) => {
        const err = new Error('WebSocket error');
        this.opts.onError?.(err);
        reject(err);
      };

      this.ws.onclose = () => {
        if (this.state === 'connected' || this.state === 'connecting') {
          this.attemptReconnect();
        }
      };
    });
  }

  private buildUrl(): string {
    let url = this.opts.signalingUrl;
    if (!url.includes('token=')) {
      const sep = url.includes('?') ? '&' : '?';
      url += `${sep}token=${encodeURIComponent(this.opts.token)}`;
    }
    return url;
  }

  private send(msg: SignalingMessage): void {
    if (this.ws?.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify(msg));
    }
  }

  /**
   * Send a signaling message and wait for a response of the given type.
   */
  private request(msg: SignalingMessage, responseType: string): Promise<any> {
    return new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        this.pending.delete(responseType);
        reject(new Error(`Timeout waiting for ${responseType}`));
      }, 10_000);

      this.pending.set(responseType, {
        resolve: (data) => {
          clearTimeout(timeout);
          resolve(data);
        },
        reject: (err) => {
          clearTimeout(timeout);
          reject(err);
        },
      });

      this.send(msg);
    });
  }

  // ─── Message handling ───────────────────────────────────────

  private async handleMessage(ev: MessageEvent): Promise<void> {
    let msg: SignalingMessage;
    try {
      msg = JSON.parse(ev.data);
    } catch {
      return;
    }

    // Resolve any pending promise for this message type
    const pending = this.pending.get(msg.type);
    if (pending) {
      this.pending.delete(msg.type);
      pending.resolve(msg);
    }

    switch (msg.type) {
      case 'router-rtp-capabilities':
        await this.onRouterCapabilities(msg);
        break;

      case 'stream-stats':
        this.opts.onStats?.(msg as unknown as StreamStats);
        break;

      case 'error':
        this.opts.onError?.(new Error((msg as any).message || 'Server error'));
        break;

      case 'pong':
        // Keepalive acknowledgement
        break;
    }
  }

  // ─── WebRTC negotiation flow ────────────────────────────────

  /**
   * Step 1: Receive router RTP capabilities → load mediasoup Device.
   */
  private async onRouterCapabilities(msg: SignalingMessage): Promise<void> {
    try {
      const routerRtpCapabilities = msg.routerRtpCapabilities as msTypes.RtpCapabilities;
      const producerIds = msg.producerIds as { video?: string; audio?: string };

      // Create and load the mediasoup Device
      this.device = new Device();
      await this.device.load({ routerRtpCapabilities });

      // Step 2: Create receive transport
      await this.createRecvTransport();

      // Step 3: Consume available producers
      if (producerIds?.video) {
        await this.consume(producerIds.video, 'video');
      }
      if (producerIds?.audio) {
        await this.consume(producerIds.audio, 'audio');
      }

      this.setState('connected');
      this.reconnectAttempts = 0;
    } catch (err) {
      this.opts.onError?.(err as Error);
      this.setState('failed');
    }
  }

  /**
   * Step 2: Ask server to create a WebRtcTransport, then connect locally.
   */
  private async createRecvTransport(): Promise<void> {
    if (!this.device) throw new Error('Device not loaded');

    // Ask server to create a server-side transport
    const response = await this.request(
      { type: 'create-transport', direction: 'recv' },
      'transport-created',
    );

    const {
      transportId,
      iceParameters,
      iceCandidates,
      dtlsParameters: serverDtls,
    } = response;

    // Build ICE servers list
    const iceServers = this.opts.iceServers ?? [
      { urls: 'stun:stun.l.google.com:19302' },
    ];

    // Create local receive transport (mediasoup-client)
    this.recvTransport = this.device.createRecvTransport({
      id: transportId,
      iceParameters,
      iceCandidates,
      dtlsParameters: serverDtls,
      iceServers,
    });

    // When the transport needs to finish the DTLS handshake,
    // send our local DTLS parameters to the server.
    this.recvTransport.on('connect', ({ dtlsParameters }, callback, errback) => {
      this.request(
        {
          type: 'connect-transport',
          transportId,
          dtlsParameters,
        },
        'transport-connected',
      )
        .then(() => callback())
        .catch(errback);
    });

    this.recvTransport.on('connectionstatechange', (state: string) => {
      if (state === 'failed') {
        this.opts.onError?.(new Error('Transport connection failed'));
        this.attemptReconnect();
      }
    });
  }

  /**
   * Step 3: Consume a producer (video or audio) from the SFU.
   */
  private async consume(producerId: string, kind: 'video' | 'audio'): Promise<void> {
    if (!this.device || !this.recvTransport) {
      throw new Error('Transport not ready');
    }

    const response = await this.request(
      {
        type: 'consume',
        producerId,
        rtpCapabilities: this.device.rtpCapabilities,
      },
      'consumer-created',
    );

    const { consumerId, producerId: pid, rtpParameters, kind: consumerKind } = response;

    const consumer = await this.recvTransport.consume({
      id: consumerId,
      producerId: pid,
      kind: consumerKind,
      rtpParameters,
    });

    if (kind === 'video') {
      this.videoConsumer = consumer;
    } else {
      this.audioConsumer = consumer;
    }

    // Tell server to resume (consumers start paused by default)
    this.send({ type: 'consumer-resume', consumerId });

    // Deliver the track to the application
    this.opts.onTrack?.(consumer.track, kind);
  }

  // ─── Reconnection ──────────────────────────────────────────

  private attemptReconnect(): void {
    if (this.state === 'disconnected') return;

    if (this.reconnectAttempts >= this.opts.maxReconnectAttempts) {
      this.setState('failed');
      this.opts.onError?.(new Error('Max reconnect attempts reached'));
      this.cleanup();
      return;
    }

    this.setState('reconnecting');
    this.reconnectAttempts++;

    const delay = Math.min(1000 * 2 ** this.reconnectAttempts, 15000);

    this.reconnectTimer = setTimeout(async () => {
      this.closeTransports();
      try {
        await this.openSignaling();
      } catch {
        this.attemptReconnect();
      }
    }, delay);
  }

  // ─── Helpers ────────────────────────────────────────────────

  private setState(s: ConnectionState): void {
    if (this.state === s) return;
    this.state = s;
    this.opts.onStateChange?.(s);
  }

  private closeTransports(): void {
    try { this.videoConsumer?.close(); } catch {}
    try { this.audioConsumer?.close(); } catch {}
    try { this.recvTransport?.close(); } catch {}
    this.videoConsumer = null;
    this.audioConsumer = null;
    this.recvTransport = null;
  }

  private cleanup(): void {
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }
    this.closeTransports();
    if (this.ws) {
      this.ws.onclose = null; // prevent reconnect loop
      this.ws.close();
      this.ws = null;
    }
    this.pending.clear();
    this.device = null;
  }
}

# VigileEye Video Streaming Service — WebRTC Architecture

## 1. SFU Choice: mediasoup

### Why mediasoup over Janus / LiveKit / Pion?

| Criterion | mediasoup | Janus | LiveKit | Pion |
|---|---|---|---|---|
| **Language** | Node.js (C++ worker) | C + Lua/JS | Go | Go |
| **Integration** | Native npm, same runtime as our app | Separate daemon, REST/WS API | Separate binary, gRPC | Library, no server |
| **Latency** | Sub-200ms | 200-500ms | 200-500ms | Depends on impl |
| **CPU efficiency** | C++ media workers, no transcoding | Good but monolithic | Excellent but overkill | Manual |
| **Clean Architecture fit** | Perfect — it's a library, not a daemon | Poor — requires separate process | Medium — gRPC coupling | Good but too low-level |
| **Scaling model** | Per-worker, multi-process per machine | Plugin-based | Redis + multi-node | DIY |
| **Community** | Large, production-proven (Oulu, Twitch) | Large | Growing | Medium |
| **Docker** | Single Node container | Needs Janus container | Needs LiveKit container | N/A |
| **RTSP ingest** | FFmpeg → RTP → PlainTransport | Native plugin | Ingress server | DIY |

**Decision: mediasoup** — It's a Node.js-native SFU library that runs in our existing process. No separate daemon. No gRPC. No plugin system. Just `npm install mediasoup` and we have a production-grade C++ SFU with WebRTC support, DTLS-SRTP, simulcast, and RTP routing. This keeps our Clean Architecture intact — mediasoup becomes an infrastructure dependency, not an external service.

---

## 2. High-Level Architecture

```
┌──────────────────────────────────────────────────────────────────────────────┐
│                        VigileEye Streaming Service                           │
│                                                                              │
│  ┌────────────────────── API Layer ──────────────────────┐                   │
│  │  Express REST     │  WebSocket Signaling              │                   │
│  │  /api/v1/streams  │  /ws/signaling/:cameraId          │                   │
│  │  (start/stop/     │  (offer/answer/ICE/status)        │                   │
│  │   status/active)  │                                    │                   │
│  └─────────┬─────────┴──────────────┬────────────────────┘                   │
│            │                        │                                         │
│  ┌─────── ▼ ── Application Layer ── ▼ ──────────────────┐                   │
│  │  StartStreamUC  │ StopStreamUC  │ CreateConsumerUC   │                   │
│  │  GetStatusUC    │ ListActiveUC  │ HandleSignalingUC  │                   │
│  │  ProbeStreamUC  │ GetRealTimeUC │ NegotiateViewerUC  │                   │
│  └─────────────────┴──────┬────────┴────────────────────┘                   │
│                           │                                                   │
│  ┌────────── Domain Layer ▼ ────────────────────────────┐                   │
│  │  StreamSession  │ WebRTCTransport │ Camera            │                   │
│  │  ViewerSession  │ Producer/Consumer│ StreamConfig     │                   │
│  │  IStreamRepo    │ IAuthService     │ ICameraService   │                   │
│  │  ISFUService    │ ISignalingPort   │ DomainErrors     │                   │
│  └──────────────────────────────────────────────────────┘                   │
│                           │                                                   │
│  ┌───────── Infrastructure Layer ───────────────────────┐                   │
│  │                                                       │                   │
│  │  ┌─ mediasoup SFU ──────────────────────────────┐    │                   │
│  │  │  Worker Pool (N workers = CPU cores)          │    │                   │
│  │  │  Router per camera (media routing)            │    │                   │
│  │  │  PlainRtpTransport (FFmpeg → SFU ingest)      │    │                   │
│  │  │  WebRtcTransport per viewer (SFU → browser)   │    │                   │
│  │  │  Producer (camera H.264 track)                 │    │                   │
│  │  │  Consumer (per-viewer RTP forwarding)          │    │                   │
│  │  └───────────────────────────────────────────────┘    │                   │
│  │                                                       │                   │
│  │  ┌─ FFmpegRtpBridge ────────────────────────────┐    │                   │
│  │  │  RTSP → RTP H.264 (no transcode!)             │    │                   │
│  │  │  Sends raw RTP to mediasoup PlainTransport     │    │                   │
│  │  │  AudioExtractor → Opus via FFmpeg              │    │                   │
│  │  └───────────────────────────────────────────────┘    │                   │
│  │                                                       │                   │
│  │  JwtAuthService │ HttpCameraService                   │                   │
│  │  InMemorySessionRepo │ Logger                         │                   │
│  └───────────────────────────────────────────────────────┘                   │
│                                                                              │
│  ┌──────── External ────────────────────────────────────┐                   │
│  │  RTSP Cameras │ STUN/TURN │ Auth API │ Camera API    │                   │
│  └──────────────────────────────────────────────────────┘                   │
└──────────────────────────────────────────────────────────────────────────────┘
```

---

## 3. Data Flow: RTSP Camera → WebRTC Viewer

```
RTSP Camera                                     mediasoup SFU                Browser
    │                                                │                         │
    │  RTSP/TCP stream (H.264 + AAC)                 │                         │
    ├─────────────►  FFmpegRtpBridge                  │                         │
    │              │                                  │                         │
    │              │ ffmpeg -i rtsp://...              │                         │
    │              │   -c:v copy (NO transcode!)      │                         │
    │              │   -f rtp rtp://127.0.0.1:PORT    │                         │
    │              │                                  │                         │
    │              └─── RTP H.264 ───────────────────►│                         │
    │                                                 │ PlainRtpTransport       │
    │                                                 │ → Router.produce()      │
    │                                                 │ → Producer (H.264)      │
    │                                                 │                         │
    │                                                 │  Viewer connects:       │
    │                                                 │  1. WS signaling        │
    │                                                 │  2. STUN/TURN ICE       │
    │                                                 │  3. DTLS handshake      │
    │                                                 │                         │
    │                                                 │ WebRtcTransport ────────►
    │                                                 │ → Consumer (RTP copy)   │
    │                                                 │                         │
    │                                                 │   RTP → DTLS-SRTP ─────►
    │                                                 │                    H.264 decoded
    │                                                 │                    in <video>
```

**Key insight**: FFmpeg with `-c:v copy` does NOT transcode. It just repackages RTSP/H.264 into RTP packets. CPU usage is near-zero for the ingest pipeline. mediasoup then does pure RTP packet forwarding to each viewer — also near-zero CPU per viewer.

---

## 4. Signaling Flow (WebSocket)

```
Browser                          Signaling WS Server              mediasoup
   │                                    │                             │
   ├── WS connect ─────────────────────►│                             │
   │   /ws/signaling/:cameraId          │                             │
   │   ?token=JWT                       │                             │
   │                                    │ validate JWT                │
   │◄── { type: 'router-rtp-caps' } ───┤                             │
   │    (server's RTP capabilities)     │                             │
   │                                    │                             │
   ├── { type: 'create-transport' } ───►│                             │
   │                                    │─── createWebRtcTransport ──►│
   │                                    │◄── transport params ────────│
   │◄── { type: 'transport-created',   ─┤                             │
   │      id, iceParams, iceCands,      │                             │
   │      dtlsParams }                  │                             │
   │                                    │                             │
   │   (browser creates local transport)│                             │
   │                                    │                             │
   ├── { type: 'connect-transport',  ──►│                             │
   │     dtlsParameters }               │── transport.connect() ─────►│
   │                                    │                             │
   ├── { type: 'consume',           ──►│                             │
   │     rtpCapabilities }              │── transport.consume() ─────►│
   │                                    │◄── consumer params ────────│
   │◄── { type: 'consumer-created',  ──┤                             │
   │      id, producerId, kind,         │                             │
   │      rtpParameters }               │                             │
   │                                    │                             │
   ├── { type: 'consumer-resume' } ────►│                             │
   │                                    │── consumer.resume() ───────►│
   │                                    │                             │
   │◄══════════ H.264 RTP via DTLS-SRTP (peer-to-peer-like) ═══════►│
   │                                    │                             │
   │   (Periodic)                       │                             │
   │◄── { type: 'stats' }  ────────────┤  (FPS, viewers, bitrate)   │
```

---

## 5. ICE / STUN / TURN

### STUN (Session Traversal Utilities for NAT)
- Used by browsers to discover their **public IP:port** (server-reflexive candidates)
- Free, stateless, lightweight
- Config: `stun:stun.l.google.com:19302` (Google's public STUN)

### TURN (Traversal Using Relays around NAT)
- Fallback when direct UDP fails (symmetric NAT, strict firewalls)
- **All media is relayed** through the TURN server — adds latency + bandwidth cost
- Required for ~15% of real-world connections
- **Production**: Deploy coturn on a public-IP server

### ICE Flow
```
Browser                    STUN Server              mediasoup (public IP or TURN)
   │                           │                         │
   ├── STUN Binding Request ──►│                         │
   │◄── Binding Response ──────┤                         │
   │   (public IP:port)        │                         │
   │                           │                         │
   ├── ICE Candidate (host) ──────────────────────────►│
   ├── ICE Candidate (srflx) ─────────────────────────►│
   │◄── ICE Candidate (server) ────────────────────────┤
   │                           │                         │
   ├── STUN Connectivity Check ───────────────────────►│
   │◄── STUN Response ────────────────────────────────┤
   │                           │                         │
   ├══ DTLS Handshake ═══════════════════════════════►│
   ├══ SRTP Media Flow ══════════════════════════════►│
```

### Offer/Answer (via mediasoup device)
Unlike traditional WebRTC, mediasoup uses a **consume/produce** model rather than SDP offer/answer between peers:

1. **Server advertises** its Router's RTP capabilities
2. **Client loads** capabilities into mediasoup-client `Device`
3. **Client creates** a RecvTransport (for receiving media)
4. **Server creates** a WebRtcTransport and returns params
5. **Client calls** `transport.consume()` with the Producer's ID
6. **Server returns** Consumer RTP parameters
7. **Media flows** over the established DTLS-SRTP channel

This is more efficient than SDP renegotiation for surveillance because the server controls the topology.

---

## 6. Folder Structure (Clean Architecture)

```
VideoStreamingBackend/
├── src/
│   ├── main.ts                              # Bootstrap + DI
│   │
│   ├── api/                                 # API Layer
│   │   ├── middleware/
│   │   │   ├── auth.ts                      # JWT middleware
│   │   │   └── errorHandler.ts              # Global error handler
│   │   ├── routes/
│   │   │   └── streamRoutes.ts              # REST endpoints
│   │   └── ws/
│   │       └── signalingHandler.ts          # WebSocket signaling for WebRTC
│   │
│   ├── application/                         # Application Layer
│   │   ├── dtos/
│   │   │   └── index.ts                     # Request/Response DTOs
│   │   └── use-cases/
│   │       ├── StartStream.ts               # Ingest RTSP → RTP → mediasoup
│   │       ├── StopStream.ts                # Tear down camera stream
│   │       ├── NegotiateViewer.ts           # Create transport + consumer for viewer
│   │       ├── GetStreamStatus.ts           # Query stream state
│   │       ├── ListActiveStreams.ts          # List all active
│   │       └── index.ts
│   │
│   ├── domain/                              # Domain Layer
│   │   ├── entities/
│   │   │   ├── Camera.ts                    # Camera value object
│   │   │   ├── StreamSession.ts             # Stream aggregate
│   │   │   ├── ViewerSession.ts             # Viewer value object (NEW)
│   │   │   └── index.ts
│   │   ├── errors.ts                        # Domain exceptions
│   │   ├── repositories.ts                  # Repository ports
│   │   ├── services.ts                      # Service ports (Auth, Camera, SFU)
│   │   └── index.ts
│   │
│   └── infrastructure/                      # Infrastructure Layer
│       ├── config/
│       │   └── index.ts                     # Env config + mediasoup settings
│       ├── external/
│       │   └── HttpCameraService.ts         # Camera Mgmt API client
│       ├── logging/
│       │   └── logger.ts                    # Winston logger
│       ├── persistence/
│       │   └── InMemoryStreamSessionRepository.ts
│       ├── security/
│       │   └── JwtAuthService.ts            # JWT validation
│       └── streaming/
│           ├── MediasoupSFU.ts              # mediasoup Worker/Router management (NEW)
│           ├── FFmpegRtpBridge.ts           # RTSP → RTP bridge (REPLACES FFmpegProcess)
│           └── StreamManager.ts             # Orchestrator (REWRITTEN)
```

---

## 7. Performance Optimization Strategies

### A. Zero-Transcode Pipeline
```
RTSP (H.264) → FFmpeg -c:v copy → RTP → mediasoup → RTP forward → Browser
```
- **No CPU spent on video encoding/decoding** on the server
- FFmpeg only demuxes RTSP and repackages to RTP
- mediasoup does pure packet forwarding (kernel-level efficiency)

### B. Worker Pool
- mediasoup spawns **N C++ workers** (1 per CPU core)
- Each worker handles multiple Routers
- Workers communicate via IPC, not shared memory — no lock contention
- Round-robin assignment: camera → least-loaded worker

### C. Memory
- No frame buffers (unlike MJPEG approach which kept `latestFrame: Buffer`)
- RTP packets are forwarded immediately, not stored
- Per-viewer overhead: ~50KB (transport state + SRTP context)

### D. Network
- **DTLS-SRTP**: Encrypted, lower overhead than TLS/WSS
- **RTP over UDP**: No head-of-line blocking (unlike TCP WebSocket)
- **RTCP feedback**: Browsers send NACK/PLI for packet loss recovery
- **Bandwidth estimation**: mediasoup + browser negotiate optimal bitrate

### E. Latency Budget
```
Camera → RTSP TCP:    ~50ms
FFmpeg demux:          ~10ms
RTP → mediasoup:        ~1ms  (localhost UDP)
mediasoup forward:      ~1ms  (C++ packet copy)
Network (DTLS-SRTP):  ~30-100ms
Browser decode:        ~20ms
─────────────────────────────
Total:                ~112-182ms  (target < 500ms ✓)
```

---

## 8. Horizontal Scaling Strategy

```
                    ┌─────────────────────┐
                    │    Load Balancer     │
                    │  (nginx / HAProxy)   │
                    │  Sticky sessions on  │
                    │  X-Camera-Id header  │
                    └──────────┬──────────┘
                               │
              ┌────────────────┼────────────────┐
              │                │                │
      ┌───────▼──────┐ ┌──────▼───────┐ ┌──────▼───────┐
      │  Instance 1  │ │  Instance 2  │ │  Instance 3  │
      │  Cameras A-D │ │  Cameras E-H │ │  Cameras I-L │
      │  8 workers   │ │  8 workers   │ │  8 workers   │
      └──────────────┘ └──────────────┘ └──────────────┘
```

### Strategy: Camera-Affinity Partitioning
- Each camera is assigned to exactly ONE instance (sticky routing)
- All viewers of that camera connect to the same instance
- The load balancer routes by `cameraId` (hash-based or lookup table)
- **Redis** stores the camera → instance mapping

### Scaling triggers:
- **CPU > 70%** per worker → add instance
- **Bandwidth > 80%** of NIC capacity → add instance
- **Viewers > 100 per camera** → enable simulcast layers

### Multi-instance coordination:
```
Instance 1 ──── Redis Pub/Sub ──── Instance 2
    │               │                    │
    │     camera:start / camera:stop     │
    │     viewer:join / viewer:leave     │
    │                                    │
    └──── Shared state (optional) ───────┘
```

---

## 9. Infrastructure Recommendations

### TURN Server (Production)
```yaml
# docker-compose.yml addition
coturn:
  image: coturn/coturn:latest
  ports:
    - "3478:3478/udp"
    - "3478:3478/tcp"
    - "49152-65535:49152-65535/udp"
  environment:
    - TURN_REALM=vigileeye.com
    - TURN_USER=vigileeye:secret
  command: >
    turnserver
    --listening-port=3478
    --realm=vigileeye.com
    --user=vigileeye:secret
    --lt-cred-mech
    --fingerprint
    --no-cli
    --no-tls
    --no-dtls
    --log-file=stdout
```

### Docker Compose for Streaming
```yaml
videostreaming:
  build:
    context: ./VideoStreamingBackend
    dockerfile: Dockerfile
  ports:
    - "8003:8003"
    - "40000-40100:40000-40100/udp"  # RTP port range for mediasoup
  environment:
    - MEDIASOUP_LISTEN_IP=0.0.0.0
    - MEDIASOUP_ANNOUNCED_IP=${PUBLIC_IP}
    - RTC_MIN_PORT=40000
    - RTC_MAX_PORT=40100
```

### Key Production Settings
- **Announced IP**: Must be the server's public IP for ICE to work
- **Port range**: mediasoup needs a UDP port range for RTP
- **Worker count**: Match CPU cores (`os.cpus().length`)
- **Log level**: `warn` in production (mediasoup is verbose)

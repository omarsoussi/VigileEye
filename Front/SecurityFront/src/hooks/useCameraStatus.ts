/**
 * Hook that periodically probes camera stream reachability and tracks
 * real-time status (online / offline / disabled) plus live FPS readings.
 *
 * It works by calling the Video Streaming backend's /streams/status/:cameraId
 * for each camera. If the backend reports an active stream, the camera is
 * considered "online"; otherwise the hook falls back to the camera's DB status.
 *
 * Re-checks are triggered every `intervalMs` (default 30 s).
 */
import { useCallback, useEffect, useRef, useState } from 'react';
import { streamingApi, CameraResponse } from '../services/api';

export type RealTimeStatus = 'online' | 'offline' | 'disabled' | 'checking';

export interface CameraStatusInfo {
  status: RealTimeStatus;
  /** Actual FPS reported by the streaming backend (0 when not streaming) */
  fps: number;
  /** True when there is an active WebSocket stream the user is consuming */
  isStreaming: boolean;
  /** Timestamp of last successful check */
  lastChecked: number;
}

export interface UseCameraStatusResult {
  /** Map of camera_id → real-time status info */
  statusMap: Record<string, CameraStatusInfo>;
  /** Number of cameras currently online */
  onlineCount: number;
  /** Number of cameras offline */
  offlineCount: number;
  /** Number of cameras disabled */
  disabledCount: number;
  /** Whether the initial check is still running */
  isChecking: boolean;
  /** Force an immediate re-check */
  recheckAll: () => void;
}

const DEFAULT_STATUS: CameraStatusInfo = {
  status: 'checking',
  fps: 0,
  isStreaming: false,
  lastChecked: 0,
};

export function useCameraStatus(
  cameras: CameraResponse[],
  intervalMs: number = 30_000,
): UseCameraStatusResult {
  const [statusMap, setStatusMap] = useState<Record<string, CameraStatusInfo>>({});
  const [isChecking, setIsChecking] = useState(true);
  const camerasRef = useRef(cameras);
  camerasRef.current = cameras;
  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  const checkAll = useCallback(async () => {
    const cams = camerasRef.current;
    if (cams.length === 0) {
      setIsChecking(false);
      return;
    }

    setIsChecking(true);
    const newMap: Record<string, CameraStatusInfo> = {};

    // Check each camera — parallelise with Promise.allSettled so one failure
    // doesn't block the others.
    const results = await Promise.allSettled(
      cams.map(async (cam) => {
        // If the camera is explicitly disabled, don't even check streaming
        if (!cam.is_active) {
          return {
            id: cam.id,
            info: {
              status: 'disabled' as RealTimeStatus,
              fps: 0,
              isStreaming: false,
              lastChecked: Date.now(),
            },
          };
        }

        try {
          const streamStatus = await streamingApi.getStreamStatus(cam.id);
          const isActive = streamStatus.is_streaming && streamStatus.status === 'active';
          return {
            id: cam.id,
            info: {
              status: (isActive ? 'online' : cam.status === 'online' ? 'online' : 'offline') as RealTimeStatus,
              fps: streamStatus.session?.fps ?? cam.fps ?? 0,
              isStreaming: streamStatus.is_streaming,
              lastChecked: Date.now(),
            },
          };
        } catch {
          // Streaming backend unreachable or no session → fall back to DB status
          return {
            id: cam.id,
            info: {
              status: (cam.status === 'online' ? 'online' : 'offline') as RealTimeStatus,
              fps: cam.fps ?? 0,
              isStreaming: false,
              lastChecked: Date.now(),
            },
          };
        }
      }),
    );

    for (const r of results) {
      if (r.status === 'fulfilled') {
        newMap[r.value.id] = r.value.info;
      }
    }

    setStatusMap(newMap);
    setIsChecking(false);
  }, []);

  // Initial check + interval
  useEffect(() => {
    checkAll();
    intervalRef.current = setInterval(checkAll, intervalMs);
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [checkAll, intervalMs]);

  // Re-check when camera list changes
  useEffect(() => {
    checkAll();
  }, [cameras.length, checkAll]);

  // Derive counts
  const values = Object.values(statusMap);
  const onlineCount = values.filter((s) => s.status === 'online').length;
  const offlineCount = values.filter((s) => s.status === 'offline').length;
  const disabledCount = values.filter((s) => s.status === 'disabled').length;

  return {
    statusMap,
    onlineCount,
    offlineCount,
    disabledCount,
    isChecking,
    recheckAll: checkAll,
  };
}

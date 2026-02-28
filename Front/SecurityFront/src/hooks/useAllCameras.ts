/**
 * Hook that fetches BOTH owned cameras AND shared cameras (via accepted memberships).
 * Returns CameraWithPermission[] merging them together.
 */
import { useState, useEffect, useCallback } from 'react';
import {
  camerasApi,
  membersApi,
  CameraResponse,
  CameraWithPermission,
  MembershipResponse,
} from '../services/api';

export interface UseAllCamerasResult {
  cameras: CameraWithPermission[];
  ownCameras: CameraWithPermission[];
  sharedCameras: CameraWithPermission[];
  memberships: MembershipResponse[];
  isLoading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
}

export function useAllCameras(): UseAllCamerasResult {
  const [cameras, setCameras] = useState<CameraWithPermission[]>([]);
  const [ownCameras, setOwnCameras] = useState<CameraWithPermission[]>([]);
  const [sharedCameras, setSharedCameras] = useState<CameraWithPermission[]>([]);
  const [memberships, setMemberships] = useState<MembershipResponse[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchAll = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      // Fetch owned cameras and memberships in parallel
      const [owned, membershipList] = await Promise.all([
        camerasApi.listCameras(),
        membersApi.listMyMemberships().catch(() => [] as MembershipResponse[]),
      ]);

      setMemberships(membershipList);

      // Mark owned cameras
      const ownedWithPerm: CameraWithPermission[] = owned.map((c) => ({
        ...c,
        permission: 'owner' as const,
        isShared: false,
      }));
      setOwnCameras(ownedWithPerm);

      // Collect unique shared camera IDs (not already in owned)
      const ownedIds = new Set(owned.map((c) => c.id));
      const sharedCameraMap = new Map<string, MembershipResponse>();
      for (const m of membershipList) {
        for (const cid of m.camera_ids) {
          if (!ownedIds.has(cid) && !sharedCameraMap.has(cid)) {
            sharedCameraMap.set(cid, m);
          }
        }
      }

      // Build permission lookup: camera_id → best permission
      const permMap = new Map<string, 'reader' | 'editor'>();
      for (const m of membershipList) {
        for (const cid of m.camera_ids) {
          const existing = permMap.get(cid);
          const perm = m.permission as 'reader' | 'editor';
          // editor beats reader
          if (!existing || perm === 'editor') {
            permMap.set(cid, perm);
          }
        }
      }

      // Fetch shared cameras in batch
      const sharedIds = Array.from(sharedCameraMap.keys());
      let shared: CameraResponse[] = [];
      if (sharedIds.length > 0) {
        shared = await camerasApi.getCamerasBatch(sharedIds);
      }

      const sharedWithPerm: CameraWithPermission[] = shared.map((c) => ({
        ...c,
        permission: permMap.get(c.id) || 'reader',
        isShared: true,
      }));
      setSharedCameras(sharedWithPerm);

      // Merge all
      setCameras([...ownedWithPerm, ...sharedWithPerm]);
    } catch (err) {
      console.error('Failed to fetch cameras:', err);
      setError(err instanceof Error ? err.message : 'Failed to load cameras');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchAll();
  }, [fetchAll]);

  return { cameras, ownCameras, sharedCameras, memberships, isLoading, error, refetch: fetchAll };
}

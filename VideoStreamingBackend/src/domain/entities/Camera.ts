/**
 * Domain entity representing a camera fetched from Camera Management service.
 */
export interface Camera {
  id: string;
  ownerUserId: string;
  name: string;
  description: string | null;
  streamUrl: string;
  protocol: string;
  resolution: string;
  fps: number;
  encoding: string;
  status: string;
  cameraType: string;
  isActive: boolean;
}

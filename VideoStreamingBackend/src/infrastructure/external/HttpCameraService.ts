/**
 * HTTP client to fetch camera data from Camera Management FastAPI service.
 */
import axios from 'axios';
import { ICameraService } from '../../domain/services';
import { Camera } from '../../domain/entities/Camera';
import { CameraNotFoundError } from '../../domain/errors';
import { config } from '../config';
import { logger } from '../logging/logger';

interface CameraApiResponse {
  id: string;
  owner_user_id: string;
  name: string;
  description: string | null;
  stream_url: string;
  protocol: string;
  resolution: string;
  fps: number;
  encoding: string;
  status: string;
  camera_type: string;
  is_active: boolean;
}

function mapCamera(raw: CameraApiResponse): Camera {
  return {
    id: raw.id,
    ownerUserId: raw.owner_user_id,
    name: raw.name,
    description: raw.description,
    streamUrl: raw.stream_url,
    protocol: raw.protocol,
    resolution: raw.resolution,
    fps: raw.fps,
    encoding: raw.encoding,
    status: raw.status,
    cameraType: raw.camera_type,
    isActive: raw.is_active,
  };
}

export class HttpCameraService implements ICameraService {
  private readonly baseUrl: string;

  constructor() {
    this.baseUrl = config.cameraServiceUrl;
  }

  async getCamera(cameraId: string, token: string): Promise<Camera> {
    try {
      const response = await axios.get<CameraApiResponse>(
        `${this.baseUrl}/api/v1/cameras/${cameraId}`,
        {
          headers: { Authorization: `Bearer ${token}` },
          timeout: 5000,
        },
      );
      return mapCamera(response.data);
    } catch (err: unknown) {
      if (axios.isAxiosError(err) && err.response?.status === 404) {
        throw new CameraNotFoundError(cameraId);
      }
      logger.error(`Failed to fetch camera ${cameraId}: ${err}`);
      throw new CameraNotFoundError(cameraId);
    }
  }

  async getCamerasForUser(userId: string, token: string): Promise<Camera[]> {
    try {
      const response = await axios.get<CameraApiResponse[]>(
        `${this.baseUrl}/api/v1/cameras`,
        {
          headers: { Authorization: `Bearer ${token}` },
          timeout: 5000,
        },
      );
      return (response.data || []).map(mapCamera);
    } catch (err) {
      logger.error(`Failed to fetch cameras for user ${userId}: ${err}`);
      return [];
    }
  }
}

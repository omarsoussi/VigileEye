// Camera data types and static data - Matches backend CameraResponse structure
import { CameraResponse, CameraStatus, CameraType } from '../services/api';

// Re-export types from api.ts for convenience
export type { CameraResponse, CameraStatus, CameraType };

export interface CameraLocation {
  building?: string;
  floor?: string;
  zone?: string;
  room?: string;
  gps_lat?: number;
  gps_long?: number;
}

export interface User {
  id: string;
  name: string;
  avatar: string;
}

export interface ScheduleDay {
  day: string;
  short: string;
  active: boolean;
}

// Helper function to get a placeholder image for cameras
export const getCameraImage = (cameraType: CameraType): string => {
  const images: Record<CameraType, string> = {
    indoor: 'https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=400',
    outdoor: 'https://images.unsplash.com/photo-1557597774-9d273605dfa9?w=400',
    ptz: 'https://images.unsplash.com/photo-1585771724684-38269d6639fd?w=400',
    fisheye: 'https://images.unsplash.com/photo-1564013799919-ab600027ffc6?w=400',
    thermal: 'https://images.unsplash.com/photo-1600607687939-ce8a6c25118c?w=400',
  };
  return images[cameraType] || images.indoor;
};

// Default placeholder cameras for when API is unavailable
export const defaultCameras: CameraResponse[] = [
  {
    id: 'demo-1',
    owner_user_id: 'demo',
    name: 'Front Door',
    description: 'Main entrance camera',
    stream_url: 'rtsp://demo/stream1',
    protocol: 'rtsp',
    resolution: '1080p',
    fps: 30,
    encoding: 'H.264',
    status: 'online' as CameraStatus,
    camera_type: 'outdoor' as CameraType,
    is_active: true,
    location: { building: 'Main', floor: '1', zone: 'Entrance', room: 'Lobby' },
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },
  {
    id: 'demo-2',
    owner_user_id: 'demo',
    name: 'Backyard',
    description: 'Outdoor monitoring',
    stream_url: 'rtsp://demo/stream2',
    protocol: 'rtsp',
    resolution: '4K',
    fps: 25,
    encoding: 'H.265',
    status: 'online' as CameraStatus,
    camera_type: 'ptz' as CameraType,
    is_active: true,
    location: { building: 'Main', zone: 'Outdoor' },
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },
  {
    id: 'demo-3',
    owner_user_id: 'demo',
    name: 'Garage',
    description: 'Garage entrance',
    stream_url: 'rtsp://demo/stream3',
    protocol: 'rtsp',
    resolution: '1080p',
    fps: 30,
    encoding: 'H.264',
    status: 'offline' as CameraStatus,
    camera_type: 'indoor' as CameraType,
    is_active: false,
    location: { building: 'Main', zone: 'Side' },
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },
];

export const users: User[] = [
  {
    id: '1',
    name: 'John Doe',
    avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=100'
  },
  {
    id: '2',
    name: 'Jane Smith',
    avatar: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=100'
  },
  {
    id: '3',
    name: 'Mike Johnson',
    avatar: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=100'
  }
];

// Helper to get location string from camera
export const getCameraLocationString = (camera: CameraResponse): string => {
  const parts: string[] = [];
  if (camera.location?.building) parts.push(camera.location.building);
  if (camera.location?.floor) parts.push(camera.location.floor);
  if (camera.location?.zone) parts.push(camera.location.zone);
  if (camera.location?.room) parts.push(camera.location.room);
  return parts.length > 0 ? parts.join(' • ') : 'No location';
};

export const notificationSchedule: ScheduleDay[] = [
  { day: 'Sunday', short: 'S', active: false },
  { day: 'Monday', short: 'M', active: true },
  { day: 'Tuesday', short: 'T', active: true },
  { day: 'Wednesday', short: 'W', active: true },
  { day: 'Thursday', short: 'T', active: true },
  { day: 'Friday', short: 'F', active: false },
  { day: 'Saturday', short: 'S', active: false }
];

export const movementSchedule: ScheduleDay[] = [
  { day: 'Sunday', short: 'S', active: false },
  { day: 'Monday', short: 'M', active: false },
  { day: 'Tuesday', short: 'T', active: false },
  { day: 'Wednesday', short: 'W', active: false },
  { day: 'Thursday', short: 'T', active: true },
  { day: 'Friday', short: 'F', active: true },
  { day: 'Saturday', short: 'S', active: true }
];

export const deviceCategories = [
  { id: 'outdoor', icon: 'camera', label: 'Outdoor', active: true },
  { id: 'analytics', icon: 'chart', label: 'Analytics', active: false },
  { id: 'storage', icon: 'storage', label: 'Storage', active: false },
  { id: 'settings', icon: 'settings', label: 'Settings', active: false }
];

/**
 * Example: Camera Live View Page
 * 
 * Shows how to integrate the WebRTCPlayer component in your application.
 */
import React, { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import WebRTCPlayer from '../components/WebRTCPlayer';
import { tokenStorage } from '../services/api';
import './CameraLivePage.css';

interface CameraDetails {
  id: string;
  name: string;
  location: string;
  status: 'online' | 'offline';
}

const CameraLivePage: React.FC = () => {
  const { cameraId } = useParams<{ cameraId: string }>();
  const [camera, setCamera] = useState<CameraDetails | null>(null);
  const [authToken, setAuthToken] = useState<string>('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Get auth token from localStorage or your auth context
    const token = tokenStorage.getAccessToken() || '';
    setAuthToken(token);

    // Fetch camera details from Camera Management API
    const fetchCameraDetails = async () => {
      try {
        const response = await fetch(
          `${process.env.REACT_APP_CAMERAS_API_URL}/cameras/${cameraId}`,
          {
            headers: {
              'Authorization': `Bearer ${token}`,
            },
          }
        );

        if (response.ok) {
          const data = await response.json();
          setCamera(data);
        }
      } catch (error) {
        console.error('Error fetching camera details:', error);
      } finally {
        setLoading(false);
      }
    };

    if (cameraId && token) {
      fetchCameraDetails();
    }
  }, [cameraId]);

  if (loading) {
    return (
      <div className="camera-live-page loading">
        <div className="spinner-large"></div>
        <p>Loading camera...</p>
      </div>
    );
  }

  if (!camera) {
    return (
      <div className="camera-live-page error">
        <h2>Camera not found</h2>
        <p>The requested camera could not be loaded.</p>
      </div>
    );
  }

  return (
    <div className="camera-live-page">
      {/* Header */}
      <header className="page-header">
        <div>
          <h1>{camera.name}</h1>
          <p className="location">📍 {camera.location}</p>
        </div>
        <div className={`status-indicator ${camera.status}`}>
          {camera.status === 'online' ? '🟢 Online' : '🔴 Offline'}
        </div>
      </header>

      {/* Video Player */}
      <main className="player-container">
        {camera.status === 'online' ? (
          <WebRTCPlayer
            cameraId={cameraId!}
            authToken={authToken}
            autoConnect={true}
            showControls={true}
          />
        ) : (
          <div className="offline-message">
            <h3>Camera Offline</h3>
            <p>This camera is currently not available for streaming.</p>
          </div>
        )}
      </main>

      {/* Info Panel */}
      <aside className="info-panel">
        <div className="info-card">
          <h3>Stream Information</h3>
          <dl>
            <dt>Camera ID:</dt>
            <dd>{camera.id}</dd>
            
            <dt>Protocol:</dt>
            <dd>WebRTC</dd>
            
            <dt>Expected Latency:</dt>
            <dd>400-800ms</dd>
            
            <dt>Resolution:</dt>
            <dd>1920x1080 (adjusts automatically)</dd>
          </dl>
        </div>

        <div className="info-card">
          <h3>Features</h3>
          <ul className="features-list">
            <li>✓ Real-time streaming</li>
            <li>✓ Sub-second latency</li>
            <li>✓ Automatic reconnection</li>
            <li>✓ Adaptive bitrate</li>
          </ul>
        </div>
      </aside>
    </div>
  );
};

export default CameraLivePage;

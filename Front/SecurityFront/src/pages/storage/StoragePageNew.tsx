import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { useTheme } from '../../contexts/ThemeContext';
import { useAuth } from '../../contexts/AuthContext';
import { GlassCard, AnimatedButton } from '../../components/GlassCard';
import { storageApi, camerasApi } from '../../services/api';
import type {
  StorageRecordingResponse,
  StorageConfigResponse,
  StorageMetricsResponse,
  CameraResponse,
} from '../../services/api';
import {
  HiOutlineDatabase,
  HiOutlineVideoCamera,
  HiOutlinePlay,
  HiOutlineStop,
  HiOutlineDownload,
  HiOutlineTrash,
  HiOutlineCog,
  HiOutlineRefresh,
  HiOutlineCloud,
  HiOutlineServer,
  HiOutlineChartBar,
  HiOutlineSearch,
  HiOutlineX,
  HiOutlineCheck,
  HiOutlineExclamation,
  HiOutlineClock,
  HiOutlineFolder,
  HiOutlineFilm,
  HiOutlineArrowLeft,
} from 'react-icons/hi';

// ── Types ──
type StorageMode = 'local' | 'minio' | 'azure';
type ViewMode = 'overview' | 'recordings' | 'settings';

interface CameraOption {
  id: string;
  name: string;
}

// ── Helper ──
function formatBytes(bytes: number): string {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(2))} ${sizes[i]}`;
}

function formatDuration(seconds: number): string {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = Math.floor(seconds % 60);
  if (h > 0) return `${h}h ${m}m ${s}s`;
  if (m > 0) return `${m}m ${s}s`;
  return `${s}s`;
}

function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleString();
}

const statusColors: Record<string, string> = {
  recording: '#ef4444',
  completed: '#22c55e',
  uploading: '#3b82f6',
  failed: '#f97316',
  deleted: '#6b7280',
};

// ── Main Component ──
export const StoragePageNew: React.FC = () => {
  const navigate = useNavigate();
  const { colors, preferences } = useTheme();
  const { user } = useAuth();
  const isDark = preferences.mode === 'dark';

  // State
  const [viewMode, setViewMode] = useState<ViewMode>('overview');
  const [cameras, setCameras] = useState<CameraOption[]>([]);
  const [selectedCameraId, setSelectedCameraId] = useState<string>('');
  const [recordings, setRecordings] = useState<StorageRecordingResponse[]>([]);
  const [metrics, setMetrics] = useState<StorageMetricsResponse | null>(null);
  const [configs, setConfigs] = useState<StorageConfigResponse[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');

  // Settings form
  const [settingsCamera, setSettingsCamera] = useState<string>('');
  const [settingsMode, setSettingsMode] = useState<StorageMode>('local');
  const [settingsRetention, setSettingsRetention] = useState(30);
  const [settingsQuota, setSettingsQuota] = useState(10);
  const [settingsEnabled, setSettingsEnabled] = useState(false);
  const [settingsSaving, setSettingsSaving] = useState(false);

  // ── Active Recordings (for Overview tab) ──
  const [activeRecordingCameraIds, setActiveRecordingCameraIds] = useState<Set<string>>(new Set());

  // ── Video Player ──
  const [playbackUrl, setPlaybackUrl] = useState<string | null>(null);
  const [playingRecording, setPlayingRecording] = useState<StorageRecordingResponse | null>(null);

  const handlePlayRecording = async (rec: StorageRecordingResponse) => {
    try {
      setError(null);
      const url = await storageApi.getPlaybackUrl(rec.id);
      setPlaybackUrl(url);
      setPlayingRecording(rec);
    } catch (e: any) {
      setError(e.message || 'Failed to get playback URL');
    }
  };

  const closePlayer = () => {
    setPlaybackUrl(null);
    setPlayingRecording(null);
  };

  // ── Data fetching ──
  const fetchCameras = useCallback(async () => {
    try {
      const resp = await camerasApi.listCameras();
      const list = (resp as any).cameras || resp;
      const mapped: CameraOption[] = (Array.isArray(list) ? list : []).map((c: CameraResponse) => ({
        id: c.id,
        name: c.name,
      }));
      setCameras(mapped);
      if (mapped.length > 0 && !selectedCameraId) {
        setSelectedCameraId(mapped[0].id);
      }
    } catch {
      // ignore
    }
  }, [selectedCameraId]);

  const fetchRecordings = useCallback(async () => {
    if (!selectedCameraId) return;
    setLoading(true);
    try {
      const resp = await storageApi.getRecordings(selectedCameraId);
      setRecordings(resp.recordings || []);
    } catch (e: any) {
      setError(e.message || 'Failed to fetch recordings');
    } finally {
      setLoading(false);
    }
  }, [selectedCameraId]);

  const fetchMetrics = useCallback(async () => {
    try {
      const resp = await storageApi.getUserMetrics();
      setMetrics(resp);
    } catch {
      // ignore
    }
  }, []);

  const fetchConfigs = useCallback(async () => {
    try {
      const resp = await storageApi.listConfigs();
      setConfigs(resp.configs || []);
    } catch {
      // ignore
    }
  }, []);

  const fetchActiveRecordings = useCallback(async () => {
    try {
      const resp = await storageApi.getActiveRecordings();
      const ids = new Set((resp.recordings || []).map((r: StorageRecordingResponse) => r.camera_id));
      setActiveRecordingCameraIds(ids);
    } catch {
      // ignore
    }
  }, []);

  useEffect(() => {
    fetchCameras();
    fetchMetrics();
    fetchActiveRecordings();
  }, [fetchCameras, fetchMetrics, fetchActiveRecordings]);

  useEffect(() => {
    if (viewMode === 'recordings') fetchRecordings();
    if (viewMode === 'settings') fetchConfigs();
  }, [viewMode, fetchRecordings, fetchConfigs]);

  // ── Actions ──
  const handleStartRecording = async (cameraId: string) => {
    setError(null);
    try {
      await storageApi.startRecording({ camera_id: cameraId });
      setSuccess('Recording started');
      fetchActiveRecordings();
      fetchRecordings();
      fetchMetrics();
    } catch (e: any) {
      const code = e?.error_code || e?.errorCode || '';
      if (code === 'RECORDING_ALREADY_ACTIVE' || (e?.message || '').includes('already active')) {
        setError('This camera is already recording');
        fetchActiveRecordings();
      } else {
        setError(e.message || 'Failed to start recording');
      }
    }
  };

  const handleStopRecording = async (cameraId: string) => {
    setError(null);
    try {
      await storageApi.stopRecording({ camera_id: cameraId });
      setSuccess('Recording stopped');
      fetchActiveRecordings();
      fetchRecordings();
      fetchMetrics();
    } catch (e: any) {
      setError(e.message || 'Failed to stop recording');
    }
  };

  const handleDeleteRecording = async (recordingId: string) => {
    if (!window.confirm('Delete this recording permanently?')) return;
    setError(null);
    try {
      await storageApi.deleteRecording(recordingId);
      setSuccess('Recording deleted');
      fetchRecordings();
      fetchMetrics();
    } catch (e: any) {
      setError(e.message || 'Failed to delete recording');
    }
  };

  const handleDownloadRecording = async (recordingId: string, fileName?: string) => {
    try {
      await storageApi.downloadRecording(recordingId, fileName);
    } catch (e: any) {
      setError(e.message || 'Failed to download recording');
    }
  };

  const handleSaveSettings = async () => {
    if (!settingsCamera) return;
    setSettingsSaving(true);
    setError(null);
    try {
      await storageApi.updateConfig(settingsCamera, {
        camera_id: settingsCamera,
        storage_mode: settingsMode,
        retention_days: settingsRetention,
        quota_gb: settingsQuota,
        enabled: settingsEnabled,
      });
      setSuccess('Storage settings saved');
      fetchConfigs();
    } catch (e: any) {
      setError(e.message || 'Failed to save settings');
    } finally {
      setSettingsSaving(false);
    }
  };

  // Load settings when camera changes
  useEffect(() => {
    if (settingsCamera && configs.length > 0) {
      const cfg = configs.find(c => c.camera_id === settingsCamera);
      if (cfg) {
        setSettingsMode(cfg.storage_mode as StorageMode);
        setSettingsRetention(cfg.retention_days);
        setSettingsQuota(cfg.quota_gb);
        setSettingsEnabled(cfg.enabled);
      }
    }
  }, [settingsCamera, configs]);

  // Filtered recordings
  const filteredRecordings = useMemo(() => {
    if (!searchQuery) return recordings;
    const q = searchQuery.toLowerCase();
    return recordings.filter(r =>
      r.camera_id.toLowerCase().includes(q) ||
      r.status.toLowerCase().includes(q) ||
      (r.file_path || '').toLowerCase().includes(q)
    );
  }, [recordings, searchQuery]);

  // Clear messages after 4s
  useEffect(() => {
    if (success) {
      const t = setTimeout(() => setSuccess(null), 4000);
      return () => clearTimeout(t);
    }
  }, [success]);
  useEffect(() => {
    if (error) {
      const t = setTimeout(() => setError(null), 6000);
      return () => clearTimeout(t);
    }
  }, [error]);

  const storageModeIcon = (mode: string) => {
    switch (mode) {
      case 'minio': return <HiOutlineServer size={16} />;
      case 'azure': return <HiOutlineCloud size={16} />;
      default: return <HiOutlineFolder size={16} />;
    }
  };

  // ── Render ──
  return (
    <div style={{ padding: '20px 16px', maxWidth: '600px', margin: '0 auto' }}>
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '12px',
          marginBottom: '24px',
        }}
      >
        <motion.button
          whileTap={{ scale: 0.9 }}
          onClick={() => navigate('/settings')}
          style={{
            width: '36px',
            height: '36px',
            borderRadius: '10px',
            background: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.05)',
            border: 'none',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            cursor: 'pointer',
            color: colors.text,
          }}
        >
          <HiOutlineArrowLeft size={20} />
        </motion.button>
        <div>
          <h1 style={{ fontSize: '24px', fontWeight: 700, color: colors.text, margin: 0 }}>
            Storage
          </h1>
          <p style={{ fontSize: '13px', color: colors.textMuted, margin: 0 }}>
            Manage video recordings & storage
          </p>
        </div>
        <motion.button
          whileTap={{ scale: 0.9 }}
          onClick={() => { fetchMetrics(); fetchRecordings(); fetchConfigs(); fetchActiveRecordings(); }}
          style={{
            marginLeft: 'auto',
            width: '36px',
            height: '36px',
            borderRadius: '10px',
            background: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.05)',
            border: 'none',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            cursor: 'pointer',
            color: colors.accent,
          }}
        >
          <HiOutlineRefresh size={18} />
        </motion.button>
      </motion.div>

      {/* Alerts */}
      <AnimatePresence>
        {success && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            style={{
              background: 'rgba(34,197,94,0.15)',
              border: '1px solid rgba(34,197,94,0.3)',
              borderRadius: '12px',
              padding: '12px 16px',
              marginBottom: '16px',
              display: 'flex',
              alignItems: 'center',
              gap: '10px',
              color: '#22c55e',
              fontSize: '14px',
            }}
          >
            <HiOutlineCheck size={18} />
            {success}
          </motion.div>
        )}
        {error && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            style={{
              background: 'rgba(239,68,68,0.15)',
              border: '1px solid rgba(239,68,68,0.3)',
              borderRadius: '12px',
              padding: '12px 16px',
              marginBottom: '16px',
              display: 'flex',
              alignItems: 'center',
              gap: '10px',
              color: '#ef4444',
              fontSize: '14px',
            }}
          >
            <HiOutlineExclamation size={18} />
            {error}
            <button onClick={() => setError(null)} style={{ marginLeft: 'auto', background: 'none', border: 'none', color: '#ef4444', cursor: 'pointer' }}>
              <HiOutlineX size={16} />
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Tab Navigation */}
      <div style={{
        display: 'flex',
        gap: '8px',
        marginBottom: '20px',
        background: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.03)',
        borderRadius: '14px',
        padding: '4px',
      }}>
        {([
          { key: 'overview', label: 'Overview', icon: <HiOutlineChartBar size={16} /> },
          { key: 'recordings', label: 'Recordings', icon: <HiOutlineFilm size={16} /> },
          { key: 'settings', label: 'Settings', icon: <HiOutlineCog size={16} /> },
        ] as { key: ViewMode; label: string; icon: React.ReactNode }[]).map(tab => (
          <motion.button
            key={tab.key}
            whileTap={{ scale: 0.95 }}
            onClick={() => setViewMode(tab.key)}
            style={{
              flex: 1,
              padding: '10px 12px',
              borderRadius: '10px',
              border: 'none',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '6px',
              fontSize: '13px',
              fontWeight: viewMode === tab.key ? 600 : 400,
              color: viewMode === tab.key ? '#fff' : colors.textMuted,
              background: viewMode === tab.key ? colors.accent : 'transparent',
              transition: 'all 0.2s',
            }}
          >
            {tab.icon}
            {tab.label}
          </motion.button>
        ))}
      </div>

      {/* ── Overview ── */}
      {viewMode === 'overview' && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
          {/* Metrics Cards */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '20px' }}>
            <GlassCard padding="16px" borderRadius="16px">
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '8px' }}>
                <div style={{
                  width: '32px', height: '32px', borderRadius: '8px',
                  background: 'rgba(139,92,246,0.15)', display: 'flex',
                  alignItems: 'center', justifyContent: 'center', color: '#8b5cf6',
                }}>
                  <HiOutlineDatabase size={16} />
                </div>
                <span style={{ fontSize: '12px', color: colors.textMuted }}>Total Used</span>
              </div>
              <p style={{ fontSize: '20px', fontWeight: 700, color: colors.text, margin: 0 }}>
                {metrics ? formatBytes(metrics.total_size_bytes) : '—'}
              </p>
            </GlassCard>

            <GlassCard padding="16px" borderRadius="16px">
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '8px' }}>
                <div style={{
                  width: '32px', height: '32px', borderRadius: '8px',
                  background: 'rgba(0,212,255,0.15)', display: 'flex',
                  alignItems: 'center', justifyContent: 'center', color: '#00d4ff',
                }}>
                  <HiOutlineFilm size={16} />
                </div>
                <span style={{ fontSize: '12px', color: colors.textMuted }}>Recordings</span>
              </div>
              <p style={{ fontSize: '20px', fontWeight: 700, color: colors.text, margin: 0 }}>
                {metrics ? metrics.total_files : '—'}
              </p>
            </GlassCard>

            <GlassCard padding="16px" borderRadius="16px">
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '8px' }}>
                <div style={{
                  width: '32px', height: '32px', borderRadius: '8px',
                  background: 'rgba(239,68,68,0.15)', display: 'flex',
                  alignItems: 'center', justifyContent: 'center', color: '#ef4444',
                }}>
                  <HiOutlineVideoCamera size={16} />
                </div>
                <span style={{ fontSize: '12px', color: colors.textMuted }}>Quota Used</span>
              </div>
              <p style={{ fontSize: '20px', fontWeight: 700, color: colors.text, margin: 0 }}>
                {metrics ? `${metrics.usage_percent.toFixed(1)}%` : '—'}
              </p>
            </GlassCard>

            <GlassCard padding="16px" borderRadius="16px">
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '8px' }}>
                <div style={{
                  width: '32px', height: '32px', borderRadius: '8px',
                  background: 'rgba(34,197,94,0.15)', display: 'flex',
                  alignItems: 'center', justifyContent: 'center', color: '#22c55e',
                }}>
                  <HiOutlineClock size={16} />
                </div>
                <span style={{ fontSize: '12px', color: colors.textMuted }}>Quota</span>
              </div>
              <p style={{ fontSize: '20px', fontWeight: 700, color: colors.text, margin: 0 }}>
                {metrics ? `${metrics.total_size_gb.toFixed(1)} / ${metrics.quota_gb} GB` : '—'}
              </p>
            </GlassCard>
          </div>

          {/* Quick Actions */}
          <h3 style={{ fontSize: '13px', fontWeight: 600, color: colors.textMuted, textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '12px' }}>
            Quick Actions
          </h3>
          <GlassCard padding="0" borderRadius="16px">
            {cameras.map((cam, idx) => {
              const isActive = activeRecordingCameraIds.has(cam.id);
              return (
                <div
                  key={cam.id}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '12px',
                    padding: '14px 16px',
                    borderBottom: idx < cameras.length - 1 ? `1px solid ${isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.05)'}` : 'none',
                  }}
                >
                  <div style={{
                    width: '32px', height: '32px', borderRadius: '8px',
                    background: isActive ? 'rgba(239,68,68,0.15)' : 'rgba(0,212,255,0.15)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    color: isActive ? '#ef4444' : '#00d4ff',
                  }}>
                    <HiOutlineVideoCamera size={16} />
                  </div>
                  <div style={{ flex: 1 }}>
                    <p style={{ fontSize: '14px', fontWeight: 500, color: colors.text, margin: 0 }}>{cam.name}</p>
                    <p style={{ fontSize: '12px', color: isActive ? '#ef4444' : colors.textMuted, margin: 0 }}>
                      {isActive ? '● Recording' : 'Idle'}
                    </p>
                  </div>
                  <motion.button
                    whileTap={{ scale: 0.9 }}
                    onClick={() => isActive ? handleStopRecording(cam.id) : handleStartRecording(cam.id)}
                    style={{
                      padding: '8px 14px',
                      borderRadius: '8px',
                      border: 'none',
                      cursor: 'pointer',
                      fontSize: '12px',
                      fontWeight: 600,
                      display: 'flex',
                      alignItems: 'center',
                      gap: '4px',
                      color: '#fff',
                      background: isActive ? '#ef4444' : colors.accent,
                    }}
                  >
                    {isActive ? <><HiOutlineStop size={14} /> Stop</> : <><HiOutlinePlay size={14} /> Record</>}
                  </motion.button>
                </div>
              );
            })}
            {cameras.length === 0 && (
              <div style={{ padding: '24px', textAlign: 'center', color: colors.textMuted, fontSize: '14px' }}>
                No cameras found. Add cameras first.
              </div>
            )}
          </GlassCard>
        </motion.div>
      )}

      {/* ── Recordings ── */}
      {viewMode === 'recordings' && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
          {/* Camera Selector */}
          <div style={{ marginBottom: '16px' }}>
            <select
              value={selectedCameraId}
              onChange={e => setSelectedCameraId(e.target.value)}
              style={{
                width: '100%',
                padding: '12px 14px',
                borderRadius: '12px',
                border: `1px solid ${isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.1)'}`,
                background: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.02)',
                color: colors.text,
                fontSize: '14px',
                appearance: 'none',
                cursor: 'pointer',
              }}
            >
              {cameras.map(c => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </select>
          </div>

          {/* Search */}
          <div style={{ position: 'relative', marginBottom: '16px' }}>
            <HiOutlineSearch size={16} style={{ position: 'absolute', left: '14px', top: '50%', transform: 'translateY(-50%)', color: colors.textMuted }} />
            <input
              type="text"
              placeholder="Search recordings..."
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              style={{
                width: '100%',
                padding: '12px 14px 12px 40px',
                borderRadius: '12px',
                border: `1px solid ${isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.1)'}`,
                background: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.02)',
                color: colors.text,
                fontSize: '14px',
                boxSizing: 'border-box',
              }}
            />
          </div>

          {/* Recordings List */}
          {loading ? (
            <div style={{ textAlign: 'center', padding: '40px', color: colors.textMuted }}>
              Loading recordings...
            </div>
          ) : filteredRecordings.length === 0 ? (
            <GlassCard padding="40px" borderRadius="16px">
              <div style={{ textAlign: 'center', color: colors.textMuted }}>
                <HiOutlineFilm size={40} style={{ opacity: 0.4, marginBottom: '12px' }} />
                <p style={{ fontSize: '15px', fontWeight: 500 }}>No recordings</p>
                <p style={{ fontSize: '13px' }}>Start recording from the Overview tab</p>
              </div>
            </GlassCard>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              {filteredRecordings.map(rec => (
                <GlassCard key={rec.id} padding="0" borderRadius="14px">
                  <div style={{ padding: '14px 16px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '8px' }}>
                      <div style={{
                        width: '8px', height: '8px', borderRadius: '50%',
                        background: statusColors[rec.status] || '#6b7280',
                        boxShadow: rec.status === 'recording' ? '0 0 8px rgba(239,68,68,0.6)' : 'none',
                      }} />
                      <span style={{
                        fontSize: '12px', fontWeight: 600,
                        color: statusColors[rec.status] || colors.textMuted,
                        textTransform: 'uppercase',
                        letterSpacing: '0.5px',
                      }}>
                        {rec.status}
                      </span>
                      <span style={{ fontSize: '12px', color: colors.textMuted, marginLeft: 'auto' }}>
                        {formatDate(rec.started_at)}
                      </span>
                    </div>

                    <div style={{ display: 'flex', gap: '16px', fontSize: '13px', color: colors.textMuted, marginBottom: '10px' }}>
                      <span>{formatBytes(rec.file_size)}</span>
                      {rec.duration_secs > 0 && <span>{formatDuration(rec.duration_secs)}</span>}
                      <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                        {storageModeIcon(rec.storage_mode)}
                        {rec.storage_mode}
                      </span>
                    </div>

                    {/* Actions */}
                    <div style={{ display: 'flex', gap: '8px' }}>
                      {rec.status === 'recording' && (
                        <motion.button
                          whileTap={{ scale: 0.9 }}
                          onClick={() => handleStopRecording(rec.camera_id)}
                          style={{
                            padding: '6px 12px', borderRadius: '8px', border: 'none',
                            cursor: 'pointer', fontSize: '12px', fontWeight: 500,
                            display: 'flex', alignItems: 'center', gap: '4px',
                            color: '#fff', background: '#ef4444',
                          }}
                        >
                          <HiOutlineStop size={14} /> Stop
                        </motion.button>
                      )}
                      {rec.status === 'completed' && (
                        <motion.button
                          whileTap={{ scale: 0.9 }}
                          onClick={() => handlePlayRecording(rec)}
                          style={{
                            padding: '6px 12px', borderRadius: '8px', border: 'none',
                            cursor: 'pointer', fontSize: '12px', fontWeight: 500,
                            display: 'flex', alignItems: 'center', gap: '4px',
                            color: '#fff', background: '#22c55e',
                          }}
                        >
                          <HiOutlinePlay size={14} /> Play
                        </motion.button>
                      )}
                      {rec.status === 'completed' && (
                        <motion.button
                          whileTap={{ scale: 0.9 }}
                          onClick={() => handleDownloadRecording(rec.id, rec.file_name)}
                          style={{
                            padding: '6px 12px', borderRadius: '8px', border: 'none',
                            cursor: 'pointer', fontSize: '12px', fontWeight: 500,
                            display: 'flex', alignItems: 'center', gap: '4px',
                            color: '#fff', background: colors.accent,
                          }}
                        >
                          <HiOutlineDownload size={14} /> Download
                        </motion.button>
                      )}
                      {(rec.status === 'completed' || rec.status === 'failed') && (
                        <motion.button
                          whileTap={{ scale: 0.9 }}
                          onClick={() => handleDeleteRecording(rec.id)}
                          style={{
                            padding: '6px 12px', borderRadius: '8px',
                            border: `1px solid ${isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.1)'}`,
                            cursor: 'pointer', fontSize: '12px', fontWeight: 500,
                            display: 'flex', alignItems: 'center', gap: '4px',
                            color: '#ef4444', background: 'transparent',
                          }}
                        >
                          <HiOutlineTrash size={14} /> Delete
                        </motion.button>
                      )}
                    </div>
                  </div>
                </GlassCard>
              ))}
            </div>
          )}
        </motion.div>
      )}

      {/* ── Settings ── */}
      {viewMode === 'settings' && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
          {/* Camera Selector for Settings */}
          <div style={{ marginBottom: '20px' }}>
            <label style={{ fontSize: '13px', fontWeight: 600, color: colors.textMuted, textTransform: 'uppercase', letterSpacing: '0.5px', display: 'block', marginBottom: '8px' }}>
              Camera
            </label>
            <select
              value={settingsCamera}
              onChange={e => setSettingsCamera(e.target.value)}
              style={{
                width: '100%',
                padding: '12px 14px',
                borderRadius: '12px',
                border: `1px solid ${isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.1)'}`,
                background: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.02)',
                color: colors.text,
                fontSize: '14px',
                appearance: 'none',
                cursor: 'pointer',
              }}
            >
              <option value="">Select a camera</option>
              {cameras.map(c => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </select>
          </div>

          {settingsCamera && (
            <>
              {/* Storage Mode */}
              <GlassCard padding="16px" borderRadius="16px">
                <h4 style={{ fontSize: '14px', fontWeight: 600, color: colors.text, marginBottom: '14px', marginTop: 0 }}>
                  Storage Mode
                </h4>
                <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                  {([
                    { key: 'local', label: 'Local', icon: <HiOutlineFolder size={16} />, desc: 'Server disk' },
                    { key: 'minio', label: 'MinIO', icon: <HiOutlineServer size={16} />, desc: 'Self-hosted S3' },
                    { key: 'azure', label: 'Azure', icon: <HiOutlineCloud size={16} />, desc: 'Cloud blob' },
                  ] as { key: StorageMode; label: string; icon: React.ReactNode; desc: string }[]).map(opt => (
                    <motion.button
                      key={opt.key}
                      whileTap={{ scale: 0.95 }}
                      onClick={() => setSettingsMode(opt.key)}
                      style={{
                        flex: 1,
                        minWidth: '90px',
                        padding: '12px',
                        borderRadius: '12px',
                        border: settingsMode === opt.key
                          ? `2px solid ${colors.accent}`
                          : `1px solid ${isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.1)'}`,
                        background: settingsMode === opt.key
                          ? `${colors.accent}15`
                          : 'transparent',
                        cursor: 'pointer',
                        textAlign: 'center',
                        color: colors.text,
                      }}
                    >
                      <div style={{ color: settingsMode === opt.key ? colors.accent : colors.textMuted, marginBottom: '4px' }}>
                        {opt.icon}
                      </div>
                      <p style={{ fontSize: '13px', fontWeight: 600, margin: '0 0 2px' }}>{opt.label}</p>
                      <p style={{ fontSize: '11px', color: colors.textMuted, margin: 0 }}>{opt.desc}</p>
                    </motion.button>
                  ))}
                </div>
              </GlassCard>

              {/* Retention & Quota */}
              <GlassCard padding="16px" borderRadius="16px" style={{ marginTop: '12px' }}>
                <h4 style={{ fontSize: '14px', fontWeight: 600, color: colors.text, marginBottom: '14px', marginTop: 0 }}>
                  Retention & Quota
                </h4>

                <div style={{ marginBottom: '16px' }}>
                  <label style={{ fontSize: '13px', color: colors.textMuted, display: 'block', marginBottom: '6px' }}>
                    Retention (days): {settingsRetention}
                  </label>
                  <input
                    type="range"
                    min={1}
                    max={365}
                    value={settingsRetention}
                    onChange={e => setSettingsRetention(Number(e.target.value))}
                    style={{ width: '100%', accentColor: colors.accent }}
                  />
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px', color: colors.textMuted }}>
                    <span>1 day</span>
                    <span>1 year</span>
                  </div>
                </div>

                <div style={{ marginBottom: '16px' }}>
                  <label style={{ fontSize: '13px', color: colors.textMuted, display: 'block', marginBottom: '6px' }}>
                    Quota (GB): {settingsQuota}
                  </label>
                  <input
                    type="range"
                    min={1}
                    max={500}
                    value={settingsQuota}
                    onChange={e => setSettingsQuota(Number(e.target.value))}
                    style={{ width: '100%', accentColor: colors.accent }}
                  />
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px', color: colors.textMuted }}>
                    <span>1 GB</span>
                    <span>500 GB</span>
                  </div>
                </div>

                <div style={{
                  display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                  padding: '12px 0', borderTop: `1px solid ${isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.05)'}`,
                }}>
                  <div>
                    <p style={{ fontSize: '14px', fontWeight: 500, color: colors.text, margin: 0 }}>Storage Enabled</p>
                    <p style={{ fontSize: '12px', color: colors.textMuted, margin: 0 }}>Enable storage and recording for this camera</p>
                  </div>
                  <label style={{ position: 'relative', display: 'inline-block', width: '44px', height: '24px' }}>
                    <input
                      type="checkbox"
                      checked={settingsEnabled}
                      onChange={e => setSettingsEnabled(e.target.checked)}
                      style={{ opacity: 0, width: 0, height: 0 }}
                    />
                    <span style={{
                      position: 'absolute', cursor: 'pointer', top: 0, left: 0, right: 0, bottom: 0,
                      background: settingsEnabled ? colors.accent : (isDark ? 'rgba(255,255,255,0.2)' : 'rgba(0,0,0,0.2)'),
                      borderRadius: '12px', transition: '0.3s',
                    }}>
                      <span style={{
                        position: 'absolute', height: '18px', width: '18px', left: settingsEnabled ? '23px' : '3px',
                        bottom: '3px', background: '#fff', borderRadius: '50%', transition: '0.3s',
                      }} />
                    </span>
                  </label>
                </div>
              </GlassCard>

              {/* Save Button */}
              <motion.div style={{ marginTop: '20px' }}>
                <AnimatedButton
                  onClick={handleSaveSettings}
                  style={{
                    width: '100%',
                    padding: '14px',
                    borderRadius: '14px',
                    border: 'none',
                    cursor: 'pointer',
                    fontSize: '15px',
                    fontWeight: 600,
                    color: '#fff',
                    background: colors.accent,
                    opacity: settingsSaving ? 0.6 : 1,
                  }}
                >
                  {settingsSaving ? 'Saving...' : 'Save Settings'}
                </AnimatedButton>
              </motion.div>
            </>
          )}

          {/* Existing Configs */}
          {configs.length > 0 && (
            <div style={{ marginTop: '24px' }}>
              <h3 style={{ fontSize: '13px', fontWeight: 600, color: colors.textMuted, textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '12px' }}>
                Camera Configurations
              </h3>
              {configs.map(cfg => {
                const camName = cameras.find(c => c.id === cfg.camera_id)?.name || cfg.camera_id.slice(0, 8);
                return (
                  <GlassCard key={cfg.camera_id} padding="14px 16px" borderRadius="12px" style={{ marginBottom: '8px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                      <div style={{
                        width: '28px', height: '28px', borderRadius: '6px',
                        background: `${colors.accent}15`, display: 'flex',
                        alignItems: 'center', justifyContent: 'center', color: colors.accent,
                      }}>
                        {storageModeIcon(cfg.storage_mode)}
                      </div>
                      <div style={{ flex: 1 }}>
                        <p style={{ fontSize: '14px', fontWeight: 500, color: colors.text, margin: 0 }}>{camName}</p>
                        <p style={{ fontSize: '12px', color: colors.textMuted, margin: 0 }}>
                          {cfg.storage_mode} · {cfg.retention_days}d · {cfg.quota_gb}GB
                          {cfg.enabled && ' · enabled'}
                        </p>
                      </div>
                      <motion.button
                        whileTap={{ scale: 0.9 }}
                        onClick={() => setSettingsCamera(cfg.camera_id)}
                        style={{
                          padding: '6px 10px', borderRadius: '6px', border: 'none',
                          cursor: 'pointer', fontSize: '12px', color: colors.accent,
                          background: `${colors.accent}15`,
                        }}
                      >
                        Edit
                      </motion.button>
                    </div>
                  </GlassCard>
                );
              })}
            </div>
          )}
        </motion.div>
      )}

      {/* ── Video Player Modal ── */}
      <AnimatePresence>
        {playbackUrl && playingRecording && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={closePlayer}
            style={{
              position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
              background: 'rgba(0,0,0,0.85)', zIndex: 1000,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              padding: '20px',
            }}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              onClick={e => e.stopPropagation()}
              style={{
                width: '100%', maxWidth: '800px',
                background: isDark ? '#1a1a2e' : '#fff',
                borderRadius: '16px', overflow: 'hidden',
                boxShadow: '0 20px 60px rgba(0,0,0,0.5)',
              }}
            >
              {/* Player Header */}
              <div style={{
                display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                padding: '14px 18px',
                borderBottom: `1px solid ${isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.08)'}`,
              }}>
                <div>
                  <p style={{ fontSize: '15px', fontWeight: 600, color: colors.text, margin: 0 }}>
                    {cameras.find(c => c.id === playingRecording.camera_id)?.name || 'Recording'}
                  </p>
                  <p style={{ fontSize: '12px', color: colors.textMuted, margin: 0 }}>
                    {formatDate(playingRecording.started_at)} · {formatDuration(playingRecording.duration_secs)} · {formatBytes(playingRecording.file_size)}
                  </p>
                </div>
                <motion.button
                  whileTap={{ scale: 0.9 }}
                  onClick={closePlayer}
                  style={{
                    width: '32px', height: '32px', borderRadius: '50%', border: 'none',
                    cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
                    color: colors.textMuted, background: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.06)',
                  }}
                >
                  <HiOutlineX size={18} />
                </motion.button>
              </div>

              {/* Video Element */}
              <div style={{ background: '#000', position: 'relative' }}>
                <video
                  src={playbackUrl}
                  controls
                  autoPlay
                  style={{ width: '100%', maxHeight: '60vh', display: 'block' }}
                  onError={() => setError('Failed to play recording. The file may be corrupted or unavailable.')}
                >
                  Your browser does not support video playback.
                </video>
              </div>

              {/* Player Footer */}
              <div style={{
                display: 'flex', gap: '8px', padding: '12px 18px',
                borderTop: `1px solid ${isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.08)'}`,
              }}>
                <motion.button
                  whileTap={{ scale: 0.9 }}
                  onClick={() => handleDownloadRecording(playingRecording.id, playingRecording.file_name)}
                  style={{
                    padding: '8px 16px', borderRadius: '8px', border: 'none',
                    cursor: 'pointer', fontSize: '13px', fontWeight: 500,
                    display: 'flex', alignItems: 'center', gap: '6px',
                    color: '#fff', background: colors.accent,
                  }}
                >
                  <HiOutlineDownload size={16} /> Download
                </motion.button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default StoragePageNew;

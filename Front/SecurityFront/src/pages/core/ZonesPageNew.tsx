import React, { useState, useEffect, useCallback } from 'react';
import { useSearchParams } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { useTheme } from '../../contexts/ThemeContext';
import { GlassCard, ToggleSwitch } from '../../components/GlassCard';
import { ZoneDrawingCanvas } from '../../components/ZoneDrawingCanvas';
import { useWebRTCStream } from '../../hooks/useWebRTCStream';
import { useAllCameras } from '../../hooks/useAllCameras';
import {
  zonesApi,
  tokenStorage,
  ZoneResponse,
  ZoneStatsResponse,
  ZoneType,
  ZoneSeverity,
  CameraWithPermission,
} from '../../services/api';
import {
  HiOutlineShieldCheck,
  HiOutlinePlus,
  HiOutlinePencil,
  HiOutlineTrash,
  HiOutlineX,
  HiOutlineVideoCamera,
  HiOutlineExclamation,
  HiOutlineClock,
  HiOutlineSearch,
  HiOutlineChevronDown,
  HiOutlineCheck,
  HiOutlineRefresh,
} from 'react-icons/hi';
import { BsShieldExclamation, BsGrid3X3Gap } from 'react-icons/bs';
import {
  RiShieldCheckLine,
  RiRadarLine,
  RiAlarmWarningLine,
  RiForbidLine,
  RiWalkLine,
  RiGroupLine,
  RiUserLocationLine,
} from 'react-icons/ri';

// ── Constants ───────────────────────────────────────────────────────
const ZONE_TYPE_META: Record<ZoneType, { label: string; icon: React.ReactNode; color: string }> = {
  intrusion:   { label: 'Intrusion',   icon: <BsShieldExclamation size={18} />, color: '#ef4444' },
  motion:      { label: 'Motion',      icon: <RiRadarLine size={18} />,         color: '#3b82f6' },
  loitering:   { label: 'Loitering',   icon: <RiWalkLine size={18} />,          color: '#f59e0b' },
  line_cross:  { label: 'Line Cross',  icon: <RiAlarmWarningLine size={18} />,  color: '#8b5cf6' },
  crowd:       { label: 'Crowd',       icon: <RiGroupLine size={18} />,         color: '#ec4899' },
  restricted:  { label: 'Restricted',  icon: <RiForbidLine size={18} />,        color: '#dc2626' },
  counting:    { label: 'Counting',    icon: <RiUserLocationLine size={18} />,  color: '#06b6d4' },
};

const SEVERITY_META: Record<ZoneSeverity, { label: string; color: string }> = {
  low:      { label: 'Low',      color: '#22c55e' },
  medium:   { label: 'Medium',   color: '#f59e0b' },
  high:     { label: 'High',     color: '#f97316' },
  critical: { label: 'Critical', color: '#ef4444' },
};

// ── Camera stream wrapper for zone drawing ──────────────────────────
const CameraStreamForDrawing: React.FC<{
  camera: CameraWithPermission;
  existingZones: ZoneResponse[];
  onPolygonComplete: (points: { x: number; y: number }[]) => void;
  onCancel: () => void;
  isDrawing: boolean;
}> = ({ camera, existingZones, onPolygonComplete, onCancel, isDrawing }) => {
  const authToken = tokenStorage.getAccessToken() || '';
  const { state } = useWebRTCStream({ 
    cameraId: camera.id, 
    authToken, 
    autoConnect: true 
  });

  // Keep a persistent data-URL snapshot so the canvas never goes black.
  // Blob URLs from useWebRTCStream are revoked every frame, so we convert
  // to a stable data URL that survives even if the WS disconnects.
  const [persistentFrame, setPersistentFrame] = React.useState<string | null>(null);
  const lastBlobRef = React.useRef<string | null>(null);

  React.useEffect(() => {
    if (!state.frameUrl || state.frameUrl === lastBlobRef.current) return;
    lastBlobRef.current = state.frameUrl;
    // Convert blob URL → data URL for persistence
    const img = new Image();
    img.onload = () => {
      try {
        const cvs = document.createElement('canvas');
        cvs.width = img.naturalWidth;
        cvs.height = img.naturalHeight;
        const ctx = cvs.getContext('2d');
        if (ctx) {
          ctx.drawImage(img, 0, 0);
          setPersistentFrame(cvs.toDataURL('image/jpeg', 0.85));
        }
      } catch {
        // Tainted canvas - just use the blob URL directly
        setPersistentFrame(state.frameUrl);
      }
    };
    img.onerror = () => { /* keep previous persistentFrame */ };
    img.src = state.frameUrl;
  }, [state.frameUrl]);

  // Prefer live blob URL, fall back to persistent data URL
  const displayUrl = state.frameUrl || persistentFrame;
  
  return (
    <div style={{ position: 'relative', width: '100%', height: '100%' }}>
      {displayUrl ? (
        <img
          src={displayUrl}
          alt={camera.name}
          style={{
            position: 'absolute',
            inset: 0,
            width: '100%',
            height: '100%',
            objectFit: 'contain',
            display: 'block',
          }}
        />
      ) : (
        <div style={{
          position: 'absolute', inset: 0,
          display: 'flex', flexDirection: 'column',
          alignItems: 'center', justifyContent: 'center',
          background: 'rgba(0,0,0,0.7)', color: 'rgba(255,255,255,0.5)',
          fontSize: '14px', gap: '8px',
        }}>
          {state.isConnecting ? (
            <>
              <div style={{ 
                width: 24, height: 24, borderRadius: '50%',
                border: '2px solid rgba(255,255,255,0.2)',
                borderTopColor: '#3b82f6',
                animation: 'spin 1s linear infinite',
              }} />
              <span>Connecting to camera...</span>
            </>
          ) : state.isConnected ? (
            <>
              <span style={{ fontSize: '28px' }}>📷</span>
              <span style={{ color: '#f59e0b' }}>No Signal — waiting for camera feed</span>
              <span style={{ fontSize: '11px', opacity: 0.6 }}>You can still draw zones on this canvas</span>
            </>
          ) : (
            <>
              <span style={{ fontSize: '28px' }}>⚠️</span>
              <span style={{ color: '#ef4444' }}>Camera offline</span>
            </>
          )}
        </div>
      )}
      {/* Always render ZoneDrawingCanvas — pass persistent frame so snapshot
          capture succeeds even after WS disconnects */}
      <ZoneDrawingCanvas
        frameUrl={persistentFrame || state.frameUrl}
        existingZones={existingZones}
        onPolygonComplete={onPolygonComplete}
        onCancel={onCancel}
        isDrawing={isDrawing}
      />
    </div>
  );
};

// ── Main Page ───────────────────────────────────────────────────────
export const ZonesPageNew: React.FC = () => {
  const { colors, preferences } = useTheme();
  const isDark = preferences.mode === 'dark';
  const [searchParams, setSearchParams] = useSearchParams();

  // Data
  const { cameras } = useAllCameras();
  const [zones, setZones] = useState<ZoneResponse[]>([]);
  const [stats, setStats] = useState<ZoneStatsResponse | null>(null);
  const [loading, setLoading] = useState(true);

  // UI state
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [editingZone, setEditingZone] = useState<ZoneResponse | null>(null);
  const [filterType, setFilterType] = useState<ZoneType | ''>('');
  const [filterCamera, setFilterCamera] = useState<string>('');
  const [searchQuery, setSearchQuery] = useState('');
  const [expandedZoneId, setExpandedZoneId] = useState<string | null>(null);

  // Create/edit form
  const [formCameraId, setFormCameraId] = useState('');
  const [formName, setFormName] = useState('');
  const [formType, setFormType] = useState<ZoneType>('intrusion');
  const [formSeverity, setFormSeverity] = useState<ZoneSeverity>('medium');
  const [formColor, setFormColor] = useState('#ef4444');
  const [formDescription, setFormDescription] = useState('');
  const [formSensitivity, setFormSensitivity] = useState(50);
  const [formTriggerDuration, setFormTriggerDuration] = useState(3);
  const [formCooldown, setFormCooldown] = useState(30);
  const [formPoints, setFormPoints] = useState<{ x: number; y: number }[]>([]);
  const [isDrawingMode, setIsDrawingMode] = useState(false);
  const [formStep, setFormStep] = useState<'config' | 'draw'>('config');

  // Schedule
  const [formScheduleEnabled, setFormScheduleEnabled] = useState(false);
  const [formScheduleStart, setFormScheduleStart] = useState('22:00');
  const [formScheduleEnd, setFormScheduleEnd] = useState('06:00');
  const [formScheduleDays, setFormScheduleDays] = useState('mon,tue,wed,thu,fri,sat,sun');

  // ── Read camera ID from URL and open create modal ──────────────
  useEffect(() => {
    const cameraIdFromUrl = searchParams.get('camera');
    if (cameraIdFromUrl && cameras.length > 0) {
      // Check if camera exists
      const camera = cameras.find(c => c.id === cameraIdFromUrl);
      if (camera) {
        setFormCameraId(cameraIdFromUrl);
        setShowCreateModal(true);
        setFormStep('config'); // Start with config, user will click "Draw Zone" to proceed
        // Clear the URL parameter after reading it
        searchParams.delete('camera');
        setSearchParams(searchParams, { replace: true });
      }
    }
  }, [searchParams, cameras, setSearchParams]);

  // ── Fetch data ──────────────────────────────────────────────────
  const fetchZones = useCallback(async () => {
    try {
      setLoading(true);
      const [zoneList, zoneStats] = await Promise.all([zonesApi.listZones(), zonesApi.getStats()]);
      setZones(zoneList);
      setStats(zoneStats);
    } catch (err) {
      console.error('Failed to fetch zones:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchZones();
  }, [fetchZones]);

  // ── Filtered zones ──────────────────────────────────────────────
  const filteredZones = zones.filter((z) => {
    if (filterType && z.zone_type !== filterType) return false;
    if (filterCamera && z.camera_id !== filterCamera) return false;
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      if (!z.name.toLowerCase().includes(q) && !(z.description || '').toLowerCase().includes(q)) return false;
    }
    return true;
  });

  // Camera lookup
  const cameraMap = new Map(cameras.map((c) => [c.id, c]));

  // ── Handlers ────────────────────────────────────────────────────
  const resetForm = () => {
    setFormCameraId('');
    setFormName('');
    setFormType('intrusion');
    setFormSeverity('medium');
    setFormColor('#ef4444');
    setFormDescription('');
    setFormSensitivity(50);
    setFormTriggerDuration(3);
    setFormCooldown(30);
    setFormPoints([]);
    setIsDrawingMode(false);
    setFormStep('config');
    setFormScheduleEnabled(false);
    setFormScheduleStart('22:00');
    setFormScheduleEnd('06:00');
    setFormScheduleDays('mon,tue,wed,thu,fri,sat,sun');
  };

  const openCreate = () => {
    resetForm();
    setEditingZone(null);
    setShowCreateModal(true);
  };

  const openEdit = (zone: ZoneResponse) => {
    setEditingZone(zone);
    setFormCameraId(zone.camera_id);
    setFormName(zone.name);
    setFormType(zone.zone_type);
    setFormSeverity(zone.severity);
    setFormColor(zone.color);
    setFormDescription(zone.description || '');
    setFormSensitivity(zone.sensitivity);
    setFormTriggerDuration(zone.min_trigger_duration);
    setFormCooldown(zone.alert_cooldown);
    setFormPoints(zone.points);
    setFormStep('config');
    setFormScheduleEnabled(zone.schedule_enabled);
    setFormScheduleStart(zone.schedule_start || '22:00');
    setFormScheduleEnd(zone.schedule_end || '06:00');
    setFormScheduleDays(zone.schedule_days || 'mon,tue,wed,thu,fri,sat,sun');
    setShowCreateModal(true);
  };

  const handleSave = async () => {
    console.log('Attempting to save zone:', { 
      cameraId: formCameraId, 
      name: formName, 
      points: formPoints.length,
      type: formType 
    });
    
    if (!formCameraId) {
      alert('Please select a camera');
      return;
    }
    if (!formName.trim()) {
      alert('Please enter a zone name');
      return;
    }
    if (formPoints.length < 3) {
      alert(`Please draw a zone polygon with at least 3 points (currently ${formPoints.length} points)`);
      setFormStep('draw');
      return;
    }
    
    try {
      const zoneData = {
        name: formName.trim(),
        zone_type: formType,
        severity: formSeverity,
        points: formPoints,
        color: formColor,
        description: formDescription.trim() || undefined,
        sensitivity: formSensitivity,
        min_trigger_duration: formTriggerDuration,
        alert_cooldown: formCooldown,
        schedule_enabled: formScheduleEnabled,
        schedule_start: formScheduleEnabled ? formScheduleStart : undefined,
        schedule_end: formScheduleEnabled ? formScheduleEnd : undefined,
        schedule_days: formScheduleEnabled ? formScheduleDays : undefined,
      };
      
      console.log('Saving zone data:', zoneData);
      
      if (editingZone) {
        await zonesApi.updateZone(editingZone.id, zoneData);
        console.log('Zone updated successfully');
      } else {
        const newZone = await zonesApi.createZone({ camera_id: formCameraId, ...zoneData });
        console.log('Zone created successfully:', newZone);
      }
      
      setShowCreateModal(false);
      resetForm();
      await fetchZones();
    } catch (err: any) {
      console.error('Failed to save zone:', err);
      const errorMsg = typeof err === 'string' ? err 
        : err?.detail || err?.message || err?.response?.data?.detail || JSON.stringify(err) || 'Unknown error';
      alert(`Failed to save zone: ${errorMsg}`);
    }
  };

  const handleToggle = async (zone: ZoneResponse) => {
    try {
      if (zone.is_active) {
        await zonesApi.deactivateZone(zone.id);
      } else {
        await zonesApi.activateZone(zone.id);
      }
      fetchZones();
    } catch (err) {
      console.error('Failed to toggle zone:', err);
    }
  };

  const handleDelete = async (zoneId: string) => {
    if (!window.confirm('Delete this detection zone?')) return;
    try {
      await zonesApi.deleteZone(zoneId);
      fetchZones();
    } catch (err) {
      console.error('Failed to delete zone:', err);
    }
  };

  // Get zones for the selected camera during drawing
  const selectedCameraZones = zones.filter((z) => z.camera_id === formCameraId);
  const selectedCamera = formCameraId ? cameraMap.get(formCameraId) : undefined;

  // ── Styles ──────────────────────────────────────────────────────
  const inputStyle: React.CSSProperties = {
    width: '100%',
    padding: '10px 14px',
    borderRadius: '12px',
    border: `1px solid ${isDark ? 'rgba(255,255,255,0.12)' : 'rgba(0,0,0,0.1)'}`,
    background: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.03)',
    color: colors.text,
    fontSize: '14px',
    outline: 'none',
  };

  const labelStyle: React.CSSProperties = {
    fontSize: '12px',
    fontWeight: 600,
    color: colors.textMuted,
    marginBottom: '6px',
    display: 'block',
    textTransform: 'uppercase',
    letterSpacing: '0.5px',
  };

  return (
    <div style={{
      minHeight: '100vh',
      padding: 'clamp(16px, 3vw, 32px)',
      paddingTop: 'max(60px, clamp(16px, 3vw, 32px))',
      paddingBottom: 'clamp(100px, 12vh, 150px)',
      width: '100%',
    }}>
      {/* ── Header ─────────────────────────────────────────────── */}
      <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} style={{ marginBottom: '24px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
          <div>
            <h1 style={{ fontSize: '32px', fontWeight: 700, color: colors.text, letterSpacing: '-0.5px' }}>
              Detection Zones
            </h1>
            <p style={{ fontSize: '14px', color: colors.textMuted, marginTop: '4px' }}>
              Define regions of interest on your camera feeds for intelligent monitoring
            </p>
          </div>
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={openCreate}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              padding: '12px 20px',
              borderRadius: '14px',
              border: 'none',
              background: `linear-gradient(135deg, ${colors.accent}, ${colors.accent}cc)`,
              color: '#fff',
              fontSize: '14px',
              fontWeight: 600,
              cursor: 'pointer',
              boxShadow: `0 4px 15px ${colors.accent}40`,
            }}
          >
            <HiOutlinePlus size={18} />
            New Zone
          </motion.button>
        </div>
      </motion.div>

      {/* ── Stats Cards ────────────────────────────────────────── */}
      {stats && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.05 }}
          style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: '12px', marginBottom: '24px' }}
        >
          {[
            { label: 'Total Zones', value: stats.total_zones, icon: <BsGrid3X3Gap size={20} />, color: '#3b82f6' },
            { label: 'Active', value: stats.active_zones, icon: <RiShieldCheckLine size={20} />, color: '#22c55e' },
            { label: 'Cameras', value: stats.cameras_with_zones, icon: <HiOutlineVideoCamera size={20} />, color: '#8b5cf6' },
            { label: 'Critical', value: stats.zones_by_severity?.critical || 0, icon: <HiOutlineExclamation size={20} />, color: '#ef4444' },
          ].map((stat, i) => (
            <GlassCard key={i} padding="16px" borderRadius="16px">
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <div style={{
                  width: '40px', height: '40px', borderRadius: '12px',
                  background: `${stat.color}15`, display: 'flex',
                  alignItems: 'center', justifyContent: 'center', color: stat.color,
                }}>
                  {stat.icon}
                </div>
                <div>
                  <div style={{ fontSize: '22px', fontWeight: 700, color: colors.text }}>{stat.value}</div>
                  <div style={{ fontSize: '11px', color: colors.textMuted, fontWeight: 500 }}>{stat.label}</div>
                </div>
              </div>
            </GlassCard>
          ))}
        </motion.div>
      )}

      {/* ── Filters ────────────────────────────────────────────── */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        style={{ display: 'flex', gap: '10px', marginBottom: '20px', flexWrap: 'wrap' }}
      >
        <div style={{ position: 'relative', flex: 1, minWidth: '180px' }}>
          <HiOutlineSearch size={16} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: colors.textMuted }} />
          <input
            placeholder="Search zones..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            style={{ ...inputStyle, paddingLeft: '36px' }}
          />
        </div>
        <select
          value={filterType}
          onChange={(e) => setFilterType(e.target.value as ZoneType | '')}
          style={{ ...inputStyle, width: 'auto', minWidth: '140px', cursor: 'pointer' }}
        >
          <option value="">All Types</option>
          {Object.entries(ZONE_TYPE_META).map(([key, meta]) => (
            <option key={key} value={key}>{meta.label}</option>
          ))}
        </select>
        <select
          value={filterCamera}
          onChange={(e) => setFilterCamera(e.target.value)}
          style={{ ...inputStyle, width: 'auto', minWidth: '160px', cursor: 'pointer' }}
        >
          <option value="">All Cameras</option>
          {cameras.filter(c => !c.isShared).map((cam) => (
            <option key={cam.id} value={cam.id}>{cam.name}</option>
          ))}
        </select>
      </motion.div>

      {/* ── Zone list ──────────────────────────────────────────── */}
      {loading ? (
        <div style={{ textAlign: 'center', padding: '60px 0', color: colors.textMuted }}>
          <motion.div animate={{ rotate: 360 }} transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}>
            <HiOutlineShieldCheck size={40} />
          </motion.div>
          <p style={{ marginTop: '12px' }}>Loading zones...</p>
        </div>
      ) : filteredZones.length === 0 ? (
        <GlassCard padding="40px" borderRadius="20px">
          <div style={{ textAlign: 'center' }}>
            <BsShieldExclamation size={48} style={{ color: colors.textMuted, marginBottom: '16px' }} />
            <h3 style={{ color: colors.text, marginBottom: '8px' }}>No Detection Zones</h3>
            <p style={{ color: colors.textMuted, fontSize: '14px', marginBottom: '20px' }}>
              Create your first zone to start intelligent monitoring on your camera feeds
            </p>
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={openCreate}
              style={{
                padding: '12px 24px',
                borderRadius: '12px',
                border: 'none',
                background: colors.accent,
                color: '#fff',
                fontSize: '14px',
                fontWeight: 600,
                cursor: 'pointer',
              }}
            >
              <HiOutlinePlus size={16} style={{ marginRight: '6px', verticalAlign: 'middle' }} />
              Create Zone
            </motion.button>
          </div>
        </GlassCard>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
          {filteredZones.map((zone, index) => {
            const typeMeta = ZONE_TYPE_META[zone.zone_type] || ZONE_TYPE_META.intrusion;
            const sevMeta = SEVERITY_META[zone.severity] || SEVERITY_META.medium;
            const cam = cameraMap.get(zone.camera_id);
            const isExpanded = expandedZoneId === zone.id;

            return (
              <motion.div
                key={zone.id}
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.05 + index * 0.03 }}
              >
                <GlassCard padding="0" borderRadius="18px">
                  {/* Main row */}
                  <div
                    onClick={() => setExpandedZoneId(isExpanded ? null : zone.id)}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '14px',
                      padding: '16px',
                      cursor: 'pointer',
                    }}
                  >
                    {/* Icon */}
                    <div style={{
                      width: '48px', height: '48px', borderRadius: '14px',
                      background: `${typeMeta.color}15`,
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      color: typeMeta.color, flexShrink: 0,
                    }}>
                      {typeMeta.icon}
                    </div>

                    {/* Content */}
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                        <span style={{ fontSize: '15px', fontWeight: 600, color: colors.text }}>{zone.name}</span>
                        <span style={{
                          padding: '2px 8px', borderRadius: '8px',
                          background: `${sevMeta.color}20`, fontSize: '10px',
                          fontWeight: 700, color: sevMeta.color, textTransform: 'uppercase',
                        }}>
                          {sevMeta.label}
                        </span>
                        <span style={{
                          padding: '2px 8px', borderRadius: '8px',
                          background: zone.is_active ? 'rgba(34,197,94,0.15)' : 'rgba(107,114,128,0.15)',
                          fontSize: '10px', fontWeight: 700,
                          color: zone.is_active ? '#22c55e' : '#6b7280',
                          textTransform: 'uppercase',
                        }}>
                          {zone.is_active ? 'Active' : 'Inactive'}
                        </span>
                      </div>
                      <div style={{ fontSize: '12px', color: colors.textMuted, marginTop: '3px', display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
                        <span>{typeMeta.label}</span>
                        <span>&bull;</span>
                        <span>{cam?.name || 'Unknown Camera'}</span>
                        <span>&bull;</span>
                        <span>{zone.points.length} points</span>
                        {zone.schedule_enabled && (
                          <>
                            <span>&bull;</span>
                            <span style={{ color: '#8b5cf6' }}>
                              <HiOutlineClock size={10} style={{ verticalAlign: 'middle', marginRight: '2px' }} />
                              Scheduled
                            </span>
                          </>
                        )}
                      </div>
                    </div>

                    {/* Toggle */}
                    <ToggleSwitch checked={zone.is_active} onChange={() => handleToggle(zone)} />

                    {/* Expand chevron */}
                    <motion.div animate={{ rotate: isExpanded ? 180 : 0 }}>
                      <HiOutlineChevronDown size={18} style={{ color: colors.textMuted }} />
                    </motion.div>
                  </div>

                  {/* Expanded details */}
                  <AnimatePresence>
                    {isExpanded && (
                      <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: 'auto', opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        style={{ overflow: 'hidden' }}
                      >
                        <div style={{
                          padding: '0 16px 16px',
                          borderTop: `1px solid ${isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.05)'}`,
                          paddingTop: '16px',
                        }}>
                          {zone.description && (
                            <p style={{ fontSize: '13px', color: colors.textSecondary, marginBottom: '12px' }}>
                              {zone.description}
                            </p>
                          )}

                          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))', gap: '10px', marginBottom: '16px' }}>
                            {[
                              { label: 'Sensitivity', value: `${zone.sensitivity}%` },
                              { label: 'Trigger Delay', value: `${zone.min_trigger_duration}s` },
                              { label: 'Alert Cooldown', value: `${zone.alert_cooldown}s` },
                              { label: 'Color', value: zone.color },
                            ].map((item, i) => (
                              <div key={i} style={{
                                padding: '10px', borderRadius: '10px',
                                background: isDark ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.02)',
                              }}>
                                <div style={{ fontSize: '10px', fontWeight: 600, color: colors.textMuted, textTransform: 'uppercase', marginBottom: '4px' }}>
                                  {item.label}
                                </div>
                                <div style={{ fontSize: '14px', fontWeight: 600, color: colors.text, display: 'flex', alignItems: 'center', gap: '6px' }}>
                                  {item.label === 'Color' && (
                                    <div style={{ width: '14px', height: '14px', borderRadius: '4px', background: zone.color }} />
                                  )}
                                  {item.value}
                                </div>
                              </div>
                            ))}
                          </div>

                          {zone.schedule_enabled && (
                            <div style={{
                              padding: '10px 14px',
                              borderRadius: '10px',
                              background: 'rgba(139,92,246,0.08)',
                              marginBottom: '16px',
                              fontSize: '13px',
                              color: colors.text,
                            }}>
                              <HiOutlineClock size={14} style={{ verticalAlign: 'middle', marginRight: '6px', color: '#8b5cf6' }} />
                              Active {zone.schedule_start} &ndash; {zone.schedule_end}
                              {zone.schedule_days && (` on ${zone.schedule_days}`)}
                            </div>
                          )}

                          <div style={{ display: 'flex', gap: '8px' }}>
                            <motion.button
                              whileHover={{ scale: 1.05 }}
                              whileTap={{ scale: 0.95 }}
                              onClick={() => openEdit(zone)}
                              style={{
                                display: 'flex', alignItems: 'center', gap: '6px',
                                padding: '8px 16px', borderRadius: '10px', border: 'none',
                                background: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.05)',
                                color: colors.text, fontSize: '13px', fontWeight: 500, cursor: 'pointer',
                              }}
                            >
                              <HiOutlinePencil size={14} /> Edit
                            </motion.button>
                            <motion.button
                              whileHover={{ scale: 1.05 }}
                              whileTap={{ scale: 0.95 }}
                              onClick={() => handleDelete(zone.id)}
                              style={{
                                display: 'flex', alignItems: 'center', gap: '6px',
                                padding: '8px 16px', borderRadius: '10px', border: 'none',
                                background: 'rgba(239,68,68,0.1)', color: '#ef4444',
                                fontSize: '13px', fontWeight: 500, cursor: 'pointer',
                              }}
                            >
                              <HiOutlineTrash size={14} /> Delete
                            </motion.button>
                          </div>
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </GlassCard>
              </motion.div>
            );
          })}
        </div>
      )}

      {/* ── Create / Edit Modal ────────────────────────────────── */}
      <AnimatePresence>
        {showCreateModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => { setShowCreateModal(false); resetForm(); }}
            style={{
              position: 'fixed', inset: 0, zIndex: 9999,
              background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(8px)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              padding: '20px',
            }}
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.9, y: 30 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 30 }}
              onClick={(e) => e.stopPropagation()}
              style={{
                width: '100%',
                maxWidth: formStep === 'draw' ? '900px' : '540px',
                maxHeight: '90vh',
                overflow: 'auto',
                background: isDark ? '#141428' : '#fff',
                borderRadius: '24px',
                border: `1px solid ${isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.08)'}`,
                boxShadow: '0 25px 80px rgba(0,0,0,0.4)',
              }}
            >
              {/* Modal header */}
              <div style={{
                display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                padding: '20px 24px', borderBottom: `1px solid ${isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.06)'}`,
              }}>
                <h2 style={{ fontSize: '20px', fontWeight: 700, color: colors.text }}>
                  {editingZone ? 'Edit Zone' : 'Create Detection Zone'}
                </h2>
                <motion.button
                  whileHover={{ scale: 1.1 }}
                  whileTap={{ scale: 0.9 }}
                  onClick={() => { setShowCreateModal(false); resetForm(); }}
                  style={{
                    width: '36px', height: '36px', borderRadius: '10px',
                    background: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.05)',
                    border: 'none', display: 'flex', alignItems: 'center',
                    justifyContent: 'center', cursor: 'pointer', color: colors.textMuted,
                  }}
                >
                  <HiOutlineX size={18} />
                </motion.button>
              </div>

              {/* Step indicator */}
              <div style={{ display: 'flex', gap: '4px', padding: '16px 24px 0' }}>
                {['config', 'draw'].map((step) => (
                  <div
                    key={step}
                    style={{
                      flex: 1, height: '4px', borderRadius: '2px',
                      background: formStep === step || (step === 'config' && formStep === 'draw')
                        ? colors.accent
                        : isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.08)',
                      transition: 'background 0.3s',
                    }}
                  />
                ))}
              </div>

              <div style={{ padding: '20px 24px 24px' }}>
                {formStep === 'config' ? (
                  <>
                    {/* Camera selection */}
                    <div style={{ marginBottom: '16px' }}>
                      <label style={labelStyle}>Camera *</label>
                      <select
                        value={formCameraId}
                        onChange={(e) => { setFormCameraId(e.target.value); setFormColor(ZONE_TYPE_META[formType]?.color || '#ef4444'); }}
                        style={{ ...inputStyle, cursor: 'pointer' }}
                        disabled={!!editingZone}
                      >
                        <option value="">Select a camera...</option>
                        {cameras.filter(c => !c.isShared).map((cam) => (
                          <option key={cam.id} value={cam.id}>{cam.name}</option>
                        ))}
                      </select>
                    </div>

                    {/* Name */}
                    <div style={{ marginBottom: '16px' }}>
                      <label style={labelStyle}>Zone Name *</label>
                      <input
                        type="text"
                        placeholder="e.g. Front Door Perimeter"
                        value={formName}
                        onChange={(e) => setFormName(e.target.value)}
                        style={inputStyle}
                      />
                    </div>

                    {/* Type selector */}
                    <div style={{ marginBottom: '16px' }}>
                      <label style={labelStyle}>Detection Type</label>
                      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(100px, 1fr))', gap: '8px' }}>
                        {(Object.entries(ZONE_TYPE_META) as [ZoneType, { label: string; icon: React.ReactNode; color: string }][]).map(([key, meta]) => (
                          <motion.button
                            key={key}
                            whileHover={{ scale: 1.04 }}
                            whileTap={{ scale: 0.96 }}
                            onClick={() => { setFormType(key); setFormColor(meta.color); }}
                            style={{
                              display: 'flex', flexDirection: 'column', alignItems: 'center',
                              gap: '6px', padding: '12px 8px', borderRadius: '12px',
                              border: formType === key ? `2px solid ${meta.color}` : `1px solid ${isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.06)'}`,
                              background: formType === key ? `${meta.color}12` : 'transparent',
                              color: formType === key ? meta.color : colors.textMuted,
                              cursor: 'pointer', fontSize: '11px', fontWeight: 600,
                            }}
                          >
                            {meta.icon}
                            {meta.label}
                          </motion.button>
                        ))}
                      </div>
                    </div>

                    {/* Severity */}
                    <div style={{ marginBottom: '16px' }}>
                      <label style={labelStyle}>Severity</label>
                      <div style={{ display: 'flex', gap: '8px' }}>
                        {(Object.entries(SEVERITY_META) as [ZoneSeverity, { label: string; color: string }][]).map(([key, meta]) => (
                          <motion.button
                            key={key}
                            whileHover={{ scale: 1.05 }}
                            whileTap={{ scale: 0.95 }}
                            onClick={() => setFormSeverity(key)}
                            style={{
                              flex: 1, padding: '10px', borderRadius: '10px',
                              border: formSeverity === key ? `2px solid ${meta.color}` : `1px solid ${isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.06)'}`,
                              background: formSeverity === key ? `${meta.color}12` : 'transparent',
                              color: formSeverity === key ? meta.color : colors.textMuted,
                              cursor: 'pointer', fontSize: '12px', fontWeight: 600,
                            }}
                          >
                            {meta.label}
                          </motion.button>
                        ))}
                      </div>
                    </div>

                    {/* Description */}
                    <div style={{ marginBottom: '16px' }}>
                      <label style={labelStyle}>Description</label>
                      <textarea
                        placeholder="Optional description..."
                        value={formDescription}
                        onChange={(e) => setFormDescription(e.target.value)}
                        style={{ ...inputStyle, minHeight: '60px', resize: 'vertical' }}
                      />
                    </div>

                    {/* Sensitivity slider */}
                    <div style={{ marginBottom: '16px' }}>
                      <label style={labelStyle}>Sensitivity: {formSensitivity}%</label>
                      <input
                        type="range"
                        min="0"
                        max="100"
                        value={formSensitivity}
                        onChange={(e) => setFormSensitivity(parseInt(e.target.value))}
                        style={{ width: '100%', accentColor: colors.accent }}
                      />
                      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '10px', color: colors.textMuted }}>
                        <span>Low</span>
                        <span>High</span>
                      </div>
                    </div>

                    {/* Timing */}
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '16px' }}>
                      <div>
                        <label style={labelStyle}>Trigger Delay (sec)</label>
                        <input
                          type="number"
                          min="0"
                          value={formTriggerDuration}
                          onChange={(e) => setFormTriggerDuration(parseInt(e.target.value) || 0)}
                          style={inputStyle}
                        />
                      </div>
                      <div>
                        <label style={labelStyle}>Alert Cooldown (sec)</label>
                        <input
                          type="number"
                          min="0"
                          value={formCooldown}
                          onChange={(e) => setFormCooldown(parseInt(e.target.value) || 0)}
                          style={inputStyle}
                        />
                      </div>
                    </div>

                    {/* Schedule */}
                    <div style={{
                      padding: '16px', borderRadius: '14px',
                      background: isDark ? 'rgba(255,255,255,0.03)' : 'rgba(0,0,0,0.02)',
                      marginBottom: '20px',
                    }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: formScheduleEnabled ? '12px' : 0 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                          <HiOutlineClock size={16} style={{ color: '#8b5cf6' }} />
                          <span style={{ fontSize: '13px', fontWeight: 600, color: colors.text }}>Schedule</span>
                        </div>
                        <ToggleSwitch checked={formScheduleEnabled} onChange={() => setFormScheduleEnabled(!formScheduleEnabled)} />
                      </div>
                      {formScheduleEnabled && (
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                          <div>
                            <label style={labelStyle}>Start Time</label>
                            <input type="time" value={formScheduleStart} onChange={(e) => setFormScheduleStart(e.target.value)} style={inputStyle} />
                          </div>
                          <div>
                            <label style={labelStyle}>End Time</label>
                            <input type="time" value={formScheduleEnd} onChange={(e) => setFormScheduleEnd(e.target.value)} style={inputStyle} />
                          </div>
                          <div style={{ gridColumn: '1 / -1' }}>
                            <label style={labelStyle}>Active Days</label>
                            <div style={{ display: 'flex', gap: '4px' }}>
                              {['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun'].map((day) => {
                                const active = formScheduleDays.includes(day);
                                return (
                                  <motion.button
                                    key={day}
                                    whileTap={{ scale: 0.9 }}
                                    onClick={() => {
                                      const days = formScheduleDays.split(',').filter(Boolean);
                                      if (active) setFormScheduleDays(days.filter((d) => d !== day).join(','));
                                      else setFormScheduleDays([...days, day].join(','));
                                    }}
                                    style={{
                                      flex: 1, padding: '6px 2px', borderRadius: '8px',
                                      border: 'none', fontSize: '11px', fontWeight: 600,
                                      background: active ? `${colors.accent}20` : isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.04)',
                                      color: active ? colors.accent : colors.textMuted,
                                      cursor: 'pointer', textTransform: 'capitalize',
                                    }}
                                  >
                                    {day}
                                  </motion.button>
                                );
                              })}
                            </div>
                          </div>
                        </div>
                      )}
                    </div>

                    {/* Save button — shown when zone polygon already drawn */}
                    {formPoints.length >= 3 && (
                      <motion.button
                        whileHover={{ scale: 1.02 }}
                        whileTap={{ scale: 0.98 }}
                        onClick={() => {
                          console.log('Config step save clicked');
                          handleSave();
                        }}
                        style={{
                          width: '100%', padding: '14px', borderRadius: '14px',
                          border: 'none',
                          background: 'linear-gradient(135deg, #3b82f6, #2563eb)',
                          color: '#fff',
                          fontSize: '15px', fontWeight: 700, cursor: 'pointer',
                          boxShadow: '0 4px 20px rgba(59,130,246,0.3)',
                          display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px',
                        }}
                      >
                        <HiOutlineCheck size={18} />
                        {editingZone ? 'Save Changes' : 'Create Zone'} ({formPoints.length} points)
                      </motion.button>
                    )}

                    {/* Draw / Redraw button */}
                    <motion.button
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                      onClick={() => {
                        if (!formCameraId) { alert('Please select a camera'); return; }
                        if (!formName.trim()) { alert('Please enter a zone name'); return; }
                        setFormStep('draw');
                        setIsDrawingMode(true);
                      }}
                      style={{
                        width: '100%', padding: '14px', borderRadius: '14px',
                        border: formPoints.length >= 3 ? `1px solid ${isDark ? 'rgba(255,255,255,0.12)' : 'rgba(0,0,0,0.1)'}` : 'none',
                        background: formPoints.length >= 3 ? 'transparent' : colors.accent,
                        color: formPoints.length >= 3 ? colors.text : '#fff',
                        fontSize: '15px', fontWeight: 600, cursor: 'pointer',
                      }}
                    >
                      {formPoints.length >= 3 ? 'Redraw Zone on Camera' : 'Draw Zone on Camera'}
                    </motion.button>
                  </>
                ) : (
                  /* ── Drawing step — Full-screen overlay ─────── */
                  <div style={{
                    display: 'flex', flexDirection: 'column', alignItems: 'center',
                    justifyContent: 'center', padding: '24px', gap: '16px',
                  }}>
                    <HiOutlineVideoCamera size={40} style={{ color: colors.accent, opacity: 0.7 }} />
                    <span style={{ fontSize: '14px', color: colors.textMuted, textAlign: 'center' }}>
                      The zone drawing canvas is open in fullscreen.<br />
                      Draw your polygon and press <strong>Done</strong>.
                    </span>
                    <motion.button
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                      onClick={() => { setFormStep('config'); setIsDrawingMode(false); }}
                      style={{
                        padding: '12px 24px', borderRadius: '14px',
                        border: `1px solid ${isDark ? 'rgba(255,255,255,0.12)' : 'rgba(0,0,0,0.1)'}`,
                        background: 'transparent', color: colors.text,
                        fontSize: '14px', fontWeight: 600, cursor: 'pointer',
                      }}
                    >
                      Cancel Drawing
                    </motion.button>
                  </div>
                )}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Full-screen Zone Drawing Overlay ────────────────────── */}
      <AnimatePresence>
        {showCreateModal && formStep === 'draw' && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            style={{
              position: 'fixed', inset: 0, zIndex: 10001,
              background: 'rgba(0,0,0,0.95)', backdropFilter: 'blur(10px)',
              display: 'flex', flexDirection: 'column',
            }}
          >
            {/* Top bar */}
            <div style={{
              display: 'flex', justifyContent: 'space-between', alignItems: 'center',
              padding: '16px 20px',
              borderBottom: '1px solid rgba(255,255,255,0.1)',
              flexShrink: 0,
            }}>
              <div>
                <h3 style={{ color: '#fff', fontSize: '18px', fontWeight: 700, margin: 0 }}>
                  {editingZone ? 'Redraw Detection Zone' : 'Draw Detection Zone'}
                </h3>
                <p style={{ color: 'rgba(255,255,255,0.5)', fontSize: '12px', marginTop: '2px', margin: 0 }}>
                  {cameraMap.get(formCameraId)?.name || 'Camera'} — {formName}
                </p>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                {formPoints.length >= 3 && !isDrawingMode && (
                  <motion.button
                    whileHover={{ scale: 1.04, boxShadow: '0 8px 30px rgba(59,130,246,0.35)' }}
                    whileTap={{ scale: 0.96 }}
                    onClick={() => {
                      console.log('Save zone (top bar) clicked');
                      handleSave();
                    }}
                    style={{
                      height: '40px',
                      padding: '0 18px',
                      borderRadius: '12px',
                      border: 'none',
                      background: 'linear-gradient(135deg, #3b82f6, #2563eb)',
                      color: '#fff',
                      fontSize: '14px',
                      fontWeight: 700,
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '8px',
                      boxShadow: '0 4px 20px rgba(59,130,246,0.25)',
                    }}
                  >
                    <HiOutlineCheck size={18} />
                    {editingZone ? 'Save' : 'Create'}
                  </motion.button>
                )}
                <motion.button
                  whileHover={{ scale: 1.1 }}
                  whileTap={{ scale: 0.9 }}
                  onClick={() => { setFormStep('config'); setIsDrawingMode(false); }}
                  style={{
                    width: '40px', height: '40px', borderRadius: '12px',
                    background: 'rgba(255,255,255,0.1)', border: 'none',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    cursor: 'pointer', color: '#fff',
                  }}
                >
                  <HiOutlineX size={20} />
                </motion.button>
              </div>
            </div>

            {/* Drawing canvas — properly constrained */}
            <div style={{
              flex: 1, position: 'relative', overflow: 'hidden',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              padding: '16px',
            }}>
              <div style={{
                width: '100%', maxWidth: '1100px',
                height: '100%', maxHeight: 'calc(100vh - 160px)',
                position: 'relative',
                borderRadius: '16px', overflow: 'hidden',
              }}>
                {selectedCamera ? (
                <CameraStreamForDrawing
                  camera={selectedCamera}
                  existingZones={selectedCameraZones.filter(z => z.id !== editingZone?.id)}
                  onPolygonComplete={(pts) => {
                    console.log('Zone polygon completed with points:', pts);
                    setFormPoints(pts);
                    setIsDrawingMode(false);
                  }}
                  onCancel={() => { 
                    console.log('Zone drawing cancelled');
                    setIsDrawingMode(false); 
                    setFormStep('config'); 
                  }}
                  isDrawing={isDrawingMode}
                />
              ) : (
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', color: 'rgba(255,255,255,0.5)' }}>
                  Camera not found
                </div>
              )}
              </div>
            </div>

            {/* Bottom panel — appears when polygon is captured */}
            <AnimatePresence>
              {formPoints.length >= 3 && !isDrawingMode && formStep === 'draw' && (
                <motion.div
                  initial={{ y: 100, opacity: 0 }}
                  animate={{ y: 0, opacity: 1 }}
                  exit={{ y: 100, opacity: 0 }}
                  transition={{ type: 'spring', damping: 25, stiffness: 300 }}
                  style={{
                    position: 'fixed',
                    bottom: 0,
                    left: 0,
                    right: 0,
                    padding: '20px',
                    borderTop: '1px solid rgba(255,255,255,0.15)',
                    background: 'linear-gradient(to top, rgba(0,0,0,0.98), rgba(20,20,40,0.95))',
                    backdropFilter: 'blur(20px)',
                    boxShadow: '0 -10px 40px rgba(0,0,0,0.5)',
                    zIndex: 10002,
                    display: 'flex',
                    alignItems: 'center',
                    gap: '16px',
                    flexWrap: 'wrap',
                    justifyContent: 'center',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flex: '1', minWidth: '200px' }}>
                    <div style={{
                      width: '40px',
                      height: '40px',
                      borderRadius: '12px',
                      background: 'linear-gradient(135deg, #22c55e, #16a34a)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      boxShadow: '0 4px 20px rgba(34,197,94,0.3)'
                    }}>
                      <HiOutlineCheck size={22} style={{ color: '#fff' }} />
                    </div>
                    <div>
                      <div style={{ fontSize: '16px', color: '#22c55e', fontWeight: 700 }}>
                        Zone Captured!
                      </div>
                      <div style={{ fontSize: '12px', color: 'rgba(255,255,255,0.6)' }}>
                        {formPoints.length} points defined
                      </div>
                    </div>
                  </div>
                  <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
                    <motion.button
                      whileHover={{ scale: 1.05 }}
                      whileTap={{ scale: 0.95 }}
                      onClick={() => { 
                        console.log('Redraw clicked');
                        setIsDrawingMode(true); 
                        setFormPoints([]); 
                      }}
                      style={{
                        padding: '12px 20px',
                        borderRadius: '12px',
                        border: '2px solid rgba(255,255,255,0.2)',
                        background: 'rgba(255,255,255,0.05)',
                        color: '#fff',
                        fontSize: '14px',
                        fontWeight: 600,
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '8px',
                      }}
                    >
                      <HiOutlineRefresh size={16} />
                      Redraw
                    </motion.button>
                    <motion.button
                      whileHover={{ scale: 1.05 }}
                      whileTap={{ scale: 0.95 }}
                      onClick={() => { 
                        console.log('Back to settings clicked');
                        setFormStep('config'); 
                        setIsDrawingMode(false); 
                      }}
                      style={{
                        padding: '12px 20px',
                        borderRadius: '12px',
                        border: 'none',
                        background: 'rgba(255,255,255,0.15)',
                        color: '#fff',
                        fontSize: '14px',
                        fontWeight: 600,
                        cursor: 'pointer',
                      }}
                    >
                      Back to Settings
                    </motion.button>
                    <motion.button
                      whileHover={{ scale: 1.05, boxShadow: '0 8px 30px rgba(59,130,246,0.4)' }}
                      whileTap={{ scale: 0.95 }}
                      onClick={() => {
                        console.log('Save zone clicked');
                        handleSave();
                      }}
                      style={{
                        padding: '14px 32px',
                        borderRadius: '12px',
                        border: 'none',
                        background: 'linear-gradient(135deg, #3b82f6, #2563eb)',
                        color: '#fff',
                        fontSize: '15px',
                        fontWeight: 700,
                        cursor: 'pointer',
                        boxShadow: '0 4px 20px rgba(59,130,246,0.3)',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '8px',
                      }}
                    >
                      <HiOutlineCheck size={18} />
                      {editingZone ? 'Save Changes' : 'Create Zone'}
                    </motion.button>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

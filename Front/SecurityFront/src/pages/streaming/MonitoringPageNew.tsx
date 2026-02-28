import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useTheme } from '../../contexts/ThemeContext';
import { GlassCard, AnimatedButton } from '../../components/GlassCard';
import { streamingApi, CameraWithPermission } from '../../services/api';
import { useAllCameras } from '../../hooks/useAllCameras';
import { LiveStreamPlayer } from '../../components/LiveStreamPlayer';
import { useVideoStream } from '../../hooks/useVideoStream';
import { 
  HiOutlineArrowLeft,
  HiOutlineDotsVertical,
  HiOutlineVideoCamera,
  HiOutlinePhotograph,
  HiOutlineMicrophone,
  HiOutlineVolumeUp,
  HiOutlineVolumeOff,
  HiOutlineZoomIn,
  HiOutlineAdjustments,
  HiOutlineCloudDownload,
  HiOutlineShare,
  HiOutlinePlay,
  HiOutlinePause,
  HiOutlineChevronLeft,
  HiOutlineChevronRight,
  HiOutlineRefresh,
  HiOutlineExclamationCircle,
  HiOutlineStop,
  HiOutlineSearch,
  HiOutlineX,
  HiOutlinePlus,
  HiOutlineFolder,
  HiOutlineFilter,
  HiOutlineTrash,
  HiOutlinePencil,
} from 'react-icons/hi';
import { BsCircleFill, BsRecordCircle, BsGrid3X3Gap, BsList } from 'react-icons/bs';
import { RiFullscreenLine, RiFullscreenExitLine } from 'react-icons/ri';

// ─── Custom View Groups (localStorage) ────────────────────────────────
interface ViewGroup {
  id: string;
  name: string;
  cameraIds: string[];
}

const VIEW_GROUPS_KEY = 'vigileye_view_groups';

const loadViewGroups = (): ViewGroup[] => {
  try {
    const raw = localStorage.getItem(VIEW_GROUPS_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch { return []; }
};

const saveViewGroups = (groups: ViewGroup[]) => {
  localStorage.setItem(VIEW_GROUPS_KEY, JSON.stringify(groups));
};

// Helper to get camera status for display
const getCameraDisplayStatus = (
  camera: CameraWithPermission,
  recordingCameraIds?: ReadonlySet<string>
): 'live' | 'offline' | 'recording' => {
  if (!camera.is_active) return 'offline';
  if (camera.status !== 'online') return 'offline';
  if (recordingCameraIds?.has(camera.id)) return 'recording';
  return 'live';
};

// Helper to get camera location string
const getCameraLocationString = (camera: CameraWithPermission): string => {
  if (camera.location) {
    const parts = [camera.location.building, camera.location.zone, camera.location.floor].filter(Boolean);
    return parts.join(' • ') || 'Unknown';
  }
  return 'Unknown';
};

// Mini thumbnail component that shows a live preview
const CameraThumbnail: React.FC<{
  camera: CameraWithPermission;
  isOffline: boolean;
  height: number;
}> = ({ camera, isOffline, height }) => {
  const { colors, preferences } = useTheme();
  const isDark = preferences.mode === 'dark';
  
  const { frameUrl, connect, connectionState, error } = useVideoStream({
    camera,
    autoConnect: !isOffline, // Auto-connect only if camera is online
  });

  // Show frame if available
  if (frameUrl && connectionState === 'connected') {
    return (
      <img
        src={frameUrl}
        alt={camera.name}
        style={{
          width: '100%',
          height: '100%',
          objectFit: 'cover',
        }}
      />
    );
  }

  // Status message based on connection state
  const getStatusInfo = () => {
    if (isOffline) {
      return { text: 'Offline', icon: <HiOutlineExclamationCircle size={20} style={{ color: colors.textSecondary }} /> };
    }
    switch (connectionState) {
      case 'connecting':
        return { text: 'Connecting...', icon: (
          <motion.div
            animate={{ rotate: 360 }}
            transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
          >
            <HiOutlineRefresh size={24} style={{ color: colors.accent }} />
          </motion.div>
        )};
      case 'error':
        return { text: error || 'Stream Error', icon: <HiOutlineExclamationCircle size={24} style={{ color: '#ef4444' }} /> };
      case 'connected':
        return { text: 'Loading stream...', icon: (
          <motion.div
            animate={{ rotate: 360 }}
            transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
          >
            <HiOutlineRefresh size={20} style={{ color: colors.accent }} />
          </motion.div>
        )};
      default:
        return { text: 'Tap to connect', icon: <HiOutlineVideoCamera size={28} style={{ opacity: 0.5, color: colors.textSecondary }} /> };
    }
  };

  const statusInfo = getStatusInfo();

  // Show placeholder with status
  return (
    <div style={{
      width: '100%',
      height: '100%',
      background: isDark ? 'rgba(0,0,0,0.4)' : 'rgba(0,0,0,0.15)',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      gap: '8px',
      filter: isOffline ? 'grayscale(1) brightness(0.5)' : 'none',
    }}>
      {statusInfo.icon}
      <span style={{ 
        fontSize: '11px', 
        color: colors.textSecondary, 
        opacity: 0.8,
        textAlign: 'center',
        padding: '0 8px',
        maxWidth: '90%',
        overflow: 'hidden',
        textOverflow: 'ellipsis',
        whiteSpace: 'nowrap',
      }}>
        {statusInfo.text}
      </span>
    </div>
  );
};

const CameraGrid: React.FC<{ 
  cameras: CameraWithPermission[];
  recordingCameraIds: ReadonlySet<string>;
  isLoading: boolean;
  error: string | null;
  onRefresh: () => void;
  onSelectCamera: (camera: CameraWithPermission) => void;
}> = ({ cameras, recordingCameraIds, isLoading, error, onRefresh, onSelectCamera }) => {
  const { colors, preferences } = useTheme();
  const isDark = preferences.mode === 'dark';
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [filter, setFilter] = useState<'all' | 'live' | 'recording' | 'offline'>('all');
  const [searchQuery, setSearchQuery] = useState('');

  // Location filters
  const [filterBuilding, setFilterBuilding] = useState<string>('');
  const [filterFloor, setFilterFloor] = useState<string>('');
  const [filterZone, setFilterZone] = useState<string>('');
  const [filterRoom, setFilterRoom] = useState<string>('');
  const [showFilters, setShowFilters] = useState(false);

  // View groups
  const [viewGroups, setViewGroups] = useState<ViewGroup[]>(loadViewGroups);
  const [activeGroupId, setActiveGroupId] = useState<string | null>(null);
  const [showCreateGroup, setShowCreateGroup] = useState(false);
  const [newGroupName, setNewGroupName] = useState('');
  const [editingGroupId, setEditingGroupId] = useState<string | null>(null);
  const [editGroupName, setEditGroupName] = useState('');
  // 3-dot menu for move-to-group
  const [menuCameraId, setMenuCameraId] = useState<string | null>(null);

  // Extract unique location values for filter dropdowns
  const locationOptions = useMemo(() => {
    const buildings = new Set<string>();
    const floors = new Set<string>();
    const zones = new Set<string>();
    const rooms = new Set<string>();
    cameras.forEach(c => {
      if (c.location?.building) buildings.add(c.location.building);
      if (c.location?.floor) floors.add(c.location.floor);
      if (c.location?.zone) zones.add(c.location.zone);
      if (c.location?.room) rooms.add(c.location.room);
    });
    return {
      buildings: Array.from(buildings).sort(),
      floors: Array.from(floors).sort(),
      zones: Array.from(zones).sort(),
      rooms: Array.from(rooms).sort(),
    };
  }, [cameras]);

  const activeFiltersCount = [filterBuilding, filterFloor, filterZone, filterRoom].filter(Boolean).length;

  // Filter cameras based on search, status, location, and group
  const filteredCameras = useMemo(() => {
    return cameras.filter(camera => {
      // Group filter
      if (activeGroupId) {
        const group = viewGroups.find(g => g.id === activeGroupId);
        if (group && !group.cameraIds.includes(camera.id)) return false;
      }

      // Search filter
      const matchesSearch = searchQuery === '' || 
        camera.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        camera.description?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        camera.location?.building?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        camera.location?.zone?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        camera.location?.room?.toLowerCase().includes(searchQuery.toLowerCase());

      // Location filters
      if (filterBuilding && camera.location?.building !== filterBuilding) return false;
      if (filterFloor && camera.location?.floor !== filterFloor) return false;
      if (filterZone && camera.location?.zone !== filterZone) return false;
      if (filterRoom && camera.location?.room !== filterRoom) return false;

      // Status filter
      if (filter === 'all') return matchesSearch;
      const status = getCameraDisplayStatus(camera, recordingCameraIds);
      return matchesSearch && status === filter;
    });
  }, [cameras, recordingCameraIds, filter, searchQuery, filterBuilding, filterFloor, filterZone, filterRoom, activeGroupId, viewGroups]);

  const statusCounts = useMemo(() => ({
    all: cameras.length,
    live: cameras.filter(c => getCameraDisplayStatus(c, recordingCameraIds) === 'live').length,
    recording: cameras.filter(c => getCameraDisplayStatus(c, recordingCameraIds) === 'recording').length,
    offline: cameras.filter(c => getCameraDisplayStatus(c, recordingCameraIds) === 'offline').length,
  }), [cameras, recordingCameraIds]);

  // Group CRUD helpers
  const handleCreateGroup = () => {
    if (!newGroupName.trim()) return;
    const group: ViewGroup = { id: Date.now().toString(), name: newGroupName.trim(), cameraIds: [] };
    const updated = [...viewGroups, group];
    setViewGroups(updated);
    saveViewGroups(updated);
    setNewGroupName('');
    setShowCreateGroup(false);
  };
  const handleDeleteGroup = (id: string) => {
    const updated = viewGroups.filter(g => g.id !== id);
    setViewGroups(updated);
    saveViewGroups(updated);
    if (activeGroupId === id) setActiveGroupId(null);
  };
  const handleRenameGroup = (id: string) => {
    if (!editGroupName.trim()) return;
    const updated = viewGroups.map(g => g.id === id ? { ...g, name: editGroupName.trim() } : g);
    setViewGroups(updated);
    saveViewGroups(updated);
    setEditingGroupId(null);
    setEditGroupName('');
  };
  const handleMoveCameraToGroup = (cameraId: string, groupId: string) => {
    const updated = viewGroups.map(g => {
      if (g.id === groupId) {
        if (g.cameraIds.includes(cameraId)) return g;
        return { ...g, cameraIds: [...g.cameraIds, cameraId] };
      }
      return g;
    });
    setViewGroups(updated);
    saveViewGroups(updated);
    setMenuCameraId(null);
  };
  const handleRemoveFromGroup = (cameraId: string, groupId: string) => {
    const updated = viewGroups.map(g => {
      if (g.id === groupId) return { ...g, cameraIds: g.cameraIds.filter(id => id !== cameraId) };
      return g;
    });
    setViewGroups(updated);
    saveViewGroups(updated);
    setMenuCameraId(null);
  };

  // Dropdown style helper
  const selectStyle: React.CSSProperties = {
    padding: '8px 12px',
    borderRadius: '10px',
    background: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.04)',
    border: '1px solid ' + (isDark ? 'rgba(255,255,255,0.12)' : 'rgba(0,0,0,0.1)'),
    color: colors.text,
    fontSize: '13px',
    outline: 'none',
    flex: 1,
    minWidth: 0,
  };

  return (
    <div style={{
      minHeight: '100vh',
      padding: 'clamp(16px, 3vw, 32px)',
      paddingTop: 'max(60px, clamp(16px, 3vw, 32px))',
      paddingBottom: 'clamp(100px, 12vh, 150px)',
      width: '100%',
      margin: '0 auto',
    }}>
      {/* Header */}
      <motion.div 
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: '24px',
        }}
      >
        <h1 style={{
          fontSize: '32px',
          fontWeight: 700,
          color: colors.text,
          letterSpacing: '-0.5px',
        }}>
          Live View
        </h1>
        
        <div style={{ display: 'flex', gap: '8px' }}>
          <motion.button
            whileHover={{ scale: 1.1 }}
            whileTap={{ scale: 0.9 }}
            onClick={() => setShowFilters(f => !f)}
            style={{
              width: '40px',
              height: '40px',
              borderRadius: '12px',
              background: showFilters || activeFiltersCount > 0
                ? colors.accent
                : isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.05)',
              border: 'none',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: 'pointer',
              color: showFilters || activeFiltersCount > 0 ? '#fff' : colors.text,
              position: 'relative',
            }}
          >
            <HiOutlineFilter size={18} />
            {activeFiltersCount > 0 && (
              <div style={{
                position: 'absolute', top: -4, right: -4,
                width: 18, height: 18, borderRadius: '50%',
                background: '#ef4444', color: '#fff',
                fontSize: 10, fontWeight: 700,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}>{activeFiltersCount}</div>
            )}
          </motion.button>
          <motion.button
            whileHover={{ scale: 1.1 }}
            whileTap={{ scale: 0.9 }}
            onClick={onRefresh}
            style={{
              width: '40px',
              height: '40px',
              borderRadius: '12px',
              background: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.05)',
              border: 'none',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: 'pointer',
              color: colors.text,
            }}
          >
            <HiOutlineRefresh size={18} className={isLoading ? 'animate-spin' : ''} />
          </motion.button>
          <motion.button
            whileHover={{ scale: 1.1 }}
            whileTap={{ scale: 0.9 }}
            onClick={() => setViewMode('grid')}
            style={{
              width: '40px',
              height: '40px',
              borderRadius: '12px',
              background: viewMode === 'grid' 
                ? colors.accent 
                : isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.05)',
              border: 'none',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: 'pointer',
              color: viewMode === 'grid' ? '#fff' : colors.text,
            }}
          >
            <BsGrid3X3Gap size={18} />
          </motion.button>
          <motion.button
            whileHover={{ scale: 1.1 }}
            whileTap={{ scale: 0.9 }}
            onClick={() => setViewMode('list')}
            style={{
              width: '40px',
              height: '40px',
              borderRadius: '12px',
              background: viewMode === 'list' 
                ? colors.accent 
                : isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.05)',
              border: 'none',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: 'pointer',
              color: viewMode === 'list' ? '#fff' : colors.text,
            }}
          >
            <BsList size={20} />
          </motion.button>
        </div>
      </motion.div>

      {/* Search Bar */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.05 }}
        style={{
          position: 'relative',
          marginBottom: '16px',
        }}
      >
        <HiOutlineSearch 
          size={20} 
          color={colors.textMuted} 
          style={{ position: 'absolute', left: '14px', top: '50%', transform: 'translateY(-50%)', zIndex: 1 }}
        />
        <input
          type="text"
          placeholder="Search cameras by name, location..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          style={{
            width: '100%',
            padding: '14px 44px 14px 44px',
            borderRadius: '14px',
            background: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(255,255,255,0.8)',
            border: '1px solid ' + (isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.08)'),
            color: colors.text,
            fontSize: '15px',
            outline: 'none',
            backdropFilter: 'blur(10px)',
          }}
        />
        {searchQuery && (
          <motion.button
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            whileHover={{ scale: 1.1 }}
            whileTap={{ scale: 0.9 }}
            onClick={() => setSearchQuery('')}
            style={{
              position: 'absolute',
              right: '12px',
              top: '50%',
              transform: 'translateY(-50%)',
              background: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.08)',
              border: 'none',
              borderRadius: '8px',
              width: '24px',
              height: '24px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: 'pointer',
            }}
          >
            <HiOutlineX size={14} color={colors.textMuted} />
          </motion.button>
        )}
      </motion.div>

      {/* Status Summary */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        style={{
          display: 'flex',
          gap: '12px',
          marginBottom: '20px',
          overflowX: 'auto',
          paddingBottom: '8px',
        }}
      >
        {[
          { label: 'All', key: 'all' as const, count: statusCounts.all, color: colors.accent },
          { label: 'Live', key: 'live' as const, count: statusCounts.live, color: '#22c55e' },
          { label: 'Recording', key: 'recording' as const, count: statusCounts.recording, color: '#ef4444' },
          { label: 'Offline', key: 'offline' as const, count: statusCounts.offline, color: '#6b7280' },
        ].map((filterItem) => (
          <motion.button
            key={filterItem.label}
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={() => setFilter(filterItem.key)}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              padding: '10px 16px',
              borderRadius: '20px',
              border: 'none',
              background: filter === filterItem.key 
                ? isDark ? 'rgba(255,255,255,0.15)' : 'rgba(0,0,0,0.08)'
                : 'transparent',
              cursor: 'pointer',
              color: colors.text,
              whiteSpace: 'nowrap',
            }}
          >
            <BsCircleFill size={8} style={{ color: filterItem.color }} />
            <span style={{ fontSize: '14px', fontWeight: 500 }}>{filterItem.label}</span>
            <span style={{ 
              fontSize: '12px', 
              fontWeight: 600,
              color: colors.textMuted,
            }}>
              {filterItem.count}
            </span>
          </motion.button>
        ))}
      </motion.div>

      {/* Location Filters Panel */}
      <AnimatePresence>
        {showFilters && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            style={{ overflow: 'hidden', marginBottom: '16px' }}
          >
            <GlassCard padding="16px" borderRadius="16px">
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                <span style={{ fontSize: '13px', fontWeight: 600, color: colors.text }}>Filter by Location</span>
                {activeFiltersCount > 0 && (
                  <motion.button
                    whileTap={{ scale: 0.95 }}
                    onClick={() => { setFilterBuilding(''); setFilterFloor(''); setFilterZone(''); setFilterRoom(''); }}
                    style={{ background: 'none', border: 'none', cursor: 'pointer', color: colors.accent, fontSize: '12px', fontWeight: 600 }}
                  >
                    Clear All
                  </motion.button>
                )}
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                {locationOptions.buildings.length > 0 && (
                  <select value={filterBuilding} onChange={e => setFilterBuilding(e.target.value)} style={selectStyle}>
                    <option value="">All Buildings</option>
                    {locationOptions.buildings.map(b => <option key={b} value={b}>{b}</option>)}
                  </select>
                )}
                {locationOptions.floors.length > 0 && (
                  <select value={filterFloor} onChange={e => setFilterFloor(e.target.value)} style={selectStyle}>
                    <option value="">All Floors</option>
                    {locationOptions.floors.map(f => <option key={f} value={f}>{f}</option>)}
                  </select>
                )}
                {locationOptions.zones.length > 0 && (
                  <select value={filterZone} onChange={e => setFilterZone(e.target.value)} style={selectStyle}>
                    <option value="">All Zones</option>
                    {locationOptions.zones.map(z => <option key={z} value={z}>{z}</option>)}
                  </select>
                )}
                {locationOptions.rooms.length > 0 && (
                  <select value={filterRoom} onChange={e => setFilterRoom(e.target.value)} style={selectStyle}>
                    <option value="">All Rooms</option>
                    {locationOptions.rooms.map(r => <option key={r} value={r}>{r}</option>)}
                  </select>
                )}
              </div>
            </GlassCard>
          </motion.div>
        )}
      </AnimatePresence>

      {/* View Groups */}
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', marginBottom: '16px', alignItems: 'center' }}>
        <motion.button
          whileTap={{ scale: 0.95 }}
          onClick={() => setActiveGroupId(null)}
          style={{
            padding: '6px 14px',
            borderRadius: '16px',
            border: 'none',
            background: !activeGroupId
              ? colors.accent
              : isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.05)',
            color: !activeGroupId ? '#fff' : colors.text,
            fontSize: '13px',
            fontWeight: 600,
            cursor: 'pointer',
          }}
        >
          All Cameras
        </motion.button>
        {viewGroups.map(g => (
          <div key={g.id} style={{ position: 'relative', display: 'flex', alignItems: 'center', gap: '2px' }}>
            {editingGroupId === g.id ? (
              <div style={{ display: 'flex', gap: '4px', alignItems: 'center' }}>
                <input
                  autoFocus
                  value={editGroupName}
                  onChange={e => setEditGroupName(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && handleRenameGroup(g.id)}
                  style={{
                    padding: '5px 10px', borderRadius: '12px', fontSize: '13px',
                    border: '1px solid ' + colors.accent, background: isDark ? '#1a1a2e' : '#fff',
                    color: colors.text, outline: 'none', width: '100px',
                  }}
                />
                <motion.button whileTap={{ scale: 0.9 }} onClick={() => handleRenameGroup(g.id)} style={{ background: colors.accent, border: 'none', borderRadius: '8px', padding: '4px 8px', color: '#fff', cursor: 'pointer', fontSize: '11px' }}>✓</motion.button>
                <motion.button whileTap={{ scale: 0.9 }} onClick={() => setEditingGroupId(null)} style={{ background: 'rgba(107,114,128,0.5)', border: 'none', borderRadius: '8px', padding: '4px 8px', color: '#fff', cursor: 'pointer', fontSize: '11px' }}>✕</motion.button>
              </div>
            ) : (
              <motion.button
                whileTap={{ scale: 0.95 }}
                onClick={() => setActiveGroupId(activeGroupId === g.id ? null : g.id)}
                style={{
                  padding: '6px 14px',
                  borderRadius: '16px',
                  border: 'none',
                  background: activeGroupId === g.id
                    ? colors.accent
                    : isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.05)',
                  color: activeGroupId === g.id ? '#fff' : colors.text,
                  fontSize: '13px',
                  fontWeight: 500,
                  cursor: 'pointer',
                  display: 'flex', alignItems: 'center', gap: '6px',
                }}
              >
                <HiOutlineFolder size={14} /> {g.name}
                <span style={{ fontSize: '11px', opacity: 0.7 }}>({g.cameraIds.length})</span>
              </motion.button>
            )}
            {activeGroupId === g.id && editingGroupId !== g.id && (
              <div style={{ display: 'flex', gap: '2px', marginLeft: '2px' }}>
                <motion.button whileTap={{ scale: 0.9 }} onClick={() => { setEditingGroupId(g.id); setEditGroupName(g.name); }} style={{ background: 'none', border: 'none', cursor: 'pointer', color: colors.textMuted, padding: '4px' }}>
                  <HiOutlinePencil size={14} />
                </motion.button>
                <motion.button whileTap={{ scale: 0.9 }} onClick={() => handleDeleteGroup(g.id)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#ef4444', padding: '4px' }}>
                  <HiOutlineTrash size={14} />
                </motion.button>
              </div>
            )}
          </div>
        ))}
        {showCreateGroup ? (
          <div style={{ display: 'flex', gap: '4px', alignItems: 'center' }}>
            <input
              autoFocus
              placeholder="Group name..."
              value={newGroupName}
              onChange={e => setNewGroupName(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleCreateGroup()}
              style={{
                padding: '5px 10px', borderRadius: '12px', fontSize: '13px',
                border: '1px solid ' + colors.accent, background: isDark ? '#1a1a2e' : '#fff',
                color: colors.text, outline: 'none', width: '120px',
              }}
            />
            <motion.button whileTap={{ scale: 0.9 }} onClick={handleCreateGroup} style={{ background: colors.accent, border: 'none', borderRadius: '8px', padding: '4px 8px', color: '#fff', cursor: 'pointer', fontSize: '11px', fontWeight: 600 }}>Create</motion.button>
            <motion.button whileTap={{ scale: 0.9 }} onClick={() => { setShowCreateGroup(false); setNewGroupName(''); }} style={{ background: 'rgba(107,114,128,0.5)', border: 'none', borderRadius: '8px', padding: '4px 8px', color: '#fff', cursor: 'pointer', fontSize: '11px' }}>✕</motion.button>
          </div>
        ) : (
          <motion.button
            whileTap={{ scale: 0.95 }}
            onClick={() => setShowCreateGroup(true)}
            style={{
              padding: '6px 12px',
              borderRadius: '16px',
              border: '1px dashed ' + (isDark ? 'rgba(255,255,255,0.2)' : 'rgba(0,0,0,0.15)'),
              background: 'transparent',
              color: colors.textMuted,
              fontSize: '13px',
              cursor: 'pointer',
              display: 'flex', alignItems: 'center', gap: '4px',
            }}
          >
            <HiOutlinePlus size={14} /> New Group
          </motion.button>
        )}
      </div>

      {/* Camera Grid/List */}
      {isLoading && cameras.length === 0 ? (
        <div style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '60px 20px',
          color: colors.textSecondary,
        }}>
          <motion.div
            animate={{ rotate: 360 }}
            transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
          >
            <HiOutlineRefresh size={32} />
          </motion.div>
          <p style={{ marginTop: '12px' }}>Loading cameras...</p>
        </div>
      ) : error ? (
        <div style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '60px 20px',
          color: colors.textSecondary,
        }}>
          <HiOutlineExclamationCircle size={48} color="#ef4444" />
          <p style={{ marginTop: '12px', color: '#ef4444' }}>{error}</p>
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={onRefresh}
            style={{
              marginTop: '16px',
              padding: '10px 20px',
              borderRadius: '12px',
              background: colors.accent,
              color: '#fff',
              border: 'none',
              cursor: 'pointer',
              fontWeight: 600,
            }}
          >
            Retry
          </motion.button>
        </div>
      ) : filteredCameras.length === 0 ? (
        <div style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '60px 20px',
          color: colors.textSecondary,
        }}>
          <HiOutlineSearch size={48} style={{ opacity: 0.5, marginBottom: '12px' }} />
          <p style={{ fontWeight: 500 }}>
            {searchQuery || filter !== 'all' ? 'No cameras match your filters' : 'No cameras found'}
          </p>
          {(searchQuery || filter !== 'all') && (
            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={() => {
                setSearchQuery('');
                setFilter('all');
              }}
              style={{
                marginTop: '16px',
                padding: '10px 20px',
                borderRadius: '12px',
                background: `${colors.accent}15`,
                border: `1px solid ${colors.accent}40`,
                cursor: 'pointer',
                color: colors.accent,
                fontWeight: 500,
              }}
            >
              Clear filters
            </motion.button>
          )}
        </div>
      ) : (
        <div style={{
          display: viewMode === 'grid' ? 'grid' : 'flex',
          gridTemplateColumns: viewMode === 'grid' ? 'repeat(2, 1fr)' : undefined,
          flexDirection: viewMode === 'list' ? 'column' : undefined,
          gap: '12px',
        }}>
        {filteredCameras.map((camera, index) => {
          const status = getCameraDisplayStatus(camera, recordingCameraIds);
          const locationStr = getCameraLocationString(camera);
          
          return (
          <motion.div
            key={camera.id}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 + index * 0.05 }}
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={() => onSelectCamera(camera)}
            style={{ cursor: 'pointer' }}
          >
            <GlassCard padding="0" borderRadius="20px" style={{ overflow: 'hidden' }}>
              <div style={{ 
                position: 'relative', 
                height: viewMode === 'grid' ? '120px' : '180px',
              }}>
                {/* Live stream thumbnail preview */}
                <CameraThumbnail 
                  camera={camera} 
                  isOffline={status === 'offline'} 
                  height={viewMode === 'grid' ? 120 : 180}
                />
                <div style={{
                  position: 'absolute',
                  top: 0,
                  left: 0,
                  right: 0,
                  bottom: 0,
                  background: 'linear-gradient(180deg, rgba(0,0,0,0.3) 0%, transparent 30%, transparent 60%, rgba(0,0,0,0.7) 100%)',
                }} />
                
                {/* Status Badge */}
                <div style={{
                  position: 'absolute',
                  top: '10px',
                  left: '10px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  padding: '4px 10px',
                  borderRadius: '12px',
                  background: status === 'live' 
                    ? 'rgba(34, 197, 94, 0.9)'
                    : status === 'recording'
                    ? 'rgba(239, 68, 68, 0.9)'
                    : 'rgba(107, 114, 128, 0.9)',
                  backdropFilter: 'blur(10px)',
                }}>
                  {status === 'recording' ? (
                    <BsRecordCircle size={10} color="#fff" />
                  ) : (
                    <BsCircleFill size={6} color="#fff" />
                  )}
                  <span style={{ 
                    fontSize: '10px', 
                    fontWeight: 600, 
                    color: '#fff',
                    textTransform: 'uppercase',
                    letterSpacing: '0.5px',
                  }}>
                    {status}
                  </span>
                </div>

                {/* Shared Badge */}
                {camera.isShared && (
                  <div style={{
                    position: 'absolute',
                    top: '10px',
                    right: '40px',
                    padding: '3px 8px',
                    borderRadius: '10px',
                    background: camera.permission === 'editor' ? 'rgba(99,102,241,0.85)' : 'rgba(107,114,128,0.85)',
                    backdropFilter: 'blur(10px)',
                    fontSize: '9px',
                    fontWeight: 700,
                    color: '#fff',
                    textTransform: 'uppercase',
                    letterSpacing: '0.3px',
                  }}>
                    {camera.permission === 'editor' ? 'Editor' : 'Shared'}
                  </div>
                )}

                {/* 3-dot menu */}
                <div style={{ position: 'absolute', top: '8px', right: '8px' }}>
                  <motion.button
                    whileTap={{ scale: 0.85 }}
                    onClick={(e) => { e.stopPropagation(); setMenuCameraId(menuCameraId === camera.id ? null : camera.id); }}
                    style={{
                      width: '28px', height: '28px', borderRadius: '50%',
                      background: 'rgba(0,0,0,0.35)', backdropFilter: 'blur(8px)',
                      border: 'none', display: 'flex', alignItems: 'center', justifyContent: 'center',
                      cursor: 'pointer', color: '#fff',
                    }}
                  >
                    <HiOutlineDotsVertical size={14} />
                  </motion.button>
                  <AnimatePresence>
                    {menuCameraId === camera.id && (
                      <motion.div
                        initial={{ opacity: 0, scale: 0.9, y: -4 }}
                        animate={{ opacity: 1, scale: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.9, y: -4 }}
                        onClick={e => e.stopPropagation()}
                        style={{
                          position: 'absolute', top: '32px', right: 0, zIndex: 50,
                          minWidth: '160px',
                          background: isDark ? '#1e1e3a' : '#fff',
                          borderRadius: '12px',
                          boxShadow: '0 8px 32px rgba(0,0,0,0.3)',
                          border: '1px solid ' + (isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.08)'),
                          overflow: 'hidden',
                        }}
                      >
                        <div style={{ padding: '6px 10px', fontSize: '10px', fontWeight: 700, color: colors.textMuted, textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                          Move to Group
                        </div>
                        {viewGroups.length === 0 ? (
                          <div style={{ padding: '8px 10px', fontSize: '12px', color: colors.textMuted }}>No groups yet</div>
                        ) : (
                          viewGroups.map(g => {
                            const isInGroup = g.cameraIds.includes(camera.id);
                            return (
                              <motion.button
                                key={g.id}
                                whileHover={{ background: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.04)' }}
                                onClick={() => isInGroup ? handleRemoveFromGroup(camera.id, g.id) : handleMoveCameraToGroup(camera.id, g.id)}
                                style={{
                                  display: 'flex', alignItems: 'center', gap: '8px',
                                  width: '100%', padding: '8px 12px', background: 'none',
                                  border: 'none', cursor: 'pointer', color: colors.text, fontSize: '13px',
                                  textAlign: 'left',
                                }}
                              >
                                <HiOutlineFolder size={14} style={{ color: isInGroup ? colors.accent : colors.textMuted }} />
                                <span style={{ flex: 1 }}>{g.name}</span>
                                {isInGroup && <span style={{ fontSize: '11px', color: colors.accent }}>✓</span>}
                              </motion.button>
                            );
                          })
                        )}
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
                
                {/* Camera Info */}
                <div style={{
                  position: 'absolute',
                  bottom: '10px',
                  left: '12px',
                  right: '12px',
                }}>
                  <div style={{ 
                    fontSize: viewMode === 'grid' ? '14px' : '16px', 
                    fontWeight: 600, 
                    color: '#fff',
                    marginBottom: '2px',
                  }}>
                    {camera.name}
                  </div>
                  <div style={{ 
                    fontSize: '11px', 
                    color: 'rgba(255,255,255,0.8)',
                  }}>
                    {locationStr}
                    {camera.fps && ` • ${camera.fps} FPS`}
                  </div>
                </div>
              </div>
            </GlassCard>
          </motion.div>
          );
        })}
        </div>
      )}
    </div>
  );
};

const CameraDetail: React.FC<{ 
  camera: CameraWithPermission;
  cameras: CameraWithPermission[]; 
  recordingCameraIds: ReadonlySet<string>;
  onBack: () => void;
  onSelectCamera: (camera: CameraWithPermission) => void;
  onToggleRecording: (cameraId: string) => void;
}> = ({ camera, cameras, recordingCameraIds, onBack, onSelectCamera, onToggleRecording }) => {
  const { colors, preferences } = useTheme();
  const navigate = useNavigate();
  const isDark = preferences.mode === 'dark';
  const [isPlaying, setIsPlaying] = useState(true);
  const [isMuted, setIsMuted] = useState(true);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [showPTZControls, setShowPTZControls] = useState(false);
  const videoContainerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  
  const currentIndex = cameras.findIndex(c => c.id === camera.id);
  const status = getCameraDisplayStatus(camera, recordingCameraIds);
  const isRecording = recordingCameraIds.has(camera.id);

  // Use the video stream hook for snapshot functionality
  const { frameUrl } = useVideoStream({ camera, autoConnect: true });

  const handlePrevCamera = () => {
    if (currentIndex > 0) {
      onSelectCamera(cameras[currentIndex - 1]);
    }
  };

  const handleNextCamera = () => {
    if (currentIndex < cameras.length - 1) {
      onSelectCamera(cameras[currentIndex + 1]);
    }
  };

  // Fullscreen toggle
  const handleFullscreen = async () => {
    if (!videoContainerRef.current) return;
    
    try {
      if (!isFullscreen) {
        if (videoContainerRef.current.requestFullscreen) {
          await videoContainerRef.current.requestFullscreen();
        } else if ((videoContainerRef.current as any).webkitRequestFullscreen) {
          await (videoContainerRef.current as any).webkitRequestFullscreen();
        }
        setIsFullscreen(true);
      } else {
        if (document.exitFullscreen) {
          await document.exitFullscreen();
        } else if ((document as any).webkitExitFullscreen) {
          await (document as any).webkitExitFullscreen();
        }
        setIsFullscreen(false);
      }
    } catch (err) {
      console.error('Fullscreen error:', err);
    }
  };

  // Listen for fullscreen changes
  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
    };
    document.addEventListener('fullscreenchange', handleFullscreenChange);
    document.addEventListener('webkitfullscreenchange', handleFullscreenChange);
    return () => {
      document.removeEventListener('fullscreenchange', handleFullscreenChange);
      document.removeEventListener('webkitfullscreenchange', handleFullscreenChange);
    };
  }, []);

  // Snapshot handler
  const handleSnapshot = () => {
    if (!frameUrl) {
      alert('No frame available to capture');
      return;
    }
    
    // Create a temporary link to download the current frame
    const link = document.createElement('a');
    link.href = frameUrl;
    link.download = `${camera.name}_snapshot_${new Date().toISOString().replace(/[:.]/g, '-')}.jpg`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    
    // Show feedback
    const feedback = document.createElement('div');
    feedback.innerText = '📸 Snapshot saved!';
    feedback.style.cssText = 'position:fixed;top:50%;left:50%;transform:translate(-50%,-50%);background:rgba(0,0,0,0.8);color:white;padding:20px 40px;border-radius:12px;font-size:18px;z-index:9999;';
    document.body.appendChild(feedback);
    setTimeout(() => feedback.remove(), 1500);
  };

  // Recording handler
  const handleRecording = () => {
    onToggleRecording(camera.id);
  };

  // Settings handler - navigate to camera management
  const handleSettings = () => {
    navigate(`/cameras?edit=${camera.id}`);
  };

  // Share handler - navigate to members page with camera pre-selected
  const handleShare = () => {
    navigate(`/members?share=${camera.id}`);
  };

  // Download handler
  const handleDownload = () => {
    // This would typically show a modal to select recording timeframe
    alert(`Download feature: Select recordings for "${camera.name}" to download.`);
  };

  // PTZ handler
  const handlePTZ = () => {
    if (camera.camera_type !== 'ptz') {
      alert('PTZ controls are only available for PTZ cameras');
      return;
    }
    setShowPTZControls(!showPTZControls);
  };

  return (
    <div style={{
      minHeight: '100vh',
      background: '#000',
    }}>
      {/* Video Container */}
      <div 
        ref={videoContainerRef}
        style={{
        position: 'relative',
        width: '100%',
        height: '60vh',
        minHeight: '300px',
      }}>
        {/* Live Stream Player */}
        <LiveStreamPlayer
          camera={camera}
          autoPlay={isPlaying}
          showControls={false}
          showOverlay={false}
          aspectRatio="auto"
          style={{ width: '100%', height: '100%', borderRadius: 0 }}
        />
        
        {/* Top Controls */}
        <div style={{
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          padding: '50px 20px 20px',
          background: 'linear-gradient(180deg, rgba(0,0,0,0.7) 0%, transparent 100%)',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
        }}>
          <motion.button
            whileHover={{ scale: 1.1 }}
            whileTap={{ scale: 0.9 }}
            onClick={onBack}
            style={{
              width: '40px',
              height: '40px',
              borderRadius: '50%',
              background: 'rgba(255,255,255,0.2)',
              backdropFilter: 'blur(10px)',
              border: 'none',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: 'pointer',
              color: '#fff',
            }}
          >
            <HiOutlineArrowLeft size={20} />
          </motion.button>
          
          <div style={{ textAlign: 'center' }}>
            <div style={{ 
              fontSize: '16px', 
              fontWeight: 600, 
              color: '#fff',
            }}>
              {camera.name}
            </div>
            <div style={{ 
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '6px',
              fontSize: '12px',
              color: 'rgba(255,255,255,0.8)',
            }}>
              <BsCircleFill size={6} color={status === 'live' ? '#22c55e' : status === 'recording' ? '#ef4444' : '#6b7280'} />
              {status.toUpperCase()}
            </div>
          </div>
          
          <motion.button
            whileHover={{ scale: 1.1 }}
            whileTap={{ scale: 0.9 }}
            style={{
              width: '40px',
              height: '40px',
              borderRadius: '50%',
              background: 'rgba(255,255,255,0.2)',
              backdropFilter: 'blur(10px)',
              border: 'none',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: 'pointer',
              color: '#fff',
            }}
          >
            <HiOutlineDotsVertical size={20} />
          </motion.button>
        </div>
        
        {/* Live Badge */}
        {status !== 'offline' && (
          <motion.div
            animate={{ opacity: [1, 0.5, 1] }}
            transition={{ duration: 2, repeat: Infinity }}
            style={{
              position: 'absolute',
              top: '100px',
              right: '20px',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              padding: '6px 12px',
              borderRadius: '8px',
              background: status === 'recording' ? 'rgba(239, 68, 68, 0.9)' : 'rgba(34, 197, 94, 0.9)',
            }}
          >
            <BsRecordCircle size={12} color="#fff" />
            <span style={{ 
              fontSize: '12px', 
              fontWeight: 700, 
              color: '#fff',
            }}>
              {status === 'recording' ? 'REC' : 'LIVE'}
            </span>
          </motion.div>
        )}
        
        {/* Play/Pause Overlay */}
        <motion.button
          whileHover={{ scale: 1.1 }}
          whileTap={{ scale: 0.9 }}
          onClick={() => setIsPlaying(!isPlaying)}
          style={{
            position: 'absolute',
            top: '50%',
            left: '50%',
            transform: 'translate(-50%, -50%)',
            width: '70px',
            height: '70px',
            borderRadius: '50%',
            background: 'rgba(0,0,0,0.5)',
            backdropFilter: 'blur(10px)',
            border: '2px solid rgba(255,255,255,0.3)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            cursor: 'pointer',
            color: '#fff',
          }}
        >
          {isPlaying ? <HiOutlinePause size={32} /> : <HiOutlinePlay size={32} />}
        </motion.button>
        
        {/* Navigation Arrows */}
        {currentIndex > 0 && (
          <motion.button
            whileHover={{ scale: 1.1, x: -4 }}
            whileTap={{ scale: 0.9 }}
            onClick={handlePrevCamera}
            style={{
              position: 'absolute',
              left: '10px',
              top: '50%',
              transform: 'translateY(-50%)',
              width: '40px',
              height: '40px',
              borderRadius: '50%',
              background: 'rgba(0,0,0,0.3)',
              backdropFilter: 'blur(10px)',
              border: 'none',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: 'pointer',
              color: '#fff',
            }}
          >
            <HiOutlineChevronLeft size={24} />
          </motion.button>
        )}
        
        {currentIndex < cameras.length - 1 && (
          <motion.button
            whileHover={{ scale: 1.1, x: 4 }}
            whileTap={{ scale: 0.9 }}
            onClick={handleNextCamera}
            style={{
              position: 'absolute',
              right: '10px',
              top: '50%',
              transform: 'translateY(-50%)',
              width: '40px',
              height: '40px',
              borderRadius: '50%',
              background: 'rgba(0,0,0,0.3)',
              backdropFilter: 'blur(10px)',
              border: 'none',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: 'pointer',
              color: '#fff',
            }}
          >
            <HiOutlineChevronRight size={24} />
          </motion.button>
        )}
        
        {/* Bottom Controls */}
        <div style={{
          position: 'absolute',
          bottom: 0,
          left: 0,
          right: 0,
          padding: '20px',
          background: 'linear-gradient(0deg, rgba(0,0,0,0.8) 0%, transparent 100%)',
        }}>
          {/* Time */}
          <div style={{ 
            fontSize: '14px', 
            color: '#fff',
            marginBottom: '12px',
            textAlign: 'center',
          }}>
            {new Date().toLocaleTimeString()}
          </div>
          
          {/* Action Buttons */}
          <div style={{
            display: 'flex',
            justifyContent: 'center',
            gap: '16px',
          }}>
            {[
              { icon: <HiOutlinePhotograph size={22} />, label: 'Snapshot', onClick: handleSnapshot },
              { 
                icon: isRecording ? <HiOutlineStop size={22} /> : <BsRecordCircle size={22} />, 
                label: isRecording ? 'Stop' : 'Record', 
                onClick: handleRecording,
                active: isRecording,
              },
              { 
                icon: isMuted ? <HiOutlineVolumeOff size={22} /> : <HiOutlineVolumeUp size={22} />, 
                label: isMuted ? 'Unmute' : 'Mute', 
                onClick: () => setIsMuted(!isMuted),
              },
              { 
                icon: isFullscreen ? <RiFullscreenExitLine size={22} /> : <RiFullscreenLine size={22} />, 
                label: isFullscreen ? 'Exit' : 'Fullscreen', 
                onClick: handleFullscreen,
              },
            ].map((action, index) => (
              <motion.button
                key={index}
                whileHover={{ scale: 1.1 }}
                whileTap={{ scale: 0.9 }}
                onClick={action.onClick}
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  gap: '6px',
                  background: 'none',
                  border: 'none',
                  cursor: 'pointer',
                  color: '#fff',
                }}
              >
                <div style={{
                  width: '48px',
                  height: '48px',
                  borderRadius: '50%',
                  background: (action as any).active ? 'rgba(239, 68, 68, 0.8)' : 'rgba(255,255,255,0.15)',
                  backdropFilter: 'blur(10px)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}>
                  {action.icon}
                </div>
                <span style={{ fontSize: '11px' }}>{action.label}</span>
              </motion.button>
            ))}
          </div>
        </div>
      </div>
      
      {/* Bottom Panel */}
      <div style={{
        background: isDark ? '#0a0a1a' : '#fff',
        borderTopLeftRadius: '24px',
        borderTopRightRadius: '24px',
        padding: '24px 20px 100px',
        marginTop: '-20px',
        position: 'relative',
        zIndex: 10,
      }}>
        <div style={{
          width: '40px',
          height: '4px',
          background: isDark ? 'rgba(255,255,255,0.2)' : 'rgba(0,0,0,0.1)',
          borderRadius: '2px',
          margin: '0 auto 20px',
        }} />
        
        <h3 style={{ 
          fontSize: '18px', 
          fontWeight: 600, 
          color: colors.text,
          marginBottom: '16px',
        }}>
          Quick Actions
        </h3>
        
        <div style={{
          display: 'grid',
          gridTemplateColumns: `repeat(${camera.permission === 'reader' ? 2 : 4}, 1fr)`,
          gap: '12px',
        }}>
          {[
            { icon: <HiOutlineZoomIn size={20} />, label: 'PTZ', color: '#3b82f6', onClick: handlePTZ },
            ...(camera.permission !== 'reader' ? [
              { icon: <HiOutlineAdjustments size={20} />, label: 'Settings', color: '#8b5cf6', onClick: handleSettings },
            ] : []),
            { icon: <HiOutlineCloudDownload size={20} />, label: 'Download', color: '#22c55e', onClick: handleDownload },
            ...(camera.permission !== 'reader' ? [
              { icon: <HiOutlineShare size={20} />, label: 'Share', color: '#f59e0b', onClick: handleShare },
            ] : []),
          ].map((action, index) => (
            <motion.button
              key={index}
              whileHover={{ scale: 1.05, y: -4 }}
              whileTap={{ scale: 0.95 }}
              onClick={action.onClick}
              style={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                gap: '8px',
                padding: '16px 8px',
                borderRadius: '16px',
                border: 'none',
                background: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.03)',
                cursor: 'pointer',
                color: action.color,
              }}
            >
              {action.icon}
              <span style={{ 
                fontSize: '11px', 
                fontWeight: 600,
                color: colors.text,
              }}>
                {action.label}
              </span>
            </motion.button>
          ))}
        </div>

        {/* PTZ Controls Modal */}
        <AnimatePresence>
          {showPTZControls && (
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              style={{
                marginTop: '16px',
                padding: '20px',
                borderRadius: '16px',
                background: isDark ? 'rgba(59, 130, 246, 0.1)' : 'rgba(59, 130, 246, 0.05)',
                border: '1px solid rgba(59, 130, 246, 0.3)',
              }}
            >
              <div style={{ textAlign: 'center', marginBottom: '16px', color: colors.text, fontWeight: 600 }}>
                PTZ Controls
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '8px', maxWidth: '180px', margin: '0 auto' }}>
                <div />
                <motion.button whileTap={{ scale: 0.9 }} style={{ padding: '12px', background: '#3b82f6', color: 'white', border: 'none', borderRadius: '8px', cursor: 'pointer' }}>▲</motion.button>
                <div />
                <motion.button whileTap={{ scale: 0.9 }} style={{ padding: '12px', background: '#3b82f6', color: 'white', border: 'none', borderRadius: '8px', cursor: 'pointer' }}>◀</motion.button>
                <motion.button whileTap={{ scale: 0.9 }} style={{ padding: '12px', background: '#6b7280', color: 'white', border: 'none', borderRadius: '8px', cursor: 'pointer', fontSize: '10px' }}>HOME</motion.button>
                <motion.button whileTap={{ scale: 0.9 }} style={{ padding: '12px', background: '#3b82f6', color: 'white', border: 'none', borderRadius: '8px', cursor: 'pointer' }}>▶</motion.button>
                <div />
                <motion.button whileTap={{ scale: 0.9 }} style={{ padding: '12px', background: '#3b82f6', color: 'white', border: 'none', borderRadius: '8px', cursor: 'pointer' }}>▼</motion.button>
                <div />
              </div>
              <div style={{ display: 'flex', justifyContent: 'center', gap: '16px', marginTop: '16px' }}>
                <motion.button whileTap={{ scale: 0.9 }} style={{ padding: '8px 16px', background: '#22c55e', color: 'white', border: 'none', borderRadius: '8px', cursor: 'pointer' }}>Zoom +</motion.button>
                <motion.button whileTap={{ scale: 0.9 }} style={{ padding: '8px 16px', background: '#ef4444', color: 'white', border: 'none', borderRadius: '8px', cursor: 'pointer' }}>Zoom -</motion.button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
        
        {/* Camera Info */}
        <GlassCard padding="16px" borderRadius="16px" style={{ marginTop: '20px' }}>
          <h4 style={{ 
            fontSize: '14px', 
            fontWeight: 600, 
            color: colors.text,
            marginBottom: '12px',
          }}>
            Camera Details
          </h4>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {[
              { label: 'Resolution', value: camera.resolution || 'Unknown' },
              { label: 'Frame Rate', value: camera.fps ? `${camera.fps} FPS` : 'Unknown' },
              { label: 'Location', value: getCameraLocationString(camera) },
              { label: 'Status', value: status.charAt(0).toUpperCase() + status.slice(1) },
            ].map((detail, index) => (
              <div key={index} style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ fontSize: '13px', color: colors.textMuted }}>{detail.label}</span>
                <span style={{ fontSize: '13px', fontWeight: 600, color: colors.text }}>{detail.value}</span>
              </div>
            ))}
          </div>
        </GlassCard>
      </div>
    </div>
  );
};

export const MonitoringPageNew: React.FC = () => {
  const { cameras, isLoading, error, refetch } = useAllCameras();
  const [selectedCamera, setSelectedCamera] = useState<CameraWithPermission | null>(null);
  const [recordingCameraIds, setRecordingCameraIds] = useState<ReadonlySet<string>>(new Set());

  // Fetch active streams on mount
  useEffect(() => {
    streamingApi.listActiveStreams()
      .then(res => setRecordingCameraIds(new Set(res.streams.map(s => s.camera_id))))
      .catch(() => {});
  }, []);

  const handleSelectCamera = (camera: CameraWithPermission) => {
    setSelectedCamera(camera);
  };

  const handleBack = () => {
    setSelectedCamera(null);
  };

  const handleToggleRecording = async (cameraId: string) => {
    const isCurrentlyRecording = recordingCameraIds.has(cameraId);
    const camera = cameras.find(c => c.id === cameraId);
    
    try {
      if (isCurrentlyRecording) {
        await streamingApi.stopStream(cameraId);
        setRecordingCameraIds(prev => {
          const next = new Set(prev);
          next.delete(cameraId);
          return next;
        });
      } else {
        if (!camera) throw new Error('Camera not found');
        await streamingApi.startStream({
          camera_id: cameraId,
          stream_url: camera.stream_url,
          config: { fps: camera.fps || 15 },
        });
        setRecordingCameraIds(prev => {
          const next = new Set(Array.from(prev));
          next.add(cameraId);
          return next;
        });
      }
    } catch (err) {
      console.error('Failed to toggle recording:', err);
      alert(`Failed to ${isCurrentlyRecording ? 'stop' : 'start'} recording: ${err instanceof Error ? err.message : 'Unknown error'}`);
    }
  };

  return (
    <AnimatePresence mode="wait">
      {selectedCamera ? (
        <motion.div
          key="detail"
          initial={{ opacity: 0, x: 100 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: -100 }}
          transition={{ type: 'spring', stiffness: 300, damping: 30 }}
        >
          <CameraDetail 
            camera={selectedCamera}
            cameras={cameras}
            recordingCameraIds={recordingCameraIds}
            onBack={handleBack}
            onSelectCamera={handleSelectCamera}
            onToggleRecording={handleToggleRecording}
          />
        </motion.div>
      ) : (
        <motion.div
          key="grid"
          initial={{ opacity: 0, x: -100 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: 100 }}
          transition={{ type: 'spring', stiffness: 300, damping: 30 }}
        >
          <CameraGrid 
            cameras={cameras}
            recordingCameraIds={recordingCameraIds}
            isLoading={isLoading}
            error={error}
            onRefresh={refetch}
            onSelectCamera={handleSelectCamera}
          />
        </motion.div>
      )}
    </AnimatePresence>
  );
};

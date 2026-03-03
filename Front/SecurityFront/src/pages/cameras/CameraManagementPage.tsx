import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useSearchParams } from 'react-router-dom';
import { 
  HiOutlineVideoCamera,
  HiOutlinePlus,
  HiOutlinePencil,
  HiOutlineTrash,
  HiOutlineCog,
  HiOutlineX,
  HiOutlineCheck,
  HiOutlineExclamation,
  HiOutlineRefresh,
  HiOutlineSearch,
  HiOutlineFilter,
} from 'react-icons/hi';
import { RiCameraLine, RiCameraOffLine } from 'react-icons/ri';
import { useTheme } from '../../contexts/ThemeContext';
import { LiveThumbnail } from '../../components/LiveThumbnail';
import { AnimatedBackground } from '../../components/AnimatedBackground';
import { 
  camerasApi, 
  CameraResponse, 
  CreateCameraRequest, 
  UpdateCameraRequest,
  CameraType,
  detectProtocol,
} from '../../services/api';

interface CameraFormData {
  name: string;
  description: string;
  stream_url: string;
  protocol: string;
  resolution: string;
  fps: number;
  encoding: string;
  camera_type: CameraType;
  username: string;
  password: string;
  building: string;
  floor: string;
  zone: string;
  room: string;
}

const LiquidGlassCard: React.FC<{
  children: React.ReactNode;
  style?: React.CSSProperties;
  glowColor?: string;
  onClick?: () => void;
}> = ({ children, style, glowColor, onClick }) => {
  const { preferences } = useTheme();
  const isDark = preferences.mode === 'dark';

  return (
    <motion.div
      onClick={onClick}
      whileHover={onClick ? { scale: 1.02 } : undefined}
      whileTap={onClick ? { scale: 0.98 } : undefined}
      style={{
        background: isDark ? 'rgba(255, 255, 255, 0.03)' : 'rgba(255, 255, 255, 0.7)',
        backdropFilter: 'blur(40px) saturate(180%)',
        WebkitBackdropFilter: 'blur(40px) saturate(180%)',
        borderRadius: '20px',
        border: isDark ? '1px solid rgba(255, 255, 255, 0.08)' : '1px solid rgba(0, 0, 0, 0.08)',
        boxShadow: glowColor 
          ? `0 8px 32px rgba(0,0,0,0.2), 0 0 40px ${glowColor}15`
          : '0 8px 32px rgba(0,0,0,0.15)',
        position: 'relative',
        overflow: 'hidden',
        cursor: onClick ? 'pointer' : 'default',
        ...style,
      }}
    >
      <div style={{
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        height: '50%',
        background: isDark 
          ? 'linear-gradient(180deg, rgba(255,255,255,0.03) 0%, transparent 100%)'
          : 'linear-gradient(180deg, rgba(255,255,255,0.5) 0%, transparent 100%)',
        pointerEvents: 'none',
      }} />
      {children}
    </motion.div>
  );
};

const defaultFormData: CameraFormData = {
  name: '',
  description: '',
  stream_url: '',
  protocol: 'rtsp',
  resolution: '1080p',
  fps: 30,
  encoding: 'H.264',
  camera_type: 'indoor',
  username: '',
  password: '',
  building: '',
  floor: '',
  zone: '',
  room: '',
};

export const CameraManagementPage: React.FC = () => {
  const { preferences } = useTheme();
  const isDark = preferences.mode === 'dark';
  const accentColor = preferences.accentColor || '#00d4ff';
  const [searchParams, setSearchParams] = useSearchParams();

  const [cameras, setCameras] = useState<CameraResponse[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showModal, setShowModal] = useState(false);
  const [modalMode, setModalMode] = useState<'add' | 'edit' | 'delete' | 'config'>('add');
  const [selectedCamera, setSelectedCamera] = useState<CameraResponse | null>(null);
  const [formData, setFormData] = useState<CameraFormData>(defaultFormData);
  const [submitting, setSubmitting] = useState(false);

  // Filter states
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'online' | 'offline'>('all');
  const [resolutionFilter, setResolutionFilter] = useState<string>('all');
  const [showFilters, setShowFilters] = useState(false);

  // Get unique resolutions from cameras
  const availableResolutions = useMemo(() => {
    const resolutions = new Set<string>();
    cameras.forEach(cam => {
      if (cam.resolution) resolutions.add(cam.resolution);
    });
    return Array.from(resolutions).sort();
  }, [cameras]);

  // Filter cameras based on search and filters
  const filteredCameras = useMemo(() => {
    return cameras.filter(camera => {
      // Search filter
      const matchesSearch = searchQuery === '' || 
        camera.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        camera.description?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        camera.location?.building?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        camera.location?.zone?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        camera.location?.room?.toLowerCase().includes(searchQuery.toLowerCase());

      // Status filter
      const matchesStatus = statusFilter === 'all' || camera.status === statusFilter;

      // Resolution filter
      const matchesResolution = resolutionFilter === 'all' || camera.resolution === resolutionFilter;

      return matchesSearch && matchesStatus && matchesResolution;
    });
  }, [cameras, searchQuery, statusFilter, resolutionFilter]);

  // Count active filters
  const activeFilterCount = useMemo(() => {
    let count = 0;
    if (statusFilter !== 'all') count++;
    if (resolutionFilter !== 'all') count++;
    return count;
  }, [statusFilter, resolutionFilter]);

  const fetchCameras = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await camerasApi.listCameras();
      setCameras(data);
    } catch (err: any) {
      setError(err.message || 'Failed to load cameras');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchCameras();
  }, [fetchCameras]);

  const resetForm = () => setFormData(defaultFormData);

  const openEditModal = useCallback((camera: CameraResponse) => {
    setSelectedCamera(camera);
    setFormData({
      name: camera.name,
      description: camera.description || '',
      stream_url: camera.stream_url,
      protocol: camera.protocol,
      resolution: camera.resolution || '1080p',
      fps: camera.fps || 30,
      encoding: camera.encoding || 'H.264',
      camera_type: camera.camera_type,
      username: '',
      password: '',
      building: camera.location?.building || '',
      floor: camera.location?.floor || '',
      zone: camera.location?.zone || '',
      room: camera.location?.room || '',
    });
    setModalMode('edit');
    setShowModal(true);
  }, []);

  // Handle edit parameter from URL (when navigating from monitoring page)
  useEffect(() => {
    const editParam = searchParams.get('edit');
    if (editParam && cameras.length > 0 && !loading) {
      const camera = cameras.find(c => c.id === editParam);
      if (camera) {
        openEditModal(camera);
        // Clear the URL param after processing
        setSearchParams({});
      }
    }
  }, [searchParams, cameras, loading, openEditModal, setSearchParams]);

  const openAddModal = () => {
    resetForm();
    setSelectedCamera(null);
    setModalMode('add');
    setShowModal(true);
  };

  const openDeleteModal = (camera: CameraResponse) => {
    setSelectedCamera(camera);
    setModalMode('delete');
    setShowModal(true);
  };

  const openConfigModal = (camera: CameraResponse) => {
    setSelectedCamera(camera);
    setFormData({
      name: camera.name,
      description: camera.description || '',
      stream_url: camera.stream_url,
      protocol: camera.protocol,
      resolution: camera.resolution || '1080p',
      fps: camera.fps || 30,
      encoding: camera.encoding || 'H.264',
      camera_type: camera.camera_type,
      username: '',
      password: '',
      building: camera.location?.building || '',
      floor: camera.location?.floor || '',
      zone: camera.location?.zone || '',
      room: camera.location?.room || '',
    });
    setModalMode('config');
    setShowModal(true);
  };

  const handleAddCamera = async () => {
    setSubmitting(true);
    try {
      const request: CreateCameraRequest = {
        name: formData.name,
        stream_url: formData.stream_url,
        protocol: formData.protocol,
        resolution: formData.resolution || '1080p',
        fps: formData.fps || 30,
        encoding: formData.encoding || 'H.264',
        camera_type: formData.camera_type || 'indoor',
        description: formData.description || undefined,
        username: formData.username || undefined,
        password: formData.password || undefined,
        location: (formData.building || formData.floor || formData.zone || formData.room) ? {
          building: formData.building || undefined,
          floor: formData.floor || undefined,
          zone: formData.zone || undefined,
          room: formData.room || undefined,
        } : undefined,
      };
      await camerasApi.createCamera(request);
      setShowModal(false);
      resetForm();
      fetchCameras();
    } catch (err: any) {
      setError(err.message || 'Failed to add camera');
    } finally {
      setSubmitting(false);
    }
  };

  const handleEditCamera = async () => {
    if (!selectedCamera) return;
    setSubmitting(true);
    try {
      const request: UpdateCameraRequest = {
        name: formData.name,
        description: formData.description || undefined,
        stream_url: formData.stream_url,
        resolution: formData.resolution,
        fps: formData.fps,
        encoding: formData.encoding,
        location: (formData.building || formData.floor || formData.zone || formData.room) ? {
          building: formData.building || undefined,
          floor: formData.floor || undefined,
          zone: formData.zone || undefined,
          room: formData.room || undefined,
        } : undefined,
      };
      await camerasApi.updateCamera(selectedCamera.id, request);
      setShowModal(false);
      fetchCameras();
    } catch (err: any) {
      setError(err.message || 'Failed to update camera');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteCamera = async () => {
    if (!selectedCamera) return;
    setSubmitting(true);
    try {
      await camerasApi.deleteCamera(selectedCamera.id);
      setShowModal(false);
      setSelectedCamera(null);
      fetchCameras();
    } catch (err: any) {
      setError(err.message || 'Failed to delete camera');
    } finally {
      setSubmitting(false);
    }
  };

  const handleSaveConfig = async () => {
    if (!selectedCamera) return;
    await handleEditCamera();
  };

  const handleToggleCamera = async (camera: CameraResponse) => {
    try {
      if (camera.is_active) {
        await camerasApi.disableCamera(camera.id);
      } else {
        await camerasApi.enableCamera(camera.id);
      }
      fetchCameras();
    } catch (err: any) {
      setError(err.message || 'Failed to toggle camera');
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'online': return '#22c55e';
      case 'offline': return '#ef4444';
      case 'maintenance': return '#f59e0b';
      case 'error': return '#dc2626';
      default: return '#6b7280';
    }
  };

  const getLocationString = (camera: CameraResponse): string => {
    const parts: string[] = [];
    if (camera.location?.building) parts.push(camera.location.building);
    if (camera.location?.floor) parts.push(camera.location.floor);
    if (camera.location?.zone) parts.push(camera.location.zone);
    if (camera.location?.room) parts.push(camera.location.room);
    return parts.length > 0 ? parts.join(' • ') : 'No location set';
  };

  const textColor = isDark ? '#fff' : '#1a1a2e';
  const mutedColor = isDark ? 'rgba(255,255,255,0.6)' : 'rgba(0,0,0,0.6)';
  const bgColor = isDark ? '#0a1628' : '#f5f5f7';

  const inputStyle = {
    width: '100%',
    padding: '14px 16px',
    borderRadius: '14px',
    background: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.03)',
    border: '1px solid ' + (isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.08)'),
    color: textColor,
    fontSize: '15px',
    outline: 'none',
    boxSizing: 'border-box' as const,
  };

  const labelStyle = { display: 'block', fontSize: '13px', fontWeight: 600, color: mutedColor, marginBottom: '8px' };

  return (
    <div style={{ minHeight: '100vh', background: bgColor, position: 'relative' }}>
      <AnimatedBackground />
      <div style={{
        position: 'relative',
        zIndex: 1,
        padding: 'clamp(16px, 3vw, 24px)',
        paddingTop: 'max(60px, clamp(16px, 3vw, 24px))',
        paddingBottom: 'clamp(100px, 12vh, 150px)',
        maxWidth: '100%',
        margin: '0 auto',
        width: '100%',
      }}>
        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '24px' }}>
          <div>
            <h1 style={{ fontSize: '28px', fontWeight: 700, color: textColor, marginBottom: '4px' }}>Cameras</h1>
            <p style={{ fontSize: '14px', color: mutedColor }}>
              {filteredCameras.length} of {cameras.length} cameras
              {(searchQuery || statusFilter !== 'all' || resolutionFilter !== 'all') && ' (filtered)'}
            </p>
          </div>
          <div style={{ display: 'flex', gap: '12px' }}>
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={fetchCameras}
              disabled={loading}
              style={{
                width: '48px', height: '48px', borderRadius: '14px',
                background: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.05)',
                border: 'none', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer',
              }}
            >
              <HiOutlineRefresh size={22} color={mutedColor} />
            </motion.button>
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={openAddModal}
              style={{
                width: '48px', height: '48px', borderRadius: '14px',
                background: 'linear-gradient(135deg, ' + accentColor + ' 0%, ' + accentColor + 'cc 100%)',
                border: 'none', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer',
                boxShadow: '0 8px 20px ' + accentColor + '40',
              }}
            >
              <HiOutlinePlus size={24} color="#fff" />
            </motion.button>
          </div>
        </div>

        {/* Search and Filter Bar */}
        <div style={{ marginBottom: '20px' }}>
          <div style={{ display: 'flex', gap: '12px', marginBottom: showFilters ? '12px' : '0' }}>
            {/* Search Input */}
            <div style={{ 
              flex: 1, 
              position: 'relative',
              display: 'flex',
              alignItems: 'center',
            }}>
              <HiOutlineSearch 
                size={20} 
                color={mutedColor} 
                style={{ position: 'absolute', left: '14px', zIndex: 1 }}
              />
              <input
                type="text"
                placeholder="Search cameras by name, location..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                style={{
                  width: '100%',
                  padding: '14px 14px 14px 44px',
                  borderRadius: '14px',
                  background: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(255,255,255,0.8)',
                  border: '1px solid ' + (isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.08)'),
                  color: textColor,
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
                  <HiOutlineX size={14} color={mutedColor} />
                </motion.button>
              )}
            </div>

            {/* Filter Toggle Button */}
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={() => setShowFilters(!showFilters)}
              style={{
                width: '48px',
                height: '48px',
                borderRadius: '14px',
                background: showFilters || activeFilterCount > 0
                  ? `${accentColor}20`
                  : isDark ? 'rgba(255,255,255,0.05)' : 'rgba(255,255,255,0.8)',
                border: showFilters || activeFilterCount > 0
                  ? `1px solid ${accentColor}40`
                  : '1px solid ' + (isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.08)'),
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                cursor: 'pointer',
                position: 'relative',
              }}
            >
              <HiOutlineFilter size={22} color={showFilters || activeFilterCount > 0 ? accentColor : mutedColor} />
              {activeFilterCount > 0 && (
                <div style={{
                  position: 'absolute',
                  top: '-4px',
                  right: '-4px',
                  width: '18px',
                  height: '18px',
                  borderRadius: '50%',
                  background: accentColor,
                  color: '#fff',
                  fontSize: '11px',
                  fontWeight: 700,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}>
                  {activeFilterCount}
                </div>
              )}
            </motion.button>
          </div>

          {/* Filter Options */}
          <AnimatePresence>
            {showFilters && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                transition={{ duration: 0.2 }}
                style={{ overflow: 'hidden' }}
              >
                <div style={{
                  display: 'flex',
                  gap: '12px',
                  flexWrap: 'wrap',
                  padding: '16px',
                  background: isDark ? 'rgba(255,255,255,0.03)' : 'rgba(255,255,255,0.8)',
                  borderRadius: '14px',
                  border: '1px solid ' + (isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.08)'),
                  backdropFilter: 'blur(10px)',
                }}>
                  {/* Status Filter */}
                  <div style={{ flex: '1', minWidth: '140px' }}>
                    <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: mutedColor, marginBottom: '8px' }}>
                      Status
                    </label>
                    <div style={{ display: 'flex', gap: '8px' }}>
                      {(['all', 'online', 'offline'] as const).map((status) => (
                        <motion.button
                          key={status}
                          whileHover={{ scale: 1.02 }}
                          whileTap={{ scale: 0.98 }}
                          onClick={() => setStatusFilter(status)}
                          style={{
                            flex: 1,
                            padding: '10px 12px',
                            borderRadius: '10px',
                            background: statusFilter === status
                              ? status === 'online' ? 'rgba(34,197,94,0.15)' 
                                : status === 'offline' ? 'rgba(239,68,68,0.15)' 
                                : `${accentColor}15`
                              : isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.03)',
                            border: statusFilter === status
                              ? `1px solid ${status === 'online' ? '#22c55e' : status === 'offline' ? '#ef4444' : accentColor}40`
                              : '1px solid transparent',
                            cursor: 'pointer',
                            color: statusFilter === status
                              ? status === 'online' ? '#22c55e' : status === 'offline' ? '#ef4444' : accentColor
                              : mutedColor,
                            fontSize: '13px',
                            fontWeight: 500,
                            textTransform: 'capitalize',
                          }}
                        >
                          {status}
                        </motion.button>
                      ))}
                    </div>
                  </div>

                  {/* Resolution Filter */}
                  <div style={{ flex: '1', minWidth: '140px' }}>
                    <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: mutedColor, marginBottom: '8px' }}>
                      Resolution
                    </label>
                    <select
                      value={resolutionFilter}
                      onChange={(e) => setResolutionFilter(e.target.value)}
                      style={{
                        width: '100%',
                        padding: '10px 12px',
                        borderRadius: '10px',
                        background: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.03)',
                        border: resolutionFilter !== 'all' 
                          ? `1px solid ${accentColor}40`
                          : '1px solid ' + (isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.08)'),
                        color: resolutionFilter !== 'all' ? accentColor : textColor,
                        fontSize: '13px',
                        fontWeight: 500,
                        cursor: 'pointer',
                        outline: 'none',
                      }}
                    >
                      <option value="all">All Resolutions</option>
                      {availableResolutions.map(res => (
                        <option key={res} value={res}>{res}</option>
                      ))}
                    </select>
                  </div>

                  {/* Clear Filters */}
                  {(statusFilter !== 'all' || resolutionFilter !== 'all') && (
                    <motion.button
                      initial={{ opacity: 0, scale: 0.9 }}
                      animate={{ opacity: 1, scale: 1 }}
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                      onClick={() => {
                        setStatusFilter('all');
                        setResolutionFilter('all');
                      }}
                      style={{
                        alignSelf: 'flex-end',
                        padding: '10px 16px',
                        borderRadius: '10px',
                        background: 'rgba(239,68,68,0.1)',
                        border: '1px solid rgba(239,68,68,0.3)',
                        cursor: 'pointer',
                        color: '#ef4444',
                        fontSize: '13px',
                        fontWeight: 500,
                        display: 'flex',
                        alignItems: 'center',
                        gap: '6px',
                      }}
                    >
                      <HiOutlineX size={14} />
                      Clear
                    </motion.button>
                  )}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Error Message */}
        {error && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            style={{
              padding: '12px 16px', borderRadius: '12px', background: 'rgba(239,68,68,0.15)',
              border: '1px solid rgba(239,68,68,0.3)', marginBottom: '16px',
              display: 'flex', alignItems: 'center', gap: '10px',
            }}
          >
            <HiOutlineExclamation size={20} color="#ef4444" />
            <span style={{ color: '#ef4444', fontSize: '14px' }}>{error}</span>
            <motion.button
              whileHover={{ scale: 1.1 }}
              whileTap={{ scale: 0.9 }}
              onClick={() => setError(null)}
              style={{ marginLeft: 'auto', background: 'transparent', border: 'none', cursor: 'pointer', padding: 0 }}
            >
              <HiOutlineX size={18} color="#ef4444" />
            </motion.button>
          </motion.div>
        )}

        {/* Loading State */}
        {loading && cameras.length === 0 && (
          <div style={{ textAlign: 'center', padding: '48px' }}>
            <motion.div animate={{ rotate: 360 }} transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}>
              <HiOutlineRefresh size={32} color={mutedColor} />
            </motion.div>
            <p style={{ color: mutedColor, marginTop: '16px' }}>Loading cameras...</p>
          </div>
        )}

        {/* Camera List */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          {/* No results message */}
          {!loading && filteredCameras.length === 0 && cameras.length > 0 && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              style={{
                textAlign: 'center',
                padding: '48px 24px',
                background: isDark ? 'rgba(255,255,255,0.03)' : 'rgba(255,255,255,0.7)',
                borderRadius: '20px',
                border: '1px solid ' + (isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.08)'),
              }}
            >
              <HiOutlineSearch size={48} color={mutedColor} style={{ marginBottom: '16px', opacity: 0.5 }} />
              <h3 style={{ fontSize: '18px', fontWeight: 600, color: textColor, marginBottom: '8px' }}>
                No cameras found
              </h3>
              <p style={{ fontSize: '14px', color: mutedColor, marginBottom: '16px' }}>
                No cameras match your current filters. Try adjusting your search or filters.
              </p>
              <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={() => {
                  setSearchQuery('');
                  setStatusFilter('all');
                  setResolutionFilter('all');
                }}
                style={{
                  padding: '12px 24px',
                  borderRadius: '12px',
                  background: `${accentColor}15`,
                  border: `1px solid ${accentColor}40`,
                  cursor: 'pointer',
                  color: accentColor,
                  fontSize: '14px',
                  fontWeight: 500,
                }}
              >
                Clear all filters
              </motion.button>
            </motion.div>
          )}
          
          {filteredCameras.map((camera, index) => (
            <motion.div
              key={camera.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.05 }}
            >
              <LiquidGlassCard glowColor={getStatusColor(camera.status)} style={{ padding: '16px' }}>
                <div style={{ display: 'flex', gap: '16px' }}>
                  <div style={{ width: '80px', height: '60px', flexShrink: 0, borderRadius: '12px', overflow: 'hidden' }}>
                    <LiveThumbnail
                      camera={camera}
                      height="60px"
                      isOnline={camera.is_active !== false}
                      showFps={false}
                      showStatus={true}
                      borderRadius="12px"
                    />
                  </div>

                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
                      <h3 style={{
                        fontSize: '16px', fontWeight: 600, color: textColor, margin: 0,
                        overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                      }}>
                        {camera.name}
                      </h3>
                      <div style={{
                        display: 'flex', alignItems: 'center', gap: '4px', padding: '2px 8px',
                        borderRadius: '8px', background: getStatusColor(camera.status) + '20',
                      }}>
                        <div style={{ width: '6px', height: '6px', borderRadius: '50%', background: getStatusColor(camera.status) }} />
                        <span style={{ fontSize: '11px', fontWeight: 600, color: getStatusColor(camera.status), textTransform: 'capitalize' }}>
                          {camera.status}
                        </span>
                      </div>
                      {!camera.is_active && (
                        <span style={{
                          fontSize: '10px', padding: '2px 6px', borderRadius: '6px',
                          background: 'rgba(239,68,68,0.2)', color: '#ef4444', fontWeight: 600,
                        }}>
                          DISABLED
                        </span>
                      )}
                    </div>
                    <p style={{ fontSize: '13px', color: mutedColor, margin: '0 0 8px' }}>
                      {getLocationString(camera)} • {camera.resolution || '1080p'} @ {camera.fps || 30}fps
                    </p>
                    <div style={{ display: 'flex', gap: '8px' }}>
                      <motion.button whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.9 }}
                        onClick={() => openEditModal(camera)}
                        style={{ width: '32px', height: '32px', borderRadius: '10px', background: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.05)', border: 'none', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', color: mutedColor }}>
                        <HiOutlinePencil size={16} />
                      </motion.button>
                      <motion.button whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.9 }}
                        onClick={() => openConfigModal(camera)}
                        style={{ width: '32px', height: '32px', borderRadius: '10px', background: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.05)', border: 'none', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', color: mutedColor }}>
                        <HiOutlineCog size={16} />
                      </motion.button>
                      <motion.button whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.9 }}
                        onClick={() => handleToggleCamera(camera)}
                        title={camera.is_active ? 'Disable camera' : 'Enable camera'}
                        style={{ width: '32px', height: '32px', borderRadius: '10px', background: camera.is_active ? 'rgba(34,197,94,0.1)' : 'rgba(239,68,68,0.1)', border: 'none', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', color: camera.is_active ? '#22c55e' : '#ef4444' }}>
                        {camera.is_active ? <RiCameraLine size={16} /> : <RiCameraOffLine size={16} />}
                      </motion.button>
                      <motion.button whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.9 }}
                        onClick={() => openDeleteModal(camera)}
                        style={{ width: '32px', height: '32px', borderRadius: '10px', background: 'rgba(239,68,68,0.1)', border: 'none', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', color: '#ef4444' }}>
                        <HiOutlineTrash size={16} />
                      </motion.button>
                    </div>
                  </div>

                  <div style={{
                    alignSelf: 'flex-start', padding: '4px 10px', borderRadius: '8px',
                    background: 'linear-gradient(135deg, ' + accentColor + '30 0%, ' + accentColor + '10 100%)',
                    border: '1px solid ' + accentColor + '30',
                  }}>
                    <span style={{ fontSize: '10px', fontWeight: 700, color: accentColor, letterSpacing: '0.5px', textTransform: 'uppercase' }}>
                      {camera.camera_type}
                    </span>
                  </div>
                </div>
              </LiquidGlassCard>
            </motion.div>
          ))}
        </div>

        {/* Empty State */}
        {!loading && cameras.length === 0 && (
          <LiquidGlassCard style={{ padding: '48px 24px', textAlign: 'center' }}>
            <HiOutlineVideoCamera size={48} style={{ color: mutedColor, marginBottom: '16px' }} />
            <h3 style={{ color: textColor, fontSize: '18px', fontWeight: 600, marginBottom: '8px' }}>No Cameras Added</h3>
            <p style={{ color: mutedColor, fontSize: '14px', marginBottom: '24px' }}>Add your first camera to start monitoring</p>
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={openAddModal}
              style={{
                padding: '12px 24px', borderRadius: '12px',
                background: 'linear-gradient(135deg, ' + accentColor + ' 0%, ' + accentColor + 'cc 100%)',
                border: 'none', color: '#fff', fontSize: '14px', fontWeight: 600, cursor: 'pointer',
                display: 'inline-flex', alignItems: 'center', gap: '8px',
              }}
            >
              <HiOutlinePlus size={18} />
              Add Camera
            </motion.button>
          </LiquidGlassCard>
        )}
      </div>

      {/* Modal */}
      <AnimatePresence>
        {showModal && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => !submitting && setShowModal(false)}
              style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(10px)', zIndex: 99998 }}
            />
            <motion.div
              initial={{ opacity: 0, y: 50, scale: 0.9 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 50, scale: 0.9 }}
              style={{
                position: 'fixed', bottom: 0, left: 0, right: 0, maxHeight: '90vh',
                background: isDark ? '#0d1829' : '#fff', borderRadius: '28px 28px 0 0',
                padding: '24px', paddingBottom: 'calc(40px + env(safe-area-inset-bottom))',
                zIndex: 99999, overflowY: 'auto',
                WebkitOverflowScrolling: 'touch',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '24px' }}>
                <h2 style={{ fontSize: '22px', fontWeight: 700, color: textColor, margin: 0 }}>
                  {modalMode === 'add' && 'Add New Camera'}
                  {modalMode === 'edit' && 'Edit Camera'}
                  {modalMode === 'delete' && 'Delete Camera'}
                  {modalMode === 'config' && 'Camera Configuration'}
                </h2>
                <motion.button
                  whileHover={{ scale: 1.1 }}
                  whileTap={{ scale: 0.9 }}
                  onClick={() => !submitting && setShowModal(false)}
                  disabled={submitting}
                  style={{
                    width: '36px', height: '36px', borderRadius: '50%',
                    background: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.05)',
                    border: 'none', display: 'flex', alignItems: 'center', justifyContent: 'center',
                    cursor: submitting ? 'not-allowed' : 'pointer', color: mutedColor, opacity: submitting ? 0.5 : 1,
                  }}
                >
                  <HiOutlineX size={20} />
                </motion.button>
              </div>

              {modalMode === 'delete' && selectedCamera && (
                <div style={{ textAlign: 'center' }}>
                  <div style={{ width: '64px', height: '64px', borderRadius: '50%', background: 'rgba(239,68,68,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 20px' }}>
                    <HiOutlineExclamation size={32} color="#ef4444" />
                  </div>
                  <p style={{ color: mutedColor, fontSize: '15px', marginBottom: '24px', lineHeight: 1.6 }}>
                    Are you sure you want to delete <strong style={{ color: textColor }}>{selectedCamera.name}</strong>? This action cannot be undone.
                  </p>
                  <div style={{ display: 'flex', gap: '12px' }}>
                    <motion.button whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}
                      onClick={() => setShowModal(false)} disabled={submitting}
                      style={{ flex: 1, padding: '14px', borderRadius: '14px', background: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.05)', border: 'none', color: textColor, fontSize: '15px', fontWeight: 600, cursor: submitting ? 'not-allowed' : 'pointer', opacity: submitting ? 0.5 : 1 }}>
                      Cancel
                    </motion.button>
                    <motion.button whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}
                      onClick={handleDeleteCamera} disabled={submitting}
                      style={{ flex: 1, padding: '14px', borderRadius: '14px', background: 'linear-gradient(135deg, #ef4444 0%, #dc2626 100%)', border: 'none', color: '#fff', fontSize: '15px', fontWeight: 600, cursor: submitting ? 'not-allowed' : 'pointer', opacity: submitting ? 0.7 : 1 }}>
                      {submitting ? 'Deleting...' : 'Delete'}
                    </motion.button>
                  </div>
                </div>
              )}

              {(modalMode === 'add' || modalMode === 'edit') && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                  <div>
                    <label style={labelStyle}>Camera Name *</label>
                    <input type="text" value={formData.name} onChange={(e) => setFormData({ ...formData, name: e.target.value })} placeholder="e.g., Front Door" style={inputStyle} />
                  </div>
                  <div>
                    <label style={labelStyle}>Description</label>
                    <input type="text" value={formData.description} onChange={(e) => setFormData({ ...formData, description: e.target.value })} placeholder="e.g., Monitors the main entrance" style={inputStyle} />
                  </div>
                  <div>
                    <label style={labelStyle}>Stream URL *</label>
                    <input type="text" value={formData.stream_url} onChange={(e) => {
                      const url = e.target.value;
                      setFormData({ ...formData, stream_url: url, protocol: detectProtocol(url) });
                    }} placeholder="rtsp://192.168.1.100:554/stream" style={inputStyle} />
                    {formData.stream_url && (
                      <div style={{ fontSize: '11px', color: accentColor, fontWeight: 600, marginTop: '4px', display: 'flex', alignItems: 'center', gap: '4px' }}>
                        Protocol detected: {formData.protocol.toUpperCase()}
                      </div>
                    )}
                  </div>
                  <div style={{ display: 'flex', gap: '12px' }}>
                    <div style={{ flex: 1 }}>
                      <label style={labelStyle}>Camera Type</label>
                      <select value={formData.camera_type} onChange={(e) => setFormData({ ...formData, camera_type: e.target.value as CameraType })} style={inputStyle}>
                        <option value="indoor">Indoor</option>
                        <option value="outdoor">Outdoor</option>
                        <option value="ptz">PTZ</option>
                        <option value="fisheye">Fisheye</option>
                        <option value="thermal">Thermal</option>
                      </select>
                    </div>
                  </div>
                  <div style={{ display: 'flex', gap: '12px' }}>
                    <div style={{ flex: 1 }}>
                      <label style={labelStyle}>Username</label>
                      <input type="text" value={formData.username} onChange={(e) => setFormData({ ...formData, username: e.target.value })} placeholder="admin" style={inputStyle} />
                    </div>
                    <div style={{ flex: 1 }}>
                      <label style={labelStyle}>Password</label>
                      <input type="password" value={formData.password} onChange={(e) => setFormData({ ...formData, password: e.target.value })} placeholder="••••••••" style={inputStyle} />
                    </div>
                  </div>
                  <div style={{ padding: '16px', borderRadius: '16px', background: isDark ? 'rgba(255,255,255,0.03)' : 'rgba(0,0,0,0.02)', border: '1px solid ' + (isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.05)') }}>
                    <label style={{ ...labelStyle, marginBottom: '12px' }}>Location (Optional)</label>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                      <input type="text" value={formData.building} onChange={(e) => setFormData({ ...formData, building: e.target.value })} placeholder="Building" style={{ ...inputStyle, padding: '12px 14px', fontSize: '14px' }} />
                      <input type="text" value={formData.floor} onChange={(e) => setFormData({ ...formData, floor: e.target.value })} placeholder="Floor" style={{ ...inputStyle, padding: '12px 14px', fontSize: '14px' }} />
                      <input type="text" value={formData.zone} onChange={(e) => setFormData({ ...formData, zone: e.target.value })} placeholder="Zone" style={{ ...inputStyle, padding: '12px 14px', fontSize: '14px' }} />
                      <input type="text" value={formData.room} onChange={(e) => setFormData({ ...formData, room: e.target.value })} placeholder="Room" style={{ ...inputStyle, padding: '12px 14px', fontSize: '14px' }} />
                    </div>
                  </div>
                  <motion.button whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}
                    onClick={modalMode === 'add' ? handleAddCamera : handleEditCamera}
                    disabled={!formData.name || !formData.stream_url || submitting}
                    style={{
                      width: '100%', padding: '16px', borderRadius: '16px',
                      background: formData.name && formData.stream_url && !submitting
                        ? 'linear-gradient(135deg, ' + accentColor + ' 0%, ' + accentColor + 'cc 100%)'
                        : 'rgba(255,255,255,0.1)',
                      border: 'none', color: '#fff', fontSize: '16px', fontWeight: 700,
                      cursor: formData.name && formData.stream_url && !submitting ? 'pointer' : 'not-allowed',
                      marginTop: '16px', marginBottom: '20px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '10px',
                      opacity: submitting ? 0.7 : 1,
                      boxShadow: formData.name && formData.stream_url ? `0 4px 20px ${accentColor}40` : 'none',
                    }}>
                    {submitting ? <><HiOutlineRefresh size={20} />{modalMode === 'add' ? 'Adding...' : 'Saving...'}</> : <><HiOutlineCheck size={20} />{modalMode === 'add' ? 'Add Camera' : 'Save Changes'}</>}
                  </motion.button>
                </div>
              )}

              {modalMode === 'config' && selectedCamera && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                  <div>
                    <label style={labelStyle}>Resolution</label>
                    <div style={{ display: 'flex', gap: '8px' }}>
                      {['720p', '1080p', '2K', '4K'].map(res => (
                        <motion.button key={res} whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}
                          onClick={() => setFormData({ ...formData, resolution: res })}
                          style={{
                            flex: 1, padding: '12px', borderRadius: '12px',
                            background: formData.resolution === res
                              ? 'linear-gradient(135deg, ' + accentColor + ' 0%, ' + accentColor + 'cc 100%)'
                              : isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.03)',
                            border: '1px solid ' + (formData.resolution === res ? accentColor : isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.08)'),
                            color: formData.resolution === res ? '#fff' : textColor,
                            fontSize: '14px', fontWeight: 600, cursor: 'pointer',
                          }}>
                          {res}
                        </motion.button>
                      ))}
                    </div>
                  </div>
                  <div>
                    <label style={labelStyle}>Frame Rate (FPS): {formData.fps}</label>
                    <input type="range" min="10" max="60" value={formData.fps} onChange={(e) => setFormData({ ...formData, fps: parseInt(e.target.value) })} style={{ width: '100%', accentColor: accentColor }} />
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', color: mutedColor, marginTop: '4px' }}>
                      <span>10 fps</span>
                      <span>60 fps</span>
                    </div>
                  </div>
                  <div>
                    <label style={labelStyle}>Encoding</label>
                    <div style={{ display: 'flex', gap: '8px' }}>
                      {['H.264', 'H.265', 'MJPEG'].map(enc => (
                        <motion.button key={enc} whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}
                          onClick={() => setFormData({ ...formData, encoding: enc })}
                          style={{
                            flex: 1, padding: '12px', borderRadius: '12px',
                            background: formData.encoding === enc
                              ? 'linear-gradient(135deg, ' + accentColor + ' 0%, ' + accentColor + 'cc 100%)'
                              : isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.03)',
                            border: '1px solid ' + (formData.encoding === enc ? accentColor : isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.08)'),
                            color: formData.encoding === enc ? '#fff' : textColor,
                            fontSize: '14px', fontWeight: 600, cursor: 'pointer',
                          }}>
                          {enc}
                        </motion.button>
                      ))}
                    </div>
                  </div>
                  <motion.button whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}
                    onClick={handleSaveConfig} disabled={submitting}
                    style={{
                      width: '100%', padding: '16px', borderRadius: '16px',
                      background: 'linear-gradient(135deg, ' + accentColor + ' 0%, ' + accentColor + 'cc 100%)',
                      border: 'none', color: '#fff', fontSize: '16px', fontWeight: 700,
                      cursor: submitting ? 'not-allowed' : 'pointer',
                      marginTop: '16px', marginBottom: '20px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '10px',
                      opacity: submitting ? 0.7 : 1,
                      boxShadow: `0 4px 20px ${accentColor}40`,
                    }}>
                    {submitting ? <><HiOutlineRefresh size={20} />Saving...</> : <><HiOutlineCheck size={20} />Save Configuration</>}
                  </motion.button>
                </div>
              )}
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
};

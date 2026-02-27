/**
 * GroupsSection — rendered as a tab inside MembersPageNew.
 *
 * Features:
 *   - Group list with search, create group (with camera selection)
 *   - Group detail: members, invite, settings (with camera grid)
 *
 * Styled to match MembersPageNew (GlassCard, framer-motion, useTheme).
 */

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { GlassCard } from '../../components/GlassCard';
import {
  groupsApi,
  GroupResponse,
  GroupDetailResponse,
  GroupMemberResponse,
  MemberPermission,
  CameraResponse,
} from '../../services/api';
import {
  HiOutlineUserGroup,
  HiOutlinePlus,
  HiOutlineMail,
  HiOutlineTrash,
  HiOutlineRefresh,
  HiOutlineSearch,
  HiOutlineX,
  HiOutlineCheck,
  HiOutlineChevronLeft,
  HiOutlineUserAdd,
  HiOutlineCog,
  HiOutlineUsers,
  HiOutlineVideoCamera,
  HiOutlinePaperAirplane,
} from 'react-icons/hi';
import {
  BsShieldCheck,
  BsCheckCircleFill,
  BsXCircleFill,
  BsClockFill,
  BsPeopleFill,
  BsShieldFill,
  BsKeyFill,
  BsEyeFill,
  BsLockFill,
  BsStarFill,
  BsHeartFill,
  BsGearFill,
  BsHouseFill,
  BsBriefcaseFill,
  BsCodeSlash,
  BsCameraVideoFill,
} from 'react-icons/bs';

/* ── Constants ────────────────────────────────────────────────────── */

const ICON_MAP: Record<string, React.ReactNode> = {
  people: <BsPeopleFill size={18} />,
  shield: <BsShieldFill size={18} />,
  key: <BsKeyFill size={18} />,
  eye: <BsEyeFill size={18} />,
  lock: <BsLockFill size={18} />,
  star: <BsStarFill size={18} />,
  heart: <BsHeartFill size={18} />,
  settings: <BsGearFill size={18} />,
  home: <BsHouseFill size={18} />,
  briefcase: <BsBriefcaseFill size={18} />,
  code: <BsCodeSlash size={18} />,
  camera: <BsCameraVideoFill size={18} />,
};
const ICON_OPTIONS = Object.keys(ICON_MAP);

const COLOR_OPTIONS = [
  '#4f46e5', '#7c3aed', '#db2777', '#dc2626',
  '#ea580c', '#d97706', '#16a34a', '#0891b2',
  '#2563eb', '#4b5563', '#0d9488', '#8b5cf6',
];

const STATUS_CFG: Record<string, { bg: string; border: string; text: string; Icon: React.FC<{ size?: number; color?: string }> }> = {
  pending:  { bg: 'rgba(251,191,36,0.15)', border: 'rgba(251,191,36,0.4)', text: '#fbbf24', Icon: BsClockFill },
  accepted: { bg: 'rgba(34,197,94,0.15)',  border: 'rgba(34,197,94,0.4)',  text: '#22c55e', Icon: BsCheckCircleFill },
  declined: { bg: 'rgba(239,68,68,0.15)',  border: 'rgba(239,68,68,0.4)',  text: '#ef4444', Icon: BsXCircleFill },
};

type DetailTab = 'members' | 'invite' | 'settings';

/* ── Small Camera Card ────────────────────────────────────────────── */
const CameraChip: React.FC<{
  camera: CameraResponse;
  isSelected: boolean;
  onToggle: () => void;
  isDark: boolean;
  colors: any;
}> = ({ camera, isSelected, onToggle, isDark, colors }) => {
  const isOnline = camera.status === 'online' && camera.is_active;
  return (
    <motion.div
      whileHover={{ scale: 1.02 }}
      whileTap={{ scale: 0.98 }}
      onClick={onToggle}
      style={{
        position: 'relative',
        borderRadius: 16,
        overflow: 'hidden',
        cursor: 'pointer',
        border: isSelected
          ? `2px solid ${colors.accent}`
          : `1px solid ${isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.08)'}`,
        background: isDark ? 'rgba(255,255,255,0.03)' : 'rgba(255,255,255,0.8)',
        boxShadow: isSelected ? `0 0 20px ${colors.accent}30` : 'none',
      }}
    >
      <div style={{
        height: 80,
        background: isDark ? 'rgba(0,0,0,0.4)' : 'rgba(0,0,0,0.1)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        position: 'relative',
      }}>
        <HiOutlineVideoCamera
          size={28}
          style={{
            opacity: isOnline ? 0.5 : 0.3,
            color: isDark ? 'rgba(255,255,255,0.5)' : 'rgba(0,0,0,0.4)',
            filter: !isOnline ? 'grayscale(1)' : 'none',
          }}
        />
        <div style={{
          position: 'absolute', top: 6, left: 6,
          display: 'flex', alignItems: 'center', gap: 4,
          padding: '2px 6px', borderRadius: 999,
          background: isOnline ? 'rgba(34,197,94,0.2)' : 'rgba(107,114,128,0.2)',
          border: `1px solid ${isOnline ? 'rgba(34,197,94,0.4)' : 'rgba(107,114,128,0.4)'}`,
        }}>
          <div style={{
            width: 6, height: 6, borderRadius: '50%',
            background: isOnline ? '#22c55e' : '#6b7280',
          }} />
          <span style={{ fontSize: 9, fontWeight: 700, color: isOnline ? '#22c55e' : '#6b7280' }}>
            {isOnline ? 'ON' : 'OFF'}
          </span>
        </div>
        {isSelected && (
          <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} style={{
            position: 'absolute', top: 6, right: 6,
            width: 22, height: 22, borderRadius: '50%',
            background: colors.accent, display: 'flex',
            alignItems: 'center', justifyContent: 'center',
          }}>
            <HiOutlineCheck size={14} color="#fff" />
          </motion.div>
        )}
      </div>
      <div style={{ padding: '8px 10px' }}>
        <div style={{
          fontSize: 12, fontWeight: 700, color: colors.text,
          overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
        }}>
          {camera.name}
        </div>
        <div style={{ fontSize: 10, color: colors.textSecondary, marginTop: 2 }}>
          {camera.camera_type}
        </div>
      </div>
    </motion.div>
  );
};

/* ── Props ────────────────────────────────────────────────────────── */
interface GroupsSectionProps {
  cameras: CameraResponse[];
  camerasLoading: boolean;
  isDark: boolean;
  isMobile: boolean;
  colors: any;
}

/* ══════════════════════════════════════════════════════════════════ */
export const GroupsSection: React.FC<GroupsSectionProps> = ({
  cameras, camerasLoading, isDark, isMobile, colors,
}) => {
  /* ── state ──────────────────────────────────────────────────────── */
  const [view, setView] = useState<'list' | 'detail'>('list');
  const [groups, setGroups] = useState<GroupResponse[]>([]);
  const [selected, setSelected] = useState<GroupDetailResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [detailTab, setDetailTab] = useState<DetailTab>('members');

  // create form
  const [showCreate, setShowCreate] = useState(false);
  const [newName, setNewName] = useState('');
  const [newDesc, setNewDesc] = useState('');
  const [newIcon, setNewIcon] = useState('people');
  const [newColor, setNewColor] = useState('#4f46e5');
  const [newPerm, setNewPerm] = useState<MemberPermission>('reader');
  const [newCameraIds, setNewCameraIds] = useState<string[]>([]);
  const [newCameraSearch, setNewCameraSearch] = useState('');
  const [isCreating, setIsCreating] = useState(false);

  // invite form
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteAccess, setInviteAccess] = useState<MemberPermission>('reader');
  const [bulkEmails, setBulkEmails] = useState('');
  const [showBulk, setShowBulk] = useState(false);

  // settings
  const [editIcon, setEditIcon] = useState('');
  const [editColor, setEditColor] = useState('');
  const [editName, setEditName] = useState('');
  const [editDesc, setEditDesc] = useState('');
  const [editPerm, setEditPerm] = useState<MemberPermission>('reader');
  const [editCameraIds, setEditCameraIds] = useState<string[]>([]);
  const [editCameraSearch, setEditCameraSearch] = useState('');

  // feedback
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  useEffect(() => {
    if (error || success) {
      const t = setTimeout(() => { setError(''); setSuccess(''); }, 5000);
      return () => clearTimeout(t);
    }
  }, [error, success]);

  const inputStyle: React.CSSProperties = useMemo(() => ({
    width: '100%',
    padding: '14px 16px',
    borderRadius: 12,
    border: `1px solid ${isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.1)'}`,
    background: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.03)',
    color: colors.text,
    fontSize: 14,
    outline: 'none',
    boxSizing: 'border-box' as const,
  }), [isDark, colors.text]);

  /* ── data loading ───────────────────────────────────────────────── */
  const fetchGroups = useCallback(async () => {
    setLoading(true);
    try {
      const data = await groupsApi.listGroups();
      setGroups(data);
    } catch { setError('Failed to load groups'); }
    finally { setLoading(false); }
  }, []);

  const fetchGroup = useCallback(async (id: string) => {
    try {
      const d = await groupsApi.getGroup(id);
      setSelected(d);
    } catch { setError('Failed to load group details'); }
  }, []);

  useEffect(() => { fetchGroups(); }, [fetchGroups]);

  const openDetail = useCallback((g: GroupResponse) => {
    fetchGroup(g.id);
    setView('detail');
    setDetailTab('members');
  }, [fetchGroup]);

  const backToList = useCallback(() => {
    setView('list');
    setSelected(null);
    fetchGroups();
  }, [fetchGroups]);

  /* ── filtered cameras ───────────────────────────────────────────── */
  const filteredNewCameras = useMemo(() => {
    if (!newCameraSearch.trim()) return cameras;
    const q = newCameraSearch.toLowerCase();
    return cameras.filter(c =>
      c.name.toLowerCase().includes(q) ||
      c.camera_type.toLowerCase().includes(q) ||
      c.location?.zone?.toLowerCase().includes(q)
    );
  }, [cameras, newCameraSearch]);

  const filteredEditCameras = useMemo(() => {
    if (!editCameraSearch.trim()) return cameras;
    const q = editCameraSearch.toLowerCase();
    return cameras.filter(c =>
      c.name.toLowerCase().includes(q) ||
      c.camera_type.toLowerCase().includes(q) ||
      c.location?.zone?.toLowerCase().includes(q)
    );
  }, [cameras, editCameraSearch]);

  /* ── actions ────────────────────────────────────────────────────── */
  const handleCreate = async () => {
    if (!newName.trim()) { setError('Group name is required'); return; }
    setIsCreating(true); setError('');
    try {
      await groupsApi.createGroup({
        name: newName, description: newDesc || undefined,
        icon: newIcon, color: newColor,
        default_permission: newPerm,
        camera_ids: newCameraIds.length > 0 ? newCameraIds : undefined,
      });
      setSuccess('Group created!');
      setNewName(''); setNewDesc(''); setNewIcon('people');
      setNewColor('#4f46e5'); setNewPerm('reader');
      setNewCameraIds([]); setNewCameraSearch('');
      setShowCreate(false);
      fetchGroups();
    } catch (e: any) { setError(e?.message || 'Failed to create group'); }
    finally { setIsCreating(false); }
  };

  const handleDelete = async (id: string) => {
    try { await groupsApi.deleteGroup(id); setSuccess('Group deleted'); backToList(); }
    catch (e: any) { setError(e?.message || 'Failed to delete group'); }
  };

  const handleInvite = async () => {
    if (!selected) return;
    if (showBulk) {
      const emails = bulkEmails.split(/[\n,;]+/).map(e => e.trim()).filter(Boolean);
      if (emails.length === 0) { setError('Enter at least one email'); return; }
      try {
        const res = await groupsApi.bulkInviteMembers(selected.id, { emails, access: inviteAccess });
        setSuccess(res.message);
        setBulkEmails('');
        fetchGroup(selected.id);
      } catch (e: any) { setError(e?.message || 'Failed to invite'); }
    } else {
      if (!inviteEmail.trim()) { setError('Enter an email'); return; }
      try {
        await groupsApi.inviteMember(selected.id, { email: inviteEmail, access: inviteAccess });
        setSuccess('Invitation sent!');
        setInviteEmail('');
        fetchGroup(selected.id);
      } catch (e: any) { setError(e?.message || 'Failed to invite'); }
    }
  };

  const handleResend = async (memberId: string) => {
    if (!selected) return;
    try {
      await groupsApi.resendMemberCode(selected.id, memberId);
      setSuccess('Code resent');
    } catch (e: any) { setError(e?.message || 'Failed to resend'); }
  };

  const handleRemoveMember = async (memberId: string) => {
    if (!selected) return;
    try {
      await groupsApi.removeMember(selected.id, memberId);
      setSuccess('Member removed');
      fetchGroup(selected.id);
    } catch (e: any) { setError(e?.message || 'Failed to remove'); }
  };

  const handleSaveSettings = async () => {
    if (!selected) return;
    try {
      await groupsApi.updateGroup(selected.id, {
        name: editName || undefined,
        description: editDesc || undefined,
        icon: editIcon || undefined,
        color: editColor || undefined,
        default_permission: editPerm,
        camera_ids: editCameraIds,
      });
      setSuccess('Group updated');
      fetchGroup(selected.id);
    } catch (e: any) { setError(e?.message || 'Failed to update'); }
  };

  // populate settings when selected changes
  useEffect(() => {
    if (selected) {
      setEditIcon(selected.icon);
      setEditColor(selected.color);
      setEditName(selected.name);
      setEditDesc(selected.description || '');
      setEditPerm(selected.default_permission);
      setEditCameraIds(selected.camera_ids || []);
      setEditCameraSearch('');
    }
  }, [selected]);

  const filteredGroups = useMemo(() => {
    if (!searchQuery.trim()) return groups;
    const q = searchQuery.toLowerCase();
    return groups.filter(g => g.name.toLowerCase().includes(q));
  }, [groups, searchQuery]);

  /* ── camera grid helper ─────────────────────────────────────────── */
  const renderCameraGrid = (
    cams: CameraResponse[],
    selectedIds: string[],
    toggleFn: (id: string) => void,
    search: string,
    setSearch: (v: string) => void,
    label: string,
  ) => (
    <div style={{ marginTop: 12 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
        <label style={{ fontSize: 14, fontWeight: 700, color: colors.text }}>{label}</label>
        <span style={{ fontSize: 12, color: selectedIds.length > 0 ? colors.accent : colors.textSecondary, fontWeight: 600 }}>
          {selectedIds.length} selected
        </span>
      </div>
      <div style={{ position: 'relative', marginBottom: 10 }}>
        <HiOutlineSearch size={16} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: colors.textSecondary }} />
        <input style={{ ...inputStyle, paddingLeft: 38, fontSize: 13 }} placeholder="Search cameras..." value={search} onChange={e => setSearch(e.target.value)} />
      </div>
      <div style={{
        maxHeight: 300, overflowY: 'auto', padding: 4,
        borderRadius: 14, background: isDark ? 'rgba(255,255,255,0.02)' : 'rgba(0,0,0,0.02)',
      }}>
        {camerasLoading ? (
          <div style={{ padding: 30, textAlign: 'center', color: colors.textSecondary }}>
            <motion.div animate={{ rotate: 360 }} transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}>
              <HiOutlineRefresh size={20} />
            </motion.div>
            <div style={{ marginTop: 8, fontSize: 12 }}>Loading cameras…</div>
          </div>
        ) : cams.length === 0 ? (
          <div style={{ padding: 30, textAlign: 'center', color: colors.textSecondary, fontSize: 13 }}>
            {search ? 'No cameras match.' : 'No cameras available.'}
          </div>
        ) : (
          <div style={{
            display: 'grid',
            gridTemplateColumns: isMobile ? 'repeat(2, 1fr)' : 'repeat(auto-fill, minmax(140px, 1fr))',
            gap: 10, padding: 6,
          }}>
            {cams.map(cam => (
              <CameraChip
                key={cam.id}
                camera={cam}
                isSelected={selectedIds.includes(cam.id)}
                onToggle={() => toggleFn(cam.id)}
                isDark={isDark}
                colors={colors}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );

  /* ════════════════════  RENDER  ════════════════════════════════════ */

  return (
    <div>
      {/* feedback */}
      <AnimatePresence>
        {(error || success) && (
          <motion.div
            initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }}
            style={{
              padding: '12px 16px', borderRadius: 12, marginBottom: 14,
              background: error ? 'rgba(239,68,68,0.1)' : 'rgba(34,197,94,0.1)',
              border: `1px solid ${error ? 'rgba(239,68,68,0.3)' : 'rgba(34,197,94,0.3)'}`,
              color: error ? '#ef4444' : '#22c55e', fontSize: 13, fontWeight: 600,
            }}
          >
            {error || success}
          </motion.div>
        )}
      </AnimatePresence>

      {/* ─── LIST VIEW ────────────────────────────────────────────── */}
      {view === 'list' && (
        <motion.div key="list" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}>
          {/* Search + Create */}
          <div style={{ display: 'flex', gap: 10, marginBottom: 16, flexWrap: 'wrap' }}>
            <div style={{ flex: 1, minWidth: 200, position: 'relative' }}>
              <HiOutlineSearch size={16} style={{ position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)', color: colors.textSecondary }} />
              <input style={{ ...inputStyle, paddingLeft: 40 }} placeholder="Search groups…" value={searchQuery} onChange={e => setSearchQuery(e.target.value)} />
            </div>
            <motion.button
              whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }}
              onClick={() => setShowCreate(!showCreate)}
              style={{
                display: 'flex', alignItems: 'center', gap: 8,
                padding: '12px 22px', borderRadius: 14, border: 'none',
                background: `linear-gradient(135deg, ${colors.accent}, ${colors.accent}dd)`,
                color: '#fff', fontWeight: 700, fontSize: 14, cursor: 'pointer',
              }}
            >
              <HiOutlinePlus size={18} />
              New Group
            </motion.button>
          </div>

          {/* Create Group Form */}
          <AnimatePresence>
            {showCreate && (
              <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} style={{ overflow: 'hidden', marginBottom: 16 }}>
                <GlassCard>
                  <div style={{ fontSize: 16, fontWeight: 700, marginBottom: 14 }}>Create Group</div>
                  <div style={{ display: 'grid', gap: 12 }}>
                    <input style={inputStyle} placeholder="Group name *" value={newName} onChange={e => setNewName(e.target.value)} />
                    <input style={inputStyle} placeholder="Description (optional)" value={newDesc} onChange={e => setNewDesc(e.target.value)} />

                    {/* Icon picker */}
                    <div>
                      <label style={{ fontSize: 12, fontWeight: 600, color: colors.textSecondary, marginBottom: 6, display: 'block' }}>Icon</label>
                      <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                        {ICON_OPTIONS.map(ic => (
                          <motion.button key={ic} whileTap={{ scale: 0.9 }}
                            onClick={() => setNewIcon(ic)}
                            style={{
                              width: 36, height: 36, borderRadius: 10,
                              display: 'flex', alignItems: 'center', justifyContent: 'center',
                              border: newIcon === ic ? `2px solid ${colors.accent}` : `1px solid ${isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.08)'}`,
                              background: newIcon === ic ? `${colors.accent}20` : 'transparent',
                              color: newIcon === ic ? colors.accent : colors.text,
                              cursor: 'pointer',
                            }}
                          >
                            {ICON_MAP[ic]}
                          </motion.button>
                        ))}
                      </div>
                    </div>

                    {/* Color picker */}
                    <div>
                      <label style={{ fontSize: 12, fontWeight: 600, color: colors.textSecondary, marginBottom: 6, display: 'block' }}>Color</label>
                      <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                        {COLOR_OPTIONS.map(col => (
                          <motion.button key={col} whileTap={{ scale: 0.9 }}
                            onClick={() => setNewColor(col)}
                            style={{
                              width: 28, height: 28, borderRadius: 8,
                              background: col,
                              border: newColor === col ? '3px solid #fff' : 'none',
                              boxShadow: newColor === col ? `0 0 0 2px ${col}` : 'none',
                              cursor: 'pointer',
                            }}
                          />
                        ))}
                      </div>
                    </div>

                    {/* Permission */}
                    <div>
                      <label style={{ fontSize: 12, fontWeight: 600, color: colors.textSecondary, marginBottom: 6, display: 'block' }}>Default Permission</label>
                      <div style={{ display: 'flex', gap: 8 }}>
                        {(['reader', 'editor'] as MemberPermission[]).map(p => (
                          <motion.button key={p} whileTap={{ scale: 0.97 }}
                            onClick={() => setNewPerm(p)}
                            style={{
                              flex: 1, padding: '12px', borderRadius: 12,
                              border: newPerm === p ? `2px solid ${colors.accent}` : `1px solid ${isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.1)'}`,
                              background: newPerm === p ? `${colors.accent}15` : isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.03)',
                              color: newPerm === p ? colors.accent : colors.text,
                              cursor: 'pointer', fontWeight: 600, fontSize: 13, textTransform: 'capitalize',
                            }}
                          >
                            {p === 'reader' ? '🔒 Reader' : '✏️ Editor'}
                          </motion.button>
                        ))}
                      </div>
                    </div>

                    {/* Camera selection */}
                    {renderCameraGrid(
                      filteredNewCameras, newCameraIds,
                      (id) => setNewCameraIds(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]),
                      newCameraSearch, setNewCameraSearch,
                      'Select Cameras to Share with Group',
                    )}

                    {/* Buttons */}
                    <div style={{ display: 'flex', gap: 10, marginTop: 4 }}>
                      <motion.button whileTap={{ scale: 0.97 }}
                        onClick={() => setShowCreate(false)}
                        style={{
                          flex: 1, padding: 14, borderRadius: 12,
                          border: `1px solid ${isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.1)'}`,
                          background: 'transparent', color: colors.text, fontWeight: 600, cursor: 'pointer', fontSize: 14,
                        }}
                      >
                        Cancel
                      </motion.button>
                      <motion.button whileHover={{ scale: 1.01 }} whileTap={{ scale: 0.99 }}
                        onClick={handleCreate} disabled={isCreating}
                        style={{
                          flex: 2, padding: 14, borderRadius: 12, border: 'none',
                          background: `linear-gradient(135deg, ${colors.accent}, ${colors.accent}dd)`,
                          color: '#fff', fontWeight: 700, cursor: isCreating ? 'not-allowed' : 'pointer',
                          opacity: isCreating ? 0.7 : 1, fontSize: 14,
                          display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
                        }}
                      >
                        {isCreating ? (
                          <><motion.div animate={{ rotate: 360 }} transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}><HiOutlineRefresh size={16} /></motion.div> Creating…</>
                        ) : (
                          <><HiOutlinePlus size={16} /> Create Group</>
                        )}
                      </motion.button>
                    </div>
                  </div>
                </GlassCard>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Groups list */}
          {loading ? (
            <div style={{ padding: 60, textAlign: 'center', color: colors.textSecondary }}>
              <motion.div animate={{ rotate: 360 }} transition={{ duration: 1, repeat: Infinity, ease: 'linear' }} style={{ display: 'inline-block', marginBottom: 12 }}>
                <HiOutlineRefresh size={28} />
              </motion.div>
              <div>Loading groups…</div>
            </div>
          ) : filteredGroups.length === 0 ? (
            <GlassCard>
              <div style={{ padding: 40, textAlign: 'center', color: colors.textSecondary }}>
                <HiOutlineUserGroup size={48} style={{ opacity: 0.3, marginBottom: 12 }} />
                <div style={{ fontWeight: 600 }}>{searchQuery ? 'No groups match your search' : 'No groups yet'}</div>
                <div style={{ fontSize: 13, marginTop: 4 }}>Create a group to share cameras with multiple members at once.</div>
              </div>
            </GlassCard>
          ) : (
            <div style={{ display: 'grid', gap: 12 }}>
              {filteredGroups.map(g => (
                <motion.div key={g.id} whileHover={{ scale: 1.005 }} whileTap={{ scale: 0.995 }}>
                  <GlassCard>
                    <div
                      onClick={() => openDetail(g)}
                      style={{ cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 14 }}
                    >
                      {/* icon */}
                      <div style={{
                        width: 44, height: 44, borderRadius: 14,
                        background: `${g.color}25`, border: `1px solid ${g.color}50`,
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        color: g.color, flexShrink: 0,
                      }}>
                        {ICON_MAP[g.icon] || <BsPeopleFill size={18} />}
                      </div>
                      {/* info */}
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontWeight: 700, fontSize: 15, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{g.name}</div>
                        <div style={{ fontSize: 12, color: colors.textSecondary, display: 'flex', gap: 14, marginTop: 2, flexWrap: 'wrap' }}>
                          <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                            <HiOutlineUsers size={13} /> {g.member_count} members
                          </span>
                          {g.camera_ids && g.camera_ids.length > 0 && (
                            <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                              <HiOutlineVideoCamera size={13} /> {g.camera_ids.length} cameras
                            </span>
                          )}
                          <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                            <BsShieldCheck size={12} /> {g.default_permission}
                          </span>
                        </div>
                      </div>
                    </div>
                  </GlassCard>
                </motion.div>
              ))}
            </div>
          )}
        </motion.div>
      )}

      {/* ─── DETAIL VIEW ──────────────────────────────────────────── */}
      {view === 'detail' && selected && (
        <motion.div key="detail" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}>
          {/* Header */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 16 }}>
            <motion.button whileTap={{ scale: 0.95 }} onClick={backToList}
              style={{
                width: 36, height: 36, borderRadius: 10,
                border: `1px solid ${isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.08)'}`,
                background: 'transparent', display: 'flex',
                alignItems: 'center', justifyContent: 'center',
                color: colors.text, cursor: 'pointer',
              }}
            >
              <HiOutlineChevronLeft size={18} />
            </motion.button>
            <div style={{
              width: 38, height: 38, borderRadius: 12,
              background: `${selected.color}25`, border: `1px solid ${selected.color}50`,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              color: selected.color,
            }}>
              {ICON_MAP[selected.icon] || <BsPeopleFill size={16} />}
            </div>
            <div style={{ flex: 1 }}>
              <div style={{ fontWeight: 700, fontSize: 17 }}>{selected.name}</div>
              {selected.description && <div style={{ fontSize: 12, color: colors.textSecondary }}>{selected.description}</div>}
            </div>
            <motion.button whileTap={{ scale: 0.95 }}
              onClick={() => handleDelete(selected.id)}
              style={{
                padding: '8px 14px', borderRadius: 10,
                border: '1px solid rgba(239,68,68,0.3)',
                background: 'rgba(239,68,68,0.1)',
                color: '#ef4444', cursor: 'pointer', fontWeight: 600, fontSize: 12,
                display: 'flex', alignItems: 'center', gap: 6,
              }}
            >
              <HiOutlineTrash size={14} /> Delete
            </motion.button>
          </div>

          {/* Detail tabs */}
          <div style={{ display: 'flex', gap: 8, marginBottom: 16 }}>
            {([
              { key: 'members' as DetailTab, label: 'Members', icon: <HiOutlineUsers size={16} /> },
              { key: 'invite' as DetailTab, label: 'Invite', icon: <HiOutlineUserAdd size={16} /> },
              { key: 'settings' as DetailTab, label: 'Settings', icon: <HiOutlineCog size={16} /> },
            ]).map(t => (
              <motion.button key={t.key} whileTap={{ scale: 0.97 }}
                onClick={() => setDetailTab(t.key)}
                style={{
                  display: 'flex', alignItems: 'center', gap: 6,
                  padding: '10px 18px', borderRadius: 12,
                  border: detailTab === t.key ? `1px solid ${colors.accent}` : `1px solid ${isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.08)'}`,
                  background: detailTab === t.key ? `${colors.accent}20` : 'transparent',
                  color: detailTab === t.key ? colors.accent : colors.text,
                  cursor: 'pointer', fontWeight: 600, fontSize: 13,
                }}
              >
                {t.icon} {t.label}
              </motion.button>
            ))}
          </div>

          {/* ── Members tab ─────────────────────────────────────────── */}
          {detailTab === 'members' && (
            <GlassCard>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
                <div style={{ fontWeight: 700, fontSize: 15 }}>Members ({selected.members.length})</div>
                <motion.button whileTap={{ scale: 0.95 }}
                  onClick={() => { if (selected) groupsApi.resendAllCodes(selected.id).then(() => setSuccess('Codes resent to all pending members')).catch(() => setError('Failed')); }}
                  style={{
                    padding: '6px 14px', borderRadius: 10,
                    border: `1px solid ${isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.08)'}`,
                    background: 'transparent', color: colors.text,
                    cursor: 'pointer', fontWeight: 600, fontSize: 12,
                    display: 'flex', alignItems: 'center', gap: 6,
                  }}
                >
                  <HiOutlineRefresh size={14} /> Resend All
                </motion.button>
              </div>

              {selected.members.length === 0 ? (
                <div style={{ padding: 30, textAlign: 'center', color: colors.textSecondary }}>
                  <HiOutlineUsers size={40} style={{ opacity: 0.3, marginBottom: 8 }} />
                  <div>No members yet. Invite someone!</div>
                </div>
              ) : (
                <div style={{ display: 'grid', gap: 10 }}>
                  {selected.members.map(m => {
                    const cfg = STATUS_CFG[m.status] || STATUS_CFG.pending;
                    const StatusIcon = cfg.Icon;
                    return (
                      <div key={m.id} style={{
                        padding: '14px 16px', borderRadius: 14,
                        border: `1px solid ${isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.06)'}`,
                        background: isDark ? 'rgba(255,255,255,0.02)' : 'rgba(0,0,0,0.015)',
                        display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap',
                      }}>
                        <HiOutlineMail size={18} style={{ color: colors.textSecondary }} />
                        <div style={{ flex: 1, minWidth: 150 }}>
                          <div style={{ fontWeight: 600, fontSize: 14 }}>{m.member_email}</div>
                          <div style={{ fontSize: 11, color: colors.textSecondary, marginTop: 2, display: 'flex', gap: 10 }}>
                            <span style={{ textTransform: 'capitalize' }}>{m.access}</span>
                          </div>
                        </div>
                        <div style={{
                          display: 'inline-flex', alignItems: 'center', gap: 4,
                          padding: '3px 10px', borderRadius: 999,
                          background: cfg.bg, border: `1px solid ${cfg.border}`,
                        }}>
                          <StatusIcon size={10} color={cfg.text} />
                          <span style={{ fontSize: 11, fontWeight: 700, color: cfg.text, textTransform: 'capitalize' }}>{m.status}</span>
                        </div>
                        <div style={{ display: 'flex', gap: 6 }}>
                          {m.status === 'pending' && (
                            <motion.button whileTap={{ scale: 0.95 }}
                              onClick={() => handleResend(m.id)}
                              style={{
                                padding: '6px 10px', borderRadius: 8,
                                border: `1px solid ${isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.08)'}`,
                                background: 'transparent', color: colors.accent,
                                cursor: 'pointer', fontSize: 11, fontWeight: 600,
                              }}
                            >
                              Resend
                            </motion.button>
                          )}
                          <motion.button whileTap={{ scale: 0.95 }}
                            onClick={() => handleRemoveMember(m.id)}
                            style={{
                              padding: '6px 10px', borderRadius: 8,
                              border: '1px solid rgba(239,68,68,0.3)',
                              background: 'rgba(239,68,68,0.1)',
                              color: '#ef4444', cursor: 'pointer', fontSize: 11, fontWeight: 600,
                            }}
                          >
                            Remove
                          </motion.button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </GlassCard>
          )}

          {/* ── Invite tab ──────────────────────────────────────────── */}
          {detailTab === 'invite' && (
            <GlassCard>
              <div style={{ fontSize: 16, fontWeight: 700, marginBottom: 14 }}>Invite Members</div>

              <div style={{ display: 'flex', gap: 8, marginBottom: 14 }}>
                <motion.button whileTap={{ scale: 0.97 }} onClick={() => setShowBulk(false)}
                  style={{
                    padding: '10px 18px', borderRadius: 12,
                    border: !showBulk ? `1px solid ${colors.accent}` : `1px solid ${isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.08)'}`,
                    background: !showBulk ? `${colors.accent}20` : 'transparent',
                    color: !showBulk ? colors.accent : colors.text,
                    cursor: 'pointer', fontWeight: 600, fontSize: 13,
                  }}
                >
                  Single
                </motion.button>
                <motion.button whileTap={{ scale: 0.97 }} onClick={() => setShowBulk(true)}
                  style={{
                    padding: '10px 18px', borderRadius: 12,
                    border: showBulk ? `1px solid ${colors.accent}` : `1px solid ${isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.08)'}`,
                    background: showBulk ? `${colors.accent}20` : 'transparent',
                    color: showBulk ? colors.accent : colors.text,
                    cursor: 'pointer', fontWeight: 600, fontSize: 13,
                  }}
                >
                  Bulk
                </motion.button>
              </div>

              <div style={{ display: 'grid', gap: 12 }}>
                {showBulk ? (
                  <div>
                    <label style={{ fontSize: 12, fontWeight: 600, color: colors.textSecondary, marginBottom: 6, display: 'block' }}>
                      Email addresses (one per line or comma-separated)
                    </label>
                    <textarea
                      style={{ ...inputStyle, minHeight: 100, resize: 'vertical' } as any}
                      placeholder="user1@example.com&#10;user2@example.com"
                      value={bulkEmails}
                      onChange={e => setBulkEmails(e.target.value)}
                    />
                  </div>
                ) : (
                  <div>
                    <label style={{ fontSize: 12, fontWeight: 600, color: colors.textSecondary, marginBottom: 6, display: 'block' }}>Email</label>
                    <input style={inputStyle} placeholder="member@example.com" value={inviteEmail} onChange={e => setInviteEmail(e.target.value)} type="email" />
                  </div>
                )}

                <div>
                  <label style={{ fontSize: 12, fontWeight: 600, color: colors.textSecondary, marginBottom: 6, display: 'block' }}>Permission</label>
                  <div style={{ display: 'flex', gap: 8 }}>
                    {(['reader', 'editor'] as MemberPermission[]).map(p => (
                      <motion.button key={p} whileTap={{ scale: 0.97 }}
                        onClick={() => setInviteAccess(p)}
                        style={{
                          flex: 1, padding: 12, borderRadius: 12,
                          border: inviteAccess === p ? `2px solid ${colors.accent}` : `1px solid ${isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.1)'}`,
                          background: inviteAccess === p ? `${colors.accent}15` : isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.03)',
                          color: inviteAccess === p ? colors.accent : colors.text,
                          cursor: 'pointer', fontWeight: 600, fontSize: 13, textTransform: 'capitalize',
                        }}
                      >
                        {p === 'reader' ? '🔒 Reader' : '✏️ Editor'}
                      </motion.button>
                    ))}
                  </div>
                </div>

                <motion.button whileHover={{ scale: 1.01 }} whileTap={{ scale: 0.99 }}
                  onClick={handleInvite}
                  style={{
                    padding: 16, borderRadius: 14, border: 'none',
                    background: `linear-gradient(135deg, ${colors.accent}, ${colors.accent}dd)`,
                    color: '#fff', fontWeight: 700, fontSize: 15, cursor: 'pointer',
                    display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10,
                  }}
                >
                  <HiOutlinePaperAirplane size={18} />
                  {showBulk ? 'Send Bulk Invitations' : 'Send Invitation'}
                </motion.button>
              </div>
            </GlassCard>
          )}

          {/* ── Settings tab ────────────────────────────────────────── */}
          {detailTab === 'settings' && (
            <GlassCard>
              <div style={{ fontSize: 16, fontWeight: 700, marginBottom: 14 }}>Group Settings</div>
              <div style={{ display: 'grid', gap: 12 }}>
                <div>
                  <label style={{ fontSize: 12, fontWeight: 600, color: colors.textSecondary, marginBottom: 6, display: 'block' }}>Name</label>
                  <input style={inputStyle} value={editName} onChange={e => setEditName(e.target.value)} />
                </div>
                <div>
                  <label style={{ fontSize: 12, fontWeight: 600, color: colors.textSecondary, marginBottom: 6, display: 'block' }}>Description</label>
                  <input style={inputStyle} value={editDesc} onChange={e => setEditDesc(e.target.value)} />
                </div>

                {/* Icon */}
                <div>
                  <label style={{ fontSize: 12, fontWeight: 600, color: colors.textSecondary, marginBottom: 6, display: 'block' }}>Icon</label>
                  <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                    {ICON_OPTIONS.map(ic => (
                      <motion.button key={ic} whileTap={{ scale: 0.9 }}
                        onClick={() => setEditIcon(ic)}
                        style={{
                          width: 36, height: 36, borderRadius: 10,
                          display: 'flex', alignItems: 'center', justifyContent: 'center',
                          border: editIcon === ic ? `2px solid ${colors.accent}` : `1px solid ${isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.08)'}`,
                          background: editIcon === ic ? `${colors.accent}20` : 'transparent',
                          color: editIcon === ic ? colors.accent : colors.text,
                          cursor: 'pointer',
                        }}
                      >
                        {ICON_MAP[ic]}
                      </motion.button>
                    ))}
                  </div>
                </div>

                {/* Color */}
                <div>
                  <label style={{ fontSize: 12, fontWeight: 600, color: colors.textSecondary, marginBottom: 6, display: 'block' }}>Color</label>
                  <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                    {COLOR_OPTIONS.map(col => (
                      <motion.button key={col} whileTap={{ scale: 0.9 }}
                        onClick={() => setEditColor(col)}
                        style={{
                          width: 28, height: 28, borderRadius: 8, background: col,
                          border: editColor === col ? '3px solid #fff' : 'none',
                          boxShadow: editColor === col ? `0 0 0 2px ${col}` : 'none',
                          cursor: 'pointer',
                        }}
                      />
                    ))}
                  </div>
                </div>

                {/* Permission */}
                <div>
                  <label style={{ fontSize: 12, fontWeight: 600, color: colors.textSecondary, marginBottom: 6, display: 'block' }}>Default Permission</label>
                  <div style={{ display: 'flex', gap: 8 }}>
                    {(['reader', 'editor'] as MemberPermission[]).map(p => (
                      <motion.button key={p} whileTap={{ scale: 0.97 }}
                        onClick={() => setEditPerm(p)}
                        style={{
                          flex: 1, padding: 12, borderRadius: 12,
                          border: editPerm === p ? `2px solid ${colors.accent}` : `1px solid ${isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.1)'}`,
                          background: editPerm === p ? `${colors.accent}15` : isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.03)',
                          color: editPerm === p ? colors.accent : colors.text,
                          cursor: 'pointer', fontWeight: 600, fontSize: 13, textTransform: 'capitalize',
                        }}
                      >
                        {p === 'reader' ? '🔒 Reader' : '✏️ Editor'}
                      </motion.button>
                    ))}
                  </div>
                </div>

                {/* Camera selection */}
                {renderCameraGrid(
                  filteredEditCameras, editCameraIds,
                  (id) => setEditCameraIds(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]),
                  editCameraSearch, setEditCameraSearch,
                  'Shared Cameras',
                )}

                {/* Save */}
                <motion.button whileHover={{ scale: 1.01 }} whileTap={{ scale: 0.99 }}
                  onClick={handleSaveSettings}
                  style={{
                    padding: 16, borderRadius: 14, border: 'none',
                    background: `linear-gradient(135deg, ${colors.accent}, ${colors.accent}dd)`,
                    color: '#fff', fontWeight: 700, fontSize: 15, cursor: 'pointer',
                    display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10,
                    marginTop: 4,
                  }}
                >
                  <HiOutlineCheck size={18} /> Save Changes
                </motion.button>
              </div>
            </GlassCard>
          )}
        </motion.div>
      )}
    </div>
  );
};

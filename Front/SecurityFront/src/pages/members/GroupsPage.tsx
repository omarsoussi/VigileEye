/**
 * Groups Management Page
 *
 * Allows users to create groups with custom icons/colors, invite members
 * (single or bulk), manage access (reader/editor), resend codes, and
 * edit group style settings.
 *
 * Styled to match MembersPageNew (glass-morphism, framer-motion, useTheme).
 */

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useTheme } from '../../contexts/ThemeContext';
import { GlassCard } from '../../components/GlassCard';
import {
  groupsApi,
  GroupResponse,
  GroupDetailResponse,
  GroupMemberResponse,
  MemberPermission,
} from '../../services/api';
import {
  HiOutlineUserGroup,
  HiOutlinePlus,
  HiOutlineMail,
  HiOutlineTrash,
  HiOutlineRefresh,
  HiOutlinePencil,
  HiOutlineSearch,
  HiOutlineX,
  HiOutlineCheck,
  HiOutlineChevronLeft,
  HiOutlineUserAdd,
  HiOutlineCog,
  HiOutlineUsers,
  HiOutlineClipboardList,
} from 'react-icons/hi';
import {
  BsShieldCheck,
  BsShieldExclamation,
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

/* ── Icon catalogue ───────────────────────────────────────────────── */
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

const STATUS_CONFIG: Record<string, { bg: string; border: string; text: string; icon: React.FC<{ size?: number; color?: string }> }> = {
  pending:  { bg: 'rgba(251,191,36,0.15)', border: 'rgba(251,191,36,0.4)', text: '#fbbf24', icon: BsClockFill },
  accepted: { bg: 'rgba(34,197,94,0.15)',  border: 'rgba(34,197,94,0.4)',  text: '#22c55e', icon: BsCheckCircleFill },
  declined: { bg: 'rgba(239,68,68,0.15)',  border: 'rgba(239,68,68,0.4)',  text: '#ef4444', icon: BsXCircleFill },
};

type ViewMode = 'list' | 'detail';
type DetailTab = 'members' | 'invite' | 'settings';

/* ── Status Badge ─────────────────────────────────────────────────── */
const StatusBadge: React.FC<{ status: string }> = ({ status }) => {
  const cfg = STATUS_CONFIG[status] || STATUS_CONFIG.pending;
  const IconComp = cfg.icon;
  return (
    <div style={{
      display: 'inline-flex', alignItems: 'center', gap: 5,
      padding: '4px 10px', borderRadius: 999,
      background: cfg.bg, border: `1px solid ${cfg.border}`,
    }}>
      <IconComp size={11} color={cfg.text} />
      <span style={{ fontSize: 11, fontWeight: 700, color: cfg.text, textTransform: 'capitalize' }}>
        {status}
      </span>
    </div>
  );
};

/* ── Main Component ──────────────────────────────────────────────── */
export const GroupsPage: React.FC = () => {
  const { colors, preferences } = useTheme();
  const isDark = preferences.mode === 'dark';

  const [isMobile, setIsMobile] = useState(false);
  const [view, setView] = useState<ViewMode>('list');
  const [groups, setGroups] = useState<GroupResponse[]>([]);
  const [selected, setSelected] = useState<GroupDetailResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');

  // Detail tabs
  const [detailTab, setDetailTab] = useState<DetailTab>('members');

  // Create-group form
  const [showCreate, setShowCreate] = useState(false);
  const [newName, setNewName] = useState('');
  const [newDesc, setNewDesc] = useState('');
  const [newIcon, setNewIcon] = useState('people');
  const [newColor, setNewColor] = useState('#4f46e5');
  const [newPerm, setNewPerm] = useState<MemberPermission>('reader');
  const [isCreating, setIsCreating] = useState(false);

  // Invite form
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteAccess, setInviteAccess] = useState<MemberPermission>('reader');
  const [bulkEmails, setBulkEmails] = useState('');
  const [showBulk, setShowBulk] = useState(false);

  // Settings form
  const [editIcon, setEditIcon] = useState('');
  const [editColor, setEditColor] = useState('');
  const [editName, setEditName] = useState('');
  const [editDesc, setEditDesc] = useState('');
  const [editPerm, setEditPerm] = useState<MemberPermission>('reader');

  // Feedback
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  /* ── Responsive ─────────────────────────────────────────────────── */
  useEffect(() => {
    const check = () => setIsMobile(window.innerWidth < 768);
    check();
    window.addEventListener('resize', check);
    return () => window.removeEventListener('resize', check);
  }, []);

  /* ── Auto-dismiss messages ──────────────────────────────────────── */
  useEffect(() => {
    if (error || success) {
      const t = setTimeout(() => { setError(''); setSuccess(''); }, 5000);
      return () => clearTimeout(t);
    }
  }, [error, success]);

  /* ── Input style helper ─────────────────────────────────────────── */
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

  /* ── Data loading ───────────────────────────────────────────────── */
  const fetchGroups = useCallback(async () => {
    setLoading(true);
    try {
      const data = await groupsApi.listGroups();
      setGroups(data);
    } catch {
      setError('Failed to load groups');
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchGroup = useCallback(async (id: string) => {
    try {
      const detail = await groupsApi.getGroup(id);
      setSelected(detail);
    } catch {
      setError('Failed to load group details');
    }
  }, []);

  useEffect(() => { fetchGroups(); }, [fetchGroups]);

  const openDetail = (id: string) => {
    fetchGroup(id);
    setView('detail');
    setDetailTab('members');
  };

  const backToList = () => {
    setView('list');
    setSelected(null);
  };

  /* ── Filtered groups ────────────────────────────────────────────── */
  const filteredGroups = useMemo(() => {
    if (!searchQuery.trim()) return groups;
    const q = searchQuery.toLowerCase();
    return groups.filter(g =>
      g.name.toLowerCase().includes(q) ||
      g.description?.toLowerCase().includes(q)
    );
  }, [groups, searchQuery]);

  /* ── Handlers ───────────────────────────────────────────────────── */
  const handleCreateGroup = async () => {
    if (!newName.trim()) { setError('Group name is required'); return; }
    setIsCreating(true);
    try {
      await groupsApi.createGroup({
        name: newName.trim(),
        description: newDesc.trim() || undefined,
        icon: newIcon,
        color: newColor,
        default_permission: newPerm,
      });
      setSuccess('Group created successfully!');
      setShowCreate(false);
      setNewName(''); setNewDesc(''); setNewIcon('people'); setNewColor('#4f46e5'); setNewPerm('reader');
      fetchGroups();
    } catch { setError('Failed to create group'); }
    finally { setIsCreating(false); }
  };

  const handleDeleteGroup = async (id: string) => {
    if (!window.confirm('Delete this group and all its members?')) return;
    try {
      await groupsApi.deleteGroup(id);
      setSuccess('Group deleted');
      backToList();
      fetchGroups();
    } catch { setError('Failed to delete group'); }
  };

  const handleInvite = async () => {
    if (!selected || !inviteEmail.trim()) { setError('Enter an email address'); return; }
    try {
      await groupsApi.inviteMember(selected.id, { email: inviteEmail.trim(), access: inviteAccess });
      setSuccess(`Invitation sent to ${inviteEmail}`);
      setInviteEmail('');
      fetchGroup(selected.id);
    } catch (err: any) { setError(err?.message || 'Failed to invite member'); }
  };

  const handleBulkInvite = async () => {
    if (!selected || !bulkEmails.trim()) return;
    const emails = bulkEmails.split(/[\n,;]+/).map(e => e.trim()).filter(Boolean);
    if (emails.length === 0) { setError('Enter at least one email'); return; }
    try {
      const result = await groupsApi.bulkInviteMembers(selected.id, { emails, access: inviteAccess });
      setSuccess(result.message || `Invited ${result.invited.length} members`);
      setBulkEmails('');
      setShowBulk(false);
      fetchGroup(selected.id);
    } catch { setError('Failed to send bulk invitations'); }
  };

  const handleResendCode = async (memberId: string) => {
    if (!selected) return;
    try {
      await groupsApi.resendMemberCode(selected.id, memberId);
      setSuccess('Invitation code resent!');
    } catch { setError('Failed to resend code'); }
  };

  const handleResendAll = async () => {
    if (!selected) return;
    try {
      const r = await groupsApi.resendAllCodes(selected.id);
      setSuccess(r.message || 'All pending codes resent');
    } catch { setError('Failed to resend codes'); }
  };

  const handleChangeAccess = async (memberId: string, access: MemberPermission) => {
    if (!selected) return;
    try {
      await groupsApi.updateMember(selected.id, memberId, { access });
      setSuccess('Access updated');
      fetchGroup(selected.id);
    } catch { setError('Failed to update access'); }
  };

  const handleRemoveMember = async (memberId: string) => {
    if (!selected || !window.confirm('Remove this member?')) return;
    try {
      await groupsApi.removeMember(selected.id, memberId);
      setSuccess('Member removed');
      fetchGroup(selected.id);
    } catch { setError('Failed to remove member'); }
  };

  const handleSaveSettings = async () => {
    if (!selected) return;
    try {
      await groupsApi.updateGroup(selected.id, {
        name: editName.trim() || undefined,
        description: editDesc.trim() || undefined,
        icon: editIcon || undefined,
        color: editColor || undefined,
        default_permission: editPerm,
      });
      setSuccess('Group settings saved');
      fetchGroups();
      fetchGroup(selected.id);
    } catch { setError('Failed to save settings'); }
  };

  const openSettings = () => {
    if (!selected) return;
    setEditName(selected.name);
    setEditDesc(selected.description || '');
    setEditIcon(selected.icon);
    setEditColor(selected.color);
    setEditPerm(selected.default_permission);
    setDetailTab('settings');
  };

  /* ── Detail tab config ──────────────────────────────────────────── */
  const detailTabs: { key: DetailTab; label: string; icon: React.ReactNode; count?: number }[] = [
    { key: 'members', label: 'Members', icon: <HiOutlineUsers size={18} />, count: selected?.members.length },
    { key: 'invite', label: 'Invite', icon: <HiOutlineUserAdd size={18} /> },
    { key: 'settings', label: 'Settings', icon: <HiOutlineCog size={18} /> },
  ];

  const pendingCount = selected?.members.filter(m => m.status === 'pending').length || 0;

  /* ── RENDER ─────────────────────────────────────────────────────── */
  return (
    <div style={{
      padding: 'clamp(16px, 3vw, 28px)',
      maxWidth: 1200,
      margin: '0 auto',
      paddingBottom: 120,
      color: colors.text,
    }}>
      {/* ── Feedback Toast ──────────────────────────────────────── */}
      <AnimatePresence>
        {(error || success) && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            style={{
              position: 'fixed', top: 20, left: '50%', transform: 'translateX(-50%)',
              padding: '14px 24px', borderRadius: 14, zIndex: 2000,
              background: error ? 'rgba(239,68,68,0.15)' : 'rgba(34,197,94,0.15)',
              border: `1px solid ${error ? 'rgba(239,68,68,0.4)' : 'rgba(34,197,94,0.4)'}`,
              backdropFilter: 'blur(20px)', WebkitBackdropFilter: 'blur(20px)',
              color: error ? '#ef4444' : '#22c55e',
              fontSize: 13, fontWeight: 600,
              maxWidth: '90vw',
            }}
          >
            {error || success}
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── LIST VIEW ───────────────────────────────────────────── */}
      <AnimatePresence mode="wait">
        {view === 'list' && (
          <motion.div
            key="list"
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
          >
            {/* Header */}
            <motion.div
              initial={{ opacity: 0, y: -20 }}
              animate={{ opacity: 1, y: 0 }}
              style={{ marginBottom: 24 }}
            >
              <h1 style={{
                fontSize: 'clamp(24px, 5vw, 32px)',
                fontWeight: 800, letterSpacing: '-0.5px', marginBottom: 8,
              }}>
                Groups
              </h1>
              <p style={{ fontSize: 14, color: colors.textSecondary, lineHeight: 1.5 }}>
                Organize members into groups with shared permissions and invite settings.
              </p>
            </motion.div>

            {/* Search + Actions Bar */}
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
              style={{
                display: 'flex', gap: 10, marginBottom: 24,
                flexWrap: 'wrap', alignItems: 'center',
              }}
            >
              {/* Search */}
              <div style={{ position: 'relative', flex: 1, minWidth: 200 }}>
                <HiOutlineSearch
                  size={18}
                  style={{
                    position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)',
                    color: colors.textMuted,
                  }}
                />
                <input
                  style={{ ...inputStyle, paddingLeft: 42 }}
                  placeholder="Search groups..."
                  value={searchQuery}
                  onChange={e => setSearchQuery(e.target.value)}
                />
              </div>

              {/* New Group */}
              <motion.button
                whileHover={{ scale: 1.03 }}
                whileTap={{ scale: 0.97 }}
                onClick={() => setShowCreate(true)}
                style={{
                  display: 'flex', alignItems: 'center', gap: 8,
                  padding: '14px 22px', borderRadius: 14,
                  background: `linear-gradient(135deg, ${colors.accent}, ${colors.accent}cc)`,
                  color: '#fff', border: 'none', cursor: 'pointer',
                  fontWeight: 700, fontSize: 14,
                  boxShadow: `0 4px 20px ${colors.accent}40`,
                }}
              >
                <HiOutlinePlus size={18} />
                New Group
              </motion.button>
            </motion.div>

            {/* ── Create Group Modal ──────────────────────────────── */}
            <AnimatePresence>
              {showCreate && (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  onClick={() => setShowCreate(false)}
                  style={{
                    position: 'fixed', inset: 0,
                    background: 'rgba(0,0,0,0.6)',
                    backdropFilter: 'blur(4px)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    zIndex: 1500, padding: 16,
                  }}
                >
                  <motion.div
                    initial={{ opacity: 0, scale: 0.95, y: 20 }}
                    animate={{ opacity: 1, scale: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.95, y: 20 }}
                    onClick={e => e.stopPropagation()}
                    style={{
                      maxWidth: 500, width: '100%',
                      background: isDark ? 'rgba(25,25,35,0.98)' : 'rgba(255,255,255,0.98)',
                      backdropFilter: 'blur(40px)',
                      borderRadius: 20,
                      border: `1px solid ${isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.08)'}`,
                      padding: 28,
                      boxShadow: '0 20px 60px rgba(0,0,0,0.4)',
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
                      <h2 style={{ margin: 0, fontSize: 20, fontWeight: 800 }}>Create Group</h2>
                      <motion.button
                        whileHover={{ scale: 1.1 }}
                        whileTap={{ scale: 0.9 }}
                        onClick={() => setShowCreate(false)}
                        style={{ background: 'none', border: 'none', cursor: 'pointer', color: colors.textMuted, padding: 4 }}
                      >
                        <HiOutlineX size={22} />
                      </motion.button>
                    </div>

                    <div style={{ display: 'grid', gap: 16 }}>
                      {/* Name */}
                      <div>
                        <label style={{ fontSize: 12, fontWeight: 600, color: colors.textSecondary, marginBottom: 6, display: 'block' }}>
                          Group Name *
                        </label>
                        <input style={inputStyle} placeholder="e.g. Security Team" value={newName} onChange={e => setNewName(e.target.value)} />
                      </div>

                      {/* Description */}
                      <div>
                        <label style={{ fontSize: 12, fontWeight: 600, color: colors.textSecondary, marginBottom: 6, display: 'block' }}>
                          Description
                        </label>
                        <input style={inputStyle} placeholder="Optional description" value={newDesc} onChange={e => setNewDesc(e.target.value)} />
                      </div>

                      {/* Icon picker */}
                      <div>
                        <label style={{ fontSize: 12, fontWeight: 600, color: colors.textSecondary, marginBottom: 8, display: 'block' }}>
                          Group Icon
                        </label>
                        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                          {ICON_OPTIONS.map(key => (
                            <motion.button
                              key={key}
                              whileHover={{ scale: 1.1 }}
                              whileTap={{ scale: 0.9 }}
                              onClick={() => setNewIcon(key)}
                              style={{
                                width: 42, height: 42, borderRadius: 12,
                                display: 'flex', alignItems: 'center', justifyContent: 'center',
                                background: key === newIcon ? newColor : isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.05)',
                                border: key === newIcon ? `2px solid ${newColor}` : `1px solid ${isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.06)'}`,
                                color: key === newIcon ? '#fff' : colors.textMuted,
                                cursor: 'pointer',
                              }}
                            >
                              {ICON_MAP[key]}
                            </motion.button>
                          ))}
                        </div>
                      </div>

                      {/* Color picker */}
                      <div>
                        <label style={{ fontSize: 12, fontWeight: 600, color: colors.textSecondary, marginBottom: 8, display: 'block' }}>
                          Group Color
                        </label>
                        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                          {COLOR_OPTIONS.map(c => (
                            <motion.div
                              key={c}
                              whileHover={{ scale: 1.15 }}
                              whileTap={{ scale: 0.9 }}
                              onClick={() => setNewColor(c)}
                              style={{
                                width: 32, height: 32, borderRadius: '50%', background: c,
                                cursor: 'pointer',
                                border: c === newColor ? '3px solid #fff' : '2px solid transparent',
                                boxShadow: c === newColor ? `0 0 12px ${c}60` : 'none',
                              }}
                            />
                          ))}
                        </div>
                      </div>

                      {/* Default Permission */}
                      <div>
                        <label style={{ fontSize: 12, fontWeight: 600, color: colors.textSecondary, marginBottom: 6, display: 'block' }}>
                          Default Permission
                        </label>
                        <div style={{ display: 'flex', gap: 8 }}>
                          {(['reader', 'editor'] as MemberPermission[]).map(p => (
                            <motion.button
                              key={p}
                              whileTap={{ scale: 0.98 }}
                              onClick={() => setNewPerm(p)}
                              style={{
                                flex: 1, padding: 14, borderRadius: 12,
                                border: p === newPerm ? `2px solid ${colors.accent}` : `1px solid ${isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.1)'}`,
                                background: p === newPerm ? `${colors.accent}15` : isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.03)',
                                color: p === newPerm ? colors.accent : colors.text,
                                cursor: 'pointer', fontWeight: 600, fontSize: 13,
                                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
                              }}
                            >
                              {p === 'editor' ? <BsShieldCheck size={14} /> : <BsShieldExclamation size={14} />}
                              {p === 'editor' ? 'Editor (RW)' : 'Reader (R)'}
                            </motion.button>
                          ))}
                        </div>
                      </div>

                      {/* Preview */}
                      <div style={{
                        padding: 16, borderRadius: 14,
                        background: isDark ? 'rgba(255,255,255,0.03)' : 'rgba(0,0,0,0.02)',
                        border: `1px solid ${isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.05)'}`,
                        display: 'flex', alignItems: 'center', gap: 12,
                      }}>
                        <div style={{
                          width: 44, height: 44, borderRadius: 12,
                          background: newColor, display: 'flex', alignItems: 'center', justifyContent: 'center',
                          color: '#fff', boxShadow: `0 4px 12px ${newColor}40`,
                        }}>
                          {ICON_MAP[newIcon]}
                        </div>
                        <div>
                          <div style={{ fontWeight: 700, fontSize: 14 }}>{newName || 'Group Name'}</div>
                          <div style={{ fontSize: 12, color: colors.textSecondary }}>{newPerm} access</div>
                        </div>
                      </div>

                      {/* Submit Buttons */}
                      <div style={{ display: 'flex', gap: 10, marginTop: 4 }}>
                        <motion.button
                          whileHover={{ scale: 1.02 }}
                          whileTap={{ scale: 0.98 }}
                          onClick={handleCreateGroup}
                          disabled={isCreating}
                          style={{
                            flex: 1, padding: 14, borderRadius: 14,
                            background: `linear-gradient(135deg, ${colors.accent}, ${colors.accent}cc)`,
                            color: '#fff', border: 'none', cursor: 'pointer',
                            fontWeight: 700, fontSize: 14,
                            opacity: isCreating ? 0.6 : 1,
                            boxShadow: `0 4px 20px ${colors.accent}30`,
                          }}
                        >
                          {isCreating ? 'Creating...' : 'Create Group'}
                        </motion.button>
                        <motion.button
                          whileHover={{ scale: 1.02 }}
                          whileTap={{ scale: 0.98 }}
                          onClick={() => setShowCreate(false)}
                          style={{
                            padding: '14px 22px', borderRadius: 14,
                            background: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.05)',
                            color: colors.text, border: `1px solid ${isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.08)'}`,
                            cursor: 'pointer', fontWeight: 600, fontSize: 14,
                          }}
                        >
                          Cancel
                        </motion.button>
                      </div>
                    </div>
                  </motion.div>
                </motion.div>
              )}
            </AnimatePresence>

            {/* ── Group Cards Grid ────────────────────────────────── */}
            {loading ? (
              <div style={{ textAlign: 'center', padding: 60, color: colors.textSecondary }}>
                <motion.div
                  animate={{ rotate: 360 }}
                  transition={{ repeat: Infinity, duration: 1, ease: 'linear' }}
                  style={{ display: 'inline-block', marginBottom: 12 }}
                >
                  <HiOutlineRefresh size={28} />
                </motion.div>
                <p style={{ fontSize: 14 }}>Loading groups...</p>
              </div>
            ) : filteredGroups.length === 0 ? (
              <GlassCard style={{ textAlign: 'center', padding: '48px 24px' }}>
                <HiOutlineUserGroup size={48} style={{ color: colors.textMuted, marginBottom: 16 }} />
                <p style={{ fontSize: 16, fontWeight: 700, marginBottom: 8 }}>
                  {searchQuery ? 'No groups found' : 'No groups yet'}
                </p>
                <p style={{ fontSize: 13, color: colors.textSecondary, marginBottom: 20 }}>
                  {searchQuery ? 'Try a different search term' : 'Create your first group to organize member access'}
                </p>
                {!searchQuery && (
                  <motion.button
                    whileHover={{ scale: 1.03 }}
                    whileTap={{ scale: 0.97 }}
                    onClick={() => setShowCreate(true)}
                    style={{
                      display: 'inline-flex', alignItems: 'center', gap: 8,
                      padding: '12px 24px', borderRadius: 14,
                      background: `linear-gradient(135deg, ${colors.accent}, ${colors.accent}cc)`,
                      color: '#fff', border: 'none', cursor: 'pointer',
                      fontWeight: 600, fontSize: 14,
                    }}
                  >
                    <HiOutlinePlus size={18} />
                    Create Group
                  </motion.button>
                )}
              </GlassCard>
            ) : (
              <div style={{
                display: 'grid',
                gridTemplateColumns: `repeat(auto-fill, minmax(${isMobile ? '100%' : '300px'}, 1fr))`,
                gap: 16,
              }}>
                {filteredGroups.map((g, i) => (
                  <motion.div
                    key={g.id}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: i * 0.05 }}
                    whileHover={{ scale: 1.02, y: -4 }}
                    whileTap={{ scale: 0.98 }}
                    onClick={() => openDetail(g.id)}
                    style={{
                      borderRadius: 18,
                      overflow: 'hidden',
                      cursor: 'pointer',
                      background: isDark ? 'rgba(255,255,255,0.04)' : 'rgba(255,255,255,0.85)',
                      border: `1px solid ${isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.06)'}`,
                      backdropFilter: 'blur(20px)',
                      boxShadow: isDark
                        ? '0 4px 24px rgba(0,0,0,0.3)'
                        : '0 4px 24px rgba(0,0,0,0.06)',
                      transition: 'box-shadow 0.3s',
                    }}
                  >
                    {/* Color accent strip */}
                    <div style={{ height: 4, background: `linear-gradient(90deg, ${g.color}, ${g.color}88)` }} />

                    <div style={{ padding: 20 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginBottom: 12 }}>
                        {/* Icon */}
                        <div style={{
                          width: 48, height: 48, borderRadius: 14,
                          background: g.color,
                          display: 'flex', alignItems: 'center', justifyContent: 'center',
                          color: '#fff',
                          boxShadow: `0 4px 16px ${g.color}40`,
                          flexShrink: 0,
                        }}>
                          {ICON_MAP[g.icon] || <BsPeopleFill size={18} />}
                        </div>
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{
                            fontWeight: 700, fontSize: 16,
                            overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                          }}>
                            {g.name}
                          </div>
                          {g.description && (
                            <div style={{
                              fontSize: 12, color: colors.textSecondary, marginTop: 2,
                              overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                            }}>
                              {g.description}
                            </div>
                          )}
                        </div>
                      </div>

                      {/* Stats row */}
                      <div style={{
                        display: 'flex', alignItems: 'center', gap: 16,
                        fontSize: 12, color: colors.textSecondary,
                      }}>
                        <span style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                          <HiOutlineUsers size={14} />
                          {g.member_count} member{g.member_count !== 1 ? 's' : ''}
                        </span>
                        <span style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                          {g.default_permission === 'editor' ? <BsShieldCheck size={13} /> : <BsShieldExclamation size={13} />}
                          {g.default_permission}
                        </span>
                      </div>
                    </div>
                  </motion.div>
                ))}
              </div>
            )}
          </motion.div>
        )}

        {/* ── DETAIL VIEW ───────────────────────────────────────── */}
        {view === 'detail' && selected && (
          <motion.div
            key="detail"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 20 }}
          >
            {/* Back + Header */}
            <motion.div
              initial={{ opacity: 0, y: -20 }}
              animate={{ opacity: 1, y: 0 }}
              style={{ marginBottom: 24 }}
            >
              <motion.button
                whileHover={{ x: -4 }}
                whileTap={{ scale: 0.95 }}
                onClick={backToList}
                style={{
                  display: 'flex', alignItems: 'center', gap: 6,
                  background: 'none', border: 'none', cursor: 'pointer',
                  color: colors.accent, fontWeight: 600, fontSize: 14,
                  marginBottom: 16, padding: 0,
                }}
              >
                <HiOutlineChevronLeft size={18} />
                Back to Groups
              </motion.button>

              <div style={{
                display: 'flex', alignItems: 'center', gap: 16,
                flexWrap: 'wrap',
              }}>
                {/* Group icon */}
                <div style={{
                  width: 56, height: 56, borderRadius: 16,
                  background: selected.color,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  color: '#fff', flexShrink: 0,
                  boxShadow: `0 6px 24px ${selected.color}50`,
                }}>
                  {ICON_MAP[selected.icon] || <BsPeopleFill size={22} />}
                </div>
                <div style={{ flex: 1 }}>
                  <h1 style={{ fontSize: 'clamp(20px, 4vw, 28px)', fontWeight: 800, margin: 0, letterSpacing: '-0.3px' }}>
                    {selected.name}
                  </h1>
                  {selected.description && (
                    <p style={{ fontSize: 13, color: colors.textSecondary, margin: '4px 0 0' }}>
                      {selected.description}
                    </p>
                  )}
                </div>

                {/* Actions */}
                <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                  {pendingCount > 0 && (
                    <motion.button
                      whileHover={{ scale: 1.03 }}
                      whileTap={{ scale: 0.97 }}
                      onClick={handleResendAll}
                      style={{
                        display: 'flex', alignItems: 'center', gap: 6,
                        padding: '10px 16px', borderRadius: 12,
                        background: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.04)',
                        border: `1px solid ${isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.08)'}`,
                        color: colors.text, cursor: 'pointer', fontWeight: 600, fontSize: 12,
                      }}
                    >
                      <HiOutlineRefresh size={15} />
                      Resend All
                    </motion.button>
                  )}
                  <motion.button
                    whileHover={{ scale: 1.03 }}
                    whileTap={{ scale: 0.97 }}
                    onClick={() => handleDeleteGroup(selected.id)}
                    style={{
                      display: 'flex', alignItems: 'center', gap: 6,
                      padding: '10px 16px', borderRadius: 12,
                      background: 'rgba(239,68,68,0.1)',
                      border: '1px solid rgba(239,68,68,0.3)',
                      color: '#ef4444', cursor: 'pointer', fontWeight: 600, fontSize: 12,
                    }}
                  >
                    <HiOutlineTrash size={15} />
                    Delete
                  </motion.button>
                </div>
              </div>
            </motion.div>

            {/* Detail Tab Navigation */}
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
              style={{ display: 'flex', gap: 8, marginBottom: 24, overflowX: 'auto', paddingBottom: 4 }}
            >
              {detailTabs.map(tab => (
                <motion.button
                  key={tab.key}
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={() => {
                    if (tab.key === 'settings') openSettings();
                    else setDetailTab(tab.key);
                  }}
                  style={{
                    display: 'flex', alignItems: 'center', gap: 8,
                    padding: '12px 20px', borderRadius: 14,
                    border: detailTab === tab.key
                      ? `1px solid ${colors.accent}`
                      : `1px solid ${isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.08)'}`,
                    background: detailTab === tab.key
                      ? `${colors.accent}20`
                      : isDark ? 'rgba(255,255,255,0.05)' : 'rgba(255,255,255,0.8)',
                    color: detailTab === tab.key ? colors.accent : colors.text,
                    cursor: 'pointer', fontWeight: 600, fontSize: 13, whiteSpace: 'nowrap',
                  }}
                >
                  {tab.icon}
                  <span>{tab.label}</span>
                  {tab.count !== undefined && tab.count > 0 && (
                    <span style={{
                      minWidth: 18, height: 18, borderRadius: 9,
                      background: colors.accent, color: '#fff',
                      fontSize: 10, fontWeight: 700,
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      padding: '0 5px',
                    }}>
                      {tab.count}
                    </span>
                  )}
                </motion.button>
              ))}
            </motion.div>

            {/* ── Members Tab ─────────────────────────────────────── */}
            <AnimatePresence mode="wait">
              {detailTab === 'members' && (
                <motion.div
                  key="tab-members"
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                >
                  <GlassCard>
                    <div style={{ fontSize: 16, fontWeight: 700, marginBottom: 16, display: 'flex', alignItems: 'center', gap: 8 }}>
                      <HiOutlineUsers size={20} />
                      Members ({selected.members.length})
                    </div>

                    {selected.members.length === 0 ? (
                      <div style={{ textAlign: 'center', padding: '32px 16px' }}>
                        <HiOutlineUserAdd size={36} style={{ color: colors.textMuted, marginBottom: 12 }} />
                        <p style={{ fontSize: 14, fontWeight: 600, marginBottom: 4 }}>No members yet</p>
                        <p style={{ fontSize: 13, color: colors.textSecondary }}>
                          Switch to the <strong>Invite</strong> tab to add members
                        </p>
                      </div>
                    ) : (
                      <div style={{ display: 'grid', gap: 10 }}>
                        {selected.members.map((m: GroupMemberResponse) => (
                          <motion.div
                            key={m.id}
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            style={{
                              display: 'flex', alignItems: 'center', gap: 12,
                              padding: 14, borderRadius: 14,
                              background: isDark ? 'rgba(255,255,255,0.03)' : 'rgba(0,0,0,0.02)',
                              border: `1px solid ${isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.04)'}`,
                              flexWrap: 'wrap',
                            }}
                          >
                            {/* Avatar circle */}
                            <div style={{
                              width: 38, height: 38, borderRadius: '50%',
                              background: `linear-gradient(135deg, ${selected.color}40, ${selected.color}20)`,
                              border: `2px solid ${selected.color}60`,
                              display: 'flex', alignItems: 'center', justifyContent: 'center',
                              color: selected.color, fontWeight: 800, fontSize: 14, flexShrink: 0,
                            }}>
                              {m.member_email[0].toUpperCase()}
                            </div>

                            {/* Info */}
                            <div style={{ flex: 1, minWidth: 150 }}>
                              <div style={{
                                fontWeight: 600, fontSize: 14,
                                overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                              }}>
                                {m.member_email}
                              </div>
                              <div style={{ fontSize: 11, color: colors.textSecondary, marginTop: 2, display: 'flex', alignItems: 'center', gap: 6 }}>
                                {m.access === 'editor' ? <BsShieldCheck size={11} /> : <BsShieldExclamation size={11} />}
                                {m.access === 'editor' ? 'Editor' : 'Reader'}
                              </div>
                            </div>

                            {/* Status */}
                            <StatusBadge status={m.status} />

                            {/* Actions */}
                            <div style={{ display: 'flex', gap: 6 }}>
                              {/* Toggle access */}
                              <motion.button
                                whileHover={{ scale: 1.05 }}
                                whileTap={{ scale: 0.95 }}
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleChangeAccess(m.id, m.access === 'reader' ? 'editor' : 'reader');
                                }}
                                title={`Switch to ${m.access === 'reader' ? 'editor' : 'reader'}`}
                                style={{
                                  width: 34, height: 34, borderRadius: 10,
                                  background: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.04)',
                                  border: `1px solid ${isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.06)'}`,
                                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                                  cursor: 'pointer', color: colors.accent,
                                }}
                              >
                                <HiOutlinePencil size={14} />
                              </motion.button>

                              {/* Resend code (pending only) */}
                              {m.status === 'pending' && (
                                <motion.button
                                  whileHover={{ scale: 1.05 }}
                                  whileTap={{ scale: 0.95 }}
                                  onClick={(e) => { e.stopPropagation(); handleResendCode(m.id); }}
                                  title="Resend code"
                                  style={{
                                    width: 34, height: 34, borderRadius: 10,
                                    background: 'rgba(251,191,36,0.1)',
                                    border: '1px solid rgba(251,191,36,0.3)',
                                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                                    cursor: 'pointer', color: '#fbbf24',
                                  }}
                                >
                                  <HiOutlineRefresh size={14} />
                                </motion.button>
                              )}

                              {/* Remove */}
                              <motion.button
                                whileHover={{ scale: 1.05 }}
                                whileTap={{ scale: 0.95 }}
                                onClick={(e) => { e.stopPropagation(); handleRemoveMember(m.id); }}
                                title="Remove member"
                                style={{
                                  width: 34, height: 34, borderRadius: 10,
                                  background: 'rgba(239,68,68,0.1)',
                                  border: '1px solid rgba(239,68,68,0.3)',
                                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                                  cursor: 'pointer', color: '#ef4444',
                                }}
                              >
                                <HiOutlineTrash size={14} />
                              </motion.button>
                            </div>
                          </motion.div>
                        ))}
                      </div>
                    )}
                  </GlassCard>
                </motion.div>
              )}

              {/* ── Invite Tab ────────────────────────────────────── */}
              {detailTab === 'invite' && (
                <motion.div
                  key="tab-invite"
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                >
                  <GlassCard>
                    <div style={{ display: 'grid', gap: 16 }}>
                      <div style={{ fontSize: 16, fontWeight: 700, display: 'flex', alignItems: 'center', gap: 8 }}>
                        <HiOutlineUserAdd size={20} />
                        Invite Members
                      </div>

                      {/* Single invite */}
                      <div>
                        <label style={{ fontSize: 12, fontWeight: 600, color: colors.textSecondary, marginBottom: 6, display: 'block' }}>
                          Email Address
                        </label>
                        <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
                          <input
                            style={{ ...inputStyle, flex: 1, minWidth: 200 }}
                            placeholder="member@example.com"
                            type="email"
                            value={inviteEmail}
                            onChange={e => setInviteEmail(e.target.value)}
                            onKeyDown={e => { if (e.key === 'Enter') handleInvite(); }}
                          />
                          <select
                            style={{ ...inputStyle, width: 'auto', minWidth: 130 }}
                            value={inviteAccess}
                            onChange={e => setInviteAccess(e.target.value as MemberPermission)}
                          >
                            <option value="reader">Reader</option>
                            <option value="editor">Editor</option>
                          </select>
                          <motion.button
                            whileHover={{ scale: 1.03 }}
                            whileTap={{ scale: 0.97 }}
                            onClick={handleInvite}
                            style={{
                              display: 'flex', alignItems: 'center', gap: 6,
                              padding: '14px 22px', borderRadius: 14,
                              background: `linear-gradient(135deg, ${colors.accent}, ${colors.accent}cc)`,
                              color: '#fff', border: 'none', cursor: 'pointer',
                              fontWeight: 700, fontSize: 14,
                              boxShadow: `0 4px 16px ${colors.accent}30`,
                            }}
                          >
                            <HiOutlineMail size={16} />
                            Send
                          </motion.button>
                        </div>
                      </div>

                      {/* Toggle bulk */}
                      <div style={{
                        borderTop: `1px solid ${isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.04)'}`,
                        paddingTop: 16,
                      }}>
                        <motion.button
                          whileHover={{ scale: 1.01 }}
                          whileTap={{ scale: 0.99 }}
                          onClick={() => setShowBulk(!showBulk)}
                          style={{
                            display: 'flex', alignItems: 'center', gap: 8,
                            background: 'none', border: 'none', cursor: 'pointer',
                            color: colors.accent, fontWeight: 600, fontSize: 13, padding: 0,
                          }}
                        >
                          <HiOutlineClipboardList size={16} />
                          {showBulk ? 'Hide Bulk Invite' : 'Bulk Invite Multiple People'}
                        </motion.button>

                        <AnimatePresence>
                          {showBulk && (
                            <motion.div
                              initial={{ height: 0, opacity: 0 }}
                              animate={{ height: 'auto', opacity: 1 }}
                              exit={{ height: 0, opacity: 0 }}
                              style={{ overflow: 'hidden' }}
                            >
                              <div style={{ marginTop: 14 }}>
                                <label style={{ fontSize: 12, fontWeight: 600, color: colors.textSecondary, marginBottom: 6, display: 'block' }}>
                                  Paste emails (comma, semicolon or newline separated)
                                </label>
                                <textarea
                                  style={{
                                    ...inputStyle,
                                    height: 100,
                                    resize: 'vertical' as const,
                                    fontFamily: 'inherit',
                                  }}
                                  placeholder={'alice@example.com, bob@example.com\ncharlie@example.com'}
                                  value={bulkEmails}
                                  onChange={e => setBulkEmails(e.target.value)}
                                />
                                <div style={{ display: 'flex', gap: 10, marginTop: 10, alignItems: 'center' }}>
                                  <motion.button
                                    whileHover={{ scale: 1.03 }}
                                    whileTap={{ scale: 0.97 }}
                                    onClick={handleBulkInvite}
                                    style={{
                                      display: 'flex', alignItems: 'center', gap: 6,
                                      padding: '12px 20px', borderRadius: 12,
                                      background: `linear-gradient(135deg, ${colors.accent}, ${colors.accent}cc)`,
                                      color: '#fff', border: 'none', cursor: 'pointer',
                                      fontWeight: 600, fontSize: 13,
                                    }}
                                  >
                                    <HiOutlineMail size={15} />
                                    Send Bulk Invitations
                                  </motion.button>
                                  <span style={{ fontSize: 12, color: colors.textSecondary }}>
                                    {bulkEmails.split(/[\n,;]+/).filter(e => e.trim()).length} email(s)
                                  </span>
                                </div>
                              </div>
                            </motion.div>
                          )}
                        </AnimatePresence>
                      </div>
                    </div>
                  </GlassCard>
                </motion.div>
              )}

              {/* ── Settings Tab ──────────────────────────────────── */}
              {detailTab === 'settings' && (
                <motion.div
                  key="tab-settings"
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                >
                  <GlassCard>
                    <div style={{ display: 'grid', gap: 16 }}>
                      <div style={{ fontSize: 16, fontWeight: 700, display: 'flex', alignItems: 'center', gap: 8 }}>
                        <HiOutlineCog size={20} />
                        Group Settings
                      </div>

                      {/* Name */}
                      <div>
                        <label style={{ fontSize: 12, fontWeight: 600, color: colors.textSecondary, marginBottom: 6, display: 'block' }}>
                          Group Name
                        </label>
                        <input style={inputStyle} value={editName} onChange={e => setEditName(e.target.value)} />
                      </div>

                      {/* Description */}
                      <div>
                        <label style={{ fontSize: 12, fontWeight: 600, color: colors.textSecondary, marginBottom: 6, display: 'block' }}>
                          Description
                        </label>
                        <input style={inputStyle} placeholder="Optional description" value={editDesc} onChange={e => setEditDesc(e.target.value)} />
                      </div>

                      {/* Icon */}
                      <div>
                        <label style={{ fontSize: 12, fontWeight: 600, color: colors.textSecondary, marginBottom: 8, display: 'block' }}>
                          Icon
                        </label>
                        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                          {ICON_OPTIONS.map(key => (
                            <motion.button
                              key={key}
                              whileHover={{ scale: 1.1 }}
                              whileTap={{ scale: 0.9 }}
                              onClick={() => setEditIcon(key)}
                              style={{
                                width: 42, height: 42, borderRadius: 12,
                                display: 'flex', alignItems: 'center', justifyContent: 'center',
                                background: key === editIcon ? editColor : isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.05)',
                                border: key === editIcon ? `2px solid ${editColor}` : `1px solid ${isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.06)'}`,
                                color: key === editIcon ? '#fff' : colors.textMuted,
                                cursor: 'pointer',
                              }}
                            >
                              {ICON_MAP[key]}
                            </motion.button>
                          ))}
                        </div>
                      </div>

                      {/* Color */}
                      <div>
                        <label style={{ fontSize: 12, fontWeight: 600, color: colors.textSecondary, marginBottom: 8, display: 'block' }}>
                          Color
                        </label>
                        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                          {COLOR_OPTIONS.map(c => (
                            <motion.div
                              key={c}
                              whileHover={{ scale: 1.15 }}
                              whileTap={{ scale: 0.9 }}
                              onClick={() => setEditColor(c)}
                              style={{
                                width: 32, height: 32, borderRadius: '50%', background: c,
                                cursor: 'pointer',
                                border: c === editColor ? '3px solid #fff' : '2px solid transparent',
                                boxShadow: c === editColor ? `0 0 12px ${c}60` : 'none',
                              }}
                            />
                          ))}
                        </div>
                      </div>

                      {/* Default Permission */}
                      <div>
                        <label style={{ fontSize: 12, fontWeight: 600, color: colors.textSecondary, marginBottom: 6, display: 'block' }}>
                          Default Permission for New Members
                        </label>
                        <div style={{ display: 'flex', gap: 8 }}>
                          {(['reader', 'editor'] as MemberPermission[]).map(p => (
                            <motion.button
                              key={p}
                              whileTap={{ scale: 0.98 }}
                              onClick={() => setEditPerm(p)}
                              style={{
                                flex: 1, padding: 14, borderRadius: 12,
                                border: p === editPerm ? `2px solid ${colors.accent}` : `1px solid ${isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.1)'}`,
                                background: p === editPerm ? `${colors.accent}15` : isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.03)',
                                color: p === editPerm ? colors.accent : colors.text,
                                cursor: 'pointer', fontWeight: 600, fontSize: 13,
                                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
                              }}
                            >
                              {p === 'editor' ? <BsShieldCheck size={14} /> : <BsShieldExclamation size={14} />}
                              {p === 'editor' ? 'Editor (RW)' : 'Reader (R)'}
                            </motion.button>
                          ))}
                        </div>
                      </div>

                      {/* Preview */}
                      <div style={{
                        padding: 16, borderRadius: 14,
                        background: isDark ? 'rgba(255,255,255,0.03)' : 'rgba(0,0,0,0.02)',
                        border: `1px solid ${isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.05)'}`,
                        display: 'flex', alignItems: 'center', gap: 12,
                      }}>
                        <div style={{
                          width: 44, height: 44, borderRadius: 12,
                          background: editColor, display: 'flex', alignItems: 'center', justifyContent: 'center',
                          color: '#fff', boxShadow: `0 4px 12px ${editColor}40`,
                        }}>
                          {ICON_MAP[editIcon]}
                        </div>
                        <div>
                          <div style={{ fontWeight: 700, fontSize: 14 }}>{editName || 'Group Name'}</div>
                          <div style={{ fontSize: 12, color: colors.textSecondary }}>{editPerm} · {selected.members.length} members</div>
                        </div>
                      </div>

                      {/* Save Button */}
                      <motion.button
                        whileHover={{ scale: 1.02 }}
                        whileTap={{ scale: 0.98 }}
                        onClick={handleSaveSettings}
                        style={{
                          padding: 14, borderRadius: 14,
                          background: `linear-gradient(135deg, ${colors.accent}, ${colors.accent}cc)`,
                          color: '#fff', border: 'none', cursor: 'pointer',
                          fontWeight: 700, fontSize: 14,
                          boxShadow: `0 4px 20px ${colors.accent}30`,
                          display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
                        }}
                      >
                        <HiOutlineCheck size={18} />
                        Save Changes
                      </motion.button>
                    </div>
                  </GlassCard>
                </motion.div>
              )}
            </AnimatePresence>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default GroupsPage;

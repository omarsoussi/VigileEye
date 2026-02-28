import React, { useEffect, useMemo, useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useSearchParams } from 'react-router-dom';
import { useTheme } from '../../contexts/ThemeContext';
import { GlassCard } from '../../components/GlassCard';
import { defaultCameras } from '../../data/cameraData';
import { membersApi, camerasApi, groupsApi, MemberInvitationResponse, MemberPermission, CameraResponse, ReceivedGroupInvitation } from '../../services/api';
import { GroupsSection } from './GroupsSection';
import {
  HiOutlineUserAdd,
  HiOutlineInbox,
  HiOutlinePaperAirplane,
  HiOutlineClock,
  HiOutlineSearch,
  HiOutlineCheck,
  HiOutlineX,
  HiOutlineRefresh,
  HiOutlineVideoCamera,
  HiOutlineEye,
  HiOutlineMail,
  HiOutlineCalendar,
  HiOutlineChevronDown,
  HiOutlineChevronUp,
  HiOutlineUserGroup,
} from 'react-icons/hi';
import { BsCircleFill, BsCheckCircleFill, BsXCircleFill, BsClockFill, BsShieldCheck, BsShieldExclamation } from 'react-icons/bs';

type TabType = 'invite' | 'received' | 'sent' | 'history' | 'groups';
type HistoryFilter = 'all' | 'accepted' | 'rejected';

// Status colors
const statusColors = {
  pending: { bg: 'rgba(251, 191, 36, 0.15)', border: 'rgba(251, 191, 36, 0.4)', text: '#fbbf24', icon: BsClockFill },
  accepted: { bg: 'rgba(34, 197, 94, 0.15)', border: 'rgba(34, 197, 94, 0.4)', text: '#22c55e', icon: BsCheckCircleFill },
  rejected: { bg: 'rgba(239, 68, 68, 0.15)', border: 'rgba(239, 68, 68, 0.4)', text: '#ef4444', icon: BsXCircleFill },
  declined: { bg: 'rgba(239, 68, 68, 0.15)', border: 'rgba(239, 68, 68, 0.4)', text: '#ef4444', icon: BsXCircleFill },
  expired: { bg: 'rgba(107, 114, 128, 0.15)', border: 'rgba(107, 114, 128, 0.4)', text: '#6b7280', icon: BsClockFill },
};

// Camera Card Component (like the monitoring page)
const CameraCard: React.FC<{
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
        borderRadius: '16px',
        overflow: 'hidden',
        cursor: 'pointer',
        border: isSelected 
          ? `2px solid ${colors.accent}` 
          : `1px solid ${isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.08)'}`,
        background: isDark ? 'rgba(255,255,255,0.03)' : 'rgba(255,255,255,0.8)',
        boxShadow: isSelected ? `0 0 20px ${colors.accent}30` : 'none',
      }}
    >
      {/* Camera Preview */}
      <div style={{
        height: '100px',
        background: isDark ? 'rgba(0,0,0,0.4)' : 'rgba(0,0,0,0.1)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        position: 'relative',
      }}>
        <HiOutlineVideoCamera 
          size={32} 
          style={{ 
            opacity: isOnline ? 0.5 : 0.3, 
            color: isDark ? 'rgba(255,255,255,0.5)' : 'rgba(0,0,0,0.4)',
            filter: !isOnline ? 'grayscale(1)' : 'none',
          }} 
        />
        
        {/* Status indicator */}
        <div style={{
          position: 'absolute',
          top: '8px',
          left: '8px',
          display: 'flex',
          alignItems: 'center',
          gap: '4px',
          padding: '3px 8px',
          borderRadius: '8px',
          background: isOnline ? 'rgba(34, 197, 94, 0.9)' : 'rgba(107, 114, 128, 0.9)',
          backdropFilter: 'blur(8px)',
        }}>
          <BsCircleFill size={5} color="#fff" />
          <span style={{ fontSize: '9px', fontWeight: 600, color: '#fff', textTransform: 'uppercase' }}>
            {isOnline ? 'Online' : 'Offline'}
          </span>
        </div>

        {/* Selection indicator */}
        <div style={{
          position: 'absolute',
          top: '8px',
          right: '8px',
          width: '22px',
          height: '22px',
          borderRadius: '8px',
          border: `2px solid ${isSelected ? colors.accent : 'rgba(255,255,255,0.5)'}`,
          background: isSelected ? colors.accent : 'rgba(0,0,0,0.3)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          backdropFilter: 'blur(8px)',
        }}>
          {isSelected && <HiOutlineCheck size={14} color="#fff" />}
        </div>
      </div>

      {/* Camera Info */}
      <div style={{ padding: '12px' }}>
        <div style={{ 
          fontWeight: 700, 
          fontSize: '13px', 
          color: colors.text,
          marginBottom: '4px',
          overflow: 'hidden',
          textOverflow: 'ellipsis',
          whiteSpace: 'nowrap',
        }}>
          {camera.name}
        </div>
        <div style={{ 
          fontSize: '11px', 
          color: colors.textSecondary,
          display: 'flex',
          alignItems: 'center',
          gap: '6px',
        }}>
          <span style={{ textTransform: 'capitalize' }}>{camera.camera_type}</span>
          <span>•</span>
          <span>{camera.resolution || '1080p'}</span>
        </div>
      </div>
    </motion.div>
  );
};

// Status Badge Component
const StatusBadge: React.FC<{ status: string; size?: 'sm' | 'md' }> = ({ status, size = 'md' }) => {
  const statusKey = status.toLowerCase() as keyof typeof statusColors;
  const config = statusColors[statusKey] || statusColors.pending;
  const IconComponent = config.icon;
  
  return (
    <div style={{
      display: 'flex',
      alignItems: 'center',
      gap: size === 'sm' ? '4px' : '6px',
      padding: size === 'sm' ? '4px 8px' : '6px 12px',
      borderRadius: '999px',
      background: config.bg,
      border: `1px solid ${config.border}`,
    }}>
      <IconComponent size={size === 'sm' ? 10 : 12} color={config.text} />
      <span style={{ 
        fontSize: size === 'sm' ? '10px' : '11px', 
        fontWeight: 700, 
        color: config.text,
        textTransform: 'capitalize',
      }}>
        {status}
      </span>
    </div>
  );
};

// Invitation Card Component
const InvitationCard: React.FC<{
  invitation: MemberInvitationResponse;
  type: 'received' | 'sent';
  cameras: CameraResponse[];
  isDark: boolean;
  colors: any;
  onAccept?: (id: string, code: string) => void;
  onDecline?: (id: string) => void;
  onResend?: (id: string) => void;
  isExpanded?: boolean;
  onToggleExpand?: () => void;
}> = ({ 
  invitation, 
  type, 
  cameras, 
  isDark, 
  colors, 
  onAccept, 
  onDecline, 
  onResend,
  isExpanded,
  onToggleExpand,
}) => {
  const [acceptCode, setAcceptCode] = useState('');
  const [showCodeInput, setShowCodeInput] = useState(false);
  const isPending = invitation.status === 'pending';
  
  // Get camera details for this invitation
  const invitationCameras = cameras.filter(c => invitation.camera_ids.includes(c.id));

  const inputStyle: React.CSSProperties = {
    width: '100%',
    padding: '10px 14px',
    borderRadius: '10px',
    border: `1px solid ${isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.1)'}`,
    background: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.03)',
    color: colors.text,
    fontSize: '13px',
    outline: 'none',
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      style={{
        padding: '16px',
        borderRadius: '16px',
        border: `1px solid ${isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.06)'}`,
        background: isDark ? 'rgba(255,255,255,0.03)' : 'rgba(255,255,255,0.8)',
      }}
    >
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '12px' }}>
        <div style={{ flex: 1 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '6px' }}>
            <HiOutlineMail size={16} color={colors.textSecondary} />
            <span style={{ fontWeight: 700, fontSize: '14px', color: colors.text }}>
              {type === 'received' ? invitation.inviter_email : invitation.recipient_email}
            </span>
          </div>
          <div style={{ 
            fontSize: '12px', 
            color: colors.textSecondary,
            display: 'flex',
            alignItems: 'center',
            gap: '12px',
            flexWrap: 'wrap',
          }}>
            <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
              <HiOutlineVideoCamera size={14} />
              {invitation.camera_ids.length} camera{invitation.camera_ids.length !== 1 ? 's' : ''}
            </span>
            <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
              {invitation.permission === 'editor' ? <BsShieldCheck size={14} /> : <BsShieldExclamation size={14} />}
              {invitation.permission === 'editor' ? 'Editor (RW)' : 'Reader (R)'}
            </span>
          </div>
        </div>
        <StatusBadge status={invitation.status} />
      </div>

      {/* Expandable cameras section */}
      {(invitation.status === 'accepted' || isExpanded !== undefined) && invitationCameras.length > 0 && (
        <div style={{ marginTop: '12px' }}>
          <button
            onClick={onToggleExpand}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              background: 'none',
              border: 'none',
              color: colors.accent,
              fontSize: '12px',
              fontWeight: 600,
              cursor: 'pointer',
              padding: '4px 0',
            }}
          >
            <HiOutlineEye size={14} />
            {isExpanded ? 'Hide' : 'View'} Shared Cameras
            {isExpanded ? <HiOutlineChevronUp size={14} /> : <HiOutlineChevronDown size={14} />}
          </button>
          
          <AnimatePresence>
            {isExpanded && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: 'auto', opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                style={{ overflow: 'hidden' }}
              >
                <div style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(auto-fill, minmax(120px, 1fr))',
                  gap: '8px',
                  marginTop: '10px',
                  padding: '12px',
                  borderRadius: '12px',
                  background: isDark ? 'rgba(255,255,255,0.03)' : 'rgba(0,0,0,0.02)',
                }}>
                  {invitationCameras.map(cam => (
                    <div
                      key={cam.id}
                      style={{
                        padding: '10px',
                        borderRadius: '10px',
                        background: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(255,255,255,0.9)',
                        border: `1px solid ${isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.05)'}`,
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '4px' }}>
                        <HiOutlineVideoCamera size={12} color={colors.accent} />
                        <span style={{ fontSize: '11px', fontWeight: 600, color: colors.text }}>{cam.name}</span>
                      </div>
                      <span style={{ fontSize: '10px', color: colors.textSecondary }}>{cam.camera_type}</span>
                    </div>
                  ))}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      )}

      {/* Actions for pending received invitations */}
      {type === 'received' && isPending && (
        <div style={{ marginTop: '14px' }}>
          {!showCodeInput ? (
            <div style={{ display: 'flex', gap: '10px' }}>
              <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={() => setShowCodeInput(true)}
                style={{
                  flex: 1,
                  padding: '10px 16px',
                  borderRadius: '10px',
                  border: 'none',
                  background: '#22c55e',
                  color: '#fff',
                  fontWeight: 600,
                  fontSize: '13px',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '6px',
                }}
              >
                <HiOutlineCheck size={16} />
                Accept
              </motion.button>
              <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={() => onDecline?.(invitation.id)}
                style={{
                  flex: 1,
                  padding: '10px 16px',
                  borderRadius: '10px',
                  border: `1px solid ${isDark ? 'rgba(239,68,68,0.4)' : 'rgba(239,68,68,0.3)'}`,
                  background: 'rgba(239,68,68,0.1)',
                  color: '#ef4444',
                  fontWeight: 600,
                  fontSize: '13px',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '6px',
                }}
              >
                <HiOutlineX size={16} />
                Decline
              </motion.button>
            </div>
          ) : (
            <div style={{ display: 'grid', gap: '10px' }}>
              <input
                style={inputStyle}
                placeholder="Enter verification code from email"
                value={acceptCode}
                onChange={(e) => setAcceptCode(e.target.value)}
              />
              <div style={{ display: 'flex', gap: '8px' }}>
                <motion.button
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={() => {
                    onAccept?.(invitation.id, acceptCode);
                    setAcceptCode('');
                    setShowCodeInput(false);
                  }}
                  style={{
                    flex: 1,
                    padding: '10px 14px',
                    borderRadius: '10px',
                    border: 'none',
                    background: '#22c55e',
                    color: '#fff',
                    fontWeight: 600,
                    fontSize: '13px',
                    cursor: 'pointer',
                  }}
                >
                  Confirm
                </motion.button>
                <motion.button
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={() => onResend?.(invitation.id)}
                  style={{
                    padding: '10px 14px',
                    borderRadius: '10px',
                    border: `1px solid ${isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.1)'}`,
                    background: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.03)',
                    color: colors.text,
                    fontWeight: 600,
                    fontSize: '13px',
                    cursor: 'pointer',
                  }}
                >
                  Resend
                </motion.button>
                <motion.button
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={() => {
                    setShowCodeInput(false);
                    setAcceptCode('');
                  }}
                  style={{
                    padding: '10px 14px',
                    borderRadius: '10px',
                    border: `1px solid ${isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.1)'}`,
                    background: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.03)',
                    color: colors.textSecondary,
                    fontWeight: 600,
                    fontSize: '13px',
                    cursor: 'pointer',
                  }}
                >
                  Cancel
                </motion.button>
              </div>
            </div>
          )}
        </div>
      )}
    </motion.div>
  );
};

// Group Invitation Card Component
const GroupInvitationCard: React.FC<{
  invitation: ReceivedGroupInvitation;
  isDark: boolean;
  colors: any;
  onAccept?: (groupId: string, memberId: string, code: string) => void;
  onDecline?: (groupId: string, memberId: string) => void;
  onResend?: (groupId: string, memberId: string) => void;
}> = ({ invitation, isDark, colors, onAccept, onDecline, onResend }) => {
  const [acceptCode, setAcceptCode] = useState('');
  const [showCodeInput, setShowCodeInput] = useState(false);

  const inputStyle: React.CSSProperties = {
    width: '100%',
    padding: '10px 14px',
    borderRadius: '10px',
    border: `1px solid ${isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.1)'}`,
    background: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.03)',
    color: colors.text,
    fontSize: '13px',
    outline: 'none',
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      style={{
        padding: '16px',
        borderRadius: '16px',
        border: `1px solid ${isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.06)'}`,
        background: isDark ? 'rgba(255,255,255,0.03)' : 'rgba(255,255,255,0.8)',
      }}
    >
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '12px' }}>
        <div style={{ flex: 1 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '6px' }}>
            <HiOutlineUserGroup size={16} color={colors.accent} />
            <span style={{ fontWeight: 700, fontSize: '14px', color: colors.text }}>
              {invitation.group_name}
            </span>
            <span style={{
              padding: '2px 8px',
              borderRadius: '999px',
              background: isDark ? 'rgba(99,102,241,0.15)' : 'rgba(99,102,241,0.1)',
              border: '1px solid rgba(99,102,241,0.3)',
              color: '#6366f1',
              fontSize: '10px',
              fontWeight: 700,
            }}>
              Group
            </span>
          </div>
          <div style={{
            fontSize: '12px',
            color: colors.textSecondary,
            display: 'flex',
            alignItems: 'center',
            gap: '12px',
            flexWrap: 'wrap',
          }}>
            {invitation.inviter_email && (
              <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                <HiOutlineMail size={14} />
                From: {invitation.inviter_email}
              </span>
            )}
            <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
              <HiOutlineVideoCamera size={14} />
              {invitation.camera_ids.length} camera{invitation.camera_ids.length !== 1 ? 's' : ''}
            </span>
            <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
              {invitation.permission === 'editor' ? <BsShieldCheck size={14} /> : <BsShieldExclamation size={14} />}
              {invitation.permission === 'editor' ? 'Editor (RW)' : 'Reader (R)'}
            </span>
          </div>
        </div>
        <StatusBadge status={invitation.status} />
      </div>

      {/* Actions for pending */}
      {invitation.status === 'pending' && (
        <div style={{ marginTop: '14px' }}>
          {!showCodeInput ? (
            <div style={{ display: 'flex', gap: '10px' }}>
              <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={() => setShowCodeInput(true)}
                style={{
                  flex: 1,
                  padding: '10px 16px',
                  borderRadius: '10px',
                  border: 'none',
                  background: '#22c55e',
                  color: '#fff',
                  fontWeight: 600,
                  fontSize: '13px',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '6px',
                }}
              >
                <HiOutlineCheck size={16} />
                Accept
              </motion.button>
              <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={() => onDecline?.(invitation.group_id, invitation.id)}
                style={{
                  flex: 1,
                  padding: '10px 16px',
                  borderRadius: '10px',
                  border: `1px solid ${isDark ? 'rgba(239,68,68,0.4)' : 'rgba(239,68,68,0.3)'}`,
                  background: 'rgba(239,68,68,0.1)',
                  color: '#ef4444',
                  fontWeight: 600,
                  fontSize: '13px',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '6px',
                }}
              >
                <HiOutlineX size={16} />
                Decline
              </motion.button>
            </div>
          ) : (
            <div style={{ display: 'grid', gap: '10px' }}>
              <input
                style={inputStyle}
                placeholder="Enter verification code from email"
                value={acceptCode}
                onChange={(e) => setAcceptCode(e.target.value)}
              />
              <div style={{ display: 'flex', gap: '8px' }}>
                <motion.button
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={() => {
                    onAccept?.(invitation.group_id, invitation.id, acceptCode);
                    setAcceptCode('');
                    setShowCodeInput(false);
                  }}
                  style={{
                    flex: 1,
                    padding: '10px 14px',
                    borderRadius: '10px',
                    border: 'none',
                    background: '#22c55e',
                    color: '#fff',
                    fontWeight: 600,
                    fontSize: '13px',
                    cursor: 'pointer',
                  }}
                >
                  Confirm
                </motion.button>
                <motion.button
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={() => onResend?.(invitation.group_id, invitation.id)}
                  style={{
                    padding: '10px 14px',
                    borderRadius: '10px',
                    border: `1px solid ${isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.1)'}`,
                    background: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.03)',
                    color: colors.text,
                    fontWeight: 600,
                    fontSize: '13px',
                    cursor: 'pointer',
                  }}
                >
                  Resend
                </motion.button>
                <motion.button
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={() => {
                    setShowCodeInput(false);
                    setAcceptCode('');
                  }}
                  style={{
                    padding: '10px 14px',
                    borderRadius: '10px',
                    border: `1px solid ${isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.1)'}`,
                    background: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.03)',
                    color: colors.textSecondary,
                    fontWeight: 600,
                    fontSize: '13px',
                    cursor: 'pointer',
                  }}
                >
                  Cancel
                </motion.button>
              </div>
            </div>
          )}
        </div>
      )}
    </motion.div>
  );
};

export const MembersPageNew: React.FC = () => {
  const { colors, preferences } = useTheme();
  const isDark = preferences.mode === 'dark';
  const [searchParams, setSearchParams] = useSearchParams();

  const [isMobile, setIsMobile] = useState(false);
  const [activeTab, setActiveTab] = useState<TabType>('invite');
  const [historyFilter, setHistoryFilter] = useState<HistoryFilter>('all');
  const [expandedInviteId, setExpandedInviteId] = useState<string | null>(null);

  // Invite form state
  const [memberEmail, setMemberEmail] = useState('');
  const [permission, setPermission] = useState<MemberPermission>('reader');
  const [unlimited, setUnlimited] = useState(true);
  const [expiresAt, setExpiresAt] = useState('');
  const [selectedCameraIds, setSelectedCameraIds] = useState<string[]>([]);
  const [cameraSearch, setCameraSearch] = useState('');

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formError, setFormError] = useState('');
  const [formSuccess, setFormSuccess] = useState('');

  const [receivedInvites, setReceivedInvites] = useState<MemberInvitationResponse[]>([]);
  const [receivedGroupInvites, setReceivedGroupInvites] = useState<ReceivedGroupInvitation[]>([]);
  const [sentInvites, setSentInvites] = useState<MemberInvitationResponse[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [listError, setListError] = useState('');

  const [actionError, setActionError] = useState('');
  const [actionSuccess, setActionSuccess] = useState('');
  const [cameras, setCameras] = useState<CameraResponse[]>([]);
  const [camerasLoading, setCamerasLoading] = useState(true);

  const fetchCameras = useCallback(async () => {
    try {
      setCamerasLoading(true);
      const data = await camerasApi.listCameras();
      setCameras(data.length > 0 ? data : defaultCameras);
    } catch (err) {
      console.error('Failed to fetch cameras:', err);
      setCameras(defaultCameras);
    } finally {
      setCamerasLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchCameras();
  }, [fetchCameras]);

  // Handle pre-selected camera from URL
  useEffect(() => {
    const shareParam = searchParams.get('share');
    if (shareParam && cameras.length > 0) {
      const cameraExists = cameras.some(c => c.id === shareParam);
      if (cameraExists && !selectedCameraIds.includes(shareParam)) {
        setSelectedCameraIds([shareParam]);
        setSearchParams({});
      }
    }
  }, [searchParams, cameras, selectedCameraIds, setSearchParams]);

  // Filter cameras by search
  const filteredCameras = useMemo(() => {
    if (!cameraSearch.trim()) return cameras;
    const searchLower = cameraSearch.toLowerCase();
    return cameras.filter(cam => 
      cam.name.toLowerCase().includes(searchLower) ||
      cam.camera_type.toLowerCase().includes(searchLower) ||
      cam.location?.zone?.toLowerCase().includes(searchLower) ||
      cam.location?.building?.toLowerCase().includes(searchLower)
    );
  }, [cameras, cameraSearch]);

  const loadLists = async () => {
    setIsLoading(true);
    setListError('');
    try {
      const [received, sent, receivedGroup] = await Promise.all([
        membersApi.listReceivedInvitations(),
        membersApi.listSentInvitations(),
        groupsApi.listReceivedInvitations(),
      ]);
      setReceivedInvites(received);
      setSentInvites(sent);
      setReceivedGroupInvites(receivedGroup);
    } catch (err: any) {
      setListError(err?.message || 'Failed to load invitations');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadLists();
  }, []);

  useEffect(() => {
    const checkScreen = () => setIsMobile(window.innerWidth < 768);
    checkScreen();
    window.addEventListener('resize', checkScreen);
    return () => window.removeEventListener('resize', checkScreen);
  }, []);

  const toggleCamera = (cameraId: string) => {
    setSelectedCameraIds((prev) => {
      if (prev.includes(cameraId)) return prev.filter((id) => id !== cameraId);
      return [...prev, cameraId];
    });
  };

  const submitInvite = async () => {
    setFormError('');
    setFormSuccess('');
    setActionError('');
    setActionSuccess('');

    const email = memberEmail.trim().toLowerCase();
    if (!email) {
      setFormError('Please enter an email address.');
      return;
    }
    if (selectedCameraIds.length === 0) {
      setFormError('Please select at least one camera to share.');
      return;
    }

    const expiresAtIso = unlimited ? null : expiresAt ? new Date(expiresAt).toISOString() : null;

    setIsSubmitting(true);
    try {
      await membersApi.createInvitation({
        member_email: email,
        permission,
        camera_ids: selectedCameraIds,
        unlimited,
        expires_at: expiresAtIso,
      });

      setFormSuccess('Invitation sent successfully! A verification code was sent to the member.');
      setMemberEmail('');
      setSelectedCameraIds([]);
      setUnlimited(true);
      setExpiresAt('');
      setCameraSearch('');

      await loadLists();
    } catch (err: any) {
      setFormError(err?.message || 'Failed to create invitation');
    } finally {
      setIsSubmitting(false);
    }
  };

  const acceptInvite = async (invitationId: string, code: string) => {
    setActionError('');
    setActionSuccess('');

    if (!code.trim()) {
      setActionError('Please enter the verification code from your email.');
      return;
    }

    try {
      await membersApi.acceptInvitation(invitationId, { code: code.trim() });
      setActionSuccess('Invitation accepted! You now have access to the shared cameras.');
      await loadLists();
    } catch (err: any) {
      setActionError(err?.message || 'Failed to accept invitation');
    }
  };

  const declineInvite = async (invitationId: string) => {
    setActionError('');
    setActionSuccess('');

    try {
      await membersApi.declineInvitation(invitationId);
      setActionSuccess('Invitation declined.');
      await loadLists();
    } catch (err: any) {
      setActionError(err?.message || 'Failed to decline invitation');
    }
  };

  const resendCode = async (invitationId: string) => {
    setActionError('');
    setActionSuccess('');

    try {
      await membersApi.resendCode(invitationId);
      setActionSuccess('Verification code resent to your email.');
    } catch (err: any) {
      setActionError(err?.message || 'Failed to resend code');
    }
  };

  // Group invitation handlers
  const acceptGroupInvite = async (groupId: string, memberId: string, code: string) => {
    setActionError('');
    setActionSuccess('');

    if (!code.trim()) {
      setActionError('Please enter the verification code from your email.');
      return;
    }

    try {
      await groupsApi.acceptInvitation(groupId, memberId, { code: code.trim() });
      setActionSuccess('Group invitation accepted! You now have access to the shared cameras.');
      await loadLists();
    } catch (err: any) {
      setActionError(err?.message || 'Failed to accept group invitation');
    }
  };

  const declineGroupInvite = async (groupId: string, memberId: string) => {
    setActionError('');
    setActionSuccess('');

    try {
      await groupsApi.declineInvitation(groupId, memberId);
      setActionSuccess('Group invitation declined.');
      await loadLists();
    } catch (err: any) {
      setActionError(err?.message || 'Failed to decline group invitation');
    }
  };

  const resendGroupCode = async (groupId: string, memberId: string) => {
    setActionError('');
    setActionSuccess('');

    try {
      await groupsApi.resendMemberCode(groupId, memberId);
      setActionSuccess('Verification code resent to your email.');
    } catch (err: any) {
      setActionError(err?.message || 'Failed to resend code');
    }
  };

  // Computed invitation lists
  const pendingReceived = useMemo(() => receivedInvites.filter(inv => inv.status === 'pending'), [receivedInvites]);
  const pendingGroupReceived = useMemo(() => receivedGroupInvites.filter(inv => inv.status === 'pending'), [receivedGroupInvites]);
  const totalPendingCount = pendingReceived.length + pendingGroupReceived.length;

  // Search state for received tab
  const [receivedSearch, setReceivedSearch] = useState('');

  // Merge and sort all pending received invitations (both individual + group) by newest first, with search
  const sortedPendingReceived = useMemo(() => {
    type InvItem = { type: 'single'; data: MemberInvitationResponse } | { type: 'group'; data: ReceivedGroupInvitation };
    const items: InvItem[] = [
      ...pendingReceived.map(inv => ({ type: 'single' as const, data: inv })),
      ...pendingGroupReceived.map(inv => ({ type: 'group' as const, data: inv })),
    ];
    // Sort newest first
    items.sort((a, b) => new Date(b.data.created_at).getTime() - new Date(a.data.created_at).getTime());
    // Apply search filter (by sender email or date)
    if (receivedSearch.trim()) {
      const q = receivedSearch.trim().toLowerCase();
      return items.filter(item => {
        const email = item.type === 'single' ? item.data.inviter_email : item.data.inviter_email;
        const dateStr = new Date(item.data.created_at).toLocaleDateString();
        const isoDate = item.data.created_at?.slice(0, 10) || ''; // YYYY-MM-DD
        return email.toLowerCase().includes(q) || dateStr.includes(q) || isoDate.includes(q);
      });
    }
    return items;
  }, [pendingReceived, pendingGroupReceived, receivedSearch]);

  const historyInvites = useMemo(() => {
    const all = [...receivedInvites, ...sentInvites].filter(inv => inv.status !== 'pending');
    if (historyFilter === 'accepted') return all.filter(inv => inv.status === 'accepted');
    if (historyFilter === 'rejected') return all.filter(inv => inv.status === 'rejected' || inv.status === 'declined');
    return all;
  }, [receivedInvites, sentInvites, historyFilter]);

  // Tab configuration
  const tabs: { key: TabType; label: string; icon: React.ReactNode; count?: number }[] = [
    { key: 'invite', label: 'Invite', icon: <HiOutlineUserAdd size={18} /> },
    { key: 'received', label: 'Received', icon: <HiOutlineInbox size={18} />, count: totalPendingCount },
    { key: 'sent', label: 'Sent', icon: <HiOutlinePaperAirplane size={18} />, count: sentInvites.filter(i => i.status === 'pending').length },
    { key: 'history', label: 'History', icon: <HiOutlineClock size={18} /> },
    { key: 'groups', label: 'Groups', icon: <HiOutlineUserGroup size={18} /> },
  ];

  const inputStyle: React.CSSProperties = {
    width: '100%',
    padding: '14px 16px',
    borderRadius: '12px',
    border: `1px solid ${isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.1)'}`,
    background: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.03)',
    color: colors.text,
    fontSize: '14px',
    outline: 'none',
  };

  return (
    <div style={{
      padding: 'clamp(16px, 3vw, 28px)',
      maxWidth: '1200px',
      margin: '0 auto',
      paddingBottom: '120px',
      color: colors.text,
    }}>
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        style={{ marginBottom: '24px' }}
      >
        <h1 style={{ 
          fontSize: 'clamp(24px, 5vw, 32px)', 
          fontWeight: 800, 
          letterSpacing: '-0.5px',
          marginBottom: '8px',
        }}>
          Members
        </h1>
        <p style={{ 
          fontSize: '14px', 
          color: colors.textSecondary,
          lineHeight: 1.5,
        }}>
          Share camera access with team members and manage invitations.
        </p>
      </motion.div>

      {/* Tab Navigation */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        style={{
          display: 'flex',
          gap: '8px',
          marginBottom: '24px',
          overflowX: 'auto',
          paddingBottom: '4px',
        }}
      >
        {tabs.map((tab) => (
          <motion.button
            key={tab.key}
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={() => setActiveTab(tab.key)}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              padding: '12px 20px',
              borderRadius: '14px',
              border: activeTab === tab.key 
                ? `1px solid ${colors.accent}` 
                : `1px solid ${isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.08)'}`,
              background: activeTab === tab.key 
                ? `${colors.accent}20` 
                : isDark ? 'rgba(255,255,255,0.05)' : 'rgba(255,255,255,0.8)',
              color: activeTab === tab.key ? colors.accent : colors.text,
              cursor: 'pointer',
              fontWeight: 600,
              fontSize: '13px',
              whiteSpace: 'nowrap',
              position: 'relative',
            }}
          >
            {tab.icon}
            <span>{tab.label}</span>
            {tab.count !== undefined && tab.count > 0 && (
              <span style={{
                minWidth: '18px',
                height: '18px',
                borderRadius: '9px',
                background: tab.key === 'received' ? '#ef4444' : colors.accent,
                color: '#fff',
                fontSize: '10px',
                fontWeight: 700,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                padding: '0 5px',
              }}>
                {tab.count}
              </span>
            )}
          </motion.button>
        ))}
      </motion.div>

      {/* Error/Success Messages */}
      <AnimatePresence>
        {(actionError || actionSuccess) && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            style={{
              padding: '14px 18px',
              borderRadius: '12px',
              marginBottom: '16px',
              background: actionError ? 'rgba(239,68,68,0.1)' : 'rgba(34,197,94,0.1)',
              border: `1px solid ${actionError ? 'rgba(239,68,68,0.3)' : 'rgba(34,197,94,0.3)'}`,
              color: actionError ? '#ef4444' : '#22c55e',
              fontSize: '13px',
              fontWeight: 600,
            }}
          >
            {actionError || actionSuccess}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Tab Content */}
      <AnimatePresence mode="wait">
        {/* INVITE TAB */}
        {activeTab === 'invite' && (
          <motion.div
            key="invite"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
          >
            <GlassCard>
              <div style={{ display: 'grid', gap: '16px' }}>
                <div style={{ fontSize: '16px', fontWeight: 700, marginBottom: '4px' }}>
                  Invite a New Member
                </div>

                {/* Email Input */}
                <div>
                  <label style={{ fontSize: '12px', fontWeight: 600, color: colors.textSecondary, marginBottom: '6px', display: 'block' }}>
                    Member Email
                  </label>
                  <input
                    style={inputStyle}
                    placeholder="Enter email address"
                    value={memberEmail}
                    onChange={(e) => setMemberEmail(e.target.value)}
                    type="email"
                  />
                </div>

                {/* Permission & Expiry */}
                <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr', gap: '12px' }}>
                  <div>
                    <label style={{ fontSize: '12px', fontWeight: 600, color: colors.textSecondary, marginBottom: '6px', display: 'block' }}>
                      Permission Level
                    </label>
                    <select
                      style={{ ...inputStyle, cursor: 'pointer' }}
                      value={permission}
                      onChange={(e) => setPermission(e.target.value as MemberPermission)}
                    >
                      <option value="reader">Reader (View Only)</option>
                      <option value="editor">Editor (Full Access)</option>
                    </select>
                  </div>

                  <div>
                    <label style={{ fontSize: '12px', fontWeight: 600, color: colors.textSecondary, marginBottom: '6px', display: 'block' }}>
                      Access Duration
                    </label>
                    <div style={{ display: 'flex', gap: '8px' }}>
                      <motion.button
                        whileTap={{ scale: 0.98 }}
                        onClick={() => setUnlimited(true)}
                        style={{
                          flex: 1,
                          padding: '14px',
                          borderRadius: '12px',
                          border: unlimited ? `2px solid ${colors.accent}` : `1px solid ${isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.1)'}`,
                          background: unlimited ? `${colors.accent}15` : isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.03)',
                          color: unlimited ? colors.accent : colors.text,
                          cursor: 'pointer',
                          fontWeight: 600,
                          fontSize: '13px',
                        }}
                      >
                        Unlimited
                      </motion.button>
                      <motion.button
                        whileTap={{ scale: 0.98 }}
                        onClick={() => setUnlimited(false)}
                        style={{
                          flex: 1,
                          padding: '14px',
                          borderRadius: '12px',
                          border: !unlimited ? `2px solid ${colors.accent}` : `1px solid ${isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.1)'}`,
                          background: !unlimited ? `${colors.accent}15` : isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.03)',
                          color: !unlimited ? colors.accent : colors.text,
                          cursor: 'pointer',
                          fontWeight: 600,
                          fontSize: '13px',
                        }}
                      >
                        Limited
                      </motion.button>
                    </div>
                  </div>
                </div>

                {/* Expiry Date (if limited) */}
                <AnimatePresence>
                  {!unlimited && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: 'auto', opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                    >
                      <label style={{ fontSize: '12px', fontWeight: 600, color: colors.textSecondary, marginBottom: '6px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <HiOutlineCalendar size={14} />
                        Expiration Date
                      </label>
                      <input
                        style={inputStyle}
                        type="datetime-local"
                        value={expiresAt}
                        onChange={(e) => setExpiresAt(e.target.value)}
                      />
                    </motion.div>
                  )}
                </AnimatePresence>

                {/* Camera Selection */}
                <div>
                  <div style={{ 
                    display: 'flex', 
                    justifyContent: 'space-between', 
                    alignItems: 'center', 
                    marginBottom: '12px' 
                  }}>
                    <label style={{ fontSize: '14px', fontWeight: 700, color: colors.text }}>
                      Select Cameras to Share
                    </label>
                    <span style={{ 
                      fontSize: '12px', 
                      color: selectedCameraIds.length > 0 ? colors.accent : colors.textSecondary,
                      fontWeight: 600,
                    }}>
                      {selectedCameraIds.length} selected
                    </span>
                  </div>

                  {/* Camera Search */}
                  <div style={{ position: 'relative', marginBottom: '12px' }}>
                    <HiOutlineSearch 
                      size={18} 
                      style={{ 
                        position: 'absolute', 
                        left: '14px', 
                        top: '50%', 
                        transform: 'translateY(-50%)',
                        color: colors.textSecondary,
                      }} 
                    />
                    <input
                      style={{ ...inputStyle, paddingLeft: '42px' }}
                      placeholder="Search cameras by name, type, or location..."
                      value={cameraSearch}
                      onChange={(e) => setCameraSearch(e.target.value)}
                    />
                  </div>

                  {/* Camera Grid */}
                  <div style={{
                    maxHeight: '400px',
                    overflowY: 'auto',
                    padding: '4px',
                    borderRadius: '16px',
                    background: isDark ? 'rgba(255,255,255,0.02)' : 'rgba(0,0,0,0.02)',
                  }}>
                    {camerasLoading ? (
                      <div style={{ 
                        padding: '40px', 
                        textAlign: 'center', 
                        color: colors.textSecondary,
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'center',
                        gap: '12px',
                      }}>
                        <motion.div
                          animate={{ rotate: 360 }}
                          transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
                        >
                          <HiOutlineRefresh size={24} />
                        </motion.div>
                        Loading cameras...
                      </div>
                    ) : filteredCameras.length === 0 ? (
                      <div style={{ 
                        padding: '40px', 
                        textAlign: 'center', 
                        color: colors.textSecondary 
                      }}>
                        {cameraSearch ? 'No cameras match your search.' : 'No cameras available.'}
                      </div>
                    ) : (
                      <div style={{
                        display: 'grid',
                        gridTemplateColumns: isMobile ? 'repeat(2, 1fr)' : 'repeat(auto-fill, minmax(160px, 1fr))',
                        gap: '12px',
                        padding: '8px',
                      }}>
                        {filteredCameras.map((camera) => (
                          <CameraCard
                            key={camera.id}
                            camera={camera}
                            isSelected={selectedCameraIds.includes(camera.id)}
                            onToggle={() => toggleCamera(camera.id)}
                            isDark={isDark}
                            colors={colors}
                          />
                        ))}
                      </div>
                    )}
                  </div>
                </div>

                {/* Error/Success Messages */}
                <AnimatePresence>
                  {formError && (
                    <motion.div
                      initial={{ opacity: 0, y: -5 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -5 }}
                      style={{ 
                        padding: '12px 16px',
                        borderRadius: '10px',
                        background: 'rgba(239,68,68,0.1)',
                        border: '1px solid rgba(239,68,68,0.3)',
                        color: '#ef4444',
                        fontSize: '13px',
                        fontWeight: 600,
                      }}
                    >
                      {formError}
                    </motion.div>
                  )}
                  {formSuccess && (
                    <motion.div
                      initial={{ opacity: 0, y: -5 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -5 }}
                      style={{ 
                        padding: '12px 16px',
                        borderRadius: '10px',
                        background: 'rgba(34,197,94,0.1)',
                        border: '1px solid rgba(34,197,94,0.3)',
                        color: '#22c55e',
                        fontSize: '13px',
                        fontWeight: 600,
                      }}
                    >
                      {formSuccess}
                    </motion.div>
                  )}
                </AnimatePresence>

                {/* Submit Button */}
                <motion.button
                  whileHover={{ scale: 1.01 }}
                  whileTap={{ scale: 0.99 }}
                  onClick={submitInvite}
                  disabled={isSubmitting}
                  style={{
                    padding: '16px',
                    borderRadius: '14px',
                    border: 'none',
                    background: `linear-gradient(135deg, ${colors.accent}, ${colors.accent}dd)`,
                    color: '#fff',
                    fontWeight: 700,
                    fontSize: '15px',
                    cursor: isSubmitting ? 'not-allowed' : 'pointer',
                    opacity: isSubmitting ? 0.7 : 1,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '10px',
                  }}
                >
                  {isSubmitting ? (
                    <>
                      <motion.div
                        animate={{ rotate: 360 }}
                        transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
                      >
                        <HiOutlineRefresh size={18} />
                      </motion.div>
                      Sending Invitation...
                    </>
                  ) : (
                    <>
                      <HiOutlinePaperAirplane size={18} />
                      Send Invitation
                    </>
                  )}
                </motion.button>
              </div>
            </GlassCard>
          </motion.div>
        )}

        {/* RECEIVED TAB */}
        {activeTab === 'received' && (
          <motion.div
            key="received"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
          >
            <GlassCard>
              <div style={{ 
                display: 'flex', 
                alignItems: 'center', 
                justifyContent: 'space-between',
                marginBottom: '12px',
              }}>
                <div style={{ fontSize: '16px', fontWeight: 700 }}>
                  Pending Invitations
                </div>
                {totalPendingCount > 0 && (
                  <span style={{
                    padding: '6px 12px',
                    borderRadius: '999px',
                    background: 'rgba(239,68,68,0.15)',
                    border: '1px solid rgba(239,68,68,0.3)',
                    color: '#ef4444',
                    fontSize: '12px',
                    fontWeight: 700,
                  }}>
                    {totalPendingCount} pending
                  </span>
                )}
              </div>

              {/* Search bar for received invitations */}
              {totalPendingCount > 0 && (
                <div style={{ position: 'relative', marginBottom: '14px' }}>
                  <HiOutlineSearch
                    size={16}
                    color={colors.textMuted}
                    style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', zIndex: 1 }}
                  />
                  <input
                    type="text"
                    placeholder="Search by sender email or date (e.g. 2026-02-27)..."
                    value={receivedSearch}
                    onChange={e => setReceivedSearch(e.target.value)}
                    style={{
                      width: '100%',
                      padding: '10px 36px 10px 36px',
                      borderRadius: '10px',
                      border: `1px solid ${isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.08)'}`,
                      background: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.03)',
                      color: colors.text,
                      fontSize: '13px',
                      outline: 'none',
                    }}
                  />
                  {receivedSearch && (
                    <motion.button
                      whileTap={{ scale: 0.9 }}
                      onClick={() => setReceivedSearch('')}
                      style={{
                        position: 'absolute', right: '10px', top: '50%', transform: 'translateY(-50%)',
                        background: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.06)',
                        border: 'none', borderRadius: '6px', width: 20, height: 20,
                        display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer',
                      }}
                    >
                      <HiOutlineX size={12} color={colors.textMuted} />
                    </motion.button>
                  )}
                </div>
              )}

              {isLoading ? (
                <div style={{ 
                  padding: '40px', 
                  textAlign: 'center',
                  color: colors.textSecondary,
                }}>
                  <motion.div
                    animate={{ rotate: 360 }}
                    transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
                    style={{ display: 'inline-block', marginBottom: '12px' }}
                  >
                    <HiOutlineRefresh size={24} />
                  </motion.div>
                  <div>Loading invitations...</div>
                </div>
              ) : totalPendingCount === 0 ? (
                <div style={{ 
                  padding: '40px', 
                  textAlign: 'center',
                  color: colors.textSecondary,
                }}>
                  <HiOutlineInbox size={48} style={{ opacity: 0.3, marginBottom: '12px' }} />
                  <div>No pending invitations</div>
                </div>
              ) : sortedPendingReceived.length === 0 ? (
                <div style={{ 
                  padding: '30px', 
                  textAlign: 'center',
                  color: colors.textSecondary,
                }}>
                  <HiOutlineSearch size={32} style={{ opacity: 0.3, marginBottom: '8px' }} />
                  <div style={{ fontSize: '13px' }}>No invitations match "{receivedSearch}"</div>
                </div>
              ) : (
                <div style={{ display: 'grid', gap: '12px' }}>
                  {sortedPendingReceived.map((item) =>
                    item.type === 'group' ? (
                      <GroupInvitationCard
                        key={`group-${item.data.id}`}
                        invitation={item.data}
                        isDark={isDark}
                        colors={colors}
                        onAccept={acceptGroupInvite}
                        onDecline={declineGroupInvite}
                        onResend={resendGroupCode}
                      />
                    ) : (
                      <InvitationCard
                        key={item.data.id}
                        invitation={item.data}
                        type="received"
                        cameras={cameras}
                        isDark={isDark}
                        colors={colors}
                        onAccept={acceptInvite}
                        onDecline={declineInvite}
                        onResend={resendCode}
                      />
                    )
                  )}
                </div>
              )}

              <div style={{ 
                marginTop: '16px', 
                padding: '12px', 
                borderRadius: '10px',
                background: isDark ? 'rgba(255,255,255,0.03)' : 'rgba(0,0,0,0.02)',
                fontSize: '12px', 
                color: colors.textSecondary,
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
              }}>
                <HiOutlineMail size={16} />
                To accept, enter the verification code sent to your email.
              </div>
            </GlassCard>
          </motion.div>
        )}

        {/* SENT TAB */}
        {activeTab === 'sent' && (
          <motion.div
            key="sent"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
          >
            <GlassCard>
              <div style={{ 
                display: 'flex', 
                alignItems: 'center', 
                justifyContent: 'space-between',
                marginBottom: '16px',
              }}>
                <div style={{ fontSize: '16px', fontWeight: 700 }}>
                  Sent Invitations
                </div>
                <span style={{
                  fontSize: '12px',
                  color: colors.textSecondary,
                  fontWeight: 600,
                }}>
                  {sentInvites.length} total
                </span>
              </div>

              {isLoading ? (
                <div style={{ 
                  padding: '40px', 
                  textAlign: 'center',
                  color: colors.textSecondary,
                }}>
                  <motion.div
                    animate={{ rotate: 360 }}
                    transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
                    style={{ display: 'inline-block', marginBottom: '12px' }}
                  >
                    <HiOutlineRefresh size={24} />
                  </motion.div>
                  <div>Loading invitations...</div>
                </div>
              ) : sentInvites.length === 0 ? (
                <div style={{ 
                  padding: '40px', 
                  textAlign: 'center',
                  color: colors.textSecondary,
                }}>
                  <HiOutlinePaperAirplane size={48} style={{ opacity: 0.3, marginBottom: '12px' }} />
                  <div>No invitations sent yet</div>
                </div>
              ) : (
                <div style={{ display: 'grid', gap: '12px' }}>
                  {sentInvites.map((inv) => (
                    <InvitationCard
                      key={inv.id}
                      invitation={inv}
                      type="sent"
                      cameras={cameras}
                      isDark={isDark}
                      colors={colors}
                      isExpanded={expandedInviteId === inv.id}
                      onToggleExpand={() => setExpandedInviteId(expandedInviteId === inv.id ? null : inv.id)}
                    />
                  ))}
                </div>
              )}
            </GlassCard>
          </motion.div>
        )}

        {/* HISTORY TAB */}
        {activeTab === 'history' && (
          <motion.div
            key="history"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
          >
            <GlassCard>
              <div style={{ 
                display: 'flex', 
                alignItems: 'center', 
                justifyContent: 'space-between',
                marginBottom: '16px',
                flexWrap: 'wrap',
                gap: '12px',
              }}>
                <div style={{ fontSize: '16px', fontWeight: 700 }}>
                  Invitation History
                </div>
                
                {/* History Filter */}
                <div style={{ display: 'flex', gap: '8px' }}>
                  {[
                    { key: 'all' as const, label: 'All', color: colors.accent },
                    { key: 'accepted' as const, label: 'Accepted', color: '#22c55e' },
                    { key: 'rejected' as const, label: 'Rejected', color: '#ef4444' },
                  ].map((f) => (
                    <motion.button
                      key={f.key}
                      whileTap={{ scale: 0.95 }}
                      onClick={() => setHistoryFilter(f.key)}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '6px',
                        padding: '8px 14px',
                        borderRadius: '10px',
                        border: historyFilter === f.key 
                          ? `1px solid ${f.color}` 
                          : `1px solid ${isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.08)'}`,
                        background: historyFilter === f.key 
                          ? `${f.color}20` 
                          : 'transparent',
                        color: historyFilter === f.key ? f.color : colors.text,
                        cursor: 'pointer',
                        fontWeight: 600,
                        fontSize: '12px',
                      }}
                    >
                      <BsCircleFill size={6} color={f.color} />
                      {f.label}
                    </motion.button>
                  ))}
                </div>
              </div>

              {isLoading ? (
                <div style={{ 
                  padding: '40px', 
                  textAlign: 'center',
                  color: colors.textSecondary,
                }}>
                  <motion.div
                    animate={{ rotate: 360 }}
                    transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
                    style={{ display: 'inline-block', marginBottom: '12px' }}
                  >
                    <HiOutlineRefresh size={24} />
                  </motion.div>
                  <div>Loading history...</div>
                </div>
              ) : historyInvites.length === 0 ? (
                <div style={{ 
                  padding: '40px', 
                  textAlign: 'center',
                  color: colors.textSecondary,
                }}>
                  <HiOutlineClock size={48} style={{ opacity: 0.3, marginBottom: '12px' }} />
                  <div>No invitation history</div>
                </div>
              ) : (
                <div style={{ display: 'grid', gap: '12px' }}>
                  {historyInvites.map((inv) => (
                    <InvitationCard
                      key={inv.id}
                      invitation={inv}
                      type={receivedInvites.includes(inv) ? 'received' : 'sent'}
                      cameras={cameras}
                      isDark={isDark}
                      colors={colors}
                      isExpanded={expandedInviteId === inv.id}
                      onToggleExpand={() => setExpandedInviteId(expandedInviteId === inv.id ? null : inv.id)}
                    />
                  ))}
                </div>
              )}
            </GlassCard>
          </motion.div>
        )}

        {/* GROUPS TAB */}
        {activeTab === 'groups' && (
          <motion.div
            key="groups"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
          >
            <GroupsSection
              cameras={cameras}
              camerasLoading={camerasLoading}
              isDark={isDark}
              isMobile={isMobile}
              colors={colors}
            />
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

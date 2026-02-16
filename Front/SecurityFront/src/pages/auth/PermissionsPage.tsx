import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { 
  HiOutlineWifi,
  HiOutlineBell,
  HiOutlineCheck,
  HiOutlineArrowRight,
  HiOutlineShieldCheck,
  HiOutlineLocationMarker,
} from 'react-icons/hi';
import { RiShieldKeyholeLine } from 'react-icons/ri';

interface Permission {
  id: string;
  icon: React.ReactNode;
  title: string;
  description: string;
  color: string;
  required: boolean;
}

const permissions: Permission[] = [
  {
    id: 'network',
    icon: <HiOutlineWifi size={28} />,
    title: 'Network Access',
    description: 'Required to stream camera feeds and receive real-time updates from your security system.',
    color: '#00d4ff',
    required: true,
  },
  {
    id: 'notifications',
    icon: <HiOutlineBell size={28} />,
    title: 'Push Notifications',
    description: 'Get instant alerts when motion is detected, intrusions occur, or cameras go offline.',
    color: '#f59e0b',
    required: true,
  },
  {
    id: 'location',
    icon: <HiOutlineLocationMarker size={28} />,
    title: 'Location Services',
    description: 'Enable geofencing to automatically arm/disarm your security system based on your location.',
    color: '#22c55e',
    required: false,
  },
];

// Liquid Glass Card Component
const LiquidGlassCard: React.FC<{
  children: React.ReactNode;
  style?: React.CSSProperties;
  glowColor?: string;
}> = ({ children, style, glowColor }) => {
  return (
    <motion.div
      style={{
        background: 'rgba(255, 255, 255, 0.03)',
        backdropFilter: 'blur(40px) saturate(180%)',
        WebkitBackdropFilter: 'blur(40px) saturate(180%)',
        borderRadius: '24px',
        border: '1px solid rgba(255, 255, 255, 0.08)',
        boxShadow: glowColor 
          ? `0 8px 32px rgba(0,0,0,0.4), 0 0 40px ${glowColor}15, inset 0 1px 0 rgba(255,255,255,0.1)`
          : '0 8px 32px rgba(0,0,0,0.4), inset 0 1px 0 rgba(255,255,255,0.1)',
        position: 'relative',
        overflow: 'hidden',
        ...style,
      }}
    >
      <div style={{
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        height: '50%',
        background: 'linear-gradient(180deg, rgba(255,255,255,0.03) 0%, transparent 100%)',
        pointerEvents: 'none',
      }} />
      {children}
    </motion.div>
  );
};

export const PermissionsPage: React.FC = () => {
  const navigate = useNavigate();
  const [grantedPermissions, setGrantedPermissions] = useState<Set<string>>(new Set());
  const [isGranting, setIsGranting] = useState<string | null>(null);

  const handleGrantPermission = async (permissionId: string) => {
    setIsGranting(permissionId);
    
    // Simulate permission request
    await new Promise(resolve => setTimeout(resolve, 800));
    
    // In a real app, you would use the Capacitor Permissions API here
    // For example:
    // import { Permissions } from '@capacitor/core';
    // const result = await Permissions.request({ name: permissionId });
    
    setGrantedPermissions(prev => new Set(Array.from(prev).concat(permissionId)));
    setIsGranting(null);
  };

  const handleGrantAll = async () => {
    for (const permission of permissions) {
      if (!grantedPermissions.has(permission.id)) {
        await handleGrantPermission(permission.id);
      }
    }
  };

  const handleContinue = () => {
    // Store that permissions were requested
    localStorage.setItem('permissionsRequested', 'true');
    navigate('/dashboard');
  };

  const requiredGranted = permissions
    .filter(p => p.required)
    .every(p => grantedPermissions.has(p.id));

  const allGranted = permissions.every(p => grantedPermissions.has(p.id));

  return (
    <div style={{
      minHeight: '100vh',
      background: 'linear-gradient(135deg, #0a1628 0%, #0d2137 50%, #0a1628 100%)',
      position: 'relative',
      overflow: 'hidden',
      padding: '0 20px',
    }}>
      {/* Animated Background */}
      <div style={{ position: 'absolute', inset: 0, overflow: 'hidden' }}>
        <div style={{
          position: 'absolute',
          inset: 0,
          backgroundImage: `
            linear-gradient(rgba(255,255,255,0.02) 1px, transparent 1px),
            linear-gradient(90deg, rgba(255,255,255,0.02) 1px, transparent 1px)
          `,
          backgroundSize: '50px 50px',
        }} />
        
        <motion.div
          animate={{
            x: [0, 30, 0],
            y: [0, -20, 0],
          }}
          transition={{ duration: 8, repeat: Infinity, ease: 'easeInOut' }}
          style={{
            position: 'absolute',
            top: '15%',
            right: '10%',
            width: '200px',
            height: '200px',
            borderRadius: '50%',
            background: 'radial-gradient(circle, rgba(0,212,255,0.15) 0%, transparent 70%)',
            filter: 'blur(40px)',
          }}
        />
        <motion.div
          animate={{
            x: [0, -30, 0],
            y: [0, 30, 0],
          }}
          transition={{ duration: 10, repeat: Infinity, ease: 'easeInOut' }}
          style={{
            position: 'absolute',
            bottom: '20%',
            left: '5%',
            width: '250px',
            height: '250px',
            borderRadius: '50%',
            background: 'radial-gradient(circle, rgba(245,158,11,0.1) 0%, transparent 70%)',
            filter: 'blur(50px)',
          }}
        />
      </div>

      {/* Content */}
      <div style={{
        position: 'relative',
        zIndex: 1,
        maxWidth: '440px',
        margin: '0 auto',
        paddingTop: '60px',
        paddingBottom: '40px',
      }}>
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          style={{ textAlign: 'center', marginBottom: '40px' }}
        >
          {/* Shield Icon */}
          <motion.div
            animate={{ 
              y: [0, -5, 0],
              boxShadow: [
                '0 10px 40px rgba(0,212,255,0.3)',
                '0 15px 50px rgba(0,212,255,0.5)',
                '0 10px 40px rgba(0,212,255,0.3)',
              ]
            }}
            transition={{ duration: 3, repeat: Infinity }}
            style={{
              width: '80px',
              height: '80px',
              borderRadius: '24px',
              background: 'linear-gradient(135deg, #00d4ff 0%, #0099cc 100%)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              margin: '0 auto 24px',
            }}
          >
            <RiShieldKeyholeLine size={40} color="#fff" />
          </motion.div>

          <h1 style={{
            fontSize: '28px',
            fontWeight: 700,
            color: '#fff',
            marginBottom: '12px',
            letterSpacing: '-0.5px',
          }}>
            Enable Permissions
          </h1>
          <p style={{
            fontSize: '15px',
            color: 'rgba(255,255,255,0.6)',
            lineHeight: 1.6,
            maxWidth: '300px',
            margin: '0 auto',
          }}>
            VigileEye needs these permissions to protect your property effectively
          </p>
        </motion.div>

        {/* Permission Cards */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', marginBottom: '32px' }}>
          <AnimatePresence>
            {permissions.map((permission, index) => {
              const isGranted = grantedPermissions.has(permission.id);
              const isCurrentlyGranting = isGranting === permission.id;

              return (
                <motion.div
                  key={permission.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.1 }}
                >
                  <LiquidGlassCard
                    glowColor={isGranted ? permission.color : undefined}
                    style={{ padding: '20px' }}
                  >
                    <div style={{
                      display: 'flex',
                      alignItems: 'flex-start',
                      gap: '16px',
                    }}>
                      {/* Icon */}
                      <div style={{
                        width: '52px',
                        height: '52px',
                        borderRadius: '16px',
                        background: isGranted 
                          ? `linear-gradient(135deg, ${permission.color} 0%, ${permission.color}99 100%)`
                          : 'rgba(255,255,255,0.08)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        color: isGranted ? '#fff' : permission.color,
                        flexShrink: 0,
                        transition: 'all 0.3s ease',
                        boxShadow: isGranted ? `0 8px 20px ${permission.color}40` : 'none',
                      }}>
                        {isGranted ? <HiOutlineCheck size={28} /> : permission.icon}
                      </div>

                      {/* Content */}
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: '8px',
                          marginBottom: '6px',
                        }}>
                          <h3 style={{
                            fontSize: '16px',
                            fontWeight: 600,
                            color: '#fff',
                            margin: 0,
                          }}>
                            {permission.title}
                          </h3>
                          {permission.required && (
                            <span style={{
                              fontSize: '10px',
                              fontWeight: 600,
                              color: '#ef4444',
                              background: 'rgba(239,68,68,0.15)',
                              padding: '2px 8px',
                              borderRadius: '6px',
                              textTransform: 'uppercase',
                            }}>
                              Required
                            </span>
                          )}
                        </div>
                        <p style={{
                          fontSize: '13px',
                          color: 'rgba(255,255,255,0.5)',
                          margin: 0,
                          lineHeight: 1.5,
                        }}>
                          {permission.description}
                        </p>
                      </div>

                      {/* Grant Button */}
                      <motion.button
                        whileHover={{ scale: isGranted ? 1 : 1.05 }}
                        whileTap={{ scale: isGranted ? 1 : 0.95 }}
                        onClick={() => !isGranted && handleGrantPermission(permission.id)}
                        disabled={isGranted || isCurrentlyGranting}
                        style={{
                          padding: '10px 16px',
                          borderRadius: '12px',
                          background: isGranted 
                            ? 'rgba(34,197,94,0.2)' 
                            : `linear-gradient(135deg, ${permission.color} 0%, ${permission.color}cc 100%)`,
                          border: isGranted ? '1px solid rgba(34,197,94,0.3)' : 'none',
                          color: isGranted ? '#22c55e' : '#fff',
                          fontSize: '13px',
                          fontWeight: 600,
                          cursor: isGranted ? 'default' : 'pointer',
                          flexShrink: 0,
                          minWidth: '80px',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          boxShadow: isGranted ? 'none' : `0 4px 15px ${permission.color}40`,
                        }}
                      >
                        {isCurrentlyGranting ? (
                          <motion.div
                            animate={{ rotate: 360 }}
                            transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
                            style={{
                              width: '16px',
                              height: '16px',
                              border: '2px solid rgba(255,255,255,0.3)',
                              borderTopColor: '#fff',
                              borderRadius: '50%',
                            }}
                          />
                        ) : isGranted ? (
                          'Granted'
                        ) : (
                          'Allow'
                        )}
                      </motion.button>
                    </div>
                  </LiquidGlassCard>
                </motion.div>
              );
            })}
          </AnimatePresence>
        </div>

        {/* Action Buttons */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          {!allGranted && (
            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={handleGrantAll}
              disabled={isGranting !== null}
              style={{
                width: '100%',
                height: '56px',
                borderRadius: '16px',
                background: 'rgba(255,255,255,0.08)',
                backdropFilter: 'blur(20px)',
                border: '1px solid rgba(255,255,255,0.1)',
                color: '#fff',
                fontSize: '16px',
                fontWeight: 600,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '10px',
              }}
            >
              <HiOutlineShieldCheck size={20} />
              Allow All Permissions
            </motion.button>
          )}

          <motion.button
            whileHover={{ scale: 1.02, boxShadow: '0 15px 40px rgba(0,212,255,0.4)' }}
            whileTap={{ scale: 0.98 }}
            onClick={handleContinue}
            disabled={!requiredGranted}
            style={{
              width: '100%',
              height: '56px',
              borderRadius: '16px',
              background: requiredGranted
                ? 'linear-gradient(135deg, #00d4ff 0%, #0099cc 100%)'
                : 'rgba(255,255,255,0.1)',
              border: 'none',
              color: requiredGranted ? '#fff' : 'rgba(255,255,255,0.3)',
              fontSize: '16px',
              fontWeight: 700,
              cursor: requiredGranted ? 'pointer' : 'not-allowed',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '10px',
              boxShadow: requiredGranted ? '0 10px 30px rgba(0,212,255,0.3)' : 'none',
            }}
          >
            Continue to Dashboard
            <HiOutlineArrowRight size={20} />
          </motion.button>

          {!requiredGranted && (
            <p style={{
              textAlign: 'center',
              fontSize: '13px',
              color: 'rgba(255,255,255,0.4)',
              margin: '8px 0 0',
            }}>
              Please allow required permissions to continue
            </p>
          )}
        </div>
      </div>
    </div>
  );
};

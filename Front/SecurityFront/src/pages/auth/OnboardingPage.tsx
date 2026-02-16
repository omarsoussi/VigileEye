import React, { useRef, useEffect, useState, useMemo } from 'react';
import { motion, useScroll, useTransform, useSpring, useInView, MotionValue } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { DotLottieReact } from '@lottiefiles/dotlottie-react';
import { useAuth } from '../../contexts/AuthContext';

// Hook to detect mobile
const useIsMobile = () => {
  const [isMobile, setIsMobile] = useState(window.innerWidth < 768);
  
  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth < 768);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);
  
  return isMobile;
};
import { 
  HiOutlineVideoCamera,
  HiOutlineEye,
  HiOutlineShieldCheck,
  HiOutlineBell,
  HiOutlineUserGroup,
  HiOutlineClock,
  HiOutlineChartBar,
  HiOutlineCog,
  HiOutlineArrowRight,
  HiOutlineChevronDown,
} from 'react-icons/hi';
import { RiFireLine, RiMapPinLine, RiShieldKeyholeLine } from 'react-icons/ri';

interface Feature {
  icon: React.ReactNode;
  lottieUrl: string;
  title: string;
  description: string;
  color: string;
  gradient: string;
}

const features: Feature[] = [
  {
    icon: <HiOutlineVideoCamera size={32} />,
    lottieUrl: 'https://lottie.host/ab90dd76-a3a8-410d-aa34-ccefc96216bc/1oz4AESizB.lottie',
    title: 'Live Video Monitoring',
    description: 'Watch all your cameras in real-time with crystal clear HD streaming from anywhere in the world.',
    color: '#00d4ff',
    gradient: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
  },
  {
    icon: <HiOutlineEye size={32} />,
    lottieUrl: 'https://lottie.host/e69596e5-3a50-4775-9aae-720855722c86/z5Wh5LsOc8.lottie',
    title: 'Real-time Object Detection',
    description: 'AI-powered detection identifies people, vehicles, animals, and objects instantly.',
    color: '#8b5cf6',
    gradient: 'linear-gradient(135deg, #f093fb 0%, #f5576c 100%)',
  },
  {
    icon: <RiMapPinLine size={32} />,
    lottieUrl: 'https://lottie.host/c48e506b-25f5-471b-85b0-e805b51e565e/CiMZ5zDov8.lottie',
    title: 'Restricted Zone (ROI)',
    description: 'Define custom regions of interest and receive alerts when activity is detected.',
    color: '#22c55e',
    gradient: 'linear-gradient(135deg, #4facfe 0%, #00f2fe 100%)',
  },
  {
    icon: <HiOutlineShieldCheck size={32} />,
    lottieUrl: 'https://lottie.host/9da57ea0-581d-4112-a5bd-10a14a9147be/aGNBxlBSgf.lottie',
    title: 'Intrusion Detection',
    description: 'Advanced AI detects intrusions protecting your property 24/7 with smart alerts.',
    color: '#ef4444',
    gradient: 'linear-gradient(135deg, #fa709a 0%, #fee140 100%)',
  },
  {
    icon: <HiOutlineBell size={32} />,
    lottieUrl: 'https://lottie.host/912f42c4-aece-4d87-a33e-d2e9e069c0b9/CgaytbMVfA.lottie',
    title: 'Instant Alerts',
    description: 'Get immediate push notifications when security events occur in real-time.',
    color: '#f59e0b',
    gradient: 'linear-gradient(135deg, #a8edea 0%, #fed6e3 100%)',
  },
  {
    icon: <HiOutlineUserGroup size={32} />,
    lottieUrl: 'https://lottie.host/a652e977-9699-4b4d-8624-fdaa3aaf1917/FgdDewxwnx.lottie',
    title: 'People Counting',
    description: 'Track entry and exit counts with precision. Perfect for retail and offices.',
    color: '#06b6d4',
    gradient: 'linear-gradient(135deg, #d299c2 0%, #fef9d7 100%)',
  },
  {
    icon: <HiOutlineClock size={32} />,
    lottieUrl: 'https://lottie.host/6214bde0-7b64-4fdc-a617-51fa06ee85d9/xoSwOADtFp.lottie',
    title: 'Event History',
    description: 'Access complete event logs with snapshots and video clips.',
    color: '#ec4899',
    gradient: 'linear-gradient(135deg, #89f7fe 0%, #66a6ff 100%)',
  },
  {
    icon: <HiOutlineChartBar size={32} />,
    lottieUrl: 'https://lottie.host/c6892270-2b3f-4831-a7bf-6dab7de7432e/pth817z9X7.lottie',
    title: 'Analytics Dashboard',
    description: 'Comprehensive statistics and insights to understand patterns.',
    color: '#10b981',
    gradient: 'linear-gradient(135deg, #fddb92 0%, #d1fdff 100%)',
  },
  {
    icon: <RiFireLine size={32} />,
    lottieUrl: 'https://lottie.host/86007ab0-3136-4b74-b204-b876393a10ce/o6bjhlR1T8.lottie',
    title: 'Activity Heatmaps',
    description: 'Visualize movement patterns with heatmaps to optimize coverage.',
    color: '#f97316',
    gradient: 'linear-gradient(135deg, #c471f5 0%, #fa71cd 100%)',
  },
  {
    icon: <HiOutlineCog size={32} />,
    lottieUrl: 'https://lottie.host/369e083a-f7b7-4877-a22a-216e428eed31/F3vjPU49Km.lottie',
    title: 'AI Configuration',
    description: 'Fine-tune AI models to match your specific security requirements.',
    color: '#6366f1',
    gradient: 'linear-gradient(135deg, #48c6ef 0%, #6f86d6 100%)',
  },
];

// Organic Blob Shape Component
const BlobShape: React.FC<{
  color: string;
  size: number;
  top?: string;
  left?: string;
  right?: string;
  bottom?: string;
  delay?: number;
  scrollY: MotionValue<number>;
  parallaxFactor?: number;
}> = ({ color, size, top, left, right, bottom, delay = 0, scrollY, parallaxFactor = 0.5 }) => {
  const y = useTransform(scrollY, [0, 3000], [0, 1000 * parallaxFactor]);
  const smoothY = useSpring(y, { stiffness: 50, damping: 20 });
  
  return (
    <motion.div
      initial={{ scale: 0, opacity: 0 }}
      animate={{ scale: 1, opacity: 1 }}
      transition={{ duration: 1.5, delay, ease: "easeOut" }}
      style={{
        position: 'absolute',
        top,
        left,
        right,
        bottom,
        width: size,
        height: size,
        y: smoothY,
      }}
    >
      <motion.div
        animate={{
          borderRadius: [
            "60% 40% 30% 70% / 60% 30% 70% 40%",
            "30% 60% 70% 40% / 50% 60% 30% 60%",
            "60% 40% 30% 70% / 60% 30% 70% 40%",
          ],
          rotate: [0, 180, 360],
        }}
        transition={{
          duration: 20,
          repeat: Infinity,
          ease: "linear",
        }}
        style={{
          width: '100%',
          height: '100%',
          background: `linear-gradient(135deg, ${color}40 0%, ${color}20 50%, ${color}10 100%)`,
          filter: 'blur(60px)',
        }}
      />
    </motion.div>
  );
};

// 3D Feature Card Component
const FeatureCard3D: React.FC<{
  feature: Feature;
  index: number;
  isReversed: boolean;
}> = ({ feature, index, isReversed }) => {
  const cardRef = useRef<HTMLDivElement>(null);
  const isInView = useInView(cardRef, { once: false, margin: "-50px" });
  const isMobile = useIsMobile();
  const [mousePosition, setMousePosition] = useState({ x: 0, y: 0 });
  
  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!cardRef.current || isMobile) return;
    const rect = cardRef.current.getBoundingClientRect();
    const x = (e.clientX - rect.left - rect.width / 2) / 25;
    const y = (e.clientY - rect.top - rect.height / 2) / 25;
    setMousePosition({ x, y });
  };
  
  const handleMouseLeave = () => {
    setMousePosition({ x: 0, y: 0 });
  };

  return (
    <motion.div
      ref={cardRef}
      initial={{ opacity: 0, y: 60 }}
      animate={isInView ? { opacity: 1, y: 0 } : { opacity: 0, y: 60 }}
      transition={{ duration: 0.6, delay: 0.1, ease: [0.25, 0.46, 0.45, 0.94] }}
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
      style={{
        display: 'flex',
        flexDirection: isMobile ? 'column' : (isReversed ? 'row-reverse' : 'row'),
        alignItems: 'center',
        gap: isMobile ? '24px' : 'clamp(40px, 8vw, 100px)',
        padding: isMobile ? '40px 20px' : 'clamp(40px, 6vw, 80px) clamp(20px, 5vw, 60px)',
        perspective: '1000px',
      }}
    >
      {/* Lottie Animation Side */}
      <motion.div
        style={{
          flex: isMobile ? 'none' : 1,
          width: isMobile ? '100%' : 'auto',
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          rotateY: isMobile ? 0 : mousePosition.x,
          rotateX: isMobile ? 0 : -mousePosition.y,
          transformStyle: 'preserve-3d',
        }}
      >
        <motion.div
          initial={{ scale: 0.9, rotateY: 0 }}
          animate={isInView ? { scale: 1, rotateY: 0 } : { scale: 0.9, rotateY: 0 }}
          transition={{ duration: 0.8, delay: 0.2, ease: "easeOut" }}
          style={{
            width: isMobile ? 'min(200px, 60vw)' : 'clamp(280px, 40vw, 450px)',
            height: isMobile ? 'min(200px, 60vw)' : 'clamp(280px, 40vw, 450px)',
            position: 'relative',
            transformStyle: 'preserve-3d',
          }}
        >
          {/* Glow Effect */}
          <div style={{
            position: 'absolute',
            inset: '-20%',
            background: `radial-gradient(circle, ${feature.color}30 0%, transparent 70%)`,
            filter: 'blur(40px)',
            zIndex: -1,
          }} />
          
          {/* Floating Ring */}
          <motion.div
            animate={{ rotate: 360 }}
            transition={{ duration: 30, repeat: Infinity, ease: "linear" }}
            style={{
              position: 'absolute',
              inset: '-10%',
              borderRadius: '50%',
              border: `2px dashed ${feature.color}30`,
            }}
          />
          
          {/* Lottie Container */}
          <motion.div
            animate={{ y: isMobile ? [0, -8, 0] : [0, -15, 0] }}
            transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
            style={{
              width: '100%',
              height: '100%',
              background: 'rgba(255,255,255,0.03)',
              backdropFilter: 'blur(20px)',
              borderRadius: isMobile ? '20px' : '30px',
              border: '1px solid rgba(255,255,255,0.1)',
              padding: isMobile ? '16px' : '30px',
              boxShadow: `
                0 15px 30px -8px rgba(0,0,0,0.25),
                0 0 40px ${feature.color}15,
                inset 0 1px 0 rgba(255,255,255,0.1)
              `,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              transformStyle: 'preserve-3d',
              transform: isMobile ? 'none' : 'translateZ(50px)',
            }}
          >
            <DotLottieReact
              src={feature.lottieUrl}
              loop
              autoplay
              style={{ width: '100%', height: '100%' }}
            />
          </motion.div>
        </motion.div>
      </motion.div>

      {/* Text Content Side */}
      <motion.div
        style={{
          flex: isMobile ? 'none' : 1,
          width: isMobile ? '100%' : 'auto',
          textAlign: isMobile ? 'center' : (isReversed ? 'right' : 'left'),
          rotateY: isMobile ? 0 : mousePosition.x * 0.5,
          rotateX: isMobile ? 0 : -mousePosition.y * 0.5,
          padding: isMobile ? '0 10px' : 0,
        }}
      >
        {/* Feature Number */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={isInView ? { opacity: 1, y: 0 } : { opacity: 0, y: 20 }}
          transition={{ duration: 0.5, delay: 0.2 }}
          style={{
            fontSize: isMobile ? '48px' : 'clamp(60px, 10vw, 120px)',
            fontWeight: 900,
            background: `linear-gradient(135deg, ${feature.color}50 0%, ${feature.color}20 100%)`,
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
            lineHeight: 1,
            marginBottom: isMobile ? '12px' : '20px',
          }}
        >
          0{index + 1}
        </motion.div>

        {/* Icon Badge */}
        <motion.div
          initial={{ opacity: 0, scale: 0 }}
          animate={isInView ? { opacity: 1, scale: 1 } : { opacity: 0, scale: 0 }}
          transition={{ duration: 0.4, delay: 0.3 }}
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
            width: isMobile ? '50px' : '60px',
            height: isMobile ? '50px' : '60px',
            borderRadius: isMobile ? '16px' : '20px',
            background: `linear-gradient(135deg, ${feature.color} 0%, ${feature.color}80 100%)`,
            color: '#fff',
            marginBottom: isMobile ? '16px' : '24px',
            boxShadow: `0 8px 24px ${feature.color}40`,
          }}
        >
          {feature.icon}
        </motion.div>

        {/* Title */}
        <motion.h2
          initial={{ opacity: 0, y: 20 }}
          animate={isInView ? { opacity: 1, y: 0 } : { opacity: 0, y: 20 }}
          transition={{ duration: 0.5, delay: 0.4 }}
          style={{
            fontSize: isMobile ? '22px' : 'clamp(28px, 4vw, 48px)',
            fontWeight: 800,
            color: '#fff',
            marginBottom: isMobile ? '12px' : '20px',
            lineHeight: 1.2,
            letterSpacing: '-0.5px',
          }}
        >
          {feature.title}
        </motion.h2>

        {/* Description */}
        <motion.p
          initial={{ opacity: 0, y: 15 }}
          animate={isInView ? { opacity: 1, y: 0 } : { opacity: 0, y: 15 }}
          transition={{ duration: 0.5, delay: 0.5 }}
          style={{
            fontSize: isMobile ? '14px' : 'clamp(16px, 2vw, 20px)',
            color: 'rgba(255,255,255,0.7)',
            lineHeight: 1.7,
            maxWidth: isMobile ? '100%' : '500px',
            margin: isMobile ? '0 auto' : (isReversed ? '0 0 0 auto' : '0 auto 0 0'),
          }}
        >
          {feature.description}
        </motion.p>

        {/* Learn More Link - Hidden on mobile */}
        {!isMobile && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={isInView ? { opacity: 1 } : { opacity: 0 }}
            transition={{ duration: 0.5, delay: 0.6 }}
            style={{
              marginTop: '30px',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '10px',
              color: feature.color,
              fontSize: '16px',
              fontWeight: 600,
              cursor: 'pointer',
            }}
          >
            <span>Learn more</span>
            <motion.div
              animate={{ x: [0, 5, 0] }}
              transition={{ duration: 1.5, repeat: Infinity }}
            >
              <HiOutlineArrowRight size={18} />
            </motion.div>
          </motion.div>
        )}
      </motion.div>
    </motion.div>
  );
};

// Hero Section Component
const HeroSection: React.FC<{ scrollY: MotionValue<number> }> = ({ scrollY }) => {
  const isMobile = useIsMobile();
  const y = useTransform(scrollY, [0, 500], [0, isMobile ? 100 : 200]);
  const opacity = useTransform(scrollY, [0, 300], [1, 0]);
  const scale = useTransform(scrollY, [0, 500], [1, 0.9]);
  
  return (
    <motion.div
      style={{
        minHeight: '100vh',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        position: 'relative',
        paddingTop: isMobile ? '100px' : '80px',
        paddingBottom: isMobile ? '60px' : '40px',
        y,
        opacity,
        scale,
      }}
    >
      {/* Animated Camera Illustration */}
      <motion.div
        initial={{ y: 30, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ duration: 0.8, delay: 0.3 }}
        style={{
          position: 'relative',
          marginBottom: isMobile ? '24px' : '40px',
        }}
      >
        <motion.div
          animate={{ 
            y: [0, -12, 0],
            rotateY: isMobile ? 0 : [0, 10, 0, -10, 0],
          }}
          transition={{ duration: 5, repeat: Infinity, ease: "easeInOut" }}
          style={{
            width: isMobile ? '180px' : 'clamp(200px, 30vw, 350px)',
            height: isMobile ? '180px' : 'clamp(200px, 30vw, 350px)',
            perspective: '1000px',
          }}
        >
          <DotLottieReact
            src="https://lottie.host/ab90dd76-a3a8-410d-aa34-ccefc96216bc/1oz4AESizB.lottie"
            loop
            autoplay
            style={{ width: '100%', height: '100%' }}
          />
        </motion.div>
        
        {/* Orbiting Elements */}
        <motion.div
          animate={{ rotate: 360 }}
          transition={{ duration: 20, repeat: Infinity, ease: "linear" }}
          style={{
            position: 'absolute',
            inset: '-30%',
          }}
        >
          <motion.div
            style={{
              position: 'absolute',
              top: '10%',
              left: '50%',
              width: '20px',
              height: '20px',
              borderRadius: '50%',
              background: 'linear-gradient(135deg, #00d4ff 0%, #00d4ff80 100%)',
              boxShadow: '0 0 20px #00d4ff',
            }}
          />
        </motion.div>
        <motion.div
          animate={{ rotate: -360 }}
          transition={{ duration: 15, repeat: Infinity, ease: "linear" }}
          style={{
            position: 'absolute',
            inset: '-20%',
          }}
        >
          <motion.div
            style={{
              position: 'absolute',
              bottom: '20%',
              right: '10%',
              width: '14px',
              height: '14px',
              borderRadius: '50%',
              background: 'linear-gradient(135deg, #8b5cf6 0%, #8b5cf680 100%)',
              boxShadow: '0 0 15px #8b5cf6',
            }}
          />
        </motion.div>
      </motion.div>

      
      {/* Scroll Indicator */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 1 }}
        style={{
          position: isMobile ? 'relative' : 'absolute',
          bottom: isMobile ? 'auto' : '40px',
          left: isMobile ? 'auto' : '50%',
          transform: isMobile ? 'none' : 'translateX(-50%)',
          marginTop: isMobile ? '30px' : 0,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: '6px',
        }}
      >
        <span style={{
          fontSize: isMobile ? '12px' : '14px',
          color: 'rgba(255,255,255,0.5)',
          fontWeight: 500,
        }}>
          Scroll to explore
        </span>
        <motion.div
          animate={{ y: [0, 6, 0] }}
          transition={{ duration: 1.5, repeat: Infinity }}
        >
          <HiOutlineChevronDown size={isMobile ? 20 : 24} color="rgba(255,255,255,0.5)" />
        </motion.div>
      </motion.div>
    </motion.div>
  );
};

// Features Grid Section
const FeaturesGrid: React.FC = () => {
  const gridRef = useRef<HTMLDivElement>(null);
  const isInView = useInView(gridRef, { once: false, margin: "-50px" });
  const isMobile = useIsMobile();

  const gridFeatures = [
    { icon: <HiOutlineShieldCheck size={isMobile ? 24 : 28} />, title: 'Intelligent Detection', color: '#8b5cf6' },
    { icon: <RiShieldKeyholeLine size={isMobile ? 24 : 28} />, title: 'Privacy Protection', color: '#ec4899' },
    { icon: <HiOutlineBell size={isMobile ? 24 : 28} />, title: 'Two-way Audio', color: '#f59e0b' },
  ];

  return (
    <motion.div
      ref={gridRef}
      initial={{ opacity: 0, y: 40 }}
      animate={isInView ? { opacity: 1, y: 0 } : { opacity: 0, y: 40 }}
      transition={{ duration: 0.6 }}
      style={{
        padding: isMobile ? '40px 16px' : 'clamp(60px, 10vw, 120px) clamp(20px, 5vw, 60px)',
        textAlign: 'center',
      }}
    >
      <h2 style={{
        fontSize: isMobile ? '22px' : 'clamp(28px, 5vw, 48px)',
        fontWeight: 800,
        color: '#fff',
        marginBottom: isMobile ? '30px' : '60px',
      }}>
        A more advanced security camera
      </h2>

      <div style={{
        display: 'flex',
        justifyContent: 'center',
        gap: isMobile ? '12px' : 'clamp(20px, 4vw, 40px)',
        flexWrap: 'wrap',
      }}>
        {gridFeatures.map((item, index) => (
          <motion.div
            key={index}
            initial={{ opacity: 0, y: 20, scale: 0.95 }}
            animate={isInView ? { opacity: 1, y: 0, scale: 1 } : { opacity: 0, y: 20, scale: 0.95 }}
            transition={{ duration: 0.5, delay: index * 0.1 }}
            whileHover={isMobile ? {} : { 
              y: -10, 
              boxShadow: `0 20px 40px ${item.color}30`,
            }}
            style={{
              background: 'rgba(255,255,255,0.03)',
              backdropFilter: 'blur(20px)',
              borderRadius: isMobile ? '16px' : '24px',
              border: '1px solid rgba(255,255,255,0.08)',
              padding: isMobile ? '20px 16px' : 'clamp(30px, 4vw, 50px)',
              width: isMobile ? 'calc(33.33% - 8px)' : 'clamp(200px, 25vw, 280px)',
              minWidth: isMobile ? '95px' : 'auto',
              cursor: 'pointer',
            }}
          >
            <motion.div
              style={{
                width: isMobile ? '50px' : '70px',
                height: isMobile ? '50px' : '70px',
                borderRadius: isMobile ? '14px' : '20px',
                background: `linear-gradient(135deg, ${item.color}30 0%, ${item.color}10 100%)`,
                border: `1px solid ${item.color}40`,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                margin: '0 auto 12px',
                color: item.color,
              }}
            >
              {item.icon}
            </motion.div>
            <h3 style={{
              fontSize: isMobile ? '12px' : '18px',
              fontWeight: 700,
              color: '#fff',
              lineHeight: 1.3,
            }}>
              {item.title}
            </h3>
          </motion.div>
        ))}
      </div>
    </motion.div>
  );
};

// CTA Section Component
const CTASection: React.FC<{ onGetStarted: () => void }> = ({ onGetStarted }) => {
  const ctaRef = useRef<HTMLDivElement>(null);
  const isInView = useInView(ctaRef, { once: false, margin: "-50px" });
  const isMobile = useIsMobile();

  return (
    <motion.div
      ref={ctaRef}
      initial={{ opacity: 0 }}
      animate={isInView ? { opacity: 1 } : { opacity: 0 }}
      style={{
        padding: isMobile ? '50px 16px' : 'clamp(80px, 15vw, 150px) clamp(20px, 5vw, 60px)',
        textAlign: 'center',
        position: 'relative',
      }}
    >
      {/* Background Glow */}
      <div style={{
        position: 'absolute',
        top: '50%',
        left: '50%',
        transform: 'translate(-50%, -50%)',
        width: isMobile ? '300px' : '600px',
        height: isMobile ? '300px' : '600px',
        background: 'radial-gradient(circle, rgba(139,92,246,0.2) 0%, transparent 70%)',
        filter: 'blur(60px)',
        pointerEvents: 'none',
      }} />

      <motion.div
        initial={{ y: 40, scale: 0.95 }}
        animate={isInView ? { y: 0, scale: 1 } : { y: 40, scale: 0.95 }}
        transition={{ duration: 0.6 }}
        style={{
          background: 'linear-gradient(135deg, rgba(139,92,246,0.1) 0%, rgba(236,72,153,0.1) 100%)',
          backdropFilter: 'blur(40px)',
          borderRadius: isMobile ? '24px' : '40px',
          border: '1px solid rgba(255,255,255,0.1)',
          padding: isMobile ? '32px 20px' : 'clamp(50px, 8vw, 80px)',
          maxWidth: '900px',
          margin: '0 auto',
          position: 'relative',
        }}
      >
        <motion.h2
          initial={{ y: 15, opacity: 0 }}
          animate={isInView ? { y: 0, opacity: 1 } : { y: 15, opacity: 0 }}
          transition={{ delay: 0.1 }}
          style={{
            fontSize: isMobile ? '24px' : 'clamp(32px, 6vw, 56px)',
            fontWeight: 900,
            color: '#fff',
            marginBottom: isMobile ? '16px' : '24px',
            letterSpacing: '-0.5px',
          }}
        >
          Ready to secure
          <br />
          your space?
        </motion.h2>

        <motion.p
          initial={{ y: 15, opacity: 0 }}
          animate={isInView ? { y: 0, opacity: 1 } : { y: 15, opacity: 0 }}
          transition={{ delay: 0.2 }}
          style={{
            fontSize: isMobile ? '14px' : 'clamp(16px, 2vw, 20px)',
            color: 'rgba(255,255,255,0.7)',
            maxWidth: isMobile ? '280px' : '500px',
            margin: isMobile ? '0 auto 24px' : '0 auto 40px',
            lineHeight: 1.6,
          }}
        >
          Join thousands of users who trust VigileEye for their security needs.
        </motion.p>

        <motion.button
          initial={{ y: 15, opacity: 0 }}
          animate={isInView ? { y: 0, opacity: 1 } : { y: 15, opacity: 0 }}
          transition={{ delay: 0.3 }}
          whileHover={isMobile ? {} : { 
            scale: 1.05, 
            boxShadow: '0 20px 50px rgba(236, 72, 153, 0.5)',
          }}
          whileTap={{ scale: 0.98 }}
          onClick={onGetStarted}
          style={{
            padding: isMobile ? '14px 36px' : '20px 60px',
            fontSize: isMobile ? '15px' : '18px',
            fontWeight: 700,
            color: '#fff',
            background: 'linear-gradient(135deg, #ec4899 0%, #f59e0b 100%)',
            border: 'none',
            borderRadius: '30px',
            cursor: 'pointer',
            boxShadow: '0 12px 30px rgba(236, 72, 153, 0.3)',
            display: 'inline-flex',
            alignItems: 'center',
            gap: '10px',
          }}
        >
          Get Started Now
          <HiOutlineArrowRight size={isMobile ? 18 : 22} />
        </motion.button>
      </motion.div>
    </motion.div>
  );
};

// Main Onboarding Page
export const OnboardingPage: React.FC = () => {
  const navigate = useNavigate();
  const { completeOnboarding } = useAuth();
  const containerRef = useRef<HTMLDivElement>(null);
  const { scrollY } = useScroll({ container: containerRef });
  const [scrollProgress, setScrollProgress] = useState(0);

  useEffect(() => {
    const unsubscribe = scrollY.on('change', (latest) => {
      if (containerRef.current) {
        const maxScroll = containerRef.current.scrollHeight - containerRef.current.clientHeight;
        setScrollProgress(latest / maxScroll);
      }
    });
    return () => unsubscribe();
  }, [scrollY]);

  const handleGetStarted = () => {
    completeOnboarding();
    navigate('/login');
  };

  return (
    <div
      ref={containerRef}
      style={{
        height: '100vh',
        overflowY: 'auto',
        overflowX: 'hidden',
        background: 'linear-gradient(180deg, #0a0a1a 0%, #1a0a2e 50%, #0a1a2e 100%)',
        position: 'relative',
      }}
    >
      {/* Progress Bar */}
      <motion.div
        style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          height: '3px',
          background: 'linear-gradient(90deg, #8b5cf6 0%, #ec4899 50%, #f59e0b 100%)',
          transformOrigin: 'left',
          scaleX: scrollProgress,
          zIndex: 1000,
        }}
      />

      {/* Fixed Header */}
      <motion.header
        initial={{ y: -100 }}
        animate={{ y: 0 }}
        style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          padding: 'calc(env(safe-area-inset-top, 20px) + 10px) 16px 12px',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          zIndex: 100,
          background: 'rgba(10, 10, 26, 0.9)',
          backdropFilter: 'blur(20px)',
          WebkitBackdropFilter: 'blur(20px)',
          borderBottom: '1px solid rgba(255,255,255,0.05)',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <div style={{
            width: '36px',
            height: '36px',
            borderRadius: '10px',
            background: 'linear-gradient(135deg, #8b5cf6 0%, #ec4899 100%)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            boxShadow: '0 4px 16px rgba(139, 92, 246, 0.4)',
            flexShrink: 0,
          }}>
            <RiShieldKeyholeLine size={20} color="#fff" />
          </div>
          <span style={{
            fontSize: '18px',
            fontWeight: 800,
            color: '#fff',
            letterSpacing: '-0.5px',
          }}>
            VigileEye
          </span>
        </div>

        <motion.button
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          onClick={handleGetStarted}
          style={{
            padding: '10px 20px',
            fontSize: '13px',
            fontWeight: 600,
            color: '#fff',
            background: 'rgba(255,255,255,0.1)',
            backdropFilter: 'blur(10px)',
            WebkitBackdropFilter: 'blur(10px)',
            border: '1px solid rgba(255,255,255,0.15)',
            borderRadius: '16px',
            cursor: 'pointer',
            flexShrink: 0,
          }}
        >
          Skip
        </motion.button>
      </motion.header>

      {/* Background Blobs - Smaller on mobile */}
      <div style={{ position: 'fixed', inset: 0, pointerEvents: 'none', zIndex: 0, overflow: 'hidden' }}>
        <BlobShape color="#8b5cf6" size={window.innerWidth < 768 ? 200 : 500} top="5%" right="-10%" scrollY={scrollY} parallaxFactor={0.3} delay={0} />
        <BlobShape color="#ec4899" size={window.innerWidth < 768 ? 180 : 400} top="30%" left="-15%" scrollY={scrollY} parallaxFactor={0.5} delay={0.2} />
        <BlobShape color="#f59e0b" size={window.innerWidth < 768 ? 150 : 350} bottom="20%" right="5%" scrollY={scrollY} parallaxFactor={0.4} delay={0.4} />
        <BlobShape color="#22c55e" size={window.innerWidth < 768 ? 140 : 300} bottom="40%" left="10%" scrollY={scrollY} parallaxFactor={0.6} delay={0.6} />
      </div>

      {/* Main Content */}
      <div style={{ position: 'relative', zIndex: 1 }}>
        {/* Hero Section */}
        <HeroSection scrollY={scrollY} />

        {/* Features Grid */}
        <FeaturesGrid />

        {/* Feature Sections */}
        {features.map((feature, index) => (
          <FeatureCard3D
            key={index}
            feature={feature}
            index={index}
            isReversed={index % 2 === 1}
          />
        ))}

        {/* CTA Section */}
        <CTASection onGetStarted={handleGetStarted} />

        {/* Footer */}
        <footer style={{
          padding: '30px 20px calc(env(safe-area-inset-bottom, 20px) + 20px)',
          textAlign: 'center',
          borderTop: '1px solid rgba(255,255,255,0.05)',
        }}>
          <p style={{
            fontSize: '12px',
            color: 'rgba(255,255,255,0.4)',
          }}>
            © 2024 VigileEye. All rights reserved.
          </p>
        </footer>
      </div>
    </div>
  );
};

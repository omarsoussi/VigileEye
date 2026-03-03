import React, { useRef, useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ZoneResponse } from '../services/api';
import {
  HiOutlineX,
  HiOutlineCheck,
  HiOutlineTrash,
  HiOutlineRefresh,
} from 'react-icons/hi';

interface ZoneDrawingCanvasProps {
  /** The live frame URL to draw on top of */
  frameUrl: string | null;
  /** Existing zones to display (read-only overlays) */
  existingZones?: ZoneResponse[];
  /** Called when a new polygon is completed */
  onPolygonComplete: (points: { x: number; y: number }[]) => void;
  /** Called to cancel drawing */
  onCancel: () => void;
  /** Whether currently in drawing mode */
  isDrawing: boolean;
}

const ZONE_TYPE_COLORS: Record<string, string> = {
  intrusion: '#ef4444',
  motion: '#3b82f6',
  loitering: '#f59e0b',
  line_cross: '#8b5cf6',
  crowd: '#ec4899',
  restricted: '#dc2626',
  counting: '#06b6d4',
};

export const ZoneDrawingCanvas: React.FC<ZoneDrawingCanvasProps> = ({
  frameUrl,
  existingZones = [],
  onPolygonComplete,
  onCancel,
  isDrawing,
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [points, setPoints] = useState<{ x: number; y: number }[]>([]);
  const [mousePos, setMousePos] = useState<{ x: number; y: number } | null>(null);

  // ── Snapshot: freeze frame when drawing starts to prevent blob-URL flicker ──
  const [capturedFrame, setCapturedFrame] = useState<string | null>(null);
  const captureAttemptedRef = useRef(false);

  // Track container dimensions
  const [containerSize, setContainerSize] = useState({ width: 0, height: 0 });

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;
    const observer = new ResizeObserver((entries) => {
      for (const entry of entries) {
        setContainerSize({ width: entry.contentRect.width, height: entry.contentRect.height });
      }
    });
    observer.observe(container);
    return () => observer.disconnect();
  }, []);

  // ── Capture a stable data-URL snapshot when entering drawing mode ──
  useEffect(() => {
    if (!isDrawing) return;
    if (capturedFrame) return;
    if (!frameUrl) return;
    if (captureAttemptedRef.current) return;
    captureAttemptedRef.current = true;

    // If frameUrl is already a data URL, use it directly
    if (frameUrl.startsWith('data:')) {
      setCapturedFrame(frameUrl);
      return;
    }

    const img = new Image();
    let cancelled = false;
    // Timeout: if the blob URL is revoked before image loads, retry next frame
    const timeout = setTimeout(() => {
      if (!cancelled && !capturedFrame) {
        captureAttemptedRef.current = false; // allow retry with next frameUrl
      }
    }, 150);

    img.onload = () => {
      clearTimeout(timeout);
      if (cancelled) return;
      try {
        const cvs = document.createElement('canvas');
        cvs.width = img.naturalWidth;
        cvs.height = img.naturalHeight;
        const ctx = cvs.getContext('2d');
        if (ctx) {
          ctx.drawImage(img, 0, 0);
          setCapturedFrame(cvs.toDataURL('image/jpeg', 0.92));
        }
      } catch {
        // Canvas tainted or other error — keep using live frameUrl
        setCapturedFrame(frameUrl);
      }
    };
    img.onerror = () => {
      clearTimeout(timeout);
      if (!cancelled) captureAttemptedRef.current = false; // retry with next frame
    };
    img.src = frameUrl;
    return () => { cancelled = true; clearTimeout(timeout); };
  }, [isDrawing, frameUrl, capturedFrame]);

  // ── Reset when re-entering drawing mode (Redraw) OR when exiting drawing mode ──
  const prevDrawing = useRef(isDrawing);
  useEffect(() => {
    if (isDrawing && !prevDrawing.current) {
      // Entering drawing mode - reset everything
      setPoints([]);
      setMousePos(null);
      setCapturedFrame(null);
      captureAttemptedRef.current = false;
    } else if (!isDrawing && prevDrawing.current) {
      // Exiting drawing mode - clear the drawing UI but keep points for display
      setMousePos(null);
    }
    prevDrawing.current = isDrawing;
  }, [isDrawing]);

  // Draw existing zones and current polygon on the canvas
  const draw = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const w = canvas.width;
    const h = canvas.height;
    ctx.clearRect(0, 0, w, h);

    // Draw existing zones
    existingZones.forEach((zone) => {
      if (zone.points.length < 3) return;
      const zoneColor = zone.color || ZONE_TYPE_COLORS[zone.zone_type] || '#fff';
      ctx.beginPath();
      zone.points.forEach((p, i) => {
        const px = p.x * w;
        const py = p.y * h;
        if (i === 0) ctx.moveTo(px, py);
        else ctx.lineTo(px, py);
      });
      ctx.closePath();
      ctx.fillStyle = zone.is_active ? `${zoneColor}30` : `${zoneColor}10`;
      ctx.fill();
      ctx.strokeStyle = zone.is_active ? zoneColor : `${zoneColor}60`;
      ctx.lineWidth = 2;
      ctx.setLineDash(zone.is_active ? [] : [6, 4]);
      ctx.stroke();
      ctx.setLineDash([]);

      // Label
      const cx = zone.points.reduce((s, p) => s + p.x, 0) / zone.points.length * w;
      const cy = zone.points.reduce((s, p) => s + p.y, 0) / zone.points.length * h;
      ctx.font = 'bold 12px Inter, sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      const label = zone.name;
      const metrics = ctx.measureText(label);
      const padding = 6;
      ctx.fillStyle = 'rgba(0,0,0,0.7)';
      ctx.beginPath();
      ctx.roundRect(cx - metrics.width / 2 - padding, cy - 8 - padding, metrics.width + padding * 2, 16 + padding * 2, 6);
      ctx.fill();
      ctx.fillStyle = '#fff';
      ctx.fillText(label, cx, cy);
    });

    // Draw current polygon being drawn
    if (points.length > 0 && isDrawing) {
      ctx.beginPath();
      points.forEach((p, i) => {
        const px = p.x * w;
        const py = p.y * h;
        if (i === 0) ctx.moveTo(px, py);
        else ctx.lineTo(px, py);
      });

      // Line to mouse position
      if (mousePos) {
        ctx.lineTo(mousePos.x * w, mousePos.y * h);
      }

      // Close path visual if near first point (generous 35px threshold)
      if (points.length >= 3 && mousePos) {
        const first = points[0];
        const dist = Math.hypot((mousePos.x - first.x) * w, (mousePos.y - first.y) * h);
        if (dist < 35) {
          ctx.closePath();
          ctx.fillStyle = 'rgba(239, 68, 68, 0.25)';
          ctx.fill();
        }
      }

      ctx.strokeStyle = '#ef4444';
      ctx.lineWidth = 2;
      ctx.stroke();

      // Draw points — first point is larger to make it easy to close
      points.forEach((p, i) => {
        const px = p.x * w;
        const py = p.y * h;
        ctx.beginPath();
        ctx.arc(px, py, i === 0 && points.length >= 3 ? 12 : 6, 0, Math.PI * 2);
        ctx.fillStyle = i === 0 ? '#22c55e' : '#ef4444';
        ctx.fill();
        ctx.strokeStyle = '#fff';
        ctx.lineWidth = 2;
        ctx.stroke();
      });
    }

    // ── Draw COMPLETED polygon (after "Done" — green filled) ──
    if (!isDrawing && points.length >= 3) {
      ctx.beginPath();
      points.forEach((p, i) => {
        const px = p.x * w;
        const py = p.y * h;
        if (i === 0) ctx.moveTo(px, py); else ctx.lineTo(px, py);
      });
      ctx.closePath();
      ctx.fillStyle = 'rgba(34, 197, 94, 0.25)';
      ctx.fill();
      ctx.strokeStyle = '#22c55e';
      ctx.lineWidth = 3;
      ctx.stroke();

      points.forEach((p) => {
        const px = p.x * w;
        const py = p.y * h;
        ctx.beginPath();
        ctx.arc(px, py, 5, 0, Math.PI * 2);
        ctx.fillStyle = '#22c55e';
        ctx.fill();
        ctx.strokeStyle = '#fff';
        ctx.lineWidth = 2;
        ctx.stroke();
      });

      // "Zone captured" label at centroid
      const cxC = points.reduce((s, p) => s + p.x, 0) / points.length * w;
      const cyC = points.reduce((s, p) => s + p.y, 0) / points.length * h;
      ctx.font = 'bold 13px Inter, sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      const capturedLabel = '\u2713 ' + points.length + ' points';
      const mC = ctx.measureText(capturedLabel);
      const pC = 8;
      ctx.fillStyle = 'rgba(34,197,94,0.85)';
      ctx.beginPath();
      ctx.roundRect(cxC - mC.width / 2 - pC, cyC - 9 - pC, mC.width + pC * 2, 18 + pC * 2, 8);
      ctx.fill();
      ctx.fillStyle = '#fff';
      ctx.fillText(capturedLabel, cxC, cyC);
    }
  }, [existingZones, points, mousePos, isDrawing]);

  useEffect(() => {
    draw();
  }, [draw, containerSize]);

  const getNormalisedCoords = (e: React.MouseEvent): { x: number; y: number } | null => {
    const el = containerRef.current;
    if (!el) return null;
    const rect = el.getBoundingClientRect();
    return {
      x: Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width)),
      y: Math.max(0, Math.min(1, (e.clientY - rect.top) / rect.height)),
    };
  };

  const handleClick = (e: React.MouseEvent) => {
    if (!isDrawing) return;
    const coords = getNormalisedCoords(e);
    if (!coords) return;

    // Close polygon when clicking near first point
    if (points.length >= 3) {
      const first = points[0];
      const el = containerRef.current;
      const w = el?.clientWidth || 640;
      const h = el?.clientHeight || 360;
      const dist = Math.hypot(
        (coords.x - first.x) * w,
        (coords.y - first.y) * h
      );
      if (dist < 35) {
        // Complete — DON'T clear points so the polygon stays visible
        onPolygonComplete([...points]);
        setMousePos(null);
        return;
      }
    }

    setPoints((prev) => [...prev, coords]);
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDrawing) return;
    const coords = getNormalisedCoords(e);
    if (coords) setMousePos(coords);
  };

  const handleUndo = () => setPoints((prev) => prev.slice(0, -1));

  const handleClear = () => {
    setPoints([]);
    setMousePos(null);
  };

  // Use captured snapshot during drawing, live frame otherwise
  const displayFrame = capturedFrame || frameUrl;

  return (
    <div
      ref={containerRef}
      onClick={isDrawing ? handleClick : undefined}
      onMouseMove={isDrawing ? handleMouseMove : undefined}
      style={{
        position: 'relative',
        width: '100%',
        height: '100%',
        overflow: 'hidden',
        borderRadius: '16px',
        background: '#000',
        cursor: isDrawing ? 'crosshair' : 'default',
      }}
    >
      {/* Background frame — snapshot during drawing to prevent flicker */}
      {displayFrame ? (
        <img
          src={displayFrame}
          alt="Camera feed"
          style={{
            width: '100%',
            height: '100%',
            objectFit: 'contain',
            display: 'block',
          }}
          draggable={false}
        />
      ) : (
        <div
          style={{
            width: '100%',
            height: '100%',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: '#666',
            fontSize: '14px',
          }}
        >
          Waiting for camera stream...
        </div>
      )}

      {/* Canvas overlay — display only, no pointer events */}
      <canvas
        ref={canvasRef}
        width={containerSize.width || 640}
        height={containerSize.height || 360}
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          width: '100%',
          height: '100%',
          pointerEvents: 'none',
          zIndex: 2,
        }}
      />

      {/* Drawing toolbar */}
      <AnimatePresence>
        {isDrawing && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 20 }}
            style={{
              position: 'absolute',
              bottom: '16px',
              left: '50%',
              transform: 'translateX(-50%)',
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              padding: '10px 18px',
              borderRadius: '16px',
              background: 'rgba(0,0,0,0.85)',
              backdropFilter: 'blur(20px)',
              border: '1px solid rgba(255,255,255,0.2)',
              zIndex: 100,
              pointerEvents: 'auto',
            }}
            onClick={(e: React.MouseEvent) => e.stopPropagation()}
            onMouseMove={(e: React.MouseEvent) => e.stopPropagation()}
          >
            <span style={{ color: '#fff', fontSize: '13px', fontWeight: 600, marginRight: '4px' }}>
              {points.length === 0
                ? 'Click to place first point'
                : points.length < 3
                ? `${points.length} point${points.length > 1 ? 's' : ''} — need ${3 - points.length} more`
                : `${points.length} points ✓`}
            </span>

            {points.length > 0 && (
              <motion.button
                whileHover={{ scale: 1.05, background: 'rgba(255,255,255,0.25)' }}
                whileTap={{ scale: 0.9 }}
                onClick={(e: React.MouseEvent) => { e.stopPropagation(); handleUndo(); }}
                title="Undo last point"
                style={{
                  height: '36px',
                  padding: '0 12px',
                  borderRadius: '10px',
                  background: 'rgba(255,255,255,0.15)',
                  border: 'none',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  cursor: 'pointer',
                  color: '#fff',
                  fontSize: '12px',
                  fontWeight: 600,
                }}
              >
                <HiOutlineRefresh size={16} />
                Undo
              </motion.button>
            )}

            {points.length > 0 && (
              <motion.button
                whileHover={{ scale: 1.05, background: 'rgba(239,68,68,0.6)' }}
                whileTap={{ scale: 0.9 }}
                onClick={(e: React.MouseEvent) => { e.stopPropagation(); handleClear(); }}
                title="Clear all points"
                style={{
                  height: '36px',
                  padding: '0 12px',
                  borderRadius: '10px',
                  background: 'rgba(239, 68, 68, 0.4)',
                  border: 'none',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  cursor: 'pointer',
                  color: '#fff',
                  fontSize: '12px',
                  fontWeight: 600,
                }}
              >
                <HiOutlineTrash size={16} />
                Clear
              </motion.button>
            )}

            {/* ── Prominent DONE button when ≥3 points ── */}
            {points.length >= 3 && (
              <motion.button
                whileHover={{ scale: 1.05, boxShadow: '0 0 20px rgba(34,197,94,0.5)' }}
                whileTap={{ scale: 0.93 }}
                animate={{ boxShadow: ['0 0 8px rgba(34,197,94,0.3)', '0 0 18px rgba(34,197,94,0.6)', '0 0 8px rgba(34,197,94,0.3)'] }}
                transition={{ boxShadow: { repeat: Infinity, duration: 1.8 } }}
                onClick={(e: React.MouseEvent) => {
                  e.stopPropagation();
                  console.log('Done button clicked - completing polygon with', points.length, 'points');
                  onPolygonComplete([...points]);
                  // Don't clear points here - parent will control drawing mode
                  setMousePos(null);
                }}
                style={{
                  height: '40px',
                  padding: '0 22px',
                  borderRadius: '12px',
                  background: 'linear-gradient(135deg, #22c55e, #16a34a)',
                  border: '2px solid rgba(255,255,255,0.25)',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  cursor: 'pointer',
                  color: '#fff',
                  fontSize: '14px',
                  fontWeight: 700,
                  letterSpacing: '0.3px',
                }}
              >
                <HiOutlineCheck size={18} />
                Done
              </motion.button>
            )}

            <motion.button
              whileHover={{ scale: 1.05, background: 'rgba(255,255,255,0.25)' }}
              whileTap={{ scale: 0.9 }}
              onClick={(e: React.MouseEvent) => {
                e.stopPropagation();
                setPoints([]);
                setMousePos(null);
                onCancel();
              }}
              title="Cancel"
              style={{
                height: '36px',
                padding: '0 12px',
                borderRadius: '10px',
                background: 'rgba(255,255,255,0.15)',
                border: 'none',
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                cursor: 'pointer',
                color: '#fff',
                fontSize: '12px',
                fontWeight: 600,
              }}
            >
              <HiOutlineX size={16} />
              Cancel
            </motion.button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Instruction overlay when starting */}
      <AnimatePresence>
        {isDrawing && points.length === 0 && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            style={{
              position: 'absolute',
              top: '16px',
              left: '50%',
              transform: 'translateX(-50%)',
              padding: '10px 20px',
              borderRadius: '12px',
              background: 'rgba(59, 130, 246, 0.85)',
              backdropFilter: 'blur(10px)',
              zIndex: 10,
              color: '#fff',
              fontSize: '13px',
              fontWeight: 600,
              textAlign: 'center',
              pointerEvents: 'none',
            }}
          >
            Click on the video to define your detection zone polygon.
            <br />
            <span style={{ fontSize: '11px', opacity: 0.8 }}>
              Place at least 3 points, then press the <strong>Done</strong> button or click the green start point to close.
            </span>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── "Zone Captured" badge after drawing is done ── */}
      <AnimatePresence>
        {!isDrawing && points.length >= 3 && (
          <motion.div
            initial={{ opacity: 0, scale: 0.8, y: -10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.8 }}
            style={{
              position: 'absolute',
              top: '16px',
              left: '50%',
              transform: 'translateX(-50%)',
              padding: '10px 24px',
              borderRadius: '14px',
              background: 'linear-gradient(135deg, rgba(34,197,94,0.9), rgba(22,163,74,0.9))',
              backdropFilter: 'blur(12px)',
              border: '1px solid rgba(255,255,255,0.3)',
              zIndex: 10,
              color: '#fff',
              fontSize: '14px',
              fontWeight: 700,
              textAlign: 'center',
              pointerEvents: 'none',
              boxShadow: '0 4px 20px rgba(34,197,94,0.4)',
            }}
          >
            &#10003; Zone Captured — {points.length} points
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Save Button in the middle (passed from parent) ── */}
      {!isDrawing && points.length >= 3 && (onPolygonComplete as any).saveButton && (
        <AnimatePresence>
          <motion.div
            initial={{ opacity: 0, scale: 0.7, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.7, y: 20 }}
            transition={{ delay: 0.2, type: 'spring', stiffness: 200, damping: 15 }}
            style={{
              position: 'absolute',
              top: '50%',
              left: '50%',
              transform: 'translate(-50%, -50%)',
              zIndex: 15,
            }}
          >
            {(onPolygonComplete as any).saveButton}
          </motion.div>
        </AnimatePresence>
      )}
    </div>
  );
};

export default ZoneDrawingCanvas;

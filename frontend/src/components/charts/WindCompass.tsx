import React, { useEffect, useRef } from 'react';

interface WindCompassProps {
  direction: number; // degrees 0-360
  speed: number;
  gust?: number;
  size?: number;
  color?: string;
}

export const WindCompass: React.FC<WindCompassProps> = ({
  direction,
  speed,
  gust,
  size = 200,
  color = '#818cf8',
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animRef = useRef<number>(0);
  const currentDirRef = useRef<number>(direction);

  const getCardinal = (deg: number) => {
    const dirs = ['N', 'NNE', 'NE', 'ENE', 'E', 'ESE', 'SE', 'SSE', 'S', 'SSW', 'SW', 'WSW', 'W', 'WNW', 'NW', 'NNW'];
    return dirs[Math.round(((deg % 360) + 360) % 360 / 22.5) % 16];
  };

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const dpr = window.devicePixelRatio || 1;
    canvas.width = size * dpr;
    canvas.height = size * dpr;
    canvas.style.width = `${size}px`;
    canvas.style.height = `${size}px`;
    ctx.scale(dpr, dpr);

    const cx = size / 2;
    const cy = size / 2;
    // Radius with safe padding so no label ever clips
    const r = size * 0.36;
    const target = direction;

    const draw = () => {
      ctx.clearRect(0, 0, size, size);

      // ── Background Ambient Glow ──
      const bgGrad = ctx.createRadialGradient(cx, cy, 0, cx, cy, size * 0.48);
      bgGrad.addColorStop(0, 'rgba(15, 23, 42, 0.4)');
      bgGrad.addColorStop(0.8, 'rgba(2, 6, 23, 0.6)');
      bgGrad.addColorStop(1, 'rgba(2, 6, 23, 0)');
      ctx.fillStyle = bgGrad;
      ctx.beginPath();
      ctx.arc(cx, cy, size * 0.48, 0, Math.PI * 2);
      ctx.fill();

      // ── Outer Bezel Ring ──
      ctx.beginPath();
      ctx.arc(cx, cy, r + size * 0.08, 0, Math.PI * 2);
      ctx.strokeStyle = 'rgba(255,255,255,0.06)';
      ctx.lineWidth = 1;
      ctx.stroke();

      // ── Dial Scale Ring ──
      ctx.beginPath();
      ctx.arc(cx, cy, r, 0, Math.PI * 2);
      ctx.strokeStyle = 'rgba(56, 189, 248, 0.15)';
      ctx.lineWidth = 1.5;
      ctx.stroke();

      // ── Cardinal direction labels (comfortably spaced within canvas) ──
      const cardinals = [
        { label: 'N', angle: -Math.PI / 2, color: '#ef4444', isNorth: true },
        { label: 'E', angle: 0, color: '#94a3b8', isNorth: false },
        { label: 'S', angle: Math.PI / 2, color: '#94a3b8', isNorth: false },
        { label: 'W', angle: Math.PI, color: '#94a3b8', isNorth: false },
      ];

      cardinals.forEach(({ label, angle, color: labelColor, isNorth }) => {
        const dist = r + size * 0.07;
        const lx = cx + Math.cos(angle) * dist;
        const ly = cy + Math.sin(angle) * dist;

        ctx.fillStyle = labelColor;
        ctx.font = `bold ${Math.round(size * 0.075)}px 'JetBrains Mono', monospace`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(label, lx, ly);

        // Small North triangle pip
        if (isNorth) {
          ctx.beginPath();
          ctx.moveTo(lx, ly + size * 0.05);
          ctx.lineTo(lx - size * 0.02, ly + size * 0.07);
          ctx.lineTo(lx + size * 0.02, ly + size * 0.07);
          ctx.closePath();
          ctx.fillStyle = 'rgba(239, 68, 68, 0.8)';
          ctx.fill();
        }
      });

      // ── Degree Tick Marks ──
      for (let i = 0; i < 72; i++) {
        const tickAngle = (i * 5 * Math.PI) / 180 - Math.PI / 2;
        const isMajor = i % 18 === 0; // 0, 90, 180, 270
        const isMedium = i % 6 === 0; // Every 30 deg
        const outer = r;
        const inner = outer - (isMajor ? size * 0.06 : isMedium ? size * 0.04 : size * 0.02);

        ctx.beginPath();
        ctx.moveTo(cx + Math.cos(tickAngle) * outer, cy + Math.sin(tickAngle) * outer);
        ctx.lineTo(cx + Math.cos(tickAngle) * inner, cy + Math.sin(tickAngle) * inner);
        ctx.strokeStyle = isMajor
          ? 'rgba(255,255,255,0.45)'
          : isMedium
          ? 'rgba(255,255,255,0.2)'
          : 'rgba(255,255,255,0.06)';
        ctx.lineWidth = isMajor ? 1.5 : 1;
        ctx.stroke();
      }

      // ── Smooth Animation to Target Angle ──
      let diff = target - currentDirRef.current;
      if (diff > 180) diff -= 360;
      if (diff < -180) diff += 360;
      const needsAnim = Math.abs(diff) > 0.4;
      if (needsAnim) {
        currentDirRef.current += diff * 0.08;
      } else {
        currentDirRef.current = target;
      }

      const currentDir = currentDirRef.current;
      const arrowAngle = (currentDir * Math.PI) / 180 - Math.PI / 2;

      // ── Aerodynamic Wind Vector Pointer ──
      const arrowLen = r * 0.82;
      const tailLen = r * 0.45;

      // Counter-balance tail
      ctx.beginPath();
      ctx.moveTo(cx, cy);
      ctx.lineTo(cx - Math.cos(arrowAngle) * tailLen, cy - Math.sin(arrowAngle) * tailLen);
      ctx.strokeStyle = 'rgba(100, 116, 139, 0.45)';
      ctx.lineWidth = size * 0.02;
      ctx.lineCap = 'round';
      ctx.stroke();

      // Tail circle pip
      ctx.beginPath();
      ctx.arc(cx - Math.cos(arrowAngle) * tailLen, cy - Math.sin(arrowAngle) * tailLen, size * 0.02, 0, Math.PI * 2);
      ctx.fillStyle = 'rgba(100, 116, 139, 0.8)';
      ctx.fill();

      // Vector beam glow
      ctx.save();
      ctx.shadowColor = color;
      ctx.shadowBlur = 16;
      ctx.beginPath();
      ctx.moveTo(cx, cy);
      ctx.lineTo(cx + Math.cos(arrowAngle) * arrowLen, cy + Math.sin(arrowAngle) * arrowLen);
      ctx.strokeStyle = color;
      ctx.lineWidth = size * 0.028;
      ctx.lineCap = 'round';
      ctx.stroke();

      // Direction Arrowhead
      const tipX = cx + Math.cos(arrowAngle) * arrowLen;
      const tipY = cy + Math.sin(arrowAngle) * arrowLen;
      const headSize = size * 0.07;
      ctx.beginPath();
      ctx.moveTo(tipX, tipY);
      ctx.lineTo(tipX - headSize * Math.cos(arrowAngle - 0.45), tipY - headSize * Math.sin(arrowAngle - 0.45));
      ctx.lineTo(tipX - headSize * 0.5 * Math.cos(arrowAngle), tipY - headSize * 0.5 * Math.sin(arrowAngle));
      ctx.lineTo(tipX - headSize * Math.cos(arrowAngle + 0.45), tipY - headSize * Math.sin(arrowAngle + 0.45));
      ctx.closePath();
      ctx.fillStyle = color;
      ctx.fill();
      ctx.restore();

      // ── Minimal Center Pivot Cap (keeps needle 100% visible) ──
      const hubRadius = size * 0.05;
      ctx.save();
      ctx.beginPath();
      ctx.arc(cx, cy, hubRadius, 0, Math.PI * 2);
      ctx.fillStyle = '#0f172a';
      ctx.fill();
      ctx.strokeStyle = color;
      ctx.lineWidth = 2;
      ctx.stroke();

      // Center jewel pivot point
      ctx.beginPath();
      ctx.arc(cx, cy, size * 0.02, 0, Math.PI * 2);
      ctx.fillStyle = color;
      ctx.fill();
      ctx.restore();

      if (needsAnim) {
        animRef.current = requestAnimationFrame(draw);
      }
    };

    cancelAnimationFrame(animRef.current);
    animRef.current = requestAnimationFrame(draw);
    return () => cancelAnimationFrame(animRef.current);
  }, [direction, speed, size, color]);

  return <canvas ref={canvasRef} style={{ display: 'block' }} />;
};

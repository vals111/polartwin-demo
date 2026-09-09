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
  gust = 0,
  size = 200,
  color = '#38bdf8',
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animRef = useRef<number>(0);
  const currentDirRef = useRef<number>(direction);
  const velocityRef = useRef<number>(0);

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
    // Compass dial radius safe inside canvas boundaries
    const r = size * 0.36;

    let startTime = performance.now();

    const renderFrame = (now: number) => {
      ctx.clearRect(0, 0, size, size);

      // ── Physical Inertia & Real-Time Tracking ──
      const target = direction;
      let diff = target - currentDirRef.current;
      while (diff > 180) diff -= 360;
      while (diff < -180) diff += 360;

      // Spring-damper physics for realistic magnetic needle feel
      const springK = 0.08;
      const damping = 0.78;
      velocityRef.current = velocityRef.current * damping + diff * springK;
      currentDirRef.current += velocityRef.current;

      // Subtle aerodynamic wind flutter proportional to wind speed
      const elapsed = now - startTime;
      const flutterAmp = Math.min(1.8, Math.max(0.2, (speed / 50) * 1.5));
      const microFlutter =
        Math.sin(elapsed * 0.005) * flutterAmp * 0.6 +
        Math.cos(elapsed * 0.011) * flutterAmp * 0.4;

      const displayAngleDeg = currentDirRef.current + microFlutter;
      const angleRad = (displayAngleDeg * Math.PI) / 180 - Math.PI / 2;

      // ── 1. Dial Background Glow ──
      const bgGrad = ctx.createRadialGradient(cx, cy, 0, cx, cy, size * 0.46);
      bgGrad.addColorStop(0, 'rgba(15, 23, 42, 0.7)');
      bgGrad.addColorStop(0.7, 'rgba(2, 6, 23, 0.9)');
      bgGrad.addColorStop(1, 'rgba(2, 6, 23, 0)');
      ctx.fillStyle = bgGrad;
      ctx.beginPath();
      ctx.arc(cx, cy, size * 0.46, 0, Math.PI * 2);
      ctx.fill();

      // ── 2. Outer Bezel & Metal Rim ──
      ctx.beginPath();
      ctx.arc(cx, cy, r + size * 0.075, 0, Math.PI * 2);
      ctx.strokeStyle = 'rgba(148, 163, 184, 0.15)';
      ctx.lineWidth = 1;
      ctx.stroke();

      // Dial Scale Ring
      ctx.beginPath();
      ctx.arc(cx, cy, r, 0, Math.PI * 2);
      ctx.strokeStyle = 'rgba(56, 189, 248, 0.25)';
      ctx.lineWidth = 1.5;
      ctx.stroke();

      // Inner Reticle Rings
      ctx.beginPath();
      ctx.arc(cx, cy, r * 0.68, 0, Math.PI * 2);
      ctx.strokeStyle = 'rgba(56, 189, 248, 0.06)';
      ctx.lineWidth = 1;
      ctx.stroke();

      ctx.beginPath();
      ctx.arc(cx, cy, r * 0.38, 0, Math.PI * 2);
      ctx.strokeStyle = 'rgba(56, 189, 248, 0.04)';
      ctx.lineWidth = 1;
      ctx.stroke();

      // ── 3. 8-Point Compass Rose Watermark (Subtle Nautical Background) ──
      ctx.save();
      ctx.strokeStyle = 'rgba(56, 189, 248, 0.06)';
      ctx.lineWidth = 1;
      for (let i = 0; i < 8; i++) {
        const starAngle = (i * Math.PI) / 4;
        const starLen = i % 2 === 0 ? r * 0.75 : r * 0.5;
        ctx.beginPath();
        ctx.moveTo(cx, cy);
        ctx.lineTo(cx + Math.cos(starAngle) * starLen, cy + Math.sin(starAngle) * starLen);
        ctx.stroke();
      }
      ctx.restore();

      // ── 4. Cardinal & Intercardinal Markers ──
      const cardinals = [
        { label: 'N', angle: -Math.PI / 2, color: '#ef4444', isNorth: true, size: 0.075 },
        { label: 'E', angle: 0, color: '#cbd5e1', isNorth: false, size: 0.065 },
        { label: 'S', angle: Math.PI / 2, color: '#94a3b8', isNorth: false, size: 0.065 },
        { label: 'W', angle: Math.PI, color: '#cbd5e1', isNorth: false, size: 0.065 },
      ];

      cardinals.forEach(({ label, angle, color: lblColor, isNorth, size: fSize }) => {
        const dist = r + size * 0.07;
        const lx = cx + Math.cos(angle) * dist;
        const ly = cy + Math.sin(angle) * dist;

        ctx.fillStyle = lblColor;
        ctx.font = `bold ${Math.round(size * fSize)}px 'JetBrains Mono', monospace`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(label, lx, ly);

        // Distinctive red North arrowhead marker
        if (isNorth) {
          ctx.beginPath();
          ctx.moveTo(lx, ly + size * 0.05);
          ctx.lineTo(lx - size * 0.02, ly + size * 0.075);
          ctx.lineTo(lx + size * 0.02, ly + size * 0.075);
          ctx.closePath();
          ctx.fillStyle = 'rgba(239, 68, 68, 0.9)';
          ctx.fill();
        }
      });

      // ── 5. Degree Tick Marks (Every 5°, Major every 30°) ──
      for (let i = 0; i < 72; i++) {
        const tickAngle = (i * 5 * Math.PI) / 180 - Math.PI / 2;
        const isMajor = i % 18 === 0; // 0, 90, 180, 270
        const isMedium = i % 6 === 0; // Every 30 deg
        const outer = r;
        const inner = outer - (isMajor ? size * 0.055 : isMedium ? size * 0.038 : size * 0.02);

        ctx.beginPath();
        ctx.moveTo(cx + Math.cos(tickAngle) * outer, cy + Math.sin(tickAngle) * outer);
        ctx.lineTo(cx + Math.cos(tickAngle) * inner, cy + Math.sin(tickAngle) * inner);
        ctx.strokeStyle = isMajor
          ? 'rgba(255, 255, 255, 0.5)'
          : isMedium
          ? 'rgba(56, 189, 248, 0.3)'
          : 'rgba(255, 255, 255, 0.08)';
        ctx.lineWidth = isMajor ? 1.5 : 1;
        ctx.stroke();
      }

      // ── 6. Authentic 3D Faceted Compass Needle ("Nail of the Compass") ──
      const needleLen = r * 0.86;
      const tailLen = r * 0.52;
      const needleWidth = size * 0.044;

      const perpAngle = angleRad + Math.PI / 2;
      const tipX = cx + Math.cos(angleRad) * needleLen;
      const tipY = cy + Math.sin(angleRad) * needleLen;

      const tailX = cx - Math.cos(angleRad) * tailLen;
      const tailY = cy - Math.sin(angleRad) * tailLen;

      const leftWingX = cx + Math.cos(perpAngle) * needleWidth;
      const leftWingY = cy + Math.sin(perpAngle) * needleWidth;

      const rightWingX = cx - Math.cos(perpAngle) * needleWidth;
      const rightWingY = cy - Math.sin(perpAngle) * needleWidth;

      ctx.save();
      // Drop shadow for floating 3D needle effect
      ctx.shadowColor = 'rgba(0, 0, 0, 0.65)';
      ctx.shadowBlur = 14;
      ctx.shadowOffsetX = 3;
      ctx.shadowOffsetY = 5;

      // ── North / Pointer Head (3D Chiseled Facets) ──
      // Light facet (Left)
      const northGradLight = ctx.createLinearGradient(leftWingX, leftWingY, tipX, tipY);
      northGradLight.addColorStop(0, '#38bdf8');
      northGradLight.addColorStop(0.5, '#06b6d4');
      northGradLight.addColorStop(1, '#a5f3fc');

      ctx.beginPath();
      ctx.moveTo(cx, cy);
      ctx.lineTo(leftWingX, leftWingY);
      ctx.lineTo(tipX, tipY);
      ctx.closePath();
      ctx.fillStyle = northGradLight;
      ctx.fill();

      // Shadowed facet (Right)
      const northGradDark = ctx.createLinearGradient(rightWingX, rightWingY, tipX, tipY);
      northGradDark.addColorStop(0, '#0284c7');
      northGradDark.addColorStop(0.7, '#0369a1');
      northGradDark.addColorStop(1, '#0c4a6e');

      ctx.beginPath();
      ctx.moveTo(cx, cy);
      ctx.lineTo(rightWingX, rightWingY);
      ctx.lineTo(tipX, tipY);
      ctx.closePath();
      ctx.fillStyle = northGradDark;
      ctx.fill();

      // ── South / Counter Tail (Faceted Metal) ──
      // Tail Light facet
      ctx.beginPath();
      ctx.moveTo(cx, cy);
      ctx.lineTo(leftWingX, leftWingY);
      ctx.lineTo(tailX, tailY);
      ctx.closePath();
      ctx.fillStyle = '#64748b';
      ctx.fill();

      // Tail Dark facet
      ctx.beginPath();
      ctx.moveTo(cx, cy);
      ctx.lineTo(rightWingX, rightWingY);
      ctx.lineTo(tailX, tailY);
      ctx.closePath();
      ctx.fillStyle = '#334155';
      ctx.fill();

      // Sharp central ridge spine highlight
      ctx.restore();
      ctx.save();
      ctx.beginPath();
      ctx.moveTo(tailX, tailY);
      ctx.lineTo(tipX, tipY);
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.4)';
      ctx.lineWidth = 1;
      ctx.stroke();

      // Glowing needle tip beacon
      ctx.beginPath();
      ctx.arc(tipX, tipY, size * 0.016, 0, Math.PI * 2);
      ctx.fillStyle = '#67e8f9';
      ctx.shadowColor = '#38bdf8';
      ctx.shadowBlur = 8;
      ctx.fill();
      ctx.restore();

      // ── 7. Central Pivot Nail / Rivet Pin ("The Nail") ──
      // Outer brass/metallic collar
      const nailCollarR = size * 0.06;
      const collarGrad = ctx.createRadialGradient(
        cx - size * 0.01,
        cy - size * 0.01,
        0,
        cx,
        cy,
        nailCollarR
      );
      collarGrad.addColorStop(0, '#475569');
      collarGrad.addColorStop(0.6, '#1e293b');
      collarGrad.addColorStop(1, '#0f172a');

      ctx.save();
      ctx.shadowColor = 'rgba(0, 0, 0, 0.6)';
      ctx.shadowBlur = 8;
      ctx.beginPath();
      ctx.arc(cx, cy, nailCollarR, 0, Math.PI * 2);
      ctx.fillStyle = collarGrad;
      ctx.fill();
      ctx.strokeStyle = 'rgba(56, 189, 248, 0.4)';
      ctx.lineWidth = 1.5;
      ctx.stroke();

      // Middle bevel ring
      const nailBevelR = size * 0.038;
      ctx.beginPath();
      ctx.arc(cx, cy, nailBevelR, 0, Math.PI * 2);
      ctx.fillStyle = '#090d16';
      ctx.fill();
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.2)';
      ctx.lineWidth = 1;
      ctx.stroke();

      // Center metallic nail head / rivet dome
      const nailHeadR = size * 0.022;
      const nailGrad = ctx.createRadialGradient(
        cx - size * 0.007,
        cy - size * 0.007,
        size * 0.002,
        cx,
        cy,
        nailHeadR
      );
      nailGrad.addColorStop(0, '#f8fafc');
      nailGrad.addColorStop(0.3, '#94a3b8');
      nailGrad.addColorStop(0.8, '#334155');
      nailGrad.addColorStop(1, '#0f172a');

      ctx.beginPath();
      ctx.arc(cx, cy, nailHeadR, 0, Math.PI * 2);
      ctx.fillStyle = nailGrad;
      ctx.fill();

      // Specular pin highlight on nail head
      ctx.beginPath();
      ctx.arc(cx - size * 0.006, cy - size * 0.006, size * 0.005, 0, Math.PI * 2);
      ctx.fillStyle = 'rgba(255, 255, 255, 0.85)';
      ctx.fill();
      ctx.restore();

      // Continuous loop for live real-time responsiveness and aerodynamic sway
      animRef.current = requestAnimationFrame(renderFrame);
    };

    cancelAnimationFrame(animRef.current);
    animRef.current = requestAnimationFrame(renderFrame);

    return () => cancelAnimationFrame(animRef.current);
  }, [direction, speed, gust, size, color]);

  return (
    <canvas
      ref={canvasRef}
      className="transition-transform duration-300 hover:scale-105"
      style={{ display: 'block' }}
    />
  );
};


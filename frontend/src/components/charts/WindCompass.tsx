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
    const r = size * 0.42;
    const target = direction;

    const draw = () => {
      ctx.clearRect(0, 0, size, size);

      // Outer ring
      ctx.beginPath();
      ctx.arc(cx, cy, r, 0, Math.PI * 2);
      ctx.strokeStyle = 'rgba(255,255,255,0.08)';
      ctx.lineWidth = 1.5;
      ctx.stroke();

      // Inner ring
      ctx.beginPath();
      ctx.arc(cx, cy, r * 0.7, 0, Math.PI * 2);
      ctx.strokeStyle = 'rgba(255,255,255,0.04)';
      ctx.lineWidth = 1;
      ctx.stroke();

      // Cardinal direction labels
      const cardinals = [
        { label: 'N', angle: -Math.PI / 2, bold: true },
        { label: 'E', angle: 0, bold: false },
        { label: 'S', angle: Math.PI / 2, bold: false },
        { label: 'W', angle: Math.PI, bold: false },
      ];
      cardinals.forEach(({ label, angle, bold }) => {
        const lx = cx + Math.cos(angle) * (r + size * 0.08);
        const ly = cy + Math.sin(angle) * (r + size * 0.08);
        ctx.fillStyle = bold ? '#e2e8f0' : '#64748b';
        ctx.font = `${bold ? 'bold ' : ''}${size * 0.1}px 'JetBrains Mono', monospace`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(label, lx, ly);
      });

      // Degree tick marks
      for (let i = 0; i < 36; i++) {
        const tickAngle = (i * 10 * Math.PI) / 180 - Math.PI / 2;
        const isMajor = i % 9 === 0;
        const outer = r - 1;
        const inner = outer - (isMajor ? size * 0.06 : size * 0.03);
        ctx.beginPath();
        ctx.moveTo(cx + Math.cos(tickAngle) * outer, cy + Math.sin(tickAngle) * outer);
        ctx.lineTo(cx + Math.cos(tickAngle) * inner, cy + Math.sin(tickAngle) * inner);
        ctx.strokeStyle = isMajor ? 'rgba(255,255,255,0.25)' : 'rgba(255,255,255,0.08)';
        ctx.lineWidth = isMajor ? 2 : 1;
        ctx.stroke();
      }

      // Animate toward target direction
      let diff = target - currentDirRef.current;
      if (diff > 180) diff -= 360;
      if (diff < -180) diff += 360;
      const needsAnim = Math.abs(diff) > 0.5;
      if (needsAnim) {
        currentDirRef.current += diff * 0.06;
      } else {
        currentDirRef.current = target;
      }

      const arrowAngle = (currentDirRef.current * Math.PI) / 180 - Math.PI / 2;

      // Wind direction arrow (tail first)
      const arrowLen = r * 0.55;
      const tailLen = r * 0.3;

      // Tail
      ctx.beginPath();
      ctx.moveTo(cx - Math.cos(arrowAngle) * tailLen, cy - Math.sin(arrowAngle) * tailLen);
      ctx.lineTo(cx, cy);
      ctx.strokeStyle = 'rgba(148,163,184,0.4)';
      ctx.lineWidth = size * 0.025;
      ctx.lineCap = 'round';
      ctx.stroke();

      // Glow head
      ctx.save();
      ctx.shadowColor = color;
      ctx.shadowBlur = 20;
      ctx.beginPath();
      ctx.moveTo(cx, cy);
      ctx.lineTo(
        cx + Math.cos(arrowAngle) * arrowLen,
        cy + Math.sin(arrowAngle) * arrowLen
      );
      ctx.strokeStyle = color;
      ctx.lineWidth = size * 0.035;
      ctx.lineCap = 'round';
      ctx.stroke();

      // Arrowhead
      const tipX = cx + Math.cos(arrowAngle) * arrowLen;
      const tipY = cy + Math.sin(arrowAngle) * arrowLen;
      const headSize = size * 0.06;
      ctx.beginPath();
      ctx.moveTo(tipX, tipY);
      ctx.lineTo(
        tipX - headSize * Math.cos(arrowAngle - 0.4),
        tipY - headSize * Math.sin(arrowAngle - 0.4)
      );
      ctx.lineTo(
        tipX - headSize * Math.cos(arrowAngle + 0.4),
        tipY - headSize * Math.sin(arrowAngle + 0.4)
      );
      ctx.closePath();
      ctx.fillStyle = color;
      ctx.fill();
      ctx.restore();

      // Center dot
      ctx.beginPath();
      ctx.arc(cx, cy, size * 0.025, 0, Math.PI * 2);
      ctx.fillStyle = '#1e293b';
      ctx.fill();
      ctx.strokeStyle = color;
      ctx.lineWidth = 2;
      ctx.stroke();

      // Speed in center
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillStyle = '#ffffff';
      ctx.font = `bold ${size * 0.15}px 'JetBrains Mono', monospace`;
      ctx.fillText(`${speed}`, cx, cy + size * 0.22);
      ctx.fillStyle = '#64748b';
      ctx.font = `${size * 0.08}px 'JetBrains Mono', monospace`;
      ctx.fillText('km/h', cx, cy + size * 0.31);

      // Cardinal label
      ctx.fillStyle = color;
      ctx.font = `bold ${size * 0.11}px 'JetBrains Mono', monospace`;
      ctx.fillText(getCardinal(currentDirRef.current), cx, cy + size * 0.41);

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

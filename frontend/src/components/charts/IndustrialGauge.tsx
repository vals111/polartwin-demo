import React, { useEffect, useRef } from 'react';

interface IndustrialGaugeProps {
  value: number;
  min?: number;
  max?: number;
  unit?: string;
  label?: string;
  size?: number;
  colorZones?: Array<{ from: number; to: number; color: string }>;
  decimals?: number;
  accentColor?: string;
  warningThreshold?: number;
  criticalThreshold?: number;
}

export const IndustrialGauge: React.FC<IndustrialGaugeProps> = ({
  value,
  min = 0,
  max = 100,
  unit = '',
  label = '',
  size = 180,
  colorZones,
  decimals = 1,
  accentColor = '#06b6d4',
  warningThreshold,
  criticalThreshold,
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animRef = useRef<number>(0);
  const currentRef = useRef<number>(min);

  const getColor = (val: number): string => {
    if (criticalThreshold && val >= criticalThreshold) return '#ef4444';
    if (warningThreshold && val >= warningThreshold) return '#f59e0b';
    if (colorZones) {
      for (const z of colorZones) {
        if (val >= z.from && val <= z.to) return z.color;
      }
    }
    return accentColor;
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
    const radius = size * 0.38;
    const startAngle = Math.PI * 0.75;
    const endAngle = Math.PI * 2.25;
    const totalAngle = endAngle - startAngle;

    const target = value;
    const speed = 0.04;

    const draw = () => {
      ctx.clearRect(0, 0, size, size);

      // Background ring
      ctx.beginPath();
      ctx.arc(cx, cy, radius, startAngle, endAngle);
      ctx.strokeStyle = 'rgba(255,255,255,0.06)';
      ctx.lineWidth = size * 0.07;
      ctx.lineCap = 'round';
      ctx.stroke();

      // Tick marks
      const numTicks = 10;
      for (let i = 0; i <= numTicks; i++) {
        const tickAngle = startAngle + (i / numTicks) * totalAngle;
        const tickLen = i % 5 === 0 ? size * 0.06 : size * 0.03;
        const innerR = radius - size * 0.09;
        const outerR = innerR - tickLen;
        ctx.beginPath();
        ctx.moveTo(cx + Math.cos(tickAngle) * innerR, cy + Math.sin(tickAngle) * innerR);
        ctx.lineTo(cx + Math.cos(tickAngle) * outerR, cy + Math.sin(tickAngle) * outerR);
        ctx.strokeStyle = i % 5 === 0 ? 'rgba(255,255,255,0.3)' : 'rgba(255,255,255,0.12)';
        ctx.lineWidth = i % 5 === 0 ? 2 : 1;
        ctx.stroke();
      }

      // Normalize
      const norm = Math.max(0, Math.min(1, (currentRef.current - min) / (max - min)));
      const fillAngle = startAngle + norm * totalAngle;
      const color = getColor(currentRef.current);

      // Glow shadow
      ctx.save();
      ctx.shadowColor = color;
      ctx.shadowBlur = 16;

      // Filled arc
      ctx.beginPath();
      ctx.arc(cx, cy, radius, startAngle, fillAngle);
      ctx.strokeStyle = color;
      ctx.lineWidth = size * 0.07;
      ctx.lineCap = 'round';
      ctx.stroke();
      ctx.restore();

      // Needle dot at end
      ctx.beginPath();
      ctx.arc(
        cx + Math.cos(fillAngle) * radius,
        cy + Math.sin(fillAngle) * radius,
        size * 0.04,
        0,
        Math.PI * 2
      );
      ctx.fillStyle = color;
      ctx.shadowColor = color;
      ctx.shadowBlur = 12;
      ctx.fill();
      ctx.shadowBlur = 0;

      // Center value
      ctx.textAlign = 'center';
      ctx.fillStyle = '#ffffff';
      ctx.font = `bold ${size * 0.2}px 'JetBrains Mono', monospace`;
      ctx.fillText(currentRef.current.toFixed(decimals), cx, cy + size * 0.06);

      // Unit
      ctx.fillStyle = color;
      ctx.font = `${size * 0.1}px 'JetBrains Mono', monospace`;
      ctx.fillText(unit, cx, cy + size * 0.18);

      // Label at bottom
      if (label) {
        ctx.fillStyle = 'rgba(148,163,184,0.85)';
        ctx.font = `${size * 0.085}px 'Inter', sans-serif`;
        ctx.fillText(label, cx, cy + size * 0.36);
      }

      // Animate towards target
      const diff = target - currentRef.current;
      if (Math.abs(diff) > 0.01) {
        currentRef.current += diff * speed;
        animRef.current = requestAnimationFrame(draw);
      } else {
        currentRef.current = target;
      }
    };

    cancelAnimationFrame(animRef.current);
    animRef.current = requestAnimationFrame(draw);

    return () => cancelAnimationFrame(animRef.current);
  }, [value, min, max, size, unit, label, accentColor, decimals, warningThreshold, criticalThreshold]);

  return <canvas ref={canvasRef} style={{ display: 'block' }} />;
};

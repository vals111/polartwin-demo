import React, { useEffect, useRef } from 'react';
import * as echarts from 'echarts';

interface DataPoint {
  time?: string;
  value: number;
  lower?: number;
  upper?: number;
  predicted?: number;
  isAnomaly?: boolean;
}

interface EChartsLineProps {
  data: DataPoint[];
  height?: number;
  color?: string;
  showConfidenceBand?: boolean;
  showBaseline?: boolean;
  baselineLabel?: string;
  valueLabel?: string;
  unit?: string;
  title?: string;
  smooth?: boolean;
  showArea?: boolean;
  anomalyColor?: string;
  yMin?: number;
  yMax?: number;
  stationId?: string;
}

export const EChartsLine: React.FC<EChartsLineProps> = ({
  data,
  height = 280,
  color = '#06b6d4',
  showConfidenceBand = false,
  showBaseline = false,
  baselineLabel = 'Actual',
  valueLabel = 'Value',
  unit = '',
  title,
  smooth = true,
  showArea = false,
  anomalyColor = '#ef4444',
  yMin,
  yMax,
  stationId,
}) => {
  const chartRef = useRef<HTMLDivElement>(null);
  const instanceRef = useRef<echarts.ECharts | null>(null);

  useEffect(() => {
    if (!chartRef.current) return;
    if (instanceRef.current) {
      instanceRef.current.dispose();
    }
    const chart = echarts.init(chartRef.current, 'dark');
    instanceRef.current = chart;

    const labels = data.map((d, i) => d.time || `T+${i}h`);
    const values = data.map((d) => d.value);
    const predicted = data.map((d) => (d.predicted !== undefined ? d.predicted : null));
    const lower = data.map((d) => (d.lower !== undefined ? d.lower : null));
    const upper = data.map((d) => (d.upper !== undefined ? d.upper : null));

    const anomalyPoints = data
      .map((d, i) => (d.isAnomaly ? { coord: [i, d.value] } : null))
      .filter(Boolean);

    const series: echarts.SeriesOption[] = [];

    // Confidence band (area between lower and upper)
    if (showConfidenceBand && lower.some(Boolean)) {
      series.push({
        name: 'Confidence Band',
        type: 'line',
        data: upper as number[],
        smooth,
        symbol: 'none',
        lineStyle: { opacity: 0 },
        areaStyle: {
          color: new echarts.graphic.LinearGradient(0, 0, 0, 1, [
            { offset: 0, color: `${color}28` },
            { offset: 1, color: `${color}08` },
          ]),
          origin: 'auto',
        },
        stack: 'confidence',
        tooltip: { show: false },
        z: 1,
      } as any);

      series.push({
        name: 'Lower Band',
        type: 'line',
        data: lower as number[],
        smooth,
        symbol: 'none',
        lineStyle: { opacity: 0 },
        areaStyle: { color: 'rgba(0,0,0,0)' },
        stack: 'confidence',
        tooltip: { show: false },
        z: 1,
      } as any);
    }

    // Actual/baseline line
    if (showBaseline && predicted.some(Boolean)) {
      series.push({
        name: baselineLabel,
        type: 'line',
        data: values,
        smooth,
        symbol: 'none',
        lineStyle: { color: '#94a3b8', width: 1.5, type: 'dashed' },
        z: 3,
      } as any);
    }

    // Main value line
    series.push({
      name: showBaseline ? 'Predicted' : valueLabel,
      type: 'line',
      data: showBaseline ? predicted : values,
      smooth,
      symbol: anomalyPoints.length ? 'circle' : 'none',
      symbolSize: 8,
      lineStyle: { color, width: 2.5 },
      itemStyle: { color },
      areaStyle: showArea
        ? {
            color: new echarts.graphic.LinearGradient(0, 0, 0, 1, [
              { offset: 0, color: `${color}50` },
              { offset: 1, color: `${color}05` },
            ]),
          }
        : undefined,
      markPoint: anomalyPoints.length
        ? {
            data: anomalyPoints.map((p) => ({
              ...p,
              symbol: 'pin',
              symbolSize: 24,
              itemStyle: { color: anomalyColor },
            })),
          }
        : undefined,
      z: 4,
    } as any);

    const option: echarts.EChartsOption = {
      backgroundColor: 'transparent',
      animation: true,
      animationDuration: 800,
      animationEasing: 'cubicOut',
      tooltip: {
        trigger: 'axis',
        backgroundColor: 'rgba(15,23,42,0.95)',
        borderColor: 'rgba(255,255,255,0.1)',
        borderWidth: 1,
        textStyle: { color: '#e2e8f0', fontFamily: 'JetBrains Mono, monospace', fontSize: 11 },
        formatter: (params: any) => {
          const lines = params.map(
            (p: any) =>
              `<div style="display:flex;justify-content:space-between;gap:12px">
                <span style="color:${p.color}">${p.seriesName}:</span>
                <strong>${typeof p.value === 'number' ? p.value.toFixed(2) : 'N/A'}${unit}</strong>
              </div>`
          );
          return `<div style="font-family:monospace;min-width:160px">
            <div style="font-size:10px;color:#64748b;margin-bottom:6px">${params[0]?.name || ''}</div>
            ${lines.join('')}
          </div>`;
        },
      },
      grid: {
        top: title ? 36 : 16,
        bottom: 32,
        left: 60,
        right: 16,
        containLabel: false,
      },
      xAxis: {
        type: 'category',
        data: labels,
        axisLine: { lineStyle: { color: 'rgba(255,255,255,0.08)' } },
        axisTick: { show: false },
        axisLabel: {
          color: '#475569',
          fontFamily: 'JetBrains Mono, monospace',
          fontSize: 10,
          interval: Math.max(0, Math.floor(labels.length / 6) - 1),
        },
      },
      yAxis: {
        type: 'value',
        min: yMin,
        max: yMax,
        splitLine: { lineStyle: { color: 'rgba(255,255,255,0.05)', type: 'dashed' } },
        axisLabel: {
          color: '#475569',
          fontFamily: 'JetBrains Mono, monospace',
          fontSize: 10,
          formatter: (v: number) => `${v.toFixed(0)}${unit}`,
        },
      },
      title: title
        ? {
            text: title,
            textStyle: {
              color: '#94a3b8',
              fontFamily: 'JetBrains Mono, monospace',
              fontSize: 11,
              fontWeight: 'bold',
            },
            top: 4,
            left: 4,
          }
        : undefined,
      series,
    };

    chart.setOption(option);

    const ro = new ResizeObserver(() => chart.resize());
    ro.observe(chartRef.current!);
    return () => {
      ro.disconnect();
      chart.dispose();
    };
  }, [data, color, showConfidenceBand, showBaseline, height, stationId]);

  return <div ref={chartRef} style={{ width: '100%', height }} />;
};

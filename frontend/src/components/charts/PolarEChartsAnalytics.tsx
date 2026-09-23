import React, { useEffect, useRef } from 'react';
import ReactECharts from 'echarts-for-react';
import * as d3 from 'd3';

interface PolarEChartsProps {
  live dataHistory: any[];
  stationName: string;
}

export const PolarEChartsAnalytics: React.FC<PolarEChartsProps> = ({ live dataHistory, stationName }) => {
  const d3ContainerRef = useRef<SVGSVGElement | null>(null);

  // 1. Apache ECharts Option: Multi-Domain Dual-Axis Synchronous Live data
  const times = live dataHistory.map((h) =>
    new Date(h.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
  );
  const actualLoads = live dataHistory.map((h) => h.generator_load_actual);
  const predictedLoads = live dataHistory.map((h) => h.generator_load_predicted);
  const fuelBurns = live dataHistory.map((h) => h.fuel_burn_actual);
  const solarGen = live dataHistory.map((h) => h.solar_generation);

  const echartsOption = {
    backgroundColor: 'transparent',
    tooltip: {
      trigger: 'axis',
      axisPointer: { type: 'cross' }
    },
    legend: {
      data: ['Actual Load (kW)', 'Predicted Load (kW)', 'Fuel Burn (L/h)', 'Solar Generation (kW)'],
      textStyle: { color: '#94a3b8', fontSize: 11, fontFamily: 'monospace' },
      top: 5
    },
    grid: {
      left: '3%',
      right: '4%',
      bottom: '10%',
      top: '18%',
      containLabel: true
    },
    xAxis: {
      type: 'category',
      data: times,
      axisLine: { lineStyle: { color: '#1e3a5f' } },
      axisLabel: { color: '#64748b', fontFamily: 'monospace', fontSize: 10 }
    },
    yAxis: [
      {
        type: 'value',
        name: 'Electrical (kW)',
        nameTextStyle: { color: '#00e5ff', fontFamily: 'monospace', fontSize: 10 },
        splitLine: { lineStyle: { color: '#0d2340' } },
        axisLabel: { color: '#64748b', fontFamily: 'monospace' }
      },
      {
        type: 'value',
        name: 'Fuel (L/h)',
        nameTextStyle: { color: '#fbbf24', fontFamily: 'monospace', fontSize: 10 },
        splitLine: { show: false },
        axisLabel: { color: '#64748b', fontFamily: 'monospace' }
      }
    ],
    series: [
      {
        name: 'Actual Load (kW)',
        type: 'line',
        data: actualLoads,
        smooth: true,
        itemStyle: { color: '#00e5ff' },
        lineStyle: { width: 2.5 }
      },
      {
        name: 'Predicted Load (kW)',
        type: 'line',
        data: predictedLoads,
        smooth: true,
        lineStyle: { type: 'dashed', width: 2, color: '#f59e0b' },
        itemStyle: { color: '#f59e0b' }
      },
      {
        name: 'Solar Generation (kW)',
        type: 'bar',
        data: solarGen,
        itemStyle: { color: 'rgba(52, 211, 153, 0.45)' }
      },
      {
        name: 'Fuel Burn (L/h)',
        type: 'line',
        yAxisIndex: 1,
        data: fuelBurns,
        smooth: true,
        itemStyle: { color: '#ec4899' },
        lineStyle: { width: 2 }
      }
    ]
  };

  // 2. D3.js Interactive Cross-Domain Force Layout
  useEffect(() => {
    if (!d3ContainerRef.current) return;

    const svg = d3.select(d3ContainerRef.current);
    svg.selectAll('*').remove();

    const width = 600;
    const height = 180;

    const nodes = [
      { id: 'Env', label: 'Weather / Temp', group: 1, r: 20 },
      { id: 'Energy', label: 'Heating Load', group: 2, r: 18 },
      { id: 'Gen', label: 'Generator CHP', group: 2, r: 22 },
      { id: 'Fuel', label: 'Fuel Reserve', group: 3, r: 20 },
      { id: 'Water', label: 'Water Pump', group: 3, r: 17 },
      { id: 'Risk', label: 'Station Risk', group: 4, r: 24 }
    ];

    const links = [
      { source: 'Env', target: 'Energy', value: 3 },
      { source: 'Energy', target: 'Gen', value: 4 },
      { source: 'Gen', target: 'Fuel', value: 4 },
      { source: 'Env', target: 'Water', value: 2 },
      { source: 'Fuel', target: 'Risk', value: 3 },
      { source: 'Gen', target: 'Risk', value: 3 }
    ];

    const simulation = d3.forceSimulation(nodes as any)
      .force('link', d3.forceLink(links).id((d: any) => d.id).distance(90))
      .force('charge', d3.forceManyBody().strength(-140))
      .force('center', d3.forceCenter(width / 2, height / 2));

    const link = svg.append('g')
      .selectAll('line')
      .data(links)
      .enter().append('line')
      .attr('stroke', '#00e5ff')
      .attr('stroke-opacity', 0.6)
      .attr('stroke-width', (d: any) => Math.sqrt(d.value) * 1.5)
      .attr('stroke-dasharray', '4 2');

    const node = svg.append('g')
      .selectAll('g')
      .data(nodes)
      .enter().append('g')
      .call(d3.drag<any, any>()
        .on('start', (event, d: any) => {
          if (!event.active) simulation.alphaTarget(0.3).restart();
          d.fx = d.x;
          d.fy = d.y;
        })
        .on('drag', (event, d: any) => {
          d.fx = event.x;
          d.fy = event.y;
        })
        .on('end', (event, d: any) => {
          if (!event.active) simulation.alphaTarget(0);
          d.fx = null;
          d.fy = null;
        })
      );

    node.append('circle')
      .attr('r', (d: any) => d.r)
      .attr('fill', '#071322')
      .attr('stroke', '#00e5ff')
      .attr('stroke-width', 2);

    node.append('text')
      .text((d: any) => d.id)
      .attr('text-anchor', 'middle')
      .attr('dy', '.3em')
      .attr('fill', '#e2e8f0')
      .attr('font-size', '10px')
      .attr('font-family', 'monospace')
      .attr('font-weight', 'bold');

    simulation.on('tick', () => {
      link
        .attr('x1', (d: any) => d.source.x)
        .attr('y1', (d: any) => d.source.y)
        .attr('x2', (d: any) => d.target.x)
        .attr('y2', (d: any) => d.target.y);

      node.attr('transform', (d: any) => `translate(${d.x},${d.y})`);
    });

    return () => {
      simulation.stop();
    };
  }, []);

  return (
    <div className="space-y-6">
      {/* Apache ECharts 2D Live data Chart */}
      <div className="glass-panel p-5 rounded-2xl border border-polar-border">
        <div className="flex items-center justify-between pb-3 border-b border-polar-border/60 mb-2">
          <div>
            <h3 className="text-xs font-bold font-mono tracking-wider text-cyan-400 uppercase">
              Apache ECharts — High-Fidelity Multi-Metric Live data Stream
            </h3>
            <p className="text-[11px] text-slate-400 font-mono">
              Synchronous Dual-Axis ECharts rendering actual load, predicted demand, solar, and diesel consumption
            </p>
          </div>
          <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-cyan-500/20 text-cyan-300 border border-cyan-500/40">
            Apache ECharts v5
          </span>
        </div>
        <ReactECharts option={echartsOption} style={{ height: '320px', width: '100%' }} />
      </div>

      {/* D3.js Interactive Dynamic Network Graph */}
      <div className="glass-panel p-5 rounded-2xl border border-polar-border">
        <div className="flex items-center justify-between pb-3 border-b border-polar-border/60 mb-3">
          <div>
            <h3 className="text-xs font-bold font-mono tracking-wider text-purple-400 uppercase">
              D3.js Force-Directed Interactive Causal Topology
            </h3>
            <p className="text-[11px] text-slate-400 font-mono">
              Draggable D3 physics graph simulating continuous constraint signal spread across domains
            </p>
          </div>
          <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-purple-500/20 text-purple-300 border border-purple-500/40">
            D3.js v7 Interactive
          </span>
        </div>
        <div className="flex justify-center overflow-hidden bg-polar-dark/60 rounded-xl border border-polar-border p-2">
          <svg ref={d3ContainerRef} viewBox="0 0 600 180" className="w-full max-w-2xl h-48 select-none" />
        </div>
      </div>
    </div>
  );
};

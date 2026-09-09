import React, { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { useNavigate } from 'react-router-dom';
import { useTelemetryStore } from '../../store/telemetryStore';
import { ExternalLink, RotateCcw, Play, Pause, Compass } from 'lucide-react';

interface Domain3DDef {
  id: string;
  name: string;
  shortName: string;
  route: string;
  color: string;
  pos: [number, number, number];
  role: string;
}

const DOMAINS_3D: Domain3DDef[] = [
  { id: 'environment', name: 'Environment & Weather', shortName: 'Environment', route: 'environment', color: '#818cf8', pos: [0, 190, 0], role: 'Climate Driver' },
  { id: 'logistics', name: 'Transportation & Logistics', shortName: 'Logistics', route: 'logistics', color: '#2dd4bf', pos: [-240, 110, 100], role: 'Supply Lifeline' },
  { id: 'fuel', name: 'Fuel Storage', shortName: 'Fuel', route: 'fuel', color: '#f59e0b', pos: [-290, -10, -50], role: 'Hydrocarbon Reserve' },
  { id: 'inventory', name: 'Storage & Inventory', shortName: 'Inventory', route: 'inventory', color: '#34d399', pos: [-140, -30, -220], role: 'Spares & SKUs' },
  { id: 'water', name: 'Water Supply', shortName: 'Water', route: 'water', color: '#38bdf8', pos: [260, 60, -100], role: 'Hydrological Loop' },
  { id: 'equipment', name: 'Equipment & Machinery', shortName: 'Equipment', route: 'equipment', color: '#10b981', pos: [-80, -130, 90], role: 'Mechanical Health' },
  { id: 'energy', name: 'Energy & Power', shortName: 'Energy & Power', route: 'resources', color: '#fbbf24', pos: [110, -80, 160], role: 'Microgrid Hub' },
  { id: 'personnel', name: 'Personnel & Occupancy', shortName: 'Personnel', route: 'personnel', color: '#c084fc', pos: [40, -210, -70], role: 'Crew Life Support' },
  { id: 'communication', name: 'Communication', shortName: 'Communication', route: 'communication', color: '#38bdf8', pos: [260, -120, 80], role: 'Telemetry Uplink' },
];

const CONNECTIONS_3D: Array<[string, string, string]> = [
  ['environment', 'energy', 'Thermal Demand & PV Offset'],
  ['environment', 'water', 'Lake Freeze & Melt Intake'],
  ['environment', 'logistics', 'Blizzards & Sea-Ice Route'],
  ['environment', 'communication', 'Atmospheric RF Attenuation'],
  ['logistics', 'fuel', 'Bulk Diesel Replenishment'],
  ['logistics', 'inventory', 'Annual Parts Manifest'],
  ['fuel', 'energy', 'Continuous Fuel Feed to Gensets'],
  ['inventory', 'equipment', 'Predictive Overhaul Spares'],
  ['equipment', 'energy', 'Engine Availability & Synchro'],
  ['energy', 'water', '4.2kW Trace Line Heating'],
  ['energy', 'communication', 'Radome Dome De-Icing Power'],
  ['energy', 'personnel', 'HVAC Life Support & Galley'],
  ['water', 'personnel', 'Potable Hydration & Sanitation'],
  ['personnel', 'communication', 'SCADA Ops & Comms Uplink'],
];

interface Props {
  stationId: string;
}

export const ThreeDomainGraph: React.FC<Props> = ({ stationId }) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const navigate = useNavigate();
  const { liveSnapshot } = useTelemetryStore();
  const isMaitri = stationId === 'maitri';
  const snapshot = liveSnapshot[stationId];

  const [hoveredDomain, setHoveredDomain] = useState<Domain3DDef | null>(null);
  const [tooltipPos, setTooltipPos] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const [autoRotate, setAutoRotate] = useState<boolean>(true);

  // Keep a ref to controls so we can reset or toggle rotate
  const controlsRef = useRef<OrbitControls | null>(null);

  // Compute live telemetry for hovered tooltip
  const liveTelemetry = (domainId: string) => {
    const env = snapshot?.environment;
    const eng = snapshot?.energy;
    const fl = snapshot?.fuel;
    const wt = snapshot?.water;
    const eq = snapshot?.equipment;
    const pers = snapshot?.personnel;
    const comm = snapshot?.communication;

    switch (domainId) {
      case 'environment':
        return { kpi: `${env?.temperature?.toFixed(1) ?? (isMaitri ? -25.2 : -18.4)}°C`, sub: `Wind: ${env?.wind_speed ?? (isMaitri ? 32 : 44)} km/h`, status: isMaitri ? 'Katabatic Gale' : 'Coastal Squall' };
      case 'logistics':
        return { kpi: isMaitri ? '88 Days ETA' : '102 Days ETA', sub: 'MV Vasiliy Golovnin', status: isMaitri ? '+4.5d Delay' : '+2.0d Delay' };
      case 'fuel':
        return { kpi: `${fl?.fuel_percentage?.toFixed(0) ?? (isMaitri ? 78 : 86)}%`, sub: `${fl?.current_level?.toLocaleString() ?? (isMaitri ? '142,000' : '180,000')} L`, status: `${fl?.consumption_rate_l_per_hr ?? (isMaitri ? 17.5 : 21.2)} L/hr` };
      case 'inventory':
        return { kpi: '0 Stockouts', sub: `${isMaitri ? '1,420' : '1,850'} SKUs`, status: '100% Critical Spares' };
      case 'water':
        return { kpi: `${wt?.storage_liters?.toLocaleString() ?? (isMaitri ? '18,500' : '24,000')} L`, sub: `Pipe: +${wt?.pipe_temp_c ?? (isMaitri ? 3.8 : 8.5)}°C`, status: isMaitri ? 'Trace Active (4.2kW)' : 'SWRO Active (24L/m)' };
      case 'equipment':
        return { kpi: `${eq?.avg_health ?? (isMaitri ? 93.5 : 96.2)}%`, sub: isMaitri ? '6 Units Active' : '8 Units Active', status: '1 Unit on Watch' };
      case 'energy':
        return { kpi: `${eng?.generator_load ?? (isMaitri ? 68 : 82)} kW`, sub: `PV: +${eng?.solar_output ?? (isMaitri ? 22 : 28)} kW`, status: isMaitri ? 'Gen #1 Active' : 'CHP Array Sync' };
      case 'personnel':
        return { kpi: `${pers?.headcount ?? (isMaitri ? 25 : 30)} Crew`, sub: `Occupancy: ${isMaitri ? '83%' : '64%'}`, status: 'All Accounted' };
      case 'communication':
        return { kpi: `${comm?.bandwidth_mbps ?? (isMaitri ? 120 : 160)} Mbps`, sub: `Lat: ${comm?.latency_ms ?? (isMaitri ? 78 : 65)}ms`, status: 'QoS Tier 1 LIVE' };
      default:
        return { kpi: 'Nominal', sub: 'Active Telemetry', status: 'Optimal' };
    }
  };

  useEffect(() => {
    const canvas = canvasRef.current;
    const container = containerRef.current;
    if (!canvas || !container) return;

    const width = container.clientWidth;
    const height = 680;

    // 1. Scene & Camera
    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x020814);
    scene.fog = new THREE.FogExp2(0x020814, 0.00085);

    const camera = new THREE.PerspectiveCamera(50, width / height, 1, 3000);
    camera.position.set(0, 110, 680);

    // 2. Renderer
    const renderer = new THREE.WebGLRenderer({
      canvas,
      antialias: true,
      alpha: true,
      powerPreference: 'high-performance'
    });
    renderer.setSize(width, height);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));

    // 3. OrbitControls
    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.06;
    controls.maxDistance = 1200;
    controls.minDistance = 280;
    controls.autoRotate = autoRotate;
    controls.autoRotateSpeed = 0.8;
    controls.maxPolarAngle = Math.PI * 0.85;
    controls.minPolarAngle = Math.PI * 0.15;
    controlsRef.current = controls;

    // 4. Lighting
    const ambientLight = new THREE.AmbientLight(0x0a2444, 2.5);
    scene.add(ambientLight);

    const keyLight = new THREE.DirectionalLight(0x38bdf8, 2.2);
    keyLight.position.set(300, 400, 300);
    scene.add(keyLight);

    const fillLight = new THREE.DirectionalLight(0x06b6d4, 1.5);
    fillLight.position.set(-300, -200, -200);
    scene.add(fillLight);

    const centerGlow = new THREE.PointLight(0x06b6d4, 3.0, 600);
    centerGlow.position.set(0, 0, 0);
    scene.add(centerGlow);

    // 5. Polar Radar Grid Floor
    const grid = new THREE.PolarGridHelper(380, 12, 6, 64, 0x0e4468, 0x062238);
    grid.position.y = -260;
    scene.add(grid);

    // Coordinate rings
    const ringGeo = new THREE.RingGeometry(378, 380, 64);
    const ringMat = new THREE.MeshBasicMaterial({ color: 0x0ea5e9, side: THREE.DoubleSide, transparent: true, opacity: 0.3 });
    const ringMesh = new THREE.Mesh(ringGeo, ringMat);
    ringMesh.rotation.x = Math.PI / 2;
    ringMesh.position.y = -260;
    scene.add(ringMesh);

    // 6. Starfield / Ice particle dust
    const particleCount = 600;
    const particleGeo = new THREE.BufferGeometry();
    const positions = new Float32Array(particleCount * 3);
    for (let i = 0; i < particleCount * 3; i += 3) {
      positions[i] = (Math.random() - 0.5) * 1600;
      positions[i + 1] = (Math.random() - 0.5) * 1200;
      positions[i + 2] = (Math.random() - 0.5) * 1600;
    }
    particleGeo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    const particleMat = new THREE.PointsMaterial({
      color: 0x67e8f9,
      size: 2.2,
      transparent: true,
      opacity: 0.55,
      blending: THREE.AdditiveBlending
    });
    const particleSystem = new THREE.Points(particleGeo, particleMat);
    scene.add(particleSystem);

    // 7. Node Meshes & Interactive Objects
    const nodeMeshes: THREE.Mesh[] = [];
    const nodeGroups: THREE.Group[] = [];
    const nodeMap = new Map<string, THREE.Vector3>();

    DOMAINS_3D.forEach((dom) => {
      const group = new THREE.Group();
      group.position.set(...dom.pos);
      nodeMap.set(dom.id, new THREE.Vector3(...dom.pos));

      // Central core sphere
      const sphereGeo = new THREE.SphereGeometry(22, 32, 32);
      const sphereMat = new THREE.MeshStandardMaterial({
        color: new THREE.Color(dom.color),
        emissive: new THREE.Color(dom.color),
        emissiveIntensity: 0.8,
        roughness: 0.2,
        metalness: 0.85
      });
      const sphereMesh = new THREE.Mesh(sphereGeo, sphereMat);
      sphereMesh.userData = { domain: dom };
      group.add(sphereMesh);
      nodeMeshes.push(sphereMesh);

      // Outer glowing halo ring
      const haloGeo = new THREE.TorusGeometry(32, 1.2, 16, 64);
      const haloMat = new THREE.MeshBasicMaterial({
        color: new THREE.Color(dom.color),
        transparent: true,
        opacity: 0.65
      });
      const haloMesh = new THREE.Mesh(haloGeo, haloMat);
      haloMesh.rotation.x = Math.PI / 3;
      group.add(haloMesh);

      // Inner pulsating ring
      const innerHaloGeo = new THREE.TorusGeometry(26, 0.8, 16, 64);
      const innerHaloMat = new THREE.MeshBasicMaterial({
        color: 0xffffff,
        transparent: true,
        opacity: 0.4
      });
      const innerHaloMesh = new THREE.Mesh(innerHaloGeo, innerHaloMat);
      innerHaloMesh.rotation.y = Math.PI / 4;
      group.add(innerHaloMesh);

      // Canvas Label Billboard
      const labelCanvas = document.createElement('canvas');
      labelCanvas.width = 256;
      labelCanvas.height = 80;
      const ctx = labelCanvas.getContext('2d');
      if (ctx) {
        ctx.fillStyle = 'rgba(7, 19, 38, 0.85)';
        ctx.strokeStyle = dom.color;
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.roundRect(8, 8, 240, 64, 12);
        ctx.fill();
        ctx.stroke();

        ctx.font = 'bold 22px system-ui, sans-serif';
        ctx.fillStyle = '#ffffff';
        ctx.textAlign = 'center';
        ctx.fillText(dom.shortName, 128, 36);

        ctx.font = '16px monospace';
        ctx.fillStyle = dom.color;
        ctx.fillText(dom.role, 128, 58);
      }
      const labelTexture = new THREE.CanvasTexture(labelCanvas);
      const spriteMat = new THREE.SpriteMaterial({ map: labelTexture, transparent: true });
      const sprite = new THREE.Sprite(spriteMat);
      sprite.position.set(0, 48, 0);
      sprite.scale.set(70, 22, 1);
      group.add(sprite);

      scene.add(group);
      nodeGroups.push(group);
    });

    // 8. 3D Causal Conduit Curves & Flow Photons
    const curves: THREE.QuadraticBezierCurve3[] = [];
    const photonMeshes: THREE.Mesh[] = [];

    CONNECTIONS_3D.forEach(([fromId, toId]) => {
      const fromPos = nodeMap.get(fromId);
      const toPos = nodeMap.get(toId);
      if (!fromPos || !toPos) return;

      // Arc midpoint displaced slightly outward
      const mid = new THREE.Vector3().addVectors(fromPos, toPos).multiplyScalar(0.5);
      const dist = fromPos.distanceTo(toPos);
      mid.y += dist * 0.18;

      const curve = new THREE.QuadraticBezierCurve3(fromPos, mid, toPos);
      curves.push(curve);

      // Conduit Tube
      const tubeGeo = new THREE.TubeGeometry(curve, 32, 1.4, 8, false);
      const tubeMat = new THREE.MeshStandardMaterial({
        color: 0x0284c7,
        emissive: 0x0369a1,
        emissiveIntensity: 0.5,
        transparent: true,
        opacity: 0.45,
        roughness: 0.3
      });
      const tube = new THREE.Mesh(tubeGeo, tubeMat);
      scene.add(tube);

      // Flowing energy photon along conduit
      const photonGeo = new THREE.SphereGeometry(3.2, 16, 16);
      const photonMat = new THREE.MeshBasicMaterial({
        color: 0x38bdf8,
        transparent: true,
        opacity: 0.95
      });
      const photon = new THREE.Mesh(photonGeo, photonMat);
      scene.add(photon);
      photonMeshes.push(photon);
    });

    // 9. Raycasting Interaction
    const raycaster = new THREE.Raycaster();
    const mouse = new THREE.Vector2(-999, -999);

    const onPointerMove = (e: MouseEvent) => {
      const rect = renderer.domElement.getBoundingClientRect();
      mouse.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
      mouse.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;

      raycaster.setFromCamera(mouse, camera);
      const intersects = raycaster.intersectObjects(nodeMeshes);

      if (intersects.length > 0) {
        const hit = intersects[0].object as THREE.Mesh;
        const dom = hit.userData.domain as Domain3DDef;
        setHoveredDomain(dom);
        setTooltipPos({ x: e.clientX - rect.left, y: e.clientY - rect.top });
        renderer.domElement.style.cursor = 'pointer';
      } else {
        setHoveredDomain(null);
        renderer.domElement.style.cursor = 'grab';
      }
    };

    const onClick = (e: MouseEvent) => {
      const rect = renderer.domElement.getBoundingClientRect();
      mouse.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
      mouse.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;

      raycaster.setFromCamera(mouse, camera);
      const intersects = raycaster.intersectObjects(nodeMeshes);

      if (intersects.length > 0) {
        const hit = intersects[0].object as THREE.Mesh;
        const dom = hit.userData.domain as Domain3DDef;
        navigate(`/station/${stationId}/${dom.route}`);
      }
    };

    renderer.domElement.addEventListener('pointermove', onPointerMove);
    renderer.domElement.addEventListener('click', onClick);

    // 10. Resize handler
    const handleResize = () => {
      if (!container || !renderer) return;
      const w = container.clientWidth;
      camera.aspect = w / height;
      camera.updateProjectionMatrix();
      renderer.setSize(w, height);
    };
    window.addEventListener('resize', handleResize);

    // 11. Animation Loop
    let animId: number;
    let clock = new THREE.Clock();

    const animate = () => {
      animId = requestAnimationFrame(animate);
      const elapsedTime = clock.getElapsedTime();

      // Slowly rotate particle field
      particleSystem.rotation.y = elapsedTime * 0.03;

      // Animate node halos & pulsating rings
      nodeGroups.forEach((grp, i) => {
        const halo = grp.children[1];
        const innerHalo = grp.children[2];
        if (halo) halo.rotation.z = elapsedTime * 0.4 + i;
        if (innerHalo) innerHalo.rotation.y = elapsedTime * -0.6 + i;
      });

      // Animate flowing photons along 3D curves
      curves.forEach((curve, idx) => {
        const photon = photonMeshes[idx];
        if (photon) {
          const t = (elapsedTime * 0.35 + idx * 0.12) % 1;
          const pos = curve.getPointAt(t);
          photon.position.copy(pos);
        }
      });

      controls.update();
      renderer.render(scene, camera);
    };
    animate();

    // 12. Cleanup
    return () => {
      cancelAnimationFrame(animId);
      window.removeEventListener('resize', handleResize);
      renderer.domElement.removeEventListener('pointermove', onPointerMove);
      renderer.domElement.removeEventListener('click', onClick);
      renderer.dispose();
      scene.clear();
    };
  }, [stationId, autoRotate, navigate]);

  const handleResetCamera = () => {
    if (controlsRef.current) {
      controlsRef.current.reset();
    }
  };

  const currentHoverKpi = hoveredDomain ? liveTelemetry(hoveredDomain.id) : null;

  return (
    <div ref={containerRef} className="relative w-full rounded-2xl overflow-hidden bg-[#020814] border border-polar-border/60">
      <canvas ref={canvasRef} className="w-full block" style={{ height: '680px' }} />

      {/* 3D View Controls HUD Bar */}
      <div className="absolute top-4 left-4 z-10 flex items-center gap-2">
        <div className="px-3 py-1.5 rounded-xl bg-polar-dark/90 border border-polar-border/80 backdrop-blur-md flex items-center gap-2 text-xs font-mono text-slate-300 shadow-xl">
          <Compass className="w-4 h-4 text-cyan-400 animate-spin-slow" />
          <span className="font-bold text-white">3D Antarctic Spatial Twin</span>
          <span className="text-slate-500">•</span>
          <span className="text-[11px] text-cyan-300">Drag to Orbit • Scroll to Zoom • Click Node to Enter</span>
        </div>
      </div>

      <div className="absolute top-4 right-4 z-10 flex items-center gap-2">
        <button
          onClick={() => setAutoRotate(!autoRotate)}
          className={`px-3 py-1.5 rounded-xl text-xs font-mono font-bold border transition-all flex items-center gap-1.5 shadow-md ${
            autoRotate
              ? 'bg-cyan-500/20 text-cyan-300 border-cyan-500/40 shadow-cyan-500/10'
              : 'bg-polar-dark/90 text-slate-400 border-polar-border hover:text-white'
          }`}
          title="Toggle Auto-Rotation"
        >
          {autoRotate ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5" />}
          <span>{autoRotate ? 'Orbiting' : 'Paused'}</span>
        </button>

        <button
          onClick={handleResetCamera}
          className="px-3 py-1.5 rounded-xl text-xs font-mono font-bold bg-polar-dark/90 hover:bg-polar-dark text-slate-300 hover:text-white border border-polar-border transition-all flex items-center gap-1.5 shadow-md"
          title="Reset Camera Orientation"
        >
          <RotateCcw className="w-3.5 h-3.5 text-cyan-400" />
          <span>Reset View</span>
        </button>
      </div>

      {/* Floating Hover Glass Tooltip */}
      {hoveredDomain && currentHoverKpi && (
        <div
          className="absolute z-20 pointer-events-none transform -translate-x-1/2 -translate-y-full -mt-4 transition-transform duration-75"
          style={{ left: `${tooltipPos.x}px`, top: `${tooltipPos.y}px` }}
        >
          <div className="glass-panel p-3.5 rounded-2xl border-2 shadow-2xl bg-polar-navy/95 min-w-[240px] text-xs font-mono" style={{ borderColor: hoveredDomain.color }}>
            <div className="flex items-center justify-between gap-2 pb-1.5 border-b border-polar-border/60">
              <span className="font-black text-sm text-white">{hoveredDomain.name}</span>
              <span className="text-[10px] px-1.5 py-0.5 rounded font-bold uppercase" style={{ background: `${hoveredDomain.color}25`, color: hoveredDomain.color }}>
                {hoveredDomain.role}
              </span>
            </div>

            <div className="mt-2 flex items-baseline justify-between">
              <span className="text-base font-black text-white font-mono">{currentHoverKpi.kpi}</span>
              <span className="text-[10px] text-slate-400">{currentHoverKpi.sub}</span>
            </div>

            <div className="mt-1 text-[10px] text-cyan-300 font-medium">{currentHoverKpi.status}</div>

            <div className="mt-2.5 pt-2 border-t border-polar-border/40 flex items-center justify-between text-[10.5px] text-slate-300">
              <span className="text-cyan-400 font-bold">Click node to open page</span>
              <ExternalLink className="w-3 h-3 text-cyan-300" />
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

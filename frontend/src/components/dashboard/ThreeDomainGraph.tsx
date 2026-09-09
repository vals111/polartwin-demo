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

// 9 Domains with individual signature colors matching the 2D Digital Architecture
const DOMAINS_3D: Domain3DDef[] = [
  { id: 'environment', name: 'Environment & Weather', shortName: 'Environment & Weather', route: 'environment', color: '#818cf8', pos: [0, 200, 0], role: 'External Climate Driver' },
  { id: 'logistics', name: 'Transportation & Logistics', shortName: 'Transportation & Logistics', route: 'logistics', color: '#2dd4bf', pos: [-240, 110, 100], role: 'Expedition Resupply' },
  { id: 'fuel', name: 'Fuel Storage', shortName: 'Fuel Storage', route: 'fuel', color: '#f59e0b', pos: [-290, -10, -50], role: 'Hydrocarbon Reserve' },
  { id: 'inventory', name: 'Storage & Inventory', shortName: 'Storage & Inventory', route: 'inventory', color: '#34d399', pos: [-140, -30, -220], role: 'Critical Spares Manifest' },
  { id: 'water', name: 'Water Supply', shortName: 'Water Supply', route: 'water', color: '#38bdf8', pos: [260, 60, -100], role: 'Hydrological Cycle' },
  { id: 'equipment', name: 'Equipment & Machinery', shortName: 'Equipment & Machinery', route: 'equipment', color: '#10b981', pos: [-80, -130, 90], role: 'Power Conversion' },
  { id: 'energy', name: 'Energy & Power', shortName: 'Energy & Power', route: 'resources', color: '#fbbf24', pos: [110, -80, 160], role: 'Central Microgrid Hub' },
  { id: 'personnel', name: 'Personnel & Occupancy', shortName: 'Personnel & Occupancy', route: 'personnel', color: '#c084fc', pos: [40, -210, -70], role: 'Habitat Life Support' },
  { id: 'communication', name: 'Communication', shortName: 'Communication', route: 'communication', color: '#06b6d4', pos: [260, -120, 80], role: 'Real-Time Telemetry' },
];

// Pristine directed causal dependencies matching 2D cross-domain tree
interface Connection3DDef {
  from: string;
  to: string;
  label: string;
}

const CONNECTIONS_3D: Connection3DDef[] = [
  { from: 'environment', to: 'logistics', label: 'Katabatic wind & blizzards' },
  { from: 'environment', to: 'water', label: 'Conduit freeze hazard' },
  { from: 'environment', to: 'energy', label: 'Heating demand & PV offset' },
  { from: 'logistics', to: 'fuel', label: 'Annual diesel replenishment' },
  { from: 'logistics', to: 'inventory', label: 'Spares & consumables restock' },
  { from: 'fuel', to: 'energy', label: '17.5 L/hr diesel supply' },
  { from: 'inventory', to: 'equipment', label: 'Bearings & filter staging' },
  { from: 'equipment', to: 'energy', label: 'Genset alternator uptime' },
  { from: 'energy', to: 'water', label: '4.2 kW trace line heating' },
  { from: 'energy', to: 'personnel', label: 'Habitat heating & power' },
  { from: 'energy', to: 'communication', label: 'Radome UPS & uplink power' },
  { from: 'water', to: 'personnel', label: 'Filtered potable hydration' },
  { from: 'personnel', to: 'communication', label: 'Operator SCADA command' },
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

  const controlsRef = useRef<OrbitControls | null>(null);
  const hoveredDomainRef = useRef<Domain3DDef | null>(null);

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
    scene.fog = new THREE.FogExp2(0x020814, 0.0008);

    const camera = new THREE.PerspectiveCamera(50, width / height, 1, 3000);
    camera.position.set(0, 100, 690);

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
    controls.autoRotateSpeed = 0.75;
    controls.maxPolarAngle = Math.PI * 0.85;
    controls.minPolarAngle = Math.PI * 0.15;
    controlsRef.current = controls;

    // 4. Lighting Setup
    const ambientLight = new THREE.AmbientLight(0x0a2444, 2.5);
    scene.add(ambientLight);

    const keyLight = new THREE.DirectionalLight(0x38bdf8, 2.4);
    keyLight.position.set(300, 400, 300);
    scene.add(keyLight);

    const fillLight = new THREE.DirectionalLight(0x06b6d4, 1.5);
    fillLight.position.set(-300, -200, -200);
    scene.add(fillLight);

    const centerGlow = new THREE.PointLight(0x06b6d4, 2.5, 600);
    centerGlow.position.set(0, 0, 0);
    scene.add(centerGlow);

    // 5. Polar Radar Ground Grid
    const grid = new THREE.PolarGridHelper(380, 12, 6, 64, 0x0e4468, 0x062238);
    grid.position.y = -260;
    scene.add(grid);

    const ringGeo = new THREE.RingGeometry(378, 380, 64);
    const ringMat = new THREE.MeshBasicMaterial({ color: 0x0ea5e9, side: THREE.DoubleSide, transparent: true, opacity: 0.35 });
    const ringMesh = new THREE.Mesh(ringGeo, ringMat);
    ringMesh.rotation.x = Math.PI / 2;
    ringMesh.position.y = -260;
    scene.add(ringMesh);

    // 6. Starfield & Polar Micro-ice Particles
    const particleCount = 650;
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
      opacity: 0.5,
      blending: THREE.AdditiveBlending
    });
    const particleSystem = new THREE.Points(particleGeo, particleMat);
    scene.add(particleSystem);

    // 7. Node Meshes & Objects with Individual Colors
    const nodeMeshes: THREE.Mesh[] = [];
    const nodeDataList: Array<{
      dom: Domain3DDef;
      group: THREE.Group;
      sphereMesh: THREE.Mesh;
      sphereMat: THREE.MeshStandardMaterial;
      haloMesh: THREE.Mesh;
      haloMat: THREE.MeshBasicMaterial;
      innerHaloMesh: THREE.Mesh;
      innerHaloMat: THREE.MeshBasicMaterial;
      sprite: THREE.Sprite;
      spriteMat: THREE.SpriteMaterial;
    }> = [];
    const nodeMap = new Map<string, THREE.Vector3>();

    DOMAINS_3D.forEach((dom) => {
      const group = new THREE.Group();
      group.position.set(...dom.pos);
      nodeMap.set(dom.id, new THREE.Vector3(...dom.pos));

      // Central core sphere with domain's individual signature color
      const sphereGeo = new THREE.SphereGeometry(22, 32, 32);
      const sphereMat = new THREE.MeshStandardMaterial({
        color: new THREE.Color(dom.color),
        emissive: new THREE.Color(dom.color),
        emissiveIntensity: 0.85,
        roughness: 0.2,
        metalness: 0.8
      });
      const sphereMesh = new THREE.Mesh(sphereGeo, sphereMat);
      sphereMesh.userData = { domain: dom };
      group.add(sphereMesh);
      nodeMeshes.push(sphereMesh);

      // Outer glowing halo ring with individual color
      const haloGeo = new THREE.TorusGeometry(32, 1.4, 16, 64);
      const haloMat = new THREE.MeshBasicMaterial({
        color: new THREE.Color(dom.color),
        transparent: true,
        opacity: 0.75
      });
      const haloMesh = new THREE.Mesh(haloGeo, haloMat);
      haloMesh.rotation.x = Math.PI / 3;
      group.add(haloMesh);

      // Inner pulsating core ring
      const innerHaloGeo = new THREE.TorusGeometry(26, 0.9, 16, 64);
      const innerHaloMat = new THREE.MeshBasicMaterial({
        color: 0xffffff,
        transparent: true,
        opacity: 0.45
      });
      const innerHaloMesh = new THREE.Mesh(innerHaloGeo, innerHaloMat);
      innerHaloMesh.rotation.y = Math.PI / 4;
      group.add(innerHaloMesh);

      // Canvas Label Billboard with individual domain color border & role badge
      const labelCanvas = document.createElement('canvas');
      labelCanvas.width = 280;
      labelCanvas.height = 84;
      const ctx = labelCanvas.getContext('2d');
      if (ctx) {
        ctx.fillStyle = 'rgba(5, 15, 32, 0.92)';
        ctx.strokeStyle = dom.color;
        ctx.lineWidth = 2.5;
        ctx.beginPath();
        ctx.roundRect(8, 8, 264, 68, 12);
        ctx.fill();
        ctx.stroke();

        ctx.font = 'bold 21px system-ui, sans-serif';
        ctx.fillStyle = '#ffffff';
        ctx.textAlign = 'center';
        ctx.fillText(dom.shortName, 140, 36);

        ctx.font = 'bold 13px monospace';
        ctx.fillStyle = dom.color;
        ctx.fillText(dom.role.toUpperCase(), 140, 58);
      }
      const labelTexture = new THREE.CanvasTexture(labelCanvas);
      const spriteMat = new THREE.SpriteMaterial({ map: labelTexture, transparent: true, opacity: 0.95 });
      const sprite = new THREE.Sprite(spriteMat);
      sprite.position.set(0, 50, 0);
      sprite.scale.set(74, 22, 1);
      group.add(sprite);

      scene.add(group);
      nodeDataList.push({
        dom,
        group,
        sphereMesh,
        sphereMat,
        haloMesh,
        haloMat,
        innerHaloMesh,
        innerHaloMat,
        sprite,
        spriteMat
      });
    });

    // 8. 3D Causal Conduit Curves & Flow Photons
    // Links appear ONLY on hover: Incoming = Electric Cyan (#00f2fe), Outgoing = Radiant Amber (#fbbf24)
    const CYAN_COLOR = new THREE.Color(0x00f2fe);
    const CYAN_EMISSIVE = new THREE.Color(0x00c6ff);
    const AMBER_COLOR = new THREE.Color(0xfbbf24);
    const AMBER_EMISSIVE = new THREE.Color(0xf59e0b);

    interface ConnectionObj {
      from: string;
      to: string;
      curve: THREE.QuadraticBezierCurve3;
      tubeMesh: THREE.Mesh;
      tubeMat: THREE.MeshStandardMaterial;
      photonMesh: THREE.Mesh;
      photonMat: THREE.MeshBasicMaterial;
    }
    const connectionObjs: ConnectionObj[] = [];

    CONNECTIONS_3D.forEach((conn) => {
      const fromPos = nodeMap.get(conn.from);
      const toPos = nodeMap.get(conn.to);
      if (!fromPos || !toPos) return;

      // Arc midpoint elevated outward
      const mid = new THREE.Vector3().addVectors(fromPos, toPos).multiplyScalar(0.5);
      const dist = fromPos.distanceTo(toPos);
      mid.y += dist * 0.18;

      const curve = new THREE.QuadraticBezierCurve3(fromPos, mid, toPos);

      // Conduit Tube (Initially Hidden: visible only on hover)
      const tubeGeo = new THREE.TubeGeometry(curve, 36, 1.8, 8, false);
      const tubeMat = new THREE.MeshStandardMaterial({
        color: CYAN_COLOR,
        emissive: CYAN_EMISSIVE,
        emissiveIntensity: 0.9,
        transparent: true,
        opacity: 0.85,
        roughness: 0.2
      });
      const tubeMesh = new THREE.Mesh(tubeGeo, tubeMat);
      tubeMesh.visible = false;
      scene.add(tubeMesh);

      // Flowing energy photon (Initially Hidden: visible only on hover)
      const photonGeo = new THREE.SphereGeometry(3.6, 16, 16);
      const photonMat = new THREE.MeshBasicMaterial({
        color: 0xffffff,
        transparent: true,
        opacity: 0.95
      });
      const photonMesh = new THREE.Mesh(photonGeo, photonMat);
      photonMesh.visible = false;
      scene.add(photonMesh);

      connectionObjs.push({
        from: conn.from,
        to: conn.to,
        curve,
        tubeMesh,
        tubeMat,
        photonMesh,
        photonMat
      });
    });

    // 9. Reactive Hover Graph State Controller (Syncs 3D view with 2D DAG rules)
    const updateGraphStates = (targetId: string | null) => {
      // 1. Connection Links (Hidden by default, reveal on hover)
      connectionObjs.forEach((c) => {
        if (!targetId) {
          c.tubeMesh.visible = false;
          c.photonMesh.visible = false;
          return;
        }

        const isIncoming = c.to === targetId;
        const isOutgoing = c.from === targetId;

        if (isIncoming) {
          // Incoming Upstream Link: Electric Cyan
          c.tubeMesh.visible = true;
          c.photonMesh.visible = true;
          c.tubeMat.color.copy(CYAN_COLOR);
          c.tubeMat.emissive.copy(CYAN_EMISSIVE);
          c.tubeMat.emissiveIntensity = 1.0;
          c.tubeMat.opacity = 0.9;
          c.photonMat.color.setHex(0xe0faff);
        } else if (isOutgoing) {
          // Outgoing Downstream Link: Radiant Golden Amber
          c.tubeMesh.visible = true;
          c.photonMesh.visible = true;
          c.tubeMat.color.copy(AMBER_COLOR);
          c.tubeMat.emissive.copy(AMBER_EMISSIVE);
          c.tubeMat.emissiveIntensity = 1.0;
          c.tubeMat.opacity = 0.9;
          c.photonMat.color.setHex(0xfffbeb);
        } else {
          // Unrelated Link: Completely Hidden
          c.tubeMesh.visible = false;
          c.photonMesh.visible = false;
        }
      });

      // 2. Domain Nodes (Preserve individual colors + highlight active drivers/impacts)
      nodeDataList.forEach(({ dom, group, sphereMat, haloMat, spriteMat }) => {
        if (!targetId) {
          // Nominal State: all 9 nodes visible in their distinctive individual colors
          sphereMat.color.setStyle(dom.color);
          sphereMat.emissive.setStyle(dom.color);
          sphereMat.emissiveIntensity = 0.85;
          haloMat.color.setStyle(dom.color);
          haloMat.opacity = 0.75;
          spriteMat.opacity = 0.95;
          group.scale.set(1, 1, 1);
          return;
        }

        const isHoveredNode = dom.id === targetId;
        const isUpstream = CONNECTIONS_3D.some((c) => c.to === targetId && c.from === dom.id);
        const isDownstream = CONNECTIONS_3D.some((c) => c.from === targetId && c.to === dom.id);

        if (isHoveredNode) {
          // Hovered Domain: peak luminance in its signature color + expanded aura
          sphereMat.color.setStyle(dom.color);
          sphereMat.emissive.setStyle(dom.color);
          sphereMat.emissiveIntensity = 1.7;
          haloMat.color.setStyle(dom.color);
          haloMat.opacity = 1.0;
          spriteMat.opacity = 1.0;
          group.scale.set(1.15, 1.15, 1.15);
        } else if (isUpstream) {
          // Upstream Driver: Cyan ring highlight + individual domain core
          sphereMat.color.setStyle(dom.color);
          sphereMat.emissive.setStyle(dom.color);
          sphereMat.emissiveIntensity = 1.15;
          haloMat.color.copy(CYAN_COLOR);
          haloMat.opacity = 0.95;
          spriteMat.opacity = 1.0;
          group.scale.set(1.08, 1.08, 1.08);
        } else if (isDownstream) {
          // Downstream Impact: Amber ring highlight + individual domain core
          sphereMat.color.setStyle(dom.color);
          sphereMat.emissive.setStyle(dom.color);
          sphereMat.emissiveIntensity = 1.15;
          haloMat.color.copy(AMBER_COLOR);
          haloMat.opacity = 0.95;
          spriteMat.opacity = 1.0;
          group.scale.set(1.08, 1.08, 1.08);
        } else {
          // Dimmed unrelated domain node
          sphereMat.emissiveIntensity = 0.15;
          haloMat.opacity = 0.12;
          spriteMat.opacity = 0.2;
          group.scale.set(0.92, 0.92, 0.92);
        }
      });
    };

    // 10. Raycaster & Pointer Event Listeners
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
        if (hoveredDomainRef.current?.id !== dom.id) {
          hoveredDomainRef.current = dom;
          setHoveredDomain(dom);
          updateGraphStates(dom.id);
        }
        setTooltipPos({ x: e.clientX - rect.left, y: e.clientY - rect.top });
        renderer.domElement.style.cursor = 'pointer';
      } else {
        if (hoveredDomainRef.current !== null) {
          hoveredDomainRef.current = null;
          setHoveredDomain(null);
          updateGraphStates(null);
        }
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

    // 11. Resize Handler
    const handleResize = () => {
      if (!container || !renderer) return;
      const w = container.clientWidth;
      camera.aspect = w / height;
      camera.updateProjectionMatrix();
      renderer.setSize(w, height);
    };
    window.addEventListener('resize', handleResize);

    // 12. Animation Loop (60 FPS)
    let animId: number;
    const clock = new THREE.Clock();

    const animate = () => {
      animId = requestAnimationFrame(animate);
      const elapsedTime = clock.getElapsedTime();

      // Slowly rotate celestial starfield
      particleSystem.rotation.y = elapsedTime * 0.025;

      // Animate node halos & pulsating inner rings
      nodeDataList.forEach(({ haloMesh, innerHaloMesh }, i) => {
        haloMesh.rotation.z = elapsedTime * 0.4 + i;
        innerHaloMesh.rotation.y = elapsedTime * -0.6 + i;
      });

      // Animate flowing photons ONLY along active visible conduits
      connectionObjs.forEach((c, idx) => {
        if (c.photonMesh.visible) {
          const t = (elapsedTime * 0.4 + idx * 0.15) % 1;
          const pos = c.curve.getPointAt(t);
          c.photonMesh.position.copy(pos);
        }
      });

      controls.update();
      renderer.render(scene, camera);
    };
    animate();

    // 13. Cleanup on Unmount
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
      <div className="absolute top-4 left-4 z-10 flex flex-wrap items-center gap-2">
        <div className="px-3 py-1.5 rounded-xl bg-polar-dark/90 border border-polar-border/80 backdrop-blur-md flex items-center gap-2 text-xs font-mono text-slate-300 shadow-xl">
          <Compass className="w-4 h-4 text-cyan-400 animate-spin-slow" />
          <span className="font-bold text-white">3D Antarctic Spatial Twin</span>
          <span className="text-slate-500">•</span>
          <span className="text-[11px] text-cyan-300">Drag to Orbit • Scroll to Zoom • Click Node to Enter</span>
        </div>

        <span className="text-xs font-mono text-cyan-300 font-semibold px-3 py-1.5 rounded-xl bg-cyan-950/80 border border-cyan-500/40 flex items-center gap-2 shadow-lg backdrop-blur-md">
          <span className="w-2 h-2 rounded-full bg-cyan-400 animate-ping" />
          <span>Hover over any domain to reveal its causal links</span>
        </span>
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
          <div className="glass-panel p-3.5 rounded-2xl border-2 shadow-2xl bg-polar-navy/95 min-w-[250px] text-xs font-mono" style={{ borderColor: hoveredDomain.color }}>
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

export default ThreeDomainGraph;

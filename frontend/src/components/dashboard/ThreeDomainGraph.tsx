import React, { useEffect, useRef, useState, useMemo } from 'react';
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { useNavigate } from 'react-router-dom';
import { useTelemetryStore } from '../../store/telemetryStore';
import { ExternalLink, RotateCcw, Play, Pause, X, Pin } from 'lucide-react';
import { TREE_NODES } from './CrossDomainCausalTree';
import { OperationalDomainCard } from './OperationalDomainCard';

interface Domain3DDef {
  id: string;
  name: string;
  shortName: string;
  route: string;
  color: string;
  pos: [number, number, number];
  role: string;
}

// 9 Domains organized in strict 3D Causal Priority Tiers with distinct vibrant hues
const DOMAINS_3D: Domain3DDef[] = [
  // Tier 1: Primary Environmental & Supply Forcing (Top Level: Y = +190)
  { id: 'environment', name: 'Environment & Weather', shortName: 'Environment', route: 'environment', color: '#00e5ff', pos: [-140, 190, 40], role: 'Tier 1 • Root Climate Driver' },
  { id: 'logistics', name: 'Transportation & Logistics', shortName: 'Logistics', route: 'logistics', color: '#f97316', pos: [140, 190, -40], role: 'Tier 1 • Expedition Resupply' },

  // Tier 2: Storage Reserves & Conversion Machinery (Upper-Mid Level: Y = +65)
  { id: 'fuel', name: 'Fuel Storage', shortName: 'Fuel', route: 'fuel', color: '#ef4444', pos: [-260, 65, 50], role: 'Tier 2 • Energy Reserve' },
  { id: 'inventory', name: 'Storage & Inventory', shortName: 'Inventory', route: 'inventory', color: '#14b8a6', pos: [0, 65, -200], role: 'Tier 2 • Critical Spares' },
  { id: 'equipment', name: 'Equipment & Machinery', shortName: 'Equipment', route: 'equipment', color: '#22c55e', pos: [240, 65, 70], role: 'Tier 2 • Power Conversion' },

  // Tier 3: Central Microgrid Power Core (Central Level: Y = -40)
  { id: 'energy', name: 'Energy & Power', shortName: 'Energy & Power', route: 'resources', color: '#eab308', pos: [0, -40, 20], role: 'Tier 3 • Central Microgrid' },

  // Tier 4: Life Support, Human Habitation & Telemetry (Bottom Level: Y = -180)
  { id: 'water', name: 'Water Supply', shortName: 'Water', route: 'water', color: '#2563eb', pos: [-230, -180, 40], role: 'Tier 4 • Water Lifeline' },
  { id: 'personnel', name: 'Personnel & Occupancy', shortName: 'Personnel', route: 'personnel', color: '#ec4899', pos: [0, -205, 130], role: 'Tier 4 • Habitat Habitation' },
  { id: 'communication', name: 'Communication', shortName: 'Communication', route: 'communication', color: '#8b5cf6', pos: [230, -180, -40], role: 'Tier 4 • SCADA Telemetry' },
];

// Pristine directed causal dependencies matching 2D cross-domain tree
interface Connection3DDef {
  from: string;
  to: string;
  label: string;
}

const CONNECTIONS_3D: Connection3DDef[] = [
  // Tier 1 -> Tier 1 & Downward
  { from: 'environment', to: 'logistics', label: 'Katabatic wind & blizzards' },
  { from: 'environment', to: 'energy', label: 'Heating demand & PV offset' },
  { from: 'environment', to: 'water', label: 'Conduit freeze hazard' },
  { from: 'environment', to: 'communication', label: 'Blizzard ionization & RF attenuation' },
  { from: 'logistics', to: 'fuel', label: 'Annual diesel replenishment' },
  { from: 'logistics', to: 'inventory', label: 'Spares & consumables restock' },

  // Tier 2 -> Tier 2 & Tier 3
  { from: 'inventory', to: 'equipment', label: 'Bearings & filter staging' },
  { from: 'fuel', to: 'energy', label: '17.5 L/hr diesel supply' },
  { from: 'equipment', to: 'energy', label: 'Genset alternator uptime' },

  // Tier 3 -> Tier 4
  { from: 'energy', to: 'water', label: '4.2 kW trace line heating' },
  { from: 'energy', to: 'personnel', label: 'Habitat heating & power' },
  { from: 'energy', to: 'communication', label: 'Radome UPS & uplink power' },

  // Tier 4 peer interactions
  { from: 'water', to: 'personnel', label: 'Filtered potable hydration' },
  { from: 'personnel', to: 'communication', label: 'Operator SCADA command' },
];

interface Props {
  stationId: string;
  domainData?: Record<string, any>;
  onSelectDomain?: (domainId: string) => void;
}

export const ThreeDomainGraph: React.FC<Props> = ({ stationId, domainData, onSelectDomain }) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const calloutRef = useRef<HTMLDivElement>(null);
  const calloutLineRef = useRef<SVGLineElement>(null);
  const reticleCircleRef = useRef<SVGCircleElement>(null);

  const navigate = useNavigate();
  const { liveSnapshot } = useTelemetryStore();
  const isMaitri = stationId === 'maitri';
  const snapshot = liveSnapshot[stationId];

  const [selectedDomain, setSelectedDomain] = useState<Domain3DDef | null>(null);
  const selectedDomainRef = useRef<Domain3DDef | null>(null);

  const controlsRef = useRef<OrbitControls | null>(null);
  const updateGraphStatesRef = useRef<((id: string | null) => void) | null>(null);

  useEffect(() => {
    selectedDomainRef.current = selectedDomain;
  }, [selectedDomain]);

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
    controls.autoRotate = true;
    controls.autoRotateSpeed = 0.75;
    controls.maxPolarAngle = Math.PI * 0.85;
    controls.minPolarAngle = Math.PI * 0.15;
    controlsRef.current = controls;

    // 4. Lighting Setup - Balanced illumination to ensure all 9 distinct globe colors pop vividly
    const ambientLight = new THREE.AmbientLight(0xffffff, 1.4);
    scene.add(ambientLight);

    const keyLight = new THREE.DirectionalLight(0xffffff, 2.2);
    keyLight.position.set(300, 400, 300);
    scene.add(keyLight);

    const fillLight = new THREE.DirectionalLight(0x7dd3fc, 0.9);
    fillLight.position.set(-300, -200, -200);
    scene.add(fillLight);

    const centerGlow = new THREE.PointLight(0x0284c7, 1.8, 600);
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

      // Expanded hit target sphere (radius 46) - transparent material with opacity 0 so raycasting intersects reliably without clipping
      const hitGeo = new THREE.SphereGeometry(46, 16, 16);
      const hitMat = new THREE.MeshBasicMaterial({
        transparent: true,
        opacity: 0.0,
        depthWrite: false
      });
      const hitMesh = new THREE.Mesh(hitGeo, hitMat);
      hitMesh.userData = { domain: dom };
      group.add(hitMesh);
      nodeMeshes.push(hitMesh);

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

      // Inner pulsating core ring matching domain signature color
      const innerHaloGeo = new THREE.TorusGeometry(26, 0.9, 16, 64);
      const innerHaloMat = new THREE.MeshBasicMaterial({
        color: new THREE.Color(dom.color),
        transparent: true,
        opacity: 0.55
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
    const CYAN_EMISSIVE = new THREE.Color(0x00d8ff);
    const AMBER_COLOR = new THREE.Color(0xfbbf24);
    const AMBER_EMISSIVE = new THREE.Color(0xf59e0b);

    interface ConnectionObj {
      from: string;
      to: string;
      curve: THREE.QuadraticBezierCurve3;
      tubeMesh: THREE.Mesh;
      tubeMat: THREE.MeshStandardMaterial;
      arrowMesh: THREE.Mesh;
      arrowMat: THREE.MeshBasicMaterial;
      photonMesh1: THREE.Mesh;
      photonMat1: THREE.MeshBasicMaterial;
      photonMesh2: THREE.Mesh;
      photonMat2: THREE.MeshBasicMaterial;
    }
    const connectionObjs: ConnectionObj[] = [];

    CONNECTIONS_3D.forEach((conn) => {
      const fromPos = nodeMap.get(conn.from);
      const toPos = nodeMap.get(conn.to);
      if (!fromPos || !toPos) return;

      // Arc midpoint elevated outward away from graph center to prevent globe collision
      const mid = new THREE.Vector3().addVectors(fromPos, toPos).multiplyScalar(0.5);
      const outwardDir = mid.clone().normalize();
      if (outwardDir.length() < 0.1) outwardDir.set(0, 0, 1);
      const dist = fromPos.distanceTo(toPos);
      mid.addScaledVector(outwardDir, dist * 0.22);

      const curve = new THREE.QuadraticBezierCurve3(fromPos, mid, toPos);

      // Conduit Tube (Initially Hidden: visible only on hover, radius 2.2 for bold glowing vector presence)
      const tubeGeo = new THREE.TubeGeometry(curve, 36, 2.2, 8, false);
      const tubeMat = new THREE.MeshStandardMaterial({
        color: CYAN_COLOR,
        emissive: CYAN_EMISSIVE,
        emissiveIntensity: 1.25,
        transparent: true,
        opacity: 0.9,
        roughness: 0.15
      });
      const tubeMesh = new THREE.Mesh(tubeGeo, tubeMat);
      tubeMesh.visible = false;
      scene.add(tubeMesh);

      // Directional Flow Arrowhead Cone at arc apex (t = 0.55)
      const arrowGeo = new THREE.ConeGeometry(4.2, 10.5, 8);
      arrowGeo.rotateX(Math.PI / 2);
      const arrowMat = new THREE.MeshBasicMaterial({
        color: CYAN_COLOR,
        transparent: true,
        opacity: 0.95
      });
      const arrowMesh = new THREE.Mesh(arrowGeo, arrowMat);
      const apexPos = curve.getPointAt(0.55);
      const apexTangent = curve.getTangentAt(0.55).normalize();
      arrowMesh.position.copy(apexPos);
      arrowMesh.quaternion.setFromUnitVectors(new THREE.Vector3(0, 0, 1), apexTangent);
      arrowMesh.visible = false;
      scene.add(arrowMesh);

      // Dual Flowing energy photons (Initially Hidden: visible only on hover)
      const photonGeo = new THREE.SphereGeometry(4.0, 16, 16);
      const photonMat1 = new THREE.MeshBasicMaterial({
        color: 0xffffff,
        transparent: true,
        opacity: 0.95
      });
      const photonMesh1 = new THREE.Mesh(photonGeo, photonMat1);
      photonMesh1.visible = false;
      scene.add(photonMesh1);

      const photonMat2 = new THREE.MeshBasicMaterial({
        color: 0xffffff,
        transparent: true,
        opacity: 0.95
      });
      const photonMesh2 = new THREE.Mesh(photonGeo, photonMat2);
      photonMesh2.visible = false;
      scene.add(photonMesh2);

      connectionObjs.push({
        from: conn.from,
        to: conn.to,
        curve,
        tubeMesh,
        tubeMat,
        arrowMesh,
        arrowMat,
        photonMesh1,
        photonMat1,
        photonMesh2,
        photonMat2
      });
    });

    // 9. Reactive Hover Graph State Controller (Syncs 3D view with 2D DAG rules)
    const updateGraphStates = (targetId: string | null) => {
      // 1. Connection Links (Hidden by default, reveal on hover)
      connectionObjs.forEach((c) => {
        if (!targetId) {
          c.tubeMesh.visible = false;
          c.arrowMesh.visible = false;
          c.photonMesh1.visible = false;
          c.photonMesh2.visible = false;
          return;
        }

        const isIncoming = c.to === targetId;
        const isOutgoing = c.from === targetId;

        if (isIncoming) {
          // Incoming Upstream Link: Electric Cyan (#00f2fe)
          c.tubeMesh.visible = true;
          c.arrowMesh.visible = true;
          c.photonMesh1.visible = true;
          c.photonMesh2.visible = true;

          c.tubeMat.color.copy(CYAN_COLOR);
          c.tubeMat.emissive.copy(CYAN_EMISSIVE);
          c.tubeMat.emissiveIntensity = 1.35;
          c.tubeMat.opacity = 0.95;

          c.arrowMat.color.copy(CYAN_COLOR);
          c.photonMat1.color.setHex(0xe0faff);
          c.photonMat2.color.setHex(0xe0faff);
        } else if (isOutgoing) {
          // Outgoing Downstream Link: Radiant Golden Amber (#fbbf24)
          c.tubeMesh.visible = true;
          c.arrowMesh.visible = true;
          c.photonMesh1.visible = true;
          c.photonMesh2.visible = true;

          c.tubeMat.color.copy(AMBER_COLOR);
          c.tubeMat.emissive.copy(AMBER_EMISSIVE);
          c.tubeMat.emissiveIntensity = 1.35;
          c.tubeMat.opacity = 0.95;

          c.arrowMat.color.copy(AMBER_COLOR);
          c.photonMat1.color.setHex(0xfffbeb);
          c.photonMat2.color.setHex(0xfffbeb);
        } else {
          // Unrelated Link: Completely Hidden
          c.tubeMesh.visible = false;
          c.arrowMesh.visible = false;
          c.photonMesh1.visible = false;
          c.photonMesh2.visible = false;
        }
      });

      // 2. Domain Nodes (Preserve individual colors + highlight active drivers/impacts)
      nodeDataList.forEach(({ dom, group, sphereMesh, sphereMat, haloMesh, haloMat, innerHaloMat, spriteMat }) => {
        // Keep group.scale strictly at (1, 1, 1) so hitMesh world hitbox stays completely static and raycaster never jitters!
        group.scale.set(1, 1, 1);

        if (!targetId) {
          // Nominal State: all 9 nodes visible in their distinctive individual colors
          sphereMat.color.setStyle(dom.color);
          sphereMat.emissive.setStyle(dom.color);
          sphereMat.emissiveIntensity = 0.85;
          haloMat.color.setStyle(dom.color);
          haloMat.opacity = 0.75;
          innerHaloMat.color.setStyle(dom.color);
          innerHaloMat.opacity = 0.55;
          spriteMat.opacity = 0.95;
          sphereMesh.scale.set(1, 1, 1);
          haloMesh.scale.set(1, 1, 1);
          return;
        }

        const isHoveredNode = dom.id === targetId;
        const isUpstream = CONNECTIONS_3D.some((c) => c.to === targetId && c.from === dom.id);
        const isDownstream = CONNECTIONS_3D.some((c) => c.from === targetId && c.to === dom.id);

        if (isHoveredNode) {
          // Active Domain: peak luminance in its signature color + expanded aura
          sphereMat.color.setStyle(dom.color);
          sphereMat.emissive.setStyle(dom.color);
          sphereMat.emissiveIntensity = 1.8;
          haloMat.color.setStyle(dom.color);
          haloMat.opacity = 1.0;
          innerHaloMat.color.setStyle(dom.color);
          innerHaloMat.opacity = 0.95;
          spriteMat.opacity = 1.0;
          sphereMesh.scale.set(1.2, 1.2, 1.2);
          haloMesh.scale.set(1.15, 1.15, 1.15);
        } else if (isUpstream) {
          // Upstream Driver: Cyan ring highlight + individual domain core
          sphereMat.color.setStyle(dom.color);
          sphereMat.emissive.setStyle(dom.color);
          sphereMat.emissiveIntensity = 1.2;
          haloMat.color.copy(CYAN_COLOR);
          haloMat.opacity = 0.95;
          innerHaloMat.color.setStyle(dom.color);
          innerHaloMat.opacity = 0.7;
          spriteMat.opacity = 1.0;
          sphereMesh.scale.set(1.08, 1.08, 1.08);
          haloMesh.scale.set(1.08, 1.08, 1.08);
        } else if (isDownstream) {
          // Downstream Impact: Amber ring highlight + individual domain core
          sphereMat.color.setStyle(dom.color);
          sphereMat.emissive.setStyle(dom.color);
          sphereMat.emissiveIntensity = 1.2;
          haloMat.color.copy(AMBER_COLOR);
          haloMat.opacity = 0.95;
          innerHaloMat.color.setStyle(dom.color);
          innerHaloMat.opacity = 0.7;
          spriteMat.opacity = 1.0;
          sphereMesh.scale.set(1.08, 1.08, 1.08);
          haloMesh.scale.set(1.08, 1.08, 1.08);
        } else {
          // Dimmed unrelated domain node
          sphereMat.emissiveIntensity = 0.15;
          haloMat.opacity = 0.12;
          innerHaloMat.opacity = 0.08;
          spriteMat.opacity = 0.2;
          sphereMesh.scale.set(0.92, 0.92, 0.92);
          haloMesh.scale.set(0.92, 0.92, 0.92);
        }
      });
    };

    updateGraphStatesRef.current = updateGraphStates;

    // 10. Raycaster & Pointer Event Listeners (Click to select & show card)
    const raycaster = new THREE.Raycaster();
    const mouse = new THREE.Vector2(-999, -999);
    let pointerDownPos = { x: 0, y: 0 };

    const onPointerDown = (e: MouseEvent) => {
      pointerDownPos = { x: e.clientX, y: e.clientY };
    };

    const onPointerMove = (e: MouseEvent) => {
      const rect = renderer.domElement.getBoundingClientRect();
      mouse.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
      mouse.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;

      raycaster.setFromCamera(mouse, camera);
      const intersects = raycaster.intersectObjects(nodeMeshes);

      if (intersects.length > 0) {
        renderer.domElement.style.cursor = 'pointer';
      } else {
        renderer.domElement.style.cursor = 'grab';
      }
    };

    const onClick = (e: MouseEvent) => {
      // If user was dragging to rotate orbit, ignore click
      if (Math.hypot(e.clientX - pointerDownPos.x, e.clientY - pointerDownPos.y) > 6) {
        return;
      }

      const rect = renderer.domElement.getBoundingClientRect();
      mouse.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
      mouse.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;

      raycaster.setFromCamera(mouse, camera);
      const intersects = raycaster.intersectObjects(nodeMeshes);

      if (intersects.length > 0) {
        const hit = intersects[0].object as THREE.Mesh;
        const dom = hit.userData.domain as Domain3DDef;
        selectedDomainRef.current = dom;
        setSelectedDomain(dom);
        updateGraphStates(dom.id);
      } else {
        // Clicked outside any globe: hide the card and return graph to nominal
        selectedDomainRef.current = null;
        setSelectedDomain(null);
        updateGraphStates(null);
      }
    };

    const onDblClick = (e: MouseEvent) => {
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

    renderer.domElement.addEventListener('pointerdown', onPointerDown);
    renderer.domElement.addEventListener('pointermove', onPointerMove);
    renderer.domElement.addEventListener('click', onClick);
    renderer.domElement.addEventListener('dblclick', onDblClick);

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

      // Animate dual flowing photons along active visible conduits
      connectionObjs.forEach((c, idx) => {
        if (c.tubeMesh.visible) {
          const t1 = (elapsedTime * 0.45 + idx * 0.15) % 1;
          const pos1 = c.curve.getPointAt(t1);
          c.photonMesh1.position.copy(pos1);

          const t2 = (elapsedTime * 0.45 + idx * 0.15 + 0.5) % 1;
          const pos2 = c.curve.getPointAt(t2);
          c.photonMesh2.position.copy(pos2);
        }
      });

      // Orbit continuously rotates uninterruptedly
      controls.autoRotate = true;

      // Project active clicked 3D node to screen space with SMART STANDOFF DISTANCE
      const targetDomain = selectedDomainRef.current;
      if (targetDomain && calloutRef.current) {
        const v = new THREE.Vector3(...targetDomain.pos);
        v.project(camera);

        if (v.z > 1.0) {
          // Node is behind the camera plane
          calloutRef.current.style.display = 'none';
          if (calloutLineRef.current) calloutLineRef.current.style.display = 'none';
          if (reticleCircleRef.current) reticleCircleRef.current.style.display = 'none';
        } else {
          calloutRef.current.style.display = 'block';
          if (calloutLineRef.current) calloutLineRef.current.style.display = 'block';
          if (reticleCircleRef.current) reticleCircleRef.current.style.display = 'block';

          const currentW = container.clientWidth;
          const nx = (v.x * 0.5 + 0.5) * currentW;
          const ny = (-v.y * 0.5 + 0.5) * height;

          const cardW = 430;
          const cardH = 240;

          // ── SMART OUTWARD STANDOFF CALCULATION ──
          // Links congregate inward toward other constellation domains.
          // By pushing the hover card outward away from the center of the graph,
          // the card never crosses or blocks any of the connected conduits.
          const isRightHalf = nx > currentW * 0.5;
          let cardX: number;

          if (isRightHalf) {
            // Push rightward with at least 195px standoff
            const preferredX = nx + 195;
            if (preferredX + cardW <= currentW - 20) {
              cardX = preferredX;
            } else if (nx < currentW - cardW - 70) {
              cardX = currentW - cardW - 20;
            } else {
              // Edge fallback: place to the far left with large clearance
              cardX = Math.max(20, nx - cardW - 195);
            }
          } else {
            // Push leftward with at least 195px standoff
            const preferredX = nx - cardW - 195;
            if (preferredX >= 20) {
              cardX = preferredX;
            } else if (nx > cardW + 70) {
              cardX = 20;
            } else {
              // Edge fallback: place to the far right with large clearance
              cardX = Math.min(currentW - cardW - 20, nx + 195);
            }
          }

          // Vertical placement: keep comfortable margin and offset vertically
          const isBottomHalf = ny > height * 0.5;
          let rawY = isBottomHalf ? ny - cardH - 25 : ny + 25;
          const cardY = Math.max(70, Math.min(height - cardH - 24, rawY));

          calloutRef.current.style.transform = `translate3d(${cardX}px, ${cardY}px, 0)`;

          // Connect card to node using cyber tracer leader line
          const attachX = cardX > nx ? cardX : cardX + cardW;
          const attachY = Math.max(cardY + 24, Math.min(cardY + cardH - 24, ny));

          if (calloutLineRef.current) {
            calloutLineRef.current.setAttribute('x1', `${nx}`);
            calloutLineRef.current.setAttribute('y1', `${ny}`);
            calloutLineRef.current.setAttribute('x2', `${attachX}`);
            calloutLineRef.current.setAttribute('y2', `${attachY}`);
            calloutLineRef.current.setAttribute('stroke', targetDomain.color);
          }
          if (reticleCircleRef.current) {
            reticleCircleRef.current.setAttribute('cx', `${nx}`);
            reticleCircleRef.current.setAttribute('cy', `${ny}`);
            reticleCircleRef.current.setAttribute('stroke', targetDomain.color);
          }
        }
      } else if (calloutRef.current) {
        calloutRef.current.style.display = 'none';
        if (calloutLineRef.current) calloutLineRef.current.style.display = 'none';
        if (reticleCircleRef.current) reticleCircleRef.current.style.display = 'none';
      }

      controls.update();
      renderer.render(scene, camera);
    };
    animate();

    // 13. Cleanup on Unmount
    return () => {
      cancelAnimationFrame(animId);
      updateGraphStatesRef.current = null;
      window.removeEventListener('resize', handleResize);
      renderer.domElement.removeEventListener('pointerdown', onPointerDown);
      renderer.domElement.removeEventListener('pointermove', onPointerMove);
      renderer.domElement.removeEventListener('click', onClick);
      renderer.domElement.removeEventListener('dblclick', onDblClick);
      renderer.dispose();
      scene.clear();
    };
  }, [stationId, navigate]);

  const handleResetCamera = () => {
    if (controlsRef.current) {
      controlsRef.current.reset();
    }
  };

  // Fallback Live KPIs per domain
  const fallbackData = useMemo(() => {
    const env = snapshot?.environment;
    const eng = snapshot?.energy;
    const fl = snapshot?.fuel;
    const wt = snapshot?.water;
    const eq = snapshot?.equipment;
    const pers = snapshot?.personnel;
    const comm = snapshot?.communication;

    return {
      environment: {
        score: 86,
        primaryKpi: `${env?.temperature?.toFixed(1) ?? (isMaitri ? -25.2 : -18.4)}°C`,
        primaryLabel: 'Ambient Temp',
        chillC: isMaitri ? -38.4 : -31.2,
        windSpeed: env?.wind_speed ?? (isMaitri ? 32 : 44),
        windGust: env?.wind_gust ?? (isMaitri ? 54 : 68),
      },
      logistics: {
        score: 88,
        primaryKpi: isMaitri ? '88 Days' : '102 Days',
        primaryLabel: 'Resupply ETA',
        journeyProgressPct: isMaitri ? 65 : 40,
        transportMode: isMaitri ? '100km PistenBully Polar Convoy' : 'MV Vasiliy Golovnin Polar Sea Shuttle',
      },
      fuel: {
        score: 95,
        primaryKpi: `${fl?.fuel_percentage?.toFixed(1) ?? (isMaitri ? 78.0 : 85.7)}%`,
        primaryLabel: 'Reserve Level',
        currentLiters: fl?.current_level ?? (isMaitri ? 142000 : 180000),
        burnRateLh: fl?.consumption_rate_l_per_hr ?? (isMaitri ? 17.5 : 21.2),
        daysRemaining: fl?.days_remaining ?? (isMaitri ? 18 : 24),
      },
      inventory: {
        score: 97,
        primaryKpi: '0 Stockouts',
        primaryLabel: 'Spares Safety Buffer',
        medicalStockDays: isMaitri ? 180 : 240,
        oilStockLiters: isMaitri ? 1200 : 1800,
      },
      equipment: {
        score: 93,
        primaryKpi: `${eq?.avg_health?.toFixed(1) ?? (isMaitri ? 93.5 : 96.2)}%`,
        primaryLabel: 'Fleet Health',
        activeMachinesCount: isMaitri ? 6 : 8,
        vibrationMmS: isMaitri ? 2.1 : 1.4,
      },
      energy: {
        score: 94,
        primaryKpi: `${eng?.generator_load ?? (isMaitri ? 68 : 82)} kW`,
        primaryLabel: 'Generator Load',
        solarKw: eng?.solar_output ?? (isMaitri ? 22 : 28),
        batterySoc: eng?.battery_level ?? (isMaitri ? 92 : 96),
        freqHz: eng?.grid_frequency ?? (isMaitri ? 50.08 : 50.02),
      },
      water: {
        score: 92,
        primaryKpi: `${wt?.storage_liters?.toLocaleString() ?? (isMaitri ? '18,500' : '24,000')} L`,
        primaryLabel: 'Potable Storage',
        percentage: wt?.percentage ?? (isMaitri ? 82 : 88),
        pipeTempC: wt?.pipe_temp_c ?? (isMaitri ? 3.8 : 4.6),
        freezeRisk: wt?.freeze_risk ?? 'LOW',
      },
      personnel: {
        score: 96,
        primaryKpi: `${pers?.headcount ?? (isMaitri ? 25 : 30)} Crew`,
        primaryLabel: 'Total Occupancy',
        occupancyPct: pers?.occupancy_pct ?? (isMaitri ? 62.5 : 75.0),
        totalPersonnel: pers?.headcount ?? (isMaitri ? 25 : 30),
        onDutyCount: isMaitri ? 18 : 22,
        roleBreakdown: [
          { label: 'Science', pct: 40, color: '#38bdf8' },
          { label: 'Eng', pct: 32, color: '#10b981' },
          { label: 'Medical', pct: 12, color: '#ec4899' },
          { label: 'Galley', pct: 16, color: '#f59e0b' }
        ],
      },
      communication: {
        score: 98,
        primaryKpi: `${comm?.bandwidth_mbps ?? (isMaitri ? 120 : 160)} Mbps`,
        primaryLabel: 'LEO Constellation',
        bandwidthMbps: comm?.bandwidth_mbps ?? (isMaitri ? 120 : 160),
        latencyMs: comm?.latency_ms ?? (isMaitri ? 78 : 65),
        syncState: comm?.sync_state ?? 'SYNCED',
      }
    };
  }, [snapshot, isMaitri]);

  const activeDomain = selectedDomain;
  const treeNode = activeDomain ? TREE_NODES.find((n) => n.id === activeDomain.id) : null;
  const activeDomainData = activeDomain
    ? (domainData && domainData[activeDomain.id]) || (fallbackData as any)[activeDomain.id]
    : null;

  // Compute active incoming drivers and outgoing impacts for the active domain
  const incomingDomains = activeDomain
    ? CONNECTIONS_3D.filter((c) => c.to === activeDomain.id)
        .map((c) => DOMAINS_3D.find((d) => d.id === c.from))
        .filter(Boolean) as Domain3DDef[]
    : [];

  const outgoingDomains = activeDomain
    ? CONNECTIONS_3D.filter((c) => c.from === activeDomain.id)
        .map((c) => DOMAINS_3D.find((d) => d.id === c.to))
        .filter(Boolean) as Domain3DDef[]
    : [];

  return (
    <div ref={containerRef} className="relative w-full rounded-2xl overflow-hidden bg-[#020814] border border-polar-border/60 select-none">
      <canvas ref={canvasRef} className="w-full block" style={{ height: '680px' }} />

      <div className="absolute top-4 right-4 z-10 flex items-center gap-2">

        <button
          onClick={handleResetCamera}
          className="px-3 py-1.5 rounded-xl text-xs font-mono font-bold bg-polar-dark/90 hover:bg-polar-dark text-slate-300 hover:text-white border border-polar-border transition-all flex items-center gap-1.5 shadow-md"
          title="Reset Camera Orientation"
        >
          <RotateCcw className="w-3.5 h-3.5 text-cyan-400" />
          <span>Reset View</span>
        </button>
      </div>

      {/* ── Holographic SVG Leader Line & Reticle Overlay ── */}
      <svg className="absolute inset-0 w-full h-full pointer-events-none z-20">
        <defs>
          <filter id="tracerGlow" x="-20%" y="-20%" width="140%" height="140%">
            <feGaussianBlur stdDeviation="2" result="blur" />
            <feMerge>
              <feMergeNode in="blur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
        </defs>

        {/* Outer targeting reticle ring */}
        <circle
          ref={reticleCircleRef}
          r={30}
          fill="none"
          stroke={activeDomain ? activeDomain.color : '#00f2fe'}
          strokeWidth={1.8}
          strokeDasharray="5 3"
          opacity={0.85}
          style={{ display: 'none' }}
          filter="url(#tracerGlow)"
        />

        {/* High-tech laser tracer line connecting domain to the offset hover card */}
        <line
          ref={calloutLineRef}
          stroke={activeDomain ? activeDomain.color : '#00f2fe'}
          strokeWidth={1.8}
          strokeDasharray="4 3"
          opacity={0.75}
          style={{ display: 'none' }}
          filter="url(#tracerGlow)"
        />
      </svg>

      {/* ── Floating Holographic Callout Card (Shown ONLY upon clicking on a globe) ── */}
      <div
        ref={calloutRef}
        className="absolute top-0 left-0 z-30 pointer-events-auto transition-opacity duration-150"
        style={{ display: 'none', willChange: 'transform' }}
      >
        {activeDomain && treeNode && activeDomainData && (
          <div className="w-[430px] shadow-2xl backdrop-blur-xl transition-all relative">
            {/* Direct Close / Dismiss Button */}
            <button
              onClick={(e) => {
                e.stopPropagation();
                setSelectedDomain(null);
                selectedDomainRef.current = null;
                updateGraphStatesRef.current?.(null);
              }}
              className="absolute -top-3 -right-3 z-50 p-1.5 rounded-full bg-slate-900/95 text-slate-400 hover:text-white border border-slate-700 hover:border-cyan-400 shadow-xl transition-all cursor-pointer"
              title="Close Card"
            >
              <X className="w-3.5 h-3.5" />
            </button>
            <OperationalDomainCard
              node={treeNode}
              data={activeDomainData}
              stationId={stationId}
              isHovered={true}
              showFooterButtons={false}
              causalConduits={{
                incoming: incomingDomains,
                outgoing: outgoingDomains,
                onFocusDomain: (d) => {
                  setSelectedDomain(d);
                  selectedDomainRef.current = d;
                  updateGraphStatesRef.current?.(d.id);
                }
              }}
              onClick={() => navigate(`/station/${stationId}/${treeNode.route}`)}
              onSelectDomain={onSelectDomain}
              className="border-2 shadow-2xl cursor-pointer w-full"
              style={{
                borderColor: activeDomain.color,
                boxShadow: `0 0 35px ${activeDomain.color}35`,
              }}
            />
          </div>
        )}
      </div>
    </div>
  );
};

export default ThreeDomainGraph;

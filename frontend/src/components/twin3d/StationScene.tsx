import React, { useRef, useState, useEffect, useCallback, useMemo } from 'react';
import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { TelemetrySnapshot } from '../../types';

// =============================================================================
// Domain Color Palette
// =============================================================================
export const DOMAIN_COLORS: Record<string, string> = {
  main_station:     '#00E5FF', communication:    '#00D4FF', solar_array:      '#FFC107',
  environment:      '#80EFFF', research_lab:     '#A855F7', personnel_area:   '#EF4444',
  power_house:      '#F4C430', fuel_depot:       '#FF5555', storage:          '#22C55E',
  waste_management: '#22C55E', water_facility:   '#3882F6', logistics_area:   '#F97316',
};

interface FacilityDef {
  id: string; label: string; subLabel: string; icon: string;
  color: string; glowHex: number; position: [number, number, number];
  buildType: 'main'|'lab'|'power'|'solar'|'tanks'|'comms'|'housing'|'warehouse'|'tower'|'small';
  scale?: number;
}

const MAITRI_FACILITIES: FacilityDef[] = [
  { id:'main_station',     label:'Main Station',          subLabel:'98% | Operational',      icon:'🏛',  color:'#00E5FF', glowHex:0x00e5ff, position:[0,0,0],     buildType:'main'      },
  { id:'research_lab',     label:'Research Lab',          subLabel:'92% | Active',           icon:'🔬',  color:'#A855F7', glowHex:0xa855f7, position:[-26,0,-18], buildType:'lab'       },
  { id:'power_house',      label:'Power House',           subLabel:'95% | 2 Generators',    icon:'⚡',  color:'#F4C430', glowHex:0xf4c430, position:[26,0,-16],  buildType:'power'     },
  { id:'solar_array',      label:'Solar Array',           subLabel:'68% | Generating',       icon:'☀️',  color:'#FFC107', glowHex:0xffc107, position:[10,0,-32],  buildType:'solar'     },
  { id:'fuel_depot',       label:'Fuel Depot',            subLabel:'77% | 19 days',          icon:'🛢',  color:'#FF5555', glowHex:0xff5555, position:[40,0,-8],   buildType:'tanks'     },
  { id:'communication',    label:'Communication',         subLabel:'96% | Online',           icon:'📡',  color:'#00D4FF', glowHex:0x00d4ff, position:[-40,0,-10], buildType:'comms'     },
  { id:'personnel_area',   label:'Personnel Area',        subLabel:'100% | 42 Persons',      icon:'👥',  color:'#EF4444', glowHex:0xef4444, position:[-28,0,16],  buildType:'housing'   },
  { id:'water_facility',   label:'Water Facility',        subLabel:'88% | 1200 L',           icon:'💧',  color:'#3882F6', glowHex:0x3882f6, position:[18,0,16],   buildType:'small'     },
  { id:'waste_management', label:'Waste Management',      subLabel:'82% | Normal',           icon:'♻️',  color:'#22C55E', glowHex:0x22c55e, position:[-14,0,30],  buildType:'small'     },
  { id:'storage',          label:'Storage',               subLabel:'96% | Stable',           icon:'📦',  color:'#22C55E', glowHex:0x22c55e, position:[36,0,14],   buildType:'warehouse' },
  { id:'logistics_area',   label:'Logistics Area',        subLabel:'Next resupply: 88 days', icon:'🚛',  color:'#F97316', glowHex:0xf97316, position:[38,0,28],   buildType:'small'     },
  { id:'environment',      label:'Environment & Weather', subLabel:'-27.5°C | Clear',        icon:'❄️',  color:'#80EFFF', glowHex:0x80efff, position:[28,0,-30],  buildType:'tower'     },
];

const BHARATI_FACILITIES: FacilityDef[] = [
  { id:'main_station',     label:'Main Station',          subLabel:'96% | Operational',      icon:'🏛',  color:'#00E5FF', glowHex:0x00e5ff, position:[0,0,0],     buildType:'main'                },
  { id:'research_lab',     label:'Research Lab',          subLabel:'90% | Active',           icon:'🔬',  color:'#A855F7', glowHex:0xa855f7, position:[-24,0,-16], buildType:'lab',       scale:0.95 },
  { id:'power_house',      label:'Power House',           subLabel:'92% | CHP Online',       icon:'⚡',  color:'#F4C430', glowHex:0xf4c430, position:[24,0,-14],  buildType:'power',     scale:0.9  },
  { id:'solar_array',      label:'Solar Array',           subLabel:'71% | Generating',       icon:'☀️',  color:'#FFC107', glowHex:0xffc107, position:[9,0,-30],   buildType:'solar',     scale:0.95 },
  { id:'fuel_depot',       label:'Fuel Depot',            subLabel:'74% | 22 days',          icon:'🛢',  color:'#FF5555', glowHex:0xff5555, position:[36,0,-6],   buildType:'tanks',     scale:0.9  },
  { id:'communication',    label:'Communication',         subLabel:'94% | Online',           icon:'📡',  color:'#00D4FF', glowHex:0x00d4ff, position:[-36,0,-8],  buildType:'comms'               },
  { id:'personnel_area',   label:'Personnel Area',        subLabel:'100% | 35 Persons',      icon:'👥',  color:'#EF4444', glowHex:0xef4444, position:[-26,0,14],  buildType:'housing',   scale:0.9  },
  { id:'water_facility',   label:'Water Facility',        subLabel:'91% | RO Active',        icon:'💧',  color:'#3882F6', glowHex:0x3882f6, position:[16,0,14],   buildType:'small'               },
  { id:'waste_management', label:'Waste Management',      subLabel:'79% | Normal',           icon:'♻️',  color:'#22C55E', glowHex:0x22c55e, position:[-12,0,28],  buildType:'small'               },
  { id:'storage',          label:'Storage',               subLabel:'88% | Stable',           icon:'📦',  color:'#22C55E', glowHex:0x22c55e, position:[32,0,12],   buildType:'warehouse', scale:0.9  },
  { id:'logistics_area',   label:'Logistics Area',        subLabel:'Next resupply: 62 days', icon:'🚛',  color:'#F97316', glowHex:0xf97316, position:[34,0,26],   buildType:'small'               },
  { id:'environment',      label:'Environment & Weather', subLabel:'-20.6°C | Coastal Wind', icon:'❄️',  color:'#80EFFF', glowHex:0x80efff, position:[26,0,-28],  buildType:'tower'               },
];

const RELATIONSHIPS: Record<string,Array<{target:string;severity:'info'|'warning'|'high'|'critical'}>> = {
  power_house:      [{target:'main_station',severity:'critical'},{target:'research_lab',severity:'high'},{target:'water_facility',severity:'high'},{target:'fuel_depot',severity:'warning'}],
  solar_array:      [{target:'power_house',severity:'info'},{target:'main_station',severity:'info'}],
  fuel_depot:       [{target:'power_house',severity:'critical'},{target:'logistics_area',severity:'high'}],
  water_facility:   [{target:'main_station',severity:'high'},{target:'personnel_area',severity:'high'}],
  communication:    [{target:'main_station',severity:'warning'},{target:'environment',severity:'info'}],
  main_station:     [{target:'personnel_area',severity:'high'},{target:'research_lab',severity:'warning'}],
  environment:      [{target:'main_station',severity:'info'},{target:'logistics_area',severity:'warning'}],
  research_lab:     [{target:'main_station',severity:'info'}],
  personnel_area:   [{target:'main_station',severity:'info'}],
  logistics_area:   [{target:'storage',severity:'info'},{target:'fuel_depot',severity:'warning'}],
  storage:          [{target:'logistics_area',severity:'info'}],
  waste_management: [{target:'main_station',severity:'info'}],
};
const REL_COLORS:Record<string,number>={info:0x00d4ff,warning:0xffc107,high:0xf97316,critical:0xff4444};

// =============================================================================
// Materials & Architectural Helpers (Consistent Neutral Modular Palette)
// =============================================================================

function mat(color:number,roughness=0.62,metalness=0.28):THREE.MeshStandardMaterial{
  return new THREE.MeshStandardMaterial({color,roughness,metalness});
}

// Warm glowing window glass (illuminated interior at dusk/night)
function litWindowMat(intensity=1.8):THREE.MeshStandardMaterial{
  return new THREE.MeshStandardMaterial({
    color:0xffe894,
    roughness:0.25,
    metalness:0.1,
    emissive:new THREE.Color(0xffb733),
    emissiveIntensity:intensity,
  });
}

// Glowing neon domain accent edge line (rooflines & perimeter indicators)
function glowAccentMat(hexColor:number):THREE.MeshStandardMaterial{
  return new THREE.MeshStandardMaterial({
    color:hexColor,
    roughness:0.2,
    metalness:0.8,
    emissive:new THREE.Color(hexColor),
    emissiveIntensity:2.4,
  });
}

// Vibrant Polar Research Station Materials (Domain-Color Identified Cladding)
const MAIN_WALL=mat(0x0284c7,0.55,0.35);    // Vibrant Antarctic Blue/Teal (Main Station)
const MAIN_WING=mat(0x0ea5e9,0.52,0.38);    // Lighter Cyan/Azure Wing Modules
const LAB_WALL=mat(0x7c3aed,0.52,0.35);     // High-Tech Scientific Violet (Research Lab)
const LAB_WING=mat(0x8b5cf6,0.50,0.38);     // Light Violet Cleanroom Annex
const POWER_WALL=mat(0xd97706,0.52,0.38);   // Industrial Safety Golden Amber (Power House)
const POWER_ACC=mat(0xf59e0b,0.48,0.42);    // Bright Amber generator housings
const FUEL_TANK=mat(0xdc2626,0.45,0.45);    // High-Visibility Safety Crimson Red (Fuel Tanks)
const FUEL_ACC=mat(0xef4444,0.42,0.48);     // Bright red dome caps
const HOUSING_WALL=mat(0x2563eb,0.54,0.35); // Polar Habitat Royal Cobalt (Personnel Quarters)
const HOUSING_ACC=mat(0x3b82f6,0.50,0.38);  // Blue accent vestibule
const STORE_WALL=mat(0x059669,0.52,0.38);   // Industrial Polar Emerald Green (Storage Warehouse)
const STORE_ACC=mat(0x10b981,0.48,0.40);    // Bright green cargo bay
const BASE_WALL=mat(0x2563eb,0.55,0.35);    // Default colored modular base
const LIGHT_WALL=mat(0x38bdf8,0.50,0.35);   // Default light accent
const ROOF_DARK=mat(0x0f172a,0.72,0.28);    // Deep dark weather-sealed roof cap
const STEEL_FRAME=mat(0x1e293b,0.40,0.78);  // Structural steel stilts & pilings
const STAINLESS=mat(0xe2e8f0,0.22,0.88);    // Polished stainless steel
const WIN_FRAME=mat(0x0f172a,0.35,0.65);    // Deep frame surrounding glowing glass

// Heavy structural stilt foundation
function addStilts(g:THREE.Group,fw:number,fd:number,sh=0.85,sc=1):void{
  const hw=fw*sc*0.44; const hd=fd*sc*0.44;
  const cols=Math.max(2,Math.round(fw*sc/3));
  const rows=Math.max(2,Math.round(fd*sc/3));

  for(let c=0;c<=cols;c++){
    const tx=(c/cols-0.5)*2*hw;
    for(let r=0;r<=rows;r++){
      const tz=(r/rows-0.5)*2*hd;
      // Stilt column
      const post=new THREE.Mesh(new THREE.CylinderGeometry(0.09*sc,0.11*sc,sh*sc,8),STEEL_FRAME);
      post.position.set(tx,(sh*sc)/2,tz); post.castShadow=true; g.add(post);
      // Footing pad in snow
      const pad=new THREE.Mesh(new THREE.BoxGeometry(0.38*sc,0.12*sc,0.38*sc),STEEL_FRAME);
      pad.position.set(tx,0.06*sc,tz); g.add(pad);
    }
  }

  // Cross-bracing trusses underneath
  const truss=new THREE.Mesh(new THREE.BoxGeometry(fw*sc+0.1*sc,0.14*sc,fd*sc+0.1*sc),STEEL_FRAME);
  truss.position.set(0,sh*sc-0.07*sc,0); g.add(truss);
}

// Panel seam lines on walls
function addPanelSeams(g:THREE.Group,w:number,d:number,h:number,floors:number,baseY:number,sc=1):void{
  const sm=mat(0x111827,0.9,0.1);
  for(let i=1;i<floors;i++){
    const y=baseY+(i/floors)*h*sc;
    for(const zOff of [d*sc*0.5+0.01,-d*sc*0.5-0.01]){
      const s=new THREE.Mesh(new THREE.BoxGeometry(w*sc+0.05,0.035*sc,0.02*sc),sm);
      s.position.set(0,y,zOff); g.add(s);
    }
    for(const xOff of [w*sc*0.5+0.01,-w*sc*0.5-0.01]){
      const s=new THREE.Mesh(new THREE.BoxGeometry(0.02*sc,0.035*sc,d*sc+0.05),sm);
      s.position.set(xOff,y,0); g.add(s);
    }
  }
}

// Helper to add rows of warm glowing multi-pane windows
function addWindows(
  g:THREE.Group,
  cols:number,rows:number,
  winW:number,winH:number,
  spanX:number,
  yStart:number,ySpacing:number,
  zFace:number,
  sc=1,
  intensity=1.8
):void{
  const wMat=litWindowMat(intensity);
  for(let r=0;r<rows;r++){
    const y=yStart+r*ySpacing;
    for(let c=0;c<cols;c++){
      const x=(c-(cols-1)/2)*(spanX/(cols-1||1));
      // Outer window frame
      const frame=new THREE.Mesh(new THREE.BoxGeometry((winW+0.08)*sc,(winH+0.08)*sc,0.04*sc),WIN_FRAME);
      frame.position.set(x,y,zFace); g.add(frame);
      // Warm glowing glass
      const glass=new THREE.Mesh(new THREE.BoxGeometry(winW*sc,winH*sc,0.05*sc),wMat.clone());
      glass.position.set(x,y,zFace+0.01*sc*(zFace>0?1:-1)); g.add(glass);
      // Window mullion cross
      const mullionH=new THREE.Mesh(new THREE.BoxGeometry(winW*sc,0.025*sc,0.06*sc),WIN_FRAME);
      mullionH.position.set(x,y,zFace); g.add(mullionH);
      const mullionV=new THREE.Mesh(new THREE.BoxGeometry(0.025*sc,winH*sc,0.06*sc),WIN_FRAME);
      mullionV.position.set(x,y,zFace); g.add(mullionV);
    }
  }
}

// Rooftop HVAC condenser units
function addHVAC(g:THREE.Group, positions:Array<[number,number,number]>, sc=1):void{
  for(const [x,y,z] of positions){
    const box=new THREE.Mesh(new THREE.BoxGeometry(1.2*sc,0.8*sc,1.0*sc),STEEL_FRAME);
    box.position.set(x,y,z); g.add(box);
    const fan=new THREE.Mesh(new THREE.CylinderGeometry(0.35*sc,0.35*sc,0.08*sc,12),ROOF_DARK);
    fan.position.set(x,y+0.42*sc,z); g.add(fan);
  }
}

// =============================================================================
// 1. Main Station (Multi-story Central Complex with Wings & Airlock Porch)
// =============================================================================
function buildMainStation(sc=1):THREE.Group{
  const g=new THREE.Group(); const SH=0.85;
  const W=9.4; const D=6.2; const H=3.8;
  addStilts(g,W,D,SH,sc);

  // Central 2-story hub building - Vibrant Polar Blue/Cyan
  const body=new THREE.Mesh(new THREE.BoxGeometry(W*sc,H*sc,D*sc),MAIN_WALL);
  body.position.set(0,(SH+H/2)*sc,0); body.castShadow=true; body.receiveShadow=true; g.add(body);
  addPanelSeams(g,W,D,H,2,SH*sc,sc);

  // Stepped West wing - Lighter Cyan module
  const westWing=new THREE.Mesh(new THREE.BoxGeometry(3.6*sc,3.0*sc,4.8*sc),MAIN_WING);
  westWing.position.set(-6.2*sc,(SH+1.5)*sc,0); westWing.castShadow=true; g.add(westWing);

  // Stepped East wing - Lighter Cyan module
  const eastWing=new THREE.Mesh(new THREE.BoxGeometry(3.6*sc,3.0*sc,4.8*sc),MAIN_WING);
  eastWing.position.set(6.2*sc,(SH+1.5)*sc,0); eastWing.castShadow=true; g.add(eastWing);

  // Roof parapet cap on central hub
  const roofY=(SH+H)*sc;
  const roof=new THREE.Mesh(new THREE.BoxGeometry((W+0.2)*sc,0.2*sc,(D+0.2)*sc),ROOF_DARK);
  roof.position.set(0,roofY+0.1*sc,0); g.add(roof);

  // Cyan Glowing Roofline Trim Accent (Matching reference image)
  const cyanGlow=glowAccentMat(0x00e5ff);
  const trimFront=new THREE.Mesh(new THREE.BoxGeometry((W+0.22)*sc,0.08*sc,0.08*sc),cyanGlow);
  trimFront.position.set(0,roofY+0.2*sc,D*sc*0.5+0.04*sc); g.add(trimFront);

  // Rows of warm glowing windows
  // Central Hub - Floor 1 & Floor 2
  addWindows(g,6,2,0.65,0.72,W*sc*0.75,(SH+0.9)*sc,1.45*sc,D*sc*0.5,sc,1.8);
  addWindows(g,6,2,0.65,0.72,W*sc*0.75,(SH+0.9)*sc,1.45*sc,-D*sc*0.5,sc,1.4);
  // Wings windows
  addWindows(g,2,1,0.6,0.65,1.6*sc,(SH+1.2)*sc,0,D*sc*0.4,sc,1.6);

  // Observation Bridge / Cupola on rooftop
  const cupola=new THREE.Mesh(new THREE.BoxGeometry(2.8*sc,1.2*sc,2.2*sc),STEEL_FRAME);
  cupola.position.set(0,roofY+0.7*sc,-0.5*sc); g.add(cupola);
  const cupolaGlass=new THREE.Mesh(new THREE.BoxGeometry(2.6*sc,0.7*sc,2.0*sc),litWindowMat(1.5));
  cupolaGlass.position.set(0,roofY+0.75*sc,-0.5*sc); g.add(cupolaGlass);

  // Covered Entrance Airlock Porch
  const porch=new THREE.Mesh(new THREE.BoxGeometry(3.0*sc,2.2*sc,1.6*sc),LIGHT_WALL);
  porch.position.set(0,(SH+1.1)*sc,D*sc*0.5+0.8*sc); g.add(porch);
  const porchRoof=new THREE.Mesh(new THREE.BoxGeometry(3.2*sc,0.14*sc,1.8*sc),ROOF_DARK);
  porchRoof.position.set(0,(SH+2.2)*sc,D*sc*0.5+0.8*sc); g.add(porchRoof);
  // Warm porch doorway light
  const pLight=new THREE.Mesh(new THREE.SphereGeometry(0.12*sc,8,8),new THREE.MeshStandardMaterial({color:0xffe894,emissive:new THREE.Color(0xffc542),emissiveIntensity:2.5}));
  pLight.position.set(0,(SH+2.0)*sc,D*sc*0.5+1.65*sc); g.add(pLight);
  // Stairs leading down to snow path
  for(let i=0;i<5;i++){
    const st=new THREE.Mesh(new THREE.BoxGeometry(1.8*sc,0.16*sc,0.32*sc),STEEL_FRAME);
    st.position.set(0,(SH-0.08-i*0.14)*sc,D*sc*0.5+(1.6+i*0.28)*sc); g.add(st);
  }

  // Rooftop HVAC & Communications
  addHVAC(g,[[-2.8*sc,roofY+0.55*sc,-1.2*sc],[2.8*sc,roofY+0.55*sc,-1.2*sc]],sc);
  const mast=new THREE.Mesh(new THREE.CylinderGeometry(0.06*sc,0.08*sc,3.8*sc,8),STAINLESS);
  mast.position.set(-3.2*sc,roofY+1.9*sc,-1.8*sc); g.add(mast);
  const beacon=new THREE.Mesh(new THREE.SphereGeometry(0.16*sc,10,10),new THREE.MeshStandardMaterial({color:0xff2200,emissive:new THREE.Color(0xff2200),emissiveIntensity:3.2}));
  beacon.position.set(-3.2*sc,roofY+3.85*sc,-1.8*sc); beacon.userData.beacon=true; g.add(beacon);

  return g;
}

// =============================================================================
// 2. Research Lab (Scientific Modular Unit with Skylight Dome & Sensor Mast)
// =============================================================================
function buildLab(sc=1):THREE.Group{
  const g=new THREE.Group(); const SH=0.8;
  const W=6.8; const D=4.6; const H=3.4;
  addStilts(g,W,D,SH,sc);

  const body=new THREE.Mesh(new THREE.BoxGeometry(W*sc,H*sc,D*sc),LAB_WALL);
  body.position.set(0,(SH+H/2)*sc,0); body.castShadow=true; g.add(body);
  addPanelSeams(g,W,D,H,2,SH*sc,sc);

  // Cleanroom airlock annex - Vibrant Violet
  const annex=new THREE.Mesh(new THREE.BoxGeometry(2.4*sc,2.4*sc,3.2*sc),LAB_WING);
  annex.position.set(-4.5*sc,(SH+1.2)*sc,0); annex.castShadow=true; g.add(annex);

  const roofY=(SH+H)*sc;
  const roof=new THREE.Mesh(new THREE.BoxGeometry((W+0.2)*sc,0.2*sc,(D+0.2)*sc),ROOF_DARK);
  roof.position.set(0,roofY+0.1*sc,0); g.add(roof);

  // Purple Glowing Roofline Trim Accent
  const purpleGlow=glowAccentMat(0xa855f7);
  const trim=new THREE.Mesh(new THREE.BoxGeometry((W+0.22)*sc,0.08*sc,0.08*sc),purpleGlow);
  trim.position.set(0,roofY+0.2*sc,D*sc*0.5+0.04*sc); g.add(trim);

  // Rows of glowing lab windows
  addWindows(g,4,2,0.65,0.68,W*sc*0.7,(SH+0.85)*sc,1.4*sc,D*sc*0.5,sc,1.7);
  addWindows(g,4,2,0.65,0.68,W*sc*0.7,(SH+0.85)*sc,1.4*sc,-D*sc*0.5,sc,1.4);

  // Optical observation dome (translucent tinted sphere)
  const dome=new THREE.Mesh(
    new THREE.SphereGeometry(0.9*sc,16,10,0,Math.PI*2,0,Math.PI/2),
    new THREE.MeshStandardMaterial({color:0xd8b4fe,roughness:0.1,metalness:0.2,transparent:true,opacity:0.75,emissive:new THREE.Color(0xa855f7),emissiveIntensity:0.5})
  );
  dome.position.set(1.2*sc,roofY+0.1*sc,0); g.add(dome);

  // Scientific sensor boom mast
  const mast=new THREE.Mesh(new THREE.CylinderGeometry(0.04*sc,0.06*sc,3.0*sc,8),STAINLESS);
  mast.position.set(-1.8*sc,roofY+1.5*sc,0); g.add(mast);
  const sensor=new THREE.Mesh(new THREE.SphereGeometry(0.12*sc,8,8),new THREE.MeshStandardMaterial({color:0xa855f7,emissive:new THREE.Color(0xa855f7),emissiveIntensity:2.5}));
  sensor.position.set(-1.8*sc,roofY+3.05*sc,0); g.add(sensor);

  return g;
}

// =============================================================================
// 3. Power House (Heavy Generator Plant with 3 Tall Exhaust Stacks & Louvers)
// =============================================================================
function buildPowerHouse(sc=1):THREE.Group{
  const g=new THREE.Group(); const SH=0.75;
  const W=6.8; const D=4.8; const H=3.6;
  addStilts(g,W,D,SH,sc);

  const body=new THREE.Mesh(new THREE.BoxGeometry(W*sc,H*sc,D*sc),POWER_WALL);
  body.position.set(0,(SH+H/2)*sc,0); body.castShadow=true; g.add(body);
  addPanelSeams(g,W,D,H,2,SH*sc,sc);

  const roofY=(SH+H)*sc;
  const roof=new THREE.Mesh(new THREE.BoxGeometry((W+0.2)*sc,0.2*sc,(D+0.2)*sc),ROOF_DARK);
  roof.position.set(0,roofY+0.1*sc,0); g.add(roof);

  // Yellow/Amber Glowing Roofline Trim Accent
  const yellowGlow=glowAccentMat(0xf4c430);
  const trim=new THREE.Mesh(new THREE.BoxGeometry((W+0.22)*sc,0.08*sc,0.08*sc),yellowGlow);
  trim.position.set(0,roofY+0.2*sc,D*sc*0.5+0.04*sc); g.add(trim);

  // 3 Industrial Diesel Generator Exhaust Stacks with rain caps & heat bands
  for(let i=-1;i<=1;i++){
    const stackX=i*1.5*sc;
    const stk=new THREE.Mesh(new THREE.CylinderGeometry(0.24*sc,0.28*sc,4.4*sc,16),STEEL_FRAME);
    stk.position.set(stackX,roofY+2.2*sc,-1.2*sc); stk.castShadow=true; g.add(stk);
    // Silver heat-shield band
    const band=new THREE.Mesh(new THREE.CylinderGeometry(0.29*sc,0.29*sc,0.5*sc,16),STAINLESS);
    band.position.set(stackX,roofY+3.0*sc,-1.2*sc); g.add(band);
    // Rain cap
    const cap=new THREE.Mesh(new THREE.CylinderGeometry(0.36*sc,0.24*sc,0.18*sc,16),mat(0x1e293b,0.4,0.6));
    cap.position.set(stackX,roofY+4.48*sc,-1.2*sc); g.add(cap);
  }

  // Heavy Radiator Cooling Louver Banks on side wall
  for(let l=0;l<5;l++){
    const louver=new THREE.Mesh(new THREE.BoxGeometry(0.06*sc,0.14*sc,2.2*sc),STEEL_FRAME);
    louver.position.set(W*sc*0.5+0.03*sc,(SH+1.0+l*0.35)*sc,0); g.add(louver);
  }

  // External Electrical Step-up Transformer with Ceramic Insulators
  const trans=new THREE.Mesh(new THREE.BoxGeometry(1.6*sc,1.8*sc,1.4*sc),mat(0x1e3a5f,0.5,0.4));
  trans.position.set(-4.0*sc,(SH+0.9)*sc,0); g.add(trans);
  for(let b=0;b<3;b++){
    const ins=new THREE.Mesh(new THREE.CylinderGeometry(0.08*sc,0.1*sc,0.5*sc,8),mat(0x94a3b8,0.2,0.8));
    ins.position.set((-4.4+b*0.4)*sc,(SH+2.0)*sc,0); g.add(ins);
  }

  // Upper control room warm windows
  addWindows(g,4,1,0.65,0.65,W*sc*0.65,(SH+2.2)*sc,0,D*sc*0.5,sc,1.9);

  return g;
}

// =============================================================================
// 4. Fuel Depot (5 Large Cylindrical Tanks with Catwalks & Pipe Manifold)
// Replaces the old red box with realistic multi-tank fuel storage
// =============================================================================
function buildFuelTanks(sc=1):THREE.Group{
  const g=new THREE.Group();
  const bundW=9.2*sc; const bundD=6.4*sc;

  // Concrete spill containment bund wall
  const bundFloor=new THREE.Mesh(new THREE.BoxGeometry(bundW,0.18*sc,bundD),mat(0x1e293b,0.92,0.08));
  bundFloor.position.set(0,0.09*sc,0); g.add(bundFloor);
  // Bund lip walls
  for(const [bx,bz,bw,bd] of [[0,bundD/2,bundW,0.24*sc],[0,-bundD/2,bundW,0.24*sc],[bundW/2,0,0.24*sc,bundD],[-bundW/2,0,0.24*sc,bundD]] as [number,number,number,number][]){
    const lip=new THREE.Mesh(new THREE.BoxGeometry(bw,0.42*sc,bd),mat(0x27272a,0.88,0.12));
    lip.position.set(bx,0.21*sc,bz); g.add(lip);
  }

  // Red Glowing Perimeter Safety Line (Matching reference image)
  const redGlow=glowAccentMat(0xff4444);
  const glowRing=new THREE.Mesh(new THREE.BoxGeometry(bundW+0.1*sc,0.08*sc,bundD+0.1*sc),redGlow);
  glowRing.position.set(0,0.44*sc,0); g.add(glowRing);

  // 5 Large Cylindrical Stainless Steel Fuel Tanks
  const tankDefs:Array<[number,number,number,number]> = [
    [-2.6*sc, -1.3*sc, 1.25*sc, 3.2*sc], // Tank 1 (Main)
    [0.0*sc,  -1.3*sc, 1.25*sc, 3.2*sc], // Tank 2 (Main)
    [2.6*sc,  -1.3*sc, 1.25*sc, 3.2*sc], // Tank 3 (Main)
    [-1.5*sc,  1.4*sc, 1.05*sc, 2.7*sc], // Tank 4
    [1.5*sc,   1.4*sc, 1.05*sc, 2.7*sc], // Tank 5
  ];

  for(const [tx,tz,tr,th] of tankDefs){
    // Tank cylindrical body - High-visibility Polar Safety Red
    const body=new THREE.Mesh(new THREE.CylinderGeometry(tr,tr,th,24),FUEL_TANK);
    body.position.set(tx,0.18*sc+th/2,tz); body.castShadow=true; g.add(body);
    // Conical roof cap - Bright crimson safety dome
    const cap=new THREE.Mesh(new THREE.ConeGeometry(tr*1.02,0.4*sc,24),FUEL_ACC);
    cap.position.set(tx,0.18*sc+th+0.2*sc,tz); g.add(cap);
    // Welded expansion rings
    for(const ringY of [th*0.35,th*0.7]){
      const ring=new THREE.Mesh(new THREE.TorusGeometry(tr*1.01,0.025*sc,6,24),STEEL_FRAME);
      ring.rotation.x=Math.PI/2; ring.position.set(tx,0.18*sc+ringY,tz); g.add(ring);
    }
  }

  // Elevated steel catwalk connecting tank roofs
  const catwalk=new THREE.Mesh(new THREE.BoxGeometry(5.6*sc,0.08*sc,0.7*sc),STEEL_FRAME);
  catwalk.position.set(0,3.4*sc,-1.3*sc); g.add(catwalk);
  // Handrails
  for(const rz of [-0.32*sc,0.32*sc]){
    const rail=new THREE.Mesh(new THREE.BoxGeometry(5.6*sc,0.04*sc,0.04*sc),STEEL_FRAME);
    rail.position.set(0,3.8*sc,-1.3*sc+rz); g.add(rail);
  }

  // Fuel Manifold Piping & Pump Skid
  const pipeMat=mat(0x94a3b8,0.3,0.7);
  const manifold=new THREE.Mesh(new THREE.CylinderGeometry(0.08*sc,0.08*sc,6.0*sc,12),pipeMat);
  manifold.rotation.z=Math.PI/2; manifold.position.set(0,0.6*sc,2.4*sc); g.add(manifold);

  const pumpBox=new THREE.Mesh(new THREE.BoxGeometry(1.2*sc,0.8*sc,0.9*sc),mat(0x1e3a5f,0.6,0.4));
  pumpBox.position.set(3.2*sc,0.4*sc,2.2*sc); g.add(pumpBox);

  return g;
}

// =============================================================================
// 5. Communication Station (Lattice Mast, Satellite Dish & Geodesic Radome)
// =============================================================================
function buildCommsTower(sc=1):THREE.Group{
  const g=new THREE.Group();
  const SH=0.8;

  // Equipment transceiver shelter - Polar Azure Cyan
  const hut=new THREE.Mesh(new THREE.BoxGeometry(3.6*sc,2.4*sc,3.0*sc),MAIN_WING);
  hut.position.set(0,(SH+1.2)*sc,0); hut.castShadow=true; g.add(hut);
  addWindows(g,1,1,0.6,0.6,0,(SH+1.3)*sc,0,1.5*sc,sc,1.6);

  // Cyan Glowing Roofline Trim Accent
  const cyanGlow=glowAccentMat(0x00d4ff);
  const trim=new THREE.Mesh(new THREE.BoxGeometry(3.8*sc,0.08*sc,3.2*sc),cyanGlow);
  trim.position.set(0,(SH+2.4)*sc,0); g.add(trim);

  // 4-sided steel lattice communication tower
  const TH=14*sc;
  for(let s=0;s<7;s++){
    const y1=(SH+2.4)*sc+(s/7)*TH;
    const w1=(1-(s/7)*0.65)*1.8*sc;
    const w2=(1-((s+1)/7)*0.65)*1.8*sc;
    for(const [lx,lz] of [[-w1/2,-w1/2],[w1/2,-w1/2],[-w1/2,w1/2],[w1/2,w1/2]]){
      const leg=new THREE.Mesh(new THREE.CylinderGeometry(0.04*sc,0.05*sc,TH/7,6),STEEL_FRAME);
      leg.position.set(lx,y1+TH/14,lz); g.add(leg);
    }
    const ring=new THREE.Mesh(new THREE.BoxGeometry(w2,0.06*sc,w2),STEEL_FRAME);
    ring.position.set(0,y1+TH/7,0); g.add(ring);
  }

  // Large Parabolic Satellite Dish Antenna with Feed Horn
  const dishRadius=1.5*sc;
  const dish=new THREE.Mesh(
    new THREE.SphereGeometry(dishRadius,20,10,0,Math.PI*2,0,Math.PI/3),
    new THREE.MeshStandardMaterial({color:0xe2e8f0,roughness:0.25,metalness:0.65,side:THREE.DoubleSide})
  );
  dish.rotation.x=-Math.PI/3.5; dish.position.set(0,(SH+2.4)*sc+TH*0.65,1.5*sc); g.add(dish);
  // Feed horn
  const horn=new THREE.Mesh(new THREE.CylinderGeometry(0.05*sc,0.05*sc,1.0*sc,8),STAINLESS);
  horn.rotation.x=Math.PI/6; horn.position.set(0,(SH+2.4)*sc+TH*0.65+0.4*sc,2.1*sc); g.add(horn);

  // Geodesic Radome Sphere on top platform
  const radome=new THREE.Mesh(
    new THREE.SphereGeometry(1.4*sc,18,14),
    new THREE.MeshStandardMaterial({color:0xf1f5f9,roughness:0.35,metalness:0.2})
  );
  radome.position.set(0,(SH+2.4)*sc+TH+1.4*sc,0); radome.castShadow=true; g.add(radome);

  // Flashing Red Aviation Warning Beacon at apex
  const beacon=new THREE.Mesh(new THREE.SphereGeometry(0.18*sc,10,10),new THREE.MeshStandardMaterial({color:0xff0033,emissive:new THREE.Color(0xff0033),emissiveIntensity:3.5}));
  beacon.position.set(0,(SH+2.4)*sc+TH+2.9*sc,0); beacon.userData.beacon=true; g.add(beacon);

  return g;
}

// =============================================================================
// 6. Personnel Area / Living Quarters (2-story Residential Habitat Module)
// =============================================================================
function buildHousing(sc=1):THREE.Group{
  const g=new THREE.Group(); const SH=0.8;
  const W=7.6; const D=5.0; const H=3.4;
  addStilts(g,W,D,SH,sc);

  const body=new THREE.Mesh(new THREE.BoxGeometry(W*sc,H*sc,D*sc),POWER_WALL);
  body.position.set(0,(SH+H/2)*sc,0); body.castShadow=true; g.add(body);
  addPanelSeams(g,W,D,H,2,SH*sc,sc);

  const roofY=(SH+H)*sc;
  const roof=new THREE.Mesh(new THREE.BoxGeometry((W+0.2)*sc,0.2*sc,(D+0.2)*sc),ROOF_DARK);
  roof.position.set(0,roofY+0.1*sc,0); g.add(roof);

  // Red Glowing Roofline Trim Accent
  const redGlow=glowAccentMat(0xef4444);
  const trim=new THREE.Mesh(new THREE.BoxGeometry((W+0.22)*sc,0.08*sc,0.08*sc),redGlow);
  trim.position.set(0,roofY+0.2*sc,D*sc*0.5+0.04*sc); g.add(trim);

  // Rows of warm glowing dormitory/cabin windows (very active inhabited look!)
  addWindows(g,5,2,0.62,0.68,W*sc*0.75,(SH+0.85)*sc,1.4*sc,D*sc*0.5,sc,1.9);
  addWindows(g,5,2,0.62,0.68,W*sc*0.75,(SH+0.85)*sc,1.4*sc,-D*sc*0.5,sc,1.5);
  addWindows(g,2,2,0.62,0.68,2.2*sc,(SH+0.85)*sc,1.4*sc,0,sc,1.6);

  // Arctic Entry Airlock Vestibule
  const airlock=new THREE.Mesh(new THREE.BoxGeometry(2.2*sc,2.0*sc,1.4*sc),LIGHT_WALL);
  airlock.position.set(0,(SH+1.0)*sc,D*sc*0.5+0.7*sc); g.add(airlock);
  // Red safety entry light
  const entryLight=new THREE.Mesh(new THREE.SphereGeometry(0.1*sc,8,8),new THREE.MeshStandardMaterial({color:0xff4444,emissive:new THREE.Color(0xff2222),emissiveIntensity:2.5}));
  entryLight.position.set(0,(SH+2.1)*sc,D*sc*0.5+1.45*sc); g.add(entryLight);

  return g;
}

// =============================================================================
// 7. Storage Warehouse (Insulated Modular Depot with Cargo Roll-up Door)
// =============================================================================
function buildWarehouse(sc=1):THREE.Group{
  const g=new THREE.Group(); const SH=0.65;
  const W=7.2; const D=4.8; const H=3.2;
  addStilts(g,W,D,SH,sc);

  const body=new THREE.Mesh(new THREE.BoxGeometry(W*sc,H*sc,D*sc),STORE_WALL);
  body.position.set(0,(SH+H/2)*sc,0); body.castShadow=true; g.add(body);

  const roofY=(SH+H)*sc;
  const roof=new THREE.Mesh(new THREE.BoxGeometry((W+0.2)*sc,0.2*sc,(D+0.2)*sc),ROOF_DARK);
  roof.position.set(0,roofY+0.1*sc,0); g.add(roof);

  // Green Glowing Roofline Trim Accent
  const greenGlow=glowAccentMat(0x22c55e);
  const trim=new THREE.Mesh(new THREE.BoxGeometry((W+0.22)*sc,0.08*sc,0.08*sc),greenGlow);
  trim.position.set(0,roofY+0.2*sc,D*sc*0.5+0.04*sc); g.add(trim);

  // Large Corrugated Roll-up Cargo Door
  const door=new THREE.Mesh(new THREE.BoxGeometry(2.8*sc,2.2*sc,0.06*sc),STAINLESS);
  door.position.set(0,(SH+1.1)*sc,D*sc*0.5+0.03*sc); g.add(door);
  for(let i=0;i<6;i++){
    const seam=new THREE.Mesh(new THREE.BoxGeometry(2.7*sc,0.03*sc,0.08*sc),STEEL_FRAME);
    seam.position.set(0,(SH+0.35+i*0.35)*sc,D*sc*0.5+0.04*sc); g.add(seam);
  }

  // Raised loading dock
  const dock=new THREE.Mesh(new THREE.BoxGeometry(3.6*sc,SH*sc*0.9,1.8*sc),mat(0x1c1917,0.9,0.1));
  dock.position.set(0,(SH*sc*0.9)/2,D*sc*0.5+0.9*sc); g.add(dock);

  // Upper warm glowing high-bay windows
  addWindows(g,4,1,0.55,0.45,W*sc*0.7,(SH+2.5)*sc,0,D*sc*0.5,sc,1.6);

  return g;
}

// =============================================================================
// 8. Solar Array (4 Banks of 6 Photovoltaic Panels with Galvanized A-Frames)
// =============================================================================
function buildSolarArray(sc=1):THREE.Group{
  const g=new THREE.Group();
  const rows=4; const cols=6;
  const pm=new THREE.MeshStandardMaterial({color:0x0c1b33,roughness:0.08,metalness:0.8,emissive:new THREE.Color(0x061124),emissiveIntensity:0.3});

  for(let r=0;r<rows;r++){
    const rz=(r-(rows-1)/2)*1.2*sc;
    for(let c=0;c<cols;c++){
      const rx=(c-(cols-1)/2)*1.6*sc;
      // PV Panel
      const panel=new THREE.Mesh(new THREE.BoxGeometry(1.45*sc,0.06*sc,0.92*sc),pm.clone());
      panel.position.set(rx,1.4*sc,rz);
      panel.rotation.x=-0.32; // Angled to low sun
      panel.castShadow=true; g.add(panel);
    }
    // Galvanized steel support rail
    const rail=new THREE.Mesh(new THREE.CylinderGeometry(0.04*sc,0.04*sc,(cols-1)*1.6*sc+1.0*sc,6),STAINLESS);
    rail.rotation.z=Math.PI/2; rail.position.set(0,1.2*sc,rz); g.add(rail);
  }

  // A-frame ground support legs
  for(let r=0;r<rows;r++){
    const rz=(r-(rows-1)/2)*1.2*sc;
    for(const side of [-1,1]){
      const leg=new THREE.Mesh(new THREE.CylinderGeometry(0.05*sc,0.07*sc,1.3*sc,8),STEEL_FRAME);
      leg.position.set(side*(cols/2-0.5)*1.6*sc,0.65*sc,rz);
      leg.rotation.z=side*0.2; g.add(leg);
    }
  }

  // DC-to-AC Power Inverter Housing
  const inv=new THREE.Mesh(new THREE.BoxGeometry(1.4*sc,1.0*sc,0.9*sc),mat(0x27272a,0.6,0.4));
  inv.position.set(-4.5*sc,0.5*sc,0); g.add(inv);
  const invLight=new THREE.Mesh(new THREE.SphereGeometry(0.08*sc,8,8),new THREE.MeshStandardMaterial({color:0xffc107,emissive:new THREE.Color(0xffc107),emissiveIntensity:2.5}));
  invLight.position.set(-4.5*sc,1.05*sc,0.46*sc); g.add(invLight);

  return g;
}

// =============================================================================
// 9. Water Facility (RO Desalination & Accumulator Tank Unit)
// =============================================================================
function buildSmallFacility(colorHex:number,sc=1):THREE.Group{
  const g=new THREE.Group(); const SH=0.7;
  const W=4.2; const D=3.4; const H=2.6;
  addStilts(g,W,D,SH,sc);

  const body=new THREE.Mesh(new THREE.BoxGeometry(W*sc,H*sc,D*sc),STORE_WALL);
  body.position.set(0,(SH+H/2)*sc,0); body.castShadow=true; g.add(body);

  const roofY=(SH+H)*sc;
  const roof=new THREE.Mesh(new THREE.BoxGeometry((W+0.2)*sc,0.18*sc,(D+0.2)*sc),ROOF_DARK);
  roof.position.set(0,roofY+0.09*sc,0); g.add(roof);

  // Domain Glowing Accent Line
  const accent=glowAccentMat(colorHex);
  const trim=new THREE.Mesh(new THREE.BoxGeometry((W+0.22)*sc,0.08*sc,0.08*sc),accent);
  trim.position.set(0,roofY+0.18*sc,D*sc*0.5+0.04*sc); g.add(trim);

  // Warm glowing windows
  addWindows(g,2,1,0.6,0.6,1.8*sc,(SH+1.2)*sc,0,D*sc*0.5,sc,1.8);

  // Insulated cylindrical water accumulator tank
  const tank=new THREE.Mesh(new THREE.CylinderGeometry(0.75*sc,0.75*sc,2.2*sc,18),STAINLESS);
  tank.position.set(2.8*sc,(SH+1.1)*sc,0); g.add(tank);
  const dome=new THREE.Mesh(new THREE.SphereGeometry(0.75*sc,16,8,0,Math.PI*2,0,Math.PI/2),mat(0x64748b,0.4,0.6));
  dome.position.set(2.8*sc,(SH+2.2)*sc,0); g.add(dome);

  // Heat-traced utility piping running out of the facility
  const pipe=new THREE.Mesh(new THREE.CylinderGeometry(0.06*sc,0.06*sc,3.2*sc,8),mat(0x94a3b8,0.3,0.7));
  pipe.rotation.z=Math.PI/2; pipe.position.set(1.4*sc,(SH+0.6)*sc,1.8*sc); g.add(pipe);

  return g;
}

// =============================================================================
// 10. Environment & Weather Tower (Lattice Mast & Meteorological Instrumentation)
// =============================================================================
function buildMetTower(sc=1):THREE.Group{
  const g=new THREE.Group();
  const TH=14*sc;

  // 4-leg lattice steel mast
  for(let s=0;s<7;s++){
    const y1=(s/7)*TH;
    const w1=(1-(s/7)*0.7)*1.4*sc;
    const w2=(1-((s+1)/7)*0.7)*1.4*sc;
    for(const [lx,lz] of [[-w1/2,-w1/2],[w1/2,-w1/2],[-w1/2,w1/2],[w1/2,w1/2]]){
      const seg=new THREE.Mesh(new THREE.CylinderGeometry(0.025*sc,0.03*sc,TH/7,6),STEEL_FRAME);
      seg.position.set(lx,y1+TH/14,lz); g.add(seg);
    }
    const brace=new THREE.Mesh(new THREE.BoxGeometry(w2,0.04*sc,w2),STEEL_FRAME);
    brace.position.set(0,y1+TH/7,0); g.add(brace);
  }

  // Crossarms with Anemometers & Wind Vanes
  for(const y of [TH*0.4,TH*0.7,TH]){
    const boom=new THREE.Mesh(new THREE.CylinderGeometry(0.02*sc,0.02*sc,1.6*sc,6),STAINLESS);
    boom.rotation.z=Math.PI/2; boom.position.set(0.6*sc,y,0); g.add(boom);
    const anem=new THREE.Mesh(new THREE.SphereGeometry(0.1*sc,6,6),mat(0xf8fafc,0.2,0.8));
    anem.position.set(1.4*sc,y,0); g.add(anem);
  }

  // Top instrument pod & flashing cyan beacon
  const bm=new THREE.MeshStandardMaterial({color:0x80efff,emissive:new THREE.Color(0x80efff),emissiveIntensity:3.2});
  const beacon=new THREE.Mesh(new THREE.SphereGeometry(0.16*sc,8,8),bm);
  beacon.position.set(0,TH+0.3*sc,0); beacon.userData.beacon=true; g.add(beacon);

  return g;
}

// =============================================================================
// Clear Antarctic Polar Sky Dome (Crisp Daylight Atmosphere)
// =============================================================================
function createPolarSky():THREE.Mesh{
  const canvas=document.createElement('canvas');
  canvas.width=128; canvas.height=512;
  const ctx=canvas.getContext('2d')!;
  const grad=ctx.createLinearGradient(0,0,0,512);
  // Crisp Natural Polar Daylight Gradient
  grad.addColorStop(0.0, '#1e4b8a');  // Deep polar zenith blue
  grad.addColorStop(0.35,'#3b82f6');  // Vivid daylight azure
  grad.addColorStop(0.68,'#60a5fa');  // Polar atmospheric blue
  grad.addColorStop(0.88,'#93c5fd');  // Soft pale ice blue
  grad.addColorStop(1.0, '#dbeafe');  // Sunlit horizon ice haze
  ctx.fillStyle=grad; ctx.fillRect(0,0,128,512);

  const tex=new THREE.CanvasTexture(canvas);
  tex.magFilter=THREE.LinearFilter; tex.minFilter=THREE.LinearFilter;
  const geo=new THREE.SphereGeometry(500,32,24);
  const mat=new THREE.MeshBasicMaterial({map:tex,side:THREE.BackSide,depthWrite:false});
  const sky=new THREE.Mesh(geo,mat);
  return sky;
}

// =============================================================================
// Procedural Sastrugi Snow Texture (Wind-carved Arctic snow drifts & ripples)
// =============================================================================
function createSastrugiTexture():THREE.CanvasTexture{
  const canvas=document.createElement('canvas');
  canvas.width=512; canvas.height=512;
  const ctx=canvas.getContext('2d')!;
  ctx.fillStyle='#808080'; ctx.fillRect(0,0,512,512);

  const imgData=ctx.getImageData(0,0,512,512);
  const d=imgData.data;
  for(let y=0;y<512;y++){
    for(let x=0;x<512;x++){
      const u=x/512; const v=y/512;
      // Directional prevailing katabatic wind wave angle (~32 degrees)
      const windAxis=u*0.85+v*0.52;
      const crossAxis=-u*0.52+v*0.85;
      // Primary sharp sastrugi wave crest with asymmetric windward/leeward lip
      const wavePrimary=Math.sin(windAxis*28.0);
      const ridgeSharp=Math.pow((wavePrimary+1.0)*0.5,1.6);
      // Secondary fine ripples aligned with wind
      const fineRipple=Math.sin(windAxis*85.0+crossAxis*14.0)*0.2;
      // Micro granular crystalline snow texture
      const grain=(Math.random()-0.5)*0.06;
      const raw=(ridgeSharp*0.72+fineRipple+grain);
      const val=Math.floor(Math.max(0,Math.min(255,(raw*0.65+0.18)*255)));
      const idx=(y*512+x)*4;
      d[idx]=val; d[idx+1]=val; d[idx+2]=val; d[idx+3]=255;
    }
  }
  ctx.putImageData(imgData,0,0);
  const tex=new THREE.CanvasTexture(canvas);
  tex.wrapS=THREE.RepeatWrapping; tex.wrapT=THREE.RepeatWrapping;
  tex.repeat.set(16,16);
  return tex;
}

// =============================================================================
// Jagged Procedural Antarctic Mountain Range (Real Nunataks, Rock Strata & Snow Ridges)
// =============================================================================
function createJaggedMountainMesh(
  width:number,depth:number,segX:number,segZ:number,
  centerZ:number,maxHeight:number,noiseSeed:number
):THREE.Mesh{
  const geo=new THREE.PlaneGeometry(width,depth,segX,segZ);
  geo.rotateX(-Math.PI/2);
  const pos=geo.attributes.position;
  const colors=new Float32Array(pos.count*3);

  const ridgeNoise=(x:number,z:number):number=>{
    let amp=1.0; let freq=0.018; let sum=0;
    for(let o=0;o<4;o++){
      const nx=x*freq+noiseSeed+o*1.73;
      const nz=z*freq*1.2+o*2.11;
      const r=1.0-Math.abs(Math.sin(nx)*Math.cos(nz)+Math.sin(nx*1.4+nz*0.8)*0.3);
      sum+=Math.pow(Math.max(0,r),2.4)*amp;
      amp*=0.44; freq*=2.15;
    }
    return sum;
  };

  for(let i=0;i<pos.count;i++){
    const x=pos.getX(i); const z=pos.getZ(i);
    const edgeDistZ=1.0-Math.pow(Math.abs(z)/(depth*0.5),2.0);
    const edgeDistX=1.0-Math.pow(Math.abs(x)/(width*0.5),3.0);
    const env=Math.max(0,edgeDistZ)*Math.max(0,edgeDistX);

    const rawHeight=ridgeNoise(x,z+centerZ);
    const crags=Math.sin(x*0.12+z*0.08)*1.8+Math.cos(x*0.25)*0.9;
    const h=Math.max(0,(rawHeight*maxHeight*0.48+crags)*env);
    pos.setY(i,h);
  }

  pos.needsUpdate=true;
  geo.computeVertexNormals();

  const norm=geo.attributes.normal;
  for(let i=0;i<pos.count;i++){
    const ny=norm.getY(i);
    const h=pos.getY(i);
    const hRel=h/maxHeight;

    let r:number; let gCol:number; let b:number;
    if(ny<0.62){
      // Dark slate nunatak rock strata
      const strata=(Math.sin(h*1.2)+1.0)*0.08;
      r=0.18+strata; gCol=0.22+strata; b=0.28+strata;
    } else if(ny>0.82||hRel>0.6){
      // Windward summit snowpack
      r=0.92; gCol=0.95; b=1.0;
    } else {
      const t=(ny-0.62)/0.20;
      r=0.20*(1-t)+0.88*t;
      gCol=0.24*(1-t)+0.92*t;
      b=0.30*(1-t)+0.98*t;
    }
    colors[i*3]=r; colors[i*3+1]=gCol; colors[i*3+2]=b;
  }
  geo.setAttribute('color',new THREE.BufferAttribute(colors,3));

  const mountainMat=new THREE.MeshStandardMaterial({
    vertexColors:true,
    roughness:0.86,
    metalness:0.04,
    flatShading:true,
  });
  const mesh=new THREE.Mesh(geo,mountainMat);
  mesh.position.set(0,0,centerZ);
  mesh.castShadow=true;
  mesh.receiveShadow=true;
  return mesh;
}

// =============================================================================
// Realistic Polar Terrain with Natural Original White Snow Color & Spaced Platform
// =============================================================================
function buildTerrain(isMaitri:boolean):THREE.Group{
  const g=new THREE.Group();

  // Spaced-out building footprints for soft ambient occlusion
  const bldFootprints:Array<[number,number,number]> = [
    [0,0,12],        // Main Station
    [-26,-18,9],     // Research Lab
    [26,-16,9],      // Power House
    [10,-32,8],      // Solar Array
    [40,-8,10],      // Fuel Depot
    [-40,-10,8],     // Comms
    [-28,16,9],      // Personnel
    [18,16,8],       // Water Facility
    [-14,30,8],      // Waste Management
    [36,14,9],       // Storage
    [38,28,9],       // Logistics
    [28,-30,8],      // Environment Met
  ];

  // Expansive terrain plane for the grand spaced-out campus
  const W=360; const D=360; const segs=160;
  const geo=new THREE.PlaneGeometry(W,D,segs,segs);
  geo.rotateX(-Math.PI/2);
  const pos=geo.attributes.position;
  const colors=new Float32Array(pos.count*3);

  const sunDir=new THREE.Vector3(65,38,42).normalize();

  for(let i=0;i<pos.count;i++){
    const x=pos.getX(i); const z=pos.getZ(i);
    const dist=Math.sqrt(x*x+z*z);

    // Platform zone weight: 0 inside core station (<=44m), blends smoothly to 1.0 (>=65m)
    const tPlatform=Math.max(0,Math.min(1,(dist-44)/21));
    const smoothT=tPlatform*tPlatform*(3-2*tPlatform);

    // Platform snow: gentle realistic compacted snow surface (not flat like cardboard, but smooth for roads)
    const platformUndulation=Math.sin(x*0.14)*Math.cos(z*0.14)*0.03+Math.sin(x*0.06+z*0.05)*0.015;

    // Surrounding Antarctic snowfield: rolling sastrugi waves and foothills
    const snowWaves=Math.sin(x*0.038+0.5)*Math.cos(z*0.035)*1.5
      +Math.sin(x*0.018-z*0.024)*0.95
      +Math.sin(x*0.07)*Math.cos(z*0.06)*0.35;

    const yHeight=(1-smoothT)*platformUndulation + smoothT*snowWaves;
    pos.setY(i,yHeight);
  }

  pos.needsUpdate=true;
  geo.computeVertexNormals();

  // Natural Original Polar Snow Vertex Colors:
  // - Pure, clean, bright natural Antarctic white snow across the entire platform
  // - Subtle pale ice-blue sky-reflection tones in soft creases
  // - Gentle contact AO underneath the spaced buildings
  const norm=geo.attributes.normal;
  for(let i=0;i<pos.count;i++){
    const x=pos.getX(i); const y=pos.getY(i); const z=pos.getZ(i);
    const nx=norm.getX(i); const ny=norm.getY(i); const nz=norm.getZ(i);

    const sunDot=Math.max(-0.1,nx*sunDir.x + ny*sunDir.y + nz*sunDir.z);

    // Natural clean white Antarctic snow
    let r=0.96+sunDot*0.04;
    let gCol=0.98+sunDot*0.02;
    let b=1.0;

    // Subtle natural polar ice-blue shadow in deeper hollows
    if(y<-0.05){
      const depth=Math.min(1,(-0.05-y)*0.8);
      r-=depth*0.06;
      gCol-=depth*0.03;
    }

    // Soft contact Ambient Occlusion under buildings
    for(const [bx,bz,br] of bldFootprints){
      const d=Math.hypot(x-bx,z-bz);
      if(d<br){
        const ao=Math.pow(1-d/br,1.8)*0.24;
        r-=ao*0.8; gCol-=ao*0.7; b-=ao*0.5;
      }
    }

    colors[i*3]=Math.max(0.65,Math.min(1.0,r));
    colors[i*3+1]=Math.max(0.72,Math.min(1.0,gCol));
    colors[i*3+2]=Math.max(0.80,Math.min(1.0,b));
  }
  geo.setAttribute('color',new THREE.BufferAttribute(colors,3));

  const sastrugiTex=createSastrugiTexture();
  const snowMat=new THREE.MeshStandardMaterial({
    vertexColors:true,
    bumpMap:sastrugiTex,
    bumpScale:0.045,
    roughness:0.68,
    metalness:0.02,
  });
  const terrain=new THREE.Mesh(geo,snowMat);
  terrain.receiveShadow=true;
  g.add(terrain);

  // Natural snow drifts banked against outer perimeter
  const driftMat=new THREE.MeshStandardMaterial({color:0xf8fbff,roughness:0.75,metalness:0.01});
  const perimeterDrifts:Array<[number,number,number,number,number]> = [
    [-46, 0, 0, 1.8, 80],      // West outer drift bank
    [46,  0, 0, 1.8, 80],      // East outer drift bank
    [0,   0,-38, 88, 1.8],     // North outer drift bank
    [0,   0, 44, 88, 1.8],     // South outer drift bank
  ];
  for(const [dx,dy,dz,dw,dd] of perimeterDrifts){
    const dMesh=new THREE.Mesh(new THREE.CylinderGeometry(dw/2,dw/2+0.8,0.25,16),driftMat);
    dMesh.scale.set(1.0,1.0,dd/dw);
    dMesh.position.set(dx,0.06,dz);
    dMesh.receiveShadow=true;
    g.add(dMesh);
  }

  // Ice Patches with Specular Glint (Natural polar blue ice)
  const iceMat=new THREE.MeshStandardMaterial({
    color:0x8ec3ea,
    roughness:0.15,
    metalness:0.20,
    transparent:true,
    opacity:0.85,
  });
  const icePatches:Array<[number,number,number,number,number]> = [
    [-34,-26, 6.2, 4.4, 0.4],
    [32,-28,  5.8, 4.2,-0.3],
    [-38,24,  6.5, 4.8, 0.6],
    [30,36,   6.8, 4.6, 0.2],
    [-18,-35, 5.5, 3.8, 0.1],
    [16,38,   5.8, 4.0,-0.5],
  ];
  for(const [ix,iz,iw,id,ir] of icePatches){
    const iceMesh=new THREE.Mesh(new THREE.CylinderGeometry(iw/2,iw/2,0.02,16),iceMat);
    iceMesh.scale.set(1.0,1.0,id/iw);
    iceMesh.rotation.y=ir;
    iceMesh.position.set(ix,0.04,iz);
    iceMesh.receiveShadow=true;
    g.add(iceMesh);
  }

  // Granite Scree nunatak rocks at outer edges
  const rockMat=new THREE.MeshStandardMaterial({color:0x2a3340,roughness:0.92,metalness:0.15,flatShading:true});
  const screePositions:Array<[number,number,number]> = [
    [-48,-25,1.5],[-49,-12,1.2],[-48,22,1.6],[-49,32,1.3],
    [48,-22,1.4],[49,10,1.2],[48,26,1.1],[49,-30,1.7],
    [-30,-40,1.4],[-15,-41,1.6],[18,-40,1.5],[32,-41,1.2],
    [-32,45,1.4],[22,46,1.2],[-8,-41,1.1],[10,46,1.5],
  ];
  for(const [rx,rz,rs] of screePositions){
    const rock=new THREE.Mesh(new THREE.DodecahedronGeometry(rs*0.55,1),rockMat);
    rock.scale.set(1.0+Math.random()*0.4,0.6+Math.random()*0.5,1.0+Math.random()*0.4);
    rock.rotation.set(Math.random()*3,Math.random()*3,Math.random()*3);
    rock.position.set(rx,rs*0.25,rz);
    rock.castShadow=true; rock.receiveShadow=true; g.add(rock);
  }

  // Mountains
  const midMountains=createJaggedMountainMesh(320,55,140,50,-80,42.0,4.2);
  g.add(midMountains);

  const distantMountains=createJaggedMountainMesh(420,75,150,45,-135,62.0,9.7);
  g.add(distantMountains);

  const flankWest=createJaggedMountainMesh(120,60,70,35,-40,30.0,1.9);
  flankWest.position.set(-135,0,-40); g.add(flankWest);

  const flankEast=createJaggedMountainMesh(120,60,70,35,-40,30.0,7.3);
  flankEast.position.set(135,0,-40); g.add(flankEast);

  if(!isMaitri){
    const om=new THREE.MeshStandardMaterial({color:0x08223d,roughness:0.08,metalness:0.35,transparent:true,opacity:0.92});
    const ocean=new THREE.Mesh(new THREE.PlaneGeometry(320,80),om);
    ocean.rotation.x=-Math.PI/2; ocean.position.set(0,0.06,-110); g.add(ocean);
    const im=new THREE.MeshStandardMaterial({color:0xb0d2ec,roughness:0.65,metalness:0.15});
    const iceShelf=new THREE.Mesh(new THREE.BoxGeometry(320,2.0,16),im);
    iceShelf.position.set(0,1.0,-75); iceShelf.castShadow=true; g.add(iceShelf);
  }

  return g;
}

// =============================================================================
// Snow Particle System (Dusk Polar Snowfall)
// =============================================================================
function buildSnowParticles():{mesh:THREE.Points;update:(t:number)=>void}{
  const N=3000; const SPREAD=80; const HEIGHT=32;
  const positions=new Float32Array(N*3);
  const velocities=new Float32Array(N*3);
  const phases=new Float32Array(N);
  for(let i=0;i<N;i++){
    positions[i*3]=(Math.random()-0.5)*SPREAD;
    positions[i*3+1]=Math.random()*HEIGHT;
    positions[i*3+2]=(Math.random()-0.5)*SPREAD;
    velocities[i*3]=(Math.random()-0.5)*0.015;
    velocities[i*3+1]=-(0.04+Math.random()*0.06);
    velocities[i*3+2]=(Math.random()-0.5)*0.015;
    phases[i]=Math.random()*Math.PI*2;
  }
  const geo=new THREE.BufferGeometry();
  const posAttr=new THREE.BufferAttribute(positions,3);
  posAttr.setUsage(THREE.DynamicDrawUsage);
  geo.setAttribute('position',posAttr);
  const pm=new THREE.PointsMaterial({color:0xffffff,size:0.22,transparent:true,opacity:0.75,sizeAttenuation:true,depthWrite:false});
  const mesh=new THREE.Points(geo,pm);
  const update=(t:number)=>{
    const arr=posAttr.array as Float32Array;
    for(let i=0;i<N;i++){
      arr[i*3]+=velocities[i*3]+Math.sin(t*0.6+phases[i])*0.005;
      arr[i*3+1]+=velocities[i*3+1];
      arr[i*3+2]+=velocities[i*3+2]+Math.cos(t*0.5+phases[i])*0.005;
      if(arr[i*3+1]<-0.5){
        arr[i*3]=(Math.random()-0.5)*SPREAD;
        arr[i*3+1]=HEIGHT+Math.random()*3;
        arr[i*3+2]=(Math.random()-0.5)*SPREAD;
      }
    }
    posAttr.needsUpdate=true;
  };
  return {mesh,update};
}

// =============================================================================
// Single Continuous Low Perimeter Wall / Safety Railing (Encompassing Spaced Campus)
// =============================================================================
function buildPerimeterBoundary():THREE.Group{
  const g=new THREE.Group();
  const railH=0.85;
  const postSpacing=7.5;

  const metalMat=new THREE.MeshStandardMaterial({color:0x222a36,roughness:0.82,metalness:0.35});
  const snowCapMat=new THREE.MeshStandardMaterial({color:0xf8fbff,roughness:0.85,metalness:0.02});
  const plinthMat=new THREE.MeshStandardMaterial({color:0x181f28,roughness:0.88,metalness:0.2});

  // Outlines the outer boundaries of the spacious station platform
  const segments:Array<{x1:number;z1:number;x2:number;z2:number}> = [
    {x1:-46, z1:-36, x2:-46, z2:42},   // West perimeter boundary
    {x1:46,  z1:-36, x2:46,  z2:42},   // East perimeter boundary
    {x1:-46, z1:-36, x2:-4.0,z2:-36},  // North-West boundary (service entry gap)
    {x1:4.0, z1:-36, x2:46,  z2:-36},  // North-East boundary
    {x1:-46, z1:42,  x2:-5.5,z2:42},   // South-West boundary (helipad gap)
    {x1:5.5, z1:42,  x2:46,  z2:42},   // South-East boundary
  ];

  for(const {x1,z1,x2,z2} of segments){
    const dx=x2-x1; const dz=z2-z1;
    const len=Math.hypot(dx,dz);
    const mx=(x1+x2)/2; const mz=(z1+z2)/2;
    const ang=Math.atan2(dz,dx);

    const plinth=new THREE.Mesh(new THREE.BoxGeometry(len,0.16,0.24),plinthMat);
    plinth.position.set(mx,0.08,mz); plinth.rotation.y=-ang;
    plinth.receiveShadow=true; g.add(plinth);

    const midRail=new THREE.Mesh(new THREE.BoxGeometry(len,0.08,0.08),metalMat);
    midRail.position.set(mx,0.45,mz); midRail.rotation.y=-ang;
    g.add(midRail);

    const topRail=new THREE.Mesh(new THREE.BoxGeometry(len,0.10,0.14),metalMat);
    topRail.position.set(mx,railH-0.05,mz); topRail.rotation.y=-ang;
    topRail.castShadow=true; g.add(topRail);

    const snowCap=new THREE.Mesh(new THREE.BoxGeometry(len+0.02,0.05,0.16),snowCapMat);
    snowCap.position.set(mx,railH+0.02,mz); snowCap.rotation.y=-ang;
    g.add(snowCap);

    const postCount=Math.max(2,Math.floor(len/postSpacing));
    for(let p=0;p<=postCount;p++){
      const t=p/postCount;
      const px=x1+dx*t; const pz=z1+dz*t;
      const post=new THREE.Mesh(new THREE.BoxGeometry(0.14,railH,0.14),metalMat);
      post.position.set(px,railH/2,pz); post.rotation.y=-ang;
      post.castShadow=true; g.add(post);

      const postCap=new THREE.Mesh(new THREE.BoxGeometry(0.16,0.04,0.16),snowCapMat);
      postCap.position.set(px,railH+0.02,pz); g.add(postCap);
    }
  }

  return g;
}

// =============================================================================
// Elevated Utility Pipe Racks (Connecting Spaced Facilities)
// =============================================================================
function buildElevatedPipeRuns():THREE.Group{
  const g=new THREE.Group();
  const pipeMat=mat(0xc0d0e0,0.25,0.85);
  const frameMat=mat(0x1e293b,0.4,0.75);

  // Pipe line runs connecting Power House [26,-16] -> Spine -> Main Station [0,0] -> Water [18,16] & Fuel [40,-8]
  for(const {x1,z1,x2,z2} of [
    {x1:22, z1:-16, x2:6,  z2:-16}, // Power to Main Spine
    {x1:6,  z1:-16, x2:6,  z2:0},   // Along Spine towards Main Station
    {x1:6,  z1:0,   x2:6,  z2:16},  // Towards Water Facility
    {x1:6,  z1:16,  x2:15, z2:16},  // Into Water Facility
    {x1:26, z1:-16, x2:36, z2:-16}, // Power towards Fuel Depot
    {x1:36, z1:-16, x2:36, z2:-8},  // Down to Fuel Depot
  ]){
    const dx=x2-x1; const dz=z2-z1;
    const len=Math.hypot(dx,dz);
    const mx=(x1+x2)/2; const mz=(z1+z2)/2;
    const ang=Math.atan2(dz,dx);

    for(const yOff of [1.6, 2.05]){
      const pipe=new THREE.Mesh(new THREE.CylinderGeometry(0.12,0.12,len,12),pipeMat);
      pipe.rotation.z=Math.PI/2; pipe.position.set(mx,yOff,mz);
      pipe.rotation.y=-ang; g.add(pipe);
    }

    const tCount=Math.max(2,Math.floor(len/5.5));
    for(let t=0;t<=tCount;t++){
      const px=x1+dx*(t/tCount); const pz=z1+dz*(t/tCount);
      for(const side of [-0.35,0.35]){
        const leg=new THREE.Mesh(new THREE.CylinderGeometry(0.04,0.05,2.1,6),frameMat);
        leg.position.set(px+Math.cos(ang+Math.PI/2)*side,1.05,pz+Math.sin(ang+Math.PI/2)*side);
        leg.castShadow=true; g.add(leg);
      }
      const cross=new THREE.Mesh(new THREE.BoxGeometry(0.9,0.06,0.06),frameMat);
      cross.position.set(px,2.15,pz); cross.rotation.y=-ang; g.add(cross);
    }
  }

  return g;
}

// =============================================================================
// Station Pathways & Infrastructure
// =============================================================================
function buildStationDetails():THREE.Group{
  const g=new THREE.Group();

  g.add(buildPerimeterBoundary());
  g.add(buildElevatedPipeRuns());

  // High-Contrast Road & Path Materials (Clean dark asphalt cut through white snow)
  const roadMat=new THREE.MeshStandardMaterial({color:0x10141a,roughness:0.85,metalness:0.08});
  const walkMat=new THREE.MeshStandardMaterial({color:0x181e28,roughness:0.84,metalness:0.09});
  const edgeMat=new THREE.MeshStandardMaterial({color:0xf1f5f9,emissive:new THREE.Color(0xe2e8f0),emissiveIntensity:0.35,roughness:0.5});
  const dashMat=new THREE.MeshStandardMaterial({color:0xf59e0b,emissive:new THREE.Color(0xf59e0b),emissiveIntensity:0.65,roughness:0.55});
  const apronMat=new THREE.MeshStandardMaterial({color:0x12161e,roughness:0.88,metalness:0.06});
  const juncMat=new THREE.MeshStandardMaterial({color:0x11151d,roughness:0.86,metalness:0.08});
  // Plowed Snow Berm / Shoulder material (raised mound along road edges created by snowplows)
  const plowedSnowMat=new THREE.MeshStandardMaterial({color:0xdbe7f4,roughness:0.92,metalness:0.02});

  // Primary Roads (Connecting Spaced Facilities without Congestion)
  const primaryRoads:Array<{x:number;z:number;w:number;d:number}> = [
    // Central North-South Main Highway (from Solar to Helipad)
    {x:0,   z:2,   w:4.0, d:74},
    // Central East-West Main Artery (from Comms to Fuel Depot)
    {x:0,   z:0,   w:84,  d:4.0},

    // North-West Branch towards Research Lab [-26,-18]
    {x:-13, z:-18, w:26,  d:3.6},
    {x:-26, z:-9,  w:3.6, d:18},

    // Far West Spur towards Comms Station [-40,-10]
    {x:-33, z:-10, w:16,  d:3.4},

    // South-West Branch towards Personnel Quarters [-28,16]
    {x:-14, z:16,  w:28,  d:3.6},
    {x:-28, z:8,   w:3.6, d:16},

    // South Branch towards Waste Management [-14,30]
    {x:-14, z:23,  w:3.4, d:16},

    // North-East Branch towards Power House [26,-16]
    {x:13,  z:-16, w:26,  d:3.8},
    {x:26,  z:-8,  w:3.8, d:16},

    // Far East Road connecting Power to Fuel Depot [40,-8]
    {x:33,  z:-16, w:16,  d:3.6},
    {x:40,  z:-12, w:3.6, d:10},
    {x:20,  z:-8,  w:40,  d:3.6},

    // South-East Branch towards Water Facility [18,16]
    {x:9,   z:16,  w:18,  d:3.6},

    // East Branch towards Storage [36,14] & Logistics [38,28]
    {x:27,  z:14,  w:20,  d:3.8},
    {x:37,  z:21,  w:3.8, d:16},

    // Far North Spur towards Solar Array [10,-32] & Environment [28,-30]
    {x:5,   z:-32, w:12,  d:3.4},
    {x:19,  z:-31, w:18,  d:3.4},
    {x:10,  z:-24, w:3.4, d:16},
    {x:28,  z:-23, w:3.4, d:16},

    // Helipad South Approach Plaza [0,38]
    {x:0,   z:38,  w:12,  d:12},
  ];

  const ROAD_Y=0.095; // Cleanly elevated above undulating terrain

  // Helper to check if a point lies inside any other road segment (for opening intersections)
  const isInsideOtherRoad = (px:number, pz:number, excludeIdx:number, pad=0.12):boolean => {
    for(let k=0; k<primaryRoads.length; k++){
      if(k===excludeIdx) continue;
      const r=primaryRoads[k];
      const hw=r.w/2 + pad;
      const hd=r.d/2 + pad;
      if(px >= r.x-hw && px <= r.x+hw && pz >= r.z-hd && pz <= r.z+hd){
        return true;
      }
    }
    return false;
  };

  // 1. Render all primary dark asphalt road beds
  for(let i=0; i<primaryRoads.length; i++){
    const {x,z,w,d}=primaryRoads[i];
    const road=new THREE.Mesh(new THREE.BoxGeometry(w,0.08,d),roadMat.clone());
    road.position.set(x,ROAD_Y,z); road.receiveShadow=true; g.add(road);

    const longer=Math.max(w,d);
    const isH=w>=d;

    // 2. White edge guide lines - ONLY drawn where NO intersecting road exists!
    // (Never crosses an intersection, leaving junctions completely open and connected)
    const edgeStep=1.2;
    const numEdgeSegments=Math.max(1,Math.floor(longer/edgeStep));
    for(const side of [-1,1]){
      for(let s=0; s<numEdgeSegments; s++){
        const t=(s+0.5)/numEdgeSegments - 0.5;
        const segLen=longer/numEdgeSegments;
        const ex = x + (isH ? t*w : side*(w/2 - 0.12));
        const ez = z + (isH ? side*(d/2 - 0.12) : t*d);

        // If this edge point is inside an intersecting road, skip it so the crossing is open!
        if(isInsideOtherRoad(ex,ez,i,0.15)) continue;

        const edgeSeg=new THREE.Mesh(
          new THREE.BoxGeometry(isH ? segLen*0.95 : 0.09, 0.086, isH ? 0.09 : segLen*0.95),
          edgeMat.clone()
        );
        edgeSeg.position.set(ex,ROAD_Y+0.005,ez);
        g.add(edgeSeg);
      }
    }

    // 3. High-visibility yellow dashed centerline - also skips intersections
    if(longer>4){
      const dc=Math.floor(longer/2.8);
      for(let di=0; di<dc; di++){
        const t=(di/dc)-0.5+0.5/dc;
        const cx = isH ? x+t*w : x;
        const cz = isH ? z : z+t*d;

        // Skip dash inside intersections for clean open crossings
        if(isInsideOtherRoad(cx,cz,i,0.2)) continue;

        const dash=new THREE.Mesh(new THREE.BoxGeometry(isH?1.5:0.12,0.088,isH?0.12:1.5),dashMat.clone());
        dash.position.set(cx,ROAD_Y+0.006,cz);
        g.add(dash);
      }
    }
  }

  // 4. Seamless Intersection Pads: guarantees 100% continuous dark asphalt connection at every intersection
  for(let i=0; i<primaryRoads.length; i++){
    for(let j=i+1; j<primaryRoads.length; j++){
      const r1=primaryRoads[i];
      const r2=primaryRoads[j];
      const xMin=Math.max(r1.x - r1.w/2, r2.x - r2.w/2);
      const xMax=Math.min(r1.x + r1.w/2, r2.x + r2.w/2);
      const zMin=Math.max(r1.z - r1.d/2, r2.z - r2.d/2);
      const zMax=Math.min(r1.z + r1.d/2, r2.z + r2.d/2);

      if(xMax > xMin && zMax > zMin){
        // There is an overlap/intersection: place a continuous dark asphalt connector pad
        const pw=(xMax - xMin) + 0.12;
        const pd=(zMax - zMin) + 0.12;
        const patch=new THREE.Mesh(new THREE.BoxGeometry(pw,0.084,pd),roadMat.clone());
        patch.position.set((xMin+xMax)/2, ROAD_Y+0.002, (zMin+zMax)/2);
        patch.receiveShadow=true;
        g.add(patch);
      }
    }
  }

  // Junction Corner Fillets (Dark asphalt rounded transition discs)
  const junctions:Array<[number,number,number]> = [
    [0,0,3.2], [0,-17,3.0], [0,15,3.0], [0,38,3.4],
    [-26,0,3.0], [-26,-18,3.0], [-40,-10,2.8],
    [-14,16,2.8], [-28,16,3.0], [-14,30,2.8],
    [26,0,3.0], [26,-16,3.0], [40,-8,3.0], [40,-16,2.8],
    [18,16,2.8], [27,14,3.0], [36,14,3.0], [37,28,3.2],
    [10,-32,2.8], [28,-30,2.8],
  ];
  for(const [jx,jz,jr] of junctions){
    const jp=new THREE.Mesh(new THREE.CylinderGeometry(jr,jr,0.086,32),roadMat.clone());
    jp.position.set(jx,ROAD_Y+0.003,jz);
    jp.receiveShadow=true;
    g.add(jp);
  }

  // Helipad (Elevated with plowed snow safety border)
  const hpad=new THREE.Mesh(new THREE.CylinderGeometry(5.8,5.8,0.14,64),new THREE.MeshStandardMaterial({color:0x12161e,roughness:0.82,metalness:0.08}));
  hpad.position.set(0,0.11,38); hpad.receiveShadow=true; g.add(hpad);
  const hr=new THREE.Mesh(new THREE.RingGeometry(5.2,5.7,64),new THREE.MeshStandardMaterial({color:0xf59e0b,emissive:new THREE.Color(0xf59e0b),emissiveIntensity:0.65,side:THREE.DoubleSide}));
  hr.rotation.x=-Math.PI/2; hr.position.set(0,0.185,38); g.add(hr);
  const hm=new THREE.MeshStandardMaterial({color:0xf8fafc,emissive:new THREE.Color(0xf8fafc),emissiveIntensity:0.55});
  const hb=new THREE.Mesh(new THREE.BoxGeometry(0.4,0.08,4.8),hm.clone()); hb.position.set(0,0.19,38); g.add(hb);
  const hl=new THREE.Mesh(new THREE.BoxGeometry(0.4,0.08,3.4),hm.clone()); hl.position.set(-2.2,0.19,38); hl.rotation.y=Math.PI/2; g.add(hl);
  const hri=new THREE.Mesh(new THREE.BoxGeometry(0.4,0.08,3.4),hm.clone()); hri.position.set(2.2,0.19,38); hri.rotation.y=Math.PI/2; g.add(hri);
  for(let i=0;i<24;i++){
    const a=(i/24)*Math.PI*2;
    const pl=new THREE.Mesh(new THREE.CylinderGeometry(0.12,0.12,0.24,6),new THREE.MeshStandardMaterial({color:0xfde68a,emissive:new THREE.Color(0xfde68a),emissiveIntensity:2.4}));
    pl.position.set(Math.cos(a)*5.6,0.22,38+Math.sin(a)*5.6); g.add(pl);
  }

  // Antarctic Route Marker Wands
  const wandMat=new THREE.MeshStandardMaterial({color:0xf97316,roughness:0.4,metalness:0.6});
  const flagMat=new THREE.MeshStandardMaterial({color:0xef4444,roughness:0.5,metalness:0.1,emissive:new THREE.Color(0xff3300),emissiveIntensity:1.5});
  const wandPositions:Array<[number,number]>=[
    [-22,2.0],[-18,2.0],[-10,2.0],[-5,2.0],[5,2.0],[10,2.0],[18,2.0],[22,2.0],
    [-22,5.2],[-18,5.2],[-10,5.2],[-5,5.2],[5,5.2],[10,5.2],[18,5.2],[22,5.2],
    [-2.2,-15],[-2.2,-10],[-2.2,-5],[-2.2,10],[-2.2,15],[-2.2,20],
    [2.2,-15],[2.2,-10],[2.2,-5],[2.2,10],[2.2,15],[2.2,20],
    [-12.2,-10],[-15.8,-10],[-18.5,-8],[-18.5,-12],[-21.5,-8],
    [12.2,-8],[15.8,-8],[18,-4.5],[18,-7.5],[23.5,-4],
    [-14.5,7],[-17.5,7],[-17.5,12],[-14.5,12],[-7.5,15],[-4.5,15],
    [9.5,8],[6.5,8],[18.5,8],[22.5,8],[18.5,14],[23.5,14],[23.5,21],[18.5,21],
  ];
  for(const [wx,wz] of wandPositions){
    const wand=new THREE.Mesh(new THREE.CylinderGeometry(0.025,0.03,1.1,6),wandMat.clone());
    wand.position.set(wx,0.55,wz); g.add(wand);
    const flag=new THREE.Mesh(new THREE.SphereGeometry(0.08,8,8),flagMat.clone());
    flag.position.set(wx,1.12,wz); g.add(flag);
  }

  // Street Light Poles along primary pathways (Casting warm lamplight at dusk)
  const pm2=mat(0xc8d6e5,0.35,0.65);
  const lm=new THREE.MeshStandardMaterial({color:0xfef3c7,emissive:new THREE.Color(0xfde68a),emissiveIntensity:2.5});
  const poles:Array<[number,number]>=[
    [2.4,-5],[-2.4,-5],[2.4,9],[-2.4,9],[-7,4.8],[-7,1.8],[7,4.8],[7,1.8],
    [-12,-6],[-16,-4],[-19,-10],[12,-5],[16,-9],[13,-16],
    [14,8],[15,13],[19,10],[-13,4],[-16,8],
    [5,25],[-5,25],[0,21],[21,15],[21,18],
  ];
  for(const [lx,lz] of poles){
    const pole=new THREE.Mesh(new THREE.CylinderGeometry(0.06,0.09,5.5,8),pm2.clone());
    pole.position.set(lx,2.75,lz); g.add(pole);
    const arm=new THREE.Mesh(new THREE.CylinderGeometry(0.04,0.04,1.6,6),pm2.clone());
    arm.rotation.z=Math.PI/2; arm.position.set(lx+0.8,5.5,lz); g.add(arm);
    const hous=new THREE.Mesh(new THREE.BoxGeometry(0.35,0.22,0.35),mat(0x374151,0.6,0.4));
    hous.position.set(lx+1.6,5.4,lz); g.add(hous);
    const lamp=new THREE.Mesh(new THREE.SphereGeometry(0.22,8,8),lm.clone());
    lamp.position.set(lx+1.6,5.22,lz); g.add(lamp);
  }

  // Vehicles on Paths & Staging Areas (Arctic Tracked Transporter & Snowcats)
  const trm=mat(0xef4444,0.55,0.35); const twm=mat(0x111111,0.95,0.05);
  const vList:Array<[number,number,number,number]> = [
    [19,0,19,0.3],     // Logistics freight carrier
    [22,0,17,0.0],     // Supply snow transporter
    [24,0,20,0.5],     // Cargo tug
    [17,0,20,-0.2],    // Equipment transporter
    [14,0,-5,0.0],     // Fuel tanker vehicle on Power <-> Fuel road
    [-12,0,-7,-0.4],   // Science crew transporter on Lab road
  ];
  for(const [vx,vy,vz,vr] of vList){
    const cab=new THREE.Mesh(new THREE.BoxGeometry(1.9,1.3,1.0),trm.clone());
    cab.position.set(vx,vy+0.68,vz); cab.rotation.y=vr; cab.castShadow=true; g.add(cab);
    const bed=new THREE.Mesh(new THREE.BoxGeometry(2.8,0.85,1.0),mat(0xcc2222,0.65,0.3));
    bed.position.set(vx+Math.cos(vr+Math.PI)*2.3,vy+0.43,vz+Math.sin(vr+Math.PI)*2.3);
    bed.rotation.y=vr; bed.castShadow=true; g.add(bed);
    for(const [wx2,wz2] of [[-0.55,0.55],[-0.55,-0.55],[0.55,0.55],[0.55,-0.55]] as [number,number][]){
      const wheel=new THREE.Mesh(new THREE.CylinderGeometry(0.3,0.3,0.3,12),twm.clone());
      wheel.rotation.z=Math.PI/2; wheel.position.set(vx+wx2,vy+0.29,vz+wz2*0.55); g.add(wheel);
    }
  }

  // Cargo Containers in Staging Yards
  const cc=[0x1e40af,0xb91c1c,0x166534,0x92400e,0x4c1d95];
  for(const [cx,cy,cz,cr] of [[18,0,12.5,0],[20.5,0,12.5,0],[19.2,1.05,12.5,0],[23,0,7,0.4],[23,0,9.2,0.4],[-13,0,-14.5,0.3],[-15,0,-14.5,0.3],[-16,0,8,0.1]] as [number,number,number,number][]){
    const ci=Math.floor(Math.abs(cx+cz))%cc.length;
    const cont=new THREE.Mesh(new THREE.BoxGeometry(2.6,1.1,1.3),mat(cc[ci],0.6,0.45));
    cont.position.set(cx,cy+0.55,cz); cont.rotation.y=cr; cont.castShadow=true; g.add(cont);
    for(const si of [-1,0,1]){
      const stripe=new THREE.Mesh(new THREE.BoxGeometry(0.05,1.05,1.32),mat(0x374151,0.5,0.5));
      stripe.position.set(cx+si*0.85,cy+0.55,cz); stripe.rotation.y=cr; g.add(stripe);
    }
  }

  return g;
}

// =============================================================================
// HUD Pin
// =============================================================================
interface Pin {id:string;x:number;y:number;vis:boolean}
function hexToRgb(hex:string):string{
  const n=parseInt(hex.replace('#',''),16);
  return `${(n>>16)&255},${(n>>8)&255},${n&255}`;
}

// =============================================================================
// Props & Main StationScene Component
// =============================================================================
interface Props{
  snapshot?:TelemetrySnapshot;
  onSelectAsset:(id:string)=>void;
  selectedAsset:string|null;
  stationId:string;
  showRelationships?:boolean;
}

export const StationScene:React.FC<Props>=({snapshot,onSelectAsset,selectedAsset,stationId,showRelationships=false})=>{
  const mountRef=useRef<HTMLDivElement>(null);
  const rendRef=useRef<THREE.WebGLRenderer|null>(null);
  const camRef=useRef<THREE.PerspectiveCamera|null>(null);
  const ctrlRef=useRef<OrbitControls|null>(null);
  const facGrps=useRef<Map<string,THREE.Group>>(new Map());
  const glowRings=useRef<Map<string,THREE.Mesh>>(new Map());
  const relLines=useRef<THREE.Group>(new THREE.Group());
  const beacons=useRef<THREE.Mesh[]>([]);
  const frameRef=useRef<number>(0);
  const clockRef=useRef(new THREE.Clock());
  const selRef=useRef<string|null>(selectedAsset);
  const showRelRef=useRef(showRelationships);
  const snowRef=useRef<{update:(t:number)=>void}|null>(null);
  const [pins,setPins]=useState<Pin[]>([]);
  const sceneRef=useRef<THREE.Scene|null>(null);
  const isMaitri=stationId!=='bharati';
  const FACILITIES=isMaitri?MAITRI_FACILITIES:BHARATI_FACILITIES;

  const getLiveSubLabel=useCallback((id:string,def:string):string=>{
    if(!snapshot) return def;
    try{
      switch(id){
        case 'power_house': return `${Math.round(snapshot.station_ops?.domain_readiness?.energy??95)}% | ${snapshot.energy?.generator_count_active??2} Generators`;
        case 'fuel_depot': return `${Math.round(snapshot.fuel?.fuel_percentage??77)}% | ${snapshot.fuel?.days_remaining??19} days`;
        case 'water_facility': return `${Math.round(snapshot.water?.percentage??88)}% | ${(Math.round((snapshot.water?.storage_liters??1200)/100)/10).toFixed(1)}k L`;
        case 'main_station': return `${Math.round(snapshot.station_ops?.overall_readiness??98)}% | Operational`;
        case 'environment': return `${snapshot.environment?.temperature?.toFixed(1)??'-27.5'}°C | ${snapshot.environment?.condition??'Clear'}`;
        case 'solar_array': return `${Math.min(100,Math.round((snapshot.energy?.solar_output??28)/50*100))}% | Generating`;
        case 'personnel_area': return `100% | ${snapshot.personnel?.headcount??42} Persons`;
        case 'research_lab': return `${Math.round(snapshot.station_ops?.domain_readiness?.research??92)}% | Active`;
        case 'communication': return `${Math.round(snapshot.communication?.data_completeness_pct??96)}% | ${snapshot.communication?.primary_status??'Online'}`;
        default: return def;
      }
    }catch{return def;}
  },[snapshot]);

  const project=useCallback((wp:THREE.Vector3)=>{
    const cam=camRef.current; const rnd=rendRef.current;
    if(!cam||!rnd) return {x:0,y:0,vis:false};
    const v=wp.clone().project(cam);
    return{x:((v.x+1)/2)*rnd.domElement.clientWidth,y:((-v.y+1)/2)*rnd.domElement.clientHeight,vis:v.z<1};
  },[]);

  useEffect(()=>{selRef.current=selectedAsset;},[selectedAsset]);
  useEffect(()=>{showRelRef.current=showRelationships;},[showRelationships]);

  useEffect(()=>{
    const el=mountRef.current; if(!el) return;
    const renderer=new THREE.WebGLRenderer({antialias:true,alpha:false,powerPreference:'high-performance'});
    renderer.setPixelRatio(Math.min(window.devicePixelRatio,2));
    renderer.setSize(el.clientWidth,el.clientHeight);
    renderer.shadowMap.enabled=true;
    renderer.shadowMap.type=THREE.PCFShadowMap;
    renderer.toneMapping=THREE.ACESFilmicToneMapping;
    // Crisp daylight polar exposure showing pure natural white snow and rich colored buildings
    renderer.toneMappingExposure=1.04;
    renderer.setClearColor(0xbfe0f7);
    el.appendChild(renderer.domElement);
    rendRef.current=renderer;

    const scene=new THREE.Scene(); sceneRef.current=scene;
    // Soft atmospheric daylight polar fog (gentle depth for mountains; station campus is crisp and sharp)
    scene.fog=new THREE.FogExp2(0xcfe4f7,0.0009);
    scene.background=new THREE.Color(0xbfe0f7);

    // Daylight Polar Sky Dome
    const skyDome=createPolarSky();
    scene.add(skyDome);

    // Camera positioned to view the spacious, sprawling campus comfortably
    const cam=new THREE.PerspectiveCamera(45,el.clientWidth/el.clientHeight,0.1,800);
    cam.position.set(48,58,72); cam.lookAt(0,0,4); camRef.current=cam;
    const ctrl=new OrbitControls(cam,renderer.domElement);
    ctrl.enableDamping=true; ctrl.dampingFactor=0.07;
    ctrl.maxPolarAngle=Math.PI/2.04; ctrl.minDistance=10; ctrl.maxDistance=280;
    ctrl.target.set(0,0,4); ctrlRef.current=ctrl;

    // --- Clean Polar Daylight Lighting (Natural Pure White Snow + Vibrant Building Colors) ---
    // 1. Natural polar skylight ambient fill
    scene.add(new THREE.AmbientLight(0xc2e0fa,0.72));

    // 2. Direct polar sun (crisp daylight with soft natural shadows)
    const sun=new THREE.DirectionalLight(0xffffff,1.95);
    sun.position.set(65,42,38);
    sun.castShadow=true;
    sun.shadow.mapSize.set(2048,2048);
    sun.shadow.camera.left=-90; sun.shadow.camera.right=90;
    sun.shadow.camera.top=90; sun.shadow.camera.bottom=-90;
    sun.shadow.camera.near=10; sun.shadow.camera.far=240;
    sun.shadow.bias=-0.0003;
    sun.shadow.radius=2.2;
    scene.add(sun);

    // 3. Polar fill light from opposite quadrant
    const fillLight=new THREE.DirectionalLight(0x93c5fd,0.40);
    fillLight.position.set(-60,30,-45); scene.add(fillLight);

    // 4. Ground snow bounce light (natural polar albedo)
    const snowBounce=new THREE.DirectionalLight(0xe8f4fd,0.32);
    snowBounce.position.set(0,-1,0); scene.add(snowBounce);

    // Environment: Terrain & Mountains
    scene.add(buildTerrain(isMaitri));

    // Roads, pathways, aprons, vehicles, elevated pipes, and low safety boundary
    scene.add(buildStationDetails());

    // Falling snow particles
    const snow=buildSnowParticles(); scene.add(snow.mesh); snowRef.current=snow;

    // Facility Buildings
    facGrps.current.clear(); glowRings.current.clear(); beacons.current=[];
    const bColorMap:Record<string,number>={
      water_facility:0x3882f6,waste_management:0x22c55e,logistics_area:0xf97316,
    };
    for(const fac of FACILITIES){
      const sc=fac.scale??1;
      let bld:THREE.Group;
      switch(fac.buildType){
        case 'main':      bld=buildMainStation(sc); break;
        case 'lab':       bld=buildLab(sc); break;
        case 'power':     bld=buildPowerHouse(sc); break;
        case 'solar':     bld=buildSolarArray(sc); break;
        case 'tanks':     bld=buildFuelTanks(sc); break;
        case 'comms':     bld=buildCommsTower(sc); break;
        case 'housing':   bld=buildHousing(sc); break;
        case 'warehouse': bld=buildWarehouse(sc); break;
        case 'tower':     bld=buildMetTower(sc); break;
        case 'small':     bld=buildSmallFacility(bColorMap[fac.id]??0x3882f6,sc); break;
        default:          bld=buildMainStation(sc);
      }
      bld.position.set(...fac.position); bld.userData.facId=fac.id; scene.add(bld);
      facGrps.current.set(fac.id,bld);

      // Collect red beacons for blinking
      bld.traverse((obj)=>{if((obj as THREE.Mesh).userData?.beacon) beacons.current.push(obj as THREE.Mesh);});

      // Ground Glow Ring
      const ring=new THREE.Mesh(
        new THREE.RingGeometry(3.5*sc,4.2*sc,32),
        new THREE.MeshBasicMaterial({color:fac.glowHex,transparent:true,opacity:0.25,side:THREE.DoubleSide})
      );
      ring.rotation.x=-Math.PI/2; ring.position.set(fac.position[0],0.03,fac.position[2]);
      scene.add(ring); glowRings.current.set(fac.id,ring);
    }

    scene.add(relLines.current);

    // Click Detection
    const raycaster=new THREE.Raycaster(); const mouse=new THREE.Vector2();
    let downPos={x:0,y:0};
    const onMouseDown=(e:MouseEvent)=>{downPos={x:e.clientX,y:e.clientY};};
    const onMouseUp=(e:MouseEvent)=>{
      if(Math.hypot(e.clientX-downPos.x,e.clientY-downPos.y)>6) return;
      const rect=renderer.domElement.getBoundingClientRect();
      mouse.x=((e.clientX-rect.left)/rect.width)*2-1;
      mouse.y=-((e.clientY-rect.top)/rect.height)*2+1;
      raycaster.setFromCamera(mouse,cam);
      const meshes:THREE.Mesh[]=[];
      facGrps.current.forEach((grp)=>grp.traverse((c)=>{if((c as THREE.Mesh).isMesh) meshes.push(c as THREE.Mesh);}));
      const hits=raycaster.intersectObjects(meshes,false);
      if(hits.length>0){
        let cur:THREE.Object3D|null=hits[0].object;
        while(cur&&cur.parent!==scene){
          if(cur.userData?.facId){onSelectAsset(cur.userData.facId);return;}
          cur=cur.parent;
        }
      }
    };
    const dom=renderer.domElement;
    dom.addEventListener('mousedown',onMouseDown);
    dom.addEventListener('mouseup',onMouseUp);

    // Animation Loop
    const posMap=new Map(FACILITIES.map(f=>[f.id,f.position]));
    const animate=()=>{
      frameRef.current=requestAnimationFrame(animate);
      const t=clockRef.current.getElapsedTime();
      ctrl.update();
      if(snowRef.current) snowRef.current.update(t);

      // Blink red beacons
      const bOp=(Math.sin(t*4)+1)/2;
      for(const b of beacons.current){
        ((b.material as THREE.MeshStandardMaterial)).emissiveIntensity=bOp>0.5?3.5:0.2;
      }

      // Selection pulse & ring opacity
      const sel=selRef.current;
      glowRings.current.forEach((ring,id)=>{
        const isSel=id===sel;
        const mat=ring.material as THREE.MeshBasicMaterial;
        mat.opacity=isSel?0.55+Math.sin(t*3)*0.2:0.2;
        ring.scale.setScalar(isSel?1.0+Math.sin(t*3)*0.08:1.0);
      });

      // Relationship flow lines
      while(relLines.current.children.length) relLines.current.remove(relLines.current.children[0]);
      if(showRelRef.current&&sel){
        const targets=RELATIONSHIPS[sel]??[];
        const srcPos=posMap.get(sel);
        if(srcPos){
          for(const rel of targets){
            const tgtPos=posMap.get(rel.target);
            if(!tgtPos) continue;
            const pts:THREE.Vector3[]=[];
            const p0=new THREE.Vector3(srcPos[0],1.5,srcPos[2]);
            const p2=new THREE.Vector3(tgtPos[0],1.5,tgtPos[2]);
            const mid=p0.clone().lerp(p2,0.5); mid.y+=Math.min(5,p0.distanceTo(p2)*0.28);
            for(let i=0;i<=24;i++){
              const u=i/24;
              pts.push(new THREE.Vector3(
                (1-u)*(1-u)*p0.x+2*(1-u)*u*mid.x+u*u*p2.x,
                (1-u)*(1-u)*p0.y+2*(1-u)*u*mid.y+u*u*p2.y,
                (1-u)*(1-u)*p0.z+2*(1-u)*u*mid.z+u*u*p2.z,
              ));
            }
            const gLine=new THREE.BufferGeometry().setFromPoints(pts);
            const mLine=new THREE.LineBasicMaterial({color:REL_COLORS[rel.severity]??0x00d4ff,transparent:true,opacity:0.85});
            relLines.current.add(new THREE.Line(gLine,mLine));
          }
        }
      }

      renderer.render(scene,cam);

      // Project HUD pins
      const newPins:Pin[]=[];
      for(const fac of FACILITIES){
        const wp=new THREE.Vector3(fac.position[0],(fac.scale??1)*3.8+1.2,fac.position[2]);
        const p=project(wp);
        newPins.push({id:fac.id,x:p.x,y:p.y,vis:p.vis});
      }
      setPins(newPins);
    };
    animate();

    const onResize=()=>{
      if(!el||!renderer||!cam) return;
      cam.aspect=el.clientWidth/el.clientHeight; cam.updateProjectionMatrix();
      renderer.setSize(el.clientWidth,el.clientHeight);
    };
    window.addEventListener('resize',onResize);

    return()=>{
      cancelAnimationFrame(frameRef.current);
      window.removeEventListener('resize',onResize);
      dom.removeEventListener('mousedown',onMouseDown);
      dom.removeEventListener('mouseup',onMouseUp);
      ctrl.dispose(); renderer.dispose();
      if(dom&&dom.parentNode===el) el.removeChild(dom);
    };
  },[isMaitri,project,onSelectAsset]);

  // Smooth camera zoom on selected asset
  useEffect(()=>{
    if(!selectedAsset||!camRef.current||!ctrlRef.current) return;
    const fac=FACILITIES.find(f=>f.id===selectedAsset);
    if(!fac) return;
    const target=new THREE.Vector3(...fac.position);
    const startCam=camRef.current.position.clone();
    const endCam=target.clone().add(new THREE.Vector3(12,16,16));
    const startTgt=ctrlRef.current.target.clone();
    let startTime:number|null=null;
    const animCam=(ts:number)=>{
      if(!startTime) startTime=ts;
      const prog=Math.min(1,(ts-startTime)/650);
      const ease=prog<0.5?2*prog*prog:-1+(4-2*prog)*prog;
      camRef.current?.position.lerpVectors(startCam,endCam,ease);
      ctrlRef.current?.target.lerpVectors(startTgt,target,ease);
      if(prog<1) requestAnimationFrame(animCam);
    };
    requestAnimationFrame(animCam);
  },[selectedAsset]);

  return(
    <div style={{position:'relative',width:'100%',height:'100%',overflow:'hidden',background:'#102746'}}>
      <div ref={mountRef} style={{width:'100%',height:'100%'}}/>

      {/* Floating 2D HUD Pins */}
      {pins.map(pin=>{
        if(!pin.vis) return null;
        const fac=FACILITIES.find(f=>f.id===pin.id);
        if(!fac) return null;
        const isSel=fac.id===selectedAsset;
        const rgb=hexToRgb(fac.color);
        const liveLabel=getLiveSubLabel(fac.id,fac.subLabel);
        return(
          <div key={fac.id} onClick={()=>onSelectAsset(fac.id)} style={{position:'absolute',left:pin.x,top:pin.y,transform:'translate(-50%,-100%)',pointerEvents:'auto',cursor:'pointer',zIndex:isSel?30:10,transition:'opacity 0.2s'}}>
            <div style={{position:'absolute',bottom:-14,left:'50%',transform:'translateX(-50%)',width:isSel?2:1.5,height:14,background:`linear-gradient(to bottom,${fac.color},${fac.color}00)`,opacity:isSel?0.95:0.6}}/>
            <div style={{background:isSel?`linear-gradient(135deg,rgba(4,14,35,0.97) 0%,rgba(${rgb},0.18) 100%)`:'rgba(6,16,38,0.88)',border:`1.5px solid ${isSel?fac.color:fac.color+'60'}`,borderRadius:9,padding:'5px 11px 5px 8px',minWidth:138,backdropFilter:'blur(14px)',boxShadow:isSel?`0 0 18px rgba(${rgb},0.4),0 4px 20px rgba(0,0,0,0.8)`:'0 3px 14px rgba(0,0,0,0.5)',transition:'all 0.2s ease',userSelect:'none'}}>
              <div style={{display:'flex',alignItems:'center',gap:6,marginBottom:2}}>
                <span style={{fontSize:13,width:22,height:22,display:'flex',alignItems:'center',justifyContent:'center',background:`rgba(${rgb},0.18)`,borderRadius:5,flexShrink:0}}>{fac.icon}</span>
                <span style={{fontSize:11,fontWeight:700,color:fac.color,fontFamily:'monospace',letterSpacing:'0.03em',whiteSpace:'nowrap'}}>{fac.label}</span>
              </div>
              <div style={{fontSize:10,color:'#94a3b8',fontFamily:'monospace',paddingLeft:28}}>{liveLabel}</div>
            </div>
          </div>
        );
      })}
      <div style={{position:'absolute',top:12,left:12,background:'rgba(6,18,40,0.88)',border:'1px solid rgba(0,212,255,0.3)',borderRadius:8,padding:'5px 12px',display:'flex',alignItems:'center',gap:8,pointerEvents:'none',zIndex:20,backdropFilter:'blur(10px)',boxShadow:'0 2px 10px rgba(0,0,0,0.4)'}}>
        <span style={{width:8,height:8,borderRadius:'50%',background:'#00d4ff',display:'block',boxShadow:'0 0 8px #00d4ff'}}/>
        <span style={{fontSize:11,fontFamily:'monospace',color:'#38bdf8',fontWeight:700,letterSpacing:'0.08em'}}>3D STATION TWIN  |  {isMaitri?'MAITRI INLAND':'BHARATI COASTAL'}</span>
      </div>
    </div>
  );
};

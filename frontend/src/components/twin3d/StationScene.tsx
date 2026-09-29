import React, { useRef, useState, useEffect, useCallback, useMemo } from 'react';
import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { TelemetrySnapshot } from '../../types';

// =============================================================================
// Domain Color Palette
// =============================================================================
export const DOMAIN_COLORS: Record<string, string> = {
  infrastructure:   '#06b6d4',
  energy_fuel:      '#f59e0b',
  logistics:        '#f97316',
  environment:      '#00e5ff',
  communication:    '#3b82f6',
  water:            '#38bdf8',
  personnel:        '#a855f7',
};

interface FacilityDef {
  id: string; label: string; subLabel: string; icon: string;
  color: string; glowHex: number; position: [number, number, number];
  buildType: 'main'|'lab'|'power'|'solar'|'tanks'|'comms'|'housing'|'warehouse'|'tower'|'small';
  scale?: number;
}

const MAITRI_FACILITIES: FacilityDef[] = [
  { id:'infrastructure', label:'Infrastructure',             subLabel:'94% | Structural Nominal',    icon:'🏛',  color:'#06b6d4', glowHex:0x06b6d4, position:[0,0,0],      buildType:'main'      },
  { id:'environment',    label:'Environment & Weather',      subLabel:'-27.5°C | Clear',             icon:'❄️',  color:'#00e5ff', glowHex:0x00e5ff, position:[0,0,-22],    buildType:'tower'     },
  { id:'communication',  label:'Communication',              subLabel:'96% | LEO Synced',           icon:'📡',  color:'#3b82f6', glowHex:0x3b82f6, position:[-24,0,-16],  buildType:'comms'     },
  { id:'energy_fuel',    label:'Energy & Fuel',              subLabel:'95% | 2 Gens • 77% Fuel',    icon:'⚡',  color:'#f59e0b', glowHex:0xf59e0b, position:[24,0,-16],   buildType:'power'     },
  { id:'water',          label:'Water',                      subLabel:'88% | 18.5k L Potable',      icon:'💧',  color:'#38bdf8', glowHex:0x3882f6, position:[26,0,2],     buildType:'small'     },
  { id:'logistics',      label:'Transportation & Logistics', subLabel:'88d Resupply ETA',           icon:'🚛',  color:'#f97316', glowHex:0xf97316, position:[24,0,20],    buildType:'warehouse' },
  { id:'personnel',      label:'Personnel & Safety',         subLabel:'100% | 42 Crew Safe',        icon:'👥',  color:'#a855f7', glowHex:0xa855f7, position:[-24,0,16],   buildType:'housing'   },
];

const BHARATI_FACILITIES: FacilityDef[] = [
  { id:'infrastructure', label:'Infrastructure',             subLabel:'97% | Structural Nominal',    icon:'🏛',  color:'#06b6d4', glowHex:0x06b6d4, position:[0,0,0],      buildType:'main'      },
  { id:'environment',    label:'Environment & Weather',      subLabel:'-20.6°C | Coastal Wind',      icon:'❄️',  color:'#00e5ff', glowHex:0x00e5ff, position:[0,0,-22],    buildType:'tower'     },
  { id:'communication',  label:'Communication',              subLabel:'98% | LEO Synced',           icon:'📡',  color:'#3b82f6', glowHex:0x3b82f6, position:[-24,0,-16],  buildType:'comms'     },
  { id:'energy_fuel',    label:'Energy & Fuel',              subLabel:'92% | CHP Online • 74% Fuel', icon:'⚡',  color:'#f59e0b', glowHex:0xf59e0b, position:[24,0,-16],   buildType:'power', scale:0.95 },
  { id:'water',          label:'Water',                      subLabel:'91% | RO Desal Active',      icon:'💧',  color:'#38bdf8', glowHex:0x3882f6, position:[26,0,2],     buildType:'small'     },
  { id:'logistics',      label:'Transportation & Logistics', subLabel:'62d Resupply ETA',           icon:'🚛',  color:'#f97316', glowHex:0xf97316, position:[24,0,20],    buildType:'warehouse', scale:0.9 },
  { id:'personnel',      label:'Personnel & Safety',         subLabel:'100% | 35 Crew Safe',        icon:'👥',  color:'#a855f7', glowHex:0xa855f7, position:[-24,0,16],   buildType:'housing', scale:0.9 },
];

const RELATIONSHIPS: Record<string,Array<{target:string;severity:'info'|'warning'|'high'|'critical'}>> = {
  infrastructure: [{target:'personnel',severity:'high'}],
  energy_fuel:    [{target:'infrastructure',severity:'critical'},{target:'water',severity:'high'},{target:'communication',severity:'high'},{target:'personnel',severity:'high'}],
  logistics:      [{target:'energy_fuel',severity:'high'},{target:'infrastructure',severity:'warning'}],
  environment:    [{target:'infrastructure',severity:'high'},{target:'energy_fuel',severity:'high'},{target:'water',severity:'warning'},{target:'communication',severity:'info'},{target:'logistics',severity:'warning'}],
  communication:  [{target:'infrastructure',severity:'info'}],
  water:          [{target:'personnel',severity:'critical'}],
  personnel:      [{target:'infrastructure',severity:'info'}],
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

  // Equipment radio unit shelter - Polar Azure Cyan
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

  // Large Parabolic Satellite Dish Aerial with Feed Horn
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
// 8. Solar Array (4 Banks of 6 Solar panel Panels with Galvanized A-Frames)
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
// 9. Water Facility (RO Seawater purification & Accumulator Tank Unit)
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

  // Crossarms with Wind speed sensors & Wind Vanes
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
  grad.addColorStop(0.68,'#60a5fa');  // Polar weather layer blue
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
      // Directional prevailing polar downslope wind wave angle (~32 degrees)
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

  // Spaced-out building footprints for soft ambient occlusion (7 domains)
  const bldFootprints:Array<[number,number,number]> = [
    [0,0,12],        // Infrastructure (Main Station)
    [0,-22,9],       // Environment & Weather
    [-24,-16,10],    // Communication
    [24,-16,11],     // Energy & Fuel
    [26,2,8],        // Water
    [24,20,10],      // Logistics
    [-24,16,10],     // Personnel & Safety
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
    [-38, 0, 7, 1.8, 76],      // West outer drift bank
    [38,  0, 7, 1.8, 76],      // East outer drift bank
    [0,   0,-30, 78, 1.8],     // North outer drift bank
    [0,   0, 44, 78, 1.8],     // South outer drift bank
  ];
  for(const [dx,dy,dz,dw,dd] of perimeterDrifts){
    const dMesh=new THREE.Mesh(new THREE.CylinderGeometry(dw/2,dw/2+0.8,0.25,16),driftMat);
    dMesh.scale.set(1.0,1.0,dd/dw);
    dMesh.position.set(dx,0.06,dz);
    dMesh.receiveShadow=true;
    g.add(dMesh);
  }

  // Ice patches and perimeter rocks removed (appeared as dark blobs on snow)

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

// Snow particle system removed for performance

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
    {x1:-38, z1:-30, x2:-38, z2:44},   // West perimeter boundary
    {x1:38,  z1:-30, x2:38,  z2:44},   // East perimeter boundary
    {x1:-38, z1:-30, x2:-4.0,z2:-30},  // North-West boundary (service entry gap)
    {x1:4.0, z1:-30, x2:38,  z2:-30},  // North-East boundary
    {x1:-38, z1:44,  x2:-5.5,z2:44},   // South-West boundary (helipad gap)
    {x1:5.5, z1:44,  x2:38,  z2:44},   // South-East boundary
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

  // Pipe line runs connecting Energy & Fuel [24,-16] -> Central Spine -> Main Station [0,0] -> Water [26,2]
  for(const {x1,z1,x2,z2} of [
    {x1:22, z1:-16, x2:4,  z2:-16}, // Energy to Central Spine
    {x1:4,  z1:-16, x2:4,  z2:0},   // Along Spine towards Main Station
    {x1:4,  z1:0,   x2:22, z2:0},   // From Spine east towards Water Facility
    {x1:22, z1:0,   x2:24, z2:2},   // Into Water Facility
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
    // 1. Central North-South Main Highway (from Met Tower [0,-22] through Main Hub [0,0] to Helipad [0,36])
    {x:0,   z:7,   w:4.0, d:60},  // extends from z = -23 to z = +37

    // 2. North Cross Artery (connects Comms [-24,-16] to Spine [0,-16] to Energy [24,-16])
    {x:0,   z:-16, w:52,  d:4.0}, // covers x = -26 to +26

    // 3. Central Cross Artery (Main Hub front boulevard connecting West and East corridors)
    {x:0,   z:0,   w:52,  d:4.0}, // covers x = -26 to +26

    // 4. South Cross Artery (connects Personnel [-24,16] across Spine [0,18] to Logistics [24,20])
    {x:0,   z:18,  w:52,  d:4.0}, // covers x = -26 to +26

    // 5. West North-South Connector (connecting Comms [-24,-16] down to Personnel [-24,16])
    {x:-24, z:0,   w:4.0, d:38},  // covers z = -19 to +19

    // 6. East North-South Connector (connecting Energy [24,-16] down past Water [26,2] to Logistics [24,20])
    {x:24,  z:2,   w:4.0, d:42},  // covers z = -19 to +23

    // 7. Water Facility Spur (from East Connector into Water Facility at [26,2])
    {x:25.5,z:2,   w:5.0, d:4.0},

    // 8. Helipad Approach Plaza (at [0,36])
    {x:0,   z:35,  w:12,  d:6.0},
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
    // Central Spine Junctions
    [0, -22, 3.2], // Met Tower North terminus
    [0, -16, 3.2], // Spine x North Artery
    [0, 0,   3.6], // Spine x Central Artery (Main Station Front)
    [0, 18,  3.2], // Spine x South Artery
    [0, 35,  3.4], // Spine x Helipad Approach Plaza

    // West Wing Junctions
    [-24, -16, 3.2], // Comms Station & North-West corner
    [-24, 0,   3.2], // West Connector x Central Artery
    [-24, 16,  3.2], // Personnel Quarters & South-West corner

    // East Wing Junctions
    [24, -16, 3.2],  // Energy & Fuel & North-East corner
    [24, 0,   3.2],  // East Connector x Central Artery
    [26, 2,   3.0],  // Water Facility Spur & Apron
    [24, 18,  3.2],  // East Connector x South Artery
    [24, 20,  3.2],  // Logistics Staging Depot
  ];
  for(const [jx,jz,jr] of junctions){
    const jp=new THREE.Mesh(new THREE.CylinderGeometry(jr,jr,0.086,32),roadMat.clone());
    jp.position.set(jx,ROAD_Y+0.003,jz);
    jp.receiveShadow=true;
    g.add(jp);
  }

  // Helipad (Elevated with plowed snow safety border at z=36)
  const hpad=new THREE.Mesh(new THREE.CylinderGeometry(5.8,5.8,0.14,64),new THREE.MeshStandardMaterial({color:0x12161e,roughness:0.82,metalness:0.08}));
  hpad.position.set(0,0.11,36); hpad.receiveShadow=true; g.add(hpad);
  const hr=new THREE.Mesh(new THREE.RingGeometry(5.2,5.7,64),new THREE.MeshStandardMaterial({color:0xf59e0b,emissive:new THREE.Color(0xf59e0b),emissiveIntensity:0.65,side:THREE.DoubleSide}));
  hr.rotation.x=-Math.PI/2; hr.position.set(0,0.185,36); g.add(hr);
  const hm=new THREE.MeshStandardMaterial({color:0xf8fafc,emissive:new THREE.Color(0xf8fafc),emissiveIntensity:0.55});
  const hb=new THREE.Mesh(new THREE.BoxGeometry(0.4,0.08,4.8),hm.clone()); hb.position.set(0,0.19,36); g.add(hb);
  const hl=new THREE.Mesh(new THREE.BoxGeometry(0.4,0.08,3.4),hm.clone()); hl.position.set(-2.2,0.19,36); hl.rotation.y=Math.PI/2; g.add(hl);
  const hri=new THREE.Mesh(new THREE.BoxGeometry(0.4,0.08,3.4),hm.clone()); hri.position.set(2.2,0.19,36); hri.rotation.y=Math.PI/2; g.add(hri);
  for(let i=0;i<24;i++){
    const a=(i/24)*Math.PI*2;
    const pl=new THREE.Mesh(new THREE.CylinderGeometry(0.12,0.12,0.24,6),new THREE.MeshStandardMaterial({color:0xfde68a,emissive:new THREE.Color(0xfde68a),emissiveIntensity:2.4}));
    pl.position.set(Math.cos(a)*5.6,0.22,36+Math.sin(a)*5.6); g.add(pl);
  }

  // Antarctic Route Marker Wands along active road shoulders
  const wandMat=new THREE.MeshStandardMaterial({color:0xf97316,roughness:0.4,metalness:0.6});
  const flagMat=new THREE.MeshStandardMaterial({color:0xef4444,roughness:0.5,metalness:0.1,emissive:new THREE.Color(0xff3300),emissiveIntensity:1.5});
  const wandPositions:Array<[number,number]>=[
    // Central Spine (x = ±2.3)
    [-2.3,-18],[-2.3,-10],[-2.3,-4],[-2.3,6],[-2.3,12],[-2.3,24],[-2.3,30],
    [2.3,-18],[2.3,-10],[2.3,-4],[2.3,6],[2.3,12],[2.3,24],[2.3,30],

    // North Artery (z = -14.2 & -17.8)
    [-18,-14.2],[-12,-14.2],[-6,-14.2],[6,-14.2],[12,-14.2],[18,-14.2],
    [-18,-17.8],[-12,-17.8],[-6,-17.8],[6,-17.8],[12,-17.8],[18,-17.8],

    // Central Artery (z = 2.2 & -2.2)
    [-18,2.2],[-12,2.2],[-6,2.2],[6,2.2],[12,2.2],[18,2.2],
    [-18,-2.2],[-12,-2.2],[-6,-2.2],[6,-2.2],[12,-2.2],[18,-2.2],

    // South Artery (z = 16.2 & 19.8)
    [-18,16.2],[-12,16.2],[-6,16.2],[6,16.2],[12,16.2],[18,16.2],
    [-18,19.8],[-12,19.8],[-6,19.8],[6,19.8],[12,19.8],[18,19.8],

    // West Connector (x = -25.8 & -22.2)
    [-25.8,-10],[-25.8,-4],[-25.8,6],[-25.8,11],
    [-22.2,-10],[-22.2,-4],[-22.2,6],[-22.2,11],

    // East Connector (x = 22.2 & 25.8)
    [22.2,-10],[22.2,-4],[22.2,8],[22.2,14],
    [25.8,-10],[25.8,-4],[25.8,8],[25.8,14],
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
    // Central Spine & Main Station Hub
    [2.5, -4], [-2.5, -4], [2.5, 4], [-2.5, 4],
    [2.5, 12], [-2.5, 12], [2.5, 24], [-2.5, 24],
    // Met Tower North approach
    [2.5, -20], [-2.5, -20],
    // Comms Station West approach
    [-21.5, -14], [-26.5, -14],
    // Personnel Habitat South-West approach
    [-21.5, 14], [-26.5, 14],
    // Energy & Fuel North-East approach
    [21.5, -14], [26.5, -14],
    // Water Facility Mid-East approach
    [23.5, 4], [28.5, 4],
    // Logistics Depot South-East approach
    [21.5, 20], [26.5, 20],
    // Helipad South approach
    [2.5, 32], [-2.5, 32],
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
    [21,0,21,0.3],     // Logistics freight carrier (Logistics staging yard)
    [26,0,21,-0.2],    // Heavy cargo hauler (Logistics yard)
    [23,0,4,0.0],      // Water tanker vehicle near Water Facility
    [21,0,-14,0.2],    // Fuel service snowcat at Energy Depot
    [-21,0,-14,-0.4],  // Scientific comms repair snowcat
    [-21,0,14,0.1],    // Crew personnel shuttle at Habitat
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
  for(const [cx,cy,cz,cr] of [
    [21,0,18,0], [23.5,0,18,0], [22.2,1.05,18,0], // Logistics container stack 1
    [27,0,19,0.2], [27,0,21.5,0.2],                // Logistics container stack 2
    [22,0,-18.5,0], [24.5,0,-18.5,0],             // Energy & Fuel spare parts container
    [-22,0,18.5,0]                                 // Habitat supplies container
  ] as [number,number,number,number][]){
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
  const relLines=useRef<THREE.Group>(new THREE.Group());
  const beacons=useRef<THREE.Mesh[]>([]);
  const frameRef=useRef<number>(0);
  const clockRef=useRef(new THREE.Clock());
  const selRef=useRef<string|null>(selectedAsset);
  const showRelRef=useRef(showRelationships);
  // Stable ref for onSelectAsset — avoids scene rebuild when parent re-renders
  const onSelectAssetRef=useRef(onSelectAsset);
  useEffect(()=>{onSelectAssetRef.current=onSelectAsset;},[onSelectAsset]);
  // DOM refs for zero-React-overhead HUD pin updates
  const pinElemsRef=useRef<Map<string,HTMLDivElement>>(new Map());
  const sceneRef=useRef<THREE.Scene|null>(null);
  const isMaitri=stationId!=='bharati';
  const FACILITIES=isMaitri?MAITRI_FACILITIES:BHARATI_FACILITIES;

  const getLiveSubLabel=useCallback((id:string,def:string):string=>{
    if(!snapshot) return def;
    try{
      switch(id){
        case 'infrastructure': return `${Math.round(snapshot.station_ops?.domain_readiness?.infrastructure??94)}% | Structural Nominal`;
        case 'energy_fuel': return `${Math.round(snapshot.station_ops?.domain_readiness?.energy??95)}% | ${snapshot.energy?.generator_count_active??2} Gens • ${Math.round(snapshot.fuel?.fuel_percentage??77)}% Fuel`;
        case 'logistics': return `${snapshot.logistics?.days_to_resupply??88}d Resupply ETA`;
        case 'environment': return `${snapshot.environment?.temperature?.toFixed(1)??'-27.5'}°C | ${snapshot.environment?.condition??'Clear'}`;
        case 'communication': return `${Math.round(snapshot.communication?.data_completeness_pct??96)}% | ${snapshot.communication?.primary_status??'Online'}`;
        case 'water': return `${Math.round(snapshot.water?.percentage??88)}% | ${(Math.round((snapshot.water?.storage_liters??18500)/100)/10).toFixed(1)}k L`;
        case 'personnel': return `100% | ${snapshot.personnel?.headcount??42} Crew Safe`;
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
    renderer.setPixelRatio(Math.min(window.devicePixelRatio,1.5));
    renderer.setSize(el.clientWidth,el.clientHeight);
    renderer.shadowMap.enabled=true;
    renderer.shadowMap.type=THREE.PCFSoftShadowMap;
    renderer.toneMapping=THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure=1.04;
    renderer.setClearColor(0xbfe0f7);
    el.appendChild(renderer.domElement);
    rendRef.current=renderer;

    const scene=new THREE.Scene(); sceneRef.current=scene;
    // Soft weather layer daylight polar fog (gentle depth for mountains; station campus is crisp and sharp)
    scene.fog=new THREE.FogExp2(0xcfe4f7,0.0009);
    scene.background=new THREE.Color(0xbfe0f7);

    // Daylight Polar Sky Dome
    const skyDome=createPolarSky();
    scene.add(skyDome);

    // Camera positioned to view the spacious, balanced 7-domain campus comfortably
    const cam=new THREE.PerspectiveCamera(46,el.clientWidth/el.clientHeight,0.1,800);
    // Well-balanced front-facing south view: campus fills frame naturally
    cam.position.set(0,38,72); cam.lookAt(0,2,2); camRef.current=cam;
    const ctrl=new OrbitControls(cam,renderer.domElement);
    ctrl.enableDamping=true; ctrl.dampingFactor=0.07;
    ctrl.maxPolarAngle=Math.PI/2.04; ctrl.minDistance=10; ctrl.maxDistance=280;
    ctrl.target.set(0,2,2); ctrlRef.current=ctrl;

    // Touch gesture configuration:
    //  1 finger  = orbit / rotate the view
    //  2 fingers = pinch to zoom + drag to pan
    ctrl.touches={ONE:THREE.TOUCH.ROTATE,TWO:THREE.TOUCH.DOLLY_PAN};
    ctrl.rotateSpeed=0.55;   // comfortable single-finger orbit
    ctrl.panSpeed=0.45;      // gentle two-finger pan
    ctrl.zoomSpeed=0.75;     // smooth two-finger pinch zoom

    // Prevent browser scroll/zoom hijacking touch on the canvas
    renderer.domElement.style.touchAction='none';

    // --- Clean Polar Daylight Lighting (Natural Pure White Snow + Vibrant Building Colors) ---
    // 1. Natural polar skylight ambient fill
    scene.add(new THREE.AmbientLight(0xc2e0fa,0.72));

    // 2. Direct polar sun (crisp daylight with soft natural shadows)
    const sun=new THREE.DirectionalLight(0xffffff,1.95);
    sun.position.set(65,42,38);
    sun.castShadow=true;
    sun.shadow.mapSize.set(1024,1024);
    sun.shadow.camera.left=-90; sun.shadow.camera.right=90;
    sun.shadow.camera.top=90; sun.shadow.camera.bottom=-90;
    sun.shadow.camera.near=10; sun.shadow.camera.far=240;
    sun.shadow.bias=-0.0003;
    sun.shadow.radius=1.5;
    scene.add(sun);

    // 3. Polar fill light from opposite quadrant
    const fillLight=new THREE.DirectionalLight(0x93c5fd,0.40);
    fillLight.position.set(-60,30,-45); scene.add(fillLight);

    // 4. Ground snow bounce light (natural polar surface reflectivity)
    const snowBounce=new THREE.DirectionalLight(0xe8f4fd,0.32);
    snowBounce.position.set(0,-1,0); scene.add(snowBounce);

    // Environment: Terrain & Mountains
    scene.add(buildTerrain(isMaitri));

    // Roads, pathways, aprons, vehicles, elevated pipes, and low safety boundary
    scene.add(buildStationDetails());

    // Snow particles removed for performance

    // Facility Buildings
    facGrps.current.clear(); beacons.current=[];
    const bColorMap:Record<string,number>={
      water:0x38bdf8,logistics:0xf97316,infrastructure:0x06b6d4,energy_fuel:0xf59e0b,
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
      // Scale all buildings up 22% for better visibility
      bld.scale.multiplyScalar(1.22);
      bld.position.set(...fac.position); bld.userData.facId=fac.id; scene.add(bld);
      facGrps.current.set(fac.id,bld);

      // Collect red beacons for blinking
      bld.traverse((obj)=>{if((obj as THREE.Mesh).userData?.beacon) beacons.current.push(obj as THREE.Mesh);});
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
        // Walk up to find the building group with facId — check EVERY node including scene children
        let cur:THREE.Object3D|null=hits[0].object;
        while(cur){
          if(cur.userData?.facId){
            const facId=cur.userData.facId as string;
            // Fire zoom animation directly — no React effect timing issues
            const facDef=FACILITIES.find(f=>f.id===facId);
            if(facDef&&camRef.current&&ctrlRef.current){
              const tgt=new THREE.Vector3(...facDef.position);
              const startCam=camRef.current.position.clone();
              const endCam=tgt.clone().add(new THREE.Vector3(14,18,18));
              const startTgt=ctrlRef.current.target.clone();
              let t0:number|null=null;
              const doZoom=(ts:number)=>{
                if(!t0) t0=ts;
                const p=Math.min(1,(ts-t0)/700);
                const e2=p<0.5?2*p*p:-1+(4-2*p)*p;
                camRef.current?.position.lerpVectors(startCam,endCam,e2);
                ctrlRef.current?.target.lerpVectors(startTgt,tgt,e2);
                if(p<1) requestAnimationFrame(doZoom);
                else ctrlRef.current?.update();
              };
              requestAnimationFrame(doZoom);
            }
            onSelectAssetRef.current(facId);
            return;
          }
          cur=cur.parent;  // walk all the way up, including scene-level group
        }
      }
    };
    const dom=renderer.domElement;
    dom.addEventListener('mousedown',onMouseDown);
    dom.addEventListener('mouseup',onMouseUp);

    // ── Touch building click (single-finger tap on a 3D mesh) ──
    // A "tap" = touchstart followed by touchend with minimal movement
    let touchDownX=0,touchDownY=0;
    const onTouchStart=(e:TouchEvent)=>{
      if(e.touches.length===1){
        touchDownX=e.touches[0].clientX;
        touchDownY=e.touches[0].clientY;
      }
    };
    const onTouchEnd=(e:TouchEvent)=>{
      // Only treat as tap when single finger and barely moved
      if(e.changedTouches.length!==1) return;
      const t=e.changedTouches[0];
      if(Math.hypot(t.clientX-touchDownX,t.clientY-touchDownY)>10) return;
      const rect=dom.getBoundingClientRect();
      mouse.x=((t.clientX-rect.left)/rect.width)*2-1;
      mouse.y=-((t.clientY-rect.top)/rect.height)*2+1;
      raycaster.setFromCamera(mouse,cam);
      const meshes:THREE.Mesh[]=[];
      facGrps.current.forEach((grp)=>grp.traverse((c)=>{if((c as THREE.Mesh).isMesh) meshes.push(c as THREE.Mesh);}));
      const hits=raycaster.intersectObjects(meshes,false);
      if(hits.length>0){
        let cur:THREE.Object3D|null=hits[0].object;
        while(cur){
          if(cur.userData?.facId){
            const facId=cur.userData.facId as string;
            const facDef=FACILITIES.find(f=>f.id===facId);
            if(facDef&&camRef.current&&ctrlRef.current){
              const tgt=new THREE.Vector3(...facDef.position);
              const startCam=camRef.current.position.clone();
              const endCam=tgt.clone().add(new THREE.Vector3(14,18,18));
              const startTgt=ctrlRef.current.target.clone();
              let t0:number|null=null;
              const doZoom=(ts:number)=>{
                if(!t0) t0=ts;
                const p=Math.min(1,(ts-t0)/700);
                const e2=p<0.5?2*p*p:-1+(4-2*p)*p;
                camRef.current?.position.lerpVectors(startCam,endCam,e2);
                ctrlRef.current?.target.lerpVectors(startTgt,tgt,e2);
                if(p<1) requestAnimationFrame(doZoom);
                else ctrlRef.current?.update();
              };
              requestAnimationFrame(doZoom);
            }
            onSelectAssetRef.current(facId);
            return;
          }
          cur=cur.parent;
        }
      }
    };
    dom.addEventListener('touchstart',onTouchStart,{passive:true});
    dom.addEventListener('touchend',onTouchEnd,{passive:true});

    // Pre-build cached relationship lines (rebuilt only when selection changes)
    const posMap=new Map(FACILITIES.map(f=>[f.id,f.position]));
    let cachedRelSel:string|null=null;
    const rebuildRelLines=(sel:string|null)=>{
      while(relLines.current.children.length){
        const c=relLines.current.children[0];
        (c as THREE.Line).geometry?.dispose();
        ((c as THREE.Line).material as THREE.Material)?.dispose();
        relLines.current.remove(c);
      }
      if(!sel) return;
      const targets=RELATIONSHIPS[sel]??[];
      const srcPos=posMap.get(sel);
      if(!srcPos) return;
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
      cachedRelSel=sel;
    };

    // Reusable vector to avoid per-frame allocation
    const _wp=new THREE.Vector3();

    // Fixed pin heights per facility — tuned so no labels overlap
    // (defined once here, not re-created every animation frame)
    const PIN_Y: Record<string,number> = {
      environment:     12,  // Z=-22, Met tower peak
      communication:    8,  // Z=-16, West comms array
      energy_fuel:      8,  // Z=-16, East generator stack
      infrastructure:   7,  // Z=0,   Central Command Hub
      water:            6,  // Z=2,   Mid-East facility
      personnel:        6,  // Z=16,  South-West habitat
      logistics:        6,  // Z=20,  South-East depot
    };

    // Animation Loop
    const animate=()=>{
      frameRef.current=requestAnimationFrame(animate);
      const t=clockRef.current.getElapsedTime();
      ctrl.update();

      // Blink red beacons (update only when intensity bucket changes)
      const bBright=(Math.sin(t*4)+1)>1.0;
      const newIntensity=bBright?3.5:0.2;
      for(const b of beacons.current){
        const bm=b.material as THREE.MeshStandardMaterial;
        if(bm.emissiveIntensity!==newIntensity) bm.emissiveIntensity=newIntensity;
      }

      // Rebuild relationship lines only when selection changes
      const sel=selRef.current;
      if(showRelRef.current){
        if(cachedRelSel!==sel) rebuildRelLines(sel);
      } else {
        if(cachedRelSel!==null) rebuildRelLines(null);
      }

      renderer.render(scene,cam);

      // Update HUD pins via direct DOM — zero React re-renders
      const pinElems=pinElemsRef.current;
      for(const fac of FACILITIES){
        const el2=pinElems.get(fac.id);
        if(!el2) continue;
      // Per-facility pin heights (from PIN_Y table defined above animate loop)
      const pinY = PIN_Y[fac.id] ?? (fac.scale??1)*4.5+1.5;
      _wp.set(fac.position[0], pinY, fac.position[2]);
        const p=project(_wp);
        if(p.vis){
          el2.style.left=p.x+'px';
          el2.style.top=p.y+'px';
          el2.style.display='';
        } else {
          el2.style.display='none';
        }
      }
    };
    animate();

    const onResize=()=>{
      if(!el||!renderer||!cam) return;
      cam.aspect=el.clientWidth/el.clientHeight; cam.updateProjectionMatrix();
      renderer.setSize(el.clientWidth,el.clientHeight);
    };
    window.addEventListener('resize',onResize);
    const ro = new ResizeObserver(() => onResize());
    ro.observe(el);

    return()=>{
      cancelAnimationFrame(frameRef.current);
      window.removeEventListener('resize',onResize);
      ro.disconnect();
      dom.removeEventListener('mousedown',onMouseDown);
      dom.removeEventListener('mouseup',onMouseUp);
      dom.removeEventListener('touchstart',onTouchStart);
      dom.removeEventListener('touchend',onTouchEnd);
      ctrl.dispose(); renderer.dispose();
      if(dom&&dom.parentNode===el) el.removeChild(dom);
    };
  },[isMaitri,project]);

  // HUD pin selection — no zoom, just select
  // (zoom only fires from 3D mesh click handler above)

  return(
    <div style={{position:'relative',width:'100%',height:'100%',overflow:'hidden',background:'#102746'}}>
      <div ref={mountRef} style={{width:'100%',height:'100%'}}/>

      {/* Floating 2D HUD Pins — rendered once, updated via DOM refs in animate loop */}
      {FACILITIES.map(fac=>{
        const isSel=fac.id===selectedAsset;
        const rgb=hexToRgb(fac.color);
        const liveLabel=getLiveSubLabel(fac.id,fac.subLabel);
        return(
          <div
            key={fac.id}
            ref={(el)=>{ if(el) pinElemsRef.current.set(fac.id,el); }}
            onClick={()=>onSelectAsset(fac.id)}
            style={{
              position:'absolute',left:0,top:0,
              transform:'translate(-50%,-100%)',
              pointerEvents:'auto',cursor:'pointer',
              zIndex:isSel?30:10,transition:'opacity 0.2s'
            }}
          >
            <div style={{position:'absolute',bottom:-14,left:'50%',transform:'translateX(-50%)',width:isSel?2:1.5,height:14,background:`linear-gradient(to bottom,${fac.color},${fac.color}00)`,opacity:isSel?0.95:0.6}}/>
            <div style={{background:isSel?`linear-gradient(135deg,rgba(4,14,35,0.97) 0%,rgba(${rgb},0.18) 100%)`:'rgba(6,16,38,0.88)',border:`1.5px solid ${isSel?fac.color:fac.color+'60'}`,borderRadius:9,padding:'5px 11px 5px 8px',minWidth:138,backdropFilter:'blur(14px)',boxShadow:isSel?'0 4px 20px rgba(0,0,0,0.8)':'0 3px 14px rgba(0,0,0,0.5)',transition:'all 0.2s ease',userSelect:'none'}}>
              <div style={{display:'flex',alignItems:'center',gap:6,marginBottom:2}}>
                <span style={{fontSize:13,width:22,height:22,display:'flex',alignItems:'center',justifyContent:'center',background:`rgba(${rgb},0.18)`,borderRadius:5,flexShrink:0}}>{fac.icon}</span>
                <span style={{fontSize:11,fontWeight:700,color:fac.color,fontFamily:'monospace',letterSpacing:'0.03em',whiteSpace:'nowrap'}}>{fac.label}</span>
              </div>
              <div style={{fontSize:10,color:'#94a3b8',fontFamily:'monospace',paddingLeft:28}}>{liveLabel}</div>
            </div>
          </div>
        );
      })}
    </div>
  );
};

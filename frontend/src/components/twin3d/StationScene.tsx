import React, { useRef, useState } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { OrbitControls, Text, Float } from '@react-three/drei';
import * as THREE from 'three';
import { TelemetrySnapshot } from '../../types';

interface Props {
  snapshot?: TelemetrySnapshot;
  onSelectAsset: (assetId: string) => void;
  selectedAsset: string | null;
}

// Clickable Building / Module
function StationBuilding({
  position,
  size,
  color,
  label,
  assetId,
  onSelect,
  isSelected
}: {
  position: [number, number, number];
  size: [number, number, number];
  color: string;
  label: string;
  assetId: string;
  onSelect: (id: string) => void;
  isSelected: boolean;
}) {
  const [hovered, setHovered] = useState(false);
  const meshRef = useRef<THREE.Mesh>(null);

  return (
    <group position={position}>
      <mesh
        ref={meshRef}
        onClick={(e) => {
          e.stopPropagation();
          onSelect(assetId);
        }}
        onPointerOver={() => setHovered(true)}
        onPointerOut={() => setHovered(false)}
        castShadow
        receiveShadow
      >
        <boxGeometry args={size} />
        <meshStandardMaterial
          color={isSelected ? '#00e5ff' : hovered ? '#38bdf8' : color}
          roughness={0.3}
          metalness={0.7}
          emissive={isSelected ? '#00e5ff' : hovered ? '#0284c7' : '#000000'}
          emissiveIntensity={isSelected ? 0.6 : hovered ? 0.3 : 0.0}
        />
      </mesh>

      {/* Label above */}
      <Float speed={1.5} rotationIntensity={0} floatIntensity={0.2}>
        <Text
          position={[0, size[1] / 2 + 0.6, 0]}
          fontSize={0.35}
          color={isSelected ? '#00e5ff' : '#ffffff'}
          anchorX="center"
          anchorY="middle"
        >
          {label}
        </Text>
      </Float>
    </group>
  );
}

// Cylindrical Fuel Tank
function FuelTank({
  position,
  radius,
  height,
  label,
  assetId,
  onSelect,
  isSelected
}: {
  position: [number, number, number];
  radius: number;
  height: number;
  label: string;
  assetId: string;
  onSelect: (id: string) => void;
  isSelected: boolean;
}) {
  const [hovered, setHovered] = useState(false);

  return (
    <group position={position}>
      <mesh
        onClick={(e) => {
          e.stopPropagation();
          onSelect(assetId);
        }}
        onPointerOver={() => setHovered(true)}
        onPointerOut={() => setHovered(false)}
        castShadow
        receiveShadow
      >
        <cylinderGeometry args={[radius, radius, height, 24]} />
        <meshStandardMaterial
          color={isSelected ? '#00e5ff' : hovered ? '#67e8f9' : '#0284c7'}
          metalness={0.8}
          roughness={0.2}
          emissive={isSelected ? '#00e5ff' : '#000000'}
          emissiveIntensity={isSelected ? 0.5 : 0.0}
        />
      </mesh>
      <Text
        position={[0, height / 2 + 0.4, 0]}
        fontSize={0.3}
        color="#ffffff"
        anchorX="center"
        anchorY="middle"
      >
        {label}
      </Text>
    </group>
  );
}

// Satellite Radome
function SatcomDome({
  position,
  radius,
  label,
  assetId,
  onSelect,
  isSelected
}: {
  position: [number, number, number];
  radius: number;
  label: string;
  assetId: string;
  onSelect: (id: string) => void;
  isSelected: boolean;
}) {
  const [hovered, setHovered] = useState(false);

  return (
    <group position={position}>
      {/* Base pedestal */}
      <mesh position={[0, -radius * 0.8, 0]}>
        <cylinderGeometry args={[radius * 0.4, radius * 0.6, radius * 0.8, 16]} />
        <meshStandardMaterial color="#475569" metalness={0.8} />
      </mesh>
      {/* Sphere dome */}
      <mesh
        onClick={(e) => {
          e.stopPropagation();
          onSelect(assetId);
        }}
        onPointerOver={() => setHovered(true)}
        onPointerOut={() => setHovered(false)}
        castShadow
      >
        <sphereGeometry args={[radius, 24, 24]} />
        <meshStandardMaterial
          color={isSelected ? '#00e5ff' : hovered ? '#bae6fd' : '#f8fafc'}
          roughness={0.4}
          metalness={0.2}
          emissive={isSelected ? '#00e5ff' : '#000000'}
          emissiveIntensity={isSelected ? 0.5 : 0.0}
        />
      </mesh>
      <Text
        position={[0, radius + 0.5, 0]}
        fontSize={0.3}
        color="#ffffff"
        anchorX="center"
        anchorY="middle"
      >
        {label}
      </Text>
    </group>
  );
}

// Snow ground terrain with subtle ice shading
function PolarTerrain() {
  return (
    <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.05, 0]} receiveShadow>
      <planeGeometry args={[60, 60, 32, 32]} />
      <meshStandardMaterial
        color="#10233d"
        roughness={0.9}
        metalness={0.1}
      />
    </mesh>
  );
}

export const StationScene: React.FC<Props> = ({
  snapshot,
  onSelectAsset,
  selectedAsset
}) => {
  const isMaitri = snapshot?.station_id === 'maitri';

  return (
    <div className="w-full h-full relative rounded-2xl overflow-hidden bg-gradient-to-b from-[#051120] to-[#02070f] border border-polar-border">
      {/* 3D Canvas */}
      <Canvas
        camera={{ position: [12, 10, 14], fov: 45 }}
        shadows
      >
        <ambientLight intensity={0.6} />
        <directionalLight
          position={[15, 20, 10]}
          intensity={1.2}
          castShadow
          shadow-mapSize-width={1024}
          shadow-mapSize-height={1024}
        />
        <pointLight position={[-10, 8, -5]} intensity={0.5} color="#00e5ff" />

        <PolarTerrain />

        {/* Station Layout */}
        {/* 1. Main Living & Laboratory Block */}
        <StationBuilding
          position={[0, 1.2, 0]}
          size={[5.5, 2.4, 3.8]}
          color="#1e3a5f"
          label={isMaitri ? "Main Habitat Block" : "Modular Living Complex"}
          assetId="habitat"
          onSelect={onSelectAsset}
          isSelected={selectedAsset === 'habitat'}
        />

        {/* 2. Generator & Power Plant Shelter */}
        <StationBuilding
          position={[-6.5, 1.0, -1.5]}
          size={[3.8, 2.0, 2.8]}
          color="#0f766e"
          label={isMaitri ? "Generator Unit Block" : "3x100kVA CHP Plant"}
          assetId="generator"
          onSelect={onSelectAsset}
          isSelected={selectedAsset === 'generator'}
        />

        {/* 3. Fuel Tank Farm */}
        <FuelTank
          position={[-7.5, 1.5, 3.5]}
          radius={1.2}
          height={3.0}
          label="Fuel Farm Tank 1"
          assetId="fuel_tank"
          onSelect={onSelectAsset}
          isSelected={selectedAsset === 'fuel_tank'}
        />
        <FuelTank
          position={[-5.0, 1.5, 4.2]}
          radius={1.2}
          height={3.0}
          label="Fuel Farm Tank 2"
          assetId="fuel_tank"
          onSelect={onSelectAsset}
          isSelected={selectedAsset === 'fuel_tank'}
        />

        {/* 4. Water Extraction Pump Station */}
        <StationBuilding
          position={[6.5, 0.9, -3.5]}
          size={[3.0, 1.8, 2.4]}
          color="#0284c7"
          label={isMaitri ? "Zub Lake Pump House" : "Quilty Bay Seawater Intake"}
          assetId="water_pump"
          onSelect={onSelectAsset}
          isSelected={selectedAsset === 'water_pump'}
        />

        {/* 5. Tracking Satcom Array */}
        <SatcomDome
          position={[5.5, 1.6, 3.0]}
          radius={1.1}
          label="Satcom Earth Terminal"
          assetId="satcom"
          onSelect={onSelectAsset}
          isSelected={selectedAsset === 'satcom'}
        />

        <OrbitControls
          maxPolarAngle={Math.PI / 2.1}
          minDistance={6}
          maxDistance={32}
          enableDamping
        />
      </Canvas>

      {/* Floating Instructions Pill */}
      <div className="absolute top-4 left-4 glass-panel px-3 py-1.5 rounded-lg border border-cyan-500/30 text-xs font-mono text-cyan-300 flex items-center space-x-2 pointer-events-none">
        <span className="w-2 h-2 rounded-full bg-cyan-400 animate-pulse" />
        <span>INTERACTIVE 3D TWIN • CLICK ASSETS TO INSPECT LIVE TELEMETRY</span>
      </div>
    </div>
  );
};

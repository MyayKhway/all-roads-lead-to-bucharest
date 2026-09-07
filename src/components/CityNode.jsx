/**
 * CityNode — renders a city as a base platform + landmark + label.
 *
 * Props:
 *   city          {object}  — city data from cities.js
 *   status        {string}  — 'normal' | 'start' | 'goal' | 'explored' | 'path'
 *   onClick       {fn}      — called with city id when clicked
 *   onPointerOver {fn}
 *   onPointerOut  {fn}
 */

import { useRef, useState } from 'react';
import { Text, Billboard } from '@react-three/drei';
import Landmark from './Landmark.jsx';

const STATUS_COLORS = {
  normal:   '#E8E0C8',
  start:    '#66BB6A',
  goal:     '#EF5350',
  explored: '#78909C',
  path:     '#43A047',
  hover:    '#FFD54F',
};

const BASE_HEIGHT = 0.06;

export default function CityNode({ city, status = 'normal', onClick, onPointerOver, onPointerOut }) {
  const [hovered, setHovered] = useState(false);
  const groupRef = useRef();

  const isHighlighted = status === 'start' || status === 'goal' || status === 'path';
  const isExplored    = status === 'explored';
  const platformColor = hovered ? STATUS_COLORS.hover : STATUS_COLORS[status] ?? STATUS_COLORS.normal;

  function handlePointerOver(e) {
    e.stopPropagation();
    setHovered(true);
    document.body.style.cursor = 'pointer';
    onPointerOver && onPointerOver(city.id);
  }

  function handlePointerOut(e) {
    e.stopPropagation();
    setHovered(false);
    document.body.style.cursor = 'default';
    onPointerOut && onPointerOut(city.id);
  }

  function handleClick(e) {
    e.stopPropagation();
    onClick && onClick(city.id);
  }

  const [px, py, pz] = city.position;

  return (
    <group
      ref={groupRef}
      position={[px, py, pz]}
      onClick={handleClick}
      onPointerOver={handlePointerOver}
      onPointerOut={handlePointerOut}
    >
      {/* Circular base platform */}
      <mesh position={[0, BASE_HEIGHT / 2, 0]} receiveShadow castShadow>
        <cylinderGeometry args={[0.45, 0.48, BASE_HEIGHT, 16]} />
        <meshStandardMaterial color={platformColor} roughness={0.8} metalness={0.05} />
      </mesh>

      {/* Glow ring for start / goal / path */}
      {isHighlighted && (
        <mesh position={[0, 0.01, 0]} rotation={[-Math.PI / 2, 0, 0]}>
          <ringGeometry args={[0.48, 0.58, 32]} />
          <meshStandardMaterial
            color={status === 'goal' ? '#EF5350' : '#66BB6A'}
            emissive={status === 'goal' ? '#EF5350' : '#66BB6A'}
            emissiveIntensity={0.8}
            transparent
            opacity={0.7}
            side={2}
          />
        </mesh>
      )}

      {/* Landmark model (procedural) */}
      <group position={[0, BASE_HEIGHT, 0]}>
        <Landmark
          cityId={city.id}
          highlight={isHighlighted}
          explored={isExplored}
        />
      </group>

      {/* City label — always faces camera */}
      <Billboard follow position={[0, 1.4, 0]}>
        <Text
          fontSize={0.22}
          color={isHighlighted ? '#1A3C2A' : '#3E3020'}
          anchorX="center"
          anchorY="middle"
          outlineWidth={0.02}
          outlineColor="#FCF0AF"
          font={undefined}
        >
          {city.name}
        </Text>
      </Billboard>
    </group>
  );
}

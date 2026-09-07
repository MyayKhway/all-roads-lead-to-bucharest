/**
 * Landmark — procedural low-poly city landmark.
 *
 * Since we have no actual GLB files, each city gets a distinctive
 * procedural shape so the scene looks rich without any assets.
 * The shape variant is chosen deterministically from the city id.
 */

import { useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';

// Map city ids to shape variants so each city looks unique
const SHAPE_MAP = {
  arad:      'castle',
  zerind:    'church',
  oradea:    'castle',
  timisoara: 'cathedral',
  lugoj:     'tower',
  mehadia:   'fort',
  drobeta:   'arch',
  craiova:   'palace',
  sibiu:     'bridge',
  rimnicu:   'tower',
  pitesti:   'fort',
  fagaras:   'castle',
  bucharest: 'palace',
  giurgiu:   'fort',
  urziceni:  'church',
  hirsova:   'castle',
  eforie:    'tower',
  vaslui:    'fort',
  iasi:      'palace',
  neamt:     'castle',
};

const PASTEL = {
  castle:   '#B5D5C5',
  church:   '#D4B8E0',
  cathedral:'#C8D8E8',
  tower:    '#F5C6A0',
  fort:     '#C4A882',
  arch:     '#E8D5A3',
  palace:   '#F2B5D4',
  bridge:   '#A8D8EA',
};

function CastleShape({ color, scale }) {
  return (
    <group scale={scale}>
      {/* Main keep */}
      <mesh position={[0, 0.3, 0]} castShadow>
        <boxGeometry args={[0.4, 0.6, 0.4]} />
        <meshStandardMaterial color={color} roughness={0.7} />
      </mesh>
      {/* Battlements */}
      {[[-0.15, -0.15], [0.15, -0.15], [-0.15, 0.15], [0.15, 0.15]].map(([x, z], i) => (
        <mesh key={i} position={[x, 0.7, z]} castShadow>
          <boxGeometry args={[0.1, 0.15, 0.1]} />
          <meshStandardMaterial color={color} roughness={0.7} />
        </mesh>
      ))}
      {/* Roof cone */}
      <mesh position={[0, 0.9, 0]} castShadow>
        <coneGeometry args={[0.25, 0.3, 6]} />
        <meshStandardMaterial color="#E87070" roughness={0.6} />
      </mesh>
    </group>
  );
}

function ChurchShape({ color, scale }) {
  return (
    <group scale={scale}>
      <mesh position={[0, 0.2, 0]} castShadow>
        <boxGeometry args={[0.35, 0.4, 0.5]} />
        <meshStandardMaterial color={color} roughness={0.7} />
      </mesh>
      <mesh position={[0, 0.55, 0]} castShadow>
        <coneGeometry args={[0.22, 0.4, 4]} />
        <meshStandardMaterial color="#9B7EBD" roughness={0.6} />
      </mesh>
      {/* Bell tower */}
      <mesh position={[0.2, 0.35, 0.1]} castShadow>
        <cylinderGeometry args={[0.07, 0.07, 0.5, 8]} />
        <meshStandardMaterial color={color} roughness={0.7} />
      </mesh>
      <mesh position={[0.2, 0.65, 0.1]} castShadow>
        <coneGeometry args={[0.1, 0.2, 8]} />
        <meshStandardMaterial color="#9B7EBD" roughness={0.6} />
      </mesh>
    </group>
  );
}

function CathedralShape({ color, scale }) {
  return (
    <group scale={scale}>
      <mesh position={[0, 0.25, 0]} castShadow>
        <boxGeometry args={[0.55, 0.5, 0.7]} />
        <meshStandardMaterial color={color} roughness={0.6} />
      </mesh>
      {/* Central dome */}
      <mesh position={[0, 0.65, 0]} castShadow>
        <sphereGeometry args={[0.22, 10, 8, 0, Math.PI * 2, 0, Math.PI / 2]} />
        <meshStandardMaterial color="#A3C4BC" roughness={0.5} />
      </mesh>
      {/* Side spires */}
      {[[-0.2, 0.2], [0.2, 0.2], [-0.2, -0.2], [0.2, -0.2]].map(([x, z], i) => (
        <group key={i} position={[x, 0, z]}>
          <mesh position={[0, 0.35, 0]} castShadow>
            <cylinderGeometry args={[0.06, 0.06, 0.45, 8]} />
            <meshStandardMaterial color={color} roughness={0.6} />
          </mesh>
          <mesh position={[0, 0.65, 0]} castShadow>
            <coneGeometry args={[0.09, 0.2, 8]} />
            <meshStandardMaterial color="#7BA7BC" roughness={0.5} />
          </mesh>
        </group>
      ))}
    </group>
  );
}

function TowerShape({ color, scale }) {
  return (
    <group scale={scale}>
      <mesh position={[0, 0.35, 0]} castShadow>
        <cylinderGeometry args={[0.18, 0.22, 0.7, 8]} />
        <meshStandardMaterial color={color} roughness={0.7} />
      </mesh>
      <mesh position={[0, 0.8, 0]} castShadow>
        <coneGeometry args={[0.22, 0.35, 8]} />
        <meshStandardMaterial color="#D4845A" roughness={0.6} />
      </mesh>
      {/* Window slits */}
      {[0, Math.PI / 2, Math.PI, (3 * Math.PI) / 2].map((angle, i) => (
        <mesh
          key={i}
          position={[Math.sin(angle) * 0.19, 0.4, Math.cos(angle) * 0.19]}
          rotation={[0, angle, 0]}
          castShadow
        >
          <boxGeometry args={[0.04, 0.12, 0.02]} />
          <meshStandardMaterial color="#5C4A3A" roughness={0.9} />
        </mesh>
      ))}
    </group>
  );
}

function FortShape({ color, scale }) {
  return (
    <group scale={scale}>
      {/* Base wall */}
      <mesh position={[0, 0.15, 0]} castShadow>
        <boxGeometry args={[0.6, 0.3, 0.6]} />
        <meshStandardMaterial color={color} roughness={0.8} />
      </mesh>
      {/* Corner towers */}
      {[[-0.25, -0.25], [0.25, -0.25], [-0.25, 0.25], [0.25, 0.25]].map(([x, z], i) => (
        <mesh key={i} position={[x, 0.3, z]} castShadow>
          <cylinderGeometry args={[0.08, 0.09, 0.35, 6]} />
          <meshStandardMaterial color={color} roughness={0.8} />
        </mesh>
      ))}
      {/* Inner keep */}
      <mesh position={[0, 0.35, 0]} castShadow>
        <boxGeometry args={[0.25, 0.35, 0.25]} />
        <meshStandardMaterial color={color} roughness={0.7} />
      </mesh>
    </group>
  );
}

function ArchShape({ color, scale }) {
  // Simplified arch (Trajan's Bridge reference)
  return (
    <group scale={scale}>
      {/* Two pillars */}
      <mesh position={[-0.2, 0.25, 0]} castShadow>
        <boxGeometry args={[0.12, 0.5, 0.12]} />
        <meshStandardMaterial color={color} roughness={0.7} />
      </mesh>
      <mesh position={[0.2, 0.25, 0]} castShadow>
        <boxGeometry args={[0.12, 0.5, 0.12]} />
        <meshStandardMaterial color={color} roughness={0.7} />
      </mesh>
      {/* Lintel */}
      <mesh position={[0, 0.52, 0]} castShadow>
        <boxGeometry args={[0.52, 0.1, 0.12]} />
        <meshStandardMaterial color={color} roughness={0.6} />
      </mesh>
      {/* Road deck */}
      <mesh position={[0, 0.08, 0]} castShadow>
        <boxGeometry args={[0.7, 0.06, 0.18]} />
        <meshStandardMaterial color="#C8B89A" roughness={0.8} />
      </mesh>
    </group>
  );
}

function PalaceShape({ color, scale }) {
  return (
    <group scale={scale}>
      {/* Main body */}
      <mesh position={[0, 0.25, 0]} castShadow>
        <boxGeometry args={[0.7, 0.5, 0.5]} />
        <meshStandardMaterial color={color} roughness={0.5} />
      </mesh>
      {/* Central pediment */}
      <mesh position={[0, 0.58, 0]} castShadow>
        <coneGeometry args={[0.2, 0.18, 4]} />
        <meshStandardMaterial color="#D4A0B5" roughness={0.5} />
      </mesh>
      {/* Column row (front) */}
      {[-0.25, -0.08, 0.08, 0.25].map((x, i) => (
        <mesh key={i} position={[x, 0.2, 0.26]} castShadow>
          <cylinderGeometry args={[0.03, 0.035, 0.4, 6]} />
          <meshStandardMaterial color="#F0E8D8" roughness={0.4} />
        </mesh>
      ))}
      {/* Wings */}
      <mesh position={[-0.48, 0.18, 0]} castShadow>
        <boxGeometry args={[0.18, 0.36, 0.4]} />
        <meshStandardMaterial color={color} roughness={0.5} />
      </mesh>
      <mesh position={[0.48, 0.18, 0]} castShadow>
        <boxGeometry args={[0.18, 0.36, 0.4]} />
        <meshStandardMaterial color={color} roughness={0.5} />
      </mesh>
    </group>
  );
}

function BridgeShape({ color, scale }) {
  // Bridge of Lies — a small stone bridge
  return (
    <group scale={scale}>
      {/* Deck */}
      <mesh position={[0, 0.2, 0]} castShadow>
        <boxGeometry args={[0.7, 0.08, 0.3]} />
        <meshStandardMaterial color={color} roughness={0.8} />
      </mesh>
      {/* Arch under deck */}
      <mesh position={[0, 0.1, 0]} castShadow>
        <torusGeometry args={[0.18, 0.04, 8, 12, Math.PI]} />
        <meshStandardMaterial color={color} roughness={0.8} />
      </mesh>
      {/* Railings */}
      {[-0.12, 0.12].map((z, i) => (
        <mesh key={i} position={[0, 0.3, z]} castShadow>
          <boxGeometry args={[0.68, 0.06, 0.03]} />
          <meshStandardMaterial color="#D0C0A8" roughness={0.7} />
        </mesh>
      ))}
    </group>
  );
}

// ----- main component -----

export default function Landmark({ cityId, highlight, explored }) {
  const ref = useRef();
  const variant = SHAPE_MAP[cityId] || 'tower';
  const baseColor = PASTEL[variant] || '#A8D5BA';

  // Highlight tint
  const color = highlight ? '#FFE066'
               : explored  ? '#B0B8C4'
               : baseColor;

  // Gentle float animation for highlighted city
  useFrame((state) => {
    if (!ref.current) return;
    if (highlight) {
      ref.current.position.y = Math.sin(state.clock.elapsedTime * 2) * 0.05;
    } else {
      ref.current.position.y = 0;
    }
  });

  const shapeProps = { color, scale: highlight ? 1.25 : 1 };

  return (
    <group ref={ref}>
      {variant === 'castle'    && <CastleShape   {...shapeProps} />}
      {variant === 'church'    && <ChurchShape    {...shapeProps} />}
      {variant === 'cathedral' && <CathedralShape {...shapeProps} />}
      {variant === 'tower'     && <TowerShape     {...shapeProps} />}
      {variant === 'fort'      && <FortShape      {...shapeProps} />}
      {variant === 'arch'      && <ArchShape      {...shapeProps} />}
      {variant === 'palace'    && <PalaceShape    {...shapeProps} />}
      {variant === 'bridge'    && <BridgeShape    {...shapeProps} />}
    </group>
  );
}

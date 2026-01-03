import React, { useRef, useMemo } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { OrbitControls, Text, Line } from '@react-three/drei';
import * as THREE from 'three';

interface BlochSphereProps {
  coordinates: [number, number, number]; 
  label?: string;
  size?: number;
  showAxes?: boolean;
  showLabels?: boolean;
  animated?: boolean;
}

interface SphereContentProps {
  coordinates: [number, number, number];
  showAxes: boolean;
  showLabels: boolean;
  animated: boolean;
}

function SphereContent({ coordinates, showAxes, showLabels, animated }: SphereContentProps) {
  const arrowRef = useRef<THREE.Group>(null);
  const targetPos = useMemo(() => new THREE.Vector3(...coordinates), [coordinates]);
  
  useFrame(() => {
    if (arrowRef.current && animated) {
      const current = arrowRef.current.position;
      current.lerp(targetPos, 0.1);
    }
  });
  
  const [x, y, z] = coordinates;
  const magnitude = Math.sqrt(x * x + y * y + z * z);
  const normalizedCoords: [number, number, number] = magnitude > 0.01 
    ? [x / magnitude, y / magnitude, z / magnitude]
    : [0, 0, 1];

  return (
    <>
      {}
      <mesh>
        <sphereGeometry args={[1, 32, 32]} />
        <meshBasicMaterial 
          color="#1e3a5f" 
          transparent 
          opacity={0.15} 
          side={THREE.DoubleSide}
        />
      </mesh>

      {}
      <mesh>
        <sphereGeometry args={[1, 16, 16]} />
        <meshBasicMaterial 
          color="#3b82f6" 
          wireframe 
          transparent 
          opacity={0.3} 
        />
      </mesh>

      {}
      <Line
        points={Array.from({ length: 65 }, (_, i) => {
          const angle = (i / 64) * Math.PI * 2;
          return [Math.cos(angle), 0, Math.sin(angle)] as [number, number, number];
        })}
        color="#60a5fa"
        lineWidth={1.5}
        transparent
        opacity={0.5}
      />

      {}
      {showAxes && (
        <>
          {}
          <Line
            points={[[-1.3, 0, 0], [1.3, 0, 0]]}
            color="#ef4444"
            lineWidth={2}
          />
          {}
          <Line
            points={[[0, -1.3, 0], [0, 1.3, 0]]}
            color="#22c55e"
            lineWidth={2}
          />
          {}
          <Line
            points={[[0, 0, -1.3], [0, 0, 1.3]]}
            color="#3b82f6"
            lineWidth={2}
          />
        </>
      )}

      {}
      {showLabels && (
        <>
          <Text position={[1.5, 0, 0]} fontSize={0.2} color="#ef4444">X</Text>
          <Text position={[0, 1.5, 0]} fontSize={0.2} color="#22c55e">Y</Text>
          <Text position={[0, 0, 1.5]} fontSize={0.2} color="#3b82f6">|0⟩</Text>
          <Text position={[0, 0, -1.5]} fontSize={0.2} color="#3b82f6">|1⟩</Text>
        </>
      )}

      {}
      <group ref={arrowRef} position={animated ? [0, 0, 1] : normalizedCoords}>
        {}
        <Line
          points={[[0, 0, 0], [...normalizedCoords.map(c => -c)] as [number, number, number]]}
          color="#f59e0b"
          lineWidth={3}
        />
        {}
        <mesh position={[0, 0, 0]}>
          <coneGeometry args={[0.08, 0.2, 8]} />
          <meshBasicMaterial color="#f59e0b" />
        </mesh>
        {}
        <mesh position={[0, 0, 0]}>
          <sphereGeometry args={[0.1, 16, 16]} />
          <meshBasicMaterial color="#fbbf24" />
        </mesh>
      </group>

      {}
      <Line
        points={[
          [0, 0, 0],
          [normalizedCoords[0], normalizedCoords[1], 0]
        ]}
        color="#f59e0b"
        lineWidth={1}
        transparent
        opacity={0.3}
        dashed
      />

      {}
      <Line
        points={[
          [normalizedCoords[0], normalizedCoords[1], 0],
          normalizedCoords
        ]}
        color="#f59e0b"
        lineWidth={1}
        transparent
        opacity={0.3}
        dashed
      />
    </>
  );
}

export const BlochSphere: React.FC<BlochSphereProps> = ({
  coordinates,
  label,
  size = 200,
  showAxes = true,
  showLabels = true,
  animated = true
}) => {
  return (
    <div 
      className="relative rounded-xl overflow-hidden"
      style={{ 
        width: size, 
        height: size,
        background: 'linear-gradient(135deg, #0f172a 0%, #1e293b 100%)'
      }}
    >
      {label && (
        <div className="absolute top-2 left-2 z-10 px-2 py-1 bg-slate-800/80 rounded text-xs text-slate-300 font-mono">
          {label}
        </div>
      )}
      <Canvas camera={{ position: [2.5, 2, 2.5], fov: 45 }}>
        <ambientLight intensity={0.5} />
        <pointLight position={[10, 10, 10]} />
        <SphereContent 
          coordinates={coordinates}
          showAxes={showAxes}
          showLabels={showLabels}
          animated={animated}
        />
        <OrbitControls 
          enablePan={false}
          minDistance={2}
          maxDistance={6}
        />
      </Canvas>
      
      {}
      <div className="absolute bottom-2 right-2 z-10 px-2 py-1 bg-slate-800/80 rounded text-xs text-slate-400 font-mono">
        <div>x: {coordinates[0].toFixed(3)}</div>
        <div>y: {coordinates[1].toFixed(3)}</div>
        <div>z: {coordinates[2].toFixed(3)}</div>
      </div>
    </div>
  );
};

interface BlochSphereGridProps {
  coordinates: Map<number, [number, number, number]>;
  labels?: Map<number, string>;
  sphereSize?: number;
  columns?: number;
}

export const BlochSphereGrid: React.FC<BlochSphereGridProps> = ({
  coordinates,
  labels,
  sphereSize = 180,
  columns = 3
}) => {
  const entries = Array.from(coordinates.entries());
  
  return (
    <div 
      className="grid gap-4"
      style={{ 
        gridTemplateColumns: `repeat(${Math.min(columns, entries.length)}, 1fr)` 
      }}
    >
      {entries.map(([qubitIndex, coords]) => (
        <BlochSphere
          key={qubitIndex}
          coordinates={coords}
          label={labels?.get(qubitIndex) ?? `q${qubitIndex}`}
          size={sphereSize}
        />
      ))}
    </div>
  );
};

export default BlochSphere;

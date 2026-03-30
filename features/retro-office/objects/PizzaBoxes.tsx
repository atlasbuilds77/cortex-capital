"use client";

import * as THREE from "three";

type PizzaBoxesProps = {
  position: [number, number, number];
  count?: number;
};

export function PizzaBoxes({ position, count = 3 }: PizzaBoxesProps) {
  return (
    <group position={position}>
      {Array.from({ length: count }).map((_, idx) => {
        const offsetX = (idx - Math.floor(count / 2)) * 0.22;
        const offsetY = idx * 0.045;
        const rotation = (Math.random() - 0.5) * 0.15;
        
        return (
          <group key={idx} position={[offsetX, offsetY, 0]} rotation={[0, rotation, 0]}>
            {/* Pizza box */}
            <mesh castShadow receiveShadow>
              <boxGeometry args={[0.2, 0.04, 0.2]} />
              <meshStandardMaterial 
                color="#d4af88"
                roughness={0.8}
              />
            </mesh>
            
            {/* Top label */}
            <mesh position={[0, 0.021, 0]}>
              <boxGeometry args={[0.18, 0.001, 0.18]} />
              <meshStandardMaterial 
                color="#c44536"
                roughness={0.6}
              />
            </mesh>
            
            {/* Steam particles (for top box only) */}
            {idx === count - 1 && (
              <>
                <mesh position={[-0.05, 0.08, 0.05]}>
                  <sphereGeometry args={[0.015, 8, 8]} />
                  <meshBasicMaterial 
                    color="#ffffff"
                    transparent
                    opacity={0.3}
                  />
                </mesh>
                <mesh position={[0.04, 0.12, -0.03]}>
                  <sphereGeometry args={[0.012, 8, 8]} />
                  <meshBasicMaterial 
                    color="#ffffff"
                    transparent
                    opacity={0.25}
                  />
                </mesh>
              </>
            )}
          </group>
        );
      })}
    </group>
  );
}

"use client";

import { useRef, useState, useEffect } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";

type TradeSignalBellProps = {
  position: [number, number, number];
  signalActive: boolean;
};

export function TradeSignalBell({ position, signalActive }: TradeSignalBellProps) {
  const bellRef = useRef<THREE.Group>(null);
  const [ringing, setRinging] = useState(false);
  const ringStartTime = useRef(0);
  const lastSignalState = useRef(false);

  // Trigger ring animation when signal arrives
  useEffect(() => {
    if (signalActive && !lastSignalState.current) {
      setRinging(true);
      ringStartTime.current = Date.now();
      
      // Stop ringing after 2 seconds
      const timeout = setTimeout(() => {
        setRinging(false);
      }, 2000);
      
      return () => clearTimeout(timeout);
    }
    lastSignalState.current = signalActive;
  }, [signalActive]);

  // Animate bell ringing
  useFrame(() => {
    if (!bellRef.current || !ringing) return;
    
    const elapsed = Date.now() - ringStartTime.current;
    const frequency = 15; // Hz
    const decay = Math.max(0, 1 - elapsed / 2000);
    const angle = Math.sin(elapsed * frequency * 0.001 * Math.PI * 2) * 0.2 * decay;
    
    bellRef.current.rotation.z = angle;
  });

  return (
    <group position={position} ref={bellRef}>
      {/* Bell body */}
      <mesh castShadow receiveShadow>
        <coneGeometry args={[0.15, 0.25, 16]} />
        <meshStandardMaterial 
          color={ringing ? "#ffd700" : "#c9a55c"}
          metalness={0.8}
          roughness={0.2}
          emissive={ringing ? "#ff8800" : "#000000"}
          emissiveIntensity={ringing ? 0.5 : 0}
        />
      </mesh>
      
      {/* Bell top knob */}
      <mesh position={[0, 0.15, 0]} castShadow>
        <sphereGeometry args={[0.04, 12, 12]} />
        <meshStandardMaterial 
          color="#a0874d"
          metalness={0.8}
          roughness={0.3}
        />
      </mesh>
      
      {/* Clapper (only visible when ringing) */}
      {ringing && (
        <mesh position={[0, -0.08, 0]}>
          <sphereGeometry args={[0.03, 8, 8]} />
          <meshStandardMaterial color="#666666" />
        </mesh>
      )}
      
      {/* Glow effect when active */}
      {ringing && (
        <pointLight
          position={[0, 0, 0]}
          color="#ff8800"
          intensity={1.5}
          distance={2}
        />
      )}
    </group>
  );
}

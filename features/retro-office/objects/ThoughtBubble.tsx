import { Billboard, Text } from "@react-three/drei";
import { memo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";

interface ThoughtBubbleProps {
  text: string;
  position: [number, number, number];
  fadeIn?: boolean;
}

export const ThoughtBubble = memo(function ThoughtBubble({
  text,
  position,
  fadeIn = true,
}: ThoughtBubbleProps) {
  const groupRef = useRef<THREE.Group>(null);
  const bubbleMatRef = useRef<THREE.MeshBasicMaterial>(null);
  const createdAt = useRef(Date.now());

  useFrame(() => {
    if (!groupRef.current || !bubbleMatRef.current) return;

    const elapsed = Date.now() - createdAt.current;
    const duration = 3500; // 3.5 seconds visible

    // Fade in first 300ms
    if (fadeIn && elapsed < 300) {
      const alpha = elapsed / 300;
      groupRef.current.scale.setScalar(0.8 + alpha * 0.2);
      bubbleMatRef.current.opacity = alpha * 0.95;
    }
    // Fade out last 500ms
    else if (elapsed > duration - 500) {
      const fadeTime = duration - elapsed;
      const alpha = fadeTime / 500;
      bubbleMatRef.current.opacity = alpha * 0.95;
      groupRef.current.scale.setScalar(0.8 + alpha * 0.2);
    } else {
      groupRef.current.scale.setScalar(1.0);
      bubbleMatRef.current.opacity = 0.95;
    }

    // Gentle float animation
    const floatOffset = Math.sin(elapsed * 0.002) * 0.02;
    groupRef.current.position.y = position[1] + 0.62 + floatOffset;
  });

  return (
    <group ref={groupRef} position={position}>
      <Billboard follow lockX={false} lockY={false} lockZ={false}>
        {/* Bubble background */}
        <mesh position={[0, 0, -0.01]}>
          <planeGeometry args={[1.2, 0.42]} />
          <meshBasicMaterial
            ref={bubbleMatRef}
            color="#ffffff"
            transparent
            opacity={0.95}
            side={THREE.DoubleSide}
          />
        </mesh>

        {/* Bubble tail (small circle) */}
        <mesh position={[-0.32, -0.28, -0.01]}>
          <circleGeometry args={[0.04, 16]} />
          <meshBasicMaterial
            color="#ffffff"
            transparent
            opacity={0.9}
            side={THREE.DoubleSide}
          />
        </mesh>

        <mesh position={[-0.22, -0.35, -0.01]}>
          <circleGeometry args={[0.03, 16]} />
          <meshBasicMaterial
            color="#ffffff"
            transparent
            opacity={0.85}
            side={THREE.DoubleSide}
          />
        </mesh>

        {/* Text - use default font to avoid loading issues */}
        <Text
          position={[0, 0, 0.01]}
          fontSize={0.06}
          color="#1a1a1a"
          anchorX="center"
          anchorY="middle"
          maxWidth={0.8}
          textAlign="center"
        >
          {text}
        </Text>
      </Billboard>
    </group>
  );
});

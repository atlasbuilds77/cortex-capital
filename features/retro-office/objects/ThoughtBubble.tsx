import { Billboard, Text } from "@react-three/drei";
import { memo, useRef, useMemo } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";

interface ThoughtBubbleProps {
  text: string;
  position: [number, number, number];
  fadeIn?: boolean;
}

// Maximum text length to prevent overflow and scaling issues
const MAX_TEXT_LENGTH = 60;
// Fixed bubble dimensions - keep small to not overwhelm the scene
const BUBBLE_WIDTH = 0.9;
const BUBBLE_HEIGHT = 0.32;
// Text constraints
const MAX_TEXT_WIDTH = 0.7;
const FONT_SIZE = 0.045;
const MIN_FONT_SIZE = 0.035;

export const ThoughtBubble = memo(function ThoughtBubble({
  text,
  position,
  fadeIn = true,
}: ThoughtBubbleProps) {
  const groupRef = useRef<THREE.Group>(null);
  const bubbleMatRef = useRef<THREE.MeshBasicMaterial>(null);
  const createdAt = useRef(Date.now());

  // Clamp and truncate text to prevent scaling issues
  const displayText = useMemo(() => {
    if (!text) return "";
    const trimmed = text.trim();
    if (trimmed.length <= MAX_TEXT_LENGTH) return trimmed;
    return trimmed.slice(0, MAX_TEXT_LENGTH - 3) + "...";
  }, [text]);

  // Calculate font size based on text length (smaller for longer text)
  const fontSize = useMemo(() => {
    const len = displayText.length;
    if (len < 30) return FONT_SIZE;
    if (len < 50) return FONT_SIZE * 0.9;
    if (len < 70) return FONT_SIZE * 0.8;
    return MIN_FONT_SIZE;
  }, [displayText.length]);

  useFrame(() => {
    if (!groupRef.current || !bubbleMatRef.current) return;

    const elapsed = Date.now() - createdAt.current;
    const duration = 3500; // 3.5 seconds visible

    // Clamp scale values to prevent runaway scaling
    const clampScale = (s: number) => Math.max(0.4, Math.min(1.2, s));

    // Fade in first 300ms
    if (fadeIn && elapsed < 300) {
      const alpha = Math.min(1, elapsed / 300);
      groupRef.current.scale.setScalar(clampScale(0.8 + alpha * 0.2));
      bubbleMatRef.current.opacity = Math.min(0.95, alpha * 0.95);
    }
    // Fade out last 500ms
    else if (elapsed > duration - 500) {
      const fadeTime = Math.max(0, duration - elapsed);
      const alpha = Math.min(1, fadeTime / 500);
      bubbleMatRef.current.opacity = Math.min(0.95, alpha * 0.95);
      groupRef.current.scale.setScalar(clampScale(0.8 + alpha * 0.2));
    } else {
      groupRef.current.scale.setScalar(1.0);
      bubbleMatRef.current.opacity = 0.95;
    }

    // Gentle float animation with clamped offset - keep close to original position
    const floatOffset = Math.sin(elapsed * 0.002) * 0.015;
    groupRef.current.position.y = position[1] + 0.4 + Math.max(-0.03, Math.min(0.03, floatOffset));
  });

  // Don't render empty bubbles
  if (!displayText) return null;

  return (
    <group ref={groupRef} position={position} scale={0.5}>
      <Billboard follow lockX={false} lockY={false} lockZ={false}>
        {/* Bubble background - fixed size */}
        <mesh position={[0, 0, -0.01]}>
          <planeGeometry args={[BUBBLE_WIDTH, BUBBLE_HEIGHT]} />
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

        {/* Text - constrained with maxWidth and clamped fontSize */}
        <Text
          position={[0, 0, 0.01]}
          fontSize={fontSize}
          color="#1a1a1a"
          anchorX="center"
          anchorY="middle"
          maxWidth={MAX_TEXT_WIDTH}
          textAlign="center"
          overflowWrap="break-word"
          lineHeight={1.2}
        >
          {displayText}
        </Text>
      </Billboard>
    </group>
  );
});

/**
 * Ambient life and environmental features for the 3D office.
 * PERFORMANCE OPTIMIZED VERSION - minimal useFrame, reduced particles
 */

import { useRef, useState, useEffect, useMemo } from "react";
import * as THREE from "three";
import { toWorld } from "../core/geometry";
import type { FurnitureItem, RenderAgent } from "../core/types";

// ==============================================
// COFFEE MACHINE STEAM - SIMPLIFIED (no particles)
// ==============================================

export function CoffeeMachineSteam({
  items,
  agentsRef,
}: {
  items: FurnitureItem[];
  agentsRef: React.RefObject<RenderAgent[]>;
}) {
  // Disabled for performance - was causing lag with Sparkles
  return null;
}

// ==============================================
// SWAYING PLANTS - DISABLED FOR PERF
// ==============================================

export function SwayingPlants({ items }: { items: FurnitureItem[] }) {
  // Disabled - useFrame on every plant was expensive
  // Static plants instead
  const plantItems = items.filter((item) => item.type === "plant");

  return (
    <>
      {plantItems.map((plant) => {
        const [wx, wy, wz] = toWorld(plant.x, plant.y);
        return (
          <mesh key={plant._uid} position={[wx, wy + 0.25, wz]}>
            <cylinderGeometry args={[0.08, 0.12, 0.5, 6]} />
            <meshBasicMaterial color="#2d5a2d" />
            <mesh position={[0, 0.3, 0]}>
              <sphereGeometry args={[0.18, 6, 6]} />
              <meshBasicMaterial color="#3a7a3a" />
            </mesh>
          </mesh>
        );
      })}
    </>
  );
}

// ==============================================
// WALL CLOCK - UPDATE EVERY 10 SECONDS (not 1)
// ==============================================

export function WallClocks({ items }: { items: FurnitureItem[] }) {
  const [time, setTime] = useState(new Date());

  useEffect(() => {
    const interval = setInterval(() => {
      setTime(new Date());
    }, 10000); // Every 10 seconds instead of 1
    return () => clearInterval(interval);
  }, []);

  const clockItems = items.filter((item) => item.type === "clock");
  
  // Only render first 2 clocks
  const limitedClocks = clockItems.slice(0, 2);

  const clockData = useMemo(() => {
    const hours = time.getHours() % 12;
    const minutes = time.getMinutes();
    const hourAngle = ((hours + minutes / 60) / 12) * Math.PI * 2;
    const minuteAngle = (minutes / 60) * Math.PI * 2;
    return { hourAngle, minuteAngle };
  }, [time]);

  return (
    <>
      {limitedClocks.map((clock) => {
        const [wx, wy, wz] = toWorld(clock.x, clock.y);
        const elevation = clock.elevation ?? 0.9;

        return (
          <group key={clock._uid} position={[wx, elevation, wz]}>
            <mesh>
              <cylinderGeometry args={[0.15, 0.15, 0.02, 16]} />
              <meshBasicMaterial color="#f5f5f5" />
            </mesh>
            <mesh
              position={[Math.sin(clockData.hourAngle) * 0.05, 0.015, Math.cos(clockData.hourAngle) * 0.05]}
              rotation={[0, -clockData.hourAngle, 0]}
            >
              <boxGeometry args={[0.01, 0.002, 0.08]} />
              <meshBasicMaterial color="#333333" />
            </mesh>
            <mesh
              position={[Math.sin(clockData.minuteAngle) * 0.07, 0.016, Math.cos(clockData.minuteAngle) * 0.07]}
              rotation={[0, -clockData.minuteAngle, 0]}
            >
              <boxGeometry args={[0.008, 0.002, 0.12]} />
              <meshBasicMaterial color="#333333" />
            </mesh>
          </group>
        );
      })}
    </>
  );
}

// ==============================================
// DAY/NIGHT WINDOW - SIMPLIFIED (no sparkles)
// ==============================================

export function DayNightWindow({ items }: { items: FurnitureItem[] }) {
  const [windowColor, setWindowColor] = useState("#87ceeb");

  useEffect(() => {
    const updateWindow = () => {
      const hour = new Date().getHours();
      if (hour >= 6 && hour < 10) {
        setWindowColor("#ffa500");
      } else if (hour >= 10 && hour < 17) {
        setWindowColor("#87ceeb");
      } else if (hour >= 17 && hour < 20) {
        setWindowColor("#9370db");
      } else {
        setWindowColor("#1e3a5f");
      }
    };

    updateWindow();
    const interval = setInterval(updateWindow, 300000); // Every 5 minutes
    return () => clearInterval(interval);
  }, []);

  const windowItems = items.filter((item) => item.type === "whiteboard");
  const limitedWindows = windowItems.slice(0, 2);

  return (
    <>
      {limitedWindows.map((window) => {
        const [wx, wy, wz] = toWorld(window.x, window.y);
        const width = (window.w ?? 60) * 0.01;
        const height = (window.h ?? 40) * 0.01;
        const elevation = window.elevation ?? 0.9;

        return (
          <mesh key={window._uid} position={[wx, elevation, wz - 0.01]}>
            <planeGeometry args={[width, height]} />
            <meshBasicMaterial color={windowColor} transparent opacity={0.5} />
          </mesh>
        );
      })}
    </>
  );
}

// ==============================================
// MARKET SENTIMENT - SIMPLIFIED
// ==============================================

export function MarketSentimentMonitor({ items }: { items: FurnitureItem[] }) {
  // Disabled for performance - point lights are expensive
  return null;
}

// ==============================================
// TIME BASED LIGHTING - SIMPLIFIED
// ==============================================

export function TimeBasedLighting() {
  const [intensity, setIntensity] = useState(1.0);

  useEffect(() => {
    const hour = new Date().getHours();
    if (hour >= 6 && hour < 16) {
      setIntensity(1.0);
    } else {
      setIntensity(0.7);
    }
  }, []);

  return (
    <>
      <ambientLight intensity={intensity * 0.5} />
      <directionalLight position={[10, 10, 5]} intensity={intensity * 0.5} />
    </>
  );
}

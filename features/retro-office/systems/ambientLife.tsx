/**
 * Ambient life and environmental features for the 3D office.
 * Coffee machines, swaying plants, real-time clocks, day/night windows, market sentiment displays.
 */

import { useFrame } from "@react-three/fiber";
import { Sparkles } from "@react-three/drei";
import { useRef, useMemo, useState, useEffect } from "react";
import * as THREE from "three";
import { toWorld } from "../core/geometry";
import type { FurnitureItem, RenderAgent } from "../core/types";

// ==============================================
// COFFEE MACHINE STEAM PARTICLES
// ==============================================

export function CoffeeMachineSteam({
  items,
  agentsRef,
}: {
  items: FurnitureItem[];
  agentsRef: React.RefObject<RenderAgent[]>;
}) {
  const coffeeMachines = items.filter((item) => item.type === "coffee_machine");

  return (
    <>
      {coffeeMachines.map((machine) => {
        const [wx, wy, wz] = toWorld(machine.x, machine.y);
        
        // Check if any agent is near the coffee machine (within 30 units)
        const agents = agentsRef.current ?? [];
        const nearbyAgent = agents.some(
          (agent) =>
            Math.hypot(agent.x - machine.x, agent.y - machine.y) < 30
        );

        return nearbyAgent ? (
          <Sparkles
            key={machine._uid}
            count={20}
            scale={[0.15, 0.3, 0.15]}
            size={2}
            speed={0.3}
            opacity={0.4}
            color="#ffffff"
            position={[wx, wy + 0.4, wz]}
          />
        ) : null;
      })}
    </>
  );
}

// ==============================================
// SWAYING PLANTS
// ==============================================

export function SwayingPlants({ items }: { items: FurnitureItem[] }) {
  const plantItems = items.filter((item) => item.type === "plant");
  const meshRefs = useRef<(THREE.Mesh | null)[]>([]);

  useFrame(({ clock }) => {
    const time = clock.getElapsedTime();
    meshRefs.current.forEach((mesh, index) => {
      if (!mesh) return;
      // Different phase offset for each plant
      const phase = index * 0.7;
      const sway = Math.sin(time * 0.8 + phase) * 0.08;
      mesh.rotation.z = sway;
    });
  });

  return (
    <>
      {plantItems.map((plant, index) => {
        const [wx, wy, wz] = toWorld(plant.x, plant.y);
        return (
          <mesh
            key={plant._uid}
            ref={(ref) => {
              meshRefs.current[index] = ref;
            }}
            position={[wx, wy + 0.25, wz]}
          >
            {/* Simple plant representation */}
            <cylinderGeometry args={[0.08, 0.12, 0.5, 8]} />
            <meshStandardMaterial color="#2d5a2d" />
            {/* Leaves */}
            <mesh position={[0, 0.3, 0]}>
              <sphereGeometry args={[0.18, 8, 8]} />
              <meshStandardMaterial color="#3a7a3a" />
            </mesh>
          </mesh>
        );
      })}
    </>
  );
}

// ==============================================
// WALL CLOCK WITH REAL TIME
// ==============================================

export function WallClocks({ items }: { items: FurnitureItem[] }) {
  const [time, setTime] = useState(new Date());

  useEffect(() => {
    const interval = setInterval(() => {
      setTime(new Date());
    }, 1000);
    return () => clearInterval(interval);
  }, []);

  const clockItems = items.filter((item) => item.type === "clock");

  return (
    <>
      {clockItems.map((clock) => {
        const [wx, wy, wz] = toWorld(clock.x, clock.y);
        const elevation = clock.elevation ?? 0.9;

        // Calculate hand angles
        const hours = time.getHours() % 12;
        const minutes = time.getMinutes();
        const seconds = time.getSeconds();

        const hourAngle = ((hours + minutes / 60) / 12) * Math.PI * 2;
        const minuteAngle = (minutes / 60) * Math.PI * 2;
        const secondAngle = (seconds / 60) * Math.PI * 2;

        return (
          <group key={clock._uid} position={[wx, elevation, wz]}>
            {/* Clock face */}
            <mesh rotation={[0, 0, 0]}>
              <cylinderGeometry args={[0.15, 0.15, 0.02, 32]} />
              <meshStandardMaterial color="#f5f5f5" />
            </mesh>
            {/* Hour hand */}
            <mesh
              position={[Math.sin(hourAngle) * 0.05, 0.015, Math.cos(hourAngle) * 0.05]}
              rotation={[0, -hourAngle, 0]}
            >
              <boxGeometry args={[0.01, 0.002, 0.08]} />
              <meshStandardMaterial color="#333333" />
            </mesh>
            {/* Minute hand */}
            <mesh
              position={[Math.sin(minuteAngle) * 0.07, 0.016, Math.cos(minuteAngle) * 0.07]}
              rotation={[0, -minuteAngle, 0]}
            >
              <boxGeometry args={[0.008, 0.002, 0.12]} />
              <meshStandardMaterial color="#333333" />
            </mesh>
            {/* Second hand */}
            <mesh
              position={[Math.sin(secondAngle) * 0.08, 0.017, Math.cos(secondAngle) * 0.08]}
              rotation={[0, -secondAngle, 0]}
            >
              <boxGeometry args={[0.004, 0.002, 0.14]} />
              <meshStandardMaterial color="#e74c3c" />
            </mesh>
            {/* Center dot */}
            <mesh position={[0, 0.018, 0]}>
              <sphereGeometry args={[0.01, 16, 16]} />
              <meshStandardMaterial color="#333333" />
            </mesh>
          </group>
        );
      })}
    </>
  );
}

// ==============================================
// DAY/NIGHT CYCLE WINDOW
// ==============================================

export function DayNightWindow({ items }: { items: FurnitureItem[] }) {
  const [timeOfDay, setTimeOfDay] = useState<
    "morning" | "day" | "evening" | "night"
  >("day");
  const [windowColor, setWindowColor] = useState("#87ceeb");

  useEffect(() => {
    const updateWindow = () => {
      const now = new Date();
      const hour = now.getHours();

      // Morning: 6am-10am (orange/yellow)
      // Day: 10am-5pm (bright)
      // Evening: 5pm-8pm (orange/purple)
      // Night: 8pm-6am (dark blue with stars)

      if (hour >= 6 && hour < 10) {
        setTimeOfDay("morning");
        setWindowColor("#ffa500");
      } else if (hour >= 10 && hour < 17) {
        setTimeOfDay("day");
        setWindowColor("#87ceeb");
      } else if (hour >= 17 && hour < 20) {
        setTimeOfDay("evening");
        setWindowColor("#9370db");
      } else {
        setTimeOfDay("night");
        setWindowColor("#1e3a5f");
      }
    };

    updateWindow();
    const interval = setInterval(updateWindow, 60000); // Update every minute
    return () => clearInterval(interval);
  }, []);

  // Find whiteboard items to act as windows
  const windowItems = items.filter((item) => item.type === "whiteboard");

  return (
    <>
      {windowItems.map((window) => {
        const [wx, wy, wz] = toWorld(window.x, window.y);
        const width = (window.w ?? 60) * 0.01;
        const height = (window.h ?? 40) * 0.01;
        const elevation = window.elevation ?? 0.9;

        return (
          <group key={window._uid} position={[wx, elevation, wz]}>
            {/* Window glow */}
            <mesh position={[0, 0, -0.01]}>
              <planeGeometry args={[width, height]} />
              <meshBasicMaterial
                color={windowColor}
                transparent
                opacity={timeOfDay === "night" ? 0.3 : 0.6}
              />
            </mesh>
            {/* Stars for night time */}
            {timeOfDay === "night" && (
              <Sparkles
                count={15}
                scale={[width, height, 0.01]}
                size={1}
                speed={0.1}
                opacity={0.8}
                color="#ffffff"
                position={[0, 0, -0.02]}
              />
            )}
          </group>
        );
      })}
    </>
  );
}

// ==============================================
// MARKET SENTIMENT TV/MONITOR
// ==============================================

export function MarketSentimentMonitor({ items }: { items: FurnitureItem[] }) {
  const [sentiment, setSentiment] = useState<"BULLISH" | "BEARISH">("BULLISH");

  useEffect(() => {
    // Randomize sentiment every 30 seconds for now
    // TODO: Pull from actual market data
    const interval = setInterval(() => {
      setSentiment(Math.random() > 0.5 ? "BULLISH" : "BEARISH");
    }, 30000);
    return () => clearInterval(interval);
  }, []);

  // Find computer items to display sentiment
  const monitorItems = items.filter((item) => item.type === "computer");
  // Only show on first few computers
  const sentimentMonitors = monitorItems.slice(0, 2);

  return (
    <>
      {sentimentMonitors.map((monitor) => {
        const [wx, wy, wz] = toWorld(monitor.x, monitor.y);
        const isBullish = sentiment === "BULLISH";

        return (
          <group key={`${monitor._uid}-sentiment`} position={[wx, wy + 0.5, wz]}>
            {/* Screen glow */}
            <mesh position={[0, 0, 0.05]}>
              <planeGeometry args={[0.15, 0.08]} />
              <meshBasicMaterial
                color={isBullish ? "#00ff00" : "#ff0000"}
                transparent
                opacity={0.8}
              />
            </mesh>
            {/* Pulsing effect */}
            <pointLight
              position={[0, 0, 0.1]}
              color={isBullish ? "#00ff00" : "#ff0000"}
              intensity={0.3}
              distance={0.5}
            />
          </group>
        );
      })}
    </>
  );
}

// ==============================================
// DYNAMIC LIGHTING BASED ON TIME
// ==============================================

export function TimeBasedLighting() {
  const [intensity, setIntensity] = useState(1.0);
  const [temperature, setTemperature] = useState("#ffffff");

  useEffect(() => {
    const updateLighting = () => {
      const now = new Date();
      const hour = now.getHours();

      // After 4pm EST (convert to local time)
      // Dim lights slightly and use warmer color
      // Morning: warm (orange-ish)
      // Midday: cool (white/blue)
      // Evening: warm and dim

      if (hour >= 6 && hour < 10) {
        // Morning - warm
        setIntensity(0.9);
        setTemperature("#ffd8a8");
      } else if (hour >= 10 && hour < 16) {
        // Midday - cool and bright
        setIntensity(1.0);
        setTemperature("#e8f4ff");
      } else {
        // Evening/Night - warm and dim
        setIntensity(0.7);
        setTemperature("#ffb380");
      }
    };

    updateLighting();
    const interval = setInterval(updateLighting, 60000); // Update every minute
    return () => clearInterval(interval);
  }, []);

  return (
    <>
      <ambientLight intensity={intensity * 0.4} color={temperature} />
      <directionalLight
        position={[10, 10, 5]}
        intensity={intensity * 0.6}
        color={temperature}
        castShadow
      />
    </>
  );
}

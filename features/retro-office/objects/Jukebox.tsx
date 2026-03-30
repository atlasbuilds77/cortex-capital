import { useRef, useState, useEffect } from 'react';
import { useFrame } from '@react-three/fiber';
import { Text, Billboard } from '@react-three/drei';
import * as THREE from 'three';

// Chill lofi tracks - royalty free from Pixabay (no attribution required)
const LOFI_TRACKS = [
  {
    name: 'Chill Vibes',
    url: 'https://cdn.pixabay.com/audio/2024/11/04/audio_a08734656e.mp3', // lofi-chill-medium-version
  },
  {
    name: 'Study Session', 
    url: 'https://cdn.pixabay.com/audio/2024/09/17/audio_e8563bc0ba.mp3', // good-night-lofi
  },
  {
    name: 'Coffee Break',
    url: 'https://cdn.pixabay.com/audio/2023/10/28/audio_fbc01d3ace.mp3', // lofi-study
  },
];

interface JukeboxProps {
  position?: [number, number, number];
  onMuteChange?: (muted: boolean) => void;
}

export function Jukebox({ position = [0, 0, 0], onMuteChange }: JukeboxProps) {
  const [isPlaying, setIsPlaying] = useState(true); // Unmuted by default
  const [currentTrack, setCurrentTrack] = useState(0);
  const [isHovered, setIsHovered] = useState(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const meshRef = useRef<THREE.Mesh>(null);
  const glowRef = useRef<THREE.PointLight>(null);
  
  // Initialize audio
  useEffect(() => {
    const audio = new Audio(LOFI_TRACKS[currentTrack].url);
    audio.loop = false;
    audio.volume = 0.3;
    audioRef.current = audio;
    
    // Auto-play next track when current ends
    audio.addEventListener('ended', () => {
      setCurrentTrack((prev) => (prev + 1) % LOFI_TRACKS.length);
    });
    
    // Start playing if unmuted
    if (isPlaying) {
      audio.play().catch(() => {
        // Autoplay blocked - user needs to interact first
        setIsPlaying(false);
      });
    }
    
    return () => {
      audio.pause();
      audio.src = '';
    };
  }, [currentTrack]);
  
  // Handle play/pause
  useEffect(() => {
    if (audioRef.current) {
      if (isPlaying) {
        audioRef.current.play().catch(() => {});
      } else {
        audioRef.current.pause();
      }
    }
    onMuteChange?.(!isPlaying);
  }, [isPlaying, onMuteChange]);
  
  // Animate glow based on playing state
  useFrame((state) => {
    if (glowRef.current) {
      const intensity = isPlaying 
        ? 0.5 + Math.sin(state.clock.elapsedTime * 2) * 0.2
        : 0.1;
      glowRef.current.intensity = intensity;
    }
    
    // Subtle bounce when playing
    if (meshRef.current && isPlaying) {
      meshRef.current.position.y = position[1] + Math.sin(state.clock.elapsedTime * 3) * 0.01;
    }
  });
  
  const togglePlay = () => {
    setIsPlaying(!isPlaying);
  };
  
  const nextTrack = () => {
    setCurrentTrack((prev) => (prev + 1) % LOFI_TRACKS.length);
  };

  return (
    <group position={position}>
      {/* Jukebox body */}
      <mesh
        ref={meshRef}
        onClick={togglePlay}
        onPointerOver={() => setIsHovered(true)}
        onPointerOut={() => setIsHovered(false)}
        castShadow
        receiveShadow
      >
        {/* Main cabinet */}
        <boxGeometry args={[0.6, 1.2, 0.4]} />
        <meshStandardMaterial 
          color={isHovered ? '#7c3aed' : '#5b21b6'} 
          roughness={0.3}
          metalness={0.5}
        />
      </mesh>
      
      {/* Top dome */}
      <mesh position={[0, 0.7, 0]} castShadow>
        <sphereGeometry args={[0.25, 16, 16, 0, Math.PI * 2, 0, Math.PI / 2]} />
        <meshStandardMaterial 
          color="#c4b5fd"
          transparent
          opacity={0.7}
          roughness={0.1}
        />
      </mesh>
      
      {/* Speaker grille */}
      <mesh position={[0, -0.2, 0.21]}>
        <planeGeometry args={[0.4, 0.4]} />
        <meshStandardMaterial color="#1e1b4b" roughness={0.9} />
      </mesh>
      
      {/* Display panel */}
      <mesh position={[0, 0.3, 0.21]}>
        <planeGeometry args={[0.5, 0.25]} />
        <meshStandardMaterial 
          color={isPlaying ? '#22c55e' : '#6b7280'}
          emissive={isPlaying ? '#22c55e' : '#000000'}
          emissiveIntensity={isPlaying ? 0.5 : 0}
        />
      </mesh>
      
      {/* Track name display */}
      <Text
        position={[0, 0.3, 0.22]}
        fontSize={0.05}
        color="#ffffff"
        anchorX="center"
        anchorY="middle"
      >
        {isPlaying ? `♪ ${LOFI_TRACKS[currentTrack].name}` : '▶ Click to play'}
      </Text>
      
      {/* Music note particles when playing */}
      {isPlaying && (
        <Billboard position={[0, 1.0, 0]}>
          <Text fontSize={0.15} color="#a78bfa">
            ♪
          </Text>
        </Billboard>
      )}
      
      {/* Glow light */}
      <pointLight
        ref={glowRef}
        position={[0, 0.5, 0.3]}
        color="#8b5cf6"
        intensity={0.5}
        distance={2}
      />
      
      {/* Click hint on hover */}
      {isHovered && (
        <Billboard position={[0, 1.3, 0]}>
          <Text fontSize={0.08} color="#ffffff">
            {isPlaying ? '🔊 Click to mute' : '🔇 Click to play'}
          </Text>
        </Billboard>
      )}
    </group>
  );
}

export default Jukebox;

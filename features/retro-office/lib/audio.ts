/**
 * Audio Manager for Retro Office 3D
 * 
 * Singleton that manages all ambient and event-based sounds in the office.
 * Muted by default for good UX (no surprise audio).
 * 
 * Uses dynamic import for Howler to avoid SSR issues.
 */

// Sound URLs - using CDN royalty-free sounds
const SOUND_URLS = {
  // Ambient sounds (loop)
  officeHum: 'https://cdn.freesound.org/sounds/404/404766_preview.mp3',
  keyboardTyping: 'https://cdn.freesound.org/sounds/386/386862_preview.mp3',
  
  // Event sounds (one-shot)
  tradeBell: 'https://cdn.freesound.org/sounds/415/415196_preview.mp3',
  celebration: 'https://cdn.freesound.org/sounds/397/397353_preview.mp3',
  agentBump: 'https://cdn.freesound.org/sounds/397/397354_preview.mp3',
  coffeeMachine: 'https://cdn.freesound.org/sounds/415/415209_preview.mp3',
  phoneNotification: 'https://cdn.freesound.org/sounds/397/397355_preview.mp3',
};

type SoundKey = keyof typeof SOUND_URLS;

interface AudioManagerConfig {
  masterVolume: number;
  ambientVolume: number;
  effectsVolume: number;
  muted: boolean;
}

// Howl type for dynamic import
type HowlInstance = {
  play: () => number;
  stop: () => void;
  volume: (vol?: number) => number | void;
  mute: (muted: boolean) => void;
  playing: () => boolean;
};

class AudioManager {
  private static instance: AudioManager | null = null;
  
  private sounds: Map<SoundKey, HowlInstance> = new Map();
  private config: AudioManagerConfig = {
    masterVolume: 0.3,
    ambientVolume: 0.15,
    effectsVolume: 0.4,
    muted: true,
  };
  
  private initialized = false;
  private Howl: any = null;

  private constructor() {}

  static getInstance(): AudioManager {
    if (!AudioManager.instance) {
      AudioManager.instance = new AudioManager();
    }
    return AudioManager.instance;
  }

  /**
   * Initialize audio system - only runs on client
   */
  async init(): Promise<void> {
    // Only init on client side
    if (typeof window === 'undefined') return;
    if (this.initialized) return;
    
    try {
      // Dynamic import to avoid SSR issues
      const howler = await import('howler');
      this.Howl = howler.Howl;
      
      // Load preferences from localStorage
      this.loadPreferences();
      
      // Preload all sounds
      await Promise.all(
        Object.entries(SOUND_URLS).map(([key, url]) => 
          this.loadSound(key as SoundKey, url)
        )
      );
      
      this.initialized = true;
      
      if (!this.config.muted) {
        this.startAmbientSounds();
      }
    } catch (err) {
      console.warn('[AudioManager] Failed to initialize:', err);
    }
  }

  private loadSound(key: SoundKey, url: string): Promise<void> {
    if (!this.Howl) return Promise.resolve();
    
    return new Promise((resolve) => {
      const isAmbient = key === 'officeHum' || key === 'keyboardTyping';
      
      const sound = new this.Howl({
        src: [url],
        volume: isAmbient ? this.config.ambientVolume : this.config.effectsVolume,
        loop: key === 'officeHum',
        preload: true,
        onload: () => resolve(),
        onloaderror: () => {
          console.warn(`[AudioManager] Failed to load: ${key}`);
          resolve();
        },
      });
      
      this.sounds.set(key, sound);
    });
  }

  playSound(key: SoundKey): void {
    if (typeof window === 'undefined') return;
    if (this.config.muted) return;
    
    const sound = this.sounds.get(key);
    if (sound) {
      sound.play();
    }
  }

  startAmbientSounds(): void {
    if (typeof window === 'undefined') return;
    if (this.config.muted) return;
    
    const hum = this.sounds.get('officeHum');
    if (hum && !hum.playing()) {
      hum.play();
    }
  }

  stopAmbientSounds(): void {
    const hum = this.sounds.get('officeHum');
    if (hum) hum.stop();
  }

  setMuted(muted: boolean): void {
    this.config.muted = muted;
    this.savePreferences();
    
    if (muted) {
      this.stopAmbientSounds();
      this.sounds.forEach(sound => sound.mute(true));
    } else {
      this.sounds.forEach(sound => sound.mute(false));
      this.startAmbientSounds();
    }
  }

  toggleMute(): boolean {
    this.setMuted(!this.config.muted);
    return this.config.muted;
  }

  isMuted(): boolean {
    return this.config.muted;
  }

  private loadPreferences(): void {
    if (typeof window === 'undefined') return;
    
    try {
      const saved = localStorage.getItem('cortex_audio_prefs');
      if (saved) {
        const prefs = JSON.parse(saved);
        this.config = { ...this.config, ...prefs };
      }
    } catch {}
  }

  private savePreferences(): void {
    if (typeof window === 'undefined') return;
    
    try {
      localStorage.setItem('cortex_audio_prefs', JSON.stringify(this.config));
    } catch {}
  }

  destroy(): void {
    this.stopAmbientSounds();
    this.sounds.forEach(sound => sound.stop());
    this.sounds.clear();
    this.initialized = false;
  }
}

export const audioManager = AudioManager.getInstance();

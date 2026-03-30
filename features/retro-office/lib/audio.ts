import { Howl, Howler } from 'howler';

/**
 * Audio Manager for Retro Office 3D
 * 
 * Singleton that manages all ambient and event-based sounds in the office.
 * Muted by default for good UX (no surprise audio).
 */

// Sound URLs - using CDN royalty-free sounds
// These are placeholder URLs - replace with hosted sounds later
const SOUND_URLS = {
  // Ambient sounds (loop)
  officeHum: 'https://cdn.freesound.org/sounds/404/404766_preview.mp3', // Office ambience
  keyboardTyping: 'https://cdn.freesound.org/sounds/386/386862_preview.mp3', // Keyboard typing
  
  // Event sounds (one-shot)
  tradeBell: 'https://cdn.freesound.org/sounds/415/415196_preview.mp3', // Bell ding
  celebration: 'https://cdn.freesound.org/sounds/397/397353_preview.mp3', // Cheer/applause
  agentBump: 'https://cdn.freesound.org/sounds/397/397354_preview.mp3', // Hey/mumble
  coffeeMachine: 'https://cdn.freesound.org/sounds/415/415209_preview.mp3', // Brewing sound
  phoneNotification: 'https://cdn.freesound.org/sounds/397/397355_preview.mp3', // Subtle ping
};

type SoundKey = keyof typeof SOUND_URLS;

interface AudioManagerConfig {
  masterVolume: number; // 0-1
  ambientVolume: number; // 0-1
  effectsVolume: number; // 0-1
  muted: boolean;
}

class AudioManager {
  private static instance: AudioManager | null = null;
  
  private sounds: Map<SoundKey, Howl> = new Map();
  private config: AudioManagerConfig = {
    masterVolume: 0.3,
    ambientVolume: 0.15,
    effectsVolume: 0.4,
    muted: true, // Start muted by default
  };
  
  private initialized = false;
  private keyboardTimerId: number | null = null;

  private constructor() {
    // Singleton - use getInstance()
  }

  static getInstance(): AudioManager {
    if (!AudioManager.instance) {
      AudioManager.instance = new AudioManager();
    }
    return AudioManager.instance;
  }

  /**
   * Initialize audio system - preload all sounds
   */
  async init(): Promise<void> {
    if (this.initialized) return;
    
    // Load preferences from localStorage
    this.loadPreferences();
    
    // Preload all sounds
    await Promise.all(
      Object.entries(SOUND_URLS).map(([key, url]) => 
        this.loadSound(key as SoundKey, url)
      )
    );
    
    this.initialized = true;
    
    // Start ambient sounds if not muted
    if (!this.config.muted) {
      this.startAmbientSounds();
    }
  }

  /**
   * Load a single sound
   */
  private loadSound(key: SoundKey, url: string): Promise<void> {
    return new Promise((resolve, reject) => {
      const isAmbient = key === 'officeHum' || key === 'keyboardTyping';
      
      const sound = new Howl({
        src: [url],
        volume: isAmbient ? this.config.ambientVolume : this.config.effectsVolume,
        loop: isAmbient && key === 'officeHum', // Only office hum loops continuously
        preload: true,
        onload: () => resolve(),
        onloaderror: () => {
          console.warn(`Failed to load sound: ${key}`);
          resolve(); // Don't block initialization on failure
        },
      });
      
      this.sounds.set(key, sound);
    });
  }

  /**
   * Start ambient background sounds
   */
  private startAmbientSounds(): void {
    if (this.config.muted) return;
    
    // Start office hum (continuous loop)
    const officeHum = this.sounds.get('officeHum');
    if (officeHum && !officeHum.playing()) {
      officeHum.play();
    }
    
    // Start keyboard typing with random intervals
    this.startRandomKeyboardSounds();
  }

  /**
   * Stop ambient sounds
   */
  private stopAmbientSounds(): void {
    const officeHum = this.sounds.get('officeHum');
    if (officeHum) {
      officeHum.stop();
    }
    
    if (this.keyboardTimerId !== null) {
      clearTimeout(this.keyboardTimerId);
      this.keyboardTimerId = null;
    }
  }

  /**
   * Play keyboard sounds at random intervals
   */
  private startRandomKeyboardSounds(): void {
    if (this.config.muted) return;
    
    const playKeyboard = () => {
      if (!this.config.muted) {
        const keyboard = this.sounds.get('keyboardTyping');
        if (keyboard) {
          keyboard.play();
        }
      }
      
      // Schedule next keyboard sound (3-8 seconds)
      const nextDelay = 3000 + Math.random() * 5000;
      this.keyboardTimerId = window.setTimeout(playKeyboard, nextDelay);
    };
    
    playKeyboard();
  }

  /**
   * Play an event sound (one-shot)
   */
  playSound(key: SoundKey): void {
    if (this.config.muted || !this.initialized) return;
    
    const sound = this.sounds.get(key);
    if (sound) {
      sound.play();
    }
  }

  /**
   * Toggle mute state
   */
  toggleMute(): boolean {
    this.config.muted = !this.config.muted;
    
    if (this.config.muted) {
      this.stopAmbientSounds();
      Howler.mute(true);
    } else {
      Howler.mute(false);
      this.startAmbientSounds();
    }
    
    this.savePreferences();
    return this.config.muted;
  }

  /**
   * Set master volume (0-1)
   */
  setMasterVolume(volume: number): void {
    this.config.masterVolume = Math.max(0, Math.min(1, volume));
    Howler.volume(this.config.masterVolume);
    this.savePreferences();
  }

  /**
   * Set ambient volume (0-1)
   */
  setAmbientVolume(volume: number): void {
    this.config.ambientVolume = Math.max(0, Math.min(1, volume));
    
    const officeHum = this.sounds.get('officeHum');
    const keyboard = this.sounds.get('keyboardTyping');
    
    if (officeHum) officeHum.volume(this.config.ambientVolume);
    if (keyboard) keyboard.volume(this.config.ambientVolume);
    
    this.savePreferences();
  }

  /**
   * Set effects volume (0-1)
   */
  setEffectsVolume(volume: number): void {
    this.config.effectsVolume = Math.max(0, Math.min(1, volume));
    
    const effectKeys: SoundKey[] = [
      'tradeBell',
      'celebration',
      'agentBump',
      'coffeeMachine',
      'phoneNotification',
    ];
    
    effectKeys.forEach(key => {
      const sound = this.sounds.get(key);
      if (sound) sound.volume(this.config.effectsVolume);
    });
    
    this.savePreferences();
  }

  /**
   * Get current config
   */
  getConfig(): AudioManagerConfig {
    return { ...this.config };
  }

  /**
   * Check if muted
   */
  isMuted(): boolean {
    return this.config.muted;
  }

  /**
   * Save preferences to localStorage
   */
  private savePreferences(): void {
    if (typeof window === 'undefined') return;
    
    try {
      localStorage.setItem('retro-office-audio', JSON.stringify(this.config));
    } catch (e) {
      console.warn('Failed to save audio preferences', e);
    }
  }

  /**
   * Load preferences from localStorage
   */
  private loadPreferences(): void {
    if (typeof window === 'undefined') return;
    
    try {
      const stored = localStorage.getItem('retro-office-audio');
      if (stored) {
        const parsed = JSON.parse(stored);
        this.config = { ...this.config, ...parsed };
        
        // Apply loaded config
        Howler.volume(this.config.masterVolume);
        if (this.config.muted) {
          Howler.mute(true);
        }
      }
    } catch (e) {
      console.warn('Failed to load audio preferences', e);
    }
  }

  /**
   * Cleanup
   */
  destroy(): void {
    this.stopAmbientSounds();
    this.sounds.forEach(sound => sound.unload());
    this.sounds.clear();
    this.initialized = false;
    AudioManager.instance = null;
  }
}

// Export singleton instance
export const audioManager = AudioManager.getInstance();

// Export types
export type { SoundKey, AudioManagerConfig };

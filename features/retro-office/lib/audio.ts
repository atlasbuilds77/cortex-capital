/**
 * Audio Manager for Retro Office 3D
 * 
 * Uses Mixkit (royalty-free) for reliable CDN hosting.
 * Muted by default for good UX.
 */

// Working Mixkit URLs (royalty-free)
const SOUND_URLS: Record<string, string> = {
  // Ambient
  officeHum: 'https://assets.mixkit.co/active_storage/sfx/212/212-preview.mp3', // Soft room tone
  keyboardTyping: 'https://assets.mixkit.co/active_storage/sfx/2558/2558-preview.mp3', // Keyboard clicks
  
  // Events (keeping these too)
  tradeBell: 'https://assets.mixkit.co/active_storage/sfx/2869/2869-preview.mp3',
  notification: 'https://assets.mixkit.co/active_storage/sfx/2568/2568-preview.mp3',
};

class AudioManager {
  private static instance: AudioManager | null = null;
  private sounds: Map<string, any> = new Map();
  private _muted = true;
  private initialized = false;
  private Howl: any = null;
  private keyboardInterval: ReturnType<typeof setInterval> | null = null;

  private constructor() {}

  static getInstance(): AudioManager {
    if (!AudioManager.instance) {
      AudioManager.instance = new AudioManager();
    }
    return AudioManager.instance;
  }

  async init(): Promise<void> {
    if (typeof window === 'undefined') return;
    if (this.initialized) return;
    
    try {
      // Load mute preference
      const saved = localStorage.getItem('cortex_audio_muted');
      if (saved !== null) {
        this._muted = saved === 'true';
      }
      
      // Dynamic import Howler
      const howler = await import('howler');
      this.Howl = howler.Howl;
      
      // Preload sounds
      for (const [key, url] of Object.entries(SOUND_URLS)) {
        try {
          const isAmbient = key === 'officeHum';
          const sound = new this.Howl({
            src: [url],
            volume: isAmbient ? 0.1 : 0.25,
            loop: isAmbient,
            preload: true,
            onloaderror: () => {
              console.warn(`[Audio] Failed to load: ${key}`);
            },
          });
          this.sounds.set(key, sound);
        } catch (e) {
          console.warn(`[Audio] Error creating sound: ${key}`, e);
        }
      }
      
      this.initialized = true;
      
      // Start ambient if not muted
      if (!this._muted) {
        this.startAmbientSounds();
      }
    } catch (err) {
      console.warn('[Audio] Init failed:', err);
    }
  }

  playSound(key: string): void {
    if (typeof window === 'undefined') return;
    if (this._muted) return;
    if (!this.initialized) return;
    
    try {
      const sound = this.sounds.get(key);
      if (sound) {
        sound.play();
      }
    } catch (e) {
      // Silently fail
    }
  }

  startAmbientSounds(): void {
    if (typeof window === 'undefined') return;
    if (this._muted) return;
    
    // Office hum loop
    try {
      const hum = this.sounds.get('officeHum');
      if (hum && !hum.playing()) {
        hum.play();
      }
    } catch {}
    
    // Random keyboard typing
    if (!this.keyboardInterval) {
      this.keyboardInterval = setInterval(() => {
        if (this._muted) return;
        if (Math.random() > 0.4) { // 60% chance
          this.playSound('keyboardTyping');
        }
      }, 3000 + Math.random() * 4000); // Every 3-7 seconds
    }
  }

  stopAmbientSounds(): void {
    try {
      const hum = this.sounds.get('officeHum');
      if (hum) hum.stop();
    } catch {}
    
    if (this.keyboardInterval) {
      clearInterval(this.keyboardInterval);
      this.keyboardInterval = null;
    }
  }

  setMuted(muted: boolean): void {
    this._muted = muted;
    try {
      localStorage.setItem('cortex_audio_muted', String(muted));
    } catch {}
    
    if (muted) {
      this.stopAmbientSounds();
    } else {
      this.startAmbientSounds();
    }
  }

  toggleMute(): boolean {
    this.setMuted(!this._muted);
    return this._muted;
  }

  isMuted(): boolean {
    return this._muted;
  }

  destroy(): void {
    this.stopAmbientSounds();
    this.sounds.forEach(sound => {
      try { sound.stop(); } catch {}
    });
    this.sounds.clear();
    this.initialized = false;
  }
}

export const audioManager = AudioManager.getInstance();

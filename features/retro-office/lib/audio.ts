/**
 * Audio Manager for Retro Office 3D
 * 
 * Uses Mixkit (royalty-free) for reliable CDN hosting.
 * Muted by default for good UX.
 */

// Working Mixkit URLs (royalty-free, no attribution needed)
const SOUND_URLS: Record<string, string> = {
  tradeBell: 'https://assets.mixkit.co/active_storage/sfx/2869/2869-preview.mp3', // Bell notification
  celebration: 'https://assets.mixkit.co/active_storage/sfx/2013/2013-preview.mp3', // Success chime
  notification: 'https://assets.mixkit.co/active_storage/sfx/2568/2568-preview.mp3', // Soft notification
};

type SoundKey = keyof typeof SOUND_URLS;

class AudioManager {
  private static instance: AudioManager | null = null;
  private sounds: Map<string, any> = new Map();
  private _muted = true;
  private initialized = false;
  private Howl: any = null;

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
      
      // Preload sounds (don't await - let them load in background)
      Object.entries(SOUND_URLS).forEach(([key, url]) => {
        try {
          const sound = new this.Howl({
            src: [url],
            volume: 0.3,
            preload: true,
            onloaderror: () => {
              console.warn(`[Audio] Failed to load: ${key}`);
            },
          });
          this.sounds.set(key, sound);
        } catch (e) {
          console.warn(`[Audio] Error creating sound: ${key}`, e);
        }
      });
      
      this.initialized = true;
    } catch (err) {
      console.warn('[Audio] Init failed:', err);
      // Don't throw - audio is optional
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
      // Silently fail - audio is not critical
    }
  }

  startAmbientSounds(): void {
    // No ambient sounds for now - keeps it simple
  }

  stopAmbientSounds(): void {
    // No-op
  }

  setMuted(muted: boolean): void {
    this._muted = muted;
    try {
      localStorage.setItem('cortex_audio_muted', String(muted));
    } catch {}
  }

  toggleMute(): boolean {
    this.setMuted(!this._muted);
    return this._muted;
  }

  isMuted(): boolean {
    return this._muted;
  }

  destroy(): void {
    this.sounds.forEach(sound => {
      try { sound.stop(); } catch {}
    });
    this.sounds.clear();
    this.initialized = false;
  }
}

export const audioManager = AudioManager.getInstance();

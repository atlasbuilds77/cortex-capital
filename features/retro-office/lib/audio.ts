/**
 * Audio Manager for Retro Office 3D
 * 
 * DISABLED FOR NOW - was causing crashes on some browsers.
 * All methods are no-ops.
 */

class AudioManager {
  private static instance: AudioManager | null = null;
  private _muted = true;

  private constructor() {}

  static getInstance(): AudioManager {
    if (!AudioManager.instance) {
      AudioManager.instance = new AudioManager();
    }
    return AudioManager.instance;
  }

  async init(): Promise<void> {
    // No-op - audio disabled
  }

  playSound(_key: string): void {
    // No-op - audio disabled
  }

  startAmbientSounds(): void {
    // No-op - audio disabled
  }

  stopAmbientSounds(): void {
    // No-op - audio disabled
  }

  setMuted(muted: boolean): void {
    this._muted = muted;
  }

  toggleMute(): boolean {
    this._muted = !this._muted;
    return this._muted;
  }

  isMuted(): boolean {
    return this._muted;
  }

  destroy(): void {
    // No-op - audio disabled
  }
}

export const audioManager = AudioManager.getInstance();

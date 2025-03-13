/**
 * AudioEngine - Core audio processing class
 * 
 * Handles audio context initialization, audio node creation and management,
 * volume control, and crossfading between tracks.
 */

import { audioSourceProvider } from '../../services/audio-source-provider';

export interface AudioEngineOptions {
  crossfadeDuration?: number;
}

export interface AudioSource {
  audio: HTMLAudioElement;
  gainNode: GainNode;
  track: {
    url: string;
    title: string;
    category: string;
  };
}

export class AudioEngine {
  private context: AudioContext | null = null;
  private crossfadeDuration: number;
  
  constructor(options: AudioEngineOptions = {}) {
    this.crossfadeDuration = options.crossfadeDuration || 2;
  }
  
  /**
   * Ensures that the audio context is initialized and resumed
   * This must be called in response to user interaction
   */
  async ensureContext(): Promise<AudioContext> {
    // Create context if it doesn't exist
    if (!this.context || this.context.state === 'closed') {
      const AudioContext = window.AudioContext || (window as any).webkitAudioContext;
      this.context = new AudioContext();
      console.log('Created new AudioContext, state:', this.context.state);
    }
    
    // Resume context if suspended
    if (this.context.state === 'suspended') {
      console.log('Resuming suspended AudioContext');
      await this.context.resume();
      console.log('AudioContext resumed, new state:', this.context.state);
    }
    
    return this.context;
  }
  
  /**
   * Creates an audio source with gain node
   */
  async createAudioSource(
    url: string, 
    title: string, 
    category: string, 
    volume: number
  ): Promise<AudioSource> {
    const context = await this.ensureContext();
    
    // Create audio element
    const audio = new Audio();
    audio.crossOrigin = "anonymous";
    audio.preload = "auto";
    
    // Use AudioSourceProvider to get the appropriate URL
    const track = { 
      url, 
      title, 
      category: category as 'brown-noise' | 'rain' 
    };
    const audioUrl = audioSourceProvider.getAudioUrl(track);
    
    // Set the audio source
    audio.src = audioUrl;
    audio.loop = true;
    audio.volume = volume / 100;
    
    // Create gain node
    const gainNode = context.createGain();
    gainNode.gain.value = volume / 100;
    gainNode.connect(context.destination);
    
    return {
      audio,
      gainNode,
      track
    };
  }
  
  /**
   * Sets the volume for an audio source
   */
  async setVolume(source: AudioSource, volume: number): Promise<void> {
    if (!source) return;
    
    const normalizedVolume = volume / 100;
    
    // Set HTML audio element volume
    source.audio.volume = normalizedVolume;
    
    // Set gain node volume if context exists and is not closed
    if (this.context && this.context.state !== 'closed') {
      const currentTime = this.context.currentTime;
      try {
        source.gainNode.gain.cancelScheduledValues(currentTime);
        source.gainNode.gain.setValueAtTime(normalizedVolume, currentTime);
      } catch (err) {
        console.error('Error setting gain value:', err);
        
        // Try reconnecting the node
        try {
          source.gainNode.disconnect();
        } catch (e) {
          // Ignore disconnection errors
        }
        
        source.gainNode.connect(this.context.destination);
        source.gainNode.gain.setValueAtTime(normalizedVolume, this.context.currentTime);
      }
    }
  }
  
  /**
   * Plays an audio source
   */
  async play(source: AudioSource): Promise<void> {
    if (!source) {
      console.warn('Attempted to play null audio source');
      return;
    }
    
    await this.ensureContext();
    
    try {
      // Ensure gain node is connected
      try {
        source.gainNode.disconnect();
      } catch (err) {
        // Ignore disconnection errors
      }
      
      if (this.context && this.context.state !== 'closed') {
        source.gainNode.connect(this.context.destination);
      }
      
      // Check if audio is already playing
      if (!source.audio.paused) {
        console.log('Audio is already playing, no need to play again');
        return;
      }
      
      // Reset audio to beginning if it's ended
      if (source.audio.ended) {
        source.audio.currentTime = 0;
      }
      
      // Play audio with a user interaction safety check
      console.log('Playing audio:', source.track.title);
      try {
        await source.audio.play();
      } catch (playError) {
        console.error('Initial play attempt failed:', playError);
        
        // Try to resume audio context and play again
        if (this.context && this.context.state === 'suspended') {
          console.log('Audio context suspended, attempting to resume');
          await this.context.resume();
          await source.audio.play();
        } else {
          throw playError;
        }
      }
    } catch (err) {
      console.error('Error playing audio:', err);
      throw new Error(`Failed to play audio: ${err instanceof Error ? err.message : String(err)}`);
    }
  }
  
  /**
   * Pauses an audio source
   */
  async pause(source: AudioSource): Promise<void> {
    if (!source) {
      console.warn('Attempted to pause null audio source');
      return;
    }
    
    try {
      // Check if audio is already paused
      if (source.audio.paused) {
        console.log('Audio is already paused');
        return;
      }
      
      console.log('Pausing audio:', source.track.title);
      await source.audio.pause();
    } catch (err) {
      console.error('Error pausing audio:', err);
    }
  }
  
  /**
   * Crossfades between two audio sources
   */
  async crossfade(
    currentSource: AudioSource,
    nextSource: AudioSource
  ): Promise<void> {
    if (!currentSource || !nextSource) {
      console.warn('Cannot crossfade with null sources');
      return;
    }
    
    await this.ensureContext();
    
    console.log(`Crossfading from "${currentSource.track.title}" to "${nextSource.track.title}"`);
    
    // Make sure current source is playing
    if (currentSource.audio.paused) {
      console.warn('Current source is paused, cannot crossfade');
      await this.play(nextSource);
      return;
    }
    
    // Store the current volume for reference
    const currentVolume = currentSource.audio.volume;
    const targetVolume = nextSource.gainNode.gain.value;
    
    // Start next track with volume 0
    nextSource.audio.volume = 0;
    await this.play(nextSource);
    
    // Use a more reliable approach with requestAnimationFrame
    let startTime: number | null = null;
    const duration = this.crossfadeDuration * 1000; // Convert to milliseconds
    
    const animate = (timestamp: number) => {
      if (!startTime) startTime = timestamp;
      const elapsed = timestamp - startTime;
      const progress = Math.min(elapsed / duration, 1);
      
      // Fade out current source
      if (!currentSource.audio.paused) {
        currentSource.audio.volume = Math.max(0, currentVolume * (1 - progress));
      }
      
      // Fade in next source
      if (!nextSource.audio.paused) {
        nextSource.audio.volume = Math.min(targetVolume, targetVolume * progress);
      }
      
      // Continue animation if not complete
      if (progress < 1) {
        requestAnimationFrame(animate);
      } else {
        // Ensure final volumes are set correctly
        currentSource.audio.volume = 0;
        nextSource.audio.volume = targetVolume;
        
        // Pause the old track
        currentSource.audio.pause();
        console.log('Crossfade complete');
      }
    };
    
    // Start the animation
    requestAnimationFrame(animate);
  }
  
  /**
   * Cleans up audio resources
   */
  async cleanup(): Promise<void> {
    if (this.context && this.context.state !== 'closed') {
      try {
        await this.context.close();
        this.context = null;
      } catch (err) {
        console.error('Error closing audio context:', err);
      }
    }
  }
}

// Export singleton instance
export const audioEngine = new AudioEngine();

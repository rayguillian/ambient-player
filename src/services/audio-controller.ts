/**
 * AudioController - Service for controlling audio playback
 * 
 * Manages audio state and provides a clean API for the player component.
 */

import { AudioTrack, AudioState } from '../types/audio';
import { audioEngine, AudioSource } from '../utils/audio/audio-engine';
import { trackManager } from './track-manager';

export interface AudioControllerOptions {
  onStateChange?: (state: {
    brownNoise: AudioState;
    rain: AudioState;
    isInitialized: boolean;
    error: string | null;
  }) => void;
}

export class AudioController {
  private brownNoiseState: AudioState = {
    isPlaying: false,
    volume: 50,
    currentTrackIndex: 0
  };
  
  private rainState: AudioState = {
    isPlaying: false,
    volume: 50,
    currentTrackIndex: 0
  };
  
  private brownNoiseSource: AudioSource | null = null;
  private rainSource: AudioSource | null = null;
  private isInitialized = false;
  private error: string | null = null;
  private options: AudioControllerOptions;
  
  constructor(options: AudioControllerOptions = {}) {
    this.options = options;
  }
  
  /**
   * Sets the options for the audio controller
   */
  setOptions(options: AudioControllerOptions): void {
    this.options = { ...this.options, ...options };
  }
  
  /**
   * Initializes the audio controller
   */
  async initialize(): Promise<void> {
    if (this.isInitialized) return;
    
    try {
      // Initialize track manager
      await trackManager.initialize();
      
      this.isInitialized = true;
      this.error = null;
      
      // Notify state change
      this.notifyStateChange();
    } catch (error) {
      console.error('Failed to initialize audio controller:', error);
      this.error = error instanceof Error ? error.message : String(error);
      this.notifyStateChange();
    }
  }
  
  /**
   * Toggles brown noise playback
   */
  async toggleBrownNoise(): Promise<void> {
    try {
      if (!this.isInitialized) {
        await this.initialize();
      }
      
      const newIsPlaying = !this.brownNoiseState.isPlaying;
      console.log('Toggling brown noise to:', newIsPlaying);
      
      if (newIsPlaying) {
        // Initialize audio source if needed
        if (!this.brownNoiseSource) {
          console.log('Creating new brown noise source');
          const track = trackManager.getTrack('brown-noise', this.brownNoiseState.currentTrackIndex);
          this.brownNoiseSource = await this.createAudioSource(track, this.brownNoiseState.volume);
        }
        
        // Play audio
        console.log('Playing brown noise');
        await audioEngine.play(this.brownNoiseSource);
      } else {
        // Pause audio - make sure we have a source
        if (this.brownNoiseSource) {
          console.log('Pausing brown noise');
          await audioEngine.pause(this.brownNoiseSource);
        } else {
          console.warn('No brown noise source to pause');
        }
      }
      
      // Update state
      this.brownNoiseState = {
        ...this.brownNoiseState,
        isPlaying: newIsPlaying
      };
      
      this.error = null;
      this.notifyStateChange();
    } catch (error) {
      console.error('Failed to toggle brown noise:', error);
      this.error = error instanceof Error ? error.message : String(error);
      this.notifyStateChange();
    }
  }
  
  /**
   * Toggles rain playback
   */
  async toggleRain(): Promise<void> {
    try {
      if (!this.isInitialized) {
        await this.initialize();
      }
      
      const newIsPlaying = !this.rainState.isPlaying;
      console.log('Toggling rain to:', newIsPlaying);
      
      if (newIsPlaying) {
        // Initialize audio source if needed
        if (!this.rainSource) {
          console.log('Creating new rain source');
          const track = trackManager.getTrack('rain', this.rainState.currentTrackIndex);
          this.rainSource = await this.createAudioSource(track, this.rainState.volume);
        }
        
        // Play audio
        console.log('Playing rain');
        await audioEngine.play(this.rainSource);
      } else {
        // Pause audio - make sure we have a source
        if (this.rainSource) {
          console.log('Pausing rain');
          await audioEngine.pause(this.rainSource);
        } else {
          console.warn('No rain source to pause');
        }
      }
      
      // Update state
      this.rainState = {
        ...this.rainState,
        isPlaying: newIsPlaying
      };
      
      this.error = null;
      this.notifyStateChange();
    } catch (error) {
      console.error('Failed to toggle rain:', error);
      this.error = error instanceof Error ? error.message : String(error);
      this.notifyStateChange();
    }
  }
  
  /**
   * Sets the volume for brown noise
   */
  async setBrownNoiseVolume(volume: number): Promise<void> {
    try {
      this.brownNoiseState = {
        ...this.brownNoiseState,
        volume
      };
      
      if (this.brownNoiseSource) {
        await audioEngine.setVolume(this.brownNoiseSource, volume);
      }
      
      this.notifyStateChange();
    } catch (error) {
      console.error('Failed to set brown noise volume:', error);
      this.error = error instanceof Error ? error.message : String(error);
      this.notifyStateChange();
    }
  }
  
  /**
   * Sets the volume for rain
   */
  async setRainVolume(volume: number): Promise<void> {
    try {
      this.rainState = {
        ...this.rainState,
        volume
      };
      
      if (this.rainSource) {
        await audioEngine.setVolume(this.rainSource, volume);
      }
      
      this.notifyStateChange();
    } catch (error) {
      console.error('Failed to set rain volume:', error);
      this.error = error instanceof Error ? error.message : String(error);
      this.notifyStateChange();
    }
  }
  
  /**
   * Skips to the next brown noise track
   */
  async skipToBrownNoiseTrack(): Promise<void> {
    try {
      if (!this.isInitialized) {
        await this.initialize();
      }
      
      const { track, index } = trackManager.getNextTrack('brown-noise', this.brownNoiseState.currentTrackIndex);
      
      // Create new audio source
      const newSource = await this.createAudioSource(track, this.brownNoiseState.volume);
      
      if (this.brownNoiseState.isPlaying && this.brownNoiseSource) {
        // Crossfade to new track
        await audioEngine.crossfade(this.brownNoiseSource, newSource);
      }
      
      // Update source and state
      this.brownNoiseSource = newSource;
      this.brownNoiseState = {
        ...this.brownNoiseState,
        currentTrackIndex: index
      };
      
      this.notifyStateChange();
    } catch (error) {
      console.error('Failed to skip to next brown noise track:', error);
      this.error = error instanceof Error ? error.message : String(error);
      this.notifyStateChange();
    }
  }
  
  /**
   * Skips to the next rain track
   */
  async skipToRainTrack(): Promise<void> {
    try {
      if (!this.isInitialized) {
        await this.initialize();
      }
      
      const { track, index } = trackManager.getNextTrack('rain', this.rainState.currentTrackIndex);
      
      // Create new audio source
      const newSource = await this.createAudioSource(track, this.rainState.volume);
      
      if (this.rainState.isPlaying && this.rainSource) {
        // Crossfade to new track
        await audioEngine.crossfade(this.rainSource, newSource);
      }
      
      // Update source and state
      this.rainSource = newSource;
      this.rainState = {
        ...this.rainState,
        currentTrackIndex: index
      };
      
      this.notifyStateChange();
    } catch (error) {
      console.error('Failed to skip to next rain track:', error);
      this.error = error instanceof Error ? error.message : String(error);
      this.notifyStateChange();
    }
  }
  
  /**
   * Shuffles all tracks
   */
  async shuffleTracks(): Promise<void> {
    try {
      if (!this.isInitialized) {
        await this.initialize();
      }
      
      // Store references to old sources
      const oldBrownNoiseSource = this.brownNoiseSource;
      const oldRainSource = this.rainSource;
      
      // Shuffle tracks
      const brownNoiseTracks = trackManager.shuffleTracks('brown-noise');
      const rainTracks = trackManager.shuffleTracks('rain');
      
      // Reset track indices
      this.brownNoiseState = {
        ...this.brownNoiseState,
        currentTrackIndex: 0
      };
      
      this.rainState = {
        ...this.rainState,
        currentTrackIndex: 0
      };
      
      // Create new audio sources if playing
      if (this.brownNoiseState.isPlaying && brownNoiseTracks.length > 0) {
        const track = brownNoiseTracks[0];
        
        // Create new source
        const newSource = await this.createAudioSource(track, this.brownNoiseState.volume);
        
        // Pause old source if it exists
        if (oldBrownNoiseSource) {
          await audioEngine.pause(oldBrownNoiseSource);
        }
        
        // Set new source and play
        this.brownNoiseSource = newSource;
        await audioEngine.play(this.brownNoiseSource);
        
        console.log('Shuffled and playing new brown noise track:', track.title);
      }
      
      if (this.rainState.isPlaying && rainTracks.length > 0) {
        const track = rainTracks[0];
        
        // Create new source
        const newSource = await this.createAudioSource(track, this.rainState.volume);
        
        // Pause old source if it exists
        if (oldRainSource) {
          await audioEngine.pause(oldRainSource);
        }
        
        // Set new source and play
        this.rainSource = newSource;
        await audioEngine.play(this.rainSource);
        
        console.log('Shuffled and playing new rain track:', track.title);
      }
      
      this.notifyStateChange();
    } catch (error) {
      console.error('Failed to shuffle tracks:', error);
      this.error = error instanceof Error ? error.message : String(error);
      this.notifyStateChange();
    }
  }
  
  /**
   * Creates an audio source from a track
   */
  private async createAudioSource(track: AudioTrack, volume: number): Promise<AudioSource> {
    return audioEngine.createAudioSource(
      track.url,
      track.title,
      track.category,
      volume
    );
  }
  
  /**
   * Gets the current state
   */
  getState() {
    return {
      brownNoise: { ...this.brownNoiseState },
      rain: { ...this.rainState },
      isInitialized: this.isInitialized,
      error: this.error
    };
  }
  
  /**
   * Notifies state change
   */
  private notifyStateChange() {
    if (this.options.onStateChange) {
      this.options.onStateChange(this.getState());
    }
  }
  
  /**
   * Cleans up resources
   */
  async cleanup(): Promise<void> {
    try {
      // Pause audio
      if (this.brownNoiseSource) {
        await audioEngine.pause(this.brownNoiseSource);
      }
      
      if (this.rainSource) {
        await audioEngine.pause(this.rainSource);
      }
      
      // Clean up audio engine
      await audioEngine.cleanup();
      
      // Reset state
      this.brownNoiseSource = null;
      this.rainSource = null;
      this.brownNoiseState = {
        isPlaying: false,
        volume: 50,
        currentTrackIndex: 0
      };
      this.rainState = {
        isPlaying: false,
        volume: 50,
        currentTrackIndex: 0
      };
      
      this.notifyStateChange();
    } catch (error) {
      console.error('Failed to clean up audio controller:', error);
    }
  }
}

// Export singleton instance
export const audioController = new AudioController();

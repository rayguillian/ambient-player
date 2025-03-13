/**
 * TrackManager - Service for managing audio tracks
 * 
 * Handles loading tracks from storage, caching, and track selection.
 */

import { AudioTrack } from '../types/audio';
import { listTracksFromFolder, STORAGE_FOLDERS } from '../utils/storage-utils';
import { audioCache } from '../utils/audio-cache';

export interface TrackManagerOptions {
  onTracksLoaded?: (tracks: { brownNoise: AudioTrack[], rain: AudioTrack[] }) => void;
  onError?: (error: Error) => void;
}

export class TrackManager {
  private brownNoiseTracks: AudioTrack[] = [];
  private rainTracks: AudioTrack[] = [];
  private options: TrackManagerOptions;
  private isInitialized = false;
  
  constructor(options: TrackManagerOptions = {}) {
    this.options = options;
  }
  
  /**
   * Initializes the track manager and loads tracks
   */
  async initialize(): Promise<void> {
    if (this.isInitialized) return;
    
    try {
      // Initialize audio cache
      await audioCache.init();
      
      // Load tracks
      const tracks = await this.loadTracks();
      
      this.isInitialized = true;
      
      // Notify tracks loaded
      if (this.options.onTracksLoaded) {
        this.options.onTracksLoaded(tracks);
      }
    } catch (error) {
      console.error('Failed to initialize track manager:', error);
      
      if (this.options.onError) {
        this.options.onError(error instanceof Error ? error : new Error(String(error)));
      }
    }
  }
  
  /**
   * Loads tracks from storage
   */
  async loadTracks(): Promise<{ brownNoise: AudioTrack[], rain: AudioTrack[] }> {
    try {
      const [brownNoise, rain] = await Promise.all([
        listTracksFromFolder(STORAGE_FOLDERS.BROWN_NOISE),
        listTracksFromFolder(STORAGE_FOLDERS.RAIN)
      ]);
      
      if (!brownNoise.length && !rain.length) {
        throw new Error('No audio tracks found in either category');
      }
      
      this.brownNoiseTracks = brownNoise;
      this.rainTracks = rain;
      
      return { brownNoise, rain };
    } catch (err) {
      console.error('Failed to load tracks:', err);
      throw new Error('Failed to load audio tracks');
    }
  }
  
  /**
   * Gets all brown noise tracks
   */
  getBrownNoiseTracks(): AudioTrack[] {
    return [...this.brownNoiseTracks];
  }
  
  /**
   * Gets all rain tracks
   */
  getRainTracks(): AudioTrack[] {
    return [...this.rainTracks];
  }
  
  /**
   * Gets a track by index
   */
  getTrack(category: 'brown-noise' | 'rain', index: number): AudioTrack {
    const tracks = category === 'brown-noise' ? this.brownNoiseTracks : this.rainTracks;
    
    if (tracks.length === 0) {
      throw new Error(`No tracks available for category: ${category}`);
    }
    
    // Ensure index is within bounds
    const safeIndex = ((index % tracks.length) + tracks.length) % tracks.length;
    return tracks[safeIndex];
  }
  
  /**
   * Gets the next track in the list
   */
  getNextTrack(category: 'brown-noise' | 'rain', currentIndex: number): { track: AudioTrack, index: number } {
    const tracks = category === 'brown-noise' ? this.brownNoiseTracks : this.rainTracks;
    
    if (tracks.length === 0) {
      throw new Error(`No tracks available for category: ${category}`);
    }
    
    const nextIndex = (currentIndex + 1) % tracks.length;
    return { track: tracks[nextIndex], index: nextIndex };
  }
  
  /**
   * Shuffles the tracks for a category
   */
  shuffleTracks(category: 'brown-noise' | 'rain'): AudioTrack[] {
    const tracks = category === 'brown-noise' ? this.brownNoiseTracks : this.rainTracks;
    
    if (tracks.length === 0) {
      return [];
    }
    
    // Create a copy of the tracks array
    const shuffled = [...tracks];
    
    // Fisher-Yates shuffle algorithm
    for (let i = shuffled.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }
    
    // Update the tracks
    if (category === 'brown-noise') {
      this.brownNoiseTracks = shuffled;
    } else {
      this.rainTracks = shuffled;
    }
    
    return shuffled;
  }
  
  /**
   * Loads an audio track with caching
   */
  async loadTrackAudio(track: AudioTrack): Promise<HTMLAudioElement> {
    return audioCache.loadAudioWithCache({
      url: track.url,
      title: track.title,
      artist: track.artist,
      category: track.category,
      fullPath: track.fullPath
    });
  }
}

// Export singleton instance
export const trackManager = new TrackManager();

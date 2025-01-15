import { dbManager, AudioMetadata } from './db-schema';
import { storage } from '../config/firebase';
import { ref, getDownloadURL } from 'firebase/storage';

export class AudioCache {
  private getStoragePath(url: string): string {
    // Convert full URL to storage path
    const path = url.includes('Brown%20Noise%20Stream') ? 
      `Brown Noise Stream/${url.split('Brown%20Noise%20Stream/')[1]}` :
      `Rain Makes Everything Better/${url.split('Rain%20Makes%20Everything%20Better/')[1]}`;
    return decodeURIComponent(path);
  }

  async init(): Promise<void> {
    try {
      await dbManager.init();
      // Clean up old cache entries (older than 7 days)
      await dbManager.cleanupOldCache();
    } catch (error) {
      console.error('Failed to initialize audio cache database:', error);
      throw new Error('Failed to initialize audio cache database. Please try again.');
    }
  }

  private async fetchWithRetry(url: string, retries = 3, delay = 1000): Promise<Response> {
    let lastError: Error | null = null;
    const storagePath = this.getStoragePath(url);
    
    for (let i = 0; i < retries; i++) {
      try {
        // Get download URL from Firebase Storage
        const storageRef = ref(storage, storagePath);
        const downloadURL = await getDownloadURL(storageRef);
        
        // Use our Vite proxy for development
        const proxyURL = import.meta.env.DEV ? 
          `/storage${new URL(downloadURL).pathname}` : 
          downloadURL;
        
        console.log('Fetching audio:', {
          storagePath,
          downloadURL,
          proxyURL
        });

        const response = await fetch(proxyURL, {
          method: 'GET',
          credentials: 'omit',
          cache: 'no-store',
          headers: {
            'Accept': 'audio/*',
            'Range': 'bytes=0-'
          }
        });

        console.log('Response headers:', {
          contentType: response.headers.get('content-type'),
          contentLength: response.headers.get('content-length'),
          acceptRanges: response.headers.get('accept-ranges'),
          status: response.status,
          ok: response.ok
        });

        if (!response.ok && response.status !== 206) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }

        return response;
      } catch (error) {
        lastError = error as Error;
        if (i < retries - 1) {
          await new Promise(resolve => setTimeout(resolve, delay * (i + 1)));
        }
      }
    }

    throw lastError || new Error('Failed to fetch after retries');
  }

  async loadAudioWithCache(track: AudioMetadata): Promise<HTMLAudioElement> {
    try {
      const storageRef = ref(storage, this.getStoragePath(track.url));
      const downloadURL = await getDownloadURL(storageRef);
      
      // Use proxy URL in development, direct URL in production
      const audioURL = import.meta.env.DEV ? 
        `/storage${new URL(downloadURL).pathname}${new URL(downloadURL).search}` : 
        downloadURL;

      console.log('Loading audio:', {
        originalURL: downloadURL,
        proxyURL: audioURL,
        storagePath: this.getStoragePath(track.url),
        track
      });

      const audio = new Audio();
      audio.crossOrigin = "anonymous";
      audio.preload = "auto";

      // Add event listeners for debugging
      audio.addEventListener('error', (e) => {
        console.error('Audio loading error:', {
          error: e,
          code: audio.error?.code,
          message: audio.error?.message
        });
      });

      audio.addEventListener('loadedmetadata', () => {
        console.log('Audio metadata loaded:', {
          duration: audio.duration,
          readyState: audio.readyState
        });
      });

      audio.src = audioURL;
      
      // Initialize playback state
      await dbManager.updatePlaybackState(track.url, {
        lastSync: new Date(),
        currentTime: 0,
        isPlaying: false,
        volume: 1
      });
      
      return audio;
    } catch (error) {
      console.error('Failed to fetch and cache audio:', error);
      throw error; // Let the component handle the error
    }
  }

  async updatePlaybackState(url: string, volume: number, isPlaying: boolean, currentTime: number): Promise<void> {
    await dbManager.updatePlaybackState(url, {
      volume,
      isPlaying,
      currentTime,
      lastSync: new Date()
    });
  }

  async getPlaybackState(url: string) {
    return dbManager.getPlaybackState(url);
  }

  async getCachedTracks(category?: 'brown-noise' | 'rain') {
    return dbManager.getCachedTracks(category);
  }
}

// Singleton instance
export const audioCache = new AudioCache();

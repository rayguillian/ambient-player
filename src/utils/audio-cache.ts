import { dbManager, AudioMetadata } from './db-schema';
import { storage } from '../config/firebase';
import { ref, getDownloadURL, getMetadata } from 'firebase/storage';
import { audioSourceProvider } from '../services/audio-source-provider';

export class AudioCache {
  private getStoragePath(track: AudioMetadata): string {
    if (!track.fullPath) {
      throw new Error('Track fullPath is required');
    }
    return track.fullPath;
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

  private async fetchWithRetry(track: AudioMetadata, retries = 3, delay = 1000): Promise<Response> {
    let lastError: Error | null = null;
    const storagePath = this.getStoragePath(track);
    
    for (let i = 0; i < retries; i++) {
      try {
        // Get download URL from Firebase Storage
        const storageRef = ref(storage, storagePath);
        
        // Verify the file exists first
        await getMetadata(storageRef);
        
        const downloadURL = await getDownloadURL(storageRef);
        
        // Use our Vite proxy for development
        const proxyURL = import.meta.env.DEV ?
          `/api/storage${new URL(downloadURL).pathname}` :
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
      console.log('Loading audio track:', {
        title: track.title,
        artist: track.artist,
        fullPath: track.fullPath || 'undefined'
      });
      
      // Create the audio element
      const audio = new Audio();
      
      // Set initial cross-origin to anonymous
      audio.crossOrigin = "anonymous";
      
      // Make sure to load metadata and data as soon as possible
      audio.preload = "auto";
      
      // Add event listeners for debugging
      audio.addEventListener('error', (e) => {
        console.error('Audio loading error:', {
          error: e,
          code: audio.error?.code,
          message: audio.error?.message,
          url: audio.src
        });
      });

      audio.addEventListener('loadedmetadata', () => {
        console.log('Audio metadata loaded:', {
          duration: audio.duration,
          readyState: audio.readyState
        });
      });
      
      // Use the AudioSourceProvider to get the appropriate URL
      let audioURL = audioSourceProvider.getAudioUrl(track);
      
      // If no URL could be determined, throw an error
      if (!audioURL) {
        throw new Error('Could not determine audio URL');
      }
      
      // Add cache-busting parameter
      audioURL = audioSourceProvider.addCacheBuster(audioURL);
      
      // Set the correct crossOrigin attribute
      audio.crossOrigin = "anonymous";
      
      // Set the audio source
      audio.src = audioURL;
      
      // Log detailed information for debugging
      console.log('Audio element created with URL:', audio.src, {
        crossOrigin: audio.crossOrigin,
        preload: audio.preload
      });
      
      // Initialize playback state
      try {
        await dbManager.updatePlaybackState(track.url || audio.src, {
          lastSync: new Date(),
          currentTime: 0,
          isPlaying: false,
          volume: 1
        });
      } catch (dbError) {
        console.warn('Failed to update playback state in IndexedDB:', dbError);
        // Non-fatal, continue
      }
      
      return audio;
    } catch (error) {
      console.error('Failed to fetch and cache audio:', error);
      
      // Create a fallback audio with a test URL that should work regardless
      const fallbackAudio = new Audio();
      fallbackAudio.crossOrigin = "anonymous";
      fallbackAudio.preload = "auto";
      
      console.log('Audio loading failed, using fallback audio source');
      
      // Use a reliable public test audio URL based on the category
      if (track.category === 'brown-noise') {
        fallbackAudio.src = 'https://assets.mixkit.co/sfx/preview/mixkit-forest-in-the-morning-2731.mp3';
        console.log('Using emergency fallback brown noise URL:', fallbackAudio.src);
      } else {
        // Default to rain
        fallbackAudio.src = 'https://assets.mixkit.co/sfx/preview/mixkit-ambient-rain-loop-2691.mp3';
        console.log('Using emergency fallback rain URL:', fallbackAudio.src);
      }
      
      // Add error listener to fallback audio as well
      fallbackAudio.addEventListener('error', (e) => {
        console.error('Fallback audio loading error:', {
          error: e,
          code: fallbackAudio.error?.code,
          message: fallbackAudio.error?.message,
          url: fallbackAudio.src
        });
      });
      
      return fallbackAudio;
    }
  }

  async updatePlaybackState(url: string, volume: number, isPlaying: boolean, currentTime: number): Promise<void> {
    try {
      await dbManager.updatePlaybackState(url, {
        volume,
        isPlaying,
        currentTime,
        lastSync: new Date()
      });
    } catch (error) {
      console.warn('Failed to update playback state:', error);
      // Non-fatal error, continue
    }
  }

  async getPlaybackState(url: string) {
    try {
      return await dbManager.getPlaybackState(url);
    } catch (error) {
      console.warn('Failed to get playback state:', error);
      return null;
    }
  }

  async getCachedTracks(category?: 'brown-noise' | 'rain') {
    try {
      return await dbManager.getCachedTracks(category);
    } catch (error) {
      console.warn('Failed to get cached tracks:', error);
      return [];
    }
  }
}

// Singleton instance
export const audioCache = new AudioCache();

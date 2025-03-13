import { ref, listAll, getMetadata, getDownloadURL, StorageReference } from 'firebase/storage';
import { storage } from '../config/firebase';
import { AudioTrack } from '../types/audio';
import { AUDIO_TRACKS } from '../config/audio-tracks';

// Constants for your actual folder names in Firebase Storage
export const STORAGE_FOLDERS = {
  BROWN_NOISE: 'Brown Noise Stream',
  RAIN: 'Rain Makes Everything Better'
} as const;

// Map folder names to categories in your app
const folderToCategory = {
  [STORAGE_FOLDERS.BROWN_NOISE]: 'brown-noise',
  [STORAGE_FOLDERS.RAIN]: 'rain'
} as const;

// Fallback tracks for local development when Firebase is not available
const FALLBACK_TRACKS: Record<string, AudioTrack[]> = {
  'brown-noise': [
    {
      title: "Brown Noise",
      artist: "Ambient Player",
      url: "https://assets.mixkit.co/sfx/preview/mixkit-forest-in-the-morning-2731.mp3",
      category: 'brown-noise',
      fullPath: 'Brown Noise Stream/fallback-brown-noise.mp3'
    }
  ],
  'rain': [
    {
      title: "Rain Sound",
      artist: "Ambient Player",
      url: "https://assets.mixkit.co/sfx/preview/mixkit-ambient-rain-loop-2691.mp3",
      category: 'rain',
      fullPath: 'Rain Makes Everything Better/fallback-rain.mp3'
    }
  ]
};

/**
 * Lists all audio tracks from a specific folder in Firebase Storage
 */
export async function listTracksFromFolder(folderName: string): Promise<AudioTrack[]> {
  try {
    console.log(`Listing tracks from folder: ${folderName}`);
    
    // Check if we should use local predefined tracks instead of Firebase
    // This is useful for development/testing without Firebase
    if (import.meta.env.DEV) {
      const useLocalTracks = !import.meta.env.VITE_FIREBASE_API_KEY || 
                             import.meta.env.VITE_FIREBASE_API_KEY === 'your-api-key';
      
      if (useLocalTracks) {
        console.log(`Using local predefined tracks for ${folderName} since Firebase is not configured`);
        
        const category = folderName === STORAGE_FOLDERS.BROWN_NOISE ? 'brown-noise' : 'rain';
        
        // First try to use tracks from audio-tracks.ts config
        const configTracks = AUDIO_TRACKS.filter(t => t.category === category);
        
        if (configTracks.length > 0) {
          console.log(`Found ${configTracks.length} tracks in config for ${category}`);
          return configTracks;
        }
        
        // If no tracks in config, use fallback tracks
        console.log(`Using fallback tracks for ${category}`);
        return FALLBACK_TRACKS[category] || [];
      }
    }
    
    // Create a reference to the folder
    const folderRef = ref(storage, folderName);
    
    // List all items in the folder
    const result = await listAll(folderRef);
    
    console.log(`Found ${result.items.length} items in ${folderName}`);
    
    if (result.items.length === 0) {
      console.warn(`No files found in folder: ${folderName}`);
      
      // If in development, use fallback tracks
      if (import.meta.env.DEV) {
        const category = folderName === STORAGE_FOLDERS.BROWN_NOISE ? 'brown-noise' : 'rain';
        console.log(`Using fallback tracks for ${category} since no files found in Firebase`);
        return FALLBACK_TRACKS[category] || [];
      }
      
      return [];
    }

    // Process each file
    const trackPromises = result.items.map(async (item) => {
      try {
        // Debug logging only in development
        if (import.meta.env.DEV) {
          console.debug(`Processing file: ${item.name} from ${folderName}`);
        }
        
        try {
          // Get metadata first to verify file exists and is accessible
          const metadata = await getMetadata(item);
          
          // Get the download URL
          const url = await getDownloadURL(item);

          // Extract filename without extension
          const fullName = item.name;
          const nameWithoutExt = fullName.replace(/\.[^/.]+$/, "");

          // Parse artist and title from filename (assuming format: "Artist - Title")
          let artist = "Unknown Artist";
          let title = nameWithoutExt;

          const match = nameWithoutExt.match(/^(.+?)\s*-\s*(.+)$/);
          if (match) {
            artist = match[1].trim();
            title = match[2].trim();
          }

          // Map the folder name to the appropriate category
          const category = folderToCategory[folderName as keyof typeof folderToCategory];
          
          if (!category) {
            console.error(`Invalid folder category for: ${folderName}`);
            return null;
          }

          const track: AudioTrack = {
            title,
            artist,
            url,
            category,
            metadata: metadata.customMetadata,
            fullPath: `${folderName}/${item.name}`
          };

          // Debug logging only in development
          if (import.meta.env.DEV) {
            console.debug(`Successfully processed track: ${track.title} from ${folderName}`);
          }
          return track;
        } catch (err) {
          console.error(`Error accessing file ${item.name}:`, err);
          return null;
        }
      } catch (err) {
        console.error(`Error processing file ${item.name}:`, err);
        return null;
      }
    });

    // Wait for all files to be processed and filter out any null results
    const tracks = (await Promise.all(trackPromises)).filter((track): track is AudioTrack => track !== null);

    if (tracks.length === 0) {
      console.warn(`No audio tracks found in folder: ${folderName}`);
      
      // If in development, use fallback tracks when no tracks could be processed
      if (import.meta.env.DEV) {
        const category = folderName === STORAGE_FOLDERS.BROWN_NOISE ? 'brown-noise' : 'rain';
        console.log(`Using fallback tracks for ${category} since no tracks could be processed`);
        return FALLBACK_TRACKS[category] || [];
      }
    }

    return tracks;
  } catch (err) {
    console.error(`Error listing tracks from folder ${folderName}:`, err);
    
    // If in development, return fallback tracks instead of throwing
    if (import.meta.env.DEV) {
      const category = folderName === STORAGE_FOLDERS.BROWN_NOISE ? 'brown-noise' : 'rain';
      console.log(`Using fallback tracks for ${category} due to error:`, err);
      return FALLBACK_TRACKS[category] || [];
    }
    
    throw new Error(`Failed to load audio tracks from ${folderName}`);
  }
}

/**
 * Get all brown noise tracks
 */
export const getBrownNoiseTracks = () => listTracksFromFolder(STORAGE_FOLDERS.BROWN_NOISE);

/**
 * Get all rain tracks
 */
export const getRainTracks = () => listTracksFromFolder(STORAGE_FOLDERS.RAIN);

/**
 * Get all tracks from all folders
 */
export const getAllTracks = async (): Promise<AudioTrack[]> => {
  const [brownNoiseTracks, rainTracks] = await Promise.all([
    getBrownNoiseTracks(),
    getRainTracks()
  ]);

  return [...brownNoiseTracks, ...rainTracks];
};

/**
 * Sets up listeners for changes in the storage folders
 * @param onTracksChanged Callback function that receives updated tracks when storage changes
 * @returns Cleanup function to remove listeners
 */
export const setupStorageChangeListeners = (
  onTracksChanged: (tracks: { brownNoise: AudioTrack[], rain: AudioTrack[] }) => void
) => {
  let pollInterval: NodeJS.Timeout;
  let lastBrownNoiseUpdate = Date.now();
  let lastRainUpdate = Date.now();
  let previousBrownNoiseTracks: AudioTrack[] = [];
  let previousRainTracks: AudioTrack[] = [];

  const compareTrackLists = (a: AudioTrack[], b: AudioTrack[]): boolean => {
    if (a.length !== b.length) return false;
    
    // Sort both arrays by fullPath to ensure consistent comparison
    const sortedA = [...a].sort((x, y) => x.fullPath.localeCompare(y.fullPath));
    const sortedB = [...b].sort((x, y) => x.fullPath.localeCompare(y.fullPath));
    
    // Compare each track's properties
    return sortedA.every((track, index) => {
      const otherTrack = sortedB[index];
      return track.fullPath === otherTrack.fullPath &&
             track.url === otherTrack.url &&
             track.title === otherTrack.title &&
             track.artist === otherTrack.artist &&
             track.category === otherTrack.category;
    });
  };

  const checkForChanges = async () => {
    try {
      const now = Date.now();
      // Increase minimum time between checks to 5 minutes
      const minUpdateInterval = 5 * 60 * 1000; // 5 minutes in milliseconds
      
      const shouldCheckBrownNoise = now - lastBrownNoiseUpdate > minUpdateInterval;
      const shouldCheckRain = now - lastRainUpdate > minUpdateInterval;

      if (!shouldCheckBrownNoise && !shouldCheckRain) {
        return;
      }

      if (import.meta.env.DEV) {
        console.debug('Checking for storage changes...');
      }

      let newBrownNoiseTracks = previousBrownNoiseTracks;
      let newRainTracks = previousRainTracks;
      let hasChanges = false;

      if (shouldCheckBrownNoise) {
        try {
          newBrownNoiseTracks = await getBrownNoiseTracks();
          const brownNoiseChanged = !compareTrackLists(newBrownNoiseTracks, previousBrownNoiseTracks);
          if (brownNoiseChanged) {
            if (import.meta.env.DEV) {
              console.debug('Brown noise tracks changed');
            }
            previousBrownNoiseTracks = newBrownNoiseTracks;
            lastBrownNoiseUpdate = now;
            hasChanges = true;
          }
        } catch (error) {
          console.error('Error checking brown noise tracks:', error);
        }
      }

      if (shouldCheckRain) {
        try {
          newRainTracks = await getRainTracks();
          const rainChanged = !compareTrackLists(newRainTracks, previousRainTracks);
          if (rainChanged) {
            if (import.meta.env.DEV) {
              console.debug('Rain tracks changed');
            }
            previousRainTracks = newRainTracks;
            lastRainUpdate = now;
            hasChanges = true;
          }
        } catch (error) {
          console.error('Error checking rain tracks:', error);
        }
      }

      if (hasChanges) {
        if (import.meta.env.DEV) {
          console.debug('Notifying track changes');
        }
        onTracksChanged({ 
          brownNoise: previousBrownNoiseTracks, 
          rain: previousRainTracks 
        });
      }
    } catch (error) {
      console.error('Error checking for storage changes:', error);
    }
  };

  // Poll for changes every 5 minutes
  pollInterval = setInterval(checkForChanges, 5 * 60 * 1000);

  // Return cleanup function
  return () => {
    clearInterval(pollInterval);
  };
};

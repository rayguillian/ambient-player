// Database schema and types for IndexedDB storage

export interface AudioMetadata {
  url: string;
  title: string;
  artist: string;
  category: 'brown-noise' | 'rain';
  fullPath: string;
  lastPlayed?: Date;
  playCount?: number;
  size?: number;
  duration?: number;
  cached?: boolean;
}

export interface PlaybackState {
  volume: number;
  isPlaying: boolean;
  currentTime: number;
  lastSync: Date;
}

export const DB_CONFIG = {
  name: 'ambient-player-db',
  version: 1,
  stores: {
    audioFiles: {
      keyPath: 'url',
      indexes: [
        { name: 'category', keyPath: 'category' },
        { name: 'lastPlayed', keyPath: 'lastPlayed' },
        { name: 'cached', keyPath: 'cached' }
      ]
    },
    metadata: {
      keyPath: 'url',
      indexes: [
        { name: 'category', keyPath: 'category' },
        { name: 'playCount', keyPath: 'playCount' }
      ]
    },
    playbackStates: {
      keyPath: 'url'
    }
  }
} as const;

export class DatabaseManager {
  private db: IDBDatabase | null = null;

  async clearDatabase(): Promise<void> {
    return new Promise((resolve, reject) => {
      const request = indexedDB.deleteDatabase(DB_CONFIG.name);
      
      request.onerror = () => {
        console.error('Failed to delete database:', request.error);
        reject(new Error('Failed to clear database'));
      };
      
      request.onsuccess = () => {
        console.log('Database successfully deleted');
        resolve();
      };
    });
  }

  async init(): Promise<void> {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open(DB_CONFIG.name, DB_CONFIG.version);

      request.onerror = () => {
        console.error('Failed to open IndexedDB:', request.error);
        reject(new Error('Failed to initialize database. Please ensure your browser supports IndexedDB and has sufficient storage space.'));
      };
      
      request.onsuccess = () => {
        this.db = request.result;
        resolve();
      };

      request.onupgradeneeded = (event) => {
        const db = (event.target as IDBOpenDBRequest).result;

        // Audio files store - for actual audio data
        if (!db.objectStoreNames.contains('audioFiles')) {
          const audioStore = db.createObjectStore('audioFiles', { keyPath: 'url' });
          audioStore.createIndex('category', 'category');
          audioStore.createIndex('lastPlayed', 'lastPlayed');
          audioStore.createIndex('cached', 'cached');
        }

        // Metadata store - for track information
        if (!db.objectStoreNames.contains('metadata')) {
          const metadataStore = db.createObjectStore('metadata', { keyPath: 'url' });
          metadataStore.createIndex('category', 'category');
          metadataStore.createIndex('playCount', 'playCount');
        }

        // Playback state store - for remembering volume, position, etc.
        if (!db.objectStoreNames.contains('playbackStates')) {
          db.createObjectStore('playbackStates', { keyPath: 'url' });
        }
      };
    });
  }

  async storeAudioFile(url: string, audioBlob: Blob, metadata: AudioMetadata): Promise<void> {
    if (!this.db) throw new Error('Database not initialized');

    const transaction = this.db.transaction(['audioFiles', 'metadata'], 'readwrite');
    
    // Store the audio file
    const audioStore = transaction.objectStore('audioFiles');
    await this.promisifyRequest(audioStore.put({
      url,
      data: audioBlob,
      category: metadata.category,
      lastPlayed: new Date(),
      cached: true
    }));

    // Store the metadata
    const metadataStore = transaction.objectStore('metadata');
    await this.promisifyRequest(metadataStore.put({
      ...metadata,
      size: audioBlob.size,
      cached: true
    }));
  }

  async getAudioFile(url: string): Promise<{ blob: Blob; metadata: AudioMetadata } | null> {
    if (!this.db) throw new Error('Database not initialized');

    const transaction = this.db.transaction(['audioFiles', 'metadata'], 'readonly');
    
    // Get audio file
    const audioStore = transaction.objectStore('audioFiles');
    const audioFile = await this.promisifyRequest(audioStore.get(url));
    
    // Get metadata
    const metadataStore = transaction.objectStore('metadata');
    const metadata = await this.promisifyRequest(metadataStore.get(url));

    if (!audioFile || !metadata) return null;

    return {
      blob: audioFile.data,
      metadata
    };
  }

  async updatePlaybackState(url: string, state: PlaybackState): Promise<void> {
    if (!this.db) throw new Error('Database not initialized');

    const transaction = this.db.transaction('playbackStates', 'readwrite');
    const store = transaction.objectStore('playbackStates');
    
    await this.promisifyRequest(store.put({
      url,
      ...state,
      lastSync: new Date()
    }));
  }

  async getPlaybackState(url: string): Promise<PlaybackState | null> {
    if (!this.db) throw new Error('Database not initialized');

    const transaction = this.db.transaction('playbackStates', 'readonly');
    const store = transaction.objectStore('playbackStates');
    
    return this.promisifyRequest(store.get(url));
  }

  async getCachedTracks(category?: 'brown-noise' | 'rain'): Promise<AudioMetadata[]> {
    if (!this.db) throw new Error('Database not initialized');

    const transaction = this.db.transaction('metadata', 'readonly');
    const store = transaction.objectStore('metadata');
    
    if (category) {
      const index = store.index('category');
      return this.promisifyRequest(index.getAll(category));
    }
    
    return this.promisifyRequest(store.getAll());
  }

  // Storage management - implement cache size limits and cleanup
  async cleanupOldCache(maxAge: number = 7 * 24 * 60 * 60 * 1000): Promise<void> {
    if (!this.db) throw new Error('Database not initialized');

    const transaction = this.db.transaction(['audioFiles', 'metadata'], 'readwrite');
    const audioStore = transaction.objectStore('audioFiles');
    const metadataStore = transaction.objectStore('metadata');
    
    const cutoffDate = new Date(Date.now() - maxAge);
    const index = audioStore.index('lastPlayed');
    
    // Get old files
    const oldFiles = await this.promisifyRequest(
      index.getAllKeys(IDBKeyRange.upperBound(cutoffDate))
    );

    // Delete old files and their metadata
    for (const url of oldFiles) {
      await this.promisifyRequest(audioStore.delete(url));
      await this.promisifyRequest(metadataStore.delete(url));
    }
  }

  private promisifyRequest<T>(request: IDBRequest<T>): Promise<T> {
    return new Promise((resolve, reject) => {
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => {
        console.error('IndexedDB operation failed:', request.error);
        reject(new Error('Database operation failed. Please try again.'));
      };
    });
  }
}

// Singleton instance
export const dbManager = new DatabaseManager();

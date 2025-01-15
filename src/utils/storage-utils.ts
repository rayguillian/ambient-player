import { storage } from '../config/firebase';
import { ref, listAll, getDownloadURL } from 'firebase/storage';
import { AudioTrack } from '../types/audio';

const FOLDERS = {
  'brown-noise': 'Brown Noise Stream',
  'rain': 'Rain Makes Everything Better'
} as const;

export async function listTracksFromFolder(category: 'brown-noise' | 'rain'): Promise<AudioTrack[]> {
  const folderRef = ref(storage, FOLDERS[category]);
  const result = await listAll(folderRef);
  
  const tracks: AudioTrack[] = [];
  
  for (const item of result.items) {
    if (item.name.endsWith('.m4a')) {
      const [artist, title] = item.name.replace('.m4a', '').split(' - ');
      tracks.push({
        title,
        artist,
        url: `/${FOLDERS[category]}/${item.name}`,
        category
      });
    }
  }
  
  return tracks;
}

export async function getAllTracks(): Promise<AudioTrack[]> {
  const [brownNoiseTracks, rainTracks] = await Promise.all([
    listTracksFromFolder('brown-noise'),
    listTracksFromFolder('rain')
  ]);
  
  return [...brownNoiseTracks, ...rainTracks];
}

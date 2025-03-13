export interface AudioTrack {
  title: string;
  artist: string;
  url: string;
  category: 'brown-noise' | 'rain';
  metadata?: Record<string, string>;
  fullPath: string;
}

export interface AudioState {
  isPlaying: boolean;
  volume: number;
  currentTrackIndex: number;
}

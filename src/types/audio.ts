export interface AudioTrack {
  title: string;
  artist: string;
  url: string;
  category: 'brown-noise' | 'rain';
}

export interface AudioState {
  isPlaying: boolean;
  volume: number;
  currentTrackIndex: number;
}

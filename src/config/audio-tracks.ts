import { AudioTrack } from '../types/audio';

// Firebase Storage URLs are handled by the AudioCache class
// We use relative paths that will be converted to Firebase Storage URLs
const STORAGE_BASE = '';

export const AUDIO_TRACKS: AudioTrack[] = [
  // Brown Noise tracks
  {
    title: "Lush Brown Noise",
    artist: "A Dreaming Machine",
    url: `${STORAGE_BASE}/Brown%20Noise%20Stream/A%20Dreaming%20Machine%20-%20Lush%20Brown%20Noise.m4a`,
    category: 'brown-noise'
  },
  {
    title: "Digital Brown",
    artist: "Ambient Network",
    url: `${STORAGE_BASE}/Brown%20Noise%20Stream/Ambient%20Network%20-%20Digital%20Brown.m4a`,
    category: 'brown-noise'
  },
  {
    title: "Deep Brown Noise",
    artist: "Brainbox",
    url: `${STORAGE_BASE}/Brown%20Noise%20Stream/Brainbox%20-%20Deep%20Brown%20Noise.m4a`,
    category: 'brown-noise'
  },
  {
    title: "Brown Noise Sleep Frequencies",
    artist: "Brown Noise Studio",
    url: `${STORAGE_BASE}/Brown%20Noise%20Stream/Brown%20Noise%20Studio%20-%20Brown%20Noise%20Sleep%20Frequencies.m4a`,
    category: 'brown-noise'
  },
  {
    title: "Brown Noise REM",
    artist: "Granular",
    url: `${STORAGE_BASE}/Brown%20Noise%20Stream/Granular%20-%20Brown%20Noise%20REM.m4a`,
    category: 'brown-noise'
  },
  {
    title: "Brown Noise Stream",
    artist: "Hum Humming",
    url: `${STORAGE_BASE}/Brown%20Noise%20Stream/Hum%20Humming%20-%20Brown%20Noise%20Stream.m4a`,
    category: 'brown-noise'
  },
  {
    title: "Brown Noise Low Pass 485Hz",
    artist: "Institute of Noise",
    url: `${STORAGE_BASE}/Brown%20Noise%20Stream/Institute%20of%20Noise%20-%20Brown%20Noise%20Low%20Pass%20485Hz.m4a`,
    category: 'brown-noise'
  },
  {
    title: "Brrrrrrown Noise",
    artist: "Klangspiel",
    url: `${STORAGE_BASE}/Brown%20Noise%20Stream/Klangspiel%20-%20Brrrrrrown%20Noise.m4a`,
    category: 'brown-noise'
  },
  {
    title: "Deep Relief Brown Noise",
    artist: "Mind & Ears",
    url: `${STORAGE_BASE}/Brown%20Noise%20Stream/Mind%20%26%20Ears%20-%20Deep%20relief%20brown%20noise.m4a`,
    category: 'brown-noise'
  },
  {
    title: "Brown Noise Schlaflied",
    artist: "Sleepy Mind",
    url: `${STORAGE_BASE}/Brown%20Noise%20Stream/Sleepy%20Mind%20-%20Brown%20Noise%20Schlaflied.m4a`,
    category: 'brown-noise'
  },
  {
    title: "Brown Noise Ocean",
    artist: "Sleepy Parents",
    url: `${STORAGE_BASE}/Brown%20Noise%20Stream/Sleepy%20Parents%20-%20Brown%20Noise%20Ocean.m4a`,
    category: 'brown-noise'
  },
  {
    title: "Children's Brown Noise",
    artist: "The Tone-Gens",
    url: `${STORAGE_BASE}/Brown%20Noise%20Stream/The%20Tone-Gens%20-%20Children's%20Brown%20Noise.m4a`,
    category: 'brown-noise'
  },
  {
    title: "In Harmony with Brown Noise",
    artist: "ULXI",
    url: `${STORAGE_BASE}/Brown%20Noise%20Stream/ULXI%20-%20In%20Harmony%20with%20Brown%20Noise.m4a`,
    category: 'brown-noise'
  },
  {
    title: "Brown Noise Catnap",
    artist: "Winding Down",
    url: `${STORAGE_BASE}/Brown%20Noise%20Stream/Winding%20Down%20-%20Brown%20Noise%20Catnap.m4a`,
    category: 'brown-noise'
  },

  // Rain tracks
  {
    title: "Classic Thunderstorm",
    artist: "Rainy Mood",
    url: `${STORAGE_BASE}/Rain%20Makes%20Everything%20Better/Rainy%20Mood%20-%20Classic%20Thunderstorm.m4a`,
    category: 'rain'
  },
  {
    title: "Big Ocean",
    artist: "Rainy Mood",
    url: `${STORAGE_BASE}/Rain%20Makes%20Everything%20Better/Rainy%20Mood%20-%20Big%20Ocean.m4a`,
    category: 'rain'
  },
  {
    title: "Country Lane",
    artist: "Rainy Mood",
    url: `${STORAGE_BASE}/Rain%20Makes%20Everything%20Better/Rainy%20Mood%20-%20Country%20Lane.m4a`,
    category: 'rain'
  },
  {
    title: "City Street",
    artist: "Rainy Mood",
    url: `${STORAGE_BASE}/Rain%20Makes%20Everything%20Better/Rainy%20Mood%20-%20City%20Street.m4a`,
    category: 'rain'
  },
  {
    title: "Bird Sanctuary",
    artist: "Rainy Mood",
    url: `${STORAGE_BASE}/Rain%20Makes%20Everything%20Better/Rainy%20Mood%20-%20Bird%20Sanctuary.m4a`,
    category: 'rain'
  },
  {
    title: "Beach Drizzle",
    artist: "Rainy Mood",
    url: `${STORAGE_BASE}/Rain%20Makes%20Everything%20Better/Rainy%20Mood%20-%20Beach%20Drizzle.m4a`,
    category: 'rain'
  },
  {
    title: "Gentle Rain",
    artist: "Rainy Mood",
    url: `${STORAGE_BASE}/Rain%20Makes%20Everything%20Better/Rainy%20Mood%20-%20Gentle%20Rain.m4a`,
    category: 'rain'
  }
];

export const getBrownNoiseTracks = () => AUDIO_TRACKS.filter(track => track.category === 'brown-noise');
export const getRainTracks = () => AUDIO_TRACKS.filter(track => track.category === 'rain');

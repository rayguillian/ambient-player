/**
 * useAudioPlayer - Custom hook for using the audio controller in React components
 */

import { useState, useEffect, useCallback } from 'react';
import { AudioState } from '../types/audio';
import { audioController } from '../services/audio-controller';

interface AudioPlayerState {
  brownNoise: AudioState;
  rain: AudioState;
  isInitialized: boolean;
  error: string | null;
  isLoading: boolean;
}

export function useAudioPlayer() {
  const [state, setState] = useState<AudioPlayerState>({
    brownNoise: {
      isPlaying: false,
      volume: 50,
      currentTrackIndex: 0
    },
    rain: {
      isPlaying: false,
      volume: 50,
      currentTrackIndex: 0
    },
    isInitialized: false,
    error: null,
    isLoading: false
  });
  
  // Initialize audio controller
  useEffect(() => {
    const handleStateChange = (newState: Omit<AudioPlayerState, 'isLoading'>) => {
      setState(prevState => ({
        ...prevState,
        ...newState,
        isLoading: false
      }));
    };
    
    // Set up state change listener
    audioController.setOptions({
      onStateChange: handleStateChange
    });
    
    // Initialize controller
    setState(prevState => ({ ...prevState, isLoading: true }));
    audioController.initialize().catch(error => {
      console.error('Failed to initialize audio controller:', error);
      setState(prevState => ({
        ...prevState,
        error: error instanceof Error ? error.message : String(error),
        isLoading: false
      }));
    });
    
    // Clean up on unmount
    return () => {
      audioController.cleanup().catch(error => {
        console.error('Failed to clean up audio controller:', error);
      });
    };
  }, []);
  
  // Toggle brown noise
  const toggleBrownNoise = useCallback(async () => {
    setState(prevState => ({ ...prevState, isLoading: true }));
    await audioController.toggleBrownNoise();
  }, []);
  
  // Toggle rain
  const toggleRain = useCallback(async () => {
    setState(prevState => ({ ...prevState, isLoading: true }));
    await audioController.toggleRain();
  }, []);
  
  // Set brown noise volume
  const setBrownNoiseVolume = useCallback(async (volume: number) => {
    await audioController.setBrownNoiseVolume(volume);
  }, []);
  
  // Set rain volume
  const setRainVolume = useCallback(async (volume: number) => {
    await audioController.setRainVolume(volume);
  }, []);
  
  // Skip to next brown noise track
  const skipToBrownNoiseTrack = useCallback(async () => {
    setState(prevState => ({ ...prevState, isLoading: true }));
    await audioController.skipToBrownNoiseTrack();
  }, []);
  
  // Skip to next rain track
  const skipToRainTrack = useCallback(async () => {
    setState(prevState => ({ ...prevState, isLoading: true }));
    await audioController.skipToRainTrack();
  }, []);
  
  // Shuffle tracks
  const shuffleTracks = useCallback(async () => {
    setState(prevState => ({ ...prevState, isLoading: true }));
    await audioController.shuffleTracks();
  }, []);
  
  // Retry initialization
  const retryInitialization = useCallback(async () => {
    setState(prevState => ({ ...prevState, isLoading: true, error: null }));
    await audioController.cleanup();
    await audioController.initialize();
  }, []);
  
  return {
    ...state,
    toggleBrownNoise,
    toggleRain,
    setBrownNoiseVolume,
    setRainVolume,
    skipToBrownNoiseTrack,
    skipToRainTrack,
    shuffleTracks,
    retryInitialization
  };
}

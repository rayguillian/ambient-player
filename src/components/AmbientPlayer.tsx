import React, { useState, useEffect, useRef, useCallback } from 'react';
import { PlayCircle, PauseCircle, Volume2, Shuffle } from 'lucide-react';
import { Card, CardContent } from './ui/card';
import { Button } from './ui/button';
import { Separator } from './ui/separator';
import { AudioTrack, AudioState } from '../types/audio';
import { listTracksFromFolder, setupStorageChangeListeners } from '../utils/storage-utils';
import { audioCache } from '../utils/audio-cache';

// Constants
const CROSSFADE_DURATION = 2;
const CALMING_PHRASES = [
  "breathe in the moment",
  "find your peace",
  "let thoughts float by",
  "embrace the silence",
  "be here now",
];

interface AudioSource {
  audio: HTMLAudioElement;
  gainNode: GainNode;
  nextAudio?: HTMLAudioElement;
  nextGainNode?: GainNode;
  track: AudioTrack;
}

const AmbientPlayer = () => {
  const [isInitialized, setIsInitialized] = useState(false);
  const [brownNoiseState, setBrownNoiseState] = useState<AudioState>({
    isPlaying: false,
    volume: 50,
    currentTrackIndex: 0
  });
  const [rainState, setRainState] = useState<AudioState>({
    isPlaying: false,
    volume: 50,
    currentTrackIndex: 0
  });
  const [currentPhrase, setCurrentPhrase] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isShuffling, setIsShuffling] = useState(false);
  const [brownNoiseTracks, setBrownNoiseTracks] = useState<AudioTrack[]>([]);
  const [rainTracks, setRainTracks] = useState<AudioTrack[]>([]);

  const audioContextRef = useRef<AudioContext>();
  const brownNoiseRef = useRef<AudioSource>();
  const rainSoundRef = useRef<AudioSource>();
  const isMounted = useRef(true);
  
  const loadTracks = useCallback(async () => {
    try {
      const [brownNoise, rain] = await Promise.all([
        listTracksFromFolder('Brown Noise Stream'),
        listTracksFromFolder('Rain Makes Everything Better')
      ]);
      
      if (!brownNoise.length && !rain.length) {
        throw new Error('No audio tracks found in either category');
      }
      
      setBrownNoiseTracks(brownNoise);
      setRainTracks(rain);
      return { brownNoise, rain };
    } catch (err) {
      console.error('Failed to load tracks:', err);
      throw new Error('Failed to load audio tracks');
    }
  }, []);

  const initializeAudioSource = useCallback(async (
    context: AudioContext,
    track: AudioTrack,
    volume: number
  ): Promise<AudioSource> => {
    try {
      // Ensure context is valid
      if (!context || context.state === 'closed') {
        throw new Error('AudioContext is closed or invalid');
      }
      
      console.log('Initializing audio source with context state:', context.state);
      
      // Load audio with cache support
      const audio = await audioCache.loadAudioWithCache({
        url: track.url,
        title: track.title,
        artist: track.artist,
        category: track.category,
        fullPath: track.fullPath
      });
      audio.loop = true;
      
      // Set up audio element properties before creating nodes
      audio.crossOrigin = "anonymous";
      audio.preload = "auto";
      audio.volume = volume / 100;
      
      // Create gain node safely
      let gainNode: GainNode;
      try {
        gainNode = context.createGain();
        gainNode.gain.value = volume / 100;
        gainNode.connect(context.destination);
      } catch (err) {
        console.error('Failed to create or connect gain node:', err);
        await ensureAudioContext(); // Recreate context if needed
        
        // Try again with the new context
        if (!audioContextRef.current) {
          throw new Error('Could not recreate audio context');
        }
        
        gainNode = audioContextRef.current.createGain();
        gainNode.gain.value = volume / 100;
        gainNode.connect(audioContextRef.current.destination);
      }
      
      // Initialize next audio
      const nextAudio = await audioCache.loadAudioWithCache({
        url: track.url,
        title: track.title,
        artist: track.artist,
        category: track.category,
        fullPath: track.fullPath
      });
      nextAudio.loop = true;
      nextAudio.crossOrigin = "anonymous";
      nextAudio.preload = "auto";
      nextAudio.volume = 0;
      
      // Create next gain node safely
      let nextGainNode: GainNode;
      try {
        nextGainNode = context.createGain();
        nextGainNode.gain.value = 0;
        nextGainNode.connect(context.destination);
      } catch (err) {
        console.error('Failed to create or connect next gain node:', err);
        
        // Use the current context which should be valid now
        if (!audioContextRef.current) {
          throw new Error('Audio context is not available');
        }
        
        nextGainNode = audioContextRef.current.createGain();
        nextGainNode.gain.value = 0;
        nextGainNode.connect(audioContextRef.current.destination);
      }

      return {
        audio,
        gainNode,
        nextAudio,
        nextGainNode,
        track
      };
    } catch (error) {
      console.error('Failed to initialize audio source:', error, { 
        track, 
        contextState: context?.state,
        volume 
      });
      throw error;
    }
  }, []);

  const crossfade = useCallback(async (
    source: AudioSource,
    nextTrack: AudioTrack,
    volume: number
  ): Promise<AudioSource> => {
    if (!audioContextRef.current) return source;

    const currentTime = audioContextRef.current.currentTime;
    
    // Load and prepare next audio with cache
    const nextAudio = await audioCache.loadAudioWithCache({
      url: nextTrack.url,
      title: nextTrack.title,
      artist: nextTrack.artist,
      category: nextTrack.category,
      fullPath: nextTrack.fullPath
    });
    nextAudio.loop = true;
    
    // Set up next audio with CORS settings
    nextAudio.crossOrigin = "anonymous";
    nextAudio.volume = 0;
    const nextGainNode = audioContextRef.current.createGain();
    nextGainNode.gain.value = 0;
    nextGainNode.connect(audioContextRef.current.destination);
    
    // Start next track
    await nextAudio.play();
    
    // Crossfade using audio element volume
    const fadeOutInterval = setInterval(() => {
      if (source.audio.volume > 0.01) {
        source.audio.volume = Math.max(0, source.audio.volume - 0.05);
      } else {
        source.audio.pause();
        clearInterval(fadeOutInterval);
      }
    }, CROSSFADE_DURATION * 10);

    const fadeInInterval = setInterval(() => {
      if (nextAudio.volume < volume / 100) {
        nextAudio.volume = Math.min(volume / 100, nextAudio.volume + 0.05);
      } else {
        clearInterval(fadeInInterval);
      }
    }, CROSSFADE_DURATION * 10);

    // Prepare new next audio for future crossfade
    const newNextAudio = await audioCache.loadAudioWithCache({
      url: nextTrack.url,
      title: nextTrack.title,
      artist: nextTrack.artist,
      category: nextTrack.category,
      fullPath: nextTrack.fullPath
    });
    newNextAudio.loop = true;
    newNextAudio.crossOrigin = "anonymous";
    newNextAudio.volume = 0;
    const newNextGain = audioContextRef.current.createGain();
    newNextGain.gain.value = 0;
    newNextGain.connect(audioContextRef.current.destination);

    return {
      audio: nextAudio,
      gainNode: nextGainNode,
      nextAudio: newNextAudio,
      nextGainNode: newNextGain,
      track: nextTrack
    };
  }, []);

  const crossfadeToNextBrownNoise = useCallback(async () => {
    if (!brownNoiseRef.current) {
      console.error('Brown noise audio source not initialized');
      return;
    }
    const nextIndex = (brownNoiseState.currentTrackIndex + 1) % brownNoiseTracks.length;
    const newSource = await crossfade(
      brownNoiseRef.current,
      brownNoiseTracks[nextIndex],
      brownNoiseState.volume
    );
    brownNoiseRef.current = newSource;
    setBrownNoiseState(prev => ({ ...prev, currentTrackIndex: nextIndex }));
  }, [brownNoiseTracks, brownNoiseState.currentTrackIndex, brownNoiseState.volume, crossfade]);

  const crossfadeToNextRain = useCallback(async () => {
    if (!rainSoundRef.current) {
      console.error('Rain audio source not initialized');
      return;
    }
    const nextIndex = (rainState.currentTrackIndex + 1) % rainTracks.length;
    const newSource = await crossfade(
      rainSoundRef.current,
      rainTracks[nextIndex],
      rainState.volume
    );
    rainSoundRef.current = newSource;
    setRainState(prev => ({ ...prev, currentTrackIndex: nextIndex }));
  }, [rainTracks, rainState.currentTrackIndex, rainState.volume, crossfade]);

  // Initialize audio cache and load tracks
  useEffect(() => {
    const init = async () => {
      try {
        console.log('Initializing app: starting database and loading tracks');
        await audioCache.init();
        const tracks = await loadTracks();
        
        console.log('Initializing audio context early on page load');
        // Create AudioContext proactively, but don't resume until user interaction
        if (!audioContextRef.current) {
          const AudioContext = window.AudioContext || (window as any).webkitAudioContext;
          try {
            audioContextRef.current = new AudioContext();
            // Keep it in suspended state until user interaction
            console.log('Created initial AudioContext, state:', audioContextRef.current.state);
          } catch (err) {
            console.error('Failed to create initial AudioContext:', err);
            // This is non-fatal, we'll try again later
          }
        }
        
        // Set the tracks
        if (tracks.brownNoise?.length > 0) {
          setBrownNoiseTracks(tracks.brownNoise);
        }
        if (tracks.rain?.length > 0) {
          setRainTracks(tracks.rain);
        }
        
        console.log('Initialization complete, tracks found:', 
          { brownNoise: tracks.brownNoise?.length || 0, rain: tracks.rain?.length || 0 });
        
        setIsInitialized(true);
      } catch (err) {
        console.error('Failed to initialize:', err);
        setError('Failed to initialize. Please try again.');
      }
    };
    init();

    // Set up storage change listener
    const cleanup = setupStorageChangeListeners(async ({ brownNoise, rain }) => {
      console.log('Storage changes detected, updating tracks');
      
      // Update track lists
      if (brownNoise?.length > 0) {
        setBrownNoiseTracks(brownNoise);
      }
      if (rain?.length > 0) {
        setRainTracks(rain);
      }

      // If audio is playing, smoothly transition to new tracks
      if (brownNoiseState.isPlaying && brownNoiseRef.current && brownNoise?.length > 0) {
        const currentBrownNoiseUrl = brownNoiseRef.current.track.url;
        // Only transition if the current track is no longer in the new list
        if (!brownNoise.some(track => track.url === currentBrownNoiseUrl)) {
          try {
            await crossfadeToNextBrownNoise();
          } catch (err) {
            console.error('Failed to crossfade to new brown noise track:', err);
          }
        }
      }

      if (rainState.isPlaying && rainSoundRef.current && rain?.length > 0) {
        const currentRainUrl = rainSoundRef.current.track.url;
        // Only transition if the current track is no longer in the new list
        if (!rain.some(track => track.url === currentRainUrl)) {
          try {
            await crossfadeToNextRain();
          } catch (err) {
            console.error('Failed to crossfade to new rain track:', err);
          }
        }
      }
    });

    // Initial page visibility event listener to handle tab switching
    const handleVisibilityChange = async () => {
      if (document.visibilityState === 'visible') {
        console.log('Page became visible, checking audio context');
        await ensureAudioContext();
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      cleanup();
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [loadTracks, brownNoiseState.isPlaying, rainState.isPlaying, crossfadeToNextBrownNoise, crossfadeToNextRain]);

  useEffect(() => {
    if (!isInitialized) return;
    
    // We DON'T want to initialize audio sources automatically anymore
    // This will only prepare variables so they're ready when the user interacts
    const prepareAudioReferences = async () => {
      try {
        console.log('Preparing audio references (not creating AudioContext yet)');
        
        // We don't need to do anything else here - just having tracks ready
        // The actual AudioContext will be created on user interaction
        console.log('Audio references prepared, will initialize on user interaction');
        setError(null);
      } catch (err) {
        console.error('Failed to prepare audio references:', err);
        if (isMounted.current) {
          setError('Failed to initialize audio. Please try again.');
        }
      }
    };

    prepareAudioReferences();

    return () => {
      console.log('Cleaning up audio resources');
      isMounted.current = false;
      
      // Only cleanup if we actually created resources
      if (brownNoiseRef.current) {
        try {
          brownNoiseRef.current.audio.pause();
          brownNoiseRef.current.nextAudio?.pause();
          try {
            brownNoiseRef.current.gainNode.disconnect();
            brownNoiseRef.current.nextGainNode?.disconnect();
          } catch (disconnectErr) {
            // Ignore disconnection errors on closed contexts
          }
        } catch (err) {
          console.error('Error cleaning up brown noise:', err);
        }
      }
      
      if (rainSoundRef.current) {
        try {
          rainSoundRef.current.audio.pause();
          rainSoundRef.current.nextAudio?.pause();
          try {
            rainSoundRef.current.gainNode.disconnect();
            rainSoundRef.current.nextGainNode?.disconnect();
          } catch (disconnectErr) {
            // Ignore disconnection errors on closed contexts
          }
        } catch (err) {
          console.error('Error cleaning up rain sound:', err);
        }
      }
      
      // Only close context if it exists and isn't already closed
      if (audioContextRef.current && audioContextRef.current.state !== 'closed') {
        try {
          console.log('Closing audio context');
          // Don't await close - it might never resolve
          audioContextRef.current.close().catch(err => {
            console.error('Error closing audio context:', err);
          });
        } catch (err) {
          console.error('Error when attempting to close audio context:', err);
        }
      }
      
      // Clear references
      brownNoiseRef.current = undefined;
      rainSoundRef.current = undefined;
      audioContextRef.current = undefined;
    };
  }, [brownNoiseTracks, rainTracks, brownNoiseState.currentTrackIndex, rainState.currentTrackIndex, isInitialized]);

  useEffect(() => {
    const randomPhrase = () => {
      const index = Math.floor(Math.random() * CALMING_PHRASES.length);
      setCurrentPhrase(CALMING_PHRASES[index]);
    };
    randomPhrase();
    const interval = setInterval(randomPhrase, 10000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    if (!brownNoiseRef.current || !audioContextRef.current) return;
    
    const currentTime = audioContextRef.current.currentTime;
    brownNoiseRef.current.gainNode.gain.cancelScheduledValues(currentTime);
    brownNoiseRef.current.gainNode.gain.setValueAtTime(brownNoiseState.volume / 100, currentTime);
  }, [brownNoiseState.volume]);

  useEffect(() => {
    if (!rainSoundRef.current || !audioContextRef.current) return;
    
    const currentTime = audioContextRef.current.currentTime;
    rainSoundRef.current.gainNode.gain.cancelScheduledValues(currentTime);
    rainSoundRef.current.gainNode.gain.setValueAtTime(rainState.volume / 100, currentTime);
  }, [rainState.volume]);


  const shuffleArray = <T,>(array: T[]) => {
    const newArray = [...array];
    for (let i = newArray.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [newArray[i], newArray[j]] = [newArray[j], newArray[i]];
    }
    return newArray;
  };


  const shuffleTracks = useCallback(async () => {
    try {
      setIsShuffling(true);

      const shuffledBrownNoise = shuffleArray(brownNoiseTracks);
      const shuffledRain = shuffleArray(rainTracks);

      if (brownNoiseState.isPlaying && brownNoiseRef.current) {
        await brownNoiseRef.current.audio.pause();
        if (brownNoiseRef.current.nextAudio) {
          await brownNoiseRef.current.nextAudio.pause();
        }
      }
      
      if (rainState.isPlaying && rainSoundRef.current) {
        await rainSoundRef.current.audio.pause();
        if (rainSoundRef.current.nextAudio) {
          await rainSoundRef.current.nextAudio.pause();
        }
      }

      setBrownNoiseTracks(shuffledBrownNoise);
      setRainTracks(shuffledRain);
      
      setBrownNoiseState(prev => ({ ...prev, currentTrackIndex: 0 }));
      setRainState(prev => ({ ...prev, currentTrackIndex: 0 }));

      await new Promise(resolve => setTimeout(resolve, 100));

      if (brownNoiseState.isPlaying && brownNoiseRef.current) {
          const audio = await audioCache.loadAudioWithCache({
            url: shuffledBrownNoise[0].url,
            title: shuffledBrownNoise[0].title,
            artist: shuffledBrownNoise[0].artist,
            category: shuffledBrownNoise[0].category,
            fullPath: shuffledBrownNoise[0].fullPath
          });
        audio.loop = true;
        await audio.play();
        brownNoiseRef.current.audio = audio;
        brownNoiseRef.current.gainNode.gain.setValueAtTime(
          brownNoiseState.volume / 100,
          audioContextRef.current?.currentTime || 0
        );
      }

      if (rainState.isPlaying && rainSoundRef.current) {
          const audio = await audioCache.loadAudioWithCache({
            url: shuffledRain[0].url,
            title: shuffledRain[0].title,
            artist: shuffledRain[0].artist,
            category: shuffledRain[0].category,
            fullPath: shuffledRain[0].fullPath
          });
        audio.loop = true;
        await audio.play();
        rainSoundRef.current.audio = audio;
        rainSoundRef.current.gainNode.gain.setValueAtTime(
          rainState.volume / 100,
          audioContextRef.current?.currentTime || 0
        );
      }

      setTimeout(() => setIsShuffling(false), 1000);
    } catch (err) {
      console.error('Failed to shuffle tracks:', err);
      setError('Failed to shuffle tracks. Please try again.');
      setIsShuffling(false);
    }
  }, [brownNoiseTracks, rainTracks, brownNoiseState, rainState]);

  const ensureAudioContext = async () => {
    try {
      // Only create new context if one doesn't exist or is closed
      if (!audioContextRef.current || audioContextRef.current.state === 'closed') {
        const AudioContext = window.AudioContext || (window as any).webkitAudioContext;
        audioContextRef.current = new AudioContext();
        console.log('Created new AudioContext, state:', audioContextRef.current.state);
        
        // Reconnect existing nodes to the new context if they exist
        if (brownNoiseRef.current) {
          const newGainNode = audioContextRef.current.createGain();
          newGainNode.gain.value = brownNoiseRef.current.gainNode.gain.value;
          newGainNode.connect(audioContextRef.current.destination);
          brownNoiseRef.current.gainNode = newGainNode;
          
          if (brownNoiseRef.current.nextGainNode) {
            const newNextGainNode = audioContextRef.current.createGain();
            newNextGainNode.gain.value = brownNoiseRef.current.nextGainNode.gain.value;
            newNextGainNode.connect(audioContextRef.current.destination);
            brownNoiseRef.current.nextGainNode = newNextGainNode;
          }
        }
        
        if (rainSoundRef.current) {
          const newGainNode = audioContextRef.current.createGain();
          newGainNode.gain.value = rainSoundRef.current.gainNode.gain.value;
          newGainNode.connect(audioContextRef.current.destination);
          rainSoundRef.current.gainNode = newGainNode;
          
          if (rainSoundRef.current.nextGainNode) {
            const newNextGainNode = audioContextRef.current.createGain();
            newNextGainNode.gain.value = rainSoundRef.current.nextGainNode.gain.value;
            newNextGainNode.connect(audioContextRef.current.destination);
            rainSoundRef.current.nextGainNode = newNextGainNode;
          }
        }
      }
      
      // Resume context if suspended
      if (audioContextRef.current.state === 'suspended') {
        console.log('Resuming suspended AudioContext');
        await audioContextRef.current.resume();
        console.log('AudioContext resumed, new state:', audioContextRef.current.state);
      }

      return true;
    } catch (error) {
      console.error('Failed to initialize audio context:', error);
      setError('Failed to initialize audio. Please check your browser settings.');
      return false;
    }
  };

  const setVolume = async (audioSource: AudioSource | undefined, volume: number) => {
    if (!audioSource) return;
    
    try {
      console.log('Setting volume to', volume);
      
      // Ensure context is ready
      const contextReady = await ensureAudioContext();
      if (!contextReady) {
        console.error('Audio context could not be initialized for volume change');
        return;
      }
      
      const normalizedVolume = volume / 100;
      
      // Set HTML audio element volume
      audioSource.audio.volume = normalizedVolume;
      
      // Check if the gain node needs to be reconnected to the current context
      if (audioSource.gainNode.context.state === 'closed') {
        console.log('Gain node context is closed, creating new gain node');
        if (!audioContextRef.current) {
          throw new Error('Audio context is not available');
        }
        
        // Create new gain node connected to the current context
        const newGainNode = audioContextRef.current.createGain();
        newGainNode.gain.value = normalizedVolume;
        newGainNode.connect(audioContextRef.current.destination);
        
        // Replace the old gain node with the new one
        audioSource.gainNode = newGainNode;
      } else {
        // Set gain node volume if context exists and is not closed
        if (audioContextRef.current && audioContextRef.current.state !== 'closed') {
          const currentTime = audioContextRef.current.currentTime;
          try {
            audioSource.gainNode.gain.cancelScheduledValues(currentTime);
            audioSource.gainNode.gain.setValueAtTime(normalizedVolume, currentTime);
          } catch (err) {
            console.error('Error setting gain value:', err);
            // Try reconnecting the node
            try {
              audioSource.gainNode.disconnect();
            } catch (e) {} // Ignore disconnection errors
            
            audioSource.gainNode.connect(audioContextRef.current.destination);
            audioSource.gainNode.gain.setValueAtTime(normalizedVolume, audioContextRef.current.currentTime);
          }
        }
      }
      
      // Also update next audio and gain node if they exist
      if (audioSource.nextAudio) {
        audioSource.nextAudio.volume = 0; // Keep next audio silent until crossfade
      }
      
      if (audioSource.nextGainNode) {
        if (audioSource.nextGainNode.context.state === 'closed') {
          // Create new next gain node if needed
          if (!audioContextRef.current) {
            throw new Error('Audio context is not available');
          }
          
          const newNextGainNode = audioContextRef.current.createGain();
          newNextGainNode.gain.value = 0; // Keep next gain silent until crossfade
          newNextGainNode.connect(audioContextRef.current.destination);
          
          audioSource.nextGainNode = newNextGainNode;
        } else {
          try {
            audioSource.nextGainNode.gain.cancelScheduledValues(audioContextRef.current!.currentTime);
            audioSource.nextGainNode.gain.setValueAtTime(0, audioContextRef.current!.currentTime);
          } catch (err) {
            console.error('Error setting next gain value:', err);
          }
        }
      }
      
      console.log('Volume set successfully');
    } catch (error) {
      console.error('Failed to set volume:', error);
    }
  };

  const toggleBrownNoise = async () => {
    try {
      console.log('Toggle brown noise - start');
      
      // Check if tracks are available first
      if (!brownNoiseTracks || brownNoiseTracks.length === 0) {
        console.log('No brown noise tracks loaded yet, trying to load them');
        // Try to load tracks again in case they weren't loaded initially
        try {
          const { brownNoise } = await loadTracks();
          if (!brownNoise || brownNoise.length === 0) {
            console.error('No tracks available from Firebase Storage, creating fallback track');
            
            // Create a fallback track with a direct public file URL for testing
            // This URL should be accessible without CORS issues (like a CDN URL)
            const fallbackTrack: AudioTrack = {
              title: "Brown Noise",
              artist: "Ambient Player",
              // Use a direct MP3 URL from a CDN or public source with proper CORS headers
              url: "https://assets.mixkit.co/sfx/preview/mixkit-forest-in-the-morning-2731.mp3",
              category: 'brown-noise',
              fullPath: 'test/brown-noise-test.mp3'
            };
            
            setBrownNoiseTracks([fallbackTrack]);
            console.log('Using fallback track:', fallbackTrack);
          } else {
            setBrownNoiseTracks(brownNoise);
            console.log(`Found ${brownNoise.length} brown noise tracks`);
          }
        } catch (err) {
          console.error('Failed to load tracks:', err);
          
          // Still provide fallback for testing
          const fallbackTrack: AudioTrack = {
            title: "Brown Noise",
            artist: "Ambient Player",
            url: "https://assets.mixkit.co/sfx/preview/mixkit-forest-in-the-morning-2731.mp3",
            category: 'brown-noise',
            fullPath: 'test/brown-noise-test.mp3'
          };
          
          setBrownNoiseTracks([fallbackTrack]);
          console.log('Using fallback track after error:', fallbackTrack);
        }
      }
      
      // Initialize context first on user interaction
      const contextReady = await ensureAudioContext();
      if (!contextReady) {
        console.error('Audio context could not be initialized');
        return;
      }
      
      console.log('Audio context ready, state:', audioContextRef.current?.state);

      // Reinitialize if reference is missing or was created with a closed context
      if (!brownNoiseRef.current || 
          brownNoiseRef.current.gainNode.context.state === 'closed') {
        console.log('Initializing new brown noise source');
        
        // Safety check again to make sure tracks are available
        if (!brownNoiseTracks || brownNoiseTracks.length === 0) {
          throw new Error('No brown noise tracks available after loading');
        }
        
        const trackIndex = Math.min(brownNoiseState.currentTrackIndex, brownNoiseTracks.length - 1);
        
        try {
          brownNoiseRef.current = await initializeAudioSource(
            audioContextRef.current!,
            brownNoiseTracks[trackIndex],
            brownNoiseState.volume
          );
          console.log('Brown noise source initialized successfully');
        } catch (initError) {
          console.error('Failed to initialize brown noise source:', initError);
          
          // Try one more time after recreating the context
          await ensureAudioContext();
          brownNoiseRef.current = await initializeAudioSource(
            audioContextRef.current!,
            brownNoiseTracks[trackIndex],
            brownNoiseState.volume
          );
        }
      }

      const newIsPlaying = !brownNoiseState.isPlaying;
      console.log('Setting brown noise playing state to:', newIsPlaying);
      
      if (newIsPlaying) {
        // Always ensure nodes are connected to the current context
        try {
          // Disconnect first to avoid duplicate connections
          try {
            brownNoiseRef.current.gainNode.disconnect();
          } catch (err) {
            // Ignore disconnection errors
          }
          
          if (audioContextRef.current && audioContextRef.current.state !== 'closed') {
            brownNoiseRef.current.gainNode.connect(audioContextRef.current.destination);
            console.log('Reconnected brown noise gain node to context');
          }
          
          // Set volume before playing
          await setVolume(brownNoiseRef.current, brownNoiseState.volume);
          
          // Wait for audio to be ready
          if (brownNoiseRef.current.audio.readyState < 4) {
            console.log('Waiting for audio to be ready, current state:', brownNoiseRef.current.audio.readyState);
            await new Promise<void>((resolve, reject) => {
              const audio = brownNoiseRef.current!.audio;
              const timeoutId = setTimeout(() => {
                console.log('Audio load timeout, continuing anyway');
                audio.removeEventListener('canplaythrough', onCanPlay);
                audio.removeEventListener('error', onError);
                resolve(); // Resolve anyway after timeout
              }, 5000);
              
              const onCanPlay = () => {
                console.log('Audio canplaythrough event fired');
                clearTimeout(timeoutId);
                audio.removeEventListener('canplaythrough', onCanPlay);
                audio.removeEventListener('error', onError);
                resolve();
              };
              
              const onError = (e: Event) => {
                console.error('Audio error event:', e, audio.error);
                clearTimeout(timeoutId);
                audio.removeEventListener('canplaythrough', onCanPlay);
                audio.removeEventListener('error', onError);
                reject(new Error(`Failed to load audio: ${audio.error?.message || 'Unknown error'}`));
              };
              
              audio.addEventListener('canplaythrough', onCanPlay);
              audio.addEventListener('error', onError);
              
              // If already in ready state, resolve immediately
              if (audio.readyState >= 4) {
                console.log('Audio already in ready state');
                clearTimeout(timeoutId);
                resolve();
              }
            });
          }
          
          console.log('Playing brown noise audio');
          await brownNoiseRef.current.audio.play();
        } catch (playError) {
          console.error('Error playing brown noise audio:', playError);
          
          // Try to recover by reloading the audio
          try {
            console.log('Attempting to reload audio after play error');
            const newAudio = await audioCache.loadAudioWithCache({
              url: brownNoiseTracks[brownNoiseState.currentTrackIndex].url,
              title: brownNoiseTracks[brownNoiseState.currentTrackIndex].title,
              artist: brownNoiseTracks[brownNoiseState.currentTrackIndex].artist,
              category: brownNoiseTracks[brownNoiseState.currentTrackIndex].category,
              fullPath: brownNoiseTracks[brownNoiseState.currentTrackIndex].fullPath
            });
            
            newAudio.loop = true;
            newAudio.crossOrigin = "anonymous"; 
            newAudio.volume = brownNoiseState.volume / 100;
            
            brownNoiseRef.current.audio = newAudio;
            await brownNoiseRef.current.audio.play();
          } catch (retryError) {
            console.error('Recovery attempt failed:', retryError);
            throw new Error('Failed to play audio after multiple attempts. Please try again.');
          }
        }
      } else {
        console.log('Pausing brown noise audio');
        await brownNoiseRef.current.audio.pause();
        if (brownNoiseRef.current.nextAudio) {
          await brownNoiseRef.current.nextAudio.pause();
        }
      }
      
      setBrownNoiseState(prev => ({ ...prev, isPlaying: newIsPlaying }));
      setError(null);
      console.log('Toggle brown noise - complete');
    } catch (err) {
      console.error('Failed to toggle brown noise:', err);
      setError(err instanceof Error ? err.message : 'Failed to play audio. Please try again.');
    }
  };


  useEffect(() => {
    if (!rainSoundRef.current?.audio) return;
    
    const audio = rainSoundRef.current.audio;
    const handleRainEnded = () => {
      if (rainState.isPlaying) {
        crossfadeToNextRain();
      }
    };

    audio.addEventListener('ended', handleRainEnded);
    return () => audio.removeEventListener('ended', handleRainEnded);
  }, [rainState.isPlaying, crossfadeToNextRain]);

  useEffect(() => {
    if (!brownNoiseRef.current?.audio) return;
    
    const audio = brownNoiseRef.current.audio;
    const handleBrownNoiseEnded = () => {
      if (brownNoiseState.isPlaying) {
        crossfadeToNextBrownNoise();
      }
    };

    audio.addEventListener('ended', handleBrownNoiseEnded);
    return () => audio.removeEventListener('ended', handleBrownNoiseEnded);
  }, [brownNoiseState.isPlaying, crossfadeToNextBrownNoise]);

  const toggleRain = async () => {
    try {
      console.log('Toggle rain - start');
      
      // Check if tracks are available first
      if (!rainTracks || rainTracks.length === 0) {
        console.log('No rain tracks loaded yet, trying to load them');
        // Try to load tracks again in case they weren't loaded initially
        try {
          const { rain } = await loadTracks();
          if (!rain || rain.length === 0) {
            console.error('No rain tracks available from Firebase Storage, creating fallback track');
            
            // Create a fallback track with a direct public file URL for testing
            // This URL should be accessible without CORS issues (like a CDN URL)
            const fallbackTrack: AudioTrack = {
              title: "Rain Sound",
              artist: "Ambient Player",
              url: "https://assets.mixkit.co/sfx/preview/mixkit-ambient-rain-loop-2691.mp3",
              category: 'rain',
              fullPath: 'test/rain-test.mp3'
            };
            
            setRainTracks([fallbackTrack]);
            console.log('Using fallback rain track:', fallbackTrack);
          } else {
            setRainTracks(rain);
            console.log(`Found ${rain.length} rain tracks`);
          }
        } catch (err) {
          console.error('Failed to load tracks:', err);
          
          // Still provide fallback for testing
          const fallbackTrack: AudioTrack = {
            title: "Rain Sound",
            artist: "Ambient Player",
            url: "https://assets.mixkit.co/sfx/preview/mixkit-ambient-rain-loop-2691.mp3", 
            category: 'rain',
            fullPath: 'test/rain-test.mp3'
          };
          
          setRainTracks([fallbackTrack]);
          console.log('Using fallback rain track after error:', fallbackTrack);
        }
      }
      
      // Initialize context first on user interaction
      const contextReady = await ensureAudioContext();
      if (!contextReady) {
        console.error('Audio context could not be initialized');
        return;
      }
      
      console.log('Audio context ready, state:', audioContextRef.current?.state);

      // Reinitialize if reference is missing or was created with a closed context
      if (!rainSoundRef.current || 
          rainSoundRef.current.gainNode.context.state === 'closed') {
        console.log('Initializing new rain sound source');
        
        // Safety check again to make sure tracks are available
        if (!rainTracks || rainTracks.length === 0) {
          throw new Error('No rain tracks available after loading');
        }
        
        const trackIndex = Math.min(rainState.currentTrackIndex, rainTracks.length - 1);
        
        try {
          rainSoundRef.current = await initializeAudioSource(
            audioContextRef.current!,
            rainTracks[trackIndex],
            rainState.volume
          );
          console.log('Rain sound source initialized successfully');
        } catch (initError) {
          console.error('Failed to initialize rain sound source:', initError);
          
          // Try one more time after recreating the context
          await ensureAudioContext();
          rainSoundRef.current = await initializeAudioSource(
            audioContextRef.current!,
            rainTracks[trackIndex],
            rainState.volume
          );
        }
      }

      const newIsPlaying = !rainState.isPlaying;
      console.log('Setting rain playing state to:', newIsPlaying);
      
      if (newIsPlaying) {
        // Always ensure nodes are connected to the current context
        try {
          // Disconnect first to avoid duplicate connections
          try {
            rainSoundRef.current.gainNode.disconnect();
          } catch (err) {
            // Ignore disconnection errors
          }
          
          if (audioContextRef.current && audioContextRef.current.state !== 'closed') {
            rainSoundRef.current.gainNode.connect(audioContextRef.current.destination);
            console.log('Reconnected rain gain node to context');
          }
          
          // Set volume before playing
          await setVolume(rainSoundRef.current, rainState.volume);
          
          // Wait for audio to be ready
          if (rainSoundRef.current.audio.readyState < 4) {
            console.log('Waiting for rain audio to be ready, current state:', rainSoundRef.current.audio.readyState);
            await new Promise<void>((resolve, reject) => {
              const audio = rainSoundRef.current!.audio;
              const timeoutId = setTimeout(() => {
                console.log('Rain audio load timeout, continuing anyway');
                audio.removeEventListener('canplaythrough', onCanPlay);
                audio.removeEventListener('error', onError);
                resolve(); // Resolve anyway after timeout
              }, 5000);
              
              const onCanPlay = () => {
                console.log('Rain audio canplaythrough event fired');
                clearTimeout(timeoutId);
                audio.removeEventListener('canplaythrough', onCanPlay);
                audio.removeEventListener('error', onError);
                resolve();
              };
              
              const onError = (e: Event) => {
                console.error('Rain audio error event:', e, audio.error);
                clearTimeout(timeoutId);
                audio.removeEventListener('canplaythrough', onCanPlay);
                audio.removeEventListener('error', onError);
                reject(new Error(`Failed to load rain audio: ${audio.error?.message || 'Unknown error'}`));
              };
              
              audio.addEventListener('canplaythrough', onCanPlay);
              audio.addEventListener('error', onError);
              
              // If already in ready state, resolve immediately
              if (audio.readyState >= 4) {
                console.log('Rain audio already in ready state');
                clearTimeout(timeoutId);
                resolve();
              }
            });
          }
          
          console.log('Playing rain audio');
          await rainSoundRef.current.audio.play();
        } catch (playError) {
          console.error('Error playing rain audio:', playError);
          
          // Try to recover by reloading the audio
          try {
            console.log('Attempting to reload rain audio after play error');
            const newAudio = await audioCache.loadAudioWithCache({
              url: rainTracks[rainState.currentTrackIndex].url,
              title: rainTracks[rainState.currentTrackIndex].title,
              artist: rainTracks[rainState.currentTrackIndex].artist,
              category: rainTracks[rainState.currentTrackIndex].category,
              fullPath: rainTracks[rainState.currentTrackIndex].fullPath
            });
            
            newAudio.loop = true;
            newAudio.crossOrigin = "anonymous"; 
            newAudio.volume = rainState.volume / 100;
            
            rainSoundRef.current.audio = newAudio;
            await rainSoundRef.current.audio.play();
          } catch (retryError) {
            console.error('Recovery attempt failed:', retryError);
            throw new Error('Failed to play rain audio after multiple attempts. Please try again.');
          }
        }
      } else {
        console.log('Pausing rain audio');
        await rainSoundRef.current.audio.pause();
        if (rainSoundRef.current.nextAudio) {
          await rainSoundRef.current.nextAudio.pause();
        }
      }
      
      setRainState(prev => ({ ...prev, isPlaying: newIsPlaying }));
      setError(null);
      console.log('Toggle rain - complete');
    } catch (err) {
      console.error('Failed to toggle rain sound:', err);
      setError(err instanceof Error ? err.message : 'Failed to play audio. Please try again.');
    }
  };

  const retryInitialization = async () => {
    console.log('Retrying initialization');
    setError(null);
    setIsInitialized(false);
    
    // Cleanup existing audio context and sources
    try {
      if (brownNoiseRef.current) {
        console.log('Cleaning up brown noise');
        if (brownNoiseState.isPlaying) {
          try {
            await brownNoiseRef.current.audio.pause();
          } catch (err) {
            console.error('Error pausing brown noise audio:', err);
          }
        }
        
        try {
          brownNoiseRef.current.nextAudio?.pause();
        } catch (err) {
          console.error('Error pausing next brown noise audio:', err);
        }
        
        try {
          brownNoiseRef.current.gainNode.disconnect();
          brownNoiseRef.current.nextGainNode?.disconnect();
        } catch (err) {
          console.error('Error disconnecting brown noise nodes:', err);
        }
      }
      
      if (rainSoundRef.current) {
        console.log('Cleaning up rain sound');
        try {
          await rainSoundRef.current.audio.pause();
        } catch (err) {
          console.error('Error pausing rain audio:', err);
        }
        
        try {
          rainSoundRef.current.nextAudio?.pause();
        } catch (err) {
          console.error('Error pausing next rain audio:', err);
        }
        
        try {
          rainSoundRef.current.gainNode.disconnect();
          rainSoundRef.current.nextGainNode?.disconnect();
        } catch (err) {
          console.error('Error disconnecting rain nodes:', err);
        }
      }
      
      if (audioContextRef.current && audioContextRef.current.state !== 'closed') {
        console.log('Closing audio context');
        try {
          await audioContextRef.current.close();
        } catch (err) {
          console.error('Error closing audio context:', err);
        }
      }
      
      // Clear references
      brownNoiseRef.current = undefined;
      rainSoundRef.current = undefined;
      audioContextRef.current = undefined;
    } catch (err) {
      console.error('Error during cleanup:', err);
      // Continue with initialization despite cleanup errors
    }
    
    try {
      console.log('Reinitializing audio cache');
      // First reinitialize the database and load tracks
      await audioCache.init();
      const tracks = await loadTracks();
      console.log('Tracks loaded:', tracks);
      
      // Create new Audio Context
      await ensureAudioContext();
      
      if (!audioContextRef.current) {
        throw new Error('Failed to create audio context');
      }
      
      console.log('Audio context created, state:', audioContextRef.current.state);
      
      // Only initialize sources for categories that have tracks
      if (tracks.brownNoise.length > 0) {
        console.log('Initializing brown noise source');
        try {
          const brownNoiseSource = await initializeAudioSource(
            audioContextRef.current,
            tracks.brownNoise[brownNoiseState.currentTrackIndex],
            brownNoiseState.volume
          );
          brownNoiseRef.current = brownNoiseSource;
          console.log('Brown noise source initialized');
        } catch (err) {
          console.error('Failed to initialize brown noise source:', err);
          // Continue with rain initialization
        }
      }
      
      if (tracks.rain.length > 0) {
        console.log('Initializing rain source');
        try {
          const rainSource = await initializeAudioSource(
            audioContextRef.current,
            tracks.rain[rainState.currentTrackIndex],
            rainState.volume
          );
          rainSoundRef.current = rainSource;
          console.log('Rain source initialized');
        } catch (err) {
          console.error('Failed to initialize rain source:', err);
          // Continue with what we have
        }
      }
      
      setIsInitialized(true);
      setError(null);
      console.log('Initialization retry complete');
    } catch (err) {
      console.error('Failed to initialize audio:', err);
      setError('Failed to initialize audio. Please try again.');
    }
  };

  if (error) {
    return (
      <div className="min-h-screen bg-black p-4 flex flex-col items-center justify-center space-y-4">
        <p className="text-red-500 text-sm mb-2">{error}</p>
        <Button 
          onClick={retryInitialization}
          className="bg-white/10 hover:bg-white/20 text-white/80"
        >
          Try Again
        </Button>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-black p-4 flex flex-col items-center justify-center">
      <Card className="w-full max-w-md bg-black border-white/20">
        <CardContent className="p-8">
          <div className="text-center mb-8">
            <p className="text-white/60 font-light tracking-widest text-sm uppercase">
              {currentPhrase}
            </p>
          </div>

          <div className="space-y-8">
            {/* Brown Noise Control */}
            <div className="group">
              <div className="space-y-2">
                <Button
                  variant="ghost"
                  className="w-full h-24 border border-white/10 hover:border-white/20 bg-black hover:bg-black/90 transition-all duration-300"
                  onClick={toggleBrownNoise}
                >
                <div className="flex flex-col items-center space-y-2">
                  {brownNoiseState.isPlaying ? (
                    <PauseCircle className="w-6 h-6 text-white/80" />
                  ) : (
                    <PlayCircle className="w-6 h-6 text-white/80" />
                  )}
                  <span className="text-white/60 font-light tracking-wider text-xs uppercase">
                    Brown Noise
                  </span>
                </div>
                </Button>
                <div className="flex items-center space-x-2 px-4 py-2">
                  <Volume2 className="w-4 h-4 text-white/60" />
                  <input
                    type="range"
                    min="0"
                    max="100"
                    value={brownNoiseState.volume}
                    onChange={(e) => setBrownNoiseState(prev => ({ ...prev, volume: Number(e.target.value) }))}
                    className="w-full h-1 bg-white/10 rounded-lg appearance-none cursor-pointer [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-3 [&::-webkit-slider-thumb]:h-3 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-white/80"
                  />
                </div>
              </div>
            </div>

            <Separator className="bg-white/10" />

            {/* Rain Control */}
            <div className="group">
              <div className="space-y-2">
                <Button
                  variant="ghost"
                  className="w-full h-24 border border-white/10 hover:border-white/20 bg-black hover:bg-black/90 transition-all duration-300"
                  onClick={toggleRain}
                >
                <div className="flex flex-col items-center space-y-2">
                  {rainState.isPlaying ? (
                    <PauseCircle className="w-6 h-6 text-white/80" />
                  ) : (
                    <PlayCircle className="w-6 h-6 text-white/80" />
                  )}
                  <span className="text-white/60 font-light tracking-wider text-xs uppercase">
                    Rain
                  </span>
                </div>
                </Button>
                <div className="flex items-center space-x-2 px-4 py-2">
                  <Volume2 className="w-4 h-4 text-white/60" />
                  <input
                    type="range"
                    min="0"
                    max="100"
                    value={rainState.volume}
                    onChange={(e) => setRainState(prev => ({ ...prev, volume: Number(e.target.value) }))}
                    className="w-full h-1 bg-white/10 rounded-lg appearance-none cursor-pointer [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-3 [&::-webkit-slider-thumb]:h-3 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-white/80"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Shuffle Button */}
          <div className="mt-6 flex justify-center">
            <Button
              variant="ghost"
              className={`border border-white/10 hover:border-white/20 bg-black hover:bg-black/90 transition-all duration-300 ${
                isShuffling ? 'text-white' : 'text-white/60'
              }`}
              onClick={shuffleTracks}
            >
              <Shuffle className="w-4 h-4 mr-2" />
              <span className="font-light tracking-wider text-xs uppercase">
                Shuffle Both
              </span>
            </Button>
          </div>

          <div className="mt-6 text-center">
            <p className="text-white/40 font-light text-xs tracking-wider">
              find your peace
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default AmbientPlayer;

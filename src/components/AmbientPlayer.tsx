import React, { useState, useEffect, useRef, useCallback } from 'react';
import { PlayCircle, PauseCircle, Volume2, Shuffle } from 'lucide-react';
import { Card, CardContent } from './ui/card';
import { Button } from './ui/button';
import { Separator } from './ui/separator';
import { AudioTrack, AudioState } from '../types/audio';
import { listTracksFromFolder } from '../utils/storage-utils';
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
        listTracksFromFolder('brown-noise'),
        listTracksFromFolder('rain')
      ]);
      
      if (!brownNoise.length || !rain.length) {
        throw new Error('No audio tracks found');
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
    // Load audio with cache support
    const audio = await audioCache.loadAudioWithCache({
      url: track.url,
      title: track.title,
      artist: track.artist,
      category: track.category
    });
    audio.loop = true;
    
    // Set up audio element properties before creating nodes
    audio.crossOrigin = "anonymous";
    audio.preload = "auto";
    audio.volume = volume / 100;
    
    // Create and connect gain node
    const gainNode = context.createGain();
    gainNode.gain.value = volume / 100;
    gainNode.connect(context.destination);

    // Initialize next audio
    const nextAudio = await audioCache.loadAudioWithCache({
      url: track.url,
      title: track.title,
      artist: track.artist,
      category: track.category
    });
    nextAudio.loop = true;
    // Set up next audio properties
    nextAudio.crossOrigin = "anonymous";
    nextAudio.preload = "auto";
    nextAudio.volume = 0;
    const nextGainNode = context.createGain();
    nextGainNode.gain.value = 0;
    nextGainNode.connect(context.destination);

    return {
      audio,
      gainNode,
      nextAudio,
      nextGainNode,
      track
    };
  }, []);

  // Initialize audio cache and load tracks
  useEffect(() => {
    const init = async () => {
      try {
        await audioCache.init();
        const tracks = await loadTracks();
        setIsInitialized(true);
      } catch (err) {
        console.error('Failed to initialize:', err);
        setError('Failed to initialize. Please try again.');
      }
    };
    init();
  }, [loadTracks]);

  useEffect(() => {
    if (!isInitialized) return;
    
    const initAudio = async () => {
      try {
        if (!isMounted.current) return;

        const ctx = new AudioContext();
        audioContextRef.current = ctx;
        
        const brownNoise = await initializeAudioSource(
          ctx,
          brownNoiseTracks[brownNoiseState.currentTrackIndex],
          brownNoiseState.volume
        );
        
        const rain = await initializeAudioSource(
          ctx,
          rainTracks[rainState.currentTrackIndex],
          rainState.volume
        );

        if (!isMounted.current) {
          brownNoise.audio.pause();
          brownNoise.nextAudio?.pause();
          rain.audio.pause();
          rain.nextAudio?.pause();
          return;
        }

        brownNoiseRef.current = brownNoise;
        rainSoundRef.current = rain;
        setError(null);
      } catch (err) {
        console.error('Failed to initialize audio:', err);
        if (isMounted.current) {
          setError('Failed to initialize audio. Please try again.');
        }
      }
    };

    initAudio();

    return () => {
      isMounted.current = false;
      if (brownNoiseRef.current) {
        brownNoiseRef.current.audio.pause();
        brownNoiseRef.current.nextAudio?.pause();
        brownNoiseRef.current.gainNode.disconnect();
        brownNoiseRef.current.nextGainNode?.disconnect();
      }
      if (rainSoundRef.current) {
        rainSoundRef.current.audio.pause();
        rainSoundRef.current.nextAudio?.pause();
        rainSoundRef.current.gainNode.disconnect();
        rainSoundRef.current.nextGainNode?.disconnect();
      }
      if (audioContextRef.current?.state !== 'closed') {
        audioContextRef.current?.close().catch(err => {
          console.error('Error closing audio context:', err);
        });
      }
    };
  }, [brownNoiseTracks, rainTracks, brownNoiseState.currentTrackIndex, rainState.currentTrackIndex, initializeAudioSource, isInitialized]);

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
      category: nextTrack.category
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
      category: nextTrack.category
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

  const shuffleArray = <T,>(array: T[]) => {
    const newArray = [...array];
    for (let i = newArray.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [newArray[i], newArray[j]] = [newArray[j], newArray[i]];
    }
    return newArray;
  };

  const crossfadeToNextBrownNoise = useCallback(async () => {
    if (!brownNoiseRef.current) return;
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
    if (!rainSoundRef.current) return;
    const nextIndex = (rainState.currentTrackIndex + 1) % rainTracks.length;
    const newSource = await crossfade(
      rainSoundRef.current,
      rainTracks[nextIndex],
      rainState.volume
    );
    rainSoundRef.current = newSource;
    setRainState(prev => ({ ...prev, currentTrackIndex: nextIndex }));
  }, [rainTracks, rainState.currentTrackIndex, rainState.volume, crossfade]);

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
          category: shuffledBrownNoise[0].category
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
          category: shuffledRain[0].category
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

  const toggleBrownNoise = async () => {
    if (!audioContextRef.current || !brownNoiseRef.current) return;
    
    try {
      if (audioContextRef.current.state === 'suspended') {
        await audioContextRef.current.resume();
      }

      const newIsPlaying = !brownNoiseState.isPlaying;
      if (newIsPlaying) {
        brownNoiseRef.current.gainNode.gain.value = brownNoiseState.volume / 100;
        console.log('Audio source before play:', {
          src: brownNoiseRef.current.audio.src,
          readyState: brownNoiseRef.current.audio.readyState,
          error: brownNoiseRef.current.audio.error
        });
        await brownNoiseRef.current.audio.play();
      } else {
        await brownNoiseRef.current.audio.pause();
        if (brownNoiseRef.current.nextAudio) {
          await brownNoiseRef.current.nextAudio.pause();
        }
      }
      setBrownNoiseState(prev => ({ ...prev, isPlaying: newIsPlaying }));
      setError(null);
    } catch (err) {
      console.error('Failed to toggle brown noise:', err);
      if (err instanceof Error) {
        setError(`Failed to play audio: ${err.message}`);
      } else {
        setError('Failed to play audio. Please try again.');
      }
    }
  };


  useEffect(() => {
    if (!rainSoundRef.current?.audio) return;
    
    const handleRainEnded = () => {
      if (rainState.isPlaying) {
        crossfadeToNextRain();
      }
    };

    rainSoundRef.current.audio.addEventListener('ended', handleRainEnded);
    return () => rainSoundRef.current?.audio.removeEventListener('ended', handleRainEnded);
  }, [rainState.isPlaying, crossfadeToNextRain]);

  useEffect(() => {
    if (!brownNoiseRef.current?.audio) return;
    
    const handleBrownNoiseEnded = () => {
      if (brownNoiseState.isPlaying) {
        crossfadeToNextBrownNoise();
      }
    };

    brownNoiseRef.current.audio.addEventListener('ended', handleBrownNoiseEnded);
    return () => brownNoiseRef.current?.audio.removeEventListener('ended', handleBrownNoiseEnded);
  }, [brownNoiseState.isPlaying, crossfadeToNextBrownNoise]);

  const toggleRain = async () => {
    if (!audioContextRef.current || !rainSoundRef.current) return;
    
    try {
      if (audioContextRef.current.state === 'suspended') {
        await audioContextRef.current.resume();
      }

      const newIsPlaying = !rainState.isPlaying;
      if (newIsPlaying) {
        rainSoundRef.current.gainNode.gain.value = rainState.volume / 100;
        await rainSoundRef.current.audio.play();
      } else {
        await rainSoundRef.current.audio.pause();
        if (rainSoundRef.current.nextAudio) {
          await rainSoundRef.current.nextAudio.pause();
        }
      }
      setRainState(prev => ({ ...prev, isPlaying: newIsPlaying }));
      setError(null);
    } catch (err) {
      console.error('Failed to toggle rain sound:', err);
      setError('Failed to play audio. Please try again.');
    }
  };

  const retryInitialization = async () => {
    setError(null);
    setIsInitialized(false);
    
    // Cleanup existing audio context and sources
    if (brownNoiseRef.current && brownNoiseState.isPlaying) {
      brownNoiseRef.current.audio.pause();
      brownNoiseRef.current.nextAudio?.pause();
      brownNoiseRef.current.gainNode.disconnect();
      brownNoiseRef.current.nextGainNode?.disconnect();
    }
    if (rainSoundRef.current) {
      rainSoundRef.current.audio.pause();
      rainSoundRef.current.nextAudio?.pause();
      rainSoundRef.current.gainNode.disconnect();
      rainSoundRef.current.nextGainNode?.disconnect();
    }
    await audioContextRef.current?.close();
    
    try {
      // First reinitialize the database and load tracks
      await audioCache.init();
      const tracks = await loadTracks();
      
      // Create new Audio Context
      const ctx = new AudioContext();
      audioContextRef.current = ctx;
      
      // Initialize both audio sources
      const brownNoiseSource = await initializeAudioSource(
        ctx,
        tracks.brownNoise[brownNoiseState.currentTrackIndex],
        brownNoiseState.volume
      );
      
      const rainSource = await initializeAudioSource(
        ctx,
        tracks.rain[rainState.currentTrackIndex],
        rainState.volume
      );

      brownNoiseRef.current = brownNoiseSource;
      rainSoundRef.current = rainSource;
      setIsInitialized(true);
      setError(null);
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

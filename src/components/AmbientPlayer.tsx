import React, { useState, useEffect, useRef, useCallback } from 'react';
import { PlayCircle, PauseCircle, Volume2, Shuffle } from 'lucide-react';
import { Card, CardContent } from './ui/card';
import { Button } from './ui/button';
import { Separator } from './ui/separator';

// Initial sound files
const INITIAL_BROWN_NOISE_SOUNDS = [
  '/sounds/Brown Noise Stream/A Dreaming Machine - Lush Brown Noise.mp3',
  '/sounds/Brown Noise Stream/Ambient Network - Digital Brown.mp3',
  '/sounds/Brown Noise Stream/Brainbox - Deep Brown Noise.mp3',
  '/sounds/Brown Noise Stream/Brown Noise Studio - Brown Noise Sleep Frequencies.mp3',
  '/sounds/Brown Noise Stream/Granular - Brown Noise REM.mp3',
  '/sounds/Brown Noise Stream/Hum Humming - Brown Noise Stream.mp3',
  '/sounds/Brown Noise Stream/Institute of Noise - Brown Noise Low Pass 485Hz.mp3',
  '/sounds/Brown Noise Stream/Klangspiel - Brrrrrrown Noise.mp3',
  '/sounds/Brown Noise Stream/Mind & Ears - Deep relief brown noise.mp3',
  '/sounds/Brown Noise Stream/Sleepy Mind - Brown Noise Schlaflied.mp3',
  '/sounds/Brown Noise Stream/Sleepy Parents - Brown Noise Ocean.mp3',
  '/sounds/Brown Noise Stream/The BD Noise Maker - Focused By The Brown Noise.mp3',
  '/sounds/Brown Noise Stream/The Tone-Gens - Children\'s Brown Noise.mp3',
  '/sounds/Brown Noise Stream/ULXI - In Harmony with Brown Noise.mp3',
  '/sounds/Brown Noise Stream/Winding Down - Brown Noise Catnap.mp3'
];

const INITIAL_RAIN_SOUNDS = [
  '/sounds/Rain Makes Everything Better/Rainy Mood - Classic Thunderstorm.mp3',
  '/sounds/Rain Makes Everything Better/Rainy Mood - Big Ocean.mp3',
  '/sounds/Rain Makes Everything Better/Rainy Mood - Country Lane.mp3',
  '/sounds/Rain Makes Everything Better/Rainy Mood - City Street.mp3',
  '/sounds/Rain Makes Everything Better/Rainy Mood - Bird Sanctuary.mp3',
  '/sounds/Rain Makes Everything Better/Rainy Mood - Beach Drizzle.mp3',
  '/sounds/Rain Makes Everything Better/Rainy Mood - Gentle Rain.mp3'
];

// Crossfade duration in seconds
const CROSSFADE_DURATION = 2;

const calmingPhrases = [
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
}

const AmbientPlayer = () => {
  const [brownNoiseActive, setBrownNoiseActive] = useState(false);
  const [rainActive, setRainActive] = useState(false);
  const [brownNoiseVolume, setBrownNoiseVolume] = useState(50);
  const [rainVolume, setRainVolume] = useState(50);
  const [currentPhrase, setCurrentPhrase] = useState('');
  const [currentRainIndex, setCurrentRainIndex] = useState(0);
  const [currentBrownNoiseIndex, setCurrentBrownNoiseIndex] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [isShuffling, setIsShuffling] = useState(false);
  const [brownNoiseSounds, setBrownNoiseSounds] = useState([...INITIAL_BROWN_NOISE_SOUNDS]);
  const [rainSounds, setRainSounds] = useState([...INITIAL_RAIN_SOUNDS]);

  const audioContextRef = useRef<AudioContext>();
  const brownNoiseRef = useRef<AudioSource>();
  const rainSoundRef = useRef<AudioSource>();
  
  const initializeAudioSource = useCallback(async (
    context: AudioContext,
    audioPath: string,
    volume: number
  ): Promise<AudioSource> => {
    const audio = new Audio(audioPath);
    audio.loop = true; // Fix 1: Ensure loop is set to true
    await audio.load(); // Ensure audio is properly loaded
    
    const source = context.createMediaElementSource(audio);
    const gainNode = context.createGain();
    gainNode.gain.value = volume / 100;
    source.connect(gainNode);
    gainNode.connect(context.destination);

    // Initialize next audio
    const nextAudio = new Audio(audioPath);
    nextAudio.loop = true;
    await nextAudio.load();
    const nextSource = context.createMediaElementSource(nextAudio);
    const nextGainNode = context.createGain();
    nextGainNode.gain.value = 0;
    nextSource.connect(nextGainNode);
    nextGainNode.connect(context.destination);

    return {
      audio,
      gainNode,
      nextAudio,
      nextGainNode
    };
  }, []);

  // Initialize Web Audio API
  useEffect(() => {
    let mounted = true;

    const initAudio = async () => {
      try {
        if (!mounted) return;

        // Create Audio Context
        const ctx = new AudioContext();
        audioContextRef.current = ctx;
        
        // Initialize both audio sources
        const brownNoise = await initializeAudioSource(
          ctx,
          brownNoiseSounds[currentBrownNoiseIndex],
          brownNoiseVolume
        );
        
        const rain = await initializeAudioSource(
          ctx,
          rainSounds[currentRainIndex],
          rainVolume
        );

        if (!mounted) {
          // Clean up if component unmounted during initialization
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
        if (mounted) {
          setError('Failed to initialize audio. Please try again.');
        }
      }
    };

    initAudio();

    return () => {
      mounted = false;
      // Improved cleanup
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
      audioContextRef.current?.close();
    };
  }, [brownNoiseSounds, rainSounds, currentBrownNoiseIndex, currentRainIndex, initializeAudioSource]);

  // Handle rotating phrases
  useEffect(() => {
    const randomPhrase = () => {
      const index = Math.floor(Math.random() * calmingPhrases.length);
      setCurrentPhrase(calmingPhrases[index]);
    };
    randomPhrase();
    const interval = setInterval(randomPhrase, 10000);
    return () => clearInterval(interval);
  }, []);

  // Fix 3: Improved volume handling
  useEffect(() => {
    if (!brownNoiseRef.current || !audioContextRef.current) return;
    
    const currentTime = audioContextRef.current.currentTime;
    brownNoiseRef.current.gainNode.gain.cancelScheduledValues(currentTime);
    brownNoiseRef.current.gainNode.gain.setValueAtTime(brownNoiseVolume / 100, currentTime);
  }, [brownNoiseVolume]);

  useEffect(() => {
    if (!rainSoundRef.current || !audioContextRef.current) return;
    
    const currentTime = audioContextRef.current.currentTime;
    rainSoundRef.current.gainNode.gain.cancelScheduledValues(currentTime);
    rainSoundRef.current.gainNode.gain.setValueAtTime(rainVolume / 100, currentTime);
  }, [rainVolume]);

  // Fix 2: Improved crossfade implementation
  const crossfade = useCallback(async (
    source: AudioSource,
    nextTrackPath: string,
    volume: number
  ): Promise<AudioSource> => {
    if (!audioContextRef.current) return source;

    const currentTime = audioContextRef.current.currentTime;
    
    // Prepare next audio before starting crossfade
    source.nextAudio!.src = nextTrackPath;
    await source.nextAudio!.load();
    
    // Start next track slightly before fade to ensure smooth transition
    await source.nextAudio!.play();
    
    // Crossfade implementation
    source.gainNode.gain.linearRampToValueAtTime(0, currentTime + CROSSFADE_DURATION);
    source.nextGainNode!.gain.setValueAtTime(0, currentTime);
    source.nextGainNode!.gain.linearRampToValueAtTime(
      volume / 100,
      currentTime + CROSSFADE_DURATION
    );

    // Create new "next" audio for future crossfade
    const newNextAudio = new Audio();
    newNextAudio.loop = true;
    const newNextSource = audioContextRef.current.createMediaElementSource(newNextAudio);
    const newNextGain = audioContextRef.current.createGain();
    newNextGain.gain.value = 0;
    newNextSource.connect(newNextGain);
    newNextGain.connect(audioContextRef.current.destination);

    // Return new audio source configuration
    return {
      audio: source.nextAudio!,
      gainNode: source.nextGainNode!,
      nextAudio: newNextAudio,
      nextGainNode: newNextGain
    };
  }, []);

  const shuffleArray = (array: string[]) => {
    const newArray = [...array];
    for (let i = newArray.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [newArray[i], newArray[j]] = [newArray[j], newArray[i]];
    }
    return newArray;
  };

  const crossfadeToNextBrownNoise = useCallback(async () => {
    if (!brownNoiseRef.current) return;
    const nextIndex = (currentBrownNoiseIndex + 1) % brownNoiseSounds.length;
    const newSource = await crossfade(
      brownNoiseRef.current,
      brownNoiseSounds[nextIndex],
      brownNoiseVolume
    );
    brownNoiseRef.current = newSource;
    setCurrentBrownNoiseIndex(nextIndex);
  }, [brownNoiseSounds, currentBrownNoiseIndex, brownNoiseVolume, crossfade]);

  const crossfadeToNext = useCallback(async () => {
    if (!rainSoundRef.current) return;
    const nextIndex = (currentRainIndex + 1) % rainSounds.length;
    const newSource = await crossfade(
      rainSoundRef.current,
      rainSounds[nextIndex],
      rainVolume
    );
    rainSoundRef.current = newSource;
    setCurrentRainIndex(nextIndex);
  }, [rainSounds, currentRainIndex, rainVolume, crossfade]);

  const shuffleTracks = useCallback(async () => {
    try {
      setIsShuffling(true);

      // Create new shuffled arrays
      const shuffledBrownNoise = shuffleArray(brownNoiseSounds);
      const shuffledRain = shuffleArray(rainSounds);

      // Pause current tracks before updating arrays
      if (brownNoiseActive && brownNoiseRef.current) {
        await brownNoiseRef.current.audio.pause();
        if (brownNoiseRef.current.nextAudio) {
          await brownNoiseRef.current.nextAudio.pause();
        }
      }
      
      if (rainActive && rainSoundRef.current) {
        await rainSoundRef.current.audio.pause();
        if (rainSoundRef.current.nextAudio) {
          await rainSoundRef.current.nextAudio.pause();
        }
      }

      // Update the state with shuffled arrays
      setBrownNoiseSounds(shuffledBrownNoise);
      setRainSounds(shuffledRain);
      
      // Reset indices
      setCurrentBrownNoiseIndex(0);
      setCurrentRainIndex(0);

      // Wait a brief moment for state updates to settle
      await new Promise(resolve => setTimeout(resolve, 100));

      // Resume playback with new tracks if they were active
      if (brownNoiseActive && brownNoiseRef.current) {
        brownNoiseRef.current.audio.src = shuffledBrownNoise[0];
        await brownNoiseRef.current.audio.load();
        brownNoiseRef.current.gainNode.gain.setValueAtTime(brownNoiseVolume / 100, audioContextRef.current?.currentTime || 0);
        await brownNoiseRef.current.audio.play();
      }

      if (rainActive && rainSoundRef.current) {
        rainSoundRef.current.audio.src = shuffledRain[0];
        await rainSoundRef.current.audio.load();
        rainSoundRef.current.gainNode.gain.setValueAtTime(rainVolume / 100, audioContextRef.current?.currentTime || 0);
        await rainSoundRef.current.audio.play();
      }

      // Reset shuffle state after a short delay
      setTimeout(() => setIsShuffling(false), 1000);
    } catch (err) {
      console.error('Failed to shuffle tracks:', err);
      setError('Failed to shuffle tracks. Please try again.');
      setIsShuffling(false);
    }
  }, [brownNoiseSounds, rainSounds, brownNoiseActive, rainActive, brownNoiseRef, rainSoundRef, brownNoiseVolume, rainVolume]);

  const toggleBrownNoise = async () => {
    if (!audioContextRef.current || !brownNoiseRef.current) return;
    
    try {
      if (audioContextRef.current.state === 'suspended') {
        await audioContextRef.current.resume();
      }

      const newState = !brownNoiseActive;
      if (newState) {
        brownNoiseRef.current.gainNode.gain.value = brownNoiseVolume / 100;
        await brownNoiseRef.current.audio.play();
      } else {
        await brownNoiseRef.current.audio.pause();
        if (brownNoiseRef.current.nextAudio) {
          await brownNoiseRef.current.nextAudio.pause();
        }
      }
      setBrownNoiseActive(newState);
      setError(null);
    } catch (err) {
      console.error('Failed to toggle brown noise:', err);
      setError('Failed to play audio. Please try again.');
    }
  };


  // Handle track ending
  useEffect(() => {
    if (!rainSoundRef.current?.audio) return;
    
    const handleRainEnded = () => {
      if (rainActive) {
        crossfadeToNext();
      }
    };

    rainSoundRef.current.audio.addEventListener('ended', handleRainEnded);
    return () => rainSoundRef.current?.audio.removeEventListener('ended', handleRainEnded);
  }, [rainActive, crossfadeToNext]);

  useEffect(() => {
    if (!brownNoiseRef.current?.audio) return;
    
    const handleBrownNoiseEnded = () => {
      if (brownNoiseActive) {
        crossfadeToNextBrownNoise();
      }
    };

    brownNoiseRef.current.audio.addEventListener('ended', handleBrownNoiseEnded);
    return () => brownNoiseRef.current?.audio.removeEventListener('ended', handleBrownNoiseEnded);
  }, [brownNoiseActive, crossfadeToNextBrownNoise]);

  const toggleRain = async () => {
    if (!audioContextRef.current || !rainSoundRef.current) return;
    
    try {
      if (audioContextRef.current.state === 'suspended') {
        await audioContextRef.current.resume();
      }

      const newState = !rainActive;
      if (newState) {
        rainSoundRef.current.gainNode.gain.value = rainVolume / 100;
        await rainSoundRef.current.audio.play();
      } else {
        await rainSoundRef.current.audio.pause();
        if (rainSoundRef.current.nextAudio) {
          await rainSoundRef.current.nextAudio.pause();
        }
      }
      setRainActive(newState);
      setError(null);
    } catch (err) {
      console.error('Failed to toggle rain sound:', err);
      setError('Failed to play audio. Please try again.');
    }
  };

  const retryInitialization = async () => {
    setError(null);
    // Cleanup existing audio context and sources
    if (brownNoiseRef.current && brownNoiseActive) {
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
      // Create new Audio Context
      const ctx = new AudioContext();
      audioContextRef.current = ctx;
      
      // Initialize both audio sources
      const brownNoise = await initializeAudioSource(
        ctx,
        brownNoiseSounds[currentBrownNoiseIndex],
        brownNoiseVolume
      );
      
      const rain = await initializeAudioSource(
        ctx,
        rainSounds[currentRainIndex],
        rainVolume
      );

      brownNoiseRef.current = brownNoise;
      rainSoundRef.current = rain;
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
                  {brownNoiseActive ? (
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
                    value={brownNoiseVolume}
                    onChange={(e) => setBrownNoiseVolume(Number(e.target.value))}
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
                  {rainActive ? (
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
                    value={rainVolume}
                    onChange={(e) => setRainVolume(Number(e.target.value))}
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

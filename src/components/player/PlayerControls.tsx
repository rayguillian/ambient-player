/**
 * PlayerControls - Component for audio player controls
 */

import React from 'react';
import { PlayCircle, PauseCircle, Volume2, Shuffle } from 'lucide-react';
import { Button } from '../ui/button';
import { Separator } from '../ui/separator';
import { AudioState } from '../../types/audio';

interface PlayerControlsProps {
  brownNoiseState: AudioState;
  rainState: AudioState;
  isShuffling: boolean;
  onToggleBrownNoise: () => void;
  onToggleRain: () => void;
  onBrownNoiseVolumeChange: (volume: number) => void;
  onRainVolumeChange: (volume: number) => void;
  onShuffle: () => void;
  isLoading?: boolean;
}

export const PlayerControls: React.FC<PlayerControlsProps> = ({
  brownNoiseState,
  rainState,
  isShuffling,
  onToggleBrownNoise,
  onToggleRain,
  onBrownNoiseVolumeChange,
  onRainVolumeChange,
  onShuffle,
  isLoading = false
}) => {
  return (
    <div className="space-y-8">
      {/* Brown Noise Control */}
      <div className="group">
        <div className="space-y-2">
          <Button
            variant="ghost"
            className="w-full h-24 border border-white/10 hover:border-white/20 bg-black hover:bg-black/90 transition-all duration-300"
            onClick={onToggleBrownNoise}
            disabled={isLoading}
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
              onChange={(e) => onBrownNoiseVolumeChange(Number(e.target.value))}
              className="w-full h-1 bg-white/10 rounded-lg appearance-none cursor-pointer [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-3 [&::-webkit-slider-thumb]:h-3 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-white/80"
              disabled={isLoading}
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
            onClick={onToggleRain}
            disabled={isLoading}
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
              onChange={(e) => onRainVolumeChange(Number(e.target.value))}
              className="w-full h-1 bg-white/10 rounded-lg appearance-none cursor-pointer [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-3 [&::-webkit-slider-thumb]:h-3 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-white/80"
              disabled={isLoading}
            />
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
          onClick={onShuffle}
          disabled={isLoading}
        >
          <Shuffle className="w-4 h-4 mr-2" />
          <span className="font-light tracking-wider text-xs uppercase">
            Shuffle Both
          </span>
        </Button>
      </div>
    </div>
  );
};

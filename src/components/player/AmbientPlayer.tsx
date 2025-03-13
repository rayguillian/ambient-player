/**
 * AmbientPlayer - Main component for the ambient sound player
 */

import React, { useState } from 'react';
import { Card, CardContent } from '../ui/card';
import { PlayerHeader } from './PlayerHeader';
import { PlayerControls } from './PlayerControls';
import { PlayerFooter } from './PlayerFooter';
import { ErrorDisplay } from './ErrorDisplay';
import { LoadingIndicator } from './LoadingIndicator';
import { useAudioPlayer } from '../../hooks/useAudioPlayer';

export const AmbientPlayer: React.FC = () => {
  const {
    brownNoise,
    rain,
    isInitialized,
    error,
    isLoading,
    toggleBrownNoise,
    toggleRain,
    setBrownNoiseVolume,
    setRainVolume,
    shuffleTracks,
    retryInitialization
  } = useAudioPlayer();
  
  const [isShuffling, setIsShuffling] = useState(false);
  
  // Handle shuffle
  const handleShuffle = async () => {
    setIsShuffling(true);
    await shuffleTracks();
    setTimeout(() => setIsShuffling(false), 1000);
  };
  
  // If there's an error, show error display
  if (error) {
    return <ErrorDisplay error={error} onRetry={retryInitialization} />;
  }
  
  return (
    <div className="min-h-screen bg-black p-4 flex flex-col items-center justify-center">
      <Card className="w-full max-w-md bg-black border-white/20">
        <CardContent className="p-8">
          {/* Loading indicator */}
          {isLoading && (
            <div className="absolute inset-0 flex items-center justify-center bg-black/50 z-10">
              <LoadingIndicator />
            </div>
          )}
          
          {/* Header with calming phrase */}
          <PlayerHeader />
          
          {/* Player controls */}
          <PlayerControls
            brownNoiseState={brownNoise}
            rainState={rain}
            isShuffling={isShuffling}
            onToggleBrownNoise={toggleBrownNoise}
            onToggleRain={toggleRain}
            onBrownNoiseVolumeChange={setBrownNoiseVolume}
            onRainVolumeChange={setRainVolume}
            onShuffle={handleShuffle}
            isLoading={isLoading}
          />
          
          {/* Footer */}
          <PlayerFooter />
        </CardContent>
      </Card>
    </div>
  );
};

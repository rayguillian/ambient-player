/**
 * ErrorDisplay - Component for displaying errors
 */

import React from 'react';
import { Button } from '../ui/button';

interface ErrorDisplayProps {
  error: string;
  onRetry: () => void;
}

export const ErrorDisplay: React.FC<ErrorDisplayProps> = ({ error, onRetry }) => {
  return (
    <div className="min-h-screen bg-black p-4 flex flex-col items-center justify-center space-y-4">
      <p className="text-red-500 text-sm mb-2">{error}</p>
      <Button 
        onClick={onRetry}
        className="bg-white/10 hover:bg-white/20 text-white/80"
      >
        Try Again
      </Button>
    </div>
  );
};

/**
 * LoadingIndicator - Component for displaying loading state
 */

import React from 'react';

interface LoadingIndicatorProps {
  className?: string;
}

export const LoadingIndicator: React.FC<LoadingIndicatorProps> = ({ className = '' }) => {
  return (
    <div className={`flex justify-center items-center ${className}`}>
      <div className="animate-spin rounded-full h-5 w-5 border-t-2 border-b-2 border-white/60"></div>
    </div>
  );
};

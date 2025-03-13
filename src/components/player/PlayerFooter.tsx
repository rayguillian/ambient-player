/**
 * PlayerFooter - Component for displaying footer text
 */

import React from 'react';

interface PlayerFooterProps {
  className?: string;
}

export const PlayerFooter: React.FC<PlayerFooterProps> = ({ className = '' }) => {
  return (
    <div className={`mt-6 text-center ${className}`}>
      <p className="text-white/40 font-light text-xs tracking-wider">
        find your peace
      </p>
    </div>
  );
};

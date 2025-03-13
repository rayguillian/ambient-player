/**
 * PlayerHeader - Component for displaying calming phrases
 */

import React, { useState, useEffect } from 'react';

// Calming phrases to display
const CALMING_PHRASES = [
  "breathe in the moment",
  "find your peace",
  "let thoughts float by",
  "embrace the silence",
  "be here now",
];

interface PlayerHeaderProps {
  className?: string;
}

export const PlayerHeader: React.FC<PlayerHeaderProps> = ({ className = '' }) => {
  const [currentPhrase, setCurrentPhrase] = useState('');
  
  // Rotate through calming phrases
  useEffect(() => {
    const randomPhrase = () => {
      const index = Math.floor(Math.random() * CALMING_PHRASES.length);
      setCurrentPhrase(CALMING_PHRASES[index]);
    };
    
    // Set initial phrase
    randomPhrase();
    
    // Change phrase every 10 seconds
    const interval = setInterval(randomPhrase, 10000);
    
    return () => clearInterval(interval);
  }, []);
  
  return (
    <div className={`text-center mb-8 ${className}`}>
      <p className="text-white/60 font-light tracking-widest text-sm uppercase">
        {currentPhrase}
      </p>
    </div>
  );
};

import React from 'react';
// Temporarily disabled AdSense imports to fix ref.js version error
// import { ADSENSE_CONFIG, AdFormat } from '../../config/adsense';

interface AdSenseProps {
  className?: string;
  slot: string;
  format?: string; // AdFormat;
  style?: React.CSSProperties;
  responsive?: boolean;
}

// Temporarily disabled global AdSense declaration
/*
declare global {
  interface Window {
    adsbygoogle: Array<Record<string, unknown>>;
  }
}
*/

const AdSense: React.FC<AdSenseProps> = () => {
  // Temporarily disabled AdSense to fix ref.js version error
  return null;
};

export default AdSense;
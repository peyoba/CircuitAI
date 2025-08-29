import React, { useEffect } from 'react';
import { ADSENSE_CONFIG, AdFormat } from '../../config/adsense';

interface AdSenseProps {
  className?: string;
  slot: string;
  format?: AdFormat;
  style?: React.CSSProperties;
  responsive?: boolean;
}

declare global {
  interface Window {
    adsbygoogle: Array<Record<string, unknown>>;
  }
}

const AdSense: React.FC<AdSenseProps> = ({
  className = '',
  slot,
  format = 'auto',
  style = { display: 'block' },
  responsive = true
}) => {
  useEffect(() => {
    try {
      // 确保adsbygoogle已加载
      if (typeof window !== 'undefined' && window.adsbygoogle) {
        window.adsbygoogle.push({});
      }
    } catch (error) {
      console.error('AdSense加载失败:', error);
    }
  }, []);

  return (
    <div className={`adsense-container ${className}`}>
      <ins
        className="adsbygoogle"
        style={style}
        data-ad-client={ADSENSE_CONFIG.PUBLISHER_ID}
        data-ad-slot={slot}
        data-ad-format={format}
        data-full-width-responsive={responsive ? 'true' : 'false'}
      />
    </div>
  );
};

export default AdSense;
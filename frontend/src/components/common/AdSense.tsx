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
    const isLocalhost = /^(localhost|127\.0\.0\.1|0\.0\.0\.0|::1)$/i.test(window.location.hostname)
    if (isLocalhost) return
    try {
      if (typeof window !== 'undefined' && Array.isArray(window.adsbygoogle)) {
        window.adsbygoogle.push({})
      }
    } catch (error) {
      // 在受限网络或被广告拦截时，静默失败
      console.warn('AdSense加载失败:', error)
    }
  }, [])

  const isLocalhost = typeof window !== 'undefined' && /^(localhost|127\.0\.0\.1|0\.0\.0\.0|::1)$/i.test(window.location.hostname)
  if (isLocalhost) {
    return null
  }

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
  )
};

export default AdSense;
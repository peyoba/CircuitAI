// AdSense 配置
export const ADSENSE_CONFIG = {
  // 发布商ID
  PUBLISHER_ID: 'ca-pub-6165370615688912',
  
  // 广告位槽位（实际部署时需要在Google AdSense中创建真实的槽位）
  SLOTS: {
    // 首页横幅广告
    HOME_BANNER: '1234567890',
    
    // 设计页面侧边栏广告
    DESIGN_SIDEBAR: '9876543210',
    
    // 页脚广告
    FOOTER_BANNER: '5555555555',
    
    // 响应式广告
    RESPONSIVE: 'auto'
  }
} as const

// 广告位配置
export const AD_FORMATS = {
  HORIZONTAL: 'horizontal',
  VERTICAL: 'vertical',
  RECTANGLE: 'rectangle',
  AUTO: 'auto'
} as const

export type AdFormat = typeof AD_FORMATS[keyof typeof AD_FORMATS]
export type AdSlot = typeof ADSENSE_CONFIG.SLOTS[keyof typeof ADSENSE_CONFIG.SLOTS]
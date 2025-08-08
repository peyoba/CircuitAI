// 通用工具函数

// 生成唯一ID
export const generateId = (): string => {
  return `${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
}

// 格式化日期
export const formatDate = (date: Date, format: 'short' | 'long' = 'short'): string => {
  const options: Intl.DateTimeFormatOptions = format === 'long' 
    ? { 
        year: 'numeric', 
        month: 'long', 
        day: 'numeric', 
        hour: '2-digit', 
        minute: '2-digit' 
      }
    : { 
        year: 'numeric', 
        month: '2-digit', 
        day: '2-digit' 
      }
  
  return new Intl.DateTimeFormat('zh-CN', options).format(date)
}

// 延迟函数
export const delay = (ms: number): Promise<void> => {
  return new Promise(resolve => setTimeout(resolve, ms))
}

// 防抖函数
export const debounce = <T extends (...args: any[]) => void>(
  func: T, 
  wait: number
): ((...args: Parameters<T>) => void) => {
  let timeout: NodeJS.Timeout | null = null
  
  return (...args: Parameters<T>) => {
    if (timeout) clearTimeout(timeout)
    timeout = setTimeout(() => func(...args), wait)
  }
}

// 节流函数
export const throttle = <T extends (...args: any[]) => void>(
  func: T, 
  limit: number
): ((...args: Parameters<T>) => void) => {
  let inThrottle: boolean = false
  
  return (...args: Parameters<T>) => {
    if (!inThrottle) {
      func(...args)
      inThrottle = true
      setTimeout(() => inThrottle = false, limit)
    }
  }
}

// 数值格式化
export const formatNumber = (num: number, decimals: number = 2): string => {
  return num.toFixed(decimals)
}

// 电阻值格式化
export const formatResistorValue = (ohms: number): string => {
  if (ohms >= 1e6) {
    return `${formatNumber(ohms / 1e6)}MΩ`
  } else if (ohms >= 1e3) {
    return `${formatNumber(ohms / 1e3)}kΩ`
  } else {
    return `${formatNumber(ohms)}Ω`
  }
}

// 电容值格式化
export const formatCapacitorValue = (farads: number): string => {
  if (farads >= 1e-3) {
    return `${formatNumber(farads * 1e3)}mF`
  } else if (farads >= 1e-6) {
    return `${formatNumber(farads * 1e6)}μF`
  } else if (farads >= 1e-9) {
    return `${formatNumber(farads * 1e9)}nF`
  } else {
    return `${formatNumber(farads * 1e12)}pF`
  }
}

// 电压值格式化
export const formatVoltage = (volts: number): string => {
  if (volts >= 1e3) {
    return `${formatNumber(volts / 1e3)}kV`
  } else if (volts >= 1) {
    return `${formatNumber(volts)}V`
  } else {
    return `${formatNumber(volts * 1e3)}mV`
  }
}

// 电流值格式化
export const formatCurrent = (amperes: number): string => {
  if (amperes >= 1) {
    return `${formatNumber(amperes)}A`
  } else if (amperes >= 1e-3) {
    return `${formatNumber(amperes * 1e3)}mA`
  } else {
    return `${formatNumber(amperes * 1e6)}μA`
  }
}

// 验证邮箱格式
export const isValidEmail = (email: string): boolean => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
  return emailRegex.test(email)
}

// 验证密码强度
export const isStrongPassword = (password: string): boolean => {
  // 至少8位，包含大小写字母、数字和特殊字符
  const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/
  return passwordRegex.test(password)
}
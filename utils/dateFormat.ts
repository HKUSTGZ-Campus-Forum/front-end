/**
 * 格式化日期为本地化字符串
 * @param dateString 日期字符串或日期对象
 * @param options 日期格式化选项
 * @returns 格式化后的日期字符串
 */
export function formatDate(
  dateString: string | Date,
  options: Intl.DateTimeFormatOptions = {
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  },
  locale?: string
): string {
  if (!dateString) return '';
  
  try {
    const date = typeof dateString === 'string' 
      ? new Date(dateString) 
      : dateString;
      
    // 检查日期是否有效
    if (isNaN(date.getTime())) {
      return 'Invalid date';
    }

    const resolvedLocale =
      locale ||
      (typeof navigator !== 'undefined' && navigator.language) ||
      'zh-CN';

    return date.toLocaleDateString(resolvedLocale, options);
  } catch (error) {
    console.error('日期格式化错误:', error);
    return 'Invalid date';
  }
}

/**
 * 格式化为相对时间（如：3分钟前，1小时前）
 * @param dateString 日期字符串或日期对象
 * @returns 相对时间字符串
 */
export function formatRelativeTime(dateString: string | Date, locale?: string): string {
  if (!dateString) return '';
  
  try {
    const date = typeof dateString === 'string' 
      ? new Date(dateString) 
      : dateString;
    
    // 检查日期是否有效
    if (isNaN(date.getTime())) {
      return 'Invalid date';
    }
    
    const now = new Date();
    const diffInSeconds = Math.floor((date.getTime() - now.getTime()) / 1000);
    const resolvedLocale =
      locale ||
      (typeof navigator !== 'undefined' && navigator.language) ||
      'zh-CN';
    const formatter = new Intl.RelativeTimeFormat(resolvedLocale, { numeric: 'auto' });

    if (Math.abs(diffInSeconds) < 60) {
      return formatter.format(Math.round(diffInSeconds), 'second');
    }

    if (Math.abs(diffInSeconds) < 3600) {
      return formatter.format(Math.round(diffInSeconds / 60), 'minute');
    }

    if (Math.abs(diffInSeconds) < 86400) {
      return formatter.format(Math.round(diffInSeconds / 3600), 'hour');
    }

    if (Math.abs(diffInSeconds) < 2592000) {
      return formatter.format(Math.round(diffInSeconds / 86400), 'day');
    }

    return formatDate(date, undefined, resolvedLocale);
  } catch (error) {
    console.error('相对时间格式化错误:', error);
    return 'Invalid date';
  }
}

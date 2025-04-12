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
  }
): string {
  if (!dateString) return '';
  
  try {
    const date = typeof dateString === 'string' 
      ? new Date(dateString) 
      : dateString;
      
    // 检查日期是否有效
    if (isNaN(date.getTime())) {
      return '无效日期';
    }
    
    return date.toLocaleDateString('zh-CN', options);
  } catch (error) {
    console.error('日期格式化错误:', error);
    return '无效日期';
  }
}

/**
 * 格式化为相对时间（如：3分钟前，1小时前）
 * @param dateString 日期字符串或日期对象
 * @returns 相对时间字符串
 */
export function formatRelativeTime(dateString: string | Date): string {
  if (!dateString) return '';
  
  try {
    const date = typeof dateString === 'string' 
      ? new Date(dateString) 
      : dateString;
    
    // 检查日期是否有效
    if (isNaN(date.getTime())) {
      return '无效日期';
    }
    
    const now = new Date();
    const diffInSeconds = Math.floor((now.getTime() - date.getTime()) / 1000);
    
    // 小于1分钟
    if (diffInSeconds < 60) {
      return '刚刚';
    }
    
    // 小于1小时
    if (diffInSeconds < 3600) {
      return `${Math.floor(diffInSeconds / 60)}分钟前`;
    }
    
    // 小于1天
    if (diffInSeconds < 86400) {
      return `${Math.floor(diffInSeconds / 3600)}小时前`;
    }
    
    // 小于30天
    if (diffInSeconds < 2592000) {
      return `${Math.floor(diffInSeconds / 86400)}天前`;
    }
    
    // 超过30天显示具体日期
    return formatDate(date);
  } catch (error) {
    console.error('相对时间格式化错误:', error);
    return '无效日期';
  }
}
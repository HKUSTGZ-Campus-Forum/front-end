export type RelativeTime =
  | "刚刚"
  | "几秒前"
  | "几分钟前"
  | "几小时前"
  | "昨天"
  | "前天"
  | "几天前"
  | "几周前"
  | "几个月前"
  | "几年前";

  export type Time = {
    relative: RelativeTime;     // 相对时间
    absolute: {
    //   timestamp: number;        // Unix时间戳
    //   formatted: string;        // 格式化的时间字符串，如："2024-03-12 14:30:00"
      date: string;            // 日期部分，如："2024-03-12"
      time: string;            // 时间部分，如："14:30:00"
    };
  };
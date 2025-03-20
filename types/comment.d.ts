export interface Comment {
  parent: Boolean;// 是否副评论 NONE
  content: string;
  NumberLikes: number;
  time: Time;
  emoji: Array<EmojiCount>; // ruturn most used emoji
  postID: number; // 可能打包在post里
}

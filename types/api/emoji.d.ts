export type EmojiList = {
  DisplayOrder: number;
  EmojiName: string;
  EmojiURL: string;
  // EmojiIsUserChoose: boolean; // 用户是否选择 改成是否NONE
};

export type EmojiCount = {
  EmojiName: string;
  EmojiURL: string;
  Count: number;
};
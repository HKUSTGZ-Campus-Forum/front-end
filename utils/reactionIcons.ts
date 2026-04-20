const unicodeEmojiPattern =
  /[\u{1F600}-\u{1F64F}]|[\u{1F300}-\u{1F5FF}]|[\u{1F680}-\u{1F6FF}]|[\u{1F1E0}-\u{1F1FF}]|[\u{2600}-\u{26FF}]|[\u{2700}-\u{27BF}]/u;

const reactionLabelMap: Record<string, string> = {
  "\u2764\ufe0f": "心动",
  "\ud83c\udf89": "庆祝",
  "\ud83d\ude28": "惊讶",
  "\ud83e\udd75": "火热",
  plus_one: "点赞",
  heart: "喜欢",
  party_popper: "庆祝",
  astonished_face: "惊讶",
  hot_face: "火热",
  thumbs_up: "赞同",
  thumbs_down: "不赞同",
  laugh: "好笑",
  cry: "难过",
  angry: "生气",
  surprise: "惊喜",
  love: "心动",
  clap: "鼓掌",
  fire: "火力全开",
  rocket: "起飞",
};

const reactionIconMap: Record<string, string> = {
  "\u2764\ufe0f": "fluent-emoji-flat:heart-on-fire",
  plus_one: "fluent-emoji-flat:face-with-tears-of-joy",
  "\ud83c\udf89": "fluent-emoji-flat:grinning-squinting-face",
  "\ud83d\ude28": "fluent-emoji-flat:astonished-face",
  "\ud83e\udd75": "fluent-emoji-flat:hot-face",
  heart: "fluent-emoji-flat:heart-on-fire",
  party_popper: "fluent-emoji-flat:grinning-squinting-face",
  astonished_face: "fluent-emoji-flat:astonished-face",
  hot_face: "fluent-emoji-flat:hot-face",
  thumbs_up: "fluent-emoji-flat:face-with-tears-of-joy",
};

export const getReactionLabel = (emojiCode?: string | null) => {
  if (!emojiCode) {
    return "表情";
  }

  if (unicodeEmojiPattern.test(emojiCode)) {
    return emojiCode;
  }

  return reactionLabelMap[emojiCode] || emojiCode;
};

export const getReactionIconifyName = (emojiCode?: string | null) => {
  if (!emojiCode) {
    return "fluent-emoji-flat:slightly-smiling-face";
  }

  if (reactionIconMap[emojiCode]) {
    return reactionIconMap[emojiCode];
  }

  return "fluent-emoji-flat:slightly-smiling-face";
};

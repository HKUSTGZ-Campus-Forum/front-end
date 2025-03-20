import { EmojiCount } from "../emoji";
import { Time } from "../time";
import type { Tag } from "./tags";

export interface PostsDataFront {
  NumberLikes: number;
  NumberComments: number;
  NumberClicks: number;
  background: string;
  title: string;
  time: Time;
  emoji: Array<EmojiCount>;// ruturn most used emoji
  tags: Tag[];
  postID: number;
  // WhetherClick: boolean;
}

export interface PostsDataInner {
  postID: number;
  title: string;
  NumberLikes: number;
  NumberComments: number;
  background: string;
  title: string;
  time: Time;
  tags: Tag[];
  emoji: Array<EmojiCount>;
  // IsDeleted // 200 400 500
  content: Content;
  comments: Array<Comment>;
}
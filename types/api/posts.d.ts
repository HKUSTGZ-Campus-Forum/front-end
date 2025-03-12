import { Time } from "./time";
import type { Tag } from "./tag";

export interface PostsDataFront {
  NumberLikes: number;
  NumberComments: number;
  NumberClicks: number;
  background: string;
  title: string;
  time: Time;
  emoji: string[];
  tags: Tag[];
}

import type { PluggableList } from "unified";
import remarkGfm from "remark-gfm";
import rehypeHighlight from "rehype-highlight";

const remarkPlugins = [remarkGfm];
const rehypePlugins = [rehypeHighlight];

export const markdownRemarkPlugins = remarkPlugins as PluggableList;

export const markdownRehypePlugins = rehypePlugins as PluggableList;

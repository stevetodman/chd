import type { Pluggable, PluggableList } from "unified";
import remarkGfm from "remark-gfm";
import rehypeHighlight from "rehype-highlight";

export const markdownRemarkPlugins: PluggableList = [remarkGfm as Pluggable];

export const markdownRehypePlugins: PluggableList = [rehypeHighlight as Pluggable];

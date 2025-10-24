import type { PluggableList } from 'unified';
import remarkGfm from 'remark-gfm';
import rehypeHighlight from 'rehype-highlight';

export const markdownRemarkPlugins: PluggableList = [remarkGfm];

export const markdownRehypePlugins: PluggableList = [rehypeHighlight];

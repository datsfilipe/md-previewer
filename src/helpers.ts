import fs from 'fs'
import path from 'path'
import { exec } from 'node:child_process'
import os from 'os'

import { unified } from 'unified'
import remarkParse from 'remark-parse'
import remarkMath from 'remark-math'
import remarkGfm from 'remark-gfm'
import remarkRehype from 'remark-rehype'
import rehypeSlug from 'rehype-slug'
import rehypeHighlight from 'rehype-highlight'
import rehypeAutolinkHeadings from 'rehype-autolink-headings'
import rehypeKatex from 'rehype-katex'
import rehypeStringify from 'rehype-stringify'
import { LRUCache } from './LRUCache'

export const getTMPDir = () => os.tmpdir()
export const getPlatform = () => os.platform()
export const getArch = () => os.arch()

export const getServerBinaryPath = () => {
  const platform = getPlatform()
  const arch = getArch()
  const binName = `md-previewer-server${platform === 'win32' ? '.exe' : ''}`
  const archSuffix = arch.startsWith('arm') ? '-arm' : ''
  return path.resolve(__dirname, `../bin/${binName}${archSuffix}`)
}

export const openWindow = (url: string) => {
  const cmd = getPlatform() === 'darwin' ? 'open' : getPlatform() === 'win32' ? 'start' : 'xdg-open'
  exec(`${cmd} ${url}`)
}

export const writeFile = (filePath: string, data: unknown) => {
	const dir = path.dirname(filePath)

	if (!fs.existsSync(dir)) {
		fs.mkdirSync(dir, { recursive: true })
	}

	const jsonObject = JSON.stringify(data, null, 2)
	const jsFileContents = `export default ${jsonObject}`
	fs.writeFileSync(filePath, jsFileContents, {
		encoding: 'utf8'
	})
}

const processor = unified()
  .use(remarkParse)
  .use(remarkGfm)
  .use(remarkMath)
  .use(remarkRehype)
  .use(rehypeSlug)
  .use(rehypeAutolinkHeadings, {
    behavior: 'wrap',
    properties: {
      className: ['anchor']
    }
  })
  .use(rehypeHighlight, {
    plainText: ['mermaid']
  })
  .use(rehypeKatex)
  .use(rehypeStringify)

export const parseMarkdownToHtml = async (markdown: string) => {
  const result = await processor.process(markdown);
  const html = result.value.toString();

  return html;
}

const markdownFilePath = fs.readFileSync(path.resolve(getTMPDir(), 'md-previewer-tmp/filePath.txt'), 'utf8')

export const correctImagePath = (relativeToMarkdownFilePath: string): string => {
  const absolutePath = path.join(markdownFilePath, relativeToMarkdownFilePath);
  return `/images${absolutePath}`;
};

export const correctImageSrc = (src: string) => {
  if (src.startsWith('http')) return src;
  return correctImagePath(src);
};

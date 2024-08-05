import fs from 'fs'
import path from 'path'
import { execSync } from 'child_process';
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

export const getTMPDir = () => {
  return process.env.TMPDIR || process.env.TMP || process.env.TEMP || '/tmp';
};

export const getPlatform = () => {
  return os.platform()
}

export const getArch = () => {
  return os.arch()
}

export const getServerBinaryPath = () => {
  const platform = getPlatform()
  const arch = getArch()
  if (platform === 'darwin') {
    if (arch.startsWith('arm')) {
      return path.resolve(__dirname, './bin/md-previewer-server-mac-arm')
    } else {
      return path.resolve(__dirname, './bin/md-previewer-server-mac')
    }
  } else if (platform.startsWith('win')) {
    return path.resolve(__dirname, './bin/md-previewer-server-win.exe')
  } else {
    if (arch.startsWith('arm')) {
      return path.resolve(__dirname, './bin/md-previewer-server-arm')
    } else {
      return path.resolve(__dirname, './bin/md-previewer-server')
    }
  }
}

export const openWindow = (url: string) => {
  const platform = getPlatform()
  if (platform === 'darwin') {
    execSync(`open ${url}`)
  } else if (platform === 'win32') {
    execSync(`start ${url}`)
  } else {
    execSync(`xdg-open ${url}`)
  }
}

export const readMarkdownFiles = (dir: string): string[] => {
	const files = []
	const items = fs.readdirSync(dir)

	for (const item of items) {
		const itemPath = path.join(dir, item)
		const stats = fs.statSync(itemPath)

		if (stats.isDirectory()) {
			files.push(...readMarkdownFiles(itemPath))
		} else if (item.endsWith('.md')) {
			files.push(itemPath)
		}
	}

	return files
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

export const parseMarkdownToHtml = async (markdown: string) => {
	const result = await unified()
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
		.process(markdown)

	return result.value.toString()
}

export const scriptForWebSocket = `
  function reloadPage() {
    location.reload();
  }

  document.addEventListener('DOMContentLoaded', function() {
    const socket = new WebSocket('ws://localhost:8080');
    socket.onmessage = function(event) {
      if (event.data === 'reload') {
        reloadPage();
      }
    };
  });
`;

export const injectScriptIntoHtml = (html: string, script: string) => html.replace('</body>', `<script>${script}</script></body>`)
const markdownFilePath = fs.readFileSync(path.resolve(getTMPDir(), 'md-previewer-tmp/filePath.txt'), 'utf8')

export const correctImagePath = (relativeToMarkdownFilePath: string): string => {
  const absolutePath = path.join(markdownFilePath, relativeToMarkdownFilePath);
  return `/images${absolutePath}`;
};

export const correctImageSrc = (src: string) => {
  if (src.startsWith('http')) return src;
  return correctImagePath(src);
};

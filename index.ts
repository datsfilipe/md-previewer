import fs from 'node:fs'
import path from 'node:path'
import child_process from 'node:child_process'

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

import chokidar from 'chokidar'

import { Color, print } from './term-colors'

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

enum Arguments {
  HELP = 'help',
  FILE = 'file',
  QUIET = 'quiet',
}

const getArgs = (args: string[]) => {
  const argMap = new Map<Arguments, string>()

  for (const arg of args) {
    const argName = arg.replace(/^--/, '').split('=')[0]
    const argValue = arg.split('=')[1]
    const validArguments = [Arguments.HELP, Arguments.FILE, Arguments.QUIET]

    if (!validArguments.includes(argName as Arguments)) continue

    argMap.set(argName as Arguments, argValue ?? null)
  }

  return argMap
}

type MapItem<T> = [T, string]

const validateArg = (argItem: MapItem<Arguments>) => {
  const [argName, argValue] = argItem

  if (argName === Arguments.HELP) return
  if (argName === Arguments.FILE) {
    const filePath = path.resolve(argValue)
    if (fs.existsSync(filePath)) return
    console.error(`File not found: ${filePath}`)
    process.exit(1)
  }
}

const args = getArgs(process.argv)
args.forEach((value, key) => {
  validateArg([key, value])
})

if (args.size > 1 && args.has(Arguments.HELP)) {
  console.error('Invalid arguments')
  process.exit(1)
}

if (args.has(Arguments.HELP)) {
  print.text('Usage: md-previewer --file=path/to/file.md', Color.Blue)
  print.blankLine()
  print.text('Flags:', Color.Blue)
  print.blankLine()
  print.block('--help', 'Show this help message', Color.Magenta)
  print.block('--file', 'Path to the markdown file to preview', Color.Blue)
  process.exit(0)
}

const isQuiet = args.has(Arguments.QUIET)

const execute = async () => {
  const filePath = path.resolve(args.get(Arguments.FILE) as string)
  
  if (args.has(Arguments.FILE)) {
    if (fs.existsSync(filePath)) {
      const html = await parseMarkdownToHtml(fs.readFileSync(filePath, 'utf8'))
      fs.mkdirSync('/tmp/md-previewer-tmp', { recursive: true })
      fs.writeFileSync('/tmp/md-previewer-tmp/index.html', html)
    } else {
      console.error(`File not found: ${filePath}`)
      process.exit(1)
    }
  } else {
    if (!isQuiet) print.text('[PREVIEWER] No file specified', Color.Blue)
    process.exit(1)
  }
}

let isExecuting = false;
const handleFileChange = async (path: string) => {
  if (!isQuiet) print.text(`[PREVIEWER] Change detected on ${path}`, Color.Blue);

  if (isExecuting) {
    if (!isQuiet) print.text('[PREVIEWER] Skipping file change, already executing...', Color.Blue);
    return;
  }

  isExecuting = true;
  try {
    if (!isQuiet) print.text('[PREVIEWER] File changed, updating preview...', Color.Blue);
    await execute();
  } finally {
    isExecuting = false;
  }
};

await execute();
const serverBinaryName = process.platform === 'win32' ? 'md-previewer-server.exe' : 'md-previewer-server'
const serverBinaryPath = path.join(__dirname, 'bin', serverBinaryName)

let serverProcess;
if (fs.existsSync(serverBinaryPath)) {
  serverProcess = child_process.spawn(serverBinaryPath, isQuiet ? ['--quiet'] : [], { stdio: 'inherit' })
} else {
  const serverPath = path.join(__dirname, 'server.ts')
  serverProcess = child_process.spawn('bun', ['run', serverPath, isQuiet ? '--quiet' : ''], { stdio: 'inherit' })
}

let watcher: chokidar.FSWatcher
const filePath = path.resolve(args.get(Arguments.FILE) as string);
const dirPath = path.dirname(filePath);
watcher = chokidar.watch(dirPath, { persistent: true })

fs.writeFileSync('/tmp/md-previewer-tmp/filePath.txt', path.dirname(filePath))

watcher.on('change', handleFileChange)

process.on('SIGINT', () => {
  serverProcess.kill()
  watcher.close()
  process.exit(0)
})

import fs from 'node:fs'
import path from 'node:path'
import child_process from 'node:child_process'

import { getServerBinaryPath, getTMPDir, parseMarkdownToHtml } from './helpers'

import { Color, print } from './term-colors'

const tmpDir = getTMPDir()

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
      fs.mkdirSync(`${tmpDir}/md-previewer-tmp`, { recursive: true })
      fs.writeFileSync(`${tmpDir}/md-previewer-tmp/index.html`, html)
    } else {
      console.error(`File not found: ${filePath}`)
      process.exit(1)
    }
  } else {
    if (!isQuiet) print.text('[PREVIEWER] No file specified', Color.Blue)
    process.exit(1)
  }
}

await execute();
const serverBinaryPath = getServerBinaryPath()

let serverProcess;
const isDev = process.env.DEV_MODE === 'true'

if (!isDev) {
  serverProcess = child_process.spawn(serverBinaryPath, isQuiet ? ['--quiet'] : [], { stdio: 'inherit' })
} else {
  const serverPath = path.join(__dirname, 'server.ts')
  serverProcess = child_process.spawn('bun', ['run', serverPath, isQuiet ? '--quiet' : ''], { stdio: 'inherit' })
}

const filePath = path.resolve(args.get(Arguments.FILE) as string);
const dirPath = path.dirname(filePath);

const watcher = fs.watch(dirPath, { persistent: true })
fs.writeFileSync(`${tmpDir}/md-previewer-tmp/filePath.txt`, path.dirname(filePath))

const debounce = (func: Function, delay: number) => {
  let timer: Timer | null = null;
  return (...args: any[]) => {
    if (timer) clearTimeout(timer);
    timer = setTimeout(() => {
      func(...args);
    }, delay);
  };
};

const debouncedHandleFileChange = debounce(async (path: string) => {
  if (!isQuiet) print.text(`[PREVIEWER] Change detected on ${path}`, Color.Blue);
  try {
    if (!isQuiet) print.text('[PREVIEWER] File changed, updating preview...', Color.Blue);
    await execute();
  } catch (error) {
    console.error('[PREVIEWER] Error updating preview:', error);
  }
}, 500);

watcher.on('change', debouncedHandleFileChange);

process.on('SIGINT', () => {
  serverProcess.kill()
  watcher.close()
  process.exit(0)
})

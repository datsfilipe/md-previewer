import fs from 'node:fs'
import chokidar from 'chokidar'
import http from 'node:http'
import path from 'node:path'
import WebSocket from 'ws'
import os from 'node:os'
import { execSync } from 'node:child_process'

import { Color, print } from './term-colors'

const markdownFilePath = fs.readFileSync(path.resolve('/tmp/md-previewer-tmp/filePath.txt'), 'utf8')
const fileToWatch = path.resolve('/tmp/md-previewer-tmp/index.html')
const port = 8080

let isQuiet = false
process.argv.forEach(arg => {
  if (arg === '--quiet') {
    isQuiet = true
  }
})

const script = `
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

const injectScriptIntoHtml = (html: string, script: string) => html.replace('</body>', `<script>${script}</script></body>`)
const correctImagePath = (relativeToMarkdownFilePath: string) => {
  return ''
}
const correctImageSrc = (src: string) => {
  if (src.startsWith('http')) return src
  return correctImagePath(src)
}

const watcher = chokidar.watch(fileToWatch, { persistent: true });
const server = http.createServer((req, res) => {
  if (req.url === '/') {
    res.writeHead(200, { 'Content-Type': 'text/html' })
    const htmlContent = fs.readFileSync(fileToWatch, 'utf8')
    const htmlContentWithCorrectImageSrc = htmlContent.replace(/src="([^"]+)"/g, (_, src) => `src="${correctImageSrc(src)}"`)
    const finalHtml = injectScriptIntoHtml(`
      <!DOCTYPE html lang="en">
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <!-- katex -->
          <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/katex@0.16.11/dist/katex.min.css" integrity="sha384-nB0miv6/jRmo5UMMR1wu3Gz6NLsoTkbqJghGIsx//Rlm+ZU03BU6SQNC66uf4l5+" crossorigin="anonymous">
          <script defer src="https://cdn.jsdelivr.net/npm/katex@0.16.11/dist/katex.min.js" integrity="sha384-7zkQWkzuo3B5mTepMUcHkMB5jZaolc2xDwL6VFqjFALcbeS9Ggm/Yr2r3Dy4lfFg" crossorigin="anonymous"></script>
          <!-- code block -->
          <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/highlight.js/11.4.0/styles/github-dark.min.css">
          <script src="https://cdnjs.cloudflare.com/ajax/libs/highlight.js/11.4.0/highlight.min.js"></script>
          <script>hljs.highlightAll();</script>
        </head>
        <body>
          <style>
            code {
              background: none !important;
            }
          </style>
          <article class="markdown-body" style="max-width: 100%;">
            ${htmlContentWithCorrectImageSrc}
          </article>
          <script type="module">
            import mermaid from 'https://cdn.jsdelivr.net/npm/mermaid@10/dist/mermaid.esm.min.mjs';
            mermaid.initialize({ startOnLoad: false });
            await mermaid.run({
              querySelector: '.language-mermaid',
            });
          </script>
        </body>
      </html>
    `, script)

    res.end(finalHtml)
  }
})

const wss = new WebSocket.Server({ server });
wss.on('connection', (ws) => {
  watcher.on('change', () => {
    if (!isQuiet) print.text('[SERVER] Reloading page...', Color.Yellow)
    ws.send('reload');
  });
});

const openWindow = (url: string) => {
  const platform = os.platform()
  if (platform === 'darwin') {
    execSync(`open ${url}`)
  } else if (platform === 'win32') {
    execSync(`start ${url}`)
  } else {
    execSync(`xdg-open ${url}`)
  }
}

setTimeout(() => {
  if (!isQuiet) print.text(`Opening browser...`, Color.White)
  openWindow(`http://localhost:${port}`)
}, 500)

if (!isQuiet) print.text(`Server running at http://localhost:${port}`, Color.White)
server.listen(port)

import fs from 'node:fs'
import chokidar from 'chokidar'
import http from 'node:http'
import path from 'node:path'
import WebSocket from 'ws'
import os from 'node:os'
import { execSync } from 'node:child_process'

import { Color, print } from './term-colors'

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

const watcher = chokidar.watch(fileToWatch, { persistent: true });
const server = http.createServer((req, res) => {
  if (req.url === '/') {
    res.writeHead(200, { 'Content-Type': 'text/html' })
    const htmlContent = fs.readFileSync(fileToWatch, 'utf8')
    const htmlWithScript = injectScriptIntoHtml(`<!DOCTYPE html><body>${htmlContent}</body></html>`, script)

    res.end(htmlWithScript)
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

import fs from 'node:fs'
import http from 'node:http'
import path from 'node:path'
import WebSocket from 'ws'

import { correctImageSrc, getTMPDir, openWindow } from './helpers'
import { Color, print } from './print'

const port = 8080
const tmpDir = getTMPDir()
const fileToWatch = path.resolve(tmpDir, 'md-previewer-tmp/index.html')

let isQuiet = false
process.argv.forEach(arg => {
  if (arg === '--quiet') {
    isQuiet = true
  }
})

const serveFile = (res: http.ServerResponse, filePath: string, contentType: string) => {
  fs.readFile(filePath, (err, content) => {
    if (err) {
      res.writeHead(err.code === 'ENOENT' ? 404 : 500);
      res.end(err.code === 'ENOENT' ? 'File not found' : 'Server error');
    } else {
      res.writeHead(200, { 'Content-Type': contentType });
      res.end(content);
    }
  });
};

const watcher = fs.watch(fileToWatch, { persistent: true });

const server = http.createServer((req, res) => {
  if (req.url === '/') {
    res.writeHead(200, { 'Content-Type': 'text/html' })
    const clientJsContent = fs.readFileSync(path.resolve(__dirname, './scripts/client.js'), 'utf8')
    const stylesContent = fs.readFileSync(path.resolve(__dirname, './styles/styles.css'), 'utf8')
    const htmlContent = fs.readFileSync(fileToWatch, 'utf8')
    const htmlContentWithCorrectImageSrc = htmlContent.replace(/src="([^"]+)"/g, (_, src) => `src="${correctImageSrc(src)}"`)
    res.end(`
      <!DOCTYPE html lang="en">
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
        </head>
        <body>
          <style>
            code {
              background: none !important;
            }
            ${stylesContent}
          </style>
          <article class="markdown-body" style="max-width: 100%;">
            ${htmlContentWithCorrectImageSrc}
          </article>
          <script type="module">
            ${clientJsContent}
          </script>
        </body>
      </html>
    `);
  } else if (req.url?.startsWith('/images/')) {
    const imagePath = req.url.slice(7);
    const ext = path.extname(imagePath).toLowerCase();
    let contentType = 'application/octet-stream';
    
    if (ext === '.png') contentType = 'image/png';
    else if (ext === '.jpg' || ext === '.jpeg') contentType = 'image/jpeg';
    else if (ext === '.gif') contentType = 'image/gif';
    
    serveFile(res, imagePath, contentType);
  } else {
    res.writeHead(404);
    res.end('Not found');
  }
})

const wss = new WebSocket.Server({ server });
watcher.on('change', () => {
  if (!isQuiet) print.text('[SERVER] File changed, notifying clients...', Color.Yellow)
  wss.clients.forEach((client) => {
    if (client.readyState === WebSocket.OPEN) {
      client.send('reload');
    }
  });
});

wss.on('connection', () => {
  if (!isQuiet) print.text('[SERVER] New WebSocket connection', Color.Green);
});

setTimeout(() => {
  if (!isQuiet) print.text(`Opening browser...`, Color.White)
  openWindow(`http://localhost:${port}`)
}, 500)

if (!isQuiet) print.text(`Server running at http://localhost:${port}`, Color.White)
server.listen(port)

document.addEventListener('DOMContentLoaded', function() {
  const socket = new WebSocket('ws://localhost:8081');
  socket.onmessage = function(event) {
    if (event.data.trim() === 'reload') {
      reloadPage();
    }
  };
});

if (document.querySelector('.math')) {
  const link = document.createElement('link');
  link.rel = 'stylesheet';
  link.href = 'https://cdn.jsdelivr.net/npm/katex@0.16.11/dist/katex.min.css';
  document.head.appendChild(link);

  const script = document.createElement('script');
  script.src = 'https://cdn.jsdelivr.net/npm/katex@0.16.11/dist/katex.min.js';
  script.onload = function() {
    document.querySelectorAll('.math').forEach(el => {
      katex.render(el.textContent, el, { throwOnError: false });
    });
  };
  document.head.appendChild(script);
}

if (document.querySelector('.language-mermaid')) {
  const script = document.createElement('script');
  script.src = 'https://cdn.jsdelivr.net/npm/mermaid@10/dist/mermaid.min.js';
  script.onload = function() {
    mermaid.initialize({ startOnLoad: true });
  };
  document.head.appendChild(script);
}

if (document.querySelector('pre code')) {
  const link = document.createElement('link');
  link.rel = 'stylesheet';
  link.href = 'https://cdnjs.cloudflare.com/ajax/libs/highlight.js/11.4.0/styles/github-dark.min.css';
  document.head.appendChild(link);

  const script = document.createElement('script');
  script.src = 'https://cdnjs.cloudflare.com/ajax/libs/highlight.js/11.4.0/highlight.min.js';
  script.onload = function() {
    hljs.highlightAll();
  };
  document.head.appendChild(script);
}

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

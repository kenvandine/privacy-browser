const { ipcRenderer } = require('electron');
const goButton = document.getElementById('go');
const backButton = document.getElementById('back');
const forwardButton = document.getElementById('forward');
const refreshButton = document.getElementById('refresh');
const homeButton = document.getElementById('home');
const urlInput = document.getElementById('url');
const webviewContainer = document.getElementById('webview-container');
const downloadStatus = document.getElementById('download-status');

let currentWebview;
// Default Search is DuckDuckGo
const defaultSearchEngine = 'https://duckduckgo.com/?q=';

function isSearchQuery(url) {
  // Simple check to determine if the input is a search query (e.g., does not contain "http" or "https")
  return !url.startsWith('http') && !url.startsWith('https');
}

function loadURL(url) {
  if (url) {
    if (isSearchQuery(url)) {
      url = defaultSearchEngine + encodeURIComponent(url);
    }
    webviewContainer.innerHTML = ''; // Clear previous webview if any
    currentWebview = document.createElement('webview');
    currentWebview.src = url;
    currentWebview.style = "width:100%; height: 100%;";
    webviewContainer.appendChild(currentWebview);

    currentWebview.addEventListener('did-navigate', () => {
      urlInput.value = currentWebview.getURL();
    });

    currentWebview.addEventListener('did-navigate-in-page', () => {
      urlInput.value = currentWebview.getURL();
    });

    currentWebview.addEventListener('did-finish-load', () => {
      urlInput.value = currentWebview.getURL();
    });

    // Log all link clicks
    currentWebview.addEventListener('new-window', (event) => {
      console.log(`Link clicked: ${event.url}`);
    });
  }
}

urlInput.addEventListener('keydown', (event) => {
  if (event.key === 'Enter') {
    goButton.click();
  }
});

goButton.addEventListener('click', () => {
  const url = urlInput.value;
  loadURL(url);
});

backButton.addEventListener('click', () => {
  if (currentWebview) {
    currentWebview.goBack();
  }
});

forwardButton.addEventListener('click', () => {
  if (currentWebview) {
    currentWebview.goForward();
  }
});

refreshButton.addEventListener('click', () => {
  if (currentWebview) {
    currentWebview.reload();
  }
});

homeButton.addEventListener('click', () => {
  const homeURL = 'https://www.duckduckgo.com'; // Set your desired home URL
  urlInput.value = homeURL;
  loadURL(homeURL);
});

ipcRenderer.on('download-progress', (event, progress) => {
  downloadStatus.innerText = `Download progress: ${progress}%`;
});

ipcRenderer.on('download-complete', (event, message) => {
  downloadStatus.innerText = message;
});

// Load the home page initially
homeButton.click();

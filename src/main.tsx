import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import './index.css';

// Register PWA service worker with immediate update check
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js')
      .then((registration) => {
        console.log('ServiceWorker registered with scope: ', registration.scope);
        // Actively check for SW update on launch so changes apply immediately
        registration.update();
      })
      .catch((error) => {
        console.error('ServiceWorker registration failed: ', error);
      });
  });

  navigator.serviceWorker.ready.then((registration) => {
    registration.update();
  });
}

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);

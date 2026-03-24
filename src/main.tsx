import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import './index.css';

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);

// Register service worker for offline support
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    const base = (import.meta as Record<string, any>).env?.BASE_URL || '/Workout-Coach-Planner-and-diary/';
    navigator.serviceWorker.register(base + 'sw.js');
  });
}

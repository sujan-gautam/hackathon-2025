import { createRoot } from 'react-dom/client';
import App from './App.tsx';
import './index.css';

// ✅ Import and register PWA service worker
import { registerSW } from 'virtual:pwa-register';

// Automatically update when a new service worker is available
registerSW({
  onNeedRefresh() {
    if (confirm('A new update is available. Reload now?')) {
      window.location.reload();
    }
  },
  onOfflineReady() {
    console.log('App is ready to work offline 🚀');
  },
});

createRoot(document.getElementById('root')!).render(<App />);

import {StrictMode} from 'react';
import {createRoot} from 'react-dom/client';
import App from './App.tsx';
import './index.css';

const originalFetch = window.fetch;
window.fetch = async (...args) => {
  const res = await originalFetch(...args);
  if (res.status === 401) {
    if (!window.location.pathname.includes('login')) {
      localStorage.removeItem('auth-storage');
      window.location.href = '/reception/login';
      // Hang the promise so the app doesn't flash error messages/alerts while redirecting
      return new Promise(() => {});
    }
  }
  return res;
};

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);

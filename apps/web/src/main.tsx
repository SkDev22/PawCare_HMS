import React from 'react';
import ReactDOM from 'react-dom/client';
import { App } from './App';
import { ThemeProvider } from './context/theme';
import { Toaster } from './components/ui/sonner';
import './index.css';

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <ThemeProvider>
      <App />
      <Toaster richColors closeButton position="top-right" />
    </ThemeProvider>
  </React.StrictMode>,
);

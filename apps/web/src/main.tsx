import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import { ClerkProvider } from '@clerk/clerk-react';
import { App } from './App.js';
import './index.css';

const PUBLISHABLE_KEY = import.meta.env.VITE_CLERK_PUBLISHABLE_KEY;

const rootElement = document.getElementById('root');

if (rootElement) {
  if (!PUBLISHABLE_KEY) {
    console.warn(
      '[Clerk Warning] Missing VITE_CLERK_PUBLISHABLE_KEY. Please set it in your apps/web/.env file.'
    );
  }

  ReactDOM.createRoot(rootElement).render(
    <React.StrictMode>
      {PUBLISHABLE_KEY ? (
        <ClerkProvider publishableKey={PUBLISHABLE_KEY}>
          <BrowserRouter>
            <App />
          </BrowserRouter>
        </ClerkProvider>
      ) : (
        <BrowserRouter>
          <div className="bg-amber-50 border-b border-amber-200 px-4 py-2 text-center text-xs text-amber-800">
            ⚠️ Clerk Publishable Key missing. Set{' '}
            <code className="font-mono">VITE_CLERK_PUBLISHABLE_KEY</code> in{' '}
            <code className="font-mono">apps/web/.env</code> to enable authentication.
          </div>
          <App />
        </BrowserRouter>
      )}
    </React.StrictMode>
  );
}

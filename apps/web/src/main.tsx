import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import { ClerkProvider } from '@clerk/clerk-react';
import { App } from './App.js';
import './index.css';

const PUBLISHABLE_KEY = import.meta.env.VITE_CLERK_PUBLISHABLE_KEY;
const isValidPublishableKey =
  typeof PUBLISHABLE_KEY === 'string' && PUBLISHABLE_KEY.startsWith('pk_');

const rootElement = document.getElementById('root');

if (rootElement) {
  if (!isValidPublishableKey) {
    if (!PUBLISHABLE_KEY) {
      console.warn('[Clerk Warning] Missing VITE_CLERK_PUBLISHABLE_KEY in apps/web/.env.');
    } else {
      console.error(
        '[Clerk Error] Invalid VITE_CLERK_PUBLISHABLE_KEY provided. Key must begin with "pk_".'
      );
    }
  }

  ReactDOM.createRoot(rootElement).render(
    <React.StrictMode>
      {isValidPublishableKey ? (
        <ClerkProvider publishableKey={PUBLISHABLE_KEY}>
          <BrowserRouter>
            <App />
          </BrowserRouter>
        </ClerkProvider>
      ) : (
        <BrowserRouter>
          <div className="bg-amber-50 border-b border-amber-200 px-4 py-2 text-center text-xs text-amber-800">
            ⚠️ Valid Clerk Publishable Key missing. Set{' '}
            <code className="font-mono">VITE_CLERK_PUBLISHABLE_KEY=pk_test_...</code> in{' '}
            <code className="font-mono">apps/web/.env</code> to enable authentication.
          </div>
          <App />
        </BrowserRouter>
      )}
    </React.StrictMode>
  );
}

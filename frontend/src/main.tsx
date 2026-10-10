import React, { Suspense } from 'react';
import ReactDOM from 'react-dom/client';
import { QueryClientProvider } from '@tanstack/react-query';
import { RouterProvider } from 'react-router-dom';
import { queryClient } from './app/providers/QueryProvider';
import { router } from './app/router';
import './index.css';

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <QueryClientProvider client={queryClient}>
      <Suspense
        fallback={(
          <div className="flex min-h-screen items-center justify-center bg-[#F8FAFC]">
            <div className="h-8 w-8 animate-spin rounded-full border-2 border-slate-200 border-t-[#101820]" aria-label="Loading" />
          </div>
        )}
      >
        <RouterProvider router={router} />
      </Suspense>
    </QueryClientProvider>
  </React.StrictMode>,
);

import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { QueryClientProvider } from '@tanstack/react-query'
import { ReactQueryDevtools } from '@tanstack/react-query-devtools'
import { queryClient } from '@/lib/query-client.js'
import { App } from './App.js'
import './index.css'

// QueryClientProvider must wrap the entire app so every component can access
// the shared QueryClient. We import the same instance that api.ts uses — this
// is what connects HonoReactQuery hooks to the React tree.

const root = document.getElementById('root')
if (!root) throw new Error('Root element not found')

createRoot(root).render(
  <StrictMode>
    <QueryClientProvider client={queryClient}>
      <App />
      {/* DevTools — shows cache state, query status, staleTime timers in dev */}
      <ReactQueryDevtools initialIsOpen={false} />
    </QueryClientProvider>
  </StrictMode>,
)

import "@fontsource/jetbrains-mono/400.css"
import "@fontsource/jetbrains-mono/500.css"
import "@fontsource/jetbrains-mono/700.css"
import { PersistQueryClientProvider } from "@tanstack/react-query-persist-client"
import React from "react"
import ReactDOM from "react-dom/client"

import App from "@/App"

import "@/styles/main.css"
import ErrorBoundary from "@/components/ErrorBoundary"
import { ThemeProvider } from "@/components/ThemeProvider"
import { createAlgokuPersister, createQueryClient, shouldPersistQuery } from "@/lib/queryClient"

const queryClient = createQueryClient()
const persister = createAlgokuPersister()

ReactDOM.createRoot(document.getElementById("root") as HTMLElement).render(
  <React.StrictMode>
    <ErrorBoundary>
      <PersistQueryClientProvider
        client={queryClient}
        persistOptions={{
          persister,
          dehydrateOptions: {
            shouldDehydrateQuery: (q) => shouldPersistQuery(q.queryKey),
          },
        }}
      >
        <ThemeProvider defaultTheme="system">
          <App />
        </ThemeProvider>
      </PersistQueryClientProvider>
    </ErrorBoundary>
  </React.StrictMode>,
)

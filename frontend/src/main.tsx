import '@fontsource-variable/inter/wght.css'
import '@mantine/core/styles.css'
import './calendar.css'

import { MantineProvider, createTheme } from '@mantine/core'
import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import App from './App.tsx'

const theme = createTheme({
  fontFamily: '"Inter Variable", Arial, sans-serif',
  primaryColor: 'iris',
  primaryShade: 7,
  colors: {
    iris: [
      '#f4f2ff',
      '#ebe7ff',
      '#d8d0ff',
      '#bcb0f9',
      '#9f8dee',
      '#856ee2',
      '#735bd4',
      '#5f49bf',
      '#503ca6',
      '#3e2f82',
    ],
  },
  defaultRadius: 'md',
})

const root = document.getElementById('root')
if (!root) throw new Error('Root element #root not found')
createRoot(root).render(
  <StrictMode>
    <MantineProvider theme={theme}>
      <App />
    </MantineProvider>
  </StrictMode>,
)

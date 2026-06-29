import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App'
import './index.css'
import { bootstrap } from './app/bootstrap'
import { processDueRules } from './db/recurringRepo'
import { isoDate } from './lib/date'

bootstrap().finally(() => {
  ReactDOM.createRoot(document.getElementById('root')!).render(
    <React.StrictMode>
      <App />
    </React.StrictMode>,
  )
  processDueRules(isoDate(new Date())).catch((e) => console.error('recurring generation failed', e))
})

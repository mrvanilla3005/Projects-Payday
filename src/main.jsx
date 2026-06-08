import React from 'react'
import ReactDOM from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import App from './App.jsx'
import './index.css'
import { insertSeedData } from './data/store.js'
import { patchKupony } from './data/store.js'
import { seedKupony } from './data/seedProdej.js'

patchKupony(seedKupony)

insertSeedData().then(() => {
  ReactDOM.createRoot(document.getElementById('root')).render(
    <React.StrictMode>
      <BrowserRouter>
        <App />
      </BrowserRouter>
    </React.StrictMode>,
  )
})

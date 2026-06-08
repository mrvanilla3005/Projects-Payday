import React from 'react'
import ReactDOM from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import App from './App.jsx'
import './index.css'
import { insertSeedData } from './data/store.js'
import { patchKupony } from './data/store.js'
import { seedKupony } from './data/seedProdej.js'

patchKupony(seedKupony)

const root = ReactDOM.createRoot(document.getElementById('root'))

root.render(
  <React.StrictMode>
    <BrowserRouter>
      <App />
    </BrowserRouter>
  </React.StrictMode>,
)

insertSeedData()

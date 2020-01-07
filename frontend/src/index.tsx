/// <reference path="../node_modules/@types/parcel-env/index.d.ts" />

import React from 'react'
import { render } from 'react-dom'
import { BrowserRouter } from 'react-router-dom'
import App from '/App'
import { useSettingsContext } from '/contexts/settings'
import '/index.css'

const root = document.getElementById('root')

render(
  <BrowserRouter>
    <useSettingsContext.Provider>
      <App />
    </useSettingsContext.Provider>
  </BrowserRouter>,
  root
)

if (module.hot) {
  module.hot.accept()
}

/// <reference path="../node_modules/@types/parcel-env/index.d.ts" />

import React from 'react'
import { render } from 'react-dom'
import { BrowserRouter } from 'react-router-dom'
import App from '/App'
import { useAuthContext } from '/contexts/auth'
import { ControlProvider } from '/contexts/control'
import { useSettingsContext } from '/contexts/settings'
import '/index.css'

const root = document.getElementById('root')

render(
  <BrowserRouter>
    <useSettingsContext.Provider>
      <ControlProvider>
        <useAuthContext.Provider>
          <App />
        </useAuthContext.Provider>
      </ControlProvider>
    </useSettingsContext.Provider>
  </BrowserRouter>,
  root
)

if (module.hot) {
  module.hot.accept()
}

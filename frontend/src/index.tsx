/// <reference path="../node_modules/@types/parcel-env/index.d.ts" />

import App from '/App'
import { AuthProvider } from '/contexts/auth'
import { ControlProvider } from '/contexts/control'
import { RadioInfoProvider } from '/contexts/radio'
import { RadioStatusProvider } from '/contexts/radioStatus'
import { SiteSettingsProvider } from '/contexts/settings'
import React from 'react'
import { render } from 'react-dom'
import { BrowserRouter } from 'react-router-dom'
import './index.css'

const root = document.getElementById('root')

render(
  <BrowserRouter>
    <SiteSettingsProvider>
      <ControlProvider>
        <AuthProvider>
          <RadioInfoProvider>
            <RadioStatusProvider>
              <App />
            </RadioStatusProvider>
          </RadioInfoProvider>
        </AuthProvider>
      </ControlProvider>
    </SiteSettingsProvider>
  </BrowserRouter>,
  root
)

if (module.hot) {
  module.hot.accept()
}

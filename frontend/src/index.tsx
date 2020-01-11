/// <reference path="../node_modules/@types/parcel-env/index.d.ts" />

import React from 'react'
import { render } from 'react-dom'
import { BrowserRouter } from 'react-router-dom'
import App from '/App'
import { useAuthContext } from '/contexts/auth'
import { useControlContext } from '/contexts/control'
import { useRadioInfoContext } from '/contexts/radio'
import { useSettingsContext } from '/contexts/settings'
import '/index.css'

const root = document.getElementById('root')

render(
  <BrowserRouter>
    <useControlContext.Provider>
      <useSettingsContext.Provider>
        <useAuthContext.Provider>
          <useRadioInfoContext.Provider>
            <App />
          </useRadioInfoContext.Provider>
        </useAuthContext.Provider>
      </useSettingsContext.Provider>
    </useControlContext.Provider>
  </BrowserRouter>,
  root
)

if (module.hot) {
  module.hot.accept()
}

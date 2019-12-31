/// <reference path="../node_modules/@types/parcel-env/index.d.ts" />

import React from 'react'
import { render } from 'react-dom'
import { BrowserRouter } from 'react-router-dom'
import App from '/App'
import '/index.css'

const root = document.getElementById('root')

render(
  <BrowserRouter>
    <App />
  </BrowserRouter>,
  root
)

if (module.hot) {
  module.hot.accept()
}

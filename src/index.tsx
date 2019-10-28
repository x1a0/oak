import React from "react"
import ReactDOM from "react-dom"
import { App } from "./App"
import "./index.css"
import { AppStateProvider } from "./app-state"

ReactDOM.render(
  <AppStateProvider>
    <App />
  </AppStateProvider>,
  document.getElementById("root")
)

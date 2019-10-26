import React from "react"
import ReactDOM from "react-dom"
import App from "./App"
import "./index.css"

const MyComponent: React.FC = () => <div>Hello there</div>

ReactDOM.render(
  <MyComponent>
    <App />
  </MyComponent>,
  document.getElementById("root")
)

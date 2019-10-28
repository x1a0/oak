import React, { FC } from "react"
import styled from "styled-components"
import "./App.css"
import { useDispatch, useState } from "./app-state"

const HttpResult = styled.p`
  background-color: #f0f;
  padding: 10px;
`

// Main component: App
export const App: FC = () => {
  const state = useState()
  const dispatch = useDispatch()

  return (
    <div className="App">
      <header className="App-header">
        <button onClick={() => dispatch({ type: "ADD", x: 1, y: 2 })}>
          Press me to fetch data
        </button>
        <p>Calculator: {state.result}</p>
        <HttpResult>Http result: {state.httpResult}</HttpResult>
        <p>Timeout done: {state.timeoutDone ? "yes" : "no"}</p>
      </header>
    </div>
  )
}

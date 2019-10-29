import React, { FC } from "react"
import styled from "styled-components"
import "./App.css"
import { useDispatch, useState, RemoteData, isFetched } from "./app-state"
import { TestComponent } from "./TestComponent"

type HttpResultProps = {
  result: RemoteData<string>
}
const HttpResult: FC<HttpResultProps> = ({ result }) => {
  if (!isFetched(result)) {
    return <p>Not fetched: {result}</p>
  }

  return <p>{result}</p>
}
const StyledHttpResult = styled(HttpResult)`
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
        <button onClick={() => dispatch({ type: "Add", x: 1, y: 2 })}>
          Press me to fetch data
        </button>
        <p>Calculator: {state.result}</p>
        <StyledHttpResult result={state.httpResult} />
        <p>Timeout done: {state.timeoutDone ? "yes" : "no"}</p>
        <TestComponent />
      </header>
    </div>
  )
}

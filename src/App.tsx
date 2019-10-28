import React, { FC } from "react"
import styled from "styled-components"
import "./App.css"
import { useDispatch, useState } from "./app-state"

// MyComp component
const MyComp = styled.div`
  background-color: #f0f;
  color: #fff;
  padding: 20px;
  font-weight: bold;
  text-decoration: underline;
`

// Title component
type TitleProps = {
  label: string
  description: string
}
const Title: FC<TitleProps> = ({ label, description }) => (
  <div>
    <h1>{label}</h1>
    <h2>{description}</h2>
  </div>
)

// Main component: App
export const App: FC = () => {
  const state = useState()
  const dispatch = useDispatch()

  return (
    <div className="App">
      <header className="App-header">
        <p>
          Edit <code>src/App.tsx</code> and save to reload.
        </p>
        <button onClick={() => dispatch({ type: "ADD", x: 1, y: 2 })}>
          Press me
        </button>
        <p>Calculator: {state.result}</p>
        <p>Http result: {state.httpResult}</p>
        <p>Timeout done: {state.timeoutDone ? "yes" : "no"}</p>

        <Title label="Foo" description="Nah, this was better" />
        <MyComp>Testing</MyComp>
        <Title label="Oh yeah 2" description="Yep, this is nicie" />
        <a
          className="App-link"
          href="https://reactjs.org"
          target="_blank"
          rel="noopener noreferrer"
        >
          Learn React 2
        </a>
      </header>
    </div>
  )
}

import React, { useState, useCallback } from "react"
import "./App.css"
import logo from "./logo.svg"

const Button = ({ title }: { title: string }) => <button>{title}</button>

const Title = ({
  label,
  description
}: {
  label: string
  description: string
}) => <h1>{label}</h1>

const App: React.FC = () => (
  <div className="App">
    <header className="App-header">
      <img src={logo} className="App-logo" alt="logo" />
      <p>
        Edit <code>src/App.tsx</code> and save to reload.
      </p>

      <Button title="Sliff" />
      <Title label="Foo" description="" />

      <Title label="Oh yeah" description="" />
      <a
        className="App-link"
        href="https://reactjs.org"
        target="_blank"
        rel="noopener noreferrer"
      >
        Learn React
      </a>
    </header>
  </div>
)

export default App

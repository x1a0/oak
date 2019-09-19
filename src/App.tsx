import React from 'react';
import logo from './logo.svg';
import './App.css';

const Button = ({title}: {title: string}) =>
    <button>{title}</button>

const Title = ({label}: {label: string}) =>
    <h1>{label}</h1>

const App: React.FC = () => {
  return (
    <div className="App">
      <header className="App-header">
        <img src={logo} className="App-logo" alt="logo" />
        <p>
          Edit <code>src/App.tsx</code> and save to reload.
        </p>

        <Button    label="oaisjdo"/>

        <Button title="Sliff" />

        <Title label="Oh yeah" />
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
  );
}

export default App;

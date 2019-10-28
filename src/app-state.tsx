import React, { FC, useContext } from "react"
import { useOak, Updater, httpGet, timeout } from "./oak"

const initialState = {
  result: 0,
  timeoutDone: false,
  httpResult: "not fetched"
}

type State = typeof initialState

type Msg =
  | { type: "TOGGLE" }
  | { type: "ADD"; x: number; y: number }
  | { type: "GotResult"; data: string }
  | { type: "AfterTimeout" }

const update: Updater<State, Msg> = (state, msg) => {
  switch (msg.type) {
    case "TOGGLE":
      return [state, "none"]
    case "ADD":
      return [
        { ...state, result: msg.x + msg.y },
        timeout(2000, () => ({
          type: "AfterTimeout"
        }))
      ]
    case "GotResult":
      return [{ ...state, httpResult: msg.data }, "none"]
    case "AfterTimeout":
      return [
        { ...state, timeoutDone: true },
        httpGet(
          {
            uri: "https://jsonplaceholder.typicode.com/todos/1"
          },
          ({ data }: { data: any }) => ({ type: "GotResult", data: data.title })
        )
      ]
  }
}

const DispatchContext = React.createContext((_: Msg) => {})
const StateContext = React.createContext(initialState)

export const AppStateProvider: FC = ({ children }) => {
  const [state, dispatch] = useOak(update, initialState, true)

  return (
    <DispatchContext.Provider value={dispatch}>
      <StateContext.Provider value={state}>{children}</StateContext.Provider>
    </DispatchContext.Provider>
  )
}

export const useDispatch = () => useContext(DispatchContext)
export const useState = () => useContext(StateContext)

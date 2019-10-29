import React, { FC, useContext } from "react"
import { useOak, Updater, httpGet, timeout, Cmd, Init } from "./oak"

export const initialState = {
  result: 0,
  timeoutDone: false,
  httpResult: "not fetched"
}

export type State = typeof initialState

type Msg =
  | { type: "Add"; x: number; y: number }
  | { type: "GotResult"; data: string }
  | { type: "AfterTimeout" }

const init: Init<State, Msg> = () => ({
  model: initialState
})

export const fetchTodos: Cmd<Msg> = httpGet(
  {
    uri: "https://jsonplaceholder.typicode.com/todos/1"
  },
  ({ data }: { data: any }) => ({ type: "GotResult", data: data.title })
)

export const addTimeout: Cmd<Msg> = timeout(2000, () => ({
  type: "AfterTimeout"
}))

export const update: Updater<State, Msg> = (state, msg) => {
  switch (msg.type) {
    case "Add":
      return { model: { ...state, result: msg.x + msg.y }, cmd: addTimeout }
    case "GotResult":
      return { model: { ...state, httpResult: msg.data } }
    case "AfterTimeout":
      return { model: { ...state, timeoutDone: true }, cmd: fetchTodos }
  }
}

const DispatchContext = React.createContext((_: Msg) => {})
const StateContext = React.createContext(initialState)

export const AppStateProvider: FC = ({ children }) => {
  const [state, dispatch] = useOak(update, init, true)

  return (
    <DispatchContext.Provider value={dispatch}>
      <StateContext.Provider value={state}>{children}</StateContext.Provider>
    </DispatchContext.Provider>
  )
}

export const useDispatch = () => useContext(DispatchContext)
export const useState = () => useContext(StateContext)

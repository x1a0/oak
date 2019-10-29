import React, { FC, useContext } from "react"
import { useOak, Updater, httpGet, timeout, Cmd, Init, next } from "./oak"

export type RemoteData<T> = "initial" | "loading" | T

export function isFetched<T>(remote: RemoteData<T>): remote is T {
  return remote !== "initial" && remote !== "loading"
}

export const initialState = {
  result: 0,
  timeoutDone: false,
  httpResult: "initial" as RemoteData<string>
}

export type State = typeof initialState

type Msg =
  | { type: "Add"; x: number; y: number }
  | { type: "GotResult"; data: string }
  | { type: "AfterTimeout" }

const init: Init<State, Msg> = () => ({
  state: initialState
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
      return next(
        { ...state, result: msg.x + msg.y },
        !state.timeoutDone ? addTimeout : undefined
      )
    case "GotResult":
      return next({ ...state, httpResult: msg.data })
    case "AfterTimeout":
      const cmd = state.httpResult === "initial" ? fetchTodos : undefined
      return next({ ...state, timeoutDone: true, httpResult: "loading" }, cmd)
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

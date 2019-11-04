import React, { FC, useContext } from "react"
import { useOak, Update, httpGet, timeout, Effect, Init, next } from "./oak"

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

type AppEvent =
  | { type: "Add"; x: number; y: number }
  | { type: "GotResult"; data: string }
  | { type: "AfterTimeout" }

const init: Init<State, AppEvent> = next(initialState)

export const fetchTodos: Effect<AppEvent> = httpGet(
  {
    uri: "https://jsonplaceholder.typicode.com/todos/1"
  },
  ({ data }: { data: any }) => ({ type: "GotResult", data: data.title })
)

export const promiseTimeout: Effect<AppEvent> = {
  name: "PromiseTime",
  execute: () =>
    new Promise(resolve =>
      setTimeout(() => resolve({ type: "AfterTimeout" }), 2000)
    )
}

export const addTimeout: Effect<AppEvent> = timeout(2000, () => ({
  type: "AfterTimeout"
}))

export const update: Update<State, AppEvent> = (state, msg) => {
  switch (msg.type) {
    case "Add":
      return next(
        { ...state, result: msg.x + msg.y },
        !state.timeoutDone ? promiseTimeout : undefined
      )
    case "GotResult":
      return next({ ...state, httpResult: msg.data })
    case "AfterTimeout":
      const cmd = state.httpResult === "initial" ? fetchTodos : undefined
      return next({ ...state, timeoutDone: true, httpResult: "loading" }, cmd)
  }
}

const DispatchContext = React.createContext((_: AppEvent) => {})
const StateContext = React.createContext(initialState)

export const AppStateProvider: FC = ({ children }) => {
  const [state, dispatch] = useOak(update, init, { log: true })

  return (
    <DispatchContext.Provider value={dispatch}>
      <StateContext.Provider value={state}>{children}</StateContext.Provider>
    </DispatchContext.Provider>
  )
}

export const useDispatch = () => useContext(DispatchContext)
export const useState = () => useContext(StateContext)

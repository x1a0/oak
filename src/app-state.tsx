import React, { FC, useContext } from "react"
import { delay, filter, mergeMap } from "rxjs/operators"
import { Init, next, Update, useOak, EffectHandler } from "./oak"
import { Observable, of } from "rxjs"

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

type AppAction =
  | { type: "Add"; x: number; y: number }
  | { type: "GotResult"; data: string }
  | { type: "AfterTimeout" }
  | { type: "Stop" }

type AppEffect = { type: "FetchTodos" } | { type: "Timeout"; duration: number }

const init: Init<State, AppEffect> = next(initialState)

/*
export const fetchTodos = makeEffect<AppAction>("fetchTodos", () =>
  ajax("https://jsonplaceholder.typicode.com/todos/1").pipe(
    delay(1000),
    map(res => ({ type: "GotResult", data: res.response.title }))
  )
)

export const promiseTimeout = (duration: number) =>
  makeEffect<AppAction, { duration: number }>(
    "promiseTimeout",
    () =>
      new Promise(resolve =>
        setTimeout(() => resolve({ type: "AfterTimeout" }), duration)
      ),
    {
      duration
    }
  )
*/
export const update: Update<State, AppAction, AppEffect> = (state, msg) => {
  switch (msg.type) {
    case "Add":
      return next<State, AppEffect>(
        { ...state, result: msg.x + msg.y },
        { type: "Timeout", duration: 2000 }
      )
    case "GotResult":
      return next({ ...state, httpResult: msg.data })
    case "AfterTimeout":
      const cmd: AppEffect | undefined =
        state.httpResult === "initial" ? { type: "FetchTodos" } : undefined
      return next<State, AppEffect>(
        { ...state, timeoutDone: true, httpResult: "loading" },
        cmd
      )
    case "Stop":
      return next(state)
  }
}

export const effectHandler: EffectHandler<AppEffect, AppAction> = (
  effect$: Observable<AppEffect>
) =>
  effect$.pipe(
    filter((effect: any) => effect.type === "Timeout"),
    mergeMap((effect: { type: "Timeout"; duration: number }) =>
      of({ type: "AfterTimeout" } as AppAction).pipe(delay(effect.duration))
    )
  )

const DispatchContext = React.createContext((_: AppAction) => {})
const StateContext = React.createContext(initialState)

export const AppStateProvider: FC = ({ children }) => {
  const [state, dispatch] = useOak(init, update, effectHandler, { log: true })

  return (
    <DispatchContext.Provider value={dispatch}>
      <StateContext.Provider value={state}>{children}</StateContext.Provider>
    </DispatchContext.Provider>
  )
}

export const useDispatch = () => useContext(DispatchContext)
export const useState = () => useContext(StateContext)

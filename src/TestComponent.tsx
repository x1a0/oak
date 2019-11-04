import React, { FC, useCallback } from "react"
import { Observable } from "rxjs"
import { map } from "rxjs/operators"
import { EffectHandler, Init, next, Update, useOak } from "./oak"

type RemoteData<T> = "initial" | "loading" | T

export function isFetched<T>(remote: RemoteData<T>): remote is T {
  return remote !== "initial" && remote !== "loading"
}

const initialState = {
  value: "initial" as RemoteData<string>,
  foobar: "Not pressed"
}
type State = typeof initialState

// Timeout
/*
export const timeout = <Action extends {}>(
  duration: number,
  msgCreator: () => Action
) =>
  makeEffect("timeout", () => timer(duration).pipe(map(() => msgCreator())), {
    duration
  })

const fetchPost = makeEffect<Action>("fetchPost", () =>
  fetch("https://jsonplaceholder.typicode.com/posts/1")
    .then(response => response.json())
    .then(json => ({ type: "Result", value: json.title }))
)
*/
const init: Init<State, Effect> = next(initialState, {
  type: "Timeout",
  duration: 1000
})

type Action =
  | { type: "DelayDone" }
  | { type: "Result"; value: string }
  | { type: "ButtonClicked" }

type Effect = { type: "FetchPost" } | { type: "Timeout"; duration: number }

const update: Update<State, Action, Effect> = (state, msg) => {
  switch (msg.type) {
    case "DelayDone":
      return next({ ...state, value: "loading" }, { type: "FetchPost" })
    case "Result":
      return next({ ...state, value: msg.value })
    case "ButtonClicked":
      return next({ ...state, foobar: "I've been pressed" })
  }
}

const effectHandler: EffectHandler<Effect, Action> = (
  effect$: Observable<Effect>
) =>
  effect$.pipe(
    map(() => ({
      type: "DelayDone"
    }))
  )

export const TestComponent: FC = () => {
  const [state, dispatch] = useOak(init, update, effectHandler, { log: true })
  const clicked = useCallback(() => dispatch({ type: "ButtonClicked" }), [
    dispatch
  ])

  if (state.value === "initial") {
    return <p>Haven't started yet</p>
  }

  if (state.value === "loading") {
    return <p>Loading...</p>
  }

  return (
    <div>
      <p>{state.value}</p>
      <button onClick={clicked}>Press me</button>
      <p>{state.foobar}</p>
    </div>
  )
}

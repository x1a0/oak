import React, { useCallback, FC } from "react"
import { makeEffect, Init, next, Update, useOak } from "./oak"
import { timer } from "rxjs"
import { map } from "rxjs/operators"

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

const init: Init<State, Action> = next(
  initialState,
  timeout(1000, () => ({ type: "DelayDone" }))
)

type Action =
  | { type: "DelayDone" }
  | { type: "Result"; value: string }
  | { type: "ButtonClicked" }

const update: Update<State, Action> = (state, msg) => {
  switch (msg.type) {
    case "DelayDone":
      return next({ ...state, value: "loading" }, fetchPost)
    case "Result":
      return next({ ...state, value: msg.value })
    case "ButtonClicked":
      return next({ ...state, foobar: "I've been pressed" })
  }
}

export const TestComponent: FC = () => {
  const [state, dispatch] = useOak(update, init, { log: true })
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

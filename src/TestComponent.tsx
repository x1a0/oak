import React, { FC, useCallback } from "react"
import { Init, next, timeout, Update, useOak, makeEffect } from "./oak"

type RemoteData<T> = "initial" | "loading" | T

export function isFetched<T>(remote: RemoteData<T>): remote is T {
  return remote !== "initial" && remote !== "loading"
}

const initialState = {
  value: "initial" as RemoteData<string>,
  foobar: "Not pressed"
}
type State = typeof initialState

const init: Init<State, TestEvent> = next(
  initialState,
  timeout(1000, () => ({ type: "DelayDone" }))
)

type TestEvent =
  | { type: "DelayDone" }
  | { type: "Result"; value: string }
  | { type: "Foobar" }

const fetchPost = makeEffect<TestEvent>("fetchPost", () =>
  fetch("https://jsonplaceholder.typicode.com/posts/1")
    .then(response => response.json())
    .then(json => ({ type: "Result", value: json.title }))
)

const update: Update<State, TestEvent> = (state, msg) => {
  switch (msg.type) {
    case "DelayDone":
      return next({ ...state, value: "loading" }, fetchPost)
    case "Result":
      return next({ ...state, value: msg.value })
    case "Foobar":
      return next({ ...state, foobar: "I've been pressed" })
  }
}

export const TestComponent: FC = () => {
  const [state, dispatch] = useOak(update, init, { log: true })
  const cb = useCallback(() => dispatch({ type: "Foobar" }), [dispatch])

  if (state.value === "initial") {
    return <p>Haven't started yet</p>
  }

  if (state.value === "loading") {
    return <p>Loading...</p>
  }

  return (
    <div>
      <p>{state.value}</p>
      <button onClick={cb}>Press me</button>
      <p>{state.foobar}</p>
    </div>
  )
}

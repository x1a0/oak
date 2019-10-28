import React, { FC } from "react"
import { useOak, Updater, httpGet, Cmd, Init, timeout } from "./oak"

type RemoteData<T> = "initial" | "loading" | T

export function isFetched<T>(remote: RemoteData<T>): remote is T {
  return remote !== "initial" && remote !== "loading"
}

const initialState = {
  value: "initial" as RemoteData<string>
}

type State = typeof initialState

const init: Init<State, Msg> = () => [
  initialState,
  timeout(1000, () => ({
    type: "DelayDone"
  }))
]

type Msg = { type: "DelayDone" } | { type: "Result"; value: string }

const fetchPost: Cmd<Msg> = httpGet(
  { uri: "https://jsonplaceholder.typicode.com/posts/1" },
  ({ data }: { data: any }) => ({ type: "Result", value: data.title })
)

const update: Updater<State, Msg> = (state, msg) => {
  switch (msg.type) {
    case "DelayDone":
      return [{ ...state, value: "loading" }, fetchPost]
    case "Result":
      return [{ ...state, value: msg.value }, "none"]
  }
}

export const TestComponent: FC = () => {
  const [state] = useOak(update, init, true)

  if (state.value === "initial") {
    return <p>Haven't started yet</p>
  }

  if (state.value === "loading") {
    return <p>Loading...</p>
  }

  return (
    <div>
      <p>{state.value}</p>
    </div>
  )
}

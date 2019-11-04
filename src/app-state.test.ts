import { update, initialState, fetchTodos } from "./app-state"

it("Should run a timeout on Add", () => {
  const { state, effect } = update(initialState, { type: "Add", x: 10, y: 20 })
  expect(state.result).toBe(30)
  expect(effect!.name).toEqual("promiseTimeout")
  expect(effect!.data).toEqual({ duration: 2000 })
})

it("Should request todos after timeout", () => {
  const { state, effect } = update(initialState, { type: "AfterTimeout" })
  expect(state.timeoutDone).toBe(true)
  expect(effect).toEqual(fetchTodos)
})

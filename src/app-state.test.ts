import { update, initialState, fetchTodos, addTimeout } from "./app-state"

it("Should run a timeout on Add", () => {
  const [state, cmd] = update(initialState, { type: "Add", x: 10, y: 20 })
  expect(state.result).toBe(30)
  expect(cmd).toEqual(addTimeout)
})

it("Should request todos after timeout", () => {
  const [state, cmd] = update(initialState, { type: "AfterTimeout" })
  expect(state.timeoutDone).toBe(true)
  expect(cmd).toEqual(fetchTodos)
})

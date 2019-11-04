import { useCallback, useEffect, useState } from "react"
import { Observable, Subject, timer, from } from "rxjs"
import { ajax } from "rxjs/ajax"
import {
  delay,
  distinctUntilChanged,
  filter,
  map,
  mergeMap,
  share,
  tap,
  withLatestFrom
} from "rxjs/operators"

type EffectResult<Action> = Promise<Action> | Observable<Action>
type EffectRun<Action> = () => EffectResult<Action>

type Effect<Action, Data = any> = {
  name: string
  run: EffectRun<Action>
  data?: Data
}

export const makeEffect = <Action, Data = any>(
  name: string,
  run: EffectRun<Action>,
  data?: Data
): Effect<Action, Data> => ({
  name,
  run,
  data
})

type StrictPropertyCheck<T, TExpected, TError> = Exclude<
  keyof T,
  keyof TExpected
> extends never
  ? {}
  : TError

export type Next<State, Action> = { state: State; effect?: Effect<Action> }

const observableFromEffectResult = <Action>(
  result: EffectResult<Action>
): Observable<Action> => (result instanceof Promise ? from(result) : result)

// The state is strictly property checked for excess properties to give better
// feedback when using without having to manually define the types
export const next = <State, Action, T extends State = State>(
  state: T &
    StrictPropertyCheck<
      T,
      State,
      "Passed in invalid state properties, use next<State, Action>() for more descriptive error"
    >,
  effect?: Effect<Action>
): Next<State, Action> => ({
  state,
  effect
})
export type Init<State, Action> =
  | Next<State, Action>
  | (() => Next<State, Action>)
export type Update<State, Action> = (
  state: State,
  msg: Action
) => Next<State, Action>

export type Dispatch<Action> = (msg: Action) => void

function isEffect<Action>(effect?: Effect<Action>): effect is Effect<Action> {
  return !!effect
}

export type OakOptions = {
  log?: boolean
}

export const setupOak = <State, Action>(
  updateFunc: Update<State, Action>,
  initialState: State,
  initialEffect?: Effect<Action>,
  opts?: OakOptions
): [Observable<State>, Dispatch<Action>] => {
  const log = (opts && opts.log) || false

  const action$ = new Subject<Action>()
  const state$ = new Subject<State>()

  const next$ = action$.pipe(
    withLatestFrom(state$),
    tap(([msg, state]) => console.log("calling update:", msg, state)),
    map(([msg, state]) => updateFunc(state, msg)),
    tap(next => log && console.log("Update returned:", next)),
    share()
  )

  next$
    .pipe(
      map(({ effect }) => effect),
      filter(isEffect),
      mergeMap((effect: Effect<Action>) =>
        observableFromEffectResult(effect.run())
      )
    )
    .subscribe(action$)

  next$.pipe(map(next => next.state)).subscribe(state$)

  // Prime the initials
  initialEffect &&
    observableFromEffectResult(initialEffect.run()).subscribe(m =>
      action$.next(m)
    )
  state$.next(initialState)

  const dispatch: Dispatch<Action> = (msg: Action) => {
    action$.next(msg)
  }

  return [state$.pipe(distinctUntilChanged()), dispatch]
}

export const useOak = <State, Action>(
  updateFunc: Update<State, Action>,
  init: Init<State, Action>,
  opts?: OakOptions
): [State, Dispatch<Action>] => {
  const { state: initialValue, effect: initialEffect } =
    typeof init === "function" ? init() : init
  // Used to trigger hook to re-emit values
  const [state, setState] = useState<State>(initialValue)
  const [oakDispatch, setOakDispatch] = useState<{ d: Dispatch<Action> }>({
    d: () => {}
  })

  useEffect(() => {
    const [state$, d] = setupOak(updateFunc, initialValue, initialEffect, opts)

    setOakDispatch({ d })

    const stateSubscription = state$.subscribe(newState => {
      setState(newState)
    })

    return () => {
      stateSubscription.unsubscribe()
    }
    // eslint-disable-next-line
  }, [])

  const dispatch: Dispatch<Action> = useCallback(
    (msg: Action) => {
      oakDispatch.d(msg)
    },
    [oakDispatch]
  )

  return [state, dispatch]
}

// Commands
// --------

// HTTP get
type HttpGetResult = {
  data: string
}

export const httpGet = <M>(
  uri: string,
  msgCreator: (r: HttpGetResult) => M
): Effect<M, { uri: string }> =>
  makeEffect(
    "http.get",
    () =>
      ajax(uri).pipe(
        delay(1000), // For testing purposes
        map(res => msgCreator(res.response))
      ),
    { uri }
  )

// Timeout
type TimeoutOpts = { duration: number }
export const timeout = <M>(duration: number, msgCreator: () => M): Effect<M> =>
  makeEffect("timeout", () => timer(duration).pipe(map(() => msgCreator())), {
    duration
  })

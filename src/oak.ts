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

export const useOak = <State, Action>(
  updateFunc: Update<State, Action>,
  init: Init<State, Action>,
  opts?: OakOptions
): [State, Dispatch<Action>] => {
  const { state: initialValue, effect: initialEffect } =
    typeof init === "function" ? init() : init
  const [state$] = useState(new Subject<State>())
  const [msg$] = useState(new Subject<Action>())

  // Used to trigger hook to re-emit values
  const [state, setState] = useState<State>(initialValue)

  const log = (opts && opts.log) || false

  useEffect(() => {
    const next$ = msg$.pipe(
      tap(msg => log && console.log("Action:", msg)),
      withLatestFrom(state$),
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
      .subscribe(msg$)

    next$.pipe(map(next => next.state)).subscribe(state$)

    const stateSubscription = state$
      .pipe(distinctUntilChanged())
      .subscribe(newState => {
        setState(newState)
      })

    // Prime the initials
    initialEffect &&
      observableFromEffectResult(initialEffect.run()).subscribe(m =>
        msg$.next(m)
      )
    state$.next(initialValue)

    return () => {
      stateSubscription.unsubscribe()
    }
    // eslint-disable-next-line
  }, [])

  const dispatch: Dispatch<Action> = useCallback(
    (msg: Action) => {
      msg$.next(msg)
    },
    [msg$]
  )

  return [state, dispatch]
}

// Commands
// --------

// HTTP get
type HttpGetOpts = {
  uri: string
}

type HttpGetResult = {
  data: string
}

export const httpGet = <M>(
  opts: HttpGetOpts,
  msgCreator: (r: HttpGetResult) => M
): Effect<M> =>
  makeEffect("http.get", () =>
    ajax(opts.uri).pipe(
      delay(1000), // For testing purposes
      map(res => msgCreator({ data: res.response }))
    )
  )

// Timeout
type TimeoutOpts = { duration: number }
export const timeout = <M>(duration: number, msgCreator: () => M): Effect<M> =>
  makeEffect("timeout", () => timer(duration).pipe(map(() => msgCreator())), {
    duration
  })

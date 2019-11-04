import { useCallback, useEffect, useState } from "react"
import { Observable, Subject } from "rxjs"
import {
  distinctUntilChanged,
  filter,
  map,
  share,
  startWith,
  tap,
  withLatestFrom
} from "rxjs/operators"

type StrictPropertyCheck<T, TExpected, TError> = Exclude<
  keyof T,
  keyof TExpected
> extends never
  ? {}
  : TError

export type Next<State, Effect> = { state: State; effect?: Effect }

// The state is strictly property checked for excess properties to give better
// feedback when using without having to manually define the types
export const next = <State, Effect, T extends State = State>(
  state: T &
    StrictPropertyCheck<
      T,
      State,
      "Passed in invalid state properties, use next<State, Action>() for more descriptive error"
    >,
  effect?: Effect
): Next<State, Effect> => ({
  state,
  effect
})

export type Init<State, Effect> =
  | Next<State, Effect>
  | (() => Next<State, Effect>)

export type Update<State, Action, Effect> = (
  state: State,
  action: Action
) => Next<State, Effect>

export type EffectHandler<Effect, Action> = (
  eventStream: Observable<Effect>
) => Observable<Action>

export type Dispatch<Action> = (msg: Action) => void

function isEffect<Effect>(effect?: Effect): effect is Effect {
  return !!effect
}

export type OakOptions = {
  log?: boolean
}

export const setupOak = <State, Action, Effect>(
  updateFunc: Update<State, Action, Effect>,
  effectHandler: EffectHandler<Effect, Action>,
  initialState: State,
  initialEffect?: Effect,
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

  // Subscribe the effect handler
  effectHandler(
    next$.pipe(
      map(({ effect }) => effect),
      startWith(initialEffect),
      filter(isEffect)
    )
  ).subscribe(action$)

  next$
    .pipe(
      map(next => next.state),
      startWith(initialState)
    )
    .subscribe(state$)

  //  state$.next(initialState)

  const dispatch: Dispatch<Action> = (msg: Action) => {
    action$.next(msg)
  }

  return [state$.pipe(distinctUntilChanged()), dispatch]
}

export const useOak = <State, Action, Effect>(
  init: Init<State, Effect>,
  updateFunc: Update<State, Action, Effect>,
  effectHandler: EffectHandler<Effect, Action>,
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
    const [state$, d] = setupOak(
      updateFunc,
      effectHandler,
      initialValue,
      initialEffect,
      opts
    )

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

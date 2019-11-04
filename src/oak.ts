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

type EffectResult<Event> = Promise<Event> | Observable<Event>

export type Effect<Event> = {
  name: string
  opts?: object
  execute: (opts: any) => EffectResult<Event>
}

type X = { a: string; b: number }
type Y = { a: string; b: number }

type Z = Exclude<keyof Y, keyof X> extends never ? {} : "Sliff"

type StrictPropertyCheck<T, TExpected, TError> = Exclude<
  keyof T,
  keyof TExpected
> extends never
  ? {}
  : TError

export type Next<State, Action> = { state: State; cmd?: Effect<Action> }

const observableFromEffectResult = <Event>(
  result: EffectResult<Event>
): Observable<Event> => (result instanceof Promise ? from(result) : result)

// The state is strictly property checked for excess properties to give better
// feedback when using without having to manually define the types
export const next = <State, Event, T extends State = State>(
  state: T &
    StrictPropertyCheck<
      T,
      State,
      "Passed in invalid state properties, use next<State, Event>() for more descriptive error"
    >,
  cmd?: Effect<Event>
): Next<State, Event> => ({
  state,
  cmd
})
export type Init<State, Event> = Next<State, Event> | (() => Next<State, Event>)
export type Update<State, Event> = (
  state: State,
  msg: Event
) => Next<State, Event>

export type Dispatch<Event> = (msg: Event) => void

function isCmd<Event>(cmd?: Effect<Event>): cmd is Effect<Event> {
  return !!cmd
}

export function useOak<State, Event>(
  updateFunc: Update<State, Event>,
  init: Init<State, Event>,
  log = false
): [State, Dispatch<Event>] {
  const { state: initialValue, cmd: initialCmd } =
    typeof init === "function" ? init() : init
  const [state$] = useState(new Subject<State>())
  const [msg$] = useState(new Subject<Event>())

  // Used to trigger hook to re-emit values
  const [state, setState] = useState<State>(initialValue)

  useEffect(() => {
    const next$ = msg$.pipe(
      tap(msg => log && console.log("Event:", msg)),
      withLatestFrom(state$),
      map(([msg, state]) => updateFunc(state, msg)),
      tap(next => log && console.log("Update returned:", next)),
      share()
    )

    next$
      .pipe(
        map(({ cmd }) => cmd),
        filter(isCmd),
        mergeMap((cmd: Effect<Event>) =>
          observableFromEffectResult(cmd.execute(cmd.opts))
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
    initialCmd &&
      observableFromEffectResult(initialCmd.execute(initialCmd.opts)).subscribe(
        m => msg$.next(m)
      )
    state$.next(initialValue)

    return () => {
      stateSubscription.unsubscribe()
    }
    // eslint-disable-next-line
  }, [])

  const dispatch: Dispatch<Event> = useCallback(
    (msg: Event) => {
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
): Effect<M> => ({
  name: "http.get",
  opts: opts,
  execute: o =>
    ajax(o.uri).pipe(
      delay(1000), // For testing purposes
      map(res => msgCreator({ data: res.response }))
    )
})

// Timeout
type TimeoutOpts = { duration: number }
export const timeout = <M>(
  duration: number,
  msgCreator: () => M
): Effect<M> => ({
  name: "timeout",
  execute: () => timer(duration).pipe(map(() => msgCreator()))
})

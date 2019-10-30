import { useCallback, useEffect, useState } from "react"
import { Observable, Subject, timer } from "rxjs"
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

export type Cmd<Msg> = {
  name: string
  opts?: object
  execute: (opts: any) => Observable<Msg>
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

export type Next<State, Msg> = { state: State; cmd?: Cmd<Msg> }

// The state is strictly property checked for excess properties to give better
// feedback when using without having to manually define the types
export const next = <State, Msg, T extends State = State>(
  state: T &
    StrictPropertyCheck<
      T,
      State,
      "Passed in invalid state properties, use next<State, Msg>() for more descriptive error"
    >,
  cmd?: Cmd<Msg>
): Next<State, Msg> => ({
  state,
  cmd
})
export type Init<State, Msg> = () => Next<State, Msg>
export type Updater<State, Msg> = (state: State, msg: Msg) => Next<State, Msg>

export type Dispatch<Msg> = (msg: Msg) => void

function isCmd<Msg>(cmd?: Cmd<Msg>): cmd is Cmd<Msg> {
  return !!cmd
}

export function useOak<State, Msg>(
  updateFunc: Updater<State, Msg>,
  init: Init<State, Msg>,
  log = false
): [State, Dispatch<Msg>] {
  const { state: initialValue, cmd: initialCmd } = init()
  const [state$] = useState(new Subject<State>())
  const [msg$] = useState(new Subject<Msg>())

  // Used to trigger hook to re-emit values
  const [state, setState] = useState<State>(initialValue)

  useEffect(() => {
    const next$ = msg$.pipe(
      tap(msg => log && console.log("Msg:", msg)),
      withLatestFrom(state$),
      map(([msg, state]) => updateFunc(state, msg)),
      tap(next => log && console.log("Update returned:", next)),
      share()
    )

    next$
      .pipe(
        map(({ cmd }) => cmd),
        filter(isCmd),
        mergeMap((cmd: Cmd<Msg>) => cmd.execute(cmd.opts))
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
      initialCmd.execute(initialCmd.opts).subscribe(m => msg$.next(m))
    state$.next(initialValue)

    return () => {
      stateSubscription.unsubscribe()
    }
    // eslint-disable-next-line
  }, [])

  const dispatch: Dispatch<Msg> = useCallback(
    (msg: Msg) => {
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
): Cmd<M> => ({
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
export const timeout = <M>(duration: number, msgCreator: () => M): Cmd<M> => ({
  name: "timeout",
  execute: () => timer(duration).pipe(map(() => msgCreator()))
})

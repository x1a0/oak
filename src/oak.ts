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

export type Cmd<M> = {
  name: string
  opts?: any
  execute: (opts: any) => Observable<M>
}

export type Next<S, M> = { model: S; cmd?: Cmd<M> }
export type Init<S, M> = () => Next<S, M>
export type Updater<T, M> = (state: T, msg: M) => Next<T, M>

export type Dispatch<T> = (msg: T) => void

function isCmd<M>(cmd?: Cmd<M>): cmd is Cmd<M> {
  return !!cmd
}

export const useOak = <S extends {}, M extends {}>(
  updateFunc: Updater<S, M>,
  init: Init<S, M>,
  log = false
): [S, Dispatch<M>] => {
  const { model: initialValue, cmd: initialCmd } = init()
  const [state$] = useState(new Subject<S>())
  const [msg$] = useState(new Subject<M>())

  // Used to trigger hook to re-emit values
  const [state, setState] = useState<S>(initialValue)

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
        mergeMap((cmd: Cmd<M>) => cmd.execute(cmd.opts))
      )
      .subscribe(msg$)

    next$.pipe(map(next => next.model)).subscribe(state$)

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

  const dispatch: Dispatch<M> = useCallback(
    (msg: M) => {
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

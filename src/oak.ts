import { useCallback, useEffect, useState } from "react"
import { Observable, Subject, timer } from "rxjs"
import { ajax } from "rxjs/ajax"
import {
  distinctUntilChanged,
  filter,
  map,
  mergeMap,
  share,
  tap,
  withLatestFrom,
  delay
} from "rxjs/operators"

type CommandHandler<M> = () => Observable<M>

export type Cmd<M> = "none" | CommandHandler<M>
export type Init<S, M> = () => [S, Cmd<M>]
export type Updater<T, M> = (state: T, msg: M) => [T, Cmd<M>]

export type Dispatch<T> = (msg: T) => void

export function isCommandHandler<M>(cmd: Cmd<M>): cmd is CommandHandler<M> {
  return cmd !== "none"
}

export const useOak = <S extends {}, M extends {}>(
  updateFunc: Updater<S, M>,
  init: () => [S, Cmd<M>],
  log = false
): [S, Dispatch<M>] => {
  const [initialValue, initialCmd] = init()
  const [state$] = useState(new Subject<S>())
  const [msg$] = useState(new Subject<M>())

  // Used to trigger hook to re-emit values
  const [state, setState] = useState<S>(initialValue)

  useEffect(() => {
    const next$ = msg$.pipe(
      tap(msg => log && console.log("Msg:", msg)),
      withLatestFrom(state$),
      map(([msg, state]) => updateFunc(state, msg)),
      tap(([newState]) => log && console.log("State:", newState)),
      share()
    )

    next$
      .pipe(
        map(([_newState, cmd]) => cmd),
        filter(isCommandHandler),
        mergeMap(cmd => cmd())
      )
      .subscribe(msg$)

    next$.pipe(map(([newState, _cmd]) => newState)).subscribe(state$)

    const stateSubscription = state$
      .pipe(distinctUntilChanged())
      .subscribe(newState => {
        setState(newState)
      })

    // Prime the initials
    initialCmd !== "none" && initialCmd().subscribe(m => msg$.next(m))
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
): Cmd<M> => () =>
  ajax(opts.uri).pipe(
    delay(1000), // For testing purposes
    map(res => msgCreator({ data: res.response }))
  )

// Timeout
type TimeoutOpts = { duration: number }
export const timeout = <M>(
  duration: number,
  msgCreator: () => M
): Cmd<M> => () => timer(duration).pipe(map(() => msgCreator()))

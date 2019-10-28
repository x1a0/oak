import { useCallback, useEffect, useState } from "react"
import { Observable, Subject, timer } from "rxjs"
import { ajax } from "rxjs/ajax"
import { map, withLatestFrom } from "rxjs/operators"

type CommandHandler<M> = () => Observable<M>

export type Cmd<M> = "none" | CommandHandler<M>

export type Updater<T, M> = (state: T, msg: M) => [T, Cmd<M>]

export type Dispatch<T> = (msg: T) => void
export type CmdDone<M> = (msg: M) => void

export const useOak = <S extends {}, M extends {}>(
  updateFunc: Updater<S, M>,
  initial: S,
  log = false
): [S, Dispatch<M>] => {
  const [state$] = useState(new Subject<S>())
  const [msg$] = useState(new Subject<M>())

  // Used to trigger hook to re-emit values
  const [state, setState] = useState<S>(initial)

  useEffect(() => {
    const combinedSubscription = msg$
      .pipe(withLatestFrom(state$))
      .subscribe(([msg, state]) => {
        log && console.log("MSG:", msg)
        const [newState, cmd] = updateFunc(state, msg)
        if (cmd !== "none") {
          cmd().subscribe(m => msg$.next(m))
        }
        state$.next(newState)
      })

    state$.next(initial)

    const stateSubscription = state$.subscribe(newState => {
      log && console.log("STATE:", newState)
      setState(newState)
    })

    return () => {
      combinedSubscription.unsubscribe()
      stateSubscription.unsubscribe()
    }
  }, // eslint-disable-next-line
  [])

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
  ajax(opts.uri).pipe(map(res => msgCreator({ data: res.response })))

// Timeout
type TimeoutOpts = { duration: number }
export const timeout = <M>(
  duration: number,
  msgCreator: () => M
): Cmd<M> => () => timer(duration).pipe(map(() => msgCreator()))

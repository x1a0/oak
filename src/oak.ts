import { useCallback, useEffect, useState } from "react"
import { BehaviorSubject, Observable, Subject, timer } from "rxjs"
import { map, withLatestFrom } from "rxjs/operators"
import { ajax } from "rxjs/ajax"

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
  const [state$] = useState(new BehaviorSubject<S>(initial))
  const [msg$] = useState(new Subject<M>())

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

    const stateSubscription = state$.subscribe(newState => {
      log && console.log("STATE:", newState)
      setState(newState)
    })

    return () => {
      combinedSubscription.unsubscribe()
      stateSubscription.unsubscribe()
    }
  }, [state$, msg$, updateFunc, log])

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

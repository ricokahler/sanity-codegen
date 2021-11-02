import ora, { Options } from 'ora';
import { Subject, ConnectableObservable, concat, timer, of } from 'rxjs';
import {
  concatMap,
  filter,
  publish,
  first,
  startWith,
  pairwise,
} from 'rxjs/operators';

const minMessageTime = 1000;

type Message =
  | {
      text: string;
      level: Sanity.Codegen.LogLevel;
    }
  | { flush: true; level?: unknown };

const logLevels: Sanity.Codegen.LogLevel[] = [
  'success',
  'error',
  'warn',
  'info',
  'verbose',
  'debug',
];

export function createAnimatedLogger(options?: Options) {
  let spinner = ora(options).start();

  const message$ = new Subject<Message>();

  const stream$ = message$.pipe(
    concatMap((message) => concat(of(message), timer(0))),
    filter(Boolean),
    startWith(null),
    pairwise(),
    concatMap(([prev, curr]) => {
      if (prev?.level === 'verbose' && curr?.level !== 'verbose') {
        // ensures the last bit is on the screen for a lil bit
        return concat(timer(minMessageTime), of(curr));
      }

      return of(curr);
    }),
    filter(Boolean),
    publish(),
  );

  stream$.subscribe((message) => {
    if ('flush' in message) return;

    spinner.start();
    spinner.text = message.text;

    if (message.level !== 'verbose') {
      const mappings = {
        success: 'succeed',
        error: 'fail',
        warn: 'warn',
        info: 'info',
        debug: 'stopAndPersist',
      } as const;

      spinner[mappings[message.level] || 'info']();
    }
  });

  (stream$ as ConnectableObservable<Message>).connect();

  const logger = logLevels.reduce<Sanity.Codegen.Logger>((acc, level) => {
    acc[level] = (message) => message$.next({ text: message, level });
    return acc;
  }, {} as Sanity.Codegen.Logger);

  return Object.assign({}, logger, {
    log: logger.debug,
    closeAndFlush: async () => {
      message$.next({ flush: true, level: 'verbose' });

      await stream$
        .pipe(
          filter((e) => 'flush' in e),
          first(),
        )
        .toPromise();

      spinner.stop();
    },
  });
}

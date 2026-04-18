import { Console } from 'console';
if (!('Console' in console)) {
  // @ts-ignore
  (console as any).Console = Console;
}

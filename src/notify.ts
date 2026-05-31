import { execFile } from 'child_process';

function sanitize(s: string): string {
  return s.replace(/["\\]/g, "'").replace(/\s+/g, ' ').slice(0, 240);
}

export function notify(title: string, message: string): void {
  const t = sanitize(title);
  const m = sanitize(message);
  if (process.platform === 'darwin') {
    const script = `display notification "${m}" with title "${t}" sound name "Submarine"`;
    execFile('osascript', ['-e', script], () => {});
  } else if (process.platform === 'linux') {
    execFile('notify-send', [t, m], () => {});
  }
}

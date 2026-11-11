// SPDX-FileCopyrightText: 2026 Noyalib
// SPDX-License-Identifier: MIT OR Apache-2.0

// Register immediately after spawn: close also waits for inherited stdio.
export function trackBrowserShutdown(child, graceMs = 3000, {processGroup = false} = {}) {
  let closed = false;
  const closure = new Promise(resolve => child.once('close', () => {
    closed = true;
    resolve();
  }));
  const waitForClose = async () => {
    let timer;
    try {
      await Promise.race([closure, new Promise(resolve => {
        timer = setTimeout(resolve, graceMs);
      })]);
    } finally { clearTimeout(timer); }
  };
  const running = () => child.pid && child.exitCode === null && child.signalCode === null;
  const signal = name => {
    if (processGroup && child.pid) {
      try { process.kill(-child.pid, name); }
      catch (error) { if (error.code !== 'ESRCH') throw error; }
    } else if (running()) child.kill(name);
  };
  return async () => {
    if (closed) return;
    signal('SIGTERM');
    await waitForClose();
    if (closed) return;
    signal('SIGKILL');
    await waitForClose();
    if (!closed) throw Error('browser streams did not close after shutdown');
  };
}

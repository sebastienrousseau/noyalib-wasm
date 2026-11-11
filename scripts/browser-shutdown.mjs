// SPDX-FileCopyrightText: 2026 Noyalib
// SPDX-License-Identifier: MIT OR Apache-2.0

// Register immediately after spawn: close also waits for inherited stdio.
export function trackBrowserShutdown(child, graceMs = 3000) {
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
  return async () => {
    if (closed) return;
    if (running()) child.kill('SIGTERM');
    await waitForClose();
    if (closed) return;
    if (running()) child.kill('SIGKILL');
    await waitForClose();
    if (!closed) throw Error('browser streams did not close after shutdown');
  };
}

// Minimal DevTools Protocol client over one WebSocket — the single definition
// shared by everything in this repo that drives a real Chrome with no npm
// dependency (Node has shipped a global WebSocket since v22). Two callers use it:
//   - executable-requirements/fullBrowserHeavyTests/extension-load.chrome.test.js — loads the
//     unpacked extension and inspects its MV3 service worker.
//   - data/render-page.js — renders a JS single-page-app shell to extractable
//     HTML (issue #310).
//
// Flat sessions (a sessionId per message) let us talk to the browser and to an
// attached target through the same socket. Events (messages with a `method`)
// are delivered to every registered listener as the full message, so a caller
// can read the top-level `sessionId` to tell which attached target they came
// from.
"use strict";

function connectCDP(url) {
  const ws = new WebSocket(url);
  const pending = new Map();
  const listeners = new Set();
  let nextId = 0;
  ws.addEventListener("message", (ev) => {
    const msg = JSON.parse(typeof ev.data === "string" ? ev.data : ev.data.toString());
    if (msg.id != null && pending.has(msg.id)) {
      const { resolve, reject } = pending.get(msg.id);
      pending.delete(msg.id);
      msg.error ? reject(new Error(msg.error.message)) : resolve(msg.result);
    } else if (msg.method) {
      for (const fn of listeners) fn(msg);
    }
  });
  const ready = new Promise((resolve, reject) => {
    ws.addEventListener("open", () => resolve(), { once: true });
    ws.addEventListener("error", () => reject(new Error("CDP socket error")), { once: true });
  });
  return {
    ready,
    on: (fn) => listeners.add(fn),
    off: (fn) => listeners.delete(fn),
    send: (method, params = {}, sessionId) =>
      new Promise((resolve, reject) => {
        const id = ++nextId;
        pending.set(id, { resolve, reject });
        ws.send(JSON.stringify({ id, method, params, sessionId }));
      }),
    close: () => ws.close(),
  };
}

module.exports = { connectCDP };

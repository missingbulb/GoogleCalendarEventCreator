// Minimal DevTools Protocol client over one WebSocket — drives a real Chrome with
// no npm dependency (Node has shipped a global WebSocket since v22). Its one
// caller is the sibling extension-load.chrome.test.js (it loads the unpacked
// extension and inspects its MV3 service worker), so it lives here in heavy/
// next to it. (It used to be shared with an SPA-render recorder under
// page-infra/, removed when page fetching moved to ScraperAPI — which renders JS
// itself — so this no longer belongs under the extractor infra.)
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

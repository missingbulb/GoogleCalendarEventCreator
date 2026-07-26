// Offline unit tests for the record-page task: its precondition (the cheap hourly
// gate) and the pure parts of its worker. The ScraperAPI call and the git/GitHub
// delivery are exercised by real runs, not mocked here.
"use strict";

const { test } = require("node:test");
const assert = require("node:assert/strict");

const task = () => import("../task.mjs").then((m) => m.default);
const worker = () => import("../worker.mjs");

const DATA = "dev/requirements/extractor/data/server-fetched/";

test("precondition: a quiet window does not run", async () => {
  const t = await task();
  const v = t.precondition({ commits: { touchedPaths: ["extension/popup.js"] } });
  assert.equal(v.run, false);
});

test("precondition: a touched cached-page file runs, and names the files as scope", async () => {
  const t = await task();
  const v = t.precondition({ commits: { touchedPaths: ["README.md", `${DATA}dice.url`] } });
  assert.equal(v.run, true);
  assert.match(v.context.join("\n"), /dice\.url/);
});

test("precondition: a missing commits signal must not throw — a collector error can't sink the gate", async () => {
  const t = await task();
  assert.equal((await task()).precondition({}).run, false);
  assert.equal(t.precondition({ commits: {} }).run, false);
});

test("the declaration is agentless and declares the secret its worker spends", async () => {
  const t = await task();
  assert.equal(t.agent_model, "none");
  assert.equal(t.agent_preprocessing, "node worker.mjs");
  assert.deepEqual(t.agent_preprocessing_secrets, ["SCRAPER_API_KEY"]);
});

test("pendingCases: a .url with no .html is pending; one already recorded is not", async () => {
  const { pendingCases } = await worker();
  const entries = ["dice.url", "dice.html", "meetup.url", "somo.url", "somo.html"];
  const has = (f) => entries.includes(f);
  assert.deepEqual(pendingCases(entries, has), ["meetup"]);
});

test("pendingCases: an .html with no .url is not a case to record", async () => {
  const { pendingCases } = await worker();
  assert.deepEqual(pendingCases(["orphan.html"], (f) => f === "orphan.html"), []);
});

test("pendingCases: nothing to do on an empty or fully-recorded directory", async () => {
  const { pendingCases } = await worker();
  assert.deepEqual(pendingCases([], () => false), []);
  assert.deepEqual(pendingCases(["a.url", "a.html"], () => true), []);
});

test("openFamilyBranch: repeated runs accumulate onto the family's open PR", async () => {
  const { openFamilyBranch } = await worker();
  const pulls = [{ head: { ref: "claude/extractor/dice" } }, { head: { ref: "claude/record-pages-2026-07-20" } }];
  assert.equal(openFamilyBranch(pulls), "claude/record-pages-2026-07-20");
  assert.equal(openFamilyBranch([{ head: { ref: "some/other" } }]), null);
  assert.equal(openFamilyBranch([]), null);
});

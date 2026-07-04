# Testing practices (local working set)

Portable test-discipline practices captured here (capture is always local — see
[this_project/workflow.md](../this_project/workflow.md)).

## Mirror the test tree to the source tree, one test per source file

Lay the test directory out as a parallel of the source tree — `src/<area>/<name>`
tested by `test/<area>/<name>.test` at the same relative path. The path *is* the
link, so a source file never has to name its own test, and a missing or misfiled
test is obvious at a glance. Keep departures (whole-interaction tests, files with
no single unit to mirror) few and deliberate.

# Working discipline (local working set)

Portable working-discipline practices captured here, not yet in the shared canon
([claude/shared/working-discipline.md](../claude/shared/working-discipline.md)).
`optimize-procedures` promotes these up and prunes them once the canon absorbs
them (capture is always local — see [this_project/workflow.md](../this_project/workflow.md)).

## An approval applies only backward

An approval — to merge, to ship, to proceed — applies **only backward**, to the
work already in front of the owner when it's given, never to anything requested or
done *after* it. A later follow-up, even a fix to the just-approved change, needs
its own explicit approval; don't carry one approval forward, and don't treat a
chosen answer to a multiple-choice prompt as authorization just because an option's
wording mentioned the action. When in doubt, surface the new state and wait for a
fresh approval.

## A "commit your uncommitted changes" nag is not authorization to commit drift

An automated prompt to commit the working tree (a stop-hook, a CI nag) tells you
the tree is dirty — not that the changes are *yours* or *intended*. Before
obeying, inspect what actually changed: if it's environment/setup drift rather
than your work — a submodule pointer moved by `git submodule update` at clone
time, a lockfile a setup script regenerated, generated artifacts — **revert it,
don't commit it** onto your branch. Committing drift slips an unintended
dependency/generated-file bump into an unrelated change. Only commit the diff you
actually authored.

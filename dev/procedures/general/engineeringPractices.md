# Engineering practices (local working set)

General engineering-practice lessons captured here, not yet in the shared canon.
`optimize-procedures` promotes these up (via a `claudinite-lesson` issue) and
prunes them once the canon absorbs them (capture is always local — see
[this_project/workflow.md](../this_project/workflow.md)).

- **Collapse parallel classifiers to one, and prefer a structural classifier the code can't desync from over a hand-set field.** When the same property is tagged in more than one place (a spec tag, a side manifest, a per-item field), the copies drift — fold them into a single source of truth. Best of all is a *structural* classifier that derives the category from where something lives (its folder or path), so there's no field to forget to update and no way for the classifier to desync from the item it classifies.

- **Avoid default values — be explicit.** A default buys a little less typing at the price of a hidden rule: the real value moves into a fallback (`x || DEFAULT`) plus a comment documenting it — two things that drift, neither visible at the call site. Require the value explicitly, or make it *structural* (derived from where the thing lives); then delete the fallback and the comment that explained it. Don't document an implicit value — eliminate it. (Why: stating the value is nearly free, so the trade never pays; a value encoded only in a prose comment is neither executed nor tested, so it rots.)

# product-wiki/

The product side of the repo: market, user, and competitor research for the
Google Calendar Event Creator extension, kept self-contained and — per the
barriers pack — walled off from the extension's source, tests, and docs except
through `product-requirements/`.

- [`Market/`](Market/README.md) — self-growing: the calendar-market
  landscape (platforms, event-source shapes, usage patterns).
- [`Users/`](Users/README.md) — self-growing: who uses this extension and
  how (personas, usage patterns, pain points).
- [`Competitors/`](Competitors/README.md) — self-growing: a survey of the
  other tools competing for the same job.
- [`sample-data/`](sample-data/README.md) — small illustrative examples the
  wikis point to (not test fixtures — those live under `dev/requirements/`).
- [`product-requirements/`](product-requirements/README.md) — the one folder
  here the rest of the repo may reference: a reviewed, human-maintained
  distillation of the wikis into product requirements.

## Why walled off

`Market/`, `Users/`, `Competitors/`, and `sample-data/` are evolving,
loosely-sourced research — exactly the kind of content the rest of the repo (extension source,
engineering requirements, procedures) must not silently start depending on,
since an autonomous routine keeps rewriting it. `product-requirements/` is the
single reviewed crossing point: the extension/tests/docs may reference *it*, and
only it. See the `barriers` pack entry in
[`.claudinite-checks.json`](../.claudinite-checks.json) for the enforced rule.

## How it grows

`Market/`, `Users/`, and `Competitors/` follow Andrej
Karpathy's ["LLM Wiki"](https://medium.com/@urvvil08/andrej-karpathys-llm-wiki-create-your-own-knowledge-base-8779014accd5)
pattern — compile findings into the wiki once, refine in place on later passes,
rather than re-deriving everything from scratch each time. The mechanic
(schedule, what counts as real growth, review flow) is defined in
[`dev/routines/product-wiki-growth/routine.md`](../dev/routines/product-wiki-growth/routine.md).
`product-requirements/` is **not** auto-grown — it only changes on human review.

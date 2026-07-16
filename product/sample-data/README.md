# Sample data

Small, illustrative examples that `MarketWiki/` or `UsersWiki/` (including
`CompetitorsWiki/`) point to when a claim benefits from a concrete example
— e.g. a redacted screenshot of a competitor's flow, or a sample extracted-event
JSON used to illustrate a usage pattern.

**Not test fixtures.** Real cached HTML used to verify extraction behavior lives
under `dev/requirements/extractor/data/` and is owned by engineering, reviewed as
part of the executable-requirements contract (see
`dev/procedures/testing.md`). Nothing here is asserted against by any test —
it's reference material for the product wiki, kept separate so the two concerns
(verified extraction behavior vs. illustrative product research) can't drift
into each other.

Currently empty — the growth routine
([`dev/routines/product-wiki-growth/routine.md`](../../dev/routines/product-wiki-growth/routine.md))
or a contributor adds a file here only when a wiki page needs one to point to.
Keep anything added here small and non-sensitive: it's part of the wiki the
barriers pack keeps isolated from the rest of the repo, but it's still a
committed file in a public repo.

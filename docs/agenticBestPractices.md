# Agentic best practices

Durable, project-agnostic practices for running AI agents — distilled from what
worked here. Each is one tight rule; the worked example lives in its own doc.

- **A daily "lessons learned" pass keeps hard-won insights from evaporating.**
  Run it over recent activity to fold durable, reusable lessons into shared docs
  before they're forgotten. Key discipline: dedupe ruthlessly against the
  existing docs, route each lesson to the doc that owns it, keep additions terse
  — and most days add nothing. (Worked example: `docs/claude/auto-lessons.md`.)
- **Match the agent model to the judgment it must make.** A weaker/cheaper model is adequate for mechanical extraction but fails silently on judgment calls — it ships a plausible-but-wrong output where a capable model would correctly bail. Downgrade only for tasks the weaker model reliably handles. (Downgrading the auto-extractor agent to Haiku led it to ship a bare-title case off a listing page instead of stopping; Sonnet bailed correctly — `docs/claude/auto-extractor.md`.)

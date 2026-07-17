---
name: snapshot-approval
description: Get owner approval for a moved UI-snapshot baseline. Use whenever a change to a dev/requirements case (its spec or its rendering) makes the snapshot tests fail — the pixels moved and the baseline wants to change.
---

# Snapshot-approval process

The general principle — a moved snapshot/golden baseline needs owner approval,
not silent regeneration — is canon. This is the project process when a change
to a `dev/requirements/<kind>/cases/*` case makes the snapshot tests **fail**:

1. **Surface the diff immediately, don't carry on.** Revert the baseline to the
   committed **expected** PNG, run the snapshot test so it fails (the harness
   writes the rendered `actual` and a highlighted `diff` to
   `dev/requirements/shared/.artifacts/`), and send three images to the chat:
   **expected** (committed), **actual** (newly-rendered), and the **diff**.
   When the change alters the PNG's **dimensions** (e.g. a fixture shrink),
   pixelmatch can't diff unequal sizes so the harness writes only `actual` (no
   `diff`) — stitch **expected** and **actual** side-by-side into one image for
   the review instead.
2. **Ask via `AskUserQuestion`, not prose** — a popup notifies the owner on
   mobile. Offer **Approve** and **Reject — let's discuss**.
3. **Hold without overwriting the expected image.** If the working tree must be
   committed while waiting (e.g. a stop-hook), commit the *reverted* (expected)
   baseline so the branch/PR honestly shows the snapshot test **red, pending
   approval** — never commit the new baseline first.
4. On **Approve**: regenerate the baseline (`npm run refresh:ui`), confirm the
   suite is green, and push. On **Reject**: **do not** roll back automatically —
   leave the change in place and discuss how to proceed.

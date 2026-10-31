---
name: add-rule
description: Add a cleanup rule or change what an existing rule deletes in Disk Cleaner. Use when asked to clean a new folder, app cache or file type ("добавь чистку X", "пусть чистит ещё Y").
---

# Add or change a cleanup rule

1. **Look at the real folder first, read-only.** Measure its size, list its structure and sample its contents. Don't rely on memory of how an app stores data; versions differ.
2. **Decide if it belongs at all.** It must be regenerated or re-downloadable, must not need admin rights, and must contain no user data. Otherwise refuse and tell the user why. Don't add it "off by default" as a compromise.
3. **Find what uses it.** Get the real process name, then fill in `blockedBy`.
4. **Write the failing tests first** in `tests/unit/rules.test.ts`, using `createSandbox` and `put`: what gets deleted, what must remain beside it, and bad data for computed rules.
5. **Add the rule** to `src/main/rules/catalog.ts`. A computed plan goes in its own file in `src/main/rules/` and returns `unavailable` when anything is unclear. Set `group` and `defaultSelected` per RULES.md §1, and write `note` in plain Russian: what happens afterwards.
6. **Verify.** Run `npm run check`, then `npm run build` and `node scripts/screenshot.mjs <png>` to see the real size and the row. Compare that size with step 1; a big mismatch means the rule is wrong.
7. **Run the `safety-reviewer` agent** and fix what it finds.

Never test a new rule by pressing clean on real paths. Report the expected size and what is kept.

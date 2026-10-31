---
name: disk-audit
description: Read-only audit of what is using space on drive C, and which of it Disk Cleaner could safely cover. Use when asked what eats the disk or which rules are missing ("что занимает место", "куда делось место на диске").
---

# Disk audit

Read-only: delete nothing, even if it looks like obvious junk.

1. Report free and used space on C.
2. Measure the largest folders, skipping reparse points: top level of `C:\`, the user profile, `AppData\Local`, `AppData\Roaming`. Drill into anything over 1 GB.
3. For each large item, also get the newest file date, and compare against the rows from `node scripts/screenshot.mjs <png>`. Run `npm run build` first if `out/` is stale.
4. Classify each item:
   - already covered by a rule;
   - a candidate for a new rule: regenerated or re-downloadable, no admin rights, no user data;
   - not for this app: user data, saves, or needs admin rights (WinSxS, `hiberfil.sys`).
5. Report a table sorted by size: path, size, last used, class, and what would happen if removed. The user decides; add a chosen rule through `/add-rule`.

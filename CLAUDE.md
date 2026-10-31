# CLAUDE.md

Windows desktop app that frees space on drive C through a checkbox list of cleanup rules. It deletes real user files, so **safety outranks every other concern**. Full rules, in Russian: [RULES.md](RULES.md). Don't read it top to bottom; use the routing table below.

Always respond to the user in Russian.

## Stack

Electron + React 19 + TypeScript (strict), built with electron-vite. Vitest for unit tests, Playwright for e2e. Windows only. Why: [docs/adr/0001-stack.md](docs/adr/0001-stack.md).

## Commands

| Command                                  | What it does                                                              |
| ---------------------------------------- | ------------------------------------------------------------------------- |
| `npm run dev`                            | Run with hot reload. **Real paths**: pressing clean deletes real files    |
| `npm run check`                          | Typecheck + lint + unit tests. Must pass before finishing any task        |
| `npm run test:e2e`                       | Build, then drive the UI against a sandbox folder                         |
| `npm run package`                        | Portable build: `release/DiskCleaner-win32-x64/DiskCleaner.exe`           |
| `node scripts/screenshot.mjs <file.png>` | Screenshot with real sizes; never clicks clean. Run `npm run build` first |

The VS Code terminal sets `ELECTRON_RUN_AS_NODE=1`, which makes Electron run as plain Node. The e2e tests and the screenshot script clear it; do the same if you launch Electron another way.

## Architecture

```
src/shared/contract.ts   IPC contract: rule ids only, never paths
src/main/domain/         Types, safety.ts (last line of defence). No I/O
src/main/application/    engine.ts (walk/delete), cleaner-service.ts (use cases)
src/main/rules/          catalog.ts: the only list of what can be deleted
src/main/infrastructure/ FileSystem port implementation, tasklist, logs
src/preload/             Exposes window.cleaner, nothing else
src/renderer/src/        React UI: app/, features/cleanup/{model,ui}, shared/
```

Dependencies point inward: `domain`, `application` and `rules` reach the disk only through the `FileSystem` port. ESLint enforces this, and also stops the renderer importing Node or `src/main`.

## Non-negotiable safety invariants

1. The renderer sends rule ids, never paths. Unknown ids are dropped.
2. Everything deletable is declared in `rules/catalog.ts`. No user-supplied paths.
3. Never recursive delete. The `FileSystem` port has only `deleteFile` and `deleteEmptyDir`. Don't add `fs.rm`.
4. Never traverse links (junctions, symlinks).
5. If a rule can't tell what is needed, it returns `unavailable` and deletes nothing (fail closed).
6. The plan is rebuilt immediately before deleting; earlier scan results are not trusted.
7. Saves, passwords, cookies and keys stay protected by `domain/safety.ts`. Never loosen those patterns to make a rule work.

Details: [docs/adr/0002-safety-model.md](docs/adr/0002-safety-model.md).

## Task routing

| Task                                                                   | Do this                                                              |
| ---------------------------------------------------------------------- | -------------------------------------------------------------------- |
| New cleanup rule, or changing what a rule deletes                      | Use the `/add-rule` skill; RULES.md §1                               |
| Find what else is eating disk space                                    | Use the `/disk-audit` skill (read-only)                              |
| Anything touching `src/main/{domain,application,rules,infrastructure}` | RULES.md §1–2, then run the `safety-reviewer` agent before finishing |
| UI or styling                                                          | RULES.md §3; check the result with the screenshot script             |
| IPC or preload change                                                  | RULES.md §2                                                          |
| Tests                                                                  | RULES.md §4                                                          |
| Build a release                                                        | Use the `/release` skill                                             |

## Git

Commit or push only when the user asks. Conventional Commits, title only.

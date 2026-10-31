// После правки файла: форматирует его и напоминает о ревью, если затронуто ядро удаления.
import { execFileSync } from 'node:child_process';
import { existsSync, readFileSync } from 'node:fs';
import path from 'node:path';

const FORMATTED = /\.(ts|tsx|mjs|css|json|md)$/i;
const SAFETY_CRITICAL = /[\\/]src[\\/]main[\\/](domain|application|rules|infrastructure)[\\/]/i;

const input = JSON.parse(readFileSync(0, 'utf8').replace(/^﻿/, ''));
const file = input.tool_input?.file_path;
const root = process.env.CLAUDE_PROJECT_DIR ?? input.cwd;

if (
  file &&
  root &&
  path
    .resolve(file)
    .toLowerCase()
    .startsWith(path.resolve(root).toLowerCase() + path.sep)
) {
  const prettier = path.join(root, 'node_modules', 'prettier', 'bin', 'prettier.cjs');
  if (FORMATTED.test(file) && existsSync(prettier)) {
    try {
      execFileSync(process.execPath, [prettier, '--write', '--ignore-unknown', file], { cwd: root, stdio: 'ignore' });
    } catch {
      // Ошибка форматирования (например, незаконченный синтаксис) не должна мешать правке.
    }
  }
  if (SAFETY_CRITICAL.test(file)) {
    console.log(
      JSON.stringify({
        hookSpecificOutput: {
          hookEventName: 'PostToolUse',
          additionalContext:
            'Изменено ядро удаления. Перед завершением задачи запусти агента safety-reviewer и npm run check.',
        },
      }),
    );
  }
}

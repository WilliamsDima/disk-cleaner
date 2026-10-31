import type { CleanReport, DiskInfo, RuleView, ScanRow } from '../../../../../shared/contract';

export type Phase = 'loading' | 'scanning' | 'ready' | 'cleaning';

export interface CleanupState {
  phase: Phase;
  rules: RuleView[];
  rows: Record<string, ScanRow>;
  selected: string[];
  disk: DiskInfo | null;
  cleaningName: string | null;
  report: CleanReport | null;
  error: string | null;
}

export type CleanupAction =
  | { type: 'rules-loaded'; rules: RuleView[] }
  | { type: 'disk-loaded'; disk: DiskInfo }
  | { type: 'scan-started' }
  | { type: 'scan-row'; row: ScanRow }
  | { type: 'scan-finished' }
  | { type: 'toggle'; id: string }
  | { type: 'clean-started' }
  | { type: 'clean-progress'; name: string }
  | { type: 'clean-finished'; report: CleanReport }
  | { type: 'report-dismissed' }
  | { type: 'failed'; message: string };

export const initialState: CleanupState = {
  phase: 'loading',
  rules: [],
  rows: {},
  selected: [],
  disk: null,
  cleaningName: null,
  report: null,
  error: null,
};

export function isSelectable(row: ScanRow | undefined): boolean {
  return row?.status === 'ok' && row.size > 0;
}

export function cleanupReducer(state: CleanupState, action: CleanupAction): CleanupState {
  switch (action.type) {
    case 'rules-loaded':
      return { ...state, rules: action.rules };
    case 'disk-loaded':
      return { ...state, disk: action.disk };
    case 'scan-started':
      return { ...state, phase: 'scanning', rows: {}, selected: [], error: null };
    case 'scan-row': {
      const { row } = action;
      const rule = state.rules.find((candidate) => candidate.id === row.id);
      const selected = rule?.defaultSelected && isSelectable(row) ? [...state.selected, row.id] : state.selected;
      return { ...state, rows: { ...state.rows, [row.id]: row }, selected };
    }
    case 'scan-finished':
      return { ...state, phase: 'ready' };
    case 'toggle': {
      if (state.phase !== 'ready' || !isSelectable(state.rows[action.id])) return state;
      const selected = state.selected.includes(action.id)
        ? state.selected.filter((id) => id !== action.id)
        : [...state.selected, action.id];
      return { ...state, selected };
    }
    case 'clean-started':
      return { ...state, phase: 'cleaning', cleaningName: null, error: null };
    case 'clean-progress':
      return { ...state, cleaningName: action.name };
    case 'clean-finished':
      return { ...state, phase: 'ready', cleaningName: null, report: action.report };
    case 'report-dismissed':
      return { ...state, report: null };
    case 'failed':
      return { ...state, phase: 'ready', cleaningName: null, error: action.message };
  }
}

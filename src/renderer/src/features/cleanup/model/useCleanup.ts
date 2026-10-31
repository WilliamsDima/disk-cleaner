import { useCallback, useEffect, useReducer } from 'react';
import { cleanupReducer, initialState } from './reducer';

function messageOf(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

export function useCleanup() {
  const [state, dispatch] = useReducer(cleanupReducer, initialState);

  const refreshDisk = useCallback(async () => {
    dispatch({ type: 'disk-loaded', disk: await window.cleaner.getDisk() });
  }, []);

  const scan = useCallback(async () => {
    dispatch({ type: 'scan-started' });
    try {
      await Promise.all([window.cleaner.scan(), refreshDisk()]);
      dispatch({ type: 'scan-finished' });
    } catch (error) {
      dispatch({ type: 'failed', message: messageOf(error) });
    }
  }, [refreshDisk]);

  const toggle = useCallback((id: string) => {
    dispatch({ type: 'toggle', id });
  }, []);

  const clean = useCallback(
    async (ids: string[]) => {
      dispatch({ type: 'clean-started' });
      try {
        const report = await window.cleaner.clean(ids);
        dispatch({ type: 'clean-finished', report });
        await scan();
      } catch (error) {
        dispatch({ type: 'failed', message: messageOf(error) });
      }
    },
    [scan],
  );

  const dismissReport = useCallback(() => {
    dispatch({ type: 'report-dismissed' });
  }, []);

  const openLog = useCallback(() => {
    void window.cleaner.openLog();
  }, []);

  useEffect(() => {
    return window.cleaner.onProgress((event) => {
      if (event.kind === 'scan-row') dispatch({ type: 'scan-row', row: event.row });
      else dispatch({ type: 'clean-progress', name: event.name });
    });
  }, []);

  useEffect(() => {
    let cancelled = false;
    void window.cleaner.listRules().then((rules) => {
      if (cancelled) return;
      dispatch({ type: 'rules-loaded', rules });
      void scan();
    });
    return () => {
      cancelled = true;
    };
  }, [scan]);

  return { state, scan, toggle, clean, dismissReport, openLog };
}

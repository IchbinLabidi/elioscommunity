import { useCallback, useEffect, useRef, useState } from 'react';

type DraftStorage = 'localStorage' | 'sessionStorage';
type DraftStatus = 'idle' | 'saving' | 'saved' | 'error';

type StoredDraft<T> = {
  version: 1;
  savedAt: string;
  values: T;
};

type Options<T> = {
  key: string;
  values: T;
  onRestore: (values: T) => void;
  debounceMs?: number;
  storage?: DraftStorage;
  expiresInMs?: number;
  enabled?: boolean;
  shouldSave?: (values: T) => boolean;
  warnBeforeUnload?: boolean;
};

const DEFAULT_EXPIRY = 7 * 24 * 60 * 60 * 1000;

function resolveStorage(storage: DraftStorage) {
  if (typeof window === 'undefined') return null;
  return storage === 'sessionStorage' ? window.sessionStorage : window.localStorage;
}

export function draftKey(userId: string | undefined, context: string) {
  return `formDraft:${userId ?? 'anonymous'}:${context}`;
}

export default function useFormDraft<T>({
  key,
  values,
  onRestore,
  debounceMs = 500,
  storage = 'localStorage',
  expiresInMs = DEFAULT_EXPIRY,
  enabled = true,
  shouldSave,
  warnBeforeUnload = true,
}: Options<T>) {
  const [hasDraft, setHasDraft] = useState(false);
  const [restored, setRestored] = useState(false);
  const [lastSavedAt, setLastSavedAt] = useState<string | null>(null);
  const [status, setStatus] = useState<DraftStatus>('idle');
  const hydratedRef = useRef(false);
  const baselineRef = useRef('');
  const onRestoreRef = useRef(onRestore);
  const shouldSaveRef = useRef(shouldSave);

  onRestoreRef.current = onRestore;
  shouldSaveRef.current = shouldSave;

  const clearDraft = useCallback(() => {
    try {
      resolveStorage(storage)?.removeItem(key);
    } catch (error) {
      if (import.meta.env.DEV) console.warn('Unable to clear local form draft', { key, error });
    }
    setHasDraft(false);
    setRestored(false);
    setLastSavedAt(null);
    setStatus('idle');
    baselineRef.current = JSON.stringify(values);
  }, [key, storage, values]);

  useEffect(() => {
    hydratedRef.current = false;
    baselineRef.current = JSON.stringify(values);
    setHasDraft(false);
    setRestored(false);
    setLastSavedAt(null);
    setStatus('idle');
    if (!enabled) {
      hydratedRef.current = true;
      return;
    }
    try {
      const raw = resolveStorage(storage)?.getItem(key);
      if (!raw) {
        hydratedRef.current = true;
        return;
      }
      const draft = JSON.parse(raw) as StoredDraft<T>;
      const savedAt = new Date(draft.savedAt).getTime();
      if (draft.version !== 1 || !Number.isFinite(savedAt) || Date.now() - savedAt > expiresInMs) {
        resolveStorage(storage)?.removeItem(key);
        hydratedRef.current = true;
        return;
      }
      setHasDraft(true);
      setRestored(true);
      setLastSavedAt(draft.savedAt);
      onRestoreRef.current(draft.values);
      baselineRef.current = JSON.stringify(draft.values);
    } catch (error) {
      if (import.meta.env.DEV) console.warn('Unable to restore local form draft', { key, error });
    } finally {
      hydratedRef.current = true;
    }
  }, [enabled, expiresInMs, key, storage]);

  useEffect(() => {
    if (!enabled || !hydratedRef.current) return undefined;
    const serialized = JSON.stringify(values);
    if (serialized === baselineRef.current && !restored) return undefined;
    if (shouldSaveRef.current && !shouldSaveRef.current(values)) return undefined;
    setStatus('saving');
    const timeoutId = window.setTimeout(() => {
      try {
        const savedAt = new Date().toISOString();
        const draft: StoredDraft<T> = { version: 1, savedAt, values };
        resolveStorage(storage)?.setItem(key, JSON.stringify(draft));
        setHasDraft(true);
        setLastSavedAt(savedAt);
        setStatus('saved');
      } catch (error) {
        setStatus('error');
        if (import.meta.env.DEV) console.warn('Unable to save local form draft', { key, error });
      }
    }, debounceMs);
    return () => window.clearTimeout(timeoutId);
  }, [debounceMs, enabled, key, restored, storage, values]);

  useEffect(() => {
    if (!warnBeforeUnload || !hasDraft || !enabled) return undefined;
    const handleBeforeUnload = (event: BeforeUnloadEvent) => {
      event.preventDefault();
      event.returnValue = '';
    };
    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [enabled, hasDraft, warnBeforeUnload]);

  return {
    hasDraft,
    restored,
    lastSavedAt,
    status,
    clearDraft,
    discardDraft: clearDraft,
    dismissRestoreBanner: () => setRestored(false),
  };
}

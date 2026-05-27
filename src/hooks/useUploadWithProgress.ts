import { useCallback, useRef, useState } from 'react';
import { UploadProgressOptions } from '../services/uploadService';

export type UploadStatus = 'idle' | 'preparing' | 'uploading' | 'processing' | 'success' | 'error' | 'cancelled';

export type UploadProgressState = {
  progress: number;
  loaded: number;
  total: number;
  status: UploadStatus;
  error: string;
};

const initialState: UploadProgressState = { progress: 0, loaded: 0, total: 0, status: 'idle', error: '' };

export default function useUploadWithProgress() {
  const [state, setState] = useState<UploadProgressState>(initialState);
  const controllerRef = useRef<AbortController | null>(null);

  const uploadFile = useCallback(async <T,>(operation: (options: UploadProgressOptions) => Promise<T>) => {
    controllerRef.current?.abort();
    const controller = new AbortController();
    controllerRef.current = controller;
    setState({ ...initialState, status: 'preparing' });
    try {
      const result = await operation({
        signal: controller.signal,
        onProgress: (loaded, total) => {
          const progress = total ? Math.round((loaded / total) * 100) : 0;
          setState({ progress, loaded, total, status: 'uploading', error: '' });
        },
      });
      setState((current) => ({ ...current, progress: 100, status: 'success', error: '' }));
      return result;
    } catch (error) {
      if (error instanceof DOMException && error.name === 'AbortError') {
        setState((current) => ({ ...current, status: 'cancelled', error: '' }));
      } else {
        setState((current) => ({
          ...current,
          status: 'error',
          error: error instanceof Error ? error.message : 'Le televersement a echoue.',
        }));
      }
      throw error;
    } finally {
      controllerRef.current = null;
    }
  }, []);

  const cancelUpload = useCallback(() => controllerRef.current?.abort(), []);
  const resetUpload = useCallback(() => {
    controllerRef.current?.abort();
    setState(initialState);
  }, []);

  return { ...state, uploadFile, cancelUpload, resetUpload };
}

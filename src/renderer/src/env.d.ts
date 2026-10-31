/// <reference types="vite/client" />
import type { CleanerApi } from '../../shared/contract';

declare global {
  interface Window {
    cleaner: CleanerApi;
  }
}

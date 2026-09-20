/// <reference types="vite/client" />
declare global {
  interface Window {
    claude?: { hot?: { snapshot?: (fn: () => unknown) => void; ready?: (fn: (d: unknown) => void) => void; data?: unknown } };
    webkitAudioContext?: typeof AudioContext;
  }
}
export {};

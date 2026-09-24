/** Kept as standalone expressions so the bundler recognises each Worker entry point. */
export function createAiWorker(): Worker {
  return new Worker(new URL('./ai.worker.ts', import.meta.url), { type: 'module' });
}
export function createOddsWorker(): Worker {
  return new Worker(new URL('./odds.worker.ts', import.meta.url), { type: 'module' });
}

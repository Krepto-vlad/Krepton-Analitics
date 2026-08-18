import { AsyncLocalStorage } from 'node:async_hooks';

interface RequestLogContext {
  requestId: string;
}

const requestLogContext = new AsyncLocalStorage<RequestLogContext>();

export function runWithRequestId(requestId: string, next: () => void): void {
  requestLogContext.run({ requestId }, next);
}

export function getRequestId(): string | undefined {
  return requestLogContext.getStore()?.requestId;
}

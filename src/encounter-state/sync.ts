import { Action } from './types';

export const CHANNEL_NAME = 'zoom-dnd-sync';

export type SyncMessage = { version: 1; action: Action };

export interface SyncChannel {
  publish: (action: Action) => void;
  subscribe: (handler: (action: Action) => void) => () => void;
  close: () => void;
}

export function createSyncChannel(): SyncChannel | null {
  if (typeof BroadcastChannel === 'undefined') {
    console.warn('BroadcastChannel is unavailable; real-time sync disabled.');
    return null;
  }

  let channel: BroadcastChannel;
  try {
    channel = new BroadcastChannel(CHANNEL_NAME);
  } catch {
    console.warn('Failed to open BroadcastChannel; real-time sync disabled.');
    return null;
  }

  return {
    publish(action: Action): void {
      const message: SyncMessage = { version: 1, action };
      channel.postMessage(message);
    },

    subscribe(handler: (action: Action) => void): () => void {
      function onMessage(event: MessageEvent): void {
        const data = event.data as unknown;
        if (
          data === null ||
          typeof data !== 'object' ||
          (data as Record<string, unknown>).version !== 1 ||
          typeof (data as Record<string, unknown>).action !== 'object' ||
          (data as Record<string, unknown>).action === null
        ) {
          return;
        }
        const msg = data as SyncMessage;
        handler(msg.action);
      }

      channel.addEventListener('message', onMessage);
      return () => {
        channel.removeEventListener('message', onMessage);
      };
    },

    close(): void {
      channel.close();
    },
  };
}
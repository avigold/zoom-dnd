import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { createSyncChannel, CHANNEL_NAME } from '../src/encounter-state/sync';
import type { Action } from '../src/types';

// ---------------------------------------------------------------------------
// Minimal BroadcastChannel mock helpers
// ---------------------------------------------------------------------------

type MessageHandler = (event: MessageEvent) => void;

class MockBroadcastChannel {
  public name: string;
  private listeners: Map<string, Set<MessageHandler>> = new Map();
  public postMessage = vi.fn();
  public close = vi.fn();

  constructor(name: string) {
    this.name = name;
  }

  addEventListener(type: string, handler: MessageHandler) {
    if (!this.listeners.has(type)) {
      this.listeners.set(type, new Set());
    }
    this.listeners.get(type)!.add(handler);
  }

  removeEventListener(type: string, handler: MessageHandler) {
    this.listeners.get(type)?.delete(handler);
  }

  /** Test helper – simulate an incoming message */
  simulateMessage(data: unknown) {
    const event = { data } as MessageEvent;
    this.listeners.get('message')?.forEach((h) => h(event));
  }

  hasListener(type: string, handler?: MessageHandler): boolean {
    const set = this.listeners.get(type);
    if (!set) return false;
    if (handler) return set.has(handler);
    return set.size > 0;
  }

  listenerCount(type: string): number {
    return this.listeners.get(type)?.size ?? 0;
  }
}

// ---------------------------------------------------------------------------
// Dummy Action fixture
// ---------------------------------------------------------------------------

const makeAction = (type = 'TEST_ACTION'): Action =>
  ({ type } as unknown as Action);

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('CHANNEL_NAME', () => {
  it('is the expected string constant', () => {
    expect(CHANNEL_NAME).toBe('zoom-dnd-sync');
  });
});

describe('createSyncChannel – environment unavailable', () => {
  let originalBroadcastChannel: typeof BroadcastChannel | undefined;

  beforeEach(() => {
    originalBroadcastChannel =
      typeof BroadcastChannel !== 'undefined' ? BroadcastChannel : undefined;
    // @ts-expect-error intentionally removing global
    delete globalThis.BroadcastChannel;
  });

  afterEach(() => {
    if (originalBroadcastChannel !== undefined) {
      globalThis.BroadcastChannel = originalBroadcastChannel;
    }
  });

  it('returns null when BroadcastChannel is undefined', () => {
    const result = createSyncChannel();
    expect(result).toBeNull();
  });

  it('logs a warning when BroadcastChannel is undefined', () => {
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
    createSyncChannel();
    expect(warnSpy).toHaveBeenCalledWith(
      expect.stringContaining('BroadcastChannel is unavailable'),
    );
    warnSpy.mockRestore();
  });
});

describe('createSyncChannel – BroadcastChannel constructor throws', () => {
  let originalBroadcastChannel: typeof BroadcastChannel | undefined;

  beforeEach(() => {
    originalBroadcastChannel =
      typeof BroadcastChannel !== 'undefined' ? BroadcastChannel : undefined;
    // @ts-expect-error replacing with a throwing constructor
    globalThis.BroadcastChannel = function () {
      throw new Error('Security error');
    };
  });

  afterEach(() => {
    if (originalBroadcastChannel !== undefined) {
      globalThis.BroadcastChannel = originalBroadcastChannel;
    } else {
      // @ts-expect-error cleanup
      delete globalThis.BroadcastChannel;
    }
  });

  it('returns null when the BroadcastChannel constructor throws', () => {
    const result = createSyncChannel();
    expect(result).toBeNull();
  });

  it('logs a warning when the constructor throws', () => {
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
    createSyncChannel();
    expect(warnSpy).toHaveBeenCalledWith(
      expect.stringContaining('Failed to open BroadcastChannel'),
    );
    warnSpy.mockRestore();
  });
});

describe('createSyncChannel – happy path', () => {
  let mockChannel: MockBroadcastChannel;
  let originalBroadcastChannel: typeof BroadcastChannel | undefined;

  beforeEach(() => {
    originalBroadcastChannel =
      typeof BroadcastChannel !== 'undefined' ? BroadcastChannel : undefined;

    mockChannel = new MockBroadcastChannel(CHANNEL_NAME);
    // @ts-expect-error replacing with mock
    globalThis.BroadcastChannel = vi.fn(() => mockChannel);
  });

  afterEach(() => {
    if (originalBroadcastChannel !== undefined) {
      globalThis.BroadcastChannel = originalBroadcastChannel;
    } else {
      // @ts-expect-error cleanup
      delete globalThis.BroadcastChannel;
    }
    vi.restoreAllMocks();
  });

  it('returns a non-null SyncChannel object', () => {
    const channel = createSyncChannel();
    expect(channel).not.toBeNull();
  });

  it('opens BroadcastChannel with the correct channel name', () => {
    createSyncChannel();
    expect(globalThis.BroadcastChannel).toHaveBeenCalledWith(CHANNEL_NAME);
  });

  it('returned object has publish, subscribe, and close methods', () => {
    const channel = createSyncChannel()!;
    expect(typeof channel.publish).toBe('function');
    expect(typeof channel.subscribe).toBe('function');
    expect(typeof channel.close).toBe('function');
  });

  // -------------------------------------------------------------------------
  // publish
  // -------------------------------------------------------------------------

  describe('publish', () => {
    it('calls postMessage with a versioned envelope containing the action', () => {
      const channel = createSyncChannel()!;
      const action = makeAction('ADD_TOKEN');
      channel.publish(action);
      expect(mockChannel.postMessage).toHaveBeenCalledOnce();
      expect(mockChannel.postMessage).toHaveBeenCalledWith({
        version: 1,
        action,
      });
    });

    it('wraps each action in a message with version 1', () => {
      const channel = createSyncChannel()!;
      const action = makeAction();
      channel.publish(action);
      const [msg] = mockChannel.postMessage.mock.calls[0];
      expect(msg.version).toBe(1);
    });

    it('can publish multiple actions independently', () => {
      const channel = createSyncChannel()!;
      const a1 = makeAction('MOVE');
      const a2 = makeAction('REMOVE');
      channel.publish(a1);
      channel.publish(a2);
      expect(mockChannel.postMessage).toHaveBeenCalledTimes(2);
      expect(mockChannel.postMessage.mock.calls[0][0].action).toBe(a1);
      expect(mockChannel.postMessage.mock.calls[1][0].action).toBe(a2);
    });
  });

  // -------------------------------------------------------------------------
  // subscribe
  // -------------------------------------------------------------------------

  describe('subscribe', () => {
    it('registers a message listener on the underlying channel', () => {
      const channel = createSyncChannel()!;
      channel.subscribe(() => {});
      expect(mockChannel.hasListener('message')).toBe(true);
    });

    it('calls the handler with the action when a valid message arrives', () => {
      const channel = createSyncChannel()!;
      const handler = vi.fn();
      const action = makeAction('DAMAGE');
      channel.subscribe(handler);
      mockChannel.simulateMessage({ version: 1, action });
      expect(handler).toHaveBeenCalledOnce();
      expect(handler).toHaveBeenCalledWith(action);
    });

    it('returns an unsubscribe function', () => {
      const channel = createSyncChannel()!;
      const unsubscribe = channel.subscribe(() => {});
      expect(typeof unsubscribe).toBe('function');
    });

    it('unsubscribe removes the listener so no further events are received', () => {
      const channel = createSyncChannel()!;
      const handler = vi.fn();
      const unsubscribe = channel.subscribe(handler);
      unsubscribe();
      mockChannel.simulateMessage({ version: 1, action: makeAction() });
      expect(handler).not.toHaveBeenCalled();
    });

    it('unsubscribe only removes the specific handler, not others', () => {
      const channel = createSyncChannel()!;
      const handler1 = vi.fn();
      const handler2 = vi.fn();
      const unsubscribe1 = channel.subscribe(handler1);
      channel.subscribe(handler2);
      unsubscribe1();
      mockChannel.simulateMessage({ version: 1, action: makeAction() });
      expect(handler1).not.toHaveBeenCalled();
      expect(handler2).toHaveBeenCalledOnce();
    });

    it('multiple subscribers each receive the same message', () => {
      const channel = createSyncChannel()!;
      const h1 = vi.fn();
      const h2 = vi.fn();
      channel.subscribe(h1);
      channel.subscribe(h2);
      const action = makeAction('HEAL');
      mockChannel.simulateMessage({ version: 1, action });
      expect(h1).toHaveBeenCalledWith(action);
      expect(h2).toHaveBeenCalledWith(action);
    });

    it('calling unsubscribe multiple times does not throw', () => {
      const channel = createSyncChannel()!;
      const unsubscribe = channel.subscribe(() => {});
      expect(() => {
        unsubscribe();
        unsubscribe();
      }).not.toThrow();
    });
  });

  // -------------------------------------------------------------------------
  // subscribe – message validation / filtering
  // -------------------------------------------------------------------------

  describe('subscribe – invalid message filtering', () => {
    it('ignores messages where version is not 1', () => {
      const channel = createSyncChannel()!;
      const handler = vi.fn();
      channel.subscribe(handler);
      mockChannel.simulateMessage({ version: 2, action: makeAction() });
      expect(handler).not.toHaveBeenCalled();
    });

    it('ignores messages where version is missing', () => {
      const channel = createSyncChannel()!;
      const handler = vi.fn();
      channel.subscribe(handler);
      mockChannel.simulateMessage({ action: makeAction() });
      expect(handler).not.toHaveBeenCalled();
    });

    it('ignores messages where action is null', () => {
      const channel = createSyncChannel()!;
      const handler = vi.fn();
      channel.subscribe(handler);
      mockChannel.simulateMessage({ version: 1, action: null });
      expect(handler).not.toHaveBeenCalled();
    });

    it('ignores messages where action is a primitive (string)', () => {
      const channel = createSyncChannel()!;
      const handler = vi.fn();
      channel.subscribe(handler);
      mockChannel.simulateMessage({ version: 1, action: 'not-an-object' });
      expect(handler).not.toHaveBeenCalled();
    });

    it('ignores messages where action is a primitive (number)', () => {
      const channel = createSyncChannel()!;
      const handler = vi.fn();
      channel.subscribe(handler);
      mockChannel.simulateMessage({ version: 1, action: 42 });
      expect(handler).not.toHaveBeenCalled();
    });

    it('ignores messages where data is null', () => {
      const channel = createSyncChannel()!;
      const handler = vi.fn();
      channel.subscribe(handler);
      mockChannel.simulateMessage(null);
      expect(handler).not.toHaveBeenCalled();
    });

    it('ignores messages where data is a primitive', () => {
      const channel = createSyncChannel()!;
      const handler = vi.fn();
      channel.subscribe(handler);
      mockChannel.simulateMessage('raw string');
      expect(handler).not.toHaveBeenCalled();
    });

    it('ignores messages where data is undefined', () => {
      const channel = createSyncChannel()!;
      const handler = vi.fn();
      channel.subscribe(handler);
      mockChannel.simulateMessage(undefined);
      expect(handler).not.toHaveBeenCalled();
    });

    it('ignores completely empty objects', () => {
      const channel = createSyncChannel()!;
      const handler = vi.fn();
      channel.subscribe(handler);
      mockChannel.simulateMessage({});
      expect(handler).not.toHaveBeenCalled();
    });

    it('accepts a valid message after previously receiving invalid ones', () => {
      const channel = createSyncChannel()!;
      const handler = vi.fn();
      channel.subscribe(handler);
      mockChannel.simulateMessage(null);
      mockChannel.simulateMessage({ version: 2, action: makeAction() });
      const validAction = makeAction('VALID');
      mockChannel.simulateMessage({ version: 1, action: validAction });
      expect(handler).toHaveBeenCalledOnce();
      expect(handler).toHaveBeenCalledWith(validAction);
    });
  });

  // -------------------------------------------------------------------------
  // close
  // -------------------------------------------------------------------------

  describe('close', () => {
    it('calls close on the underlying BroadcastChannel', () => {
      const channel = createSyncChannel()!;
      channel.close();
      expect(mockChannel.close).toHaveBeenCalledOnce();
    });

    it('calling close multiple times delegates each call to the underlying channel', () => {
      const channel = createSyncChannel()!;
      channel.close();
      channel.close();
      expect(mockChannel.close).toHaveBeenCalledTimes(2);
    });
  });

  // -------------------------------------------------------------------------
  // Integration: publish + subscribe round-trip is NOT expected via the same
  // channel instance (BroadcastChannel does not echo to itself), but we can
  // verify the wire format used by publish matches what subscribe expects.
  // -------------------------------------------------------------------------

  describe('publish/subscribe wire format compatibility', () => {
    it('the message published by publish satisfies the subscribe validation rules', () => {
      const channel = createSyncChannel()!;
      const handler = vi.fn();
      channel.subscribe(handler);

      // Capture what publish would send, then replay it as an incoming message
      const action = makeAction('SYNC_TEST');
      channel.publish(action);
      const sentMessage = mockChannel.postMessage.mock.calls[0][0];

      // Simulate the same message arriving from the other tab
      mockChannel.simulateMessage(sentMessage);

      expect(handler).toHaveBeenCalledOnce();
      expect(handler).toHaveBeenCalledWith(action);
    });
  });
});
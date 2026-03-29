import React from 'react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, act, waitFor } from '@testing-library/react';
import { useContext } from 'react';
import { EncounterProvider, EncounterContext, EncounterContextValue } from '../src/encounter-state/EncounterProvider';
import { Encounter } from '../src/encounter-state/types';

// ---------------------------------------------------------------------------
// Mocks
// ---------------------------------------------------------------------------

const mockEncounter: Encounter = {
  id: 'test-encounter-1',
  name: 'Test Encounter',
  combatants: [],
  round: 1,
  activeIndex: 0,
};

const mockImportedEncounter: Encounter = {
  id: 'imported-encounter-1',
  name: 'Imported Encounter',
  combatants: [],
  round: 2,
  activeIndex: 0,
};

vi.mock('../src/encounter-state/persistence', () => ({
  saveEncounter: vi.fn(),
  loadEncounter: vi.fn(() => mockEncounter),
  exportJSON: vi.fn(),
  importJSON: vi.fn(),
}));

vi.mock('../src/encounter-state/reducer', () => ({
  encounterReducer: vi.fn((state: Encounter, action: { type: string; payload?: unknown }) => {
    if (action.type === 'LOAD_ENCOUNTER') {
      return (action as { type: string; payload: { encounter: Encounter } }).payload.encounter;
    }
    if (action.type === 'SET_NAME') {
      return { ...state, name: (action as { type: string; payload: { name: string } }).payload.name };
    }
    return state;
  }),
}));

import { saveEncounter, loadEncounter, exportJSON as exportJSONFile, importJSON as importJSONFile } from '../src/encounter-state/persistence';

// ---------------------------------------------------------------------------
// BroadcastChannel mock
// ---------------------------------------------------------------------------

type MessageHandler = (event: MessageEvent) => void;

class MockBroadcastChannel {
  static instances: MockBroadcastChannel[] = [];
  name: string;
  onmessage: MessageHandler | null = null;
  postMessage = vi.fn();
  close = vi.fn();

  constructor(name: string) {
    this.name = name;
    MockBroadcastChannel.instances.push(this);
  }

  simulateMessage(data: unknown) {
    if (this.onmessage) {
      this.onmessage({ data } as MessageEvent);
    }
  }
}

// ---------------------------------------------------------------------------
// Helper consumer component
// ---------------------------------------------------------------------------

function TestConsumer({ onValue }: { onValue: (v: EncounterContextValue) => void }) {
  const value = useContext(EncounterContext);
  onValue(value);
  return <div data-testid="consumer">consumer</div>;
}

// ---------------------------------------------------------------------------
// Setup / teardown
// ---------------------------------------------------------------------------

beforeEach(() => {
  MockBroadcastChannel.instances = [];
  vi.stubGlobal('BroadcastChannel', MockBroadcastChannel);
  vi.stubGlobal('alert', vi.fn());
  vi.mocked(loadEncounter).mockReturnValue(mockEncounter);
  vi.mocked(saveEncounter).mockReset();
  vi.mocked(exportJSONFile).mockReset();
  vi.mocked(importJSONFile).mockReset();
});

afterEach(() => {
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('EncounterProvider', () => {
  describe('context value shape', () => {
    it('provides encounter, dispatch, exportJSON, and importJSON to consumers', () => {
      let capturedValue: EncounterContextValue | null = null;

      render(
        <EncounterProvider>
          <TestConsumer onValue={(v) => { capturedValue = v; }} />
        </EncounterProvider>
      );

      expect(capturedValue).not.toBeNull();
      expect(capturedValue!.encounter).toBeDefined();
      expect(typeof capturedValue!.dispatch).toBe('function');
      expect(typeof capturedValue!.exportJSON).toBe('function');
      expect(typeof capturedValue!.importJSON).toBe('function');
    });

    it('initialises encounter from loadEncounter', () => {
      let capturedValue: EncounterContextValue | null = null;

      render(
        <EncounterProvider>
          <TestConsumer onValue={(v) => { capturedValue = v; }} />
        </EncounterProvider>
      );

      expect(loadEncounter).toHaveBeenCalled();
      expect(capturedValue!.encounter).toEqual(mockEncounter);
    });
  });

  describe('persistence', () => {
    it('saves encounter to localStorage on mount', () => {
      render(
        <EncounterProvider>
          <div />
        </EncounterProvider>
      );

      expect(saveEncounter).toHaveBeenCalledWith(mockEncounter);
    });

    it('saves encounter after each state change', async () => {
      let capturedValue: EncounterContextValue | null = null;

      render(
        <EncounterProvider>
          <TestConsumer onValue={(v) => { capturedValue = v; }} />
        </EncounterProvider>
      );

      act(() => {
        capturedValue!.dispatch({ type: 'SET_NAME', payload: { name: 'New Name' } } as never);
      });

      await waitFor(() => {
        expect(saveEncounter).toHaveBeenCalledTimes(2);
      });
    });
  });

  describe('exportJSON', () => {
    it('calls exportJSONFile with the current encounter', () => {
      let capturedValue: EncounterContextValue | null = null;

      render(
        <EncounterProvider>
          <TestConsumer onValue={(v) => { capturedValue = v; }} />
        </EncounterProvider>
      );

      act(() => {
        capturedValue!.exportJSON();
      });

      expect(exportJSONFile).toHaveBeenCalledWith(mockEncounter);
    });

    it('exports the latest encounter state after a dispatch', async () => {
      const updatedEncounter = { ...mockEncounter, name: 'Updated Name' };
      vi.mocked(importJSONFile).mockResolvedValue(updatedEncounter);

      let capturedValue: EncounterContextValue | null = null;

      render(
        <EncounterProvider>
          <TestConsumer onValue={(v) => { capturedValue = v; }} />
        </EncounterProvider>
      );

      await act(async () => {
        await capturedValue!.importJSON(new File(['{}'], 'test.json'));
      });

      act(() => {
        capturedValue!.exportJSON();
      });

      expect(exportJSONFile).toHaveBeenCalledWith(updatedEncounter);
    });
  });

  describe('importJSON', () => {
    it('dispatches LOAD_ENCOUNTER with the imported encounter on success', async () => {
      vi.mocked(importJSONFile).mockResolvedValue(mockImportedEncounter);

      let capturedValue: EncounterContextValue | null = null;

      render(
        <EncounterProvider>
          <TestConsumer onValue={(v) => { capturedValue = v; }} />
        </EncounterProvider>
      );

      await act(async () => {
        await capturedValue!.importJSON(new File(['{}'], 'encounter.json'));
      });

      expect(importJSONFile).toHaveBeenCalledWith(expect.any(File));
      expect(capturedValue!.encounter).toEqual(mockImportedEncounter);
    });

    it('calls importJSONFile with the provided File object', async () => {
      vi.mocked(importJSONFile).mockResolvedValue(mockImportedEncounter);
      const file = new File(['{"name":"test"}'], 'test.json', { type: 'application/json' });

      let capturedValue: EncounterContextValue | null = null;

      render(
        <EncounterProvider>
          <TestConsumer onValue={(v) => { capturedValue = v; }} />
        </EncounterProvider>
      );

      await act(async () => {
        await capturedValue!.importJSON(file);
      });

      expect(importJSONFile).toHaveBeenCalledWith(file);
    });

    it('shows an alert with the error message when importJSONFile rejects with an Error', async () => {
      vi.mocked(importJSONFile).mockRejectedValue(new Error('Invalid JSON format'));

      let capturedValue: EncounterContextValue | null = null;

      render(
        <EncounterProvider>
          <TestConsumer onValue={(v) => { capturedValue = v; }} />
        </EncounterProvider>
      );

      await act(async () => {
        await capturedValue!.importJSON(new File(['bad'], 'bad.json'));
      });

      expect(vi.mocked(alert)).toHaveBeenCalledWith('Invalid JSON format');
    });

    it('shows a generic alert message when importJSONFile rejects with a non-Error', async () => {
      vi.mocked(importJSONFile).mockRejectedValue('something went wrong');

      let capturedValue: EncounterContextValue | null = null;

      render(
        <EncounterProvider>
          <TestConsumer onValue={(v) => { capturedValue = v; }} />
        </EncounterProvider>
      );

      await act(async () => {
        await capturedValue!.importJSON(new File(['bad'], 'bad.json'));
      });

      expect(vi.mocked(alert)).toHaveBeenCalledWith('Unknown error while importing encounter');
    });

    it('does not update encounter state when import fails', async () => {
      vi.mocked(importJSONFile).mockRejectedValue(new Error('Parse error'));

      let capturedValue: EncounterContextValue | null = null;

      render(
        <EncounterProvider>
          <TestConsumer onValue={(v) => { capturedValue = v; }} />
        </EncounterProvider>
      );

      await act(async () => {
        await capturedValue!.importJSON(new File(['bad'], 'bad.json'));
      });

      expect(capturedValue!.encounter).toEqual(mockEncounter);
    });
  });

  describe('BroadcastChannel sync', () => {
    it('creates a BroadcastChannel on mount', () => {
      render(
        <EncounterProvider>
          <div />
        </EncounterProvider>
      );

      expect(MockBroadcastChannel.instances).toHaveLength(1);
      expect(MockBroadcastChannel.instances[0].name).toBe('zoom-dnd-encounter-sync');
    });

    it('closes the BroadcastChannel on unmount', () => {
      const { unmount } = render(
        <EncounterProvider>
          <div />
        </EncounterProvider>
      );

      const channel = MockBroadcastChannel.instances[0];
      unmount();

      expect(channel.close).toHaveBeenCalled();
    });

    it('broadcasts dispatched actions to other tabs', () => {
      let capturedValue: EncounterContextValue | null = null;

      render(
        <EncounterProvider>
          <TestConsumer onValue={(v) => { capturedValue = v; }} />
        </EncounterProvider>
      );

      const channel = MockBroadcastChannel.instances[0];
      const action = { type: 'SET_NAME', payload: { name: 'Broadcast Name' } };

      act(() => {
        capturedValue!.dispatch(action as never);
      });

      expect(channel.postMessage).toHaveBeenCalledWith(action);
    });

    it('does not broadcast actions that originated from a remote tab', () => {
      let capturedValue: EncounterContextValue | null = null;

      render(
        <EncounterProvider>
          <TestConsumer onValue={(v) => { capturedValue = v; }} />
        </EncounterProvider>
      );

      const channel = MockBroadcastChannel.instances[0];
      const remoteAction = { type: 'SET_NAME', payload: { name: 'Remote Name' } };

      act(() => {
        channel.simulateMessage(remoteAction);
      });

      expect(channel.postMessage).not.toHaveBeenCalled();
    });

    it('applies actions received from remote tabs to local state', async () => {
      let capturedValue: EncounterContextValue | null = null;

      render(
        <EncounterProvider>
          <TestConsumer onValue={(v) => { capturedValue = v; }} />
        </EncounterProvider>
      );

      const channel = MockBroadcastChannel.instances[0];
      const remoteAction = { type: 'SET_NAME', payload: { name: 'Remote Name' } };

      act(() => {
        channel.simulateMessage(remoteAction);
      });

      await waitFor(() => {
        expect(capturedValue!.encounter.name).toBe('Remote Name');
      });
    });

    it('ignores malformed messages from the BroadcastChannel', () => {
      let capturedValue: EncounterContextValue | null = null;

      render(
        <EncounterProvider>
          <TestConsumer onValue={(v) => { capturedValue = v; }} />
        </EncounterProvider>
      );

      const channel = MockBroadcastChannel.instances[0];

      expect(() => {
        act(() => {
          channel.simulateMessage(null);
          channel.simulateMessage({ notAType: 'foo' });
          channel.simulateMessage({ type: 123 });
        });
      }).not.toThrow();

      expect(capturedValue!.encounter).toEqual(mockEncounter);
    });

    it('handles BroadcastChannel constructor throwing gracefully', () => {
      vi.stubGlobal('BroadcastChannel', () => {
        throw new Error('BroadcastChannel not supported');
      });

      const consoleSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});

      expect(() => {
        render(
          <EncounterProvider>
            <div />
          </EncounterProvider>
        );
      }).not.toThrow();

      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining('BroadcastChannel unavailable'),
        expect.any(Error)
      );
    });

    it('continues to function without sync when BroadcastChannel is unavailable', async () => {
      vi.stubGlobal('BroadcastChannel', () => {
        throw new Error('Not supported');
      });
      vi.spyOn(console, 'warn').mockImplementation(() => {});

      let capturedValue: EncounterContextValue | null = null;

      render(
        <EncounterProvider>
          <TestConsumer onValue={(v) => { capturedValue = v; }} />
        </EncounterProvider>
      );

      expect(() => {
        act(() => {
          capturedValue!.dispatch({ type: 'SET_NAME', payload: { name: 'Local Only' } } as never);
        });
      }).not.toThrow();

      await waitFor(() => {
        expect(capturedValue!.encounter.name).toBe('Local Only');
      });
    });

    it('warns but does not throw when postMessage fails', () => {
      let capturedValue: EncounterContextValue | null = null;

      render(
        <EncounterProvider>
          <TestConsumer onValue={(v) => { capturedValue = v; }} />
        </EncounterProvider>
      );

      const channel = MockBroadcastChannel.instances[0];
      channel.postMessage.mockImplementation(() => {
        throw new Error('postMessage failed');
      });

      const consoleSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});

      expect(() => {
        act(() => {
          capturedValue!.dispatch({ type: 'SET_NAME', payload: { name: 'Test' } } as never);
        });
      }).not.toThrow();

      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining('Failed to broadcast action'),
        expect.any(Error)
      );
    });

    it('resets isRemoteUpdate flag after a remote dispatch so subsequent local dispatches are broadcast', () => {
      let capturedValue: EncounterContextValue | null = null;

      render(
        <EncounterProvider>
          <TestConsumer onValue={(v) => { capturedValue = v; }} />
        </EncounterProvider>
      );

      const channel = MockBroadcastChannel.instances[0];
      const remoteAction = { type: 'SET_NAME', payload: { name: 'Remote' } };
      const localAction = { type: 'SET_NAME', payload: { name: 'Local' } };

      act(() => {
        channel.simulateMessage(remoteAction);
      });

      act(() => {
        capturedValue!.dispatch(localAction as never);
      });

      expect(channel.postMessage).toHaveBeenCalledTimes(1);
      expect(channel.postMessage).toHaveBeenCalledWith(localAction);
    });
  });

  describe('children rendering', () => {
    it('renders children inside the provider', () => {
      render(
        <EncounterProvider>
          <div data-testid="child">Hello</div>
        </EncounterProvider>
      );

      expect(screen.getByTestId('child')).toBeInTheDocument();
    });

    it('renders multiple children', () => {
      render(
        <EncounterProvider>
          <div data-testid="child-1">One</div>
          <div data-testid="child-2">Two</div>
        </EncounterProvider>
      );

      expect(screen.getByTestId('child-1')).toBeInTheDocument();
      expect(screen.getByTestId('child-2')).toBeInTheDocument();
    });
  });

  describe('EncounterContext default value', () => {
    it('context default value is null-like when consumed outside provider', () => {
      let capturedValue: EncounterContextValue | null = null;

      function BareConsumer() {
        capturedValue = useContext(EncounterContext);
        return null;
      }

      render(<BareConsumer />);
      expect(capturedValue).toBeNull();
    });
  });
});
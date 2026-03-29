import { describe, it, expect, vi } from 'vitest';
import { renderHook } from '@testing-library/react';
import React from 'react';
import { useEncounter } from '../src/encounter-state/useEncounter';
import { EncounterContext, EncounterContextValue } from '../src/encounter-state/EncounterProvider';

const mockContextValue: EncounterContextValue = {
  state: {
    encounter: null,
    participants: [],
    currentTurn: 0,
    round: 1,
    isActive: false,
  },
  dispatch: vi.fn(),
} as unknown as EncounterContextValue;

function createWrapper(contextValue: EncounterContextValue | null) {
  return function Wrapper({ children }: { children: React.ReactNode }) {
    return React.createElement(
      EncounterContext.Provider,
      { value: contextValue },
      children
    );
  };
}

describe('useEncounter', () => {
  describe('when called within an EncounterProvider', () => {
    it('returns the context value provided by the nearest EncounterContext provider', () => {
      const { result } = renderHook(() => useEncounter(), {
        wrapper: createWrapper(mockContextValue),
      });

      expect(result.current).toBe(mockContextValue);
    });

    it('returns the state object from context', () => {
      const { result } = renderHook(() => useEncounter(), {
        wrapper: createWrapper(mockContextValue),
      });

      expect(result.current.state).toBe(mockContextValue.state);
    });

    it('returns the dispatch function from context', () => {
      const { result } = renderHook(() => useEncounter(), {
        wrapper: createWrapper(mockContextValue),
      });

      expect(result.current.dispatch).toBe(mockContextValue.dispatch);
    });

    it('returns the full EncounterContextValue without modification', () => {
      const detailedContextValue: EncounterContextValue = {
        ...mockContextValue,
        state: {
          encounter: { id: 'enc-1', name: 'Test Encounter' },
          participants: [{ id: 'p1', name: 'Hero', initiative: 20 }],
          currentTurn: 0,
          round: 3,
          isActive: true,
        },
      } as unknown as EncounterContextValue;

      const { result } = renderHook(() => useEncounter(), {
        wrapper: createWrapper(detailedContextValue),
      });

      expect(result.current).toBe(detailedContextValue);
      expect(result.current.state).toEqual(detailedContextValue.state);
    });

    it('reflects updated context value when the provider value changes', () => {
      let contextValue = mockContextValue;

      function DynamicWrapper({ children }: { children: React.ReactNode }) {
        return React.createElement(
          EncounterContext.Provider,
          { value: contextValue },
          children
        );
      }

      const { result, rerender } = renderHook(() => useEncounter(), {
        wrapper: DynamicWrapper,
      });

      expect(result.current).toBe(mockContextValue);

      const updatedContextValue: EncounterContextValue = {
        ...mockContextValue,
        state: {
          ...(mockContextValue as any).state,
          round: 5,
          isActive: true,
        },
      } as unknown as EncounterContextValue;

      contextValue = updatedContextValue;
      rerender();

      expect(result.current).toBe(updatedContextValue);
    });

    it('dispatch function returned is callable', () => {
      const dispatchMock = vi.fn();
      const contextWithDispatch: EncounterContextValue = {
        ...mockContextValue,
        dispatch: dispatchMock,
      } as unknown as EncounterContextValue;

      const { result } = renderHook(() => useEncounter(), {
        wrapper: createWrapper(contextWithDispatch),
      });

      const testAction = { type: 'START_ENCOUNTER' };
      result.current.dispatch(testAction as never);

      expect(dispatchMock).toHaveBeenCalledOnce();
      expect(dispatchMock).toHaveBeenCalledWith(testAction);
    });
  });

  describe('when called outside an EncounterProvider', () => {
    it('throws an error when no provider is present', () => {
      const { result } = renderHook(() => {
        try {
          return useEncounter();
        } catch (e) {
          return e;
        }
      });

      expect(result.current).toBeInstanceOf(Error);
    });

    it('throws an error with a descriptive message when no provider is present', () => {
      expect(() => {
        renderHook(() => useEncounter());
      }).toThrow('useEncounter must be called within an EncounterProvider');
    });

    it('throws an Error instance (not just any thrown value) when context is null', () => {
      const { result } = renderHook(() => {
        try {
          return useEncounter();
        } catch (e) {
          return e;
        }
      });

      expect(result.current).toBeInstanceOf(Error);
      expect((result.current as Error).message).toBe(
        'useEncounter must be called within an EncounterProvider'
      );
    });

    it('throws when context value is explicitly null via provider', () => {
      expect(() => {
        renderHook(() => useEncounter(), {
          wrapper: createWrapper(null),
        });
      }).toThrow('useEncounter must be called within an EncounterProvider');
    });

    it('error message helps developers identify the missing provider', () => {
      let thrownError: Error | null = null;

      try {
        renderHook(() => useEncounter());
      } catch (e) {
        thrownError = e as Error;
      }

      expect(thrownError).not.toBeNull();
      expect(thrownError?.message).toContain('useEncounter');
      expect(thrownError?.message).toContain('EncounterProvider');
    });
  });
});
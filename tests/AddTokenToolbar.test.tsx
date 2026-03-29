import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { AddTokenToolbar } from '../src/dm-panel/AddTokenToolbar';

const mockDispatch = vi.fn();

vi.mock("../src/encounter-state/useEncounter", () => ({
  useEncounter: () => ({ state: { tokens: [] }, dispatch: mockDispatch }),
}));

describe('AddTokenToolbar', () => {
  it('renders without crashing', () => {
    render(<AddTokenToolbar />);
    expect(document.body.querySelector('button')).not.toBeNull();
  });
});

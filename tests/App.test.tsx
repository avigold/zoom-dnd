import { render, screen } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import App from '../src/app-shell/App';

vi.mock('../src/encounter-state/EncounterProvider', () => ({
  EncounterProvider: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="encounter-provider">{children}</div>
  ),
}));

vi.mock('../src/app-shell/BattleMapPage', () => ({
  default: () => <div data-testid="battle-map-page">BattleMapPage</div>,
}));

vi.mock('../src/app-shell/DMPage', () => ({
  default: () => <div data-testid="dm-page">DMPage</div>,
}));

function setWindowLocation(path: string) {
  window.history.pushState({}, '', path);
}

describe('App', () => {
  beforeEach(() => {
    setWindowLocation('/');
  });

  describe('EncounterProvider wrapping', () => {
    it('renders EncounterProvider as a wrapper around the application', () => {
      render(<App />);
      expect(screen.getByTestId('encounter-provider')).toBeInTheDocument();
    });

    it('renders router content inside EncounterProvider', () => {
      render(<App />);
      const provider = screen.getByTestId('encounter-provider');
      expect(provider).toContainElement(screen.getByTestId('battle-map-page'));
    });
  });

  describe('routing', () => {
    it('renders BattleMapPage at the root path "/"', () => {
      setWindowLocation('/');
      render(<App />);
      expect(screen.getByTestId('battle-map-page')).toBeInTheDocument();
    });

    it('does not render DMPage at the root path "/"', () => {
      setWindowLocation('/');
      render(<App />);
      expect(screen.queryByTestId('dm-page')).not.toBeInTheDocument();
    });

    it('renders DMPage at the "/dm" path', () => {
      setWindowLocation('/dm');
      render(<App />);
      expect(screen.getByTestId('dm-page')).toBeInTheDocument();
    });

    it('does not render BattleMapPage at the "/dm" path', () => {
      setWindowLocation('/dm');
      render(<App />);
      expect(screen.queryByTestId('battle-map-page')).not.toBeInTheDocument();
    });

    it('renders nothing matched for an unknown path', () => {
      setWindowLocation('/unknown-route');
      render(<App />);
      expect(screen.queryByTestId('battle-map-page')).not.toBeInTheDocument();
      expect(screen.queryByTestId('dm-page')).not.toBeInTheDocument();
    });
  });

  describe('component structure', () => {
    it('renders without crashing', () => {
      expect(() => render(<App />)).not.toThrow();
    });

    it('renders a single root element', () => {
      const { container } = render(<App />);
      expect(container.firstChild).not.toBeNull();
    });

    it('BattleMapPage content is visible at root path', () => {
      setWindowLocation('/');
      render(<App />);
      expect(screen.getByText('BattleMapPage')).toBeInTheDocument();
    });

    it('DMPage content is visible at /dm path', () => {
      setWindowLocation('/dm');
      render(<App />);
      expect(screen.getByText('DMPage')).toBeInTheDocument();
    });
  });

  describe('EncounterProvider is present for all routes', () => {
    it('wraps EncounterProvider around BattleMapPage route', () => {
      setWindowLocation('/');
      render(<App />);
      const provider = screen.getByTestId('encounter-provider');
      expect(provider).toBeInTheDocument();
      expect(screen.getByTestId('battle-map-page')).toBeInTheDocument();
    });

    it('wraps EncounterProvider around DMPage route', () => {
      setWindowLocation('/dm');
      render(<App />);
      const provider = screen.getByTestId('encounter-provider');
      expect(provider).toBeInTheDocument();
      expect(screen.getByTestId('dm-page')).toBeInTheDocument();
    });

    it('EncounterProvider contains DMPage when on /dm route', () => {
      setWindowLocation('/dm');
      render(<App />);
      const provider = screen.getByTestId('encounter-provider');
      expect(provider).toContainElement(screen.getByTestId('dm-page'));
    });
  });
});
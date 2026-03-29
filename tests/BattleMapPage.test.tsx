import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import BattleMapPage from '../src/app-shell/BattleMapPage';

vi.mock('../src/hex-canvas/HexCanvas', () => ({
  HexCanvas: () => <canvas data-testid="hex-canvas" />,
}));

vi.mock('../src/dm-panel/AddTokenToolbar', () => ({
  AddTokenToolbar: () => <div data-testid="add-token-toolbar" />,
}));

describe('BattleMapPage', () => {
  let windowOpenSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    windowOpenSpy = vi.spyOn(window, 'open').mockImplementation(() => null);
  });

  afterEach(() => {
    windowOpenSpy.mockRestore();
  });

  describe('initial render', () => {
    it('renders the hex canvas', () => {
      render(<BattleMapPage />);
      expect(screen.getByTestId('hex-canvas')).toBeInTheDocument();
    });

    it('renders the AddTokenToolbar by default', () => {
      render(<BattleMapPage />);
      expect(screen.getByTestId('add-token-toolbar')).toBeInTheDocument();
    });

    it('renders the toggle button with "Hide Toolbar" text when toolbar is visible', () => {
      render(<BattleMapPage />);
      expect(screen.getByRole('button', { name: 'Hide Toolbar' })).toBeInTheDocument();
    });

    it('renders the Open DM Panel button', () => {
      render(<BattleMapPage />);
      expect(screen.getByRole('button', { name: 'Open DM Panel' })).toBeInTheDocument();
    });

    it('renders a full-screen container with overflow hidden', () => {
      const { container } = render(<BattleMapPage />);
      const root = container.firstChild as HTMLElement;
      expect(root.className).toMatch(/w-screen/);
      expect(root.className).toMatch(/h-screen/);
      expect(root.className).toMatch(/overflow-hidden/);
    });
  });

  describe('toolbar visibility toggle', () => {
    it('hides the AddTokenToolbar when the toggle button is clicked', () => {
      render(<BattleMapPage />);
      const toggleButton = screen.getByRole('button', { name: 'Hide Toolbar' });
      fireEvent.click(toggleButton);
      expect(screen.queryByTestId('add-token-toolbar')).not.toBeInTheDocument();
    });

    it('shows "Show Toolbar" button text after hiding the toolbar', () => {
      render(<BattleMapPage />);
      fireEvent.click(screen.getByRole('button', { name: 'Hide Toolbar' }));
      expect(screen.getByRole('button', { name: 'Show Toolbar' })).toBeInTheDocument();
    });

    it('shows the AddTokenToolbar again when toggle is clicked a second time', () => {
      render(<BattleMapPage />);
      const toggleButton = screen.getByRole('button', { name: 'Hide Toolbar' });
      fireEvent.click(toggleButton);
      fireEvent.click(screen.getByRole('button', { name: 'Show Toolbar' }));
      expect(screen.getByTestId('add-token-toolbar')).toBeInTheDocument();
    });

    it('shows "Hide Toolbar" button text after re-showing the toolbar', () => {
      render(<BattleMapPage />);
      fireEvent.click(screen.getByRole('button', { name: 'Hide Toolbar' }));
      fireEvent.click(screen.getByRole('button', { name: 'Show Toolbar' }));
      expect(screen.getByRole('button', { name: 'Hide Toolbar' })).toBeInTheDocument();
    });

    it('toggles toolbar visibility multiple times correctly', () => {
      render(<BattleMapPage />);

      // visible -> hidden
      fireEvent.click(screen.getByRole('button', { name: 'Hide Toolbar' }));
      expect(screen.queryByTestId('add-token-toolbar')).not.toBeInTheDocument();

      // hidden -> visible
      fireEvent.click(screen.getByRole('button', { name: 'Show Toolbar' }));
      expect(screen.getByTestId('add-token-toolbar')).toBeInTheDocument();

      // visible -> hidden again
      fireEvent.click(screen.getByRole('button', { name: 'Hide Toolbar' }));
      expect(screen.queryByTestId('add-token-toolbar')).not.toBeInTheDocument();
    });

    it('does not remove the HexCanvas when toolbar is hidden', () => {
      render(<BattleMapPage />);
      fireEvent.click(screen.getByRole('button', { name: 'Hide Toolbar' }));
      expect(screen.getByTestId('hex-canvas')).toBeInTheDocument();
    });

    it('does not remove the Open DM Panel button when toolbar is hidden', () => {
      render(<BattleMapPage />);
      fireEvent.click(screen.getByRole('button', { name: 'Hide Toolbar' }));
      expect(screen.getByRole('button', { name: 'Open DM Panel' })).toBeInTheDocument();
    });
  });

  describe('Open DM Panel button', () => {
    it('calls window.open with /dm and dm-panel when clicked', () => {
      render(<BattleMapPage />);
      fireEvent.click(screen.getByRole('button', { name: 'Open DM Panel' }));
      expect(windowOpenSpy).toHaveBeenCalledOnce();
      expect(windowOpenSpy).toHaveBeenCalledWith('/dm', 'dm-panel');
    });

    it('calls window.open each time the button is clicked', () => {
      render(<BattleMapPage />);
      const dmButton = screen.getByRole('button', { name: 'Open DM Panel' });
      fireEvent.click(dmButton);
      fireEvent.click(dmButton);
      expect(windowOpenSpy).toHaveBeenCalledTimes(2);
    });

    it('calls window.open with the correct arguments regardless of toolbar visibility', () => {
      render(<BattleMapPage />);
      fireEvent.click(screen.getByRole('button', { name: 'Hide Toolbar' }));
      fireEvent.click(screen.getByRole('button', { name: 'Open DM Panel' }));
      expect(windowOpenSpy).toHaveBeenCalledWith('/dm', 'dm-panel');
    });
  });

  describe('layout structure', () => {
    it('positions the toolbar overlay at the top of the screen', () => {
      render(<BattleMapPage />);
      const toolbar = screen.getByTestId('add-token-toolbar');
      const toolbarWrapper = toolbar.parentElement as HTMLElement;
      expect(toolbarWrapper.className).toMatch(/absolute/);
      expect(toolbarWrapper.className).toMatch(/top-0/);
    });

    it('positions the action buttons at the bottom right', () => {
      render(<BattleMapPage />);
      const toggleButton = screen.getByRole('button', { name: 'Hide Toolbar' });
      const buttonContainer = toggleButton.parentElement as HTMLElement;
      expect(buttonContainer.className).toMatch(/absolute/);
      expect(buttonContainer.className).toMatch(/bottom-4/);
      expect(buttonContainer.className).toMatch(/right-4/);
    });

    it('renders the toolbar overlay with a higher z-index than the base layer', () => {
      render(<BattleMapPage />);
      const toolbar = screen.getByTestId('add-token-toolbar');
      const toolbarWrapper = toolbar.parentElement as HTMLElement;
      expect(toolbarWrapper.className).toMatch(/z-10/);
    });

    it('renders the button container with a higher z-index than the base layer', () => {
      render(<BattleMapPage />);
      const toggleButton = screen.getByRole('button', { name: 'Hide Toolbar' });
      const buttonContainer = toggleButton.parentElement as HTMLElement;
      expect(buttonContainer.className).toMatch(/z-10/);
    });

    it('uses relative positioning on the root container', () => {
      const { container } = render(<BattleMapPage />);
      const root = container.firstChild as HTMLElement;
      expect(root.className).toMatch(/relative/);
    });
  });
});
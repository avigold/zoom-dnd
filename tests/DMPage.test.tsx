import { render, screen } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import DMPage from '../src/app-shell/DMPage';

vi.mock('../src/hex-canvas/HexCanvas', () => ({
  HexCanvas: () => <div data-testid="hex-canvas">HexCanvas</div>,
}));

vi.mock('../src/dm-panel/DMPanel', () => ({
  default: () => <div data-testid="dm-panel">DMPanel</div>,
}));

describe('DMPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders without crashing', () => {
    render(<DMPage />);
    expect(screen.getByTestId('hex-canvas')).toBeDefined();
    expect(screen.getByTestId('dm-panel')).toBeDefined();
  });

  it('renders HexCanvas component', () => {
    render(<DMPage />);
    expect(screen.getByTestId('hex-canvas')).toBeDefined();
  });

  it('renders DMPanel component', () => {
    render(<DMPage />);
    expect(screen.getByTestId('dm-panel')).toBeDefined();
  });

  it('renders both HexCanvas and DMPanel in the same layout', () => {
    render(<DMPage />);
    const hexCanvas = screen.getByTestId('hex-canvas');
    const dmPanel = screen.getByTestId('dm-panel');
    expect(hexCanvas).toBeDefined();
    expect(dmPanel).toBeDefined();
  });

  it('renders the outer container with full-screen flex layout classes', () => {
    const { container } = render(<DMPage />);
    const outerDiv = container.firstChild as HTMLElement;
    expect(outerDiv.classList.contains('flex')).toBe(true);
    expect(outerDiv.classList.contains('w-screen')).toBe(true);
    expect(outerDiv.classList.contains('h-screen')).toBe(true);
    expect(outerDiv.classList.contains('overflow-hidden')).toBe(true);
    expect(outerDiv.classList.contains('bg-gray-900')).toBe(true);
  });

  it('renders the HexCanvas in a flex-grow container', () => {
    const { container } = render(<DMPage />);
    const outerDiv = container.firstChild as HTMLElement;
    const hexCanvasWrapper = outerDiv.firstChild as HTMLElement;
    expect(hexCanvasWrapper.classList.contains('flex-grow')).toBe(true);
    expect(hexCanvasWrapper.classList.contains('relative')).toBe(true);
    expect(hexCanvasWrapper.classList.contains('overflow-hidden')).toBe(true);
  });

  it('renders the DMPanel in a fixed-width sidebar', () => {
    const { container } = render(<DMPage />);
    const outerDiv = container.firstChild as HTMLElement;
    const dmPanelWrapper = outerDiv.lastChild as HTMLElement;
    expect(dmPanelWrapper.classList.contains('w-96')).toBe(true);
    expect(dmPanelWrapper.classList.contains('flex-shrink-0')).toBe(true);
    expect(dmPanelWrapper.classList.contains('overflow-y-auto')).toBe(true);
    expect(dmPanelWrapper.classList.contains('bg-gray-800')).toBe(true);
    expect(dmPanelWrapper.classList.contains('border-l')).toBe(true);
    expect(dmPanelWrapper.classList.contains('border-gray-700')).toBe(true);
  });

  it('places HexCanvas on the left and DMPanel on the right', () => {
    const { container } = render(<DMPage />);
    const outerDiv = container.firstChild as HTMLElement;
    const children = outerDiv.childNodes;
    expect(children.length).toBe(2);
    const leftPanel = children[0] as HTMLElement;
    const rightPanel = children[1] as HTMLElement;
    expect(leftPanel.querySelector('[data-testid="hex-canvas"]')).not.toBeNull();
    expect(rightPanel.querySelector('[data-testid="dm-panel"]')).not.toBeNull();
  });

  it('does not render DMPanel inside the HexCanvas container', () => {
    const { container } = render(<DMPage />);
    const outerDiv = container.firstChild as HTMLElement;
    const hexCanvasWrapper = outerDiv.firstChild as HTMLElement;
    expect(hexCanvasWrapper.querySelector('[data-testid="dm-panel"]')).toBeNull();
  });

  it('does not render HexCanvas inside the DMPanel container', () => {
    const { container } = render(<DMPage />);
    const outerDiv = container.firstChild as HTMLElement;
    const dmPanelWrapper = outerDiv.lastChild as HTMLElement;
    expect(dmPanelWrapper.querySelector('[data-testid="hex-canvas"]')).toBeNull();
  });

  it('renders a single root element', () => {
    const { container } = render(<DMPage />);
    expect(container.childElementCount).toBe(1);
  });

  it('renders exactly two child panels inside the root container', () => {
    const { container } = render(<DMPage />);
    const outerDiv = container.firstChild as HTMLElement;
    expect(outerDiv.childElementCount).toBe(2);
  });
});
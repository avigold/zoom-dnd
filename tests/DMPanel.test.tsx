import { render, screen } from "@testing-library/react";
import { describe, it, expect, vi } from "vitest";
import DMPanel from "../src/dm-panel/DMPanel";

vi.mock("../src/dm-panel/AddTokenToolbar", () => ({
  AddTokenToolbar: () => <div data-testid="add-token-toolbar">AddTokenToolbar</div>,
}));

vi.mock("../src/dm-panel/InitiativeTracker", () => ({
  InitiativeTracker: () => <div data-testid="initiative-tracker">InitiativeTracker</div>,
}));

vi.mock("../src/dm-panel/MonsterHPTracker", () => ({
  MonsterHPTracker: () => <div data-testid="monster-hp-tracker">MonsterHPTracker</div>,
}));

vi.mock("../src/dm-panel/NotesEditor", () => ({
  NotesEditor: () => <div data-testid="notes-editor">NotesEditor</div>,
}));

describe("DMPanel", () => {
  it("renders without crashing", () => {
    render(<DMPanel />);
  });

  it("renders the AddTokenToolbar component", () => {
    render(<DMPanel />);
    expect(screen.getByTestId("add-token-toolbar")).toBeInTheDocument();
  });

  it("renders the InitiativeTracker component", () => {
    render(<DMPanel />);
    expect(screen.getByTestId("initiative-tracker")).toBeInTheDocument();
  });

  it("renders the MonsterHPTracker component", () => {
    render(<DMPanel />);
    expect(screen.getByTestId("monster-hp-tracker")).toBeInTheDocument();
  });

  it("renders the NotesEditor component", () => {
    render(<DMPanel />);
    expect(screen.getByTestId("notes-editor")).toBeInTheDocument();
  });

  it("renders the Initiative section heading", () => {
    render(<DMPanel />);
    expect(screen.getByText("Initiative")).toBeInTheDocument();
  });

  it("renders the Monster HP section heading", () => {
    render(<DMPanel />);
    expect(screen.getByText("Monster HP")).toBeInTheDocument();
  });

  it("renders the Notes section heading", () => {
    render(<DMPanel />);
    expect(screen.getByText("Notes")).toBeInTheDocument();
  });

  it("renders all four child components together", () => {
    render(<DMPanel />);
    expect(screen.getByTestId("add-token-toolbar")).toBeInTheDocument();
    expect(screen.getByTestId("initiative-tracker")).toBeInTheDocument();
    expect(screen.getByTestId("monster-hp-tracker")).toBeInTheDocument();
    expect(screen.getByTestId("notes-editor")).toBeInTheDocument();
  });

  it("renders all three section headings together", () => {
    render(<DMPanel />);
    expect(screen.getByText("Initiative")).toBeInTheDocument();
    expect(screen.getByText("Monster HP")).toBeInTheDocument();
    expect(screen.getByText("Notes")).toBeInTheDocument();
  });

  it("renders the outer container with expected layout classes", () => {
    const { container } = render(<DMPanel />);
    const outerDiv = container.firstChild as HTMLElement;
    expect(outerDiv).toHaveClass("flex");
    expect(outerDiv).toHaveClass("flex-col");
    expect(outerDiv).toHaveClass("h-full");
    expect(outerDiv).toHaveClass("overflow-y-auto");
  });

  it("renders the outer container with dark background styling", () => {
    const { container } = render(<DMPanel />);
    const outerDiv = container.firstChild as HTMLElement;
    expect(outerDiv).toHaveClass("bg-gray-900");
  });

  it("renders the outer container with fixed width classes", () => {
    const { container } = render(<DMPanel />);
    const outerDiv = container.firstChild as HTMLElement;
    expect(outerDiv).toHaveClass("w-72");
  });

  it("renders AddTokenToolbar before InitiativeTracker in the DOM", () => {
    render(<DMPanel />);
    const toolbar = screen.getByTestId("add-token-toolbar");
    const tracker = screen.getByTestId("initiative-tracker");
    expect(
      toolbar.compareDocumentPosition(tracker) & Node.DOCUMENT_POSITION_FOLLOWING
    ).toBeTruthy();
  });

  it("renders InitiativeTracker before MonsterHPTracker in the DOM", () => {
    render(<DMPanel />);
    const initiative = screen.getByTestId("initiative-tracker");
    const monsterHP = screen.getByTestId("monster-hp-tracker");
    expect(
      initiative.compareDocumentPosition(monsterHP) & Node.DOCUMENT_POSITION_FOLLOWING
    ).toBeTruthy();
  });

  it("renders MonsterHPTracker before NotesEditor in the DOM", () => {
    render(<DMPanel />);
    const monsterHP = screen.getByTestId("monster-hp-tracker");
    const notes = screen.getByTestId("notes-editor");
    expect(
      monsterHP.compareDocumentPosition(notes) & Node.DOCUMENT_POSITION_FOLLOWING
    ).toBeTruthy();
  });

  it("renders Initiative heading before InitiativeTracker in the DOM", () => {
    render(<DMPanel />);
    const heading = screen.getByText("Initiative");
    const tracker = screen.getByTestId("initiative-tracker");
    expect(
      heading.compareDocumentPosition(tracker) & Node.DOCUMENT_POSITION_FOLLOWING
    ).toBeTruthy();
  });

  it("renders Monster HP heading before MonsterHPTracker in the DOM", () => {
    render(<DMPanel />);
    const heading = screen.getByText("Monster HP");
    const tracker = screen.getByTestId("monster-hp-tracker");
    expect(
      heading.compareDocumentPosition(tracker) & Node.DOCUMENT_POSITION_FOLLOWING
    ).toBeTruthy();
  });

  it("renders Notes heading before NotesEditor in the DOM", () => {
    render(<DMPanel />);
    const heading = screen.getByText("Notes");
    const editor = screen.getByTestId("notes-editor");
    expect(
      heading.compareDocumentPosition(editor) & Node.DOCUMENT_POSITION_FOLLOWING
    ).toBeTruthy();
  });

  it("section headings are rendered as h2 elements", () => {
    render(<DMPanel />);
    const headings = screen.getAllByRole("heading", { level: 2 });
    expect(headings).toHaveLength(3);
  });

  it("section headings have correct text content", () => {
    render(<DMPanel />);
    const headings = screen.getAllByRole("heading", { level: 2 });
    const headingTexts = headings.map((h) => h.textContent);
    expect(headingTexts).toContain("Initiative");
    expect(headingTexts).toContain("Monster HP");
    expect(headingTexts).toContain("Notes");
  });

  it("accepts no props and renders correctly", () => {
    // DMPanel takes no props — verify it renders fine without any
    expect(() => render(<DMPanel />)).not.toThrow();
  });

  it("renders a single root element", () => {
    const { container } = render(<DMPanel />);
    expect(container.children).toHaveLength(1);
  });
});
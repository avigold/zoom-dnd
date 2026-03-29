import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MonsterHPTracker, HP_STATUS_COLORS } from "../src/dm-panel/MonsterHPTracker";

// Mock useEncounter
const mockDispatch = vi.fn();
const mockUseEncounter = vi.fn();

vi.mock("../src/encounter-state/useEncounter", () => ({
  useEncounter: () => mockUseEncounter(),
}));

function makeMonster(overrides: Record<string, unknown> = {}) {
  return {
    id: "monster-1",
    name: "Goblin",
    type: "monster",
    hp: 10,
    maxHp: 10,
    ...overrides,
  };
}

function makeState(tokens: unknown[] = []) {
  return { tokens };
}

beforeEach(() => {
  vi.clearAllMocks();
  mockUseEncounter.mockReturnValue({
    state: makeState([]),
    dispatch: mockDispatch,
  });
});

// ─── HP_STATUS_COLORS constant ────────────────────────────────────────────────

describe("HP_STATUS_COLORS", () => {
  it("exports colour classes for all four status tiers", () => {
    expect(HP_STATUS_COLORS.healthy).toBe("bg-green-500");
    expect(HP_STATUS_COLORS.bloodied).toBe("bg-yellow-400");
    expect(HP_STATUS_COLORS.critical).toBe("bg-red-500");
    expect(HP_STATUS_COLORS.dead).toBe("bg-gray-600");
  });
});

// ─── Empty state ──────────────────────────────────────────────────────────────

describe("MonsterHPTracker – empty encounter", () => {
  it("shows a placeholder message when there are no monsters", () => {
    render(<MonsterHPTracker />);
    expect(screen.getByText(/no monsters in encounter/i)).toBeInTheDocument();
  });

  it("does not render any monster rows when there are no monster tokens", () => {
    render(<MonsterHPTracker />);
    expect(screen.queryByRole("button", { name: /dmg/i })).toBeNull();
  });

  it("ignores non-monster tokens and still shows the empty message", () => {
    mockUseEncounter.mockReturnValue({
      state: makeState([
        { id: "p1", name: "Hero", type: "player", hp: 20, maxHp: 20 },
      ]),
      dispatch: mockDispatch,
    });
    render(<MonsterHPTracker />);
    expect(screen.getByText(/no monsters in encounter/i)).toBeInTheDocument();
  });
});

// ─── Rendering monster rows ───────────────────────────────────────────────────

describe("MonsterHPTracker – rendering monster rows", () => {
  it("renders the monster name", () => {
    mockUseEncounter.mockReturnValue({
      state: makeState([makeMonster({ name: "Orc" })]),
      dispatch: mockDispatch,
    });
    render(<MonsterHPTracker />);
    expect(screen.getByText("Orc")).toBeInTheDocument();
  });

  it("renders current and max HP", () => {
    mockUseEncounter.mockReturnValue({
      state: makeState([makeMonster({ hp: 7, maxHp: 20 })]),
      dispatch: mockDispatch,
    });
    render(<MonsterHPTracker />);
    expect(screen.getByText("7")).toBeInTheDocument();
    expect(screen.getByText("20")).toBeInTheDocument();
  });

  it("renders multiple monsters", () => {
    mockUseEncounter.mockReturnValue({
      state: makeState([
        makeMonster({ id: "m1", name: "Goblin" }),
        makeMonster({ id: "m2", name: "Troll" }),
      ]),
      dispatch: mockDispatch,
    });
    render(<MonsterHPTracker />);
    expect(screen.getByText("Goblin")).toBeInTheDocument();
    expect(screen.getByText("Troll")).toBeInTheDocument();
  });

  it("renders Dmg and Heal buttons for each monster", () => {
    mockUseEncounter.mockReturnValue({
      state: makeState([
        makeMonster({ id: "m1", name: "Goblin" }),
        makeMonster({ id: "m2", name: "Troll" }),
      ]),
      dispatch: mockDispatch,
    });
    render(<MonsterHPTracker />);
    expect(screen.getAllByRole("button", { name: /dmg/i })).toHaveLength(2);
    expect(screen.getAllByRole("button", { name: /heal/i })).toHaveLength(2);
  });

  it("renders DMG and Heal inputs with correct placeholders", () => {
    mockUseEncounter.mockReturnValue({
      state: makeState([makeMonster()]),
      dispatch: mockDispatch,
    });
    render(<MonsterHPTracker />);
    expect(screen.getByPlaceholderText("DMG")).toBeInTheDocument();
    expect(screen.getByPlaceholderText("Heal")).toBeInTheDocument();
  });
});

// ─── HP status colour coding ──────────────────────────────────────────────────

describe("MonsterHPTracker – HP status colour coding", () => {
  it("applies green border for a healthy monster (≥50% HP)", () => {
    mockUseEncounter.mockReturnValue({
      state: makeState([makeMonster({ hp: 10, maxHp: 10 })]),
      dispatch: mockDispatch,
    });
    const { container } = render(<MonsterHPTracker />);
    const row = container.querySelector(".border-green-500");
    expect(row).not.toBeNull();
  });

  it("applies yellow border for a bloodied monster (25–49% HP)", () => {
    mockUseEncounter.mockReturnValue({
      state: makeState([makeMonster({ hp: 4, maxHp: 10 })]),
      dispatch: mockDispatch,
    });
    const { container } = render(<MonsterHPTracker />);
    expect(container.querySelector(".border-yellow-400")).not.toBeNull();
  });

  it("applies red border for a critical monster (<25% HP)", () => {
    mockUseEncounter.mockReturnValue({
      state: makeState([makeMonster({ hp: 2, maxHp: 10 })]),
      dispatch: mockDispatch,
    });
    const { container } = render(<MonsterHPTracker />);
    expect(container.querySelector(".border-red-500")).not.toBeNull();
  });

  it("applies gray border for a dead monster (0 HP)", () => {
    mockUseEncounter.mockReturnValue({
      state: makeState([makeMonster({ hp: 0, maxHp: 10 })]),
      dispatch: mockDispatch,
    });
    const { container } = render(<MonsterHPTracker />);
    expect(container.querySelector(".border-gray-600")).not.toBeNull();
  });

  it("applies green HP bar for healthy status", () => {
    mockUseEncounter.mockReturnValue({
      state: makeState([makeMonster({ hp: 10, maxHp: 10 })]),
      dispatch: mockDispatch,
    });
    const { container } = render(<MonsterHPTracker />);
    expect(container.querySelector(".bg-green-500")).not.toBeNull();
  });

  it("applies yellow HP bar for bloodied status", () => {
    mockUseEncounter.mockReturnValue({
      state: makeState([makeMonster({ hp: 4, maxHp: 10 })]),
      dispatch: mockDispatch,
    });
    const { container } = render(<MonsterHPTracker />);
    expect(container.querySelector(".bg-yellow-400")).not.toBeNull();
  });

  it("applies red HP bar for critical status", () => {
    mockUseEncounter.mockReturnValue({
      state: makeState([makeMonster({ hp: 2, maxHp: 10 })]),
      dispatch: mockDispatch,
    });
    const { container } = render(<MonsterHPTracker />);
    expect(container.querySelector(".bg-red-500")).not.toBeNull();
  });

  it("applies gray HP bar for dead status", () => {
    mockUseEncounter.mockReturnValue({
      state: makeState([makeMonster({ hp: 0, maxHp: 10 })]),
      dispatch: mockDispatch,
    });
    const { container } = render(<MonsterHPTracker />);
    expect(container.querySelector(".bg-gray-600")).not.toBeNull();
  });

  it("treats exactly 50% HP as healthy", () => {
    mockUseEncounter.mockReturnValue({
      state: makeState([makeMonster({ hp: 5, maxHp: 10 })]),
      dispatch: mockDispatch,
    });
    const { container } = render(<MonsterHPTracker />);
    expect(container.querySelector(".border-green-500")).not.toBeNull();
  });

  it("treats exactly 25% HP as bloodied", () => {
    mockUseEncounter.mockReturnValue({
      state: makeState([makeMonster({ hp: 25, maxHp: 100 })]),
      dispatch: mockDispatch,
    });
    const { container } = render(<MonsterHPTracker />);
    expect(container.querySelector(".border-yellow-400")).not.toBeNull();
  });
});

// ─── Dead state ───────────────────────────────────────────────────────────────

describe("MonsterHPTracker – dead state", () => {
  it("shows a 'Dead' overlay when HP is 0", () => {
    mockUseEncounter.mockReturnValue({
      state: makeState([makeMonster({ hp: 0, maxHp: 10 })]),
      dispatch: mockDispatch,
    });
    render(<MonsterHPTracker />);
    expect(screen.getByText(/dead/i)).toBeInTheDocument();
  });

  it("does not show 'Dead' overlay for a living monster", () => {
    mockUseEncounter.mockReturnValue({
      state: makeState([makeMonster({ hp: 5, maxHp: 10 })]),
      dispatch: mockDispatch,
    });
    render(<MonsterHPTracker />);
    expect(screen.queryByText(/^dead$/i)).toBeNull();
  });

  it("disables the Dmg button for a dead monster", () => {
    mockUseEncounter.mockReturnValue({
      state: makeState([makeMonster({ hp: 0, maxHp: 10 })]),
      dispatch: mockDispatch,
    });
    render(<MonsterHPTracker />);
    const dmgButton = screen.getByRole("button", { name: /dmg/i });
    expect(dmgButton).toBeDisabled();
  });

  it("disables the DMG input for a dead monster", () => {
    mockUseEncounter.mockReturnValue({
      state: makeState([makeMonster({ hp: 0, maxHp: 10 })]),
      dispatch: mockDispatch,
    });
    render(<MonsterHPTracker />);
    const dmgInput = screen.getByPlaceholderText("DMG");
    expect(dmgInput).toBeDisabled();
  });

  it("does not disable the Heal button for a dead monster", () => {
    mockUseEncounter.mockReturnValue({
      state: makeState([makeMonster({ hp: 0, maxHp: 10 })]),
      dispatch: mockDispatch,
    });
    render(<MonsterHPTracker />);
    const healButton = screen.getByRole("button", { name: /heal/i });
    expect(healButton).not.toBeDisabled();
  });

  it("applies reduced opacity to a dead monster row", () => {
    mockUseEncounter.mockReturnValue({
      state: makeState([makeMonster({ hp: 0, maxHp: 10 })]),
      dispatch: mockDispatch,
    });
    const { container } = render(<MonsterHPTracker />);
    expect(container.querySelector(".opacity-60")).not.toBeNull();
  });

  it("does not apply opacity to a living monster row", () => {
    mockUseEncounter.mockReturnValue({
      state: makeState([makeMonster({ hp: 10, maxHp: 10 })]),
      dispatch: mockDispatch,
    });
    const { container } = render(<MonsterHPTracker />);
    expect(container.querySelector(".opacity-60")).toBeNull();
  });
});

// ─── Damage action ────────────────────────────────────────────────────────────

describe("MonsterHPTracker – damage action", () => {
  it("dispatches DAMAGE_TOKEN when Dmg button is clicked with a valid amount", async () => {
    mockUseEncounter.mockReturnValue({
      state: makeState([makeMonster({ id: "m1", hp: 10, maxHp: 10 })]),
      dispatch: mockDispatch,
    });
    render(<MonsterHPTracker />);
    const input = screen.getByPlaceholderText("DMG");
    await userEvent.type(input, "5");
    await userEvent.click(screen.getByRole("button", { name: /dmg/i }));
    expect(mockDispatch).toHaveBeenCalledWith({
      type: "DAMAGE_TOKEN",
      payload: { tokenId: "m1", amount: 5 },
    });
  });

  it("clears the damage input after dispatching", async () => {
    mockUseEncounter.mockReturnValue({
      state: makeState([makeMonster({ id: "m1", hp: 10, maxHp: 10 })]),
      dispatch: mockDispatch,
    });
    render(<MonsterHPTracker />);
    const input = screen.getByPlaceholderText("DMG");
    await userEvent.type(input, "5");
    await userEvent.click(screen.getByRole("button", { name: /dmg/i }));
    expect(input).toHaveValue(null);
  });

  it("dispatches DAMAGE_TOKEN when Enter is pressed in the damage input", async () => {
    mockUseEncounter.mockReturnValue({
      state: makeState([makeMonster({ id: "m1", hp: 10, maxHp: 10 })]),
      dispatch: mockDispatch,
    });
    render(<MonsterHPTracker />);
    const input = screen.getByPlaceholderText("DMG");
    await userEvent.type(input, "3{Enter}");
    expect(mockDispatch).toHaveBeenCalledWith({
      type: "DAMAGE_TOKEN",
      payload: { tokenId: "m1", amount: 3 },
    });
  });

  it("does not dispatch when damage input is empty", async () => {
    mockUseEncounter.mockReturnValue({
      state: makeState([makeMonster({ id: "m1", hp: 10, maxHp: 10 })]),
      dispatch: mockDispatch,
    });
    render(<MonsterHPTracker />);
    await userEvent.click(screen.getByRole("button", { name: /dmg/i }));
    expect(mockDispatch).not.toHaveBeenCalled();
  });

  it("does not dispatch when damage amount is 0", async () => {
    mockUseEncounter.mockReturnValue({
      state: makeState([makeMonster({ id: "m1", hp: 10, maxHp: 10 })]),
      dispatch: mockDispatch,
    });
    render(<MonsterHPTracker />);
    const input = screen.getByPlaceholderText("DMG");
    await userEvent.type(input, "0");
    await userEvent.click(screen.getByRole("button", { name: /dmg/i }));
    expect(mockDispatch).not.toHaveBeenCalled();
  });

  it("does not dispatch when damage amount is negative", async () => {
    mockUseEncounter.mockReturnValue({
      state: makeState([makeMonster({ id: "m1", hp: 10, maxHp: 10 })]),
      dispatch: mockDispatch,
    });
    render(<MonsterHPTracker />);
    const input = screen.getByPlaceholderText("DMG");
    await userEvent.type(input, "-5");
    await userEvent.click(screen.getByRole("button", { name: /dmg/i }));
    expect(mockDispatch).not.toHaveBeenCalled();
  });

  it("does not dispatch when damage input is non-numeric", async () => {
    mockUseEncounter.mockReturnValue({
      state: makeState([makeMonster({ id: "m1", hp: 10, maxHp: 10 })]),
      dispatch: mockDispatch,
    });
    render(<MonsterHPTracker />);
    const input = screen.getByPlaceholderText("DMG");
    fireEvent.change(input, { target: { value: "abc" } });
    await userEvent.click(screen.getByRole("button", { name: /dmg/i }));
    expect(mockDispatch).not.toHaveBeenCalled();
  });

  it("does not dispatch DAMAGE_TOKEN when the monster is dead", async () => {
    mockUseEncounter.mockReturnValue({
      state: makeState([makeMonster({ id: "m1", hp: 0, maxHp: 10 })]),
      dispatch: mockDispatch,
    });
    render(<MonsterHPTracker />);
    // button is disabled, but let's also verify dispatch isn't called
    const dmgButton = screen.getByRole("button", { name: /dmg/i });
    expect(dmgButton).toBeDisabled();
    expect(mockDispatch).not.toHaveBeenCalled();
  });
});

// ─── Heal action ─────────────────────────────────────────────────────────────

describe("MonsterHPTracker – heal action", () => {
  it("dispatches HEAL_TOKEN when Heal button is clicked with a valid amount", async () => {
    mockUseEncounter.mockReturnValue({
      state: makeState([makeMonster({ id: "m1", hp: 5, maxHp: 10 })]),
      dispatch: mockDispatch,
    });
    render(<MonsterHPTracker />);
    const input = screen.getByPlaceholderText("Heal");
    await userEvent.type(input, "3");
    await userEvent.click(screen.getByRole("button", { name: /heal/i }));
    expect(mockDispatch).toHaveBeenCalledWith({
      type: "HEAL_TOKEN",
      payload: { tokenId: "m1", amount: 3 },
    });
  });

  it("clears the heal input after dispatching", async () => {
    mockUseEncounter.mockReturnValue({
      state: makeState([makeMonster({ id: "m1", hp: 5, maxHp: 10 })]),
      dispatch: mockDispatch,
    });
    render(<MonsterHPTracker />);
    const input = screen.getByPlaceholderText("Heal");
    await userEvent.type(input, "3");
    await userEvent.click(screen.getByRole("button", { name: /heal/i }));
    expect(input).toHaveValue(null);
  });

  it("dispatches HEAL_TOKEN when Enter is pressed in the heal input", async () => {
    mockUseEncounter.mockReturnValue({
      state: makeState([makeMonster({ id: "m1", hp: 5, maxHp: 10 })]),
      dispatch: mockDispatch,
    });
    render(<MonsterHPTracker />);
    const input = screen.getByPlaceholderText("Heal");
    await userEvent.type(input, "4{Enter}");
    expect(mockDispatch).toHaveBeenCalledWith({
      type: "HEAL_TOKEN",
      payload: { tokenId: "m1", amount: 4 },
    });
  });

  it("does not dispatch when heal input is empty", async () => {
    mockUseEncounter.mockReturnValue({
      state: makeState([makeMonster({ id: "m1", hp: 5, maxHp: 10 })]),
      dispatch: mockDispatch,
    });
    render(<MonsterHPTracker />);
    await userEvent.click(screen.getByRole("button", { name: /heal/i }));
    expect(mockDispatch).not.toHaveBeenCalled();
  });

  it("does not dispatch when heal amount is 0", async () => {
    mockUseEncounter.mockReturnValue({
      state: makeState([makeMonster({ id: "m1", hp: 5, maxHp: 10 })]),
      dispatch: mockDispatch,
    });
    render(<MonsterHPTracker />);
    const input = screen.getByPlaceholderText("Heal");
    await userEvent.type(input, "0");
    await userEvent.click(screen.getByRole("button", { name: /heal/i }));
    expect(mockDispatch).not.toHaveBeenCalled();
  });

  it("does not dispatch when heal amount is negative", async () => {
    mockUseEncounter.mockReturnValue({
      state: makeState([makeMonster({ id: "m1", hp: 5, maxHp: 10 })]),
      dispatch: mockDispatch,
    });
    render(<MonsterHPTracker />);
    const input = screen.getByPlaceholderText("Heal");
    await userEvent.type(input, "-2");
    await userEvent.click(screen.getByRole("button", { name: /heal/i }));
    expect(mockDispatch).not.toHaveBeenCalled();
  });

  it("can heal a dead monster", async () => {
    mockUseEncounter.mockReturnValue({
      state: makeState([makeMonster({ id: "m1", hp: 0, maxHp: 10 })]),
      dispatch: mockDispatch,
    });
    render(<MonsterHPTracker />);
    const input = screen.getByPlaceholderText("Heal");
    await userEvent.type(input, "5");
    await userEvent.click(screen.getByRole("button", { name: /heal/i }));
    expect(mockDispatch).toHaveBeenCalledWith({
      type: "HEAL_TOKEN",
      payload: { tokenId: "m1", amount: 5 },
    });
  });
});

// ─── Inline HP editing ────────────────────────────────────────────────────────

describe("MonsterHPTracker – inline HP editing", () => {
  it("clicking the HP number shows an editable input", async () => {
    mockUseEncounter.mockReturnValue({
      state: makeState([makeMonster({ id: "m1", hp: 8, maxHp: 10 })]),
      dispatch: mockDispatch,
    });
    render(<MonsterHPTracker />);
    const hpButton = screen.getByRole("button", { name: "8" });
    await userEvent.click(hpButton);
    expect(screen.queryByRole("button", { name: "8" })).toBeNull();
    const editInput = screen.getByDisplayValue("8");
    expect(editInput).toBeInTheDocument();
  });

  it("committing a lower HP value dispatches DAMAGE_TOKEN with the difference", async () => {
    mockUseEncounter.mockReturnValue({
      state: makeState([makeMonster({ id: "m1", hp: 10, maxHp: 10 })]),
      dispatch: mockDispatch,
    });
    render(<MonsterHPTracker />);
    const hpButton = screen.getByRole("button", { name: "10" });
    await userEvent.click(hpButton);

    // Find the HP edit input (it's the one that's auto-focused, not DMG/Heal)
    const inputs = screen.getAllByRole("spinbutton");
    const hpInput = inputs.find(
      (el) => (el as HTMLInputElement).value === "10"
    ) as HTMLInputElement;

    await userEvent.clear(hpInput);
    await userEvent.type(hpInput, "6");
    fireEvent.keyDown(hpInput, { key: "Enter" });

    expect(mockDispatch).toHaveBeenCalledWith({
      type: "DAMAGE_TOKEN",
      payload: { tokenId: "m1", amount: 4 },
    });
  });

  it("committing a higher HP value dispatches HEAL_TOKEN with the difference", async () => {
    mockUseEncounter.mockReturnValue({
      state: makeState([makeMonster({ id: "m1", hp: 5, maxHp: 10 })]),
      dispatch: mockDispatch,
    });
    render(<MonsterHPTracker />);
    const hpButton = screen.getByRole("button", { name: "5" });
    await userEvent.click(hpButton);

    const inputs = screen.getAllByRole("spinbutton");
    const hpInput = inputs.find(
      (el) => (el as HTMLInputElement).value === "5"
    ) as HTMLInputElement;

    await userEvent.clear(hpInput);
    await userEvent.type(hpInput, "8");
    fireEvent.keyDown(hpInput, { key: "Enter" });

    expect(mockDispatch).toHaveBeenCalledWith({
      type: "HEAL_TOKEN",
      payload: { tokenId: "m1", amount: 3 },
    });
  });

  it("committing the same HP value dispatches nothing", async () => {
    mockUseEncounter.mockReturnValue({
      state: makeState([makeMonster({ id: "m1", hp: 7, maxHp: 10 })]),
      dispatch: mockDispatch,
    });
    render(<MonsterHPTracker />);
    const hpButton = screen.getByRole("button", { name: "7" });
    await userEvent.click(hpButton);

    const inputs = screen.getAllByRole("spinbutton");
    const hpInput = inputs.find(
      (el) => (el as HTMLInputElement).value === "7"
    ) as HTMLInputElement;

    fireEvent.keyDown(hpInput, { key: "Enter" });

    expect(mockDispatch).not.toHaveBeenCalled();
  });

  it("pressing Escape cancels editing without dispatching", async () => {
    mockUseEncounter.mockReturnValue({
      state: makeState([makeMonster({ id: "m1", hp: 7, maxHp: 10 })]),
      dispatch: mockDispatch,
    });
    render(<MonsterHPTracker />);
    const hpButton = screen.getByRole("button", { name: "7" });
    await userEvent.click(hpButton);

    const inputs = screen.getAllByRole("spinbutton");
    const hpInput = inputs.find(
      (el) => (el as HTMLInputElement).value === "7"
    ) as HTMLInputElement;

    await userEvent.clear(hpInput);
    await userEvent.type(hpInput, "3");
    fireEvent.keyDown(hpInput, { key: "Escape" });

    expect(mockDispatch).not.toHaveBeenCalled();
    // The button should be back
    await waitFor(() => {
      expect(screen.getByRole("button", { name: "7" })).toBeInTheDocument();
    });
  });

  it("blurring the HP input commits the edit", async () => {
    mockUseEncounter.mockReturnValue({
      state: makeState([makeMonster({ id: "m1", hp: 10, maxHp: 10 })]),
      dispatch: mockDispatch,
    });
    render(<MonsterHPTracker />);
    const hpButton = screen.getByRole("button", { name: "10" });
    await userEvent.click(hpButton);

    const inputs = screen.getAllByRole("spinbutton");
    const hpInput = inputs.find(
      (el) => (el as HTMLInputElement).value === "10"
    ) as HTMLInputElement;

    await userEvent.clear(hpInput);
    await userEvent.type(hpInput, "4");
    fireEvent.blur(hpInput);

    expect(mockDispatch).toHaveBeenCalledWith({
      type: "DAMAGE_TOKEN",
      payload: { tokenId: "m1", amount: 6 },
    });
  });

  it("entering a non-numeric value in HP edit and committing does not dispatch", async () => {
    mockUseEncounter.mockReturnValue({
      state: makeState([makeMonster({ id: "m1", hp: 10, maxHp: 10 })]),
      dispatch: mockDispatch,
    });
    render(<MonsterHPTracker />);
    const hpButton = screen.getByRole("button", { name: "10" });
    await userEvent.click(hpButton);

    const inputs = screen.getAllByRole("spinbutton");
    const hpInput = inputs.find(
      (el) => (el as HTMLInputElement).value === "10"
    ) as HTMLInputElement;

    fireEvent.change(hpInput, { target: { value: "" } });
    fireEvent.keyDown(hpInput, { key: "Enter" });

    expect(mockDispatch).not.toHaveBeenCalled();
  });
});

// ─── HP bar width ─────────────────────────────────────────────────────────────

describe("MonsterHPTracker – HP bar width", () => {
  it("renders HP bar at 100% width for full health", () => {
    mockUseEncounter.mockReturnValue({
      state: makeState([makeMonster({ hp: 10, maxHp: 10 })]),
      dispatch: mockDispatch,
    });
    const { container } = render(<MonsterHPTracker />);
    const bar = container.querySelector(".bg-green-500") as HTMLElement;
    expect(bar?.style.width).toBe("100%");
  });

  it("renders HP bar at 50% width for half health", () => {
    mockUseEncounter.mockReturnValue({
      state: makeState([makeMonster({ hp: 5, maxHp: 10 })]),
      dispatch: mockDispatch,
    });
    const { container } = render(<MonsterHPTracker />);
    const bar = container.querySelector(".bg-green-500") as HTMLElement;
    expect(bar?.style.width).toBe("50%");
  });

  it("renders HP bar at 0% width for dead monster", () => {
    mockUseEncounter.mockReturnValue({
      state: makeState([makeMonster({ hp: 0, maxHp: 10 })]),
      dispatch: mockDispatch,
    });
    const { container } = render(<MonsterHPTracker />);
    const bar = container.querySelector(".bg-gray-600") as HTMLElement;
    expect(bar?.style.width).toBe("0%");
  });

  it("clamps HP bar to 0% for negative HP", () => {
    mockUseEncounter.mockReturnValue({
      state: makeState([makeMonster({ hp: -5, maxHp: 10 })]),
      dispatch: mockDispatch,
    });
    const { container } = render(<MonsterHPTracker />);
    const bar = container.querySelector(".bg-gray-600") as HTMLElement;
    expect(bar?.style.width).toBe("0%");
  });
});

// ─── Null / missing HP values ─────────────────────────────────────────────────

describe("MonsterHPTracker – null/missing HP values", () => {
  it("handles missing hp (undefined) by treating it as 0", () => {
    mockUseEncounter.mockReturnValue({
      state: makeState([
        { id: "m1", name: "Ghost", type: "monster", maxHp: 10 },
      ]),
      dispatch: mockDispatch,
    });
    render(<MonsterHPTracker />);
    // Should render dead state since hp defaults to 0
    expect(screen.getByText(/dead/i)).toBeInTheDocument();
  });

  it("handles missing maxHp (undefined) by treating it as 1", () => {
    mockUseEncounter.mockReturnValue({
      state: makeState([
        { id: "m1", name: "Ghost", type: "monster", hp: 1 },
      ]),
      dispatch: mockDispatch,
    });
    // Should not throw; hp/maxHp = 1/1 = 100% healthy
    const { container } = render(<MonsterHPTracker />);
    expect(container.querySelector(".border-green-500")).not.toBeNull();
  });
});

// ─── Multiple monsters – independent inputs ───────────────────────────────────

describe("MonsterHPTracker – multiple monsters with independent inputs", () => {
  it("dispatches damage only to the targeted monster", async () => {
    mockUseEncounter.mockReturnValue({
      state: makeState([
        makeMonster({ id: "m1", name: "Goblin", hp: 10, maxHp: 10 }),
        makeMonster({ id: "m2", name: "Troll", hp: 20, maxHp: 20 }),
      ]),
      dispatch: mockDispatch,
    });
    render(<MonsterHPTracker />);
    const dmgInputs = screen.getAllByPlaceholderText("DMG");
    // First input belongs to first monster
    await userEvent.type(dmgInputs[0], "3");
    const dmgButtons = screen.getAllByRole("button", { name: /dmg/i });
    await userEvent.click(dmgButtons[0]);

    expect(mockDispatch).toHaveBeenCalledTimes(1);
    expect(mockDispatch).toHaveBeenCalledWith({
      type: "DAMAGE_TOKEN",
      payload: { tokenId: "m1", amount: 3 },
    });
  });

  it("dispatches heal only to the targeted monster", async () => {
    mockUseEncounter.mockReturnValue({
      state: makeState([
        makeMonster({ id: "m1", name: "Goblin", hp: 5, maxHp: 10 }),
        makeMonster({ id: "m2", name: "Troll", hp: 10, maxHp: 20 }),
      ]),
      dispatch: mockDispatch,
    });
    render(<MonsterHPTracker />);
    const healInputs = screen.getAllByPlaceholderText("Heal");
    await userEvent.type(healInputs[1], "7");
    const healButtons = screen.getAllByRole("button", { name: /heal/i });
    await userEvent.click(healButtons[1]);

    expect(mockDispatch).toHaveBeenCalledTimes(1);
    expect(mockDispatch).toHaveBeenCalledWith({
      type: "HEAL_TOKEN",
      payload: { tokenId: "m2", amount: 7 },
    });
  });
});
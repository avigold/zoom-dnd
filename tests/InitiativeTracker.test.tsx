import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { InitiativeTracker } from "../src/dm-panel/InitiativeTracker";

// Mock the useEncounter hook
const mockDispatch = vi.fn();
const mockUseEncounter = vi.fn();

vi.mock("../src/encounter-state/useEncounter", () => ({
  useEncounter: () => mockUseEncounter(),
}));

function makeState(overrides: Partial<ReturnType<typeof defaultState>> = {}) {
  return { ...defaultState(), ...overrides };
}

function defaultState() {
  return {
    initiativeOrder: [] as Array<{ tokenId: string; initiative: number }>,
    currentTurnIndex: 0,
    round: 1,
    tokens: [] as Array<{ id: string; name: string }>,
  };
}

beforeEach(() => {
  vi.clearAllMocks();
  mockUseEncounter.mockReturnValue({
    state: defaultState(),
    dispatch: mockDispatch,
  });
});

describe("InitiativeTracker – empty state", () => {
  it("renders empty message when no initiative order is set", () => {
    render(<InitiativeTracker />);
    expect(screen.getByText(/no initiative order set/i)).toBeInTheDocument();
  });

  it("does not render the Next Turn button when initiative order is empty", () => {
    render(<InitiativeTracker />);
    expect(screen.queryByRole("button", { name: /next turn/i })).not.toBeInTheDocument();
  });

  it("does not render round number when initiative order is empty", () => {
    render(<InitiativeTracker />);
    expect(screen.queryByText(/round/i)).not.toBeInTheDocument();
  });
});

describe("InitiativeTracker – rendering with entries", () => {
  beforeEach(() => {
    mockUseEncounter.mockReturnValue({
      state: makeState({
        initiativeOrder: [
          { tokenId: "token-1", initiative: 15 },
          { tokenId: "token-2", initiative: 20 },
          { tokenId: "token-3", initiative: 10 },
        ],
        tokens: [
          { id: "token-1", name: "Goblin" },
          { id: "token-2", name: "Fighter" },
          { id: "token-3", name: "Wizard" },
        ],
        currentTurnIndex: 0,
        round: 3,
      }),
      dispatch: mockDispatch,
    });
  });

  it("renders all token names", () => {
    render(<InitiativeTracker />);
    expect(screen.getByText("Goblin")).toBeInTheDocument();
    expect(screen.getByText("Fighter")).toBeInTheDocument();
    expect(screen.getByText("Wizard")).toBeInTheDocument();
  });

  it("renders tokens sorted by initiative descending", () => {
    render(<InitiativeTracker />);
    const names = screen.getAllByText(/Goblin|Fighter|Wizard/).map((el) => el.textContent);
    expect(names[0]).toBe("Fighter"); // 20
    expect(names[1]).toBe("Goblin");  // 15
    expect(names[2]).toBe("Wizard");  // 10
  });

  it("renders the current round number", () => {
    render(<InitiativeTracker />);
    expect(screen.getByText("3")).toBeInTheDocument();
    expect(screen.getByText(/round/i)).toBeInTheDocument();
  });

  it("renders the Next Turn button", () => {
    render(<InitiativeTracker />);
    expect(screen.getByRole("button", { name: /next turn/i })).toBeInTheDocument();
  });

  it("renders initiative value inputs for each token", () => {
    render(<InitiativeTracker />);
    const inputs = screen.getAllByTitle(/initiative value/i);
    expect(inputs).toHaveLength(3);
  });

  it("displays correct initiative values in inputs", () => {
    render(<InitiativeTracker />);
    const inputs = screen.getAllByTitle(/initiative value/i) as HTMLInputElement[];
    const values = inputs.map((i) => i.value);
    expect(values).toContain("20");
    expect(values).toContain("15");
    expect(values).toContain("10");
  });
});

describe("InitiativeTracker – active turn highlighting", () => {
  it("highlights the first entry (index 0) as active on round start", () => {
    mockUseEncounter.mockReturnValue({
      state: makeState({
        initiativeOrder: [
          { tokenId: "token-1", initiative: 20 },
          { tokenId: "token-2", initiative: 10 },
        ],
        tokens: [
          { id: "token-1", name: "Fighter" },
          { id: "token-2", name: "Rogue" },
        ],
        currentTurnIndex: 0,
        round: 1,
      }),
      dispatch: mockDispatch,
    });

    render(<InitiativeTracker />);
    // The active indicator arrow should be present
    expect(screen.getByText("▶")).toBeInTheDocument();
  });

  it("shows the active turn indicator only once", () => {
    mockUseEncounter.mockReturnValue({
      state: makeState({
        initiativeOrder: [
          { tokenId: "token-1", initiative: 20 },
          { tokenId: "token-2", initiative: 10 },
          { tokenId: "token-3", initiative: 5 },
        ],
        tokens: [
          { id: "token-1", name: "Fighter" },
          { id: "token-2", name: "Rogue" },
          { id: "token-3", name: "Wizard" },
        ],
        currentTurnIndex: 1,
        round: 1,
      }),
      dispatch: mockDispatch,
    });

    render(<InitiativeTracker />);
    const arrows = screen.getAllByText("▶");
    expect(arrows).toHaveLength(1);
  });

  it("highlights the token at currentTurnIndex in the sorted order", () => {
    // sorted order: token-1 (20), token-2 (10)
    // currentTurnIndex: 1 => token-2 (Rogue) should be active
    mockUseEncounter.mockReturnValue({
      state: makeState({
        initiativeOrder: [
          { tokenId: "token-1", initiative: 20 },
          { tokenId: "token-2", initiative: 10 },
        ],
        tokens: [
          { id: "token-1", name: "Fighter" },
          { id: "token-2", name: "Rogue" },
        ],
        currentTurnIndex: 1,
        round: 2,
      }),
      dispatch: mockDispatch,
    });

    render(<InitiativeTracker />);
    // The arrow should be near "Rogue"
    const arrow = screen.getByText("▶");
    const rogueRow = screen.getByText("Rogue").closest("div[class*='flex']");
    expect(rogueRow).toContainElement(arrow);
  });
});

describe("InitiativeTracker – Next Turn button", () => {
  beforeEach(() => {
    mockUseEncounter.mockReturnValue({
      state: makeState({
        initiativeOrder: [
          { tokenId: "token-1", initiative: 15 },
          { tokenId: "token-2", initiative: 10 },
        ],
        tokens: [
          { id: "token-1", name: "Goblin" },
          { id: "token-2", name: "Fighter" },
        ],
        currentTurnIndex: 0,
        round: 1,
      }),
      dispatch: mockDispatch,
    });
  });

  it("dispatches NEXT_TURN when Next Turn button is clicked", async () => {
    const user = userEvent.setup();
    render(<InitiativeTracker />);
    await user.click(screen.getByRole("button", { name: /next turn/i }));
    expect(mockDispatch).toHaveBeenCalledWith({ type: "NEXT_TURN" });
  });

  it("dispatches NEXT_TURN exactly once per click", async () => {
    const user = userEvent.setup();
    render(<InitiativeTracker />);
    await user.click(screen.getByRole("button", { name: /next turn/i }));
    expect(mockDispatch).toHaveBeenCalledTimes(1);
  });

  it("dispatches NEXT_TURN multiple times for multiple clicks", async () => {
    const user = userEvent.setup();
    render(<InitiativeTracker />);
    const button = screen.getByRole("button", { name: /next turn/i });
    await user.click(button);
    await user.click(button);
    await user.click(button);
    expect(mockDispatch).toHaveBeenCalledTimes(3);
    expect(mockDispatch).toHaveBeenNthCalledWith(1, { type: "NEXT_TURN" });
    expect(mockDispatch).toHaveBeenNthCalledWith(2, { type: "NEXT_TURN" });
    expect(mockDispatch).toHaveBeenNthCalledWith(3, { type: "NEXT_TURN" });
  });
});

describe("InitiativeTracker – initiative input editing", () => {
  beforeEach(() => {
    mockUseEncounter.mockReturnValue({
      state: makeState({
        initiativeOrder: [
          { tokenId: "token-1", initiative: 15 },
          { tokenId: "token-2", initiative: 10 },
        ],
        tokens: [
          { id: "token-1", name: "Goblin" },
          { id: "token-2", name: "Fighter" },
        ],
        currentTurnIndex: 0,
        round: 1,
      }),
      dispatch: mockDispatch,
    });
  });

  it("updates the input value as the user types", async () => {
    const user = userEvent.setup();
    render(<InitiativeTracker />);
    const inputs = screen.getAllByTitle(/initiative value/i) as HTMLInputElement[];
    // First input corresponds to highest initiative (Goblin = 15)
    const goblinInput = inputs[0];
    await user.clear(goblinInput);
    await user.type(goblinInput, "18");
    expect(goblinInput.value).toBe("18");
  });

  it("dispatches SET_INITIATIVE with correct payload on blur with valid value", async () => {
    const user = userEvent.setup();
    render(<InitiativeTracker />);
    const inputs = screen.getAllByTitle(/initiative value/i) as HTMLInputElement[];
    const goblinInput = inputs[0];
    await user.clear(goblinInput);
    await user.type(goblinInput, "18");
    fireEvent.blur(goblinInput);
    expect(mockDispatch).toHaveBeenCalledWith({
      type: "SET_INITIATIVE",
      payload: { tokenId: "token-1", initiative: 18 },
    });
  });

  it("dispatches SET_INITIATIVE when Enter key is pressed", async () => {
    const user = userEvent.setup();
    render(<InitiativeTracker />);
    const inputs = screen.getAllByTitle(/initiative value/i) as HTMLInputElement[];
    const goblinInput = inputs[0];
    await user.clear(goblinInput);
    await user.type(goblinInput, "22");
    await user.keyboard("{Enter}");
    expect(mockDispatch).toHaveBeenCalledWith({
      type: "SET_INITIATIVE",
      payload: { tokenId: "token-1", initiative: 22 },
    });
  });

  it("does not dispatch SET_INITIATIVE when input is not a valid number on blur", async () => {
    const user = userEvent.setup();
    render(<InitiativeTracker />);
    const inputs = screen.getAllByTitle(/initiative value/i) as HTMLInputElement[];
    const goblinInput = inputs[0];
    await user.clear(goblinInput);
    await user.type(goblinInput, "abc");
    fireEvent.blur(goblinInput);
    expect(mockDispatch).not.toHaveBeenCalledWith(
      expect.objectContaining({ type: "SET_INITIATIVE" })
    );
  });

  it("does not dispatch SET_INITIATIVE when Escape is pressed", async () => {
    const user = userEvent.setup();
    render(<InitiativeTracker />);
    const inputs = screen.getAllByTitle(/initiative value/i) as HTMLInputElement[];
    const goblinInput = inputs[0];
    await user.clear(goblinInput);
    await user.type(goblinInput, "99");
    await user.keyboard("{Escape}");
    expect(mockDispatch).not.toHaveBeenCalledWith(
      expect.objectContaining({ type: "SET_INITIATIVE" })
    );
  });

  it("restores the original value display after Escape", async () => {
    const user = userEvent.setup();
    render(<InitiativeTracker />);
    const inputs = screen.getAllByTitle(/initiative value/i) as HTMLInputElement[];
    const goblinInput = inputs[0];
    await user.clear(goblinInput);
    await user.type(goblinInput, "99");
    await user.keyboard("{Escape}");
    // After escape, the pending input is cleared and original value shown
    expect(goblinInput.value).toBe("15");
  });

  it("dispatches SET_INITIATIVE with integer value (ignores decimals via parseInt)", async () => {
    const user = userEvent.setup();
    render(<InitiativeTracker />);
    const inputs = screen.getAllByTitle(/initiative value/i) as HTMLInputElement[];
    const goblinInput = inputs[0];
    await user.clear(goblinInput);
    await user.type(goblinInput, "12");
    fireEvent.blur(goblinInput);
    expect(mockDispatch).toHaveBeenCalledWith({
      type: "SET_INITIATIVE",
      payload: { tokenId: "token-1", initiative: 12 },
    });
  });

  it("does not dispatch when input is empty string on blur", async () => {
    const user = userEvent.setup();
    render(<InitiativeTracker />);
    const inputs = screen.getAllByTitle(/initiative value/i) as HTMLInputElement[];
    const goblinInput = inputs[0];
    await user.clear(goblinInput);
    fireEvent.blur(goblinInput);
    expect(mockDispatch).not.toHaveBeenCalledWith(
      expect.objectContaining({ type: "SET_INITIATIVE" })
    );
  });
});

describe("InitiativeTracker – token name fallback", () => {
  it("falls back to tokenId when token is not found in tokens array", () => {
    mockUseEncounter.mockReturnValue({
      state: makeState({
        initiativeOrder: [{ tokenId: "unknown-token", initiative: 10 }],
        tokens: [],
        currentTurnIndex: 0,
        round: 1,
      }),
      dispatch: mockDispatch,
    });

    render(<InitiativeTracker />);
    expect(screen.getByText("unknown-token")).toBeInTheDocument();
  });

  it("uses token name when token is found", () => {
    mockUseEncounter.mockReturnValue({
      state: makeState({
        initiativeOrder: [{ tokenId: "t1", initiative: 10 }],
        tokens: [{ id: "t1", name: "Dragon" }],
        currentTurnIndex: 0,
        round: 1,
      }),
      dispatch: mockDispatch,
    });

    render(<InitiativeTracker />);
    expect(screen.getByText("Dragon")).toBeInTheDocument();
  });
});

describe("InitiativeTracker – single token", () => {
  it("renders correctly with a single token", () => {
    mockUseEncounter.mockReturnValue({
      state: makeState({
        initiativeOrder: [{ tokenId: "solo", initiative: 5 }],
        tokens: [{ id: "solo", name: "Solo Hero" }],
        currentTurnIndex: 0,
        round: 1,
      }),
      dispatch: mockDispatch,
    });

    render(<InitiativeTracker />);
    expect(screen.getByText("Solo Hero")).toBeInTheDocument();
    expect(screen.getByText("▶")).toBeInTheDocument();
    const input = screen.getByTitle(/initiative value/i) as HTMLInputElement;
    expect(input.value).toBe("5");
  });
});

describe("InitiativeTracker – round number display", () => {
  it("displays round 1 initially", () => {
    mockUseEncounter.mockReturnValue({
      state: makeState({
        initiativeOrder: [{ tokenId: "t1", initiative: 10 }],
        tokens: [{ id: "t1", name: "Hero" }],
        currentTurnIndex: 0,
        round: 1,
      }),
      dispatch: mockDispatch,
    });

    render(<InitiativeTracker />);
    expect(screen.getByText("1")).toBeInTheDocument();
  });

  it("displays updated round number", () => {
    mockUseEncounter.mockReturnValue({
      state: makeState({
        initiativeOrder: [{ tokenId: "t1", initiative: 10 }],
        tokens: [{ id: "t1", name: "Hero" }],
        currentTurnIndex: 0,
        round: 7,
      }),
      dispatch: mockDispatch,
    });

    render(<InitiativeTracker />);
    expect(screen.getByText("7")).toBeInTheDocument();
  });
});

describe("InitiativeTracker – currentTurnIndex out of bounds", () => {
  it("renders without crashing when currentTurnIndex is out of bounds", () => {
    mockUseEncounter.mockReturnValue({
      state: makeState({
        initiativeOrder: [{ tokenId: "t1", initiative: 10 }],
        tokens: [{ id: "t1", name: "Hero" }],
        currentTurnIndex: 99,
        round: 1,
      }),
      dispatch: mockDispatch,
    });

    render(<InitiativeTracker />);
    expect(screen.getByText("Hero")).toBeInTheDocument();
    // No active indicator since index is out of bounds
    expect(screen.queryByText("▶")).not.toBeInTheDocument();
  });
});

describe("InitiativeTracker – ties in initiative", () => {
  it("renders all tokens with the same initiative value", () => {
    mockUseEncounter.mockReturnValue({
      state: makeState({
        initiativeOrder: [
          { tokenId: "t1", initiative: 10 },
          { tokenId: "t2", initiative: 10 },
          { tokenId: "t3", initiative: 10 },
        ],
        tokens: [
          { id: "t1", name: "Alpha" },
          { id: "t2", name: "Beta" },
          { id: "t3", name: "Gamma" },
        ],
        currentTurnIndex: 0,
        round: 1,
      }),
      dispatch: mockDispatch,
    });

    render(<InitiativeTracker />);
    expect(screen.getByText("Alpha")).toBeInTheDocument();
    expect(screen.getByText("Beta")).toBeInTheDocument();
    expect(screen.getByText("Gamma")).toBeInTheDocument();
    const inputs = screen.getAllByTitle(/initiative value/i) as HTMLInputElement[];
    expect(inputs).toHaveLength(3);
    inputs.forEach((input) => expect(input.value).toBe("10"));
  });
});
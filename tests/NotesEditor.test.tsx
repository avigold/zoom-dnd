import { render, screen, fireEvent } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { NotesEditor } from "../src/dm-panel/NotesEditor";

const mockDispatch = vi.fn();

vi.mock("../src/encounter-state/useEncounter", () => ({
  useEncounter: vi.fn(),
}));

import { useEncounter } from "../src/encounter-state/useEncounter";

const mockUseEncounter = vi.mocked(useEncounter);

beforeEach(() => {
  vi.clearAllMocks();
});

describe("NotesEditor", () => {
  describe("rendering", () => {
    it("renders a label with text 'Notes'", () => {
      mockUseEncounter.mockReturnValue({
        state: { notes: "" } as any,
        dispatch: mockDispatch,
      });

      render(<NotesEditor />);

      expect(screen.getByText("Notes")).toBeInTheDocument();
    });

    it("renders a textarea element", () => {
      mockUseEncounter.mockReturnValue({
        state: { notes: "" } as any,
        dispatch: mockDispatch,
      });

      render(<NotesEditor />);

      expect(screen.getByRole("textbox")).toBeInTheDocument();
    });

    it("associates label with textarea via htmlFor and id", () => {
      mockUseEncounter.mockReturnValue({
        state: { notes: "" } as any,
        dispatch: mockDispatch,
      });

      render(<NotesEditor />);

      const textarea = screen.getByLabelText("Notes");
      expect(textarea.tagName).toBe("TEXTAREA");
    });

    it("displays the current notes value from encounter state", () => {
      mockUseEncounter.mockReturnValue({
        state: { notes: "My encounter notes" } as any,
        dispatch: mockDispatch,
      });

      render(<NotesEditor />);

      expect(screen.getByRole("textbox")).toHaveValue("My encounter notes");
    });

    it("displays an empty string when notes is an empty string", () => {
      mockUseEncounter.mockReturnValue({
        state: { notes: "" } as any,
        dispatch: mockDispatch,
      });

      render(<NotesEditor />);

      expect(screen.getByRole("textbox")).toHaveValue("");
    });

    it("displays an empty string when notes is null", () => {
      mockUseEncounter.mockReturnValue({
        state: { notes: null } as any,
        dispatch: mockDispatch,
      });

      render(<NotesEditor />);

      expect(screen.getByRole("textbox")).toHaveValue("");
    });

    it("displays an empty string when notes is undefined", () => {
      mockUseEncounter.mockReturnValue({
        state: { notes: undefined } as any,
        dispatch: mockDispatch,
      });

      render(<NotesEditor />);

      expect(screen.getByRole("textbox")).toHaveValue("");
    });

    it("shows placeholder text 'Enter encounter notes...'", () => {
      mockUseEncounter.mockReturnValue({
        state: { notes: "" } as any,
        dispatch: mockDispatch,
      });

      render(<NotesEditor />);

      expect(screen.getByPlaceholderText("Enter encounter notes...")).toBeInTheDocument();
    });

    it("renders multiline notes correctly", () => {
      const multilineNotes = "Line one\nLine two\nLine three";
      mockUseEncounter.mockReturnValue({
        state: { notes: multilineNotes } as any,
        dispatch: mockDispatch,
      });

      render(<NotesEditor />);

      expect(screen.getByRole("textbox")).toHaveValue(multilineNotes);
    });
  });

  describe("dispatching UPDATE_NOTES on change", () => {
    it("dispatches UPDATE_NOTES with the new value when user types", () => {
      mockUseEncounter.mockReturnValue({
        state: { notes: "" } as any,
        dispatch: mockDispatch,
      });

      render(<NotesEditor />);

      fireEvent.change(screen.getByRole("textbox"), {
        target: { value: "New note text" },
      });

      expect(mockDispatch).toHaveBeenCalledOnce();
      expect(mockDispatch).toHaveBeenCalledWith({
        type: "UPDATE_NOTES",
        payload: { notes: "New note text" },
      });
    });

    it("dispatches UPDATE_NOTES with an empty string when user clears the textarea", () => {
      mockUseEncounter.mockReturnValue({
        state: { notes: "Some existing notes" } as any,
        dispatch: mockDispatch,
      });

      render(<NotesEditor />);

      fireEvent.change(screen.getByRole("textbox"), {
        target: { value: "" },
      });

      expect(mockDispatch).toHaveBeenCalledOnce();
      expect(mockDispatch).toHaveBeenCalledWith({
        type: "UPDATE_NOTES",
        payload: { notes: "" },
      });
    });

    it("dispatches UPDATE_NOTES on every individual change event", () => {
      mockUseEncounter.mockReturnValue({
        state: { notes: "" } as any,
        dispatch: mockDispatch,
      });

      render(<NotesEditor />);

      const textarea = screen.getByRole("textbox");

      fireEvent.change(textarea, { target: { value: "a" } });
      fireEvent.change(textarea, { target: { value: "ab" } });
      fireEvent.change(textarea, { target: { value: "abc" } });

      expect(mockDispatch).toHaveBeenCalledTimes(3);
    });

    it("dispatches UPDATE_NOTES with the exact value including special characters", () => {
      mockUseEncounter.mockReturnValue({
        state: { notes: "" } as any,
        dispatch: mockDispatch,
      });

      render(<NotesEditor />);

      const specialText = "Notes with special chars: <>&\"'!@#$%^*()";
      fireEvent.change(screen.getByRole("textbox"), {
        target: { value: specialText },
      });

      expect(mockDispatch).toHaveBeenCalledWith({
        type: "UPDATE_NOTES",
        payload: { notes: specialText },
      });
    });

    it("dispatches UPDATE_NOTES with multiline text", () => {
      mockUseEncounter.mockReturnValue({
        state: { notes: "" } as any,
        dispatch: mockDispatch,
      });

      render(<NotesEditor />);

      const multilineText = "First line\nSecond line\nThird line";
      fireEvent.change(screen.getByRole("textbox"), {
        target: { value: multilineText },
      });

      expect(mockDispatch).toHaveBeenCalledWith({
        type: "UPDATE_NOTES",
        payload: { notes: multilineText },
      });
    });

    it("dispatches UPDATE_NOTES with a very long string", () => {
      mockUseEncounter.mockReturnValue({
        state: { notes: "" } as any,
        dispatch: mockDispatch,
      });

      render(<NotesEditor />);

      const longText = "a".repeat(10000);
      fireEvent.change(screen.getByRole("textbox"), {
        target: { value: longText },
      });

      expect(mockDispatch).toHaveBeenCalledWith({
        type: "UPDATE_NOTES",
        payload: { notes: longText },
      });
    });

    it("does not dispatch on initial render", () => {
      mockUseEncounter.mockReturnValue({
        state: { notes: "Initial notes" } as any,
        dispatch: mockDispatch,
      });

      render(<NotesEditor />);

      expect(mockDispatch).not.toHaveBeenCalled();
    });
  });

  describe("action type correctness", () => {
    it("always dispatches exactly the UPDATE_NOTES action type, not any other type", () => {
      mockUseEncounter.mockReturnValue({
        state: { notes: "" } as any,
        dispatch: mockDispatch,
      });

      render(<NotesEditor />);

      fireEvent.change(screen.getByRole("textbox"), {
        target: { value: "test" },
      });

      const dispatchedAction = mockDispatch.mock.calls[0][0];
      expect(dispatchedAction.type).toBe("UPDATE_NOTES");
    });

    it("dispatched action payload contains only the notes key", () => {
      mockUseEncounter.mockReturnValue({
        state: { notes: "" } as any,
        dispatch: mockDispatch,
      });

      render(<NotesEditor />);

      fireEvent.change(screen.getByRole("textbox"), {
        target: { value: "some notes" },
      });

      const dispatchedAction = mockDispatch.mock.calls[0][0];
      expect(Object.keys(dispatchedAction.payload)).toEqual(["notes"]);
    });
  });

  describe("state updates reflected in textarea", () => {
    it("reflects updated notes when state changes between renders", () => {
      const { rerender } = render(
        (() => {
          mockUseEncounter.mockReturnValue({
            state: { notes: "Initial" } as any,
            dispatch: mockDispatch,
          });
          return <NotesEditor />;
        })()
      );

      expect(screen.getByRole("textbox")).toHaveValue("Initial");

      mockUseEncounter.mockReturnValue({
        state: { notes: "Updated notes" } as any,
        dispatch: mockDispatch,
      });

      rerender(<NotesEditor />);

      expect(screen.getByRole("textbox")).toHaveValue("Updated notes");
    });

    it("reflects empty notes after state is cleared", () => {
      mockUseEncounter.mockReturnValue({
        state: { notes: "Some notes" } as any,
        dispatch: mockDispatch,
      });

      const { rerender } = render(<NotesEditor />);

      expect(screen.getByRole("textbox")).toHaveValue("Some notes");

      mockUseEncounter.mockReturnValue({
        state: { notes: "" } as any,
        dispatch: mockDispatch,
      });

      rerender(<NotesEditor />);

      expect(screen.getByRole("textbox")).toHaveValue("");
    });
  });
});
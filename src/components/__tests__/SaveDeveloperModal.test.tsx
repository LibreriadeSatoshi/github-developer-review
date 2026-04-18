import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, fireEvent, waitFor, cleanup } from "@testing-library/react";
import { SaveDeveloperModal } from "@/components/SaveDeveloperModal";

vi.mock("sonner", () => ({
  toast: { success: vi.fn() },
}));

const mockFetch = vi.fn();
vi.stubGlobal("fetch", mockFetch);

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});

function renderModal(props: Partial<React.ComponentProps<typeof SaveDeveloperModal>> = {}) {
  const onOpenChange = vi.fn();
  render(
    <SaveDeveloperModal
      username="testuser"
      open={true}
      onOpenChange={onOpenChange}
      {...props}
    />
  );
  return { onOpenChange };
}

function renderAndSave(date?: string) {
  const { onOpenChange } = renderModal();
  if (date !== undefined) {
    fireEvent.change(screen.getByPlaceholderText("MM/DD/YYYY"), {
      target: { value: date },
    });
  }
  fireEvent.click(screen.getByRole("button", { name: /^save$/i }));
  return { onOpenChange };
}

describe("SaveDeveloperModal", () => {
  beforeEach(() => {
    mockFetch.mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({ id: 1, savedAt: "2026-04-18T10:00:00Z" }),
    });
  });

  it("renders heading, date input, Save and Cancel buttons when open", () => {
    renderModal();
    expect(screen.getByText(/save developer snapshot/i)).toBeInTheDocument();
    expect(screen.getByPlaceholderText("MM/DD/YYYY")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /^save$/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /cancel/i })).toBeInTheDocument();
  });

  it("does not render when open=false", () => {
    renderModal({ open: false });
    expect(screen.queryByText(/save developer snapshot/i)).not.toBeInTheDocument();
  });

  it("shows validation error for invalid date format without calling API", async () => {
    renderAndSave("13/40/2024");
    await waitFor(() => {
      expect(screen.getByText(/invalid date/i)).toBeInTheDocument();
    });
    expect(mockFetch).not.toHaveBeenCalled();
  });

  it("shows validation error for calendar-invalid date (02/31/2024) without calling API", async () => {
    renderAndSave("02/31/2024");
    await waitFor(() => {
      expect(screen.getByText(/invalid date/i)).toBeInTheDocument();
    });
    expect(mockFetch).not.toHaveBeenCalled();
  });

  it("calls fetch with blank date and succeeds", async () => {
    const { onOpenChange } = renderAndSave();
    await waitFor(() => {
      expect(mockFetch).toHaveBeenCalledWith(
        "/api/developers/save",
        expect.objectContaining({
          method: "POST",
          body: JSON.stringify({ username: "testuser", programEntryDate: "" }),
        })
      );
    });
    await waitFor(() => {
      expect(onOpenChange).toHaveBeenCalledWith(false);
    });
  });

  it("calls fetch with valid date and shows success toast", async () => {
    const { onOpenChange } = renderAndSave("01/12/2024");
    const { toast } = await import("sonner");

    await waitFor(() => {
      expect(toast.success).toHaveBeenCalled();
    });
    expect(onOpenChange).toHaveBeenCalledWith(false);
  });

  it("shows reload message on 409 response", async () => {
    mockFetch.mockResolvedValue({ ok: false, status: 409 });
    renderAndSave();

    await waitFor(() => {
      expect(
        screen.getByText(/please reload before saving/i)
      ).toBeInTheDocument();
    });
  });

  it("shows generic error on non-409 failure", async () => {
    mockFetch.mockResolvedValue({ ok: false, status: 500 });
    renderAndSave();

    await waitFor(() => {
      expect(screen.getByText(/failed to save/i)).toBeInTheDocument();
    });
  });

  it("calls onOpenChange(false) when Cancel is clicked without calling fetch", async () => {
    const { onOpenChange } = renderModal();

    fireEvent.click(screen.getByRole("button", { name: /cancel/i }));

    await waitFor(() => {
      expect(onOpenChange).toHaveBeenCalledWith(false);
    });
    expect(mockFetch).not.toHaveBeenCalled();
  });
});

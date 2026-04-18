# Story 1.2: Save Button and Modal UI

Status: done

## Story

As an authenticated B4OS operator viewing a loaded developer profile,
I want a Save button that opens a program entry date modal,
So that I can persist the snapshot with the correct baseline date in one action.

## Acceptance Criteria

1. **Given** a developer profile is loading or in error state — **When** the overview page renders — **Then** the Save button is NOT visible
2. **Given** a developer profile is fully loaded — **When** the overview page renders — **Then** a Save button appears near the profile header
3. **Given** the Save button is clicked — **When** the modal opens — **Then** it shows a heading, an optional date input with placeholder "MM/DD/YYYY", and Save / Cancel buttons
4. **Given** the modal is open and the user enters "13/40/2024" — **When** the user clicks Save — **Then** a validation error appears inline and no API call is made
5. **Given** the modal is open and the user enters a valid date "01/12/2024" — **When** the API returns 200 — **Then** the modal closes and a success toast is shown
6. **Given** the modal is open and the API returns 409 — **When** the save completes — **Then** the modal shows "Profile expired — please reload before saving"
7. **Given** the modal is open — **When** the user clicks Cancel — **Then** the modal closes with no API call and no state change

## Tasks / Subtasks

- [x] Task 1: Install sonner and wire Toaster (AC: 5)
  - [x] 1.1 Run `npm install sonner`
  - [x] 1.2 Create `src/components/ui/sonner.tsx` — Toaster wrapper
  - [x] 1.3 Add `<Toaster />` to `src/app/layout.tsx` inside `<Providers>`

- [x] Task 2: Create SaveDeveloperModal component (AC: 3–7)
  - [x] 2.1 Create `src/components/SaveDeveloperModal.tsx` using `@base-ui/react/dialog`
  - [x] 2.2 Props: `username: string`, `open: boolean`, `onOpenChange: (open: boolean) => void`
  - [x] 2.3 State: `dateInput: string`, `validationError: string | null`, `apiError: string | null`, `saving: boolean`
  - [x] 2.4 Client-side validation on submit: DATE_RE + calendar rollover check (same logic as server) — no API call on invalid
  - [x] 2.5 POST `/api/developers/save` with `{ username, programEntryDate: dateInput }` on valid submit
  - [x] 2.6 On 200: call `toast.success("Snapshot saved")`, close modal, reset state
  - [x] 2.7 On 409: set `apiError = "Profile expired — please reload before saving"`
  - [x] 2.8 On other error: set `apiError = "Failed to save — please try again"`
  - [x] 2.9 Reset state whenever modal closes (in `onOpenChange` handler)

- [x] Task 3: Wire Save button into DeveloperOverviewPage (AC: 1–2)
  - [x] 3.1 Add `const [saveOpen, setSaveOpen] = useState(false)` to `DeveloperOverviewPage`
  - [x] 3.2 In the `{data && ...}` block only, add Save button in the header row (alongside `<RateLimitBadge />`)
  - [x] 3.3 Button: `variant="outline"` with `onClick={() => setSaveOpen(true)}`
  - [x] 3.4 Add `<SaveDeveloperModal username={data.login} open={saveOpen} onOpenChange={setSaveOpen} />` inside the `{data && ...}` block

- [x] Task 4: Write unit tests (AC: 1–7)
  - [x] 4.1 Test: Save button NOT rendered when `isLoading = true` (mock `useOverview`)
  - [x] 4.2 Test: Save button NOT rendered when `error` is set
  - [x] 4.3 Test: Save button rendered when `data` is loaded
  - [x] 4.4 Test `SaveDeveloperModal`: clicking Save with "13/40/2024" → validation error, `fetch` not called
  - [x] 4.5 Test `SaveDeveloperModal`: clicking Save with "02/31/2024" → validation error (calendar-invalid), `fetch` not called
  - [x] 4.6 Test `SaveDeveloperModal`: blank date → `fetch` called with `programEntryDate: ""`
  - [x] 4.7 Test `SaveDeveloperModal`: API 200 → `toast.success` called, `onOpenChange(false)` called
  - [x] 4.8 Test `SaveDeveloperModal`: API 409 → "Profile expired — please reload before saving" shown inline
  - [x] 4.9 Test `SaveDeveloperModal`: Cancel button → `onOpenChange(false)` called, `fetch` not called

## Dev Notes

### Critical Patterns — MUST Follow

**Modal primitive — use `@base-ui/react/dialog` (already installed)**

Do NOT install `@radix-ui/react-dialog`. The project uses `@base-ui/react` v1.2.0. Look at `src/components/ui/sheet.tsx` — it's the reference implementation. The modal follows the same structure:

```tsx
// src/components/SaveDeveloperModal.tsx
"use client";

import { Dialog } from "@base-ui/react/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { useState } from "react";

// Dialog.Root wraps everything
// Dialog.Trigger (not used — open/close controlled externally via props)
// Dialog.Portal renders outside DOM tree
// Dialog.Backdrop — semi-transparent overlay
// Dialog.Popup — the actual modal box
// Dialog.Title — accessible heading
// Dialog.Close — close trigger
```

**Controlled open state — pass `open` and `onOpenChange` as props:**

```tsx
interface SaveDeveloperModalProps {
  username: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function SaveDeveloperModal({ username, open, onOpenChange }: SaveDeveloperModalProps) {
  const [dateInput, setDateInput] = useState("");
  const [validationError, setValidationError] = useState<string | null>(null);
  const [apiError, setApiError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  function handleOpenChange(nextOpen: boolean) {
    if (!nextOpen) {
      // Reset all state on close
      setDateInput("");
      setValidationError(null);
      setApiError(null);
      setSaving(false);
    }
    onOpenChange(nextOpen);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setValidationError(null);
    setApiError(null);

    const err = validateDate(dateInput);
    if (err) {
      setValidationError(err);
      return; // no API call
    }

    setSaving(true);
    try {
      const res = await fetch("/api/developers/save", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, programEntryDate: dateInput }),
      });
      if (res.status === 409) {
        setApiError("Profile expired — please reload before saving");
        return;
      }
      if (!res.ok) {
        setApiError("Failed to save — please try again");
        return;
      }
      toast.success("Snapshot saved");
      handleOpenChange(false);
    } catch {
      setApiError("Failed to save — please try again");
    } finally {
      setSaving(false);
    }
  }

  return (
    <Dialog.Root open={open} onOpenChange={handleOpenChange}>
      <Dialog.Portal>
        <Dialog.Backdrop className="fixed inset-0 z-50 bg-black/50" />
        <Dialog.Popup className="fixed left-1/2 top-1/2 z-50 w-full max-w-md -translate-x-1/2 -translate-y-1/2 rounded-lg bg-white p-6 shadow-xl dark:bg-zinc-900">
          <Dialog.Title className="text-lg font-semibold text-zinc-900 dark:text-zinc-50">
            Save Developer Snapshot
          </Dialog.Title>

          <form onSubmit={handleSubmit} className="mt-4 space-y-4">
            <div className="space-y-1">
              <label htmlFor="program-entry-date" className="text-sm text-zinc-600 dark:text-zinc-300">
                Program entry date <span className="text-zinc-400">(optional)</span>
              </label>
              <Input
                id="program-entry-date"
                placeholder="MM/DD/YYYY"
                value={dateInput}
                onChange={(e) => setDateInput(e.target.value)}
                aria-invalid={!!validationError}
                disabled={saving}
              />
              {validationError && (
                <p className="text-sm text-red-600 dark:text-red-400">{validationError}</p>
              )}
              {apiError && (
                <p className="text-sm text-red-600 dark:text-red-400">{apiError}</p>
              )}
            </div>

            <div className="flex justify-end gap-2">
              <Dialog.Close render={<Button variant="outline" type="button" disabled={saving} />}>
                Cancel
              </Dialog.Close>
              <Button type="submit" disabled={saving}>
                {saving ? "Saving…" : "Save"}
              </Button>
            </div>
          </form>
        </Dialog.Popup>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
```

**Client-side date validation — mirrors server logic exactly:**

```ts
const DATE_RE = /^(0[1-9]|1[0-2])\/(0[1-9]|[12]\d|3[01])\/(\d{4})$/;

function validateDate(input: string): string | null {
  if (!input.trim()) return null; // blank = valid (stored as NULL)
  if (!DATE_RE.test(input)) return "Invalid date format — expected MM/DD/YYYY";
  const [month, day, year] = input.split("/");
  const m = Number(month), d = Number(day), y = Number(year);
  const date = new Date(y, m - 1, d);
  if (date.getFullYear() !== y || date.getMonth() !== m - 1 || date.getDate() !== d) {
    return "Invalid date — day does not exist in the given month";
  }
  return null;
}
```

**Sonner Toaster setup:**

```tsx
// src/components/ui/sonner.tsx
"use client";
import { Toaster as Sonner } from "sonner";

type ToasterProps = React.ComponentProps<typeof Sonner>;

export function Toaster({ ...props }: ToasterProps) {
  return (
    <Sonner
      className="toaster group"
      toastOptions={{
        classNames: {
          toast: "group toast group-[.toaster]:bg-background group-[.toaster]:text-foreground group-[.toaster]:border-border group-[.toaster]:shadow-lg",
          description: "group-[.toast]:text-muted-foreground",
          actionButton: "group-[.toast]:bg-primary group-[.toast]:text-primary-foreground",
          cancelButton: "group-[.toast]:bg-muted group-[.toast]:text-muted-foreground",
        },
      }}
      {...props}
    />
  );
}
```

```tsx
// src/app/layout.tsx — add inside <Providers>
import { Toaster } from "@/components/ui/sonner";

// Inside RootLayout return:
<Providers>
  {children}
  <Toaster />
</Providers>
```

**Save button placement in DeveloperOverviewPage — header row (line ~79–88):**

The existing header row renders `<Link>` (back button) and `<RateLimitBadge />`. Add Save button between or alongside `<RateLimitBadge />`:

```tsx
// BEFORE: line ~79
<div className="mb-6 flex items-center justify-between">
  <Link ...>...</Link>
  <RateLimitBadge />
</div>

// AFTER: Save button only inside {data && ...} block, NOT in the always-visible header row.
// Instead add a second header row inside the data block, OR add Save as a sibling of ProfileCard:
```

**IMPORTANT**: The Save button must be INSIDE the `{data && (...)}` block (line 119 in DeveloperOverviewPage). It must NOT appear in the always-visible outer header row (which renders during loading and error states too). The cleanest approach is to render it inside the data block as an action near the `<ProfileCard>`:

```tsx
{data && (
  <div className="space-y-8">
    <div className="flex items-start justify-between gap-4">
      <div className="flex-1">
        <ProfileCard ... />
      </div>
      <Button
        variant="outline"
        className="mt-1 shrink-0"
        onClick={() => setSaveOpen(true)}
      >
        Save
      </Button>
    </div>
    ...
    <SaveDeveloperModal
      username={data.login}
      open={saveOpen}
      onOpenChange={setSaveOpen}
    />
  </div>
)}
```

**File locations:**

- New: `src/components/SaveDeveloperModal.tsx`
- New: `src/components/ui/sonner.tsx`
- Modified: `src/components/DeveloperOverviewPage.tsx` — add Save button + modal
- Modified: `src/app/layout.tsx` — add `<Toaster />`
- New: `src/components/__tests__/SaveDeveloperModal.test.tsx`

### Testing Pattern for Component

```tsx
// src/components/__tests__/SaveDeveloperModal.test.tsx
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, fireEvent, waitFor, cleanup } from "@testing-library/react";
import { SaveDeveloperModal } from "@/components/SaveDeveloperModal";

// Mock sonner — toast.success is a side effect we just verify was called
vi.mock("sonner", () => ({
  toast: { success: vi.fn() },
}));

// Mock fetch
const mockFetch = vi.fn();
vi.stubGlobal("fetch", mockFetch);

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});

function renderModal(props?: Partial<React.ComponentProps<typeof SaveDeveloperModal>>) {
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
```

**Key test: validation error, no API call:**
```tsx
it("shows validation error for invalid date format without calling API", async () => {
  renderModal();
  fireEvent.change(screen.getByPlaceholderText("MM/DD/YYYY"), {
    target: { value: "13/40/2024" },
  });
  fireEvent.click(screen.getByRole("button", { name: /^save$/i }));
  await waitFor(() => {
    expect(screen.getByText(/invalid date/i)).toBeInTheDocument();
  });
  expect(mockFetch).not.toHaveBeenCalled();
});
```

**Key test: 409 shows specific message:**
```tsx
it("shows reload message on 409 response", async () => {
  mockFetch.mockResolvedValue({ ok: false, status: 409 });
  renderModal();
  fireEvent.click(screen.getByRole("button", { name: /^save$/i }));
  await waitFor(() => {
    expect(screen.getByText(/please reload before saving/i)).toBeInTheDocument();
  });
});
```

### Anti-Patterns to Avoid

- ❌ DO NOT install `@radix-ui/react-dialog` — use `@base-ui/react/dialog` which is already installed
- ❌ DO NOT put the Save button in the outer header row — it must be INSIDE `{data && (...)}` only
- ❌ DO NOT call the API before client-side validation passes
- ❌ DO NOT use `console.log` — no logging needed in UI components
- ❌ DO NOT forget `dark:` variants on all new Tailwind classes
- ❌ DO NOT import `toast` from anywhere except `sonner`
- ❌ DO NOT hand-edit `src/components/ui/` files except `sonner.tsx` (which we're creating new)
- ❌ DO NOT use relative imports — use `@/*` path alias

### Architecture References

- [Base UI Dialog API] — `@base-ui/react/dialog`: `Dialog.Root`, `Dialog.Portal`, `Dialog.Backdrop`, `Dialog.Popup`, `Dialog.Title`, `Dialog.Close`
- [Source: src/components/ui/sheet.tsx] — reference implementation for Base UI Dialog pattern
- [Source: src/components/DeveloperOverviewPage.tsx:119] — `{data && (...)}` block where Save button goes
- [Source: src/app/layout.tsx] — add `<Toaster />` inside `<Providers>`
- [Source: src/components/__tests__/ErrorBanner.test.tsx] — reference component test pattern
- [Source: _bmad-output/implementation-artifacts/1-1-supabase-infrastructure-and-save-api.md] — Story 1.1 backend; the POST endpoint this modal calls

## Review Findings

- [x] [Review][Patch] Stale state mutation from inflight fetch after modal dismiss [src/components/SaveDeveloperModal.tsx]
- [x] [Review][Defer] No CSRF protection on POST /api/developers/save [src/app/api/developers/save/route.ts] — deferred, pre-existing (Story 1.1 scope)
- [x] [Review][Defer] Error messages missing aria-live / aria-describedby [src/components/SaveDeveloperModal.tsx] — deferred, accessibility enhancement
- [x] [Review][Defer] Orphaned developer_snapshots row when repos insert fails — no DB transaction [src/app/api/developers/save/route.ts] — deferred, pre-existing (Story 1.1 scope)
- [x] [Review][Defer] Redis failure silently returns 409 — blocks all saves during outage [src/app/api/developers/save/route.ts] — deferred, pre-existing (Story 1.1 scope)
- [x] [Review][Defer] 401/400 responses treated as generic "Failed to save" error [src/components/SaveDeveloperModal.tsx] — deferred, UX enhancement
- [x] [Review][Defer] No post-save duplicate prevention — Save button remains active after success [src/components/SaveDeveloperModal.tsx] — deferred, beyond story scope
- [x] [Review][Defer] Missing Dialog.Description alongside Dialog.Title for full accessibility [src/components/SaveDeveloperModal.tsx] — deferred, minor accessibility enhancement

## Dev Agent Record

### Agent Model Used

claude-sonnet-4-6

### Debug Log References

### Completion Notes List

### File List

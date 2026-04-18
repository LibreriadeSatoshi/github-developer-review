"use client";

import { useState, useEffect } from "react";
import { Dialog } from "@base-ui/react/dialog";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

const DATE_RE = /^(0[1-9]|1[0-2])\/(0[1-9]|[12]\d|3[01])\/(\d{4})$/;

function validateDate(input: string): string | null {
  if (!input.trim()) return null;
  if (!DATE_RE.test(input)) return "Invalid date format — expected MM/DD/YYYY";
  const [month, day, year] = input.split("/");
  const m = Number(month);
  const d = Number(day);
  const y = Number(year);
  const date = new Date(y, m - 1, d);
  if (date.getFullYear() !== y || date.getMonth() !== m - 1 || date.getDate() !== d) {
    return "Invalid date — day does not exist in the given month";
  }
  return null;
}

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

  useEffect(() => {
    if (open) {
      setDateInput("");
      setValidationError(null);
      setApiError(null);
      setSaving(false);
    }
  }, [open]);

  function handleOpenChange(nextOpen: boolean) {
    onOpenChange(nextOpen);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setValidationError(null);
    setApiError(null);

    const err = validateDate(dateInput);
    if (err) {
      setValidationError(err);
      return;
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
        <Dialog.Backdrop className="fixed inset-0 z-50 bg-black/50 dark:bg-black/70" />
        <Dialog.Popup
          className={cn(
            "fixed left-1/2 top-1/2 z-50 w-full max-w-md -translate-x-1/2 -translate-y-1/2",
            "rounded-lg bg-white p-6 shadow-xl dark:bg-zinc-900"
          )}
        >
          <Dialog.Title className="text-lg font-semibold text-zinc-900 dark:text-zinc-50">
            Save Developer Snapshot
          </Dialog.Title>

          <form onSubmit={handleSubmit} className="mt-4 space-y-4">
            <div className="space-y-1">
              <label
                htmlFor="program-entry-date"
                className="text-sm text-zinc-600 dark:text-zinc-300"
              >
                Program entry date{" "}
                <span className="text-zinc-400 dark:text-zinc-500">(optional)</span>
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
              <Dialog.Close
                render={
                  <Button variant="outline" type="button" disabled={saving} />
                }
              >
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

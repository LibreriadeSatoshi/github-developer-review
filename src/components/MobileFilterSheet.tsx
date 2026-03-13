"use client";

import { useState } from "react";
import { SlidersHorizontal } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
  SheetClose,
} from "@/components/ui/sheet";
import { DateFilterBar } from "@/components/DateFilterBar";
import { ContributionFilters } from "@/components/ContributionFilters";
import type { PresetKey } from "@/lib/date-utils";
import type { RepoClassification, RelevanceTier } from "@/lib/types";

interface MobileFilterSheetProps {
  bitcoinRepos: RepoClassification[];
  activePreset: PresetKey | "custom";
  onPresetChange: (preset: PresetKey) => void;
  project?: string;
  status: string;
  tier: string;
  onProjectChange: (project: string | undefined) => void;
  onStatusChange: (status: "open" | "closed" | "merged" | "all") => void;
  onTierChange: (tier: RelevanceTier | "all") => void;
}

function countActiveFilters(project?: string, status?: string, tier?: string): number {
  let count = 0;
  if (project) count++;
  if (status && status !== "all") count++;
  if (tier && tier !== "all") count++;
  return count;
}

export function MobileFilterSheet({
  bitcoinRepos,
  activePreset,
  onPresetChange,
  project,
  status,
  tier,
  onProjectChange,
  onStatusChange,
  onTierChange,
}: MobileFilterSheetProps) {
  const [open, setOpen] = useState(false);
  const activeCount = countActiveFilters(project, status, tier);

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger render={<Button variant="outline" size="sm" className="gap-2" />}>
          <SlidersHorizontal className="h-4 w-4" />
          Filters
          {activeCount > 0 && (
            <Badge variant="secondary" className="ml-1 h-5 w-5 rounded-full p-0 text-xs">
              {activeCount}
            </Badge>
          )}
      </SheetTrigger>
      <SheetContent side="bottom" className="max-h-[80vh] overflow-y-auto">
        <SheetHeader>
          <SheetTitle>Filters</SheetTitle>
        </SheetHeader>
        <div className="space-y-4 py-4">
          <DateFilterBar activePreset={activePreset} onPresetChange={onPresetChange} />
          <ContributionFilters
            bitcoinRepos={bitcoinRepos}
            project={project}
            status={status}
            tier={tier}
            onProjectChange={onProjectChange}
            onStatusChange={onStatusChange}
            onTierChange={onTierChange}
          />
        </div>
        <SheetClose render={<Button className="w-full" />}>
          Done
        </SheetClose>
      </SheetContent>
    </Sheet>
  );
}

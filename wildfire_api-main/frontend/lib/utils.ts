import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

// Shared tooltip classes for overlays on maps/charts
export const tooltipClasses = "pointer-events-none absolute z-20 max-w-[240px] rounded-md px-3 py-2 text-xs shadow-lg border bg-background/90 backdrop-blur border-border text-foreground dark:bg-black/85 dark:text-white dark:border-white/10";

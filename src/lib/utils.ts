import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatCurrency(value: number): string {
  if (!value && value !== 0) return "$0";

  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(value);
}

export function formatPercentage(value: number): string {
  if (!value && value !== 0) return "0%";

  const formatted = new Intl.NumberFormat("en-US", {
    style: "percent",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
    signDisplay: "exceptZero",
  }).format(value / 100);

  return formatted;
}

export function formatNumber(
  value: number | undefined,
  format: "compact" | "default" = "default"
): string {
  if (value === undefined || value === null) return "0";

  return new Intl.NumberFormat("en-US", {
    maximumFractionDigits: 2,
    notation: format === "compact" ? "compact" : "standard",
  }).format(value);
}
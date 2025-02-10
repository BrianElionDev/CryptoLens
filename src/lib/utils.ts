import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatNumber(
  value: number,
  type: "price" | "marketcap" | "volume" | "percentage"
): string {
  if (type === "percentage") {
    return value.toFixed(1) + "%";
  }

  if (value === 0) return "0";

  switch (type) {
    case "price":
      if (value < 1) {
        return value.toFixed(4);
      }
      if (value < 10) {
        return value.toFixed(3);
      }
      return value.toLocaleString("en-US", {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      });

    case "marketcap":
    case "volume":
      if (value >= 1e9) {
        return (value / 1e9).toFixed(2) + "B";
      }
      if (value >= 1e6) {
        return (value / 1e6).toFixed(2) + "M";
      }
      if (value >= 1e3) {
        return (value / 1e3).toFixed(2) + "K";
      }
      return value.toFixed(2);

    default:
      return value.toString();
  }
}

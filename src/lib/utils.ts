import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatNumber(
  num: number,
  type: "price" | "percentage" | "volume" | "marketcap" = "price"
): string {
  if (num === 0) return "0";

  switch (type) {
    case "price":
      if (num >= 1_000_000) {
        return `${(num / 1_000_000).toFixed(2)}M`;
      } else if (num >= 1) {
        return num.toLocaleString(undefined, {
          minimumFractionDigits: 2,
          maximumFractionDigits: 2,
        });
      } else if (num >= 0.0001) {
        return num.toLocaleString(undefined, {
          minimumFractionDigits: 4,
          maximumFractionDigits: 6,
        });
      } else {
        return num.toExponential(4);
      }

    case "percentage":
      return (
        (num >= 0 ? "+" : "") +
        num.toLocaleString(undefined, {
          minimumFractionDigits: 2,
          maximumFractionDigits: 2,
        }) +
        "%"
      );

    case "volume":
    case "marketcap":
      if (num >= 1e12) {
        return `${(num / 1e12).toLocaleString(undefined, {
          minimumFractionDigits: 2,
          maximumFractionDigits: 2,
        })}T`;
      }
      if (num >= 1e9) {
        return `${(num / 1e9).toLocaleString(undefined, {
          minimumFractionDigits: 2,
          maximumFractionDigits: 2,
        })}B`;
      }
      if (num >= 1e6) {
        return `${(num / 1e6).toLocaleString(undefined, {
          minimumFractionDigits: 2,
          maximumFractionDigits: 2,
        })}M`;
      }
      if (num >= 1e3) {
        return `${(num / 1e3).toLocaleString(undefined, {
          minimumFractionDigits: 2,
          maximumFractionDigits: 2,
        })}K`;
      }
      return num.toLocaleString(undefined, {
        maximumFractionDigits: 0,
      });
  }
}

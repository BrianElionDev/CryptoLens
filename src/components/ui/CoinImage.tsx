"use client";

import { useState, useEffect } from "react";

interface CoinImageProps {
  src: string;
  alt: string;
  width?: number;
  height?: number;
  className?: string;
  fallbackText?: string;
  coinId?: string | number;
  source?: "coingecko" | "cmc";
}

export function CoinImage({
  src,
  alt,
  width = 32,
  height = 32,
  className = "",
  fallbackText,
  coinId,
  source,
}: CoinImageProps) {
  // Determine initial image source based on the provided source
  const getInitialImageUrl = (): string => {
    // If explicitly marked as CMC and has coinId, use CMC URL directly
    if (source === "cmc" && coinId) {
      return `https://s2.coinmarketcap.com/static/img/coins/64x64/${coinId}.png`;
    }
    // Otherwise use the provided src
    return src;
  };

  const [imgSrc, setImgSrc] = useState<string>(getInitialImageUrl());
  const [hasError, setHasError] = useState(false);

  // Update image source if props change
  useEffect(() => {
    // Determine image source based on the provided source
    const getInitialImageUrl = (): string => {
      // If explicitly marked as CMC and has coinId, use CMC URL directly
      if (source === "cmc" && coinId) {
        return `https://s2.coinmarketcap.com/static/img/coins/64x64/${coinId}.png`;
      }
      // Otherwise use the provided src
      return src;
    };

    setImgSrc(getInitialImageUrl());
    setHasError(false);
  }, [src, coinId, source]);

  // Handle error when image fails to load
  const handleError = () => {
    // Already using CMC source but failed
    if (source === "cmc" || imgSrc.includes("coinmarketcap")) {
      // Try CoinGecko as fallback if we have a recognizable CoinGecko ID
      if (coinId && typeof coinId === "string" && !coinId.match(/^\d+$/)) {
        setImgSrc(
          `https://assets.coingecko.com/coins/images/1/small/${coinId}.png`
        );
        return;
      }
      setHasError(true);
      return;
    }

    // Using CoinGecko but failed, try CMC if we have a numeric ID
    if ((source === "coingecko" || imgSrc.includes("coingecko")) && coinId) {
      setImgSrc(
        `https://s2.coinmarketcap.com/static/img/coins/64x64/${coinId}.png`
      );
      return;
    }

    setHasError(true);
  };

  if (hasError) {
    // Fallback to SVG with initials
    const initials =
      fallbackText ||
      alt
        .split(" ")
        .map((word) => word.charAt(0))
        .slice(0, 2)
        .join("")
        .toUpperCase();

    return (
      <div
        className={`flex items-center justify-center bg-blue-500/20 text-blue-300 rounded-full ${className}`}
        style={{ width, height }}
      >
        {initials.slice(0, 2)}
      </div>
    );
  }

  return (
    <img
      src={imgSrc}
      alt={alt}
      width={width}
      height={height}
      className={`rounded-full ${className}`}
      onError={handleError}
      loading="lazy"
    />
  );
}

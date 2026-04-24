import React from 'react';
import { cn } from "@/lib/utils";

interface GridLoaderProps {
  loadingText?: string;
  itemsCount?: number;
  className?: string;
  isOverlay?: boolean;
}

/**
 * GridLoader — Unified loading state component.
 * Uses the Industrial Craft design system:
 *   - Amber primary tiles  (#D97706 / #F59E0B)
 *   - Warm neutral fill    (#E8E2D9)
 *   - Amber progress bar
 *
 * Replace ALL inline loaders with <GridLoader loadingText="…" />
 * Do NOT create ad-hoc loading UI anywhere else in the codebase.
 */
export const GridLoader: React.FC<GridLoaderProps> = ({
  loadingText = "Loading...",
  itemsCount = 12,
  className,
  isOverlay = false,
}) => {
  // Tile colour palette: amber-primary / warm-neutral / amber-light
  const tileColors = ['#D97706', '#E8E2D9', '#F59E0B'];

  const containerClasses = cn(
    "flex items-center justify-center w-full",
    isOverlay
      ? "fixed inset-0 z-50 min-h-screen"
      : "min-h-[40vh]",
    className
  );

  return (
    <div
      className={containerClasses}
      style={
        isOverlay
          ? { background: 'hsla(36,20%,97%,0.88)', backdropFilter: 'blur(6px)' }
          : undefined
      }
    >
      <div className="text-center select-none">
        {/* Tile grid animation */}
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(4, 18px)',
            gridTemplateRows: 'repeat(3, 18px)',
            gap: '6px',
            justifyContent: 'center',
            marginBottom: '20px',
          }}
        >
          {Array.from({ length: itemsCount }).map((_, i) => (
            <div
              key={i}
              style={{
                width: 18,
                height: 18,
                borderRadius: 3,
                backgroundColor: tileColors[i % tileColors.length],
                animation: 'tileAnimation 1.2s ease-in-out infinite',
                animationDelay: `${i * 0.08}s`,
              }}
            />
          ))}
        </div>

        {/* Loading text */}
        <p
          style={{
            fontFamily: "'Manrope', sans-serif",
            fontSize: 13,
            fontWeight: 600,
            letterSpacing: '0.03em',
            color: 'hsl(220, 10%, 48%)',
            marginBottom: 14,
          }}
        >
          {loadingText}
        </p>

        {/* Amber progress bar */}
        <div
          style={{
            width: 160,
            height: 3,
            backgroundColor: 'hsl(36,12%,87%)',
            borderRadius: 99,
            overflow: 'hidden',
            margin: '0 auto',
          }}
        >
          <div
            style={{
              height: '100%',
              width: '100%',
              background: 'linear-gradient(90deg, #D97706, #F59E0B, #D97706)',
              backgroundSize: '200% 100%',
              animation: 'progressFlow 1.8s linear infinite',
            }}
          />
        </div>
      </div>
    </div>
  );
};

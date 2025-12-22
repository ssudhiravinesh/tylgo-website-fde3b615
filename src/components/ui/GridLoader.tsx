import React from 'react';
import { cn } from "@/lib/utils";

interface GridLoaderProps {
    loadingText?: string;
    itemsCount?: number;
    className?: string; // Allow custom class for container
    isOverlay?: boolean; // Option for full screen overlay
}

export const GridLoader: React.FC<GridLoaderProps> = ({
    loadingText = "Loading...",
    itemsCount = 12,
    className,
    isOverlay = false
}) => {
    const styles = {
        tilesContainer: {
            display: 'grid',
            gridTemplateColumns: 'repeat(4, 20px)',
            gridTemplateRows: 'repeat(3, 20px)',
            gap: '8px',
            justifyContent: 'center',
            marginBottom: '24px',
        } as React.CSSProperties,
        tile: {
            width: '20px',
            height: '20px',
            borderRadius: '4px',
            animation: 'tileAnimation 1.2s ease-in-out infinite',
        } as React.CSSProperties,
        tileBlue: {
            backgroundColor: '#3B82F6',
        },
        tileBeige: {
            backgroundColor: '#F5F5DC',
        },
        tileLight: {
            backgroundColor: '#93C5FD',
        },
        loadingText: {
            color: '#6B7280',
            fontSize: '16px',
            fontWeight: '500',
            marginBottom: '16px',
        },
        progressBar: {
            width: '200px',
            height: '4px',
            backgroundColor: '#E5E7EB',
            borderRadius: '2px',
            overflow: 'hidden',
            margin: '0 auto',
        },
        progressFill: {
            height: '100%',
            width: '100%',
            background: 'linear-gradient(90deg, #3B82F6, #93C5FD, #3B82F6)',
            backgroundSize: '200% 100%',
            animation: 'progressFlow 2s linear infinite',
            backgroundRepeat: 'no-repeat',
        },
    };

    const containerClasses = cn(
        "flex items-center justify-center w-full",
        isOverlay ? "fixed inset-0 bg-white/80 z-50 min-h-screen" : "min-h-[50vh]",
        className
    );

    return (
        <div className={containerClasses}>
            <div className="text-center">
                {/* Tile Loading Animation */}
                <div style={styles.tilesContainer}>
                    {Array.from({ length: itemsCount }).map((_, index) => (
                        <div
                            key={index}
                            style={{
                                ...styles.tile,
                                ...(index % 3 === 0 ? styles.tileBlue : index % 3 === 1 ? styles.tileBeige : styles.tileLight),
                                animationDelay: `${index * 0.08}s`
                            }}
                        />
                    ))}
                </div>

                <p style={styles.loadingText}>{loadingText}</p>

                <div style={styles.progressBar}>
                    <div style={styles.progressFill}></div>
                </div>
            </div>
        </div>
    );
};

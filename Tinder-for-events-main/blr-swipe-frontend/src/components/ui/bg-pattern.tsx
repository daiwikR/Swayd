import { cn } from '@/lib/utils';

type PatternVariant = 'dots' | 'grid' | 'diagonal';

interface BGPatternProps {
  variant?: PatternVariant;
  className?: string;
  color?: string;
  size?: number;
  /** Fade the edges out */
  fade?: boolean;
}

export function BGPattern({
  variant = 'dots',
  className,
  color = 'rgba(255,255,255,0.045)',
  size = 24,
  fade = true,
}: BGPatternProps) {
  const patterns: Record<PatternVariant, string> = {
    dots: `radial-gradient(circle, ${color} 1px, transparent 1px)`,
    grid: `linear-gradient(${color} 1px, transparent 1px), linear-gradient(90deg, ${color} 1px, transparent 1px)`,
    diagonal: `repeating-linear-gradient(45deg, ${color} 0px, ${color} 1px, transparent 0px, transparent 50%)`,
  };

  const sizes: Record<PatternVariant, string> = {
    dots: `${size}px ${size}px`,
    grid: `${size}px ${size}px`,
    diagonal: `${size}px ${size}px`,
  };

  return (
    <div
      aria-hidden="true"
      className={cn('pointer-events-none absolute inset-0 z-0', className)}
      style={{
        backgroundImage: patterns[variant],
        backgroundSize: sizes[variant],
        maskImage: fade
          ? 'radial-gradient(ellipse 80% 80% at 50% 50%, rgba(0,0,0,0.6) 0%, transparent 100%)'
          : undefined,
        WebkitMaskImage: fade
          ? 'radial-gradient(ellipse 80% 80% at 50% 50%, rgba(0,0,0,0.6) 0%, transparent 100%)'
          : undefined,
      }}
    />
  );
}

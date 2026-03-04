import { cn } from '@/lib/utils';

// Inject once globally in App.tsx — provides the SVG filter used by GlassEffect
export function GlassFilter() {
  return (
    <svg
      style={{ position: 'fixed', width: 0, height: 0, overflow: 'hidden', pointerEvents: 'none' }}
      aria-hidden="true"
    >
      <defs>
        <filter id="glass-distortion" x="-20%" y="-20%" width="140%" height="140%" colorInterpolationFilters="sRGB">
          <feTurbulence
            type="fractalNoise"
            baseFrequency="0.65"
            numOctaves="3"
            stitchTiles="stitch"
            result="noise"
          />
          <feDisplacementMap
            in="SourceGraphic"
            in2="noise"
            scale="8"
            xChannelSelector="R"
            yChannelSelector="G"
            result="distorted"
          />
          <feComposite in="distorted" in2="SourceGraphic" operator="in" />
        </filter>
      </defs>
    </svg>
  );
}

interface GlassEffectProps {
  children: React.ReactNode;
  className?: string;
  style?: React.CSSProperties;
  intensity?: 'low' | 'medium' | 'high';
}

export function GlassEffect({
  children,
  className,
  style,
  intensity = 'medium',
}: GlassEffectProps) {
  const blurs: Record<string, string> = { low: '6px', medium: '12px', high: '20px' };
  const opacities: Record<string, number> = { low: 0.04, medium: 0.07, high: 0.12 };

  return (
    <div
      className={cn('relative rounded-2xl overflow-hidden', className)}
      style={{
        backdropFilter: `blur(${blurs[intensity]})`,
        WebkitBackdropFilter: `blur(${blurs[intensity]})`,
        background: `rgba(255,255,255,${opacities[intensity]})`,
        border: '1px solid rgba(255,255,255,0.08)',
        boxShadow: '0 4px 32px rgba(0,0,0,0.4), inset 0 1px 0 rgba(255,255,255,0.06)',
        ...style,
      }}
    >
      {/* Inner distortion layer */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 z-0"
        style={{
          background:
            'radial-gradient(ellipse at 30% 20%, rgba(255,255,255,0.06) 0%, transparent 60%)',
        }}
      />
      <div className="relative z-10">{children}</div>
    </div>
  );
}

// Convenience dock-style glass card (same as stat-card but liquid)
export function GlassCard({
  children,
  className,
  style,
}: {
  children: React.ReactNode;
  className?: string;
  style?: React.CSSProperties;
}) {
  return (
    <GlassEffect
      className={cn('p-4', className)}
      style={style}
    >
      {children}
    </GlassEffect>
  );
}

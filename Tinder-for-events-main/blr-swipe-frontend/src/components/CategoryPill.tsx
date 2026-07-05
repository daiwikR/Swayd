import type { EventCategory } from '../types';
import { CATEGORY_CONFIG } from '../types';

/**
 * Neutral category chip: hairline border, uppercase micro-label, and a small
 * colored dot carrying the category accent — instead of solid neon pills.
 */
export default function CategoryPill({ category, className = '' }: { category?: EventCategory; className?: string }) {
  const cfg = CATEGORY_CONFIG[category || 'other'] || CATEGORY_CONFIG.other;
  return (
    <span
      className={`category-pill ${className}`}
      style={{
        background: 'rgba(10,10,10,0.65)',
        border: '1px solid rgba(255,255,255,0.14)',
        color: '#fff',
        backdropFilter: 'blur(8px)',
      }}
    >
      <span
        aria-hidden="true"
        style={{ width: 6, height: 6, borderRadius: 999, background: cfg.color, display: 'inline-block' }}
      />
      {cfg.label}
    </span>
  );
}

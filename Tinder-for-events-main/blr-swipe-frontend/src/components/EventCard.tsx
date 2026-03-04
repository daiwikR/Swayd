import type { CardType } from '../types';
import { CATEGORY_CONFIG } from '../types';

const FALLBACK_IMAGES: Record<string, string> = {
  fitness:    'https://images.unsplash.com/photo-1534438327276-14e5300c3a48?w=600&q=80',
  music:      'https://images.unsplash.com/photo-1493225457124-a3eb161ffa5f?w=600&q=80',
  tech:       'https://images.unsplash.com/photo-1531297484001-80022131f5a1?w=600&q=80',
  food:       'https://images.unsplash.com/photo-1414235077428-338989a2e8c0?w=600&q=80',
  art:        'https://images.unsplash.com/photo-1541961017774-22349e4a1262?w=600&q=80',
  nightlife:  'https://images.unsplash.com/photo-1571204829887-3b8d69e4094d?w=600&q=80',
  sports:     'https://images.unsplash.com/photo-1461896836934-ffe607ba8211?w=600&q=80',
  wellness:   'https://images.unsplash.com/photo-1518611012118-696072aa579a?w=600&q=80',
  comedy:     'https://images.unsplash.com/photo-1527224857830-43a7acc85260?w=600&q=80',
  networking: 'https://images.unsplash.com/photo-1515187029135-18ee286d815b?w=600&q=80',
  other:      'https://images.unsplash.com/photo-1501281668745-f7f57925c3b4?w=600&q=80',
};

interface EventCardProps {
  card: CardType;
  swipeDir?: 'left' | 'right' | null;
}

export default function EventCard({ card, swipeDir }: EventCardProps) {
  const cat = card.category || 'other';
  const cfg = CATEGORY_CONFIG[cat] || CATEGORY_CONFIG.other;
  const imgSrc = card.image_url || FALLBACK_IMAGES[cat] || FALLBACK_IMAGES.other;

  const formattedDate = card.datetime
    ? new Date(card.datetime).toLocaleDateString('en-IN', {
        weekday: 'short', month: 'short', day: 'numeric',
        hour: '2-digit', minute: '2-digit'
      })
    : null;

  const price = card.price === 0 ? 'FREE' : card.price ? `₹${card.price}` : null;

  return (
    <div
      className="relative select-none overflow-hidden"
      style={{ width: '100%', maxWidth: 420, height: 560, borderRadius: '1.5rem', background: '#111' }}
      draggable={false}
    >
      {/* Background image */}
      <img
        src={imgSrc}
        alt={card.title}
        draggable={false}
        className="absolute inset-0 w-full h-full object-cover"
      />

      {/* Gradient scrim */}
      <div
        className="absolute inset-0"
        style={{ background: 'linear-gradient(to top, rgba(0,0,0,0.96) 0%, rgba(0,0,0,0.4) 55%, rgba(0,0,0,0.05) 100%)' }}
      />

      {/* Swipe tint overlays */}
      {swipeDir === 'right' && (
        <div className="absolute inset-0" style={{ background: 'rgba(57,255,20,0.22)', borderRadius: '1.5rem', pointerEvents: 'none' }} />
      )}
      {swipeDir === 'left' && (
        <div className="absolute inset-0" style={{ background: 'rgba(255,45,120,0.22)', borderRadius: '1.5rem', pointerEvents: 'none' }} />
      )}

      {/* Swipe feedback badges */}
      {swipeDir === 'right' && (
        <div className="absolute top-8 left-6 border-4 rounded-xl px-4 py-2" style={{ borderColor: '#39FF14', color: '#39FF14', transform: 'rotate(-20deg)' }}>
          <span className="font-display text-3xl tracking-wider">LIKE</span>
        </div>
      )}
      {swipeDir === 'left' && (
        <div className="absolute top-8 right-6 border-4 rounded-xl px-4 py-2" style={{ borderColor: '#FF2D78', color: '#FF2D78', transform: 'rotate(20deg)' }}>
          <span className="font-display text-3xl tracking-wider">NOPE</span>
        </div>
      )}

      {/* Top-right badges */}
      <div className="absolute top-4 right-4 flex flex-col items-end gap-2">
        {card.is_recommended && (
          <div className="px-2 py-1 rounded-md text-xs font-semibold" style={{ background: 'rgba(0,0,0,0.75)', color: '#FFD166' }}>
            ⚡ FOR YOU
          </div>
        )}
        {card.age_rating && card.age_rating !== 'ALL_AGES' && (
          <div className="px-2 py-1 rounded-md text-xs font-semibold" style={{ background: 'rgba(255,107,53,0.3)', color: '#FF6B35', border: '1px solid rgba(255,107,53,0.5)' }}>
            {card.age_rating}
          </div>
        )}
        {card.source === 'bookmyshow' && (
          <div className="px-2 py-1 rounded-md text-xs font-bold" style={{ background: 'rgba(255,45,0,0.3)', color: '#FF6B35', border: '1px solid rgba(255,107,53,0.5)' }}>
            BMS
          </div>
        )}
        {card.source === 'district' && (
          <div className="px-2 py-1 rounded-md text-xs font-bold" style={{ background: 'rgba(0,212,255,0.2)', color: '#00D4FF', border: '1px solid rgba(0,212,255,0.4)' }}>
            DISTRICT
          </div>
        )}
        {card.source === 'allevents' && (
          <div className="px-2 py-1 rounded-md text-xs font-bold" style={{ background: 'rgba(199,125,255,0.2)', color: '#C77DFF', border: '1px solid rgba(199,125,255,0.4)' }}>
            EVENTS
          </div>
        )}
        {card.source === 'meetup' && (
          <div className="px-2 py-1 rounded-md text-xs font-bold" style={{ background: 'rgba(237,26,59,0.2)', color: '#ED1A3B', border: '1px solid rgba(237,26,59,0.4)' }}>
            MEETUP
          </div>
        )}
      </div>

      {/* Bottom content */}
      <div className="absolute bottom-0 left-0 right-0 p-5">
        <div className="mb-3">
          <span className="category-pill font-bold" style={{ background: cfg.color, color: '#000' }}>
            {cfg.emoji} {cfg.label}
          </span>
        </div>
        <h2 className="font-display text-4xl leading-none text-white mb-3 uppercase" style={{ letterSpacing: '0.04em' }}>
          {card.title}
        </h2>
        <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-gray-300 mb-2">
          {card.location && <span>📍 {card.location}</span>}
          {formattedDate && <span>🗓 {formattedDate}</span>}
          {price && (
            <span className="px-2 py-0.5 rounded-md text-xs font-semibold"
              style={{ background: price === 'FREE' ? 'rgba(6,214,160,0.2)' : 'rgba(255,159,28,0.2)', color: price === 'FREE' ? '#06D6A0' : '#FF9F1C' }}>
              {price}
            </span>
          )}
        </div>
        {card.description && (
          <p className="text-sm text-gray-400 line-clamp-2 leading-relaxed">{card.description}</p>
        )}
      </div>
    </div>
  );
}
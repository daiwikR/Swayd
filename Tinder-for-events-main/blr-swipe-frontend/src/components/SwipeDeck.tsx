import { useState, useRef } from 'react';
import { motion, useMotionValue, useTransform, animate, type PanInfo } from 'framer-motion';
import EventCard from './EventCard';
import type { CardType } from '../types';
import api from '../api';
import toast from 'react-hot-toast';
import RSVPModal from '../pages/RSVPModal';

interface Props {
  initialCards: CardType[];
  onSwipe?: (dir: 'left' | 'right', card: CardType) => void;
}

const SWIPE_THRESHOLD = 100;

function SwipeableCard({
  card,
  onSwiped,
  isTop,
  stackIndex
}: {
  card: CardType;
  onSwiped: (dir: 'left' | 'right') => void;
  isTop: boolean;
  stackIndex: number;
}) {
  const x = useMotionValue(0);
  const rotate = useTransform(x, [-200, 200], [-18, 18]);
  const [dragDir, setDragDir] = useState<'left' | 'right' | null>(null);

  function onDrag(_: PointerEvent, info: PanInfo) {
    if (info.offset.x > 20) setDragDir('right');
    else if (info.offset.x < -20) setDragDir('left');
    else setDragDir(null);
  }

  function onDragEnd(_: PointerEvent, info: PanInfo) {
    const offset = info.offset.x;
    const velocity = info.velocity.x;
    if (offset > SWIPE_THRESHOLD || velocity > 500) {
      flyOut('right');
    } else if (offset < -SWIPE_THRESHOLD || velocity < -500) {
      flyOut('left');
    } else {
      // Snap back
      animate(x, 0, { type: 'spring', stiffness: 400, damping: 25 });
      setDragDir(null);
    }
  }

  function flyOut(dir: 'left' | 'right') {
    const target = dir === 'right' ? 600 : -600;
    animate(x, target, {
      type: 'tween',
      duration: 0.35,
      ease: 'easeOut',
      onComplete: () => onSwiped(dir)
    });
  }

  const scale = 1 - stackIndex * 0.04;
  const yOffset = stackIndex * 12;

  if (!isTop) {
    return (
      <motion.div
        className="absolute inset-0 flex items-center justify-center"
        style={{ scale, y: yOffset, zIndex: 10 - stackIndex, pointerEvents: 'none' }}
        animate={{ scale, y: yOffset }}
        transition={{ type: 'spring', stiffness: 300 }}
      >
        <EventCard card={card} />
      </motion.div>
    );
  }

  return (
    <motion.div
      className="absolute inset-0 flex items-center justify-center swipe-card"
      style={{ x, rotate, zIndex: 20 }}
      drag="x"
      dragConstraints={{ left: 0, right: 0 }}
      dragElastic={0.9}
      onDrag={onDrag as any}
      onDragEnd={onDragEnd as any}
      whileTap={{ cursor: 'grabbing' }}
    >
      <EventCard card={card} swipeDir={dragDir} />
    </motion.div>
  );
}

export default function SwipeDeck({ initialCards, onSwipe }: Props) {
  const [cards, setCards] = useState<CardType[]>(initialCards);
  const [ripple, setRipple] = useState<{ dir: 'left' | 'right' } | null>(null);
  const [rsvpCard, setRsvpCard] = useState<CardType | null>(null);
  const rippleTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const handleSwiped = async (dir: 'left' | 'right', card: CardType) => {
    setCards(prev => prev.filter(c => c._id !== card._id));
    onSwipe?.(dir, card);

    // Ripple flash
    if (dir === 'right') {
      setRipple({ dir: 'right' });
      if (rippleTimer.current) clearTimeout(rippleTimer.current);
      rippleTimer.current = setTimeout(() => setRipple(null), 700);
    }

    try {
      await api.post('/api/swipe', { eventId: card._id, direction: dir });

      // Trigger RSVP modal after right swipe on RSVP-enabled events
      if (dir === 'right' && card.rsvp_enabled) {
        setTimeout(() => setRsvpCard(card), 400);
      }
    } catch {
      toast.error('Swipe failed — try again');
    }
  };

  const handleButton = (dir: 'left' | 'right') => {
    if (cards.length === 0) return;
    handleSwiped(dir, cards[cards.length - 1]);
  };

  if (cards.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-[560px] gap-4 text-center px-4">
        <div className="text-5xl">✨</div>
        <p className="font-display text-3xl tracking-wider text-white">ALL CAUGHT UP</p>
        <p className="text-sm text-gray-600">No more events right now. Check back soon!</p>
      </div>
    );
  }

  // Show top 3 cards stacked
  const visible = cards.slice(-3).reverse();

  return (
    <>
      <div className="relative select-none">
        {/* Ripple flash overlay */}
        {ripple && (
          <div
            className="fixed inset-0 pointer-events-none z-50 flex items-center justify-center"
            style={{ background: ripple.dir === 'right' ? 'rgba(57,255,20,0.08)' : 'rgba(255,45,120,0.08)' }}
          />
        )}

        {/* Card stack */}
        <div className="relative mx-auto" style={{ width: '100%', maxWidth: 420, height: 560 }}>
          {visible.map((card, i) => {
            const isTop = i === 0;
            const stackIndex = visible.length - 1 - i;
            return (
              <SwipeableCard
                key={card._id}
                card={card}
                isTop={isTop}
                stackIndex={stackIndex}
                onSwiped={dir => handleSwiped(dir, card)}
              />
            );
          })}
        </div>

        {/* Action buttons */}
        <div className="flex items-center justify-center gap-5 mt-6">
          <button
            onClick={() => handleButton('left')}
            className="w-14 h-14 rounded-full flex items-center justify-center text-xl transition-all hover:scale-110 active:scale-95"
            style={{ background: '#1A1A1A', border: '2px solid #FF2D78', color: '#FF2D78', boxShadow: '0 0 0 0 rgba(255,45,120,0)' }}
            onMouseEnter={e => (e.currentTarget.style.boxShadow = '0 0 16px rgba(255,45,120,0.4)')}
            onMouseLeave={e => (e.currentTarget.style.boxShadow = '0 0 0 0 rgba(255,45,120,0)')}
            aria-label="Dislike"
          >
            ✕
          </button>
          <div className="text-xs text-gray-600">{cards.length} events</div>
          <button
            onClick={() => handleButton('right')}
            className="w-14 h-14 rounded-full flex items-center justify-center text-xl transition-all hover:scale-110 active:scale-95"
            style={{ background: '#1A1A1A', border: '2px solid #39FF14', color: '#39FF14' }}
            onMouseEnter={e => (e.currentTarget.style.boxShadow = '0 0 16px rgba(57,255,20,0.4)')}
            onMouseLeave={e => (e.currentTarget.style.boxShadow = '0 0 0 0 rgba(57,255,20,0)')}
            aria-label="Like"
          >
            ♡
          </button>
        </div>
      </div>

      {/* RSVP Modal */}
      {rsvpCard && (
        <RSVPModal
          card={rsvpCard}
          onClose={() => setRsvpCard(null)}
        />
      )}
    </>
  );
}

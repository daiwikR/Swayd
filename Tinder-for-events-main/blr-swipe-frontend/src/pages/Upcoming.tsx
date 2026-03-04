import { useEffect, useState } from 'react';
import type { CardType } from '../types';
import { CATEGORY_CONFIG } from '../types';
import api from '../api';
import toast from 'react-hot-toast';
import { GlassEffect } from '../components/ui/liquid-glass';
import RSVPModal from './RSVPModal';

type RSVPEntry = {
  event_id: string;
  seat_code: string;
  status: string;
};

function UpcomingCard({
  card,
  rsvp,
  onViewQR,
}: {
  card: CardType;
  rsvp?: RSVPEntry;
  onViewQR: (card: CardType) => void;
}) {
  const cat = card.category || 'other';
  const cfg = CATEGORY_CONFIG[cat] || CATEGORY_CONFIG.other;

  const date = card.datetime
    ? new Date(card.datetime).toLocaleDateString('en-IN', {
        weekday: 'long', month: 'short', day: 'numeric',
      })
    : null;
  const time = card.datetime
    ? new Date(card.datetime).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })
    : null;

  const price = card.price === 0 ? 'FREE' : card.price ? `₹${card.price}` : null;

  const sourceLabel =
    card.source === 'bookmyshow' ? 'BookMyShow' :
    card.source === 'district' ? 'District.in' :
    card.source === 'allevents' ? 'Allevents.in' :
    card.source === 'meetup' ? 'Meetup' : null;

  return (
    <GlassEffect intensity="low" className="p-4">
      <div className="flex items-start gap-3">
        {/* Category dot */}
        <div
          style={{
            width: 10, height: 10, borderRadius: '50%',
            background: cfg.color, flexShrink: 0, marginTop: 5
          }}
        />
        <div className="flex-1 min-w-0">
          {/* Category pill */}
          <div className="flex items-center gap-2 mb-1.5 flex-wrap">
            <span
              className="text-xs font-semibold px-2 py-0.5 rounded-full"
              style={{ background: cfg.bg, color: cfg.color }}
            >
              {cfg.emoji} {cfg.label}
            </span>
            {price && (
              <span
                className="text-xs font-semibold px-2 py-0.5 rounded-full"
                style={{
                  background: price === 'FREE' ? 'rgba(6,214,160,0.15)' : 'rgba(255,159,28,0.15)',
                  color: price === 'FREE' ? '#06D6A0' : '#FF9F1C'
                }}
              >
                {price}
              </span>
            )}
            {rsvp && rsvp.status === 'confirmed' && (
              <span className="text-xs font-semibold px-2 py-0.5 rounded-full" style={{ background: 'rgba(57,255,20,0.12)', color: '#39FF14' }}>
                ✓ RSVP&apos;d
              </span>
            )}
          </div>

          {/* Title */}
          <div className="font-semibold text-white text-sm mb-1">{card.title}</div>

          {/* Date + location */}
          <div className="text-xs text-gray-500 space-y-0.5">
            {date && <div>🗓 {date}{time ? ` at ${time}` : ''}</div>}
            {card.location && <div>📍 {card.location}</div>}
          </div>

          {/* Actions */}
          <div className="flex gap-2 mt-3 flex-wrap">
            {card.source_url && (
              <a
                href={card.source_url}
                target="_blank"
                rel="noopener noreferrer"
                className="text-xs font-semibold px-3 py-1.5 rounded-lg transition-all"
                style={{ background: 'rgba(0,212,255,0.1)', color: '#00D4FF', border: '1px solid rgba(0,212,255,0.3)', textDecoration: 'none' }}
              >
                {sourceLabel ? `Book on ${sourceLabel} →` : 'Book →'}
              </a>
            )}
            {rsvp && rsvp.status === 'confirmed' && (
              <button
                onClick={() => onViewQR(card)}
                className="text-xs font-semibold px-3 py-1.5 rounded-lg transition-all"
                style={{ background: 'rgba(57,255,20,0.1)', color: '#39FF14', border: '1px solid rgba(57,255,20,0.3)' }}
              >
                View QR
              </button>
            )}
          </div>
        </div>
      </div>
    </GlassEffect>
  );
}

export default function Upcoming() {
  const [upcoming, setUpcoming] = useState<CardType[]>([]);
  const [rsvps, setRsvps] = useState<RSVPEntry[]>([]);
  const [qrCard, setQrCard] = useState<CardType | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const [profileRes, rsvpRes] = await Promise.all([
          api.get('/api/profile'),
          api.get('/api/rsvp/my').catch(() => ({ data: { rsvps: [] } })),
        ]);
        setUpcoming(profileRes.data.upcoming || []);
        setRsvps(rsvpRes.data.rsvps || []);
      } catch {
        toast.error('Failed to load upcoming events');
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  // Sort ascending by date
  const sorted = [...upcoming].sort((a, b) => {
    if (!a.datetime) return 1;
    if (!b.datetime) return -1;
    return new Date(a.datetime).getTime() - new Date(b.datetime).getTime();
  });

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-gray-600 text-sm">Loading...</div>
      </div>
    );
  }

  return (
    <div className="px-4 pt-6 pb-28 max-w-lg mx-auto">
      <h1 className="font-display text-4xl tracking-wider text-white mb-1">UPCOMING</h1>
      <p className="text-sm text-gray-500 mb-6">Your liked future events</p>

      {sorted.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-center gap-4">
          <div className="text-5xl">📅</div>
          <p className="font-display text-2xl tracking-wider text-white">NOTHING YET</p>
          <p className="text-sm text-gray-600 max-w-xs">
            Swipe right on events you&apos;re interested in — they&apos;ll appear here.
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {sorted.map(card => {
            const rsvp = rsvps.find(r => r.event_id === card._id);
            return (
              <UpcomingCard
                key={card._id}
                card={card}
                rsvp={rsvp}
                onViewQR={setQrCard}
              />
            );
          })}
        </div>
      )}

      {/* QR view modal — reuses RSVPModal in view-only mode (card is RSVP-enabled) */}
      {qrCard && (
        <RSVPModal card={{ ...qrCard, rsvp_enabled: true }} onClose={() => setQrCard(null)} />
      )}
    </div>
  );
}

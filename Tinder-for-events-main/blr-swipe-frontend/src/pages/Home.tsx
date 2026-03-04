import { useEffect, useState } from 'react';
import SwipeDeck from '../components/SwipeDeck';
import type { CardType } from '../types';
import api from '../api';

export default function Home() {
  const [cards, setCards] = useState<CardType[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      setLoading(true);
      setError(null);
      try {
        const res = await api.get('/api/cards');
        setCards(res.data.cards || []);
      } catch (err: any) {
        setError(err?.response?.data?.error || 'Failed to load events');
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  return (
    <div className="px-4 pt-4 pb-28">
      <div className="mb-6">
        <h1 className="font-display text-5xl tracking-wider text-white leading-none">
          WHAT'S ON IN BLR
        </h1>
        <p className="text-xs text-gray-600 mt-2 uppercase tracking-widest">
          Swipe right to like · left to skip
        </p>
      </div>

      {loading && (
        <div className="mx-auto" style={{ maxWidth: 420 }}>
          <div
            className="animate-pulse rounded-3xl"
            style={{ height: 560, background: '#1A1A1A' }}
          />
        </div>
      )}

      {error && (
        <div className="text-center py-16 text-gray-500">
          <p className="text-4xl mb-3">⚠️</p>
          <p className="text-sm">{error}</p>
        </div>
      )}

      {!loading && !error && (
        <SwipeDeck initialCards={cards} />
      )}
    </div>
  );
}
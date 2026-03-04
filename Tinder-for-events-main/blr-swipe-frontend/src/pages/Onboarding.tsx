import { useState } from 'react';
import api from '../api';
import { useAuth } from '../context/AuthContext';
import { CATEGORY_CONFIG, type EventCategory } from '../types';
import toast from 'react-hot-toast';

const CATEGORIES = Object.entries(CATEGORY_CONFIG) as [EventCategory, typeof CATEGORY_CONFIG[EventCategory]][];

interface OnboardingProps {
  onComplete?: () => void;
}

export default function Onboarding({ onComplete }: OnboardingProps) {
  const { refresh } = useAuth();
  const [selected, setSelected] = useState<Set<EventCategory>>(new Set());
  const [format, setFormat] = useState<'in-person' | 'online' | 'both'>('both');
  const [time, setTime] = useState<'weekdays' | 'weekends' | 'both'>('both');
  const [step, setStep] = useState<'categories' | 'prefs'>('categories');
  const [loading, setLoading] = useState(false);

  function toggleCategory(cat: EventCategory) {
    setSelected(prev => {
      const next = new Set(prev);
      if (next.has(cat)) next.delete(cat);
      else next.add(cat);
      return next;
    });
  }

  async function handleFinish() {
    if (selected.size < 3) {
      toast.error('Pick at least 3 categories');
      return;
    }
    setLoading(true);
    try {
      await api.post('/api/profile/onboarding', {
        categories: Array.from(selected),
        format,
        time
      });
      await refresh();
      onComplete?.();
    } catch {
      toast.error('Something went wrong');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen flex flex-col px-4 py-8 max-w-sm mx-auto">
      {step === 'categories' && (
        <>
          <div className="mb-8">
            <h1 className="font-display text-4xl tracking-wider text-white mb-2">WHAT'S YOUR VIBE?</h1>
            <p className="text-sm text-gray-500">Pick at least 3 interests to personalize your feed.</p>
          </div>

          <div className="grid grid-cols-2 gap-3 flex-1">
            {CATEGORIES.map(([cat, cfg]) => {
              const isSelected = selected.has(cat);
              return (
                <button
                  key={cat}
                  onClick={() => toggleCategory(cat)}
                  className="p-4 rounded-xl border text-left transition-all"
                  style={{
                    borderColor: isSelected ? cfg.color : '#2A2A2A',
                    background: isSelected ? cfg.bg : '#1A1A1A',
                    boxShadow: isSelected ? `0 0 12px ${cfg.color}44` : 'none'
                  }}
                >
                  <div className="text-2xl mb-1">{cfg.emoji}</div>
                  <div
                    className="text-sm font-semibold"
                    style={{ color: isSelected ? cfg.color : '#ccc' }}
                  >
                    {cfg.label}
                  </div>
                </button>
              );
            })}
          </div>

          <div className="mt-6">
            <div className="text-xs text-gray-600 mb-3 text-center">
              {selected.size} selected {selected.size < 3 && `(need ${3 - selected.size} more)`}
            </div>
            <button
              className="btn-primary"
              onClick={() => setStep('prefs')}
              disabled={selected.size < 3}
            >
              NEXT →
            </button>
          </div>
        </>
      )}

      {step === 'prefs' && (
        <>
          <div className="mb-8">
            <h1 className="font-display text-4xl tracking-wider text-white mb-2">YOUR PREFERENCES</h1>
            <p className="text-sm text-gray-500">Help us show you the right events.</p>
          </div>

          <div className="space-y-6 flex-1">
            <div>
              <label className="block text-xs text-gray-500 mb-3 uppercase tracking-widest">Event Format</label>
              <div className="grid grid-cols-3 gap-2">
                {(['in-person', 'online', 'both'] as const).map(f => (
                  <button
                    key={f}
                    onClick={() => setFormat(f)}
                    className="py-3 px-2 rounded-xl text-xs font-semibold border transition-all"
                    style={{
                      borderColor: format === f ? '#fff' : '#2A2A2A',
                      background: format === f ? '#fff' : '#1A1A1A',
                      color: format === f ? '#000' : '#888'
                    }}
                  >
                    {f === 'in-person' ? '📍 In-person' : f === 'online' ? '💻 Online' : '🌐 Both'}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="block text-xs text-gray-500 mb-3 uppercase tracking-widest">Preferred Time</label>
              <div className="grid grid-cols-3 gap-2">
                {(['weekdays', 'weekends', 'both'] as const).map(t => (
                  <button
                    key={t}
                    onClick={() => setTime(t)}
                    className="py-3 px-2 rounded-xl text-xs font-semibold border transition-all"
                    style={{
                      borderColor: time === t ? '#fff' : '#2A2A2A',
                      background: time === t ? '#fff' : '#1A1A1A',
                      color: time === t ? '#000' : '#888'
                    }}
                  >
                    {t === 'weekdays' ? '📅 Weekdays' : t === 'weekends' ? '🎉 Weekends' : '✨ Both'}
                  </button>
                ))}
              </div>
            </div>
          </div>

          <div className="mt-6 space-y-3">
            <button
              className="btn-primary"
              onClick={handleFinish}
              disabled={loading}
            >
              {loading ? 'SAVING...' : "LET'S GO →"}
            </button>
            <button className="btn-ghost" onClick={() => setStep('categories')}>
              ← Back
            </button>
          </div>
        </>
      )}
    </div>
  );
}

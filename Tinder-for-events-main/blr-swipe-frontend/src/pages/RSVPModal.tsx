import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import api from '../api';
import toast from 'react-hot-toast';
import type { CardType } from '../types';
import { CATEGORY_CONFIG } from '../types';
import { RetroQRCode } from '../components/ui/qr-code';
import { GlassEffect } from '../components/ui/liquid-glass';

interface RSVPModalProps {
  card: CardType;
  onClose: () => void;
}

type Phase = 'form' | 'confirmed';

const BLOCKED_KEYWORDS = [
  'phone', 'mobile', 'number', 'contact', 'whatsapp',
  'address', 'id', 'aadhar', 'passport', 'ssn', 'pan',
];

function isSensitiveQuestion(q: string): boolean {
  const lower = q.toLowerCase();
  return BLOCKED_KEYWORDS.some(kw => lower.includes(kw));
}

export default function RSVPModal({ card, onClose }: RSVPModalProps) {
  const [phase, setPhase] = useState<Phase>('form');
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [seatCode, setSeatCode] = useState('');
  const [loading, setLoading] = useState(false);

  const cat = card.category ? CATEGORY_CONFIG[card.category] : CATEGORY_CONFIG.other;
  const questions = (card.rsvp_form || []).filter(q => !isSensitiveQuestion(q.question));
  const qrValue = `BLR-${card._id.slice(-6).toUpperCase()}-${seatCode}`;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    // Check required questions
    for (const q of questions) {
      if (q.required && !answers[q.question]?.trim()) {
        toast.error(`Please answer: "${q.question}"`);
        return;
      }
    }

    setLoading(true);
    try {
      const res = await api.post('/api/rsvp', {
        eventId: card._id,
        answers,
      });
      setSeatCode(res.data.seat_code);
      setPhase('confirmed');
      toast.success(res.data.already_rsvped ? "You're already in! 🎉" : "RSVP confirmed! 🎉");
    } catch (err: unknown) {
      const e = err as { response?: { data?: { error?: string } } };
      const msg = e?.response?.data?.error || 'RSVP failed';
      if (msg.includes('capacity')) {
        toast.error('😔 This event is at full capacity');
      } else {
        toast.error(msg);
      }
    } finally {
      setLoading(false);
    }
  }

  return (
    <AnimatePresence>
      <motion.div
        className="fixed inset-0 z-50 flex items-end justify-center"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
      >
        {/* Backdrop */}
        <motion.div
          className="absolute inset-0"
          style={{ background: 'rgba(0,0,0,0.75)', backdropFilter: 'blur(4px)' }}
          onClick={onClose}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
        />

        {/* Sheet */}
        <motion.div
          className="relative w-full max-w-lg z-10"
          initial={{ y: '100%' }}
          animate={{ y: 0 }}
          exit={{ y: '100%' }}
          transition={{ type: 'spring', stiffness: 300, damping: 30 }}
        >
          <GlassEffect
            className="rounded-t-3xl rounded-b-none"
            intensity="high"
            style={{ maxHeight: '90vh', overflowY: 'auto' }}
          >
            <div className="px-5 pt-4 pb-8">
              {/* Handle */}
              <div className="w-12 h-1 rounded-full bg-white/20 mx-auto mb-5" />

              {phase === 'form' && (
                <>
                  {/* Header */}
                  <div className="mb-5">
                    <div
                      className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold uppercase tracking-wider mb-2"
                      style={{ background: cat.bg, color: cat.color }}
                    >
                      {cat.emoji} {cat.label}
                    </div>
                    <h2 className="font-display text-2xl tracking-wider text-white leading-tight">{card.title}</h2>
                    <div className="flex items-center gap-3 mt-2 text-xs text-gray-500">
                      {card.location && <span>📍 {card.location}</span>}
                      {card.datetime && (
                        <span>
                          🗓 {new Date(card.datetime).toLocaleDateString('en-IN', {
                            weekday: 'short', month: 'short', day: 'numeric'
                          })}
                        </span>
                      )}
                      {card.price !== undefined && (
                        <span>{card.price === 0 ? '🎟 Free' : `₹${card.price}`}</span>
                      )}
                    </div>
                  </div>

                  <form onSubmit={handleSubmit} className="space-y-4">
                    {questions.length > 0 ? (
                      <>
                        <p className="text-xs text-gray-500 uppercase tracking-widest mb-2">
                          The organiser would like to know
                        </p>
                        {questions.map((q, i) => (
                          <div key={i}>
                            <label className="block text-sm text-gray-300 mb-1.5">
                              {q.question}
                              {q.required && <span className="text-pink-500 ml-1">*</span>}
                            </label>
                            <input
                              className="input-dark"
                              placeholder="Your answer..."
                              value={answers[q.question] || ''}
                              onChange={e =>
                                setAnswers(prev => ({ ...prev, [q.question]: e.target.value }))
                              }
                              required={q.required}
                            />
                          </div>
                        ))}
                      </>
                    ) : (
                      <div
                        className="rounded-xl p-4 text-center text-sm text-gray-400"
                        style={{ background: 'rgba(57,255,20,0.05)', border: '1px solid rgba(57,255,20,0.15)' }}
                      >
                        🎉 No extra info needed — just confirm your spot!
                      </div>
                    )}

                    <p className="text-xs text-gray-700 text-center">
                      🔒 We never share your personal data with organisers
                    </p>

                    <button
                      type="submit"
                      disabled={loading}
                      className="w-full py-3 rounded-xl text-sm font-bold uppercase tracking-wider transition-all"
                      style={{
                        background: loading ? '#1A1A1A' : '#39FF14',
                        color: loading ? '#555' : '#0A0A0A',
                        border: '1px solid #39FF14',
                      }}
                    >
                      {loading ? 'LOCKING SEAT...' : 'LOCK MY SEAT →'}
                    </button>

                    <button
                      type="button"
                      onClick={onClose}
                      className="w-full py-2 text-xs text-gray-600 hover:text-gray-400 transition-colors"
                    >
                      Skip for now
                    </button>
                  </form>
                </>
              )}

              {phase === 'confirmed' && (
                <div className="flex flex-col items-center text-center gap-5 py-2">
                  <div>
                    <p
                      className="text-xs tracking-widest uppercase mb-1"
                      style={{ fontFamily: 'IBM Plex Mono, monospace', color: '#39FF14' }}
                    >
                      YOU'RE IN!
                    </p>
                    <h2 className="font-display text-2xl tracking-wider text-white">{card.title}</h2>
                    {card.datetime && (
                      <p className="text-sm text-gray-400 mt-1">
                        🗓 {new Date(card.datetime).toLocaleDateString('en-IN', {
                          weekday: 'long', month: 'long', day: 'numeric'
                        })}
                      </p>
                    )}
                  </div>

                  <RetroQRCode
                    value={qrValue}
                    size={180}
                    eventTitle={card.title}
                    seatCode={seatCode}
                  />

                  <p className="text-xs text-gray-600 max-w-xs">
                    Show this QR code at the venue. Your seat is confirmed!
                  </p>

                  <button
                    onClick={onClose}
                    className="w-full py-3 rounded-xl text-sm font-bold uppercase tracking-wider transition-all"
                    style={{ background: '#fff', color: '#000' }}
                  >
                    AWESOME! →
                  </button>
                </div>
              )}
            </div>
          </GlassEffect>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}

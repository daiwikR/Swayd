import { useState, useEffect } from 'react';
import api from '../api';
import { CATEGORY_CONFIG, type EventCategory, type AgeRating } from '../types';
import toast from 'react-hot-toast';
import { DateTimePicker } from '../components/ui/date-picker';
import { GlassCard, GlassEffect } from '../components/ui/liquid-glass';

const CATEGORIES = Object.keys(CATEGORY_CONFIG) as EventCategory[];

const AGE_RATING_OPTIONS: { value: AgeRating; label: string; desc: string; color: string }[] = [
  { value: 'ALL_AGES', label: '🟢 Everyone',     desc: 'Open to all ages',                color: '#06D6A0' },
  { value: '13+',      label: '🟡 Teens & Up',   desc: 'Suitable for 13+',               color: '#FFD166' },
  { value: '18+',      label: '🔴 Adults Only',  desc: 'Hidden from users under 18',     color: '#EF476F' },
  { value: '21+',      label: '🔵 21+ Only',     desc: 'Restricted to 21+ users',        color: '#118AB2' },
];

interface Event {
  _id: string;
  title: string;
  category: string;
  datetime?: string;
  location: string;
  price: number;
  like_count: number;
  dislike_count: number;
  is_active: boolean;
  age_rating: AgeRating;
  rsvp_enabled?: boolean;
}

interface RSVPFormQuestion {
  question: string;
  required: boolean;
}

const emptyForm = {
  title: '', description: '', image_url: '', location: 'Bangalore',
  category: 'other' as EventCategory, price: '', capacity: '',
  age_rating: 'ALL_AGES' as AgeRating,
  rsvp_enabled: false,
};

export default function OwnerNew() {
  const [view, setView] = useState<'list' | 'create'>('list');
  const [events, setEvents] = useState<Event[]>([]);
  const [form, setForm] = useState(emptyForm);
  const [eventDatetime, setEventDatetime] = useState<Date | undefined>(undefined);
  const [rsvpQuestions, setRsvpQuestions] = useState<RSVPFormQuestion[]>([]);
  const [loading, setLoading] = useState(false);

  async function loadEvents() {
    try {
      const res = await api.get('/api/events/mine');
      setEvents(res.data.events || []);
    } catch {
      toast.error('Failed to load events');
    }
  }

  useEffect(() => { loadEvents(); }, []);

  function set(key: string, val: string | boolean) {
    setForm(f => ({ ...f, [key]: val }));
  }

  function addQuestion() {
    setRsvpQuestions(prev => [...prev, { question: '', required: false }]);
  }

  function removeQuestion(idx: number) {
    setRsvpQuestions(prev => prev.filter((_, i) => i !== idx));
  }

  function updateQuestion(idx: number, field: 'question' | 'required', value: string | boolean) {
    setRsvpQuestions(prev =>
      prev.map((q, i) => i === idx ? { ...q, [field]: value } : q)
    );
  }

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    try {
      await api.post('/api/events', {
        ...form,
        datetime: eventDatetime?.toISOString(),
        price: Number(form.price) || 0,
        capacity: Number(form.capacity) || 0,
        rsvp_enabled: form.rsvp_enabled,
        rsvp_form: form.rsvp_enabled ? rsvpQuestions.filter(q => q.question.trim()) : [],
      });
      toast.success('Event created!');
      setForm(emptyForm);
      setEventDatetime(undefined);
      setRsvpQuestions([]);
      setView('list');
      await loadEvents();
    } catch (err: unknown) {
      const ex = err as { response?: { data?: { error?: string } } };
      toast.error(ex?.response?.data?.error || 'Failed to create event');
    } finally {
      setLoading(false);
    }
  }

  async function toggleActive(ev: Event) {
    try {
      await api.patch(`/api/events/${ev._id}`, { is_active: !ev.is_active });
      await loadEvents();
    } catch {
      toast.error('Failed to update event');
    }
  }

  async function deleteEvent(id: string) {
    if (!confirm('Delete this event?')) return;
    try {
      await api.delete(`/api/events/${id}`);
      toast.success('Event deleted');
      await loadEvents();
    } catch {
      toast.error('Failed to delete');
    }
  }

  return (
    <div className="px-4 pt-4 pb-28 max-w-lg mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <h1 className="font-display text-4xl tracking-wider text-white">DASHBOARD</h1>
        {view === 'list' ? (
          <button
            onClick={() => setView('create')}
            className="px-4 py-2 rounded-xl text-xs font-bold uppercase tracking-wider"
            style={{ background: '#fff', color: '#000' }}
          >
            + NEW EVENT
          </button>
        ) : (
          <button
            onClick={() => setView('list')}
            className="text-sm text-gray-500 hover:text-white transition-colors"
          >
            ← Back
          </button>
        )}
      </div>

      {view === 'list' && (
        <>
          {/* Stats */}
          <div className="grid grid-cols-3 gap-3 mb-6">
            <GlassCard className="text-center">
              <div className="font-display text-3xl text-white">{events.length}</div>
              <div className="text-xs text-gray-600 mt-1">Events</div>
            </GlassCard>
            <GlassCard className="text-center">
              <div className="font-display text-3xl" style={{ color: '#39FF14' }}>
                {events.reduce((s, e) => s + e.like_count, 0)}
              </div>
              <div className="text-xs text-gray-600 mt-1">Total Likes</div>
            </GlassCard>
            <GlassCard className="text-center">
              <div className="font-display text-3xl" style={{ color: '#00D4FF' }}>
                {events.filter(e => e.is_active).length}
              </div>
              <div className="text-xs text-gray-600 mt-1">Active</div>
            </GlassCard>
          </div>

          {/* Event list */}
          {events.length === 0 ? (
            <div className="text-center py-16 text-gray-600">
              <p className="text-4xl mb-3">📋</p>
              <p className="text-sm">No events yet. Create your first one!</p>
            </div>
          ) : (
            <div className="space-y-3">
              {events.map(ev => {
                const cat = CATEGORY_CONFIG[ev.category as EventCategory] || CATEGORY_CONFIG.other;
                const expired = ev.datetime && new Date(ev.datetime) < new Date();
                const ratingColor = AGE_RATING_OPTIONS.find(o => o.value === ev.age_rating)?.color || '#888';
                return (
                  <GlassEffect key={ev._id} intensity="low" style={{ opacity: ev.is_active ? 1 : 0.6 }}>
                    <div className="p-4">
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-2 flex-wrap mb-1">
                            <span className="text-sm font-semibold text-white truncate">{ev.title}</span>
                            <span className="category-pill text-xs" style={{ background: cat.bg, color: cat.color }}>
                              {cat.emoji} {cat.label}
                            </span>
                            <span className="text-xs px-1.5 py-0.5 rounded" style={{ background: `${ratingColor}22`, color: ratingColor, border: `1px solid ${ratingColor}44` }}>
                              {ev.age_rating}
                            </span>
                            {ev.rsvp_enabled && (
                              <span className="text-xs px-1.5 py-0.5 rounded" style={{ background: 'rgba(0,212,255,0.1)', color: '#00D4FF', border: '1px solid #00D4FF33' }}>
                                RSVP
                              </span>
                            )}
                          </div>
                          <div className="text-xs text-gray-500">
                            {ev.location}{ev.datetime ? ` · ${new Date(ev.datetime).toLocaleDateString('en-IN', { month: 'short', day: 'numeric' })}` : ''}
                            {expired ? ' · ⏰ Expired' : ''}
                          </div>
                          <div className="flex items-center gap-4 mt-2 text-xs text-gray-500">
                            <span style={{ color: '#39FF14' }}>♡ {ev.like_count} likes</span>
                            <span className={ev.is_active ? 'text-green-400' : 'text-gray-600'}>
                              {ev.is_active ? '● Active' : '○ Inactive'}
                            </span>
                          </div>
                        </div>
                        <div className="flex flex-col gap-1.5 flex-shrink-0">
                          <button
                            onClick={() => toggleActive(ev)}
                            className="text-xs px-2 py-1 rounded border border-gray-700 hover:border-gray-500 text-gray-400 hover:text-white transition-colors"
                          >
                            {ev.is_active ? 'Pause' : 'Activate'}
                          </button>
                          <button
                            onClick={() => deleteEvent(ev._id)}
                            className="text-xs px-2 py-1 rounded border border-gray-700 hover:border-red-800 text-gray-500 hover:text-red-400 transition-colors"
                          >
                            Delete
                          </button>
                        </div>
                      </div>
                    </div>
                  </GlassEffect>
                );
              })}
            </div>
          )}
        </>
      )}

      {view === 'create' && (
        <form onSubmit={handleCreate} className="space-y-5">

          {/* Title */}
          <div>
            <label className="block text-xs text-gray-500 mb-1.5 uppercase tracking-widest">Event Title *</label>
            <input className="input-dark" placeholder="Name your event" value={form.title}
              onChange={e => set('title', e.target.value)} required />
          </div>

          {/* Category */}
          <div>
            <label className="block text-xs text-gray-500 mb-2 uppercase tracking-widest">Category</label>
            <div className="grid grid-cols-3 gap-2">
              {CATEGORIES.map(cat => {
                const cfg = CATEGORY_CONFIG[cat];
                const sel = form.category === cat;
                return (
                  <button key={cat} type="button"
                    onClick={() => set('category', cat)}
                    className="py-2 px-1 rounded-xl text-xs font-semibold transition-all"
                    style={{
                      background: sel ? cfg.bg : 'rgba(255,255,255,0.04)',
                      border: `1px solid ${sel ? cfg.color : 'rgba(255,255,255,0.08)'}`,
                      color: sel ? cfg.color : '#666',
                      backdropFilter: 'blur(4px)',
                    }}
                  >
                    {cfg.emoji} {cfg.label}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Age Rating */}
          <div>
            <label className="block text-xs text-gray-500 mb-2 uppercase tracking-widest">Who Can Attend?</label>
            <div className="space-y-2">
              {AGE_RATING_OPTIONS.map(opt => (
                <GlassEffect
                  key={opt.value}
                  intensity="low"
                  style={{
                    border: `1px solid ${form.age_rating === opt.value ? opt.color : 'rgba(255,255,255,0.06)'}`,
                    cursor: 'pointer',
                  }}
                >
                  <button type="button"
                    onClick={() => set('age_rating', opt.value)}
                    className="w-full text-left px-4 py-3"
                  >
                    <span className="text-sm font-semibold" style={{ color: form.age_rating === opt.value ? opt.color : '#ccc' }}>
                      {opt.label}
                    </span>
                    <span className="text-xs text-gray-600 ml-2">{opt.desc}</span>
                  </button>
                </GlassEffect>
              ))}
            </div>
            {form.age_rating === '18+' && (
              <p className="text-xs text-orange-400 mt-2">⚠️ Users under 18 will not see this event in their feed</p>
            )}
          </div>

          {/* Description */}
          <div>
            <label className="block text-xs text-gray-500 mb-1.5 uppercase tracking-widest">Description</label>
            <textarea className="input-dark" placeholder="Tell people what this event is about..." rows={3}
              value={form.description} onChange={e => set('description', e.target.value)} />
          </div>

          {/* Date/Time + Location */}
          <div className="space-y-3">
            <div>
              <label className="block text-xs text-gray-500 mb-1.5 uppercase tracking-widest">Date & Time</label>
              <DateTimePicker
                value={eventDatetime}
                onChange={setEventDatetime}
                placeholder="Pick event date & time"
              />
            </div>
            <div>
              <label className="block text-xs text-gray-500 mb-1.5 uppercase tracking-widest">Location</label>
              <input className="input-dark" placeholder="Bangalore..." value={form.location}
                onChange={e => set('location', e.target.value)} />
            </div>
          </div>

          {/* Price + Capacity */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs text-gray-500 mb-1.5 uppercase tracking-widest">Ticket Price (₹)</label>
              <input type="number" className="input-dark" placeholder="0 = Free" value={form.price}
                onChange={e => set('price', e.target.value)} min="0" />
            </div>
            <div>
              <label className="block text-xs text-gray-500 mb-1.5 uppercase tracking-widest">Capacity</label>
              <input type="number" className="input-dark" placeholder="Max attendees" value={form.capacity}
                onChange={e => set('capacity', e.target.value)} min="0" />
            </div>
          </div>

          {/* Image URL */}
          <div>
            <label className="block text-xs text-gray-500 mb-1.5 uppercase tracking-widest">Image URL</label>
            <input className="input-dark" placeholder="https://..." value={form.image_url}
              onChange={e => set('image_url', e.target.value)} />
          </div>

          {/* RSVP Toggle */}
          <GlassEffect
            intensity="low"
            style={{ border: `1px solid ${form.rsvp_enabled ? '#00D4FF33' : 'rgba(255,255,255,0.06)'}` }}
          >
            <div className="p-4">
              <div className="flex items-center justify-between gap-3">
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-semibold text-white">RSVP Form</div>
                  <div className="text-xs text-gray-500 mt-0.5">
                    Collect attendee info &amp; generate QR seat passes
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => set('rsvp_enabled', !form.rsvp_enabled)}
                  className="relative w-12 h-6 rounded-full transition-all flex-shrink-0"
                  style={{ background: form.rsvp_enabled ? '#00D4FF' : '#2A2A2A' }}
                >
                  <span
                    className="absolute top-0.5 left-0.5 w-5 h-5 rounded-full bg-white transition-transform"
                    style={{ transform: form.rsvp_enabled ? 'translateX(24px)' : 'translateX(0)' }}
                  />
                </button>
              </div>

              {form.rsvp_enabled && (
                <div className="mt-4 space-y-3">
                  <p className="text-xs text-gray-500 uppercase tracking-widest">Custom Questions</p>
                  <p className="text-xs text-gray-600">
                    ⚠️ Do not ask for personal data (phone, ID, address). Those will be filtered automatically.
                  </p>

                  {rsvpQuestions.map((q, idx) => (
                    <div key={idx} className="flex gap-2 items-start">
                      <div className="flex-1 space-y-1.5">
                        <input
                          className="input-dark text-sm"
                          placeholder={`Question ${idx + 1}...`}
                          value={q.question}
                          onChange={e => updateQuestion(idx, 'question', e.target.value)}
                        />
                        <label className="flex items-center gap-2 text-xs text-gray-500 cursor-pointer">
                          <input
                            type="checkbox"
                            checked={q.required}
                            onChange={e => updateQuestion(idx, 'required', e.target.checked)}
                            className="rounded"
                          />
                          Required
                        </label>
                      </div>
                      <button
                        type="button"
                        onClick={() => removeQuestion(idx)}
                        className="text-gray-600 hover:text-red-400 transition-colors px-2 py-2 text-sm"
                      >
                        ✕
                      </button>
                    </div>
                  ))}

                  <button
                    type="button"
                    onClick={addQuestion}
                    className="w-full py-2 rounded-xl text-xs font-semibold uppercase tracking-wider border border-dashed border-gray-700 text-gray-500 hover:border-gray-500 hover:text-gray-300 transition-colors"
                  >
                    + Add Question
                  </button>
                </div>
              )}
            </div>
          </GlassEffect>

          <button type="submit" className="btn-primary" disabled={loading}>
            {loading ? 'CREATING...' : 'CREATE EVENT'}
          </button>
        </form>
      )}
    </div>
  );
}

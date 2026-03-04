import { useEffect, useState, useCallback } from 'react';
import api from '../api';
import toast from 'react-hot-toast';
import { CATEGORY_CONFIG, type EventCategory } from '../types';
import { GlassCard, GlassEffect } from '../components/ui/liquid-glass';

// ─── Types ───────────────────────────────────────────────────────────────────

interface AdminUser {
  _id: string;
  email: string;
  role: 'seeker' | 'lister' | 'admin';
  display_name: string;
  verified_age: number;
  onboarding_complete: boolean;
  createdAt: string;
}

interface AdminEvent {
  _id: string;
  title: string;
  category: EventCategory;
  age_rating: string;
  like_count: number;
  dislike_count: number;
  is_active: boolean;
  price: number;
  lister_email: string;
  datetime: string;
  location: string;
}

interface Stats {
  totalUsers: number;
  totalEvents: number;
  totalSwipes: number;
  activeEvents: number;
  seekers: number;
  listers: number;
  scrapedEvents: number;
  lastScrapedAt: string | null;
}

// ─── Sub-components ──────────────────────────────────────────────────────────

function RoleBadge({ role }: { role: string }) {
  const styles: Record<string, { bg: string; color: string }> = {
    admin:  { bg: 'rgba(255,45,120,0.15)', color: '#FF2D78' },
    lister: { bg: 'rgba(0,212,255,0.15)',  color: '#00D4FF' },
    seeker: { bg: 'rgba(57,255,20,0.12)',  color: '#39FF14' },
  };
  const s = styles[role] || styles.seeker;
  return (
    <span
      className="px-2 py-0.5 rounded-full text-xs font-semibold uppercase tracking-wider"
      style={{ background: s.bg, color: s.color }}
    >
      {role}
    </span>
  );
}

function AgeRatingBadge({ rating }: { rating: string }) {
  const colors: Record<string, string> = {
    'ALL_AGES': '#39FF14',
    '13+': '#FFD166',
    '18+': '#FF9F1C',
    '21+': '#FF2D78',
  };
  return (
    <span
      className="px-1.5 py-0.5 rounded text-xs font-bold"
      style={{ color: colors[rating] || '#888', border: `1px solid ${colors[rating] || '#888'}33` }}
    >
      {rating}
    </span>
  );
}

function StatCard({ label, value, sub }: { label: string; value: number; sub?: string }) {
  return (
    <GlassCard className="text-center">
      <div className="font-display text-4xl tracking-wider text-white">{value.toLocaleString()}</div>
      <div className="text-xs text-gray-500 uppercase tracking-widest mt-1">{label}</div>
      {sub && <div className="text-xs text-gray-700 mt-0.5">{sub}</div>}
    </GlassCard>
  );
}

// ─── Main Component ──────────────────────────────────────────────────────────

type AdminTab = 'overview' | 'users' | 'events';

export default function Admin() {
  const [tab, setTab] = useState<AdminTab>('overview');
  const [stats, setStats] = useState<Stats | null>(null);
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [events, setEvents] = useState<AdminEvent[]>([]);
  const [loading, setLoading] = useState(false);
  const [seeding, setSeeding] = useState(false);
  const [scraping, setScraping] = useState(false);

  const loadStats = useCallback(async () => {
    try {
      const res = await api.get('/api/admin/stats');
      setStats(res.data);
    } catch {
      toast.error('Failed to load stats');
    }
  }, []);

  const loadUsers = useCallback(async () => {
    try {
      const res = await api.get('/api/admin/users');
      setUsers(res.data.users);
    } catch {
      toast.error('Failed to load users');
    }
  }, []);

  const loadEvents = useCallback(async () => {
    try {
      const res = await api.get('/api/admin/events');
      setEvents(res.data.events);
    } catch {
      toast.error('Failed to load events');
    }
  }, []);

  useEffect(() => {
    loadStats();
  }, [loadStats]);

  useEffect(() => {
    if (tab === 'users') loadUsers();
    if (tab === 'events') loadEvents();
  }, [tab, loadUsers, loadEvents]);

  async function handleScrape() {
    setScraping(true);
    try {
      const res = await api.post('/api/admin/scrape');
      const { added, skipped } = res.data;
      toast.success(`Scraped: +${added} new, ${skipped} skipped`);
      loadStats();
    } catch (err: unknown) {
      const e = err as { response?: { data?: { error?: string } } };
      toast.error(e.response?.data?.error || 'Scrape failed');
    } finally {
      setScraping(false);
    }
  }

  async function handleSeed() {
    setSeeding(true);
    try {
      const res = await api.post('/api/admin/seed');
      toast.success(res.data.message || 'Seeded successfully');
      loadStats();
      if (tab === 'events') loadEvents();
    } catch (err: any) {
      toast.error(err.response?.data?.error || 'Seed failed');
    } finally {
      setSeeding(false);
    }
  }

  async function handleChangeRole(userId: string, newRole: string) {
    setLoading(true);
    try {
      await api.patch(`/api/admin/users/${userId}`, { role: newRole });
      toast.success(`Role updated to ${newRole}`);
      loadUsers();
      loadStats();
    } catch (err: any) {
      toast.error(err.response?.data?.error || 'Failed to change role');
    } finally {
      setLoading(false);
    }
  }

  async function handleDeleteUser(userId: string, email: string) {
    if (!confirm(`Delete user ${email}? Their swipes will also be removed.`)) return;
    try {
      await api.delete(`/api/admin/users/${userId}`);
      toast.success('User deleted');
      setUsers(prev => prev.filter(u => u._id !== userId));
      loadStats();
    } catch (err: any) {
      toast.error(err.response?.data?.error || 'Failed to delete user');
    }
  }

  async function handleDeleteEvent(eventId: string, title: string) {
    if (!confirm(`Delete event "${title}"?`)) return;
    try {
      await api.delete(`/api/admin/events/${eventId}`);
      toast.success('Event deleted');
      setEvents(prev => prev.filter(e => e._id !== eventId));
      loadStats();
    } catch (err: any) {
      toast.error(err.response?.data?.error || 'Failed to delete event');
    }
  }

  async function handleToggleEvent(eventId: string) {
    try {
      const res = await api.patch(`/api/admin/events/${eventId}/toggle`);
      setEvents(prev =>
        prev.map(e => e._id === eventId ? { ...e, is_active: res.data.is_active } : e)
      );
    } catch {
      toast.error('Failed to toggle event');
    }
  }

  const tabs: { key: AdminTab; label: string; icon: string }[] = [
    { key: 'overview', label: 'Overview', icon: '📊' },
    { key: 'users',    label: 'Users',    icon: '👥' },
    { key: 'events',   label: 'Events',   icon: '🎫' },
  ];

  return (
    <div className="px-4 pt-4 pb-28 max-w-lg mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="font-display text-4xl tracking-wider text-white">ADMIN</h1>
          <p className="text-xs text-gray-600 mt-0.5">BLR Swipe Control Panel</p>
        </div>
        <button
          onClick={handleSeed}
          disabled={seeding}
          className="text-xs px-3 py-1.5 rounded-lg border transition-all"
          style={{
            borderColor: '#39FF14',
            color: seeding ? '#555' : '#39FF14',
            background: 'transparent',
          }}
        >
          {seeding ? 'Seeding...' : '⚡ Seed Data'}
        </button>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 mb-5">
        {tabs.map(t => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className="flex-1 py-2 rounded-xl text-xs font-semibold uppercase tracking-wider transition-all"
            style={{
              background: tab === t.key ? '#fff' : '#1A1A1A',
              color: tab === t.key ? '#000' : '#666',
              border: `1px solid ${tab === t.key ? '#fff' : '#2A2A2A'}`,
            }}
          >
            {t.icon} {t.label}
          </button>
        ))}
      </div>

      {/* ── Overview ── */}
      {tab === 'overview' && (
        <div className="space-y-4">
          {stats ? (
            <>
              <div className="grid grid-cols-2 gap-3">
                <StatCard label="Total Users" value={stats.totalUsers} sub={`${stats.seekers} seekers · ${stats.listers} listers`} />
                <StatCard label="Total Events" value={stats.totalEvents} sub={`${stats.activeEvents} active`} />
                <StatCard label="Total Swipes" value={stats.totalSwipes} />
                <StatCard label="Scraped Events" value={stats.scrapedEvents} sub="from BMS & District" />
              </div>

              {/* Scraper status */}
              <GlassCard>
                <div className="flex items-center justify-between mb-3">
                  <div>
                    <p className="text-xs text-gray-500 uppercase tracking-widest">Event Scraper</p>
                    <p className="text-xs text-gray-600 mt-1">
                      {stats.lastScrapedAt
                        ? `Last run: ${new Date(stats.lastScrapedAt).toLocaleString('en-IN', { dateStyle: 'short', timeStyle: 'short' })}`
                        : 'Not yet run this session'}
                    </p>
                  </div>
                  <button
                    onClick={handleScrape}
                    disabled={scraping}
                    className="px-4 py-2 rounded-lg text-xs font-semibold border transition-all"
                    style={{ borderColor: '#00D4FF', color: scraping ? '#555' : '#00D4FF', background: 'rgba(0,212,255,0.06)' }}
                  >
                    {scraping ? 'Scraping...' : '⚡ Scrape Now'}
                  </button>
                </div>
                <p className="text-xs text-gray-700">Auto-runs every 6 hours · BookMyShow + District.in</p>
              </GlassCard>

              <GlassCard>
                <p className="text-xs text-gray-500 uppercase tracking-widest mb-3">Quick Actions</p>
                <div className="space-y-2">
                  <button
                    onClick={handleSeed}
                    disabled={seeding}
                    className="w-full py-3 rounded-xl text-sm font-semibold border transition-all"
                    style={{ borderColor: '#39FF14', color: '#39FF14', background: 'rgba(57,255,20,0.05)' }}
                  >
                    {seeding ? 'Creating seed data...' : '⚡ Seed 10 Demo Events + lister@blr.com'}
                  </button>
                  <button
                    onClick={() => setTab('users')}
                    className="w-full py-3 rounded-xl text-sm font-semibold border transition-all"
                    style={{ borderColor: '#2A2A2A', color: '#888', background: '#1A1A1A' }}
                  >
                    👥 Manage Users →
                  </button>
                  <button
                    onClick={() => setTab('events')}
                    className="w-full py-3 rounded-xl text-sm font-semibold border transition-all"
                    style={{ borderColor: '#2A2A2A', color: '#888', background: '#1A1A1A' }}
                  >
                    🎫 Manage Events →
                  </button>
                </div>
              </GlassCard>

              <GlassCard>
                <p className="text-xs text-gray-500 uppercase tracking-widest mb-3">Test Accounts</p>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between items-center">
                    <span className="text-gray-400">admin@blr.com</span>
                    <RoleBadge role="admin" />
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-gray-400">lister@blr.com</span>
                    <RoleBadge role="lister" />
                  </div>
                  <p className="text-xs text-gray-700 mt-2">
                    Password: <span className="text-gray-500">admin123</span> / <span className="text-gray-500">lister123</span>
                  </p>
                </div>
              </GlassCard>
            </>
          ) : (
            <div className="text-gray-600 text-sm text-center py-12">Loading stats...</div>
          )}
        </div>
      )}

      {/* ── Users ── */}
      {tab === 'users' && (
        <div className="space-y-2">
          <p className="text-xs text-gray-600 mb-3">{users.length} users total</p>
          {users.length === 0 && (
            <div className="text-gray-600 text-sm text-center py-12">No users found.</div>
          )}
          {users.map(u => (
            <GlassEffect key={u._id} intensity="low">
            <div className="p-4">
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-sm text-white font-medium truncate">{u.email}</span>
                    <RoleBadge role={u.role} />
                  </div>
                  <div className="text-xs text-gray-600 mt-1">
                    {u.display_name} · Age {u.verified_age} · {u.onboarding_complete ? 'Onboarded' : 'Pending onboarding'}
                  </div>
                  <div className="text-xs text-gray-700 mt-0.5">
                    Joined {new Date(u.createdAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
                  </div>
                </div>
              </div>

              {/* Role selector + delete */}
              <div className="flex items-center gap-2 mt-3">
                <select
                  defaultValue={u.role}
                  disabled={loading}
                  onChange={e => handleChangeRole(u._id, e.target.value)}
                  className="flex-1 text-xs py-1.5 px-2 rounded-lg border"
                  style={{ background: '#111', borderColor: '#333', color: '#ccc' }}
                >
                  <option value="seeker">seeker</option>
                  <option value="lister">lister</option>
                  <option value="admin">admin</option>
                </select>
                <button
                  onClick={() => handleDeleteUser(u._id, u.email)}
                  className="px-2 py-1.5 rounded-lg text-xs border transition-colors"
                  style={{ borderColor: '#FF2D7833', color: '#FF2D78', background: 'rgba(255,45,120,0.05)' }}
                >
                  Delete
                </button>
              </div>
            </div>
            </GlassEffect>
          ))}
        </div>
      )}

      {/* ── Events ── */}
      {tab === 'events' && (
        <div className="space-y-2">
          <p className="text-xs text-gray-600 mb-3">{events.length} events total</p>
          {events.length === 0 && (
            <div className="text-gray-600 text-sm text-center py-12">
              No events yet.{' '}
              <button onClick={handleSeed} className="underline text-green-400">Seed demo data</button>
            </div>
          )}
          {events.map(ev => {
            const cfg = CATEGORY_CONFIG[ev.category] || CATEGORY_CONFIG.other;
            const date = ev.datetime
              ? new Date(ev.datetime).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })
              : '—';
            return (
              <GlassEffect
                key={ev._id}
                intensity="low"
                style={{ opacity: ev.is_active ? 1 : 0.5 }}
              >
              <div className="p-4">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 flex-wrap mb-1">
                      <span
                        className="text-xs font-bold px-2 py-0.5 rounded-full"
                        style={{ background: cfg.bg, color: cfg.color }}
                      >
                        {cfg.emoji} {cfg.label}
                      </span>
                      <AgeRatingBadge rating={ev.age_rating} />
                      {!ev.is_active && (
                        <span className="text-xs text-gray-600 border border-gray-700 px-1.5 py-0.5 rounded">
                          Paused
                        </span>
                      )}
                    </div>
                    <div className="text-sm text-white font-medium truncate">{ev.title}</div>
                    <div className="text-xs text-gray-600 mt-0.5 truncate">
                      {ev.location} · {date} · {ev.price === 0 ? 'Free' : `₹${ev.price}`}
                    </div>
                    <div className="text-xs text-gray-700 mt-0.5">
                      ♡ {ev.like_count} · by {ev.lister_email}
                    </div>
                  </div>
                </div>

                <div className="flex gap-2 mt-3">
                  <button
                    onClick={() => handleToggleEvent(ev._id)}
                    className="flex-1 py-1.5 rounded-lg text-xs border transition-all"
                    style={{
                      borderColor: ev.is_active ? '#FF9F1C33' : '#39FF1433',
                      color: ev.is_active ? '#FF9F1C' : '#39FF14',
                      background: ev.is_active ? 'rgba(255,159,28,0.05)' : 'rgba(57,255,20,0.05)',
                    }}
                  >
                    {ev.is_active ? 'Pause' : 'Activate'}
                  </button>
                  <button
                    onClick={() => handleDeleteEvent(ev._id, ev.title)}
                    className="flex-1 py-1.5 rounded-lg text-xs border transition-colors"
                    style={{ borderColor: '#FF2D7833', color: '#FF2D78', background: 'rgba(255,45,120,0.05)' }}
                  >
                    Delete
                  </button>
                </div>
              </div>
              </GlassEffect>
            );
          })}
        </div>
      )}
    </div>
  );
}

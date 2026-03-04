import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import type { CardType } from '../types';
import { CATEGORY_CONFIG } from '../types';
import api from '../api';
import { useAuth } from '../context/AuthContext';
import toast from 'react-hot-toast';
import { GlassCard, GlassEffect } from '../components/ui/liquid-glass';

// ─── Avatar ──────────────────────────────────────────────────────────────────

function Avatar({ avatarUrl, displayName, size = 80 }: { avatarUrl?: string; displayName: string; size?: number }) {
  const initials = displayName
    ? displayName.split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2)
    : '?';

  if (avatarUrl) {
    return (
      <img
        src={avatarUrl}
        alt={displayName}
        style={{ width: size, height: size, borderRadius: '50%', objectFit: 'cover', border: '2px solid rgba(255,255,255,0.12)' }}
      />
    );
  }

  return (
    <div
      style={{
        width: size, height: size, borderRadius: '50%',
        background: 'linear-gradient(135deg, #FF2D78, #FF6B35)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        border: '2px solid rgba(255,255,255,0.12)',
        fontSize: size * 0.36, fontWeight: 700, color: '#fff', fontFamily: '"DM Sans", sans-serif'
      }}
    >
      {initials}
    </div>
  );
}

// ─── Liked event row ──────────────────────────────────────────────────────────

function EventRow({ card, onRemove }: { card: CardType; onRemove: () => void }) {
  const cat = card.category || 'other';
  const cfg = CATEGORY_CONFIG[cat] || CATEGORY_CONFIG.other;
  const date = card.datetime ? new Date(card.datetime).toLocaleDateString('en-IN', {
    weekday: 'short', month: 'short', day: 'numeric'
  }) : null;

  return (
    <GlassEffect intensity="low" className="flex items-center justify-between gap-3 p-4">
      <div className="flex items-center gap-3 min-w-0">
        <span className="text-lg flex-shrink-0">{cfg.emoji}</span>
        <div className="min-w-0">
          <div className="font-medium text-sm text-white truncate">{card.title}</div>
          <div className="text-xs text-gray-600 truncate">
            {card.location}{date ? ` · ${date}` : ''}
          </div>
        </div>
      </div>
      <button
        onClick={onRemove}
        className="text-xs text-gray-600 hover:text-white transition-colors flex-shrink-0 px-2 py-1 rounded border border-gray-700 hover:border-gray-500"
      >
        ✕
      </button>
    </GlassEffect>
  );
}

// ─── Profile Drawer ───────────────────────────────────────────────────────────

type DrawerSection = 'menu' | 'edit' | 'analytics' | 'password' | 'reset';

interface ProfileDrawerProps {
  open: boolean;
  onClose: () => void;
  likesCount: number;
  dislikesCount: number;
  upcomingCount: number;
  preferenceVector: Record<string, number>;
}

function ProfileDrawer({ open, onClose, likesCount, dislikesCount, upcomingCount, preferenceVector }: ProfileDrawerProps) {
  const { user, logout, refresh } = useAuth();
  const [section, setSection] = useState<DrawerSection>('menu');
  const [switching, setSwitching] = useState(false);

  // Edit profile state
  const [displayName, setDisplayName] = useState(user?.display_name || '');
  const [avatarUrl, setAvatarUrl] = useState(user?.avatar_url || '');
  const [savingProfile, setSavingProfile] = useState(false);

  // Change password state
  const [currentPw, setCurrentPw] = useState('');
  const [newPw, setNewPw] = useState('');
  const [savingPw, setSavingPw] = useState(false);

  // Reset on open
  useEffect(() => {
    if (open) {
      setSection('menu');
      setDisplayName(user?.display_name || '');
      setAvatarUrl(user?.avatar_url || '');
      setCurrentPw('');
      setNewPw('');
    }
  }, [open, user?.display_name, user?.avatar_url]);

  const handleSwitchToLister = async () => {
    if (!confirm('Switch to Lister mode? You will be able to create and manage events.')) return;
    setSwitching(true);
    try {
      await api.post('/api/profile/switch-to-lister');
      await refresh();
      toast.success("You're now a Lister! Create your first event.");
      onClose();
    } catch (err: unknown) {
      const e = err as { response?: { data?: { error?: string } } };
      toast.error(e.response?.data?.error || 'Failed to switch role');
    } finally { setSwitching(false); }
  };

  const handleSwitchToSeeker = async () => {
    if (!confirm('Switch back to Seeker mode? Your events will be preserved.')) return;
    setSwitching(true);
    try {
      await api.post('/api/profile/switch-to-seeker');
      await refresh();
      toast.success('Welcome back! Discover events in Bangalore.');
      onClose();
    } catch (err: unknown) {
      const e = err as { response?: { data?: { error?: string } } };
      toast.error(e.response?.data?.error || 'Failed to switch role');
    } finally { setSwitching(false); }
  };

  const handleSaveProfile = async () => {
    setSavingProfile(true);
    try {
      await api.patch('/api/profile', { display_name: displayName, avatar_url: avatarUrl });
      await refresh();
      toast.success('Profile updated');
      setSection('menu');
    } catch {
      toast.error('Failed to save profile');
    } finally { setSavingProfile(false); }
  };

  const handleChangePassword = async () => {
    if (!currentPw || !newPw) return toast.error('Fill in both fields');
    setSavingPw(true);
    try {
      await api.post('/api/profile/change-password', { currentPassword: currentPw, newPassword: newPw });
      toast.success('Password changed successfully');
      setCurrentPw(''); setNewPw('');
      setSection('menu');
    } catch (err: unknown) {
      const e = err as { response?: { data?: { error?: string } } };
      toast.error(e.response?.data?.error || 'Failed to change password');
    } finally { setSavingPw(false); }
  };

  const handleResetPrefs = async () => {
    if (!confirm('Reset all preferences? You will go through onboarding again.')) return;
    try {
      await api.post('/api/profile/reset-preferences');
      toast.success('Preferences reset. Starting fresh!');
      window.location.reload();
    } catch {
      toast.error('Failed to reset preferences');
    }
  };

  const inputStyle = {
    width: '100%', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)',
    borderRadius: '0.75rem', color: '#fff', padding: '0.625rem 0.875rem', fontSize: '0.875rem',
    outline: 'none', fontFamily: '"DM Sans", sans-serif'
  };

  const menuItemStyle = {
    width: '100%', textAlign: 'left' as const, padding: '0.875rem 0',
    color: '#ccc', fontSize: '0.9rem', background: 'none', border: 'none', cursor: 'pointer',
    borderBottom: '1px solid rgba(255,255,255,0.06)', fontFamily: '"DM Sans", sans-serif',
    display: 'flex', alignItems: 'center', justifyContent: 'space-between'
  };

  return (
    <AnimatePresence>
      {open && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 z-40"
            style={{ background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)' }}
          />
          {/* Drawer */}
          <motion.div
            initial={{ y: '100%' }}
            animate={{ y: 0 }}
            exit={{ y: '100%' }}
            transition={{ type: 'spring', stiffness: 320, damping: 35 }}
            className="fixed bottom-0 left-0 right-0 z-50 mx-auto"
            style={{
              maxWidth: 420, background: '#111', borderRadius: '1.5rem 1.5rem 0 0',
              borderTop: '1px solid rgba(255,255,255,0.08)', padding: '1rem 1.25rem 2rem',
              maxHeight: '85vh', overflowY: 'auto'
            }}
          >
            {/* Handle */}
            <div className="flex justify-center mb-4">
              <div style={{ width: 36, height: 4, borderRadius: 99, background: 'rgba(255,255,255,0.15)' }} />
            </div>

            {/* Back button for sub-sections */}
            {section !== 'menu' && (
              <button
                onClick={() => setSection('menu')}
                style={{ color: '#888', fontSize: '0.8rem', background: 'none', border: 'none', cursor: 'pointer', marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: 4 }}
              >
                ← Back
              </button>
            )}

            {/* ── MENU ── */}
            {section === 'menu' && (
              <>
                <p className="text-xs text-gray-500 uppercase tracking-widest mb-4">Account</p>
                <button style={menuItemStyle} onClick={() => setSection('edit')}>
                  <span>✏️ Edit Profile</span> <span style={{ color: '#555' }}>›</span>
                </button>
                <button style={menuItemStyle} onClick={() => setSection('analytics')}>
                  <span>📊 Analytics</span> <span style={{ color: '#555' }}>›</span>
                </button>
                <button style={menuItemStyle} onClick={() => setSection('password')}>
                  <span>🔑 Change Password</span> <span style={{ color: '#555' }}>›</span>
                </button>
                <button style={menuItemStyle} onClick={() => setSection('reset')}>
                  <span>🔄 Reset Preferences</span> <span style={{ color: '#555' }}>›</span>
                </button>

                {user?.role === 'seeker' && (
                  <button style={{ ...menuItemStyle, color: '#00D4FF' }} onClick={handleSwitchToLister} disabled={switching}>
                    <span>🎯 {switching ? 'Switching...' : 'Become a Lister'}</span> <span style={{ color: '#555' }}>›</span>
                  </button>
                )}
                {user?.role === 'lister' && (
                  <button style={{ ...menuItemStyle, color: '#39FF14' }} onClick={handleSwitchToSeeker} disabled={switching}>
                    <span>🔍 {switching ? 'Switching...' : 'Switch to Seeker'}</span> <span style={{ color: '#555' }}>›</span>
                  </button>
                )}

                <button
                  style={{ ...menuItemStyle, color: '#FF2D78', border: 'none', marginTop: '0.5rem' }}
                  onClick={() => logout().then(() => toast.success('Logged out'))}
                >
                  <span>Sign Out</span>
                </button>
              </>
            )}

            {/* ── EDIT PROFILE ── */}
            {section === 'edit' && (
              <>
                <p className="text-xs text-gray-500 uppercase tracking-widest mb-4">Edit Profile</p>
                <div className="flex flex-col items-center mb-6">
                  <Avatar avatarUrl={avatarUrl || undefined} displayName={displayName || user?.display_name || ''} size={80} />
                </div>
                <div className="space-y-4">
                  <div>
                    <label style={{ display: 'block', color: '#888', fontSize: '0.75rem', marginBottom: '0.375rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                      Display Name
                    </label>
                    <input
                      style={inputStyle}
                      value={displayName}
                      onChange={e => setDisplayName(e.target.value)}
                      placeholder="Your name"
                      maxLength={60}
                    />
                  </div>
                  <div>
                    <label style={{ display: 'block', color: '#888', fontSize: '0.75rem', marginBottom: '0.375rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                      Avatar URL
                    </label>
                    <input
                      style={inputStyle}
                      value={avatarUrl}
                      onChange={e => setAvatarUrl(e.target.value)}
                      placeholder="https://..."
                    />
                  </div>
                  <button
                    onClick={handleSaveProfile}
                    disabled={savingProfile}
                    style={{
                      width: '100%', padding: '0.75rem', borderRadius: '0.75rem',
                      background: savingProfile ? 'rgba(255,255,255,0.08)' : '#fff',
                      color: savingProfile ? '#555' : '#000',
                      fontSize: '0.875rem', fontWeight: 600, border: 'none', cursor: 'pointer',
                      fontFamily: '"DM Sans", sans-serif'
                    }}
                  >
                    {savingProfile ? 'Saving...' : 'Save'}
                  </button>
                </div>
              </>
            )}

            {/* ── ANALYTICS ── */}
            {section === 'analytics' && (
              <>
                <p className="text-xs text-gray-500 uppercase tracking-widest mb-4">Analytics</p>
                {/* Stats */}
                <div className="grid grid-cols-3 gap-3 mb-6">
                  {[
                    { label: 'Liked', value: likesCount, color: '#39FF14' },
                    { label: 'Upcoming', value: upcomingCount, color: '#00D4FF' },
                    { label: 'Skipped', value: dislikesCount, color: '#FF2D78' },
                  ].map(s => (
                    <div key={s.label} style={{ background: 'rgba(255,255,255,0.04)', borderRadius: '0.75rem', padding: '0.75rem', textAlign: 'center' }}>
                      <div style={{ fontSize: '1.5rem', fontWeight: 700, color: s.color }}>{s.value}</div>
                      <div style={{ fontSize: '0.7rem', color: '#666', marginTop: 2, textTransform: 'uppercase', letterSpacing: '0.05em' }}>{s.label}</div>
                    </div>
                  ))}
                </div>

                {/* Taste profile */}
                {Object.keys(preferenceVector).length > 0 && (
                  <>
                    <p className="text-xs text-gray-500 uppercase tracking-widest mb-3">Taste Profile</p>
                    <div className="space-y-2">
                      {Object.entries(preferenceVector)
                        .sort(([, a], [, b]) => b - a)
                        .slice(0, 6)
                        .map(([cat, score]) => {
                          const cfg = CATEGORY_CONFIG[cat as keyof typeof CATEGORY_CONFIG] || CATEGORY_CONFIG.other;
                          const pct = Math.round((score / 2) * 100);
                          return (
                            <div key={cat}>
                              <div className="flex items-center justify-between text-xs mb-1">
                                <span style={{ color: '#aaa' }}>{cfg.emoji} {cfg.label}</span>
                                <span style={{ color: '#666' }}>{pct}%</span>
                              </div>
                              <div style={{ height: 4, borderRadius: 99, background: 'rgba(255,255,255,0.06)' }}>
                                <div style={{ height: 4, borderRadius: 99, width: `${pct}%`, background: cfg.color, transition: 'width 0.5s' }} />
                              </div>
                            </div>
                          );
                        })}
                    </div>
                  </>
                )}
              </>
            )}

            {/* ── CHANGE PASSWORD ── */}
            {section === 'password' && (
              <>
                <p className="text-xs text-gray-500 uppercase tracking-widest mb-4">Change Password</p>
                <div className="space-y-4">
                  <div>
                    <label style={{ display: 'block', color: '#888', fontSize: '0.75rem', marginBottom: '0.375rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                      Current Password
                    </label>
                    <input type="password" style={inputStyle} value={currentPw} onChange={e => setCurrentPw(e.target.value)} placeholder="••••••••" />
                  </div>
                  <div>
                    <label style={{ display: 'block', color: '#888', fontSize: '0.75rem', marginBottom: '0.375rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                      New Password
                    </label>
                    <input type="password" style={inputStyle} value={newPw} onChange={e => setNewPw(e.target.value)} placeholder="Min 6 characters" />
                  </div>
                  <button
                    onClick={handleChangePassword}
                    disabled={savingPw}
                    style={{
                      width: '100%', padding: '0.75rem', borderRadius: '0.75rem',
                      background: savingPw ? 'rgba(255,255,255,0.08)' : '#fff',
                      color: savingPw ? '#555' : '#000',
                      fontSize: '0.875rem', fontWeight: 600, border: 'none', cursor: 'pointer',
                      fontFamily: '"DM Sans", sans-serif'
                    }}
                  >
                    {savingPw ? 'Saving...' : 'Update Password'}
                  </button>
                </div>
              </>
            )}

            {/* ── RESET PREFERENCES ── */}
            {section === 'reset' && (
              <>
                <p className="text-xs text-gray-500 uppercase tracking-widest mb-4">Reset Preferences</p>
                <GlassCard style={{ borderColor: 'rgba(255,45,120,0.3)' }}>
                  <p style={{ color: '#ccc', fontSize: '0.875rem', lineHeight: 1.6, marginBottom: '1rem' }}>
                    This will clear your taste profile and swipe history preferences. You'll go through onboarding again to rebuild your profile.
                  </p>
                  <p style={{ color: '#FF2D78', fontSize: '0.8rem', marginBottom: '1.25rem' }}>
                    ⚠️ Your liked events and RSVPs are preserved.
                  </p>
                  <button
                    onClick={handleResetPrefs}
                    style={{
                      width: '100%', padding: '0.75rem', borderRadius: '0.75rem',
                      background: 'rgba(255,45,120,0.15)', color: '#FF2D78',
                      border: '1px solid rgba(255,45,120,0.4)',
                      fontSize: '0.875rem', fontWeight: 600, cursor: 'pointer',
                      fontFamily: '"DM Sans", sans-serif'
                    }}
                  >
                    Reset My Preferences
                  </button>
                </GlassCard>
              </>
            )}
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}

// ─── Main Profile page ────────────────────────────────────────────────────────

export default function Profile() {
  const { user } = useAuth();
  const [likes, setLikes] = useState<CardType[]>([]);
  const [dislikes, setDislikes] = useState<CardType[]>([]);
  const [upcomingCount, setUpcomingCount] = useState(0);
  const [preferenceVector, setPreferenceVector] = useState<Record<string, number>>({});
  const [drawerOpen, setDrawerOpen] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        const res = await api.get('/api/profile');
        setLikes(res.data.likes || []);
        setDislikes(res.data.dislikes || []);
        setUpcomingCount((res.data.upcoming || []).length);
        setPreferenceVector(res.data.user?.preference_vector || {});
      } catch {
        toast.error('Failed to load profile');
      }
    })();
  }, []);

  const handleRemove = async (eventId: string, listType: 'likes' | 'dislikes') => {
    if (listType === 'likes') setLikes(prev => prev.filter(c => c._id !== eventId));
    else setDislikes(prev => prev.filter(c => c._id !== eventId));
    try {
      await api.delete(`/api/profile/swipes/${eventId}`);
    } catch {
      toast.error('Failed to remove swipe');
    }
  };

  const isSeeker = user?.role === 'seeker';
  const displayName = user?.display_name || user?.email?.split('@')[0] || 'You';

  return (
    <div className="px-4 pt-6 pb-28 max-w-lg mx-auto">
      {/* ── Instagram-style header ── */}
      <div className="flex items-center justify-between mb-6">
        {/* Avatar + name */}
        <div className="flex items-center gap-4">
          <Avatar avatarUrl={user?.avatar_url} displayName={displayName} size={72} />
          <div>
            <div className="font-semibold text-white text-lg leading-tight">{displayName}</div>
            <div style={{
              display: 'inline-block', marginTop: 4,
              padding: '2px 8px', borderRadius: 99,
              fontSize: '0.7rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em',
              background: user?.role === 'admin' ? 'rgba(255,45,120,0.15)' :
                          user?.role === 'lister' ? 'rgba(0,212,255,0.15)' : 'rgba(57,255,20,0.12)',
              color: user?.role === 'admin' ? '#FF2D78' :
                     user?.role === 'lister' ? '#00D4FF' : '#39FF14'
            }}>
              {user?.role}
            </div>
          </div>
        </div>

        {/* Hamburger */}
        <button
          onClick={() => setDrawerOpen(true)}
          style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '0.75rem', padding: '0.5rem 0.75rem', color: '#fff', fontSize: '1.1rem', cursor: 'pointer' }}
          aria-label="Open menu"
        >
          ☰
        </button>
      </div>

      {/* ── Stats row ── */}
      {isSeeker && (
        <div className="flex gap-4 mb-6">
          {[
            { label: 'Liked', value: likes.length },
            { label: 'Upcoming', value: upcomingCount },
            { label: 'Skipped', value: dislikes.length },
          ].map(s => (
            <div key={s.label} className="flex-1 text-center" style={{ background: 'rgba(255,255,255,0.03)', borderRadius: '0.75rem', padding: '0.75rem 0.5rem' }}>
              <div className="text-xl font-bold text-white">{s.value}</div>
              <div className="text-xs text-gray-500 mt-0.5 uppercase tracking-wider">{s.label}</div>
            </div>
          ))}
        </div>
      )}

      {/* ── Liked events (seeker only) ── */}
      {isSeeker && (
        <>
          <p className="text-xs text-gray-500 uppercase tracking-widest mb-3">All Liked Events</p>
          {likes.length === 0 && (
            <p className="text-gray-600 text-sm text-center py-10">No liked events yet. Start swiping!</p>
          )}
          <div className="space-y-2">
            {likes.map(c => (
              <EventRow key={c._id} card={c} onRemove={() => handleRemove(c._id, 'likes')} />
            ))}
          </div>
        </>
      )}

      {/* ── Lister: prompt to explore ── */}
      {user?.role === 'lister' && (
        <GlassCard className="mt-4" style={{ borderColor: 'rgba(0,212,255,0.2)', textAlign: 'center' }}>
          <div className="text-2xl mb-2">📋</div>
          <div className="text-sm font-semibold text-white mb-1">You&apos;re in Lister mode</div>
          <div className="text-xs text-gray-500">Use the Dashboard to manage your events. Open ☰ to switch to Seeker mode and start discovering events.</div>
        </GlassCard>
      )}

      {/* Drawer */}
      <ProfileDrawer
        open={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        likesCount={likes.length}
        dislikesCount={dislikes.length}
        upcomingCount={upcomingCount}
        preferenceVector={preferenceVector}
      />
    </div>
  );
}

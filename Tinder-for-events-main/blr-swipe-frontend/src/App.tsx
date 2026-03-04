import { useState } from 'react';
import { Toaster } from 'react-hot-toast';
import { AuthProvider, useAuth } from './context/AuthContext';
import Login from './pages/Login';
import Signup from './pages/Signup';
import Onboarding from './pages/Onboarding';
import Welcome from './pages/Welcome';
import Home from './pages/Home';
import Profile from './pages/Profile';
import Upcoming from './pages/Upcoming';
import OwnerNew from './pages/OwnerNew';
import Admin from './pages/Admin';
import { GlassFilter } from './components/ui/liquid-glass';
import { BGPattern } from './components/ui/bg-pattern';
import './App.css';

type Tab = 'home' | 'upcoming' | 'profile' | 'dashboard' | 'admin';

function NavIcon({ active, onClick, icon, label }: {
  active: boolean; onClick: () => void; icon: string; label: string;
}) {
  return (
    <button
      onClick={onClick}
      className="flex flex-col items-center gap-1 transition-colors py-2 px-4"
      style={{ color: active ? '#fff' : '#555' }}
    >
      <span className="text-xl">{icon}</span>
      <span className="text-[10px] uppercase tracking-wider font-semibold">{label}</span>
    </button>
  );
}

function AppInner() {
  const { user, loading } = useAuth();
  const [authView, setAuthView] = useState<'login' | 'signup'>('login');
  const [tab, setTab] = useState<Tab>('home');
  const [showWelcome, setShowWelcome] = useState(false);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-gray-600 text-sm">Loading...</div>
      </div>
    );
  }

  // Not logged in
  if (!user) {
    return authView === 'login'
      ? <Login onSwitchToSignup={() => setAuthView('signup')} />
      : <Signup onSwitchToLogin={() => setAuthView('login')} />;
  }

  // Seeker needs onboarding
  if (user.role === 'seeker' && !user.onboarding_complete) {
    return <Onboarding onComplete={() => setShowWelcome(true)} />;
  }

  // Show welcome page once after onboarding completes
  if (showWelcome) {
    return <Welcome onContinue={() => setShowWelcome(false)} />;
  }

  const isLister = user.role === 'lister';
  const isAdmin  = user.role === 'admin';

  return (
    <div className="min-h-screen relative" style={{ background: '#0A0A0A' }}>
      {/* Subtle dot pattern background */}
      <BGPattern variant="dots" color="rgba(255,255,255,0.03)" size={28} fade={false} />

      {/* Ambient glow */}
      <div
        aria-hidden="true"
        className="pointer-events-none fixed inset-0 z-0"
        style={{
          background: 'radial-gradient(ellipse 70% 50% at 50% 80%, rgba(255,45,120,0.05) 0%, transparent 70%)',
        }}
      />

      <main className="relative z-10 mx-auto" style={{ maxWidth: 420 }}>
        {/* Seeker discover feed */}
        {tab === 'home' && !isLister && !isAdmin && <Home />}

        {/* Lister home tab → dashboard */}
        {tab === 'home' && isLister && <OwnerNew />}

        {/* Admin home tab → admin panel */}
        {tab === 'home' && isAdmin && <Admin />}

        {/* Upcoming — seekers only */}
        {tab === 'upcoming' && !isLister && !isAdmin && <Upcoming />}

        {/* Explicit dashboard tab */}
        {tab === 'dashboard' && <OwnerNew />}

        {/* Explicit admin tab */}
        {tab === 'admin' && <Admin />}

        {/* Profile — all roles */}
        {tab === 'profile' && <Profile />}
      </main>

      {/* Floating bottom nav */}
      <nav
        className="fixed bottom-0 left-0 right-0 z-50 flex items-center justify-around"
        style={{
          background: 'rgba(10,10,10,0.85)',
          backdropFilter: 'blur(24px)',
          WebkitBackdropFilter: 'blur(24px)',
          borderTop: '1px solid rgba(255,255,255,0.06)',
          paddingBottom: 'env(safe-area-inset-bottom, 0px)'
        }}
      >
        {/* Seeker: Discover */}
        {!isLister && !isAdmin && (
          <NavIcon
            active={tab === 'home'}
            onClick={() => setTab('home')}
            icon="🔥"
            label="Discover"
          />
        )}

        {/* Lister: Dashboard */}
        {isLister && (
          <NavIcon
            active={tab === 'home' || tab === 'dashboard'}
            onClick={() => setTab('dashboard')}
            icon="📋"
            label="Dashboard"
          />
        )}

        {/* Admin: Admin panel */}
        {isAdmin && (
          <NavIcon
            active={tab === 'home' || tab === 'admin'}
            onClick={() => setTab('admin')}
            icon="⚙️"
            label="Admin"
          />
        )}

        {/* Seeker: Upcoming tab */}
        {!isLister && !isAdmin && (
          <NavIcon
            active={tab === 'upcoming'}
            onClick={() => setTab('upcoming')}
            icon="📅"
            label="Upcoming"
          />
        )}

        {/* Center BLR logo */}
        <div className="flex flex-col items-center gap-1 py-2 px-4">
          <span className="font-display text-lg tracking-widest text-white">BLR</span>
        </div>

        {/* Profile — all roles */}
        <NavIcon
          active={tab === 'profile'}
          onClick={() => setTab('profile')}
          icon="👤"
          label="Profile"
        />
      </nav>
    </div>
  );
}

export default function App() {
  return (
    <AuthProvider>
      {/* SVG Glass filter — injected once, used by GlassEffect components */}
      <GlassFilter />
      <AppInner />
      <Toaster
        position="top-center"
        toastOptions={{
          style: {
            background: 'rgba(26,26,26,0.95)',
            backdropFilter: 'blur(16px)',
            color: '#fff',
            border: '1px solid rgba(255,255,255,0.08)',
            fontFamily: '"DM Sans", sans-serif',
            fontSize: '0.875rem',
            borderRadius: '0.75rem',
          },
          success: { iconTheme: { primary: '#39FF14', secondary: '#000' } },
          error: { iconTheme: { primary: '#FF2D78', secondary: '#fff' } }
        }}
      />
    </AuthProvider>
  );
}

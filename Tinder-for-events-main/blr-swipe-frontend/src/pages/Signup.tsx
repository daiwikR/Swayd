import { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import toast from 'react-hot-toast';
import { DatePicker } from '../components/ui/date-picker';
import { GlassCard } from '../components/ui/liquid-glass';

interface Props {
  onSwitchToLogin: () => void;
}

export default function Signup({ onSwitchToLogin }: Props) {
  const { signup } = useAuth();
  const [step, setStep] = useState<'role' | 'details'>('role');
  const [role, setRole] = useState<'seeker' | 'lister' | ''>('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [dob, setDob] = useState<Date | undefined>(undefined);
  const [displayName, setDisplayName] = useState('');
  const [loading, setLoading] = useState(false);
  const [blocked, setBlocked] = useState(false);

  function handleRoleSelect(r: 'seeker' | 'lister') {
    setRole(r);
    setStep('details');
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!role) return;
    setLoading(true);
    try {
      const dobStr = dob ? dob.toISOString().split('T')[0] : undefined;
      await signup({
        email,
        password,
        role,
        date_of_birth: role === 'seeker' ? dobStr : undefined,
        display_name: displayName
      });
      toast.success('Account created!');
    } catch (err: unknown) {
      const e = err as { response?: { data?: { error?: string; message?: string } } };
      const code = e?.response?.data?.error;
      const msg = e?.response?.data?.message;
      if (code === 'AGE_RESTRICTED') {
        setBlocked(true);
      } else {
        toast.error(msg || code || 'Signup failed');
      }
    } finally {
      setLoading(false);
    }
  }

  if (blocked) {
    return (
      <div className="min-h-screen flex items-center justify-center px-4">
        <GlassCard className="w-full max-w-sm text-center space-y-4">
          <div className="text-5xl">🛑</div>
          <h2 className="font-display text-3xl text-white">HOLD ON</h2>
          <p className="text-gray-400 text-sm leading-relaxed">
            This app is for teens and adults.<br />
            Ask a parent to help!
          </p>
          <button className="btn-ghost mt-4" onClick={() => { setBlocked(false); setStep('role'); }}>
            Go back
          </button>
        </GlassCard>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center px-4">
      <div className="w-full max-w-sm">
        <div className="text-center mb-10">
          <h1 className="font-display text-5xl tracking-widest text-white">BLR SWIPE</h1>
          <p className="text-sm text-gray-500 mt-2">Create your account</p>
        </div>

        {step === 'role' && (
          <div className="space-y-4">
            <p className="text-center text-sm text-gray-400 mb-6">I want to...</p>
            <GlassCard>
              <button
                onClick={() => handleRoleSelect('seeker')}
                className="w-full text-left"
              >
                <div className="text-2xl mb-2">🔍</div>
                <div className="font-semibold text-white">Discover Events</div>
                <div className="text-xs text-gray-500 mt-1">Swipe, explore, attend events in Bangalore</div>
              </button>
            </GlassCard>
            <GlassCard>
              <button
                onClick={() => handleRoleSelect('lister')}
                className="w-full text-left"
              >
                <div className="text-2xl mb-2">📋</div>
                <div className="font-semibold text-white">List Events</div>
                <div className="text-xs text-gray-500 mt-1">Create and manage event listings</div>
              </button>
            </GlassCard>
            <div className="text-center pt-2">
              <span className="text-sm text-gray-600">Already have an account? </span>
              <button onClick={onSwitchToLogin} className="text-sm text-white underline underline-offset-2">
                Sign in
              </button>
            </div>
          </div>
        )}

        {step === 'details' && (
          <form onSubmit={handleSubmit} className="space-y-4">
            <button
              type="button"
              onClick={() => setStep('role')}
              className="flex items-center gap-2 text-sm text-gray-500 mb-2 hover:text-white transition-colors"
            >
              ← Back
            </button>

            <div>
              <label className="block text-xs text-gray-500 mb-1.5 uppercase tracking-widest">Display Name</label>
              <input
                className="input-dark"
                placeholder="How should we call you?"
                value={displayName}
                onChange={e => setDisplayName(e.target.value)}
              />
            </div>

            <div>
              <label className="block text-xs text-gray-500 mb-1.5 uppercase tracking-widest">Email</label>
              <input
                type="email"
                className="input-dark"
                placeholder="you@example.com"
                value={email}
                onChange={e => setEmail(e.target.value)}
                required
              />
            </div>

            <div>
              <label className="block text-xs text-gray-500 mb-1.5 uppercase tracking-widest">Password</label>
              <input
                type="password"
                className="input-dark"
                placeholder="Min. 6 characters"
                value={password}
                onChange={e => setPassword(e.target.value)}
                required
                minLength={6}
              />
            </div>

            {role === 'seeker' && (
              <div>
                <label className="block text-xs text-gray-500 mb-1.5 uppercase tracking-widest">Date of Birth</label>
                <p className="text-xs text-gray-600 mb-2">
                  We use your birthday to make sure you only see events that are right for you 🎉
                </p>
                <DatePicker
                  value={dob}
                  onChange={setDob}
                  placeholder="Select your birthday"
                  fromYear={1940}
                  toYear={new Date().getFullYear()}
                  captionLayout="dropdown"
                />
              </div>
            )}

            <button type="submit" className="btn-primary mt-2" disabled={loading}>
              {loading ? 'CREATING...' : 'CREATE ACCOUNT'}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}

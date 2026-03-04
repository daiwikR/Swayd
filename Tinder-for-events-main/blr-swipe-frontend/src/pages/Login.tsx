import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import toast from 'react-hot-toast';

interface Props {
  onSwitchToSignup: () => void;
}

export default function Login({ onSwitchToSignup }: Props) {
  const { login } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    try {
      await login(email, password);
      toast.success('Welcome back!');
    } catch (err: any) {
      toast.error(err?.response?.data?.error || 'Login failed');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center px-4">
      <div className="w-full max-w-sm">
        {/* Logo */}
        <div className="text-center mb-10">
          <h1 className="font-display text-5xl tracking-widest text-white">BLR SWIPE</h1>
          <p className="text-sm text-gray-500 mt-2">Bangalore's event discovery app</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs text-gray-500 mb-1.5 uppercase tracking-widest">Email</label>
            <input
              type="email"
              className="input-dark"
              placeholder="you@example.com"
              value={email}
              onChange={e => setEmail(e.target.value)}
              required
              autoComplete="email"
            />
          </div>
          <div>
            <label className="block text-xs text-gray-500 mb-1.5 uppercase tracking-widest">Password</label>
            <input
              type="password"
              className="input-dark"
              placeholder="••••••••"
              value={password}
              onChange={e => setPassword(e.target.value)}
              required
              autoComplete="current-password"
            />
          </div>

          <button type="submit" className="btn-primary mt-2" disabled={loading}>
            {loading ? 'SIGNING IN...' : 'SIGN IN'}
          </button>
        </form>

        <div className="mt-6 text-center">
          <span className="text-sm text-gray-600">New here? </span>
          <button
            onClick={onSwitchToSignup}
            className="text-sm text-white underline underline-offset-2"
          >
            Create account
          </button>
        </div>
      </div>
    </div>
  );
}

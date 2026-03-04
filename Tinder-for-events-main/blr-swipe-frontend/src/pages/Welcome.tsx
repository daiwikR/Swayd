import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { useAuth } from '../context/AuthContext';
import AnimatedTextCycle from '../components/ui/animated-text-cycle';
import ModernRetroButton from '../components/ui/modern-retro-button';
import { CATEGORY_CONFIG, type EventCategory } from '../types';

interface WelcomeProps {
  onContinue: () => void;
}

export default function Welcome({ onContinue }: WelcomeProps) {
  const { user } = useAuth();
  const [ready, setReady] = useState(false);

  useEffect(() => {
    // Brief delay so the page has time to mount before animations start
    const t = setTimeout(() => setReady(true), 100);
    return () => clearTimeout(t);
  }, []);

  const categories = user?.preferences?.categories ?? [];
  const words =
    categories.length > 0
      ? categories.map(
          cat => CATEGORY_CONFIG[cat as EventCategory]?.label ?? cat
        )
      : ['Fitness', 'Music', 'Food', 'Art', 'Nightlife'];

  return (
    <div
      className="min-h-screen flex flex-col items-center justify-center px-8 relative overflow-hidden"
      style={{ background: '#0A0A0A' }}
    >
      {/* Ambient glow */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          background:
            'radial-gradient(ellipse 60% 40% at 50% 60%, rgba(255,45,120,0.08) 0%, transparent 70%)',
        }}
      />

      {ready && (
        <motion.div
          className="flex flex-col items-center text-center w-full max-w-sm"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.6 }}
        >
          {/* Logo */}
          <motion.div
            className="font-display text-5xl tracking-[0.35em] text-white mb-14"
            initial={{ y: -20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 0.1, duration: 0.5 }}
          >
            BLR
          </motion.div>

          {/* Animated headline */}
          <motion.div
            className="mb-12"
            initial={{ y: 20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 0.3, duration: 0.5 }}
          >
            <h1 className="font-display text-5xl tracking-widest text-white leading-none">
              YOUR
            </h1>
            <div
              className="font-display text-5xl tracking-widest leading-none my-1 inline-flex items-center"
              style={{ color: '#FF2D78', minHeight: '1.2em' }}
            >
              <AnimatedTextCycle
                words={words}
                interval={1800}
                className="text-5xl tracking-widest uppercase"
              />
            </div>
            <h1 className="font-display text-5xl tracking-widest text-white leading-none">
              SCENE
            </h1>
            <p className="text-gray-600 text-xs mt-4 tracking-widest uppercase">
              IN BANGALORE STARTS NOW
            </p>
          </motion.div>

          {/* CTA button */}
          <motion.div
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ delay: 0.6, duration: 0.4 }}
          >
            <ModernRetroButton
              label="LET'S EXPLORE →"
              onClick={onContinue}
              textDefault="#f7f7ff"
              textHover="#0A0A0A"
              background="#1A1A1A"
              boxShadow="0 0 0 0 #FF2D78"
              boxShadowHover="0 0 24px 4px #FF2D78"
              svgRect="#FF2D78"
              svgRectFlicker="#FF6B35"
            />
          </motion.div>

          {/* Hint */}
          <motion.p
            className="text-gray-700 text-xs mt-10 leading-relaxed"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 1.0, duration: 0.5 }}
          >
            Swipe right to save · Swipe left to skip
            <br />
            We learn your taste as you go
          </motion.p>
        </motion.div>
      )}
    </div>
  );
}

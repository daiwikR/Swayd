import { IUser } from '../models/User';

export const PREF_MAX = 2.0;
export const PREF_MIN = 0.0;

/**
 * Move a category weight toward a target using an exponential moving average:
 *   w ← w + α·(target − w)
 * Unlike fixed ±deltas, this weights recent interactions more, converges
 * smoothly toward the extremes, and can never leave the [0, 2] range.
 */
export function nudgePreference(user: IUser, category: string, target: number, alpha: number) {
  const pv: Map<string, number> = user.preference_vector || new Map();
  const current = pv.get(category) ?? 0;
  const updated = Math.min(PREF_MAX, Math.max(PREF_MIN, current + alpha * (target - current)));
  pv.set(category, updated);
  user.preference_vector = pv;
}

/**
 * Learning rate scaled by how long the user actually looked at the card.
 * - Right swipe after a long look (read the details) → strong positive.
 * - Instant left flick → confident rejection, stronger negative than a slow "meh" pass.
 */
export function swipeLearningRate(direction: 'left' | 'right', dwellMs?: number): number {
  const t = Math.min(Math.max(dwellMs ?? 3000, 0), 10000) / 10000; // 0..1 over 10s
  if (direction === 'right') return 0.08 + 0.07 * t; // 0.08 – 0.15
  return 0.07 - 0.03 * t;                            // 0.07 (fast flick) – 0.04 (slow pass)
}

/** RSVP is the strongest intent signal — user committed to attending. */
export const RSVP_ALPHA = 0.25;
/** Cancelling an RSVP is a mild negative signal. */
export const RSVP_CANCEL_ALPHA = 0.08;

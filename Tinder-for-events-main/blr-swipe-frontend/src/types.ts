export type AgeRating = 'ALL_AGES' | '13+' | '18+' | '21+';

export type EventCategory =
  | 'fitness' | 'music' | 'tech' | 'food' | 'art'
  | 'nightlife' | 'sports' | 'wellness' | 'comedy' | 'networking' | 'other';

export type RSVPQuestion = {
  question: string;
  required: boolean;
};

export type CardType = {
  _id: string;
  title: string;
  description?: string;
  image_url?: string;
  location?: string;
  category?: EventCategory;
  datetime?: string;
  price?: number;
  capacity?: number;
  age_rating?: AgeRating;
  like_count?: number;
  is_recommended?: boolean;
  rsvp_enabled?: boolean;
  rsvp_form?: RSVPQuestion[];
  source_url?: string;
  source?: 'manual' | 'bookmyshow' | 'district' | 'allevents' | 'meetup';
};

export type UserType = {
  _id: string;
  email: string;
  role: 'seeker' | 'lister' | 'admin';
  display_name: string;
  avatar_url?: string;
  verified_age: number;
  onboarding_complete: boolean;
  preference_vector?: Record<string, number>;
  preferences?: {
    categories: string[];
    format: string;
    time: string;
  };
};

import {
  Dumbbell, Music, Code2, UtensilsCrossed, Palette, MoonStar,
  Trophy, Leaf, Mic, Users, Shapes, type LucideIcon,
} from 'lucide-react';

export const CATEGORY_CONFIG: Record<EventCategory, { label: string; icon: LucideIcon; color: string; bg: string }> = {
  fitness:    { label: 'Fitness',     icon: Dumbbell,        color: '#39FF14', bg: 'rgba(57,255,20,0.15)' },
  music:      { label: 'Music',       icon: Music,           color: '#FF2D78', bg: 'rgba(255,45,120,0.15)' },
  tech:       { label: 'Tech',        icon: Code2,           color: '#00D4FF', bg: 'rgba(0,212,255,0.15)' },
  food:       { label: 'Food',        icon: UtensilsCrossed, color: '#FF9F1C', bg: 'rgba(255,159,28,0.15)' },
  art:        { label: 'Art',         icon: Palette,         color: '#C77DFF', bg: 'rgba(199,125,255,0.15)' },
  nightlife:  { label: 'Nightlife',   icon: MoonStar,        color: '#FF6B35', bg: 'rgba(255,107,53,0.15)' },
  sports:     { label: 'Sports',      icon: Trophy,          color: '#06D6A0', bg: 'rgba(6,214,160,0.15)' },
  wellness:   { label: 'Wellness',    icon: Leaf,            color: '#FFD166', bg: 'rgba(255,209,102,0.15)' },
  comedy:     { label: 'Comedy',      icon: Mic,             color: '#EF476F', bg: 'rgba(239,71,111,0.15)' },
  networking: { label: 'Networking',  icon: Users,           color: '#118AB2', bg: 'rgba(17,138,178,0.15)' },
  other:      { label: 'Other',       icon: Shapes,          color: '#8D99AE', bg: 'rgba(141,153,174,0.15)' },
};

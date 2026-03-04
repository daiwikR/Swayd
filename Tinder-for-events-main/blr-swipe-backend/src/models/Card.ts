import { Schema, model, Document, Types } from 'mongoose';

export const EVENT_CATEGORIES = [
  'fitness', 'music', 'tech', 'food', 'art',
  'nightlife', 'sports', 'wellness', 'comedy', 'networking', 'other'
] as const;

export type EventCategory = typeof EVENT_CATEGORIES[number];
export type AgeRating = 'ALL_AGES' | '13+' | '18+' | '21+';

export interface IRSVPQuestion {
  question: string;
  required: boolean;
}

export type EventSource = 'manual' | 'bookmyshow' | 'district' | 'allevents' | 'meetup';

export interface IEvent extends Document {
  lister_id: Types.ObjectId;
  title: string;
  description: string;
  category: EventCategory;
  datetime: Date;
  location: string;
  image_url: string;
  price: number;
  capacity: number;
  age_rating: AgeRating;
  like_count: number;
  dislike_count: number;
  is_active: boolean;
  rsvp_enabled: boolean;
  rsvp_form: IRSVPQuestion[];
  source_url: string;
  source: EventSource;
  is_scraped: boolean;
  createdAt: Date;
}

const EventSchema = new Schema<IEvent>({
  lister_id: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  title: { type: String, required: true },
  description: { type: String, default: '' },
  category: { type: String, enum: EVENT_CATEGORIES, default: 'other' },
  datetime: { type: Date },
  location: { type: String, default: 'Bangalore' },
  image_url: { type: String, default: '' },
  price: { type: Number, default: 0 },
  capacity: { type: Number, default: 0 },
  age_rating: { type: String, enum: ['ALL_AGES', '13+', '18+', '21+'], default: 'ALL_AGES' },
  like_count: { type: Number, default: 0 },
  dislike_count: { type: Number, default: 0 },
  is_active: { type: Boolean, default: true },
  rsvp_enabled: { type: Boolean, default: false },
  rsvp_form: {
    type: [{ question: String, required: Boolean }],
    default: [],
  },
  source_url: { type: String, default: '' },
  source: { type: String, enum: ['manual', 'bookmyshow', 'district', 'allevents', 'meetup'], default: 'manual' },
  is_scraped: { type: Boolean, default: false },
  createdAt: { type: Date, default: Date.now }
});

// Unique index on source_url for deduplication (empty strings excluded)
EventSchema.index(
  { source_url: 1 },
  { unique: true, sparse: true, partialFilterExpression: { source_url: { $ne: '' } } }
);

export default model<IEvent>('Event', EventSchema);
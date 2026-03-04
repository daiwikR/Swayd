import { Schema, model, Document, Types } from 'mongoose';

export interface IRSVP extends Document {
  event_id: Types.ObjectId;
  user_id: Types.ObjectId;
  answers: Record<string, string>;
  seat_code: string;
  status: 'confirmed' | 'cancelled';
  createdAt: Date;
}

const RSVPSchema = new Schema<IRSVP>({
  event_id: { type: Schema.Types.ObjectId, ref: 'Event', required: true },
  user_id: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  answers: { type: Schema.Types.Mixed, default: {} },
  seat_code: { type: String, required: true },
  status: { type: String, enum: ['confirmed', 'cancelled'], default: 'confirmed' },
  createdAt: { type: Date, default: Date.now },
});

// Compound unique index: one confirmed RSVP per user per event
RSVPSchema.index({ event_id: 1, user_id: 1 }, { unique: true });

export default model<IRSVP>('RSVP', RSVPSchema);

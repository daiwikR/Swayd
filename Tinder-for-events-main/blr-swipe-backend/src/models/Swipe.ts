import { Schema, model, Document, Types } from 'mongoose';

export interface ISwipe extends Document {
  user_id: Types.ObjectId;
  event_id: Types.ObjectId;
  direction: 'left' | 'right';
  timestamp: Date;
}

const SwipeSchema = new Schema<ISwipe>({
  user_id: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  event_id: { type: Schema.Types.ObjectId, ref: 'Event', required: true },
  direction: { type: String, enum: ['left', 'right'], required: true },
  timestamp: { type: Date, default: Date.now }
});

SwipeSchema.index({ user_id: 1, event_id: 1 }, { unique: true });

export default model<ISwipe>('Swipe', SwipeSchema);
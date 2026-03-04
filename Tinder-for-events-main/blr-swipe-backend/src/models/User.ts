import { Schema, model, Document } from 'mongoose';

export interface IUser extends Document {
  email: string;
  password: string;
  role: 'seeker' | 'lister' | 'admin';
  preference_vector: Map<string, number>;
  preferences: {
    categories: string[];
    format: 'in-person' | 'online' | 'both';
    time: 'weekdays' | 'weekends' | 'both';
  };
  onboarding_complete: boolean;
  date_of_birth?: Date;
  verified_age: number;
  display_name: string;
  avatar_url: string;
  createdAt: Date;
}

const UserSchema = new Schema<IUser>({
  email: { type: String, required: true, unique: true, lowercase: true, trim: true },
  password: { type: String, required: true },
  role: { type: String, enum: ['seeker', 'lister', 'admin'], required: true },
  preference_vector: { type: Map, of: Number, default: {} },
  preferences: {
    categories: { type: [String], default: [] },
    format: { type: String, enum: ['in-person', 'online', 'both'], default: 'both' },
    time: { type: String, enum: ['weekdays', 'weekends', 'both'], default: 'both' }
  },
  onboarding_complete: { type: Boolean, default: false },
  date_of_birth: { type: Date },
  verified_age: { type: Number, default: 0 },
  display_name: { type: String, default: '' },
  avatar_url: { type: String, default: '' },
  createdAt: { type: Date, default: Date.now }
});

export default model<IUser>('User', UserSchema);

export interface JournalMessage {
  id: string;
  sender: 'user' | 'gemini';
  text: string;
  timestamp: string;
}

export type JournalCategory =
  | 'Daily Reflection'
  | 'Brainstorming'
  | 'Mindfulness'
  | 'Problem Solving'
  | 'Career & Goals'
  | 'Creative Writing';

export type MoodType =
  | 'Energized'
  | 'Calm'
  | 'Grateful'
  | 'Reflective'
  | 'Stressed'
  | 'Focused'
  | 'Curious';

export interface JournalEntry {
  id: string;
  userId: string;
  title: string;
  category: JournalCategory;
  mood: MoodType;
  messages: JournalMessage[];
  summary?: string;
  insights?: string[];
  tags?: string[];
  createdAt: string;
  updatedAt: string;
}

export interface UserProfile {
  uid: string;
  email: string | null;
  displayName: string | null;
  photoURL: string | null;
  lastLoginAt: string;
}

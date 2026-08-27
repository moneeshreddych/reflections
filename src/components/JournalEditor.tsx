import React, { useState, useEffect, useRef } from 'react';
import Markdown from 'react-markdown';
import {
  Sparkles,
  Send,
  Save,
  CheckCircle2,
  AlertCircle,
  RotateCcw,
  Lightbulb,
  ListOrdered,
  Smile,
  Tag,
  Loader2,
  ChevronRight,
  Bot,
  User as UserIcon,
} from 'lucide-react';
import { db, doc, setDoc, cleanPayload, type User } from '../lib/firebase';
import type { JournalEntry, JournalMessage, JournalCategory, MoodType } from '../types';

interface JournalEditorProps {
  user: User;
  activeEntry: JournalEntry | null;
  onEntrySaved: (entry: JournalEntry) => void;
}

const CATEGORIES: JournalCategory[] = [
  'Daily Reflection',
  'Brainstorming',
  'Mindfulness',
  'Problem Solving',
  'Career & Goals',
  'Creative Writing',
];

const MOODS: { type: MoodType; emoji: string }[] = [
  { type: 'Energized', emoji: '⚡' },
  { type: 'Calm', emoji: '🌿' },
  { type: 'Grateful', emoji: '✨' },
  { type: 'Reflective', emoji: '🌊' },
  { type: 'Focused', emoji: '🎯' },
  { type: 'Curious', emoji: '💡' },
  { type: 'Stressed', emoji: '🌪️' },
];

const QUICK_PROMPTS = [
  'What is an objective, grounded perspective on what I wrote?',
  'Help me identify 3 actionable next steps to move forward.',
  'Summarize my main reflection and highlight key insights.',
  'Brainstorm creative angles I might not have considered.',
];

export const JournalEditor: React.FC<JournalEditorProps> = ({
  user,
  activeEntry,
  onEntrySaved,
}) => {
  const [entry, setEntry] = useState<JournalEntry>(() => {
    if (activeEntry) return activeEntry;
    const now = new Date().toISOString();
    return {
      id: 'entry_' + Date.now(),
      userId: user.uid,
      title: 'Today\'s Reflection',
      category: 'Daily Reflection',
      mood: 'Reflective',
      messages: [],
      summary: '',
      insights: [],
      createdAt: now,
      updatedAt: now,
    };
  });

  const [inputPrompt, setInputPrompt] = useState('');
  const [isGeminiLoading, setIsGeminiLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [saveStatus, setSaveStatus] = useState<'idle' | 'saved' | 'saving' | 'error'>('idle');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Sync state if activeEntry changes from parent
  useEffect(() => {
    if (activeEntry) {
      setEntry(activeEntry);
      setSaveStatus('idle');
      setErrorMessage(null);
    }
  }, [activeEntry]);

  // Auto scroll to bottom of messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [entry.messages, isGeminiLoading]);

  // Helper to persist entry to Cloud Firestore with clean undefined-stripping
  const persistToFirestore = async (entryToSave: JournalEntry): Promise<boolean> => {
    try {
      setIsSaving(true);
      setSaveStatus('saving');
      setErrorMessage(null);

      const sanitizedPayload = cleanPayload({
        ...entryToSave,
        userId: user.uid,
        updatedAt: new Date().toISOString(),
      });

      // Save to primary entries path
      const entryRef = doc(db, 'users', user.uid, 'entries', entryToSave.id);
      await setDoc(entryRef, sanitizedPayload, { merge: true });

      // Also sync to interactions path for full traceability
      const interactionRef = doc(db, 'users', user.uid, 'interactions', entryToSave.id);
      await setDoc(interactionRef, sanitizedPayload, { merge: true });

      setSaveStatus('saved');
      onEntrySaved(sanitizedPayload as JournalEntry);
      return true;
    } catch (err: any) {
      console.error('Firestore save error:', err);
      setSaveStatus('error');
      setErrorMessage(err.message || 'Failed to save reflection to Firestore. Please retry.');
      return false;
    } finally {
      setIsSaving(false);
    }
  };

  const handleSendMessage = async (promptToSend?: string) => {
    const text = (promptToSend || inputPrompt).trim();
    if (!text || isGeminiLoading) return;

    const userMessage: JournalMessage = {
      id: 'msg_' + Date.now(),
      sender: 'user',
      text,
      timestamp: new Date().toISOString(),
    };

    const updatedMessages = [...entry.messages, userMessage];
    const updatedEntry: JournalEntry = {
      ...entry,
      messages: updatedMessages,
      updatedAt: new Date().toISOString(),
    };

    // Update UI immediately
    setEntry(updatedEntry);
    setInputPrompt('');
    setIsGeminiLoading(true);
    setErrorMessage(null);

    try {
      // Call server-side Gemini API route
      const response = await fetch('/api/gemini/reflect', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: updatedEntry.title,
          category: updatedEntry.category,
          mood: updatedEntry.mood,
          messages: updatedMessages,
        }),
      });

      if (!response.ok) {
        const errData = await response.json().catch(() => ({}));
        throw new Error(errData.error || `Server responded with status ${response.status}`);
      }

      const data = await response.json();

      const geminiMessage: JournalMessage = {
        id: 'msg_gemini_' + Date.now(),
        sender: 'gemini',
        text: data.reply || 'Reflected on your thought.',
        timestamp: new Date().toISOString(),
      };

      const finalEntry: JournalEntry = {
        ...updatedEntry,
        messages: [...updatedMessages, geminiMessage],
        summary: data.summary || entry.summary || '',
        insights: data.insights && data.insights.length > 0 ? data.insights : (entry.insights || []),
        updatedAt: new Date().toISOString(),
      };

      setEntry(finalEntry);

      // Persist full conversation & summaries to Cloud Firestore
      await persistToFirestore(finalEntry);
    } catch (err: any) {
      console.error('Error contacting Gemini:', err);
      setErrorMessage(err.message || 'Gemini reflection service encountered an issue. Your notes were saved.');
      // Persist the user's message even if Gemini failed
      await persistToFirestore(updatedEntry);
    } finally {
      setIsGeminiLoading(false);
    }
  };

  const handleManualSave = () => {
    persistToFirestore(entry);
  };

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 py-8 flex flex-col gap-6">
      {/* Editor Header & Settings Card */}
      <div className="bg-white rounded-2xl p-5 sm:p-6 border border-slate-200 shadow-xs flex flex-col gap-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <input
            id="entry-title-input"
            type="text"
            value={entry.title}
            onChange={(e) => {
              const updated = { ...entry, title: e.target.value };
              setEntry(updated);
            }}
            onBlur={() => persistToFirestore(entry)}
            placeholder="Title of this reflection..."
            className="text-2xl sm:text-3xl font-bold text-slate-900 focus:outline-hidden placeholder:text-slate-300 w-full bg-transparent tracking-tight"
          />

          <div className="flex items-center gap-2 shrink-0">
            {saveStatus === 'saving' && (
              <span className="inline-flex items-center gap-1.5 text-xs text-indigo-700 font-medium px-2.5 py-1 rounded-full bg-indigo-50 border border-indigo-100">
                <Loader2 className="w-3.5 h-3.5 animate-spin" /> Saving...
              </span>
            )}
            {saveStatus === 'saved' && (
              <span className="inline-flex items-center gap-1.5 text-xs text-emerald-700 font-medium px-2.5 py-1 rounded-full bg-emerald-50 border border-emerald-100">
                <CheckCircle2 className="w-3.5 h-3.5" /> Saved to Firestore
              </span>
            )}
            {saveStatus === 'error' && (
              <button
                onClick={handleManualSave}
                className="inline-flex items-center gap-1.5 text-xs text-rose-700 font-medium px-2.5 py-1 rounded-full bg-rose-50 hover:bg-rose-100 border border-rose-200 transition-colors"
              >
                <AlertCircle className="w-3.5 h-3.5" /> Retry Save
              </button>
            )}

            <button
              id="save-reflection-btn"
              onClick={handleManualSave}
              disabled={isSaving}
              className="inline-flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-semibold rounded-lg bg-slate-900 text-white hover:bg-slate-800 transition-colors shadow-xs"
            >
              <Save className="w-3.5 h-3.5" />
              <span>Save</span>
            </button>
          </div>
        </div>

        {/* Categories and Mood Selector */}
        <div className="flex flex-wrap items-center justify-between gap-4 pt-3 border-t border-slate-100 text-xs">
          {/* Category Dropdown */}
          <div className="flex items-center gap-2">
            <Tag className="w-3.5 h-3.5 text-slate-400" />
            <span className="text-slate-500 font-medium">Category:</span>
            <select
              id="entry-category-select"
              value={entry.category}
              onChange={(e) => {
                const updated = { ...entry, category: e.target.value as JournalCategory };
                setEntry(updated);
                persistToFirestore(updated);
              }}
              className="bg-slate-50 hover:bg-slate-100 text-slate-800 px-2.5 py-1 rounded-lg font-medium border border-slate-200 focus:ring-1 focus:ring-indigo-500 transition-colors cursor-pointer"
            >
              {CATEGORIES.map((cat) => (
                <option key={cat} value={cat}>
                  {cat}
                </option>
              ))}
            </select>
          </div>

          {/* Mood Badges */}
          <div className="flex items-center gap-1.5 overflow-x-auto py-1">
            <Smile className="w-3.5 h-3.5 text-slate-400 shrink-0" />
            <span className="text-slate-500 font-medium shrink-0 mr-1">Mood:</span>
            {MOODS.map((m) => (
              <button
                key={m.type}
                onClick={() => {
                  const updated = { ...entry, mood: m.type };
                  setEntry(updated);
                  persistToFirestore(updated);
                }}
                className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium transition-all ${
                  entry.mood === m.type
                    ? 'bg-indigo-50 text-indigo-700 border border-indigo-200 font-semibold shadow-2xs'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200 border border-transparent'
                }`}
              >
                <span>{m.emoji}</span>
                <span>{m.type}</span>
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Error Alert */}
      {errorMessage && (
        <div className="p-4 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs flex items-center justify-between gap-3 shadow-2xs">
          <div className="flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{errorMessage}</span>
          </div>
          <button
            onClick={() => handleSendMessage()}
            className="px-2.5 py-1 rounded-md bg-rose-100 hover:bg-rose-200 text-rose-900 font-medium transition-colors"
          >
            Retry
          </button>
        </div>
      )}

      {/* Summary & Insights Box (If available from Gemini) */}
      {(entry.summary || (entry.insights && entry.insights.length > 0)) && (
        <div className="bg-gradient-to-br from-indigo-50/70 via-slate-50 to-white rounded-2xl p-5 border border-indigo-100 shadow-xs">
          <div className="flex items-center gap-2 text-indigo-900 font-bold text-sm mb-3">
            <Lightbulb className="w-4 h-4 text-indigo-600" />
            <span>Gemini AI Synthesis & Takeaways</span>
          </div>

          {entry.summary && (
            <p className="text-slate-700 text-xs sm:text-sm leading-relaxed mb-3 font-sans">
              {entry.summary}
            </p>
          )}

          {entry.insights && entry.insights.length > 0 && (
            <div className="space-y-1.5 pt-2 border-t border-indigo-100/80">
              <span className="text-[11px] font-semibold text-indigo-800 uppercase tracking-wider">Key Takeaways:</span>
              <ul className="space-y-1 text-xs text-slate-700">
                {entry.insights.map((insight, idx) => (
                  <li key={idx} className="flex items-start gap-2">
                    <ChevronRight className="w-3.5 h-3.5 text-indigo-600 shrink-0 mt-0.5" />
                    <span>{insight}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}

      {/* Conversation / Journal Flow */}
      <div className="space-y-4">
        {entry.messages.length === 0 ? (
          <div className="bg-white rounded-2xl p-8 sm:p-12 text-center border border-dashed border-slate-300">
            <div className="w-12 h-12 rounded-2xl bg-indigo-50 text-indigo-600 flex items-center justify-center mx-auto mb-4 border border-indigo-100">
              <Sparkles className="w-6 h-6" />
            </div>
            <h3 className="text-lg font-bold text-slate-900">Start Your Reflection</h3>
            <p className="text-slate-500 text-xs sm:text-sm max-w-md mx-auto mt-1 mb-6">
              Write down your raw thoughts, what happened today, or a decision you are facing. Gemini will reflect with you.
            </p>

            <div className="flex flex-wrap justify-center gap-2 max-w-lg mx-auto">
              {QUICK_PROMPTS.map((prompt, i) => (
                <button
                  key={i}
                  onClick={() => handleSendMessage(prompt)}
                  className="px-3 py-1.5 text-xs text-left bg-slate-50 hover:bg-indigo-50 hover:text-indigo-900 border border-slate-200 hover:border-indigo-200 rounded-lg text-slate-700 transition-colors shadow-2xs"
                >
                  "{prompt}"
                </button>
              ))}
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            {entry.messages.map((msg) => {
              const isUser = msg.sender === 'user';
              return (
                <div
                  key={msg.id}
                  className={`flex gap-3 ${isUser ? 'justify-end' : 'justify-start'}`}
                >
                  {!isUser && (
                    <div className="w-8 h-8 rounded-full bg-indigo-600 text-white flex items-center justify-center shrink-0 mt-1 shadow-xs">
                      <Sparkles className="w-4 h-4" />
                    </div>
                  )}

                  <div
                    className={`max-w-[85%] sm:max-w-[75%] rounded-2xl px-5 py-3.5 text-sm shadow-xs ${
                      isUser
                        ? 'bg-slate-900 text-slate-100 rounded-tr-xs'
                        : 'bg-white text-slate-800 border border-slate-200 rounded-tl-xs'
                    }`}
                  >
                    <div className="flex items-center justify-between gap-4 mb-1 text-[10px] opacity-70">
                      <span className="font-medium">{isUser ? 'You' : 'Gemini Reflection'}</span>
                      <span>{new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                    </div>

                    {isUser ? (
                      <p className="whitespace-pre-wrap leading-relaxed font-sans">{msg.text}</p>
                    ) : (
                      <div className="prose prose-slate prose-sm max-w-none leading-relaxed">
                        <Markdown>{msg.text}</Markdown>
                      </div>
                    )}
                  </div>

                  {isUser && (
                    <div className="w-8 h-8 rounded-full bg-slate-200 text-slate-700 flex items-center justify-center shrink-0 mt-1 shadow-xs">
                      <UserIcon className="w-4 h-4" />
                    </div>
                  )}
                </div>
              );
            })}

            {isGeminiLoading && (
              <div className="flex gap-3 justify-start items-center">
                <div className="w-8 h-8 rounded-full bg-indigo-600 text-white flex items-center justify-center shrink-0 animate-pulse shadow-xs">
                  <Sparkles className="w-4 h-4" />
                </div>
                <div className="bg-white border border-slate-200 rounded-2xl rounded-tl-xs px-4 py-3 text-xs text-slate-500 flex items-center gap-2 shadow-xs">
                  <Loader2 className="w-3.5 h-3.5 animate-spin text-indigo-600" />
                  <span>Gemini is reflecting and generating synthesis...</span>
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>
        )}
      </div>

      {/* Suggested Next Reflection Chips */}
      {entry.messages.length > 0 && !isGeminiLoading && (
        <div className="flex items-center gap-2 overflow-x-auto py-1">
          <span className="text-[11px] text-slate-400 font-medium shrink-0">Prompts:</span>
          {QUICK_PROMPTS.map((prompt, i) => (
            <button
              key={i}
              onClick={() => handleSendMessage(prompt)}
              className="text-xs px-3 py-1 bg-white hover:bg-indigo-50 text-slate-600 hover:text-indigo-900 border border-slate-200 hover:border-indigo-300 rounded-full shrink-0 transition-colors"
            >
              {prompt}
            </button>
          ))}
        </div>
      )}

      {/* Input Box */}
      <div className="sticky bottom-4 bg-white/95 backdrop-blur-md rounded-2xl border border-slate-200 shadow-lg p-2.5">
        <form
          onSubmit={(e) => {
            e.preventDefault();
            handleSendMessage();
          }}
          className="flex items-end gap-2"
        >
          <textarea
            id="journal-prompt-textarea"
            value={inputPrompt}
            onChange={(e) => setInputPrompt(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                handleSendMessage();
              }
            }}
            placeholder="Write your journal thoughts or ask Gemini a question... (Enter to send, Shift+Enter for new line)"
            rows={2}
            className="flex-1 resize-none bg-slate-50 focus:bg-white rounded-xl border border-slate-200 focus:border-indigo-500 px-3 py-2 text-sm text-slate-900 placeholder:text-slate-400 focus:outline-hidden transition-all"
          />

          <button
            id="submit-gemini-prompt-btn"
            type="submit"
            disabled={!inputPrompt.trim() || isGeminiLoading}
            className="p-3 rounded-xl bg-indigo-600 text-white hover:bg-indigo-700 disabled:opacity-40 disabled:cursor-not-allowed transition-all shadow-xs shrink-0"
          >
            {isGeminiLoading ? (
              <Loader2 className="w-5 h-5 animate-spin" />
            ) : (
              <Send className="w-5 h-5" />
            )}
          </button>
        </form>
      </div>
    </div>
  );
};

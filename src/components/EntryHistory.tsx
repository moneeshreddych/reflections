import React, { useState, useEffect } from 'react';
import {
  Search,
  Calendar,
  Sparkles,
  Trash2,
  ExternalLink,
  Tag,
  Smile,
  Copy,
  Check,
  BookOpen,
  Filter,
  MessageSquare,
  ChevronRight,
  AlertCircle,
  Loader2,
} from 'lucide-react';
import {
  db,
  collection,
  query,
  orderBy,
  onSnapshot,
  doc,
  deleteDoc,
  type User,
} from '../lib/firebase';
import type { JournalEntry, JournalCategory, MoodType } from '../types';

interface EntryHistoryProps {
  user: User;
  onSelectEntry: (entry: JournalEntry) => void;
  onNewEntry: () => void;
}

export const EntryHistory: React.FC<EntryHistoryProps> = ({
  user,
  onSelectEntry,
  onNewEntry,
}) => {
  const [entries, setEntries] = useState<JournalEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('All');
  const [selectedMood, setSelectedMood] = useState<string>('All');
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Real-time listener for user's isolated Firestore entries
  useEffect(() => {
    setLoading(true);
    setError(null);

    const entriesRef = collection(db, 'users', user.uid, 'entries');
    const q = query(entriesRef, orderBy('updatedAt', 'desc'));

    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        const fetched: JournalEntry[] = [];
        snapshot.forEach((docSnap) => {
          fetched.push(docSnap.data() as JournalEntry);
        });
        setEntries(fetched);
        setLoading(false);
      },
      (err) => {
        console.error('Failed to subscribe to entries:', err);
        setError('Could not load entries from Firestore. Please check connection.');
        setLoading(false);
      }
    );

    return () => unsubscribe();
  }, [user.uid]);

  const handleDeleteEntry = async (entryId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!window.confirm('Are you sure you want to delete this reflection entry? This cannot be undone.')) {
      return;
    }

    try {
      setDeletingId(entryId);
      // Delete from entries and interactions
      await deleteDoc(doc(db, 'users', user.uid, 'entries', entryId));
      await deleteDoc(doc(db, 'users', user.uid, 'interactions', entryId)).catch(() => {});
    } catch (err: any) {
      console.error('Delete error:', err);
      alert('Failed to delete entry: ' + (err.message || 'Unknown error'));
    } finally {
      setDeletingId(null);
    }
  };

  const handleCopyMarkdown = (entry: JournalEntry, e: React.MouseEvent) => {
    e.stopPropagation();
    const markdown = `# ${entry.title}
**Date:** ${new Date(entry.createdAt).toLocaleDateString()} | **Category:** ${entry.category} | **Mood:** ${entry.mood}

${entry.summary ? `### AI Summary\n${entry.summary}\n` : ''}
${entry.insights && entry.insights.length > 0 ? `### Key Insights\n${entry.insights.map((i) => `- ${i}`).join('\n')}\n` : ''}

### Conversation & Thoughts
${entry.messages.map((m) => `**${m.sender === 'user' ? 'You' : 'Gemini'}**: ${m.text}`).join('\n\n')}
`;

    navigator.clipboard.writeText(markdown);
    setCopiedId(entry.id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const filteredEntries = entries.filter((entry) => {
    const matchesSearch =
      entry.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (entry.summary && entry.summary.toLowerCase().includes(searchQuery.toLowerCase())) ||
      entry.messages.some((m) => m.text.toLowerCase().includes(searchQuery.toLowerCase()));

    const matchesCategory = selectedCategory === 'All' || entry.category === selectedCategory;
    const matchesMood = selectedMood === 'All' || entry.mood === selectedMood;

    return matchesSearch && matchesCategory && matchesMood;
  });

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 py-8 space-y-6">
      {/* Top Banner & Stats */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-6 rounded-2xl border border-slate-200 shadow-xs">
        <div>
          <h2 className="text-2xl font-bold text-slate-900 tracking-tight">Your Reflection Archive</h2>
          <p className="text-xs text-slate-500 mt-1">
            Strictly isolated to your account (<code className="text-indigo-600 font-mono text-[11px] bg-slate-50 px-1 py-0.5 rounded border border-slate-200">{user.email}</code>)
          </p>
        </div>

        <button
          onClick={onNewEntry}
          className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-indigo-600 text-white text-xs font-semibold hover:bg-indigo-700 transition-colors shadow-xs self-start sm:self-auto"
        >
          <Sparkles className="w-4 h-4" />
          <span>Write New Reflection</span>
        </button>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs flex flex-col md:flex-row items-center gap-3">
        <div className="relative flex-1 w-full">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            id="search-entries-input"
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search past reflections, insights, keywords..."
            className="w-full pl-9 pr-4 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:outline-hidden focus:ring-1 focus:ring-indigo-500 focus:bg-white text-slate-800"
          />
        </div>

        <div className="flex items-center gap-2 w-full md:w-auto overflow-x-auto text-xs">
          <Filter className="w-3.5 h-3.5 text-slate-400 shrink-0" />
          <select
            id="filter-category-select"
            value={selectedCategory}
            onChange={(e) => setSelectedCategory(e.target.value)}
            className="bg-slate-50 border border-slate-200 text-slate-700 px-2.5 py-1.5 rounded-lg text-xs font-medium focus:ring-1 focus:ring-indigo-500 cursor-pointer"
          >
            <option value="All">All Categories</option>
            <option value="Daily Reflection">Daily Reflection</option>
            <option value="Brainstorming">Brainstorming</option>
            <option value="Mindfulness">Mindfulness</option>
            <option value="Problem Solving">Problem Solving</option>
            <option value="Career & Goals">Career & Goals</option>
            <option value="Creative Writing">Creative Writing</option>
          </select>

          <select
            id="filter-mood-select"
            value={selectedMood}
            onChange={(e) => setSelectedMood(e.target.value)}
            className="bg-slate-50 border border-slate-200 text-slate-700 px-2.5 py-1.5 rounded-lg text-xs font-medium focus:ring-1 focus:ring-indigo-500 cursor-pointer"
          >
            <option value="All">All Moods</option>
            <option value="Energized">Energized</option>
            <option value="Calm">Calm</option>
            <option value="Grateful">Grateful</option>
            <option value="Reflective">Reflective</option>
            <option value="Focused">Focused</option>
            <option value="Curious">Curious</option>
            <option value="Stressed">Stressed</option>
          </select>
        </div>
      </div>

      {error && (
        <div className="p-4 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs flex items-center gap-2">
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Entries List */}
      {loading ? (
        <div className="bg-white rounded-2xl p-12 text-center border border-slate-200 flex flex-col items-center justify-center gap-3">
          <Loader2 className="w-6 h-6 animate-spin text-indigo-600" />
          <span className="text-xs text-slate-500">Querying Firestore archive...</span>
        </div>
      ) : filteredEntries.length === 0 ? (
        <div className="bg-white rounded-2xl p-12 text-center border border-dashed border-slate-300">
          <BookOpen className="w-8 h-8 text-slate-400 mx-auto mb-3" />
          <h3 className="text-base font-bold text-slate-800">No Reflections Found</h3>
          <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto">
            {searchQuery || selectedCategory !== 'All' || selectedMood !== 'All'
              ? 'Try changing your search keywords or filter criteria.'
              : 'You have not written any reflection entries yet. Start your first session!'}
          </p>
          <button
            onClick={onNewEntry}
            className="mt-4 px-4 py-2 bg-slate-900 text-white rounded-xl text-xs font-medium hover:bg-slate-800 transition-colors inline-flex items-center gap-1.5"
          >
            <Sparkles className="w-3.5 h-3.5" />
            <span>Create First Entry</span>
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {filteredEntries.map((entry) => (
            <div
              key={entry.id}
              onClick={() => onSelectEntry(entry)}
              className="bg-white rounded-2xl p-5 border border-slate-200 hover:border-indigo-400 hover:shadow-md transition-all cursor-pointer flex flex-col justify-between group relative"
            >
              <div>
                {/* Header info */}
                <div className="flex items-start justify-between gap-2 mb-2">
                  <div className="flex flex-wrap items-center gap-1.5">
                    <span className="px-2 py-0.5 rounded-full bg-slate-100 text-slate-700 text-[10px] font-medium border border-slate-200">
                      {entry.category}
                    </span>
                    <span className="px-2 py-0.5 rounded-full bg-indigo-50 text-indigo-700 border border-indigo-200/60 text-[10px] font-medium">
                      {entry.mood}
                    </span>
                  </div>

                  <div className="flex items-center gap-1 text-slate-400" onClick={(e) => e.stopPropagation()}>
                    <button
                      onClick={(e) => handleCopyMarkdown(entry, e)}
                      title="Copy Entry Markdown"
                      className="p-1.5 hover:text-slate-700 hover:bg-slate-100 rounded-lg transition-colors"
                    >
                      {copiedId === entry.id ? (
                        <Check className="w-3.5 h-3.5 text-emerald-600" />
                      ) : (
                        <Copy className="w-3.5 h-3.5" />
                      )}
                    </button>
                    <button
                      onClick={(e) => handleDeleteEntry(entry.id, e)}
                      disabled={deletingId === entry.id}
                      title="Delete Entry"
                      className="p-1.5 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>

                <h3 className="text-lg font-bold text-slate-900 group-hover:text-indigo-600 transition-colors line-clamp-1">
                  {entry.title}
                </h3>

                {entry.summary ? (
                  <p className="text-xs text-slate-600 mt-2 line-clamp-2 leading-relaxed">
                    {entry.summary}
                  </p>
                ) : entry.messages.length > 0 ? (
                  <p className="text-xs text-slate-500 mt-2 line-clamp-2 italic leading-relaxed">
                    "{entry.messages[0].text}"
                  </p>
                ) : (
                  <p className="text-xs text-slate-400 mt-2 italic">No message recorded.</p>
                )}

                {entry.insights && entry.insights.length > 0 && (
                  <div className="mt-3 pt-2 border-t border-slate-100 flex flex-wrap gap-1">
                    {entry.insights.slice(0, 2).map((ins, i) => (
                      <span
                        key={i}
                        className="text-[10px] bg-slate-50 text-slate-600 px-2 py-0.5 rounded-md truncate max-w-full border border-slate-100"
                      >
                        • {ins}
                      </span>
                    ))}
                  </div>
                )}
              </div>

              {/* Footer details */}
              <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-400">
                <span className="flex items-center gap-1">
                  <Calendar className="w-3 h-3" />
                  {new Date(entry.createdAt).toLocaleDateString(undefined, {
                    month: 'short',
                    day: 'numeric',
                    year: 'numeric',
                  })}
                </span>

                <div className="flex items-center gap-3">
                  <span className="flex items-center gap-1">
                    <MessageSquare className="w-3 h-3" />
                    {entry.messages.length} turns
                  </span>
                  <span className="inline-flex items-center gap-0.5 text-indigo-600 font-medium group-hover:translate-x-0.5 transition-transform">
                    Open <ChevronRight className="w-3 h-3" />
                  </span>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

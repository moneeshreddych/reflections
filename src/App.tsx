import React, { useState, useEffect } from 'react';
import { auth, onAuthStateChanged, type User } from './lib/firebase';
import { AuthLanding } from './components/AuthLanding';
import { Navbar } from './components/Navbar';
import { JournalEditor } from './components/JournalEditor';
import { EntryHistory } from './components/EntryHistory';
import { ThreatModelModal } from './components/ThreatModelModal';
import type { JournalEntry } from './types';
import { Loader2 } from 'lucide-react';

export default function App() {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [currentView, setCurrentView] = useState<'editor' | 'history'>('editor');
  const [activeEntry, setActiveEntry] = useState<JournalEntry | null>(null);
  const [isThreatModalOpen, setIsThreatModalOpen] = useState(false);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      setCurrentUser(user);
      setAuthLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const handleStartNewEntry = () => {
    if (!currentUser) return;
    const now = new Date().toISOString();
    const newEntry: JournalEntry = {
      id: 'entry_' + Date.now(),
      userId: currentUser.uid,
      title: 'Today\'s Reflection',
      category: 'Daily Reflection',
      mood: 'Reflective',
      messages: [],
      summary: '',
      insights: [],
      createdAt: now,
      updatedAt: now,
    };
    setActiveEntry(newEntry);
    setCurrentView('editor');
  };

  const handleSelectEntryFromHistory = (entry: JournalEntry) => {
    setActiveEntry(entry);
    setCurrentView('editor');
  };

  const handleEntrySaved = (savedEntry: JournalEntry) => {
    setActiveEntry(savedEntry);
  };

  if (authLoading) {
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center text-slate-700">
        <Loader2 className="w-8 h-8 animate-spin text-indigo-600 mb-3" />
        <span className="text-sm font-medium font-sans">Initializing Secure Authentication...</span>
      </div>
    );
  }

  if (!currentUser) {
    return <AuthLanding onSignInSuccess={() => setCurrentView('editor')} />;
  }

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 flex flex-col font-sans selection:bg-indigo-100 selection:text-indigo-900">
      <Navbar
        user={currentUser}
        currentView={currentView}
        onViewChange={setCurrentView}
        onNewEntry={handleStartNewEntry}
        onOpenSecurityModal={() => setIsThreatModalOpen(true)}
      />

      <main className="flex-1 pb-16">
        {currentView === 'editor' ? (
          <JournalEditor
            key={activeEntry?.id || 'new'}
            user={currentUser}
            activeEntry={activeEntry}
            onEntrySaved={handleEntrySaved}
          />
        ) : (
          <EntryHistory
            user={currentUser}
            onSelectEntry={handleSelectEntryFromHistory}
            onNewEntry={handleStartNewEntry}
          />
        )}
      </main>

      <ThreatModelModal
        isOpen={isThreatModalOpen}
        onClose={() => setIsThreatModalOpen(false)}
      />
    </div>
  );
}

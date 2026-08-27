import React from 'react';
import { Sparkles, Plus, History, LogOut, ShieldCheck, User as UserIcon } from 'lucide-react';
import { signOut, auth, type User } from '../lib/firebase';

interface NavbarProps {
  user: User;
  currentView: 'editor' | 'history';
  onViewChange: (view: 'editor' | 'history') => void;
  onNewEntry: () => void;
  onOpenSecurityModal: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  user,
  currentView,
  onViewChange,
  onNewEntry,
  onOpenSecurityModal,
}) => {
  const handleSignOut = async () => {
    try {
      await signOut(auth);
    } catch (err) {
      console.error('Failed to sign out:', err);
    }
  };

  return (
    <header className="sticky top-0 z-30 bg-white/90 backdrop-blur-md border-b border-slate-200">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
        {/* Brand */}
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-indigo-600 flex items-center justify-center text-white shadow-xs">
            <Sparkles className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-lg font-bold text-slate-900 leading-none">Aura Reflection</span>
              <span className="text-[10px] uppercase tracking-wider font-semibold px-1.5 py-0.5 rounded bg-emerald-50 text-emerald-700 border border-emerald-200/60">
                Firestore Connected
              </span>
            </div>
            <span className="text-xs text-slate-500 font-sans">Gemini 3.6 Flash Journal</span>
          </div>
        </div>

        {/* View Switcher & Actions */}
        <div className="flex items-center gap-2 sm:gap-3">
          <button
            id="nav-new-entry-btn"
            onClick={onNewEntry}
            className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg bg-indigo-600 text-white text-sm font-medium hover:bg-indigo-700 transition-colors shadow-xs"
          >
            <Plus className="w-4 h-4" />
            <span className="hidden sm:inline">New Reflection</span>
          </button>

          <div className="flex items-center bg-slate-100 p-0.5 rounded-lg border border-slate-200">
            <button
              id="nav-view-editor-btn"
              onClick={() => onViewChange('editor')}
              className={`px-3 py-1 text-xs font-medium rounded-md transition-all ${
                currentView === 'editor'
                  ? 'bg-white text-slate-900 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Editor
            </button>
            <button
              id="nav-view-history-btn"
              onClick={() => onViewChange('history')}
              className={`inline-flex items-center gap-1 px-3 py-1 text-xs font-medium rounded-md transition-all ${
                currentView === 'history'
                  ? 'bg-white text-slate-900 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <History className="w-3.5 h-3.5" />
              <span>Past Entries</span>
            </button>
          </div>

          <button
            id="nav-security-modal-btn"
            onClick={onOpenSecurityModal}
            title="Threat Model & Security Standard"
            className="p-2 text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-lg transition-colors border border-transparent hover:border-slate-200"
          >
            <ShieldCheck className="w-4 h-4 text-emerald-600" />
          </button>

          {/* User Profile */}
          <div className="flex items-center gap-2 pl-2 border-l border-slate-200">
            {user.photoURL ? (
              <img
                src={user.photoURL}
                alt={user.displayName || 'User'}
                className="w-8 h-8 rounded-full border border-slate-200 object-cover"
                referrerPolicy="no-referrer"
              />
            ) : (
              <div className="w-8 h-8 rounded-full bg-slate-100 border border-slate-200 flex items-center justify-center text-slate-600 text-xs font-medium">
                <UserIcon className="w-4 h-4" />
              </div>
            )}
            <div className="hidden md:block text-left">
              <p className="text-xs font-medium text-slate-800 truncate max-w-[120px]">
                {user.displayName || user.email?.split('@')[0] || 'Member'}
              </p>
              <p className="text-[10px] text-slate-500 truncate max-w-[120px]">{user.email}</p>
            </div>

            <button
              id="nav-sign-out-btn"
              onClick={handleSignOut}
              title="Sign Out"
              className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>
    </header>
  );
};

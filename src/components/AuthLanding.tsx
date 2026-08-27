import React, { useState } from 'react';
import { motion } from 'motion/react';
import { Sparkles, Shield, Lock, BookOpen, Compass, ArrowRight, AlertCircle } from 'lucide-react';
import { auth, googleProvider, signInWithPopup } from '../lib/firebase';

interface AuthLandingProps {
  onSignInSuccess?: () => void;
}

export const AuthLanding: React.FC<AuthLandingProps> = ({ onSignInSuccess }) => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleGoogleSignIn = async () => {
    try {
      setLoading(true);
      setError(null);
      await signInWithPopup(auth, googleProvider);
      if (onSignInSuccess) onSignInSuccess();
    } catch (err: any) {
      console.error('Google Sign-In Error:', err);
      // If popup was blocked or closed by user
      if (err.code === 'auth/popup-closed-by-user') {
        setError('Sign-in popup was closed before completing.');
      } else if (err.code === 'auth/cancelled-popup-request') {
        setError('Sign-in process was cancelled.');
      } else {
        setError(err.message || 'Failed to authenticate with Google. Please try again.');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 flex flex-col justify-between selection:bg-indigo-100 selection:text-indigo-900 font-sans">
      {/* Header */}
      <header className="w-full max-w-7xl mx-auto px-6 py-6 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-indigo-600 flex items-center justify-center text-white shadow-xs">
            <Sparkles className="w-5 h-5" />
          </div>
          <div>
            <h1 className="text-xl font-bold tracking-tight text-slate-900">Aura Reflection</h1>
            <p className="text-xs text-slate-500 font-sans">Private AI Journal & Insight Partner</p>
          </div>
        </div>

        <button
          id="header-sign-in-btn"
          onClick={handleGoogleSignIn}
          disabled={loading}
          className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-slate-700 bg-white border border-slate-200 rounded-lg hover:bg-slate-50 transition-colors shadow-xs"
        >
          <img src="https://www.gstatic.com/firebasejs/ui/2.0.0/images/auth/google.svg" alt="Google" className="w-4 h-4" />
          <span>{loading ? 'Connecting...' : 'Sign In'}</span>
        </button>
      </header>

      {/* Hero Section */}
      <main className="w-full max-w-5xl mx-auto px-6 py-12 flex-1 flex flex-col justify-center">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="text-center max-w-3xl mx-auto"
        >
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-indigo-50 border border-indigo-100 text-indigo-700 text-xs font-medium mb-6">
            <Sparkles className="w-3.5 h-3.5 text-indigo-600" />
            <span>Powered by Gemini 3.6 Flash & Cloud Firestore</span>
          </div>

          <h2 className="text-4xl sm:text-5xl lg:text-6xl font-bold tracking-tight text-slate-900 leading-tight">
            A quiet space to think, write, and converse with AI.
          </h2>

          <p className="mt-6 text-lg sm:text-xl text-slate-600 leading-relaxed font-sans max-w-2xl mx-auto">
            Transform fragmented thoughts into deep clarity. Write multi-turn reflections, receive structured summaries, brainstorm new horizons, and keep every entry isolated securely to your account.
          </p>

          {error && (
            <div className="mt-6 p-4 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-sm flex items-center justify-center gap-2 max-w-md mx-auto">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <div className="mt-8 flex flex-col sm:flex-row items-center justify-center gap-4">
            <button
              id="hero-google-login-button"
              onClick={handleGoogleSignIn}
              disabled={loading}
              className="w-full sm:w-auto inline-flex items-center justify-center gap-3 px-8 py-3.5 rounded-xl bg-indigo-600 text-white font-medium hover:bg-indigo-700 transition-all shadow-md hover:shadow-lg active:scale-98 disabled:opacity-70 text-base"
            >
              <img src="https://www.gstatic.com/firebasejs/ui/2.0.0/images/auth/google.svg" alt="Google" className="w-5 h-5 bg-white rounded-full p-0.5" />
              <span>{loading ? 'Authenticating with Google...' : 'Continue with Google'}</span>
              <ArrowRight className="w-4 h-4 ml-1" />
            </button>
          </div>

          <div className="mt-4 flex items-center justify-center gap-6 text-xs text-slate-500">
            <span className="flex items-center gap-1.5">
              <Shield className="w-3.5 h-3.5 text-emerald-600" /> User-isolated Cloud Firestore
            </span>
            <span className="flex items-center gap-1.5">
              <Lock className="w-3.5 h-3.5 text-emerald-600" /> Federated Passwordless Auth
            </span>
          </div>
        </motion.div>

        {/* Feature Grid */}
        <div className="mt-16 grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs">
            <div className="w-10 h-10 rounded-lg bg-indigo-50 text-indigo-600 flex items-center justify-center mb-4 border border-indigo-100">
              <BookOpen className="w-5 h-5" />
            </div>
            <h3 className="text-lg font-semibold text-slate-900">Multi-Turn Journaling</h3>
            <p className="mt-2 text-sm text-slate-600 leading-relaxed">
              Don't just write static notes. Hold an interactive dialogue with Gemini to unpack emotions, challenge assumptions, and gain grounded perspective.
            </p>
          </div>

          <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs">
            <div className="w-10 h-10 rounded-lg bg-indigo-50 text-indigo-600 flex items-center justify-center mb-4 border border-indigo-100">
              <Sparkles className="w-5 h-5" />
            </div>
            <h3 className="text-lg font-semibold text-slate-900">Instant Syntheses & Insights</h3>
            <p className="mt-2 text-sm text-slate-600 leading-relaxed">
              Gemini automatically extracts executive takeaways, mood trends, and actionable next steps from every reflection session.
            </p>
          </div>

          <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs">
            <div className="w-10 h-10 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center mb-4 border border-emerald-100">
              <Compass className="w-5 h-5" />
            </div>
            <h3 className="text-lg font-semibold text-slate-900">Strict Data Privacy</h3>
            <p className="mt-2 text-sm text-slate-600 leading-relaxed">
              Enforced by Firestore security rules. Your reflections are stored strictly in your private user path and can never be accessed by others.
            </p>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="w-full max-w-7xl mx-auto px-6 py-6 border-t border-slate-200 flex flex-col sm:flex-row items-center justify-between text-xs text-slate-500 gap-4">
        <p>© 2026 Aura Reflection • Google Cloud Run & Firebase</p>
        <div className="flex items-center gap-4">
          <span>OWASP Compliant</span>
          <span>•</span>
          <span>Zero Password Storage</span>
          <span>•</span>
          <span>Isolated User Context</span>
        </div>
      </footer>
    </div>
  );
};

import React from 'react';
import { Shield, X, CheckCircle2, Lock, Key, Server, Database, BrainCircuit } from 'lucide-react';

interface ThreatModelModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const ThreatModelModal: React.FC<ThreatModelModalProps> = ({ isOpen, onClose }) => {
  if (!isOpen) return null;

  const threatZones = [
    {
      zone: '1. Input Surfaces',
      icon: <BrainCircuit className="w-4 h-4 text-amber-600" />,
      risks: 'Malicious prompt injections, excessive payload size, script injection via journal text.',
      countermeasures: 'Top-level Express body size limit (2MB), strict JSON payload parsing, plain-text extraction, defensive schema validation before Gemini forwarding.',
    },
    {
      zone: '2. Planning & Reasoning',
      icon: <Lock className="w-4 h-4 text-indigo-600" />,
      risks: 'System instruction overrides, model hallucinations, API rate limits / 503 outages.',
      countermeasures: 'Emphatic system framing treating journal notes as inert text; Resilient Model Fallback Ladder (gemini-3.6-flash → gemini-3.1-flash-lite → dynamic latest → gemini-3.7-flash).',
    },
    {
      zone: '3. Tool Execution & Server Endpoints',
      icon: <Server className="w-4 h-4 text-blue-600" />,
      risks: 'Unauthorized endpoint access, server-side request forgery (SSRF), privilege escalation.',
      countermeasures: 'Defensive null-safe payload ingestion, no external SSRF capabilities, server-side only proxy for Gemini API.',
    },
    {
      zone: '4. Memory & State (Firestore)',
      icon: <Database className="w-4 h-4 text-emerald-600" />,
      risks: 'Cross-user data leaks, unauthorized reads/writes to other users\' journal entries, corrupt records.',
      countermeasures: 'Strict document path isolation under /users/{userId}/*; Firestore security rules verifying request.auth.uid == userId; strict undefined-stripping via cleanPayload().',
    },
    {
      zone: '5. Inter-System Communication & Secrets',
      icon: <Key className="w-4 h-4 text-rose-600" />,
      risks: 'Client-side API key leakage, token sniffing, unauthorized credential re-use.',
      countermeasures: 'GEMINI_API_KEY stored exclusively server-side via Secret Manager / environment variables; zero hardcoding; Google Federated OAuth via Firebase Auth.',
    },
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
      <div className="bg-white rounded-2xl max-w-3xl w-full max-h-[90vh] flex flex-col shadow-2xl border border-slate-200 overflow-hidden">
        {/* Modal Header */}
        <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between bg-slate-50">
          <div className="flex items-center gap-2.5">
            <div className="p-1.5 rounded-lg bg-emerald-100 text-emerald-800">
              <Shield className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-900">Agentic Threat Model & Security Controls</h2>
              <p className="text-xs text-slate-500 font-sans">5 Threat Zones Security Specification (OWASP Top 10 & LLM)</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-200/60 rounded-lg transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Content */}
        <div className="p-6 overflow-y-auto space-y-6 text-slate-800 text-sm">
          <div className="p-3.5 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-900 text-xs flex items-start gap-2.5">
            <CheckCircle2 className="w-4 h-4 text-emerald-700 shrink-0 mt-0.5" />
            <div>
              <span className="font-semibold">Security Assertion:</span> All user reflections, chats, and summaries are strictly quarantined to the authenticated user's private Firestore path (<code className="bg-emerald-100/70 px-1 py-0.5 rounded text-emerald-900">/users/&#123;userId&#125;/*</code>) and validated via server-side rules.
            </div>
          </div>

          <div className="border border-slate-200 rounded-xl overflow-hidden">
            <table className="w-full text-left text-xs border-collapse">
              <thead className="bg-slate-100 text-slate-700 font-semibold border-b border-slate-200">
                <tr>
                  <th className="p-3">Threat Zone</th>
                  <th className="p-3">Potential Risks</th>
                  <th className="p-3">Applied Countermeasures</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {threatZones.map((tz, index) => (
                  <tr key={index} className="hover:bg-slate-50/70 transition-colors">
                    <td className="p-3 font-medium text-slate-900 flex items-center gap-1.5 whitespace-nowrap align-top">
                      {tz.icon}
                      <span>{tz.zone}</span>
                    </td>
                    <td className="p-3 text-slate-600 align-top">{tz.risks}</td>
                    <td className="p-3 text-emerald-900 font-medium align-top">{tz.countermeasures}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div>
            <h4 className="font-semibold text-slate-900 mb-2">Applied Cloud Firestore Security Rules:</h4>
            <pre className="p-3 bg-slate-900 text-slate-100 rounded-xl text-xs font-mono overflow-x-auto">
{`rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /users/{userId} {
      allow read, write: if request.auth != null && request.auth.uid == userId;
      
      match /{allSubcollections=**} {
        allow read, write: if request.auth != null && request.auth.uid == userId;
      }
    }
  }
}`}
            </pre>
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-3 border-t border-slate-200 bg-slate-50 flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2 bg-slate-900 text-white text-xs font-medium rounded-lg hover:bg-slate-800 transition-colors"
          >
            Close Security Specifications
          </button>
        </div>
      </div>
    </div>
  );
};

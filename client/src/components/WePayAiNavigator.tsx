import React, { useState } from 'react';
import { Bot, ChevronDown, Send } from 'lucide-react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { wepayService } from '../services/wepayService';

export const WePayAiNavigator: React.FC = () => {
  const [open, setOpen] = useState(false);
  const [message, setMessage] = useState('');
  const [reply, setReply] = useState<string | null>(null);
  const [actions, setActions] = useState<Array<{ label: string; route: string; description: string }>>([]);
  const [loading, setLoading] = useState(false);
  const location = useLocation();
  const navigate = useNavigate();
  const { isAuthenticated, organizer } = useAuth();

  const ask = async (prompt: string) => {
    const clean = prompt.trim();
    if (!clean) return;
    setLoading(true);
    setReply(null);
    setActions([]);
    try {
      const result = await wepayService.askWePayNavigator(clean, location.pathname);
      let safeActions = result.actions || [];
      if (!isAuthenticated) {
        safeActions = safeActions.filter((action) => !action.route.startsWith('/admin') && !action.route.startsWith('/dashboard'));
      }
      if (!organizer?.isFounder && organizer?.role !== 'SUPER_ADMIN') {
        safeActions = safeActions.filter((action) => !action.route.startsWith('/admin'));
      }
      setReply(result.reply);
      setActions(safeActions);
    } catch (error) {
      setReply(error instanceof Error ? error.message : 'The WePay AI guide is temporarily unavailable.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed bottom-4 right-4 z-[80] flex flex-col items-end gap-2">
      {open && (
        <div className="w-[min(360px,calc(100vw-2rem)] rounded-2xl border border-slate-200 bg-white shadow-2xl overflow-hidden">
          <div className="flex items-center justify-between border-b border-slate-100 px-4 py-3">
            <div className="flex items-center gap-2">
              <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-indigo-600 text-white">
                <Bot className="h-4 w-4" />
              </span>
              <div>
                <p className="text-sm font-bold text-slate-900">Ask WePay AI</p>
                <p className="text-[10px] text-slate-500">Guidance in plain English & Pidgin</p>
              </div>
            </div>
            <button type="button" onClick={() => setOpen(false)} className="rounded-lg p-1 text-slate-400 hover:bg-slate-100">
              <ChevronDown className="h-4 w-4" />
            </button>
          </div>
          <div className="max-h-72 space-y-3 overflow-y-auto p-4">
            <div className="flex flex-wrap gap-2">
              {[
                'How do I create a ticket link?',
                'Where do I add my bank details?',
                'How I go check who don pay?',
                'Is payment safe?',
              ].map((chip) => (
                <button key={chip} type="button" onClick={() => void ask(chip)} className="rounded-full border border-indigo-100 bg-indigo-50 px-2.5 py-1 text-[11px] font-medium text-indigo-700 hover:bg-indigo-100">
                  {chip}
                </button>
              ))}
            </div>
            {loading && <p className="text-xs text-slate-500">WePay AI is thinking...</p>}
            {reply && (
              <div className="rounded-xl bg-slate-50 p-3 text-xs leading-relaxed text-slate-700">{reply}</div>
            )}
            {actions.map((action) => (
              <button
                key={`${action.route}-${action.label}`}
                type="button"
                onClick={() => navigate(action.route)}
                className="flex w-full items-center justify-between rounded-lg border border-slate-200 px-3 py-2 text-left text-xs font-semibold text-indigo-700 hover:bg-indigo-50"
              >
                <span>{action.label}</span>
                <span>→</span>
              </button>
            ))}
          </div>
          <form
            onSubmit={(event) => {
              event.preventDefault();
              void ask(message);
              setMessage('');
            }}
            className="flex gap-2 border-t border-slate-100 p-3"
          >
            <input
              value={message}
              onChange={(event) => setMessage(event.target.value)}
              placeholder="Ask WePay AI..."
              className="h-9 flex-1 rounded-lg border border-slate-200 px-3 text-xs focus:border-indigo-600 focus:outline-none"
            />
            <button type="submit" disabled={loading} className="flex h-9 w-9 items-center justify-center rounded-lg bg-indigo-600 text-white disabled:opacity-50">
              <Send className="h-4 w-4" />
            </button>
          </form>
        </div>
      )}
      <button
        type="button"
        onClick={() => setOpen((value) => !value)}
        className="flex h-12 items-center gap-2 rounded-full bg-slate-950 px-4 text-sm font-semibold text-white shadow-xl hover:bg-slate-800"
      >
        <Bot className="h-4 w-4" />
        <span>Ask WePay AI</span>
      </button>
    </div>
  );
};

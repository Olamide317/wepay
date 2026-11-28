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
  const isPublicCheckoutRoute = /^\/(?:c|receipt)(?:\/|$)/.test(location.pathname);

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
        safeActions = safeActions
          .filter((action) => !action.route.startsWith('/admin'))
          .map((action) => action.route.startsWith('/dashboard')
            ? { ...action, label: 'Sign in', route: '/login', description: 'Sign in to open this organizer page' }
            : action);
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

  if (isPublicCheckoutRoute) return null;

  return (
    <div className="fixed bottom-4 right-4 z-[80] flex flex-col items-end gap-2">
      {open && (
        <section className="w-[min(360px,calc(100vw-2rem))] overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xl">
          <div className="flex items-center justify-between border-b border-slate-100 bg-slate-50/80 px-4 py-3">
            <div className="flex items-center gap-2">
              <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-indigo-600 text-white shadow-sm">
                <Bot className="h-4 w-4" />
              </span>
              <div>
                <p className="text-sm font-bold text-slate-900">Ask WePay AI</p>
                <p className="text-[11px] text-slate-500">Helpful answers in English or Pidgin</p>
              </div>
            </div>
            <button type="button" aria-label="Close WePay AI" onClick={() => setOpen(false)} className="rounded-lg p-1.5 text-slate-400 transition hover:bg-slate-200/70 hover:text-slate-700">
              <ChevronDown className="h-4 w-4" />
            </button>
          </div>
          <div className="max-h-80 space-y-3 overflow-y-auto p-4">
            <div className="flex flex-wrap gap-2">
              {[
                'How do I create a ticket link?',
                'When do settlements arrive?',
                'How I go check who don pay?',
                'How much is the fee?',
              ].map((chip) => (
                <button key={chip} type="button" onClick={() => void ask(chip)} className="rounded-full border border-indigo-100 bg-indigo-50 px-2.5 py-1 text-[11px] font-medium text-indigo-700 hover:bg-indigo-100">
                  {chip}
                </button>
              ))}
            </div>
            {loading && <p role="status" className="text-xs text-slate-500">WePay AI is thinking...</p>}
            {reply && (
              <div className="rounded-xl border border-slate-100 bg-slate-50 p-3 text-sm leading-relaxed text-slate-700">{reply}</div>
            )}
            {actions.map((action) => (
              <button
                key={`${action.route}-${action.label}`}
                type="button"
                onClick={() => {
                  setOpen(false);
                  navigate(action.route);
                }}
                className="flex w-full items-center justify-between rounded-xl border border-slate-200 px-3 py-2.5 text-left text-xs font-semibold text-indigo-700 transition hover:border-indigo-200 hover:bg-indigo-50"
              >
                <span>
                  {action.label}
                  {action.description && <span className="mt-0.5 block text-[10px] font-normal text-slate-500">{action.description}</span>}
                </span>
                <span aria-hidden="true">→</span>
              </button>
            ))}
          </div>
          <form
            onSubmit={(event) => {
              event.preventDefault();
              void ask(message);
              setMessage('');
            }}
            className="flex gap-2 border-t border-slate-100 bg-white p-3"
          >
            <input
              value={message}
              onChange={(event) => setMessage(event.target.value)}
              aria-label="Ask WePay AI a question"
              placeholder="Ask WePay AI..."
              className="h-10 min-w-0 flex-1 rounded-xl border border-slate-200 px-3 text-sm focus:border-indigo-600 focus:outline-none focus:ring-2 focus:ring-indigo-600/15"
            />
            <button type="submit" aria-label="Send question" disabled={loading} className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-indigo-600 text-white transition hover:bg-indigo-700 disabled:opacity-50">
              <Send className="h-4 w-4" />
            </button>
          </form>
        </section>
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

import { useEffect, useState, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import { getTranslation, getInitialLang, LANG_CHANGE_EVENT } from '../lib/i18n';
import type { Lang, Translation } from '../lib/i18n';

interface Message {
  id: string;
  username: string;
  content: string;
  created_at: string;
}

function timeAgo(iso: string, t: Translation): string {
  const d = new Date(iso);
  const diff = (Date.now() - d.getTime()) / 1000;
  if (diff < 60) return t.boardJustNow;
  if (diff < 3600) return `${Math.floor(diff / 60)} ${t.boardMinutesAgo}`;
  if (diff < 86400) return `${Math.floor(diff / 3600)} ${t.boardHoursAgo}`;
  const ymd = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  return ymd;
}

export default function MessageBoard() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [content, setContent] = useState('');
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [lang, setLang] = useState<Lang>(() => getInitialLang());

  const t = getTranslation(lang);

  useEffect(() => {
    const onLang = (e: Event) => setLang((e as CustomEvent<Lang>).detail);
    window.addEventListener(LANG_CHANGE_EVENT, onLang);
    return () => window.removeEventListener(LANG_CHANGE_EVENT, onLang);
  }, []);

  const load = useCallback(async () => {
    try {
      const { data, error: err } = await supabase
        .from('messages')
        .select('id, username, content, created_at')
        .order('created_at', { ascending: false })
        .limit(50);
      if (err) throw err;
      setMessages(data || []);
    } catch (e: any) {
      setError(e?.message || t.boardLoadError);
    } finally {
      setLoading(false);
    }
  }, [t.boardLoadError]);

  useEffect(() => {
    load();
    supabase.auth.getSession().then(({ data }) => setUser(data.session?.user ?? null));
    const { data: sub } = supabase.auth.onAuthStateChange((_e, session) => {
      setUser(session?.user ?? null);
    });
    return () => sub.subscription.unsubscribe();
  }, [load]);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!content.trim()) return;
    setBusy(true);
    setError('');
    try {
      const username = user?.user_metadata?.username || user?.email?.split('@')[0] || t.boardAnonymous;
      const { error: err } = await supabase.from('messages').insert({
        username,
        content: content.trim(),
      });
      if (err) throw err;
      setContent('');
      await load();
    } catch (e: any) {
      setError(e?.message || t.boardPostError);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="board">
      <div className="message-form">
        {user ? (
          <form onSubmit={submit}>
            <div className="field">
              <label htmlFor="msg-content">{t.boardLabel}</label>
              <textarea
                id="msg-content"
                value={content}
                onChange={(e) => setContent(e.target.value)}
                placeholder={t.boardPlaceholder}
                maxLength={500}
                required
              />
            </div>
            {error && <div className="notice notice--error">{error}</div>}
            <button className="btn btn--primary" disabled={busy}>
              {busy ? t.boardPublishing : t.boardPublish}
            </button>
          </form>
        ) : (
          <div style={{ textAlign: 'center', padding: '1rem 0' }}>
            <p style={{ color: 'var(--ink-soft)' }}>{t.authSubtitle}</p>
            <button
              className="btn btn--gold"
              onClick={() => window.dispatchEvent(new CustomEvent('open-auth'))}
            >
              {t.authLoginRegister}
            </button>
          </div>
        )}
      </div>

      <div className="message-list">
        {loading ? (
          <div className="empty"><div className="spinner" />{t.boardLoading}</div>
        ) : messages.length === 0 ? (
          <div className="empty">{t.boardEmpty}</div>
        ) : (
          messages.map((m) => (
            <div className="message" key={m.id}>
              <div className="message__head">
                <div className="message__author">
                  <span className="message__avatar">{m.username?.slice(0, 1) || t.boardAnonymous.slice(0, 1)}</span>
                  {m.username || t.boardAnonymous}
                </div>
                <span className="message__time">{timeAgo(m.created_at, t)}</span>
              </div>
              <div className="message__text">{m.content}</div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}

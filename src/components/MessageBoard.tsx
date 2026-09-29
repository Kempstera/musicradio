import { useEffect, useState, useCallback } from 'react';
import { supabase } from '../lib/supabase';

interface Message {
  id: string;
  username: string;
  content: string;
  created_at: string;
}

function timeAgo(iso: string): string {
  const d = new Date(iso);
  const diff = (Date.now() - d.getTime()) / 1000;
  if (diff < 60) return '刚刚';
  if (diff < 3600) return `${Math.floor(diff / 60)} 分钟前`;
  if (diff < 86400) return `${Math.floor(diff / 3600)} 小时前`;
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
      setError(e?.message || '加载留言失败');
    } finally {
      setLoading(false);
    }
  }, []);

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
      const username = user?.user_metadata?.username || user?.email?.split('@')[0] || '匿名乐友';
      const { error: err } = await supabase.from('messages').insert({
        username,
        content: content.trim(),
      });
      if (err) throw err;
      setContent('');
      await load();
    } catch (e: any) {
      setError(e?.message || '发布失败，请重试');
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
              <label htmlFor="msg-content">写下你的听乐感悟</label>
              <textarea
                id="msg-content"
                value={content}
                onChange={(e) => setContent(e.target.value)}
                placeholder="你此刻正在听哪一国的音乐？有什么想分享的感受？"
                maxLength={500}
                required
              />
            </div>
            {error && <div className="notice notice--error">{error}</div>}
            <button className="btn btn--primary" disabled={busy}>
              {busy ? '发布中…' : '发布留言'}
            </button>
          </form>
        ) : (
          <div style={{ textAlign: 'center', padding: '1rem 0' }}>
            <p style={{ color: 'var(--ink-soft)' }}>登录后即可在留言板分享你的听乐感悟</p>
            <button
              className="btn btn--gold"
              onClick={() => window.dispatchEvent(new CustomEvent('open-auth'))}
            >
              登录 / 注册
            </button>
          </div>
        )}
      </div>

      <div className="message-list">
        {loading ? (
          <div className="empty"><div className="spinner" />加载留言中…</div>
        ) : messages.length === 0 ? (
          <div className="empty">还没有留言，来做第一个分享的人吧。</div>
        ) : (
          messages.map((m) => (
            <div className="message" key={m.id}>
              <div className="message__head">
                <div className="message__author">
                  <span className="message__avatar">{m.username?.slice(0, 1) || '乐'}</span>
                  {m.username || '匿名乐友'}
                </div>
                <span className="message__time">{timeAgo(m.created_at)}</span>
              </div>
              <div className="message__text">{m.content}</div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}

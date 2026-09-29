import { useEffect, useState, useCallback } from 'react';
import { supabase } from '../lib/supabase';

type Mode = 'login' | 'register';

export default function AuthWidget() {
  const [user, setUser] = useState<any>(null);
  const [open, setOpen] = useState(false);
  const [mode, setMode] = useState<Mode>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [username, setUsername] = useState('');
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => setUser(data.session?.user ?? null));
    const { data: sub } = supabase.auth.onAuthStateChange((_e, session) => {
      setUser(session?.user ?? null);
      if (session?.user) setOpen(false);
    });
    const onOpen = () => setOpen(true);
    window.addEventListener('open-auth', onOpen);
    return () => {
      sub.subscription.unsubscribe();
      window.removeEventListener('open-auth', onOpen);
    };
  }, []);

  const close = useCallback(() => {
    setOpen(false);
    setError('');
    setNotice('');
    setPassword('');
  }, []);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setNotice('');
    setBusy(true);
    try {
      if (mode === 'register') {
        const { error: err } = await supabase.auth.signUp({
          email,
          password,
          options: { data: { username: username || email.split('@')[0] } },
        });
        if (err) throw err;
        setNotice('注册成功！请前往邮箱查收确认邮件（部分邮箱可能自动登录）。');
      } else {
        const { error: err } = await supabase.auth.signInWithPassword({ email, password });
        if (err) throw err;
        setNotice('登录成功');
      }
    } catch (err: any) {
      setError(err?.message || '操作失败，请重试');
    } finally {
      setBusy(false);
    }
  };

  const logout = async () => {
    await supabase.auth.signOut();
  };

  if (user) {
    return (
      <div style={{ display: 'inline-flex', alignItems: 'center', gap: '0.6rem' }}>
        <span style={{ fontSize: '0.85rem', color: 'var(--ink-soft)' }}>
          {user.user_metadata?.username || user.email}
        </span>
        <button className="btn btn--ghost btn--sm" onClick={logout}>退出</button>
      </div>
    );
  }

  return (
    <>
      <button className="btn btn--gold btn--sm" onClick={() => { setMode('login'); setOpen(true); }}>
        登录 / 注册
      </button>

      {open && (
        <div className="modal-backdrop" onClick={close}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <button className="modal__close" onClick={close} aria-label="关闭">✕</button>
            <div className="modal__title">欢迎来到仙乐电台</div>
            <div className="modal__sub">登录后即可在留言板分享你的听乐感悟</div>

            <div className="auth-tabs">
              <button className={mode === 'login' ? 'is-active' : ''} onClick={() => { setMode('login'); setError(''); setNotice(''); }}>登录</button>
              <button className={mode === 'register' ? 'is-active' : ''} onClick={() => { setMode('register'); setError(''); setNotice(''); }}>注册</button>
            </div>

            {error && <div className="notice notice--error">{error}</div>}
            {notice && <div className="notice notice--ok">{notice}</div>}

            <form onSubmit={submit}>
              {mode === 'register' && (
                <div className="field">
                  <label htmlFor="auth-username">昵称（可选）</label>
                  <input id="auth-username" value={username} onChange={(e) => setUsername(e.target.value)} placeholder="你的昵称" />
                </div>
              )}
              <div className="field">
                <label htmlFor="auth-email">邮箱</label>
                <input id="auth-email" type="email" required value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@example.com" autoComplete="email" />
              </div>
              <div className="field">
                <label htmlFor="auth-password">密码</label>
                <input id="auth-password" type="password" required minLength={6} value={password} onChange={(e) => setPassword(e.target.value)} placeholder="至少 6 位" autoComplete={mode === 'login' ? 'current-password' : 'new-password'} />
              </div>
              <button className="btn btn--primary" style={{ width: '100%', justifyContent: 'center' }} disabled={busy}>
                {busy ? '请稍候…' : mode === 'login' ? '登录' : '注册'}
              </button>
            </form>
          </div>
        </div>
      )}
    </>
  );
}

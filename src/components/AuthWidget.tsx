import { useEffect, useState, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import { getTranslation, getInitialLang, LANG_CHANGE_EVENT } from '../lib/i18n';
import type { Lang } from '../lib/i18n';

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
  const [lang, setLang] = useState<Lang>(() => getInitialLang());

  const t = getTranslation(lang);

  useEffect(() => {
    const onLang = (e: Event) => setLang((e as CustomEvent<Lang>).detail);
    window.addEventListener(LANG_CHANGE_EVENT, onLang);
    return () => window.removeEventListener(LANG_CHANGE_EVENT, onLang);
  }, []);

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
        setNotice(t.authRegisterSuccess);
      } else {
        const { error: err } = await supabase.auth.signInWithPassword({ email, password });
        if (err) throw err;
        setNotice(t.authLoginSuccess);
      }
    } catch (err: any) {
      setError(err?.message || t.authErrorFallback);
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
        <button className="btn btn--ghost btn--sm" onClick={logout}>{t.authLogout}</button>
      </div>
    );
  }

  return (
    <>
      <button className="btn btn--gold btn--sm" onClick={() => { setMode('login'); setOpen(true); }}>
        {t.authLoginRegister}
      </button>

      {open && (
        <div className="modal-backdrop" onClick={close}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <button className="modal__close" onClick={close} aria-label={t.authClose}>✕</button>
            <div className="modal__title">{t.authWelcome}</div>
            <div className="modal__sub">{t.authSubtitle}</div>

            <div className="auth-tabs">
              <button className={mode === 'login' ? 'is-active' : ''} onClick={() => { setMode('login'); setError(''); setNotice(''); }}>{t.authLogin}</button>
              <button className={mode === 'register' ? 'is-active' : ''} onClick={() => { setMode('register'); setError(''); setNotice(''); }}>{t.authRegister}</button>
            </div>

            {error && <div className="notice notice--error">{error}</div>}
            {notice && <div className="notice notice--ok">{notice}</div>}

            <form onSubmit={submit}>
              {mode === 'register' && (
                <div className="field">
                  <label htmlFor="auth-username">{t.authUsername}</label>
                  <input id="auth-username" value={username} onChange={(e) => setUsername(e.target.value)} placeholder={t.authUsernamePlaceholder} />
                </div>
              )}
              <div className="field">
                <label htmlFor="auth-email">{t.authEmail}</label>
                <input id="auth-email" type="email" required value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@example.com" autoComplete="email" />
              </div>
              <div className="field">
                <label htmlFor="auth-password">{t.authPassword}</label>
                <input id="auth-password" type="password" required minLength={6} value={password} onChange={(e) => setPassword(e.target.value)} placeholder={t.authPasswordPlaceholder} autoComplete={mode === 'login' ? 'current-password' : 'new-password'} />
              </div>
              <button className="btn btn--primary" style={{ width: '100%', justifyContent: 'center' }} disabled={busy}>
                {busy ? t.authBusy : mode === 'login' ? t.authLogin : t.authRegister}
              </button>
            </form>
          </div>
        </div>
      )}
    </>
  );
}

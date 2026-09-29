import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { getTranslation, getInitialLang, LANG_CHANGE_EVENT } from '../lib/i18n';
import type { Lang } from '../lib/i18n';

// 访客计数：localStorage 每日去重，向 Supabase visits 表写入一条访问记录，并读取总数
export default function VisitorCounter() {
  const [count, setCount] = useState<number | null>(null);
  const [lang, setLang] = useState<Lang>(() => getInitialLang());

  useEffect(() => {
    const onLang = (e: Event) => setLang((e as CustomEvent<Lang>).detail);
    window.addEventListener(LANG_CHANGE_EVENT, onLang);
    return () => window.removeEventListener(LANG_CHANGE_EVENT, onLang);
  }, []);

  useEffect(() => {
    let cancelled = false;

    async function run() {
      const today = new Date();
      const key = `mv_visit_${today.getFullYear()}-${today.getMonth() + 1}-${today.getDate()}`;

      try {
        if (typeof window !== 'undefined' && !window.localStorage.getItem(key)) {
          await supabase.from('visits').insert({}).select('id').maybeSingle();
          window.localStorage.setItem(key, '1');
        }
        const { count: total } = await supabase
          .from('visits')
          .select('*', { count: 'exact', head: true });
        if (!cancelled && typeof total === 'number') setCount(total);
      } catch {
        // 计数失败静默处理，不影响主页面
      }
    }

    run();
    return () => {
      cancelled = true;
    };
  }, []);

  if (count === null) return null;

  const t = getTranslation(lang);

  return (
    <span className="visitor-counter" title={t.visitorTitle}>
      <span className="visitor-counter__dot" aria-hidden="true" />
      {t.visitorLabel} <b>{count.toLocaleString()}</b>
    </span>
  );
}

import { useCallback, useContext, useMemo, useState, type ReactNode } from 'react';
import { I18nContext } from './context';
import common from './strings/common';
import errors from './strings/errors';
import home from './strings/home';
import lobby from './strings/lobby';
import voting from './strings/voting';
import reveal from './strings/reveal';
import results from './strings/results';

export type Lang = 'en' | 'fr';
export const LANGS: Lang[] = ['fr', 'en'];

/**
 * Every namespace file exports `{ en, fr }` where `fr` is typed as `typeof en`, so a
 * missing translation is a type error. A leaf is a string, or an array of variants
 * (use `tpick` to pick one deterministically). Interpolation: `{name}`.
 */
const dictionaries = {
  en: { common: common.en, errors: errors.en, home: home.en, lobby: lobby.en, voting: voting.en, reveal: reveal.en, results: results.en },
  fr: { common: common.fr, errors: errors.fr, home: home.fr, lobby: lobby.fr, voting: voting.fr, reveal: reveal.fr, results: results.fr },
};

type Messages = (typeof dictionaries)['en'];
type Leaf = string | readonly string[];

type Paths<T, P extends string = ''> = {
  [K in keyof T & string]: T[K] extends Leaf ? `${P}${K}` : Paths<T[K], `${P}${K}.`>;
}[keyof T & string];

type LeafPaths<T, P extends string, L> = {
  [K in keyof T & string]: T[K] extends L ? `${P}${K}` : T[K] extends Leaf ? never : LeafPaths<T[K], `${P}${K}.`, L>;
}[keyof T & string];

export type TKey = Paths<Messages>;
/** Keys whose value is an array of variants. */
export type TVariantKey = LeafPaths<Messages, '', readonly string[]>;
export type TVars = Record<string, string | number>;

function lookup(lang: Lang, key: string): Leaf | undefined {
  let node: unknown = dictionaries[lang];
  for (const part of key.split('.')) {
    if (node && typeof node === 'object' && part in node) node = (node as Record<string, unknown>)[part];
    else return undefined;
  }
  return typeof node === 'string' || Array.isArray(node) ? (node as Leaf) : undefined;
}

function interpolate(text: string, vars?: TVars): string {
  if (!vars) return text;
  return text.replace(/\{(\w+)\}/g, (m, name: string) => (name in vars ? String(vars[name]) : m));
}

export function detectLang(): Lang {
  const fromUrl = typeof window !== 'undefined' ? new URLSearchParams(window.location.search).get('lang') : null;
  if (fromUrl === 'en' || fromUrl === 'fr') return fromUrl;
  try {
    const saved = localStorage.getItem('dg:lang');
    if (saved === 'en' || saved === 'fr') return saved;
  } catch {
    // ignore
  }
  const nav = typeof navigator !== 'undefined' ? navigator.language : 'en';
  return nav?.toLowerCase().startsWith('fr') ? 'fr' : 'en';
}

export interface I18n {
  lang: Lang;
  setLang: (lang: Lang) => void;
  /** Translate a key. For a variants key, returns the first variant. */
  t: (key: TKey, vars?: TVars) => string;
  /** Pick one variant deterministically from `seed` (same result on every client). */
  tpick: (key: TVariantKey, seed: number, vars?: TVars) => string;
}

export function I18nProvider({ children }: { children: ReactNode }) {
  const [lang, setLangState] = useState<Lang>(detectLang);

  const setLang = useCallback((next: Lang) => {
    setLangState(next);
    try {
      localStorage.setItem('dg:lang', next);
    } catch {
      // ignore
    }
    document.documentElement.lang = next;
  }, []);

  const value = useMemo<I18n>(() => {
    const resolve = (key: string): Leaf => lookup(lang, key) ?? lookup('en', key) ?? key;
    return {
      lang,
      setLang,
      t: (key, vars) => {
        const v = resolve(key);
        return interpolate(typeof v === 'string' ? v : (v[0] ?? key), vars);
      },
      tpick: (key, seed, vars) => {
        const v = resolve(key);
        if (typeof v === 'string') return interpolate(v, vars);
        const i = Math.abs(Math.floor(seed)) % Math.max(1, v.length);
        return interpolate(v[i] ?? key, vars);
      },
    };
  }, [lang, setLang]);

  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
}

export function useI18n(): I18n {
  const ctx = useContext(I18nContext);
  if (!ctx) throw new Error('useI18n must be used inside <I18nProvider>');
  return ctx;
}

/** Shorthand when only `t` is needed. */
export function useT() {
  return useI18n().t;
}

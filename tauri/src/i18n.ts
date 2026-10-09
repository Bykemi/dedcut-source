// Traductions de DedCut (cahier des charges §28-40).
// - Fichiers séparés : public/locales/<code>.json, liste dans public/locales/index.json
//   (une nouvelle langue = un fichier + une ligne dans index.json, sans toucher au code).
// - L'anglais est la langue de référence et de secours.
// - Pluriels via Intl.PluralRules, nombres / dates / tailles via Intl (aucune phrase concaténée).
import { useEffect, useState } from 'react';

type Dict = { [k: string]: string | Dict };
export interface Language { code: string; name: string }

const STORE_KEY = 'dedcut-lang';
const listeners = new Set<() => void>();
let lang = 'en';
let dict: Dict = {};
let fallback: Dict = {};
let languages: Language[] = [];

function lookup(d: Dict, key: string): string | Dict | undefined {
  let o: string | Dict | undefined = d;
  for (const k of key.split('.')) {
    if (!o || typeof o !== 'object') return undefined;
    o = o[k];
  }
  return o;
}

async function loadJson(code: string): Promise<Dict> {
  const r = await fetch(`/locales/${code}.json`);
  if (!r.ok) throw new Error('langue introuvable : ' + code);
  return r.json();
}

/** Langue enregistrée, sinon celle de Windows, sinon l'anglais */
export function detect(available: string[]): string {
  try {
    const saved = localStorage.getItem(STORE_KEY);
    if (saved && available.includes(saved)) return saved;
  } catch { /* stockage indisponible */ }
  for (const l of navigator.languages?.length ? navigator.languages : [navigator.language]) {
    if (available.includes(l)) return l;
    const base = l.split('-')[0].toLowerCase();
    const same = available.find(a => a.toLowerCase() === base) || available.find(a => a.split('-')[0].toLowerCase() === base);
    if (same) return same;
  }
  return 'en';
}

const numberFmt = (opts?: Intl.NumberFormatOptions) => new Intl.NumberFormat(lang, opts);

function formatVar(v: unknown): string {
  if (typeof v === 'number') return numberFmt({ maximumFractionDigits: 2 }).format(v);
  if (v instanceof Date) return fmt.date(v);
  return String(v ?? '');
}

/** Texte traduit. Variables : {nom}. Pluriel : objet {one, other, …} choisi avec vars.count */
export function t(key: string, vars?: Record<string, unknown>): string {
  let v = lookup(dict, key) ?? lookup(fallback, key);
  if (v && typeof v === 'object') {
    const n = Number(vars?.count ?? 0);
    const forms = v as Record<string, string>;
    v = (n === 0 && forms.zero) || forms[new Intl.PluralRules(lang).select(n)] || forms.other;
  }
  if (typeof v !== 'string') return key;
  return v.replace(/\{(\w+)\}/g, (m, k) => (vars && k in vars ? formatVar(vars[k]) : m));
}

/** Nombres, pourcentages, tailles de fichiers, dates et durées au format de la langue */
export const fmt = {
  number: (n: number, opts?: Intl.NumberFormatOptions) => numberFmt(opts).format(n),
  percent: (ratio: number) => numberFmt({ style: 'percent', maximumFractionDigits: 0 }).format(ratio),
  bytes: (b: number) => {
    const units = ['byte', 'kilobyte', 'megabyte', 'gigabyte', 'terabyte'];
    let i = 0;
    while (b >= 1024 && i < units.length - 1) { b /= 1024; i++; }
    return numberFmt({ style: 'unit', unit: units[i], unitDisplay: 'short', maximumFractionDigits: i ? 1 : 0 }).format(b);
  },
  date: (d: Date | number) => new Intl.DateTimeFormat(lang, { dateStyle: 'medium', timeStyle: 'short' }).format(d),
  relative: (d: Date | number) => {
    const s = (Number(d) - Date.now()) / 1000, rtf = new Intl.RelativeTimeFormat(lang, { numeric: 'auto' });
    const steps: [number, Intl.RelativeTimeFormatUnit][] = [[60, 'second'], [3600, 'minute'], [86400, 'hour'], [604800, 'day'], [2629800, 'week'], [31557600, 'month'], [Infinity, 'year']];
    let prev = 1;
    for (const [lim, unit] of steps) { if (Math.abs(s) < lim) return rtf.format(Math.round(s / prev), unit); prev = lim; }
    return fmt.date(d);
  },
  duration: (sec: number) => {
    const h = Math.floor(sec / 3600), m = Math.floor((sec % 3600) / 60), s = Math.floor(sec % 60);
    const p = (n: number) => String(n).padStart(2, '0');
    return h ? `${h}:${p(m)}:${p(s)}` : `${m}:${p(s)}`;
  }
};

/** Applique les traductions aux éléments marqués data-i18n / data-i18n-title / data-i18n-ph */
export function applyDom(root: ParentNode = document) {
  root.querySelectorAll<HTMLElement>('[data-i18n]').forEach(el => {
    const txt = t(el.dataset.i18n!);
    // on remplace seulement le texte : les icônes (svg) ajoutées dans l'élément sont gardées
    const nodes = [...el.childNodes].filter(n => n.nodeType === 3 && n.textContent!.trim());
    if (nodes.length) { nodes[nodes.length - 1].textContent = txt; nodes.slice(0, -1).forEach(n => n.remove()); }
    else el.appendChild(document.createTextNode(txt));
  });
  root.querySelectorAll<HTMLElement>('[data-i18n-title]').forEach(el => { el.title = t(el.dataset.i18nTitle!); });
  root.querySelectorAll<HTMLInputElement>('[data-i18n-ph]').forEach(el => { el.placeholder = t(el.dataset.i18nPh!); });
}

export async function setLang(code: string, save = true) {
  dict = code === 'en' ? fallback : await loadJson(code).catch(() => fallback);
  lang = dict === fallback ? 'en' : code;
  document.documentElement.lang = lang;
  if (save) try { localStorage.setItem(STORE_KEY, lang); } catch { /* rien */ }
  applyDom();
  listeners.forEach(f => f());
  window.dispatchEvent(new CustomEvent('dedcut-lang', { detail: lang }));
}

export const getLang = () => lang;
export const getLanguages = () => languages;

/** Pour les composants React : se réaffiche quand la langue change */
export function useLang(): string {
  const [, setN] = useState(0);
  useEffect(() => { const f = () => setN(n => n + 1); listeners.add(f); return () => { listeners.delete(f); }; }, []);
  return lang;
}

declare global {
  interface Window {
    t: typeof t;
    i18n: { setLang: typeof setLang; lang: () => string; languages: () => Language[]; fmt: typeof fmt; applyDom: typeof applyDom };
  }
}

export async function initI18n() {
  const idx = await (await fetch('/locales/index.json')).json() as { languages: Language[] };
  languages = idx.languages;
  fallback = await loadJson('en');
  window.t = t;
  window.i18n = { setLang, lang: getLang, languages: getLanguages, fmt, applyDom };
  await setLang(detect(languages.map(l => l.code)), false);
}

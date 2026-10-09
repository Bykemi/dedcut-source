// DedCut Musique — icônes au trait, dessinées pour DedCut (aucune police d'icônes, aucun émoji)
const P: Record<string, string> = {
  play: 'M7 5v14l11-7z', stop: 'M6 6h12v12H6z', pause: 'M7 5h3v14H7zM14 5h3v14h-3z', rec: 'M12 7a5 5 0 1 0 0 10a5 5 0 1 0 0-10',
  loop: 'M4 12a6 6 0 0 1 6-6h8l-3-3M20 12a6 6 0 0 1-6 6H6l3 3', metro: 'M9 3h6l4 18H5zM12 17l5-9M8 14h8', start: 'M6 5v14M18 5l-9 7 9 7z',
  punch: 'M4 6v12M20 6v12M4 12h16M9 9l-3 3 3 3M15 9l3 3-3 3', undo: 'M9 14L4 9l5-5M4 9h10a6 6 0 0 1 0 12h-3', redo: 'M15 14l5-5-5-5M20 9H10a6 6 0 0 0 0 12h3',
  save: 'M5 4h11l3 3v13H5zM8 4v5h7V4M8 20v-6h8v6', open: 'M3 7V5h7l2 2h9v12H3zM3 9h18', file: 'M6 3h8l4 4v14H6zM14 3v4h4', export: 'M12 3v12M7 8l5-5 5 5M5 15v5h14v-5',
  tuner: 'M9 3v7a3 3 0 0 0 6 0V3M12 13v6M9 21h6',
  plus: 'M12 5v14M5 12h14', minus: 'M5 12h14', trash: 'M5 7h14M10 7V4h4v3M7 7l1 13h8l1-13', dup: 'M8 8h11v11H8zM5 16V5h11', close: 'M6 6l12 12M18 6L6 18',
  mute: 'M4 9h4l5-4v14l-5-4H4zM17 9l4 6M21 9l-4 6', vol: 'M4 9h4l5-4v14l-5-4H4zM16 9a4 4 0 0 1 0 6M18.5 6.5a8 8 0 0 1 0 11', solo: 'M15 7a3 3 0 0 0-3-2h-1a3 3 0 0 0 0 6h2a3 3 0 0 1 0 6h-1a3 3 0 0 1-3-2',
  arm: 'M12 6a6 6 0 1 0 0 12a6 6 0 1 0 0-12M12 10a2 2 0 1 0 0 4a2 2 0 1 0 0-4', mon: 'M4 15v-3a8 8 0 0 1 16 0v3M4 15h3v5H4zM17 15h3v5h-3z', lock: 'M6 11h12v9H6zM8 11V8a4 4 0 0 1 8 0v3',
  piano: 'M3 5h18v14H3zM8 5v9M13 5v9M18 5v9M6 14v5M11 14v5M16 14v5', steps: 'M4 4h4v4H4zM10 4h4v4h-4zM16 4h4v4h-4zM4 10h4v4H4zM16 10h4v4h-4zM10 16h4v4h-4zM4 16h4v4H4z',
  wave: 'M2 12h2l2-6 3 12 3-14 3 16 3-10 2 4h2', inst: 'M4 4h16v16H4zM8 8a2 2 0 1 0 0 .1M16 8v8M12 12v4M8 12v4', fx: 'M5 19L19 5M6 6h4M8 4v4M14 18h4',
  mixer: 'M6 4v16M12 4v16M18 4v16M4 14h4M10 8h4M16 16h4', session: 'M4 4h7v7H4zM13 4h7v7h-7zM4 13h7v7H4zM13 13h7v7h-7zM7 6.5v2l2-1zM16 15.5v2l2-1z', score: 'M4 6h16M4 10h16M4 14h16M4 18h16M14 18V5l4 2',
  folder: 'M3 6h7l2 2h9v11H3z', search: 'M10 4a6 6 0 1 0 0 12a6 6 0 1 0 0-12M15 15l5 5', star: 'M12 3l2.7 5.6 6.1.9-4.4 4.3 1 6.1L12 17l-5.4 2.9 1-6.1L3.2 9.5l6.1-.9z',
  gear: 'M12 9a3 3 0 1 0 0 6a3 3 0 1 0 0-6M12 2v3M12 19v3M2 12h3M19 12h3M4.9 4.9l2.1 2.1M17 17l2.1 2.1M4.9 19.1L7 17M17 7l2.1-2.1', midi: 'M12 3a9 9 0 1 0 0 18a9 9 0 1 0 0-18M8 12h.01M16 12h.01M12 8h.01M9.5 9h.01M14.5 9h.01M10 17h4',
  cpu: 'M7 7h10v10H7zM10 3v4M14 3v4M10 17v4M14 17v4M3 10h4M3 14h4M17 10h4M17 14h4', scissors: 'M6 6a2.5 2.5 0 1 0 0 .1M6 18a2.5 2.5 0 1 0 0 .1M8 7l12 10M8 17L20 7', pen: 'M4 20l4-1 11-11-3-3L5 16zM14 6l3 3',
  cursor: 'M5 3l14 8-6 2-2 6z', eraser: 'M3 17l9-9 7 7-5 5H7zM10 10l7 7M14 20h7', magnet: 'M6 4v8a6 6 0 0 0 12 0V4h-4v8a2 2 0 0 1-4 0V4zM6 8h4M14 8h4', zoomIn: 'M10 4a6 6 0 1 0 0 12a6 6 0 1 0 0-12M15 15l5 5M10 7v6M7 10h6', zoomOut: 'M10 4a6 6 0 1 0 0 12a6 6 0 1 0 0-12M15 15l5 5M7 10h6',
  flag: 'M5 21V4M5 4h11l-2 4 2 4H5', tempo: 'M12 3a9 9 0 1 0 0 18a9 9 0 1 0 0-18M12 7v5l3 2', note: 'M9 18a3 3 0 1 0 0 .1M12 18V4l7 3', bus: 'M4 6h6v12H4zM14 6h6v12h-6zM10 12h4',
  snow: 'M12 2v20M3.3 7l17.4 10M3.3 17L20.7 7M9 4l3 2 3-2M9 20l3-2 3 2', bounce: 'M4 18h16M7 14l5-9 5 9M12 5v13', help: 'M12 3a9 9 0 1 0 0 18a9 9 0 1 0 0-18M9.5 9a2.5 2.5 0 1 1 3.5 2.3c-.6.3-1 .9-1 1.6V14M12 17h.01',
  link: 'M10 14a4 4 0 0 0 5.7 0l3-3a4 4 0 0 0-5.7-5.7l-1 1M14 10a4 4 0 0 0-5.7 0l-3 3a4 4 0 0 0 5.7 5.7l1-1', comment: 'M4 5h16v11H9l-5 4z', clock: 'M12 3a9 9 0 1 0 0 18a9 9 0 1 0 0-18M12 7v5h4',
  video: 'M3 6h13v12H3zM16 10l5-3v10l-5-3z', spark: 'M12 3l1.8 5.2L19 10l-5.2 1.8L12 17l-1.8-5.2L5 10l5.2-1.8zM19 16l.8 2.2L22 19l-2.2.8L19 22l-.8-2.2L16 19l2.2-.8z', plug: 'M9 3v5M15 3v5M6 8h12v4a6 6 0 0 1-12 0zM12 18v3',
  shield: 'M12 3l8 3v6c0 5-3.5 8-8 9-4.5-1-8-4-8-9V6z', mic: 'M9 4a3 3 0 0 1 6 0v7a3 3 0 0 1-6 0zM5 11a7 7 0 0 0 14 0M12 18v3', warn: 'M12 3l10 18H2zM12 10v5M12 18h.01', check: 'M5 12l5 5L20 7',
  chevD: 'M6 9l6 6 6-6', chevR: 'M9 6l6 6-6 6', chevL: 'M15 6l-6 6 6 6', chevU: 'M6 15l6-6 6 6', menu: 'M4 6h16M4 12h16M4 18h16', dots: 'M5 12h.01M12 12h.01M19 12h.01', grip: 'M9 6h.01M15 6h.01M9 12h.01M15 12h.01M9 18h.01M15 18h.01',
  eq: 'M3 17c3 0 3-8 6-8s3 6 6 6 3-4 6-4', meter: 'M5 20V10M10 20V4M15 20v-7M20 20v-4', keys: 'M3 7h18v10H3zM7 11h.01M11 11h.01M15 11h.01M7 14h10', chord: 'M6 18a2 2 0 1 0 0 .1M12 14a2 2 0 1 0 0 .1M18 10a2 2 0 1 0 0 .1M8 18V6M14 14V4M20 10V3',
  dice: 'M4 4h16v16H4zM8.5 8.5h.01M15.5 8.5h.01M12 12h.01M8.5 15.5h.01M15.5 15.5h.01', quant: 'M4 4v16M10 4v16M16 4v16M7 9h6M13 15h6', human: 'M4 12c2-4 4 4 6 0s4 4 6 0 3-2 4-1', ab: 'M4 18l4-12 4 12M5.5 14h5M15 6h3a3 3 0 0 1 0 6h-3zM15 12h4a3 3 0 0 1 0 6h-4z',
  info: 'M12 3a9 9 0 1 0 0 18a9 9 0 1 0 0-18M12 11v6M12 7h.01', list: 'M8 6h12M8 12h12M8 18h12M4 6h.01M4 12h.01M4 18h.01', drum: 'M4 8c0-2 3.6-3 8-3s8 1 8 3v8c0 2-3.6 3-8 3s-8-1-8-3zM4 8c0 2 3.6 3 8 3s8-1 8-3M9 2l3 6M15 2l-3 6',
  target: 'M12 3a9 9 0 1 0 0 18a9 9 0 1 0 0-18M12 8a4 4 0 1 0 0 8a4 4 0 1 0 0-8', ext: 'M10 4h4v3h3a2 2 0 0 1 2 2v3h-3v4h3v3a2 2 0 0 1-2 2h-3v-3h-4v3H7a2 2 0 0 1-2-2v-3h3v-4H5V9a2 2 0 0 1 2-2h3z'
};
export function Ico({ n, s = 16, fill }: { n: string; s?: number; fill?: boolean }) {
  return <svg width={s} height={s} viewBox="0 0 24 24" fill={fill ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d={P[n] || P.dots} /></svg>;
}

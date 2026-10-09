// DedCut Musique — annuler / rétablir : chaque modification enregistre l'état du projet (sans les sons, qui ne changent jamais :
// une transformation crée toujours un nouveau son, l'original est gardé).
import type { Project } from './model';

const strip = (p: Project) => { const { dirty: _d, path: _p, versions: _v, ...rest } = p; void _d; void _p; void _v; return JSON.stringify(rest); };
export class History {
  private past: { label: string; data: string }[] = []; private future: { label: string; data: string }[] = []; private last = ''; max = 200;
  /** état de départ (projet ouvert ou créé) */
  reset(p: Project) { this.past = []; this.future = []; this.last = strip(p); }
  /** à appeler APRÈS une modification : garde l'état d'avant */
  commit(p: Project, label: string) {
    const now = strip(p); if (now === this.last) return false;
    this.past.push({ label, data: this.last }); if (this.past.length > this.max) this.past.shift(); this.future = []; this.last = now; p.dirty = true; return true;
  }
  canUndo() { return this.past.length > 0; } canRedo() { return this.future.length > 0; }
  undoLabel() { return this.past[this.past.length - 1]?.label || ''; } redoLabel() { return this.future[this.future.length - 1]?.label || ''; }
  list() { return this.past.map(x => x.label); }
  /** renvoie le projet à remettre (les champs fichier / versions sont repris du projet actuel) */
  undo(p: Project): Project | null { const x = this.past.pop(); if (!x) return null; this.future.push({ label: x.label, data: this.last }); this.last = x.data; return this.restore(p, x.data); }
  redo(p: Project): Project | null { const x = this.future.pop(); if (!x) return null; this.past.push({ label: x.label, data: this.last }); this.last = x.data; return this.restore(p, x.data); }
  private restore(p: Project, data: string): Project { const o = JSON.parse(data) as Project; o.path = p.path; o.versions = p.versions; o.dirty = true; return o; }
}

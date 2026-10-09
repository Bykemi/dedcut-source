// Mises à jour automatiques (plugin officiel Tauri, MIT/Apache).
// DedCut lit seulement le fichier latest.json du dépôt PUBLIC « DedCut-mises-a-jour » (il ne contient que les installateurs,
// le code reste privé). Chaque installateur est signé : la clé publique est dans tauri.conf.json, un fichier modifié est refusé.
import { check, type Update } from '@tauri-apps/plugin-updater';

let pending: Update | null = null;

export const dedcutUpdate = {
  /** null = à jour ; sinon la nouvelle version et ses notes */
  async check(): Promise<{ version: string; notes: string; date: string } | null> {
    pending = await check({ timeout: 15000 });
    return pending ? { version: pending.version, notes: pending.body || '', date: pending.date || '' } : null;
  },
  /** télécharge (progression 0..1), vérifie la signature puis lance l'installation ; DedCut se ferme et se rouvre */
  async install(onProgress: (q: number) => void) {
    if (!pending) throw new Error('no update');
    let total = 0, done = 0;
    await pending.downloadAndInstall(ev => {
      if (ev.event === 'Started') total = ev.data.contentLength || 0;
      else if (ev.event === 'Progress') { done += ev.data.chunkLength; if (total) onProgress(done / total); }
      else if (ev.event === 'Finished') onProgress(1);
    });
  }
};

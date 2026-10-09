// Assistant IA intégré : boucle « l'IA demande un outil → DedCut l'exécute → l'IA continue ».
// - Claude : SDK officiel @anthropic-ai/sdk (MIT), chargé seulement quand on s'en sert, réponses en direct (streaming).
// - ChatGPT / Ollama / autre serveur compatible OpenAI : la demande passe par Windows (src-tauri/src/chat.rs, curl.exe).
// - DedCut IA avec son cerveau (« local » : llama.cpp + Qwen3.5 sur ce PC, src-tauri/src/brain.rs) : demande directe à 127.0.0.1,
//   réponse affichée au fur et à mesure (streaming).
// Les outils sont ceux du connecteur Claude Desktop (src-tauri/src/mcp.rs), exécutés par le moteur (mcpRun dans engine.js).
import { invoke } from '@tauri-apps/api/core';
import type Anthropic from '@anthropic-ai/sdk';

type Provider = 'claude' | 'gemini' | 'openai' | 'ollama' | 'custom' | 'local';
interface McpTool { name: string; description: string; inputSchema: { type: 'object'; properties: Record<string, Schema>; required?: string[] } }
interface Schema { type?: string; items?: Schema; enum?: string[]; description?: string }
type OaiMsg = { role: 'system' | 'user' | 'assistant' | 'tool'; content: string | null; tool_calls?: OaiCall[]; tool_call_id?: string };
interface OaiCall { id: string; type: 'function'; function: { name: string; arguments: string } }

export interface ChatRun {
  provider: Provider;
  model: string;
  url?: string;
  key: string;
  system: string;
  text: string;
  maxSteps?: number;
  onText: (delta: string) => void;
  onTool: (name: string, input: Record<string, unknown>) => Promise<unknown>;
}
/** Erreur lisible par le moteur : code = auth | rate | network | offline | bad | limit | other */
export class ChatError extends Error {
  constructor(public code: string, message: string) { super(message); }
}

let tools: McpTool[] | null = null;
let conv: { provider: Provider; model: string; claude: Anthropic.MessageParam[]; oai: OaiMsg[] } | null = null;
let stopped = false;
let current: { abort(): void } | null = null;

// Outils en plus de ceux du connecteur, seulement dans la discussion de DedCut (exécutés par le moteur, mcpRun)
const EXTRA_TOOLS: McpTool[] = [
  { name: 'ask_user', description: 'Ask the user ONE short question with 2 to 4 short answer choices, shown as buttons. Use it only when an important detail is unknown (type of video, style, length) and the user did not say "do as you like". After calling it, stop and wait for the answer.', inputSchema: { type: 'object', properties: { question: { type: 'string' }, options: { type: 'array', items: { type: 'string' } } }, required: ['question', 'options'] } },
  { name: 'how_to', description: 'Get the exact steps to do something in the DedCut interface (which tab or button, shortcuts). Use it for "how do I..." questions; pass the question as the user wrote it.', inputSchema: { type: 'object', properties: { question: { type: 'string' } }, required: ['question'] } },
  { name: 'add_captions', description: 'Create automatic subtitles from the speech of the video (speech recognition on this PC).', inputSchema: { type: 'object', properties: {}, required: [] } },
  { name: 'set_format', description: 'Change the video format: vertical 9:16 (TikTok, Shorts, Reels), horizontal 16:9 (YouTube) or square 1:1.', inputSchema: { type: 'object', properties: { format: { type: 'string', enum: ['vertical', 'horizontal', 'square'] } }, required: ['format'] } },
  { name: 'fade_project', description: 'Add a fade from black at the start and/or to black at the end of the whole video.', inputSchema: { type: 'object', properties: { in: { type: 'boolean' }, out: { type: 'boolean' } }, required: [] } },
  { name: 'loop_music', description: 'Repeat a music clip (id from get_project) until the end of the video.', inputSchema: { type: 'object', properties: { id: { type: 'integer' } }, required: ['id'] } }
];
async function getTools() {
  if (!tools) tools = [...await invoke<McpTool[]>('chat_tools'), ...EXTRA_TOOLS];
  return tools;
}

// Le SDK accepte une entrée d'outil incomplète sans erreur : on vérifie les champs avant d'exécuter.
function typeOk(v: unknown, s: Schema): boolean {
  switch (s.type) {
    case 'integer': return typeof v === 'number' && Number.isInteger(v);
    case 'number': return typeof v === 'number' && Number.isFinite(v);
    case 'string': return typeof v === 'string' && (!s.enum || s.enum.includes(v));
    case 'boolean': return typeof v === 'boolean';
    case 'array': return Array.isArray(v) && (!s.items || v.every(x => typeOk(x, s.items!)));
    case 'object': return !!v && typeof v === 'object' && !Array.isArray(v);
    default: return true;
  }
}
function validate(t: McpTool | undefined, input: unknown): string | null {
  if (!t) return 'unknown tool';
  if (!input || typeof input !== 'object' || Array.isArray(input)) return 'input must be an object';
  const o = input as Record<string, unknown>;
  for (const k of t.inputSchema.required || []) if (o[k] === undefined) return 'missing field: ' + k;
  for (const [k, v] of Object.entries(o)) {
    const s = t.inputSchema.properties[k];
    if (s && v !== null && !typeOk(v, s)) return 'wrong type for field: ' + k + ' (expected ' + s.type + ')';
  }
  return null;
}
async function runTool(name: string, input: unknown, run: ChatRun): Promise<{ text: string; error: boolean }> {
  const bad = validate((await getTools()).find(t => t.name === name), input);
  if (bad) return { text: JSON.stringify({ INVALID_INPUT: bad, received: input }), error: true };
  try {
    const r = await run.onTool(name, input as Record<string, unknown>);
    const err = !!r && typeof r === 'object' && 'error' in (r as object);
    return { text: JSON.stringify(r ?? { ok: true }), error: err };
  } catch (e) {
    return { text: JSON.stringify({ error: String((e as Error)?.message || e) }), error: true };
  }
}

/* ---------- Claude (Anthropic) ---------- */
async function runClaude(run: ChatRun) {
  const { default: AnthropicSDK } = await import('@anthropic-ai/sdk');
  const client = new AnthropicSDK({ apiKey: run.key, dangerouslyAllowBrowser: true, maxRetries: 2 });
  const defs: Anthropic.Tool[] = (await getTools()).map(t => ({
    name: t.name, description: t.description, eager_input_streaming: true,
    input_schema: t.inputSchema as Anthropic.Tool.InputSchema
  }));
  // la réflexion adaptative et le niveau d'effort n'existent que sur les modèles récents
  const modern = /^claude-(opus|sonnet|fable)-5/.test(run.model);
  const msgs = conv!.claude;
  msgs.push({ role: 'user', content: run.text });
  let jsonRetries = 0;
  for (let step = 0; ; step++) {
    if (stopped) return;
    if (step >= (run.maxSteps || 60)) throw new ChatError('limit', 'limit');
    const stream = client.messages.stream({
      model: run.model,
      max_tokens: 16000,
      system: run.system,
      tools: defs,
      messages: msgs,
      cache_control: { type: 'ephemeral' },
      ...(modern ? { thinking: { type: 'adaptive' as const }, output_config: { effort: 'medium' as const } } : {})
    });
    current = stream;
    stream.on('text', d => { if (!stopped) run.onText(d); });
    let msg: Anthropic.Message;
    try {
      msg = await stream.finalMessage();
      jsonRetries = 0;
    } catch (e) {
      if (stopped) return;
      if (e instanceof AnthropicSDK.APIError || jsonRetries++ >= 2) throw e;
      continue; // entrée d'outil illisible : on redemande ce tour
    } finally { current = null; }
    if (stopped) return;
    if (msg.stop_reason === 'pause_turn') { msgs.push({ role: 'assistant', content: msg.content }); continue; }
    if (msg.stop_reason === 'refusal') { const t = msg.content.filter(b => b.type === 'text'); msgs.push({ role: 'assistant', content: t.length ? t : '(refused)' }); return; }
    const uses = msg.content.filter((b): b is Anthropic.ToolUseBlock => b.type === 'tool_use');
    if (msg.stop_reason === 'max_tokens' && uses.length) throw new ChatError('other', 'max_tokens');
    msgs.push({ role: 'assistant', content: msg.content });
    if (!uses.length) return;
    const results: Anthropic.ToolResultBlockParam[] = [];
    for (const u of uses) {
      if (stopped) { results.push({ type: 'tool_result', tool_use_id: u.id, is_error: true, content: 'Stopped by the user.' }); continue; }
      const r = await runTool(u.name, u.input, run);
      results.push({ type: 'tool_result', tool_use_id: u.id, is_error: r.error || undefined, content: r.text });
    }
    msgs.push({ role: 'user', content: results });
    const asked = uses.find(u => u.name === 'ask_user');
    if (asked) { msgs.push({ role: 'assistant', content: String((asked.input as { question?: unknown })?.question || '?') }); return; }
  }
}
async function claudeError(e: unknown): Promise<ChatError> {
  const { default: A } = await import('@anthropic-ai/sdk');
  const m = String((e as Error)?.message || e);
  if (e instanceof A.AuthenticationError || e instanceof A.PermissionDeniedError) return new ChatError('auth', m);
  if (e instanceof A.RateLimitError) return new ChatError('rate', m);
  if (e instanceof A.APIConnectionError) return new ChatError('network', m);
  if (e instanceof A.NotFoundError || e instanceof A.BadRequestError) return new ChatError('bad', (e as InstanceType<typeof A.APIError>).error ? JSON.stringify((e as InstanceType<typeof A.APIError>).error).slice(0, 300) : m);
  return new ChatError('other', m);
}

/* ---------- ChatGPT / Ollama / serveur compatible OpenAI ---------- */
async function runOpenAI(run: ChatRun) {
  const base = (run.url || '').replace(/\/+$/, '');
  const defs = (await getTools()).map(t => ({ type: 'function', function: { name: t.name, description: t.description, ...(run.provider === 'gemini' ? geminiParams(t) : { parameters: t.inputSchema }) } }));
  const msgs = conv!.oai;
  if (!msgs.length) msgs.push({ role: 'system', content: run.system });
  msgs.push({ role: 'user', content: run.text });
  for (let step = 0; ; step++) {
    if (stopped) return;
    if (step >= (run.maxSteps || 60)) throw new ChatError('limit', 'limit');
    if (run.provider === 'local') {
      // cerveau de DedCut IA : réglages conseillés par Qwen (mode sans réflexion), réponse en direct
      let m: OaiMsg;
      try { m = await postStream(run, { model: run.model, messages: msgs, tools: defs, tool_choice: 'auto', temperature: 0.6, top_p: 0.8, top_k: 20, presence_penalty: 1, max_tokens: 2048 }); }
      catch (e) { if (stopped) return; throw e instanceof ChatError ? e : new ChatError('offline', String((e as Error)?.message || e)); }
      finally { current = null; }
      if (stopped) return;
      if (await afterAnswer(run, msgs, m, false)) return;
      continue;
    }
    let r: { status: number; body: string };
    try {
      current = { abort: () => { invoke('chat_cancel').catch(() => {}); } };
      r = await invoke<{ status: number; body: string }>('chat_post', { url: base + '/chat/completions', key: run.key, body: JSON.stringify({ model: run.model, messages: msgs, tools: defs, tool_choice: 'auto' }) });
    } catch (e) {
      if (stopped) return;
      throw new ChatError(run.provider === 'ollama' ? 'offline' : 'network', String(e));
    } finally { current = null; }
    if (stopped) return;
    let j: { choices?: { message?: OaiMsg; finish_reason?: string }[]; error?: { message?: string } | string } = {};
    try { j = JSON.parse(r.body); } catch { /* corps non JSON */ }
    if (Array.isArray(j)) j = j[0] || {}; // Google renvoie l'erreur dans une liste
    if (r.status === 401 || r.status === 403 || (r.status === 400 && /api[ _]?key/i.test(r.body))) throw new ChatError('auth', r.body.slice(0, 300));
    if (r.status === 429) throw new ChatError('rate', r.body.slice(0, 300));
    if (r.status >= 400 || !j.choices?.length) {
      const m = typeof j.error === 'string' ? j.error : j.error?.message;
      throw new ChatError('bad', (m || r.body || String(r.status)).slice(0, 300));
    }
    if (await afterAnswer(run, msgs, j.choices[0].message || { role: 'assistant', content: '' }, true)) return;
  }
}

/** Range la réponse, exécute les outils demandés ; true = tour terminé (réponse finale ou question posée à l'utilisateur) */
async function afterAnswer(run: ChatRun, msgs: OaiMsg[], m: OaiMsg, show: boolean): Promise<boolean> {
  const calls = m.tool_calls || [];
  msgs.push({ role: 'assistant', content: m.content ?? null, ...(calls.length ? { tool_calls: calls } : {}) });
  if (show && m.content) run.onText(m.content);
  if (!calls.length) return true;
  let asked: string | null = null;
  for (const c of calls) {
    let input: unknown;
    try { input = c.function.arguments ? JSON.parse(c.function.arguments) : {}; } catch { input = undefined; }
    if (run.provider === 'gemini' && input && typeof input === 'object') input = geminiArgs(c.function.name, input as Record<string, unknown>);
    const res = stopped ? { text: 'Stopped by the user.' } : input === undefined ? { text: JSON.stringify({ INVALID_JSON: c.function.arguments }) } : await runTool(c.function.name, input, run);
    msgs.push({ role: 'tool', tool_call_id: c.id, content: res.text });
    if (c.function.name === 'ask_user' && input && typeof input === 'object') asked = String((input as { question?: unknown }).question || '?');
  }
  if (asked !== null) { msgs.push({ role: 'assistant', content: asked }); return true; }
  return false;
}

/** Demande en direct (streaming SSE) au cerveau local : le texte s'affiche pendant qu'il s'écrit */
async function postStream(run: ChatRun, body: Record<string, unknown>): Promise<OaiMsg> {
  const ctrl = new AbortController();
  current = { abort: () => ctrl.abort() };
  const res = await fetch((run.url || '').replace(/\/+$/, '') + '/chat/completions', {
    method: 'POST', signal: ctrl.signal,
    headers: { 'Content-Type': 'application/json', Authorization: 'Bearer ' + run.key },
    body: JSON.stringify({ ...body, stream: true })
  });
  if (!res.ok || !res.body) {
    const t = await res.text().catch(() => '');
    throw new ChatError(res.status === 401 ? 'auth' : 'bad', (t || String(res.status)).slice(0, 300));
  }
  const reader = res.body.getReader(), dec = new TextDecoder();
  let buf = '', content = '';
  const calls: OaiCall[] = [];
  for (;;) {
    const { value, done } = await reader.read();
    if (done) break;
    buf += dec.decode(value, { stream: true });
    let i: number;
    while ((i = buf.indexOf('\n')) >= 0) {
      const line = buf.slice(0, i).trim();
      buf = buf.slice(i + 1);
      if (!line.startsWith('data:')) continue;
      const data = line.slice(5).trim();
      if (!data || data === '[DONE]') continue;
      let j: { error?: { message?: string } | string; choices?: { delta?: { content?: string | null; tool_calls?: { index?: number; id?: string; function?: { name?: string; arguments?: string } }[] } }[] };
      try { j = JSON.parse(data); } catch { continue; }
      if (j.error) throw new ChatError('bad', (typeof j.error === 'string' ? j.error : j.error.message || 'error').slice(0, 300));
      const d = j.choices?.[0]?.delta;
      if (!d) continue;
      if (d.content) { content += d.content; if (!stopped) run.onText(d.content); }
      for (const tc of d.tool_calls || []) {
        const k = tc.index ?? 0;
        const c = calls[k] || (calls[k] = { id: '', type: 'function', function: { name: '', arguments: '' } });
        if (tc.id) c.id = tc.id;
        if (tc.function?.name) c.function.name += tc.function.name;
        if (tc.function?.arguments) c.function.arguments += tc.function.arguments;
      }
    }
  }
  const list = calls.filter(Boolean).map((c, i) => ({ ...c, id: c.id || 'call_' + Date.now() + '_' + i }));
  return { role: 'assistant', content: content || null, ...(list.length ? { tool_calls: list } : {}) };
}

// Gemini refuse les objets sans propriétés dans les outils : « props » y est demandé sous forme de texte JSON,
// puis remis en objet avant la vérification. Un outil sans paramètre est envoyé sans « parameters ».
function geminiParams(t: McpTool) {
  const p = t.inputSchema.properties;
  if (!Object.keys(p).length) return {};
  const props: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(p)) props[k] = v.type === 'object' ? { type: 'string', description: 'A JSON object written as text, for example {"x":50,"color":"#ff0000"}' } : v;
  return { parameters: { type: 'object', properties: props, ...(t.inputSchema.required?.length ? { required: t.inputSchema.required } : {}) } };
}
function geminiArgs(name: string, input: Record<string, unknown>) {
  const t = tools?.find(x => x.name === name);
  if (!t) return input;
  const o = { ...input };
  for (const [k, v] of Object.entries(o)) if (t.inputSchema.properties[k]?.type === 'object' && typeof v === 'string') { try { o[k] = v.trim() ? JSON.parse(v) : {}; } catch { /* laissé tel quel : la vérification le refusera */ } }
  return o;
}

// Après une erreur ou un arrêt, l'historique doit rester valide : chaque demande d'outil reçoit une réponse.
function repair() {
  if (!conv) return;
  const c = conv.claude, last = c[c.length - 1];
  if (last && last.role === 'assistant' && Array.isArray(last.content)) {
    const ids = last.content.filter((b): b is Anthropic.ToolUseBlock => (b as { type: string }).type === 'tool_use').map(b => b.id);
    if (ids.length) c.push({ role: 'user', content: ids.map(id => ({ type: 'tool_result' as const, tool_use_id: id, is_error: true, content: 'Stopped.' })) });
  }
  if (c.length && c[c.length - 1].role === 'user') c.push({ role: 'assistant', content: '(stopped)' });
  const o = conv.oai, lo = o[o.length - 1];
  if (lo && lo.role === 'assistant' && lo.tool_calls?.length) for (const t of lo.tool_calls) o.push({ role: 'tool', tool_call_id: t.id, content: 'Stopped.' });
  if (o.length && o[o.length - 1].role !== 'assistant') o.push({ role: 'assistant', content: '(stopped)' });
}

/** Préchauffe le cerveau local : mêmes consignes et mêmes outils que les vraies demandes, 1 seul mot écrit.
 *  Le moteur garde ce début en mémoire : la première vraie réponse arrive bien plus vite. */
async function warm(run: { url: string; key: string; model: string; system: string }) {
  const defs = (await getTools()).map(t => ({ type: 'function', function: { name: t.name, description: t.description, parameters: t.inputSchema } }));
  await fetch(run.url.replace(/\/+$/, '') + '/chat/completions', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: 'Bearer ' + run.key },
    body: JSON.stringify({ model: run.model, messages: [{ role: 'system', content: run.system }, { role: 'user', content: '.' }], tools: defs, tool_choice: 'auto', max_tokens: 1 })
  }).catch(() => {});
}

/** Une seule demande, sans outils et sans toucher à la discussion (traduction des sous-titres…) : renvoie le texte écrit */
async function once(run: { provider: Provider; model: string; url?: string; key: string; system: string; text: string; maxTokens?: number }): Promise<string> {
  if (run.provider === 'claude') {
    const { default: AnthropicSDK } = await import('@anthropic-ai/sdk');
    const client = new AnthropicSDK({ apiKey: run.key, dangerouslyAllowBrowser: true, maxRetries: 2 });
    try {
      const msg = await client.messages.stream({ model: run.model, max_tokens: run.maxTokens || 8000, system: run.system, messages: [{ role: 'user', content: run.text }] }).finalMessage();
      if (msg.stop_reason === 'refusal') throw new ChatError('bad', 'refusal');
      return msg.content.map(b => (b.type === 'text' ? b.text : '')).join('');
    } catch (e) { throw e instanceof ChatError ? e : await claudeError(e); }
  }
  const url = (run.url || '').replace(/\/+$/, '') + '/chat/completions';
  const messages = [{ role: 'system', content: run.system }, { role: 'user', content: run.text }];
  let status: number, body: string;
  if (run.provider === 'local') {
    // cerveau de DedCut IA : réponse sobre (peu de fantaisie pour une traduction)
    let res: Response;
    try { res = await fetch(url, { method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: 'Bearer ' + run.key }, body: JSON.stringify({ model: run.model, messages, temperature: 0.2, top_p: 0.8, top_k: 20, max_tokens: run.maxTokens || 4096 }) }); }
    catch (e) { throw new ChatError('offline', String((e as Error)?.message || e)); }
    status = res.status; body = await res.text();
  } else {
    try { ({ status, body } = await invoke<{ status: number; body: string }>('chat_post', { url, key: run.key, body: JSON.stringify({ model: run.model, messages }) })); }
    catch (e) { throw new ChatError(run.provider === 'ollama' ? 'offline' : 'network', String(e)); }
  }
  let j: { choices?: { message?: { content?: string | null } }[]; error?: { message?: string } | string } = {};
  try { j = JSON.parse(body); } catch { /* corps non JSON */ }
  if (Array.isArray(j)) j = j[0] || {};
  if (status === 401 || status === 403 || (status === 400 && /api[ _]?key/i.test(body))) throw new ChatError('auth', body.slice(0, 300));
  if (status === 429) throw new ChatError('rate', body.slice(0, 300));
  if (status >= 400 || !j.choices?.length) {
    const m = typeof j.error === 'string' ? j.error : j.error?.message;
    throw new ChatError('bad', (m || body || String(status)).slice(0, 300));
  }
  return String(j.choices[0].message?.content || '');
}

export const dedcutChat = {
  warm,
  async once(run: Parameters<typeof once>[0]) {
    try { return await once(run); }
    catch (e) { throw e instanceof ChatError ? { code: e.code, message: e.message } : { code: 'other', message: String((e as Error)?.message || e) }; }
  },
  fresh: () => !conv || conv.provider !== 'local',
  keyGet: (provider: string) => invoke<string>('chat_key_get', { provider }),
  keySet: (provider: string, key: string) => invoke('chat_key_set', { provider, key }),
  reset() { conv = null; },
  stop() { stopped = true; try { current?.abort(); } catch { /* déjà fini */ } },
  async send(run: ChatRun) {
    if (!conv || conv.provider !== run.provider || conv.model !== run.model) conv = { provider: run.provider, model: run.model, claude: [], oai: [] };
    stopped = false;
    try {
      if (run.provider === 'claude') {
        try { await runClaude(run); } catch (e) { throw e instanceof ChatError ? e : await claudeError(e); }
      } else await runOpenAI(run);
    } catch (e) {
      repair();
      if (stopped) return { stopped: true };
      throw e instanceof ChatError ? { code: e.code, message: e.message } : { code: 'other', message: String((e as Error)?.message || e) };
    }
    repair();
    return { stopped };
  }
};

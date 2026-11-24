// Необязательное подключение ИИ прямо в приложении: пишет плагины и рисует авы без копирования промтов.
// Поддерживаются API формата OpenAI (OpenAI, OpenRouter, Gemini, DeepSeek, Groq, Ollama, LM Studio …) и Anthropic.
// Ключ хранится только на этом устройстве (память приложения). Запросы идут напрямую к выбранному сервису.

import { lsGet, lsSet } from './store.js';
import { http } from './bridge.js';

export const PRESETS = {
  openrouter: { label: 'OpenRouter', kind: 'openai', base: 'https://openrouter.ai/api/v1', model: '', hint: 'модель вида vendor/name — список на openrouter.ai/models (есть бесплатные)' },
  gemini: { label: 'Google Gemini', kind: 'openai', base: 'https://generativelanguage.googleapis.com/v1beta/openai', model: 'gemini-2.0-flash', hint: 'ключ — в Google AI Studio' },
  deepseek: { label: 'DeepSeek', kind: 'openai', base: 'https://api.deepseek.com/v1', model: 'deepseek-chat', hint: '' },
  groq: { label: 'Groq', kind: 'openai', base: 'https://api.groq.com/openai/v1', model: 'llama-3.3-70b-versatile', hint: '' },
  openai: { label: 'OpenAI', kind: 'openai', base: 'https://api.openai.com/v1', model: 'gpt-4o-mini', hint: '' },
  anthropic: { label: 'Anthropic (Claude)', kind: 'anthropic', base: 'https://api.anthropic.com', model: 'claude-sonnet-5-5', hint: '' },
  ollama: { label: 'Ollama (на этом ПК)', kind: 'openai', base: 'http://localhost:11434/v1', model: 'qwen2.5-coder', hint: 'ключ не нужен; только Windows-версия', noKey: true },
  custom: { label: 'Свой адрес (OpenAI-совместимый)', kind: 'openai', base: '', model: '', hint: 'любой сервер с /chat/completions' },
};

export const getLlm = () => lsGet('llm', { preset: 'openrouter', base: PRESETS.openrouter.base, model: '', key: '' });
export const saveLlm = (s) => lsSet('llm', s);

export function isConfigured() {
  const s = getLlm();
  const p = PRESETS[s.preset] || PRESETS.custom;
  return !!(s.base && s.model && (s.key || p.noKey));
}

/** messages: [{role:'user'|'assistant', content}]. Возвращает текст ответа. */
export async function ask(messages, { system = '', maxTokens = 8000 } = {}) {
  if (!isConfigured()) throw new Error('ИИ не подключён: откройте «Студия → ИИ-подключение».');
  const s = getLlm();
  const kind = (PRESETS[s.preset] || PRESETS.custom).kind;
  const base = s.base.replace(/\/+$/, '');
  let url, headers, body;

  if (kind === 'anthropic') {
    url = base + '/v1/messages';
    headers = { 'content-type': 'application/json', 'x-api-key': s.key, 'anthropic-version': '2023-06-01', 'anthropic-dangerous-direct-browser-access': 'true' };
    body = { model: s.model, max_tokens: maxTokens, messages, ...(system ? { system } : {}) };
  } else {
    url = base + '/chat/completions';
    headers = { 'content-type': 'application/json', ...(s.key ? { authorization: 'Bearer ' + s.key } : {}) };
    body = { model: s.model, max_tokens: maxTokens, messages: system ? [{ role: 'system', content: system }, ...messages] : messages };
  }

  const r = await http(url, { method: 'POST', headers, body: JSON.stringify(body), timeout: 180000 });
  let j;
  try { j = JSON.parse(r.text); } catch { throw new Error('Сервис ответил не JSON (HTTP ' + r.status + '): ' + String(r.text).slice(0, 200)); }
  if (r.status >= 400) {
    const msg = (j.error && (j.error.message || j.error)) || j.message || r.text;
    throw new Error('HTTP ' + r.status + ': ' + String(typeof msg === 'string' ? msg : JSON.stringify(msg)).slice(0, 300));
  }
  const text = kind === 'anthropic'
    ? (j.content || []).map((c) => c.text || '').join('')
    : (((j.choices || [])[0] || {}).message || {}).content;
  if (!text) throw new Error('Пустой ответ от ИИ');
  return String(text);
}

import { create } from 'zustand';

export type Provider = 'local' | 'api' | 'openai' | 'gemini';

export interface ModelOption {
  id: string;
  label: string;
  desc: string;
}

export const LOCAL_MODELS: ModelOption[] = [
  { id: 'qwen3:4b', label: 'Qwen3 4B', desc: 'GPU uchun optimal' },
  { id: 'qwen3:8b', label: 'Qwen3 8B', desc: 'CPU (sekin)' },
  { id: 'tinyllama', label: 'TinyLlama', desc: 'Tez va yengil' },
  { id: 'mistral', label: 'Mistral 7B', desc: 'Kuchli umumiy' },
];

export const API_MODELS: ModelOption[] = [
  { id: 'nvidia/nemotron-3-super-120b-a12b:free', label: 'Nemotron 120B', desc: 'NVIDIA (Bepul)' },
  { id: 'inclusionai/ling-2.6-1t:free', label: 'Ling 2.6 1T', desc: 'Ling (Best)' },
];

export const OPENAI_MODELS: ModelOption[] = [
  { id: 'gpt-4o',      label: 'GPT-4o',      desc: 'OpenAI — Aqlli va kuchli' },
  { id: 'gpt-4o-mini', label: 'GPT-4o Mini', desc: 'OpenAI — Tezkor va arzon' },
  {id: 'gpt-5.5', label: 'GPT-5.5', desc: 'OpenAI — Yangi avlod' },
];

export const GEMINI_MODELS: ModelOption[] = [
  { id: 'gemini-3.1-pro-preview',       label: 'Gemini 3.1 Pro Preview',       desc: 'Google — Yangi avlod' },
  { id: 'gemini-2.5-flash', label: 'Gemini 2.5 Flash', desc: 'Google — Tez va kuchli' },
  { id: 'gemini-2.5-pro',   label: 'Gemini 2.5 Pro',   desc: 'Google — Eng kuchli' },
  { id: 'gemini-2.0-flash', label: 'Gemini 2.0 Flash', desc: 'Google — Tezkor' },
];

/** @deprecated use LOCAL_MODELS */
export const AVAILABLE_MODELS = LOCAL_MODELS;

const KEY_PROVIDER     = 'jk-provider';
const KEY_LOCAL_MODEL  = 'jk-llm-model';
const KEY_API_MODEL    = 'jk-api-model';
const KEY_OPENAI_MODEL = 'jk-openai-model';
const KEY_GEMINI_MODEL = 'jk-gemini-model';

interface ModelState {
  provider:      Provider;
  localModelId:  string;
  apiModelId:    string;
  openaiModelId: string;
  geminiModelId: string;
  setProvider:    (p: Provider) => void;
  setLocalModel:  (id: string) => void;
  setApiModel:    (id: string) => void;
  setOpenaiModel: (id: string) => void;
  setGeminiModel: (id: string) => void;
}

export const useModelStore = create<ModelState>((set) => ({
  provider:      (localStorage.getItem(KEY_PROVIDER) as Provider) ?? 'local',
  localModelId:  localStorage.getItem(KEY_LOCAL_MODEL)  ?? LOCAL_MODELS[0].id,
  apiModelId:    localStorage.getItem(KEY_API_MODEL)    ?? API_MODELS[0].id,
  openaiModelId: localStorage.getItem(KEY_OPENAI_MODEL) ?? OPENAI_MODELS[0].id,
  geminiModelId: localStorage.getItem(KEY_GEMINI_MODEL) ?? GEMINI_MODELS[0].id,

  setProvider: (p) => {
    localStorage.setItem(KEY_PROVIDER, p);
    set({ provider: p });
  },
  setLocalModel: (id) => {
    localStorage.setItem(KEY_LOCAL_MODEL, id);
    set({ localModelId: id });
  },
  setApiModel: (id) => {
    localStorage.setItem(KEY_API_MODEL, id);
    set({ apiModelId: id });
  },
  setOpenaiModel: (id) => {
    localStorage.setItem(KEY_OPENAI_MODEL, id);
    set({ openaiModelId: id });
  },
  setGeminiModel: (id) => {
    localStorage.setItem(KEY_GEMINI_MODEL, id);
    set({ geminiModelId: id });
  },
}));

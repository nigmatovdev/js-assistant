import { create } from 'zustand';

export type Provider = 'local' | 'api';

export interface ModelOption {
  id:    string;
  label: string;
  desc:  string;
}

export const LOCAL_MODELS: ModelOption[] = [
  { id: 'qwen3:4b',   label: 'Qwen3 4B',    desc: 'GPU uchun optimal' },
  { id: 'qwen3:8b',   label: 'Qwen3 8B',    desc: 'CPU (sekin)'       },
  { id: 'tinyllama',  label: 'TinyLlama',   desc: 'Tez va yengil'     },
  { id: 'mistral',    label: 'Mistral 7B',  desc: 'Kuchli umumiy'     },
];

export const API_MODELS: ModelOption[] = [
  { id: 'nvidia/nemotron-3-super-120b-a12b:free', label: 'Nemotron 120B', desc: 'NVIDIA (Bepul)' },
  { id: 'inclusionai/ling-2.6-1t:free',           label: 'Ling 2.6 1T',  desc: 'InclusionAI (Bepul)' },
];

/** @deprecated use LOCAL_MODELS */
export const AVAILABLE_MODELS = LOCAL_MODELS;

const KEY_PROVIDER    = 'jk-provider';
const KEY_LOCAL_MODEL = 'jk-llm-model';
const KEY_API_MODEL   = 'jk-api-model';

interface ModelState {
  provider:      Provider;
  localModelId:  string;
  apiModelId:    string;
  setProvider:   (p: Provider) => void;
  setLocalModel: (id: string)  => void;
  setApiModel:   (id: string)  => void;
}

export const useModelStore = create<ModelState>((set) => ({
  provider:     (localStorage.getItem(KEY_PROVIDER) as Provider) ?? 'local',
  localModelId: localStorage.getItem(KEY_LOCAL_MODEL) ?? LOCAL_MODELS[0].id,
  apiModelId:   localStorage.getItem(KEY_API_MODEL)   ?? API_MODELS[0].id,

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
}));

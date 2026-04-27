import { create } from 'zustand';

export interface ModelOption {
  id:    string;
  label: string;
  desc:  string;
}

export const AVAILABLE_MODELS: ModelOption[] = [
  { id: 'qwen3:8b',   label: 'Qwen3 8B',    desc: 'Asosiy model'    },
  { id: 'tinyllama',  label: 'TinyLlama',   desc: 'Tez va yengil'  },
  { id: 'mistral',    label: 'Mistral 7B',  desc: 'Kuchli umumiy'  },
];

const STORAGE_KEY = 'jk-llm-model';

interface ModelState {
  modelId: string;
  setModel: (id: string) => void;
}

export const useModelStore = create<ModelState>((set) => ({
  modelId: localStorage.getItem(STORAGE_KEY) ?? 'qwen3:8b',
  setModel: (id) => {
    localStorage.setItem(STORAGE_KEY, id);
    set({ modelId: id });
  },
}));

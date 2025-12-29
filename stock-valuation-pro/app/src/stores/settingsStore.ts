import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';

export type LLMProvider = 'openai' | 'gemini';

interface SettingsState {
    // LLM Configuration
    llmProvider: LLMProvider | null;
    llmApiKey: string | null;

    // Actions
    setLLMProvider: (provider: LLMProvider) => void;
    setLLMApiKey: (key: string) => void;
    clearLLMSettings: () => void;

    // Computed
    isConfigured: () => boolean;
}

export const useSettingsStore = create<SettingsState>()(
    persist(
        (set, get) => ({
            llmProvider: null,
            llmApiKey: null,

            setLLMProvider: (provider: LLMProvider) => {
                set({ llmProvider: provider });
            },

            setLLMApiKey: (key: string) => {
                set({ llmApiKey: key });
            },

            clearLLMSettings: () => {
                set({ llmProvider: null, llmApiKey: null });
            },

            isConfigured: () => {
                const state = get();
                return !!(state.llmProvider && state.llmApiKey);
            },
        }),
        {
            name: 'stock-valuation-settings',
            storage: createJSONStorage(() => localStorage),
            partialize: (state) => ({
                llmProvider: state.llmProvider,
                llmApiKey: state.llmApiKey,
            }),
        }
    )
);

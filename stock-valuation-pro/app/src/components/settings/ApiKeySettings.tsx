"use client";

import { useState, useEffect } from "react";
import { useSettingsStore, LLMProvider } from "@/stores/settingsStore";

interface ApiKeySettingsProps {
    isOpen: boolean;
    onClose: () => void;
}

export function ApiKeySettings({ isOpen, onClose }: ApiKeySettingsProps) {
    const { llmProvider, llmApiKey, setLLMProvider, setLLMApiKey, clearLLMSettings } = useSettingsStore();

    const [provider, setProvider] = useState<LLMProvider>(llmProvider || 'openai');
    const [apiKey, setApiKey] = useState(llmApiKey || '');
    const [showKey, setShowKey] = useState(false);
    const [testing, setTesting] = useState(false);
    const [testResult, setTestResult] = useState<{ success: boolean; message: string } | null>(null);

    // Sync with store on open
    useEffect(() => {
        if (isOpen) {
            setProvider(llmProvider || 'openai');
            setApiKey(llmApiKey || '');
            setTestResult(null);
        }
    }, [isOpen, llmProvider, llmApiKey]);

    const handleSave = () => {
        setLLMProvider(provider);
        setLLMApiKey(apiKey);
        setTestResult({ success: true, message: 'Settings saved!' });
        setTimeout(() => onClose(), 1000);
    };

    const handleClear = () => {
        clearLLMSettings();
        setApiKey('');
        setTestResult({ success: true, message: 'Settings cleared!' });
    };

    const testConnection = async () => {
        if (!apiKey.trim()) {
            setTestResult({ success: false, message: 'Please enter an API key' });
            return;
        }

        setTesting(true);
        setTestResult(null);

        try {
            if (provider === 'openai') {
                const response = await fetch('https://api.openai.com/v1/models', {
                    headers: { 'Authorization': `Bearer ${apiKey}` }
                });
                if (response.ok) {
                    setTestResult({ success: true, message: '✓ OpenAI connection successful!' });
                } else {
                    const error = await response.json();
                    setTestResult({ success: false, message: error.error?.message || 'Invalid API key' });
                }
            } else if (provider === 'gemini') {
                // First try to list available models
                const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models?key=${apiKey}`);
                if (response.ok) {
                    const data = await response.json();
                    const models = data.models || [];
                    const textModels = models
                        .filter((m: any) => m.supportedGenerationMethods?.includes('generateContent'))
                        .map((m: any) => m.name?.replace('models/', ''))
                        .slice(0, 5);

                    if (textModels.length > 0) {
                        setTestResult({
                            success: true,
                            message: `✓ Connected! Available: ${textModels.join(', ')}`
                        });
                    } else {
                        setTestResult({ success: true, message: '✓ Gemini connection successful!' });
                    }
                } else {
                    const error = await response.json();
                    setTestResult({ success: false, message: error.error?.message || 'Invalid API key' });
                }
            }
        } catch (error) {
            setTestResult({ success: false, message: 'Connection failed. Check your network.' });
        } finally {
            setTesting(false);
        }
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
            {/* Backdrop */}
            <div
                className="absolute inset-0 bg-black/70 backdrop-blur-sm"
                onClick={onClose}
            />

            {/* Modal */}
            <div className="relative bg-zinc-900 border border-zinc-700 rounded-2xl w-full max-w-md p-6 shadow-2xl">
                {/* Header */}
                <div className="flex items-center justify-between mb-6">
                    <div>
                        <h2 className="text-xl font-bold text-white">AI Settings</h2>
                        <p className="text-sm text-zinc-400 mt-1">Configure your LLM API key</p>
                    </div>
                    <button
                        onClick={onClose}
                        className="p-2 hover:bg-zinc-800 rounded-lg transition-colors"
                    >
                        <span className="text-zinc-400 text-xl">✕</span>
                    </button>
                </div>

                {/* Provider Selection */}
                <div className="mb-4">
                    <label className="block text-sm font-medium text-zinc-300 mb-2">
                        LLM Provider
                    </label>
                    <div className="flex gap-2">
                        <button
                            onClick={() => setProvider('openai')}
                            className={`flex-1 px-4 py-3 rounded-xl border transition-all ${provider === 'openai'
                                ? 'bg-emerald-600/20 border-emerald-500 text-emerald-400'
                                : 'bg-zinc-800 border-zinc-700 text-zinc-400 hover:border-zinc-600'
                                }`}
                        >
                            <div className="font-medium">OpenAI</div>
                            <div className="text-xs opacity-70">GPT-4o</div>
                        </button>
                        <button
                            onClick={() => setProvider('gemini')}
                            className={`flex-1 px-4 py-3 rounded-xl border transition-all ${provider === 'gemini'
                                ? 'bg-blue-600/20 border-blue-500 text-blue-400'
                                : 'bg-zinc-800 border-zinc-700 text-zinc-400 hover:border-zinc-600'
                                }`}
                        >
                            <div className="font-medium">Gemini</div>
                            <div className="text-xs opacity-70">Gemini Pro</div>
                        </button>
                    </div>
                </div>

                {/* API Key Input */}
                <div className="mb-4">
                    <label className="block text-sm font-medium text-zinc-300 mb-2">
                        API Key
                    </label>
                    <div className="relative">
                        <input
                            type={showKey ? 'text' : 'password'}
                            value={apiKey}
                            onChange={(e) => setApiKey(e.target.value)}
                            placeholder={provider === 'openai' ? 'sk-...' : 'AIza...'}
                            className="w-full px-4 py-3 pr-20 bg-zinc-800 border border-zinc-700 rounded-xl text-white placeholder-zinc-500 focus:outline-none focus:border-emerald-500 font-mono text-sm"
                        />
                        <button
                            onClick={() => setShowKey(!showKey)}
                            className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-white text-sm"
                        >
                            {showKey ? '🙈 Hide' : '👁️ Show'}
                        </button>
                    </div>
                    <p className="text-xs text-zinc-500 mt-2">
                        🔒 Your key is stored locally in your browser only
                    </p>
                </div>

                {/* Test Result */}
                {testResult && (
                    <div className={`mb-4 p-3 rounded-xl text-sm ${testResult.success
                        ? 'bg-emerald-500/10 border border-emerald-500/20 text-emerald-400'
                        : 'bg-red-500/10 border border-red-500/20 text-red-400'
                        }`}>
                        {testResult.message}
                    </div>
                )}

                {/* Actions */}
                <div className="flex gap-3">
                    <button
                        onClick={testConnection}
                        disabled={testing || !apiKey.trim()}
                        className="px-4 py-2 bg-zinc-700 hover:bg-zinc-600 disabled:opacity-50 text-white rounded-lg transition-colors text-sm"
                    >
                        {testing ? '⏳ Testing...' : '🔌 Test'}
                    </button>
                    <button
                        onClick={handleClear}
                        className="px-4 py-2 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 rounded-lg transition-colors text-sm"
                    >
                        🗑️ Clear
                    </button>
                    <button
                        onClick={handleSave}
                        disabled={!apiKey.trim()}
                        className="flex-1 px-4 py-2 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white font-medium rounded-lg transition-colors"
                    >
                        💾 Save Settings
                    </button>
                </div>
            </div>
        </div>
    );
}

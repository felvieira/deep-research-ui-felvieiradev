'use client';

import { useState, useEffect } from 'react';
import { Moon, Search, Settings, Sun, X } from 'lucide-react';
import { ResearchForm } from '@/components/ResearchForm';
import { ResearchHistory, ResearchHistoryItem } from '@/components/ResearchHistory';
import { LLMConfig } from '@/components/LLMConfig';
import { HistoryItemView } from '@/components/HistoryItemView';
import { loadConfig, type LLMConfig as LLMConfigType, type ProviderType } from '@/ai/providers';
import { features } from '@/data/features';

const defaultLLMConfig: LLMConfigType = {
  provider: 'openrouter' as const,
  model: 'openai/gpt-3.5-turbo',
  apiKey: '',
  firecrawlKey: '',
  temperature: 0.7,
  maxTokens: 4000,
};

export default function Home() {
  const [darkMode, setDarkMode] = useState<boolean | null>(null);
  const [showLLMConfig, setShowLLMConfig] = useState(false);
  const [llmConfig, setLLMConfig] = useState<LLMConfigType>(defaultLLMConfig);
  const [showMarkdownEditor, setShowMarkdownEditor] = useState(false);
  const [markdownContent, setMarkdownContent] = useState('');
  const [activeTab, setActiveTab] = useState<'features' | 'history'>('features');
  const [selectedHistoryItem, setSelectedHistoryItem] = useState<ResearchHistoryItem | null>(null);

  // Carregar configurações do localStorage quando montar
  useEffect(() => {
    const savedConfig = loadConfig();
    if (savedConfig) {
      // Garantir que temos as chaves de API
      const config: LLMConfigType = {
        ...defaultLLMConfig,
        ...savedConfig,
        // Garantir que as chaves não sejam undefined
        provider: savedConfig.provider as ProviderType,
        apiKey: savedConfig.apiKey || '',
        firecrawlKey: savedConfig.firecrawlKey || '',
        temperature: savedConfig.temperature || defaultLLMConfig.temperature,
        maxTokens: savedConfig.maxTokens || defaultLLMConfig.maxTokens,
      };
      setLLMConfig(config);
    }
  }, []);

  // Detectar tema do sistema
  useEffect(() => {
    setDarkMode(window.matchMedia('(prefers-color-scheme: dark)').matches);
  }, []);

  const ensureProviderType = (config: Omit<LLMConfigType, 'provider'> & { provider: string }): LLMConfigType => {
    if (config.provider !== 'openai' && config.provider !== 'openrouter') {
      throw new Error('Invalid provider type');
    }
    return config as LLMConfigType;
  };

  const handleChange = (field: keyof LLMConfigType, value: string | number) => {
    setLLMConfig(prevConfig => {
      if (field === 'provider') {
        if (value !== 'openai' && value !== 'openrouter') {
          throw new Error('Invalid provider type');
        }
        return {
          ...prevConfig,
          provider: value as ProviderType,
          model: '',
          apiKey: ''
        };
      }
      return {
        ...prevConfig,
        [field]: value
      };
    });
  };

  if (darkMode === null) {
    return null;
  }

  return (
    <div className={darkMode ? 'dark' : ''}>
      <div className="min-h-screen bg-white dark:bg-slate-900">
        <main className="flex h-screen">
          {/* Sidebar */}
          <div className="w-64 bg-slate-50 dark:bg-slate-900 border-r border-slate-200 dark:border-slate-800">
            <div className="p-4">
              <div className="flex items-center justify-between mb-6">
                <h1 className="text-xl font-semibold text-slate-900 dark:text-slate-100">Features IA</h1>
                <button
                  onClick={() => setDarkMode(!darkMode)}
                  className="p-2 rounded-lg hover:bg-slate-200 dark:hover:bg-slate-800"
                >
                  {darkMode ? <Sun size={20} /> : <Moon size={20} />}
                </button>
              </div>

              <div className="flex border-b border-slate-200 dark:border-slate-800 mb-4">
                <button
                  onClick={() => setActiveTab('features')}
                  className={`flex-1 pb-2 text-sm font-medium ${
                    activeTab === 'features'
                      ? 'border-b-2 border-slate-900 dark:border-slate-100 text-slate-900 dark:text-slate-100'
                      : 'text-slate-500 dark:text-slate-400'
                  }`}
                >
                  Features
                </button>
                <button
                  onClick={() => setActiveTab('history')}
                  className={`flex-1 pb-2 text-sm font-medium ${
                    activeTab === 'history'
                      ? 'border-b-2 border-slate-900 dark:border-slate-100 text-slate-900 dark:text-slate-100'
                      : 'text-slate-500 dark:text-slate-400'
                  }`}
                >
                  Histórico
                </button>
              </div>

              {/* Features or History List */}
              {activeTab === 'features' ? (
                <div className="space-y-4">
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400 dark:text-slate-500" size={20} />
                    <input
                      type="text"
                      placeholder="Buscar features..."
                      className="w-full pl-10 pr-4 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 focus:outline-none focus:ring-2 focus:ring-slate-500"
                    />
                  </div>
                  {features.map((feature) => (
                    <div
                      key={feature.id}
                      className="p-4 rounded-lg border border-slate-200 dark:border-slate-700 hover:border-slate-900 dark:hover:border-slate-500 cursor-pointer transition-colors"
                    >
                      <div className="flex items-center gap-3 mb-2">
                        <feature.icon size={20} className="text-slate-900 dark:text-slate-100" />
                        <h3 className="font-medium text-slate-900 dark:text-slate-100">{feature.title}</h3>
                      </div>
                      <p className="text-sm text-slate-600 dark:text-slate-400">{feature.description}</p>
                    </div>
                  ))}
                </div>
              ) : (
                <ResearchHistory
                  onSelectHistory={(item) => {
                    setSelectedHistoryItem(item);
                    if (item.llmConfig) {
                      const config: LLMConfigType = {
                        ...defaultLLMConfig,
                        ...item.llmConfig,
                        provider: item.llmConfig.provider as ProviderType
                      };
                      setLLMConfig(config);
                    }
                  }}
                />
              )}
            </div>
          </div>

          {/* Main Content */}
          <div className="flex-1 flex flex-col">
            {/* Toolbar */}
            <div className="flex items-center justify-between p-4 border-b border-slate-200 dark:border-slate-800">
              <h2 className="text-xl font-semibold text-slate-900 dark:text-slate-100">
                Deep Research
              </h2>
              <button
                onClick={() => setShowLLMConfig(true)}
                className="text-sm text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100"
              >
                <Settings size={20} />
              </button>
            </div>

            {/* Content Area */}
            <div className="flex-1 overflow-y-auto p-6">
              {activeTab === 'features' ? (
                <ResearchForm
                  onReportGenerated={(report) => setMarkdownContent(report)}
                  llmConfig={llmConfig}
                  initialQuery={selectedHistoryItem?.query || ''}
                  initialFollowUpQuestions={selectedHistoryItem?.followUpQuestions || []}
                  initialAnswers={selectedHistoryItem?.answers || []}
                  initialReport={selectedHistoryItem?.report || null}
                />
              ) : (
                <div className="h-full">
                  {selectedHistoryItem ? (
                    <HistoryItemView historyItem={selectedHistoryItem} />
                  ) : (
                    <div className="h-full flex items-center justify-center text-slate-500 dark:text-slate-400">
                      Selecione um item do histórico para visualizar
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </main>

        {/* LLM Config Modal */}
        {showLLMConfig && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
            <div className="bg-white dark:bg-slate-800 rounded-xl shadow-xl max-w-md w-full">
              <div className="flex items-center justify-between p-4 border-b border-slate-200 dark:border-slate-700">
                <div className="flex items-center gap-2">
                  <Settings size={20} className="text-slate-900 dark:text-slate-100" />
                  <h2 className="text-lg font-semibold text-slate-900 dark:text-slate-100">Configuração da LLM</h2>
                </div>
                <button
                  onClick={() => setShowLLMConfig(false)}
                  className="p-2 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg text-slate-900 dark:text-slate-100"
                >
                  <X size={20} />
                </button>
              </div>
              <div className="p-4">
                <LLMConfig 
                  config={llmConfig}
                  onConfigChange={setLLMConfig}
                  onClose={() => setShowLLMConfig(false)}
                  hideTitle
                />
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
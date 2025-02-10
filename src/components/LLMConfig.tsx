'use client';

import { useEffect, useState } from 'react';
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Select } from "@/components/ui/select";
import { SearchableSelect } from "@/components/ui/searchable-select";
import { 
  LLMConfig as LLMConfigType, 
  ProviderType, 
  fetchAvailableModels,
  OpenRouterModel,
  convertApiModelToLocal,
  saveConfig,
  loadConfig,
  AVAILABLE_MODELS
} from '@/ai/providers';

type LLMConfigProps = {
  config: LLMConfigType;
  onConfigChange: (config: LLMConfigType) => void;
  hideTitle?: boolean;
  onClose?: () => void;
};

export function LLMConfig({ config, onConfigChange, hideTitle, onClose }: LLMConfigProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [apiModels, setApiModels] = useState<OpenRouterModel[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [localConfig, setLocalConfig] = useState(config);

  // Log config changes
  useEffect(() => {
    console.log('Config prop changed:', config);
  }, [config]);

  // Atualizar localConfig quando as props mudarem
  useEffect(() => {
    const newConfig = {
      ...config,
      // Garantir que as chaves não sejam undefined
      apiKey: config.apiKey || '',
      firecrawlKey: config.firecrawlKey || '',
      temperature: config.temperature || 0.7,
      maxTokens: config.maxTokens || 4000,
    };
    console.log('Setting local config:', newConfig);
    setLocalConfig(newConfig);
  }, [config]);

  // Salvar configuração sempre que mudar
  useEffect(() => {
    console.log('Saving config:', localConfig);
    saveConfig(localConfig);
  }, [localConfig]);

  // Buscar modelos da API
  useEffect(() => {
    async function loadModels() {
      setIsLoading(true);
      try {
        const models = await fetchAvailableModels(localConfig);
        const sortedModels = models.sort((a, b) => {
          const costA = a.pricing?.prompt || 0 + a.pricing?.completion || 0;
          const costB = b.pricing?.prompt || 0 + b.pricing?.completion || 0;
          return costA - costB;
        });
        setApiModels(sortedModels);
      } catch (error) {
        console.error('Erro ao carregar modelos:', error);
      } finally {
        setIsLoading(false);
      }
    }

    if (localConfig.provider === 'openrouter' && localConfig.apiKey) {
      loadModels();
    }
  }, [localConfig.provider, localConfig.apiKey]);

  const handleChange = (field: keyof LLMConfigType, value: string | number) => {
    const newConfig = {
      ...localConfig,
      [field]: value,
    };

    // Se mudar o provedor, resetar o modelo e a API key
    if (field === 'provider') {
      newConfig.model = '';
      newConfig.apiKey = '';
    }

    setLocalConfig(newConfig);
    onConfigChange(newConfig); // Notificar mudança imediatamente
  };

  const handleSave = () => {
    onConfigChange(localConfig);
    saveConfig(localConfig);
    if (onClose) onClose();
  };

  const getModelOptions = () => {
    if (localConfig.provider === 'openrouter') {
      if (isLoading) {
        return [{ value: '', label: 'Carregando modelos...' }];
      }
      if (!localConfig.apiKey) {
        return [{ value: '', label: 'Digite sua API key para ver os modelos' }];
      }
      if (apiModels.length === 0) {
        return [{ value: '', label: 'Nenhum modelo disponível' }];
      }
      return apiModels.map(model => ({
        value: model.id,
        label: model.name
      }));
    }
    return AVAILABLE_MODELS.openai;
  };

  return (
    <Card className="bg-white/80 dark:bg-slate-900/80 backdrop-blur-sm border-slate-200 dark:border-slate-800 p-4 rounded-xl">
      {!hideTitle && (
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-lg font-medium text-slate-900 dark:text-slate-100">
            Configurações da LLM
          </h3>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setIsExpanded(!isExpanded)}
          >
            {isExpanded ? 'Ocultar' : 'Mostrar'}
          </Button>
        </div>
      )}

      {(!hideTitle && !isExpanded) ? null : (
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-900 dark:text-slate-200 mb-1">
              Provedor
            </label>
            <Select
              value={localConfig.provider}
              onValueChange={(value) => handleChange('provider', value)}
              options={[
                { value: 'openai', label: 'OpenAI' },
                { value: 'openrouter', label: 'OpenRouter' },
              ]}
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-900 dark:text-slate-200 mb-1">
              Modelo
            </label>
            <SearchableSelect
              value={localConfig.model}
              onValueChange={(value) => handleChange('model', value)}
              options={getModelOptions()}
              disabled={isLoading}
            />
            {isLoading && (
              <p className="text-xs text-slate-500 mt-1">
                Carregando modelos disponíveis...
              </p>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-900 dark:text-slate-200 mb-1">
              API Key (opcional)
            </label>
            <Input
              type="password"
              value={localConfig.apiKey || ''}
              onChange={(e) => handleChange('apiKey', e.target.value)}
              placeholder="Sua API key aqui"
            />
            <p className="text-xs text-slate-500 mt-1">
              Se não fornecida, usará a key do .env
            </p>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-900 dark:text-slate-200 mb-1">
              Firecrawl Key (opcional)
            </label>
            <Input
              type="password"
              value={localConfig.firecrawlKey || ''}
              onChange={(e) => handleChange('firecrawlKey', e.target.value)}
              placeholder="Sua Firecrawl key aqui"
            />
            <p className="text-xs text-slate-500 mt-1">
              Se não fornecida, usará a key do .env
            </p>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-900 dark:text-slate-200 mb-1">
              Temperatura
            </label>
            <Input
              type="number"
              min="0"
              max="2"
              step="0.1"
              value={localConfig.temperature || 0.7}
              onChange={(e) => handleChange('temperature', parseFloat(e.target.value))}
              placeholder="0.7"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-900 dark:text-slate-200 mb-1">
              Tokens Máximos
            </label>
            <Input
              type="number"
              min="1"
              max="32000"
              step="1"
              value={localConfig.maxTokens || 4000}
              onChange={(e) => handleChange('maxTokens', parseInt(e.target.value))}
              placeholder="4000"
            />
          </div>

          <div className="flex justify-end pt-4">
            <Button
              onClick={handleSave}
              className="bg-slate-900 hover:bg-slate-800 text-white dark:bg-slate-200 dark:hover:bg-slate-300 dark:text-slate-900"
            >
              Salvar Configurações
            </Button>
          </div>
        </div>
      )}
    </Card>
  );
} 
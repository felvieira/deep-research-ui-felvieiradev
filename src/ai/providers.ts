import { createOpenAI } from '@ai-sdk/openai';
import { getEncoding } from 'js-tiktoken';

import { RecursiveCharacterTextSplitter } from './text-splitter';

export type ProviderType = 'openai' | 'openrouter';

export type LLMConfig = {
  provider: ProviderType;
  model: string;
  apiKey?: string;
  firecrawlKey?: string;
  temperature?: number;
  maxTokens?: number;
  baseURL?: string;
};

// Providers
export function getOpenAIProvider(config?: LLMConfig) {
  if (!config?.apiKey) {
    throw new Error('OpenAI API key is required');
  }
  
  return createOpenAI({
    apiKey: config.apiKey,
    baseURL: config.baseURL || 'https://api.openai.com/v1',
  });
}

export function getOpenRouterProvider(config?: LLMConfig) {
  if (!config?.apiKey) {
    throw new Error('OpenRouter API key is required');
  }

  return createOpenAI({
    apiKey: config.apiKey,
    baseURL: 'https://openrouter.ai/api/v1',
    headers: {
      'HTTP-Referer': 'https://deep-research.app',
      'X-Title': 'Deep Research App',
    },
  });
}

// Models
export function getModel(config?: LLMConfig) {
  if (!config?.apiKey) {
    throw new Error('API key is required');
  }

  // Usa o provider correto baseado na seleção do usuário
  if (config.provider === 'openrouter') {
    const provider = createOpenAI({
      apiKey: config.apiKey,
      baseURL: 'https://openrouter.ai/api/v1',
      headers: {
        'HTTP-Referer': 'https://deep-research.app',
        'X-Title': 'Deep Research App',
      }
    });
    return provider(config.model, {
      temperature: config.temperature || 0.7,
      maxTokens: config.maxTokens || 4000,
    });
  } else {
    const provider = createOpenAI({
      apiKey: config.apiKey,
      baseURL: 'https://api.openai.com/v1',
    });
    return provider(config.model, {
      temperature: config.temperature || 0.7,
      maxTokens: config.maxTokens || 4000,
    });
  }
}

// Lista de modelos disponíveis por provedor
export const AVAILABLE_MODELS = {
  openai: [
    { value: 'gpt-4-0125-preview', label: 'GPT-4 Turbo (Mais Recente)' },
    { value: 'gpt-4-1106-preview', label: 'GPT-4 Turbo (Estável)' },
    { value: 'gpt-4', label: 'GPT-4 (Base)' },
    { value: 'gpt-4o', label: 'GPT-4 Otimizado' },
    { value: 'gpt-4o-mini', label: 'GPT-4 Mini (Rápido)' },
    { value: 'gpt-3.5-turbo', label: 'GPT-3.5 Turbo (Econômico)' },
  ],
  openrouter: [
    // OpenAI via OpenRouter
    { value: 'openai/gpt-4-0125-preview', label: 'OpenAI GPT-4 Turbo (Mais Recente)' },
    { value: 'openai/gpt-4-1106-preview', label: 'OpenAI GPT-4 Turbo (Estável)' },
    { value: 'openai/gpt-4', label: 'OpenAI GPT-4 (Base)' },
    { value: 'openai/gpt-3.5-turbo', label: 'OpenAI GPT-3.5 Turbo (Econômico)' },
    
    // Anthropic
    { value: 'anthropic/claude-3-opus-20240229', label: 'Claude 3 Opus (Melhor Qualidade)' },
    { value: 'anthropic/claude-3-sonnet-20240229', label: 'Claude 3 Sonnet (Rápido)' },
    { value: 'anthropic/claude-2.1', label: 'Claude 2.1 (Estável)' },
    
    // DeepSeek
    { value: 'deepseek/deepseek-coder-33b-instruct', label: 'DeepSeek Coder 33B (Especialista em Código)' },
    { value: 'deepseek/deepseek-llm-67b-chat', label: 'DeepSeek 67B (Conhecimento Geral)' },
    { value: 'deepseek/deepseek-math-7b-instruct', label: 'DeepSeek Math 7B (Matemática)' },
    { value: 'deepseek/deepseek-coder-6.7b-instruct', label: 'DeepSeek Coder 6.7B (Código Leve)' },
    { value: 'deepseek/deepseek-moe-16b-chat', label: 'DeepSeek MoE 16B (Eficiente)' },
    
    // Outros Grandes Modelos
    { value: 'mistral/mistral-large-latest', label: 'Mistral Large (Melhor Custo-Benefício)' },
    { value: 'google/gemini-pro', label: 'Gemini Pro (Rápido)' },
    { value: 'meta-llama/llama-2-70b-chat', label: 'Llama 2 70B (Open Source)' },
    { value: 'perplexity/pplx-70b-chat', label: 'PPLX 70B (Conhecimento Recente)' },
    
    // Modelos Menores
    { value: 'gryphe/mythomist-7b', label: 'MythoMist 7B (Leve)' },
    { value: 'nousresearch/nous-capybara-7b', label: 'Nous Capybara 7B (Criativo)' },
  ],
};

const MinChunkSize = 140;
const encoder = getEncoding('o200k_base');

// trim prompt to maximum context size
export function trimPrompt(prompt: string, contextSize = 120_000) {
  if (!prompt) {
    return '';
  }

  const length = encoder.encode(prompt).length;
  if (length <= contextSize) {
    return prompt;
  }

  const overflowTokens = length - contextSize;
  // on average it's 3 characters per token, so multiply by 3 to get a rough estimate of the number of characters
  const chunkSize = prompt.length - overflowTokens * 3;
  if (chunkSize < MinChunkSize) {
    return prompt.slice(0, MinChunkSize);
  }

  const splitter = new RecursiveCharacterTextSplitter({
    chunkSize,
    chunkOverlap: 0,
  });
  const trimmedPrompt = splitter.splitText(prompt)[0] ?? '';

  // last catch, there's a chance that the trimmed prompt is same length as the original prompt, due to how tokens are split & innerworkings of the splitter, handle this case by just doing a hard cut
  if (trimmedPrompt.length === prompt.length) {
    return trimPrompt(prompt.slice(0, chunkSize), contextSize);
  }

  // recursively trim until the prompt is within the context size
  return trimPrompt(trimmedPrompt, contextSize);
}

// Tipos para a resposta da API de modelos
export type OpenRouterModel = {
  id: string;
  name: string;
  description: string;
  pricing?: {
    prompt?: number;
    completion?: number;
  };
};

// Função para buscar modelos disponíveis da API
export async function fetchAvailableModels(config: LLMConfig): Promise<OpenRouterModel[]> {
  if (!config?.apiKey) {
    throw new Error('API key is required to fetch models');
  }

  try {
    const response = await fetch('https://openrouter.ai/api/v1/models', {
      headers: {
        'Authorization': `Bearer ${config.apiKey}`,
        'HTTP-Referer': 'https://deep-research.app',
        'X-Title': 'Deep Research App',
      }
    });
    
    if (!response.ok) {
      const error = await response.json();
      console.error('Erro na resposta da API:', error);
      throw new Error(error.message || 'Erro ao buscar modelos');
    }
    
    const data = await response.json();
    if (!data.data || !Array.isArray(data.data)) {
      console.error('Resposta inesperada da API:', data);
      return [];
    }

    return data.data;
  } catch (error) {
    console.error('Erro ao buscar modelos:', error);
    return [];
  }
}

// Funções para gerenciar configurações no localStorage
export function saveConfig(config: LLMConfig) {
  try {
    console.log('Saving to localStorage:', config);
    localStorage.setItem('llmConfig', JSON.stringify(config));
  } catch (error) {
    console.error('Erro ao salvar configuração:', error);
  }
}

export function loadConfig(): LLMConfig | null {
  try {
    const saved = localStorage.getItem('llmConfig');
    console.log('Loaded from localStorage:', saved);
    if (saved) {
      const config = JSON.parse(saved);
      const result = {
        provider: config.provider || 'openrouter',
        model: config.model || 'openai/o1-mini',
        apiKey: config.apiKey || '',
        firecrawlKey: config.firecrawlKey || '',
        temperature: config.temperature || 0.7,
        maxTokens: config.maxTokens || 4000,
      };
      console.log('Parsed config:', result);
      return result;
    }
  } catch (error) {
    console.error('Erro ao carregar configuração:', error);
  }
  return null;
}

// Função para converter modelo da API para formato interno
export function convertApiModelToLocal(apiModel: OpenRouterModel) {
  return {
    value: apiModel.id,
    label: apiModel.name,
    pricing: apiModel.pricing
  };
}

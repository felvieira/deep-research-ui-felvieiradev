import { generateFeedback } from '@/lib/feedback';
import { NextResponse } from 'next/server';
import { loadConfig } from '@/ai/providers';

export async function POST(req: Request) {
  try {
    const { query, llmConfig: providedConfig } = await req.json();
    
    // Use as configurações fornecidas ou carregue do localStorage
    const llmConfig = providedConfig || loadConfig();
    
    if (!llmConfig?.apiKey) {
      console.error('Configuração LLM não encontrada ou sem API key');
      return NextResponse.json(
        { error: 'Por favor, configure sua API key nas configurações primeiro.' },
        { status: 400 },
      );
    }

    console.log('Usando configuração:', {
      provider: llmConfig.provider,
      model: llmConfig.model,
      hasApiKey: !!llmConfig.apiKey
    });

    const questions = await generateFeedback({ query, llmConfig });
    return NextResponse.json(questions);
  } catch (error: any) {
    console.error('Erro ao gerar feedback:', error);
    return NextResponse.json(
      { error: error.message || 'Falha ao gerar feedback' },
      { status: 500 },
    );
  }
}
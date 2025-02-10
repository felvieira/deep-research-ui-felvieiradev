import { generateFeedback } from '@/lib/feedback';
import { NextResponse } from 'next/server';
import { loadConfig } from '@/ai/providers';

export async function POST(req: Request) {
  try {
    const { query, llmConfig: providedConfig } = await req.json();
    
    // Validações básicas
    if (!query?.trim()) {
      return NextResponse.json(
        { error: 'A pergunta é obrigatória' },
        { status: 400 }
      );
    }

    // Use as configurações fornecidas ou carregue do localStorage
    const llmConfig = providedConfig || loadConfig();
    
    if (!llmConfig?.apiKey) {
      return NextResponse.json(
        { error: 'Por favor, configure sua chave de API nas configurações primeiro.' },
        { status: 400 },
      );
    }

    console.log('Usando configuração:', {
      provider: llmConfig.provider,
      model: llmConfig.model,
      hasApiKey: !!llmConfig.apiKey
    });

    try {
      const questions = await generateFeedback({ query, llmConfig });
      return NextResponse.json(questions);
    } catch (error: any) {
      console.error('Erro ao gerar feedback:', error);

      // Tratamento específico para erros conhecidos
      if (error.message?.includes('No auth credentials found')) {
        return NextResponse.json(
          { error: 'Erro de autenticação. Por favor, verifique suas chaves de API.' },
          { status: 401 }
        );
      }

      if (error.message?.includes('Rate limit exceeded')) {
        return NextResponse.json(
          { 
            error: 'Limite de requisições excedido. Por favor, aguarde alguns segundos e tente novamente.' 
          },
          { status: 429 }
        );
      }

      if (error.message?.includes('No endpoints found') || error.message?.includes('provider routing')) {
        return NextResponse.json(
          { 
            error: 'O modelo selecionado não está disponível no momento. Por favor, tente novamente em alguns instantes ou selecione outro modelo.',
            retryable: true
          },
          { status: 503 }
        );
      }

      // Erros genéricos agora incluem flag de retry
      return NextResponse.json(
        { 
          error: error.message || 'Falha ao gerar feedback',
          retryable: true
        },
        { status: 500 }
      );
    }
  } catch (error: any) {
    console.error('Erro ao processar requisição:', error);
    return NextResponse.json(
      { 
        error: 'Erro ao processar a requisição',
        retryable: true
      },
      { status: 400 }
    );
  }
}
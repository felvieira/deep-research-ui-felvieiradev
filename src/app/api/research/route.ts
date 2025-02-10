import { deepResearch, writeFinalReport } from '@/lib/deep-research';
import { NextResponse } from 'next/server';
import crypto from 'crypto';
import { LLMConfig } from '@/ai/providers';

export async function POST(req: Request) {
  try {
    const { query, breadth, depth, followUpQuestions, answers, llmConfig } = await req.json();

    // Validações básicas
    if (!query?.trim()) {
      return NextResponse.json(
        { error: 'A pergunta de pesquisa é obrigatória' },
        { status: 400 }
      );
    }

    if (!llmConfig?.apiKey) {
      return NextResponse.json(
        { error: 'Chave da API não configurada' },
        { status: 400 }
      );
    }

    if (!llmConfig?.firecrawlKey) {
      return NextResponse.json(
        { error: 'Chave do Firecrawl não configurada' },
        { status: 400 }
      );
    }

    // Combine query with follow-up Q&A
    const combinedQuery = `
Initial Query: ${query}
Follow-up Questions and Answers:
${followUpQuestions.map((q: string, i: number) => `Q: ${q}\nA: ${answers[i]}`).join('\n')}
`;

    try {
      // Perform research
      const { learnings, visitedUrls } = await deepResearch({
        query: combinedQuery,
        breadth,
        depth,
        llmConfig,
      });

      // Generate report
      const report = await writeFinalReport({
        prompt: combinedQuery,
        learnings,
        visitedUrls,
        llmConfig,
      });

      // Generate unique ID for the report
      const reportId = crypto.randomBytes(16).toString('hex');

      return NextResponse.json({ reportId, report });
    } catch (error: any) {
      console.error('Error during research:', error);

      // Tratamento específico para erros conhecidos
      if (error.message?.includes('Rate limit exceeded')) {
        return NextResponse.json(
          { 
            error: 'Limite de requisições excedido. Por favor, aguarde alguns segundos e tente novamente.' 
          },
          { status: 429 }
        );
      }

      if (error.message?.includes('No auth credentials found')) {
        return NextResponse.json(
          { error: 'Erro de autenticação. Por favor, verifique suas chaves de API.' },
          { status: 401 }
        );
      }

      return NextResponse.json(
        { error: error.message || 'Erro ao realizar a pesquisa' },
        { status: 500 }
      );
    }
  } catch (error: any) {
    console.error('Error parsing request:', error);
    return NextResponse.json(
      { error: 'Erro ao processar a requisição' },
      { status: 400 }
    );
  }
} 
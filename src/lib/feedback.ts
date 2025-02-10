import { generateObject } from 'ai';
import { z } from 'zod';
import { getModel, LLMConfig } from '@/ai/providers';
import { systemPrompt } from './prompt';

function extractJSON(text: string): any {
  // Remove blocos de código markdown
  const jsonStr = text.replace(/```json\n|\n```|```/g, '');
  try {
    return JSON.parse(jsonStr);
  } catch (e) {
    console.error('Erro ao fazer parse do JSON:', e);
    throw e;
  }
}

export async function generateFeedback({
  query,
  numQuestions = 3,
  llmConfig,
}: {
  query: string;
  numQuestions?: number;
  llmConfig: LLMConfig;
}) {
  console.log('Configuração recebida:', { ...llmConfig, apiKey: llmConfig.apiKey ? '[PRESENTE]' : '[AUSENTE]' });
  
  if (!llmConfig?.apiKey) {
    console.error('API key não encontrada na configuração');
    throw new Error('API key é necessária para gerar feedback');
  }

  const model = getModel(llmConfig);
  
  try {
    console.log('Iniciando geração de feedback com modelo:', llmConfig.model);
    const response = await generateObject({
      model,
      system: systemPrompt(),
      prompt: `Dado o seguinte tópico de pesquisa do usuário, gere ${numQuestions} perguntas de acompanhamento para entender melhor o que ele quer pesquisar. IMPORTANTE: Retorne apenas o objeto JSON puro, sem formatação markdown ou código: <query>${query}</query>

Formato da resposta:
{
  "questions": [
    "Primeira pergunta aqui",
    "Segunda pergunta aqui",
    "Terceira pergunta aqui"
  ]
}`,
      schema: z.object({
        questions: z.array(z.string()).min(1).max(numQuestions),
      }),
    });

    // Se falhar o parse do schema, tenta extrair manualmente
    if (!response.object?.questions) {
      const parsed = extractJSON(response.text);
      if (parsed?.questions) {
        return parsed.questions;
      }
    }

    return response.object.questions;
  } catch (error) {
    console.error('Erro ao gerar feedback:', error);
    // Se der erro no generateObject, tenta extrair JSON da resposta bruta
    if (error.text) {
      try {
        const parsed = extractJSON(error.text);
        if (parsed?.questions) {
          return parsed.questions;
        }
      } catch (e) {
        console.error('Erro ao tentar extrair JSON:', e);
      }
    }
    throw error;
  }
}
  
import FirecrawlApp, { SearchResponse } from '@mendable/firecrawl-js';
import { generateObject } from 'ai';
import { compact } from 'lodash-es';
import pLimit from 'p-limit';
import { z } from 'zod';

import { getModel, LLMConfig } from '@/ai/providers';
import { systemPrompt } from './prompt';

type ResearchResult = {
  learnings: string[];
  visitedUrls: string[];
};

// increase this if you have higher API rate limits
const ConcurrencyLimit = 2;

const createFirecrawl = (firecrawlKey: string) => new FirecrawlApp({
  apiKey: firecrawlKey,
});

// Add token limits
const MAX_CONTENT_TOKENS = 150000; // Leave room for system prompt and response
const MAX_CONTENTS_PER_SEARCH = 3; // Limit number of search results processed

// take in user query, return a list of SERP queries
async function generateSerpQueries({
  query,
  numQueries = 3,
  learnings,
  llmConfig,
}: {
  query: string;
  numQueries?: number;
  learnings?: string[];
  llmConfig: LLMConfig;
}) {
  const model = getModel(llmConfig);
  
  const res = await generateObject({
    model,
    system: systemPrompt(),
    prompt: `Dado o seguinte tópico de pesquisa do usuário, gere ${numQueries} queries de busca para pesquisar o assunto. IMPORTANTE: Retorne apenas o objeto JSON puro, sem formatação markdown ou código: <query>${query}</query>

${learnings ? `Aqui estão alguns aprendizados da pesquisa anterior, use-os para gerar queries mais específicas: ${learnings.join('\n')}` : ''}

Formato da resposta:
{
  "queries": [
    {
      "query": "Primeira query de busca aqui",
      "researchGoal": "Objetivo desta busca e direções adicionais de pesquisa"
    }
  ]
}`,
    schema: z.object({
      queries: z.array(
        z.object({
          query: z.string().describe('A query de busca'),
          researchGoal: z.string().describe('Objetivo da pesquisa e direções adicionais'),
        }),
      ).min(1).max(numQueries),
    }),
  });

  return res.object.queries;
}

async function processSerpResult({
  query,
  result,
  numLearnings = 3,
  numFollowUpQuestions = 3,
  llmConfig,
}: {
  query: string;
  result: SearchResponse;
  numLearnings?: number;
  numFollowUpQuestions?: number;
  llmConfig: LLMConfig;
}) {
  const model = getModel(llmConfig);
  
  const contents = compact(result.data
    .slice(0, MAX_CONTENTS_PER_SEARCH)
    .map(item => item.markdown));
  
  let totalContent = contents.join('\n');
  if (totalContent.length > MAX_CONTENT_TOKENS) {
    totalContent = totalContent.slice(0, MAX_CONTENT_TOKENS) + '...';
  }

  const res = await generateObject({
    model,
    abortSignal: AbortSignal.timeout(60_000),
    system: systemPrompt(),
    prompt: `Dado o seguinte conteúdo de uma busca para a query <query>${query}</query>, gere uma lista de aprendizados. IMPORTANTE: Retorne apenas o objeto JSON puro, sem formatação markdown ou código.

<contents>${totalContent}</contents>

Formato da resposta (retorne exatamente ${numLearnings} learnings e ${numFollowUpQuestions} followUpQuestions):
{
  "learnings": [
    "Primeiro aprendizado aqui",
    "Segundo aprendizado aqui",
    "Terceiro aprendizado aqui"
  ],
  "followUpQuestions": [
    "Primeira pergunta de acompanhamento"
  ]
}`,
    schema: z.object({
      learnings: z.array(z.string()).length(numLearnings),
      followUpQuestions: z.array(z.string()).length(numFollowUpQuestions),
    }),
  });

  return res.object;
}

export interface DeepResearchParams {
  query: string;
  breadth: number;
  depth: number;
  learnings?: string[];
  visitedUrls?: string[];
  llmConfig: LLMConfig;
}

export interface WriteFinalReportParams {
  prompt: string;
  learnings: string[];
  visitedUrls: string[];
  llmConfig: LLMConfig;
}

export async function writeFinalReport({ prompt, learnings, visitedUrls, llmConfig }: WriteFinalReportParams) {
  const model = getModel(llmConfig);
  
  try {
    const res = await generateObject({
      model,
      system: systemPrompt(),
      prompt: `Escreva um relatório detalhado baseado nos aprendizados da pesquisa. IMPORTANTE: Retorne apenas o objeto JSON puro, sem formatação markdown ou código.

Prompt do usuário: "${prompt}"

Aprendizados da pesquisa:
${learnings.map((learning, i) => `${i + 1}. ${learning}`).join('\n')}

Formato da resposta (retorne exatamente neste formato):
{
  "reportMarkdown": "# Título do Relatório\\n\\n## Introdução\\n\\nTexto da introdução...\\n\\n## Desenvolvimento\\n\\nConteúdo principal...\\n\\n## Conclusão\\n\\nConsiderações finais..."
}`,
      schema: z.object({
        reportMarkdown: z.string().min(1),
      }),
    });

    // Adiciona a seção de fontes ao relatório
    const urlsSection = `\n\n## Fontes\n\n${visitedUrls.map(url => `- ${url}`).join('\n')}`;
    return res.object.reportMarkdown + urlsSection;

  } catch (err: any) {
    console.error('Erro ao gerar relatório:', err);
    
    // Tenta extrair o texto da resposta se disponível
    if (typeof err === 'object' && err !== null && 'text' in err) {
      try {
        // Se o texto parece ser markdown, retorna direto
        if (err.text.startsWith('#')) {
          return err.text + `\n\n## Fontes\n\n${visitedUrls.map(url => `- ${url}`).join('\n')}`;
        }
        
        // Tenta extrair JSON
        const match = err.text.match(/{[\s\S]*}/);
        if (match) {
          const json = JSON.parse(match[0]);
          if (json.reportMarkdown) {
            return json.reportMarkdown + `\n\n## Fontes\n\n${visitedUrls.map(url => `- ${url}`).join('\n')}`;
          }
        }
      } catch (e) {
        console.error('Erro ao tentar extrair relatório da resposta:', e);
      }
    }

    // Se todas as tentativas falharem, gera um relatório básico
    const basicReport = `# Relatório da Pesquisa

## Introdução

Este relatório apresenta os resultados da pesquisa sobre "${prompt}".

## Principais Descobertas

${learnings.map((learning, i) => `${i + 1}. ${learning}`).join('\n')}

## Fontes

${visitedUrls.map(url => `- ${url}`).join('\n')}`;

    return basicReport;
  }
}

async function searchAndSummarize({
  query,
  llmConfig,
}: {
  query: string;
  llmConfig: LLMConfig;
}): Promise<ResearchResult> {
  if (!llmConfig.firecrawlKey) {
    throw new Error('Firecrawl API key is required');
  }

  const model = getModel(llmConfig);
  const firecrawl = createFirecrawl(llmConfig.firecrawlKey);
  
  // Generate SERP queries
  const serpQueries = await generateSerpQueries({ query, llmConfig });
  
  // Search and process results in parallel with concurrency limit
  const limit = pLimit(ConcurrencyLimit);
  const searchPromises = serpQueries.queries.map((serpQuery) =>
    limit(async () => {
      try {
        const result = await firecrawl.search(serpQuery.query, {
          timeout: 15000,
          scrapeOptions: { formats: ['markdown'] },
        });

        const newUrls = compact(result.data.map(item => item.url));
        const newBreadth = Math.ceil(breadth / 2);
        const newDepth = depth - 1;

        const newLearnings = await processSerpResult({
          query: serpQuery.query,
          result,
          numFollowUpQuestions: newBreadth,
          llmConfig,
        });
        
        const allLearnings = [...learnings, ...newLearnings.learnings];
        const allUrls = [...visitedUrls, ...newUrls];

        if (newDepth > 0) {
          console.log(
            `Researching deeper, breadth: ${newBreadth}, depth: ${newDepth}`,
          );

          const nextQuery = `
            Previous research goal: ${serpQuery.researchGoal}
            Follow-up research directions: ${newLearnings.followUpQuestions.map(q => `\n${q}`).join('')}
          `.trim();

          return deepResearch({
            query: nextQuery,
            breadth: newBreadth,
            depth: newDepth,
            learnings: allLearnings,
            visitedUrls: allUrls,
            llmConfig,
          });
        } else {
          return {
            learnings: allLearnings,
            visitedUrls: allUrls,
          };
        }
      } catch (error) {
        console.error('Error searching:', error);
        return null;
      }
    })
  );

  const results = await Promise.all(searchPromises);
  const validResults = results.filter(result => result !== null) as ResearchResult[];

  return {
    learnings: [...new Set(validResults.flatMap(r => r.learnings))],
    visitedUrls: [...new Set(validResults.flatMap(r => r.visitedUrls))],
  };
}

export async function deepResearch({ 
  query, 
  breadth, 
  depth, 
  learnings = [], 
  visitedUrls = [],
  llmConfig 
}: DeepResearchParams): Promise<ResearchResult> {
  const serpQueries = await generateSerpQueries({
    query,
    learnings,
    numQueries: breadth,
    llmConfig,
  });
  
  const limit = pLimit(ConcurrencyLimit);

  const results = await Promise.all(
    serpQueries.map(serpQuery =>
      limit(async () => {
        try {
          const result = await createFirecrawl(process.env.FIRECRAWL_KEY!).search(serpQuery.query, {
            timeout: 15000,
            scrapeOptions: { formats: ['markdown'] },
          });

          const newUrls = compact(result.data.map(item => item.url));
          const newBreadth = Math.ceil(breadth / 2);
          const newDepth = depth - 1;

          const newLearnings = await processSerpResult({
            query: serpQuery.query,
            result,
            numFollowUpQuestions: newBreadth,
            llmConfig,
          });
          
          const allLearnings = [...learnings, ...newLearnings.learnings];
          const allUrls = [...visitedUrls, ...newUrls];

          if (newDepth > 0) {
            console.log(
              `Researching deeper, breadth: ${newBreadth}, depth: ${newDepth}`,
            );

            const nextQuery = `
              Previous research goal: ${serpQuery.researchGoal}
              Follow-up research directions: ${newLearnings.followUpQuestions.map(q => `\n${q}`).join('')}
            `.trim();

            return deepResearch({
              query: nextQuery,
              breadth: newBreadth,
              depth: newDepth,
              learnings: allLearnings,
              visitedUrls: allUrls,
              llmConfig,
            });
          } else {
            return {
              learnings: allLearnings,
              visitedUrls: allUrls,
            };
          }
        } catch (e) {
          console.error(`Error running query: ${serpQuery.query}: `, e);
          return {
            learnings: [],
            visitedUrls: [],
          };
        }
      }),
    ),
  );

  return {
    learnings: [...new Set(results.flatMap(r => r.learnings))],
    visitedUrls: [...new Set(results.flatMap(r => r.visitedUrls))],
  };
}
  
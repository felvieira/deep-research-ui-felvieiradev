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

interface SerpQuery {
  query: string;
  researchGoal?: string;
}

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
}): Promise<SerpQuery[]> {
  const model = await getModel(llmConfig);

  const schema = z.object({
    queries: z.array(z.object({
      query: z.string(),
      researchGoal: z.string().optional()
    }))
  });
  
  const res = await generateObject({
    model,
    schema,
    prompt: `Dado o seguinte tópico de pesquisa do usuário, gere ${numQueries} queries de busca para pesquisar o assunto. IMPORTANTE: Retorne apenas o objeto JSON puro, sem formatação markdown ou código: <query>${query}</query>

${learnings ? `Aqui estão alguns aprendizados da pesquisa anterior, use-os para gerar queries mais específicas: ${learnings.join('\n')}` : ''}`
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
  const model = await getModel(llmConfig);
  
  const contents = compact(result.data
    .slice(0, MAX_CONTENTS_PER_SEARCH)
    .map(item => item.markdown));
  
  let totalContent = contents.join('\n');
  if (totalContent.length > MAX_CONTENT_TOKENS) {
    totalContent = totalContent.slice(0, MAX_CONTENT_TOKENS) + '...';
  }

  const schema = z.object({
    learnings: z.array(z.string()).length(numLearnings),
    followUpQuestions: z.array(z.string()).length(numFollowUpQuestions),
  });

  const res = await generateObject({
    model,
    schema,
    system: systemPrompt(),
    prompt: `Dado o seguinte conteúdo de uma busca para a query <query>${query}</query>, gere uma lista de aprendizados. IMPORTANTE: Retorne apenas o objeto JSON puro, sem formatação markdown ou código.

<contents>${totalContent}</contents>`,
    temperature: 0.7,
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
  const model = await getModel(llmConfig);
  
  try {
    const schema = z.object({
      reportMarkdown: z.string().min(1),
    });

    const res = await generateObject({
      model,
      schema,
      system: systemPrompt(),
      prompt: `Escreva um relatório detalhado baseado nos aprendizados da pesquisa. IMPORTANTE: Retorne apenas o objeto JSON puro, sem formatação markdown ou código.

Prompt do usuário: "${prompt}"

Aprendizados da pesquisa:
${learnings.map((learning, i) => `${i + 1}. ${learning}`).join('\n')}`,
      temperature: 0.7,
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
  breadth = 3,
  depth = 2,
  learnings = [],
  visitedUrls = []
}: {
  query: string;
  llmConfig: LLMConfig;
  breadth?: number;
  depth?: number;
  learnings?: string[];
  visitedUrls?: string[];
}): Promise<ResearchResult> {
  if (!llmConfig.firecrawlKey) {
    throw new Error('Firecrawl API key is required');
  }

  const model = await getModel(llmConfig);
  const firecrawl = createFirecrawl(llmConfig.firecrawlKey);
  
  // Generate SERP queries
  const serpQueries = await generateSerpQueries({ query, llmConfig });
  
  // Search and process results in parallel with concurrency limit
  const limit = pLimit(ConcurrencyLimit);
  const searchPromises = serpQueries.map((serpQuery) =>
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
            Previous research goal: ${serpQuery.researchGoal || 'Not specified'}
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
          if (!llmConfig.firecrawlKey) {
            throw new Error('Firecrawl API key is required');
          }

          const result = await createFirecrawl(llmConfig.firecrawlKey).search(serpQuery.query, {
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
              Previous research goal: ${serpQuery.researchGoal || 'Not specified'}
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
  
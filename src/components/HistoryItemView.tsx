import { useState } from 'react';
import { ResearchHistoryItem } from './ResearchHistory';
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Markdown } from '@/components/Markdown';
import { Terminal, Copy, Check, Bold, Italic, List, ListOrdered, Link, Code } from 'lucide-react';

interface HistoryItemViewProps {
  historyItem: ResearchHistoryItem;
}

export function HistoryItemView({ historyItem }: HistoryItemViewProps) {
  const [copyStatus, setCopyStatus] = useState<{[key: string]: boolean}>({});
  const [markdownContent, setMarkdownContent] = useState(historyItem.report);

  const handleCopy = async (text: string, section: string) => {
    await navigator.clipboard.writeText(text);
    setCopyStatus(prev => ({ ...prev, [section]: true }));
    setTimeout(() => {
      setCopyStatus(prev => ({ ...prev, [section]: false }));
    }, 2000);
  };

  return (
    <div className="space-y-6">
      {/* Detalhes da Pesquisa */}
      <Card className="bg-white/80 dark:bg-slate-900/80 backdrop-blur-sm border-slate-200 dark:border-slate-800 p-8 rounded-xl shadow-xl">
        <h1 className="text-2xl font-semibold text-slate-900 dark:text-slate-100 mb-6">
          Detalhes da Pesquisa
        </h1>

        <div className="space-y-6">
          {/* Pergunta Principal */}
          <div>
            <h2 className="text-lg font-medium text-slate-900 dark:text-slate-100 mb-2">
              Pergunta Principal
            </h2>
            <p className="text-slate-700 dark:text-slate-300">
              {historyItem.query}
            </p>
          </div>

          {/* Configurações */}
          <div className="grid grid-cols-2 gap-6">
            <div>
              <h2 className="text-lg font-medium text-slate-900 dark:text-slate-100 mb-2">
                Amplitude da Pesquisa
              </h2>
              <p className="text-slate-700 dark:text-slate-300">
                {historyItem.breadth}
              </p>
            </div>
            <div>
              <h2 className="text-lg font-medium text-slate-900 dark:text-slate-100 mb-2">
                Profundidade da Pesquisa
              </h2>
              <p className="text-slate-700 dark:text-slate-300">
                {historyItem.depth}
              </p>
            </div>
          </div>

          {/* Perguntas de Acompanhamento */}
          <div>
            <h2 className="text-lg font-medium text-slate-900 dark:text-slate-100 mb-2">
              Perguntas de Acompanhamento
            </h2>
            <div className="space-y-4">
              {historyItem.followUpQuestions.map((question, index) => (
                <div key={index} className="bg-slate-50 dark:bg-slate-800 rounded-lg p-4">
                  <p className="font-medium text-slate-900 dark:text-slate-100 mb-2">
                    {index + 1}. {question}
                  </p>
                  <p className="text-slate-700 dark:text-slate-300">
                    {historyItem.answers[index]}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </Card>

      {/* Relatório Final */}
      <Card className="bg-white/80 dark:bg-slate-900/80 backdrop-blur-sm border-slate-200 dark:border-slate-800 p-8 rounded-xl shadow-xl">
        <div className="flex items-center justify-between gap-3 mb-8">
          <div className="flex items-center gap-3">
            <Terminal className="w-6 h-6 text-slate-900 dark:text-slate-100" />
            <h2 className="text-2xl font-semibold text-slate-900 dark:text-slate-100">Relatório Final</h2>
          </div>
          <div className="flex items-center gap-2">
            <Button
              onClick={() => handleCopy(historyItem.report, 'full')}
              variant="outline"
              className="border-slate-900 text-slate-900 hover:bg-slate-100 dark:border-slate-200 dark:text-slate-200 dark:hover:bg-slate-800"
            >
              {copyStatus['full'] ? (
                <Check className="w-4 h-4" />
              ) : (
                <Copy className="w-4 h-4" />
              )}
              <span>{copyStatus['full'] ? 'Copiado!' : 'Copiar Relatório'}</span>
            </Button>
          </div>
        </div>

        <div className="flex gap-6">
          {/* Conteúdo do Relatório */}
          <div className="flex-1 prose prose-slate dark:prose-invert max-w-none overflow-y-auto max-h-[calc(100vh-300px)]">
            <div className="bg-slate-50/50 dark:bg-slate-800/50 rounded-lg p-6 border border-slate-200/20 dark:border-slate-700/20">
              <Markdown content={historyItem.report} />
            </div>

            {historyItem.report && historyItem.report.includes('## Sources') && (
              <div className="mt-8 pt-6 border-t border-slate-200 dark:border-slate-800">
                <div className="flex items-center justify-between gap-3 mb-4">
                  <h3 className="text-lg font-medium text-slate-900 dark:text-slate-100">Lista de Fontes</h3>
                  <Button
                    onClick={() => handleCopy(
                      historyItem.report.split('## Sources')[1].trim(),
                      'sources'
                    )}
                    variant="outline"
                    size="sm"
                    className="border-slate-900 text-slate-900 hover:bg-slate-100 dark:border-slate-200 dark:text-slate-200 dark:hover:bg-slate-800"
                  >
                    {copyStatus['sources'] ? (
                      <Check className="w-4 h-4" />
                    ) : (
                      <Copy className="w-4 h-4" />
                    )}
                    <span>{copyStatus['sources'] ? 'Copiado!' : 'Copiar Fontes'}</span>
                  </Button>
                </div>
                <div className="bg-slate-50/50 dark:bg-slate-800/50 rounded-lg p-4 border border-slate-200/20 dark:border-slate-700/20">
                  <Markdown content={`## Sources${historyItem.report.split('## Sources')[1]}`} />
                </div>
              </div>
            )}
          </div>

          {/* Editor do Relatório */}
          <div className="w-1/2 border-l border-slate-200 dark:border-slate-800 pl-6">
            <div className="flex items-center gap-2 mb-4">
              <Button variant="ghost" size="sm" className="text-slate-900 dark:text-slate-100">
                <Bold size={18} />
              </Button>
              <Button variant="ghost" size="sm" className="text-slate-900 dark:text-slate-100">
                <Italic size={18} />
              </Button>
              <div className="h-6 w-px bg-slate-200 dark:bg-slate-700 mx-2" />
              <Button variant="ghost" size="sm" className="text-slate-900 dark:text-slate-100">
                <List size={18} />
              </Button>
              <Button variant="ghost" size="sm" className="text-slate-900 dark:text-slate-100">
                <ListOrdered size={18} />
              </Button>
              <div className="h-6 w-px bg-slate-200 dark:bg-slate-700 mx-2" />
              <Button variant="ghost" size="sm" className="text-slate-900 dark:text-slate-100">
                <Link size={18} />
              </Button>
              <Button variant="ghost" size="sm" className="text-slate-900 dark:text-slate-100">
                <Code size={18} />
              </Button>
            </div>
            <textarea
              value={markdownContent}
              onChange={(e) => setMarkdownContent(e.target.value)}
              className="w-full h-[calc(100vh-300px)] p-4 bg-slate-50/50 dark:bg-slate-800/50 rounded-lg border border-slate-200/20 dark:border-slate-700/20 resize-none focus:outline-none focus:ring-2 focus:ring-slate-500"
            />
          </div>
        </div>
      </Card>
    </div>
  );
}

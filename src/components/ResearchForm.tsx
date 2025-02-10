'use client';

import { useState, useEffect } from 'react';
import { Terminal, Copy, Check, FileDown, Bold, Italic, List, ListOrdered, Link, Code } from 'lucide-react';
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import { CircularProgress } from "@/components/ui/circular-progress";
import { Markdown } from '@/components/Markdown';
import { LLMConfig as LLMConfigType } from '@/ai/providers';
import { loadConfig } from '@/ai/providers';

type ResearchStatus = {
  stage:
    | 'idle'
    | 'collecting-feedback'
    | 'researching'
    | 'writing-report'
    | 'complete';
  message?: string;
  progress?: {
    current: number;
    total: number;
  };
  currentTask?: string;
  error?: string | null;
};

interface ResearchFormProps {
  onReportGenerated: (report: string) => void;
  llmConfig: LLMConfigType;
  initialQuery?: string;
  initialFollowUpQuestions?: string[];
  initialAnswers?: string[];
  initialReport?: string | null;
}

export function ResearchForm({ 
  onReportGenerated, 
  llmConfig,
  initialQuery = '',
  initialFollowUpQuestions = [],
  initialAnswers = [],
  initialReport = null,
}: ResearchFormProps) {
  
  const [query, setQuery] = useState(initialQuery);
  const [breadth, setBreadth] = useState('2');
  const [depth, setDepth] = useState('4');
  const [status, setStatus] = useState<ResearchStatus>({ 
    stage: initialReport ? 'complete' : 'idle' 
  });
  const [followUpQuestions, setFollowUpQuestions] = useState<string[]>(initialFollowUpQuestions);
  const [answers, setAnswers] = useState<string[]>(initialAnswers);
  const [report, setReport] = useState<string | null>(initialReport);
  const [copyStatus, setCopyStatus] = useState<{[key: string]: boolean}>({});
  const [html2pdfInstance, setHtml2pdfInstance] = useState<any>(null);
  const [markdownContent, setMarkdownContent] = useState('');

  // Load html2pdf only on client side
  useEffect(() => {
    const loadHtml2Pdf = async () => {
      const html2pdfModule = await import('html2pdf.js');
      setHtml2pdfInstance(html2pdfModule.default);
    };
    loadHtml2Pdf();
  }, []);

  useEffect(() => {
    if (initialQuery) setQuery(initialQuery);
    if (initialFollowUpQuestions) setFollowUpQuestions(initialFollowUpQuestions);
    if (initialAnswers) setAnswers(initialAnswers);
    if (initialReport) {
      setReport(initialReport);
      setStatus({ stage: 'complete' });
    }
  }, [initialQuery, initialFollowUpQuestions, initialAnswers, initialReport]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      setStatus({ 
        stage: 'collecting-feedback',
        message: 'Gerando perguntas de acompanhamento...' 
      });
      
      const feedbackRes = await fetch('/api/feedback', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query, llmConfig }),
      });
      
      const questions = await feedbackRes.json();
      setFollowUpQuestions(questions);
      
      setStatus({ 
        stage: 'collecting-feedback',
        message: 'Por favor, responda estas perguntas para ajudar a focar sua pesquisa.' 
      });
      
    } catch (error) {
      console.error('Error:', error);
      setStatus({ 
        stage: 'idle',
        message: 'Ocorreu um erro. Por favor, tente novamente.' 
      });
    }
  };

  const handleCopy = async (text: string, section: string) => {
    await navigator.clipboard.writeText(text);
    setCopyStatus(prev => ({ ...prev, [section]: true }));
    setTimeout(() => {
      setCopyStatus(prev => ({ ...prev, [section]: false }));
    }, 2000);
  };

  const handleAnswerSubmit = async () => {
    try {
      setStatus({ 
        stage: 'researching',
        message: 'Pesquisa em andamento...' 
      });

      const researchRes = await fetch('/api/research', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          query,
          breadth: parseInt(breadth),
          depth: parseInt(depth),
          followUpQuestions,
          answers,
          llmConfig,
        }),
      });

      const { report } = await researchRes.json();
      setReport(report);
      setStatus({ stage: 'complete' });
      
      // Salvar no histórico
      const historyItem = {
        id: Date.now().toString(),
        query,
        timestamp: Date.now(),
        followUpQuestions,
        answers,
        preview: report.split('\n\n')[0].slice(0, 200) + '...',
        report,
        llmConfig: {
          provider: llmConfig.provider,
          model: llmConfig.model,
          temperature: llmConfig.temperature || 0.7,
          maxTokens: llmConfig.maxTokens || 4000,
        },
        breadth: parseInt(breadth),
        depth: parseInt(depth),
      };

      const savedHistory = localStorage.getItem('research_history');
      const history = savedHistory ? JSON.parse(savedHistory) : [];
      history.unshift(historyItem);
      localStorage.setItem('research_history', JSON.stringify(history.slice(0, 50))); // Manter apenas as últimas 50 pesquisas
      
      onReportGenerated(report);
    } catch (error) {
      console.error('Error:', error);
      setStatus({
        stage: 'idle',
        message: 'Ocorreu um erro. Por favor, tente novamente.',
      });
    }
  };

  const handleExportPDF = async () => {
    if (!html2pdfInstance) return;
    
    const reportContent = document.createElement('div');
    
    const formattedReport = report?.replace(/\n\n/g, '<br/><br/>')
      .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
      .replace(/\*(.*?)\*/g, '<em>$1</em>')
      .replace(/^# (.*$)/gm, '<h1>$1</h1>')
      .replace(/^## (.*$)/gm, '<h2>$1</h2>')
      .replace(/^### (.*$)/gm, '<h3>$1</h3>')
      .replace(/^\* (.*$)/gm, '<li>$1</li>')
      .replace(/<li>/g, '<ul><li>').replace(/<\/li>\n/g, '</li></ul>')
      .replace(/\[(.*?)\]\((.*?)\)/g, '<a href="$2">$1</a>');

    reportContent.innerHTML = `
      <div style="
        font-family: system-ui, -apple-system, sans-serif;
        padding: 40px;
        color: #1a1a1a;
        line-height: 1.6;
        font-size: 14px;
      ">
        <style>
          h1 {
            color: #047857;
            font-size: 24px;
            margin-bottom: 16px;
            font-weight: bold;
            border-bottom: 2px solid #047857;
            padding-bottom: 8px;
          }
          h2 {
            color: #047857;
            font-size: 20px;
            margin-top: 24px;
            margin-bottom: 12px;
            font-weight: bold;
          }
          h3 {
            color: #047857;
            font-size: 16px;
            margin-top: 20px;
            margin-bottom: 10px;
            font-weight: bold;
          }
          p {
            margin-bottom: 12px;
            text-align: justify;
          }
          ul {
            margin-bottom: 12px;
            padding-left: 20px;
          }
          li {
            margin-bottom: 6px;
          }
          a {
            color: #047857;
            text-decoration: none;
          }
          .sources {
            margin-top: 24px;
            padding-top: 16px;
            border-top: 2px solid #047857;
          }
          .sources li {
            word-break: break-all;
            font-size: 12px;
            color: #404040;
          }
        </style>
        ${formattedReport}
      </div>
    `;

    const opt = {
      margin: [15, 15],
      filename: 'research-report.pdf',
      image: { type: 'jpeg', quality: 1 },
      html2canvas: { 
        scale: 2,
        useCORS: true,
        logging: false,
        letterRendering: true,
      },
      jsPDF: { 
        unit: 'mm', 
        format: 'a4', 
        orientation: 'portrait',
        compress: true,
        precision: 16
      }
    };

    try {
      await html2pdfInstance().set(opt).from(reportContent).save();
    } catch (error) {
      console.error('Error generating PDF:', error);
    }
  };

  const handleReset = () => {
    const isConfirmed = window.confirm(
      "Are you sure? This will clear the current research progress."
    )

    if (isConfirmed) {
      window.location.reload();
    }
  }

  const handleRestoreHistory = (historyItem: any) => {
    setQuery(historyItem.query);
    setBreadth(historyItem.breadth.toString());
    setDepth(historyItem.depth.toString());
    setFollowUpQuestions(historyItem.followUpQuestions);
    setAnswers(historyItem.answers);
    setReport(historyItem.report);
    setStatus({ stage: 'complete' });
    
    // Notify parent component about the restored report
    onReportGenerated(historyItem.report);
  };

  return (
    <div className="space-y-8">
      <Card className="bg-white/80 dark:bg-slate-900/80 backdrop-blur-sm border-slate-200 dark:border-slate-800 p-8 rounded-xl shadow-xl">
        <div className="flex items-center gap-3 mb-8">
          <h2 className="text-2xl font-semibold text-slate-900 dark:text-slate-100">Sua Pergunta</h2>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="space-y-2">
            <label className="block text-sm font-medium text-slate-900 dark:text-slate-200">
              O que você gostaria de descobrir?
            </label>
            <Input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Digite sua pergunta aqui..."
              required
              className="border-slate-200 dark:border-slate-800 focus:ring-slate-500"
            />
          </div>

          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-slate-900 dark:text-slate-200 mb-2">
                Amplitude da Pesquisa: {breadth}
              </label>
              <Slider
                value={[parseInt(breadth)]}
                onValueChange={(value) => setBreadth(value[0].toString())}
                min={1}
                max={5}
                step={1}
                className="[&>span:nth-child(2)]:bg-slate-900 [&>span:nth-child(2)]:dark:bg-slate-200 [&>span:first-child]:bg-slate-200 [&>span:first-child]:dark:bg-slate-700"
              />
              <p className="text-xs text-slate-600 dark:text-slate-400 mt-1">
                Controla quantas fontes diferentes serão consultadas
              </p>
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-900 dark:text-slate-200 mb-2">
                Profundidade da Pesquisa: {depth}
              </label>
              <Slider
                value={[parseInt(depth)]}
                onValueChange={(value) => setDepth(value[0].toString())}
                min={1}
                max={10}
                step={1}
                className="[&>span:nth-child(2)]:bg-slate-900 [&>span:nth-child(2)]:dark:bg-slate-200 [&>span:first-child]:bg-slate-200 [&>span:first-child]:dark:bg-slate-700"
              />
              <p className="text-xs text-slate-600 dark:text-slate-400 mt-1">
                Controla o nível de detalhamento da análise
              </p>
            </div>
          </div>

          <Button
            type="submit"
            className="w-full bg-slate-900 hover:bg-slate-800 dark:bg-slate-200 dark:hover:bg-slate-300 dark:text-slate-900"
            disabled={status.stage !== 'idle'}
          >
            Iniciar Pesquisa
          </Button>
        </form>

        {status.message && (
          <div className="mt-6">
            {(status.stage === 'researching' || 
              (status.stage === 'collecting-feedback' && followUpQuestions.length === 0)) ? (
              <div className="flex flex-col items-center justify-center gap-4">
                <CircularProgress message={status.message} />
              </div>
            ) : (
              <>
                <p className="text-slate-900 dark:text-slate-200">{status.message}</p>
                {status.progress && (
                  <div className="mt-2">
                    <div className="h-2 bg-slate-200 dark:bg-slate-700 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-slate-900 dark:bg-slate-200 transition-all duration-500 rounded-full"
                        style={{
                          width: `${(status.progress.current / status.progress.total) * 100}%`,
                        }}
                      />
                    </div>
                  </div>
                )}
              </>
            )}
          </div>
        )}

        {followUpQuestions.length > 0 && status.stage === 'collecting-feedback' && (
          <div className="mt-8 space-y-6 border-t border-slate-200 dark:border-slate-800 pt-6">
            <h3 className="text-lg font-medium text-slate-900 dark:text-slate-100">Perguntas Adicionais</h3>
            {followUpQuestions.map((question, index) => (
              <div key={index} className="space-y-2">
                <p className="text-slate-900 dark:text-slate-200 font-medium">
                  {index + 1}. {question}
                </p>
                <Input
                  value={answers[index] || ''}
                  onChange={(e) => {
                    const newAnswers = [...answers];
                    newAnswers[index] = e.target.value;
                    setAnswers(newAnswers);
                  }}
                  placeholder="Sua resposta aqui..."
                  className="w-full bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-900 dark:text-slate-100"
                />
              </div>
            ))}
            <Button
              onClick={handleAnswerSubmit}
              disabled={answers.length !== followUpQuestions.length || answers.some(a => !a.trim())}
              className="w-full bg-slate-900 hover:bg-slate-800 dark:bg-slate-200 dark:hover:bg-slate-300 dark:text-slate-900 font-medium"
            >
              Continuar Pesquisa
            </Button>
          </div>
        )}
      </Card>

      {report && (
        <Card className="bg-white/80 dark:bg-slate-900/80 backdrop-blur-sm border-slate-200 dark:border-slate-800 p-8 rounded-xl shadow-xl">
          <div className="flex items-center justify-between gap-3 mb-8">
            <div className="flex items-center gap-3">
              <Terminal className="w-6 h-6 text-slate-900 dark:text-slate-100" />
              <h2 className="text-2xl font-semibold text-slate-900 dark:text-slate-100">Relatório Final</h2>
            </div>
            <div className="flex items-center gap-2">
              <Button
                onClick={() => handleCopy(report, 'full')}
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
                <Markdown content={report} />
              </div>

              {report.includes('## Sources') && (
                <div className="mt-8 pt-6 border-t border-slate-200 dark:border-slate-800">
                  <div className="flex items-center justify-between gap-3 mb-4">
                    <h3 className="text-lg font-medium text-slate-900 dark:text-slate-100">Lista de Fontes</h3>
                    <Button
                      onClick={() => handleCopy(
                        report.split('## Sources')[1].trim(),
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
                    <Markdown content={`## Sources${report.split('## Sources')[1]}`} />
                  </div>
                </div>
              )}
            </div>

            {/* Editor do Relatório */}
            <div className="w-1/2 border-l border-slate-200 dark:border-slate-800">
              <div className="flex items-center gap-2 mb-4 p-4 border-b border-slate-200 dark:border-slate-800">
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
              <div className="p-4">
                <textarea
                  value={markdownContent}
                  onChange={(e) => setMarkdownContent(e.target.value)}
                  className="w-full h-[calc(100vh-450px)] bg-transparent border-0 focus:ring-0 resize-none text-slate-900 dark:text-slate-100"
                  placeholder="Edite o relatório em markdown..."
                />
              </div>
            </div>
          </div>
        </Card>
      )}
    </div>
  );
} 

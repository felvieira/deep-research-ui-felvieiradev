import { useState, useEffect } from 'react';
import { Clock, Search } from 'lucide-react';
import { HistoryItemView } from './HistoryItemView';

export type ResearchHistoryItem = {
  id: string;
  query: string;
  timestamp: number;
  followUpQuestions: string[];
  answers: string[];
  preview: string;
  report: string;
  llmConfig: {
    provider: string;
    model: string;
    temperature: number;
    maxTokens: number;
  };
  breadth: number;
  depth: number;
};

interface ResearchHistoryProps {
  onSelectHistory: (item: ResearchHistoryItem) => void;
}

function getTimeAgo(timestamp: number) {
  const seconds = Math.floor((Date.now() - timestamp) / 1000);
  
  const intervals = {
    ano: 31536000,
    mês: 2592000,
    semana: 604800,
    dia: 86400,
    hora: 3600,
    minuto: 60
  };

  for (const [unit, secondsInUnit] of Object.entries(intervals)) {
    const interval = Math.floor(seconds / secondsInUnit);
    
    if (interval >= 1) {
      return `há ${interval} ${unit}${interval > 1 ? (unit === 'mês' ? 'es' : 's') : ''}`;
    }
  }
  
  return 'agora mesmo';
}

export function ResearchHistory({ onSelectHistory }: ResearchHistoryProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [history, setHistory] = useState<ResearchHistoryItem[]>([]);
  const [selectedItem, setSelectedItem] = useState<ResearchHistoryItem | null>(null);

  // Carregar histórico do localStorage
  useEffect(() => {
    const savedHistory = localStorage.getItem('research_history');
    if (savedHistory) {
      setHistory(JSON.parse(savedHistory));
    }
  }, []);

  // Filtrar histórico baseado na busca
  const filteredHistory = history.filter(item =>
    item.query.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleSelectItem = (item: ResearchHistoryItem) => {
    setSelectedItem(item);
  };

  return (
    <div className="flex gap-6 h-full">
      {/* Lista de Histórico */}
      <div className="w-80 space-y-4">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400 dark:text-slate-500" size={20} />
          <input
            type="text"
            placeholder="Buscar no histórico..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 focus:outline-none focus:ring-2 focus:ring-slate-500"
          />
        </div>

        <div className="space-y-2 overflow-y-auto max-h-[calc(100vh-200px)]">
          {filteredHistory.map((item) => (
            <button
              key={item.id}
              onClick={() => handleSelectItem(item)}
              className={`w-full p-4 text-left rounded-lg border transition-colors ${
                selectedItem?.id === item.id
                  ? 'border-slate-900 dark:border-slate-500 bg-slate-50 dark:bg-slate-800'
                  : 'border-slate-200 dark:border-slate-700 hover:border-slate-900 dark:hover:border-slate-500'
              }`}
            >
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1 space-y-1">
                  <h3 className="font-medium text-slate-900 dark:text-slate-100 line-clamp-2">
                    {item.query}
                  </h3>
                  <p className="text-sm text-slate-600 dark:text-slate-400 line-clamp-2">
                    {item.preview}
                  </p>
                </div>
                <div className="flex items-center text-xs text-slate-500 dark:text-slate-400">
                  <Clock size={14} className="mr-1" />
                  {getTimeAgo(item.timestamp)}
                </div>
              </div>
            </button>
          ))}

          {filteredHistory.length === 0 && (
            <div className="text-center py-8 text-slate-500 dark:text-slate-400">
              {searchQuery ? 'Nenhuma pesquisa encontrada' : 'Nenhuma pesquisa realizada ainda'}
            </div>
          )}
        </div>
      </div>

      {/* Visualização do Item Selecionado */}
      <div className="flex-1 overflow-y-auto">
        {selectedItem ? (
          <HistoryItemView historyItem={selectedItem} />
        ) : (
          <div className="h-full flex items-center justify-center text-slate-500 dark:text-slate-400">
            Selecione um item do histórico para visualizar
          </div>
        )}
      </div>
    </div>
  );
}
import { User, Database, Globe, FileText, TrendingUp, Newspaper, Landmark } from 'lucide-react';
import SaveAnswerButton from './SaveAnswerButton';
import { Badge } from '@/components/ui/badge';

interface Evidence {
  document?: string;
  page?: string;
  text?: string;
}

interface DataSource {
  type: 'rag' | 'stock' | 'gold' | 'news' | 'politics' | 'general';
  label: string;
}

interface ChatBubbleProps {
  role: 'user' | 'assistant';
  content: string;
  evidence?: Evidence[];
  confidence?: string;
  isLoading?: boolean;
  chatId?: string;
  messageId?: string;
  previousUserMessage?: string;
}

// Extract data sources from the response content
const extractDataSources = (content: string): DataSource[] => {
  const sources: DataSource[] = [];
  const lowerContent = content.toLowerCase();
  
  if (lowerContent.includes('uploaded documents') || lowerContent.includes('rag')) {
    sources.push({ type: 'rag', label: 'Documents' });
  }
  if (lowerContent.includes('stock market') || lowerContent.includes('live stock')) {
    sources.push({ type: 'stock', label: 'Stock Market' });
  }
  if (lowerContent.includes('gold price') || lowerContent.includes('live gold')) {
    sources.push({ type: 'gold', label: 'Gold Prices' });
  }
  if (lowerContent.includes('news api') || lowerContent.includes('latest news')) {
    sources.push({ type: 'news', label: 'News' });
  }
  if (lowerContent.includes('politics') || lowerContent.includes('political')) {
    sources.push({ type: 'politics', label: 'Politics' });
  }
  
  if (sources.length === 0) {
    sources.push({ type: 'general', label: 'AI Knowledge' });
  }
  
  return sources;
};

const getSourceIcon = (type: DataSource['type']) => {
  switch (type) {
    case 'rag':
      return <FileText className="w-3 h-3" />;
    case 'stock':
      return <TrendingUp className="w-3 h-3" />;
    case 'gold':
      return <Database className="w-3 h-3" />;
    case 'news':
      return <Newspaper className="w-3 h-3" />;
    case 'politics':
      return <Landmark className="w-3 h-3" />;
    default:
      return <Globe className="w-3 h-3" />;
  }
};

const getSourceColor = (type: DataSource['type']) => {
  switch (type) {
    case 'rag':
      return 'bg-blue-100 text-blue-700 border-blue-200';
    case 'stock':
      return 'bg-green-100 text-green-700 border-green-200';
    case 'gold':
      return 'bg-yellow-100 text-yellow-700 border-yellow-200';
    case 'news':
      return 'bg-purple-100 text-purple-700 border-purple-200';
    case 'politics':
      return 'bg-red-100 text-red-700 border-red-200';
    default:
      return 'bg-gray-100 text-gray-700 border-gray-200';
  }
};

const ChatBubble = ({ 
  role, 
  content, 
  evidence, 
  confidence, 
  isLoading = false,
  chatId,
  messageId,
  previousUserMessage,
}: ChatBubbleProps) => {
  if (role === 'user') {
    return (
      <div className="flex flex-col items-end animate-fade-in">
        <div className="flex items-center gap-2 mb-2">
          <div className="w-8 h-8 rounded-full bg-muted flex items-center justify-center">
            <User className="w-4 h-4 text-muted-foreground" />
          </div>
          <span className="text-sm text-foreground font-medium">You</span>
        </div>
        <div className="chat-bubble-user rounded-2xl rounded-tr-md px-4 py-3 max-w-[85%]">
          <p className="text-sm">{content}</p>
        </div>
      </div>
    );
  }

  const dataSources = content ? extractDataSources(content) : [];

  return (
    <div className="flex flex-col items-start animate-fade-in">
      <div className="flex items-center gap-2 mb-2">
        <div className="w-8 h-8 rounded-full bg-gradient-to-br from-primary to-accent flex items-center justify-center">
          <span className="text-xs font-bold text-white">FS</span>
        </div>
        <span className="text-sm text-foreground font-medium">FS Hybrid</span>
      </div>
      <div className="chat-bubble-assistant rounded-2xl rounded-tl-md px-4 py-4 max-w-[85%]">
        {isLoading ? (
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 bg-gray-400 rounded-full animate-pulse" />
            <div className="w-2 h-2 bg-gray-400 rounded-full animate-pulse" style={{ animationDelay: '150ms' }} />
            <div className="w-2 h-2 bg-gray-400 rounded-full animate-pulse" style={{ animationDelay: '300ms' }} />
          </div>
        ) : (
          <div className="space-y-3">
            {/* Data Source Badges */}
            {dataSources.length > 0 && (
              <div className="flex flex-wrap gap-1.5 mb-2">
                {dataSources.map((source, idx) => (
                  <Badge 
                    key={idx} 
                    variant="outline"
                    className={`text-xs px-2 py-0.5 flex items-center gap-1 ${getSourceColor(source.type)}`}
                  >
                    {getSourceIcon(source.type)}
                    {source.label}
                  </Badge>
                ))}
              </div>
            )}
            
            <div className="text-sm text-gray-700 whitespace-pre-wrap">{content}</div>
            
            {evidence && evidence.length > 0 && (
              <div className="border-t border-gray-200 pt-3 mt-3">
                <p className="text-xs font-semibold text-gray-600 mb-2">📄 Document Evidence:</p>
                {evidence.map((e, idx) => (
                  <div key={idx} className="text-xs text-gray-500 mb-1">
                    {e.document && <span>• Document: {e.document}</span>}
                    {e.page && <span> | Page: {e.page}</span>}
                    {e.text && <p className="ml-2 italic">"{e.text}"</p>}
                  </div>
                ))}
              </div>
            )}
            
            {confidence && (
              <div className="text-xs text-gray-500">
                <span className="font-medium">Confidence:</span> {confidence}
              </div>
            )}

            {/* Save button */}
            {content && previousUserMessage && (
              <div className="flex justify-end pt-2 border-t border-gray-100 mt-2">
                <SaveAnswerButton
                  question={previousUserMessage}
                  answer={content}
                  sourceInfo={{ evidence, confidence }}
                  chatId={chatId}
                  messageId={messageId}
                />
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default ChatBubble;

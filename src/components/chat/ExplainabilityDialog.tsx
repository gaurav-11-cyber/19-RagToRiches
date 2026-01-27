import { useState } from 'react';
import { HelpCircle, FileText, Database, Globe, TrendingUp, Newspaper, Landmark, Lightbulb, ChevronDown, ChevronUp } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';

interface Evidence {
  document?: string;
  page?: string;
  text?: string;
}

interface DataSource {
  type: 'rag' | 'stock' | 'gold' | 'news' | 'politics' | 'general';
  label: string;
}

interface ExplainabilityDialogProps {
  content: string;
  evidence?: Evidence[];
  confidence?: string;
  dataSources: DataSource[];
}

const getSourceIcon = (type: DataSource['type']) => {
  switch (type) {
    case 'rag':
      return <FileText className="w-4 h-4" />;
    case 'stock':
      return <TrendingUp className="w-4 h-4" />;
    case 'gold':
      return <Database className="w-4 h-4" />;
    case 'news':
      return <Newspaper className="w-4 h-4" />;
    case 'politics':
      return <Landmark className="w-4 h-4" />;
    default:
      return <Globe className="w-4 h-4" />;
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

const getSourceDescription = (type: DataSource['type']) => {
  switch (type) {
    case 'rag':
      return 'Information retrieved from your uploaded documents using semantic search.';
    case 'stock':
      return 'Real-time stock market data fetched from live financial APIs.';
    case 'gold':
      return 'Current gold prices obtained from commodity price APIs.';
    case 'news':
      return 'Latest news articles aggregated from trusted news sources.';
    case 'politics':
      return 'Political updates gathered from news outlets and official sources.';
    default:
      return 'General knowledge from the AI model\'s training data.';
  }
};

const ExplainabilityDialog = ({ content, evidence, confidence, dataSources }: ExplainabilityDialogProps) => {
  const [expandedEvidence, setExpandedEvidence] = useState<number | null>(null);

  const getConfidenceExplanation = (conf?: string) => {
    switch (conf?.toLowerCase()) {
      case 'high':
        return 'The AI found strong, direct evidence supporting this answer from the data sources.';
      case 'medium':
        return 'The AI found relevant information but some aspects required inference or synthesis.';
      case 'low':
        return 'Limited direct evidence was found; the answer may include general knowledge or assumptions.';
      default:
        return 'Confidence level was not explicitly determined for this response.';
    }
  };

  const getConfidenceColor = (conf?: string) => {
    switch (conf?.toLowerCase()) {
      case 'high':
        return 'text-green-600 bg-green-50';
      case 'medium':
        return 'text-yellow-600 bg-yellow-50';
      case 'low':
        return 'text-red-600 bg-red-50';
      default:
        return 'text-gray-600 bg-gray-50';
    }
  };

  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button 
          variant="ghost" 
          size="sm" 
          className="text-xs text-muted-foreground hover:text-foreground gap-1.5 h-7 px-2"
        >
          <HelpCircle className="w-3.5 h-3.5" />
          Why this answer?
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-lg max-h-[80vh]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Lightbulb className="w-5 h-5 text-primary" />
            How this answer was generated
          </DialogTitle>
        </DialogHeader>
        
        <ScrollArea className="max-h-[60vh] pr-4">
          <div className="space-y-5">
            {/* Data Sources Section */}
            <div>
              <h4 className="text-sm font-semibold text-foreground mb-3 flex items-center gap-2">
                <Database className="w-4 h-4" />
                Data Sources Used
              </h4>
              <div className="space-y-2">
                {dataSources.map((source, idx) => (
                  <div 
                    key={idx} 
                    className="flex items-start gap-3 p-3 rounded-lg bg-muted/50 border border-border/50"
                  >
                    <div className={`p-2 rounded-md ${getSourceColor(source.type)}`}>
                      {getSourceIcon(source.type)}
                    </div>
                    <div className="flex-1">
                      <p className="font-medium text-sm text-foreground">{source.label}</p>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        {getSourceDescription(source.type)}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Evidence Section */}
            {evidence && evidence.length > 0 && (
              <div>
                <h4 className="text-sm font-semibold text-foreground mb-3 flex items-center gap-2">
                  <FileText className="w-4 h-4" />
                  Retrieved Evidence
                </h4>
                <div className="space-y-2">
                  {evidence.map((e, idx) => (
                    <div 
                      key={idx} 
                      className="border border-border/50 rounded-lg overflow-hidden"
                    >
                      <button
                        onClick={() => setExpandedEvidence(expandedEvidence === idx ? null : idx)}
                        className="w-full flex items-center justify-between p-3 bg-muted/30 hover:bg-muted/50 transition-colors"
                      >
                        <div className="flex items-center gap-2 text-left">
                          <Badge variant="outline" className="text-xs">
                            {e.document || 'Document'}
                          </Badge>
                          {e.page && (
                            <span className="text-xs text-muted-foreground">
                              Page/Section: {e.page}
                            </span>
                          )}
                        </div>
                        {expandedEvidence === idx ? (
                          <ChevronUp className="w-4 h-4 text-muted-foreground" />
                        ) : (
                          <ChevronDown className="w-4 h-4 text-muted-foreground" />
                        )}
                      </button>
                      {expandedEvidence === idx && e.text && (
                        <div className="p-3 bg-background border-t border-border/50">
                          <p className="text-sm text-muted-foreground italic">
                            "{e.text}"
                          </p>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Confidence Section */}
            <div>
              <h4 className="text-sm font-semibold text-foreground mb-3 flex items-center gap-2">
                <TrendingUp className="w-4 h-4" />
                Confidence Assessment
              </h4>
              <div className={`p-3 rounded-lg border ${getConfidenceColor(confidence)}`}>
                <div className="flex items-center gap-2 mb-1">
                  <span className="font-medium text-sm">
                    {confidence || 'Not specified'}
                  </span>
                </div>
                <p className="text-xs opacity-80">
                  {getConfidenceExplanation(confidence)}
                </p>
              </div>
            </div>

            {/* How It Works Section */}
            <div>
              <h4 className="text-sm font-semibold text-foreground mb-3 flex items-center gap-2">
                <Lightbulb className="w-4 h-4" />
                How It Works
              </h4>
              <div className="p-3 rounded-lg bg-primary/5 border border-primary/10">
                <ol className="text-xs text-muted-foreground space-y-2 list-decimal list-inside">
                  <li>Your question was analyzed to determine the type of information needed.</li>
                  <li>
                    {dataSources.some(s => s.type === 'rag') 
                      ? 'Relevant passages were retrieved from your uploaded documents using semantic search.'
                      : 'Real-time data was fetched from appropriate live APIs.'}
                  </li>
                  <li>The AI synthesized the information to generate a comprehensive response.</li>
                  <li>Evidence and sources were attached to ensure transparency.</li>
                </ol>
              </div>
            </div>
          </div>
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
};

export default ExplainabilityDialog;

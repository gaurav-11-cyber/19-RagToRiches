import { useState, useEffect } from 'react';
import { ArrowLeft, RefreshCw, ExternalLink, Clock, MapPin } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import BottomNav from '@/components/ui/bottom-nav';
import { supabase } from '@/integrations/supabase/client';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';

interface PoliticsArticle {
  title: string;
  description: string;
  source: string;
  url: string;
  publishedAt: string;
  region: string;
}

interface PoliticsData {
  articles: PoliticsArticle[];
  lastUpdated: string;
  source: 'live' | 'sample';
}

const Politics = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [data, setData] = useState<PoliticsData | null>(null);

  const fetchPolitics = async () => {
    setLoading(true);
    setError(null);
    
    try {
      const { data: response, error: fetchError } = await supabase.functions.invoke('politics');
      
      if (fetchError) throw fetchError;
      
      if (response?.success) {
        setData(response.data);
      } else {
        throw new Error(response?.error || 'Failed to fetch political news');
      }
    } catch (err) {
      console.error('Error fetching politics:', err);
      setError('Unable to fetch political updates. Please try again later.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPolitics();
  }, []);

  const formatDate = (dateString: string) => {
    try {
      return new Date(dateString).toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      });
    } catch {
      return dateString;
    }
  };

  const getRegionColor = (region: string) => {
    const colors: Record<string, string> = {
      UK: 'bg-blue-100 text-blue-700',
      US: 'bg-red-100 text-red-700',
      International: 'bg-purple-100 text-purple-700',
      National: 'bg-green-100 text-green-700',
      Local: 'bg-orange-100 text-orange-700',
    };
    return colors[region] || 'bg-gray-100 text-gray-700';
  };

  return (
    <div className="min-h-screen gradient-bg pb-24">
      <header className="px-6 pt-12 pb-6 flex items-center gap-4">
        <button 
          onClick={() => navigate(-1)}
          className="w-10 h-10 rounded-full glass-card flex items-center justify-center"
        >
          <ArrowLeft className="w-5 h-5 text-gray-600" />
        </button>
        <h1 className="text-xl font-bold text-foreground flex-1">Politics</h1>
        <Button
          variant="ghost"
          size="icon"
          onClick={fetchPolitics}
          disabled={loading}
          className="rounded-full"
        >
          <RefreshCw className={`w-5 h-5 ${loading ? 'animate-spin' : ''}`} />
        </Button>
      </header>

      <main className="px-6 space-y-4">
        {data && (
          <div className="flex items-center justify-between text-xs text-muted-foreground mb-2">
            <div className="flex items-center gap-1">
              <Clock className="w-3 h-3" />
              <span>Updated: {formatDate(data.lastUpdated)}</span>
            </div>
            <Badge variant={data.source === 'live' ? 'default' : 'secondary'} className="text-xs">
              {data.source === 'live' ? '🟢 Live' : '📋 Sample Data'}
            </Badge>
          </div>
        )}

        {loading ? (
          <div className="space-y-4">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="glass-card rounded-2xl p-4 space-y-3">
                <Skeleton className="h-5 w-3/4" />
                <Skeleton className="h-4 w-full" />
                <Skeleton className="h-4 w-1/2" />
              </div>
            ))}
          </div>
        ) : error ? (
          <div className="glass-card rounded-2xl p-6 text-center">
            <p className="text-destructive mb-4">{error}</p>
            <Button onClick={fetchPolitics} variant="outline">
              Try Again
            </Button>
          </div>
        ) : data?.articles && data.articles.length > 0 ? (
          <div className="space-y-4">
            {data.articles.map((article, index) => (
              <article
                key={index}
                className="glass-card rounded-2xl p-4 space-y-2 hover:shadow-lg transition-shadow"
              >
                <div className="flex items-start justify-between gap-2">
                  <h3 className="font-semibold text-foreground text-sm leading-tight flex-1">
                    {article.title}
                  </h3>
                  {article.url && article.url !== '#' && (
                    <a
                      href={article.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-primary hover:text-primary/80 shrink-0"
                    >
                      <ExternalLink className="w-4 h-4" />
                    </a>
                  )}
                </div>
                
                {article.description && (
                  <p className="text-xs text-muted-foreground line-clamp-2">
                    {article.description}
                  </p>
                )}
                
                <div className="flex items-center gap-2 pt-1">
                  <Badge variant="outline" className={`text-xs flex items-center gap-1 ${getRegionColor(article.region)}`}>
                    <MapPin className="w-3 h-3" />
                    {article.region}
                  </Badge>
                  <span className="text-xs text-muted-foreground">
                    {article.source}
                  </span>
                  <span className="text-xs text-muted-foreground ml-auto">
                    {formatDate(article.publishedAt)}
                  </span>
                </div>
              </article>
            ))}
          </div>
        ) : (
          <div className="glass-card rounded-2xl p-6">
            <p className="text-muted-foreground text-center">
              No political updates available at the moment.
            </p>
          </div>
        )}
      </main>

      <BottomNav />
    </div>
  );
};

export default Politics;

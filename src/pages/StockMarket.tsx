import { useEffect, useState } from 'react';
import { ArrowLeft, TrendingUp, TrendingDown, RefreshCw } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import BottomNav from '@/components/ui/bottom-nav';
import { Button } from '@/components/ui/button';

interface StockData {
  symbol: string;
  name: string;
  price: string;
  change: string;
  changePercent: string;
  isPositive: boolean;
  currency?: string;
}

interface MarketData {
  indices: StockData[];
  topGainers: StockData[];
  topLosers: StockData[];
  lastUpdated: string;
}

const StockMarket = () => {
  const navigate = useNavigate();
  const [data, setData] = useState<MarketData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchData = async () => {
    setLoading(true);
    setError(null);
    
    try {
      const { data: response, error: fetchError } = await supabase.functions.invoke('stock-market');
      
      if (fetchError) throw fetchError;
      
      if (response?.success) {
        setData(response.data);
      } else {
        throw new Error(response?.error || 'Failed to fetch stock data');
      }
    } catch (err: any) {
      console.error('Error fetching stock data:', err);
      setError(err.message || 'Failed to load stock market data');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const formatTime = (isoString: string) => {
    return new Date(isoString).toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const StockCard = ({ stock, showCurrency = false }: { stock: StockData; showCurrency?: boolean }) => (
    <div className="glass-card rounded-xl p-4 flex items-center justify-between">
      <div className="flex-1 min-w-0">
        <p className="font-semibold text-foreground truncate">{stock.name}</p>
        <p className="text-sm text-muted-foreground">{stock.symbol}</p>
      </div>
      <div className="text-right ml-3">
        <p className="font-bold text-foreground">
          {showCurrency && stock.currency === 'INR' ? '₹' : '$'}{stock.price}
        </p>
        <div className={`flex items-center justify-end gap-1 ${stock.isPositive ? 'text-green-600' : 'text-red-600'}`}>
          {stock.isPositive ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
          <span className="text-sm font-medium">
            {stock.isPositive ? '+' : ''}{stock.changePercent}%
          </span>
        </div>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen gradient-bg pb-24">
      <header className="px-6 pt-12 pb-6 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <button 
            onClick={() => navigate(-1)}
            className="w-10 h-10 rounded-full glass-card flex items-center justify-center"
          >
            <ArrowLeft className="w-5 h-5 text-gray-600" />
          </button>
          <h1 className="text-xl font-bold text-foreground">Stock Market</h1>
        </div>
        <Button
          variant="ghost"
          size="icon"
          onClick={fetchData}
          disabled={loading}
          className="w-10 h-10 rounded-full glass-card"
        >
          <RefreshCw className={`w-5 h-5 text-gray-600 ${loading ? 'animate-spin' : ''}`} />
        </Button>
      </header>

      <main className="px-6 space-y-6">
        {loading && !data ? (
          <div className="space-y-4">
            {[1, 2, 3, 4, 5].map((i) => (
              <div key={i} className="h-20 rounded-xl shimmer" />
            ))}
          </div>
        ) : error ? (
          <div className="glass-card rounded-2xl p-6 text-center">
            <p className="text-red-500 mb-4">{error}</p>
            <Button onClick={fetchData} variant="outline">
              Try Again
            </Button>
          </div>
        ) : data ? (
          <>
            {/* Last Updated */}
            <p className="text-sm text-muted-foreground text-center">
              Last updated: {formatTime(data.lastUpdated)}
            </p>

            {/* Major Indices */}
            <section>
              <h2 className="text-lg font-semibold text-foreground mb-3">Major Indices</h2>
              <div className="space-y-3">
                {data.indices.map((index) => (
                  <StockCard key={index.symbol} stock={index} />
                ))}
              </div>
            </section>

            {/* Top Gainers */}
            <section>
              <h2 className="text-lg font-semibold text-foreground mb-3 flex items-center gap-2">
                <TrendingUp className="w-5 h-5 text-green-600" />
                Top Gainers
              </h2>
              <div className="space-y-3">
                {data.topGainers.map((stock) => (
                  <StockCard key={stock.symbol} stock={stock} showCurrency />
                ))}
              </div>
            </section>

            {/* Top Losers */}
            <section>
              <h2 className="text-lg font-semibold text-foreground mb-3 flex items-center gap-2">
                <TrendingDown className="w-5 h-5 text-red-600" />
                Top Losers
              </h2>
              <div className="space-y-3">
                {data.topLosers.map((stock) => (
                  <StockCard key={stock.symbol} stock={stock} showCurrency />
                ))}
              </div>
            </section>
          </>
        ) : null}
      </main>

      <BottomNav />
    </div>
  );
};

export default StockMarket;

import { useEffect, useState } from 'react';
import { ArrowLeft, RefreshCw, Coins } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import BottomNav from '@/components/ui/bottom-nav';
import { Button } from '@/components/ui/button';

interface PurityPrices {
  perGram: string;
  per10Grams: string;
}

interface GoldData {
  pricePerOunceUSD: string;
  pricePerGramUSD: string;
  exchangeRate: string;
  prices: {
    '24K': PurityPrices;
    '22K': PurityPrices;
    '18K': PurityPrices;
  };
  lastUpdated: string;
}

const GoldPrices = () => {
  const navigate = useNavigate();
  const [data, setData] = useState<GoldData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchData = async () => {
    setLoading(true);
    setError(null);
    
    try {
      const { data: response, error: fetchError } = await supabase.functions.invoke('gold-prices');
      
      if (fetchError) throw fetchError;
      
      if (response?.success) {
        setData(response.data);
      } else {
        throw new Error(response?.error || 'Failed to fetch gold prices');
      }
    } catch (err: any) {
      console.error('Error fetching gold prices:', err);
      setError(err.message || 'Failed to load gold prices');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const formatDateTime = (isoString: string) => {
    const date = new Date(isoString);
    return {
      date: date.toLocaleDateString('en-US', { 
        weekday: 'long', 
        year: 'numeric', 
        month: 'long', 
        day: 'numeric' 
      }),
      time: date.toLocaleTimeString('en-US', {
        hour: '2-digit',
        minute: '2-digit',
      }),
    };
  };

  const PriceCard = ({ purity, prices }: { purity: string; prices: PurityPrices }) => (
    <div className="glass-card rounded-2xl p-5">
      <div className="flex items-center gap-3 mb-4">
        <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
          purity === '24K' ? 'bg-yellow-400' : 
          purity === '22K' ? 'bg-yellow-500' : 'bg-yellow-600'
        }`}>
          <Coins className="w-5 h-5 text-white" />
        </div>
        <div>
          <h3 className="font-bold text-foreground text-lg">{purity} Gold</h3>
          <p className="text-sm text-muted-foreground">
            {purity === '24K' ? 'Pure Gold' : purity === '22K' ? '91.6% Pure' : '75% Pure'}
          </p>
        </div>
      </div>
      
      <div className="grid grid-cols-2 gap-4">
        <div className="bg-white/50 rounded-xl p-3 text-center">
          <p className="text-sm text-muted-foreground mb-1">Per Gram</p>
          <p className="font-bold text-foreground text-lg">₹{prices.perGram}</p>
        </div>
        <div className="bg-white/50 rounded-xl p-3 text-center">
          <p className="text-sm text-muted-foreground mb-1">Per 10 Grams</p>
          <p className="font-bold text-foreground text-lg">₹{Number(prices.per10Grams).toLocaleString()}</p>
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
          <h1 className="text-xl font-bold text-foreground">Gold Prices</h1>
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
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-36 rounded-2xl shimmer" />
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
            <div className="glass-card rounded-xl p-4 text-center">
              <p className="text-sm text-muted-foreground">
                {formatDateTime(data.lastUpdated).date}
              </p>
              <p className="text-xs text-muted-foreground mt-1">
                Last updated: {formatDateTime(data.lastUpdated).time}
              </p>
            </div>

            {/* International Price */}
            <div className="glass-card rounded-xl p-4">
              <h2 className="text-sm font-medium text-muted-foreground mb-2">International Gold Price</h2>
              <div className="flex items-baseline gap-2">
                <span className="text-2xl font-bold text-foreground">${data.pricePerOunceUSD}</span>
                <span className="text-sm text-muted-foreground">/ troy ounce</span>
              </div>
              <p className="text-sm text-muted-foreground mt-1">
                ${data.pricePerGramUSD} per gram • USD/INR: ₹{data.exchangeRate}
              </p>
            </div>

            {/* Gold Prices by Purity */}
            <section>
              <h2 className="text-lg font-semibold text-foreground mb-3">Today's Prices (INR)</h2>
              <div className="space-y-4">
                <PriceCard purity="24K" prices={data.prices['24K']} />
                <PriceCard purity="22K" prices={data.prices['22K']} />
                <PriceCard purity="18K" prices={data.prices['18K']} />
              </div>
            </section>

            {/* Disclaimer */}
            <p className="text-xs text-muted-foreground text-center px-4">
              Prices are indicative and may vary based on location and vendor. 
              Making charges and GST are not included.
            </p>
          </>
        ) : null}
      </main>

      <BottomNav />
    </div>
  );
};

export default GoldPrices;

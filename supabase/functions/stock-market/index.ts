import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Fetch major indices data from Yahoo Finance API (unofficial but reliable)
    const indices = [
      { symbol: '^GSPC', name: 'S&P 500' },
      { symbol: '^DJI', name: 'Dow Jones' },
      { symbol: '^IXIC', name: 'NASDAQ' },
      { symbol: '^NSEI', name: 'NIFTY 50' },
      { symbol: '^BSESN', name: 'SENSEX' },
    ];

    const stockSymbols = [
      'AAPL', 'MSFT', 'GOOGL', 'AMZN', 'TSLA', 
      'META', 'NVDA', 'JPM', 'V', 'WMT',
      'RELIANCE.NS', 'TCS.NS', 'INFY.NS', 'HDFCBANK.NS', 'ICICIBANK.NS'
    ];

    // Fetch data for indices
    const indicesData = await Promise.all(
      indices.map(async (index) => {
        try {
          const response = await fetch(
            `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(index.symbol)}?interval=1d&range=1d`
          );
          const data = await response.json();
          
          if (data.chart?.result?.[0]) {
            const result = data.chart.result[0];
            const meta = result.meta;
            const previousClose = meta.previousClose || meta.chartPreviousClose;
            const currentPrice = meta.regularMarketPrice;
            const change = currentPrice - previousClose;
            const changePercent = (change / previousClose) * 100;

            return {
              symbol: index.symbol,
              name: index.name,
              price: currentPrice?.toFixed(2),
              change: change?.toFixed(2),
              changePercent: changePercent?.toFixed(2),
              isPositive: change >= 0,
            };
          }
          return null;
        } catch (e) {
          console.error(`Error fetching ${index.symbol}:`, e);
          return null;
        }
      })
    );

    // Fetch data for stocks
    const stocksData = await Promise.all(
      stockSymbols.map(async (symbol) => {
        try {
          const response = await fetch(
            `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(symbol)}?interval=1d&range=1d`
          );
          const data = await response.json();
          
          if (data.chart?.result?.[0]) {
            const result = data.chart.result[0];
            const meta = result.meta;
            const previousClose = meta.previousClose || meta.chartPreviousClose;
            const currentPrice = meta.regularMarketPrice;
            const change = currentPrice - previousClose;
            const changePercent = (change / previousClose) * 100;

            return {
              symbol: symbol.replace('.NS', ''),
              name: meta.shortName || symbol,
              price: currentPrice?.toFixed(2),
              change: change?.toFixed(2),
              changePercent: changePercent?.toFixed(2),
              isPositive: change >= 0,
              currency: meta.currency,
            };
          }
          return null;
        } catch (e) {
          console.error(`Error fetching ${symbol}:`, e);
          return null;
        }
      })
    );

    const validStocks = stocksData.filter(s => s !== null);
    const gainers = [...validStocks].sort((a, b) => parseFloat(b!.changePercent) - parseFloat(a!.changePercent)).slice(0, 5);
    const losers = [...validStocks].sort((a, b) => parseFloat(a!.changePercent) - parseFloat(b!.changePercent)).slice(0, 5);

    return new Response(
      JSON.stringify({
        success: true,
        data: {
          indices: indicesData.filter(i => i !== null),
          topGainers: gainers,
          topLosers: losers,
          lastUpdated: new Date().toISOString(),
        },
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.error('Error:', error);
    return new Response(
      JSON.stringify({ success: false, error: errorMessage }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});

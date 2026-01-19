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
    let goldPriceUSD = 0;
    
    // Try Gold API (free tier available)
    try {
      const response = await fetch(
        'https://www.goldapi.io/api/XAU/USD',
        {
          headers: {
            'x-access-token': 'goldapi-demo',
          },
        }
      );
      
      if (response.ok) {
        const data = await response.json();
        if (data.price) {
          goldPriceUSD = data.price;
        }
      }
    } catch (e) {
      console.log('Primary API failed, trying fallback');
    }
    
    // Fallback: Use exchange rate API with approximate gold rate
    if (!goldPriceUSD) {
      try {
        // Try alternative free API
        const altResponse = await fetch(
          'https://api.frankfurter.app/latest?from=XAU&to=USD'
        );
        if (altResponse.ok) {
          const altData = await altResponse.json();
          // This API returns 1 XAU = X USD (price per troy ounce)
          if (altData.rates?.USD) {
            goldPriceUSD = altData.rates.USD;
          }
        }
      } catch (e) {
        console.log('Fallback API also failed');
      }
    }
    
    // Final fallback - use approximate current market price
    if (!goldPriceUSD || goldPriceUSD < 100) {
      goldPriceUSD = 2680; // Approximate current gold price per troy ounce (Jan 2026)
    }

    // Convert troy ounce to grams (1 troy ounce = 31.1035 grams)
    const pricePerGramUSD = goldPriceUSD / 31.1035;
    
    // Fetch exchange rates for INR
    const exchangeResponse = await fetch(
      'https://api.exchangerate-api.com/v4/latest/USD'
    );
    
    let usdToInr = 83.5; // Default fallback rate
    
    if (exchangeResponse.ok) {
      const exchangeData = await exchangeResponse.json();
      usdToInr = exchangeData.rates?.INR || 83.5;
    }

    const pricePerGramINR = pricePerGramUSD * usdToInr;
    const pricePer10GramsINR = pricePerGramINR * 10;
    
    // Different purities
    const purity24K = 1.0;
    const purity22K = 22 / 24;
    const purity18K = 18 / 24;

    return new Response(
      JSON.stringify({
        success: true,
        data: {
          pricePerOunceUSD: goldPriceUSD.toFixed(2),
          pricePerGramUSD: pricePerGramUSD.toFixed(2),
          exchangeRate: usdToInr.toFixed(2),
          prices: {
            '24K': {
              perGram: (pricePerGramINR * purity24K).toFixed(2),
              per10Grams: (pricePer10GramsINR * purity24K).toFixed(2),
            },
            '22K': {
              perGram: (pricePerGramINR * purity22K).toFixed(2),
              per10Grams: (pricePer10GramsINR * purity22K).toFixed(2),
            },
            '18K': {
              perGram: (pricePerGramINR * purity18K).toFixed(2),
              per10Grams: (pricePer10GramsINR * purity18K).toFixed(2),
            },
          },
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

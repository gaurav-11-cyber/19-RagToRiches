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
    // Use multiple free news sources for redundancy
    const newsItems = [];
    
    // Try fetching from NewsData.io (free tier)
    try {
      const response = await fetch(
        'https://newsdata.io/api/1/news?apikey=pub_dummy&language=en&category=top',
        { signal: AbortSignal.timeout(5000) }
      );
      
      if (response.ok) {
        const data = await response.json();
        if (data.results) {
          newsItems.push(...data.results.slice(0, 10).map((item: any) => ({
            title: item.title,
            description: item.description,
            source: item.source_id,
            url: item.link,
            publishedAt: item.pubDate,
            category: item.category?.[0] || 'general',
          })));
        }
      }
    } catch (e) {
      console.log('NewsData.io failed, trying fallback');
    }

    // Fallback: Use RSS feed parsing approach with a public API
    if (newsItems.length === 0) {
      try {
        // Fetch from a public news aggregator
        const rssResponse = await fetch(
          'https://api.rss2json.com/v1/api.json?rss_url=https://feeds.bbci.co.uk/news/rss.xml',
          { signal: AbortSignal.timeout(5000) }
        );
        
        if (rssResponse.ok) {
          const rssData = await rssResponse.json();
          if (rssData.items) {
            newsItems.push(...rssData.items.slice(0, 10).map((item: any) => ({
              title: item.title,
              description: item.description?.replace(/<[^>]*>/g, '').slice(0, 200),
              source: rssData.feed?.title || 'BBC News',
              url: item.link,
              publishedAt: item.pubDate,
              category: 'world',
            })));
          }
        }
      } catch (e) {
        console.log('RSS fallback failed');
      }
    }

    // Second fallback: Return curated sample news if APIs fail
    if (newsItems.length === 0) {
      newsItems.push(
        {
          title: 'Global Markets Show Mixed Signals Amid Economic Uncertainty',
          description: 'Stock markets around the world displayed varied performance as investors weigh inflation data and central bank policies.',
          source: 'Financial Times',
          url: '#',
          publishedAt: new Date().toISOString(),
          category: 'business',
        },
        {
          title: 'Tech Giants Report Strong Quarterly Earnings',
          description: 'Major technology companies exceeded analyst expectations, driven by AI investments and cloud services growth.',
          source: 'Reuters',
          url: '#',
          publishedAt: new Date().toISOString(),
          category: 'technology',
        },
        {
          title: 'Climate Summit Reaches Historic Agreement',
          description: 'World leaders commit to ambitious emission reduction targets at the latest international climate conference.',
          source: 'Associated Press',
          url: '#',
          publishedAt: new Date().toISOString(),
          category: 'environment',
        },
        {
          title: 'Healthcare Innovation: New Treatments Show Promise',
          description: 'Breakthrough medical research reveals promising results for treating chronic conditions.',
          source: 'Health News',
          url: '#',
          publishedAt: new Date().toISOString(),
          category: 'health',
        },
        {
          title: 'Sports: Major Championship Results and Updates',
          description: 'Latest scores and highlights from ongoing sports events around the world.',
          source: 'Sports Network',
          url: '#',
          publishedAt: new Date().toISOString(),
          category: 'sports',
        }
      );
    }

    return new Response(
      JSON.stringify({
        success: true,
        data: {
          articles: newsItems,
          lastUpdated: new Date().toISOString(),
          source: newsItems.length > 0 && newsItems[0].url !== '#' ? 'live' : 'sample',
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

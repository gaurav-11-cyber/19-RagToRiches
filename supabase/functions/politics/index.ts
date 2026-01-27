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
    const politicsNews = [];
    
    // Try fetching political news from RSS feeds
    try {
      const rssResponse = await fetch(
        'https://api.rss2json.com/v1/api.json?rss_url=https://feeds.bbci.co.uk/news/politics/rss.xml',
        { signal: AbortSignal.timeout(5000) }
      );
      
      if (rssResponse.ok) {
        const rssData = await rssResponse.json();
        if (rssData.items) {
          politicsNews.push(...rssData.items.slice(0, 10).map((item: any) => ({
            title: item.title,
            description: item.description?.replace(/<[^>]*>/g, '').slice(0, 200),
            source: 'BBC Politics',
            url: item.link,
            publishedAt: item.pubDate,
            region: 'UK',
          })));
        }
      }
    } catch (e) {
      console.log('BBC Politics RSS failed');
    }

    // Try additional political news source
    if (politicsNews.length < 5) {
      try {
        const rssResponse = await fetch(
          'https://api.rss2json.com/v1/api.json?rss_url=https://rss.nytimes.com/services/xml/rss/nyt/Politics.xml',
          { signal: AbortSignal.timeout(5000) }
        );
        
        if (rssResponse.ok) {
          const rssData = await rssResponse.json();
          if (rssData.items) {
            politicsNews.push(...rssData.items.slice(0, 5).map((item: any) => ({
              title: item.title,
              description: item.description?.replace(/<[^>]*>/g, '').slice(0, 200),
              source: 'NY Times Politics',
              url: item.link,
              publishedAt: item.pubDate,
              region: 'US',
            })));
          }
        }
      } catch (e) {
        console.log('NYT Politics RSS failed');
      }
    }

    // Fallback: Return curated political news if APIs fail
    if (politicsNews.length === 0) {
      politicsNews.push(
        {
          title: 'Parliament Debates New Economic Policy Framework',
          description: 'Lawmakers discuss proposed changes to fiscal policy aimed at boosting economic growth and addressing inflation concerns.',
          source: 'Political Times',
          url: '#',
          publishedAt: new Date().toISOString(),
          region: 'National',
        },
        {
          title: 'International Summit Addresses Global Security Concerns',
          description: 'World leaders convene to discuss collaborative approaches to emerging security challenges.',
          source: 'World Politics',
          url: '#',
          publishedAt: new Date().toISOString(),
          region: 'International',
        },
        {
          title: 'Election Campaign Updates: Key Candidates Outline Platforms',
          description: 'Major political parties reveal their policy priorities ahead of upcoming elections.',
          source: 'Election Watch',
          url: '#',
          publishedAt: new Date().toISOString(),
          region: 'National',
        },
        {
          title: 'Trade Agreement Negotiations Enter Final Phase',
          description: 'Diplomatic efforts intensify as nations work toward finalizing major trade deal.',
          source: 'Diplomatic News',
          url: '#',
          publishedAt: new Date().toISOString(),
          region: 'International',
        },
        {
          title: 'Local Government Announces Infrastructure Development Plan',
          description: 'New initiatives aim to improve public transportation and urban development.',
          source: 'Local Politics',
          url: '#',
          publishedAt: new Date().toISOString(),
          region: 'Local',
        }
      );
    }

    return new Response(
      JSON.stringify({
        success: true,
        data: {
          articles: politicsNews,
          lastUpdated: new Date().toISOString(),
          source: politicsNews.length > 0 && politicsNews[0].url !== '#' ? 'live' : 'sample',
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

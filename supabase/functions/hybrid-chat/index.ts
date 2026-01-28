import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Keywords for detecting query intent (multilingual)
const STOCK_KEYWORDS = [
  // English
  'stock', 'stocks', 'market', 'share', 'shares', 'nifty', 'sensex', 'dow', 'nasdaq', 's&p', 'trading', 'invest', 'portfolio', 'equity', 'bull', 'bear', 'ipo', 'dividend',
  // Hindi/Hinglish
  'शेयर', 'बाजार', 'निफ्टी', 'सेंसेक्स', 'स्टॉक', 'निवेश', 'share bazaar', 'stock market kya hai',
  // Urdu
  'حصص', 'مارکیٹ', 'سرمایہ کاری'
];
const GOLD_KEYWORDS = [
  // English
  'gold', 'gold price', 'gold rate', 'bullion', 'precious metal', '24k', '22k', '18k', 'karat', 'carat', 'jewel', 'jewelry',
  // Hindi/Hinglish
  'सोना', 'सोने का भाव', 'सोने की कीमत', 'gold rate kya hai', 'aaj sona kitne ka hai', 'sona', 'gold ka rate',
  // Urdu
  'سونا', 'سونے کی قیمت', 'طلائی'
];
const NEWS_KEYWORDS = [
  // English
  'news', 'latest', 'headlines', 'breaking', 'current events', 'happening', 'today', 'recent', 'update', 'updates',
  // Hindi/Hinglish
  'खबर', 'समाचार', 'ताजा खबर', 'ब्रेकिंग न्यूज', 'aaj ki khabar', 'latest news kya hai', 'kya hua aaj',
  // Urdu
  'خبر', 'تازہ خبریں', 'آج کی خبر'
];
const POLITICS_KEYWORDS = [
  // English
  'politics', 'political', 'election', 'government', 'parliament', 'congress', 'minister', 'president', 'prime minister', 'policy', 'vote', 'voting', 'campaign', 'party', 'democrat', 'republican', 'bjp', 'legislation',
  // Hindi/Hinglish
  'राजनीति', 'चुनाव', 'सरकार', 'संसद', 'मंत्री', 'प्रधानमंत्री', 'मोदी', 'राहुल', 'election kab hai', 'politics kya hai',
  // Urdu
  'سیاست', 'انتخابات', 'حکومت', 'پارلیمنٹ', 'وزیر اعظم'
];

interface QueryIntent {
  needsStockData: boolean;
  needsGoldData: boolean;
  needsNewsData: boolean;
  needsPoliticsData: boolean;
  needsRAG: boolean;
  detectedLanguage: string;
}

// Language detection based on script and common patterns
function detectLanguage(text: string): string {
  // Check for Devanagari script (Hindi)
  if (/[\u0900-\u097F]/.test(text)) {
    return 'hindi';
  }
  // Check for Arabic/Urdu script
  if (/[\u0600-\u06FF\u0750-\u077F]/.test(text)) {
    return 'urdu';
  }
  // Check for Hinglish patterns (Roman script with Hindi words/patterns)
  const hinglishPatterns = /\b(kya|hai|hain|kaise|kab|kitna|kitne|aaj|kal|mein|ka|ki|ke|ko|se|par|aur|ya|nahi|nahin|bahut|accha|theek|sab|bhi|yeh|woh|kuch|kaisa|kaisi|kahan|kyun|abhi|phir|lekin|magar|toh|na|ji|haan|arre|yaar|bhai|dost)\b/i;
  if (hinglishPatterns.test(text)) {
    return 'hinglish';
  }
  return 'english';
}

function detectIntent(query: string): QueryIntent {
  const lowerQuery = query.toLowerCase();
  
  const needsStockData = STOCK_KEYWORDS.some(kw => lowerQuery.includes(kw));
  const needsGoldData = GOLD_KEYWORDS.some(kw => lowerQuery.includes(kw));
  const needsNewsData = NEWS_KEYWORDS.some(kw => lowerQuery.includes(kw));
  const needsPoliticsData = POLITICS_KEYWORDS.some(kw => lowerQuery.includes(kw));
  
  // If no live data keywords detected, assume RAG is needed
  const needsRAG = !needsStockData && !needsGoldData && !needsNewsData && !needsPoliticsData;
  
  return {
    needsStockData,
    needsGoldData,
    needsNewsData,
    needsPoliticsData,
    needsRAG,
    detectedLanguage: detectLanguage(query),
  };
}

async function fetchStockData(supabaseUrl: string, supabaseKey: string): Promise<string> {
  try {
    const response = await fetch(`${supabaseUrl}/functions/v1/stock-market`, {
      headers: { Authorization: `Bearer ${supabaseKey}` },
    });
    const data = await response.json();
    
    if (data.success && data.data) {
      const { indices, topGainers, topLosers } = data.data;
      let summary = "\n\n📊 LIVE STOCK MARKET DATA:\n";
      
      if (indices?.length > 0) {
        summary += "\nMajor Indices:\n";
        indices.forEach((idx: any) => {
          const arrow = idx.isPositive ? '↑' : '↓';
          summary += `• ${idx.name}: ${idx.price} (${arrow} ${idx.changePercent}%)\n`;
        });
      }
      
      if (topGainers?.length > 0) {
        summary += "\nTop Gainers:\n";
        topGainers.slice(0, 3).forEach((stock: any) => {
          summary += `• ${stock.symbol}: ${stock.price} (↑ ${stock.changePercent}%)\n`;
        });
      }
      
      if (topLosers?.length > 0) {
        summary += "\nTop Losers:\n";
        topLosers.slice(0, 3).forEach((stock: any) => {
          summary += `• ${stock.symbol}: ${stock.price} (↓ ${stock.changePercent}%)\n`;
        });
      }
      
      summary += `\nLast Updated: ${new Date(data.data.lastUpdated).toLocaleString()}`;
      return summary;
    }
    return "";
  } catch (e) {
    console.error("Error fetching stock data:", e);
    return "";
  }
}

async function fetchGoldData(supabaseUrl: string, supabaseKey: string): Promise<string> {
  try {
    const response = await fetch(`${supabaseUrl}/functions/v1/gold-prices`, {
      headers: { Authorization: `Bearer ${supabaseKey}` },
    });
    const data = await response.json();
    
    if (data.success && data.data) {
      const { prices, pricePerOunceUSD, exchangeRate } = data.data;
      let summary = "\n\n🥇 LIVE GOLD PRICES:\n";
      summary += `\nInternational Price: $${pricePerOunceUSD}/oz\n`;
      summary += `Exchange Rate: ₹${exchangeRate}/USD\n`;
      summary += "\nIndian Gold Prices (per 10 grams):\n";
      summary += `• 24K (Pure): ₹${prices['24K'].per10Grams}\n`;
      summary += `• 22K: ₹${prices['22K'].per10Grams}\n`;
      summary += `• 18K: ₹${prices['18K'].per10Grams}\n`;
      summary += `\nLast Updated: ${new Date(data.data.lastUpdated).toLocaleString()}`;
      return summary;
    }
    return "";
  } catch (e) {
    console.error("Error fetching gold data:", e);
    return "";
  }
}

async function fetchNewsData(supabaseUrl: string, supabaseKey: string): Promise<string> {
  try {
    const response = await fetch(`${supabaseUrl}/functions/v1/latest-news`, {
      headers: { Authorization: `Bearer ${supabaseKey}` },
    });
    const data = await response.json();
    
    if (data.success && data.data?.articles) {
      let summary = "\n\n📰 LATEST NEWS:\n";
      data.data.articles.slice(0, 5).forEach((article: any, index: number) => {
        summary += `\n${index + 1}. ${article.title}\n`;
        if (article.description) {
          summary += `   ${article.description.slice(0, 100)}...\n`;
        }
        summary += `   Source: ${article.source}\n`;
      });
      summary += `\nLast Updated: ${new Date(data.data.lastUpdated).toLocaleString()}`;
      return summary;
    }
    return "";
  } catch (e) {
    console.error("Error fetching news data:", e);
    return "";
  }
}

async function fetchPoliticsData(supabaseUrl: string, supabaseKey: string): Promise<string> {
  try {
    const response = await fetch(`${supabaseUrl}/functions/v1/politics`, {
      headers: { Authorization: `Bearer ${supabaseKey}` },
    });
    const data = await response.json();
    
    if (data.success && data.data?.articles) {
      let summary = "\n\n🏛️ POLITICAL UPDATES:\n";
      data.data.articles.slice(0, 5).forEach((article: any, index: number) => {
        summary += `\n${index + 1}. ${article.title}\n`;
        if (article.description) {
          summary += `   ${article.description.slice(0, 100)}...\n`;
        }
        summary += `   Source: ${article.source} | Region: ${article.region}\n`;
      });
      summary += `\nLast Updated: ${new Date(data.data.lastUpdated).toLocaleString()}`;
      return summary;
    }
    return "";
  } catch (e) {
    console.error("Error fetching politics data:", e);
    return "";
  }
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { messages, documents } = await req.json();
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    const SUPABASE_URL = Deno.env.get("SUPABASE_URL");
    const SUPABASE_ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY");
    
    if (!LOVABLE_API_KEY) {
      throw new Error("LOVABLE_API_KEY is not configured");
    }

    // Get the latest user message for intent detection
    const latestUserMessage = messages.filter((m: any) => m.role === 'user').pop();
    const userQuery = latestUserMessage?.content || '';
    
    // Detect query intent
    const intent = detectIntent(userQuery);
    console.log("Detected intent:", intent);

    // Fetch live data based on intent
    const liveDataPromises: Promise<string>[] = [];
    const dataSources: string[] = [];
    
    if (intent.needsStockData && SUPABASE_URL && SUPABASE_ANON_KEY) {
      liveDataPromises.push(fetchStockData(SUPABASE_URL, SUPABASE_ANON_KEY));
      dataSources.push("Live Stock Market API");
    }
    
    if (intent.needsGoldData && SUPABASE_URL && SUPABASE_ANON_KEY) {
      liveDataPromises.push(fetchGoldData(SUPABASE_URL, SUPABASE_ANON_KEY));
      dataSources.push("Live Gold Price API");
    }
    
    if (intent.needsNewsData && SUPABASE_URL && SUPABASE_ANON_KEY) {
      liveDataPromises.push(fetchNewsData(SUPABASE_URL, SUPABASE_ANON_KEY));
      dataSources.push("Live News API");
    }
    
    if (intent.needsPoliticsData && SUPABASE_URL && SUPABASE_ANON_KEY) {
      liveDataPromises.push(fetchPoliticsData(SUPABASE_URL, SUPABASE_ANON_KEY));
      dataSources.push("Live Politics API");
    }

    // Wait for all live data to be fetched
    const liveDataResults = await Promise.all(liveDataPromises);
    const liveDataContext = liveDataResults.filter(d => d).join('\n');

    // Build document context for RAG if needed or if documents exist
    let documentContext = "";
    if (documents && documents.length > 0) {
      documentContext = "\n\n--- UPLOADED DOCUMENTS ---\n";
      documents.forEach((doc: { name: string; content: string }, index: number) => {
        if (doc.content) {
          documentContext += `\nDocument ${index + 1}: "${doc.name}"\nContent:\n${doc.content.slice(0, 5000)}\n---\n`;
        }
      });
      if (!dataSources.includes("Uploaded Documents")) {
        dataSources.push("Uploaded Documents (RAG)");
      }
    }

    // Build the system prompt with multilingual support
    const languageInstructions = {
      english: "Respond in English.",
      hindi: "हिंदी में जवाब दें। (Respond in Hindi using Devanagari script.)",
      hinglish: "Hinglish mein jawab do - Roman script mein Hindi/English mix use karo. (Respond in Hinglish using Roman script with Hindi-English mix.)",
      urdu: "اردو میں جواب دیں۔ (Respond in Urdu using Arabic script.)"
    };

    const detectedLang = intent.detectedLanguage;
    const langInstruction = languageInstructions[detectedLang as keyof typeof languageInstructions] || languageInstructions.english;

    const systemPrompt = `You are FS RAG, a hybrid AI assistant that combines RAG (Retrieval-Augmented Generation) with live data APIs. You provide accurate, evidence-based answers using multiple data sources.

LANGUAGE INSTRUCTION:
🌐 Detected language: ${detectedLang.toUpperCase()}
${langInstruction}

IMPORTANT LANGUAGE RULES:
1. ALWAYS respond in the SAME language as the user's query
2. Supported languages: English, Hindi (हिंदी), Hinglish (Roman Hindi), Urdu (اردو)
3. Do NOT translate unless the user explicitly asks for translation
4. Keep technical terms and data (numbers, dates, names) as-is
5. For Hindi: Use Devanagari script (देवनागरी)
6. For Hinglish: Use Roman script with Hindi-English mix (like "aaj gold ka rate kya hai")
7. For Urdu: Use Arabic/Nastaliq script (نستعلیق)

AVAILABLE DATA SOURCES:
${dataSources.length > 0 ? dataSources.map(s => `• ${s}`).join('\n') : '• General Knowledge (no specific data source)'}

CRITICAL RULES:
1. For document-based questions: ONLY answer based on information found in the provided documents
2. For live data questions (stocks, gold, news, politics): Use the real-time data provided below
3. If combining both: Clearly separate information from each source
4. ALWAYS indicate the data source used in your response
5. NEVER make up or hallucinate information
6. If the answer is not available from any source, respond appropriately in the detected language

RESPONSE FORMAT:
Start every response with a data source indicator (adapt to detected language):

📌 **Data Source(s):** [List the sources used]
${detectedLang === 'hindi' ? '📌 **डेटा स्रोत:** [उपयोग किए गए स्रोत]' : ''}
${detectedLang === 'urdu' ? '📌 **ڈیٹا ذرائع:** [استعمال شدہ ذرائع]' : ''}
${detectedLang === 'hinglish' ? '📌 **Data Source(s):** [Jo sources use kiye]' : ''}

Then provide your answer followed by:

For document-based answers:
Evidence:
- Document: [document name]
- Page/Section: [if available]
- Source text: "[exact quote from document]"

Confidence:
[High/Medium/Low] - based on how directly the evidence supports the answer

For live data answers:
- Include the live data in a clear, formatted way
- Note the last updated timestamp

${liveDataContext ? `\n--- LIVE DATA FROM APIs ---${liveDataContext}` : ''}
${documentContext}

If no documents are provided and no live data is relevant, inform the user about what data sources are available and how to access them.`;

    console.log("Calling AI gateway with hybrid context...");
    console.log("Data sources:", dataSources);

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        messages: [
          { role: "system", content: systemPrompt },
          ...messages,
        ],
        stream: true,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("AI gateway error:", response.status, errorText);
      
      if (response.status === 429) {
        return new Response(
          JSON.stringify({ error: "Rate limits exceeded, please try again later." }),
          { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      if (response.status === 402) {
        return new Response(
          JSON.stringify({ error: "Payment required, please add funds to your workspace." }),
          { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      
      return new Response(
        JSON.stringify({ error: "AI gateway error" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log("Streaming response from AI gateway...");

    return new Response(response.body, {
      headers: { ...corsHeaders, "Content-Type": "text/event-stream" },
    });
  } catch (error) {
    console.error("Hybrid chat error:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});

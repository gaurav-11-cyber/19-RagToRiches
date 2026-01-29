import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";
import { encodeBase64 } from "https://deno.land/std@0.224.0/encoding/base64.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { filePath, fileType, fileName, userId } = await req.json();
    
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    const SUPABASE_URL = Deno.env.get("SUPABASE_URL");
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

    if (!LOVABLE_API_KEY) {
      throw new Error("LOVABLE_API_KEY is not configured");
    }
    if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
      throw new Error("Supabase credentials not configured");
    }

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    console.log(`Starting transcription for: ${fileName} (${fileType})`);

    // Download the file from storage
    const { data: fileData, error: downloadError } = await supabase.storage
      .from('documents')
      .download(filePath);

    if (downloadError || !fileData) {
      throw new Error(`Failed to download file: ${downloadError?.message}`);
    }

    // Convert file to base64
    const arrayBuffer = await fileData.arrayBuffer();
    const base64Data = encodeBase64(new Uint8Array(arrayBuffer));

    // Determine media type for Gemini
    let mimeType = fileType;
    if (fileType === 'video/quicktime') {
      mimeType = 'video/mp4'; // Gemini doesn't support mov directly
    }

    console.log(`Sending to Gemini for transcription (${mimeType})...`);

    // Use Gemini for transcription (it supports audio/video)
    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          {
            role: "user",
            content: [
              {
                type: "text",
                text: `You are a professional transcription service. Transcribe the following audio/video file accurately and completely.

INSTRUCTIONS:
1. Transcribe ALL spoken content word-for-word
2. Include timestamps at the beginning of each major section or paragraph (format: [MM:SS])
3. If multiple speakers are present, label them as Speaker 1, Speaker 2, etc.
4. Note any significant non-speech audio in brackets, e.g., [music], [applause], [pause]
5. Preserve the natural flow and paragraphing of the speech
6. If there are any unclear words, mark them as [unclear]
7. For non-English content, provide transcription in the original language

OUTPUT FORMAT:
Start with a brief summary (1-2 sentences), then provide the full transcript.

---
SUMMARY:
[Brief summary of the content]

---
TRANSCRIPT:
[Full transcription with timestamps]
`
              },
              {
                type: "image_url",
                image_url: {
                  url: `data:${mimeType};base64,${base64Data}`
                }
              }
            ]
          }
        ],
        max_tokens: 8000,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("Transcription API error:", response.status, errorText);
      throw new Error(`Transcription failed: ${response.status}`);
    }

    const result = await response.json();
    const transcript = result.choices?.[0]?.message?.content || "";

    if (!transcript) {
      throw new Error("No transcript generated");
    }

    console.log(`Transcript generated, length: ${transcript.length} characters`);

    // Update the document record with the transcript
    const { error: updateError } = await supabase
      .from('documents')
      .update({ 
        content: transcript,
      })
      .eq('file_path', filePath)
      .eq('user_id', userId);

    if (updateError) {
      console.error("Failed to update document with transcript:", updateError);
      throw new Error(`Failed to save transcript: ${updateError.message}`);
    }

    console.log("Transcript saved successfully");

    return new Response(
      JSON.stringify({ 
        success: true, 
        transcript: transcript.slice(0, 500) + (transcript.length > 500 ? '...' : ''),
        fullLength: transcript.length 
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error) {
    console.error("Transcription error:", error);
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: error instanceof Error ? error.message : "Unknown error" 
      }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});

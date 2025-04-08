// Follow this setup guide to integrate the Deno language server with your editor:
// https://deno.land/manual/getting_started/setup_your_environment
// This enables autocomplete, go to definition, etc.

// Setup type definitions for built-in Supabase Runtime APIs
import "jsr:@supabase/functions-js/edge-runtime.d.ts"

console.log("Generate-embedding function started!")

import { serve } from 'https://deno.land/std@0.177.0/http/server.ts'
import { OpenAI } from 'https://deno.land/x/openai@v4.52.7/mod.ts'; // Use Deno compatible import
import { corsHeaders } from '../_shared/cors.ts'; // Import CORS headers

// Get OpenAI API key from environment variables
const apiKey = Deno.env.get('OPENAI_API_KEY');
if (!apiKey) {
  console.error('OPENAI_API_KEY is not set in environment variables');
}

// Ensure OPENAI_API_KEY is set in your Supabase project's secrets
const openai = new OpenAI({
  apiKey: apiKey,
});

const embeddingModel = "text-embedding-ada-002"; // Or your preferred model

serve(async (req: Request) => {
  // Handle CORS preflight request
  if (req.method === 'OPTIONS') {
    console.log('Handling OPTIONS request for CORS preflight');
    return new Response(null, {
      status: 204, // No content
      headers: new Headers(corsHeaders),
    });
  }

  try {
    console.log('Received request to generate embedding');
    
    // Ensure the request method is POST
    if (req.method !== 'POST') {
      console.warn('Method not allowed:', req.method);
      return new Response(JSON.stringify({ error: 'Method Not Allowed' }), {
        status: 405,
        headers: { 
          'Content-Type': 'application/json',
          ...corsHeaders 
        },
      });
    }

    const requestData = await req.json();
    const { inputText } = requestData;

    console.log('Processing input text:', inputText ? `"${inputText.substring(0, 50)}${inputText.length > 50 ? '...' : ''}"` : 'undefined');

    if (!inputText) {
      console.warn('Missing inputText in request body');
      return new Response(JSON.stringify({ error: 'Missing inputText in request body' }), {
        status: 400,
        headers: { 
          'Content-Type': 'application/json',
          ...corsHeaders
        },
      });
    }

    // Generate the embedding
    console.log(`Calling OpenAI API for embedding with model: ${embeddingModel}`);
    const embeddingResponse = await openai.embeddings.create({
      model: embeddingModel,
      input: inputText,
    });

    const embedding = embeddingResponse.data[0].embedding;
    console.log(`Successfully generated embedding of length: ${embedding.length}`);

    return new Response(JSON.stringify({ embedding }), {
      headers: {
        'Content-Type': 'application/json',
        ...corsHeaders
      },
      status: 200,
    });

  } catch (error) {
    console.error('Error generating embedding:', error);
    // Detailed error logging
    if (error instanceof Error) {
      console.error('Error name:', error.name);
      console.error('Error message:', error.message);
      console.error('Error stack:', error.stack);
    }
    
    // Check for OpenAI specific errors
    const isOpenAIError = error instanceof Error && 'status' in error;
    const status = isOpenAIError && typeof (error as any).status === 'number' 
      ? (error as any).status 
      : 500;
    
    // Type check for error before accessing message
    const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred';
    return new Response(JSON.stringify({ 
      error: errorMessage,
      details: isOpenAIError ? (error as any).details : undefined
    }), {
      status,
      headers: {
        'Content-Type': 'application/json',
        ...corsHeaders
      },
    });
  }
});

/* To invoke locally:

  1. Run `supabase start` (see: https://supabase.com/docs/reference/cli/supabase-start)
  2. Make an HTTP request:

  curl -i --location --request POST 'http://127.0.0.1:54321/functions/v1/generate-embedding' \
    --header 'Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6ImFub24iLCJleHAiOjE5ODM4MTI5OTZ9.CRXP1A7WOeoJeXxjNni43kdQwgnWNReilDMblYTn_I0' \
    --header 'Content-Type: application/json' \
    --data '{"inputText":"Test embedding generation"}'

*/

// Setup type definitions for built-in Supabase Runtime APIs
import "jsr:@supabase/functions-js/edge-runtime.d.ts"

console.log("Generate-summary function started!")

import { serve } from 'https://deno.land/std@0.177.0/http/server.ts'
import { OpenAI } from 'https://deno.land/x/openai@v4.52.7/mod.ts'
import { corsHeaders } from '../_shared/cors.ts'

// Get OpenAI API key from environment variables
const apiKey = Deno.env.get('OPENAI_API_KEY');
if (!apiKey) {
  console.error('OPENAI_API_KEY is not set in environment variables');
}

// Initialize OpenAI client
const openai = new OpenAI({
  apiKey: apiKey,
});

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
    console.log('Received request to generate summary');
    
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
    const { topic, content } = requestData;

    console.log(`Processing summary request for topic: "${topic}"`);

    if (!topic || !content) {
      console.warn('Missing required fields in request body');
      return new Response(JSON.stringify({ error: 'Missing required fields: topic and content are required' }), {
        status: 400,
        headers: { 
          'Content-Type': 'application/json',
          ...corsHeaders
        },
      });
    }

    // Create prompt for the summarization
    const prompt = `
I need you to create a coherent summary about "${topic}" based on the information from multiple videos.
Below is content from ${content.split('---').length} different videos related to this topic.

${content}

Please provide:
1. A comprehensive summary about "${topic}" based on these videos
2. Key points and insights that seem most important
3. Any consensus or disagreements between the videos on the topic

Your summary should be well-structured with headings and bullet points where appropriate.
Be objective and informative, highlight factual information, and avoid unnecessary repetition.
Format your response in Markdown.
`;

    // Call OpenAI API for chat completion
    console.log(`Calling OpenAI API for summarization...`);
    const response = await openai.chat.completions.create({
      model: "gpt-3.5-turbo",
      messages: [
        {
          role: "system",
          content: "You are a helpful assistant that creates informative summaries from video content. Your summaries are objective, well-structured, and highlight the most important information."
        },
        {
          role: "user",
          content: prompt
        }
      ],
      temperature: 0.5,
      max_tokens: 1500,
    });

    const summary = response.choices[0].message.content;
    console.log(`Successfully generated summary (${summary.length} chars)`);

    return new Response(JSON.stringify({ summary }), {
      headers: {
        'Content-Type': 'application/json',
        ...corsHeaders
      },
      status: 200,
    });

  } catch (error) {
    console.error('Error generating summary:', error);
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
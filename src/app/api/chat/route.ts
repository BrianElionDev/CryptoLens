import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { processQuery, RAGResponse } from '@/lib/ragSystem';
import { performWebSearch, WebSearchResult } from '@/lib/webSearch';

// Initialize Supabase client
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || '',
  process.env.SUPABASE_SERVICE_ROLE_KEY || ''
);

// Define a type for the response structure consistent across sources
// Also align with the Message interface in src/types/chat.ts
interface UnifiedResponse {
  answer: string;
  references?: { title: string; link: string; snippet?: string; [key: string]: string | undefined }[]; // Match Message type structure
  source: string; // 'database', 'tavily', 'perplexity', 'openai', 'rag_fallback', 'none'
  confidence: number;
}

// Helper function to save interaction to Supabase (appends messages)
async function saveInteraction(chatId: string, question: string, response: UnifiedResponse, title?: string) {
    if (!chatId) {
        console.log("No chatId provided, skipping save interaction.");
        return;
    }

    try {
        // 1. Fetch current chat state to get existing messages
        console.log(`Attempting to fetch messages for chatId: ${chatId} before saving.`);
        const { data: chatData, error: fetchError } = await supabase
            .from('chats')
            .select('messages, created_at')
            .eq('id', chatId)
            .single();

        let isNewChat = false;
        if (fetchError && fetchError.code !== 'PGRST116') {
            console.error('Supabase error fetching chat messages for update:', fetchError);
        } else if (fetchError?.code === 'PGRST116') {
            console.log(`ChatId ${chatId} not found, will create new entry.`);
            isNewChat = true;
        } else {
             console.log(`Successfully fetched existing messages for chatId: ${chatId}`);
        }

        const existingMessages = (chatData?.messages && Array.isArray(chatData.messages)) ? chatData.messages : [];

        // 2. Construct new messages array by appending
        const newMessages = [
            ...existingMessages,
            { role: 'user', content: question, timestamp: Date.now(), id: crypto.randomUUID() },
            {
              role: 'assistant',
              content: response.answer,
              references: response.references || [],
              source: response.source,
              confidence: response.confidence,
              timestamp: Date.now(),
              id: crypto.randomUUID()
            }
        ];

        // 3. Construct upsert payload
        const upsertPayload: { id: string; messages: string[]; title?: string; created_at?: string } = {
            id: chatId,
            messages: newMessages,
        };

        // Only include title and created_at if it's a new chat or title is provided
        if (isNewChat) {
            upsertPayload.title = title || 'New Chat';
            upsertPayload.created_at = chatData?.created_at || new Date().toISOString();
        } else if (title) {
            upsertPayload.title = title;
        }

        console.log(`Upserting interaction to chatId: ${chatId} with payload:`, upsertPayload);
        const { error: upsertError } = await supabase
            .from('chats')
            .upsert(upsertPayload)
            .eq('id', chatId);

        if (upsertError) {
            console.error('Error saving/upserting chat interaction to Supabase:', upsertError);
        } else {
            console.log(`Interaction saved successfully for chatId: ${chatId}`);
        }

    } catch (error) {
         console.error('Exception during saveInteraction:', error);
    }
}


export async function POST(request: NextRequest) {
  try {
    const { question, chatId, title } = await request.json();
    
    if (!question) {
      return NextResponse.json({ error: 'Question is required' }, { status: 400 });
    }

    console.log(`Received question: "${question}" for chatId: ${chatId}, title: ${title}`);

    // --- Step 1: Try specific RAG queries (non-embedding) first ---
    const ragResponse: RAGResponse = await processQuery(question);
    console.log(`Initial RAG Response: Source=${ragResponse.source}, Confidence=${ragResponse.confidence}`);

    // Condition: Use RAG result if it's from the database, high confidence, AND explicitly doesn't need web search.
    const useRagResultDirectly = ragResponse.source === 'database' &&
                                 ragResponse.confidence >= 0.95;

    if (useRagResultDirectly) {
      console.log("Using high-confidence RAG database result directly.");
      const responseData: UnifiedResponse = {
        answer: ragResponse.answer,
        references: ragResponse.references?.map(r => ({ // Ensure format matches
            title: r.video_title || 'Unknown Title',
            link: r.link || '#',
            date: r.created_at,
            snippet: r.summary
         })) || [],
        source: 'database',
        confidence: ragResponse.confidence,
      };
       await saveInteraction(chatId, question, responseData, title);
       return NextResponse.json(responseData);
    }

    // --- Step 2: Proceed to Web Search (Tavily -> Perplexity -> OpenAI) ---
    console.log("RAG insufficient or query requires web info. Proceeding to web search...");
    const webResult: WebSearchResult | null = await performWebSearch(question);
      
      if (webResult) {
      console.log(`Web search successful. Source: ${webResult.source}`);
       const responseData: UnifiedResponse = {
          answer: webResult.answer,
         // Map results to the consistent reference format
         references: webResult.results?.map(r => ({
            title: r.title,
            link: r.link,
            snippet: r.snippet
         })) || [],
         source: webResult.source, // 'tavily', 'perplexity', or 'openai'
         confidence: 0.75, // General confidence for successful web search
       };
       await saveInteraction(chatId, question, responseData, title);
       return NextResponse.json(responseData);
    }

    // --- Step 3: Fallback to original RAG result (if web search failed) ---
    console.log("Web search failed. Checking original RAG response as fallback...");
    // Use RAG result if it seems somewhat useful (confidence > 0.15) and isn't a generic failure message
    const useRagFallback = ragResponse.confidence > 0.15 &&
                           ragResponse.answer &&
                           !ragResponse.answer.startsWith("I couldn't find") &&
                           !ragResponse.answer.startsWith("Please specify"); // Avoid placeholder answers

    if (useRagFallback) {
        console.log("Falling back to original RAG response (embedding/keyword/low-conf search).");
        const responseData: UnifiedResponse = {
          answer: ragResponse.answer,
          references: ragResponse.references?.map(r => ({ // Ensure format matches
            title: r.video_title || 'Unknown Title',
            link: r.link || '#',
            date: r.created_at,
            snippet: r.summary
         })) || [],
          source: 'rag_fallback', // Indicate it's the fallback RAG result
          confidence: ragResponse.confidence,
        };
         await saveInteraction(chatId, question, responseData, title);
         return NextResponse.json(responseData);
    }

    // --- Step 4: All systems failed ---
    console.log("All search methods failed to find a relevant answer.");
     const finalErrorResponse: UnifiedResponse = {
        answer: "I apologize, but I couldn't find relevant information for your query using available resources. Please try rephrasing or asking something different.",
        references: [],
        source: 'none',
        confidence: 0,
     };
     await saveInteraction(chatId, question, finalErrorResponse, title);
     return NextResponse.json(finalErrorResponse);

  } catch (error) {
    console.error('Critical Error in chat API POST handler:', error);
    // Return generic server error
     const errorResponse: UnifiedResponse = {
        answer: "Sorry, an unexpected internal server error occurred while processing your request.",
        references: [],
        source: 'error', // Indicate server error
        confidence: 0,
     };
    // Avoid saving internal server errors to chat history? Or save specific message?
    // Let's return error without saving to chat history.
    return NextResponse.json(
        errorResponse,
      { status: 500 }
    );
  }
} 
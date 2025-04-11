import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { processQuery } from '@/lib/ragSystem';
import { performWebSearch } from '@/lib/webSearch';

// Initialize Supabase client
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || '',
  process.env.SUPABASE_SERVICE_ROLE_KEY || ''
);


export async function POST(request: NextRequest) {
  try {
    const { question, chatId } = await request.json();
    
    if (!question) {
      return NextResponse.json({ error: 'Question is required' }, { status: 400 });
    }

    console.log(`Received question: ${question}`);

    // First, try RAG for video-specific queries
    const ragResponse = await processQuery(question);
    
    // If RAG indicates it's a web search query or failed with low confidence
    let needsWebSearch = false;
    if (ragResponse.source === 'web' || ragResponse.confidence < 0.5) {
       // You might want to refine this condition based on how processQuery signals the need for web search
       needsWebSearch = true;
       console.log('Query requires web search or RAG confidence low, attempting web search...');
    }

    if (needsWebSearch) {
      // Call the main web search function, which handles Perplexity + OpenAI fallback
      const webResult = await performWebSearch(question);
      
      if (webResult) {
        console.log('Web search (Perplexity or OpenAI fallback) successful');
        
        // Save the interaction to the database if chatId is provided
        if (chatId) {
          try {
            await supabase
              .from('chats')
              .update({
                messages: [
                  { role: 'user', content: question },
                  { 
                    role: 'assistant', 
                    content: webResult.answer,
                    references: webResult.results
                  }
                ]
              })
              .eq('id', chatId);
          } catch (error) {
            console.error('Error saving chat interaction:', error);
          }
        }
        
        return NextResponse.json({
          answer: webResult.answer,
          references: webResult.results,
          // Determine source based on which method succeeded (difficult without more info from performWebSearch)
          // For now, label as 'web' if successful
          source: 'web',
          confidence: 0.7 // Assign a general confidence for web results
        });
      } else {
        // Web search (both Perplexity and fallback) failed
         console.log('All web search methods failed.');
         // If RAG also provided no good answer initially...
         if(ragResponse.confidence < 0.2) { // Check initial RAG confidence
            return NextResponse.json({
                answer: "I apologize, but I couldn't find relevant information for your query using the database or web search. Please try rephrasing.",
                references: [],
                source: 'none',
                confidence: 0
            });
         }
         // Otherwise, fall back to the low-confidence RAG answer
         // No need for an else here, it will proceed to the RAG return block
      }
    }

    // If RAG found content with sufficient confidence and didn't need web search,
    // or if web search failed but RAG had a low-confidence answer we want to return anyway
    console.log('Returning RAG response.');

    // Save the RAG interaction to the database if chatId is provided
    if (chatId) {
      try {
        await supabase
          .from('chats')
          .update({
            messages: [
              { role: 'user', content: question },
              { 
                role: 'assistant', 
                content: ragResponse.answer,
                references: ragResponse.references
              }
            ]
          })
          .eq('id', chatId);
      } catch (error) {
        console.error('Error saving RAG chat interaction:', error);
      }
    }

      return NextResponse.json({
      answer: ragResponse.answer,
      references: ragResponse.references,
      source: ragResponse.source,
      confidence: ragResponse.confidence
    });

  } catch (error) {
    console.error('Error in chat API:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
} 
import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { processQuery } from '@/lib/ragSystem';
import { performWebSearch, performOpenAIFallbackSearch } from '@/lib/webSearch';

// Initialize Supabase client
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || '',
  process.env.SUPABASE_SERVICE_ROLE_KEY || ''
);

// Helper function to format date consistently
const formatDate = (date: string) => {
  return new Date(date).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  });
};

export async function POST(request: NextRequest) {
  try {
    const { question, chatId } = await request.json();
    
    if (!question) {
      return NextResponse.json({ error: 'Question is required' }, { status: 400 });
    }

    console.log(`Received question: ${question}`);

    // First, try RAG for video-specific queries
    const ragResponse = await processQuery(question);
    
    // If RAG indicates it's a web search query or failed to find video content
    if (ragResponse.source === 'web' || ragResponse.confidence === 0) {
      console.log('Query requires web search, attempting web search...');
      
      // Try web search with DuckDuckGo and OpenAI fallback
      const webResult = await performWebSearch(question);
      
      if (webResult) {
        console.log('Web search successful');
        
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
          source: 'web',
          confidence: 0.8
        });
      }
      
      // If web search fails, try OpenAI fallback
      console.log('Web search failed, trying OpenAI fallback...');
      const openaiResult = await performOpenAIFallbackSearch(question);
      
      if (openaiResult) {
        console.log('OpenAI fallback successful');
        
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
                    content: openaiResult.answer,
                    references: openaiResult.results
                  }
                ]
              })
              .eq('id', chatId);
          } catch (error) {
            console.error('Error saving chat interaction:', error);
          }
        }
        
        return NextResponse.json({
          answer: openaiResult.answer,
          references: openaiResult.results,
          source: 'openai',
          confidence: 0.6
        });
      }
    } else {
      // RAG found video content, return its response
      console.log('RAG found video content');
      
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
                  content: ragResponse.answer,
                  references: ragResponse.references
                }
              ]
            })
            .eq('id', chatId);
        } catch (error) {
          console.error('Error saving chat interaction:', error);
        }
      }
      
      return NextResponse.json({
        answer: ragResponse.answer,
        references: ragResponse.references,
        source: ragResponse.source,
        confidence: ragResponse.confidence
      });
    }

    // If all search methods fail
    console.log('All search methods failed');
    return NextResponse.json({
      answer: "I apologize, but I couldn't find relevant information for your query. Please try rephrasing your question or ask about a different topic.",
      references: [],
      source: 'hybrid',
      confidence: 0
    }, { status: 500 });

  } catch (error) {
    console.error('Error in chat API:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
} 
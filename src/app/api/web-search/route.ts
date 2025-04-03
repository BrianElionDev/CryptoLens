import { NextResponse } from 'next/server';
import { performWebSearch, performOpenAIFallbackSearch } from '@/lib/webSearch';

export async function POST(request: Request) {
  try {
    const { query } = await request.json();
    
    if (!query || typeof query !== 'string') {
      return NextResponse.json(
        { error: 'Query parameter is required and must be a string' },
        { status: 400 }
      );
    }
    
    console.log(`Initiating web search for: "${query}"`);
    
    // Try Perplexity API first
    const perplexityResult = await performWebSearch(query);
    
    // If Perplexity succeeded, return its results
    if (perplexityResult) {
      console.log('Web search successful via Perplexity');
      
      return NextResponse.json({
        answer: perplexityResult.answer,
        references: perplexityResult.results.map(result => ({
          title: result.title,
          link: result.link,
          snippet: result.snippet
        })),
        source: 'perplexity'
      });
    }
    
    // If Perplexity failed, try OpenAI fallback
    console.log('Perplexity search failed, falling back to OpenAI');
    const openaiResult = await performOpenAIFallbackSearch(query);
    
    if (openaiResult) {
      console.log('Fallback to OpenAI successful');
      
      return NextResponse.json({
        answer: openaiResult.answer,
        references: [], // No external references since this is from OpenAI's knowledge
        source: 'openai'
      });
    }
    
    // Both services failed
    console.log('All web search attempts failed');
    return NextResponse.json({
      error: 'Failed to perform web search with all available services',
      answer: 'I was unable to retrieve information from the web at this time. Please try again later.',
      references: []
    }, { status: 500 });
    
  } catch (error) {
    console.error('Web search API error:', error);
    return NextResponse.json(
      { 
        error: 'Failed to process web search request',
        answer: 'An error occurred while processing your request. Please try again later.'
      },
      { status: 500 }
    );
  }
} 
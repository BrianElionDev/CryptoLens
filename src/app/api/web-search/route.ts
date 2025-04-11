import { NextRequest, NextResponse } from 'next/server';
import { performWebSearch, performOpenAIFallbackSearch } from '@/lib/webSearch';

export async function POST(request: NextRequest) {
  try {
    const { query } = await request.json();
    
    if (!query) {
      return NextResponse.json({ error: 'Query is required' }, { status: 400 });
    }

    console.log(`Received web search query: "${query}"`);

    // Try DuckDuckGo search first
    let searchResult = await performWebSearch(query);
    
    // If DuckDuckGo fails, fall back to OpenAI
    if (!searchResult) {
      console.log('Perplexity search failed, falling back to OpenAI...');
      searchResult = await performOpenAIFallbackSearch(query);
    }

    if (!searchResult) {
      return NextResponse.json(
        { error: 'Failed to perform web search' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      answer: searchResult.answer,
      references: searchResult.results,
      source: searchResult.results.length > 0 ? 'web' : 'openai'
    });

  } catch (error) {
    console.error('Error in web search API:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
} 
// Remove unused import
// import { NextRequest } from 'next/server';

import OpenAI from 'openai';
// Corrected import
import { tavily } from '@tavily/core';

// Initialize OpenAI client
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

// Initialize Tavily client using the imported function
const tavilyClient = tavily({ // Renamed variable to avoid conflict
  apiKey: process.env.TAVILY_API_KEY,
});

// Interface for web search results - made slightly more generic
// Ensure results have title and link, snippet is optional
export interface WebSearchResultItem {
    title: string;
    link: string; // Changed from url to link for consistency
    snippet?: string;
    score?: number; // Tavily provides score
    raw_content?: string; // Tavily provides raw_content
}

export interface WebSearchResult {
  answer: string; // Consolidated answer from the search/model
  results: WebSearchResultItem[]; // Array of source items
  source: 'tavily' | 'perplexity' | 'openai'; // Indicate which service succeeded
}

// --- Tavily Search Function ---
async function performTavilySearch(query: string): Promise<WebSearchResult | null> {
    console.log('Attempting Tavily search...');
    if (!process.env.TAVILY_API_KEY) {
        console.error('Tavily API key (TAVILY_API_KEY) is not set.');
        return null;
    }

    try {
        // Basic search - use the initialized tavilyClient
        const searchResponse = await tavilyClient.search(query, {
            maxResults: 5, // Limit results
            includeAnswer: true, // Ask Tavily to generate a summarized answer
            includeRawContent: false, // Don't need full raw content for now
            // searchDepth: "advanced" // Could use advanced for better results, but higher cost/latency
        });

        console.log('Tavily search successful:', searchResponse);

        // Use type guards to safely access properties
        const results: WebSearchResultItem[] = (searchResponse?.results && Array.isArray(searchResponse.results)) 
          ? searchResponse.results.map((item: unknown) => {
              // Check if item is a valid object first
              if (!item || typeof item !== 'object') {
                return {
                  title: 'Untitled',
                  link: '#',
                  snippet: '',
                };
              }
              
              // Now TypeScript knows item is an object, but we need to check individual properties
              const obj = item as Record<string, unknown>;
              
              return {
                title: typeof obj.title === 'string' ? obj.title : 'Untitled',
                link: typeof obj.url === 'string' ? obj.url : '#',
                snippet: typeof obj.content === 'string' ? obj.content : '',
                score: typeof obj.score === 'number' ? obj.score : undefined,
              };
            })
          : [];

        return {
            answer: searchResponse?.answer || "Tavily search completed, but no direct answer was generated.", // Use Tavily's summarized answer if available
            results: results,
            source: 'tavily'
        };

    } catch (error) {
        console.error('Error during Tavily search request:', error);
        return null;
    }
}

// --- Perplexity Search Function ---
async function performPerplexitySearch(query: string): Promise<WebSearchResult | null> {
  console.log('Attempting Perplexity search...');
  const apiKey = process.env.PERPLEXITY_API_KEY;

  if (!apiKey) {
    console.error('Perplexity API key (PERPLEXITY_API_KEY) is not set.');
    return null;
  }

  const options = {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
      accept: 'application/json',
    },
    body: JSON.stringify({
      model: 'sonar-medium-online', // Explicitly use an online model like sonar-medium-online
      messages: [
        { role: 'system', content: 'You are a helpful AI assistant. Answer the user query based on real-time web search results. Be concise and informative. Cite sources if possible within the answer text using markdown footnotes like [^1^] and list them at the end.' },
        { role: 'user', content: query },
      ],
    }),
  };

  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 20000); // 10-second timeout

    const response = await fetch('https://api.perplexity.ai/chat/completions', {
        ...options,
        signal: controller.signal
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      const errorBody = await response.text();
      console.error(`Perplexity API request failed with status ${response.status}: ${errorBody}`);
      return null;
    }

    const data = await response.json();

    if (data.choices && data.choices.length > 0 && data.choices[0].message && data.choices[0].message.content) {
      const answer = data.choices[0].message.content;
      console.log('Perplexity search successful.');

      // Attempt to parse sources/references from the answer if needed, but it's complex.
      // For now, return an empty results array.
      return {
        answer,
        results: [], // Perplexity API doesn't provide structured sources easily
        source: 'perplexity'
      };
    } else {
      console.warn('Perplexity response did not contain the expected answer structure.', data);
      return null;
    }
  } catch (error: unknown) {
    if (error && typeof error === 'object' && 'name' in error && error.name === 'AbortError') {
      console.error('Perplexity search request timed out.');
    } else {
      console.error('Error during Perplexity search request:', error);
    }
    return null;
  }
}


// --- Direct OpenAI Search Function (Fallback) ---
// Returns WebSearchResult | null
export async function performOpenAIFallbackSearch(query: string): Promise<WebSearchResult | null> {
  console.log('Attempting direct OpenAI search as fallback...');
   if (!process.env.OPENAI_API_KEY) {
        console.error('OpenAI API key (OPENAI_API_KEY) is not set.');
        return null;
    }
  try {
    const completion = await openai.chat.completions.create({
      model: "gpt-3.5-turbo",
      messages: [
        {
          role: "system",
          content: "You are a helpful assistant answering questions based on your general knowledge. Provide a concise answer."
        },
        {
          role: "user",
          content: `Answer the following question: ${query}`
        }
      ],
      max_tokens: 300,
    });

    const answer = completion.choices[0]?.message?.content;
    if (answer) {
      console.log('Direct OpenAI search successful.');
      return {
        answer,
        results: [], // OpenAI doesn't provide search result links
        source: 'openai'
      };
    } else {
      console.warn('Direct OpenAI search did not return an answer.');
      return null;
    }

  } catch (error) {
    console.error('Error during direct OpenAI search:', error);
    return null;
  }
}

// --- Main Web Search Function ---
// Tries Tavily -> Perplexity -> OpenAI
export async function performWebSearch(query: string): Promise<WebSearchResult | null> {

  // 1. Try Tavily
  const tavilyResult = await performTavilySearch(query);
  if (tavilyResult) {
    return tavilyResult;
  }
  console.log('Tavily search failed or returned no result.');


  // 2. Try Perplexity
  console.log('Falling back to Perplexity search.');
  const perplexityResult = await performPerplexitySearch(query);
  if (perplexityResult) {
    return perplexityResult;
  }
  console.log('Perplexity search failed or returned no result.');

  // 3. Fallback to direct OpenAI search
  console.log('Falling back to direct OpenAI search.');
  const openaiResult = await performOpenAIFallbackSearch(query);
  if (openaiResult) {
    return openaiResult;
  }

  // 4. If all fail
  console.error('All web search methods (Tavily, Perplexity, OpenAI) failed.');
  return null;
}

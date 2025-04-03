// Remove unused import
// import { NextRequest } from 'next/server';

// Interface for the web search response
export interface WebSearchResult {
  query: string;
  results: {
    title: string;
    link: string;
    snippet: string;
  }[];
  answer: string;
}

/**
 * Perform a web search using Perplexity API
 * 
 * @param query - The search query
 * @returns WebSearchResult object with search results and an AI-generated answer
 */
export async function performWebSearch(query: string): Promise<WebSearchResult | null> {
  try {
    const PERPLEXITY_API_KEY = process.env.PERPLEXITY_API_KEY;
    
    if (!PERPLEXITY_API_KEY) {
      console.error('PERPLEXITY_API_KEY is not set in environment variables');
      return null;
    }
    
    console.log(`Performing web search for: "${query}"`);
    
    // Using the correct Perplexity chat completions endpoint
    const response = await fetch('https://api.perplexity.ai/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${PERPLEXITY_API_KEY}`
      },
      body: JSON.stringify({
        model: "sonar-medium-online", // This model has web search capabilities
        messages: [
          {
            role: "system", 
            content: "You are a helpful assistant that provides accurate information about cryptocurrency, blockchain, and related topics. Search the web for the most up-to-date information when needed. Include relevant links to sources in your answers."
          },
          {
            role: "user", 
            content: `I want to learn about: ${query}. Please search the web for current information and provide a well-structured answer with links to your sources.`
          }
        ],
        temperature: 0.7,
        max_tokens: 1000
      })
    });
    
    if (!response.ok) {
      const errorData = await response.text();
      console.error(`Perplexity API error: ${response.status} - ${errorData}`);
      return null;
    }
    
    const data = await response.json();
    
    // Extract content from the Perplexity response
    const content = data.choices?.[0]?.message?.content || '';
    
    // Parse sources from the markdown content
    const sources = extractSourcesFromContent(content);
    
    return {
      query,
      results: sources,
      answer: content
    };
  } catch (error) {
    console.error('Error performing web search:', error);
    return null;
  }
}

/**
 * Extract sources from Perplexity's markdown content
 * Perplexity typically includes sources in the format [number]: URL
 */
function extractSourcesFromContent(content: string): { title: string; link: string; snippet: string }[] {
  // Look for URLs in the content
  const sources: { title: string; link: string; snippet: string }[] = [];
  
  // Match markdown links [title](url)
  const markdownLinkRegex = /\[([^\]]+)\]\(([^)]+)\)/g;
  let match;
  
  while ((match = markdownLinkRegex.exec(content)) !== null) {
    const title = match[1];
    const link = match[2];
    
    // Only add unique links
    if (link && !sources.some(s => s.link === link)) {
      sources.push({
        title: title || 'Web Source',
        link,
        snippet: extractContextAroundLink(content, match.index, 150)
      });
    }
  }
  
  // If no markdown links found, try to find reference-style links ([1]: https://...)
  if (sources.length === 0) {
    const referenceRegex = /\[(\d+)\]:\s*(https?:\/\/[^\s]+)/g;
    
    while ((match = referenceRegex.exec(content)) !== null) {
      const linkNumber = match[1];
      const link = match[2];
      
      if (link && !sources.some(s => s.link === link)) {
        sources.push({
          title: `Source ${linkNumber}`,
          link,
          snippet: extractContextAroundLink(content, match.index, 150)
        });
      }
    }
  }
  
  return sources;
}

/**
 * Extract context around a link to use as a snippet
 */
function extractContextAroundLink(content: string, linkIndex: number, charCount: number): string {
  const start = Math.max(0, linkIndex - charCount / 2);
  const end = Math.min(content.length, linkIndex + charCount / 2);
  
  let snippet = content.substring(start, end).trim();
  
  // Add ellipsis if we're not at the beginning/end
  if (start > 0) snippet = '...' + snippet;
  if (end < content.length) snippet = snippet + '...';
  
  return snippet;
}

/**
 * Fallback to OpenAI for web search capability
 * 
 * @param query - The search query
 * @returns WebSearchResult object with an AI-generated answer based on its knowledge
 */
export async function performOpenAIFallbackSearch(query: string): Promise<WebSearchResult | null> {
  try {
    const OPENAI_API_KEY = process.env.OPENAI_API_KEY;
    
    if (!OPENAI_API_KEY) {
      console.error('OPENAI_API_KEY is not set in environment variables');
      return null;
    }
    
    console.log(`Performing OpenAI fallback search for: "${query}"`);
    
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${OPENAI_API_KEY}`
      },
      body: JSON.stringify({
        model: 'gpt-4o',
        messages: [
          {
            role: 'system',
            content: 'You are an AI assistant with knowledge about cryptocurrencies, blockchain, and related topics. Your task is to provide current information based on your training data. Format your answer in markdown with headers and bullet points where appropriate.'
          },
          {
            role: 'user',
            content: `Please provide information about: ${query}`
          }
        ],
        temperature: 0.7,
        max_tokens: 1000
      })
    });
    
    if (!response.ok) {
      const errorData = await response.text();
      console.error(`OpenAI API error: ${response.status} - ${errorData}`);
      return null;
    }
    
    const data = await response.json();
    const answer = data.choices?.[0]?.message?.content || '';
    
    return {
      query,
      results: [], // No web search results since this is just using OpenAI's knowledge
      answer: answer
    };
  } catch (error) {
    console.error('Error performing OpenAI fallback search:', error);
    return null;
  }
}
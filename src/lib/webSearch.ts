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
 * Perform a web search using DuckDuckGo API
 * 
 * @param query - The search query
 * @returns WebSearchResult object with search results and an AI-generated answer
 */
export async function performWebSearch(query: string): Promise<WebSearchResult | null> {
  try {
    console.log(`Performing DuckDuckGo search for: "${query}"`);
    
    // First, try to get search results from DuckDuckGo with timeout
    const searchResults = await performDuckDuckGoSearchWithTimeout(query);
    
    // If DuckDuckGo fails, try a direct OpenAI search
    if (!searchResults || searchResults.length === 0) {
      console.log('DuckDuckGo search failed, falling back to direct OpenAI search...');
      return await performDirectOpenAISearch(query);
    }

    // Then, use OpenAI to generate a comprehensive answer based on the search results
    const answer = await generateAnswerFromResults(query, searchResults);
    
    return {
      query,
      results: searchResults,
      answer: answer || "I couldn't generate a comprehensive answer from the search results."
    };
  } catch (error) {
    console.error('Error performing web search:', error);
    // If anything fails, try direct OpenAI search as a fallback
    return await performDirectOpenAISearch(query);
  }
}

/**
 * Perform a search using DuckDuckGo's API with a timeout
 */
async function performDuckDuckGoSearchWithTimeout(query: string): Promise<{ title: string; link: string; snippet: string }[] | null> {
  try {
    // Create an AbortController for timeout
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 5000); // 5 second timeout
    
    // DuckDuckGo API endpoint
    const response = await fetch(
      `https://api.duckduckgo.com/?q=${encodeURIComponent(query)}&format=json&no_html=1&skip_disambig=1`,
      { signal: controller.signal }
    );
    
    // Clear the timeout
    clearTimeout(timeoutId);
    
    if (!response.ok) {
      console.error(`DuckDuckGo API error: ${response.status}`);
      return null;
    }
    
    const data = await response.json();
    
    // Extract and format results
    const results = data.RelatedTopics
      .filter((topic: any) => topic.Text && topic.FirstURL)
      .map((topic: any) => ({
        title: topic.Text.split(' - ')[0] || 'Web Source',
        link: topic.FirstURL,
        snippet: topic.Text
      }))
      .slice(0, 5); // Limit to top 5 results
    
    return results;
  } catch (error) {
    if (error.name === 'AbortError') {
      console.error('DuckDuckGo search timed out');
    } else {
      console.error('Error in DuckDuckGo search:', error);
    }
    return null;
  }
}

/**
 * Perform a direct OpenAI search without using DuckDuckGo
 */
async function performDirectOpenAISearch(query: string): Promise<WebSearchResult | null> {
  try {
    const OPENAI_API_KEY = process.env.OPENAI_API_KEY;
    
    if (!OPENAI_API_KEY) {
      console.error('OPENAI_API_KEY is not set in environment variables');
      return null;
    }

    console.log(`Performing direct OpenAI search for: "${query}"`);

    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${OPENAI_API_KEY}`
      },
      body: JSON.stringify({
        model: "gpt-3.5-turbo",
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
      console.error(`OpenAI API error: ${response.status}`);
      return null;
    }

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content || '';
    
    // Extract sources from the markdown content
    const sources = extractSourcesFromContent(content);
    
    return {
      query,
      results: sources,
      answer: content
    };
  } catch (error) {
    console.error('Error in direct OpenAI search:', error);
    return null;
  }
}

/**
 * Generate a comprehensive answer using OpenAI based on search results
 */
async function generateAnswerFromResults(query: string, results: { title: string; link: string; snippet: string }[]): Promise<string | null> {
  try {
    const OPENAI_API_KEY = process.env.OPENAI_API_KEY;
    
    if (!OPENAI_API_KEY) {
      console.error('OPENAI_API_KEY is not set in environment variables');
      return null;
    }

    // Prepare the context from search results
    const context = results.map((result, index) => 
      `[${index + 1}] ${result.title}\n${result.snippet}\nSource: ${result.link}\n`
    ).join('\n');

    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${OPENAI_API_KEY}`
      },
      body: JSON.stringify({
        model: "gpt-3.5-turbo",
        messages: [
          {
            role: "system",
            content: "You are a helpful assistant that provides accurate information about cryptocurrency, blockchain, and related topics. Use the provided search results to create a comprehensive answer. Include relevant information from the sources and cite them appropriately."
          },
          {
            role: "user",
            content: `Query: ${query}\n\nSearch Results:\n${context}\n\nPlease provide a comprehensive answer based on these search results. Include relevant information and cite the sources using [number] notation.`
          }
        ],
        temperature: 0.7,
        max_tokens: 1000
      })
    });

    if (!response.ok) {
      console.error(`OpenAI API error: ${response.status}`);
      return null;
    }

    const data = await response.json();
    return data.choices?.[0]?.message?.content || null;
  } catch (error) {
    console.error('Error generating answer from results:', error);
    return null;
  }
}

/**
 * Extract sources from markdown content
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
 * Fallback search using only OpenAI when DuckDuckGo fails
 */
export async function performOpenAIFallbackSearch(query: string): Promise<WebSearchResult | null> {
  try {
    const OPENAI_API_KEY = process.env.OPENAI_API_KEY;
    
    if (!OPENAI_API_KEY) {
      console.error('OPENAI_API_KEY is not set in environment variables');
      return null;
    }

    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${OPENAI_API_KEY}`
      },
      body: JSON.stringify({
        model: "gpt-3.5-turbo",
        messages: [
          {
            role: "system",
            content: "You are a helpful assistant that provides accurate information about cryptocurrency, blockchain, and related topics. Provide information based on your knowledge, and if you're unsure, indicate that clearly."
          },
          {
            role: "user",
            content: `I want to learn about: ${query}. Please provide a well-structured answer with your knowledge about this topic.`
          }
        ],
        temperature: 0.7,
        max_tokens: 1000
      })
    });

    if (!response.ok) {
      console.error(`OpenAI API error: ${response.status}`);
      return null;
    }

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content || '';

    return {
      query,
      results: [],
      answer: content
    };
  } catch (error) {
    console.error('Error in OpenAI fallback search:', error);
    return null;
  }
}
// Remove unused import
// import { NextRequest } from 'next/server';

import OpenAI from 'openai';

// Initialize OpenAI client
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

// Interface for web search results
export interface WebSearchResult {
  answer: string;
  // Ensure results structure matches what Perplexity/OpenAI might provide
  // Perplexity might require parsing the answer string for sources
  // OpenAI won't provide structured sources directly
  results: { title: string; link: string; snippet?: string }[];
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
      model: 'sonar', // Using an online model for web search capabilities
      messages: [
        { role: 'system', content: 'Be precise and concise. Answer the user query based on web search results.' },
        { role: 'user', content: query },
      ],
      // Consider adding max_tokens, temperature etc. if needed
    }),
  };

  try {
    // Added timeout handling for Perplexity API request
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 8000); // 8-second timeout

    const response = await fetch('https://api.perplexity.ai/chat/completions', {
        ...options,
        signal: controller.signal // Pass the abort signal
    });

    clearTimeout(timeoutId); // Clear timeout if fetch completes


    if (!response.ok) {
      const errorBody = await response.text();
      console.error(`Perplexity API request failed with status ${response.status}: ${errorBody}`);
      return null;
    }

    const data = await response.json();

    if (data.choices && data.choices.length > 0 && data.choices[0].message && data.choices[0].message.content) {
      const answer = data.choices[0].message.content;
      console.log('Perplexity search successful.');

      // Placeholder for results - adjust if Perplexity provides structured sources
      // You might need to parse the 'answer' string for potential sources
      return {
        answer,
        results: [],
      };
    } else {
      console.warn('Perplexity response did not contain the expected answer structure.', data);
      return null;
    }
  } catch (error: any) {
    if (error.name === 'AbortError') {
        console.error('Perplexity search request timed out.');
    } else {
        console.error('Error during Perplexity search request:', error);
    }
    return null;
  }
}


// --- Direct OpenAI Search Function (Fallback) ---
async function performDirectOpenAISearch(query: string): Promise<WebSearchResult | null> {
  console.log('Attempting direct OpenAI search as fallback...');
  try {
    const completion = await openai.chat.completions.create({
      model: "gpt-3.5-turbo", // Or another suitable model
      messages: [
        {
          role: "system",
          content: "You are a helpful assistant that answers questions based on your knowledge. Provide a concise answer."
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
        results: [] // OpenAI doesn't directly provide search result links
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
// Tries Perplexity first, then falls back to direct OpenAI
// THIS IS THE ONLY EXPORTED performWebSearch FUNCTION
export async function performWebSearch(query: string): Promise<WebSearchResult | null> {

  // 1. Try Perplexity
  const perplexityResult = await performPerplexitySearch(query);
  if (perplexityResult) {
    return perplexityResult;
  }

  // 2. Fallback to direct OpenAI search
  console.log('Perplexity search failed or returned no result, falling back to direct OpenAI search.');
  const openaiResult = await performDirectOpenAISearch(query);
  if (openaiResult) {
    return openaiResult;
  }

  // 3. If both fail
  console.error('Both Perplexity and direct OpenAI search failed.');
  return null;
}

// Ensure no other function named 'performWebSearch' exists below this line
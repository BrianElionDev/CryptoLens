import { createClient } from '@supabase/supabase-js';
import { OpenAIEmbeddings } from "@langchain/openai";
import { SupabaseVectorStore } from "@langchain/community/vectorstores/supabase";
import { performWebSearch } from './webSearch'; // Assuming webSearch now handles OpenAI directly

// Initialize Supabase client
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || '',
  process.env.SUPABASE_SERVICE_ROLE_KEY || ''
);

// Initialize OpenAI Embeddings
const embeddings = new OpenAIEmbeddings({ openAIApiKey: process.env.OPENAI_API_KEY });

// RAG Response Interface
interface RAGResponse {
  answer: string;
  references: Reference[];
  source: 'database' | 'web' | 'hybrid' | 'none';
  confidence: number;
}

// Add a Reference interface to replace any types
interface Reference {
  video_title?: string;
  channel_name?: string;
  link?: string;
  date?: string;
  created_at?: string;
  summary?: string;
  similarity?: number;
}

// Query Classification Types
type QueryType = 
  | 'list_channels'
  | 'get_transcript'
  | 'get_summary'
  | 'check_channel'
  | 'recent_channel_info'
  | 'recent_video_info'
  | 'video_search' // Existing general video search
  | 'current_info' // Requires web search
  | 'definition'   // Could be RAG or web
  | 'tabular'      // Requires specific formatting, likely web/complex RAG
  | 'investment'   // Likely requires web search
  | 'channel_info' // Could be RAG (check_channel) or web
  | 'generic';     // Fallback

// --- Helper: Query Classification ---
function classifyQuery(query: string): QueryType {
  query = query.toLowerCase();

  if (/^(list|show|give|provide)\s*(me)?\s*(the)?\s*(unique|list of)?\s*(channel names?|creators|video creators)/.test(query)) return 'list_channels';
  if (/^(what is|give me|show me|provide) (the )?transcript of (?:the video )?['"“](.+)['"”]$/.test(query)) return 'get_transcript';
  if (/^(what is|give me|show me|provide) (the )?summary of (?:the video )?['"“](.+)['"”]$/.test(query)) return 'get_summary';
  if (/^(do you have|is there information on|tell me about) (?:the channel )?['"“](.+)['"”]$/.test(query)) return 'check_channel'; // Might need refinement based on video title check
  if (/^(what is the latest|recent info|sentiment on) (?:channel )?['"“](.+)['"”]$/.test(query)) return 'recent_channel_info';
  if (/^(what is the latest|recent info|sentiment on) (?:video )?['"“](.+)['"”]$/.test(query)) return 'recent_video_info';
  if (/(price|stock|market|trading|buy|sell|hold|investment recommendation)/.test(query)) return 'investment';
  if (/^(what is|define) /.test(query)) return 'definition';
  if (/^(compare|vs|versus|difference between)/.test(query)) return 'tabular'; // Or could be generic/web
  if (/(latest|recent) videos?$/.test(query)) return 'video_search'; // Or a specific 'recent_videos' type
  if (/(who are you|what can you do)/.test(query)) return 'generic'; // Or specific 'about_bot'

  // Default classifications (can be refined)
  if (/(how to|why|when|where)/.test(query) || query.endsWith('?')) return 'generic'; // Needs RAG/Web check
  
  return 'video_search'; // Default to searching video content
}

// --- Helper: Database Search Functions ---

async function searchWithEmbeddings(query: string, count = 3): Promise<Reference[]> {
  try {
    const vectorStore = new SupabaseVectorStore(embeddings, {
      client: supabase,
      tableName: 'knowledge',
      queryName: 'match_documents',
    });
    const results = await vectorStore.similaritySearch(query, count);

    // ---- DEBUGGING ----
    console.log("Raw results from similaritySearch:", JSON.stringify(results, null, 2));
    // ---- END DEBUGGING ----

    // Map to desired reference format with corrected field names
    return results.map(doc => {
       // ---- DEBUGGING ----
       console.log("Processing doc.metadata:", JSON.stringify(doc.metadata, null, 2));
       // ---- END DEBUGGING ----
       return {
         video_title: doc.metadata?.video_title,
         channel_name: doc.metadata?.["channel name"],
         link: doc.metadata?.link,
         date: doc.metadata?.date,
         created_at: doc.metadata?.created_at,
         summary: doc.metadata?.summary,
         similarity: doc.metadata?.similarity || 0
       };
    });
  } catch (error) {
    console.error('Error searching with embeddings:', error);
    return [];
  }
}

async function getDistinctChannelNames(): Promise<string[]> {
  try {
    const { data, error } = await supabase
      .from('knowledge')
      .select('"channel name"');
      
    if (error) throw error;
    if (!data) return [];

    // Get unique names
    const uniqueNames = Array.from(new Set(data.map(item => item["channel name"]).filter(Boolean)));
    return uniqueNames;
  } catch (error) {
    console.error('Error fetching distinct channel names:', error);
    return [];
  }
}

async function getSpecificField(title: string, field: 'transcript' | 'summary'): Promise<string | null> {
    console.log(`Attempting direct fetch for ${field} of video: ${title}`);
    try {
        const { data, error } = await supabase
            .from('knowledge')
            .select(field)
            .ilike('video_title', `%${title}%`)
            .limit(1)
            .single();

        if (error) {
            if (error.code === 'PGRST116') {
                console.log(`Direct fetch: No exact match found for title '${title}'`);
            } else {
                console.error(`Error fetching ${field} for '${title}':`, error);
            }
            return null;
        }
        
        return data ? data[field as keyof typeof data] : null;
    } catch (error) {
        console.error(`Unexpected error during direct fetch for ${field} of '${title}':`, error);
        return null;
    }
}

async function checkChannelExists(channelName: string): Promise<boolean> {
  console.log(`Checking existence of channel: ${channelName}`);
  try {
    const { error, count } = await supabase
      .from('knowledge')
      .select('"channel name"', { count: 'exact', head: true })
      .ilike('"channel name"', `%${channelName}%`);
      
    if (error) throw error;
    console.log(`Channel check count for '${channelName}': ${count}`);
    return (count ?? 0) > 0;
  } catch (error) {
    console.error(`Error checking channel existence for '${channelName}':`, error);
    return false;
  }
}

async function getRecentInfo(type: 'channel' | 'video', name: string, count = 3): Promise<Reference[]> {
  const filterField = type === 'channel' ? '"channel name"' : 'video_title';
  console.log(`Fetching recent info for ${type}: ${name}`);
  try {
    const { data, error } = await supabase
      .from('knowledge')
      .select('video_title, summary, "channel name", link, created_at')
      .ilike(filterField, `%${name}%`)
      .order('created_at', { ascending: false })
      .limit(count);

    if (error) throw error;
    console.log(`Found ${data?.length ?? 0} recent items for ${type} '${name}'`);
    return data || [];
  } catch (error) {
    console.error(`Error fetching recent info for ${type} '${name}':`, error);
    return [];
  }
}


// --- Main RAG Processing Function ---
export async function processQuery(query: string): Promise<RAGResponse> {
  console.log(`Processing query: ${query}`);
  const queryType = classifyQuery(query);
  console.log(`Classified as: ${queryType}`);

  let answer = "I couldn't find specific information in the video database.";
  let references: Reference[] = [];
  let source: RAGResponse['source'] = 'none';
  let confidence = 0.0;
  let needsWebSearch = false;

  try {
    switch (queryType) {
      case 'list_channels':
        const channels = await getDistinctChannelNames();
        if (channels.length > 0) {
          answer = "Here are the unique channel names I have information about:\n" + 
                   channels.map((name, index) => `${index + 1}. ${name}`).join('\n');
          source = 'database';
          confidence = 0.95;
        } else {
          answer = "I couldn't retrieve the list of channel names from the database.";
          source = 'none';
          confidence = 0.1;
        }
        break;

      case 'get_transcript':
      case 'get_summary':
        const fieldToGet = queryType === 'get_transcript' ? 'transcript' : 'summary';
        const titleMatch = query.match(/['\"“](.+)['\"”]$/);
        if (titleMatch && titleMatch[1]) {
          const videoTitleFromQuery = titleMatch[1];
          const fieldValue = await getSpecificField(videoTitleFromQuery, fieldToGet);
          if (fieldValue) {
            answer = `Here is the ${fieldToGet} for \"${videoTitleFromQuery}\":\n\n${fieldValue}`;
            source = 'database';
            confidence = 0.98;
             const { data: refData } = await supabase
                .from('knowledge')
                .select('video_title, "channel name", link, created_at')
                .ilike('video_title', `%${videoTitleFromQuery}%`)
                .limit(1)
                .single();
             if (refData) {
                 references = [{
                     video_title: refData.video_title,
                     channel_name: refData["channel name"],
                     link: refData.link,
                     created_at: refData.created_at
                 }];
             }
          } else {
            answer = `I found the video database, but I couldn't retrieve the specific ${fieldToGet} for \"${videoTitleFromQuery}\". It might be missing or the title needs to be more precise.`;
            source = 'database';
            confidence = 0.3;
            needsWebSearch = true;
          }
        } else {
          answer = `Please specify the video title clearly in quotes for me to fetch the ${fieldToGet}.`;
          source = 'none';
          confidence = 0.1;
        }
        break;

      case 'check_channel':
         const channelCheckMatch = query.match(/['\"“](.+)['\"”]$/);
         if (channelCheckMatch && channelCheckMatch[1]) {
            const channelName = channelCheckMatch[1];
            const exists = await checkChannelExists(channelName);
            if (exists) {
                answer = `Yes, I have information about the channel "${channelName}" in my video database.`;
                source = 'database';
                confidence = 0.95;
            } else {
                answer = `No, I could not find information specifically about the channel "${channelName}" in my video database.`;
                source = 'database'; // DB was checked
                confidence = 0.9; // Confident it's not there
                needsWebSearch = true; // User might want general web info
            }
         } else {
             answer = "Please specify the channel name clearly in quotes for me to check.";
             source = 'none';
             confidence = 0.1;
         }
         break;

      case 'recent_channel_info':
      case 'recent_video_info':
        const type = queryType === 'recent_channel_info' ? 'channel' : 'video';
        const nameMatch = query.match(/['\"“](.+)['\"”]$/);
        if (nameMatch && nameMatch[1]) {
          const name = nameMatch[1];
          const recentData = await getRecentInfo(type, name);
          if (recentData.length > 0) {
            answer = `Here's the most recent information I have regarding the ${type} \"${name}\":\n\n` +
                     recentData.map(item =>
                       `- Title: ${item.video_title}\n  Summary: ${item.summary || 'N/A'}\n  Published: ${
                         item.created_at ? new Date(item.created_at).toLocaleDateString() : 'N/A'
                       }`
                     ).join('\n\n');
            references = recentData.map(item => ({
                video_title: item.video_title,
                summary: item.summary,
                channel_name: item.channel_name,
                link: item.link,
                created_at: item.created_at
            }));
            source = 'database';
            confidence = 0.85;
          } else {
            answer = `I couldn't find recent specific information for the ${type} \"${name}\" in the video database.`;
            source = 'database';
            confidence = 0.4;
            needsWebSearch = true;
          }
        } else {
          answer = `Please specify the ${type} name clearly in quotes for me to find recent information.`;
          source = 'none';
          confidence = 0.1;
        }
        break;

       case 'video_search': // General search using embeddings
       case 'generic': // Attempt RAG first for generic queries
       case 'definition': // Attempt RAG first for definitions
         console.log('Performing embedding search for query:', query);
         references = await searchWithEmbeddings(query, 5);
         if (references.length > 0) {
           answer = `Based on the video database, here's what I found related to your query:\n\n` +
                    references.map(ref =>
                      `- ${ref.video_title} (Channel: ${ref.channel_name}, Published: ${
                        ref.created_at ? new Date(ref.created_at).toLocaleDateString() : 'N/A'
                      })`
                    ).join('\n');
           source = 'database';
           confidence = references.reduce((sum, ref) => sum + (ref.similarity || 0.75), 0) / references.length;
           confidence = Math.min(confidence, 0.8);
           console.log(`Embedding search confidence: ${confidence}`);
           if (confidence < 0.5) {
              console.log("Embedding search yielded low confidence results.");
              needsWebSearch = true;
           }
         } else {
           console.log('Embedding search found no relevant documents.');
           answer = "I couldn't find relevant information in the video database for your query.";
           source = 'database';
           confidence = 0.1;
           needsWebSearch = true;
         }
         break;

      case 'current_info':
      case 'investment':
      case 'tabular': // These explicitly need web capabilities or complex generation
        console.log('Query type requires web search or complex generation.');
        needsWebSearch = true;
        answer = "This query seems to require up-to-date information or complex formatting. I'll try searching the web.";
        source = 'none'; // Indicate RAG didn't handle it
        confidence = 0;
        break;

      default:
        console.log('Unhandled query type, defaulting to web search attempt.');
        needsWebSearch = true;
        answer = "I'm not sure how to answer that from the video database. Let me try searching the web.";
        source = 'none';
        confidence = 0;
    }

  } catch (error) {
      console.error('Error during RAG processing:', error);
      answer = "An error occurred while processing your request with the video database.";
      source = 'none';
      confidence = 0;
      needsWebSearch = true; // Fallback to web on error
  }

  // --- Fallback to Web Search --- 
  if (needsWebSearch && confidence < 0.5) { // Only use web search if needed and RAG confidence is low
      console.log('Falling back to web search...');
      const webResult = await performWebSearch(query);
      if (webResult && webResult.answer) {
          console.log('Web search successful.');
          // Combine or replace? Maybe prepend RAG attempt info?
          // For now, prioritize web answer if RAG failed significantly
          if (source === 'none' || confidence < 0.2) { 
             answer = webResult.answer;
             references = webResult.results || []; 
             source = 'web'; 
             confidence = 0.6; // Assign moderate confidence to web results
          } else {
              // RAG had *some* answer, maybe append web info?
              answer += `\n\nAdditionally, a web search found:\n${webResult.answer}`;
              references = [...references, ...(webResult.results || [])];
              source = 'hybrid';
              confidence = (confidence + 0.6) / 2; // Average confidence
          }
      } else {
          console.log('Web search also failed or returned no answer.');
          if (source === 'none' || source === 'database' && confidence < 0.2) { // Only if RAG also failed badly
            answer = "I apologize, but I couldn't find relevant information for your query in the database or via web search. Please try rephrasing.";
            references = [];
            source = 'none';
            confidence = 0;
          }
          // Otherwise, stick with the low-confidence RAG answer
      }
  }

  console.log(`Final Response: Source=${source}, Confidence=${confidence.toFixed(2)}`);
  return { answer, references, source, confidence };
} 
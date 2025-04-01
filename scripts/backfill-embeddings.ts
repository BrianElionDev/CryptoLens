import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config({ path: '.env.local' }); // Load environment variables

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY; // Use Service Key for admin rights

if (!supabaseUrl || !supabaseServiceKey) {
  console.error("Supabase URL or Service Role Key missing in environment variables.");
  process.exit(1);
}

const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);

const BATCH_SIZE = 50; // Process records in batches

async function generateEmbedding(text: string): Promise<number[] | null> {
  try {
    // Ensure text is not excessively long for the embedding model
    // ada-002 has a limit of 8191 tokens. Let's be conservative.
    const MAX_LENGTH = 15000; // Approx chars, adjust as needed
    const truncatedText = text.substring(0, MAX_LENGTH);

    // Log the text being sent (optional, for debugging)
    // console.log(`Sending text to embed: ${truncatedText.substring(0, 100)}...`);

    const { data, error } = await supabaseAdmin.functions.invoke('generate-embedding', {
      body: { inputText: truncatedText },
    });

    if (error) {
      console.error(`Error invoking edge function:`, error.message);
      // Log more details if available
      if (error.context) console.error("Edge function context:", error.context);
      return null;
    }
    if (!data || !data.embedding || !Array.isArray(data.embedding)) {
        console.error(`Invalid or missing embedding in response from edge function:`, data);
        return null;
    }

    return data.embedding;
  } catch (invokeError) {
    console.error(`Failed to invoke or process embedding function:`, invokeError);
    return null;
  }
}

async function backfill() {
  console.log("Starting backfill process...");
  let processedCount = 0;
  let batchOffset = 0;
  let consecutiveFailures = 0;
  const MAX_CONSECUTIVE_FAILURES = 5; // Stop after too many failures

  while (true) {
    console.log(`Fetching batch starting at offset ${batchOffset}...`);
    const { data: records, error: fetchError } = await supabaseAdmin
      .from('knowledge')
      .select('new_id, video_title, summary, transcript')
      .is('embedding', null) // Only get records without embeddings
      .range(batchOffset, batchOffset + BATCH_SIZE - 1);

    if (fetchError) {
      console.error("Error fetching records:", fetchError);
      break; // Stop if we can't fetch records
    }

    if (!records || records.length === 0) {
      console.log("No more records to process.");
      break; // Exit loop if no records found
    }

    console.log(`Processing ${records.length} records in this batch...`);
    let batchSuccess = false; // Flag to check if any record in the batch succeeded

    for (const record of records) {
      // Construct the text to embed (combine relevant fields)
      const textToEmbed = `Title: ${record.video_title || ''}\nSummary: ${record.summary || ''}\nTranscript: ${(record.transcript || '').substring(0, 1000)}`; // Truncate transcript snippet

      if (!textToEmbed.trim() || textToEmbed.length < 50) { // Skip if very little text
          console.warn(`Skipping record ${record.new_id} due to insufficient text.`);
          continue;
      }

      const embedding = await generateEmbedding(textToEmbed);

      if (embedding) {
        const { error: updateError } = await supabaseAdmin
          .from('knowledge')
          .update({ embedding: embedding })
          .eq('new_id', record.new_id);

        if (updateError) {
          console.error(`Failed to update record ${record.new_id}:`, updateError.message);
          consecutiveFailures++;
        } else {
          processedCount++;
          batchSuccess = true;
          consecutiveFailures = 0; // Reset failures on success
          // Optional: Log success periodically
          // if (processedCount % 10 === 0) {
          //   console.log(`Successfully embedded ${processedCount} records...`);
          // }
        }
      } else {
        console.warn(`Skipping update for record ${record.new_id} due to embedding generation failure.`);
        consecutiveFailures++;
      }

      // Safety break if too many consecutive errors occur
      if (consecutiveFailures >= MAX_CONSECUTIVE_FAILURES) {
          console.error(`Stopping due to ${MAX_CONSECUTIVE_FAILURES} consecutive failures.`);
          process.exit(1); // Exit the script
      }

      // Add a small delay to avoid potential rate limiting on the edge function
      await new Promise(resolve => setTimeout(resolve, 200)); // 200ms delay
    }

    // If the entire batch resulted in failures without success, stop
    if (!batchSuccess && records.length > 0) {
        console.error(`Stopping: Full batch processed with no successful updates (Offset: ${batchOffset}). Check Edge Function logs or API Keys.`);
        break;
    }

    batchOffset += records.length; // Increment offset correctly
    console.log(`Finished batch. Processed ${processedCount} records so far.`);

    // Exit loop if this was the last batch
    if (records.length < BATCH_SIZE) {
       console.log("Last batch processed.");
       break;
    }
  }

  console.log(`Backfill completed. Total records successfully embedded: ${processedCount}`);
}

// Add tsx dependency if not present: pnpm add -D tsx @types/node dotenv
// Ensure .env.local has NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY
backfill().catch(err => {
    console.error("Unhandled error during backfill:", err);
    process.exit(1);
}); 
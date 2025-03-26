import { createClient } from '@supabase/supabase-js';
import { OpenAI } from 'openai';
import { NextResponse } from 'next/server';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || '',
  process.env.SUPABASE_SERVICE_ROLE_KEY || ''
);

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY
});

export async function POST(request: Request) {
  try {
    const { question, chatId } = await request.json();

    // Query knowledge base
    const { data: knowledgeData } = await supabase
      .from('knowledge')
      .select('transcript, video_title, channel_name, link, summary')
      .textSearch('transcript', question, {
        type: 'websearch',
        config: 'english'
      })
      .limit(3);

    // Format context from knowledge data
    const context = knowledgeData?.map(item => `
      Video: ${item.video_title}
      Channel: ${item.channel_name}
      Summary: ${item.summary}
      Transcript Excerpt: ${item.transcript.substring(0, 300)}...
      Link: ${item.link}
    `).join('\n\n') || '';

    // Generate response using OpenAI
    const completion = await openai.chat.completions.create({
      model: "gpt-3.5-turbo",
      messages: [
        {
          role: "system",
          content: "You are a helpful assistant that answers questions based on the provided video content context. Use the context to provide accurate answers and include relevant video references."
        },
        {
          role: "user",
          content: `Context:\n${context}\n\nQuestion: ${question}`
        }
      ],
      temperature: 0.7,
    });

    const answer = completion.choices[0].message.content;

    // Save to chat history if chatId provided
    if (chatId) {
      // First get current messages
      const { data: currentChat } = await supabase
        .from('chats')
        .select('messages')
        .eq('id', chatId)
        .single();

      await supabase
        .from('chats')
        .update({
          messages: knowledgeData ? [
            ...(currentChat?.messages || []),
            {
              role: 'assistant',
              content: answer,
              timestamp: new Date().toISOString(),
              references: knowledgeData.map(item => ({
                title: item.video_title,
                link: item.link
              }))
            }
          ] : (currentChat?.messages || [])
        })
        .eq('id', chatId);
    }

    return NextResponse.json({ 
      answer,
      references: knowledgeData?.map(item => ({
        title: item.video_title,
        link: item.link
      }))
    });

  } catch (error) {
    console.error('Chat API Error:', error);
    return NextResponse.json(
      { error: 'Failed to process question' },
      { status: 500 }
    );
  }
} 
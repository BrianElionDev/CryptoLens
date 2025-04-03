import { createClient } from '@supabase/supabase-js';
import { NextResponse } from 'next/server';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || '',
  process.env.SUPABASE_SERVICE_ROLE_KEY || ''
);

// Helper function to determine query type
const getQueryType = (question: string): 'recent' | 'search' => {
  const recentPatterns = [
    'recent videos',
    'latest videos',
    'last videos',
    'newest videos'
  ];
  
  return recentPatterns.some(pattern => 
    question.toLowerCase().includes(pattern)
  ) ? 'recent' : 'search';
};

// Helper function to format date consistently
const formatDate = (date: string) => {
  return new Date(date).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  });
};

export async function POST(request: Request) {
  try {
    const { question, chatId } = await request.json();
    console.log('Received question:', question);

    const queryType = getQueryType(question);

    if (queryType === 'recent') {
      // Handle recent videos query
      console.log('Executing recent videos query...');
      
      const { data: recentVideos, error } = await supabase
        .from('knowledge')
        .select('video_title, "channel name", date, link')
        .order('date', { ascending: false })
        .limit(10);

      console.log('Query results:', { recentVideos, error });

      if (error) {
        console.error('Database Error:', error);
        return NextResponse.json({
          error: 'Failed to fetch videos',
          details: error.message
        }, { status: 500 });
      }

      // Log the actual data received
      console.log('Number of videos found:', recentVideos?.length || 0);

      if (!recentVideos || recentVideos.length === 0) {
        console.log('No data found in knowledge table');
        return NextResponse.json({
          answer: "No recent videos found in the database.",
          references: []
        });
      }

      const formattedList = recentVideos
        .map((video, index) => 
          `${index + 1}. "${video.video_title}" by ${video["channel name"]} (${formatDate(video.date)})`
        )
        .join('\n');

      return NextResponse.json({
        answer: `Here are the most recent videos:\n${formattedList}`,
        references: recentVideos.map(video => ({
          title: video.video_title,
          link: video.link,
          date: formatDate(video.date)
        }))
      });
    } else {
      // Handle content search query
      const { data: knowledgeData, error } = await supabase
        .from('knowledge')
        .select('transcript, video_title, "channel name", link, summary, date')
        .textSearch('transcript', question, {
          type: 'websearch',
          config: 'english'
        })
        .order('date', { ascending: false })
        .limit(5);

      if (error) {
        console.error('Search Error:', error);
        return NextResponse.json({
          error: 'Failed to search content',
          details: error.message
        }, { status: 500 });
      }

      if (!knowledgeData || knowledgeData.length === 0) {
        return NextResponse.json({
          answer: "I couldn't find any relevant content for your question.",
          references: []
        });
      }

      // Format the answer using the most relevant content
      const mostRelevant = knowledgeData[0];
      const answer = `Based on the video "${mostRelevant.video_title}" by ${mostRelevant["channel name"]}:

${mostRelevant.summary || mostRelevant.transcript.substring(0, 300)}...

You can find more details in the video references below.`;

      return NextResponse.json({
        answer,
        references: knowledgeData.map(item => ({
          title: item.video_title,
          link: item.link,
          date: formatDate(item.date)
        }))
      });
    }
  } catch (error) {
    console.error('Request Error:', error);
    return NextResponse.json(
      { error: 'Failed to process request' },
      { status: 500 }
    );
  }
}

function formatSearchResponse(content: KnowledgeItem[], question: string): string {
  // For specific video requests
  if (question.toLowerCase().includes('video') && 
      question.toLowerCase().includes('title')) {
    return content
      .map((item, index) => 
        `${index + 1}. "${item.video_title}" (${formatDate(item.date)})`
      )
      .join('\n');
  }

  // For content-based questions
  const mostRelevant = content[0];
  return `Based on the video "${mostRelevant.video_title}" (${formatDate(mostRelevant.date)}):
  
${mostRelevant.summary}

You can find more details in the video link provided below.`;
} 
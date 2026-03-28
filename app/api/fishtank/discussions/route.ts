export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db';

export async function GET(request: NextRequest) {
  try {
    const limit = parseInt(request.nextUrl.searchParams.get('limit') || '50');
    
    // Get recent discussions with their messages
    const result = await query(
      `SELECT 
        id,
        discussion_type as type,
        messages,
        started_at as timestamp,
        completed_at,
        CASE WHEN completed_at IS NULL THEN 'active' ELSE 'completed' END as status
      FROM agent_discussions
      ORDER BY started_at DESC
      LIMIT 10`
    );

    // Flatten messages from all discussions
    const allMessages: any[] = [];
    const activeDiscussions: any[] = [];

    for (const row of result.rows) {
      const discussion = {
        id: row.id,
        type: row.type,
        topic: row.type?.replace('_', ' ').replace(/\b\w/g, (l: string) => l.toUpperCase()),
        timestamp: row.timestamp,
        status: row.status,
      };

      if (row.status === 'active') {
        activeDiscussions.push(discussion);
      }

      // Extract messages from JSONB
      const messages = row.messages || [];
      for (const msg of messages) {
        // Map agent names to IDs for tier filtering
        const agentNameToId: Record<string, string> = {
          'ANALYST': 'analyst',
          'STRATEGIST': 'strategist',
          'EXECUTOR': 'executor',
          'REPORTER': 'reporter',
          'OPTIONS_STRATEGIST': 'options_strategist',
          'DAY_TRADER': 'day_trader',
          'MOMENTUM': 'momentum',
          'RISK': 'risk',
          'GROWTH': 'growth',
          'VALUE': 'value',
        };
        const agentId = agentNameToId[msg.agent] || msg.agent?.toLowerCase() || 'analyst';
        
        allMessages.push({
          id: msg.id || `${row.id}-${allMessages.length}`,
          discussionId: row.id,
          agent: agentId,
          agentName: msg.agent || msg.role || 'Agent',
          agentEmoji: msg.emoji || '🤖',
          content: msg.content || msg.message,
          sentiment: msg.sentiment || 'neutral',
          timestamp: msg.timestamp || row.timestamp,
          discussionTopic: discussion.topic,
        });
      }
    }

    // Sort by timestamp and limit
    allMessages.sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());
    const limitedMessages = allMessages.slice(-limit);

    return NextResponse.json({
      success: true,
      data: {
        messages: limitedMessages,
        activeDiscussions,
      }
    });
  } catch (error) {
    console.error('Discussions fetch failed:', error);
    return NextResponse.json({
      success: false,
      data: {
        messages: [],
        activeDiscussions: [],
      },
      error: 'Failed to fetch discussions'
    });
  }
}

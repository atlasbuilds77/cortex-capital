import { NextRequest } from 'next/server';
import { discussionEmitter } from '@/lib/agents/collaborative-daemon';
import { getAuthUser } from '@/lib/auth-middleware';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  const encoder = new TextEncoder();

  // Get authenticated user - required for per-user isolation
  const authUser = await getAuthUser(request);
  if (!authUser) {
    return new Response(JSON.stringify({ error: 'Unauthorized' }), {
      status: 401,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  const authenticatedUserId = authUser.userId;

  // Create a TransformStream for SSE
  const stream = new TransformStream();
  const writer = stream.writable.getWriter();

  // Send initial connection message
  writer.write(encoder.encode(`data: ${JSON.stringify({ type: 'connected', timestamp: Date.now(), userId: authenticatedUserId })}\n\n`));

  // Keep-alive interval
  const keepAliveInterval = setInterval(() => {
    writer.write(encoder.encode(': keepalive\n\n'));
  }, 30000);

  // Helper to check if event belongs to this user
  const isEventForUser = (event: any): boolean => {
    // Send if event is public (no userId) or belongs to authenticated user
    return !event.userId || event.userId === authenticatedUserId;
  };

  // Listen for discussion events with per-user filtering
  const onMessage = (message: any) => {
    if (isEventForUser(message)) {
      writer.write(encoder.encode(`data: ${JSON.stringify({ type: 'message', ...message })}\n\n`));
    }
  };

  const onDiscussionStart = (discussion: any) => {
    if (isEventForUser(discussion)) {
      writer.write(encoder.encode(`data: ${JSON.stringify({ type: 'discussion_start', ...discussion })}\n\n`));
    }
  };

  const onDiscussionEnd = (discussion: any) => {
    if (isEventForUser(discussion)) {
      writer.write(encoder.encode(`data: ${JSON.stringify({ type: 'discussion_end', ...discussion })}\n\n`));
    }
  };

  discussionEmitter.on('message', onMessage);
  discussionEmitter.on('discussion_start', onDiscussionStart);
  discussionEmitter.on('discussion_end', onDiscussionEnd);

  // Cleanup on client disconnect
  request.signal.addEventListener('abort', () => {
    clearInterval(keepAliveInterval);
    discussionEmitter.off('message', onMessage);
    discussionEmitter.off('discussion_start', onDiscussionStart);
    discussionEmitter.off('discussion_end', onDiscussionEnd);
    writer.close();
  });

  return new Response(stream.readable, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
    },
  });
}

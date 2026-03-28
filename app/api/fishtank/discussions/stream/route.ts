import { NextRequest } from 'next/server';
import { discussionEmitter } from '@/lib/agents/collaborative-daemon';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  const encoder = new TextEncoder();

  // Create a TransformStream for SSE
  const stream = new TransformStream();
  const writer = stream.writable.getWriter();

  // Send initial connection message
  writer.write(encoder.encode(`data: ${JSON.stringify({ type: 'connected', timestamp: Date.now() })}\n\n`));

  // Keep-alive interval
  const keepAliveInterval = setInterval(() => {
    writer.write(encoder.encode(': keepalive\n\n'));
  }, 30000);

  // Listen for discussion events
  const onMessage = (message: any) => {
    writer.write(encoder.encode(`data: ${JSON.stringify({ type: 'message', ...message })}\n\n`));
  };

  const onDiscussionStart = (discussion: any) => {
    writer.write(encoder.encode(`data: ${JSON.stringify({ type: 'discussion_start', ...discussion })}\n\n`));
  };

  const onDiscussionEnd = (discussion: any) => {
    writer.write(encoder.encode(`data: ${JSON.stringify({ type: 'discussion_end', ...discussion })}\n\n`));
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

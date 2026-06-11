/**
 * Netlify Serverless Function: Gemini API Proxy
 * 
 * Keeps the Gemini API key server-side. The browser sends requests
 * to /.netlify/functions/gemini-proxy, and this function forwards
 * them to the Gemini API with the secret key injected.
 * 
 * Environment variable required in Netlify dashboard:
 *   GEMINI_API_KEY = your Gemini API key
 */

export default async (request) => {
  // Only allow POST
  if (request.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'Method not allowed' }), {
      status: 405,
      headers: { 'Content-Type': 'application/json' }
    });
  }

  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    return new Response(JSON.stringify({ error: 'GEMINI_API_KEY not configured on server' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }

  try {
    const body = await request.json();
    const { streaming, model, ...requestBody } = body;

    const modelName = model || 'gemini-1.5-flash';
    const endpoint = streaming
      ? `https://generativelanguage.googleapis.com/v1beta/models/${modelName}:streamGenerateContent?key=${apiKey}&alt=sse`
      : `https://generativelanguage.googleapis.com/v1beta/models/${modelName}:generateContent?key=${apiKey}`;

    const geminiResponse = await fetch(endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(requestBody)
    });

    if (!geminiResponse.ok) {
      const errorText = await geminiResponse.text();
      return new Response(JSON.stringify({ error: `Gemini API error: ${geminiResponse.status}`, details: errorText }), {
        status: geminiResponse.status,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    if (streaming) {
      // Stream SSE response through to the client
      return new Response(geminiResponse.body, {
        status: 200,
        headers: {
          'Content-Type': 'text/event-stream',
          'Cache-Control': 'no-cache',
          'Connection': 'keep-alive'
        }
      });
    } else {
      // Non-streaming: forward JSON response
      const data = await geminiResponse.json();
      return new Response(JSON.stringify(data), {
        status: 200,
        headers: { 'Content-Type': 'application/json' }
      });
    }
  } catch (err) {
    return new Response(JSON.stringify({ error: 'Proxy error', message: err.message }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
};

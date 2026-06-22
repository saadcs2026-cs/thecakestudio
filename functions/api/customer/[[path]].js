export async function onRequest(context) {
  const { request, env, params } = context;
  const path = (params.path || []).join('/');
  const method = request.method;
  const url = new URL(request.url);

  // GET /api/customer/messages?phone=XXX
  if (path === 'messages' && method === 'GET') {
    const phone = url.searchParams.get('phone');
    if (!phone) return json({ error: 'phone required' }, 400);
    try {
      const { results } = await env.DB.prepare(
        'SELECT id, message, from_admin, read_status, created_at FROM messages WHERE customer_phone = ? ORDER BY created_at DESC LIMIT 30'
      ).bind(phone).all();
      return json(results);
    } catch (e) {
      return json({ error: e.message }, 500);
    }
  }

  // POST /api/customer/messages/read?phone=XXX
  if (path === 'messages/read' && method === 'POST') {
    const phone = url.searchParams.get('phone');
    if (!phone) return json({ error: 'phone required' }, 400);
    try {
      await env.DB.prepare(
        'UPDATE messages SET read_status = 1 WHERE customer_phone = ? AND read_status = 0'
      ).bind(phone).run();
      return json({ success: true });
    } catch (e) {
      return json({ error: e.message }, 500);
    }
  }

  return json({ error: 'Not found' }, 404);
}

function json(obj, status = 200) {
  return new Response(JSON.stringify(obj), {
    status, headers: { 'Content-Type': 'application/json' }
  });
}

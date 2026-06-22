function genToken() {
  return crypto.randomUUID() + '-' + Date.now();
}

function checkAuth(request, env) {
  const auth = request.headers.get('Authorization') || '';
  const token = auth.replace('Bearer ', '').trim();
  if (!token) return false;
  return token === env.__sessionToken;
}

export async function onRequest(context) {
  const { request, env, params } = context;
  const path = (params.path || []).join('/');
  const method = request.method;

  // LOGIN
  if (path === 'login' && method === 'POST') {
    const { username, password } = await request.json();
    try {
      const row = await env.DB.prepare(
        'SELECT * FROM admin WHERE username = ? AND password = ?'
      ).bind(username, password).first();
      if (!row) return json({ success: false, error: 'Invalid credentials' }, 401);
      const token = genToken();
      env.__sessionToken = token;
      return json({ success: true, token });
    } catch (e) {
      return json({ success: false, error: e.message }, 500);
    }
  }

  if (!checkAuth(request, env)) return json({ error: 'Unauthorized' }, 401);

  // ORDERS
  if (path === 'orders' && method === 'GET') {
    const url = new URL(request.url);
    const status = url.searchParams.get('status');
    let stmt;
    if (status) {
      stmt = env.DB.prepare('SELECT * FROM orders WHERE status = ? ORDER BY created_at DESC').bind(status);
    } else {
      stmt = env.DB.prepare('SELECT * FROM orders ORDER BY created_at DESC');
    }
    const { results } = await stmt.all();
    return json(results);
  }

  const orderMatch = path.match(/^orders\/(\d+)$/);
  if (orderMatch && method === 'PUT') {
    const id = orderMatch[1];
    const body = await request.json();
    const fields = [], values = [];
    ['status', 'admin_message', 'estimated_time'].forEach(k => {
      if (body[k] !== undefined) { fields.push(`${k} = ?`); values.push(body[k]); }
    });
    if (!fields.length) return json({ error: 'Nothing to update' }, 400);
    values.push(id);
    await env.DB.prepare(`UPDATE orders SET ${fields.join(', ')} WHERE id = ?`).bind(...values).run();
    return json({ success: true });
  }

  // SEND MESSAGE to customer inbox
  if (path === 'sendmessage' && method === 'POST') {
    const { phone, message } = await request.json();
    if (!phone || !message) return json({ error: 'phone and message required' }, 400);
    try {
      const cleanPhone = phone.trim().replace(/[^\d+]/g, '');
      const exists = await env.DB.prepare('SELECT id FROM customers WHERE phone = ?').bind(cleanPhone).first();
      if (!exists) return json({ success: false, error: 'Customer has no account. Use WhatsApp instead.' });
      await env.DB.prepare(
        'INSERT INTO messages (customer_phone, message, from_admin) VALUES (?, ?, 1)'
      ).bind(cleanPhone, message.trim().slice(0, 500)).run();
      return json({ success: true });
    } catch (e) {
      return json({ error: e.message }, 500);
    }
  }

  // PRODUCTS
  if (path === 'products' && method === 'POST') {
    const b = await request.json();
    await env.DB.prepare(`
      INSERT INTO products (name, category, description, price_1pound, price_2pound, price_per_piece, image_url)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `).bind(
      b.name, b.category, b.description || '',
      b.price_1pound || null, b.price_2pound || null, b.price_per_piece || null,
      b.image_url || ''
    ).run();
    return json({ success: true });
  }

  const prodMatch = path.match(/^products\/(\d+)$/);
  if (prodMatch && method === 'DELETE') {
    await env.DB.prepare('DELETE FROM products WHERE id = ?').bind(prodMatch[1]).run();
    return json({ success: true });
  }

  // FEEDBACK
  if (path === 'feedback' && method === 'GET') {
    const { results } = await env.DB.prepare(
      'SELECT * FROM feedback ORDER BY created_at DESC LIMIT 100'
    ).all();
    return json(results);
  }

  const fbMatch = path.match(/^feedback\/(\d+)$/);
  if (fbMatch && method === 'DELETE') {
    await env.DB.prepare('DELETE FROM feedback WHERE id = ?').bind(fbMatch[1]).run();
    return json({ success: true });
  }

  return json({ error: 'Not found' }, 404);
}

function json(obj, status = 200) {
  return new Response(JSON.stringify(obj), {
    status, headers: { 'Content-Type': 'application/json' }
  });
}

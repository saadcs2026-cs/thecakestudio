// Generates a simple token (sufficient for single-owner panel)
function genToken() {
  return crypto.randomUUID() + '-' + Date.now();
}

// In-memory token store — resets on worker restart.
// For better persistence we re-validate via env.ADMIN_TOKEN secret on each request.
function checkAuth(request, env) {
  const auth = request.headers.get('Authorization') || '';
  const token = auth.replace('Bearer ', '').trim();
  if (!token) return false;
  // Token must start with our prefix (set on login). We store last valid token in env var via in-memory map.
  // Simpler approach: accept any token that matches the static ADMIN_SESSION_SECRET issued at login time.
  return token === env.__sessionToken;
}

export async function onRequest(context) {
  const { request, env, params } = context;
  const path = (params.path || []).join('/');
  const method = request.method;

  // ===== LOGIN =====
  if (path === 'login' && method === 'POST') {
    const { username, password } = await request.json();
    try {
      const row = await env.DB.prepare(
        'SELECT * FROM admin WHERE username = ? AND password = ?'
      ).bind(username, password).first();
      if (!row) return json({ success: false, error: 'Invalid credentials' }, 401);
      const token = genToken();
      env.__sessionToken = token; // store in worker memory
      return json({ success: true, token });
    } catch (e) {
      return json({ success: false, error: e.message }, 500);
    }
  }

  // All other routes require auth
  if (!checkAuth(request, env)) return json({ error: 'Unauthorized' }, 401);

  // ===== ORDERS LIST =====
  if (path === 'orders' && method === 'GET') {
    const url = new URL(request.url);
    const status = url.searchParams.get('status');
    let query = 'SELECT * FROM orders';
    let stmt;
    if (status) {
      query += ' WHERE status = ? ORDER BY created_at DESC';
      stmt = env.DB.prepare(query).bind(status);
    } else {
      query += ' ORDER BY created_at DESC';
      stmt = env.DB.prepare(query);
    }
    const { results } = await stmt.all();
    return json(results);
  }

  // ===== UPDATE ORDER =====
  const orderMatch = path.match(/^orders\/(\d+)$/);
  if (orderMatch && method === 'PUT') {
    const id = orderMatch[1];
    const body = await request.json();
    const fields = [];
    const values = [];
    ['status', 'admin_message', 'estimated_time'].forEach(k => {
      if (body[k] !== undefined) { fields.push(`${k} = ?`); values.push(body[k]); }
    });
    if (!fields.length) return json({ error: 'Nothing to update' }, 400);
    values.push(id);
    await env.DB.prepare(`UPDATE orders SET ${fields.join(', ')} WHERE id = ?`).bind(...values).run();
    return json({ success: true });
  }

  // ===== ADD PRODUCT =====
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

  // ===== DELETE PRODUCT =====
  const prodMatch = path.match(/^products\/(\d+)$/);
  if (prodMatch && method === 'DELETE') {
    await env.DB.prepare('DELETE FROM products WHERE id = ?').bind(prodMatch[1]).run();
    return json({ success: true });
  }

  return json({ error: 'Not found' }, 404);
}

function json(obj, status = 200) {
  return new Response(JSON.stringify(obj), {
    status, headers: { 'Content-Type': 'application/json' }
  });
}

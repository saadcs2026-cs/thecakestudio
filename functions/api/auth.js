export async function onRequestPost(context) {
  try {
    const { mode, phone, password, name } = await context.request.json();

    if (!phone || !password) return json({ success: false, error: 'Phone and password required' }, 400);
    if (password.length < 4) return json({ success: false, error: 'Password too short' }, 400);

    const cleanPhone = phone.trim().replace(/[^\d+]/g, '');

    if (mode === 'signup') {
      if (!name || !name.trim()) return json({ success: false, error: 'Name required' }, 400);
      const existing = await context.env.DB.prepare(
        'SELECT id FROM customers WHERE phone = ?'
      ).bind(cleanPhone).first();
      if (existing) return json({ success: false, error: 'Phone already registered. Please login.' }, 400);

      await context.env.DB.prepare(
        'INSERT INTO customers (phone, name, password) VALUES (?, ?, ?)'
      ).bind(cleanPhone, name.trim().slice(0, 60), password).run();

      return json({ success: true, phone: cleanPhone, name: name.trim() });
    }

    // login
    const user = await context.env.DB.prepare(
      'SELECT * FROM customers WHERE phone = ? AND password = ?'
    ).bind(cleanPhone, password).first();

    if (!user) return json({ success: false, error: 'Invalid phone or password' }, 401);

    return json({ success: true, phone: user.phone, name: user.name });
  } catch (e) {
    return json({ success: false, error: e.message }, 500);
  }
}

function json(obj, status = 200) {
  return new Response(JSON.stringify(obj), {
    status, headers: { 'Content-Type': 'application/json' }
  });
}

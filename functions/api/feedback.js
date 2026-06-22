// GET — public feedback list (latest 12 approved)
export async function onRequestGet(context) {
  try {
    const { results } = await context.env.DB.prepare(
      'SELECT id, customer_name, rating, message, created_at FROM feedback WHERE approved = 1 ORDER BY created_at DESC LIMIT 12'
    ).all();
    return new Response(JSON.stringify(results), {
      headers: { 'Content-Type': 'application/json' }
    });
  } catch (e) {
    return new Response(JSON.stringify({ error: e.message }), {
      status: 500, headers: { 'Content-Type': 'application/json' }
    });
  }
}

// POST — customer submits feedback
export async function onRequestPost(context) {
  try {
    const { customer_name, order_code, rating, message } = await context.request.json();
    if (!customer_name || !rating || !message) {
      return new Response(JSON.stringify({ error: 'Missing fields' }), { status: 400 });
    }
    const r = Math.max(1, Math.min(5, parseInt(rating)));
    await context.env.DB.prepare(
      'INSERT INTO feedback (customer_name, order_code, rating, message) VALUES (?, ?, ?, ?)'
    ).bind(customer_name.trim().slice(0, 60), order_code || null, r, message.trim().slice(0, 400)).run();
    return new Response(JSON.stringify({ success: true }), {
      headers: { 'Content-Type': 'application/json' }
    });
  } catch (e) {
    return new Response(JSON.stringify({ error: e.message }), { status: 500 });
  }
}

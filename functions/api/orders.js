export async function onRequestPost(context) {
  try {
    const body = await context.request.json();
    const {
      customer_name, customer_phone, customer_address, city,
      items, total_amount, delivery_date, notes,
      payment_method, sender_name, sender_number, payment_screenshot
    } = body;

    if (!customer_name || !customer_phone || !customer_address || !city || !items || !payment_method) {
      return new Response(JSON.stringify({ success: false, error: 'Missing required fields' }), {
        status: 400, headers: { 'Content-Type': 'application/json' }
      });
    }

    const allowedCities = ['Hyderabad'];
    if (!allowedCities.includes(city)) {
      return new Response(JSON.stringify({ success: false, error: 'We do not deliver to this city yet' }), {
        status: 400, headers: { 'Content-Type': 'application/json' }
      });
    }

    const cleanPhone = customer_phone.trim().replace(/[^\d+]/g, '');
    const order_code = 'CS-' + Date.now().toString().slice(-8);

    await context.env.DB.prepare(`
      INSERT INTO orders (
        order_code, customer_name, customer_phone, customer_address, city,
        items, total_amount, delivery_date, notes,
        payment_method, sender_name, sender_number, payment_screenshot
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).bind(
      order_code, customer_name, cleanPhone, customer_address, city,
      JSON.stringify(items), total_amount, delivery_date || null, notes || null,
      payment_method, sender_name || null, sender_number || null, payment_screenshot || null
    ).run();

    return new Response(JSON.stringify({ success: true, order_code }), {
      headers: { 'Content-Type': 'application/json' }
    });
  } catch (e) {
    return new Response(JSON.stringify({ success: false, error: e.message }), {
      status: 500, headers: { 'Content-Type': 'application/json' }
    });
  }
}

export async function onRequestGet(context) {
  const url = new URL(context.request.url);
  const code = url.searchParams.get('code');
  if (!code) return new Response(JSON.stringify({ error: 'code required' }), { status: 400 });
  try {
    const row = await context.env.DB.prepare(
      'SELECT order_code, status, estimated_time, total_amount FROM orders WHERE order_code = ?'
    ).bind(code).first();
    if (!row) return new Response(JSON.stringify({ error: 'Not found' }), { status: 404 });
    return new Response(JSON.stringify(row), { headers: { 'Content-Type': 'application/json' } });
  } catch (e) {
    return new Response(JSON.stringify({ error: e.message }), { status: 500 });
  }
}

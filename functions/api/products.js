export async function onRequestGet(context) {
  try {
    const { results } = await context.env.DB.prepare(
      'SELECT * FROM products WHERE available = 1 ORDER BY category, id'
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

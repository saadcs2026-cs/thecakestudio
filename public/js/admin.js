// ⚠️ REPLACE with your Cloudinary cloud name
const CLOUDINARY_CLOUD = 'dmvcr0fub';
const CLOUDINARY_PRESET = 'cake_studio_unsigned';

let token = localStorage.getItem('cs_admin_token') || '';

function showApp() {
  document.getElementById('loginBox').style.display = 'none';
  document.getElementById('dashBox').style.display = 'block';
  document.getElementById('logoutBtn').style.display = 'inline-flex';
  loadOrders();
}

async function login() {
  const username = document.getElementById('lg_user').value.trim();
  const password = document.getElementById('lg_pass').value;
  try {
    const res = await fetch('/api/admin/login', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, password })
    });
    const data = await res.json();
    if (!data.success) { showToast('Invalid credentials', false); return; }
    token = data.token;
    localStorage.setItem('cs_admin_token', token);
    showApp();
  } catch { showToast('Login failed', false); }
}

function logout() {
  if (!confirm('Logout from admin?')) return;
  localStorage.removeItem('cs_admin_token');
  token = '';
  location.reload();
}

if (token) showApp();

function showTab(name, el) {
  document.querySelectorAll('.admin-tab').forEach(t => t.classList.remove('active'));
  el.classList.add('active');
  ['orders', 'products', 'add', 'feedback'].forEach(t => {
    document.getElementById('tab-' + t).style.display = t === name ? 'block' : 'none';
  });
  if (name === 'orders') loadOrders();
  if (name === 'products') loadProducts();
  if (name === 'feedback') loadFeedback();
}

// ===== ORDERS =====
async function loadOrders() {
  const status = document.getElementById('statusFilter').value;
  const url = '/api/admin/orders' + (status ? '?status=' + encodeURIComponent(status) : '');
  try {
    const res = await fetch(url, { headers: { 'Authorization': 'Bearer ' + token } });
    if (res.status === 401) { logout(); return; }
    const orders = await res.json();
    renderOrders(orders);
  } catch { document.getElementById('ordersList').innerHTML = '<p>Failed to load orders.</p>'; }
}

function renderOrders(orders) {
  const box = document.getElementById('ordersList');
  if (!orders.length) { box.innerHTML = '<p style="color:var(--text-soft)">No orders yet.</p>'; return; }

  box.innerHTML = orders.map(o => {
    let items = [];
    try { items = JSON.parse(o.items); } catch {}
    const itemsHTML = items.map(i => `<li>${escapeHtml(i.name)} (${i.variant}) × ${i.qty} — Rs. ${i.unitPrice * i.qty}</li>`).join('');
    const screenshot = o.payment_screenshot
      ? `<a href="${o.payment_screenshot}" target="_blank" style="color:var(--primary);font-weight:500">View Screenshot</a>`
      : '<span style="color:var(--muted)">No screenshot</span>';

    const waNumber = (o.customer_phone || '').replace(/\D/g,'').replace(/^0/,'92');
    const waText = encodeURIComponent('Hi ' + o.customer_name + ', regarding your Cake Studio order #' + o.order_code + ': ');

    return `
      <div class="order-card">
        <div class="order-head">
          <div>
            <h3>#${o.order_code}</h3>
            <small style="color:var(--muted)">${new Date(o.created_at).toLocaleString()}</small>
          </div>
          <span class="status-pill status-${o.status}">${o.status}</span>
        </div>

        <div style="margin-top:14px;display:grid;grid-template-columns:1fr 1fr;gap:18px">
          <div>
            <div class="order-info-block"><img src="/icons/user.png" alt=""><div><b>${escapeHtml(o.customer_name)}</b></div></div>
            <div class="order-info-block"><img src="/icons/phone.png" alt=""><div><a href="tel:${o.customer_phone}" style="color:var(--primary)">${o.customer_phone}</a></div></div>
            <div class="order-info-block"><img src="/icons/location.png" alt=""><div>${escapeHtml(o.customer_address)}, ${escapeHtml(o.city)}</div></div>
            ${o.delivery_date ? `<div class="order-info-block"><img src="/icons/calendar.png" alt=""><div>${o.delivery_date}</div></div>` : ''}
            ${o.notes ? `<div class="order-info-block"><b>Notes:</b><div>${escapeHtml(o.notes)}</div></div>` : ''}
          </div>
          <div>
            <div class="order-info-block"><img src="/icons/card.png" alt=""><div><b>${o.payment_method}</b></div></div>
            ${o.sender_name ? `<div class="order-info-block"><div style="width:14px"></div><div>Sender: ${escapeHtml(o.sender_name)}</div></div>` : ''}
            ${o.sender_number ? `<div class="order-info-block"><div style="width:14px"></div><div>Number: ${o.sender_number}</div></div>` : ''}
            <div class="order-info-block"><div style="width:14px"></div><div>${screenshot}</div></div>
            <div style="margin-top:8px;font-size:18px;color:var(--primary);font-weight:700">Rs. ${o.total_amount}</div>
          </div>
        </div>

        <div style="margin-top:14px">
          <div class="order-info-block"><img src="/icons/list.png" alt=""><div><b>Items</b></div></div>
          <ul style="margin-left:24px;font-size:13px;color:var(--text-soft);line-height:1.7">${itemsHTML}</ul>
        </div>

        <div style="margin-top:16px;display:flex;gap:8px;flex-wrap:wrap;align-items:center">
          <select id="st_${o.id}" class="admin-input">
            ${['Pending','Confirmed','Preparing','Out for Delivery','Delivered','Cancelled']
              .map(s => `<option ${s === o.status ? 'selected' : ''}>${s}</option>`).join('')}
          </select>
          <input id="et_${o.id}" placeholder="Est. time (e.g. Today 6PM)" value="${o.estimated_time || ''}" class="admin-input" style="flex:1;min-width:160px">
          <button class="btn-ghost" onclick="updateOrder(${o.id})">Update</button>
        </div>

       <div style="margin-top:10px;display:flex;gap:8px;align-items:center">
          <input id="msg_${o.id}" placeholder="Send message to customer's account inbox" value="" class="admin-input" style="flex:1">
          <button class="btn-ghost" onclick="sendCustomerMsg('${o.customer_phone}', ${o.id})">Send Msg</button>
          <a href="https://wa.me/${waNumber}?text=${waText}" target="_blank" class="wa-btn">WhatsApp</a>
        </div>

        <div style="margin-top:12px;padding-top:12px;border-top:1px dashed var(--border);text-align:right">
          <button class="btn-ghost" onclick="deleteOrder(${o.id}, '${o.order_code}')" style="color:var(--danger);border-color:#f5b5b5">Delete Order</button>
        </div>
      </div>`;
      </div>`;
  }).join('');
}

async function updateOrder(id) {
  const status = document.getElementById('st_' + id).value;
  const estimated_time = document.getElementById('et_' + id).value;
  try {
    const res = await fetch('/api/admin/orders/' + id, {
      method: 'PUT', headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + token },
      body: JSON.stringify({ status, estimated_time })
    });
    if (res.ok) { showToast('Order updated'); loadOrders(); }
    else showToast('Update failed', false);
  } catch { showToast('Update failed', false); }
}

async function sendCustomerMsg(phone, id) {
  const message = document.getElementById('msg_' + id).value.trim();
  if (!message) { showToast('Type a message first', false); return; }
  if (!phone) { showToast('No customer phone', false); return; }
  try {
    const res = await fetch('/api/admin/sendmessage', {
      method: 'POST', headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + token },
      body: JSON.stringify({ phone, message })
    });
    const data = await res.json();
    if (data.success) {
      showToast('Message sent to customer inbox');
      document.getElementById('msg_' + id).value = '';
    } else {
      showToast(data.error || 'Failed', false);
    }
  } catch { showToast('Failed', false); }
}

// ===== PRODUCTS =====
async function loadProducts() {
  try {
    const res = await fetch('/api/products');
    const list = await res.json();
    const box = document.getElementById('prodList');
    if (!list.length) { box.innerHTML = '<p style="color:var(--text-soft)">No products.</p>'; return; }
    box.innerHTML = list.map(p => {
      const img = p.image_url || `https://placehold.co/300x200/fce4ec/e9779a?text=${encodeURIComponent(p.name)}`;
      let price = '';
      if (p.price_per_piece) price = `Rs. ${p.price_per_piece}/pc`;
      else if (p.price_1pound && p.price_2pound) price = `Rs. ${p.price_1pound} / ${p.price_2pound}`;
      else if (p.price_2pound) price = `Rs. ${p.price_2pound}`;
      else if (p.price_1pound) price = `Rs. ${p.price_1pound}`;
      return `
        <div class="card">
          <div class="card-img"><img src="${img}" onerror="this.src='https://placehold.co/300x200/fce4ec/e9779a?text=${encodeURIComponent(p.name)}'"></div>
          <div class="card-body">
            <h3>${escapeHtml(p.name)}</h3>
            <p>${escapeHtml(p.description || '')}</p>
            <div class="price-row">
              <span class="price">${price}</span>
              <button class="add-btn" style="background:var(--danger);box-shadow:none" onclick="deleteProduct(${p.id})">×</button>
            </div>
          </div>
        </div>`;
    }).join('');
  } catch {}
}

async function deleteProduct(id) {
  if (!confirm('Delete this product permanently?')) return;
  const res = await fetch('/api/admin/products/' + id, {
    method: 'DELETE', headers: { 'Authorization': 'Bearer ' + token }
  });
  if (res.ok) { showToast('Deleted'); loadProducts(); }
  else showToast('Delete failed', false);
}

async function uploadToCloudinary(file) {
  const fd = new FormData();
  fd.append('file', file);
  fd.append('upload_preset', CLOUDINARY_PRESET);
  const res = await fetch(`https://api.cloudinary.com/v1_1/${CLOUDINARY_CLOUD}/image/upload`, {
    method: 'POST', body: fd
  });
  const data = await res.json();
  return data.secure_url;
}

async function addProduct() {
  const btn = document.getElementById('addBtn');
  const name = document.getElementById('p_name').value.trim();
  const category = document.getElementById('p_cat').value;
  const description = document.getElementById('p_desc').value.trim();
  const price_1pound = parseInt(document.getElementById('p_p1').value) || null;
  const price_2pound = parseInt(document.getElementById('p_p2').value) || null;
  const price_per_piece = parseInt(document.getElementById('p_pp').value) || null;
  const file = document.getElementById('p_img').files[0];

  if (!name) { showToast('Name required', false); return; }
  if (!price_1pound && !price_2pound && !price_per_piece) { showToast('Set at least one price', false); return; }

  btn.disabled = true; btn.textContent = 'Uploading...';
  let image_url = '';
  if (file) {
    try { image_url = await uploadToCloudinary(file); }
    catch { showToast('Image upload failed', false); btn.disabled = false; btn.textContent = 'Add Product'; return; }
  }

  try {
    const res = await fetch('/api/admin/products', {
      method: 'POST', headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + token },
      body: JSON.stringify({ name, category, description, price_1pound, price_2pound, price_per_piece, image_url })
    });
    if (res.ok) {
      showToast('Product added');
      ['p_name','p_desc','p_p1','p_p2','p_pp','p_img'].forEach(id => document.getElementById(id).value = '');
    } else showToast('Failed', false);
  } catch { showToast('Failed', false); }
  btn.disabled = false; btn.textContent = 'Add Product';
}

// ===== FEEDBACK =====
async function loadFeedback() {
  try {
    const res = await fetch('/api/admin/feedback', { headers: { 'Authorization': 'Bearer ' + token } });
    if (res.status === 401) { logout(); return; }
    const list = await res.json();
    const box = document.getElementById('feedbackList');
    if (!list.length) { box.innerHTML = '<p style="color:var(--text-soft)">No feedback yet.</p>'; return; }
    box.innerHTML = list.map(r => {
      let stars = '';
      for (let i = 1; i <= 5; i++) {
        stars += `<img src="/icons/star.png" class="${i<=r.rating?'on':'off'}" style="width:14px;height:14px" alt="">`;
      }
      const date = new Date(r.created_at).toLocaleString();
      return `
        <div class="order-card">
          <div style="display:flex;justify-content:space-between;align-items:start;flex-wrap:wrap;gap:10px">
            <div>
              <div style="display:flex;gap:4px;margin-bottom:6px">${stars}</div>
              <h3 style="font-size:16px">${escapeHtml(r.customer_name)} ${r.order_code?`<small style="color:var(--muted);font-weight:400">— ${r.order_code}</small>`:''}</h3>
              <p style="color:var(--text-soft);font-size:14px;line-height:1.6;margin-top:8px;font-style:italic">"${escapeHtml(r.message)}"</p>
              <small style="color:var(--muted);font-size:11px">${date}</small>
            </div>
            <button class="btn-ghost" onclick="deleteFeedback(${r.id})" style="color:var(--danger);border-color:#f5b5b5">Delete</button>
          </div>
        </div>`;
    }).join('');
  } catch {}
}

async function deleteFeedback(id) {
  if (!confirm('Delete this feedback?')) return;
  const res = await fetch('/api/admin/feedback/' + id, {
    method: 'DELETE', headers: { 'Authorization': 'Bearer ' + token }
  });
  if (res.ok) { showToast('Deleted'); loadFeedback(); }
  else showToast('Failed', false);
}

function escapeHtml(s) {
  return String(s || '').replace(/[&<>"']/g, m => ({ '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;' }[m]));
}

function showToast(msg, ok = true) {
  const t = document.getElementById('toast');
  t.textContent = msg;
  t.style.borderLeftColor = ok ? 'var(--primary)' : 'var(--danger)';
  t.classList.add('show');
  setTimeout(() => t.classList.remove('show'), 2200);
}

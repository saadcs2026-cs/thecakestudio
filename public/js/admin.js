// ⚠️ Cloudinary unsigned upload — REPLACE these
const CLOUDINARY_CLOUD = 'dmvcr0fub';
const CLOUDINARY_PRESET = 'cake_studio_unsigned';

let token = localStorage.getItem('cs_admin_token') || '';

// ===== Auth =====
function showApp() {
  document.getElementById('loginBox').style.display = 'none';
  document.getElementById('dashBox').style.display = 'block';
  document.getElementById('logoutBtn').style.display = 'inline-block';
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
  localStorage.removeItem('cs_admin_token');
  token = '';
  location.reload();
}

if (token) showApp();

// ===== Tabs =====
function showTab(name, el) {
  document.querySelectorAll('.admin-tab').forEach(t => t.classList.remove('active'));
  el.classList.add('active');
  ['orders', 'products', 'add'].forEach(t => {
    document.getElementById('tab-' + t).style.display = t === name ? 'block' : 'none';
  });
  if (name === 'orders') loadOrders();
  if (name === 'products') loadProducts();
}

// ===== Orders =====
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
  if (!orders.length) { box.innerHTML = '<p style="color:var(--muted)">No orders yet.</p>'; return; }

  box.innerHTML = orders.map(o => {
    let items = [];
    try { items = JSON.parse(o.items); } catch {}
    const itemsHTML = items.map(i => `<li>${i.name} (${i.variant}) × ${i.qty} — Rs. ${i.unitPrice * i.qty}</li>`).join('');
    const screenshot = o.payment_screenshot
      ? `<a href="${o.payment_screenshot}" target="_blank" style="color:var(--accent)">View Screenshot 🖼</a>`
      : '<span style="color:var(--muted)">No screenshot</span>';

    return `
      <div class="order-card">
        <div class="order-head">
          <div>
            <h3 style="font-family:'Playfair Display',serif">#${o.order_code}</h3>
            <small style="color:var(--muted)">${new Date(o.created_at).toLocaleString()}</small>
          </div>
          <span class="status-pill status-${o.status}">${o.status}</span>
        </div>
        <div style="margin-top:14px;display:grid;grid-template-columns:1fr 1fr;gap:14px;font-size:13px">
          <div>
            <b>👤 Customer</b><br>
            ${o.customer_name}<br>
            📞 <a href="tel:${o.customer_phone}" style="color:var(--accent)">${o.customer_phone}</a><br>
            📍 ${o.customer_address}, ${o.city}<br>
            ${o.delivery_date ? `📅 ${o.delivery_date}<br>` : ''}
            ${o.notes ? `📝 ${o.notes}` : ''}
          </div>
          <div>
            <b>💳 Payment</b><br>
            Method: ${o.payment_method}<br>
            ${o.sender_name ? `Sender: ${o.sender_name}<br>` : ''}
            ${o.sender_number ? `Number: ${o.sender_number}<br>` : ''}
            ${screenshot}<br>
            <b style="color:var(--accent);font-size:16px">Rs. ${o.total_amount}</b>
          </div>
        </div>
        <div style="margin-top:12px"><b>🧾 Items</b><ul style="margin-left:20px;font-size:13px">${itemsHTML}</ul></div>

        <div style="margin-top:14px;display:flex;gap:8px;flex-wrap:wrap">
          <select id="st_${o.id}" style="background:var(--bg-2);color:var(--text);padding:8px 12px;border:1px solid rgba(255,255,255,.1);border-radius:10px">
            ${['Pending','Confirmed','Preparing','Out for Delivery','Delivered','Cancelled']
              .map(s => `<option ${s === o.status ? 'selected' : ''}>${s}</option>`).join('')}
          </select>
          <input id="et_${o.id}" placeholder="Est. time (e.g. Today 6PM)" value="${o.estimated_time || ''}"
            style="background:var(--bg-2);color:var(--text);padding:8px 12px;border:1px solid rgba(255,255,255,.1);border-radius:10px;flex:1;min-width:160px">
          <button class="btn-ghost" onclick="updateOrder(${o.id})">Update</button>
        </div>
        <div style="margin-top:10px;display:flex;gap:8px">
          <input id="msg_${o.id}" placeholder="Message to customer" value="${o.admin_message || ''}"
            style="background:var(--bg-2);color:var(--text);padding:8px 12px;border:1px solid rgba(255,255,255,.1);border-radius:10px;flex:1">
          <button class="btn-ghost" onclick="sendMsg(${o.id})">Save Msg</button>
          <a href="https://wa.me/${(o.customer_phone || '').replace(/\D/g,'').replace(/^0/,'92')}?text=${encodeURIComponent('Hi ' + o.customer_name + ', your Cake Studio order #' + o.order_code + ' update: ')}"
            target="_blank" class="btn-ghost" style="background:#25D366;color:#fff;border:none">💬 WhatsApp</a>
        </div>
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
    if (res.ok) { showToast('Order updated ✅'); loadOrders(); }
    else showToast('Update failed', false);
  } catch { showToast('Update failed', false); }
}

async function sendMsg(id) {
  const admin_message = document.getElementById('msg_' + id).value;
  try {
    const res = await fetch('/api/admin/orders/' + id, {
      method: 'PUT', headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + token },
      body: JSON.stringify({ admin_message })
    });
    if (res.ok) showToast('Message saved ✅');
    else showToast('Failed', false);
  } catch { showToast('Failed', false); }
}

// ===== Products =====
async function loadProducts() {
  try {
    const res = await fetch('/api/products');
    const list = await res.json();
    const box = document.getElementById('prodList');
    if (!list.length) { box.innerHTML = '<p style="color:var(--muted)">No products.</p>'; return; }
    box.innerHTML = list.map(p => {
      const img = p.image_url || `https://via.placeholder.com/300x200/33231d/e58a4a?text=${encodeURIComponent(p.name)}`;
      let price = '';
      if (p.price_per_piece) price = `Rs. ${p.price_per_piece}/pc`;
      else if (p.price_1pound && p.price_2pound) price = `Rs. ${p.price_1pound} / ${p.price_2pound}`;
      else if (p.price_2pound) price = `Rs. ${p.price_2pound}`;
      else if (p.price_1pound) price = `Rs. ${p.price_1pound}`;
      return `
        <div class="card">
          <div class="card-img"><img src="${img}" onerror="this.src='https://via.placeholder.com/300x200/33231d/e58a4a?text=${encodeURIComponent(p.name)}'"></div>
          <div class="card-body">
            <h3>${p.name}</h3>
            <p>${p.description || ''}</p>
            <div class="price-row">
              <span class="price">${price}</span>
              <button class="add-btn" style="background:var(--danger)" onclick="deleteProduct(${p.id})">×</button>
            </div>
          </div>
        </div>`;
    }).join('');
  } catch {}
}

async function deleteProduct(id) {
  if (!confirm('Delete this product?')) return;
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
      showToast('Product added ✅');
      ['p_name','p_desc','p_p1','p_p2','p_pp','p_img'].forEach(id => document.getElementById(id).value = '');
    } else showToast('Failed', false);
  } catch { showToast('Failed', false); }
  btn.disabled = false; btn.textContent = 'Add Product';
}

function showToast(msg, ok = true) {
  const t = document.getElementById('toast');
  t.textContent = msg;
  t.style.borderLeftColor = ok ? 'var(--accent)' : 'var(--danger)';
  t.classList.add('show');
  setTimeout(() => t.classList.remove('show'), 2200);
}

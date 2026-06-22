let cart = JSON.parse(localStorage.getItem('cs_cart') || '[]');
let products = [];
let currentCat = 'All';
let customer = JSON.parse(localStorage.getItem('cs_customer') || 'null');
let authMode = 'login';

document.addEventListener('DOMContentLoaded', () => {
  document.querySelectorAll('.js-scroll').forEach(el => {
    el.addEventListener('click', function(e) {
      e.preventDefault();
      const targetId = this.getAttribute('data-target');
      const target = document.getElementById(targetId);
      if (target) {
        const top = target.getBoundingClientRect().top + window.pageYOffset - 80;
        window.scrollTo({ top, behavior: 'smooth' });
      }
      closeMobileNav();
    });
  });

  document.addEventListener('click', e => {
    const star = e.target.closest('.stars span');
    if (star) {
      const row = star.parentElement;
      const v = parseInt(star.dataset.v);
      row.dataset.rating = v;
      row.querySelectorAll('span').forEach(s => {
        s.classList.toggle('on', parseInt(s.dataset.v) <= v);
      });
    }
  });
});

function toggleMobileNav() {
  document.getElementById('mobileNav').classList.toggle('open');
  document.getElementById('overlay').classList.toggle('show');
}
function closeMobileNav() {
  document.getElementById('mobileNav').classList.remove('open');
}
function closeAll() {
  document.getElementById('overlay').classList.remove('show');
  document.getElementById('cartPanel').classList.remove('open');
  document.getElementById('inboxPanel').classList.remove('open');
  document.getElementById('mobileNav').classList.remove('open');
}

// ===== AUTH =====
function refreshAuthUI() {
  const loginBtn = document.getElementById('loginIconBtn');
  const accBox = document.getElementById('accountBox');
  if (customer) {
    loginBtn.style.display = 'none';
    accBox.style.display = 'flex';
    document.getElementById('accName').textContent = customer.name;
    document.getElementById('accAvatar').textContent = customer.name.charAt(0).toUpperCase();
    loadInbox();
  } else {
    loginBtn.style.display = 'inline-block';
    accBox.style.display = 'none';
  }
}

function openAuth() {
  document.getElementById('authModal').classList.add('show');
  setTimeout(() => document.getElementById('au_phone').focus(), 100);
}
function closeAuth() { document.getElementById('authModal').classList.remove('show'); }

function switchAuthTab(mode, el) {
  authMode = mode;
  document.querySelectorAll('.auth-tab').forEach(t => t.classList.remove('active'));
  el.classList.add('active');
  document.getElementById('signupFields').style.display = mode === 'signup' ? 'block' : 'none';
  document.getElementById('authTitle').textContent = mode === 'signup' ? 'Create Account' : 'Welcome Back';
  document.getElementById('authBtn').textContent = mode === 'signup' ? 'Sign Up' : 'Login';
}

async function doAuth() {
  const btn = document.getElementById('authBtn');
  const phone = document.getElementById('au_phone').value.trim();
  const password = document.getElementById('au_pass').value;
  const name = document.getElementById('au_name').value.trim();

  if (!phone || !password) { showToast('Enter phone and password'); return; }
  if (password.length < 4) { showToast('Password must be 4+ characters'); return; }
  if (authMode === 'signup' && !name) { showToast('Enter your name'); return; }

  btn.disabled = true; btn.textContent = 'Please wait...';
  try {
    const res = await fetch('/api/auth', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ mode: authMode, phone, password, name })
    });
    const data = await res.json();
    if (!data.success) {
      showToast(data.error || 'Failed');
      btn.disabled = false;
      btn.textContent = authMode === 'signup' ? 'Sign Up' : 'Login';
      return;
    }
    customer = { phone: data.phone, name: data.name };
    localStorage.setItem('cs_customer', JSON.stringify(customer));
    refreshAuthUI();
    closeAuth();
    showToast(`Welcome, ${data.name}`);
    document.getElementById('au_pass').value = '';
  } catch {
    showToast('Network error');
  }
  btn.disabled = false;
  btn.textContent = authMode === 'signup' ? 'Sign Up' : 'Login';
}

function logoutCustomer() {
  if (!confirm('Logout from your account?')) return;
  customer = null;
  localStorage.removeItem('cs_customer');
  refreshAuthUI();
  showToast('Logged out');
}

// ===== INBOX =====
async function loadInbox() {
  if (!customer) return;
  try {
    const res = await fetch('/api/customer/messages?phone=' + encodeURIComponent(customer.phone));
    const list = await res.json();
    const unread = (list || []).filter(m => !m.read_status).length;
    const badge = document.getElementById('msgBadge');
    if (unread > 0) { badge.style.display = 'inline-flex'; badge.textContent = unread; }
    else { badge.style.display = 'none'; }
    renderInbox(list);
  } catch {}
}

function renderInbox(list) {
  const box = document.getElementById('inboxList');
  if (!Array.isArray(list) || !list.length) {
    box.innerHTML = '<p style="color:var(--text-soft);font-size:13px">No messages yet.</p>';
    return;
  }
  box.innerHTML = list.map(m => {
    const d = new Date(m.created_at).toLocaleString('en-PK', { day:'numeric',month:'short',hour:'2-digit',minute:'2-digit' });
    return `<div class="msg-item"><p>${escapeHtml(m.message)}</p><div class="meta">From The Cake Studio · ${d}</div></div>`;
  }).join('');
}

function openInbox() {
  document.getElementById('inboxPanel').classList.add('open');
  document.getElementById('overlay').classList.add('show');
  if (customer) {
    fetch('/api/customer/messages/read?phone=' + encodeURIComponent(customer.phone), { method: 'POST' })
      .then(() => loadInbox());
  }
}
function closeInbox() {
  document.getElementById('inboxPanel').classList.remove('open');
  document.getElementById('overlay').classList.remove('show');
}

// ===== PRODUCTS =====
async function loadProducts() {
  try {
    const res = await fetch('/api/products');
    products = await res.json();
    renderProducts();
  } catch {
    document.getElementById('productGrid').innerHTML = '<p style="color:var(--danger)">Failed to load menu.</p>';
  }
}

function renderProducts() {
  const grid = document.getElementById('productGrid');
  const list = currentCat === 'All' ? products : products.filter(p => p.category === currentCat);
  if (!list.length) { grid.innerHTML = '<p style="color:var(--text-soft)">No items in this category.</p>'; return; }

  grid.innerHTML = list.map(p => {
    const img = p.image_url || `https://placehold.co/300x200/fce4ec/e9779a?text=${encodeURIComponent(p.name)}`;
    let priceLabel = '';
    if (p.price_per_piece) priceLabel = `Rs. ${p.price_per_piece}/pc`;
    else if (p.price_1pound) priceLabel = `Rs. ${p.price_1pound}`;
    else if (p.price_2pound) priceLabel = `Rs. ${p.price_2pound}`;
    return `
      <div class="card">
        <div class="card-img">
          <img src="${img}" alt="${escapeHtml(p.name)}" loading="lazy" onerror="this.src='https://placehold.co/300x200/fce4ec/e9779a?text=${encodeURIComponent(p.name)}'">
          <span class="card-badge">${p.category}</span>
        </div>
        <div class="card-body">
          <h3>${escapeHtml(p.name)}</h3>
          <p>${escapeHtml(p.description || '')}</p>
          <div class="price-row">
            <span class="price">${priceLabel}</span>
            <button class="add-btn" onclick="addToCart(${p.id})" title="Add to cart">+</button>
          </div>
        </div>
      </div>`;
  }).join('');
}

// ===== REVIEWS =====
async function loadReviews() {
  try {
    const res = await fetch('/api/feedback');
    const list = await res.json();
    const box = document.getElementById('reviewsGrid');
    if (!Array.isArray(list) || !list.length) {
      box.innerHTML = '<p style="color:var(--text-soft)">No reviews yet. Be the first to order and review!</p>';
      return;
    }
    box.innerHTML = list.map(r => {
      let stars = '';
      for (let i = 1; i <= 5; i++) {
        stars += `<img src="/icons/star.png" class="${i<=r.rating?'on':'off'}" alt="">`;
      }
      const initial = (r.customer_name || '?').charAt(0).toUpperCase();
      const date = new Date(r.created_at).toLocaleDateString('en-PK', { day:'numeric',month:'short',year:'numeric' });
      return `
        <div class="review-card">
          <div class="review-stars">${stars}</div>
          <p class="review-msg">"${escapeHtml(r.message)}"</p>
          <div class="review-author">
            <div class="review-avatar">${initial}</div>
            <div>
              <div class="review-name">${escapeHtml(r.customer_name)}</div>
              <div class="review-date">${date}</div>
            </div>
          </div>
        </div>`;
    }).join('');
  } catch {
    document.getElementById('reviewsGrid').innerHTML = '<p style="color:var(--text-soft)">No reviews yet.</p>';
  }
}

function escapeHtml(s) {
  return String(s || '').replace(/[&<>"']/g, m => ({ '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;' }[m]));
}

document.addEventListener('click', e => {
  if (e.target.classList.contains('cat')) {
    document.querySelectorAll('.cat').forEach(c => c.classList.remove('active'));
    e.target.classList.add('active');
    currentCat = e.target.dataset.cat;
    renderProducts();
  }
});

// ===== CART =====
function addToCart(id) {
  const p = products.find(x => x.id === id);
  if (!p) return;
  let variant = 'piece', unitPrice = 0;

  if (p.category === 'Cake') {
    const has1 = !!p.price_1pound, has2 = !!p.price_2pound;
    let choice;
    if (has1 && has2) {
      choice = prompt(`Choose size for ${p.name}:\n1 = 1 Pound (Rs. ${p.price_1pound})\n2 = 2 Pound (Rs. ${p.price_2pound})`, '1');
      if (!choice) return;
    } else if (has2) choice = '2';
    else choice = '1';

    if (choice === '2' && has2) { variant = '2 Pound'; unitPrice = p.price_2pound; }
    else if (has1) { variant = '1 Pound'; unitPrice = p.price_1pound; }
    else return;
  } else {
    unitPrice = p.price_per_piece;
  }

  const key = `${p.id}-${variant}`;
  const existing = cart.find(c => c.key === key);
  if (existing) existing.qty += (p.category !== 'Cake' ? 4 : 1);
  else cart.push({
    key, id: p.id, name: p.name, variant, unitPrice,
    qty: p.category === 'Cake' ? 1 : 4,
    image: p.image_url, category: p.category
  });
  saveCart();
  showToast(`${p.name} added to cart`);
}

function changeQty(key, delta) {
  const item = cart.find(c => c.key === key);
  if (!item) return;
  const min = item.category === 'Cake' ? 1 : 4;
  item.qty += delta;
  if (item.qty < min) item.qty = min;
  saveCart();
}

function removeItem(key) {
  cart = cart.filter(c => c.key !== key);
  saveCart();
}

function saveCart() {
  localStorage.setItem('cs_cart', JSON.stringify(cart));
  renderCart();
}

function renderCart() {
  document.getElementById('cartCount').textContent = cart.reduce((s, i) => s + i.qty, 0);
  const box = document.getElementById('cartItems');
  if (!cart.length) {
    box.innerHTML = '<p style="color:var(--text-soft);font-size:13px">Your cart is empty.</p>';
    document.getElementById('cartTotal').textContent = 'Rs. 0';
    return;
  }
  let total = 0;
  box.innerHTML = cart.map(i => {
    const sub = i.unitPrice * i.qty;
    total += sub;
    const img = i.image || `https://placehold.co/60/fce4ec/e9779a?text=C`;
    return `
      <div class="cart-item">
        <img src="${img}" onerror="this.src='https://placehold.co/60/fce4ec/e9779a?text=C'">
        <div class="cart-item-info">
          <h4>${escapeHtml(i.name)}</h4>
          <small>${i.variant} · Rs. ${i.unitPrice}</small>
          <div class="qty">
            <button onclick="changeQty('${i.key}',-1)">−</button>
            <span>${i.qty}</span>
            <button onclick="changeQty('${i.key}',1)">+</button>
            <button class="del-btn" onclick="removeItem('${i.key}')">Remove</button>
          </div>
        </div>
        <div style="font-weight:700;color:var(--primary)">Rs. ${sub}</div>
      </div>`;
  }).join('');
  document.getElementById('cartTotal').textContent = `Rs. ${total}`;
}

function openCart() {
  document.getElementById('cartPanel').classList.add('open');
  document.getElementById('overlay').classList.add('show');
}
function closeCart() {
  document.getElementById('cartPanel').classList.remove('open');
  document.getElementById('overlay').classList.remove('show');
}

function goToCheckout() {
  if (!cart.length) { showToast('Your cart is empty'); return; }
  window.location.href = '/order.html';
}

function showToast(msg) {
  const t = document.getElementById('toast');
  t.textContent = msg;
  t.classList.add('show');
  setTimeout(() => t.classList.remove('show'), 2200);
}

loadProducts();
loadReviews();
renderCart();
refreshAuthUI();
setInterval(() => { if (customer) loadInbox(); }, 30000);

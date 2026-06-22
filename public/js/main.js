// ===== Global Cart =====
let cart = JSON.parse(localStorage.getItem('cs_cart') || '[]');
let products = [];
let currentCat = 'All';

// ===== Load Products =====
async function loadProducts() {
  try {
    const res = await fetch('/api/products');
    products = await res.json();
    renderProducts();
  } catch (e) {
    document.getElementById('productGrid').innerHTML = '<p style="color:var(--danger)">Failed to load menu.</p>';
  }
}

function renderProducts() {
  const grid = document.getElementById('productGrid');
  const list = currentCat === 'All' ? products : products.filter(p => p.category === currentCat);
  if (!list.length) { grid.innerHTML = '<p style="color:var(--muted)">No items in this category.</p>'; return; }

  grid.innerHTML = list.map(p => {
    const img = p.image_url || `https://via.placeholder.com/300x200/33231d/e58a4a?text=${encodeURIComponent(p.name)}`;
    let priceLabel = '';
    if (p.price_per_piece) priceLabel = `Rs. ${p.price_per_piece}/pc`;
    else if (p.price_1pound) priceLabel = `Rs. ${p.price_1pound}`;
    else if (p.price_2pound) priceLabel = `Rs. ${p.price_2pound}`;
    return `
      <div class="card">
        <div class="card-img">
          <img src="${img}" alt="${p.name}" onerror="this.src='https://via.placeholder.com/300x200/33231d/e58a4a?text=${encodeURIComponent(p.name)}'">
          <span class="card-badge">${p.category}</span>
        </div>
        <div class="card-body">
          <h3>${p.name}</h3>
          <p>${p.description || ''}</p>
          <div class="price-row">
            <span class="price">${priceLabel}</span>
            <button class="add-btn" onclick="addToCart(${p.id})">+</button>
          </div>
        </div>
      </div>`;
  }).join('');
}

// ===== Categories =====
document.addEventListener('click', e => {
  if (e.target.classList.contains('cat')) {
    document.querySelectorAll('.cat').forEach(c => c.classList.remove('active'));
    e.target.classList.add('active');
    currentCat = e.target.dataset.cat;
    renderProducts();
  }
});

// ===== Cart Functions =====
function addToCart(id) {
  const p = products.find(x => x.id === id);
  if (!p) return;

  // For cakes, ask size (1lb / 2lb)
  let variant = 'piece';
  let unitPrice = 0;

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
    variant = 'piece';
    unitPrice = p.price_per_piece;
  }

  const key = `${p.id}-${variant}`;
  const existing = cart.find(c => c.key === key);
  if (existing) {
    existing.qty += (p.category !== 'Cake' ? 4 : 1);
  } else {
    cart.push({
      key, id: p.id, name: p.name, variant,
      unitPrice, qty: p.category === 'Cake' ? 1 : 4,
      image: p.image_url, category: p.category
    });
  }
  saveCart();
  showToast(`${p.name} added to cart 🧁`);
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
    box.innerHTML = '<p style="color:var(--muted);font-size:13px">Your cart is empty.</p>';
    document.getElementById('cartTotal').textContent = 'Rs. 0';
    return;
  }
  let total = 0;
  box.innerHTML = cart.map(i => {
    const sub = i.unitPrice * i.qty;
    total += sub;
    const img = i.image || `https://via.placeholder.com/60/33231d/e58a4a?text=🎂`;
    return `
      <div class="cart-item">
        <img src="${img}" onerror="this.src='https://via.placeholder.com/60/33231d/e58a4a?text=🎂'">
        <div class="cart-item-info">
          <h4>${i.name}</h4>
          <small>${i.variant} • Rs. ${i.unitPrice}</small>
          <div class="qty">
            <button onclick="changeQty('${i.key}',-1)">-</button>
            <span>${i.qty}</span>
            <button onclick="changeQty('${i.key}',1)">+</button>
            <button style="margin-left:auto;color:var(--danger);background:none" onclick="removeItem('${i.key}')">🗑</button>
          </div>
        </div>
        <div style="font-weight:600;color:var(--accent)">Rs. ${sub}</div>
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
  if (!cart.length) { showToast('Your cart is empty!'); return; }
  window.location.href = '/order.html';
}

function showToast(msg) {
  const t = document.getElementById('toast');
  t.textContent = msg;
  t.classList.add('show');
  setTimeout(() => t.classList.remove('show'), 2200);
}

loadProducts();
renderCart();

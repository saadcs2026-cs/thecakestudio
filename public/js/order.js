// 🔧 EDIT THESE WITH YOUR REAL DETAILS
const PAYMENT_INFO = {
  EasyPaisa: `<b>EasyPaisa Account</b><br>Name: Your Name<br>Number: 0334-3920775<br><br>Send the exact amount and upload screenshot below.`,
  Bank: `<b>Bank Transfer</b><br>Bank: Meezan Bank<br>Account Title: Your Name<br>Account #: XXXX-XXXXXX-XX<br>IBAN: PKXXMEZNXXXXXXXXXXX<br><br>Send the exact amount and upload screenshot below.`
};

// ⚠️ REPLACE with your Cloudinary cloud name
const CLOUDINARY_CLOUD = 'dmvcr0fub';
const CLOUDINARY_PRESET = 'cake_studio_unsigned';

const cart = JSON.parse(localStorage.getItem('cs_cart') || '[]');
const customer = JSON.parse(localStorage.getItem('cs_customer') || 'null');
let lastOrderCode = '';
let lastCustomerName = '';
let selectedRating = 0;

// Auto-fill from logged-in account
if (customer) {
  document.getElementById('customer_name').value = customer.name;
  document.getElementById('customer_phone').value = customer.phone;
  document.getElementById('customer_phone').disabled = true;
} else {
  document.getElementById('loginNotice').style.display = 'block';
}

function renderSummary() {
  if (!cart.length) {
    document.getElementById('orderSummary').innerHTML = '<p>Your cart is empty. <a href="/" style="color:var(--primary);font-weight:600">Go back to menu</a></p>';
    document.getElementById('placeBtn').disabled = true;
    return;
  }
  let total = 0;
  let html = cart.map(i => {
    const sub = i.unitPrice * i.qty;
    total += sub;
    return `<div style="display:flex;justify-content:space-between;padding:8px 0;border-bottom:1px dashed var(--border);font-size:14px">
      <span>${escapeHtml(i.name)} <small style="color:var(--muted)">(${i.variant} × ${i.qty})</small></span>
      <span style="font-weight:500">Rs. ${sub}</span>
    </div>`;
  }).join('');
  html += `<div style="display:flex;justify-content:space-between;padding-top:14px;font-weight:700;font-size:17px;margin-top:6px"><span>Total</span><span style="color:var(--primary)">Rs. ${total}</span></div>`;
  document.getElementById('orderSummary').innerHTML = html;
}

function togglePayment() {
  const m = document.getElementById('payment_method').value;
  const box = document.getElementById('paymentDetails');
  if (m === 'COD' || !m) {
    box.style.display = 'none';
  } else {
    box.style.display = 'block';
    document.getElementById('paymentInfo').innerHTML = PAYMENT_INFO[m] || '';
  }
}

async function uploadToCloudinary(file) {
  const fd = new FormData();
  fd.append('file', file);
  fd.append('upload_preset', CLOUDINARY_PRESET);
  const res = await fetch(`https://api.cloudinary.com/v1_1/${CLOUDINARY_CLOUD}/image/upload`, {
    method: 'POST', body: fd
  });
  const data = await res.json();
  if (!data.secure_url) throw new Error('Upload failed');
  return data.secure_url;
}

function showToast(msg, ok = true) {
  const t = document.getElementById('toast');
  t.textContent = msg;
  t.style.borderLeftColor = ok ? 'var(--primary)' : 'var(--danger)';
  t.classList.add('show');
  setTimeout(() => t.classList.remove('show'), 2500);
}

function escapeHtml(s) {
  return String(s || '').replace(/[&<>"']/g, m => ({ '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;' }[m]));
}

async function placeOrder() {
  const btn = document.getElementById('placeBtn');
  const name = document.getElementById('customer_name').value.trim();
  const phone = document.getElementById('customer_phone').value.trim();
  const city = document.getElementById('city').value;
  const address = document.getElementById('customer_address').value.trim();
  const method = document.getElementById('payment_method').value;
  const dDate = document.getElementById('delivery_date').value;
  const notes = document.getElementById('notes').value.trim();

  if (!name || !phone || !city || !address || !method) {
    showToast('Please fill all required fields', false); return;
  }
  if (!cart.length) { showToast('Cart is empty', false); return; }

  let sender_name = '', sender_number = '', screenshot_url = '';

  if (method !== 'COD') {
    sender_name = document.getElementById('sender_name').value.trim();
    sender_number = document.getElementById('sender_number').value.trim();
    const file = document.getElementById('screenshot').files[0];
    if (!sender_name || !sender_number || !file) {
      showToast('Please fill payment details and upload screenshot', false); return;
    }
    if (file.size > 5 * 1024 * 1024) { showToast('Image too large (max 5MB)', false); return; }

    btn.disabled = true; btn.textContent = 'Uploading screenshot...';
    try {
      screenshot_url = await uploadToCloudinary(file);
    } catch {
      showToast('Screenshot upload failed', false); btn.disabled = false; btn.textContent = 'Place Order'; return;
    }
  }

  const total = cart.reduce((s, i) => s + i.unitPrice * i.qty, 0);

  btn.disabled = true; btn.textContent = 'Placing order...';
  try {
    const res = await fetch('/api/orders', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        customer_name: name, customer_phone: phone, customer_address: address, city,
        items: cart, total_amount: total, delivery_date: dDate, notes,
        payment_method: method, sender_name, sender_number, payment_screenshot: screenshot_url
      })
    });
    const data = await res.json();
    if (!data.success) throw new Error(data.error || 'Order failed');

    localStorage.removeItem('cs_cart');
    lastOrderCode = data.order_code;
    lastCustomerName = name;

    document.querySelector('.form-wrap').innerHTML = `
      <div style="text-align:center;padding:20px 10px">
        <h2 style="color:var(--primary);font-size:32px">Order Placed Successfully!</h2>
        <p style="margin:14px 0;color:var(--text-soft)">Your order code:</p>
        <p style="font-size:24px;color:var(--primary);font-weight:700;letter-spacing:1px;margin-bottom:18px">${data.order_code}</p>
        <p style="color:var(--text-soft);font-size:14px;line-height:1.6">We will contact you shortly on <b style="color:var(--text)">${phone}</b> to confirm your order.<br>Save your order code for tracking.</p>
        ${customer ? '<p style="margin-top:14px;color:var(--text-soft);font-size:13px">You can track this order and receive updates in your account inbox.</p>' : ''}
        <a href="/" class="btn-primary" style="display:inline-flex;text-align:center;margin-top:24px;text-decoration:none;width:auto">Back to Home</a>
      </div>`;

    setTimeout(openFeedback, 1200);

  } catch (e) {
    showToast('Failed to place order: ' + e.message, false);
    btn.disabled = false; btn.textContent = 'Place Order';
  }
}

function openFeedback() {
  document.getElementById('fb_name').value = lastCustomerName || '';
  document.getElementById('feedbackModal').classList.add('show');
}
function closeFeedback() { document.getElementById('feedbackModal').classList.remove('show'); }

// Star rating
document.addEventListener('click', e => {
  const star = e.target.closest('.stars span');
  if (star) {
    const row = star.parentElement;
    selectedRating = parseInt(star.dataset.v);
    row.querySelectorAll('span').forEach(s => {
      s.classList.toggle('on', parseInt(s.dataset.v) <= selectedRating);
    });
  }
});

async function submitFeedback() {
  const name = document.getElementById('fb_name').value.trim();
  const msg = document.getElementById('fb_msg').value.trim();
  if (!name || !msg) { showToast('Please fill name and review', false); return; }
  if (!selectedRating) { showToast('Please select rating', false); return; }

  try {
    const res = await fetch('/api/feedback', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        customer_name: name, order_code: lastOrderCode,
        rating: selectedRating, message: msg
      })
    });
    if (res.ok) {
      closeFeedback();
      showToast('Thank you for your feedback');
    } else showToast('Failed to submit', false);
  } catch { showToast('Failed to submit', false); }
}

renderSummary();

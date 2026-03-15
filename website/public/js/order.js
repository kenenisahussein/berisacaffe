// js/order.js

const cartKey = "kt_cart_v1";
const ordersKey = "kt_orders_v1";
const formKey = "kt_order_form_v1";

let cart =
  window._KT && window._KT.getCart
    ? window._KT.getCart()
    : JSON.parse(localStorage.getItem(cartKey) || "[]");

const itemsArea = document.getElementById("itemsArea");
const totalAmount = document.getElementById("totalAmount");

function money(n) {
  return `${n} ETB`;
}

function calculateCartTotals(cart) {
  let subtotal = 0;
  const distinctProductIds = new Set();
  cart.forEach((item) => {
    subtotal += item.price * item.qty;
    distinctProductIds.add(item.id);
  });
  let deliveryTotal = 0;
  // approximate delivery by summing delivery from cart item metadata (if present)
  distinctProductIds.forEach((id) => {
    const p = cart.find((x) => x.id === id);
    if (p && p.delivery) deliveryTotal += p.delivery;
  });
  return { subtotal, deliveryTotal, grandTotal: subtotal + deliveryTotal };
}

function renderCartForOrder() {
  if (!cart.length) {
    itemsArea.innerHTML =
      '<div style="padding:18px;color:#9aa4b2">Your cart is empty. Add items first.</div>';
    totalAmount.innerHTML = "0 ETB";
    return;
  }

  const { subtotal, deliveryTotal, grandTotal } = calculateCartTotals(cart);

  let itemsHtml = cart
    .map(
      (it) => `
    <div class="row">
      <img src="${it.image}" alt="${it.name}">
      <div style="flex:1">
        <div style="font-weight:700">${it.name}</div>
        <div style="color:var(--muted)">${it.qty} x ${it.price} ETB</div>
      </div>
      <div style="min-width:90px;text-align:right"><div style="font-weight:800">${it.price * it.qty} ETB</div></div>
    </div>
  `,
    )
    .join("");

  itemsHtml += `
    <div style="margin-top:16px; border-top:1px solid rgba(255,255,255,0.1); padding-top:12px;">
      <div style="display:flex; justify-content:space-between;"><span>Subtotal:</span> <span>${money(subtotal)}</span></div>
      <div style="display:flex; justify-content:space-between;"><span>Delivery fees:</span> <span>${money(deliveryTotal)}</span></div>
      <div style="display:flex; justify-content:space-between; font-weight:bold; color:var(--green); margin-top:6px;"><span>Total:</span> <span>${money(grandTotal)}</span></div>
    </div>
  `;

  itemsArea.innerHTML = itemsHtml;
  totalAmount.innerHTML = money(grandTotal);
}

renderCartForOrder();

/* restore form if saved */
const saved = JSON.parse(localStorage.getItem(formKey) || "null");
if (saved) {
  document.getElementById("fullName").value = saved.fullName || "";
  document.getElementById("phone").value = saved.phone || "";
  document.getElementById("location").value = saved.location || "";
  document.getElementById("payMethod").value = saved.payMethod || "";
}

["fullName", "phone", "location", "payMethod"].forEach((id) => {
  const el = document.getElementById(id);
  if (!el) return;
  el.addEventListener("input", () => {
    const cur = JSON.parse(localStorage.getItem(formKey) || "{}");
    cur[id] = el.value;
    localStorage.setItem(formKey, JSON.stringify(cur));
  });
});

document.getElementById("getLocationBtn").addEventListener("click", () => {
  const cur = {
    fullName: document.getElementById("fullName").value,
    phone: document.getElementById("phone").value,
    location: document.getElementById("location").value,
    payMethod: document.getElementById("payMethod").value,
  };
  localStorage.setItem(formKey, JSON.stringify(cur));
  window.open("https://maps.google.com", "_blank");
});

function copyId(id) {
  navigator.clipboard
    .writeText(document.getElementById(id).innerText)
    .then(() => alert("Copied: " + document.getElementById(id).innerText))
    .catch(() => alert("Failed to copy. copy Manually."));
}
window.copyId = copyId;

document
  .getElementById("backHome")
  .addEventListener("click", () => (window.location.href = "index.html"));

/* submit flow */
const orderForm = document.getElementById("orderForm");
const confirmModal = document.getElementById("confirmModal");
const confirmAmount = document.getElementById("confirmAmount");
const confirmMsg = document.getElementById("confirmMsg");
const confirmYes = document.getElementById("confirmYes");
const confirmNo = document.getElementById("confirmNo");
const successModal = document.getElementById("successModal");
const doneBtn = document.getElementById("doneBtn");

orderForm.addEventListener("submit", async (e) => {
  e.preventDefault();
  if (!cart.length) {
    alert("Your cart is empty");
    return;
  }
  const { grandTotal } = calculateCartTotals(cart);
  confirmAmount.textContent = money(grandTotal);
  confirmMsg.textContent = `Are you sure you paid the total amount of ${money(grandTotal)}?`;
  confirmModal.style.display = "flex";
});

confirmNo.addEventListener("click", () => {
  confirmModal.style.display = "none";
});

confirmYes.addEventListener("click", async () => {
  confirmModal.style.display = "none";

  const name = document.getElementById("fullName").value.trim();
  const phone = document.getElementById("phone").value.trim();
  const location = document.getElementById("location").value.trim();
  const payMethod = document.getElementById("payMethod").value;
  const proofFile = document.getElementById("proof").files[0];

  if (!name || !phone || !location || !payMethod || !proofFile) {
    alert("Please fill all fields and attach proof.");
    return;
  }

  const proofBase64 = await fileToBase64(proofFile).catch(() => null);
  const { subtotal, deliveryTotal, grandTotal } = calculateCartTotals(cart);

  const order = {
    id: "ORD-" + Date.now(),
    items: cart,
    total: grandTotal,
    name,
    phone,
    location,
    payMethod,
    proof: proofBase64,
    date: new Date().toLocaleString(),
  };

  // offline save
  if (!navigator.onLine) {
    saveOrderLocal(order, { status: "pending" });
    alert("No network. Order saved locally as pending.");
    window.location.href = "index.html";
    return;
  }

  // send to serverless API (secure)
  try {
    const res = await fetch("/api/send-order", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(order),
    });
    const j = await res.json();
    if (!res.ok) throw new Error(j?.message || "Failed to send order");
    saveOrderLocal(order, { status: "sent" });
    localStorage.removeItem(cartKey);
    if (window._KT && window._KT.clearCart) window._KT.clearCart();
    successModal.style.display = "flex";
  } catch (err) {
    console.error(err);
    saveOrderLocal(order, { status: "pending" });
    alert("Failed to send order to server. Saved locally as pending.");
    window.location.href = "index.html";
  }
});

doneBtn.addEventListener("click", () => {
  successModal.style.display = "none";
  window.location.href = "index.html";
});

function saveOrderLocal(order, meta = { status: "pending" }) {
  const h = JSON.parse(localStorage.getItem(ordersKey) || "[]");
  h.unshift(Object.assign({}, order, { meta }));
  localStorage.setItem(ordersKey, JSON.stringify(h));
}

function fileToBase64(file) {
  return new Promise((res, rej) => {
    const r = new FileReader();
    r.onload = () => res(r.result);
    r.onerror = rej;
    r.readAsDataURL(file);
  });
}

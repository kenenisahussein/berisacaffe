// js/index.js
import { loadSiteSettings } from "./siteSettings.js";

import { fetchMenuItems } from "./sanity.js";
loadSiteSettings();
/* ---------------------------
           Init & data
--------------------------- */
AOS.init({ duration: 700, once: true });

let products = []; // will be loaded from Sanity
let productMap = new Map();

const cartKey = "kt_cart_v1";
const ordersKey = "kt_orders_v1";
const formKey = "kt_order_form_v1";

/* DOM */
const menuEl = document.getElementById("menu");
const popularEl = document.getElementById("popular");
const catBtns = document.querySelectorAll(".cat-btn");
const searchInput = document.getElementById("searchInput");
const cartIcon = document.getElementById("cartIcon");
const cartDrawer = document.getElementById("cartDrawer");
const cartItemsEl = document.getElementById("cartItems");
const cartCountEl = document.getElementById("cartCount");
const cartTotalEl = document.getElementById("cartTotal");
const gotoCheckoutBtn = document.getElementById("gotoCheckout");
const clearCartBtn = document.getElementById("clearCart");
const closeCartBtn = document.getElementById("closeCart");
const goToOrders = document.getElementById("goToOrders");

const toastEl = document.getElementById("toast");
const confirmModal = document.getElementById("confirmModal");
const confirmBody = document.getElementById("confirmBody");
const confirmYes = document.getElementById("confirmYes");
const confirmNo = document.getElementById("confirmNo");
const successModal = document.getElementById("successModal");
const successDone = document.getElementById("successDone");
const viewProofModal = document.getElementById("viewProofModal");

/* ---------------------------
           Utilities
--------------------------- */
function money(n) {
  return `${n} ETB`;
}
function showToast(msg, ms = 1600) {
  if (!toastEl) return;
  toastEl.textContent = msg;
  toastEl.style.display = "block";
  setTimeout(() => (toastEl.style.display = "none"), ms);
}

/* ---------------------------
        Render functions
--------------------------- */
function createMenuHtml(item) {
  const img = item.imageUrl || "images/placeholder.png";
  return `
    <article class="menu-item" data-id="${item._id}" data-cat="${item.category}">
      <div class="img media"><img src="${img}" alt="${item.name}" loading="lazy"></div>
      <div class="body"  data-aos="fade-in">
        <div class="menu-name">${item.name}</div>
        <div class="menu-desc">${item.desc || ""}</div>
        <div class="menu-foot">
          <div class="price">${money(item.price)}</div>
          <div><button class="btn-add" data-id="${item._id}">Add</button></div>
        </div>
      </div>
    </article>
  `;
}

function renderMenu(list) {
  if (!list || !list.length) {
    menuEl.innerHTML = `<div style="padding:18px;color:var(--muted)">No items found</div>`;
    return;
  }
  menuEl.innerHTML = list.map(createMenuHtml).join("");
  requestAnimationFrame(() => {
    Array.from(menuEl.children).forEach((el, i) => {
      el.style.opacity = 0;
      el.style.transform = "translateY(12px) scale(.995)";
      setTimeout(() => {
        el.style.transition = "opacity 520ms, transform 520ms";
        el.style.opacity = 1;
        el.style.transform = "translateY(0) scale(1)";
      }, i * 30);
    });
  });
}

function renderPopular() {
  const pop = products.filter((p) => p.popular);
  popularEl.innerHTML = pop
    .map(
      (item) => `
    <div class="card" data-aos="zoom-in">
      <div class="media"><img src="${item.imageUrl || "images/placeholder.png"}" alt="${item.name}" loading="lazy"></div>
      <div class="meta">
        <div><div style="font-weight:700">${item.name}</div><div style="font-size:12px;color:var(--muted)">${item.category}</div></div>
        <div style="font-weight:800;color:var(--green)">${money(item.price)}</div>
      </div>
    </div>
  `,
    )
    .join("");
}

/* ---------------------------
           Cart (with delivery)
--------------------------- */
let cart = JSON.parse(localStorage.getItem(cartKey) || "[]");

function saveCart() {
  localStorage.setItem(cartKey, JSON.stringify(cart));
  requestAnimationFrame(updateCartUI);
}

function calculateCartTotals() {
  let subtotal = 0;
  const distinctProductIds = new Set();
  cart.forEach((item) => {
    subtotal += item.price * item.qty;
    distinctProductIds.add(item.id);
  });

  let deliveryTotal = 0;
  distinctProductIds.forEach((id) => {
    const product = productMap.get(id);
    if (product) deliveryTotal += product.delivery || 0;
  });

  return { subtotal, deliveryTotal, grandTotal: subtotal + deliveryTotal };
}

function updateCartUI() {
  const totalCount = cart.reduce((s, i) => s + i.qty, 0);
  if (cartCountEl) cartCountEl.textContent = totalCount;
  const { subtotal, deliveryTotal, grandTotal } = calculateCartTotals();
  if (cartTotalEl) cartTotalEl.textContent = money(grandTotal);

  if (!cart.length) {
    cartItemsEl.innerHTML =
      '<div style="padding:20px;color:var(--muted)">Your cart is empty</div>';
    return;
  }

  let itemsHtml = "";
  cart.forEach((it, idx) => {
    itemsHtml += `
      <div class="cart-row" data-cart-idx="${idx}">
        <img src="${it.image}" alt="${it.name}">
        <div style="flex:1">
          <div style="font-weight:700">${it.name}</div>
          <div style="color:var(--muted);font-size:13px">${money(it.price)}</div>
          <div class="qty-controls" style="margin-top:8px">
            <button class="small-btn cart-decrease" data-idx="${idx}">−</button>
            <div style="min-width:28px;text-align:center">${it.qty}</div>
            <button class="small-btn cart-increase" data-idx="${idx}">+</button>
            <button class="small-btn cart-remove" data-idx="${idx}" style="margin-left:8px;color:#ff6b6b">Remove</button>
          </div>
        </div>
      </div>
    `;
  });

  itemsHtml += `
    <div style="margin-top:16px; border-top: 1px solid rgba(255,255,255,0.1); padding-top:12px;">
      <div style="display: flex; justify-content: space-between;">
        <span>Subtotal:</span> <span>${money(subtotal)}</span>
      </div>
      <div style="display: flex; justify-content: space-between;">
        <span>Delivery fees:</span> <span>${money(deliveryTotal)}</span>
      </div>
      <div style="display: flex; justify-content: space-between; font-weight: bold; color: var(--green); margin-top:6px;">
        <span>Total:</span> <span>${money(grandTotal)}</span>
      </div>
    </div>
  `;

  cartItemsEl.innerHTML = itemsHtml;
}

/* Cart actions */
function addToCartId(id, qty = 1) {
  const found = cart.find((i) => i.id === id);
  if (found) {
    found.qty += qty;
  } else {
    const p = productMap.get(id);
    if (!p) {
      showToast("Product not found");
      return;
    }
    cart.push({
      id: p._id,
      name: p.name,
      price: p.price,
      image: p.imageUrl || "images/placeholder.png",
      qty,
    });
  }
  saveCart();
  showToast("Added to cart");
  const b = document.querySelector(`.btn-add[data-id="${id}"]`);
  if (b) {
    b.textContent = "In cart";
    b.disabled = true;
    setTimeout(() => {
      b.textContent = "Add";
      b.disabled = false;
    }, 900);
  }
}

function increaseQty(idx) {
  cart[idx].qty++;
  saveCart();
}
function decreaseQty(idx) {
  cart[idx].qty = Math.max(1, cart[idx].qty - 1);
  saveCart();
}
function removeFromCart(idx) {
  cart.splice(idx, 1);
  saveCart();
}
function clearCart() {
  cart = [];
  saveCart();
  showToast("Cart cleared");
}

window.increaseQty = increaseQty;
window.decreaseQty = decreaseQty;
window.removeFromCart = removeFromCart;

/* Expose helpers for other pages (order.html) */
window._KT = {
  getCart: () => JSON.parse(localStorage.getItem(cartKey) || "[]"),
  setCart: (c) => {
    cart = c;
    saveCart();
  },
  clearCart: () => {
    cart = [];
    saveCart();
  },
};

/* Cart events */
cartItemsEl.addEventListener("click", (e) => {
  const target = e.target;
  if (target.classList.contains("cart-increase")) {
    const idx = +target.dataset.idx;
    if (!isNaN(idx)) increaseQty(idx);
  } else if (target.classList.contains("cart-decrease")) {
    const idx = +target.dataset.idx;
    if (!isNaN(idx)) decreaseQty(idx);
  } else if (target.classList.contains("cart-remove")) {
    const idx = +target.dataset.idx;
    if (!isNaN(idx)) removeFromCart(idx);
  }
});

/* ---------------------------
           UI wiring & events
--------------------------- */

async function loadProductsFromSanity() {
  try {
    products = await fetchMenuItems();
    // create product map keyed by _id for quick lookup
    productMap = new Map(products.map((p) => [p._id, p]));
    renderPopular();
    renderMenu(products);
    updateCartUI();
  } catch (err) {
    console.error("Failed to load products:", err);
    menuEl.innerHTML = `<div style="padding:18px;color:var(--muted)">Failed to load menu items. Check Sanity projectId.</div>`;
  }
}

loadProductsFromSanity();

/* delegate add buttons */
document.addEventListener("click", (e) => {
  const add = e.target.closest(".btn-add");
  if (add) {
    addToCartId(add.dataset.id);
  }
});

/* remaining UI wiring (cart drawer, theme toggle, search, categories, etc.) */
cartIcon.addEventListener("click", () => {
  cartDrawer.classList.toggle("open");
  cartDrawer.setAttribute(
    "aria-hidden",
    cartDrawer.classList.contains("open") ? "false" : "true",
  );
});
gotoCheckoutBtn.addEventListener("click", () => {
  window.location.href = "order.html";
});
clearCartBtn.addEventListener("click", () => {
  if (confirm("Clear cart?")) clearCart();
});
closeCartBtn.addEventListener("click", () =>
  cartDrawer.classList.remove("open"),
);
goToOrders.addEventListener("click", () => {
  window.location.href = "history.html";
});

document.getElementById("themeToggle").addEventListener("click", () => {
  const root = document.documentElement;
  const next = root.getAttribute("data-theme") === "light" ? "dark" : "light";
  root.setAttribute("data-theme", next);
  localStorage.setItem("kt_theme", next);
});
const storedTheme =
  localStorage.getItem("kt_theme") ||
  (window.matchMedia &&
  window.matchMedia("(prefers-color-scheme:light)").matches
    ? "light"
    : "dark");
document.documentElement.setAttribute("data-theme", storedTheme);

document.getElementById("surpriseBtn").addEventListener("click", () => {
  const popular = products.filter((p) => p.popular);
  if (!popular.length) return;
  const pick = popular[Math.floor(Math.random() * popular.length)];
  window.scrollTo({
    top: document.getElementById("menu").offsetTop - 70,
    behavior: "smooth",
  });
  setTimeout(() => {
    const el = document.querySelector(`[data-id="${pick._id}"]`);
    el && el.scrollIntoView({ behavior: "smooth", block: "center" });
  }, 300);
});

/* category + search */
catBtns.forEach((btn) =>
  btn.addEventListener("click", () => {
    const cat = btn.dataset.cat;
    catBtns.forEach((b) => b.classList.toggle("active", b === btn));
    const base =
      cat === "all" ? products : products.filter((p) => p.category === cat);
    const q = (searchInput.value || "").trim().toLowerCase();
    const final = q
      ? base.filter(
          (it) =>
            it.name.toLowerCase().includes(q) ||
            (it.desc || "").toLowerCase().includes(q),
        )
      : base;
    renderMenu(final);
  }),
);

let searchTimer = null;
searchInput.addEventListener("input", (e) => {
  clearTimeout(searchTimer);
  searchTimer = setTimeout(() => {
    const q = (e.target.value || "").trim().toLowerCase();
    const activeCat =
      document.querySelector(".cat-btn.active").dataset.cat || "all";
    const base =
      activeCat === "all"
        ? products
        : products.filter((p) => p.category === activeCat);
    const filtered = q
      ? base.filter(
          (it) =>
            it.name.toLowerCase().includes(q) ||
            (it.desc || "").toLowerCase().includes(q),
        )
      : base;
    renderMenu(filtered);
  }, 140);
});

/* small initial polish */
setTimeout(
  () => document.querySelector(".fade-in")?.classList.add("show"),
  120,
);

/* Expose modal helpers (used by order page) */
window.showCenterConfirm = (text, onYes, onNo) => {
  confirmBody.textContent = text;
  confirmModal.style.display = "flex";
  confirmYes.onclick = () => {
    confirmModal.style.display = "none";
    onYes && onYes();
  };
  confirmNo.onclick = () => {
    confirmModal.style.display = "none";
    onNo && onNo();
  };
};
window.showSuccess = (title, text, cb) => {
  document.getElementById("successTitle").textContent = title || "Done";
  document.getElementById("successBody").textContent = text || "";
  successModal.style.display = "flex";
  successDone.onclick = () => {
    successModal.style.display = "none";
    cb && cb();
  };
};
window.showProof = (html) => {
  document.getElementById("proofBox").innerHTML = html;
  viewProofModal.style.display = "flex";
  viewProofModal.onclick = (ev) => {
    if (ev.target === viewProofModal) viewProofModal.style.display = "none";
  };
};

window.isOnline = () => navigator.onLine;

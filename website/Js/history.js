// js/history.js
const ordersKey = "kt_orders_v1";
const tableWrap = document.getElementById("tableWrap");
const homeBtn = document.getElementById("homeBtn");
const clearAll = document.getElementById("clearAll");

function loadHistory() {
  const history = JSON.parse(localStorage.getItem(ordersKey) || "[]");
  if (!history.length) {
    tableWrap.innerHTML = '<div style="color:#9aa4b2">No orders yet</div>';
    return;
  }

  let html = `<table><thead><tr><th>Order ID</th><th>Date</th><th>Items</th><th>Total</th><th>Status</th><th>Actions</th></tr></thead><tbody>`;
  history.forEach((ord, idx) => {
    const itemsHtml = ord.items.map((i) => `${i.name} x${i.qty}`).join("<br>");
    const statusClass =
      ord.meta?.status === "sent" ? "status-sent" : "status-pending";
    html += `<tr>
        <td>${ord.id}</td>
        <td>${ord.date}</td>
        <td>${itemsHtml}</td>
        <td>${ord.total} ETB</td>
        <td class="${statusClass}">${ord.meta?.status || "unknown"}</td>
        <td class="actions">
          <button class="small-btn" onclick="viewProof(${idx})">View</button>
          <button class="small-btn" onclick="deleteOrder(${idx})">Delete</button>
        </td>
      </tr>`;
  });
  html += "</tbody></table>";
  tableWrap.innerHTML = html;
}

function viewProof(idx) {
  const history = JSON.parse(localStorage.getItem(ordersKey) || "[]");
  const ord = history[idx];
  if (!ord) return;
  const proof = ord.proof;
  if (!proof) {
    alert("No proof attached for this order.");
    return;
  }
  document.getElementById("proofContent").innerHTML =
    `<div style="font-weight:700;margin-bottom:8px">Order ${ord.id} • ${ord.date}</div><img src="${proof}" alt="proof" style="max-width:100%;border-radius:8px">`;
  document.getElementById("proofModal").style.display = "flex";
}

function deleteOrder(idx) {
  if (!confirm("Delete this order from history?")) return;
  const history = JSON.parse(localStorage.getItem(ordersKey) || "[]");
  history.splice(idx, 1);
  localStorage.setItem(ordersKey, JSON.stringify(history));
  loadHistory();
}

clearAll.addEventListener("click", () => {
  if (!confirm("Clear all order history?")) return;
  localStorage.removeItem(ordersKey);
  loadHistory();
});

homeBtn.addEventListener("click", () => (window.location.href = "index.html"));

// Expose functions globally for inline handlers
window.viewProof = viewProof;
window.deleteOrder = deleteOrder;

loadHistory();

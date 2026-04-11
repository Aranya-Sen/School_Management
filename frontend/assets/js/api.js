// ─── API Base ──────────────────────────────────────────────────────────────────
const API = "http://localhost:5000/api";

// ─── Token helpers ─────────────────────────────────────────────────────────────
const getToken  = ()        => localStorage.getItem("token");
const setToken  = (t)       => localStorage.setItem("token", t);
const getUser   = ()        => JSON.parse(localStorage.getItem("user") || "null");
const setUser   = (u)       => localStorage.setItem("user", JSON.stringify(u));
const getRole   = ()        => localStorage.getItem("role");
const setRole   = (r)       => localStorage.setItem("role", r);
const clearAuth = ()        => { localStorage.removeItem("token"); localStorage.removeItem("user"); localStorage.removeItem("role"); };

// ─── Redirect helpers ──────────────────────────────────────────────────────────
const redirectTo = (url) => { window.location.href = url; };

const requireAuth = (expectedRole, redirectUrl) => {
  const token = getToken();
  const role  = getRole();
  if (!token || role !== expectedRole) redirectTo(redirectUrl || "/index.html");
};

// ─── API fetch wrapper ─────────────────────────────────────────────────────────
async function apiFetch(endpoint, options = {}) {
  const headers = { "Content-Type": "application/json", ...(options.headers || {}) };
  const token = getToken();
  if (token) headers["Authorization"] = `Bearer ${token}`;

  const res = await fetch(`${API}${endpoint}`, { ...options, headers });
  const data = await res.json();
  if (!res.ok) throw new Error(data.message || "Request failed");
  return data;
}

// ─── Alert helper ──────────────────────────────────────────────────────────────
function showAlert(elId, message, type = "error") {
  const el = document.getElementById(elId);
  if (!el) return;
  el.textContent = message;
  el.className = `alert show alert-${type}`;
  setTimeout(() => { el.classList.remove("show"); }, 4000);
}

// ─── Modal helpers ─────────────────────────────────────────────────────────────
function openModal(id)  { document.getElementById(id).classList.add("open"); }
function closeModal(id) { document.getElementById(id).classList.remove("open"); }

// ─── Format helpers ────────────────────────────────────────────────────────────
const fmtDate   = (d) => d ? new Date(d).toLocaleDateString("en-IN") : "—";
const fmtAmount = (a) => "₹" + parseFloat(a).toLocaleString("en-IN", { minimumFractionDigits: 2 });

const statusBadge = (status) => {
  const map = { paid: "success", pending: "warning", overdue: "danger", present: "success", absent: "danger", late: "warning" };
  return `<span class="badge badge-${map[status] || 'info'}">${status}</span>`;
};

// ─── Logout ────────────────────────────────────────────────────────────────────
function logout() {
  clearAuth();
  redirectTo("/index.html");
}

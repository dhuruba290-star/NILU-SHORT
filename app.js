const $ = id => document.getElementById(id);
let mode = "login";
let baseUrl = location.origin;

$("year").textContent = new Date().getFullYear();
$("loginTab").addEventListener("click", () => setMode("login"));
$("registerTab").addEventListener("click", () => setMode("register"));
$("authForm").addEventListener("submit", submitAuth);
$("logout").addEventListener("click", logout);
$("createBtn").addEventListener("click", createLink);
$("refresh").addEventListener("click", loadLinks);

function setMode(next) {
  mode = next;
  $("loginTab").classList.toggle("active", mode === "login");
  $("registerTab").classList.toggle("active", mode === "register");
  $("authSubmit").textContent = mode === "login" ? "Log in" : "Create account";
  $("password").autocomplete = mode === "login" ? "current-password" : "new-password";
  $("authMessage").textContent = "";
}
async function api(url, options={}) {
  const response = await fetch(url, {
    credentials: "same-origin",
    headers: { "Content-Type": "application/json", ...(options.headers || {}) },
    ...options
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(data.error || "Something went wrong.");
  return data;
}
async function submitAuth(event) {
  event.preventDefault();
  $("authSubmit").disabled = true;
  $("authMessage").textContent = "Please wait…";
  try {
    const data = await api(`/api/${mode}`, {
      method: "POST",
      body: JSON.stringify({ email: $("email").value, password: $("password").value })
    });
    showDashboard(data.user);
  } catch (e) { $("authMessage").textContent = e.message; }
  finally { $("authSubmit").disabled = false; }
}
function showDashboard(email) {
  $("auth").classList.add("hidden");
  $("dashboard").classList.remove("hidden");
  $("welcome").textContent = `Logged in as ${email}`;
  loadLinks();
}
async function logout() {
  try { await api("/api/logout", { method: "POST", body: "{}" }); } catch {}
  $("dashboard").classList.add("hidden");
  $("auth").classList.remove("hidden");
  $("password").value = "";
  $("authMessage").textContent = "You have logged out.";
}
async function loadLinks() {
  $("linksList").innerHTML = '<p class="muted">Loading…</p>';
  try {
    const data = await api("/api/links");
    baseUrl = data.baseUrl;
    const links = data.links;
    $("totalLinks").textContent = links.length;
    $("totalClicks").textContent = links.reduce((sum, link) => sum + Number(link.clicks), 0);
    if (!links.length) {
      $("linksList").innerHTML = '<div class="empty">No links yet. Create your first short link above.</div>';
      return;
    }
    $("linksList").innerHTML = "";
    links.forEach(link => {
      const item = document.createElement("div");
      item.className = "link-item";
      const short = `${baseUrl}/${link.code}`;
      const shortEl = document.createElement("div");
      shortEl.className = "short-url";
      shortEl.textContent = short;
      const original = document.createElement("div");
      original.className = "original";
      original.textContent = link.original_url;
      const meta = document.createElement("div");
      meta.className = "link-meta";
      const count = document.createElement("span");
      count.textContent = `${Number(link.clicks)} clicks`;
      const actions = document.createElement("div");
      actions.className = "link-actions";
      const copy = document.createElement("button");
      copy.className = "small-btn";
      copy.textContent = "Copy";
      copy.addEventListener("click", () => copyText(short, copy));
      const del = document.createElement("button");
      del.className = "small-btn delete-btn";
      del.textContent = "Delete";
      del.addEventListener("click", () => deleteLink(link.code));
      actions.append(copy, del);
      meta.append(count, actions);
      item.append(shortEl, original, meta);
      $("linksList").append(item);
    });
  } catch (e) {
    $("linksList").innerHTML = `<p class="message">${escapeHtml(e.message)}</p>`;
  }
}
async function createLink() {
  const url = $("longUrl").value.trim();
  $("createBtn").disabled = true;
  $("createMessage").textContent = "Creating…";
  $("newLink").classList.add("hidden");
  try {
    const data = await api("/api/links", { method: "POST", body: JSON.stringify({ url }) });
    const short = `${data.baseUrl}/${data.link.code}`;
    $("newLink").textContent = `Your short link: ${short}`;
    $("newLink").classList.remove("hidden");
    const copy = document.createElement("button");
    copy.className = "small-btn";
    copy.textContent = "Copy";
    copy.addEventListener("click", () => copyText(short, copy));
    $("newLink").append(copy);
    $("createMessage").textContent = "Short link created!";
    $("longUrl").value = "";
    await loadLinks();
  } catch (e) { $("createMessage").textContent = e.message; }
  finally { $("createBtn").disabled = false; }
}
async function deleteLink(code) {
  if (!confirm("Delete this short link? It will stop working.")) return;
  try { await api(`/api/links/${encodeURIComponent(code)}`, { method: "DELETE" }); await loadLinks(); }
  catch (e) { alert(e.message); }
}
async function copyText(value, button) {
  try {
    await navigator.clipboard.writeText(value);
    button.textContent = "Copied!";
    setTimeout(() => button.textContent = "Copy", 1400);
  } catch { prompt("Copy this link:", value); }
}
function escapeHtml(value) {
  return String(value).replace(/[&<>"']/g, c => ({ "&":"&amp;", "<":"&lt;", ">":"&gt;", '"':"&quot;", "'":"&#39;" }[c]));
}
(async function boot() {
  try {
    const data = await api("/api/me");
    if (data.user) showDashboard(data.user);
  } catch {}
})();

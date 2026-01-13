// script.js — RHF AppStore (Full, fokus, modular, siap pakai)
// Gunakan di HTML dengan: <script type="module" src="./assets/script.js"></script>

import { initializeApp } from "https://www.gstatic.com/firebasejs/9.6.1/firebase-app.js";
import { getAnalytics } from "https://www.gstatic.com/firebasejs/9.6.1/firebase-analytics.js";
import {
  getDatabase,
  ref,
  push,
  set,
  update,
  remove,
  onValue,
  get,
  query,
  orderByChild,
  startAt,
  endAt,
  limitToFirst
} from "https://www.gstatic.com/firebasejs/9.6.1/firebase-database.js";
import {
  getStorage,
  ref as storageRef,
  uploadBytes,
  getDownloadURL,
  deleteObject
} from "https://www.gstatic.com/firebasejs/9.6.1/firebase-storage.js";

// =======================
// Firebase Configuration
// =======================
const firebaseConfig = {
  apiKey: "AIzaSyAyHSaALeuwibcF22VNL_6WDlcZepcDB3A",
  authDomain: "rhf-gamestore.firebaseapp.com",
  databaseURL: "https://rhf-gamestore-default-rtdb.asia-southeast1.firebasedatabase.app",
  projectId: "rhf-gamestore",
  storageBucket: "rhf-gamestore.appspot.com", // penting: appspot.com
  messagingSenderId: "52065906934",
  appId: "1:52065906934:web:c15f0eff91cc937f787cd7",
  measurementId: "G-RYFR9D5R5H"
};

// Init
const app = initializeApp(firebaseConfig);
getAnalytics(app);
const db = getDatabase(app);
const storage = getStorage(app);

// =======================
// Util & State
// =======================
const state = {
  appsCache: {},       // cache snapshot apps
  pageSize: 20,        // jumlah item per halaman
  currentPage: 1,      // halaman aktif
  lastSearch: "",      // kata kunci pencarian
  categoryFilter: "All"
};

const el = (sel) => document.querySelector(sel);
const els = (sel) => document.querySelectorAll(sel);

function formatNumber(n) {
  try {
    return new Intl.NumberFormat("id-ID").format(n || 0);
  } catch {
    return n;
  }
}

function toast(msg) {
  console.log("[RHF AppStore]", msg);
  const t = el("#toast");
  if (!t) return;
  t.textContent = msg;
  t.style.opacity = 1;
  setTimeout(() => (t.style.opacity = 0), 2500);
}

// =======================
// Data Access Layer
// =======================
const appsRef = ref(db, "apps");

async function addApp({ name, developer, category, file }) {
  if (!name || !developer || !category || !file) {
    throw new Error("Data tidak lengkap untuk upload APK.");
  }
  const filePath = `apk/${Date.now()}_${file.name}`;
  const fRef = storageRef(storage, filePath);
  await uploadBytes(fRef, file);
  const apkUrl = await getDownloadURL(fRef);

  const newRef = push(appsRef);
  await set(newRef, {
    name,
    developer,
    category,
    apk_url: apkUrl,
    storage_path: filePath,
    rating: 0,
    downloads: 0,
    created_at: Date.now()
  });
  return newRef.key;
}

async function updateApp(appId, payload) {
  await update(ref(db, `apps/${appId}`), payload);
}

async function deleteApp(appId) {
  const snap = await get(ref(db, `apps/${appId}`));
  if (!snap.exists()) return;
  const data = snap.val();
  // Hapus file di Storage jika ada
  if (data.storage_path) {
    try {
      await deleteObject(storageRef(storage, data.storage_path));
    } catch (e) {
      console.warn("Gagal hapus file storage:", e.message);
    }
  }
  await remove(ref(db, `apps/${appId}`));
}

async function incrementDownloads(appId) {
  const snap = await get(ref(db, `apps/${appId}`));
  if (!snap.exists()) return;
  const d = snap.val();
  const next = (d.downloads || 0) + 1;
  await update(ref(db, `apps/${appId}`), { downloads: next });
}

function subscribeApps(callback) {
  onValue(appsRef, (snapshot) => {
    const val = snapshot.val() || {};
    state.appsCache = val;
    callback(val);
  });
}

async function searchAppsByName(keyword, limit = 50) {
  // Pencarian sederhana di cache (lebih cepat & hemat)
  const k = (keyword || "").toLowerCase();
  const results = [];
  Object.entries(state.appsCache).forEach(([id, app]) => {
    if ((app.name || "").toLowerCase().includes(k)) {
      results.push({ id, ...app });
    }
  });
  return results.slice(0, limit);
}

// =======================
// Rendering (Index)
// =======================
function renderAppCard(id, app) {
  return `
    <div class="app-card">
      <div class="app-info">
        <h3 class="app-title">${app.name}</h3>
        <p class="app-meta">${app.developer} — ${app.category}</p>
        <p class="app-stats">⭐ ${app.rating || 0} · ⬇️ ${formatNumber(app.downloads || 0)}</p>
      </div>
      <div class="app-actions">
        <a class="btn btn-download" href="${app.apk_url}" data-id="${id}" download>Download</a>
      </div>
    </div>
  `;
}

function applyFiltersAndPaginate() {
  const apps = Object.entries(state.appsCache)
    .map(([id, app]) => ({ id, ...app }))
    .sort((a, b) => (b.downloads || 0) - (a.downloads || 0)); // populer dulu

  const filtered = apps.filter((a) => {
    const byCat = state.categoryFilter === "All" || a.category === state.categoryFilter;
    const bySearch =
      !state.lastSearch ||
      (a.name || "").toLowerCase().includes(state.lastSearch.toLowerCase()) ||
      (a.developer || "").toLowerCase().includes(state.lastSearch.toLowerCase());
    return byCat && bySearch;
  });

  const total = filtered.length;
  const totalPages = Math.max(1, Math.ceil(total / state.pageSize));
  state.currentPage = Math.min(state.currentPage, totalPages);

  const start = (state.currentPage - 1) * state.pageSize;
  const pageItems = filtered.slice(start, start + state.pageSize);

  return { pageItems, total, totalPages };
}

function renderIndex() {
  const listEl = el("#appList");
  const pagerEl = el("#pager");
  if (!listEl) return;

  const { pageItems, total, totalPages } = applyFiltersAndPaginate();

  listEl.innerHTML = pageItems.map((item) => renderAppCard(item.id, item)).join("");

  // Pager
  if (pagerEl) {
    pagerEl.innerHTML = `
      <div class="pager">
        <button class="btn" id="prevPage" ${state.currentPage <= 1 ? "disabled" : ""}>Prev</button>
        <span>Halaman ${state.currentPage} / ${totalPages} · ${total} aplikasi</span>
        <button class="btn" id="nextPage" ${state.currentPage >= totalPages ? "disabled" : ""}>Next</button>
      </div>
    `;
    const prev = el("#prevPage");
    const next = el("#nextPage");
    if (prev) prev.onclick = () => { state.currentPage = Math.max(1, state.currentPage - 1); renderIndex(); };
    if (next) next.onclick = () => { state.currentPage = Math.min(totalPages, state.currentPage + 1); renderIndex(); };
  }

  // Bind download increment
  els(".btn-download").forEach((a) => {
    a.addEventListener("click", async (e) => {
      const id = e.currentTarget.getAttribute("data-id");
      try {
        await incrementDownloads(id);
      } catch (err) {
        console.warn("Gagal increment downloads:", err.message);
      }
    });
  });
}

function bindIndexControls() {
  const searchInput = el("#searchInput");
  const categorySelect = el("#categorySelect");

  if (searchInput) {
    searchInput.addEventListener("input", (e) => {
      state.lastSearch = e.target.value.trim();
      state.currentPage = 1;
      renderIndex();
    });
  }

  if (categorySelect) {
    categorySelect.addEventListener("change", (e) => {
      state.categoryFilter = e.target.value;
      state.currentPage = 1;
      renderIndex();
    });
  }
}

// =======================
// Rendering (Admin)
// =======================
function renderAdminRow(id, app) {
  return `
    <tr>
      <td>${id}</td>
      <td>${app.name}</td>
      <td>${app.developer}</td>
      <td>${app.category}</td>
      <td>${app.rating || 0}</td>
      <td>${formatNumber(app.downloads || 0)}</td>
      <td>
        <button class="btn btn-small" data-action="edit" data-id="${id}">Edit</button>
        <button class="btn btn-small btn-danger" data-action="delete" data-id="${id}">Delete</button>
      </td>
    </tr>
  `;
}

function renderAdminTable() {
  const tableBody = el("#appTableBody");
  if (!tableBody) return;
  const rows = Object.entries(state.appsCache)
    .map(([id, app]) => renderAdminRow(id, app))
    .join("");
  tableBody.innerHTML = rows;

  // Bind actions
  tableBody.querySelectorAll("button").forEach((btn) => {
    const action = btn.getAttribute("data-action");
    const id = btn.getAttribute("data-id");
    if (action === "delete") {
      btn.onclick = async () => {
        if (!confirm("Hapus aplikasi ini?")) return;
        try {
          await deleteApp(id);
          toast("Aplikasi dihapus.");
        } catch (e) {
          toast("Gagal hapus: " + e.message);
        }
      };
    } else if (action === "edit") {
      btn.onclick = () => openEditModal(id);
    }
  });
}

function openEditModal(appId) {
  const modal = el("#editModal");
  const nameEl = el("#editName");
  const devEl = el("#editDeveloper");
  const catEl = el("#editCategory");
  const ratingEl = el("#editRating");

  const app = state.appsCache[appId];
  if (!app || !modal) return;

  nameEl.value = app.name || "";
  devEl.value = app.developer || "";
  catEl.value = app.category || "";
  ratingEl.value = app.rating || 0;

  modal.setAttribute("data-id", appId);
  modal.style.display = "block";
}

function closeEditModal() {
  const modal = el("#editModal");
  if (modal) modal.style.display = "none";
}

function bindAdminControls() {
  const uploadForm = el("#uploadForm");
  const searchAdmin = el("#searchAdmin");
  const editSave = el("#editSave");
  const editCancel = el("#editCancel");

  if (uploadForm) {
    uploadForm.addEventListener("submit", async (e) => {
      e.preventDefault();
      const name = el("#appName").value.trim();
      const developer = el("#developer").value.trim();
      const category = el("#category").value.trim();
      const file = el("#apkFile").files[0];

      try {
        await addApp({ name, developer, category, file });
        uploadForm.reset();
        toast("Aplikasi berhasil ditambahkan.");
      } catch (err) {
        toast("Gagal upload: " + err.message);
      }
    });
  }

  if (searchAdmin) {
    searchAdmin.addEventListener("input", async (e) => {
      const k = e.target.value.trim();
      if (!k) {
        renderAdminTable();
        return;
      }
      const results = await searchAppsByName(k, 100);
      const tableBody = el("#appTableBody");
      if (!tableBody) return;
      tableBody.innerHTML = results.map((r) => renderAdminRow(r.id, r)).join("");
    });
  }

  if (editSave) {
    editSave.onclick = async () => {
      const modal = el("#editModal");
      const id = modal.getAttribute("data-id");
      const payload = {
        name: el("#editName").value.trim(),
        developer: el("#editDeveloper").value.trim(),
        category: el("#editCategory").value.trim(),
        rating: Number(el("#editRating").value) || 0
      };
      try {
        await updateApp(id, payload);
        closeEditModal();
        toast("Perubahan disimpan.");
      } catch (e) {
        toast("Gagal simpan: " + e.message);
      }
    };
  }

  if (editCancel) {
    editCancel.onclick = closeEditModal;
  }

  const modal = el("#editModal");
  if (modal) {
    window.addEventListener("click", (e) => {
      if (e.target === modal) closeEditModal();
    });
  }
}

// =======================
// Bootstrap per halaman
// =======================
function isIndex() {
  return !!el("#appList");
}
function isAdmin() {
  return !!el("#adminPanel");
}

function initIndex() {
  bindIndexControls();
  subscribeApps(() => renderIndex());
}

function initAdmin() {
  bindAdminControls();
  subscribeApps(() => renderAdminTable());
}

// =======================
// Start
// =======================
document.addEventListener("DOMContentLoaded", () => {
  if (isIndex()) initIndex();
  if (isAdmin()) initAdmin();
});

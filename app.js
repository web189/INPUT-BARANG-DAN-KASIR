/* ===========================
   ASA MANDIRI - APP.JS
   Versi: 2.0 | Perbaikan Total
   =========================== */

// ── STATE ──────────────────────────────────────
let currentUser = null;
let role = "tamu";
let data = [];
let histori = [];
let kas = 0;
let logKas = [];
let editIndex = -1;
let keranjang = []; // { id, nama, harga, qty, stokTersedia }
let noTransaksi = 0;

const ADMIN_EMAIL = "admin@asa.com";
const KASIR_EMAIL = "kasir@asa.com";

// ── HELPERS ─────────────────────────────────────
const el = id => document.getElementById(id);

function rupiah(angka) {
  const abs = Math.abs(angka);
  const prefix = angka < 0 ? "-Rp. " : "Rp. ";
  return prefix + abs.toLocaleString("id-ID");
}

function getEmoji(nama) {
  const n = nama.toLowerCase();
  if (n.includes("mie") || n.includes("mie") || n.includes("noodle")) return "🍜";
  if (n.includes("beras") || n.includes("rice")) return "🌾";
  if (n.includes("minyak") || n.includes("oil")) return "🛢️";
  if (n.includes("gula") || n.includes("sugar")) return "🍬";
  if (n.includes("susu") || n.includes("milk")) return "🥛";
  if (n.includes("telur") || n.includes("egg")) return "🥚";
  if (n.includes("kopi") || n.includes("coffee")) return "☕";
  if (n.includes("teh") || n.includes("tea")) return "🍵";
  if (n.includes("air") || n.includes("water") || n.includes("aqua")) return "💧";
  if (n.includes("snack") || n.includes("keripik") || n.includes("chips")) return "🍟";
  if (n.includes("sabun") || n.includes("soap")) return "🧼";
  if (n.includes("deterjen") || n.includes("rinso")) return "🧺";
  if (n.includes("sampo") || n.includes("shampoo")) return "🧴";
  if (n.includes("rokok") || n.includes("cigarette")) return "🚬";
  if (n.includes("roti") || n.includes("bread")) return "🍞";
  if (n.includes("saus") || n.includes("ketchup") || n.includes("saos")) return "🍅";
  if (n.includes("minuman") || n.includes("sirup") || n.includes("jus")) return "🥤";
  if (n.includes("cokelat") || n.includes("choco")) return "🍫";
  if (n.includes("wafer") || n.includes("biscuit") || n.includes("biskuit")) return "🍪";
  return "📦";
}

function toast(pesan, tipe = "success") {
  const t = el("toast");
  t.textContent = pesan;
  t.className = `toast ${tipe}`;
  setTimeout(() => { t.className = "toast hidden"; }, 3000);
}

function generateNoTransaksi() {
  const now = new Date();
  const tgl = now.toLocaleDateString("id-ID", { day:"2-digit", month:"2-digit", year:"2-digit" }).replace(/\//g,"-");
  const jam = now.toLocaleTimeString("id-ID", { hour:"2-digit", minute:"2-digit", second:"2-digit" }).replace(/\./g,"");
  return `TRX-${tgl}-${jam}`;
}

// ── JAM ─────────────────────────────────────────
function updateJam() {
  const now = new Date();
  const hari = ["Minggu","Senin","Selasa","Rabu","Kamis","Jumat","Sabtu"][now.getDay()];
  const tgl  = String(now.getDate()).padStart(2,"0");
  const bln  = String(now.getMonth()+1).padStart(2,"0");
  const thn  = now.getFullYear();
  const jam  = String(now.getHours()).padStart(2,"0");
  const mnt  = String(now.getMinutes()).padStart(2,"0");
  const dtk  = String(now.getSeconds()).padStart(2,"0");
  const str  = `${hari}, ${tgl}/${bln}/${thn} ${jam}:${mnt}:${dtk}`;

  if (el("jamSidebar")) el("jamSidebar").innerText = str;
  if (el("jamHeader"))  el("jamHeader").innerText  = str;
}
setInterval(updateJam, 1000);
updateJam();

// ── FIREBASE ─────────────────────────────────────
function loadData() {
  db.ref("asaMandiri").on("value", snap => {
    const d = snap.val();
    if (d) {
      data     = d.data     || [];
      histori  = d.histori  || [];
      kas      = d.kas      || 0;
      logKas   = d.logKas   || [];
    }
    renderAll();
  });
}

function save() {
  db.ref("asaMandiri").set({ data, histori, kas, logKas });
}

// ── AUTH ─────────────────────────────────────────
function login() {
  const email    = el("email").value.trim();
  const password = el("password").value;
  if (!email || !password) { toast("Email & password wajib diisi", "error"); return; }

  firebase.auth().signInWithEmailAndPassword(email, password)
    .then(() => { toast("Login berhasil!"); })
    .catch(err => { toast("Login gagal: " + err.message, "error"); });
}

function loginSebagaiTamu() {
  currentUser = null;
  role = "tamu";
  el("loginOverlay").classList.add("hidden");
  el("appWrapper").classList.remove("hidden");
  applyRole();
  renderAll();
  showSection("dashboard");
}

function logout() {
  if (!currentUser) {
    // Tamu logout
    el("loginOverlay").classList.remove("hidden");
    el("appWrapper").classList.add("hidden");
    role = "tamu";
    return;
  }
  firebase.auth().signOut()
    .then(() => { toast("Berhasil logout"); })
    .catch(err => { toast("Gagal: " + err.message, "error"); });
}

firebase.auth().onAuthStateChanged(user => {
  if (user) {
    currentUser = user;
    if (user.email === ADMIN_EMAIL)       role = "admin";
    else if (user.email === KASIR_EMAIL)  role = "kasir";
    else                                  role = "tamu";

    el("loginOverlay").classList.add("hidden");
    el("appWrapper").classList.remove("hidden");
  } else {
    currentUser = null;
    role = "tamu";
    el("loginOverlay").classList.remove("hidden");
    el("appWrapper").classList.add("hidden");
  }
  applyRole();
  renderAll();
  showSection("dashboard");
});

// ── ROLE UI ──────────────────────────────────────
function applyRole() {
  // Sidebar user info
  const avatars = {
    admin: "A",
    kasir: "K",
    tamu:  "T"
  };
  const colors = {
    admin: "linear-gradient(135deg,#e17055,#d63031)",
    kasir: "linear-gradient(135deg,#0984e3,#74b9ff)",
    tamu:  "linear-gradient(135deg,#636e72,#b2bec3)"
  };
  const names = {
    admin: "Administrator",
    kasir: "Kasir",
    tamu:  "Tamu"
  };

  if (el("userAvatar")) {
    el("userAvatar").textContent = avatars[role];
    el("userAvatar").style.background = colors[role];
  }
  if (el("userName"))    el("userName").textContent = names[role];
  if (el("userBadge"))   el("userBadge").textContent = role.toUpperCase();
  if (el("mobileBadge")) el("mobileBadge").textContent = role.toUpperCase();

  // Show/hide nav sections
  document.querySelectorAll(".admin-only").forEach(e => {
    e.classList.toggle("hidden", role !== "admin");
  });
  document.querySelectorAll(".kasir-only").forEach(e => {
    e.classList.toggle("hidden", role !== "kasir");
  });

  // Aksi kolom tabel
  const aksiCols = document.querySelectorAll("th.admin-only");
  aksiCols.forEach(c => c.classList.toggle("hidden", role !== "admin"));
}

// ── NAVIGASI ─────────────────────────────────────
function showSection(id) {
  document.querySelectorAll(".section").forEach(s => s.classList.remove("active"));
  const sec = el("sec-" + id);
  if (sec) sec.classList.add("active");

  document.querySelectorAll(".nav-item").forEach(n => n.classList.remove("active"));
  document.querySelectorAll(`.nav-item[onclick*="${id}"]`).forEach(n => n.classList.add("active"));

  // Tutup sidebar mobile
  if (window.innerWidth <= 768) el("sidebar").classList.remove("open");

  renderSection(id);
}

function renderSection(id) {
  if (id === "dashboard")     renderDashboard();
  if (id === "inventaris")    renderInventaris();
  if (id === "inputBarang")   renderAdminTable();
  if (id === "histori")       renderHistori();
  if (id === "kasir")         { renderPilihBarang(); renderKeranjang(); }
  if (id === "manajemenKas")  renderKas();
}

function toggleSidebar() {
  el("sidebar").classList.toggle("open");
}

// ── RENDER ALL ───────────────────────────────────
function renderAll() {
  renderDashboard();
  const activeSection = document.querySelector(".section.active");
  if (activeSection) {
    const id = activeSection.id.replace("sec-", "");
    renderSection(id);
  }
}

// ── DASHBOARD ────────────────────────────────────
function renderDashboard() {
  const totalPenjualan = data.reduce((acc, d) => acc + (d.keluar * d.harga), 0);
  const totalLaba      = data.reduce((acc, d) => acc + (d.keluar * (d.harga - d.modal)), 0);
  const totalProduk    = data.length;

  if (el("statPenjualan")) el("statPenjualan").textContent = rupiah(totalPenjualan);
  if (el("statLaba"))      el("statLaba").textContent      = rupiah(totalLaba);
  if (el("statKas"))       el("statKas").textContent       = rupiah(kas);
  if (el("statProduk"))    el("statProduk").textContent    = totalProduk;

  const lowStock = data.filter(d => (d.masuk - d.keluar) <= 20 && (d.masuk - d.keluar) > 0);
  const habis    = data.filter(d => (d.masuk - d.keluar) <= 0);
  const lsEl     = el("lowStockList");
  if (!lsEl) return;

  if (lowStock.length === 0 && habis.length === 0) {
    lsEl.innerHTML = `<p class="empty-state">Semua stok aman ✅</p>`;
    return;
  }

  lsEl.innerHTML = "";
  habis.forEach(d => {
    lsEl.innerHTML += `
      <div class="low-stock-item" style="border-color:rgba(214,48,49,0.3);background:rgba(214,48,49,0.08);">
        <div class="item-name">${d.nama}</div>
        <div class="item-stock" style="color:#ff7675;">STOK HABIS</div>
      </div>`;
  });
  lowStock.forEach(d => {
    const sisa = d.masuk - d.keluar;
    lsEl.innerHTML += `
      <div class="low-stock-item">
        <div class="item-name">${d.nama}</div>
        <div class="item-stock">Sisa: ${sisa} unit</div>
      </div>`;
  });
}

// ── INVENTARIS ───────────────────────────────────
function renderInventaris() {
  const keyword = el("search")?.value?.toLowerCase() || "";
  const tbody   = el("dataTable");
  if (!tbody) return;

  const filtered = data.filter(d => d.nama.toLowerCase().includes(keyword));
  tbody.innerHTML = "";

  if (filtered.length === 0) {
    tbody.innerHTML = `<tr><td colspan="12" class="empty-state">Tidak ada barang</td></tr>`;
    return;
  }

  filtered.forEach((d, i) => {
    const sisa         = d.masuk - d.keluar;
    const totalHarga   = d.keluar * d.harga;
    const laba         = d.keluar * (d.harga - d.modal);
    let statusBadge    = "";
    if (sisa <= 0)        statusBadge = `<span class="badge-habis">Habis</span>`;
    else if (sisa <= 20)  statusBadge = `<span class="badge-warning">⚠ Hampir Habis</span>`;
    else                  statusBadge = `<span class="badge-tersedia">Tersedia</span>`;

    const aksiAdmin = role === "admin" ? `
      <button class="btn-icon-edit" onclick="editData(${data.indexOf(d)})"><i class="fa-solid fa-pen"></i> Edit</button>
      <button class="btn-icon-del" onclick="hapus(${data.indexOf(d)})"><i class="fa-solid fa-trash"></i></button>
    ` : `<span style="color:var(--text-muted);font-size:11px;">${role === 'kasir' ? '-' : 'Tamu'}</span>`;

    tbody.innerHTML += `
      <tr>
        <td>${i + 1}</td>
        <td><code style="font-size:11px;color:var(--text-muted);">${d.kode || "-"}</code></td>
        <td>
          <div style="font-weight:600;">${d.nama}</div>
          <div style="font-size:10px;color:var(--text-muted);">${d.waktu || ""}</div>
        </td>
        <td>${rupiah(d.modal)}</td>
        <td>${rupiah(d.harga)}</td>
        <td>${d.masuk}</td>
        <td>${d.keluar}</td>
        <td><b>${sisa}</b></td>
        <td>${rupiah(totalHarga)}</td>
        <td class="${laba >= 0 ? 'laba-pos' : 'laba-neg'}">${rupiah(laba)}</td>
        <td>${statusBadge}</td>
        <td class="admin-only ${role !== 'admin' ? 'hidden' : ''}">${aksiAdmin}</td>
      </tr>`;
  });
}

// ── ADMIN TABLE ──────────────────────────────────
function renderAdminTable() {
  const tbody = el("adminTable");
  if (!tbody) return;
  tbody.innerHTML = "";

  if (data.length === 0) {
    tbody.innerHTML = `<tr><td colspan="7" class="empty-state">Belum ada barang</td></tr>`;
    return;
  }

  data.forEach((d, i) => {
    const sisa = d.masuk - d.keluar;
    tbody.innerHTML += `
      <tr>
        <td>${i + 1}</td>
        <td><code style="font-size:11px">${d.kode || "-"}</code></td>
        <td>${d.nama}</td>
        <td>${rupiah(d.modal)}</td>
        <td>${rupiah(d.harga)}</td>
        <td><b>${sisa}</b></td>
        <td>
          <button class="btn-icon-edit" onclick="editData(${i})"><i class="fa-solid fa-pen"></i> Edit</button>
          <button class="btn-icon-del" onclick="hapus(${i})"><i class="fa-solid fa-trash"></i></button>
        </td>
      </tr>`;
  });
}

// ── HISTORI ──────────────────────────────────────
function renderHistori() {
  const list = el("historiList");
  if (!list) return;

  if (histori.length === 0) {
    list.innerHTML = `<p class="empty-state">Belum ada histori</p>`;
    return;
  }

  list.innerHTML = "";
  histori.slice().reverse().forEach(h => {
    list.innerHTML += `
      <div class="histori-item">
        <div class="histori-dot"></div>
        <div>
          <div class="histori-aksi">${h.aksi}</div>
          <div class="histori-waktu">${h.waktu}</div>
        </div>
      </div>`;
  });
}

function hapusHistori() {
  if (!confirm("Hapus semua histori?")) return;
  histori = [];
  save();
  renderHistori();
  toast("Histori dihapus");
}

function tambahHistori(aksi) {
  histori.push({
    aksi,
    waktu: new Date().toLocaleString("id-ID")
  });
}

// ── INPUT BARANG (ADMIN) ─────────────────────────
document.addEventListener("DOMContentLoaded", () => {
  const btnTambah = el("btnTambah");
  if (btnTambah) {
    btnTambah.onclick = () => {
      if (role !== "admin") { toast("Akses ditolak", "error"); return; }

      const modalSatuan = +el("modal").value;
      const jumlahMasuk = +el("qty").value;
      const hargaJual   = +el("harga").value;
      const namaBarang  = el("nama").value.trim();
      const kodeBarang  = el("kode").value.trim();

      if (!namaBarang || !modalSatuan || !hargaJual || !jumlahMasuk) {
        toast("Lengkapi semua field!", "warning"); return;
      }
      if (hargaJual < modalSatuan) {
        toast("⚠ Harga jual lebih rendah dari modal!", "warning");
      }

      const totalModal = modalSatuan * jumlahMasuk;
      const now        = new Date();
      const waktu      = now.toLocaleDateString("id-ID", { day:"2-digit", month:"short", year:"numeric" })
                       + " " + now.toLocaleTimeString("id-ID", { hour:"2-digit", minute:"2-digit" });

      const item = {
        kode: kodeBarang,
        nama: namaBarang,
        modal: modalSatuan,
        harga: hargaJual,
        masuk: jumlahMasuk,
        keluar: 0,
        kategori: el("kategori")?.value || "",
        waktu
      };

      if (editIndex >= 0) {
        data[editIndex] = { ...data[editIndex], ...item, keluar: data[editIndex].keluar };
        tambahHistori(`Edit barang: ${item.nama}`);
        editIndex = -1;
        el("formTitle").innerHTML = `<i class="fa-solid fa-plus"></i> Tambah Barang Baru`;
      } else {
        if (kas < totalModal) { toast("Kas tidak cukup! Perlu " + rupiah(totalModal), "error"); return; }
        kas -= totalModal;
        tambahHistori(`Tambah barang: ${item.nama} (${jumlahMasuk} pcs @ ${rupiah(modalSatuan)})`);
        data.push(item);
      }

      save();
      clearForm();
      renderAdminTable();
      renderDashboard();
      toast("Barang berhasil disimpan ✓");
    };
  }

  // Kas
  const btnKas = el("btnKas");
  if (btnKas) {
    btnKas.onclick = () => {
      const jumlah   = parseInt(el("kasInput").value);
      const tipe     = el("tipeKas").value;
      const keterangan = el("keterKas")?.value || (tipe === "masuk" ? "Kas Masuk" : "Kas Keluar");

      if (!jumlah || jumlah <= 0) { toast("Masukkan jumlah yang valid!", "warning"); return; }
      if (tipe === "keluar" && kas < jumlah) { toast("Kas tidak cukup!", "error"); return; }

      if (tipe === "masuk") kas += jumlah;
      else                  kas -= jumlah;

      logKas.push({
        keterangan,
        jumlah,
        tipe,
        waktu: new Date().toLocaleString("id-ID")
      });

      tambahHistori(`${tipe === "masuk" ? "Kas Masuk" : "Kas Keluar"}: ${rupiah(jumlah)} - ${keterangan}`);
      save();
      renderKas();
      renderDashboard();
      el("kasInput").value = "";
      if (el("keterKas")) el("keterKas").value = "";
      toast(`Kas ${tipe} berhasil diupdate ✓`);
    };
  }
});

function clearForm() {
  ["kode","nama","modal","harga","qty","kategori"].forEach(id => {
    if (el(id)) el(id).value = "";
  });
  editIndex = -1;
  if (el("formTitle")) el("formTitle").innerHTML = `<i class="fa-solid fa-plus"></i> Tambah Barang Baru`;
}

function editData(i) {
  const d = data[i];
  el("kode").value     = d.kode;
  el("nama").value     = d.nama;
  el("modal").value    = d.modal;
  el("harga").value    = d.harga;
  el("qty").value      = d.masuk;
  if (el("kategori")) el("kategori").value = d.kategori || "";
  editIndex = i;
  if (el("formTitle")) el("formTitle").innerHTML = `<i class="fa-solid fa-pen"></i> Edit: ${d.nama}`;
  showSection("inputBarang");
  el("kode").focus();
}

function hapus(i) {
  if (!confirm(`Hapus "${data[i].nama}"?`)) return;
  tambahHistori(`Hapus barang: ${data[i].nama}`);
  data.splice(i, 1);
  save();
  renderAdminTable();
  renderInventaris();
  renderDashboard();
  toast("Barang dihapus");
}

// ── KAS ──────────────────────────────────────────
function renderKas() {
  if (el("kasBalance")) el("kasBalance").textContent = rupiah(kas);

  const list = el("logKasList");
  if (!list) return;

  if (logKas.length === 0) {
    list.innerHTML = `<p class="empty-state">Belum ada log kas</p>`;
    return;
  }

  list.innerHTML = "";
  logKas.slice().reverse().forEach(l => {
    list.innerHTML += `
      <div class="log-kas-item">
        <div>
          <div class="log-kas-keterangan">${l.keterangan}</div>
          <div class="log-kas-waktu">${l.waktu}</div>
        </div>
        <div class="log-kas-jumlah ${l.tipe === 'masuk' ? 'log-kas-masuk' : 'log-kas-keluar'}">
          ${l.tipe === 'masuk' ? '+' : '-'}${rupiah(l.jumlah)}
        </div>
      </div>`;
  });
}

// ── KASIR: PILIH BARANG ──────────────────────────
function renderPilihBarang() {
  const keyword = el("searchKasir")?.value?.toLowerCase() || "";
  const grid    = el("produkGrid");
  if (!grid) return;

  const filtered = data.filter(d => d.nama.toLowerCase().includes(keyword));
  grid.innerHTML = "";

  if (filtered.length === 0) {
    grid.innerHTML = `<p class="empty-state" style="grid-column:1/-1;">Tidak ada barang</p>`;
    return;
  }

  filtered.forEach(d => {
    const sisa = d.masuk - d.keluar;
    const idx  = data.indexOf(d);
    grid.innerHTML += `
      <div class="produk-card ${sisa <= 0 ? 'habis' : ''}" onclick="tambahKeKeranjang(${idx})">
        <div class="produk-emoji">${getEmoji(d.nama)}</div>
        <div class="produk-name">${d.nama}</div>
        <div class="produk-harga">${rupiah(d.harga)}</div>
        <div class="produk-stok">Stok: ${sisa} ${sisa <= 0 ? '(Habis)' : ''}</div>
      </div>`;
  });
}

// ── KERANJANG ────────────────────────────────────
function tambahKeKeranjang(dataIdx) {
  const d    = data[dataIdx];
  const sisa = d.masuk - d.keluar;

  if (sisa <= 0) { toast("Stok habis!", "error"); return; }

  const existing = keranjang.find(k => k.dataIdx === dataIdx);
  if (existing) {
    if (existing.qty >= sisa) { toast(`Stok tidak cukup! Maks ${sisa}`, "warning"); return; }
    existing.qty++;
  } else {
    keranjang.push({ dataIdx, nama: d.nama, harga: d.harga, qty: 1, stokMax: sisa });
  }

  renderKeranjang();
  toast(`${d.nama} ditambahkan ✓`);
}

function ubahQtyKeranjang(dataIdx, delta) {
  const item = keranjang.find(k => k.dataIdx === dataIdx);
  if (!item) return;

  const sisa = data[dataIdx].masuk - data[dataIdx].keluar;
  item.qty += delta;

  if (item.qty <= 0) {
    keranjang = keranjang.filter(k => k.dataIdx !== dataIdx);
  } else if (item.qty > sisa) {
    item.qty = sisa;
    toast(`Stok maks ${sisa}`, "warning");
  }

  renderKeranjang();
}

function clearKeranjang() {
  keranjang = [];
  renderKeranjang();
  if (el("uangDiterima")) el("uangDiterima").value = "";
  if (el("kembalian"))    el("kembalian").textContent = "Rp. 0";
}

function renderKeranjang() {
  const list = el("keranjangList");
  if (!list) return;

  if (keranjang.length === 0) {
    list.innerHTML = `<p class="empty-state">Keranjang kosong 🛒</p>`;
    if (el("subtotal"))   el("subtotal").textContent   = "Rp. 0";
    if (el("grandTotal")) el("grandTotal").textContent = "Rp. 0";
    return;
  }

  list.innerHTML = "";
  let total = 0;

  keranjang.forEach(item => {
    const subtotalItem = item.harga * item.qty;
    total += subtotalItem;
    list.innerHTML += `
      <div class="keranjang-item">
        <div class="keranjang-item-info">
          <div class="keranjang-item-name">${item.nama}</div>
          <div class="keranjang-item-price">${rupiah(item.harga)} × ${item.qty} = ${rupiah(subtotalItem)}</div>
        </div>
        <div class="qty-control">
          <button class="qty-btn" onclick="ubahQtyKeranjang(${item.dataIdx}, -1)">−</button>
          <span class="qty-val">${item.qty}</span>
          <button class="qty-btn" onclick="ubahQtyKeranjang(${item.dataIdx}, 1)">+</button>
        </div>
      </div>`;
  });

  if (el("subtotal"))   el("subtotal").textContent   = rupiah(total);
  if (el("grandTotal")) el("grandTotal").textContent = rupiah(total);
  hitungKembalian();
}

function hitungKembalian() {
  const total    = keranjang.reduce((acc, k) => acc + k.harga * k.qty, 0);
  const diterima = +(el("uangDiterima")?.value || 0);
  const kembali  = diterima - total;

  if (el("kembalian")) {
    el("kembalian").textContent = kembali >= 0 ? rupiah(kembali) : "Kurang " + rupiah(Math.abs(kembali));
    el("kembalian").style.color = kembali >= 0 ? "var(--amber)" : "var(--danger-light)";
  }
}

// ── CHECKOUT ─────────────────────────────────────
function checkout() {
  if (keranjang.length === 0) { toast("Keranjang kosong!", "warning"); return; }

  const total    = keranjang.reduce((acc, k) => acc + k.harga * k.qty, 0);
  const diterima = +(el("uangDiterima")?.value || 0);
  const kembali  = diterima - total;

  if (diterima < total) { toast("Uang diterima kurang!", "error"); return; }

  // Update stok
  keranjang.forEach(item => {
    data[item.dataIdx].keluar += item.qty;
  });

  // Update kas
  kas += total;
  logKas.push({
    keterangan: "Penjualan kasir (" + keranjang.length + " item)",
    jumlah: total,
    tipe: "masuk",
    waktu: new Date().toLocaleString("id-ID")
  });

  // Histori
  const itemList = keranjang.map(k => `${k.qty}x ${k.nama}`).join(", ");
  tambahHistori(`Penjualan: ${itemList} | Total: ${rupiah(total)}`);

  save();

  // Tampilkan nota
  tampilkanNota(keranjang, total, diterima, kembali);

  // Reset
  keranjang = [];
  renderKeranjang();
  renderPilihBarang();
  renderDashboard();
  if (el("uangDiterima")) el("uangDiterima").value = "";
  if (el("kembalian"))    el("kembalian").textContent = "Rp. 0";
}

// ── NOTA ─────────────────────────────────────────
function tampilkanNota(items, total, diterima, kembali) {
  const noTrx  = generateNoTransaksi();
  const now    = new Date();
  const waktu  = now.toLocaleString("id-ID", {
    weekday: "long", year: "numeric", month: "long",
    day: "numeric", hour: "2-digit", minute: "2-digit"
  });
  const kasirNama = currentUser?.email === KASIR_EMAIL ? "Kasir" : "Admin";

  let itemsHTML = "";
  items.forEach(item => {
    const sub = item.harga * item.qty;
    itemsHTML += `
      <div class="nota-item">
        <div class="nota-item-name">${item.nama}</div>
        <div class="nota-item-detail">
          <span>${item.qty} × ${rupiah(item.harga)}</span>
          <span>${rupiah(sub)}</span>
        </div>
      </div>`;
  });

  el("notaContent").innerHTML = `
    <div class="nota-header">
      <div class="nota-toko">🏪 ASA MANDIRI</div>
      <div class="nota-sub">Grosir Lengkap • Harga Bersahabat</div>
    </div>
    <div class="nota-info">
      No: ${noTrx}<br>
      ${waktu}<br>
      Kasir: ${kasirNama}
    </div>
    <div class="nota-items">${itemsHTML}</div>
    <div class="nota-totals">
      <div class="nota-total-row">
        <span>Subtotal</span><span>${rupiah(total)}</span>
      </div>
      <div class="nota-total-row grand">
        <span>TOTAL</span><span>${rupiah(total)}</span>
      </div>
      <div class="nota-total-row">
        <span>Bayar</span><span>${rupiah(diterima)}</span>
      </div>
      <div class="nota-total-row">
        <span>Kembali</span><span>${rupiah(kembali)}</span>
      </div>
    </div>
    <div class="nota-footer">
      <div class="nota-thanks">Terima Kasih! 😊</div>
      Simpan struk ini sebagai bukti pembelian.<br>
      Barang yang sudah dibeli tidak dapat dikembalikan.
    </div>
  `;

  el("notaModal").classList.remove("hidden");
}

function tutupNota() {
  el("notaModal").classList.add("hidden");
}

function downloadNota() {
  const nota = el("notaContent");
  html2canvas(nota, {
    backgroundColor: "#ffffff",
    scale: 2,
    useCORS: true
  }).then(canvas => {
    const link = document.createElement("a");
    link.download = `Nota-ASA-MANDIRI-${new Date().toLocaleDateString("id-ID").replace(/\//g,"-")}.jpg`;
    link.href = canvas.toDataURL("image/jpeg", 0.95);
    link.click();
    toast("Nota berhasil didownload! ✓");
  }).catch(() => {
    toast("Gagal download, coba lagi", "error");
  });
}

// ── INIT ─────────────────────────────────────────
window.onload = () => {
  if (typeof db !== "undefined") loadData();
};

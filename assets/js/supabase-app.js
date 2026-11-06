/**
 * Sistem Manajemen KPI Prodi/UPT
 * Pure Frontend Client with Supabase BaaS
 */

// ==============================================================
// 1. Supabase Client Initialization
// The UMD bundle (supabase.js) sets window.supabase = { createClient, ... }
// We store our initialized client in "db" to avoid naming conflicts.
// NOTE: index.html loads the UMD build; variable name "supabase" in the
// global scope is already taken by the SDK namespace, so we use "db".
// ==============================================================
const SUPA_URL = "https://uwxwxvpunrefywjdialr.supabase.co";
const SUPA_KEY = "sb_publishable_VEE8XvstXcJ8BT9MnDcZoQ_R87xDZIt";

let db = null;
try {
    if (typeof supabase !== 'undefined' && typeof supabase.createClient === 'function') {
        db = supabase.createClient(SUPA_URL, SUPA_KEY);
    }
} catch (initErr) {
    console.error("Supabase client init error:", initErr);
}

// 2. Auth State Validation
let currentUser = null;
try {
    // Sesi: localStorage bila "Ingat saya" dicentang, sessionStorage bila tidak
    const stored = localStorage.getItem('kpi_user') || sessionStorage.getItem('kpi_user');
    if (stored) {
        currentUser = JSON.parse(stored);
    }
} catch (e) {
    currentUser = null;
}

if (!currentUser || !currentUser.npk || !currentUser.role) {
    localStorage.removeItem('kpi_user'); sessionStorage.removeItem('kpi_user');
    window.location.replace("login.html");
}

let currentSelectedKpiId = null;
let karyawanCache = {};
let kpiCache = {};

// Helper Cache Loaders (guarantees names always show without complex JOIN errors)
async function refreshLookupCaches() {
    if (!supabase) return;
    try {
        const { data: users } = await db.from('karyawan').select('npk, nama_karyawan, role, bagian');
        if (users) {
            users.forEach(u => { karyawanCache[u.npk] = u; });
        }
        const { data: kpis } = await db.from('kpi').select('id_kpi, nama_kpi, periode, level, kategori');
        if (kpis) {
            kpis.forEach(k => { kpiCache[k.id_kpi] = k; });
        }
    } catch (e) {
        console.warn("Lookup cache warning:", e);
    }
}

function getUserName(npk) {
    if (!npk) return '-';
    return karyawanCache[npk] ? karyawanCache[npk].nama_karyawan : npk;
}

function formatActivitySchedule(startDate, endDate, legacyDeadline) {
    const end = endDate || legacyDeadline;
    if (startDate && end) {
        return '<span class="text-nowrap">' + fmtDate(startDate) + ' – ' + fmtDate(end) + '</span>';
    }
    if (end) {
        return '<span class="text-nowrap">Sampai ' + fmtDate(end) + '</span>';
    }
    return '<span class="text-muted">-</span>';
}

function getKpiName(idKpi) {
    if (!idKpi) return '-';
    return kpiCache[idKpi] ? kpiCache[idKpi].nama_kpi : idKpi;
}

// ==============================================================
// Helper tampilan (escape HTML, label status & peran, toast)
// ==============================================================

/** Escape teks sebelum dimasukkan ke innerHTML / atribut HTML. */
function esc(value) {
    return String(value ?? '')
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;');
}

/** Argumen string untuk onclick="fn(...)": aman dari kutip & tag. */
function jsArg(value) {
    return esc(JSON.stringify(String(value ?? '')));
}

/** Hanya izinkan tautan unduh berupa data: (berkas unggahan) atau http(s). */
function safeFileHref(url) {
    const u = String(url || '').trim();
    if (/^data:(?!text\/html)[\w.+-]+\/[\w.+-]+;base64,/i.test(u)) return u;
    if (/^https?:\/\//i.test(u)) return u;
    return '';
}

const STATUS_INFO = {
    // Header KPI
    DRAFT: ['Draf', 'neutral'],
    PUBLISHED: ['Terbit', 'info'],
    CLOSED: ['Ditutup', 'muted'],
    // Detail aktivitas
    OPEN: ['Belum diambil', 'neutral'],
    PICKED: ['Dikerjakan', 'info'],
    SUBMITTED: ['Menunggu level 1', 'warn'],
    APPROVED_L1: ['Menunggu final', 'warn'],
    REVISION: ['Perlu revisi', 'bad'],
    DONE: ['Selesai', 'ok'],
};

function statusLabel(status) {
    return (STATUS_INFO[status] || [status || '-'])[0];
}

function statusTag(status) {
    const [label, tone] = STATUS_INFO[status] || [status || '-', 'neutral'];
    return `<span class="tag tag-${tone}">${esc(label)}</span>`;
}

const ROLE_LABELS = {
    KAPROD: 'Kaprod',
    SEKPROD: 'Sekprod',
    KAUPT: 'Ka. UPT',
    PIC_ACTIVITY: 'PIC aktivitas',
};

function roleLabel(role) {
    return ROLE_LABELS[role] || role || '-';
}

const MONTHS_ID = ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Agu', 'Sep', 'Okt', 'Nov', 'Des'];

/** "2026-11-30" -> "30 Nov 2026" */
function fmtDate(iso) {
    if (!iso) return '-';
    const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(iso);
    if (!m) return esc(iso);
    return `${parseInt(m[3], 10)} ${MONTHS_ID[parseInt(m[2], 10) - 1]} ${m[1]}`;
}

/** Bar progres + angka. Warna = status: >=80 hijau, >=50 kuning, <50 merah. */
function progressCell(pct, { neutral = false } = {}) {
    const v = Math.max(0, Math.min(100, parseFloat(pct) || 0));
    const color = neutral ? 'var(--astra-600)' : (v >= 80 ? '#059669' : (v >= 50 ? '#D97706' : '#DC2626'));
    return `<div class="progress-wrap">
        <div class="progress" role="progressbar" aria-valuenow="${v}" aria-valuemin="0" aria-valuemax="100" aria-label="Progres">
            <div class="progress-bar" style="width:${v}%;background:${color}"></div>
        </div>
        <span class="pct">${esc(pct ?? 0)}%</span>
    </div>`;
}

/** Tombol aksi berupa ikon: selalu dengan aria-label & tooltip. */
function iconBtn(icon, label, onclick, tone = '') {
    return `<button type="button" class="btn-icon${tone ? ' btn-icon--' + tone : ''}" title="${esc(label)}" aria-label="${esc(label)}" onclick="${onclick}"><i class="bi ${icon}" aria-hidden="true"></i></button>`;
}

function idCell(id) {
    return `<td><span class="id-code">${esc(id)}</span></td>`;
}

function emptyRow(colspan, text, icon = 'bi-inbox') {
    return `<tr><td colspan="${colspan}" class="table-empty"><i class="bi ${icon}" aria-hidden="true"></i>${esc(text)}</td></tr>`;
}

// Kerangka baris (skeleton) selama data dimuat; teks tetap dibacakan pembaca layar
function loadingRow(colspan, text) {
    const widths = [55, 80, 40, 65, 50, 70, 45, 60, 35];
    const row = (r) => `<tr class="skeleton-row" aria-hidden="true">${
        Array.from({ length: colspan }, (_, i) => `<td><span class="skeleton" style="width:${widths[(i + r * 3) % widths.length]}%"></span></td>`).join('')
    }</tr>`;
    return `<tr class="visually-hidden"><td colspan="${colspan}" role="status">${esc(text)}</td></tr>${row(0)}${row(1)}${row(2)}`;
}

function errorRow(colspan, message) {
    return `<tr><td colspan="${colspan}" class="table-empty text-danger"><i class="bi bi-exclamation-circle" aria-hidden="true"></i>Data belum bisa dimuat: ${esc(message)}</td></tr>`;
}

// SweetAlert: popup sukses diganti toast singkat, tombol mengikuti gaya aplikasi.
const Toast = (typeof Swal !== 'undefined') ? Swal.mixin({
    toast: true, position: 'top-end', timer: 2800, timerProgressBar: false, showConfirmButton: false,
}) : null;

if (typeof Swal !== 'undefined') {
    const swalFire = Swal.fire.bind(Swal);
    Swal.fire = function (a, b, c) {
        const opts = (typeof a === 'object' && a !== null) ? { ...a } : { title: a, text: b, icon: c };
        if (opts.icon === 'success' && !opts.showCancelButton) {
            return Toast.fire({ icon: 'success', title: opts.title || 'Tersimpan' });
        }
        const danger = /ef4444|dc2626|b91c1c/i.test(opts.confirmButtonColor || '');
        delete opts.confirmButtonColor;
        delete opts.cancelButtonColor;
        return swalFire({
            buttonsStyling: false,
            reverseButtons: true,
            customClass: {
                confirmButton: danger ? 'btn btn-danger' : 'btn btn-primary',
                cancelButton: 'btn btn-outline-secondary',
            },
            cancelButtonText: 'Batal',
            confirmButtonText: 'Tutup',
            ...opts,
        });
    };
}

// 3. Initialize on Document Ready
document.addEventListener('DOMContentLoaded', async function() {
    if (!currentUser) return;

    setupUserInterface();
    await refreshLookupCaches();
    switchView('dashboard');

    // Status koneksi di header (seperti main): cek online/offline + ping berkala
    function updateNetworkStatus(isOnline) {
        const badge = document.getElementById('networkStatusBadge');
        const text = document.getElementById('networkStatusText');
        const bellDot = document.getElementById('bellStatusDot');
        const detail = document.getElementById('networkStatusDetail');
        if (badge) badge.classList.toggle('is-offline', !isOnline);
        if (text) text.textContent = isOnline ? 'Terhubung' : 'Terputus';
        if (bellDot) bellDot.classList.toggle('is-offline', !isOnline);
        if (detail) {
            detail.innerHTML = isOnline
                ? '<i class="bi bi-wifi" aria-hidden="true"></i> Terhubung ke server'
                : '<i class="bi bi-wifi-off" aria-hidden="true"></i> Terputus dari server. Perubahan belum bisa disimpan.';
        }
    }
    updateNetworkStatus(navigator.onLine);
    window.addEventListener('online', () => updateNetworkStatus(true));
    window.addEventListener('offline', () => updateNetworkStatus(false));
    setInterval(async () => {
        if (!navigator.onLine) { updateNetworkStatus(false); return; }
        if (window.location.protocol === 'file:') { updateNetworkStatus(navigator.onLine); return; }
        try {
            const res = await fetch('assets/images/favicon.ico?_ping=' + Date.now(), { method: 'HEAD', cache: 'no-store' });
            updateNetworkStatus(res.ok);
        } catch (e) {
            updateNetworkStatus(false);
        }
    }, 15000);

    // Menu samping di layar kecil (drawer)
    const sidebarToggle = document.getElementById('sidebar-toggle');
    const backdrop = document.getElementById('sidebarBackdrop');
    if (sidebarToggle) sidebarToggle.addEventListener('click', openSidebar);
    if (backdrop) backdrop.addEventListener('click', closeSidebar);
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape' && document.getElementById('sidebar')?.classList.contains('show')) {
            closeSidebar();
            sidebarToggle?.focus();
        }
    });

    // Modal forms bindings
    const fk = document.getElementById('formKaryawan');
    if (fk) fk.addEventListener('submit', handleSaveKaryawan);

    const fKpi = document.getElementById('formKpi');
    if (fKpi) fKpi.addEventListener('submit', handleSaveKpi);

    const fa = document.getElementById('formActivity');
    if (fa) fa.addEventListener('submit', handleSaveActivity);

    const fu = document.getElementById('formUpload');
    if (fu) fu.addEventListener('submit', handleSubmitUpload);

    const fr = document.getElementById('formReview');
    if (fr) fr.addEventListener('submit', handleSubmitReview);

    // Review action radio toggle
    const approveRadio = document.getElementById('actionApprove');
    const rejectRadio = document.getElementById('actionReject');
    const catatanReqBadge = document.getElementById('reviewCatatanRequired');
    const catatanInput = document.getElementById('reviewCatatan');

    function updateReviewValidation() {
        if (!rejectRadio || !catatanReqBadge || !catatanInput) return;
        if (rejectRadio.checked) {
            catatanReqBadge.classList.remove('d-none');
            catatanInput.setAttribute('required', 'required');
        } else {
            catatanReqBadge.classList.add('d-none');
            catatanInput.removeAttribute('required');
        }
    }
    if (approveRadio) approveRadio.addEventListener('change', updateReviewValidation);
    if (rejectRadio) rejectRadio.addEventListener('change', updateReviewValidation);
});

function openSidebar() {
    document.getElementById('sidebar')?.classList.add('show');
    document.getElementById('sidebarBackdrop')?.classList.add('show');
    document.getElementById('sidebar-toggle')?.setAttribute('aria-expanded', 'true');
    // Tunggu sebentar sampai drawer terlihat, baru pindahkan fokus ke menu aktif
    setTimeout(() => {
        (document.querySelector('#sidebar .sidebar-menu-link.active') || document.querySelector('#sidebar .sidebar-menu-link'))?.focus();
    }, 30);
}

function closeSidebar() {
    document.getElementById('sidebar')?.classList.remove('show');
    document.getElementById('sidebarBackdrop')?.classList.remove('show');
    document.getElementById('sidebar-toggle')?.setAttribute('aria-expanded', 'false');
}

// Setup User Info & Role Permissions
function setupUserInterface() {
    if (!currentUser) return;

    const initial = currentUser.nama_karyawan ? currentUser.nama_karyawan.charAt(0).toUpperCase() : 'U';
    const setElemText = (id, val) => {
        const el = document.getElementById(id);
        if (el) el.innerText = val;
    };

    setElemText('userInitial', initial);
    setElemText('userInitialTop', initial);
    setElemText('userName', currentUser.nama_karyawan);
    setElemText('userNameTop', currentUser.nama_karyawan);
    setElemText('userNameDropdown', currentUser.nama_karyawan);
    setElemText('userNpkDropdown', "NPK: " + currentUser.npk);
    setElemText('userRole', roleLabel(currentUser.role));
    setElemText('userRoleTop', roleLabel(currentUser.role));
    setElemText('userRoleDropdown', 'Peran: ' + roleLabel(currentUser.role));
    setElemText('dashUserName', currentUser.nama_karyawan);
    setElemText('dashUserRole', roleLabel(currentUser.role));
    setElemText('userBagian', currentUser.bagian || 'Program Studi');

    // Tanggal hari ini di header
    const dateEl = document.getElementById('headerLiveDate');
    if (dateEl) {
        dateEl.textContent = new Date().toLocaleDateString('id-ID', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
    }
    const h = new Date().getHours();
    setElemText('heroGreeting', h < 11 ? 'Selamat pagi' : h < 15 ? 'Selamat siang' : h < 18 ? 'Selamat sore' : 'Selamat malam');
    setElemText('heroDate', new Date().toLocaleDateString('id-ID', { weekday: 'long', day: 'numeric', month: 'long' }));

    // Role-based visibility
    const role = currentUser.role; // KAPROD, SEKPROD, KAUPT, PIC_ACTIVITY

    if (role !== 'KAPROD') {
        document.querySelectorAll('.role-kaprod').forEach(el => el.classList.add('d-none'));
    }
    if (role !== 'PIC_ACTIVITY') {
        document.querySelectorAll('.role-pic').forEach(el => el.classList.add('d-none'));
    }
    if (role !== 'SEKPROD' && role !== 'KAUPT' && role !== 'KAPROD') {
        document.querySelectorAll('.role-approver').forEach(el => el.classList.add('d-none'));
    }
    if (role === 'PIC_ACTIVITY') {
        document.querySelectorAll('.role-l1').forEach(el => el.classList.add('d-none'));
        document.querySelectorAll('.role-final').forEach(el => el.classList.add('d-none'));
    }
    if (role === 'SEKPROD' || role === 'KAUPT') {
        document.querySelectorAll('.role-final').forEach(el => el.classList.add('d-none'));
    }
}

// Navigation View Switcher
function switchView(viewName) {
    document.querySelectorAll('.nav-view').forEach(view => view.classList.remove('active'));
    document.querySelectorAll('.sidebar-menu-link').forEach(link => link.classList.remove('active'));

    const targetView = document.getElementById('view-' + viewName);
    if (targetView) targetView.classList.add('active');

    document.querySelectorAll('.sidebar-menu-link[aria-current]').forEach(link => link.removeAttribute('aria-current'));
    const navName = viewName === 'detail-kpi' ? 'kpi' : viewName;
    const targetNav = document.getElementById('nav-' + navName);
    if (targetNav) {
        targetNav.classList.add('active');
        targetNav.setAttribute('aria-current', 'page');
    }
    closeSidebar();
    window.scrollTo(0, 0);

    // Trigger data fetch per view
    if (viewName === 'dashboard') loadDashboard();
    else if (viewName === 'karyawan') loadKaryawan();
    else if (viewName === 'kpi') loadKpi();
    else if (viewName === 'pick') loadPickList();
    else if (viewName === 'my-activities') loadMyActivities();
    else if (viewName === 'approval-l1') loadApprovalL1();
    else if (viewName === 'approval-final') loadApprovalFinal();
}

function logout() {
    Swal.fire({
        title: 'Keluar dari sistem?',
        text: 'Anda perlu masuk lagi untuk membuka aplikasi.',
        showCancelButton: true,
        confirmButtonText: 'Keluar',
        cancelButtonText: 'Batal'
    }).then(res => {
        if (res.isConfirmed) {
            localStorage.removeItem('kpi_user'); sessionStorage.removeItem('kpi_user');
            window.location.href = "login.html";
        }
    });
}

// Helper: Random ID Generator with Prefix
function generatePrefixedId(prefix) {
    const rand = Math.floor(Math.random() * 9000000) + 1000000;
    return prefix + rand;
}

// ==========================================
// 1. DASHBOARD MODULE
// ==========================================

// Ringkasan "fokus hari ini" di hero dashboard, disesuaikan dengan peran
function renderHeroSummary(activities, { totalActs, countDone, overdue }) {
    const role = currentUser.role;
    const count = (fn) => activities.filter(fn).length;
    const items = [];
    const add = (n, icon, text, view, tone = '') => items.push({ n, icon, text, view, tone });

    if (role === 'KAPROD') {
        add(count(a => a.status === 'APPROVED_L1'), 'bi-patch-check', 'aktivitas menunggu approval final Anda', 'approval-final', 'warn');
    } else if (role === 'SEKPROD' || role === 'KAUPT') {
        add(count(a => a.status === 'SUBMITTED'), 'bi-shield-check', 'aktivitas menunggu approval level 1', 'approval-l1', 'warn');
    } else if (role === 'PIC_ACTIVITY') {
        const mine = activities.filter(a => a.npk_pic === currentUser.npk);
        add(mine.filter(a => a.status === 'REVISION').length, 'bi-arrow-counterclockwise', 'aktivitas Anda perlu revisi', 'my-activities', 'bad');
        add(mine.filter(a => a.status === 'PICKED').length, 'bi-list-check', 'aktivitas sedang Anda kerjakan', 'my-activities');
        add(count(a => a.status === 'OPEN'), 'bi-inbox', 'aktivitas belum diambil', 'pick');
    }
    if (overdue > 0) add(overdue, 'bi-exclamation-triangle', 'aktivitas melewati batas waktu, cek timeline', 'timeline', 'bad');

    const list = document.getElementById('heroFocus');
    if (list) {
        const shown = items.filter(i => i.n > 0);
        list.innerHTML = shown.length === 0
            ? '<li><i class="bi bi-check2-circle" aria-hidden="true"></i>Tidak ada yang mendesak hari ini. Semua aman.</li>'
            : shown.map(i => {
                const body = `<i class="bi ${i.icon}" aria-hidden="true"></i><strong>${i.n}</strong> ${esc(i.text)}`;
                const go = i.view === 'timeline'
                    ? `document.getElementById('ganttChartContainer')?.scrollIntoView({ behavior: 'smooth', block: 'start' })`
                    : `switchView(${jsArg(i.view)})`;
                return `<li class="${i.tone ? 'is-' + i.tone : ''}"><a href="#${i.view}" onclick="${go}; return false;">${body}<i class="bi bi-arrow-right hero-go" aria-hidden="true"></i></a></li>`;
            }).join('');
    }

    const pct = totalActs > 0 ? Math.round((countDone / totalActs) * 100) : 0;
    const ring = document.getElementById('heroRingValue');
    if (ring) {
        ring.style.opacity = pct === 0 ? '0' : '1'; // ujung bulat tampil sebagai titik saat 0%
        setTimeout(() => ring.setAttribute('stroke-dasharray', `${pct} 100`), 60);
    }
    const pctEl = document.getElementById('heroRingPct');
    if (pctEl) { if (typeof window.countTo === 'function') window.countTo(pctEl, pct, '%'); else pctEl.textContent = pct + '%'; }
    const sub = document.getElementById('heroRingSub');
    if (sub) sub.textContent = `${countDone} dari ${totalActs}`;
}
async function loadDashboard() {
    if (!currentUser) return;
    try {
        await refreshLookupCaches();
        const { data: kpis } = await db.from('kpi').select('*');
        const { data: activities } = await db.from('detail_kpi').select('*');

        const totalKpis = kpis ? kpis.length : 0;
        const totalActs = activities ? activities.length : 0;
        const countDone = activities ? activities.filter(a => a.status === 'DONE').length : 0;
        
        let pendingApproval = 0;
        if (currentUser.role === 'SEKPROD' || currentUser.role === 'KAUPT') {
            pendingApproval = activities ? activities.filter(a => a.status === 'SUBMITTED').length : 0;
        } else if (currentUser.role === 'KAPROD') {
            pendingApproval = activities ? activities.filter(a => a.status === 'APPROVED_L1').length : 0;
        } else if (currentUser.role === 'PIC_ACTIVITY') {
            // Untuk PIC: aktivitas miliknya yang sudah diajukan & sedang menunggu persetujuan (SUBMITTED / APPROVED_L1)
            const myPending = activities ? activities.filter(a => a.npk_pic === currentUser.npk && (a.status === 'SUBMITTED' || a.status === 'APPROVED_L1')).length : 0;
            // Jika PIC belum memiliki aktivitas yang diajukan, tampilkan total antrean sistem agar informatif
            const totalSysPending = activities ? activities.filter(a => a.status === 'SUBMITTED' || a.status === 'APPROVED_L1').length : 0;
            pendingApproval = myPending > 0 ? myPending : totalSysPending;
        } else {
            pendingApproval = activities ? activities.filter(a => a.status === 'SUBMITTED' || a.status === 'APPROVED_L1').length : 0;
        }

        const setStat = (id, n) => {
            const el = document.getElementById(id);
            if (!el) return;
            if (typeof window.countTo === 'function') window.countTo(el, n); else el.innerText = n;
        };
        setStat('statTotalKpi', totalKpis);
        setStat('statTotalActivities', totalActs);
        setStat('statPendingApproval', pendingApproval);
        setStat('statDone', countDone);

        // Check Overdue
        const todayStr = new Date().toISOString().split('T')[0];
        const overdueActs = activities ? activities.filter(a => { const due = a.end_date || a.deadline; return a.status !== 'DONE' && due && due < todayStr; }) : [];

        renderHeroSummary(activities || [], { totalActs, countDone, overdue: overdueActs.length });
        const alertBox = document.getElementById('overdueAlert');
        if (alertBox) {
            if (overdueActs.length > 0) {
                alertBox.classList.remove('d-none');
                const oc = document.getElementById('overdueCount');
                if (oc) oc.innerText = overdueActs.length;
            } else {
                alertBox.classList.add('d-none');
            }
        }

        // Render KPI Table on Dashboard
        const tbody = document.getElementById('dashKpiTableBody');
        if (tbody) {
            if (!kpis || kpis.length === 0) {
                tbody.innerHTML = emptyRow(5, 'Belum ada KPI. KPI dibuat oleh Kaprod di menu Header KPI.');
            } else {
                tbody.innerHTML = kpis.map(k => `
                    <tr>
                        <td>
                            <a href="#kpi" onclick="openKpiDetail(${jsArg(k.id_kpi)}); return false;" class="fw-semibold text-dark text-decoration-none">${esc(k.nama_kpi)}</a>
                            <span class="cell-sub">${esc(k.level || '-')}, ${esc(k.kategori || '-')}</span>
                        </td>
                        <td>${esc(k.periode || '-')}</td>
                        <td>${statusTag(k.status)}</td>
                        <td>${progressCell(k.persentase_progres)}</td>
                        <td class="text-end">
                            ${iconBtn('bi-chevron-right', 'Buka detail ' + k.nama_kpi, `openKpiDetail(${jsArg(k.id_kpi)})`)}
                        </td>
                    </tr>
                `).join('');
            }
        }

        // Workload per PIC
        const workloadMap = {};
        if (activities) {
            activities.forEach(a => {
                if (a.npk_pic) {
                    const name = getUserName(a.npk_pic);
                    workloadMap[name] = (workloadMap[name] || 0) + 1;
                }
            });
        }
        const workloadContainer = document.getElementById('picWorkloadList');
        if (workloadContainer) {
            const workloadKeys = Object.keys(workloadMap);
            if (workloadKeys.length === 0) {
                workloadContainer.innerHTML = `<div class="table-empty">Belum ada aktivitas yang dipegang PIC.</div>`;
            } else {
                workloadContainer.innerHTML = `<ul class="workload-list">` + workloadKeys
                    .sort((a, b) => workloadMap[b] - workloadMap[a])
                    .map(name => `
                    <li>
                        <span class="d-flex align-items-center gap-2 min-w-0">
                            <span class="avatar" aria-hidden="true">${esc(name.charAt(0).toUpperCase())}</span>
                            <span class="text-truncate">${esc(name)}</span>
                        </span>
                        <span class="count">${workloadMap[name]} aktivitas</span>
                    </li>
                `).join('') + `</ul>`;
            }
        }

        // Render Gantt Timeline & Reminders
        cachedKpis = kpis || [];
        cachedActivities = activities || [];
        populateGanttFilter(cachedKpis);
        renderGanttChart();

    } catch (err) {
        console.error("Dashboard error:", err);
        const tbody = document.getElementById('dashKpiTableBody');
        if (tbody) tbody.innerHTML = errorRow(5, err.message);
    }
}

// ==========================================
// 1.1 GANTT TIMELINE & JADWAL AKTIVITAS MODULE
// ==========================================
let ganttViewDate = new Date();
let cachedKpis = [];
let cachedActivities = [];

function changeGanttMonth(delta) {
    ganttViewDate.setMonth(ganttViewDate.getMonth() + delta);
    renderGanttChart();
}

function resetGanttToCurrentMonth() {
    ganttViewDate = new Date();
    renderGanttChart();
}

function populateGanttFilter(kpis) {
    const filterEl = document.getElementById('ganttKpiFilter');
    if (!filterEl) return;
    const currentVal = filterEl.value || 'ALL';
    let html = `<option value="ALL">Semua KPI (${kpis.length})</option>`;
    kpis.forEach(k => {
        html += `<option value="${esc(k.id_kpi)}">${esc(k.nama_kpi)}</option>`;
    });
    filterEl.innerHTML = html;
    filterEl.value = currentVal;
}

function renderGanttChart() {
    const container = document.getElementById('ganttChartContainer');
    if (!container) return;

    const year = ganttViewDate.getFullYear();
    const month = ganttViewDate.getMonth();
    const monthNames = ['Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni', 'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'];
    const monthNamesShort = MONTHS_ID;

    // Update Month Label in Header
    const labelEl = document.getElementById('ganttMonthLabel');
    if (labelEl) {
        labelEl.innerText = `${monthNamesShort[month]} ${year}`;
    }

    const realToday = new Date();
    const isCurrentMonth = (realToday.getFullYear() === year && realToday.getMonth() === month);
    const todayDay = isCurrentMonth ? realToday.getDate() : -1;
    const todayIso = realToday.toISOString().split('T')[0];

    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const daysArray = Array.from({ length: daysInMonth }, (_, i) => i + 1);

    // Filter KPI
    const selectedKpiFilter = document.getElementById('ganttKpiFilter') ? document.getElementById('ganttKpiFilter').value : 'ALL';
    let displayKpis = cachedKpis;
    if (selectedKpiFilter && selectedKpiFilter !== 'ALL') {
        displayKpis = displayKpis.filter(k => k.id_kpi === selectedKpiFilter);
    }

    // Today reminder calculations
    const todayActiveActs = cachedActivities.filter(a => {
        const start = a.start_date || a.end_date || a.deadline;
        const end = a.end_date || a.deadline;
        if (!end) return false;
        const s = start || end;
        return (todayIso >= s && todayIso <= end);
    });
    const dueTodayActs = cachedActivities.filter(a => (a.end_date || a.deadline) === todayIso);

    const reminderTextEl = document.getElementById('ganttTodayReminderText');
    if (reminderTextEl) {
        const dateFormatted = realToday.toLocaleDateString('id-ID', { weekday: 'long', day: 'numeric', month: 'short', year: 'numeric' });
        if (todayActiveActs.length === 0 && dueTodayActs.length === 0) {
            reminderTextEl.innerHTML = `${esc(dateFormatted)}: tidak ada aktivitas yang terjadwal hari ini.`;
        } else {
            let msg = `${esc(dateFormatted)}: <strong>${todayActiveActs.length} aktivitas berjalan</strong>`;
            if (dueTodayActs.length > 0) {
                msg += `, <strong class="text-danger">${dueTodayActs.length} berakhir hari ini</strong>`;
            }
            reminderTextEl.innerHTML = msg + '.';
        }
    }

    if (displayKpis.length === 0) {
        container.innerHTML = `<div class="table-empty">Belum ada KPI untuk ditampilkan.</div>`;
        return;
    }

    const colWidth = 36; // px per day column
    const totalDaysWidth = daysInMonth * colWidth;

    // Build Gantt Table HTML matching reference layout
    let html = `
    <div class="gantt-header-container">
        <div class="gantt-header-left">
            <span>Aktivitas</span>
            <span class="text-end">PIC</span>
        </div>
        <div class="gantt-header-right">
            <div class="gantt-month-strip" style="min-width: ${totalDaysWidth}px;">
                <span>${monthNames[month]} ${year}</span>
            </div>
            <div class="gantt-days-strip" style="min-width: ${totalDaysWidth}px; grid-template-columns: repeat(${daysInMonth}, ${colWidth}px);">
                ${daysArray.map(d => {
                    const isToday = (d === todayDay);
                    return `<div class="gantt-day-num ${isToday ? 'today' : ''}" title="${d} ${monthNamesShort[month]} ${year}">${d}</div>`;
                }).join('')}
            </div>
        </div>
    </div>
    <div class="gantt-body-scroll">
    `;

    displayKpis.forEach(k => {
        const kpiActs = cachedActivities.filter(a => a.id_kpi === k.id_kpi);
        html += `
        <div class="gantt-kpi-row">
            <div class="gantt-kpi-left">
                <span class="text-truncate" style="max-width: 300px;" title="${esc(k.nama_kpi)}">${esc(k.nama_kpi)}</span>
            </div>
            <div class="gantt-kpi-right" style="min-width: ${totalDaysWidth}px;"></div>
        </div>
        `;

        if (kpiActs.length === 0) {
            html += `
            <div class="gantt-task-row">
                <div class="gantt-task-left">
                    <span class="text-muted">Belum ada aktivitas</span>
                    <span class="text-muted">-</span>
                </div>
                <div class="gantt-task-right" style="min-width: ${totalDaysWidth}px; grid-template-columns: repeat(${daysInMonth}, ${colWidth}px);">
                    ${daysArray.map(d => `<div class="gantt-grid-col ${d === todayDay ? 'today' : ''}"></div>`).join('')}
                </div>
            </div>
            `;
        } else {
            kpiActs.forEach(a => {
                const picName = a.npk_pic ? getUserName(a.npk_pic) : 'Belum ada PIC';
                const startStr = a.start_date;
                const endStr = a.end_date || a.deadline;

                let barHtml = '';
                if (endStr) {
                    const startMonthStr = `${year}-${String(month + 1).padStart(2, '0')}-01`;
                    const endMonthStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(daysInMonth).padStart(2, '0')}`;

                    const effectiveStart = startStr || endStr;
                    // Check intersection with currently viewed month
                    if (effectiveStart <= endMonthStr && endStr >= startMonthStr) {
                        let startDay = 1;
                        if (effectiveStart >= startMonthStr) {
                            startDay = parseInt(effectiveStart.split('-')[2], 10);
                        }
                        let endDay = daysInMonth;
                        if (endStr <= endMonthStr) {
                            endDay = parseInt(endStr.split('-')[2], 10);
                        }

                        // Clamp
                        startDay = Math.max(1, Math.min(daysInMonth, startDay));
                        endDay = Math.max(startDay, Math.min(daysInMonth, endDay));
                        const spanCount = (endDay - startDay + 1);

                        // Pill color logic
                        let pillClass = 'gantt-pill-blue';
                        if (a.status === 'DONE') {
                            pillClass = 'gantt-pill-green';
                        } else if (endStr < todayIso) {
                            pillClass = 'gantt-pill-red';
                        } else if (todayIso >= effectiveStart && todayIso <= endStr) {
                            pillClass = 'gantt-pill-blue';
                        }

                        const scheduleText = formatActivitySchedule(a.start_date, a.end_date, a.deadline).replace(/<[^>]+>/g, ' ');
                        const tooltipText = `${esc(a.nama_aktivitas_kpi)}&#10;PIC: ${esc(picName)}&#10;Jadwal: ${esc(scheduleText.trim())}&#10;Status: ${esc(statusLabel(a.status))} (${esc(a.persentase_progres)}%)`;

                        barHtml = `
                        <button type="button" class="gantt-pill ${pillClass}" style="grid-column: ${startDay} / span ${spanCount};" title="${tooltipText}" aria-label="${esc(a.nama_aktivitas_kpi)}, progres ${esc(a.persentase_progres)}%" onclick="openKpiDetail(${jsArg(a.id_kpi)})">
                            <span>${esc(a.persentase_progres)}%</span>
                        </button>
                        `;
                    }
                }

                html += `
                <div class="gantt-task-row">
                    <div class="gantt-task-left">
                        <span class="text-dark text-truncate" style="max-width: 200px;" title="${esc(a.nama_aktivitas_kpi)}">${esc(a.nama_aktivitas_kpi)}</span>
                        <span class="role-tag gantt-pic" title="PIC: ${esc(picName)}">${esc(picName)}</span>
                    </div>
                    <div class="gantt-task-right" style="min-width: ${totalDaysWidth}px; grid-template-columns: repeat(${daysInMonth}, ${colWidth}px);">
                        ${daysArray.map(d => `<div class="gantt-grid-col ${d === todayDay ? 'today' : ''}"></div>`).join('')}
                        ${barHtml}
                    </div>
                </div>
                `;
            });
        }
    });

    html += `</div>`;
    container.innerHTML = html;
}

// ==========================================
// 2. DATA KARYAWAN MODULE (KAPROD)
// ==========================================
async function loadKaryawan() {
    if (!currentUser) return;
    const tbody = document.getElementById('karyawanTableBody');
    tbody.innerHTML = loadingRow(8, 'Memuat data karyawan…');

    const { data: users, error } = await db.from('karyawan').select('*').order('npk');
    if (error) {
        tbody.innerHTML = errorRow(8, error.message);
        return;
    }

    if (!users || users.length === 0) {
        tbody.innerHTML = emptyRow(8, 'Belum ada karyawan. Tambahkan lewat tombol Tambah karyawan.', 'bi-people');
        return;
    }

    // Refresh cache
    users.forEach(u => { karyawanCache[u.npk] = u; });

    tbody.innerHTML = users.map(u => {
        const initial = u.nama_karyawan ? u.nama_karyawan.charAt(0).toUpperCase() : 'U';
        const isSelf = currentUser.npk === u.npk;
        return `
        <tr class="${u.status_aktif ? '' : 'text-muted'}">
            <td><span class="id-code">${esc(u.npk)}</span></td>
            <td class="cell-name">
                <div class="d-flex align-items-center gap-2">
                    <span class="avatar" aria-hidden="true">${esc(initial)}</span>
                    <span class="fw-semibold ${u.status_aktif ? 'text-dark' : ''}">${esc(u.nama_karyawan)}${isSelf ? ' <span class="text-muted fw-normal small">(Anda)</span>' : ''}</span>
                </div>
            </td>
            <td>${esc(u.gender || '-')}</td>
            <td><span class="role-tag">${esc(roleLabel(u.role))}</span></td>
            <td>${esc(u.bagian || '-')}</td>
            <td>${esc(u.username)}</td>
            <td>${u.status_aktif ? '<span class="tag tag-neutral">Aktif</span>' : '<span class="tag tag-muted">Nonaktif</span>'}</td>
            <td class="text-end">
                <div class="row-actions">
                    ${isSelf ? '<span class="small text-muted">Akun Anda</span>' : `
                    ${iconBtn(u.status_aktif ? 'bi-lock' : 'bi-unlock', (u.status_aktif ? 'Nonaktifkan ' : 'Aktifkan ') + u.nama_karyawan, `toggleKaryawan(${jsArg(u.npk)}, ${u.status_aktif ? 'true' : 'false'})`)}
                    ${iconBtn('bi-trash', 'Hapus ' + u.nama_karyawan, `deleteKaryawan(${jsArg(u.npk)}, ${jsArg(u.nama_karyawan)})`, 'danger')}`}
                </div>
            </td>
        </tr>
        `;
    }).join('');
}

function openKaryawanModal() {
    document.getElementById('formKaryawan').reset();
    document.getElementById('karyawanNpk').removeAttribute('readonly');
    const modal = new bootstrap.Modal(document.getElementById('modalKaryawan'));
    modal.show();
}

async function handleSaveKaryawan(e) {
    e.preventDefault();
    const npk = document.getElementById('karyawanNpk').value.trim();
    const nama = document.getElementById('karyawanNama').value.trim();
    const gender = document.getElementById('karyawanGender').value;
    const bagian = document.getElementById('karyawanBagian').value.trim();
    const role = document.getElementById('karyawanRole').value;
    const status_aktif = document.getElementById('karyawanStatus').value === 'true';
    const username = document.getElementById('karyawanUsername').value.trim();
    const password = document.getElementById('karyawanPassword').value;

    const btn = document.getElementById('btnSaveKaryawan');
    btn.disabled = true;

    try {
        let finalPassword = password;
        if (typeof dcodeIO !== 'undefined' && dcodeIO.bcrypt) {
            try { finalPassword = dcodeIO.bcrypt.hashSync(password, 10); } catch (e) { finalPassword = password; }
        }
        const { error } = await db.from('karyawan').insert([{
            npk, nama_karyawan: nama, gender, bagian, role, status_aktif, username, password: finalPassword
        }]);

        if (error) throw error;

        Swal.fire({ icon: 'success', title: `${nama} ditambahkan` });
        bootstrap.Modal.getInstance(document.getElementById('modalKaryawan')).hide();
        loadKaryawan();
    } catch (err) {
        Swal.fire('Gagal', err.message, 'error');
    } finally {
        btn.disabled = false;
    }
}

async function toggleKaryawan(npk, currentStatus) {
    const { error } = await db.from('karyawan').update({ status_aktif: !currentStatus }).eq('npk', npk);
    if (error) {
        Swal.fire('Gagal', error.message, 'error');
    } else {
        Swal.fire({ icon: 'success', title: currentStatus ? 'Akun dinonaktifkan' : 'Akun diaktifkan' });
        loadKaryawan();
    }
}

async function deleteKaryawan(npk, nama) {
    const res = await Swal.fire({
        title: `Hapus ${nama}?`,
        text: `Akun dengan NPK ${npk} akan dihapus permanen dan tidak bisa dipulihkan.`,
        showCancelButton: true,
        confirmButtonColor: '#EF4444',
        confirmButtonText: 'Hapus karyawan'
    });
    if (res.isConfirmed) {
        const { error } = await db.from('karyawan').delete().eq('npk', npk);
        if (error) Swal.fire('Gagal', error.message, 'error');
        else {
            Swal.fire({ icon: 'success', title: 'Karyawan dihapus' });
            loadKaryawan();
        }
    }
}

// ==========================================
// 3. HEADER KPI MODULE
// ==========================================
async function loadKpi() {
    if (!currentUser) return;
    const tbody = document.getElementById('kpiTableBody');
    tbody.innerHTML = loadingRow(9, 'Memuat data KPI…');

    let query = db.from('kpi').select('*');
    
    // Non-KAPROD only see published
    if (currentUser.role !== 'KAPROD') {
        query = query.eq('status', 'PUBLISHED');
    }

    const { data: kpis, error } = await query;
    if (error) {
        tbody.innerHTML = errorRow(9, error.message);
        return;
    }

    if (!kpis || kpis.length === 0) {
        tbody.innerHTML = emptyRow(9, currentUser.role === 'KAPROD' ? 'Belum ada KPI. Buat KPI pertama lewat tombol Buat KPI.' : 'Belum ada KPI yang diterbitkan Kaprod.', 'bi-bullseye');
        return;
    }

    // Refresh KPI cache
    kpis.forEach(k => { kpiCache[k.id_kpi] = k; });

    // Fetch PJ relations
    const { data: allPjs } = await db.from('kpi_penanggung_jawab').select('*');
    const pjMap = {};
    if (allPjs) {
        allPjs.forEach(pj => {
            if (!pjMap[pj.id_kpi]) pjMap[pj.id_kpi] = [];
            pjMap[pj.id_kpi].push(pj.npk);
        });
    }

    tbody.innerHTML = kpis.map(k => {
        const pjs = pjMap[k.id_kpi] || [];
        const pjNames = pjs.map(npk => esc(getUserName(npk))).join(', ');
        const isKaprod = currentUser.role === 'KAPROD';

        return `
            <tr>
                ${idCell(k.id_kpi)}
                <td class="cell-name">
                    <a href="#kpi" onclick="openKpiDetail(${jsArg(k.id_kpi)}); return false;" class="fw-semibold text-dark text-decoration-none">${esc(k.nama_kpi)}</a>
                </td>
                <td><span class="role-tag">${esc(k.level || '-')}</span><span class="cell-sub">${esc(k.kategori || '-')}</span></td>
                <td>${esc(k.periode || '-')}</td>
                <td>${pjNames || '<span class="text-muted">Belum ditentukan</span>'}</td>
                <td class="text-end fw-semibold">${esc(k.persentase_bobot)}%</td>
                <td>${progressCell(k.persentase_progres)}</td>
                <td>${statusTag(k.status)}</td>
                <td class="text-end">
                    <div class="row-actions">
                        ${iconBtn('bi-eye', 'Detail dan aktivitas', `openKpiDetail(${jsArg(k.id_kpi)})`)}
                        ${isKaprod && k.status === 'DRAFT' ? iconBtn('bi-send-check', 'Terbitkan KPI', `updateKpiStatus(${jsArg(k.id_kpi)}, 'PUBLISHED')`, 'primary') : ''}
                        ${isKaprod && k.status === 'PUBLISHED' ? iconBtn('bi-archive', 'Tutup KPI', `updateKpiStatus(${jsArg(k.id_kpi)}, 'CLOSED')`) : ''}
                        ${isKaprod ? iconBtn('bi-trash', 'Hapus KPI', `deleteKpi(${jsArg(k.id_kpi)}, ${jsArg(k.nama_kpi)})`, 'danger') : ''}
                    </div>
                </td>
            </tr>
        `;
    }).join('');
}

async function openKpiModal() {
    document.getElementById('formKpi').reset();
    
    // Load SEKPROD and KAUPT candidates
    const { data: candidates } = await db.from('karyawan').select('*').in('role', ['SEKPROD', 'KAUPT']).eq('status_aktif', true);
    const container = document.getElementById('pjCandidateList');
    if (candidates && candidates.length > 0) {
        container.innerHTML = candidates.map((c, i) => `
            <div class="col-md-6">
                <label class="decision-option" for="pj_${i}">
                    <input class="form-check-input" type="checkbox" name="kpiPj" value="${esc(c.npk)}" id="pj_${i}">
                    <span><strong>${esc(c.nama_karyawan)}</strong><span>${esc(roleLabel(c.role))}</span></span>
                </label>
            </div>
        `).join('');
    } else {
        container.innerHTML = `<div class="col-12 text-muted small">Belum ada akun Sekprod atau Ka. UPT yang aktif.</div>`;
    }

    const modal = new bootstrap.Modal(document.getElementById('modalKpi'));
    modal.show();
}

async function handleSaveKpi(e) {
    e.preventDefault();
    const nama = document.getElementById('kpiNama').value.trim();
    const bobot = parseFloat(document.getElementById('kpiBobot').value);
    const periode = document.getElementById('kpiPeriode').value.trim();
    const level = document.getElementById('kpiLevel').value;
    const kategori = document.getElementById('kpiKategori').value;
    const status = document.getElementById('kpiStatus').value;
    const selectedPjs = Array.from(document.querySelectorAll('input[name="kpiPj"]:checked')).map(cb => cb.value);

    const btn = document.getElementById('btnSaveKpi');
    btn.disabled = true;

    try {
        const id_kpi = generatePrefixedId('KPI');
        const { error: kpiErr } = await db.from('kpi').insert([{
            id_kpi,
            nama_kpi: nama,
            persentase_bobot: bobot,
            persentase_progres: 0,
            level,
            kategori,
            periode,
            status,
            dibuat_oleh: currentUser.npk
        }]);

        if (kpiErr) throw kpiErr;

        // Insert Penanggung Jawab relations
        if (selectedPjs.length > 0) {
            const pjRows = selectedPjs.map(npk => ({ id_kpi, npk }));
            await db.from('kpi_penanggung_jawab').insert(pjRows);
        }

        Swal.fire({ icon: 'success', title: 'KPI dibuat' });
        bootstrap.Modal.getInstance(document.getElementById('modalKpi')).hide();
        loadKpi();
    } catch (err) {
        Swal.fire('Gagal', err.message, 'error');
    } finally {
        btn.disabled = false;
    }
}

async function updateKpiStatus(idKpi, newStatus) {
    const { error } = await db.from('kpi').update({ status: newStatus }).eq('id_kpi', idKpi);
    if (error) Swal.fire('Gagal', error.message, 'error');
    else {
        Swal.fire({ icon: 'success', title: `Status KPI: ${statusLabel(newStatus)}` });
        loadKpi();
    }
}

async function deleteKpi(idKpi, nama) {
    // Check if KPI has activities
    const { count } = await db.from('detail_kpi').select('*', { count: 'exact', head: true }).eq('id_kpi', idKpi);
    if (count > 0) {
        Swal.fire('KPI belum bisa dihapus', `KPI ini masih punya ${count} aktivitas. Gunakan Tutup supaya riwayatnya tetap tersimpan.`, 'warning');
        return;
    }

    const res = await Swal.fire({
        title: 'Hapus KPI?',
        text: `"${nama}" akan dihapus permanen.`,
        showCancelButton: true,
        confirmButtonColor: '#EF4444',
        confirmButtonText: 'Hapus KPI'
    });
    if (res.isConfirmed) {
        await db.from('kpi_penanggung_jawab').delete().eq('id_kpi', idKpi);
        const { error } = await db.from('kpi').delete().eq('id_kpi', idKpi);
        if (error) Swal.fire('Gagal', error.message, 'error');
        else {
            Swal.fire({ icon: 'success', title: 'KPI dihapus' });
            loadKpi();
        }
    }
}

// ==========================================
// 4. DETAIL ACTIVITY MODULE & WEIGHT 100% TRACKER
// ==========================================
let currentKpiAvailableBobot = 100;
let currentKpiActivities = [];

async function populatePicSelect(selectedNpk = '') {
    const select = document.getElementById('actPicSelect');
    if (!select) return;

    let picUsers = Object.values(karyawanCache).filter(u => u.role === 'PIC_ACTIVITY' && (u.status_aktif !== false));
    if (picUsers.length === 0) {
        try {
            const { data } = await db.from('karyawan').select('npk, nama_karyawan, role, bagian, status_aktif').eq('role', 'PIC_ACTIVITY').eq('status_aktif', true);
            if (data) {
                data.forEach(u => { karyawanCache[u.npk] = u; });
                picUsers = data;
            }
        } catch (e) {
            console.error('Error fetching PIC list:', e);
        }
    }

    let options = `<option value="">Belum ditentukan, PIC mengambil sendiri</option>`;
    picUsers.forEach(u => {
        const isSelected = (u.npk === selectedNpk) ? 'selected' : '';
        options += `<option value="${esc(u.npk)}" ${isSelected}>${esc(u.nama_karyawan)}${u.bagian ? ', ' + esc(u.bagian) : ''}</option>`;
    });
    select.innerHTML = options;
}

async function openKpiDetail(idKpi) {
    currentSelectedKpiId = idKpi;
    switchView('detail-kpi');

    const { data: kpi } = await db.from('kpi').select('*').eq('id_kpi', idKpi).single();
    if (!kpi) return;

    document.getElementById('detailKpiId').innerText = kpi.id_kpi;
    document.getElementById('detailKpiTitle').innerText = kpi.nama_kpi;
    const statusEl = document.getElementById('detailKpiStatusBadge');
    statusEl.innerText = statusLabel(kpi.status);
    statusEl.className = 'tag tag-' + ((STATUS_INFO[kpi.status] || [])[1] || 'neutral');

    // Check if user is PJ or KAPROD
    const { data: pjs } = await db.from('kpi_penanggung_jawab').select('npk').eq('id_kpi', idKpi);
    const isPj = (pjs || []).some(p => p.npk === currentUser.npk);
    const canManage = (currentUser.role === 'KAPROD' || isPj);
    const btnContainer = document.getElementById('btnAddActivityContainer');
    if (btnContainer) {
        btnContainer.style.display = (canManage && kpi.status === 'PUBLISHED') ? 'block' : 'none';
    }

    // Load activities
    const { data: activities } = await db.from('detail_kpi').select('*').eq('id_kpi', idKpi);
    currentKpiActivities = activities || [];
    
    let totalWeightUsed = 0;
    currentKpiActivities.forEach(a => totalWeightUsed += parseFloat(a.persentase_bobot || 0));
    currentKpiAvailableBobot = Math.max(0, (100 - totalWeightUsed).toFixed(2));

    document.getElementById('kpiWeightUsed').innerText = totalWeightUsed.toFixed(2) + '%';
    document.getElementById('kpiWeightProgressBar').style.width = Math.min(100, totalWeightUsed) + '%';

    const desc = document.getElementById('kpiWeightStatusDesc');
    if (Math.abs(totalWeightUsed - 100) < 0.01) {
        desc.textContent = 'Bobot sudah lengkap 100%.';
    } else {
        desc.textContent = `Sisa bobot ${currentKpiAvailableBobot}%. Total bobot semua aktivitas harus tepat 100% sebelum KPI bisa selesai.`;
    }

    // Render table
    const tbody = document.getElementById('activityTableBody');
    if (!currentKpiActivities || currentKpiActivities.length === 0) {
        tbody.innerHTML = emptyRow(8, canManage ? 'Belum ada aktivitas. Tambahkan lewat tombol Tambah aktivitas.' : 'Belum ada aktivitas di KPI ini.', 'bi-list-check');
        return;
    }

    tbody.innerHTML = currentKpiActivities.map(a => {
        const isMyPic = (a.npk_pic && a.npk_pic === currentUser.npk);
        const canUpload = isMyPic && (a.status === 'PICKED' || a.status === 'REVISION');
        const canEditOrDelete = canManage && (a.status === 'OPEN' || a.status === 'PICKED' || a.status === 'REVISION');

        return `
        <tr>
            ${idCell(a.id_detail_kpi)}
            <td class="cell-name fw-semibold text-dark">${esc(a.nama_aktivitas_kpi)}</td>
            <td class="text-end fw-semibold">${esc(a.persentase_bobot)}%</td>
            <td>${progressCell(a.persentase_progres, { neutral: a.status !== 'DONE' })}</td>
            <td>${formatActivitySchedule(a.start_date, a.end_date, a.deadline)}</td>
            <td>${a.npk_pic ? esc(getUserName(a.npk_pic)) : '<span class="text-muted">Belum ada</span>'}</td>
            <td>${statusTag(a.status)}</td>
            <td class="text-end">
                <div class="row-actions">
                    ${canUpload ? `<button class="btn btn-sm btn-primary" onclick="openUploadModal(${jsArg(a.id_detail_kpi)}, ${jsArg(a.nama_aktivitas_kpi)})"><i class="bi bi-cloud-arrow-up me-1" aria-hidden="true"></i>Unggah</button>` : ''}
                    ${canEditOrDelete ? iconBtn('bi-pencil', 'Ubah aktivitas', `openEditActivityModal(${jsArg(a.id_detail_kpi)})`) : ''}
                    ${canEditOrDelete ? iconBtn('bi-trash', 'Hapus aktivitas', `deleteActivity(${jsArg(a.id_detail_kpi)}, ${jsArg(a.nama_aktivitas_kpi)})`, 'danger') : ''}
                    ${(!canUpload && !canEditOrDelete) ? '<span class="text-muted">-</span>' : ''}
                </div>
            </td>
        </tr>
    `}).join('');
}

async function openActivityModal() {
    const form = document.getElementById('formActivity');
    if (form) form.reset();

    const titleEl = document.getElementById('modalActivityTitle');
    if (titleEl) titleEl.innerText = 'Tambah aktivitas';

    const editIdEl = document.getElementById('actEditId');
    if (editIdEl) editIdEl.value = '';

    const kpiTitle = document.getElementById('detailKpiTitle') ? document.getElementById('detailKpiTitle').innerText : '-';
    const kpiTitleEl = document.getElementById('modalActivityKpiTitle');
    if (kpiTitleEl) kpiTitleEl.innerText = 'KPI: ' + kpiTitle;

    const kpiIdEl = document.getElementById('actKpiId');
    if (kpiIdEl) kpiIdEl.value = currentSelectedKpiId;

    const sisaBobotEl = document.getElementById('actSisaBobot');
    if (sisaBobotEl) sisaBobotEl.innerText = currentKpiAvailableBobot + '%';

    const bobotInput = document.getElementById('actBobot');
    if (bobotInput) {
        bobotInput.max = currentKpiAvailableBobot;
        bobotInput.placeholder = 'Maksimal ' + currentKpiAvailableBobot;
        bobotInput.value = '';
    }

    const btn = document.getElementById('btnSaveActivity');
    if (btn) btn.textContent = 'Simpan aktivitas';

    await populatePicSelect('');

    const modal = new bootstrap.Modal(document.getElementById('modalActivity'));
    modal.show();
}

async function openEditActivityModal(idDetailKpi) {
    const form = document.getElementById('formActivity');
    if (form) form.reset();

    let act = currentKpiActivities.find(a => a.id_detail_kpi === idDetailKpi);
    if (!act) {
        const { data, error } = await db.from('detail_kpi').select('*').eq('id_detail_kpi', idDetailKpi).single();
        if (error || !data) {
            Swal.fire('Gagal', 'Data aktivitas tidak ditemukan.', 'error');
            return;
        }
        act = data;
    }

    const titleEl = document.getElementById('modalActivityTitle');
    if (titleEl) titleEl.innerText = 'Ubah aktivitas';

    const editIdEl = document.getElementById('actEditId');
    if (editIdEl) editIdEl.value = act.id_detail_kpi;

    const kpiTitle = document.getElementById('detailKpiTitle') ? document.getElementById('detailKpiTitle').innerText : '-';
    const kpiTitleEl = document.getElementById('modalActivityKpiTitle');
    if (kpiTitleEl) kpiTitleEl.innerText = 'KPI: ' + kpiTitle + ' (' + act.id_detail_kpi + ')';

    const kpiIdEl = document.getElementById('actKpiId');
    if (kpiIdEl) kpiIdEl.value = act.id_kpi;

    // Available bobot for this edit: remaining pool + this activity's current weight
    const currentActBobot = parseFloat(act.persentase_bobot || 0);
    const maxAllowedBobot = (parseFloat(currentKpiAvailableBobot) + currentActBobot).toFixed(2);

    const sisaBobotEl = document.getElementById('actSisaBobot');
    if (sisaBobotEl) sisaBobotEl.innerText = maxAllowedBobot + '% (sisa ' + currentKpiAvailableBobot + '% ditambah bobot aktivitas ini ' + currentActBobot + '%)';

    document.getElementById('actNama').value = act.nama_aktivitas_kpi || '';

    const bobotInput = document.getElementById('actBobot');
    if (bobotInput) {
        bobotInput.max = maxAllowedBobot;
        bobotInput.placeholder = 'Maksimal ' + maxAllowedBobot;
        bobotInput.value = currentActBobot;
    }

    document.getElementById('actStartDate').value = act.start_date || '';
    document.getElementById('actEndDate').value = act.end_date || act.deadline || '';

    const btn = document.getElementById('btnSaveActivity');
    if (btn) btn.textContent = 'Simpan perubahan';

    await populatePicSelect(act.npk_pic || '');

    const modal = new bootstrap.Modal(document.getElementById('modalActivity'));
    modal.show();
}

async function handleSaveActivity(e) {
    e.preventDefault();
    const editId = document.getElementById('actEditId').value;
    const nama = document.getElementById('actNama').value.trim();
    const bobot = parseFloat(document.getElementById('actBobot').value);
    const startDate = document.getElementById('actStartDate').value || null;
    const endDate = document.getElementById('actEndDate').value;
    const selectedPic = document.getElementById('actPicSelect').value || null;

    if (!nama) {
        Swal.fire('Data belum lengkap', 'Nama aktivitas kegiatan wajib diisi.', 'warning');
        return;
    }

    if (isNaN(bobot) || bobot <= 0) {
        Swal.fire('Data belum lengkap', 'Persentase bobot harus lebih besar dari 0%.', 'warning');
        return;
    }

    if (!endDate) {
        Swal.fire('Data belum lengkap', 'Tanggal selesai (End Date) wajib diisi.', 'warning');
        return;
    }

    if (startDate && endDate && startDate > endDate) {
        Swal.fire('Tanggal belum sesuai', 'Tanggal mulai tidak boleh melebihi tanggal selesai.', 'warning');
        return;
    }

    const btn = document.getElementById('btnSaveActivity');
    btn.disabled = true;
    btn.innerHTML = '<span class="spinner-border spinner-border-sm me-1" aria-hidden="true"></span> Menyimpan…';

    try {
        if (editId) {
            // EDIT MODE
            const existingAct = currentKpiActivities.find(a => a.id_detail_kpi === editId);
            const currentActBobot = existingAct ? parseFloat(existingAct.persentase_bobot || 0) : 0;
            const maxAllowedBobot = parseFloat(currentKpiAvailableBobot) + currentActBobot;

            if (bobot > (maxAllowedBobot + 0.001)) {
                Swal.fire('Bobot melebihi sisa', `Bobot yang dimasukkan (${bobot}%) melebihi sisa alokasi maksimal (${maxAllowedBobot.toFixed(2)}%). Total bobot seluruh aktivitas dalam 1 KPI tidak boleh melebihi 100%.`, 'error');
                btn.disabled = false;
                btn.textContent = 'Simpan perubahan';
                return;
            }

            // Status transition logic based on PIC assignment
            let updatedStatus = existingAct ? existingAct.status : 'OPEN';
            if (selectedPic) {
                // If previously OPEN, assigning a PIC turns it to PICKED
                if (updatedStatus === 'OPEN') {
                    updatedStatus = 'PICKED';
                }
            } else {
                // If PIC is cleared and status was PICKED, revert to OPEN
                if (updatedStatus === 'PICKED') {
                    updatedStatus = 'OPEN';
                }
            }

            const { error } = await db.from('detail_kpi').update({
                nama_aktivitas_kpi: nama,
                persentase_bobot: bobot,
                start_date: startDate,
                end_date: endDate,
                npk_pic: selectedPic,
                status: updatedStatus
            }).eq('id_detail_kpi', editId);

            if (error) throw error;

            Swal.fire({ icon: 'success', title: 'Perubahan aktivitas disimpan' });
        } else {
            // CREATE MODE
            if (bobot > (parseFloat(currentKpiAvailableBobot) + 0.001)) {
                Swal.fire('Bobot melebihi sisa', `Bobot yang dimasukkan (${bobot}%) melebihi sisa alokasi bobot (${currentKpiAvailableBobot}%). Total seluruh aktivitas dalam 1 KPI wajib berjumlah tepat 100%.`, 'error');
                btn.disabled = false;
                btn.textContent = 'Simpan aktivitas';
                return;
            }

            const id_detail_kpi = generatePrefixedId('DKP');
            const initialStatus = selectedPic ? 'PICKED' : 'OPEN';

            const { error } = await db.from('detail_kpi').insert([{
                id_detail_kpi,
                id_kpi: currentSelectedKpiId,
                dibuat_oleh: currentUser.npk,
                nama_aktivitas_kpi: nama,
                persentase_bobot: bobot,
                persentase_progres: 0,
                start_date: startDate,
                end_date: endDate,
                npk_pic: selectedPic,
                status: initialStatus
            }]);

            if (error) throw error;

            const picName = selectedPic ? getUserName(selectedPic) : null;
            Swal.fire({
                icon: 'success',
                title: selectedPic ? `Aktivitas ditugaskan ke ${picName}` : 'Aktivitas ditambahkan, menunggu PIC'
            });
        }

        const modalEl = document.getElementById('modalActivity');
        const modalInst = bootstrap.Modal.getInstance(modalEl);
        if (modalInst) modalInst.hide();
        openKpiDetail(currentSelectedKpiId);
    } catch (err) {
        Swal.fire('Gagal', err.message, 'error');
    } finally {
        btn.disabled = false;
        btn.textContent = editId ? 'Simpan perubahan' : 'Simpan aktivitas';
    }
}

async function deleteActivity(idDetailKpi, nama) {
    const res = await Swal.fire({
        title: 'Hapus aktivitas?',
        text: `"${nama}" akan dihapus permanen.`,
        showCancelButton: true,
        confirmButtonColor: '#EF4444',
        confirmButtonText: 'Hapus aktivitas'
    });
    if (res.isConfirmed) {
        const { error } = await db.from('detail_kpi').delete().eq('id_detail_kpi', idDetailKpi);
        if (error) Swal.fire('Gagal', error.message, 'error');
        else {
            Swal.fire({ icon: 'success', title: 'Aktivitas dihapus' });
            openKpiDetail(currentSelectedKpiId);
        }
    }
}

// ==========================================
// 5. PICK ACTIVITY (PIC)
// ==========================================
async function loadPickList() {
    if (!currentUser) return;
    const tbody = document.getElementById('pickTableBody');
    tbody.innerHTML = loadingRow(7, 'Memuat aktivitas…');

    const { data: acts, error } = await db.from('detail_kpi')
        .select('*')
        .eq('status', 'OPEN');

    if (error) {
        tbody.innerHTML = errorRow(7, error.message);
        return;
    }

    if (!acts || acts.length === 0) {
        tbody.innerHTML = emptyRow(7, 'Semua aktivitas sudah punya PIC. Aktivitas baru akan muncul di sini.');
        return;
    }

    tbody.innerHTML = acts.map(a => `
        <tr>
            ${idCell(a.id_detail_kpi)}
            <td>${esc(getKpiName(a.id_kpi))}<span class="cell-sub id-code">${esc(a.id_kpi)}</span></td>
            <td class="cell-name fw-semibold text-dark">${esc(a.nama_aktivitas_kpi)}</td>
            <td class="text-end fw-semibold">${esc(a.persentase_bobot)}%</td>
            <td>${formatActivitySchedule(a.start_date, a.end_date, a.deadline)}</td>
            <td>${esc(getUserName(a.dibuat_oleh))}</td>
            <td class="text-end">
                <button class="btn btn-primary btn-sm" onclick="pickActivityDirect(${jsArg(a.id_detail_kpi)}, ${jsArg(a.nama_aktivitas_kpi)})"><i class="bi bi-hand-index me-1" aria-hidden="true"></i>Ambil aktivitas</button>
            </td>
        </tr>
    `).join('');
}

async function pickActivityDirect(idDetailKpi, nama) {
    const res = await Swal.fire({
        title: 'Ambil aktivitas ini?',
        text: `Anda akan menjadi PIC untuk "${nama}" dan bertanggung jawab mengunggah progresnya.`,
        showCancelButton: true,
        confirmButtonText: 'Ambil aktivitas'
    });

    if (res.isConfirmed) {
        const { error } = await db.from('detail_kpi')
            .update({ npk_pic: currentUser.npk, status: 'PICKED' })
            .eq('id_detail_kpi', idDetailKpi);

        if (error) {
            Swal.fire('Gagal', error.message, 'error');
        } else {
            Swal.fire({ icon: 'success', title: 'Aktivitas masuk ke Aktivitas saya' });
            switchView('my-activities');
        }
    }
}

// ==========================================
// 6. MY ACTIVITIES & UPLOAD PROGRESS (PIC)
// ==========================================
async function loadMyActivities() {
    if (!currentUser) return;
    const tbody = document.getElementById('myActivitiesTableBody');
    tbody.innerHTML = loadingRow(8, 'Memuat aktivitas Anda…');

    const { data: acts, error } = await db.from('detail_kpi')
        .select('*')
        .eq('npk_pic', currentUser.npk);

    if (error) {
        tbody.innerHTML = errorRow(8, error.message);
        return;
    }

    if (!acts || acts.length === 0) {
        tbody.innerHTML = emptyRow(8, 'Anda belum memegang aktivitas. Ambil aktivitas lewat menu Ambil aktivitas.');
        return;
    }

    tbody.innerHTML = acts.map(a => `
        <tr>
            ${idCell(a.id_detail_kpi)}
            <td>${esc(getKpiName(a.id_kpi))}<span class="cell-sub id-code">${esc(a.id_kpi)}</span></td>
            <td class="cell-name fw-semibold text-dark">${esc(a.nama_aktivitas_kpi)}</td>
            <td class="text-end fw-semibold">${esc(a.persentase_bobot)}%</td>
            <td>${progressCell(a.persentase_progres, { neutral: a.status !== 'DONE' })}</td>
            <td>${formatActivitySchedule(a.start_date, a.end_date, a.deadline)}</td>
            <td>${statusTag(a.status)}</td>
            <td class="text-end">
                ${(a.status === 'PICKED' || a.status === 'REVISION')
                    ? `<button class="btn btn-primary btn-sm" onclick="openUploadModal(${jsArg(a.id_detail_kpi)}, ${jsArg(a.nama_aktivitas_kpi)})"><i class="bi bi-cloud-arrow-up me-1" aria-hidden="true"></i>Unggah progres</button>`
                    : '<span class="small text-muted">Menunggu review</span>'}
            </td>
        </tr>
    `).join('');
}

async function openUploadModal(idDetailKpi, nama) {
    if (!currentUser) return;

    // Strict validation: check that current user is the assigned PIC
    let act = currentKpiActivities.find(x => x.id_detail_kpi === idDetailKpi);
    if (!act) {
        const { data } = await db.from('detail_kpi').select('*').eq('id_detail_kpi', idDetailKpi).single();
        act = data;
    }

    if (!act) {
        Swal.fire('Gagal', 'Data detail aktivitas tidak ditemukan.', 'error');
        return;
    }

    if (act.npk_pic !== currentUser.npk) {
        Swal.fire('Bukan aktivitas Anda', `Hanya PIC aktivitas ini (${getUserName(act.npk_pic)}) yang bisa mengunggah progres.`, 'error');
        return;
    }

    const form = document.getElementById('formUpload');
    if (form) form.reset();

    document.getElementById('uploadDetailId').value = idDetailKpi;
    document.getElementById('uploadActTitle').innerText = act.nama_aktivitas_kpi || nama;
    document.getElementById('uploadProgres').value = (act.persentase_progres !== undefined && act.persentase_progres > 0) ? act.persentase_progres : '100.00';

    const modal = new bootstrap.Modal(document.getElementById('modalUpload'));
    modal.show();
}

async function handleSubmitUpload(e) {
    e.preventDefault();
    const id_detail_kpi = document.getElementById('uploadDetailId')?.value;
    const progresEl = document.getElementById('uploadProgres');
    const catatanEl = document.getElementById('uploadCatatan');
    const persentase = progresEl ? parseFloat(progresEl.value) : NaN;
    const catatan = catatanEl ? catatanEl.value.trim() : '';
    
    // Support dual inputs (new) or single input fallback (old cached HTML)
    const planFileInput = document.getElementById('uploadPlanFile') || document.getElementById('uploadFile');
    const buktiFileInput = document.getElementById('uploadBuktiFile');

    if (isNaN(persentase) || persentase < 0 || persentase > 100) {
        Swal.fire('Progres belum valid', 'Isi progres dengan angka 0 sampai 100.', 'warning');
        return;
    }

    if (!planFileInput || !planFileInput.files || planFileInput.files.length === 0) {
        Swal.fire('Berkas belum dipilih', 'Pilih berkas rencana aktivitas.', 'warning');
        return;
    }

    if (buktiFileInput && (!buktiFileInput.files || buktiFileInput.files.length === 0)) {
        Swal.fire('Berkas belum dipilih', 'Pilih berkas bukti progres.', 'warning');
        return;
    }

    const planFile = planFileInput.files[0];
    const buktiFile = (buktiFileInput && buktiFileInput.files.length > 0) ? buktiFileInput.files[0] : planFile;
    const maxSizeBytes = 5 * 1024 * 1024;

    if (planFile.size > maxSizeBytes || buktiFile.size > maxSizeBytes) {
        Swal.fire('Berkas terlalu besar', 'Ukuran tiap berkas maksimal 5 MB.', 'warning');
        return;
    }

    const btn = document.getElementById('btnSubmitUpload');
    btn.disabled = true;
    btn.innerHTML = '<span class="spinner-border spinner-border-sm me-1" aria-hidden="true"></span> Mengunggah…';

    try {
        const readFileData = (f) => new Promise((resolve, reject) => {
            const r = new FileReader();
            r.onload = (evt) => resolve(evt.target.result);
            r.onerror = (err) => reject(err);
            r.readAsDataURL(f);
        });

        const [planDataUrl, buktiDataUrl] = await Promise.all([
            readFileData(planFile),
            readFileData(buktiFile)
        ]);

        const id_upload = generatePrefixedId('UPL');
        const compositePath = JSON.stringify({
            plan_name: planFile.name,
            plan_data: planDataUrl,
            bukti_name: buktiFile.name,
            bukti_data: buktiDataUrl
        });

        // Insert upload record
        const combinedName = `${planFile.name} & ${buktiFile.name}`;
        const { error: uplErr } = await db.from('upload_file').insert([{
            id_upload,
            id_detail_kpi,
            nama_file: combinedName.length > 100 ? combinedName.substring(0, 97) + '...' : combinedName,
            path: compositePath,
            persentase_progres: persentase,
            catatan: catatan,
            tanggal_upload: new Date().toISOString()
        }]);

        if (uplErr) throw uplErr;

        // Update detail_kpi status to SUBMITTED and record submitted progress
        const { error: actErr } = await db.from('detail_kpi').update({
            persentase_progres: persentase,
            status: 'SUBMITTED'
        }).eq('id_detail_kpi', id_detail_kpi);

        if (actErr) throw actErr;

        Swal.fire({ icon: 'success', title: `Progres ${persentase}% diajukan ke level 1` });

        const modalInst = bootstrap.Modal.getInstance(document.getElementById('modalUpload'));
        if (modalInst) modalInst.hide();

        if (currentSelectedKpiId) {
            openKpiDetail(currentSelectedKpiId);
        }
        loadMyActivities();
        loadDashboard();
    } catch (err) {
        Swal.fire('Unggahan gagal', err.message, 'error');
    } finally {
        btn.disabled = false;
        btn.textContent = 'Ajukan progres';
    }
}

// ==========================================
// 7. APPROVAL LEVEL 1 & FINAL (AUTOMATIC KPI CALCULATION)
// ==========================================
async function loadApprovalL1() {
    if (!currentUser) return;
    const tbody = document.getElementById('approvalL1TableBody');
    tbody.innerHTML = loadingRow(8, 'Memuat antrean…');

    const { data: acts, error } = await db.from('detail_kpi')
        .select('*')
        .eq('status', 'SUBMITTED');

    if (error) {
        tbody.innerHTML = errorRow(8, error.message);
        return;
    }

    if (!acts || acts.length === 0) {
        tbody.innerHTML = emptyRow(8, 'Tidak ada progres yang menunggu verifikasi level 1.', 'bi-shield-check');
        return;
    }

    tbody.innerHTML = acts.map(a => `
        <tr>
            ${idCell(a.id_detail_kpi)}
            <td>${esc(getKpiName(a.id_kpi))}</td>
            <td class="cell-name fw-semibold text-dark">${esc(a.nama_aktivitas_kpi)}</td>
            <td>${esc(getUserName(a.npk_pic))}</td>
            <td><span class="tag tag-neutral">${esc(a.persentase_progres ?? 0)}%</span></td>
            <td>${formatActivitySchedule(a.start_date, a.end_date, a.deadline)}</td>
            <td>${statusTag(a.status)}</td>
            <td class="text-end">
                <button class="btn btn-primary btn-sm" onclick="openReviewModal(${jsArg(a.id_detail_kpi)}, 'L1')"><i class="bi bi-search me-1" aria-hidden="true"></i>Tinjau dan verifikasi</button>
            </td>
        </tr>
    `).join('');
}

async function loadApprovalFinal() {
    if (!currentUser) return;
    const tbody = document.getElementById('approvalFinalTableBody');
    tbody.innerHTML = loadingRow(8, 'Memuat antrean…');

    const { data: acts, error } = await db.from('detail_kpi')
        .select('*')
        .eq('status', 'APPROVED_L1');

    if (error) {
        tbody.innerHTML = errorRow(8, error.message);
        return;
    }

    if (!acts || acts.length === 0) {
        tbody.innerHTML = emptyRow(8, 'Tidak ada aktivitas yang menunggu pengesahan final.', 'bi-patch-check');
        return;
    }

    tbody.innerHTML = acts.map(a => `
        <tr>
            ${idCell(a.id_detail_kpi)}
            <td>${esc(getKpiName(a.id_kpi))}</td>
            <td class="cell-name fw-semibold text-dark">${esc(a.nama_aktivitas_kpi)}</td>
            <td>${esc(getUserName(a.npk_pic))}</td>
            <td><span class="tag tag-neutral">${esc(a.persentase_progres ?? 0)}%</span></td>
            <td class="text-end fw-semibold">${esc(a.persentase_bobot)}%</td>
            <td>${statusTag(a.status)}</td>
            <td class="text-end">
                <button class="btn btn-primary btn-sm" onclick="openReviewModal(${jsArg(a.id_detail_kpi)}, 'FINAL')"><i class="bi bi-patch-check me-1" aria-hidden="true"></i>Sahkan</button>
            </td>
        </tr>
    `).join('');
}

let latestUploadForReview = null;
let currentReviewActivity = null;

async function openReviewModal(idDetailKpi, level) {
    document.getElementById('formReview').reset();
    document.getElementById('reviewDetailId').value = idDetailKpi;
    document.getElementById('reviewLevel').value = level;
    document.getElementById('reviewModalTitle').innerText = level === 'L1' ? 'Verifikasi level 1' : 'Pengesahan final';

    const { data: act } = await db.from('detail_kpi').select('*').eq('id_detail_kpi', idDetailKpi).single();
    if (!act) return;
    currentReviewActivity = act;

    document.getElementById('reviewKpiInfo').innerText = getKpiName(act.id_kpi);
    document.getElementById('reviewActTitle').innerText = act.nama_aktivitas_kpi;
    document.getElementById('reviewPicName').innerText = getUserName(act.npk_pic);
    document.getElementById('reviewBobot').innerText = act.persentase_bobot + '%';

    // Fetch latest upload file
    const { data: uploads } = await db.from('upload_file').select('*').eq('id_detail_kpi', idDetailKpi).order('tanggal_upload', { ascending: false }).limit(1);
    if (uploads && uploads.length > 0) {
        latestUploadForReview = uploads[0];
        document.getElementById('reviewProgres').innerText = latestUploadForReview.persentase_progres + '%';
        document.getElementById('reviewCatatanPic').innerText = latestUploadForReview.catatan || 'Tidak ada catatan.';

        let planName = '-';
        let planUrl = '#';
        let buktiName = latestUploadForReview.nama_file;
        let buktiUrl = latestUploadForReview.path;

        try {
            const parsed = JSON.parse(latestUploadForReview.path);
            if (parsed.plan_data && parsed.bukti_data) {
                planName = parsed.plan_name;
                planUrl = parsed.plan_data;
                buktiName = parsed.bukti_name;
                buktiUrl = parsed.bukti_data;
            }
        } catch (e) {
            // legacy single file fallback
        }

        const planNameEl = document.getElementById('reviewPlanFileName');
        const planDlBtn = document.getElementById('reviewPlanDownload');
        if (planNameEl && planDlBtn) {
            planNameEl.innerText = planName;
            planUrl = safeFileHref(planUrl);
            if (planUrl) {
                planDlBtn.href = planUrl;
                planDlBtn.setAttribute('download', planName);
                planDlBtn.classList.remove('d-none');
            } else {
                planDlBtn.classList.add('d-none');
            }
        }

        const buktiNameEl = document.getElementById('reviewBuktiFileName');
        const buktiDlBtn = document.getElementById('reviewBuktiDownload');
        if (buktiNameEl && buktiDlBtn) {
            buktiNameEl.innerText = buktiName;
            buktiUrl = safeFileHref(buktiUrl);
            if (buktiUrl) {
                buktiDlBtn.href = buktiUrl;
                buktiDlBtn.setAttribute('download', buktiName);
                buktiDlBtn.classList.remove('d-none');
            } else {
                buktiDlBtn.classList.add('d-none');
            }
        }
    } else {
        document.getElementById('reviewProgres').innerText = '0%';
        document.getElementById('reviewCatatanPic').innerText = '-';
        const pName = document.getElementById('reviewPlanFileName');
        if (pName) pName.innerText = 'Tidak ada berkas.';
        const bName = document.getElementById('reviewBuktiFileName');
        if (bName) bName.innerText = 'Tidak ada berkas.';
        const pBtn = document.getElementById('reviewPlanDownload');
        if (pBtn) pBtn.classList.add('d-none');
        const bBtn = document.getElementById('reviewBuktiDownload');
        if (bBtn) bBtn.classList.add('d-none');
    }

    const modal = new bootstrap.Modal(document.getElementById('modalReview'));
    modal.show();
}

async function handleSubmitReview(e) {
    e.preventDefault();
    const id_detail_kpi = document.getElementById('reviewDetailId').value;
    const level = document.getElementById('reviewLevel').value;
    const action = document.querySelector('input[name="reviewAction"]:checked').value;
    const catatan = document.getElementById('reviewCatatan').value.trim();

    if (action === 'REJECT' && !catatan) {
        Swal.fire('Catatan belum diisi', 'Tulis bagian yang perlu direvisi supaya PIC tahu apa yang harus diperbaiki.', 'warning');
        return;
    }

    const btn = document.getElementById('btnSubmitDecision');
    btn.disabled = true;

    try {
        let newStatus = '';
        if (action === 'APPROVE') {
            newStatus = (level === 'L1') ? 'APPROVED_L1' : 'DONE';
        } else {
            newStatus = 'REVISION';
        }

        // 1. Update Detail KPI status
        const updatePayload = { status: newStatus };
        if (newStatus === 'DONE' && latestUploadForReview) {
            updatePayload.persentase_progres = latestUploadForReview.persentase_progres;
        }

        const { error: actErr } = await db.from('detail_kpi').update(updatePayload).eq('id_detail_kpi', id_detail_kpi);
        if (actErr) throw actErr;

        // 2. Insert into approval_log table
        await db.from('approval_log').insert([{
            id_detail_kpi,
            npk: currentUser.npk,
            level,
            aksi: action,
            catatan,
            tanggal: new Date().toISOString()
        }]);

        // 3. AUTO CALCULATION IF DONE:
        // Progres KPI = SUM(bobot * progres) / 100 for all activities with status DONE!
        if (newStatus === 'DONE' && currentReviewActivity) {
            const kpiId = currentReviewActivity.id_kpi;
            const { data: allActs } = await db.from('detail_kpi').select('id_detail_kpi, persentase_bobot, persentase_progres, status').eq('id_kpi', kpiId);
            
            if (allActs) {
                let totalKpiScore = 0;
                allActs.forEach(item => {
                    const statusToCheck = (item.id_detail_kpi === id_detail_kpi) ? 'DONE' : item.status;
                    const progresToCheck = (item.id_detail_kpi === id_detail_kpi && latestUploadForReview) ? latestUploadForReview.persentase_progres : item.persentase_progres;
                    
                    if (statusToCheck === 'DONE') {
                        totalKpiScore += (parseFloat(item.persentase_bobot || 0) * parseFloat(progresToCheck || 0));
                    }
                });
                const finalKpiProgress = (totalKpiScore / 100).toFixed(2);
                await db.from('kpi').update({ persentase_progres: finalKpiProgress }).eq('id_kpi', kpiId);
            }
        }

        Swal.fire({ icon: 'success', title: action === 'APPROVE' ? (level === 'L1' ? 'Diteruskan ke pengesahan final' : 'Aktivitas disahkan') : 'Dikembalikan ke PIC untuk revisi' });
        bootstrap.Modal.getInstance(document.getElementById('modalReview')).hide();
        
        if (level === 'L1') loadApprovalL1();
        else loadApprovalFinal();

    } catch (err) {
        Swal.fire('Gagal', err.message, 'error');
    } finally {
        btn.disabled = false;
    }
}

// 8. Attach all functions to window for onclick handlers
window.switchView = switchView;
window.openKpiDetail = openKpiDetail;
window.logout = logout;
window.openKaryawanModal = openKaryawanModal;
window.openKpiModal = openKpiModal;
window.openActivityModal = openActivityModal;
window.openEditActivityModal = openEditActivityModal;
window.openUploadModal = openUploadModal;
window.openReviewModal = openReviewModal;
window.pickActivityDirect = pickActivityDirect;
window.toggleKaryawan = toggleKaryawan;
window.deleteKaryawan = deleteKaryawan;
window.updateKpiStatus = updateKpiStatus;
window.deleteKpi = deleteKpi;
window.deleteActivity = deleteActivity;
window.loadDashboard = loadDashboard;
window.loadKaryawan = loadKaryawan;
window.loadKpi = loadKpi;
window.loadPickList = loadPickList;
window.loadMyActivities = loadMyActivities;
window.loadApprovalL1 = loadApprovalL1;
window.loadApprovalFinal = loadApprovalFinal;
window.changeGanttMonth = changeGanttMonth;
window.resetGanttToCurrentMonth = resetGanttToCurrentMonth;
window.renderGanttChart = renderGanttChart;
window.closeSidebar = closeSidebar;

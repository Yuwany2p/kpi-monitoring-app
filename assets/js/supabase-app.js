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
    const stored = localStorage.getItem('kpi_user');
    if (stored) {
        currentUser = JSON.parse(stored);
    }
} catch (e) {
    currentUser = null;
}

if (!currentUser || !currentUser.npk || !currentUser.role) {
    localStorage.removeItem('kpi_user');
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
        return '<div class="d-flex flex-column"><span class="small text-muted" style="font-size: 0.72rem;">Mulai: ' + startDate + '</span><span class="small fw-bold text-dark">Selesai: ' + end + '</span></div>';
    }
    if (end) {
        return '<span class="small fw-bold text-dark">' + end + '</span>';
    }
    return '<span class="text-muted small">-</span>';
}

function getKpiName(idKpi) {
    if (!idKpi) return '-';
    return kpiCache[idKpi] ? kpiCache[idKpi].nama_kpi : idKpi;
}

// 3. Initialize on Document Ready
document.addEventListener('DOMContentLoaded', async function() {
    if (!currentUser) return;

    setupUserInterface();
    await refreshLookupCaches();
    switchView('dashboard');

    // Dynamic Network Connectivity Monitor
    function updateNetworkStatus(isOnline) {
        const badge = document.getElementById('networkStatusBadge');
        const dot = document.getElementById('networkStatusDot');
        const text = document.getElementById('networkStatusText');
        const bellDot = document.getElementById('bellStatusDot');
        const detail = document.getElementById('networkStatusDetail');

        if (isOnline) {
            if (badge) {
                badge.style.backgroundColor = '#F0FDF4';
                badge.style.borderColor = '#BBF7D0';
                badge.style.color = '#166534';
            }
            if (dot) dot.className = 'status-pulse-dot';
            if (text) text.innerText = 'Online';
            if (bellDot) {
                bellDot.className = 'position-absolute top-0 start-100 translate-middle p-1 bg-success border border-light rounded-circle';
            }
            if (detail) {
                detail.innerHTML = '<i class="bi bi-check-circle-fill text-success me-1"></i> Terhubung ke Jaringan (Online)';
            }
        } else {
            if (badge) {
                badge.style.backgroundColor = '#FEF2F2';
                badge.style.borderColor = '#FECACA';
                badge.style.color = '#991B1B';
            }
            if (dot) dot.className = 'status-pulse-dot-red';
            if (text) text.innerText = 'Offline';
            if (bellDot) {
                bellDot.className = 'position-absolute top-0 start-100 translate-middle p-1 bg-danger border border-light rounded-circle';
            }
            if (detail) {
                detail.innerHTML = '<i class="bi bi-x-circle-fill text-danger me-1"></i> Terputus dari Jaringan (Offline)';
            }
        }
    }

    updateNetworkStatus(navigator.onLine);
    window.addEventListener('online', () => updateNetworkStatus(true));
    window.addEventListener('offline', () => updateNetworkStatus(false));

    // Periodic ping to verify real network connectivity
    setInterval(async () => {
        if (!navigator.onLine) {
            updateNetworkStatus(false);
            return;
        }
        // Chromium blocks fetch under file:// with origin 'null' CORS error
        if (window.location.protocol === 'file:') {
            updateNetworkStatus(navigator.onLine);
            return;
        }
        try {
            const res = await fetch('assets/images/favicon.ico?_ping=' + Date.now(), { method: 'HEAD', cache: 'no-store' });
            updateNetworkStatus(res.ok);
        } catch (e) {
            updateNetworkStatus(false);
        }
    }, 10000);

    // Sidebar Mobile Toggle
    const sidebarToggle = document.getElementById('sidebar-toggle');
    if (sidebarToggle) {
        sidebarToggle.addEventListener('click', function() {
            document.getElementById('sidebar').classList.toggle('show');
        });
    }

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
    setElemText('userRole', currentUser.role);
    setElemText('userRoleTop', currentUser.role);
    setElemText('userRoleDropdown', currentUser.role);
    setElemText('dashUserName', currentUser.nama_karyawan);
    setElemText('dashUserRole', currentUser.role);
    setElemText('userBagian', currentUser.bagian || 'Program Studi');

    // Live Date in Header
    const dateEl = document.getElementById('headerLiveDate');
    if (dateEl) {
        try {
            const now = new Date();
            const dateStr = now.toLocaleDateString('id-ID', { weekday: 'long', day: 'numeric', month: 'short', year: 'numeric' });
            dateEl.innerText = dateStr;
        } catch (e) {
            dateEl.innerText = 'Sistem Manajemen KPI';
        }
    }

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

    const targetNav = document.getElementById('nav-' + viewName);
    if (targetNav) targetNav.classList.add('active');

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
        title: 'Keluar dari Sistem?',
        text: 'Sesi Anda saat ini akan diakhiri.',
        icon: 'question',
        showCancelButton: true,
        confirmButtonColor: '#EF4444',
        cancelButtonColor: '#64748B',
        confirmButtonText: 'Ya, Keluar',
        cancelButtonText: 'Batal'
    }).then(res => {
        if (res.isConfirmed) {
            localStorage.removeItem('kpi_user');
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

        const elTotalKpi = document.getElementById('statTotalKpi');
        if (elTotalKpi) elTotalKpi.innerText = totalKpis;

        const elTotalActs = document.getElementById('statTotalActivities');
        if (elTotalActs) elTotalActs.innerText = totalActs;

        const elPending = document.getElementById('statPendingApproval');
        if (elPending) elPending.innerText = pendingApproval;

        const elDone = document.getElementById('statDone');
        if (elDone) elDone.innerText = countDone;

        // Check Overdue
        const todayStr = new Date().toISOString().split('T')[0];
        const overdueActs = activities ? activities.filter(a => { const due = a.end_date || a.deadline; return a.status !== 'DONE' && due && due < todayStr; }) : [];
        const alertBox = document.getElementById('overdueAlert');
        if (alertBox) {
            if (overdueActs.length > 0) {
                alertBox.classList.remove('d-none');
                alertBox.classList.add('d-flex');
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
                tbody.innerHTML = `<tr><td colspan="5" class="text-center py-4 text-muted">Belum ada data KPI di database.</td></tr>`;
            } else {
                tbody.innerHTML = kpis.map(k => `
                    <tr>
                        <td>
                            <a href="javascript:void(0)" onclick="openKpiDetail('${k.id_kpi}')" class="fw-bold text-dark text-decoration-none">${k.nama_kpi}</a>
                            <div class="small text-muted">Level: ${k.level || '-'} | Kat: ${k.kategori || '-'}</div>
                        </td>
                        <td class="small">${k.periode || '-'}</td>
                        <td><span class="badge ${k.status === 'PUBLISHED' ? 'bg-success' : (k.status === 'DRAFT' ? 'bg-secondary' : 'bg-dark')}">${k.status}</span></td>
                        <td>
                            <div class="d-flex align-items-center gap-2">
                                <div class="progress flex-grow-1 progress-compact">
                                    <div class="progress-bar" style="width: ${k.persentase_progres}%; background-color: ${k.persentase_progres >= 80 ? '#22C55E' : (k.persentase_progres >= 50 ? '#F59E0B' : '#EF4444')}"></div>
                                </div>
                                <span class="small fw-bold">${k.persentase_progres}%</span>
                            </div>
                        </td>
                        <td class="text-end">
                            <button class="btn btn-sm btn-outline-secondary" onclick="openKpiDetail('${k.id_kpi}')"><i class="bi bi-chevron-right"></i></button>
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
                workloadContainer.innerHTML = `<div class="text-muted text-center py-4 small">Belum ada aktivitas yang diambil PIC.</div>`;
            } else {
                workloadContainer.innerHTML = `<ul class="list-group list-group-flush">` + workloadKeys.map(name => `
                    <li class="list-group-item d-flex justify-content-between align-items-center px-0 py-2">
                        <div class="d-flex align-items-center gap-2">
                            <div class="rounded-circle bg-light border p-2 d-flex align-items-center justify-content-center" style="width: 32px; height: 32px;">
                                <i class="bi bi-person text-secondary"></i>
                            </div>
                            <span class="fw-semibold text-dark small">${name}</span>
                        </div>
                        <span class="badge bg-primary rounded-pill">${workloadMap[name]} Aktivitas</span>
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
    let html = `<option value="ALL">-- Semua KPI Induk (${kpis.length}) --</option>`;
    kpis.forEach(k => {
        html += `<option value="${k.id_kpi}">${k.nama_kpi}</option>`;
    });
    filterEl.innerHTML = html;
    filterEl.value = currentVal;
}

function renderGanttChart() {
    const container = document.getElementById('ganttChartContainer');
    if (!container) return;

    const year = ganttViewDate.getFullYear();
    const month = ganttViewDate.getMonth();
    const monthNames = ['JANUARI', 'FEBRUARI', 'MARET', 'APRIL', 'MEI', 'JUNI', 'JULI', 'AGUSTUS', 'SEPTEMBER', 'OKTOBER', 'NOVEMBER', 'DESEMBER'];
    const monthNamesShort = ['JAN', 'FEB', 'MAR', 'APR', 'MEI', 'JUN', 'JUL', 'AGU', 'SEP', 'OKT', 'NOV', 'DES'];

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
            reminderTextEl.innerHTML = `Hari ini (${dateFormatted}): <span class="text-muted">Tidak ada aktivitas yang terjadwal aktif hari ini.</span>`;
        } else {
            let msg = `Hari ini (${dateFormatted}): Terdapat <strong>${todayActiveActs.length} aktivitas berjalan aktif</strong>`;
            if (dueTodayActs.length > 0) {
                msg += ` &mdash; <span class="text-danger fw-bold"><i class="bi bi-exclamation-triangle-fill"></i> ${dueTodayActs.length} aktivitas jatuh tempo (deadline) hari ini!</span>`;
            }
            reminderTextEl.innerHTML = msg;
        }
    }

    if (displayKpis.length === 0) {
        container.innerHTML = `<div class="p-4 text-center text-muted">Belum ada KPI yang dipilih atau tersedia.</div>`;
        return;
    }

    const colWidth = 36; // px per day column
    const totalDaysWidth = daysInMonth * colWidth;

    // Build Gantt Table HTML matching reference layout
    let html = `
    <div class="gantt-header-container">
        <div class="gantt-header-left">
            <span>TASK DESCRIPTION</span>
            <span class="text-end">PIC</span>
        </div>
        <div class="gantt-header-right">
            <div class="gantt-month-strip" style="min-width: ${totalDaysWidth}px;">
                <span class="px-3 py-0.5 rounded" style="background: rgba(255,255,255,0.08); border-left: 3px solid #F97316;">${monthNames[month]} ${year}</span>
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
                <i class="bi bi-folder2-open text-warning me-1"></i>
                <span class="text-truncate" style="max-width: 330px;" title="${k.nama_kpi}">KPI: ${k.nama_kpi}</span>
            </div>
            <div class="gantt-kpi-right" style="min-width: ${totalDaysWidth}px;"></div>
        </div>
        `;

        if (kpiActs.length === 0) {
            html += `
            <div class="gantt-task-row">
                <div class="gantt-task-left">
                    <span class="small text-muted ps-3">&mdash; Belum ada detail aktivitas</span>
                    <span class="text-muted small">-</span>
                </div>
                <div class="gantt-task-right" style="min-width: ${totalDaysWidth}px; grid-template-columns: repeat(${daysInMonth}, ${colWidth}px);">
                    ${daysArray.map(d => `<div class="gantt-grid-col ${d === todayDay ? 'today' : ''}"></div>`).join('')}
                </div>
            </div>
            `;
        } else {
            kpiActs.forEach(a => {
                const picName = a.npk_pic ? getUserName(a.npk_pic) : 'Belum Ada PIC';
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
                        const tooltipText = `${a.nama_aktivitas_kpi}&#10;PIC: ${picName}&#10;Jadwal: ${scheduleText}&#10;Status: ${a.status} (${a.persentase_progres}%)`;

                        barHtml = `
                        <div class="gantt-pill ${pillClass}" style="grid-column: ${startDay} / span ${spanCount};" title="${tooltipText}" onclick="openKpiDetail('${a.id_kpi}')">
                            <span>${a.persentase_progres}%</span>
                        </div>
                        `;
                    }
                }

                html += `
                <div class="gantt-task-row">
                    <div class="gantt-task-left">
                        <span class="small fw-semibold text-dark text-truncate me-2" style="max-width: 240px;" title="${a.nama_aktivitas_kpi}">
                            &mdash; ${a.nama_aktivitas_kpi}
                        </span>
                        <span class="badge bg-light text-secondary border px-2.5 py-1 rounded-pill small flex-shrink-0" style="max-width: 110px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;" title="PIC: ${picName}">
                            ${picName}
                        </span>
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
    tbody.innerHTML = `<tr><td colspan="8" class="text-center py-4 text-muted">Memuat data dari Supabase...</td></tr>`;

    const { data: users, error } = await db.from('karyawan').select('*').order('npk');
    if (error) {
        tbody.innerHTML = `<tr><td colspan="8" class="text-center py-4 text-danger">Gagal memuat karyawan: ${error.message}</td></tr>`;
        return;
    }

    if (!users || users.length === 0) {
        tbody.innerHTML = `<tr><td colspan="8" class="text-center py-4 text-muted">Belum ada data karyawan.</td></tr>`;
        return;
    }

    // Refresh cache
    users.forEach(u => { karyawanCache[u.npk] = u; });

    tbody.innerHTML = users.map(u => {
        const initial = u.nama_karyawan ? u.nama_karyawan.charAt(0).toUpperCase() : 'U';
        const isMale = (u.gender || '').toLowerCase() === 'laki-laki';

        let roleBadgeStyle = 'background-color: #475569; color: #FFFFFF;';
        if (u.role === 'KAPROD') roleBadgeStyle = 'background-color: #DC2626; color: #FFFFFF;';
        else if (u.role === 'SEKPROD') roleBadgeStyle = 'background-color: #2563EB; color: #FFFFFF;';
        else if (u.role === 'KAUPT') roleBadgeStyle = 'background-color: #06B6D4; color: #082F49;';
        else if (u.role === 'PIC_ACTIVITY') roleBadgeStyle = 'background-color: #0A192F; color: #38BDF8; border: 1px solid rgba(56, 189, 248, 0.3);';

        return `
        <tr>
            <td class="py-3 px-3">
                <span class="badge bg-light text-dark border px-2.5 py-1.5 fw-bold font-monospace" style="font-size: 0.9rem;">${u.npk}</span>
            </td>
            <td class="py-3 px-3">
                <div class="d-flex align-items-center gap-3">
                    <div class="rounded-circle text-white d-flex align-items-center justify-content-center fw-bold shadow-xs flex-shrink-0" 
                         style="width: 38px; height: 38px; background: linear-gradient(135deg, #1E3A8A 0%, #2563EB 100%); font-size: 0.9rem;">
                        ${initial}
                    </div>
                    <div class="fw-bold text-dark" style="font-size: 0.95rem;">${u.nama_karyawan}</div>
                </div>
            </td>
            <td class="py-3 px-3">
                <div class="d-flex align-items-center gap-2 fw-semibold text-dark" style="font-size: 0.95rem;">
                    <i class="bi ${isMale ? 'bi-gender-male text-primary' : 'bi-gender-female text-danger'} fs-5"></i>
                    <span>${u.gender || '-'}</span>
                </div>
            </td>
            <td class="py-3 px-3">
                <span class="badge px-3 py-1.5 rounded-2 fw-semibold" style="${roleBadgeStyle} font-size: 0.825rem; letter-spacing: 0.3px;">
                    ${u.role}
                </span>
            </td>
            <td class="py-3 px-3">
                <span class="fw-semibold text-dark" style="font-size: 0.95rem;">${u.bagian || '-'}</span>
            </td>
            <td class="py-3 px-3">
                <span class="fw-semibold text-dark" style="font-size: 0.95rem;">${u.username}</span>
            </td>
            <td class="py-3 px-3">
                <span class="badge ${u.status_aktif ? 'bg-success-subtle text-success border border-success-subtle' : 'bg-danger-subtle text-danger border border-danger-subtle'} px-3 py-1.5 rounded-pill fw-semibold" style="font-size: 0.8rem;">
                    <i class="bi ${u.status_aktif ? 'bi-check-circle-fill text-success' : 'bi-slash-circle-fill text-danger'} me-1"></i>
                    ${u.status_aktif ? 'AKTIF' : 'NONAKTIF'}
                </span>
            </td>
            <td class="py-3 px-3 text-end">
                <div class="d-inline-flex gap-2">
                    <button class="btn btn-sm btn-light border text-warning shadow-xs rounded-2 px-2.5 py-1.5" title="Ubah Status Aktif" onclick="toggleKaryawan('${u.npk}', ${u.status_aktif})">
                        <i class="bi ${u.status_aktif ? 'bi-lock-fill' : 'bi-unlock-fill'}"></i>
                    </button>
                    ${currentUser.npk !== u.npk ? `
                    <button class="btn btn-sm btn-light border text-danger shadow-xs rounded-2 px-2.5 py-1.5" title="Hapus Karyawan" onclick="deleteKaryawan('${u.npk}', '${(u.nama_karyawan || '').replace(/'/g, "\\'")}')">
                        <i class="bi bi-trash-fill"></i>
                    </button>` : ''}
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

        Swal.fire('Berhasil!', `Karyawan ${nama} berhasil ditambahkan.`, 'success');
        bootstrap.Modal.getInstance(document.getElementById('modalKaryawan')).hide();
        loadKaryawan();
    } catch (err) {
        Swal.fire('Error', err.message, 'error');
    } finally {
        btn.disabled = false;
    }
}

async function toggleKaryawan(npk, currentStatus) {
    const { error } = await db.from('karyawan').update({ status_aktif: !currentStatus }).eq('npk', npk);
    if (error) {
        Swal.fire('Error', error.message, 'error');
    } else {
        loadKaryawan();
    }
}

async function deleteKaryawan(npk, nama) {
    const res = await Swal.fire({
        title: 'Hapus Karyawan?',
        text: `Hapus ${nama} (${npk})? Tindakan tidak dapat dibatalkan.`,
        icon: 'warning',
        showCancelButton: true,
        confirmButtonColor: '#EF4444',
        confirmButtonText: 'Ya, Hapus'
    });
    if (res.isConfirmed) {
        const { error } = await db.from('karyawan').delete().eq('npk', npk);
        if (error) Swal.fire('Error', error.message, 'error');
        else {
            Swal.fire('Terhapus', 'Data karyawan berhasil dihapus.', 'success');
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
    tbody.innerHTML = `<tr><td colspan="9" class="text-center py-4">Memuat data KPI...</td></tr>`;

    let query = db.from('kpi').select('*');
    
    // Non-KAPROD only see published
    if (currentUser.role !== 'KAPROD') {
        query = query.eq('status', 'PUBLISHED');
    }

    const { data: kpis, error } = await query;
    if (error) {
        tbody.innerHTML = `<tr><td colspan="9" class="text-center py-4 text-danger">${error.message}</td></tr>`;
        return;
    }

    if (!kpis || kpis.length === 0) {
        tbody.innerHTML = `<tr><td colspan="9" class="text-center py-4 text-muted">Belum ada data Header KPI.</td></tr>`;
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
        const pjNames = pjs.map(npk => `<span class="badge bg-primary-subtle text-primary border">${getUserName(npk)}</span>`).join(' ');
        
        return `
            <tr>
                <td><code class="fw-bold">${k.id_kpi}</code></td>
                <td>
                    <a href="javascript:void(0)" onclick="openKpiDetail('${k.id_kpi}')" class="fw-bold text-dark text-decoration-none">${k.nama_kpi}</a>
                </td>
                <td>
                    <span class="badge bg-light text-dark border">${k.level || '-'}</span>
                    <div class="small text-muted">${k.kategori || '-'}</div>
                </td>
                <td class="small fw-semibold">${k.periode || '-'}</td>
                <td>${pjNames || '<span class="text-muted small">- Belum Ada PJ -</span>'}</td>
                <td class="fw-bold">${k.persentase_bobot}%</td>
                <td>
                    <div class="d-flex align-items-center gap-2">
                        <div class="progress flex-grow-1 progress-compact">
                            <div class="progress-bar" style="width: ${k.persentase_progres}%; background-color: ${k.persentase_progres >= 80 ? '#22C55E' : (k.persentase_progres >= 50 ? '#F59E0B' : '#EF4444')}"></div>
                        </div>
                        <span class="small fw-bold">${k.persentase_progres}%</span>
                    </div>
                </td>
                <td><span class="badge ${k.status === 'PUBLISHED' ? 'bg-success' : (k.status === 'DRAFT' ? 'bg-secondary' : 'bg-dark')}">${k.status}</span></td>
                <td class="text-end">
                    <div class="btn-group btn-group-sm">
                        <button class="btn btn-outline-secondary" title="Detail & Aktivitas" onclick="openKpiDetail('${k.id_kpi}')">
                            <i class="bi bi-eye"></i>
                        </button>
                        ${currentUser.role === 'KAPROD' ? `
                            ${k.status === 'DRAFT' ? `
                            <button class="btn btn-outline-success" title="Publikasikan" onclick="updateKpiStatus('${k.id_kpi}', 'PUBLISHED')">
                                <i class="bi bi-send-check"></i>
                            </button>` : ''}
                            ${k.status === 'PUBLISHED' ? `
                            <button class="btn btn-outline-dark" title="Tutup KPI (Closed)" onclick="updateKpiStatus('${k.id_kpi}', 'CLOSED')">
                                <i class="bi bi-archive"></i>
                            </button>` : ''}
                            <button class="btn btn-outline-danger" title="Hapus KPI" onclick="deleteKpi('${k.id_kpi}', '${k.nama_kpi}')">
                                <i class="bi bi-trash"></i>
                            </button>
                        ` : ''}
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
        container.innerHTML = candidates.map(c => `
            <div class="col-md-6">
                <div class="border rounded-2 p-2 d-flex align-items-center gap-2">
                    <input class="form-check-input mt-0" type="checkbox" name="kpiPj" value="${c.npk}" id="pj_${c.npk}">
                    <label class="form-check-label small flex-grow-1" for="pj_${c.npk}">
                        <strong>${c.nama_karyawan}</strong> (${c.role})
                    </label>
                </div>
            </div>
        `).join('');
    } else {
        container.innerHTML = `<div class="col-12 text-muted small">Tidak ada akun SEKPROD/KAUPT aktif.</div>`;
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

        Swal.fire('Berhasil!', `Header KPI ${nama} berhasil dibuat.`, 'success');
        bootstrap.Modal.getInstance(document.getElementById('modalKpi')).hide();
        loadKpi();
    } catch (err) {
        Swal.fire('Error', err.message, 'error');
    } finally {
        btn.disabled = false;
    }
}

async function updateKpiStatus(idKpi, newStatus) {
    const { error } = await db.from('kpi').update({ status: newStatus }).eq('id_kpi', idKpi);
    if (error) Swal.fire('Error', error.message, 'error');
    else {
        Swal.fire('Status Diubah', `Status KPI berhasil diubah menjadi ${newStatus}.`, 'success');
        loadKpi();
    }
}

async function deleteKpi(idKpi, nama) {
    // Check if KPI has activities
    const { count } = await db.from('detail_kpi').select('*', { count: 'exact', head: true }).eq('id_kpi', idKpi);
    if (count > 0) {
        Swal.fire('Tidak Dapat Dihapus', `KPI ini memiliki ${count} aktivitas terkait. Sesuai aturan bisnis, nonaktifkan (Closed) saja.`, 'warning');
        return;
    }

    const res = await Swal.fire({
        title: 'Hapus KPI?',
        text: `Hapus Header KPI "${nama}"?`,
        icon: 'warning',
        showCancelButton: true,
        confirmButtonColor: '#EF4444',
        confirmButtonText: 'Ya, Hapus'
    });
    if (res.isConfirmed) {
        await db.from('kpi_penanggung_jawab').delete().eq('id_kpi', idKpi);
        const { error } = await db.from('kpi').delete().eq('id_kpi', idKpi);
        if (error) Swal.fire('Error', error.message, 'error');
        else {
            Swal.fire('Terhapus', 'KPI berhasil dihapus.', 'success');
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

    let options = `<option value="">-- Tanpa PIC Langsung (Status OPEN, diambil mandiri oleh PIC) --</option>`;
    picUsers.forEach(u => {
        const isSelected = (u.npk === selectedNpk) ? 'selected' : '';
        options += `<option value="${u.npk}" ${isSelected}>${u.nama_karyawan} (${u.npk}) ${u.bagian ? '- ' + u.bagian : ''}</option>`;
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
    document.getElementById('detailKpiStatusBadge').innerText = kpi.status;

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
        desc.innerHTML = `<span class="badge bg-success">Lengkap 100%</span> Total bobot seluruh detail aktivitas telah tepat mencapai 100.00%.`;
    } else {
        desc.innerHTML = `<span class="badge bg-warning text-dark">Sisa Bobot: ${currentKpiAvailableBobot}%</span> Aturan: Total bobot aktivitas dalam 1 KPI wajib berjumlah 100% sebelum dapat diselesaikan.`;
    }

    // Render table
    const tbody = document.getElementById('activityTableBody');
    if (!currentKpiActivities || currentKpiActivities.length === 0) {
        tbody.innerHTML = `<tr><td colspan="8" class="text-center py-4 text-muted">Belum ada aktivitas di bawah KPI ini.</td></tr>`;
        return;
    }

    tbody.innerHTML = currentKpiActivities.map(a => {
        const isMyPic = (a.npk_pic && a.npk_pic === currentUser.npk);
        const canUpload = isMyPic && (a.status === 'PICKED' || a.status === 'REVISION');
        const canEditOrDelete = canManage && (a.status === 'OPEN' || a.status === 'PICKED' || a.status === 'REVISION');
        const escapedNama = (a.nama_aktivitas_kpi || '').replace(/'/g, "\\'");

        return `
        <tr>
            <td><code>${a.id_detail_kpi}</code></td>
            <td class="fw-bold text-dark">${a.nama_aktivitas_kpi}</td>
            <td class="fw-bold text-primary">${a.persentase_bobot}%</td>
            <td>
                <div class="d-flex align-items-center gap-2">
                    <div class="progress flex-grow-1 progress-compact">
                        <div class="progress-bar bg-success" style="width: ${a.persentase_progres}%"></div>
                    </div>
                    <span class="small fw-bold">${a.persentase_progres}%</span>
                </div>
            </td>
            <td>${formatActivitySchedule(a.start_date, a.end_date, a.deadline)}</td>
            <td>
                ${a.npk_pic ? `<span class="badge bg-primary-subtle text-primary border">${getUserName(a.npk_pic)}</span>` : '<span class="badge bg-light text-muted border">Belum Ada PIC</span>'}
            </td>
            <td>
                <span class="badge ${a.status === 'DONE' ? 'bg-success' : (a.status === 'SUBMITTED' ? 'bg-warning text-dark' : (a.status === 'REVISION' ? 'bg-danger' : (a.status === 'PICKED' ? 'bg-info text-dark' : 'bg-primary')))}">${a.status}</span>
            </td>
            <td class="text-end">
                <div class="btn-group btn-group-sm">
                    ${canUpload ? `
                    <button class="btn btn-success" title="Upload Activity Plan & Bukti Progres" onclick="openUploadModal('${a.id_detail_kpi}', '${escapedNama}')">
                        <i class="bi bi-cloud-arrow-up-fill me-1"></i> Upload
                    </button>` : ''}
                    ${canEditOrDelete ? `
                    <button class="btn btn-outline-primary" title="Edit Aktivitas" onclick="openEditActivityModal('${a.id_detail_kpi}')">
                        <i class="bi bi-pencil-square"></i>
                    </button>
                    <button class="btn btn-outline-danger" title="Hapus Aktivitas" onclick="deleteActivity('${a.id_detail_kpi}', '${escapedNama}')">
                        <i class="bi bi-trash"></i>
                    </button>` : ''}
                    ${(!canUpload && !canEditOrDelete) ? `<span class="text-muted small">-</span>` : ''}
                </div>
            </td>
        </tr>
    `}).join('');
}

async function openActivityModal() {
    const form = document.getElementById('formActivity');
    if (form) form.reset();

    const titleEl = document.getElementById('modalActivityTitle');
    if (titleEl) titleEl.innerText = 'Tambah Detail Aktivitas';

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
        bobotInput.placeholder = 'Maksimal: ' + currentKpiAvailableBobot + '%';
        bobotInput.value = '';
    }

    const btn = document.getElementById('btnSaveActivity');
    if (btn) btn.innerHTML = '<i class="bi bi-plus-circle me-1"></i> Simpan Aktivitas';

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
            Swal.fire('Error', 'Data aktivitas tidak ditemukan.', 'error');
            return;
        }
        act = data;
    }

    const titleEl = document.getElementById('modalActivityTitle');
    if (titleEl) titleEl.innerText = 'Edit Detail Aktivitas';

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
    if (sisaBobotEl) sisaBobotEl.innerText = maxAllowedBobot + '% (sisa ' + currentKpiAvailableBobot + '% + bobot ini ' + currentActBobot + '%)';

    document.getElementById('actNama').value = act.nama_aktivitas_kpi || '';

    const bobotInput = document.getElementById('actBobot');
    if (bobotInput) {
        bobotInput.max = maxAllowedBobot;
        bobotInput.placeholder = 'Maksimal: ' + maxAllowedBobot + '%';
        bobotInput.value = currentActBobot;
    }

    document.getElementById('actStartDate').value = act.start_date || '';
    document.getElementById('actEndDate').value = act.end_date || act.deadline || '';

    const btn = document.getElementById('btnSaveActivity');
    if (btn) btn.innerHTML = '<i class="bi bi-save me-1"></i> Simpan Perubahan';

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
        Swal.fire('Validasi Gagal', 'Nama aktivitas kegiatan wajib diisi.', 'warning');
        return;
    }

    if (isNaN(bobot) || bobot <= 0) {
        Swal.fire('Validasi Gagal', 'Persentase bobot harus lebih besar dari 0%.', 'warning');
        return;
    }

    if (!endDate) {
        Swal.fire('Validasi Gagal', 'Tanggal selesai (End Date) wajib diisi.', 'warning');
        return;
    }

    if (startDate && endDate && startDate > endDate) {
        Swal.fire('Validasi Tanggal', 'Tanggal mulai tidak boleh melebihi tanggal selesai.', 'warning');
        return;
    }

    const btn = document.getElementById('btnSaveActivity');
    btn.disabled = true;
    btn.innerHTML = '<span class="spinner-border spinner-border-sm me-1"></span> Menyimpan...';

    try {
        if (editId) {
            // EDIT MODE
            const existingAct = currentKpiActivities.find(a => a.id_detail_kpi === editId);
            const currentActBobot = existingAct ? parseFloat(existingAct.persentase_bobot || 0) : 0;
            const maxAllowedBobot = parseFloat(currentKpiAvailableBobot) + currentActBobot;

            if (bobot > (maxAllowedBobot + 0.001)) {
                Swal.fire('Validasi Bobot Gagal', `Bobot yang dimasukkan (${bobot}%) melebihi sisa alokasi maksimal (${maxAllowedBobot.toFixed(2)}%). Total bobot seluruh aktivitas dalam 1 KPI tidak boleh melebihi 100%.`, 'error');
                btn.disabled = false;
                btn.innerHTML = '<i class="bi bi-save me-1"></i> Simpan Perubahan';
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

            Swal.fire('Berhasil!', `Perubahan aktivitas "${nama}" (${editId}) berhasil disimpan.`, 'success');
        } else {
            // CREATE MODE
            if (bobot > (parseFloat(currentKpiAvailableBobot) + 0.001)) {
                Swal.fire('Validasi Bobot Gagal', `Bobot yang dimasukkan (${bobot}%) melebihi sisa alokasi bobot (${currentKpiAvailableBobot}%). Total seluruh aktivitas dalam 1 KPI wajib berjumlah tepat 100%.`, 'error');
                btn.disabled = false;
                btn.innerHTML = '<i class="bi bi-plus-circle me-1"></i> Simpan Aktivitas';
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
            const msg = selectedPic
                ? `Aktivitas berhasil dibuat dan langsung ditugaskan ke <strong>${picName}</strong> dengan status <strong>PICKED</strong>.`
                : 'Aktivitas berhasil ditambahkan dengan status <strong>OPEN</strong> (dapat diambil mandiri oleh PIC).';

            Swal.fire({
                title: 'Berhasil!',
                html: msg,
                icon: 'success'
            });
        }

        const modalEl = document.getElementById('modalActivity');
        const modalInst = bootstrap.Modal.getInstance(modalEl);
        if (modalInst) modalInst.hide();
        openKpiDetail(currentSelectedKpiId);
    } catch (err) {
        Swal.fire('Error', err.message, 'error');
    } finally {
        btn.disabled = false;
        btn.innerHTML = editId
            ? '<i class="bi bi-save me-1"></i> Simpan Perubahan'
            : '<i class="bi bi-plus-circle me-1"></i> Simpan Aktivitas';
    }
}

async function deleteActivity(idDetailKpi, nama) {
    const res = await Swal.fire({
        title: 'Hapus Aktivitas?',
        text: `Hapus aktivitas "${nama}" (${idDetailKpi})?`,
        icon: 'warning',
        showCancelButton: true,
        confirmButtonColor: '#EF4444',
        confirmButtonText: 'Ya, Hapus'
    });
    if (res.isConfirmed) {
        const { error } = await db.from('detail_kpi').delete().eq('id_detail_kpi', idDetailKpi);
        if (error) Swal.fire('Error', error.message, 'error');
        else {
            Swal.fire('Terhapus', `Aktivitas ${idDetailKpi} telah dihapus.`, 'success');
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
    tbody.innerHTML = `<tr><td colspan="7" class="text-center py-4">Memuat aktivitas OPEN...</td></tr>`;

    const { data: acts, error } = await db.from('detail_kpi')
        .select('*')
        .eq('status', 'OPEN');

    if (error) {
        tbody.innerHTML = `<tr><td colspan="7" class="text-center py-4 text-danger">${error.message}</td></tr>`;
        return;
    }

    if (!acts || acts.length === 0) {
        tbody.innerHTML = `<tr><td colspan="7" class="text-center py-4 text-muted">Saat ini tidak ada aktivitas berstatus OPEN.</td></tr>`;
        return;
    }

    tbody.innerHTML = acts.map(a => `
        <tr>
            <td><code>${a.id_detail_kpi}</code></td>
            <td>
                <div class="fw-semibold text-dark">${getKpiName(a.id_kpi)}</div>
                <small class="text-muted">${a.id_kpi}</small>
            </td>
            <td><strong class="text-dark">${a.nama_aktivitas_kpi}</strong></td>
            <td class="fw-bold text-primary">${a.persentase_bobot}%</td>
            <td>${formatActivitySchedule(a.start_date, a.end_date, a.deadline)}</td>
            <td><small>${getUserName(a.dibuat_oleh)}</small></td>
            <td class="text-end">
                <button class="btn btn-navy btn-sm" onclick="pickActivityDirect('${a.id_detail_kpi}', '${a.nama_aktivitas_kpi}')">
                    <i class="bi bi-hand-index-thumb me-1"></i> Ambil Aktivitas
                </button>
            </td>
        </tr>
    `).join('');
}

async function pickActivityDirect(idDetailKpi, nama) {
    const res = await Swal.fire({
        title: 'Ambil Aktivitas?',
        text: `Anda akan menjadi PIC resmi untuk aktivitas "${nama}".`,
        icon: 'question',
        showCancelButton: true,
        confirmButtonColor: '#1E3A8A',
        confirmButtonText: 'Ya, Ambil Aktivitas'
    });

    if (res.isConfirmed) {
        const { error } = await db.from('detail_kpi')
            .update({ npk_pic: currentUser.npk, status: 'PICKED' })
            .eq('id_detail_kpi', idDetailKpi);

        if (error) {
            Swal.fire('Gagal', error.message, 'error');
        } else {
            Swal.fire('Berhasil!', 'Aktivitas berhasil diambil. Silakan kerjakan dan unggah progres.', 'success');
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
    tbody.innerHTML = `<tr><td colspan="8" class="text-center py-4">Memuat aktivitas Anda...</td></tr>`;

    const { data: acts, error } = await db.from('detail_kpi')
        .select('*')
        .eq('npk_pic', currentUser.npk);

    if (error) {
        tbody.innerHTML = `<tr><td colspan="8" class="text-center py-4 text-danger">${error.message}</td></tr>`;
        return;
    }

    if (!acts || acts.length === 0) {
        tbody.innerHTML = `<tr><td colspan="8" class="text-center py-4 text-muted">Anda belum memiliki aktivitas yang diambil.</td></tr>`;
        return;
    }

    tbody.innerHTML = acts.map(a => `
        <tr>
            <td><code>${a.id_detail_kpi}</code></td>
            <td>
                <div class="fw-semibold text-dark">${getKpiName(a.id_kpi)}</div>
                <small class="text-muted">${a.id_kpi}</small>
            </td>
            <td><strong class="text-dark">${a.nama_aktivitas_kpi}</strong></td>
            <td class="fw-bold text-primary">${a.persentase_bobot}%</td>
            <td>
                <div class="d-flex align-items-center gap-2">
                    <div class="progress flex-grow-1 progress-compact">
                        <div class="progress-bar bg-success" style="width: ${a.persentase_progres}%"></div>
                    </div>
                    <span class="small fw-bold">${a.persentase_progres}%</span>
                </div>
            </td>
            <td>${formatActivitySchedule(a.start_date, a.end_date, a.deadline)}</td>
            <td>
                <span class="badge ${a.status === 'DONE' ? 'bg-success' : (a.status === 'SUBMITTED' ? 'bg-warning text-dark' : (a.status === 'REVISION' ? 'bg-danger' : 'bg-primary'))}">
                    ${a.status}
                </span>
            </td>
            <td class="text-end">
                ${(a.status === 'PICKED' || a.status === 'REVISION') ? `
                <button class="btn btn-navy btn-sm" onclick="openUploadModal('${a.id_detail_kpi}', '${(a.nama_aktivitas_kpi || '').replace(/'/g, "\\'")}')">
                    <i class="bi bi-cloud-arrow-up-fill me-1"></i> Unggah Progres
                </button>` : '<span class="small text-muted">Menunggu Review</span>'}
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
        Swal.fire('Error', 'Data detail aktivitas tidak ditemukan.', 'error');
        return;
    }

    if (act.npk_pic !== currentUser.npk) {
        Swal.fire({
            icon: 'error',
            title: 'Akses Ditolak',
            html: `Hanya PIC penanggung jawab (<strong>${getUserName(act.npk_pic)}</strong>) yang berhak mengunggah berkas untuk aktivitas ini.`
        });
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
        Swal.fire('Validasi Gagal', 'Persentase progres harus berupa angka antara 0% dan 100%.', 'warning');
        return;
    }

    if (!planFileInput || !planFileInput.files || planFileInput.files.length === 0) {
        Swal.fire('File Diperlukan', 'Harap pilih berkas Activity Plan (Rencana Aktivitas).', 'warning');
        return;
    }

    if (buktiFileInput && (!buktiFileInput.files || buktiFileInput.files.length === 0)) {
        Swal.fire('File Diperlukan', 'Harap pilih berkas Bukti Progres / Capaian.', 'warning');
        return;
    }

    const planFile = planFileInput.files[0];
    const buktiFile = (buktiFileInput && buktiFileInput.files.length > 0) ? buktiFileInput.files[0] : planFile;
    const maxSizeBytes = 5 * 1024 * 1024;

    if (planFile.size > maxSizeBytes || buktiFile.size > maxSizeBytes) {
        Swal.fire('Ukuran Terlalu Besar', 'Maksimal ukuran masing-masing berkas adalah 5 MB.', 'warning');
        return;
    }

    const btn = document.getElementById('btnSubmitUpload');
    btn.disabled = true;
    btn.innerHTML = '<span class="spinner-border spinner-border-sm me-1"></span> Mengunggah Berkas...';

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

        Swal.fire({
            title: 'Berhasil Diunggah!',
            html: `Berkas <b>Activity Plan</b> dan <b>Bukti Progres</b> dengan capaian <b>${persentase}%</b> berhasil dikirimkan. Status aktivitas kini menjadi <b>SUBMITTED</b> untuk diverifikasi oleh reviewer.`,
            icon: 'success'
        });

        const modalInst = bootstrap.Modal.getInstance(document.getElementById('modalUpload'));
        if (modalInst) modalInst.hide();

        if (currentSelectedKpiId) {
            openKpiDetail(currentSelectedKpiId);
        }
        loadMyActivities();
        loadDashboard();
    } catch (err) {
        Swal.fire('Gagal Mengunggah', err.message, 'error');
    } finally {
        btn.disabled = false;
        btn.innerHTML = '<i class="bi bi-cloud-arrow-up-fill me-1"></i> Kirim Laporan Progres';
    }
}

// ==========================================
// 7. APPROVAL LEVEL 1 & FINAL (AUTOMATIC KPI CALCULATION)
// ==========================================
async function loadApprovalL1() {
    if (!currentUser) return;
    const tbody = document.getElementById('approvalL1TableBody');
    tbody.innerHTML = `<tr><td colspan="8" class="text-center py-4">Memuat pengajuan L1...</td></tr>`;

    const { data: acts, error } = await db.from('detail_kpi')
        .select('*')
        .eq('status', 'SUBMITTED');

    if (error) {
        tbody.innerHTML = `<tr><td colspan="8" class="text-center py-4 text-danger">${error.message}</td></tr>`;
        return;
    }

    if (!acts || acts.length === 0) {
        tbody.innerHTML = `<tr><td colspan="8" class="text-center py-4 text-muted">Tidak ada pengajuan aktivitas yang menunggu Approval Level 1.</td></tr>`;
        return;
    }

    tbody.innerHTML = acts.map(a => `
        <tr>
            <td><code>${a.id_detail_kpi}</code></td>
            <td>${getKpiName(a.id_kpi)}</td>
            <td><strong>${a.nama_aktivitas_kpi}</strong></td>
            <td>${getUserName(a.npk_pic)}</td>
            <td><span class="badge bg-warning text-dark">Diajukan</span></td>
            <td>${formatActivitySchedule(a.start_date, a.end_date, a.deadline)}</td>
            <td><span class="badge bg-warning text-dark">${a.status}</span></td>
            <td class="text-end">
                <button class="btn btn-navy btn-sm" onclick="openReviewModal('${a.id_detail_kpi}', 'L1')">
                    <i class="bi bi-search me-1"></i> Tinjau & Verifikasi
                </button>
            </td>
        </tr>
    `).join('');
}

async function loadApprovalFinal() {
    if (!currentUser) return;
    const tbody = document.getElementById('approvalFinalTableBody');
    tbody.innerHTML = `<tr><td colspan="8" class="text-center py-4">Memuat antrean Approval Final...</td></tr>`;

    const { data: acts, error } = await db.from('detail_kpi')
        .select('*')
        .eq('status', 'APPROVED_L1');

    if (error) {
        tbody.innerHTML = `<tr><td colspan="8" class="text-center py-4 text-danger">${error.message}</td></tr>`;
        return;
    }

    if (!acts || acts.length === 0) {
        tbody.innerHTML = `<tr><td colspan="8" class="text-center py-4 text-muted">Tidak ada aktivitas yang menunggu persetujuan Final KAPROD.</td></tr>`;
        return;
    }

    tbody.innerHTML = acts.map(a => `
        <tr>
            <td><code>${a.id_detail_kpi}</code></td>
            <td>${getKpiName(a.id_kpi)}</td>
            <td><strong>${a.nama_aktivitas_kpi}</strong></td>
            <td>${getUserName(a.npk_pic)}</td>
            <td><span class="badge bg-info text-dark">Lolos L1</span></td>
            <td><strong>${a.persentase_bobot}%</strong></td>
            <td><span class="badge bg-info text-dark">${a.status}</span></td>
            <td class="text-end">
                <button class="btn btn-warning btn-sm" onclick="openReviewModal('${a.id_detail_kpi}', 'FINAL')">
                    <i class="bi bi-patch-check-fill me-1"></i> Approval Final
                </button>
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
    document.getElementById('reviewModalTitle').innerText = level === 'L1' ? 'Persetujuan Level 1 (SEKPROD / KAUPT)' : 'Persetujuan Final (KAPROD)';

    const { data: act } = await db.from('detail_kpi').select('*').eq('id_detail_kpi', idDetailKpi).single();
    if (!act) return;
    currentReviewActivity = act;

    document.getElementById('reviewKpiInfo').innerText = `KPI: ${getKpiName(act.id_kpi)}`;
    document.getElementById('reviewActTitle').innerText = act.nama_aktivitas_kpi;
    document.getElementById('reviewPicName').innerText = getUserName(act.npk_pic);
    document.getElementById('reviewBobot').innerText = act.persentase_bobot + '%';

    // Fetch latest upload file
    const { data: uploads } = await db.from('upload_file').select('*').eq('id_detail_kpi', idDetailKpi).order('tanggal_upload', { ascending: false }).limit(1);
    if (uploads && uploads.length > 0) {
        latestUploadForReview = uploads[0];
        document.getElementById('reviewProgres').innerText = latestUploadForReview.persentase_progres + '%';
        document.getElementById('reviewCatatanPic').innerText = latestUploadForReview.catatan || 'Tidak ada catatan keterangan.';

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
            if (planUrl && planUrl !== '#') {
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
            if (buktiUrl && buktiUrl !== '#') {
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
        Swal.fire('Catatan Wajib Diisi', 'Saat menolak (REJECT), Anda wajib menyertakan alasan revisi.', 'warning');
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

        Swal.fire('Berhasil!', `Keputusan ${action} (${level}) berhasil diproses.`, 'success');
        bootstrap.Modal.getInstance(document.getElementById('modalReview')).hide();
        
        if (level === 'L1') loadApprovalL1();
        else loadApprovalFinal();

    } catch (err) {
        Swal.fire('Error', err.message, 'error');
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

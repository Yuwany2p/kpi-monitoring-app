/* =====================================================================
   ui-enhance.js: sentuhan antarmuka tanpa mengubah logika data
   - countTo(): angka ringkasan naik halus (dimatikan bila reduced motion)
   - Pencarian menu cepat (Ctrl K / tombol "Cari menu")
   ===================================================================== */
(function () {
    'use strict';

    const reduceMotion = () => window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    // ------------------------------------------------------------------
    // Angka naik halus
    // ------------------------------------------------------------------
    window.countTo = function (el, target, suffix = '') {
        const to = Number(target) || 0;
        const from = Number(el.dataset.count || 0);
        el.dataset.count = to;
        if (reduceMotion() || from === to) { el.textContent = to + suffix; return; }
        const dur = 700;
        const start = performance.now();
        const step = (now) => {
            const t = Math.min(1, (now - start) / dur);
            const eased = 1 - Math.pow(1 - t, 3);
            el.textContent = Math.round(from + (to - from) * eased) + suffix;
            if (t < 1) requestAnimationFrame(step);
        };
        requestAnimationFrame(step);
        // Cadangan bila tab di latar belakang (rAF berhenti)
        setTimeout(() => { el.textContent = to + suffix; }, dur + 100);
    };

    // ------------------------------------------------------------------
    // Pencarian menu cepat
    // ------------------------------------------------------------------
    const dialog = document.getElementById('commandPalette');
    const input = document.getElementById('cmdkInput');
    const list = document.getElementById('cmdkList');
    if (!dialog || !input || !list) return;

    let items = [];
    let filtered = [];
    let active = 0;
    let lastFocus = null;

    const isVisible = (el) => !el.closest('.d-none');

    function collectItems() {
        const nav = Array.from(document.querySelectorAll('#sidebar .sidebar-menu-link'))
            .filter(isVisible)
            .map((a) => {
                const section = a.closest('.sidebar-menu-section')?.querySelector('.sidebar-menu-title')?.textContent.trim() || 'Menu';
                return {
                    label: a.querySelector('span')?.textContent.trim() || a.title,
                    icon: (a.querySelector('i')?.className.match(/bi-[\w-]+/) || ['bi-circle'])[0],
                    group: section,
                    run: () => a.click(),
                };
            });
        const actions = [
            { label: 'Muat ulang data dashboard', icon: 'bi-arrow-clockwise', group: 'Aksi', run: () => { window.switchView?.('dashboard'); } },
            { label: 'Keluar dari sistem', icon: 'bi-box-arrow-right', group: 'Aksi', run: () => window.logout?.() },
        ];
        return nav.concat(actions);
    }

    const norm = (s) => s.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');

    function render() {
        const q = norm(input.value.trim());
        filtered = q ? items.filter((it) => norm(it.label + ' ' + it.group).includes(q)) : items.slice();
        active = Math.min(active, Math.max(0, filtered.length - 1));

        if (filtered.length === 0) {
            list.innerHTML = '<li class="cmdk-empty" role="presentation"><i class="bi bi-search" aria-hidden="true"></i>Tidak ada menu yang cocok.</li>';
            input.removeAttribute('aria-activedescendant');
            return;
        }
        let html = '';
        let group = null;
        filtered.forEach((it, i) => {
            if (it.group !== group) {
                group = it.group;
                html += `<li class="cmdk-group" role="presentation">${group}</li>`;
            }
            html += `<li class="cmdk-item${i === active ? ' is-active' : ''}" id="cmdk-opt-${i}" role="option" aria-selected="${i === active}" data-i="${i}">
                <i class="bi ${it.icon}" aria-hidden="true"></i><span>${it.label}</span><i class="bi bi-arrow-return-left cmdk-enter" aria-hidden="true"></i></li>`;
        });
        list.innerHTML = html;
        input.setAttribute('aria-activedescendant', 'cmdk-opt-' + active);
        list.querySelector('.is-active')?.scrollIntoView({ block: 'nearest' });
    }

    function choose(i) {
        const it = filtered[i];
        if (!it) return;
        close(false);
        it.run();
    }

    window.openCommandPalette = function () {
        if (dialog.open) return;
        lastFocus = document.activeElement;
        items = collectItems();
        input.value = '';
        active = 0;
        render();
        dialog.showModal();
        input.focus();
    };

    function close(restoreFocus = true) {
        if (!dialog.open) return;
        dialog.close();
        if (restoreFocus) lastFocus?.focus?.();
    }

    input.addEventListener('input', () => { active = 0; render(); });
    input.addEventListener('keydown', (e) => {
        if (e.key === 'ArrowDown') { e.preventDefault(); active = (active + 1) % Math.max(1, filtered.length); render(); }
        else if (e.key === 'ArrowUp') { e.preventDefault(); active = (active - 1 + filtered.length) % Math.max(1, filtered.length); render(); }
        else if (e.key === 'Enter') { e.preventDefault(); choose(active); }
    });
    list.addEventListener('click', (e) => {
        const li = e.target.closest('.cmdk-item');
        if (li) choose(Number(li.dataset.i));
    });
    list.addEventListener('mousemove', (e) => {
        const li = e.target.closest('.cmdk-item');
        if (li && Number(li.dataset.i) !== active) { active = Number(li.dataset.i); render(); }
    });
    // Klik di luar kotak menutup palet
    dialog.addEventListener('click', (e) => { if (e.target === dialog) close(); });
    dialog.addEventListener('cancel', (e) => { e.preventDefault(); close(); });

    document.addEventListener('keydown', (e) => {
        if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
            // Jangan bentrok dengan modal Bootstrap yang sedang terbuka
            if (document.querySelector('.modal.show')) return;
            e.preventDefault();
            dialog.open ? close() : window.openCommandPalette();
        }
    });
})();

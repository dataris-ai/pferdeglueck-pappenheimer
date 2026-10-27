/* Pferdeglück Pappenheimer — main.js
   Reines Vanilla-JS. Ohne Script bleibt alles lesbar: Eingänge laufen nur unter html.js und haben
   einen CSS-Failsafe, die Terminliste ist ohne Filter vollständig, die Formulare schicken ein mailto. */
(() => {
  'use strict';
  const calm = matchMedia('(prefers-reduced-motion: reduce)');
  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => [...r.querySelectorAll(s)];

  /* ---------- Vorhang beim ersten Besuch: fällt, sobald das Hero-Bild decodiert ist, spätestens nach 0,8 s ---------- */
  (() => {
    const root = document.documentElement, curtain = $('#curtain');
    if (!curtain || !root.classList.contains('curtain-on')) return;
    let done = false;
    const drop = () => {
      if (done) return; done = true;
      try { sessionStorage.setItem('pg-seen', '1'); } catch (e) {}
      curtain.classList.add('is-leaving');
      setTimeout(() => { root.classList.remove('curtain-on'); curtain.hidden = true; }, 340);
    };
    const img = $('.hero__slide.is-first img');
    const started = performance.now();
    if (img && img.decode) img.decode().then(drop, drop); else drop();
    setTimeout(drop, Math.max(0, 800 - (performance.now() - started)));
  })();

  /* ---------- Eingänge: einmal, gestaffelt; Failsafe steckt im CSS ---------- */
  (() => {
    const targets = $$('[data-reveal]');
    if (!targets.length) return;
    const show = (el) => el.classList.add('is-in');
    if (!('IntersectionObserver' in window)) { targets.forEach(show); return; }
    const io = new IntersectionObserver((entries) => {
      for (const e of entries) if (e.isIntersecting) { show(e.target); io.unobserve(e.target); }
    }, { rootMargin: '0px 0px -8% 0px', threshold: 0.06 });
    targets.forEach((el) => io.observe(el));
    const sweep = () => targets.forEach((el) => { const r = el.getBoundingClientRect(); if (r.top < innerHeight && r.bottom > 0) show(el); });
    addEventListener('load', () => setTimeout(sweep, 1500));
    document.addEventListener('planner:change', sweep);
  })();

  /* ---------- Zahlen zählen einmal hoch (600 ms, tabular) ---------- */
  (() => {
    const nums = $$('[data-count]');
    if (!nums.length || calm.matches || !('IntersectionObserver' in window)) return;
    const fmt = (v, decimals) => v.toLocaleString('de-DE', { minimumFractionDigits: decimals, maximumFractionDigits: decimals });
    const run = (el) => {
      const raw = el.dataset.count.replace(',', '.'); const target = parseFloat(raw);
      const decimals = (el.dataset.count.split(',')[1] || '').length;
      const t0 = performance.now();
      const tick = (t) => {
        const p = Math.min(1, (t - t0) / 600); const e = 1 - Math.pow(1 - p, 3);
        el.textContent = fmt(target * e, decimals);
        if (p < 1) requestAnimationFrame(tick); else el.textContent = fmt(target, decimals);
      };
      requestAnimationFrame(tick);
    };
    const io = new IntersectionObserver((en) => en.forEach((e) => { if (e.isIntersecting) { run(e.target); io.unobserve(e.target); } }), { threshold: 0.5 });
    nums.forEach((n) => io.observe(n));
  })();

  /* ---------- Menü (Vollbild) ---------- */
  (() => {
    const menu = $('#menu');
    if (!menu) return;
    const openers = $$('[data-menu-open]');
    let last = null;
    const open = (btn) => {
      last = btn;
      menu.hidden = false;
      requestAnimationFrame(() => requestAnimationFrame(() => menu.classList.remove('is-closed')));
      openers.forEach((b) => b.setAttribute('aria-expanded', 'true'));
      document.body.style.overflow = 'hidden';
      ($('a', menu) || menu).focus();
    };
    const close = () => {
      menu.classList.add('is-closed');
      openers.forEach((b) => b.setAttribute('aria-expanded', 'false'));
      document.body.style.overflow = '';
      setTimeout(() => { menu.hidden = true; }, 260);
      if (last) last.focus();
    };
    openers.forEach((b) => b.addEventListener('click', () => open(b)));
    $$('[data-menu-close]', menu).forEach((b) => b.addEventListener('click', close));
    $$('a', menu).forEach((a) => a.addEventListener('click', close));
    addEventListener('keydown', (e) => { if (e.key === 'Escape' && !menu.hidden) close(); });
  })();

  /* ---------- Hero: langsamer Crossfade durch drei Bilder, pausiert im verborgenen Tab ---------- */
  (() => {
    const all = $$('.hero__slide');
    if (all.length < 2 || calm.matches) return;
    const slides = () => all.filter((s) => getComputedStyle(s).display !== 'none');
    let i = 0, timer = null;
    const next = () => {
      const list = slides(); if (list.length < 2) return;
      list.forEach((s) => s.classList.remove('is-on'));
      i = (i + 1) % list.length;
      list[i].classList.add('is-on');
    };
    const start = () => { if (!timer) timer = setInterval(next, 5600); };
    const stop = () => { clearInterval(timer); timer = null; };
    document.addEventListener('visibilitychange', () => (document.hidden ? stop() : start()));
    const hero = $('.hero');
    if ('IntersectionObserver' in window) new IntersectionObserver((en) => en.forEach((e) => (e.isIntersecting ? start() : stop())), { threshold: 0.05 }).observe(hero);
    else start();
    calm.addEventListener('change', () => { if (calm.matches) stop(); });
  })();

  /* ---------- Liste: aktive Zeile, Bild wechselt ---------- */
  (() => {
    const list = $('.index');
    if (!list) return;
    const rows = $$('.index__row', list);
    const imgs = $$('.index__frame img', list);
    const byKey = Object.fromEntries(imgs.map((im) => [im.dataset.for, im]));
    let active = null;
    const activate = (row) => {
      if (row === active) return;
      active = row;
      rows.forEach((r) => { const on = r === row; r.classList.toggle('is-active', on); $('.index__btn', r).setAttribute('aria-expanded', String(on)); });
      imgs.forEach((im) => im.classList.toggle('is-on', im === byKey[row.dataset.key]));
    };
    rows.forEach((row) => {
      const btn = $('.index__btn', row);
      btn.addEventListener('click', () => activate(row));
      btn.addEventListener('focus', () => activate(row));
      row.addEventListener('pointerenter', (e) => { if (e.pointerType === 'mouse') activate(row); });
    });
    let ticking = false;
    const pick = () => {
      ticking = false;
      const r0 = list.getBoundingClientRect();
      if (r0.bottom < 0 || r0.top > innerHeight) return;
      const line = innerWidth < 1024 ? innerHeight * 0.38 + 80 : innerHeight * 0.5;
      let best = null, d = Infinity;
      rows.forEach((row) => { const r = row.getBoundingClientRect(); const c = (r.top + Math.min(r.bottom, r.top + 58)) / 2; const dist = Math.abs(c - line); if (dist < d) { d = dist; best = row; } });
      if (best && d < innerHeight * 0.35) activate(best);
    };
    addEventListener('scroll', () => { if (!ticking) { ticking = true; requestAnimationFrame(pick); } }, { passive: true });
  })();

  /* ---------- Planer: Ferien × Alter -> Liste und Jahresband ---------- */
  (() => {
    const root = $('[data-planner]');
    if (!root) return;
    const state = { ferien: 'alle', alter: 'alle' };
    const items = $$('.menu-item[data-age]');
    const groups = $$('.menu-group:not([data-family])');
    const marks = $$('[data-yb]');
    const count = $('[data-count-out]');
    const empty = $('[data-empty]');
    const names = { fasching: 'Faschingsferien', ostern: 'Osterferien', pfingsten: 'Pfingstferien', sommer: 'Sommerferien', herbst: 'Herbstferien', wochenende: 'Wochenenden', regel: 'das ganze Jahr' };
    const fits = (el) => {
      const okF = state.ferien === 'alle' || el.dataset.ferien === state.ferien;
      const okA = state.alter === 'alle' || (el.dataset.age || '').split(' ').includes(state.alter);
      return okF && okA;
    };
    const apply = () => {
      let n = 0;
      items.forEach((it) => { const on = fits(it); it.hidden = !on; if (on) n++; });
      groups.forEach((g) => { g.hidden = !$$('.menu-item', g).some((it) => !it.hidden); });
      marks.forEach((m) => m.classList.toggle('is-dim', !fits(m)));
      empty.hidden = n > 0;
      if (state.ferien === 'alle' && state.alter === 'alle') count.innerHTML = `Alle <b>${n}</b> Angebote für Kinder, dazu Gutscheine und Ferienwohnungen für die ganze Familie.`;
      else {
        const f = state.ferien === 'alle' ? 'alle Ferien' : names[state.ferien];
        const a = state.alter === 'alle' ? 'jedes Alter' : `${state.alter.replace('-', ' bis ')} Jahre`;
        count.innerHTML = n ? `<b>${n}</b> ${n === 1 ? 'Angebot passt' : 'Angebote passen'}: ${f}, ${a}.` : `Nichts für ${f} und ${a}.`;
      }
      document.dispatchEvent(new CustomEvent('planner:change'));
    };
    $$('[data-seg]', root).forEach((seg) => {
      const key = seg.dataset.seg;
      $$('button', seg).forEach((b) => b.addEventListener('click', () => {
        state[key] = b.dataset.value;
        $$('button', seg).forEach((x) => x.setAttribute('aria-pressed', String(x === b)));
        apply();
      }));
    });
    apply();
    // Jahresband: Tipp per Tipp/Klick öffnen (Maus: hover), Tastatur über die Liste darunter
    let openMark = null;
    marks.forEach((m) => {
      if (m.tagName !== 'BUTTON') return;
      m.addEventListener('click', (e) => {
        e.stopPropagation();
        if (openMark && openMark !== m) openMark.classList.remove('is-open');
        m.classList.toggle('is-open'); openMark = m.classList.contains('is-open') ? m : null;
      });
    });
    document.addEventListener('click', () => { if (openMark) { openMark.classList.remove('is-open'); openMark = null; } });
  })();

  /* ---------- Anfrage-Links füllen das Formular vor ---------- */
  (() => {
    const sel = $('#f-angebot'), termin = $('#f-termin');
    if (sel) $$('[data-ask]').forEach((a) => a.addEventListener('click', () => {
      [...sel.options].forEach((o) => { if (o.text === a.dataset.ask) sel.value = o.text; });
      if (termin) termin.value = a.dataset.termin || '';
    }));
    const camp = $('#c-camp');
    if (camp) $$('[data-camp]').forEach((a) => a.addEventListener('click', () => {
      [...camp.options].forEach((o) => { if (o.text === a.dataset.camp) camp.value = o.text; });
    }));
  })();

  /* ---------- Formulare: prüfen, mailto bauen, ehrlicher Erfolgszustand ---------- */
  (() => {
    $$('form[data-form]').forEach((form) => {
      const to = 'info@pferdeglueck-pappenheimer.de';
      const done = form.parentElement.querySelector('[data-done]');
      const fields = $$('input, select, textarea', form);
      const wrap = (f) => f.closest('div, fieldset');
      const check = (f) => {
        let ok = true;
        if (f.required) {
          if (f.type === 'checkbox' || f.type === 'radio') ok = (f.name ? $$(`[name="${f.name}"]`, form) : [f]).some((x) => x.checked);
          else ok = f.value.trim() !== '';
        }
        if (ok && f.type === 'email' && f.value) ok = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(f.value);
        if (ok && f.type === 'number' && f.value) { const v = Number(f.value); ok = !(f.min && v < Number(f.min)) && !(f.max && v > Number(f.max)); }
        const w = wrap(f); if (w) w.classList.toggle('is-invalid', !ok);
        return ok;
      };
      fields.forEach((f) => f.addEventListener('input', () => { if (wrap(f) && wrap(f).classList.contains('is-invalid')) check(f); }));
      form.addEventListener('submit', (e) => {
        e.preventDefault();
        let first = null;
        fields.forEach((f) => { if (!check(f) && !first) first = f; });
        if (first) { first.focus(); return; }
        const kind = form.dataset.form;
        const lines = [];
        const labelOf = (f) => { const l = form.querySelector(`label[for="${f.id}"]`); return l ? l.textContent.trim().replace(/\s+/g, ' ') : f.name; };
        const seen = new Set();
        fields.forEach((f) => {
          if (f.type === 'checkbox') { if (f.name !== 'datenschutz') lines.push(`${labelOf(f)}: ${f.checked ? 'ja' : 'nein'}`); return; }
          if (f.type === 'radio') { if (seen.has(f.name)) return; seen.add(f.name); const c = form.querySelector(`[name="${f.name}"]:checked`); const fs = f.closest('fieldset'); lines.push(`${fs ? fs.querySelector('legend').textContent.trim() : f.name}: ${c ? c.value : '–'}`); return; }
          if (f.value.trim()) lines.push(`${labelOf(f)}: ${f.value.trim()}`);
        });
        const subject = kind === 'anmeldung'
          ? `Camp-Anmeldung: ${$('[name="camp"]', form)?.value || ''} – ${$('[name="kind"]', form)?.value || ''}`
          : `Anfrage ${$('[name="angebot"]', form)?.value || ''}${$('[name="termin"]', form)?.value ? ' – ' + $('[name="termin"]', form).value : ''}`;
        const body = `Hallo Pferdeglück-Team,\n\n${lines.join('\n')}\n\nViele Grüße`;
        location.href = `mailto:${to}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
        form.classList.add('is-sent');
        if (done) { done.classList.add('is-on'); done.focus(); done.scrollIntoView({ block: 'center', behavior: calm.matches ? 'auto' : 'smooth' }); }
      });
    });
  })();

  /* ---------- Nach dem Hero: Desktop-Leiste und Handy-Dock erscheinen beim Hochscrollen ---------- */
  (() => {
    const dock = $('[data-dock]'), bar = $('[data-bar]');
    if (!dock && !bar) return;
    let lastY = scrollY, on = false, upAcc = 0;
    const hero = $('.hero') || $('.sub');
    const heroH = () => (hero ? hero.offsetHeight : 400);
    const set = (v) => { if (v !== on) { on = v; dock && dock.classList.toggle('is-on', v); bar && bar.classList.toggle('is-on', v); } };
    addEventListener('scroll', () => {
      const y = scrollY;
      const nearEnd = y + innerHeight > document.body.scrollHeight - 500;
      const up = lastY - y;
      upAcc = up > 0 && up < 400 ? upAcc + up : 0;
      set(y > heroH() * 0.9 && upAcc > 80 && !nearEnd);
      lastY = y;
    }, { passive: true });
  })();

  /* ---------- Aktiver Link auf Unterseiten ---------- */
  (() => {
    const here = location.pathname.split('/').pop() || 'index.html';
    $$('.top__links a, .menu__list a').forEach((a) => {
      const href = a.getAttribute('href').split('#')[0];
      if (href && href === here && href !== 'index.html') a.setAttribute('aria-current', 'page');
    });
  })();
})();

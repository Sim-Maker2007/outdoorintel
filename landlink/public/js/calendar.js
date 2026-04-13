// Tiny availability calendar for LandLink.
// No dependencies. Renders a month grid, paints "blocked" / "booked" / "hold"
// cells from landlink_availability rows, and lets you select a date range.
//
// Usage:
//   import { mountCalendar } from '/public/js/calendar.js';
//   const cal = mountCalendar(container, {
//     blocks: [{ date_from: '2026-10-01', date_to: '2026-10-05', kind: 'booked' }],
//     onSelect: range => console.log(range),     // { from: 'YYYY-MM-DD', to: 'YYYY-MM-DD' }
//     minDate: '2026-04-01',
//     months: 2,                                 // how many months to render at once
//     mode: 'range'                              // 'range' | 'single' | 'blockout'
//   });
//   cal.setBlocks([...]);                         // re-paint after reload
//   cal.setRange({ from, to });                   // programmatic select

const ISO = d => d.toISOString().slice(0, 10);
const parse = s => { const [y, m, d] = s.split('-').map(Number); return new Date(Date.UTC(y, m - 1, d)); };
const addDays = (d, n) => { const x = new Date(d); x.setUTCDate(x.getUTCDate() + n); return x; };
const startOfMonth = d => new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), 1));
const addMonths = (d, n) => new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth() + n, 1));
const MONTH_NAMES = ['January','February','March','April','May','June','July','August','September','October','November','December'];
const MONTH_NAMES_FR = ['janvier','février','mars','avril','mai','juin','juillet','août','septembre','octobre','novembre','décembre'];
const DOW_EN = ['Su','Mo','Tu','We','Th','Fr','Sa'];
const DOW_FR = ['Di','Lu','Ma','Me','Je','Ve','Sa'];

export function mountCalendar(container, opts = {}) {
  const state = {
    blocks: opts.blocks || [],
    months: opts.months || 2,
    cursor: opts.cursor ? startOfMonth(parse(opts.cursor)) : startOfMonth(new Date()),
    minDate: opts.minDate ? parse(opts.minDate) : null,
    maxDate: opts.maxDate ? parse(opts.maxDate) : null,
    range: { from: null, to: null },
    mode: opts.mode || 'range',
    lang: opts.lang || 'en',
    onSelect: opts.onSelect || (() => {})
  };

  function isBlocked(iso) {
    return state.blocks.some(b =>
      (b.kind === 'blocked' || b.kind === 'booked') &&
      b.date_from <= iso && b.date_to >= iso
    );
  }
  function blockKind(iso) {
    for (const b of state.blocks) {
      if (b.date_from <= iso && b.date_to >= iso) return b.kind;
    }
    return null;
  }
  function isBelowMin(d) { return state.minDate && d < state.minDate; }
  function isAboveMax(d) { return state.maxDate && d > state.maxDate; }

  function render() {
    const mnames = state.lang === 'fr' ? MONTH_NAMES_FR : MONTH_NAMES;
    const dows = state.lang === 'fr' ? DOW_FR : DOW_EN;
    const prevLabel = state.lang === 'fr' ? '‹ Préc.' : '‹ Prev';
    const nextLabel = state.lang === 'fr' ? 'Suiv. ›' : 'Next ›';

    const months = [];
    for (let m = 0; m < state.months; m++) {
      const first = addMonths(state.cursor, m);
      const lastDay = new Date(Date.UTC(first.getUTCFullYear(), first.getUTCMonth() + 1, 0)).getUTCDate();
      const leadBlanks = first.getUTCDay(); // 0=Sun
      const cells = [];
      for (let i = 0; i < leadBlanks; i++) cells.push('<div class="llc-blank"></div>');
      for (let day = 1; day <= lastDay; day++) {
        const d = new Date(Date.UTC(first.getUTCFullYear(), first.getUTCMonth(), day));
        const iso = ISO(d);
        const kind = blockKind(iso);
        const disabled = isBlocked(iso) || isBelowMin(d) || isAboveMax(d);
        const classes = ['llc-cell'];
        if (disabled) classes.push('llc-disabled');
        if (kind === 'booked') classes.push('llc-booked');
        if (kind === 'blocked') classes.push('llc-blocked');
        if (kind === 'hold') classes.push('llc-hold');
        if (state.range.from && state.range.to && iso >= state.range.from && iso <= state.range.to) classes.push('llc-in-range');
        if (iso === state.range.from) classes.push('llc-range-start');
        if (iso === state.range.to) classes.push('llc-range-end');
        cells.push(`<div class="${classes.join(' ')}" data-iso="${iso}">${day}</div>`);
      }
      months.push(`
        <div class="llc-month">
          <div class="llc-month-head">${mnames[first.getUTCMonth()]} ${first.getUTCFullYear()}</div>
          <div class="llc-dow">${dows.map(d => `<div>${d}</div>`).join('')}</div>
          <div class="llc-grid">${cells.join('')}</div>
        </div>`);
    }

    container.innerHTML = `
      <div class="llc">
        <div class="llc-nav">
          <button type="button" class="llc-prev">${prevLabel}</button>
          <button type="button" class="llc-next">${nextLabel}</button>
        </div>
        <div class="llc-months">${months.join('')}</div>
        <div class="llc-legend">
          <span><i class="llc-sw llc-sw-avail"></i> ${state.lang === 'fr' ? 'Disponible' : 'Available'}</span>
          <span><i class="llc-sw llc-sw-booked"></i> ${state.lang === 'fr' ? 'Réservé' : 'Booked'}</span>
          <span><i class="llc-sw llc-sw-blocked"></i> ${state.lang === 'fr' ? 'Bloqué' : 'Blocked'}</span>
        </div>
      </div>`;

    container.querySelector('.llc-prev').onclick = () => { state.cursor = addMonths(state.cursor, -1); render(); };
    container.querySelector('.llc-next').onclick = () => { state.cursor = addMonths(state.cursor,  1); render(); };
    container.querySelectorAll('.llc-cell').forEach(el => {
      el.addEventListener('click', () => handleCellClick(el.dataset.iso, el));
    });
  }

  function handleCellClick(iso, el) {
    if (el.classList.contains('llc-disabled')) return;
    if (state.mode === 'single') {
      state.range = { from: iso, to: iso };
      state.onSelect({ ...state.range });
      render();
      return;
    }
    if (state.mode === 'blockout') {
      // two-click block-out: first click sets from, second sets to and fires
      if (!state.range.from || (state.range.from && state.range.to)) {
        state.range = { from: iso, to: null };
      } else if (iso >= state.range.from) {
        // Validate that no booked/blocked date lies inside the picked range
        if (!rangeClear(state.range.from, iso)) { alert('Range overlaps an existing booking/block.'); return; }
        state.range.to = iso;
        state.onSelect({ ...state.range });
      } else {
        state.range = { from: iso, to: null };
      }
      render();
      return;
    }
    // range mode (default for booking)
    if (!state.range.from || (state.range.from && state.range.to)) {
      state.range = { from: iso, to: null };
    } else if (iso >= state.range.from) {
      if (!rangeClear(state.range.from, iso)) { alert('Range overlaps an unavailable day.'); return; }
      state.range.to = iso;
      state.onSelect({ ...state.range });
    } else {
      state.range = { from: iso, to: null };
    }
    render();
  }

  function rangeClear(fromIso, toIso) {
    let d = parse(fromIso);
    const end = parse(toIso);
    while (d <= end) {
      if (isBlocked(ISO(d))) return false;
      d = addDays(d, 1);
    }
    return true;
  }

  render();

  return {
    setBlocks(blocks) { state.blocks = blocks || []; render(); },
    setRange(r) { state.range = { from: r?.from || null, to: r?.to || null }; render(); },
    getRange() { return { ...state.range }; },
    setCursor(iso) { state.cursor = startOfMonth(parse(iso)); render(); },
    destroy() { container.innerHTML = ''; }
  };
}

// LandLink availability calendar component
import { supabase } from './supabase-client.js';
import { esc } from './utils.js';

const DAYS = ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'];
const MONTHS = ['January','February','March','April','May','June','July','August','September','October','November','December'];

/**
 * Render an availability calendar into a container element.
 * @param {HTMLElement} container - DOM element to render into
 * @param {string} parcelId - UUID of the parcel
 * @param {object} opts - { seasonStart, seasonEnd, onSelect }
 */
export async function renderCalendar(container, parcelId, opts = {}) {
  const { seasonStart, seasonEnd, onSelect } = opts;
  const seasonFrom = seasonStart ? new Date(seasonStart + 'T00:00:00') : null;
  const seasonTo = seasonEnd ? new Date(seasonEnd + 'T00:00:00') : null;

  // Load blocked dates
  const { data: blocked } = await supabase
    .from('landlink_blocked_dates')
    .select('date_from, date_to, reason')
    .eq('parcel_id', parcelId);

  const blockedRanges = (blocked || []).map(b => ({
    from: new Date(b.date_from + 'T00:00:00'),
    to: new Date(b.date_to + 'T00:00:00'),
    reason: b.reason
  }));

  // Also load approved requests to block those dates
  const { data: approvedReqs } = await supabase
    .from('landlink_hunt_requests')
    .select('date_from, date_to')
    .eq('parcel_id', parcelId)
    .in('status', ['approved', 'completed']);

  const bookedRanges = (approvedReqs || []).map(r => ({
    from: new Date(r.date_from + 'T00:00:00'),
    to: new Date(r.date_to + 'T00:00:00'),
    reason: 'booking'
  }));

  const allBlocked = [...blockedRanges, ...bookedRanges];

  function isBlocked(date) {
    return allBlocked.some(r => date >= r.from && date <= r.to);
  }

  function inSeason(date) {
    if (!seasonFrom || !seasonTo) return true;
    return date >= seasonFrom && date <= seasonTo;
  }

  let currentMonth = new Date();
  currentMonth.setDate(1);
  // Start at season start if in future
  if (seasonFrom && seasonFrom > currentMonth) {
    currentMonth = new Date(seasonFrom);
    currentMonth.setDate(1);
  }

  let selectedFrom = null;
  let selectedTo = null;

  function render() {
    const year = currentMonth.getFullYear();
    const month = currentMonth.getMonth();
    const firstDay = new Date(year, month, 1).getDay();
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const today = new Date(); today.setHours(0,0,0,0);

    let html = `<div class="ll-calendar-nav">
      <button id="cal-prev">&larr;</button>
      <span>${MONTHS[month]} ${year}</span>
      <button id="cal-next">&rarr;</button>
    </div>`;

    html += '<div class="ll-calendar">';
    html += DAYS.map(d => `<div class="ll-calendar-head">${d}</div>`).join('');

    // Empty slots before first day
    for (let i = 0; i < firstDay; i++) {
      html += '<div class="ll-calendar-day outside"></div>';
    }

    for (let d = 1; d <= daysInMonth; d++) {
      const date = new Date(year, month, d);
      const isPast = date < today;
      const blocked = isBlocked(date);
      const outOfSeason = !inSeason(date);
      const isSelected = (selectedFrom && date >= selectedFrom && selectedTo && date <= selectedTo)
        || (selectedFrom && !selectedTo && date.getTime() === selectedFrom.getTime());

      let cls = 'll-calendar-day';
      if (isPast || blocked) cls += ' booked';
      else if (outOfSeason) cls += ' outside';
      else cls += ' available';
      if (isSelected) cls += ' selected';

      const title = blocked ? 'Booked' : outOfSeason ? 'Outside season' : isPast ? 'Past' : 'Available';
      html += `<div class="${cls}" data-date="${year}-${String(month+1).padStart(2,'0')}-${String(d).padStart(2,'0')}" title="${title}">${d}</div>`;
    }

    html += '</div>';

    if (selectedFrom) {
      html += `<div style="font-size:13px;color:var(--ink-soft);margin-top:8px">
        Selected: <strong>${fmt(selectedFrom)}</strong>${selectedTo ? ` \u2192 <strong>${fmt(selectedTo)}</strong>` : ' (click end date)'}
      </div>`;
    }

    container.innerHTML = html;

    container.querySelector('#cal-prev').addEventListener('click', () => {
      currentMonth.setMonth(currentMonth.getMonth() - 1);
      render();
    });
    container.querySelector('#cal-next').addEventListener('click', () => {
      currentMonth.setMonth(currentMonth.getMonth() + 1);
      render();
    });

    // Click available dates
    container.querySelectorAll('.ll-calendar-day.available').forEach(el => {
      el.addEventListener('click', () => {
        const dateStr = el.dataset.date;
        const date = new Date(dateStr + 'T00:00:00');
        if (!selectedFrom || (selectedFrom && selectedTo)) {
          selectedFrom = date;
          selectedTo = null;
        } else {
          if (date < selectedFrom) {
            selectedTo = selectedFrom;
            selectedFrom = date;
          } else {
            selectedTo = date;
          }
          // Check no blocked dates in range
          let d = new Date(selectedFrom);
          while (d <= selectedTo) {
            if (isBlocked(d)) {
              selectedFrom = null; selectedTo = null;
              break;
            }
            d.setDate(d.getDate() + 1);
          }
        }
        render();
        if (onSelect && selectedFrom) {
          onSelect(fmt(selectedFrom), selectedTo ? fmt(selectedTo) : null);
        }
      });
    });
  }

  function fmt(d) {
    return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
  }

  render();
}

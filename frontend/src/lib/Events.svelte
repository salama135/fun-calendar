<script>
  import { onMount } from 'svelte';
  import { getLocalDateStr, showToast, MNS, DNS } from './utils';

  const EVENT_EMOJIS = ['🏃‍♂️', '👟', '📅', '🎉', '✈️', '🍽️', '🏋️‍♀️', '📚', '💼', '🛒', '💊', '🎂', '🎈', '🎥', '🧼', '🚗'];

  let events = [];
  let eventsView = 'week';
  let eventsBaseDate = new Date();
  let showModal = false;
  let showDetailsModal = false;
  let editingEventId = null;
  let selectedEvent = null;

  let form = {
    title: '', date: '', isAllDay: false, time: '', endTime: '',
    location: '', description: '', emoji: EVENT_EMOJIS[0]
  };

  onMount(() => {
    const saved = localStorage.getItem('fun-events');
    if (saved) events = JSON.parse(saved);
  });

  function saveEvents() {
    localStorage.setItem('fun-events', JSON.stringify(events));
    events = [...events]; // trigger reactivity
  }

  function openNewForm(dateStr) {
    editingEventId = null;
    form = {
      title: '', date: dateStr || getLocalDateStr(), isAllDay: false,
      time: '', endTime: '', location: '', description: '', emoji: EVENT_EMOJIS[0]
    };
    showModal = true;
  }

  function submitForm() {
    if (!form.title || !form.date) return showToast('Title and Date required');

    if (editingEventId) {
      const idx = events.findIndex(e => e.id === editingEventId);
      events[idx] = { ...events[idx], ...form };
      showToast('Event updated! ✨');
    } else {
      events.push({ id: Date.now().toString(), ...form });
      showToast('Event added! 🗓️');
    }
    saveEvents();
    showModal = false;
  }

  function openDetails(e) {
    selectedEvent = e;
    showDetailsModal = true;
  }

  function deleteEvent(id) {
    if (confirm('Delete this event?')) {
      events = events.filter(e => e.id !== id);
      saveEvents();
      showDetailsModal = false;
    }
  }

  function editEvent(e) {
    editingEventId = e.id;
    form = { ...e };
    showDetailsModal = false;
    showModal = true;
  }

  function moveRange(dir) {
    const d = new Date(eventsBaseDate);
    if (eventsView === 'week') d.setDate(d.getDate() + dir * 7);
    else d.setMonth(d.getMonth() + dir);
    eventsBaseDate = d;
  }

  $: upcoming = events
    .filter(e => new Date(e.date) >= new Date().setHours(0,0,0,0))
    .sort((a,b) => new Date(a.date) - new Date(b.date));

  $: weekDays = (() => {
    const start = new Date(eventsBaseDate);
    start.setDate(start.getDate() - start.getDay());
    return Array.from({length: 7}, (_, i) => {
      const d = new Date(start);
      d.setDate(start.getDate() + i);
      const ds = getLocalDateStr(d);
      return { date: d, ds, events: events.filter(e => e.date === ds) };
    });
  })();

  $: monthCells = (() => {
    const y = eventsBaseDate.getFullYear(), m = eventsBaseDate.getMonth();
    const first = new Date(y, m, 1).getDay(), days = new Date(y, m + 1, 0).getDate();
    const cells = [];
    for (let i = 0; i < first; i++) cells.push(null);
    for (let d = 1; d <= days; d++) {
      const ds = `${y}-${String(m+1).padStart(2,'0')}-${String(d).padStart(2,'0')}`;
      cells.push({ day: d, ds, events: events.filter(e => e.date === ds) });
    }
    return cells;
  })();
</script>

<div id="events-sidebar">
  <div class="panel-header">
    <h2>Upcoming</h2>
    <button class="tbtn" on:click={() => openNewForm()}><span class="material-symbols-rounded">add</span></button>
  </div>
  <div id="events-list">
    {#each upcoming as e}
      <div class="dc event-item" on:click={() => openDetails(e)}>
        <span class="emoji">{e.emoji}</span>
        <div class="info">
          <div class="title">{e.title}</div>
          <div class="meta">{e.date} {e.isAllDay ? 'All-day' : (e.time || '')}</div>
        </div>
        <button class="tbtn del" on:click|stopPropagation={() => deleteEvent(e.id)}>
          <span class="material-symbols-rounded">delete</span>
        </button>
      </div>
    {:else}
      <div class="empty">No upcoming events.</div>
    {/each}
  </div>
</div>

<div id="events-main">
  <div class="panel-header">
    <div class="view-controls">
      <h2>{eventsView === 'week' ? 'Weekly View' : 'Monthly View'}</h2>
      <div class="toggle-group">
        <button class:on={eventsView === 'week'} on:click={() => eventsView = 'week'}>Week</button>
        <button class:on={eventsView === 'month'} on:click={() => eventsView = 'month'}>Month</button>
      </div>
    </div>
    <div class="nav-controls">
      <button class="tbtn" on:click={() => moveRange(-1)}><span class="material-symbols-rounded">chevron_left</span></button>
      <button class="tbtn" on:click={() => moveRange(1)}><span class="material-symbols-rounded">chevron_right</span></button>
    </div>
  </div>
  <div id="events-content">
    {#if eventsView === 'week'}
      <div class="week-grid">
        {#each weekDays as day}
          <div class="day-col" class:today={day.ds === getLocalDateStr()} on:click={() => openNewForm(day.ds)}>
            <div class="day-header">
              <div class="day-name">{DNS[day.date.getDay()].substring(0,3)}</div>
              <div class="day-num">{day.date.getDate()}</div>
            </div>
            <div class="day-events">
              {#each day.events as e}
                <div class="event-pill" on:click|stopPropagation={() => openDetails(e)}>
                  <span>{e.emoji}</span> {e.title}
                </div>
              {/each}
            </div>
          </div>
        {/each}
      </div>
    {:else}
      <div class="month-grid">
        {#each ['Sun','Mon','Tue','Wed','Thu','Fri','Sat'] as h}
          <div class="header">{h}</div>
        {/each}
        {#each monthCells as cell}
          {#if cell}
            <div class="cell" class:today={cell.ds === getLocalDateStr()} on:click={() => openNewForm(cell.ds)}>
              <div class="num">{cell.day}</div>
              <div class="indicators">
                {#each cell.events as e}
                  <div class="marker" on:click|stopPropagation={() => openDetails(e)} title={e.title}>{e.emoji}</div>
                {/each}
              </div>
            </div>
          {:else}
            <div class="cell empty"></div>
          {/if}
        {/each}
      </div>
    {/if}
  </div>
</div>

{#if showModal}
  <div class="modal-overlay" on:click|self={() => showModal = false}>
    <div class="modal-content">
      <div class="modal-header">
        <h3>{editingEventId ? 'Edit Event' : 'Add New Event'}</h3>
      </div>
      <div class="modal-body">
        <div class="field">
          <label>EVENT TITLE</label>
          <input type="text" bind:value={form.title} placeholder="e.g. Marathon Training">
        </div>
        <div class="row">
          <div class="field">
            <label>DATE</label>
            <input type="date" bind:value={form.date}>
          </div>
          <div class="field">
            <label class="time-label">
              TIME
              <span><input type="checkbox" bind:checked={form.isAllDay}> All-day</span>
            </label>
            <div class="time-inputs" class:hidden={form.isAllDay}>
              <input type="time" bind:value={form.time}> <span>to</span> <input type="time" bind:value={form.endTime}>
            </div>
          </div>
        </div>
        <div class="field">
          <label>LOCATION</label>
          <input type="text" bind:value={form.location} placeholder="Address or Place">
        </div>
        <div class="field">
          <label>DESCRIPTION</label>
          <textarea bind:value={form.description} placeholder="Notes..."></textarea>
        </div>
        <div class="field">
          <label>EMOJI</label>
          <div class="emoji-picker">
            {#each EVENT_EMOJIS as e}
              <button class="sticker-btn" class:on={form.emoji === e} on:click={() => form.emoji = e}>{e}</button>
            {/each}
          </div>
        </div>
      </div>
      <div class="modal-footer">
        <button class="tbtn" on:click={() => showModal = false}>Cancel</button>
        <button class="svbtn" on:click={submitForm}>{editingEventId ? 'Update' : 'Add'}</button>
      </div>
    </div>
  </div>
{/if}

{#if showDetailsModal && selectedEvent}
  <div class="modal-overlay" on:click|self={() => showDetailsModal = false}>
    <div class="modal-content detail-modal">
      <div class="modal-header">
        <h3>{selectedEvent.title}</h3>
        <button class="tbtn" on:click={() => showDetailsModal = false}>×</button>
      </div>
      <div class="modal-body">
        <div class="hero">
          <div class="emoji-box">{selectedEvent.emoji}</div>
          <div>
            <div class="date">{selectedEvent.date}</div>
            <div class="time">{selectedEvent.isAllDay ? 'All-day' : (selectedEvent.time + (selectedEvent.endTime ? ' - ' + selectedEvent.endTime : ''))}</div>
          </div>
        </div>
        {#if selectedEvent.location}
          <div class="detail-sec">
            <label>LOCATION</label>
            <div>{selectedEvent.location}</div>
          </div>
        {/if}
        {#if selectedEvent.description}
          <div class="detail-sec">
            <label>DESCRIPTION</label>
            <div class="desc">{selectedEvent.description}</div>
          </div>
        {/if}
      </div>
      <div class="modal-footer">
        <button class="tbtn edit" on:click={() => editEvent(selectedEvent)}>Edit</button>
        <button class="tbtn del" on:click={() => deleteEvent(selectedEvent.id)}>Delete</button>
      </div>
    </div>
  </div>
{/if}

<style>
  #events-sidebar { flex: 0 0 298px; display: flex; flex-direction: column; border: 0.5px solid var(--color-border-tertiary); border-radius: var(--border-radius-lg); background: var(--color-background-primary); overflow: hidden; }
  #events-main { flex: 1; display: flex; flex-direction: column; border: 0.5px solid var(--color-border-tertiary); border-radius: var(--border-radius-lg); background: var(--color-background-primary); overflow: hidden; }

  .panel-header { padding: var(--space-md) var(--space-lg); border-bottom: 0.5px solid var(--color-border-tertiary); background: var(--color-background-secondary); display: flex; justify-content: space-between; align-items: center; }
  .panel-header h2 { font-size: var(--fs-lg); font-family: var(--font-display); color: var(--color-primary); margin: 0; }

  #events-list { flex: 1; overflow-y: auto; padding: var(--space-sm); }
  .event-item { margin-bottom: var(--space-sm); padding: var(--space-sm) var(--space-md); flex-direction: row; align-items: center; gap: var(--space-sm); }
  .event-item .emoji { font-size: 20px; }
  .event-item .info { flex: 1; overflow: hidden; }
  .event-item .title { font-weight: 700; font-size: var(--fs-sm); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
  .event-item .meta { font-size: 10px; color: var(--color-text-tertiary); }
  .event-item .del { border: none; color: var(--color-error); }

  .view-controls { display: flex; gap: var(--space-sm); align-items: center; }
  .toggle-group { display: flex; background: var(--color-neutral-border-light); padding: 2px; border-radius: 6px; }
  .toggle-group button { padding: 4px 8px; border: none; font-size: var(--fs-xs); background: transparent; cursor: pointer; border-radius: 4px; }
  .toggle-group button.on { background: var(--color-primary-light); color: var(--color-primary-dark); font-weight: 700; }

  .nav-controls { display: flex; gap: var(--space-sm); }

  #events-content { flex: 1; overflow: auto; padding: var(--space-lg); }

  .week-grid { display: grid; grid-template-columns: repeat(7, 1fr); gap: var(--space-md); height: 100%; }
  .day-col { display: flex; flex-direction: column; border: 1px solid var(--color-border-tertiary); border-radius: var(--border-radius-md); overflow: hidden; cursor: pointer; }
  .day-col.today { background: var(--color-neutral-bg-secondary); }
  .day-header { padding: var(--space-sm); text-align: center; border-bottom: 1px solid var(--color-border-tertiary); background: var(--color-background-secondary); }
  .day-name { font-size: 10px; font-weight: 700; color: var(--color-text-tertiary); text-transform: uppercase; }
  .day-num { font-size: var(--fs-md); font-weight: 800; }
  .day-col.today .day-num { color: var(--color-primary); }
  .day-events { flex: 1; padding: var(--space-xs); display: flex; flex-direction: column; gap: 4px; }
  .event-pill { font-size: 11px; padding: 4px; background: var(--color-background-secondary); border-radius: 4px; border-left: 3px solid var(--color-primary); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }

  .month-grid { display: grid; grid-template-columns: repeat(7, 1fr); gap: 4px; height: 100%; }
  .month-grid .header { text-align: center; font-size: 10px; font-weight: 700; color: var(--color-text-tertiary); }
  .cell { border: 0.5px solid var(--color-border-tertiary); border-radius: 4px; min-height: 60px; padding: 2px; cursor: pointer; }
  .cell.today { background: var(--color-neutral-bg-secondary); }
  .cell .num { font-size: 10px; font-weight: 700; color: var(--color-text-tertiary); }
  .cell.today .num { color: var(--color-primary); }
  .indicators { display: flex; flex-wrap: wrap; gap: 2px; margin-top: 2px; }
  .marker { background: var(--color-background-secondary); border: 0.5px solid var(--color-border-tertiary); border-radius: 4px; width: 22px; height: 22px; display: flex; align-items: center; justify-content: center; font-size: 14px; }

  .modal-overlay { position: fixed; top: 0; left: 0; width: 100%; height: 100%; background: rgba(0,0,0,0.5); z-index: 1000; display: flex; align-items: center; justify-content: center; padding: var(--space-md); }
  .modal-content { background: var(--color-background-primary); border-radius: var(--border-radius-lg); width: 100%; max-width: 400px; overflow: hidden; }
  .modal-body { padding: var(--space-lg); display: flex; flex-direction: column; gap: var(--space-md); }
  .field label { display: block; font-size: var(--fs-xs); font-weight: 700; color: var(--color-text-secondary); margin-bottom: 4px; }
  .field input, .field textarea { width: 100%; }
  .row { display: flex; gap: var(--space-md); }
  .row .field { flex: 1; }
  .time-label { display: flex; justify-content: space-between; align-items: center; }
  .time-inputs { display: flex; align-items: center; gap: 4px; }
  .time-inputs.hidden { visibility: hidden; }
  .emoji-picker { display: grid; grid-template-columns: repeat(8, 1fr); gap: var(--space-xs); }
  .modal-footer { padding: var(--space-lg); background: var(--color-background-secondary); border-top: 0.5px solid var(--color-border-tertiary); display: flex; gap: var(--space-md); justify-content: flex-end; }

  .hero { display: flex; align-items: center; gap: var(--space-md); }
  .emoji-box { font-size: 48px; background: var(--color-background-secondary); width: 80px; height: 80px; display: flex; align-items: center; justify-content: center; border-radius: 12px; border: 1px solid var(--color-border-tertiary); }
  .date { font-weight: 700; font-size: var(--fs-md); }
  .detail-sec label { display: block; font-size: var(--fs-xs); font-weight: 700; color: var(--color-text-secondary); margin-bottom: 4px; text-transform: uppercase; }
  .desc { background: var(--color-background-secondary); padding: var(--space-sm); border-radius: var(--border-radius-md); white-space: pre-wrap; font-size: var(--fs-sm); }
</style>

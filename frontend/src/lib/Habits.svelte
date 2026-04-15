<script>
  import { onMount } from 'svelte';
  import { getLocalDateStr, showToast, MNS, COLS } from './utils';

  let habits = [];
  let habitCompletions = {};
  let activeHabitId = null;
  let heatmapFilter = 'all';
  let showModal = false;
  let selectedColor = COLS[1];

  let form = {
    name: '', start: getLocalDateStr(), duration: '1m', category: 'other', time: ''
  };

  onMount(() => {
    try {
      habits = JSON.parse(localStorage.getItem('fun-habits')) || [];
      habitCompletions = JSON.parse(localStorage.getItem('fun-habit-completions')) || {};
    } catch (e) {}
  });

  function save() {
    localStorage.setItem('fun-habits', JSON.stringify(habits));
    localStorage.setItem('fun-habit-completions', JSON.stringify(habitCompletions));
    habits = [...habits];
  }

  function openNewForm() {
    form = { name: '', start: getLocalDateStr(), duration: '1m', category: 'other', time: '' };
    selectedColor = COLS[1];
    showModal = true;
  }

  function createHabit() {
    if (!form.name) return showToast('Name required');

    const startDate = new Date(form.start);
    const endDate = new Date(startDate);
    if (form.duration === '7d') endDate.setDate(startDate.getDate() + 7);
    else if (form.duration === '10d') endDate.setDate(startDate.getDate() + 10);
    else if (form.duration === '1m') endDate.setMonth(startDate.getMonth() + 1);
    else if (form.duration === '2m') endDate.setMonth(startDate.getMonth() + 2);
    else if (form.duration === '1y') endDate.setFullYear(startDate.getFullYear() + 1);

    const newHabit = {
      id: Date.now().toString(),
      ...form,
      end: getLocalDateStr(endDate),
      color: selectedColor,
      createdAt: new Date().toISOString()
    };

    habits.push(newHabit);
    save();
    showModal = false;
    activeHabitId = newHabit.id;
    showToast('Habit created! 🚀');
  }

  function toggleCompletion(habitId, dateStr) {
    if (!habitCompletions[habitId]) habitCompletions[habitId] = {};
    if (habitCompletions[habitId][dateStr]) {
      delete habitCompletions[habitId][dateStr];
    } else {
      const note = prompt('Add a note (optional):', '');
      habitCompletions[habitId][dateStr] = { completed: true, note: note || '', timestamp: new Date().toISOString() };
      showToast('Task completed! 🌟');
    }
    save();
    habitCompletions = {...habitCompletions};
  }

  function deleteHabit() {
    if (confirm('Delete this habit and all progress?')) {
      habits = habits.filter(h => h.id !== activeHabitId);
      delete habitCompletions[activeHabitId];
      save();
      activeHabitId = null;
      showToast('Habit deleted');
    }
  }

  function getWeekNumber(d) {
    const date = new Date(d.getTime());
    date.setHours(0, 0, 0, 0);
    date.setDate(date.getDate() + 3 - (date.getDay() + 6) % 7);
    const week1 = new Date(date.getFullYear(), 0, 4);
    return 1 + Math.round(((date.getTime() - week1.getTime()) / 86400000 - 3 + (week1.getDay() + 6) % 7) / 7);
  }

  $: activeHabit = habits.find(h => h.id === activeHabitId);

  $: heatmapData = (() => {
    if (!activeHabit) return [];
    let start = new Date(activeHabit.start);
    let end = new Date(activeHabit.end);
    const today = new Date();

    if (heatmapFilter === 'month') {
      start = new Date(today.getFullYear(), today.getMonth(), 1);
      end = new Date(today.getFullYear(), today.getMonth() + 1, 0);
    } else if (heatmapFilter === 'week') {
      start = new Date(today);
      start.setDate(today.getDate() - today.getDay());
      end = new Date(start);
      end.setDate(start.getDate() + 6);
    }

    const cells = [];
    let curr = new Date(start);
    curr.setDate(curr.getDate() - curr.getDay());
    const last = new Date(end);
    last.setDate(last.getDate() + (6 - last.getDay()));

    while (curr <= last) {
      const ds = getLocalDateStr(curr);
      cells.push({
        date: new Date(curr),
        ds,
        isWithinRange: curr >= start && curr <= end,
        completed: habitCompletions[activeHabitId]?.[ds]
      });
      curr.setDate(curr.getDate() + 1);
    }
    return cells;
  })();

  $: stats = (() => {
    if (!activeHabit) return null;
    const comps = habitCompletions[activeHabitId] || {};
    const totalComps = Object.keys(comps).length;
    const start = new Date(activeHabit.start);
    const end = new Date(activeHabit.end);
    const totalDays = Math.ceil((end - start) / 86400000) + 1;
    const progress = Math.min(100, Math.round((totalComps / totalDays) * 100));

    let streak = 0;
    let d = new Date();
    const todayStr = getLocalDateStr(d);
    while (true) {
      const ds = getLocalDateStr(d);
      if (comps[ds]) { streak++; d.setDate(d.getDate() - 1); }
      else if (ds === todayStr) { d.setDate(d.getDate() - 1); }
      else break;
    }

    return { progress, totalComps, totalDays, streak };
  })();
</script>

<div id="habit-list-panel">
  <div class="panel-header">
    <h2>My Habits</h2>
    <button class="tbtn" on:click={openNewForm}><span class="material-symbols-rounded">add</span></button>
  </div>
  <div class="habit-items">
    {#each habits as h}
      <div class="dc habit-item" class:sel={activeHabitId === h.id} style="border-left: 4px solid {h.color}" on:click={() => activeHabitId = h.id}>
        <div class="info">
          <div class="name">{h.name}</div>
          <div class="time">{h.time || 'No reminder'}</div>
        </div>
      </div>
    {:else}
      <div class="empty-msg">No habits yet. Click + to start!</div>
    {/each}
  </div>
</div>

<div id="habit-detail-panel">
  {#if activeHabit}
    <div class="panel-header">
      <h2 style="color: {activeHabit.color}">{activeHabit.name}</h2>
      <div class="actions">
        <button class="tbtn del" on:click={deleteHabit}><span class="material-symbols-rounded">delete</span></button>
        <button class="tbtn" on:click={() => activeHabitId = null}><span class="material-symbols-rounded">close</span></button>
      </div>
    </div>
    <div class="heatmap-container">
      <div class="filters">
        <button class="tbtn" class:on={heatmapFilter === 'all'} on:click={() => heatmapFilter = 'all'}>All Time</button>
        <button class="tbtn" class:on={heatmapFilter === 'month'} on:click={() => heatmapFilter = 'month'}>Current Month</button>
        <button class="tbtn" class:on={heatmapFilter === 'week'} on:click={() => heatmapFilter = 'week'}>Current Week</button>
      </div>

      {#if stats}
        <div class="stats-bar">
          <div class="progress-box">
            <svg width="80" height="80">
              <circle stroke="var(--color-border-tertiary)" stroke-width="8" fill="transparent" r="30" cx="40" cy="40"/>
              <circle class="progress-ring__circle" stroke={activeHabit.color} stroke-width="8" stroke-dasharray="188.5 188.5" style="stroke-dashoffset: {188.5 - (stats.progress / 100) * 188.5}" fill="transparent" r="30" cx="40" cy="40"/>
              <text x="40" y="45" text-anchor="middle" font-size="14" font-weight="700" fill="var(--color-text-primary)">{stats.progress}%</text>
            </svg>
            <div class="labels">
              <div class="lab">PROGRESS</div>
              <div class="val">{stats.totalComps} / {stats.totalDays} days</div>
            </div>
          </div>
          <div class="stat">
            <div class="lab">STREAK</div>
            <div class="val streak">{stats.streak} days</div>
          </div>
          <div class="stat">
            <div class="lab">CATEGORY</div>
            <div class="val cat">{activeHabit.category}</div>
          </div>
        </div>
      {/if}

      <div class="heatmap-grid">
        <div class="grid-header"></div>
        {#each ['S','M','T','W','T','F','S'] as d}
          <div class="grid-header">{d}</div>
        {/each}

        {#each heatmapData as cell}
          {#if cell.date.getDay() === 0}
             <div class="week-num">W{getWeekNumber(cell.date)}</div>
          {/if}
          <div class="cell" class:dim={!cell.isWithinRange} class:done={cell.completed} class:today={cell.ds === getLocalDateStr()} style="--h-color: {activeHabit.color}" on:click={() => cell.isWithinRange && toggleCompletion(activeHabit.id, cell.ds)}>
            {cell.date.getDate()}
          </div>
        {/each}
      </div>
    </div>
  {:else}
    <div class="empty-state">
      <span class="material-symbols-rounded">track_changes</span>
      <p>Select a habit to view progress</p>
    </div>
  {/if}
</div>

{#if showModal}
  <div class="modal-overlay" on:click|self={() => showModal = false}>
    <div class="modal-content">
      <div class="modal-header"><h3>Create New Habit</h3></div>
      <div class="modal-body">
        <div class="field">
          <label>HABIT NAME</label>
          <input type="text" bind:value={form.name} placeholder="e.g. Take Medicine">
        </div>
        <div class="row">
          <div class="field">
            <label>START DATE</label>
            <input type="date" bind:value={form.start}>
          </div>
          <div class="field">
            <label>DURATION</label>
            <select bind:value={form.duration}>
              <option value="7d">1 week</option>
              <option value="10d">10 days</option>
              <option value="1m">1 month</option>
              <option value="2m">2 months</option>
              <option value="1y">1 year</option>
            </select>
          </div>
        </div>
        <div class="row">
          <div class="field">
            <label>CATEGORY</label>
            <select bind:value={form.category}>
              <option value="health">Health</option>
              <option value="exercise">Exercise</option>
              <option value="learning">Learning</option>
              <option value="other">Other</option>
            </select>
          </div>
          <div class="field">
            <label>REMINDER TIME</label>
            <input type="time" bind:value={form.time}>
          </div>
        </div>
        <div class="field">
          <label>COLOR</label>
          <div class="color-picker">
            {#each COLS as c}
              <div class="csw" class:on={selectedColor === c} style="background: {c}" on:click={() => selectedColor = c}></div>
            {/each}
          </div>
        </div>
      </div>
      <div class="modal-footer">
        <button class="tbtn" on:click={() => showModal = false}>Cancel</button>
        <button class="svbtn" on:click={createHabit}>Create Habit</button>
      </div>
    </div>
  </div>
{/if}

<style>
  #habit-list-panel { flex: 0 0 298px; display: flex; flex-direction: column; border: 0.5px solid var(--color-border-tertiary); border-radius: var(--border-radius-lg); background: var(--color-background-primary); overflow: hidden; }
  #habit-detail-panel { flex: 1; display: flex; flex-direction: column; border: 0.5px solid var(--color-border-tertiary); border-radius: var(--border-radius-lg); background: var(--color-background-primary); overflow: hidden; min-height: 0; }

  .panel-header { padding: var(--space-md) var(--space-lg); border-bottom: 0.5px solid var(--color-border-tertiary); background: var(--color-background-secondary); display: flex; justify-content: space-between; align-items: center; }
  .panel-header h2 { font-size: var(--fs-lg); font-family: var(--font-display); color: var(--color-primary); margin: 0; }

  .habit-items { flex: 1; overflow-y: auto; padding: var(--space-sm); }
  .habit-item { margin-bottom: var(--space-sm); padding: var(--space-md); flex-direction: row; align-items: center; gap: var(--space-md); }
  .habit-item .name { font-weight: 700; color: var(--color-text-primary); }
  .habit-item .time { font-size: var(--fs-xs); color: var(--color-text-secondary); }

  .heatmap-container { flex: 1; overflow: auto; padding: var(--space-lg); display: flex; flex-direction: column; gap: var(--space-lg); }
  .filters { display: flex; gap: var(--space-sm); flex-wrap: wrap; }

  .stats-bar { display: flex; gap: var(--space-xl); padding: var(--space-md); background: var(--color-background-secondary); border-radius: var(--border-radius-md); }
  .progress-box { display: flex; align-items: center; gap: var(--space-md); }
  .progress-box .lab { font-size: var(--fs-xs); color: var(--color-text-secondary); font-weight: 700; }
  .progress-box .val { font-size: var(--fs-xs); color: var(--color-text-tertiary); }
  .stat .lab { font-size: var(--fs-xs); color: var(--color-text-secondary); font-weight: 700; }
  .stat .val { font-size: var(--fs-xl); font-weight: 700; color: var(--color-secondary); }
  .stat .val.cat { font-size: var(--fs-base); color: var(--color-text-primary); text-transform: capitalize; }

  .heatmap-grid { display: grid; grid-template-columns: 40px repeat(7, 1fr); gap: 4px; margin-top: var(--space-md); }
  .grid-header { text-align: center; font-size: 10px; font-weight: 700; color: var(--color-text-tertiary); }
  .week-num { display: flex; align-items: center; justify-content: center; font-size: 9px; color: var(--color-text-tertiary); font-weight: 600; }
  .cell { aspect-ratio: 1; border-radius: 4px; border: 0.5px solid var(--color-border-tertiary); cursor: pointer; display: flex; align-items: center; justify-content: center; font-size: 10px; font-weight: 700; }
  .cell.dim { opacity: 0.1; pointer-events: none; }
  .cell.done { background: var(--h-color); color: white; border-color: var(--h-color); }
  .cell.today { box-shadow: 0 0 0 2px var(--color-primary); }

  .empty-state { flex: 1; display: flex; align-items: center; justify-content: center; flex-direction: column; gap: 10px; color: var(--color-text-tertiary); }
  .empty-state p { color: var(--color-text-secondary); font-weight: 600; }

  .modal-overlay { position: fixed; top: 0; left: 0; width: 100%; height: 100%; background: rgba(0,0,0,0.5); z-index: 1000; display: flex; align-items: center; justify-content: center; padding: var(--space-md); }
  .modal-content { background: var(--color-background-primary); border-radius: var(--border-radius-lg); width: 100%; max-width: 400px; overflow: hidden; }
  .modal-body { padding: var(--space-lg); display: flex; flex-direction: column; gap: var(--space-md); }
  .field label { display: block; font-size: var(--fs-xs); font-weight: 700; color: var(--color-text-secondary); margin-bottom: 4px; }
  .field input, .field select { width: 100%; }
  .row { display: flex; gap: var(--space-md); }
  .row .field { flex: 1; }
  .color-picker { display: flex; gap: var(--space-xs); flex-wrap: wrap; }
  .modal-footer { padding: var(--space-lg); background: var(--color-background-secondary); border-top: 0.5px solid var(--color-border-tertiary); display: flex; gap: var(--space-md); justify-content: flex-end; }

  @media(max-width:1023px) {
    #habit-list-panel { flex: 0 0 auto; }
  }
</style>

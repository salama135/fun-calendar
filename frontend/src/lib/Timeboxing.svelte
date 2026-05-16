<script>
  import { onMount } from 'svelte';
  import { getLocalDateStr, DNS } from './utils';

  let view = 'daily'; // 'daily' or 'weekly'
  let selectedDate = getLocalDateStr();

  // Data structure for daily/weekly plans
  // key: date string or "W-YYYY-WW"
  let data = JSON.parse(localStorage.getItem('fun-timeboxing') || '{}');

  function saveData() {
    data = data; // Trigger reactivity
    localStorage.setItem('fun-timeboxing', JSON.stringify(data));
  }

  function getWeekKey(date) {
    const d = new Date(date);
    const dayNum = d.getUTCDay() || 7;
    d.setUTCDate(d.getUTCDate() + 4 - dayNum);
    const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
    const weekNo = Math.ceil((((d - yearStart) / 86400000) + 1) / 7);
    return `W-${d.getUTCFullYear()}-${weekNo}`;
  }

  $: currentKey = view === 'daily' ? selectedDate : getWeekKey(selectedDate);
  $: currentData = data[currentKey] || { priorities: [], backlog: [], timeboxes: [] };

  function addPriority() {
    if (!data[currentKey]) data[currentKey] = { priorities: [], backlog: [], timeboxes: [] };
    data[currentKey].priorities = [...data[currentKey].priorities, { id: Date.now(), text: '', completed: false, subtasks: [] }];
    saveData();
  }

  function addBacklog() {
    if (!data[currentKey]) data[currentKey] = { priorities: [], backlog: [], timeboxes: [] };
    data[currentKey].backlog = [...data[currentKey].backlog, { id: Date.now(), text: '', completed: false }];
    saveData();
  }

  function toggleComplete(list, id) {
    data[currentKey][list] = data[currentKey][list].map(t => t.id === id ? { ...t, completed: !t.completed } : t);
    saveData();
  }

  function updateText(list, id, text) {
    data[currentKey][list] = data[currentKey][list].map(t => t.id === id ? { ...t, text } : t);
    saveData();
  }

  function addSubtask(taskId) {
    data[currentKey].priorities = data[currentKey].priorities.map(t => {
      if (t.id === taskId) {
        return { ...t, subtasks: [...t.subtasks, { id: Date.now(), text: '', completed: false }] };
      }
      return t;
    });
    saveData();
  }

  function toggleSubtask(taskId, subId) {
    data[currentKey].priorities = data[currentKey].priorities.map(t => {
      if (t.id === taskId) {
        return { ...t, subtasks: t.subtasks.map(s => s.id === subId ? { ...s, completed: !s.completed } : s) };
      }
      return t;
    });
    saveData();
  }

  function updateSubtaskText(taskId, subId, text) {
    data[currentKey].priorities = data[currentKey].priorities.map(t => {
      if (t.id === taskId) {
        return { ...t, subtasks: t.subtasks.map(s => s.id === subId ? { ...s, text } : s) };
      }
      return t;
    });
    saveData();
  }

  function importFromWeekly() {
    const weekKey = getWeekKey(selectedDate);
    const weeklyData = data[weekKey];
    if (weeklyData && weeklyData.priorities.length > 0) {
      if (!data[selectedDate]) data[selectedDate] = { priorities: [], backlog: [], timeboxes: [] };
      // Deep copy priorities and subtasks to daily, reset completion
      const imported = weeklyData.priorities.map(p => ({
        ...p,
        id: Date.now() + Math.random(),
        completed: false,
        subtasks: (p.subtasks || []).map(s => ({ ...s, id: Date.now() + Math.random(), completed: false }))
      }));
      data[selectedDate].priorities = [...data[selectedDate].priorities, ...imported];
      saveData();
    }
  }

  // Timeboxing Logic
  let hours = Array.from({ length: 18 }, (_, i) => i + 6); // 6 AM to 11 PM

  function addTimebox(hour, dayIndex = null) {
    const time = `${hour}:00`;
    const newBox = {
      id: Date.now(),
      time,
      hour,
      dayIndex, // null for daily view, 0-6 for weekly
      text: '',
      intention: `If it's ${time}, then I start`
    };
    if (!data[currentKey]) data[currentKey] = { priorities: [], backlog: [], timeboxes: [] };
    data[currentKey].timeboxes = [...data[currentKey].timeboxes, newBox];
    saveData();
  }

  function updateTimebox(id, field, value) {
    data[currentKey].timeboxes = data[currentKey].timeboxes.map(b => b.id === id ? { ...b, [field]: value } : b);
    saveData();
  }

  function deleteTimebox(id) {
    data[currentKey].timeboxes = data[currentKey].timeboxes.filter(b => b.id !== id);
    saveData();
  }

  function getWeekDays(date) {
    const curr = new Date(date);
    const first = curr.getDate() - curr.getDay();
    return Array.from({ length: 7 }, (_, i) => {
      const d = new Date(curr.setDate(first + i));
      return getLocalDateStr(d);
    });
  }

</script>

<div id="timeboxing-container" class="sketch-theme">
  <header class="section-header">
    <div class="view-tabs">
      <button class:active={view === 'daily'} on:click={() => view = 'daily'}>Daily</button>
      <button class:active={view === 'weekly'} on:click={() => view = 'weekly'}>Weekly</button>
    </div>
    <div class="date-picker">
      <input type="date" bind:value={selectedDate} />
      {#if view === 'daily'}
        <button class="sketch-btn" on:click={importFromWeekly}>Import from Weekly</button>
      {/if}
    </div>
  </header>

  <div class="main-layout">
    <!-- STEP 1: RULE OF 3 -->
    <section class="workflow-step step-1">
      <div class="step-badge">01 START</div>
      <h3>Decide What Matters Most</h3>
      <p class="subtitle">Use the Rule of 3 to focus only on the deep work that truly matters</p>

      <div class="priority-list">
        {#each currentData.priorities as task (task.id)}
          <div class="task-item" class:completed={task.completed}>
            <div class="task-main">
              <input type="checkbox" checked={task.completed} on:change={() => toggleComplete('priorities', task.id)} />
              <input type="text" placeholder="Top Priority..." value={task.text} on:input={(e) => updateText('priorities', task.id, e.target.value)} />
              <button class="add-sub-btn" on:click={() => addSubtask(task.id)}>+ sub</button>
            </div>
            <div class="subtasks">
              {#each task.subtasks as sub (sub.id)}
                <div class="subtask-item" class:completed={sub.completed}>
                  <input type="checkbox" checked={sub.completed} on:change={() => toggleSubtask(task.id, sub.id)} />
                  <input type="text" placeholder="Sub-task..." value={sub.text} on:input={(e) => updateSubtaskText(task.id, sub.id, e.target.value)} />
                </div>
              {/each}
            </div>
          </div>
        {/each}
        {#if currentData.priorities.length < 3}
           <button class="add-btn-sketch" on:click={addPriority}>+ Add Priority</button>
        {/if}
      </div>

      <div class="backlog-section">
        <h4>Backlog</h4>
        {#each currentData.backlog as task (task.id)}
          <div class="task-item backlog" class:completed={task.completed}>
            <input type="checkbox" checked={task.completed} on:change={() => toggleComplete('backlog', task.id)} />
            <input type="text" placeholder="Extra task..." value={task.text} on:input={(e) => updateText('backlog', task.id, e.target.value)} />
          </div>
        {/each}
        <button class="add-btn-sketch small" on:click={addBacklog}>+ Add to Backlog</button>
      </div>
    </section>

    <!-- STEP 2: TIMEBOXING -->
    <section class="workflow-step step-2">
      <div class="step-badge">02 FOLLOW THROUGH</div>
      <h3>Design Your Day</h3>
      <p class="subtitle">Use Timeboxing® to schedule exactly when your deep work starts and ends</p>

      <div class="calendar-view" class:weekly={view === 'weekly'}>
        {#if view === 'daily'}
          <div class="time-grid">
            {#each hours as hour}
              <div class="time-row" on:click={() => addTimebox(hour)}>
                <span class="hour-label">{hour}:00</span>
                <div class="slot">
                  {#each currentData.timeboxes.filter(b => b.hour === hour) as box (box.id)}
                    <div class="timebox-entry" on:click|stopPropagation>
                      <input type="text" placeholder="Deep Work Activity" bind:value={box.text} on:input={() => saveData()} />
                      <button class="del-btn" on:click={() => deleteTimebox(box.id)}>×</button>
                    </div>
                  {/each}
                </div>
              </div>
            {/each}
          </div>
        {:else}
          <div class="week-grid">
             <div class="week-header">
                <div class="spacer"></div>
                {#each DNS as day}
                  <div class="day-label">{day.slice(0,3)}</div>
                {/each}
             </div>
             <div class="week-body">
                {#each hours as hour}
                  <div class="week-row">
                    <span class="hour-label">{hour}:00</span>
                    {#each Array(7) as _, i}
                      <div class="week-slot" on:click={() => addTimebox(hour, i)}>
                        {#each currentData.timeboxes.filter(b => b.hour === hour && b.dayIndex === i) as box (box.id)}
                          <div class="timebox-entry mini" title={box.text} on:click|stopPropagation>
                            <input type="text" bind:value={box.text} on:input={() => saveData()} />
                          </div>
                        {/each}
                      </div>
                    {/each}
                  </div>
                {/each}
             </div>
          </div>
        {/if}
      </div>
    </section>

    <!-- STEP 3: IF-THEN -->
    <section class="workflow-step step-3">
      <div class="step-badge">03 FINISH</div>
      <h3>Do the Work</h3>
      <p class="subtitle">Use If-Then Intentions to trigger action automatically</p>

      <div class="intentions-list">
        {#each currentData.timeboxes.filter(b => b.text) as box (box.id)}
          <div class="intention-item">
            <span class="intention-quote">"</span>
            <input type="text" bind:value={box.intention} on:input={() => saveData()} />
            <span class="intention-quote">"</span>
            <p class="intention-context">for {box.text} at {box.hour}:00</p>
          </div>
        {/each}
        {#if currentData.timeboxes.filter(b => b.text).length === 0}
          <p class="empty-msg">Schedule some deep work in Step 2 to see your intentions here!</p>
        {/if}
      </div>
    </section>
  </div>
</div>

<style>
  .sketch-theme {
    font-family: 'Caveat', cursive;
    color: var(--color-text-primary);
    padding: var(--space-md);
    background: var(--color-background-primary);
    border-radius: 12px;
    height: 100%;
    overflow-y: auto;
  }

  .section-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: var(--space-lg);
    border-bottom: 2px solid var(--color-text-primary);
    padding-bottom: var(--space-sm);
  }

  .view-tabs button {
    background: none;
    border: 2px solid transparent;
    font-family: inherit;
    font-size: 1.5rem;
    padding: 5px 15px;
    cursor: pointer;
    border-radius: 8px;
  }

  .view-tabs button.active {
    border-color: var(--color-primary);
    transform: rotate(-2deg);
  }

  .sketch-btn {
    background: #f0f0f0;
    border: 2px solid #333;
    font-family: inherit;
    font-size: 1.1rem;
    padding: 5px 12px;
    cursor: pointer;
    border-radius: 5px;
    box-shadow: 2px 2px 0 #333;
  }

  .sketch-btn:active {
    box-shadow: 0 0 0 #333;
    transform: translate(2px, 2px);
  }

  .main-layout {
    display: flex;
    flex-direction: column;
    gap: 3rem;
  }

  .workflow-step {
    position: relative;
    padding: 20px;
    border: 3px solid var(--color-text-primary);
    border-radius: 255px 15px 225px 15px / 15px 225px 15px 255px; /* Sketchy border */
  }

  .step-badge {
    position: absolute;
    top: -15px;
    left: 20px;
    background: var(--color-primary);
    color: white;
    padding: 5px 15px;
    font-weight: bold;
    transform: rotate(-3deg);
  }

  h3 { font-size: 2rem; margin: 10px 0 0; }
  .subtitle { font-size: 1.2rem; color: var(--color-text-secondary); margin-bottom: 1.5rem; }

  /* Priority List */
  .priority-list {
    display: flex;
    flex-direction: column;
    gap: 15px;
  }

  .task-item {
    display: flex;
    flex-direction: column;
    border: 2px solid #ccc;
    padding: 10px;
    border-radius: 8px;
  }

  .task-main {
    display: flex;
    align-items: center;
    gap: 10px;
  }

  .task-item input[type="text"] {
    background: none;
    border: none;
    border-bottom: 1px dashed #ccc;
    font-family: inherit;
    font-size: 1.4rem;
    flex: 1;
  }

  .task-item.completed > .task-main input[type="text"],
  .subtask-item.completed input[type="text"] {
    text-decoration: line-through;
    opacity: 0.6;
  }

  .subtasks {
    margin-left: 30px;
    margin-top: 10px;
    display: flex;
    flex-direction: column;
    gap: 5px;
  }

  .subtask-item {
    display: flex;
    align-items: center;
    gap: 10px;
  }

  .subtask-item input[type="text"] {
    font-size: 1.1rem;
  }

  .add-sub-btn {
    font-family: inherit;
    background: none;
    border: 1px solid #aaa;
    border-radius: 4px;
    cursor: pointer;
  }

  .backlog-section {
    margin-top: 20px;
    opacity: 0.8;
  }

  .task-item.backlog input[type="text"] {
    font-size: 1.1rem;
  }

  /* Calendar */
  .time-grid {
    display: flex;
    flex-direction: column;
  }

  .time-row {
    display: flex;
    border-top: 1px solid #eee;
    min-height: 50px;
    cursor: cell;
  }

  .hour-label {
    width: 60px;
    font-size: 1.1rem;
    padding-top: 5px;
    border-right: 1px solid #eee;
  }

  .slot {
    flex: 1;
    display: flex;
    flex-wrap: wrap;
    gap: 5px;
    padding: 5px;
  }

  .timebox-entry {
    background: #fff9c4;
    border: 2px solid #333;
    padding: 5px 10px;
    display: flex;
    align-items: center;
    gap: 5px;
    border-radius: 4px;
    transform: rotate(1deg);
  }

  .timebox-entry input {
    background: none;
    border: none;
    font-family: inherit;
    font-size: 1.2rem;
  }

  .del-btn {
    background: none;
    border: none;
    color: red;
    font-weight: bold;
    cursor: pointer;
  }

  /* Weekly Grid */
  .week-grid {
    display: flex;
    flex-direction: column;
  }
  .week-header { display: flex; border-bottom: 2px solid #333; }
  .spacer { width: 60px; }
  .day-label { flex: 1; text-align: center; font-size: 1.2rem; }
  .week-row { display: flex; border-bottom: 1px solid #eee; min-height: 60px; }
  .week-slot { flex: 1; border-right: 1px solid #eee; padding: 2px; cursor: cell; }

  /* Intentions */
  .intentions-list {
    display: flex;
    flex-direction: column;
    gap: 1.5rem;
  }

  .intention-item {
    font-size: 1.6rem;
    display: flex;
    align-items: center;
    flex-wrap: wrap;
    gap: 0.5rem;
  }

  .intention-item input {
    font-family: inherit;
    font-size: 1.6rem;
    background: none;
    border: none;
    border-bottom: 2px solid var(--color-primary);
    flex: 1;
    min-width: 200px;
  }

  .intention-quote { font-size: 2.5rem; color: var(--color-primary); line-height: 0; }
  .intention-context { font-size: 1rem; opacity: 0.7; margin: 0; width: 100%; }

  .add-btn-sketch {
     font-family: inherit;
     font-size: 1.2rem;
     background: none;
     border: 2px dashed #999;
     border-radius: 8px;
     padding: 10px;
     cursor: pointer;
     width: 100%;
     margin-top: 10px;
  }
  .add-btn-sketch:hover { background: #fafafa; border-color: #333; }
  .add-btn-sketch.small { font-size: 1rem; padding: 5px; }

  input[type="date"] {
    font-family: inherit;
    font-size: 1.1rem;
    border: 2px solid #333;
    border-radius: 5px;
    padding: 5px;
  }
</style>

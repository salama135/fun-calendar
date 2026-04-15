<script>
  import { onMount } from 'svelte';
  import { getLocalDateStr, showToast } from './utils';

  let affirmations = {
    vision: '', gratitude: '', goalWeek: '', goalMonth: '', goalYear: '',
    history: {}
  };

  onMount(() => {
    const saved = localStorage.getItem('fun-affirmations');
    if (saved) affirmations = JSON.parse(saved);
    updateStreak();
  });

  let streak = 0;
  let doneToday = false;

  function updateStreak() {
    streak = 0;
    let d = new Date();
    const todayStr = getLocalDateStr(d);
    doneToday = !!affirmations.history[todayStr];

    while (true) {
      const ds = getLocalDateStr(d);
      if (affirmations.history[ds]) {
        streak++;
        d.setDate(d.getDate() - 1);
      } else {
        if (ds === todayStr) {
          d.setDate(d.getDate() - 1);
          continue;
        }
        break;
      }
    }
  }

  function markDone() {
    const todayStr = getLocalDateStr();
    if (affirmations.history[todayStr]) return;
    affirmations.history[todayStr] = true;
    save();
    updateStreak();
    showToast('Amazing! Keep up the gratitude 🌟');
  }

  function save() {
    localStorage.setItem('fun-affirmations', JSON.stringify(affirmations));
    showToast('Saved successfully! ✨');
  }
</script>

<div id="affirmations-sidebar">
  <div class="panel-header">
    <h2>Daily Tracking</h2>
  </div>
  <div class="sidebar-content">
    <div class="streak-container">
      <div class="streak-count">{streak}</div>
      <div class="streak-label">Day Streak</div>
    </div>
    <button class="svbtn" style="width:100%;" disabled={doneToday} on:click={markDone}>
      {doneToday ? '✓ Done for Today' : "I'm Grateful Today"}
    </button>
    <div class="vision-section">
      <h4>My Vision</h4>
      <textarea bind:value={affirmations.vision} placeholder="What is your true purpose?"></textarea>
    </div>
  </div>
</div>

<div id="affirmations-main">
  <div class="panel-header">
    <h2>Blessings & Goals</h2>
    <button class="svbtn" on:click={save}>Save All</button>
  </div>
  <div class="main-content">
    <section>
      <h3>Daily Gratitude & Affirmations</h3>
      <textarea bind:value={affirmations.gratitude} placeholder="Today I am grateful for..."></textarea>
    </section>
    <div class="goals-grid">
      <section>
        <h3 class="week">This Week's Goal</h3>
        <textarea bind:value={affirmations.goalWeek} placeholder="Focus on..."></textarea>
      </section>
      <section>
        <h3 class="month">This Month's Goal</h3>
        <textarea bind:value={affirmations.goalMonth} placeholder="Aim for..."></textarea>
      </section>
      <section>
        <h3 class="year">Yearly Goal</h3>
        <textarea bind:value={affirmations.goalYear} placeholder="Accomplish..."></textarea>
      </section>
    </div>
  </div>
</div>

<style>
  #affirmations-sidebar {
    flex: 0 0 298px;
    display: flex;
    flex-direction: column;
    border: 0.5px solid var(--color-border-tertiary);
    border-radius: var(--border-radius-lg);
    background: var(--color-background-primary);
    overflow: hidden;
  }

  #affirmations-main {
    flex: 1;
    display: flex;
    flex-direction: column;
    border: 0.5px solid var(--color-border-tertiary);
    border-radius: var(--border-radius-lg);
    background: var(--color-background-primary);
    overflow: hidden;
  }

  .panel-header {
    padding: var(--space-md) var(--space-lg);
    border-bottom: 0.5px solid var(--color-border-tertiary);
    background: var(--color-background-secondary);
    display: flex;
    justify-content: space-between;
    align-items: center;
  }

  .panel-header h2 {
    font-size: var(--fs-lg);
    font-family: var(--font-display);
    color: var(--color-primary);
    margin: 0;
  }

  .sidebar-content {
    flex: 1;
    padding: var(--space-lg);
    display: flex;
    flex-direction: column;
    gap: var(--space-xl);
  }

  .streak-container { text-align: center; }
  .streak-count { font-size: 48px; font-weight: 800; color: var(--color-secondary); line-height: 1; }
  .streak-label { font-size: var(--fs-xs); font-weight: 700; color: var(--color-text-tertiary); text-transform: uppercase; margin-top: 4px; }

  .vision-section { margin-top: auto; }
  .vision-section h4 { font-size: var(--fs-xs); font-weight: 700; color: var(--color-text-secondary); margin-bottom: 8px; text-transform: uppercase; }
  .vision-section textarea { width: 100%; height: 120px; background: var(--color-background-secondary); resize: none; }

  .main-content {
    flex: 1;
    overflow-y: auto;
    padding: var(--space-lg);
    display: flex;
    flex-direction: column;
    gap: var(--space-lg);
  }

  .main-content h3 { font-size: var(--fs-md); color: var(--color-primary); margin: 0 0 var(--space-sm) 0; }
  .main-content textarea { width: 100%; height: 100px; border-left: 4px solid var(--color-accent); }

  .goals-grid { display: grid; grid-template-columns: 1fr 1fr 1fr; gap: var(--space-md); }
  .goals-grid h3 { font-size: var(--fs-sm); margin-bottom: var(--space-xs); }
  .goals-grid h3.week { color: var(--color-secondary-dark); }
  .goals-grid h3.month { color: var(--color-primary); }
  .goals-grid h3.year { color: var(--color-warning); }
  .goals-grid textarea { height: 80px; font-size: var(--fs-xs); border-left: none; }

  @media(max-width:1023px) {
    #affirmations-sidebar { flex: 0 0 auto; }
    .goals-grid { grid-template-columns: 1fr; }
  }
</style>

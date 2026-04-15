<script>
  import { appMode, switchMode, toggleTheme, theme } from './lib/store';
  import { FEATURES } from './features';
  import Journal from './lib/Journal.svelte';
  import Habits from './lib/Habits.svelte';
  import Affirmations from './lib/Affirmations.svelte';
  import Events from './lib/Events.svelte';
  import { onMount } from 'svelte';

  let calendarVisible = true;
  let isMobile = false;

  function toggleCalendarPanel() {
    calendarVisible = !calendarVisible;
  }

  function checkMobile() {
    isMobile = window.innerWidth <= 767;
    if (!isMobile) calendarVisible = true;
    else if (isMobile && calendarVisible) calendarVisible = false;
  }

  onMount(() => {
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  });
</script>

<header id="top-bar">
  <div id="top-bar-left">
    {#if $appMode === 'journal'}
      <button class="bar-btn" class:active={calendarVisible} on:click={toggleCalendarPanel}>
        <span class="material-symbols-rounded">calendar_month</span>
        {calendarVisible ? 'Hide Calendar' : 'Show Calendar'}
      </button>
    {/if}
    <h1 id="app-title">Fun Calendar</h1>
  </div>
  <div id="top-bar-right">
    <button class="bar-btn" on:click={toggleTheme}>
      <span class="material-symbols-rounded">{$theme === 'dark' ? 'light_mode' : 'dark_mode'}</span>
      Switch to {$theme === 'dark' ? 'light' : 'dark'}
    </button>
  </div>
</header>

{#if isMobile && $appMode === 'journal'}
  <button id="cal-fab" class:active={calendarVisible} on:click={toggleCalendarPanel}>
    <span class="material-symbols-rounded">calendar_month</span>
    {calendarVisible ? 'Hide Calendar' : 'Show Calendar'}
  </button>
{/if}

<div id="main-wrapper">
  <nav id="sidebar-tabs">
    {#if FEATURES.tabs.journal}
      <button class="tab-divider" class:active={$appMode === 'journal'} on:click={() => switchMode('journal')}>
        <span class="material-symbols-rounded">book</span> Journal
      </button>
    {/if}
    {#if FEATURES.tabs.habits}
      <button class="tab-divider" class:active={$appMode === 'habits'} on:click={() => switchMode('habits')}>
        <span class="material-symbols-rounded">check_circle</span> Habits
      </button>
    {/if}
    {#if FEATURES.tabs.affirmations}
      <button class="tab-divider" class:active={$appMode === 'affirmations'} on:click={() => switchMode('affirmations')}>
        <span class="material-symbols-rounded">self_improvement</span> Affirmations
      </button>
    {/if}
    {#if FEATURES.tabs.events}
      <button class="tab-divider" class:active={$appMode === 'events'} on:click={() => switchMode('events')}>
        <span class="material-symbols-rounded">event</span> Events
      </button>
    {/if}
  </nav>

  <div id="main-container">
    {#if $appMode === 'journal'}
      <Journal {calendarVisible} />
    {:else if $appMode === 'habits'}
      <Habits />
    {:else if $appMode === 'affirmations'}
      <Affirmations />
    {:else if $appMode === 'events'}
      <Events />
    {/if}
  </div>
</div>

<style>
  #top-bar {
    position: sticky;
    top: 0;
    z-index: 100;
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: var(--space-sm) var(--space-xl);
    border-bottom: 0.5px solid var(--color-border-tertiary);
    background: var(--color-background-secondary);
    gap: var(--space-md);
  }

  #top-bar-left {
    display: flex;
    align-items: center;
    gap: var(--space-md);
  }

  #app-title {
    font-family: var(--font-display);
    font-size: var(--fs-xl);
    font-weight: 700;
    color: var(--color-primary);
    letter-spacing: .5px;
    margin: 0;
    line-height: 1;
  }

  .bar-btn {
    display: inline-flex;
    align-items: center;
    gap: 5px;
    font-size: var(--fs-xs);
    font-weight: 600;
    padding: 5px var(--space-sm);
    border-radius: 20px;
    border: 1px solid var(--color-neutral-border);
    cursor: pointer;
    background: transparent;
    color: var(--color-text-secondary);
    min-height: 32px;
  }

  .bar-btn:hover, .bar-btn.active {
    background: var(--color-primary);
    color: white;
    border-color: var(--color-primary);
  }

  #main-wrapper {
    display: flex;
    height: 680px;
    padding: var(--space-lg);
  }

  #sidebar-tabs {
    display: flex;
    flex-direction: column;
    gap: var(--space-sm);
    padding-top: var(--space-xl);
  }

  #main-container {
    display: flex;
    gap: var(--space-lg);
    flex: 1;
    position: relative;
  }

  #cal-fab {
    position: fixed;
    bottom: var(--space-xl);
    left: 50%;
    transform: translateX(-50%);
    z-index: 200;
    background: var(--color-primary);
    color: white;
    border: none;
    border-radius: 24px;
    padding: 10px var(--space-xl);
    font-size: var(--fs-sm);
    font-weight: 700;
    box-shadow: 0 4px 20px rgba(255, 107, 53, 0.4);
    display: flex;
    align-items: center;
    gap: 6px;
  }

  @media(max-width:1023px) {
    #main-wrapper {
      height: auto;
      flex-direction: column;
      padding: var(--space-md);
    }
    #sidebar-tabs {
      flex-direction: row;
      padding-top: 0;
    }
  }
</style>

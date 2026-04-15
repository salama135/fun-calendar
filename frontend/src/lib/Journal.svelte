<script>
  import { onMount, tick } from 'svelte';
  import { dkey, getLocalDateStr, showToast, MNS, DNS, COLS, WS } from './utils';
  import { FEATURES } from '../features';

  export let calendarVisible = true;

  let cur = new Date();
  let selKey = null;
  let selLabel = '';
  let showEditor = false;

  let events = [];
  let habits = [];
  let habitCompletions = {};

  let canvas, ctx;
  let col = COLS[0];
  let penW = 3;
  let ers = false;
  let drw = false;
  let lx = 0, ly = 0;
  let isSaving = false;

  let drawingHistory = [];
  let historyIdx = -1;
  const MAX_HISTORY = 30;

  let notes = '';
  let scrapbookItems = [];
  let activeItem = null;

  let showStickers = false;
  let camStream = null;
  let showCamera = false;
  let videoEl;

  onMount(() => {
    loadData();
    renderCalendar();
    window.addEventListener('keydown', handleGlobalKey);
    return () => window.removeEventListener('keydown', handleGlobalKey);
  });

  function loadData() {
    events = JSON.parse(localStorage.getItem('fun-events')) || [];
    habits = JSON.parse(localStorage.getItem('fun-habits')) || [];
    habitCompletions = JSON.parse(localStorage.getItem('fun-habit-completions')) || {};
  }

  function handleGlobalKey(e) {
    if (e.ctrlKey || e.metaKey) {
      if (e.key === 'z' && !e.shiftKey) { e.preventDefault(); undo(); }
      else if ((e.key === 'z' && e.shiftKey) || (e.key === 'y')) { e.preventDefault(); redo(); }
    }
  }

  // --- Calendar Logic ---
  let calendarCells = [];
  function renderCalendar() {
    const y = cur.getFullYear(), m = cur.getMonth();
    const first = new Date(y, m, 1).getDay();
    const days = new Date(y, m + 1, 0).getDate();
    const pd = new Date(y, m, 0).getDate();
    const td = new Date();

    const cells = [];
    for (let i = first - 1; i >= 0; i--) cells.push({ y, m: m - 1, d: pd - i, faded: true });
    for (let d = 1; d <= days; d++) {
      const isToday = y === td.getFullYear() && m === td.getMonth() && d === td.getDate();
      cells.push({ y, m, d, faded: false, isToday });
    }
    const tot = cells.length, rows = Math.ceil(tot / 7);
    for (let d = 1; d <= rows * 7 - tot; d++) cells.push({ y, m: m + 1, d, faded: true });

    calendarCells = cells.map(c => {
      const k = dkey(c.y, c.m, c.d);
      const dayEvents = events.filter(e => e.date === k);
      return { ...c, key: k, events: dayEvents.slice(0, 3) };
    });
  }

  function go(dir) {
    cur = new Date(cur.getFullYear(), cur.getMonth() + dir, 1);
    renderCalendar();
  }

  async function openDay(k, day, month, year) {
    selKey = k;
    selLabel = `${DNS[new Date(year, month, day).getDay()]}, ${MNS[month]} ${day} ${year}`;
    showEditor = true;

    await tick();
    initCanvas();

    const saved = JSON.parse(localStorage.getItem(`cal:${k}`));
    if (saved) {
      if (saved.canvas) {
        const img = new Image();
        img.onload = () => ctx.drawImage(img, 0, 0);
        img.src = saved.canvas;
      }
      notes = saved.note || '';
    } else {
      notes = '';
    }

    drawingHistory = [];
    historyIdx = -1;
    saveState();
  }

  function initCanvas() {
    const wrap = document.getElementById('cwrap');
    if (!wrap) return;
    canvas.width = Math.max(wrap.clientWidth - 32, 300);
    canvas.height = Math.max(wrap.clientHeight - 32, 200);
    ctx = canvas.getContext('2d');
    ctx.fillStyle = 'white';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
  }

  // --- Drawing Logic ---
  function gp(e) {
    const r = canvas.getBoundingClientRect(), sx = canvas.width / r.width, sy = canvas.height / r.height;
    const s = e.touches ? e.touches[0] : e;
    return { x: (s.clientX - r.left) * sx, y: (s.clientY - r.top) * sy };
  }
  function startDraw(e) {
    drw = true; const p = gp(e); lx = p.x; ly = p.y;
    ctx.globalCompositeOperation = ers ? 'destination-out' : 'source-over';
    ctx.beginPath();
    ctx.arc(lx, ly, (ers ? penW * 3 : penW) / 2, 0, Math.PI * 2);
    ctx.fillStyle = ers ? 'rgba(0,0,0,1)' : col;
    ctx.fill();
  }
  function moveDraw(e) {
    if (!drw) return;
    const p = gp(e);
    ctx.globalCompositeOperation = ers ? 'destination-out' : 'source-over';
    ctx.beginPath(); ctx.moveTo(lx, ly); ctx.lineTo(p.x, p.y);
    ctx.strokeStyle = ers ? 'rgba(0,0,0,1)' : col;
    ctx.lineWidth = ers ? penW * 3 : penW;
    ctx.lineCap = 'round'; ctx.lineJoin = 'round'; ctx.stroke();
    lx = p.x; ly = p.y;
  }
  function stopDraw() { if (drw) { drw = false; saveState(); } }

  function saveState() {
    const data = canvas.toDataURL();
    drawingHistory = drawingHistory.slice(0, historyIdx + 1);
    drawingHistory.push(data);
    if (drawingHistory.length > MAX_HISTORY) drawingHistory.shift();
    else historyIdx++;
  }

  function undo() {
    if (historyIdx > 0) {
      historyIdx--;
      restoreState();
    }
  }
  function redo() {
    if (historyIdx < drawingHistory.length - 1) {
      historyIdx++;
      restoreState();
    }
  }
  function restoreState() {
    const img = new Image();
    img.onload = () => {
      ctx.globalCompositeOperation = 'source-over';
      ctx.fillStyle = 'white';
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      ctx.drawImage(img, 0, 0);
    };
    img.src = drawingHistory[historyIdx];
  }

  function clearCanvas() {
    if (confirm('Clear drawing?')) {
      ctx.fillStyle = 'white';
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      scrapbookItems = [];
      saveState();
    }
  }

  // --- Scrapbook ---
  function addSticker(emoji) {
    scrapbookItems = [...scrapbookItems, { id: Date.now(), type: 'text', content: emoji, x: 50, y: 50, scale: 1 }];
    showStickers = false;
  }
  function handleUpload(e) {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      scrapbookItems = [...scrapbookItems, { id: Date.now(), type: 'img', content: ev.target.result, x: 50, y: 50, scale: 1 }];
    };
    reader.readAsDataURL(file);
  }

  async function toggleCamera() {
    if (showCamera) {
      camStream.getTracks().forEach(t => t.stop());
      camStream = null;
      showCamera = false;
    } else {
      try {
        camStream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' } });
        showCamera = true;
        await tick();
        videoEl.srcObject = camStream;
      } catch (e) { showToast('Camera error'); }
    }
  }
  function takePhoto() {
    const c = document.createElement('canvas');
    c.width = videoEl.videoWidth; c.height = videoEl.videoHeight;
    c.getContext('2d').drawImage(videoEl, 0, 0);
    scrapbookItems = [...scrapbookItems, { id: Date.now(), type: 'img', content: c.toDataURL(), x: 50, y: 50, scale: 1 }];
    toggleCamera();
  }

  // --- Item Interaction ---
  let dragItem = null;
  let dragType = null; // 'move' or 'scale'
  let startX, startY, startVal;

  function handleItemDown(e, item, type) {
    e.stopPropagation();
    activeItem = item;
    dragItem = item;
    dragType = type;
    startX = e.clientX;
    startY = e.clientY;
    if (type === 'move') {
      startVal = { x: item.x, y: item.y };
    } else {
      startVal = item.scale;
    }
    window.addEventListener('pointermove', handleItemMove);
    window.addEventListener('pointerup', handleItemUp);
  }
  function handleItemMove(e) {
    if (!dragItem) return;
    const dx = e.clientX - startX;
    const dy = e.clientY - startY;
    if (dragType === 'move') {
      dragItem.x = startVal.x + (dx / canvas.clientWidth * 100);
      dragItem.y = startVal.y + (dy / canvas.clientHeight * 100);
    } else {
      dragItem.scale = Math.max(0.2, startVal + dx * 0.01);
    }
    scrapbookItems = [...scrapbookItems];
  }
  function handleItemUp() {
    dragItem = null;
    window.removeEventListener('pointermove', handleItemMove);
    window.removeEventListener('pointerup', handleItemUp);
  }

  async function saveDay() {
    isSaving = true;
    // Flatten scrapbook
    for (const item of scrapbookItems) {
      ctx.save();
      const cx = (item.x / 100) * canvas.width;
      const cy = (item.y / 100) * canvas.height;
      ctx.translate(cx, cy);
      ctx.scale(item.scale, item.scale);
      if (item.type === 'img') {
        const img = await new Promise(r => { const i = new Image(); i.onload = () => r(i); i.src = item.content; });
        ctx.drawImage(img, -img.width/4, -img.height/4, img.width/2, img.height/2);
      } else {
        ctx.font = '64px sans-serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
        ctx.fillText(item.content, 0, 0);
      }
      ctx.restore();
    }
    scrapbookItems = [];

    const data = { canvas: canvas.toDataURL(), note: notes };
    localStorage.setItem(`cal:${selKey}`, JSON.stringify(data));
    showToast('Saved! 🎉');
    isSaving = false;
    renderCalendar();
  }
</script>

<div id="calendar-panel" class:hidden={!calendarVisible}>
  <div class="panel-header">
    <button class="tbtn nav" on:click={() => go(-1)}><span class="material-symbols-rounded">chevron_left</span></button>
    <span class="month-title">{MNS[cur.getMonth()]} {cur.getFullYear()}</span>
    <button class="tbtn nav" on:click={() => go(1)}><span class="material-symbols-rounded">chevron_right</span></button>
  </div>
  <div class="weekday-labels">
    {#each ['S','M','T','W','T','F','S'] as d}
      <div class="label">{d}</div>
    {/each}
  </div>
  <div id="grid">
    {#each calendarCells as cell}
      <div class="dc" class:fad={cell.faded} class:tod={cell.isToday} class:sel={selKey === cell.key} on:click={() => !cell.faded && openDay(cell.key, cell.d, cell.m, cell.y)}>
        <div class="dn">{cell.d}</div>
        <div class="events">
          {#each cell.events as e}
            <span class="dot">{e.emoji}</span>
          {/each}
        </div>
      </div>
    {/each}
  </div>
</div>

<div id="editor-panel">
  {#if !showEditor}
    <div id="empty-state">
      <div class="icon">📅</div>
      <h3>Pick a day, create your story</h3>
      <p>Draw, write, and track your journey</p>
    </div>
  {:else}
    <div id="editor">
      <div class="panel-header editor-header">
        <span>{selLabel}</span>
        <button class="tbtn" on:click={() => showEditor = false}><span class="material-symbols-rounded">close</span></button>
      </div>
      <div class="toolbar">
        <div class="tools-group">
          {#each COLS.slice(0, 5) as c}
            <div class="csw" class:on={col === c && !ers} style="background: {c}" on:click={() => {col = c; ers = false;}}></div>
          {/each}
        </div>
        <div class="divider"></div>
        <div class="tools-group">
          {#each WS.slice(0, 3) as w}
            <button class="wbtn" class:on={penW === w} on:click={() => penW = w}>
              <div class="dot" style="width: {w*2}px; height: {w*2}px"></div>
            </button>
          {/each}
        </div>
        <div class="divider"></div>
        <div class="tools-group">
          <input type="file" id="up" hidden on:change={handleUpload}>
          <button class="tbtn" on:click={() => document.getElementById('up').click()}><span class="material-symbols-rounded">attach_file</span></button>
          <button class="tbtn" class:on={showCamera} on:click={toggleCamera}><span class="material-symbols-rounded">photo_camera</span></button>
          <div class="popover-wrap">
            <button class="tbtn" on:click={() => showStickers = !showStickers}><span class="material-symbols-rounded">sentiment_satisfied</span></button>
            {#if showStickers}
              <div class="sticker-panel">
                {#each ['⭐️', '❤️', '✨', '🎉', '🚀', '🔥', '💡', '🌸'] as e}
                  <button class="sticker-btn" on:click={() => addSticker(e)}>{e}</button>
                {/each}
              </div>
            {/if}
          </div>
        </div>
        <div class="divider"></div>
        <div class="tools-group">
          <button class="tbtn" on:click={undo} disabled={historyIdx <= 0}><span class="material-symbols-rounded">undo</span></button>
          <button class="tbtn" on:click={redo} disabled={historyIdx >= drawingHistory.length - 1}><span class="material-symbols-rounded">redo</span></button>
          <button class="tbtn" class:on={ers} on:click={() => ers = !ers}><span class="material-symbols-rounded">ink_eraser</span></button>
          <button class="tbtn" on:click={clearCanvas}><span class="material-symbols-rounded">delete</span></button>
        </div>
        <button class="svbtn" on:click={saveDay} disabled={isSaving}>{isSaving ? '...' : 'Save'}</button>
      </div>

      <div id="cwrap" on:pointerdown={() => activeItem = null}>
        <div class="canvas-container">
          <canvas bind:this={canvas} on:pointerdown={startDraw} on:pointermove={moveDraw} on:pointerup={stopDraw} on:pointerleave={stopDraw}></canvas>
          {#if showCamera}
            <video bind:this={videoEl} autoplay playsinline></video>
            <button class="snap-btn" on:click={takePhoto}>Capture</button>
          {/if}
          {#each scrapbookItems as item (item.id)}
            <div class="scrapbook-item" class:selected={activeItem === item} style="left: {item.x}%; top: {item.y}%;" on:pointerdown={(e) => handleItemDown(e, item, 'move')}>
              {#if item.type === 'text'}
                <div class="content" style="transform: scale({item.scale})">{item.content}</div>
              {:else}
                <img src={item.content} alt="" style="transform: scale({item.scale})">
              {/if}
              <div class="del-btn" on:click={() => scrapbookItems = scrapbookItems.filter(i => i !== item)}>×</div>
              <div class="scale-handle" on:pointerdown={(e) => handleItemDown(e, item, 'scale')}></div>
            </div>
          {/each}
        </div>
      </div>

      <div class="footer">
        <textarea bind:value={notes} placeholder="What's on your mind today?" maxlength="500"></textarea>
        <div class="count">{notes.length}/500</div>
      </div>
    </div>
  {/if}
</div>

<style>
  #calendar-panel { flex: 0 0 298px; display: flex; flex-direction: column; border: 0.5px solid var(--color-border-tertiary); border-radius: var(--border-radius-lg); background: var(--color-background-primary); overflow: hidden; }
  #calendar-panel.hidden { display: none; }
  .panel-header { padding: var(--space-md) var(--space-lg); border-bottom: 0.5px solid var(--color-border-tertiary); background: var(--color-background-secondary); display: flex; justify-content: space-between; align-items: center; }
  .month-title { font-size: var(--fs-xl); font-weight: 700; font-family: var(--font-display); color: var(--color-primary); }
  .weekday-labels { display: grid; grid-template-columns: repeat(7, 1fr); padding: var(--space-md) var(--space-md) var(--space-sm); gap: var(--space-xs); }
  .weekday-labels .label { text-align: center; font-size: var(--fs-xs); color: var(--color-text-tertiary); font-weight: 600; }
  #grid { display: grid; grid-template-columns: repeat(7, 1fr); gap: var(--space-xs); padding: var(--space-xs); flex: 1; overflow: auto; }

  .dc .events { display: flex; gap: 2px; justify-content: center; padding: 2px; }
  .dc .dot { font-size: 10px; }

  #editor-panel { flex: 1; display: flex; flex-direction: column; border: 0.5px solid var(--color-border-tertiary); border-radius: var(--border-radius-lg); background: var(--color-background-primary); overflow: hidden; }
  #empty-state { flex: 1; display: flex; flex-direction: column; align-items: center; justify-content: center; color: var(--color-text-tertiary); }
  #empty-state .icon { font-size: 48px; margin-bottom: 10px; }

  #editor { flex: 1; display: flex; flex-direction: column; min-height: 0; }
  .toolbar { display: flex; align-items: center; gap: var(--space-md); padding: var(--space-md) var(--space-lg); border-bottom: 0.5px solid var(--color-border-tertiary); background: var(--color-background-secondary); flex-wrap: wrap; }
  .tools-group { display: flex; gap: var(--space-xs); align-items: center; }
  .divider { width: 1px; height: 18px; background: var(--color-border-secondary); }
  .wbtn .dot { background: var(--color-text-primary); border-radius: 50%; }

  #cwrap { flex: 1; min-height: 0; overflow: auto; display: flex; align-items: center; justify-content: center; padding: var(--space-lg); position: relative; background: #fafafa; }
  .canvas-container { position: relative; box-shadow: 0 4px 20px rgba(0,0,0,0.05); }
  canvas { background: white; cursor: crosshair; touch-action: none; border-radius: 4px; display: block; }

  video { position: absolute; top: 0; left: 0; width: 100%; height: 100%; object-fit: cover; z-index: 50; }
  .snap-btn { position: absolute; bottom: 10px; left: 50%; transform: translateX(-50%); z-index: 60; background: var(--color-primary); color: white; border: none; padding: 8px 16px; border-radius: 20px; font-weight: 700; cursor: pointer; }

  .footer { padding: var(--space-lg); border-top: 0.5px solid var(--color-border-tertiary); position: relative; }
  textarea { width: 100%; height: 60px; resize: none; border-left: 3px solid var(--color-secondary); }
  .count { position: absolute; bottom: var(--space-sm); right: var(--space-lg); font-size: var(--fs-xs); color: var(--color-text-tertiary); }

  .popover-wrap { position: relative; }
  .sticker-panel { position: absolute; top: 100%; left: 50%; transform: translateX(-50%); background: white; border: 1px solid var(--color-neutral-border); padding: 8px; display: grid; grid-template-columns: repeat(4, 1fr); gap: 4px; z-index: 100; border-radius: 8px; box-shadow: 0 4px 12px rgba(0,0,0,0.1); }

  .content { font-size: 64px; pointer-events: none; }
  img { max-width: 200px; max-height: 200px; pointer-events: none; }

  @media(max-width:767px) {
    #calendar-panel { flex: 0 0 auto; min-height: 300px; }
    #main-wrapper { height: auto; }
  }
</style>

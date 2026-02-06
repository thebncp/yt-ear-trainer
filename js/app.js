// ===== UI constants =====
const STRICT_SIZE = { w: 200, h: 200 };   // tune this after testing typical backing track overlays
const REVEAL_SIZE = { w: 640, h: 360 };

const els = {
  strictToggle: document.getElementById("strictToggle"),
  autoNextToggle: document.getElementById("autoNextToggle"),
  showHistoryTitlesToggle: document.getElementById("showHistoryTitlesToggle"),
  playlistUrlInput: document.getElementById("playlistUrlInput"),
  loadPlaylistBtn: document.getElementById("loadPlaylistBtn"),
  status: document.getElementById("status"),

  uploaderName: document.getElementById("uploaderName"),
  videoTitle: document.getElementById("videoTitle"),
  openOnYouTube: document.getElementById("openOnYouTube"),
  revealMeta: document.getElementById("revealMeta"),

  playPauseBtn: document.getElementById("playPauseBtn"),
  restartBtn: document.getElementById("restartBtn"),
  rewindBtn: document.getElementById("rewindBtn"),
  forwardBtn: document.getElementById("forwardBtn"),
  nextBtn: document.getElementById("nextBtn"),
  revealBtn: document.getElementById("revealBtn"),
  reshuffleBtn: document.getElementById("reshuffleBtn"),

  playlistIdLabel: document.getElementById("playlistIdLabel"),
  countLabel: document.getElementById("countLabel"),
  indexLabel: document.getElementById("indexLabel"),
  historyList: document.getElementById("historyList"),
};

let strictMode = true;
let queue = [];
let index = -1;
let history = [];
let currentPlaylistId = DEFAULT_PLAYLIST_ID;

function setStatus(msg) {
  els.status.textContent = msg;
}

function setStrictMode(on) {
  strictMode = on;
  els.strictToggle.checked = on;

  if (on) {
    setPlayerSize(STRICT_SIZE.w, STRICT_SIZE.h);
    els.revealMeta.style.display = "none";
    els.revealBtn.textContent = "Reveal";
    if (els.showHistoryTitlesToggle) {
  els.showHistoryTitlesToggle.checked = false;
}
  } else {
    setPlayerSize(REVEAL_SIZE.w, REVEAL_SIZE.h);
    els.revealMeta.style.display = "block";
    els.revealBtn.textContent = "Strict hide";
  }
  renderHistory();
}

function renderMeta(item) {
  els.uploaderName.textContent = item?.channelTitle || "—";
  els.videoTitle.textContent = item?.title || "—";
  els.openOnYouTube.href = item?.videoId ? `https://www.youtube.com/watch?v=${item.videoId}` : "#";
}

function renderQueueInfo() {
  els.playlistIdLabel.textContent = currentPlaylistId || "—";
  els.countLabel.textContent = String(queue.length);
  els.indexLabel.textContent = index >= 0 ? String(index + 1) : "—";
}

function renderHistory() {
  const showTitles = !!els.showHistoryTitlesToggle?.checked;

  els.historyList.innerHTML = "";
  for (const h of history.slice(-20).reverse()) {
    const li = document.createElement("li");

    // Always show uploader/channel; only show title if toggle is on
    const channel = h.channelTitle || "—";
    const title = h.title || "—";

    li.textContent = showTitles ? `${channel} — ${title}` : channel;
    els.historyList.appendChild(li);
  }
}


function pickNextIndex() {
  if (!queue.length) return -1;
  const next = index + 1;
  if (next >= queue.length) return 0; // wrap
  return next;
}

function playAt(i) {
  if (i < 0 || i >= queue.length) return;

  index = i;
  const item = queue[index];
  renderMeta(item);
  renderQueueInfo();

  // add to history (avoid duplicates back-to-back)
  const last = history[history.length - 1];
  if (!last || last.videoId !== item.videoId) {
    history.push(item);
    renderHistory();
  }

  playerLoad(item.videoId);
  setStatus("Loaded.");
}

function nextRandom() {
  if (!queue.length) return;

  // simple: advance through shuffled queue
  const next = pickNextIndex();
  playAt(next);
}

function reshuffleKeepCurrent() {
  if (!queue.length) return;

  const current = queue[index] || null;
  queue = makeQueue(queue);

  // place current at front so you don't unexpectedly jump
  if (current) {
    queue = [current, ...queue.filter(x => x.videoId !== current.videoId)];
    index = 0;
  } else {
    index = -1;
  }

  renderQueueInfo();
  setStatus("Reshuffled.");
}

function cueFirstTrack() {
  if (!queue.length) return;
  index = 0;
  const item = queue[index];

  renderMeta(item);
  renderQueueInfo();

  // Note: do NOT add to history yet; history should reflect played items
  playerCue(item.videoId);

  setStatus("Cued first track. Press Play.");
  els.playPauseBtn.textContent = "Play";
}


async function loadPlaylistFromInputOrDefault() {
  let pid = DEFAULT_PLAYLIST_ID;

  const raw = (els.playlistUrlInput.value || "").trim();
  if (raw) {
    const parsed = parsePlaylistIdFromUrl(raw);
    if (!parsed) throw new Error("Could not parse playlist ID from URL.");
    pid = parsed;
  }

  currentPlaylistId = pid;
  renderQueueInfo();
  setStatus("Fetching playlist items...");

  const items = await fetchPlaylistItems(pid);
  if (!items.length) throw new Error("No playable items found in this playlist.");

  queue = makeQueue(items);
  index = -1;
  history = [];
  renderHistory();
  renderQueueInfo();

  setStatus(`Loaded ${items.length} items. Tap Play or Next.`);
  
  // Auto-cue the first item so Play works
  playAt(0);
  playerPause();
  els.playPauseBtn.textContent = "Play";
  setStatus(`Loaded ${items.length} items. Ready.`);

}

function onPlayerStateChange(e) {
  // YT.PlayerState.ENDED === 0
  if (e?.data === 0 && els.autoNextToggle.checked) {
    nextRandom();
  }
}

function applyTheme(themeClass) {
  document.body.classList.remove("theme-default","theme-synthwave", "theme-emo","theme-heavy","theme-lofi");
  if (themeClass) document.body.classList.add(themeClass);
}

async function switchPlaylist(key) {
  const p = PLAYLISTS[key];
  if (!p) return;

  const descEl = document.getElementById("themeDescription");
if (descEl) descEl.textContent = PLAYLISTS[key]?.description || "";


  currentPlaylistId = p.playlistId;
  applyTheme(p.theme);

  // Reuse your loader, but point it at currentPlaylistId
  setStatus("Fetching playlist items...");
  const items = await fetchPlaylistItems(currentPlaylistId);
  queue = makeQueue(items);
  index = -1;
  history = [];
  renderHistory();
  renderQueueInfo();
  setStatus(`Loaded ${items.length} items.`);
}


async function init() {
  // UI init
  setStrictMode(true);
  els.revealMeta.style.display = "none";
  els.strictToggle.addEventListener("change", () => setStrictMode(els.strictToggle.checked));
  els.revealBtn.addEventListener("click", () => setStrictMode(!strictMode));

document.querySelectorAll(".playlistBtn").forEach(btn => {
  btn.addEventListener("click", async () => {
    const key = btn.dataset.playlist;
    try {
      await switchPlaylist(key);
    } catch (err) {
      setStatus(String(err?.message || err));
    }
  });
});


  els.loadPlaylistBtn.addEventListener("click", async () => {
    try {
      await loadPlaylistFromInputOrDefault();
    } catch (err) {
      setStatus(String(err?.message || err));
    }
  });

  els.reshuffleBtn.addEventListener("click", () => reshuffleKeepCurrent());

  els.showHistoryTitlesToggle.addEventListener("change", () => renderHistory());

  els.playPauseBtn.addEventListener("click", () => {
    // YT.PlayerState.PLAYING === 1
    const st = getPlayerState();
    if (st === 1) {
      playerPause();
      els.playPauseBtn.textContent = "Play";
    } else {
      playerPlay();
      els.playPauseBtn.textContent = "Pause";
    }
  });


  els.restartBtn.addEventListener("click", () => playerRestart());
  els.rewindBtn.addEventListener("click", () => playerSeekBy(-10));
  els.forwardBtn.addEventListener("click", () => playerSeekBy(10));
  els.nextBtn.addEventListener("click", () => nextRandom());

  // Load IFrame API and create player
  setStatus("Loading YouTube player...");
  await loadYouTubeIframeApi();

  // Create player with a placeholder video; you can leave blank and load later.
  createPlayer({ videoId: "", onStateChange: onPlayerStateChange });
try {
  await loadPlaylistFromInputOrDefault();
  cueFirstTrack();
} catch (err) {
  setStatus(String(err?.message || err));
}

  setPlayerSize(STRICT_SIZE.w, STRICT_SIZE.h);

  setStatus("Ready. Paste a playlist URL and click Load.");
}

init().catch(err => setStatus(String(err?.message || err)));

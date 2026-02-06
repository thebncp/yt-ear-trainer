let ytPlayer = null;
let ytReadyResolve = null;

function loadYouTubeIframeApi() {
  return new Promise((resolve) => {
    if (window.YT && window.YT.Player) return resolve();

    ytReadyResolve = resolve;
    const tag = document.createElement("script");
    tag.src = "https://www.youtube.com/iframe_api";
    document.head.appendChild(tag);
  });
}

// Called by the IFrame API when ready
window.onYouTubeIframeAPIReady = function () {
  if (ytReadyResolve) ytReadyResolve();
};

function createPlayer({ videoId, onStateChange }) {
  if (!window.YT || !window.YT.Player) throw new Error("YouTube IFrame API not loaded.");

  ytPlayer = new YT.Player("player", {
    height: "200",
    width: "200",
    videoId,
    playerVars: {
      // Must be set for JS control
      enablejsapi: 1,

      // Distraction reduction
      controls: 0,
      iv_load_policy: 3,
      rel: 0,
      fs: 0,
      disablekb: 1,
      playsinline: 1,
    },
    events: {
      onStateChange,
    },
  });

  return ytPlayer;
}

function setPlayerSize(width, height) {
  const el = document.getElementById("player");
  el.style.width = `${width}px`;
  el.style.height = `${height}px`;
  if (ytPlayer && typeof ytPlayer.setSize === "function") {
    ytPlayer.setSize(width, height);
  }
}

function playerPlay() { ytPlayer?.playVideo?.(); }
function playerPause() { ytPlayer?.pauseVideo?.(); }
function playerRestart() {
  if (!ytPlayer?.seekTo) return;
  ytPlayer.seekTo(0, true);
  ytPlayer.playVideo?.();
}
function playerCue(videoId) {
  // cueVideoById loads the video without autoplay
  ytPlayer?.cueVideoById?.(videoId);
}

function playerSeekBy(deltaSeconds) {
  if (!ytPlayer?.getCurrentTime || !ytPlayer?.seekTo) return;
  const t = ytPlayer.getCurrentTime();
  ytPlayer.seekTo(Math.max(0, t + deltaSeconds), true);
}
function playerLoad(videoId) {
  // loadVideoById starts playback (after user interaction rules)
  ytPlayer?.loadVideoById?.(videoId);
}
function getPlayerState() {
  return ytPlayer?.getPlayerState?.();
}

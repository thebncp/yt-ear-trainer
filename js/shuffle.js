// Fisher–Yates shuffle (in-place)
function shuffleInPlace(arr) {
    for (let i = arr.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [arr[i], arr[j]] = [arr[j], arr[i]];
    }
    return arr;
  }
  
  // Create a shuffled queue with optional "avoid immediate repeats"
  function makeQueue(videoItems) {
    const q = videoItems.slice();
    shuffleInPlace(q);
    return q;
  }
  
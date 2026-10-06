// Titanic Master Shipbuilder - Fixed & Working V1.1
// Core fixes:
// 1. Syntax error in targetPositions (y= → y:)
// 2. Proper drag-and-drop onto the ship canvas
// 3. Visual ghost outlines so players know where pieces go
// 4. Better piece selection + rotate behavior
// 5. Consistent totalPieces count

const TOTAL_PIECES = 12;

let pieces = [];
let placedPieces = [];
let score = 0;
let accuracy = 0;
let selectedPiece = null;   // currently selected (for rotate)
let draggedId = null;
let offsetX = 0;
let offsetY = 0;

// Target positions – fixed syntax + slightly more ship-like layout
const targetPositions = [
  // Hull bottom row
  { x: 40,  y: 220, width: 70, height: 35, label: "Hull 1" },
  { x: 120, y: 220, width: 70, height: 35, label: "Hull 2" },
  { x: 200, y: 220, width: 70, height: 35, label: "Hull 3" },
  { x: 280, y: 220, width: 70, height: 35, label: "Hull 4" },
  // Mid decks
  { x: 60,  y: 160, width: 80, height: 30, label: "Deck A" },
  { x: 160, y: 160, width: 80, height: 30, label: "Deck B" },
  { x: 260, y: 160, width: 80, height: 30, label: "Deck C" },
  // Upper structures
  { x: 90,  y: 110, width: 60, height: 28, label: "Super 1" },
  { x: 170, y: 110, width: 60, height: 28, label: "Super 2" },
  { x: 250, y: 110, width: 60, height: 28, label: "Super 3" },
  // Funnel + mast
  { x: 140, y: 50,  width: 40, height: 45, label: "Funnel" },
  { x: 220, y: 40,  width: 25, height: 55, label: "Mast" }
];

function init() {
  loadGameState();
  if (pieces.length === 0) {
    createPieces();
  }
  renderGhosts();
  renderPiecesPanel();
  renderShipView();
  updateUI();
  setupEventListeners();
}

function createPieces() {
  pieces = [];
  for (let i = 0; i < TOTAL_PIECES; i++) {
    const t = targetPositions[i];
    pieces.push({
      id: i,
      width: t.width,
      height: t.height,
      label: t.label,
      x: 0,
      y: 0,
      placed: false,
      targetX: t.x,
      targetY: t.y,
      rotation: 0
    });
  }
  // Shuffle so order is not obvious
  pieces.sort(() => Math.random() - 0.5);
}

/* ---------- Rendering ---------- */

function renderGhosts() {
  const shipView = document.getElementById('ship-view');
  // Clear previous ghosts only
  shipView.querySelectorAll('.ghost').forEach(g => g.remove());

  targetPositions.forEach((t, i) => {
    // Only show ghost if that piece is not yet placed
    const alreadyPlaced = placedPieces.some(p => p.id === i);
    if (alreadyPlaced) return;

    const ghost = document.createElement('div');
    ghost.className = 'ghost';
    ghost.style.left = `${t.x}px`;
    ghost.style.top = `${t.y}px`;
    ghost.style.width = `${t.width}px`;
    ghost.style.height = `${t.height}px`;
    ghost.dataset.targetId = i;
    shipView.appendChild(ghost);
  });
}

function renderPiecesPanel() {
  const panel = document.getElementById('pieces-panel');
  panel.innerHTML = '';

  pieces.forEach(piece => {
    if (piece.placed) return;

    const el = document.createElement('div');
    el.className = 'piece';
    el.draggable = true;
    el.dataset.id = piece.id;
    el.textContent = piece.label;

    // Size + rotation
    applyPieceStyle(el, piece);

    if (selectedPiece && selectedPiece.id === piece.id) {
      el.classList.add('selected');
    }

    panel.appendChild(el);
  });
}

function renderShipView() {
  const shipView = document.getElementById('ship-view');
  // Keep ghosts, remove only placed pieces
  shipView.querySelectorAll('.placed-piece').forEach(p => p.remove());

  placedPieces.forEach(piece => {
    const el = document.createElement('div');
    el.className = 'placed-piece';
    el.dataset.id = piece.id;
    el.textContent = piece.label;
    el.style.left = `${piece.x}px`;
    el.style.top = `${piece.y}px`;
    applyPieceStyle(el, piece);
    shipView.appendChild(el);
  });
}

function applyPieceStyle(el, piece) {
  el.style.transform = `rotate(${piece.rotation}deg)`;
  if (piece.rotation % 180 !== 0) {
    el.style.width = `${piece.height}px`;
    el.style.height = `${piece.width}px`;
  } else {
    el.style.width = `${piece.width}px`;
    el.style.height = `${piece.height}px`;
  }
}

/* ---------- Drag & Drop ---------- */

function setupEventListeners() {
  const shipView = document.getElementById('ship-view');
  const panel = document.getElementById('pieces-panel');

  // --- Piece selection (click to select for rotate) ---
  panel.addEventListener('click', (e) => {
    const el = e.target.closest('.piece');
    if (!el) return;
    const id = parseInt(el.dataset.id, 10);
    selectedPiece = pieces.find(p => p.id === id);
    renderPiecesPanel(); // re-render to show selection highlight
  });

  // --- Drag start ---
  panel.addEventListener('dragstart', (e) => {
    const el = e.target.closest('.piece');
    if (!el) return;
    draggedId = parseInt(el.dataset.id, 10);
    selectedPiece = pieces.find(p => p.id === draggedId);
    offsetX = e.offsetX;
    offsetY = e.offsetY;
    el.classList.add('dragging');
    e.dataTransfer.setData('text/plain', draggedId);
    e.dataTransfer.effectAllowed = 'move';
  });

  panel.addEventListener('dragend', (e) => {
    e.target.classList.remove('dragging');
    draggedId = null;
  });

  // --- Allow drop on ship-view ---
  shipView.addEventListener('dragover', (e) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
  });

  shipView.addEventListener('drop', (e) => {
    e.preventDefault();
    const id = parseInt(e.dataTransfer.getData('text/plain'), 10);
    const piece = pieces.find(p => p.id === id);
    if (!piece || piece.placed) return;

    const rect = shipView.getBoundingClientRect();
    let x = e.clientX - rect.left - offsetX;
    let y = e.clientY - rect.top - offsetY;

    // Snap to nearest free target
    const snapped = snapToNearest(x, y, piece);
    if (!snapped) return; // no free slot

    piece.x = snapped.x;
    piece.y = snapped.y;
    piece.placed = true;

    // Score based on how close to the *correct* target for this piece
    const dist = Math.hypot(piece.x - piece.targetX, piece.y - piece.targetY);
    const maxDist = 200; // reasonable tolerance
    const pieceAccuracy = Math.max(0, 100 - (dist / maxDist) * 100);
    score += pieceAccuracy;
    placedPieces.push(piece);

    renderGhosts();
    renderPiecesPanel();
    renderShipView();
    updateUI();
    saveGameState();
  });

  // --- Rotate button ---
  document.getElementById('rotate-btn').addEventListener('click', () => {
    if (!selectedPiece || selectedPiece.placed) {
      alert('Select an unplaced piece first (click it in the panel), then press Rotate.');
      return;
    }
    selectedPiece.rotation = (selectedPiece.rotation + 90) % 360;
    renderPiecesPanel();
  });

  // --- Reset ---
  document.getElementById('reset-btn').addEventListener('click', resetGame);
}

function snapToNearest(x, y, piece) {
  let best = null;
  let bestDist = Infinity;

  targetPositions.forEach((t, i) => {
    // Skip already occupied targets
    if (placedPieces.some(p => p.id === i)) return;

    const dist = Math.hypot(x - t.x, y - t.y);
    if (dist < bestDist && dist < 120) { // only snap if reasonably close
      bestDist = dist;
      best = { x: t.x, y: t.y, targetId: i };
    }
  });
  return best;
}

/* ---------- UI & Persistence ---------- */

function updateUI() {
  const placedCount = placedPieces.length;
  accuracy = placedCount > 0 ? score / placedCount : 0;

  document.getElementById('score').textContent = `Score: ${Math.floor(score)}`;
  document.getElementById('accuracy').textContent = `Accuracy: ${Math.floor(accuracy)}%`;
  document.getElementById('progress').textContent = `Progress: ${placedCount}/${TOTAL_PIECES} pieces placed`;

  if (placedCount === TOTAL_PIECES) {
    setTimeout(() => {
      alert(`Congratulations! You built the Titanic!\n\nFinal Score: ${Math.floor(score)}\nAverage Accuracy: ${Math.floor(accuracy)}%`);
    }, 300);
  }
}

function saveGameState() {
  const state = {
    pieces,
    placedPieces,
    score,
    accuracy
  };
  localStorage.setItem('titanicShipbuilderState', JSON.stringify(state));
}

function loadGameState() {
  try {
    const raw = localStorage.getItem('titanicShipbuilderState');
    if (!raw) return;
    const parsed = JSON.parse(raw);
    pieces = parsed.pieces || [];
    placedPieces = parsed.placedPieces || [];
    score = parsed.score || 0;
    accuracy = parsed.accuracy || 0;
  } catch (e) {
    console.warn('Could not load saved state', e);
  }
}

function resetGame() {
  if (!confirm('Reset the game? All progress will be lost.')) return;
  localStorage.removeItem('titanicShipbuilderState');
  pieces = [];
  placedPieces = [];
  score = 0;
  accuracy = 0;
  selectedPiece = null;
  createPieces();
  renderGhosts();
  renderPiecesPanel();
  renderShipView();
  updateUI();
}

// Start
window.addEventListener('load', init);

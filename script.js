// Titanic Master Shipbuilder - V1
// Game logic

let pieces = [];
let placedPieces = [];
let score = 0;
let accuracy = 0;
const totalPieces = 12; // between 10-15
let selectedPiece = null;
let offsetX = 0, offsetY = 0;
let isRotating = false;
let rotationAngle = 0; // 0, 90, 180, 270 degrees

// Target positions for each piece (simplified grid)
const targetPositions = [
    { x: 50, y: 50, width: 60, height: 30 },
    { x: 120, y: 50, width: 60, height: 30 },
    { x: 190, y: 50, width: 60, height: 30 },
    { x: 50, y=100, width: 60, height: 30 },
    { x: 120, y=100, width: 60, height: 30 },
    { x: 190, y=100, width: 60, height: 30 },
    { x: 50, y=150, width: 60, height: 30 },
    { x: 120, y=150, width: 60, height: 30 },
    { x: 190, y=150, width: 60, height: 30 },
    { x: 50, y=200, width: 60, height: 30 },
    { x: 120, y=200, width: 60, height: 30 },
    { x: 190, y=200, width: 60, height: 30 }
];

// Initialize game
function init() {
    loadGameState();
    createPieces();
    renderPiecesPanel();
    renderShipView();
    updateUI();
    setupEventListeners();
}

// Create ship pieces
function createPieces() {
    pieces = [];
    for (let i = 0; i < totalPieces; i++) {
        pieces.push({
            id: i,
            width: targetPositions[i].width,
            height: targetPositions[i].height,
            x: 0, // initial position in panel
            y: 0,
            placed: false,
            targetX: targetPositions[i].x,
            targetY: targetPositions[i].y,
            rotation: 0 // 0, 90, 180, 270
        });
    }
    // Shuffle pieces for variety
    pieces.sort(() => Math.random() - 0.5);
}

// Render pieces in the panel
function renderPiecesPanel() {
    const panel = document.getElementById('pieces-panel');
    panel.innerHTML = '';
    pieces.forEach(piece => {
        if (!piece.placed) {
            const el = document.createElement('div');
            el.className = 'piece';
            el.draggable = true;
            el.dataset.id = piece.id;
            el.textContent = `Piece ${piece.id + 1}`;
            // Apply rotation
            el.style.transform = `rotate(${piece.rotation}deg)`;
            // Adjust size based on rotation (swap width/height for 90/270)
            if (piece.rotation % 180 !== 0) {
                el.style.width = `${piece.height}px`;
                el.style.height = `${piece.width}px`;
            } else {
                el.style.width = `${piece.width}px`;
                el.style.height = `${piece.height}px`;
            }
            panel.appendChild(el);
        }
    });
    // Add drag event listeners
    document.querySelectorAll('.piece').forEach(el => {
        el.addEventListener('dragstart', dragStart);
        el.addEventListener('dragover', dragOver);
        el.addEventListener('drop', dragDrop);
        el.addEventListener('dragend', dragEnd);
    });
}

// Drag and drop handlers
function dragStart(e) {
    selectedPiece = pieces.find(p => p.id == e.target.dataset.id);
    offsetX = e.clientX - e.target.getBoundingClientRect().left;
    offsetY = e.clientY - e.target.getBoundingClientRect().top;
    e.target.classList.add('dragging');
    e.dataTransfer.setData('text/plain', selectedPiece.id);
}

function dragOver(e) {
    e.preventDefault();
}

function dragDrop(e) {
    e.preventDefault();
    const pieceId = parseInt(e.dataTransfer.getData('text/plain'));
    const piece = pieces.find(p => p.id === pieceId);
    if (!piece.placed) {
        const shipView = document.getElementById('ship-view');
        const rect = shipView.getBoundingClientRect();
        const x = e.clientX - rect.left - offsetX;
        const y = e.clientY - rect.top - offsetY;
        // Snap to nearest target position
        const snapped = snapToGrid(x, y, piece.width, piece.height);
        piece.x = snapped.x;
        piece.y = snapped.y;
        piece.placed = true;
        // Calculate score based on distance from target
        const distance = Math.sqrt(
            Math.pow(piece.x - piece.targetX, 2) +
            Math.pow(piece.y - piece.targetY, 2)
        );
        const maxDistance = Math.sqrt(Math.pow(shipView.clientWidth, 2) + Math.pow(shipView.clientHeight, 2));
        const accuracyForPiece = Math.max(0, 100 - (distance / maxDistance) * 100);
        score += accuracyForPiece;
        placedPieces.push(piece);
        renderShipView();
        updateUI();
        saveGameState();
    }
}

function dragEnd(e) {
    e.target.classList.remove('dragging');
}

// Snap to grid (target positions)
function snapToGrid(x, y, width, height) {
    let bestSnapped = null;
    let bestDistance = Infinity;
    targetPositions.forEach(target => {
        // Check if target is already occupied? For simplicity, allow overlapping (but we mark placed)
        const distance = Math.sqrt(
            Math.pow(x - target.x, 2) + Math.pow(y - target.y, 2)
        );
        if (distance < bestDistance) {
            bestDistance = distance;
            bestSnapped = { x: target.x, y: target.y };
        }
    });
    return bestSnapped;
}

// Render ship view with placed pieces
function renderShipView() {
    const shipView = document.getElementById('ship-view');
    shipView.innerHTML = '';
    placedPieces.forEach(piece => {
        const el = document.createElement('div');
        el.className = 'placed-piece';
        el.style.left = `${piece.x}px`;
        el.style.top = `${piece.y}px`;
        // Apply rotation
        el.style.transform = `rotate(${piece.rotation}deg)`;
        // Adjust size for rotation
        if (piece.rotation % 180 !== 0) {
            el.style.width = `${piece.height}px`;
            el.style.height = `${piece.width}px`;
        } else {
            el.style.width = `${piece.width}px`;
            el.style.height = `${piece.height}px`;
        }
        el.style.background = '#saddlebrown';
        el.style.border = '2px solid #8B4513';
        shipView.appendChild(el);
    });
}

// Update UI elements
function updateUI() {
    document.getElementById('score').textContent = `Score: Math.floor(score)`;
    accuracy = placedPieces.length > 0 ? score / placedPieces.length : 0;
    document.getElementById('accuracy').textContent = `Accuracy: ${Math.floor(accuracy)}%`;
    document.getElementById('progress').textContent = `Progress: ${placedPieces.length}/${totalPieces} pieces placed`;
    if (placedPieces.length === totalPieces) {
        alert(`Congratulations! You built the ship!\nFinal Score: ${Math.floor(score)}\nAverage Accuracy: ${Math.floor(accuracy)}%`);
    }
}

// Setup event listeners
function setupEventListeners() {
    // Rotate button
    document.getElementById('rotate-btn').addEventListener('click', () => {
        if (selectedPiece && !selectedPiece.placed) {
            selectedPiece.rotation = (selectedPiece.rotation + 90) % 360;
            // Update the visual of the selected piece in panel
            const el = document.querySelector(`.piece[data-id="${selectedPiece.id}"]`);
            if (el) {
                el.style.transform = `rotate(${selectedPiece.rotation}deg)`;
                // Adjust size
                if (selectedPiece.rotation % 180 !== 0) {
                    el.style.width = `${selectedPiece.height}px`;
                    el.style.height = `${selectedPiece.width}px`;
                } else {
                    el.style.width = `${selectedPiece.width}px`;
                    el.style.height = `${selectedPiece.height}px`;
                }
            }
        }
    });

    // Reset button
    document.getElementById('reset-btn').addEventListener('click', resetGame);

    // Orbit camera simulation: allow rotating the whole ship view
    // For simplicity, we'll add a touch/drag to rotate the ship-view container
    const shipView = document.getElementById('ship-view');
    let isDraggingView = false;
    let startX = 0;
    let viewRotation = 0;

    shipView.addEventListener('mousedown', (e) => {
        isDraggingView = true;
        startX = e.clientX;
    });

    shipView.addEventListener('mousemove', (e) => {
        if (!isDraggingView) return;
        const dx = e.clientX - startX;
        viewRotation = dx * 0.5; // sensitivity
        shipView.style.transform = `rotateY(${viewRotation}deg)`;
    });

    shipView.addEventListener('mouseup', () => {
        isDraggingView = false;
    });

    shipView.addEventListener('mouseleave', () => {
        isDraggingView = false;
    });

    // Touch support
    shipView.addEventListener('touchstart', (e) => {
        isDraggingView = true;
        startX = e.touches[0].clientX;
    });

    shipView.addEventListener('touchmove', (e) => {
        if (!isDraggingView) return;
        const dx = e.touches[0].clientX - startX;
        viewRotation = dx * 0.5;
        shipView.style.transform = `rotateY(${viewRotation}deg)`;
    });

    shipView.addEventListener('touchend', () => {
        isDraggingView = false;
    });
}

// Save game state to localStorage
function saveGameState() {
    const state = {
        pieces: pieces,
        placedPieces: placedPieces,
        score: score,
        accuracy: accuracy
    };
    localStorage.setItem('titanicShipbuilderState', JSON.stringify(state));
}

// Load game state from localStorage
function loadGameState() {
    const state = localStorage.getItem('titanicShipbuilderState');
    if (state) {
        const parsed = JSON.parse(state);
        pieces = parsed.pieces || [];
        placedPieces = parsed.placedPieces || [];
        score = parsed.score || 0;
        accuracy = parsed.accuracy || 0;
    }
}

// Reset game
function resetGame() {
    if (confirm('Reset the game? All progress will be lost.')) {
        localStorage.removeItem('titanicShipbuilderState');
        pieces = [];
        placedPieces = [];
        score = 0;
        accuracy = 0;
        init();
    }
}

// Initialize on load
window.addEventListener('load', init);
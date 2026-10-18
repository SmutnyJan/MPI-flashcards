/*
 * MPI kartičky – čistě lokální verze.
 * Soubor images.js obsahuje jen názvy úplných obrázků v images/.
 * Prohlížeč si vytváří cestu k verzi *_blurred se stejnou příponou.
 * Žádný GitHub API, žádné požadavky na server, žádné nahrávání souborů.
 */
const $ = (id) => document.getElementById(id);
const elements = {
  sourceLabel: $("sourceLabel"), sourceInfo: document.querySelector(".source-info"),
  counterLabel: $("counterLabel"), flashcard: $("flashcard"), emptyState: $("emptyState"),
  emptyTitle: $("emptyTitle"), emptyText: $("emptyText"), cardNumber: $("cardNumber"),
  cardTitle: $("cardTitle"), sideBadge: $("sideBadge"), cardImage: $("cardImage"),
  previewButton: $("previewButton"), cardHelp: $("cardHelp"), studyControls: $("studyControls"),
  flipButton: $("flipButton"), flipButtonText: $("flipButtonText"), nextButton: $("nextButton"),
  progressSection: $("progressSection"), progressCount: $("progressCount"), progressFill: $("progressFill"),
  viewer: $("viewer"), viewerImage: $("viewerImage"), viewerTitle: $("viewerTitle"),
  viewerCanvas: $("viewerCanvas"), viewerClose: $("viewerClose"), zoomIn: $("zoomIn"),
  zoomOut: $("zoomOut"), zoomReset: $("zoomReset"), zoomLevel: $("zoomLevel"), toast: $("toast"),
};

let cards = [];
let deck = [];
let cardIndex = -1;
let lastIndex = -1;
let isRevealed = false;
let studiedThisRound = 0;
let toastTimeout = 0;
const IMAGE_EXT = /\.(png|jpe?g|webp|gif|avif|svg)$/i;

function shuffled(count, avoidFirst = -1) {
  const result = Array.from({ length: count }, (_, i) => i);
  for (let i = result.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [result[i], result[j]] = [result[j], result[i]];
  }
  if (result.length > 1 && result[0] === avoidFirst) {
    [result[0], result[1]] = [result[1], result[0]];
  }
  return result;
}

function showEmpty(title, description) {
  elements.flashcard.hidden = true;
  elements.studyControls.hidden = true;
  elements.progressSection.hidden = true;
  elements.emptyState.hidden = false;
  elements.emptyTitle.textContent = title;
  elements.emptyText.textContent = description;
  elements.counterLabel.textContent = "0 / 0";
}

function showToast(message) {
  clearTimeout(toastTimeout);
  elements.toast.textContent = message;
  elements.toast.hidden = false;
  toastTimeout = setTimeout(() => { elements.toast.hidden = true; }, 3700);
}

function loadManifest() {
  // images.js je obyčejný JS soubor, takže funguje i při otevření index.html přes file://.
  const names = Array.isArray(window.MPI_IMAGES) ? window.MPI_IMAGES : [];
  const unique = [...new Set(names.filter((name) => typeof name === "string" && IMAGE_EXT.test(name) && !/_blurred\.[^.]+$/i.test(name)))];
  cards = unique.map((fullName) => {
    const dot = fullName.lastIndexOf(".");
    const stem = fullName.slice(0, dot);
    const ext = fullName.slice(dot);
    const fileUrl = (filename) => `images/${encodeURIComponent(filename)}`;
    return {
      displayName: stem,
      full: fileUrl(fullName),
      blurred: fileUrl(`${stem}_blurred${ext}`),
    };
  });
  if (!cards.length) {
    showEmpty("Zatím žádné kartičky", "Vlož obrázky do složky images/ a do images.js napiš názvy úplných obrázků. Můžeš také spustit update_images.py pro automatické vytvoření seznamu.");
    elements.sourceLabel.textContent = "Lokální obrázky · 0 kartiček";
    return;
  }
  deck = shuffled(cards.length);
  lastIndex = -1;
  studiedThisRound = 0;
  elements.sourceLabel.textContent = `Lokální obrázky · ${cards.length} kartiček`;
  elements.sourceInfo.classList.add("ready");
  elements.emptyState.hidden = true;
  elements.flashcard.hidden = false;
  elements.studyControls.hidden = false;
  elements.progressSection.hidden = false;
  nextCard();
}

function nextCard() {
  if (!cards.length) return;
  if (!deck.length) {
    deck = shuffled(cards.length, lastIndex);
    studiedThisRound = 0;
    showToast("Hotovo! Začíná nové kolo.");
  }
  cardIndex = deck.shift();
  lastIndex = cardIndex;
  studiedThisRound++;
  isRevealed = false;
  renderCard();
}

function renderCard() {
  const card = cards[cardIndex];
  const display = card.displayName.replace(/[_-]+/g, " ");
  elements.cardNumber.textContent = `KARTIČKA ${studiedThisRound} Z ${cards.length}`;
  elements.cardTitle.textContent = display;
  elements.cardImage.src = isRevealed ? card.full : card.blurred;
  elements.cardImage.alt = `${display} – ${isRevealed ? "úplné znění" : "zamazaná verze"}`;
  elements.sideBadge.textContent = isRevealed ? "ŘEŠENÍ" : "ZADÁNÍ";
  elements.flipButtonText.textContent = isRevealed ? "Zpět na zadání" : "Otočit kartu";
  elements.cardHelp.textContent = isRevealed ? "Zkontroluj si odpověď a přejdi dál." : "Zkus si definici vybavit, potom otoč kartu.";
  elements.flashcard.classList.toggle("is-revealed", isRevealed);
  elements.counterLabel.textContent = `${studiedThisRound} / ${cards.length}`;
  elements.progressCount.textContent = `${studiedThisRound} z ${cards.length}`;
  elements.progressFill.style.width = `${100 * studiedThisRound / cards.length}%`;
}

function flipCard() {
  if (!cards.length) return;
  isRevealed = !isRevealed;
  renderCard();
}

// --- Zvětšovací prohlížeč: myš, kolečko, dvojklik, dotykové tažení a pinch-to-zoom ---
let zoom = 1;
let offsetX = 0;
let offsetY = 0;
const fingers = new Map();
let dragStart = null;
let pinchStart = null;
let priorFocus = null;

function clamp(value, min, max) { return Math.max(min, Math.min(max, value)); }
function renderZoom() {
  elements.viewerImage.style.transform = `translate(${offsetX}px, ${offsetY}px) scale(${zoom})`;
  elements.zoomLevel.textContent = `${Math.round(zoom * 100)} %`;
}
function setZoom(nextZoom) {
  zoom = clamp(nextZoom, 1, 6);
  if (zoom === 1) { offsetX = 0; offsetY = 0; }
  renderZoom();
}
function resetZoom() { offsetX = 0; offsetY = 0; setZoom(1); }
function openViewer() {
  if (cardIndex < 0) return;
  priorFocus = document.activeElement;
  elements.viewerImage.src = elements.cardImage.src;
  elements.viewerImage.alt = elements.cardImage.alt;
  elements.viewerTitle.textContent = elements.cardTitle.textContent;
  elements.viewer.hidden = false;
  document.body.style.overflow = "hidden";
  resetZoom();
  elements.viewerClose.focus();
}
function closeViewer() {
  if (elements.viewer.hidden) return;
  elements.viewer.hidden = true;
  document.body.style.overflow = "";
  fingers.clear();
  dragStart = null;
  pinchStart = null;
  if (priorFocus && typeof priorFocus.focus === "function") priorFocus.focus();
}
function distance(a, b) { return Math.hypot(a.x - b.x, a.y - b.y); }
function midpoint(a, b) { return { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 }; }
function resetGesture() {
  const points = [...fingers.values()];
  if (points.length === 1) dragStart = { x: points[0].x, y: points[0].y, offsetX, offsetY };
  if (points.length === 2) {
    const mid = midpoint(points[0], points[1]);
    pinchStart = { dist: distance(points[0], points[1]), zoom, x: mid.x, y: mid.y, offsetX, offsetY };
  }
}

elements.viewerCanvas.addEventListener("pointerdown", (event) => {
  if (event.pointerType === "mouse" && event.button !== 0) return;
  elements.viewerCanvas.setPointerCapture(event.pointerId);
  fingers.set(event.pointerId, { x: event.clientX, y: event.clientY });
  resetGesture();
});
elements.viewerCanvas.addEventListener("pointermove", (event) => {
  if (!fingers.has(event.pointerId)) return;
  fingers.set(event.pointerId, { x: event.clientX, y: event.clientY });
  const points = [...fingers.values()];
  if (points.length === 1 && dragStart && zoom > 1) {
    offsetX = dragStart.offsetX + points[0].x - dragStart.x;
    offsetY = dragStart.offsetY + points[0].y - dragStart.y;
    renderZoom();
  } else if (points.length === 2 && pinchStart) {
    const mid = midpoint(points[0], points[1]);
    zoom = clamp(pinchStart.zoom * distance(points[0], points[1]) / Math.max(pinchStart.dist, 1), 1, 6);
    offsetX = zoom === 1 ? 0 : pinchStart.offsetX + mid.x - pinchStart.x;
    offsetY = zoom === 1 ? 0 : pinchStart.offsetY + mid.y - pinchStart.y;
    renderZoom();
  }
});
for (const eventType of ["pointerup", "pointercancel", "lostpointercapture"]) {
  elements.viewerCanvas.addEventListener(eventType, (event) => {
    fingers.delete(event.pointerId);
    dragStart = null;
    pinchStart = null;
    resetGesture();
  });
}
elements.viewerCanvas.addEventListener("wheel", (event) => {
  event.preventDefault();
  setZoom(zoom * (event.deltaY < 0 ? 1.15 : 1 / 1.15));
}, { passive: false });
elements.viewerCanvas.addEventListener("dblclick", () => setZoom(zoom < 2 ? 2.5 : 1));
elements.zoomIn.addEventListener("click", () => setZoom(zoom * 1.35));
elements.zoomOut.addEventListener("click", () => setZoom(zoom / 1.35));
elements.zoomReset.addEventListener("click", resetZoom);
elements.viewerClose.addEventListener("click", closeViewer);
elements.viewer.addEventListener("click", (event) => { if (event.target === elements.viewer) closeViewer(); });

elements.flipButton.addEventListener("click", flipCard);
elements.nextButton.addEventListener("click", nextCard);
elements.previewButton.addEventListener("click", openViewer);
elements.cardImage.addEventListener("error", () => showToast("Obrázek chybí. Zkontroluj názvy souborů v images/ a images.js."));
document.addEventListener("keydown", (event) => {
  if (!elements.viewer.hidden) {
    if (event.key === "Escape") { event.preventDefault(); closeViewer(); }
    if (event.key === "+" || event.key === "=") { event.preventDefault(); setZoom(zoom * 1.35); }
    if (event.key === "-") { event.preventDefault(); setZoom(zoom / 1.35); }
    // Focus stays inside modal for keyboard users.
    if (event.key === "Tab") {
      const controls = [...elements.viewer.querySelectorAll("button")];
      const current = controls.indexOf(document.activeElement);
      if (event.shiftKey && current === 0) { event.preventDefault(); controls[controls.length - 1].focus(); }
      if (!event.shiftKey && current === controls.length - 1) { event.preventDefault(); controls[0].focus(); }
    }
    return;
  }
  if (event.target.matches("input, textarea, select") || event.altKey || event.ctrlKey || event.metaKey) return;
  if (event.code === "Space" && !event.target.matches("button")) { event.preventDefault(); flipCard(); }
  if (event.key === "ArrowRight") { event.preventDefault(); nextCard(); }
});

loadManifest();

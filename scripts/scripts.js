
let selectedNail = null;
let undoStack = [];
let redoStack = [];
let activeMenu = "shape";
let decorationCounter = 0;
let draggedDecoration = null;
let savedPreviewURL = null;
let selectedPattern = null;
let selectedDecoration = null;
let currentShape = "coffin";

function toggleNav() {
  const nav = document.querySelector("nav");
  nav.style.display = nav.style.display === "flex" ? "none" : "flex";
}

function checkHeader() {
  const h1 = document.querySelector("h1");
  const nav = document.querySelector("nav");
  const toggle = document.querySelector(".nav-toggle");
  if (h1.offsetHeight > 70) {
    toggle.style.display = "block";
    nav.style.display = "none";
  } else {
    toggle.style.display = "none";
    nav.style.display = "flex";
  }
}
window.addEventListener("load", checkHeader);
window.addEventListener("resize", checkHeader);

function toggleMenu(tabId) {
  const isActive = document.getElementById(tabId).classList.contains("active");
  document.querySelectorAll(".menu-content").forEach((c) => c.classList.remove("active"));
  document.querySelectorAll(".menu-option").forEach((c) => c.classList.remove("active"));
  if (!isActive) {
    document.getElementById(tabId).classList.add("active");
    document.querySelector(`.menu-option[onclick*="${tabId}"]`).classList.add("active");
    activeMenu = tabId;
  }
}

function applyColor(event, color) {
  if (selectedNail) {
    pushUndo({ type: "color", nail: selectedNail, oldColor: selectedNail.getAttribute("fill"), newColor: color });
    selectedNail.setAttribute("fill", color);
    removeTopCoat(selectedNail);
  }
  document.querySelectorAll(".color-btn").forEach((btn) => btn.classList.remove("selected"));
  if (event.currentTarget.classList.contains("color-btn")) {
    event.currentTarget.classList.add("selected");
  }
}

function applyTopCoat(type) {
  const nails = document.querySelectorAll(".nail-fill");
  if (!nails.length) return;
  const svg = nails[0].ownerSVGElement;
  ensureGlossyGradient(svg);
  nails.forEach((nail) => {
    removeTopCoat(nail);
    const overlay = nail.cloneNode();
    overlay.removeAttribute("class");
    overlay.setAttribute("pointer-events", "none");
    overlay.classList.add("topcoat-layer");
    if (type === "glossy") {
      overlay.setAttribute("fill", "url(#glossyGradient)");
      overlay.setAttribute("opacity", "0.6");
    } else {
      overlay.setAttribute("fill", "#ffffff");
      overlay.setAttribute("opacity", "0.3");
      overlay.style.filter = "blur(0.4px)";
    }
    insertAboveNail(nail, overlay);
  });
}

function removeAllTopCoat() {
  document.querySelectorAll(".topcoat-layer").forEach((layer) => layer.remove());
}

function removeTopCoat(nail) {
  const svg = nail.ownerSVGElement;
  svg.querySelectorAll(".topcoat-layer").forEach((l) => l.remove());
}

function ensureGlossyGradient(svg) {
  if (svg.querySelector("#glossyGradient")) return;
  const defs = document.createElementNS("http://www.w3.org/2000/svg", "defs");
  const grad = document.createElementNS("http://www.w3.org/2000/svg", "linearGradient");
  grad.id = "glossyGradient";
  grad.setAttribute("x1", "0%"); grad.setAttribute("y1", "0%"); grad.setAttribute("x2", "0%"); grad.setAttribute("y2", "100%");
  const stop1 = document.createElementNS("http://www.w3.org/2000/svg", "stop"); stop1.setAttribute("offset", "0%"); stop1.setAttribute("stop-color", "white"); stop1.setAttribute("stop-opacity", "0.6");
  const stop2 = document.createElementNS("http://www.w3.org/2000/svg", "stop"); stop2.setAttribute("offset", "100%"); stop2.setAttribute("stop-color", "white"); stop2.setAttribute("stop-opacity", "0");
  grad.append(stop1, stop2); defs.appendChild(grad); svg.insertBefore(defs, svg.firstChild);
}

function changeShape(shapeName) {
  currentShape = shapeName;
  loadHand("left-hand", `./images/${shapeName}shape_left.svg`);
  loadHand("right-hand", `./images/${shapeName}shape_right.svg`);
}

async function loadHand(containerId, svgPath) {
  const container = document.getElementById(containerId);
  const response = await fetch(svgPath);
  const svgText = await response.text();
  const parser = new DOMParser();
  const svgEl = parser.parseFromString(svgText, "image/svg+xml").documentElement;
  container.innerHTML = "";
  container.appendChild(svgEl);
  enableDropOnNails();
}

function insertAboveNail(nail, element) {
  const parent = nail.parentNode;
  let ref = nail.nextSibling;
  while (ref && ref.classList && ref.classList.contains("topcoat-layer")) {
    ref = ref.nextSibling;
  }
  parent.insertBefore(element, ref);
}

function selectPattern(imagePath) { selectedPattern = imagePath; }
function selectDecoration(imagePath) { selectedDecoration = imagePath; }

function applyPattern(nail, patternImagePath) {
  const svg = nail.ownerSVGElement;
  const bbox = nail.getBBox();
  svg.querySelectorAll(`.pattern-${nail.id}`).forEach((el) => el.remove());
  svg.querySelector(`#clip-${nail.id}`)?.remove();
  const defs = svg.querySelector("defs") || (() => {
    const d = document.createElementNS("http://www.w3.org/2000/svg", "defs");
    svg.insertBefore(d, svg.firstChild);
    return d;
  })();
  const clip = document.createElementNS("http://www.w3.org/2000/svg", "clipPath");
  clip.id = `clip-${nail.id}`;
  const nailClone = nail.cloneNode();
  clip.appendChild(nailClone);
  defs.appendChild(clip);
  const img = document.createElementNS("http://www.w3.org/2000/svg", "image");
  img.setAttributeNS("http://www.w3.org/1999/xlink", "href", patternImagePath);
  img.setAttribute("x", bbox.x);
  img.setAttribute("y", bbox.y);
  img.setAttribute("width", bbox.width);
  img.setAttribute("height", bbox.height);
  img.setAttribute("opacity", "0.5");
  img.setAttribute("preserveAspectRatio", "none");
  img.setAttribute("clip-path", `url(#clip-${nail.id})`);
  img.classList.add(`pattern-${nail.id}`);
  insertAboveNail(nail, img);
}

function enableDropOnNails() {
  const nails = document.querySelectorAll(".nail-fill");
  nails.forEach((nail) => {
    if (!nail.getAttribute("fill")) nail.setAttribute("fill", "#fff5ee");
    nail.addEventListener("click", () => {
      selectedNail = nail;
      document.getElementById("selected-info-panel").innerHTML = `❤️ Selected: <strong>${nail.id || "(no id)"}</strong>`;
      if (selectedPattern) applyPattern(nail, selectedPattern);
      if (selectedDecoration) applyDecoration(nail, selectedDecoration);
      selectedPattern = null;
      selectedDecoration = null;
    });
  });
}

function applyDecoration(nail, imagePath) {
  const svg = nail.ownerSVGElement;
  const bbox = nail.getBBox();
  

  const group = document.createElementNS("http://www.w3.org/2000/svg", "g");
  group.classList.add("decoration-layer");


  const img = document.createElementNS("http://www.w3.org/2000/svg", "image");
  img.setAttributeNS("http://www.w3.org/1999/xlink", "href", imagePath);
  img.setAttribute("width", bbox.width * 0.5);
  img.setAttribute("height", bbox.height * 0.5);
  img.setAttribute("x", bbox.x + bbox.width * 0.25);
  img.setAttribute("y", bbox.y + bbox.height * 0.25);
  img.setAttribute("pointer-events", "visiblePainted"); 

  group.appendChild(img);
  insertAboveNail(nail, group);

  group.addEventListener("mousedown", (e) => {
    draggedDecoration = { target: group, startX: e.clientX, startY: e.clientY, origTransform: group.getAttribute("transform") || "" };
    e.preventDefault();
  });
}

document.addEventListener("mousemove", (e) => {
  if (draggedDecoration) {
    const dx = e.clientX - draggedDecoration.startX;
    const dy = e.clientY - draggedDecoration.startY;
    draggedDecoration.target.setAttribute("transform", `${draggedDecoration.origTransform} translate(${dx}, ${dy})`);
  }
});

document.addEventListener("mouseup", () => {
  draggedDecoration = null;
});

function pushUndo(action) { undoStack.push(action); }
function undoAction() {
  const last = undoStack.pop();
  if (!last) return;
  redoStack.push(last);
}
function redoAction() {
  const next = redoStack.pop();
  if (!next) return;
  undoStack.push(next);
}

function resetAll() {
  undoStack = [];
  redoStack = [];
  changeShape(currentShape);
  selectedNail = null;
  selectedPattern = null;
  selectedDecoration = null;
  document.getElementById("selected-info-panel").innerHTML = "❤️ Selected: (none)";
}

window.onload = () => {
  changeShape(currentShape);
  document.querySelector(".menu-option").classList.add("active");
  document.getElementById("shape").classList.add("active");
};

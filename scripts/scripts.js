let selectedNail = null;
let undoStack = [];
let activeMenu = "shape";
let decorationCounter = 0; // Unique ID for each decoration
let draggedDecoration = null; // For moving decorations

// Toggle mobile navigation menu
function toggleNav() {
  var nav = document.querySelector('nav');
  if (nav.style.display === 'flex') {
    nav.style.display = 'none';
  } else {
    nav.style.display = 'flex';
  }
}

// Check if h1 title wraps into two lines
function checkHeader() {
  var h1 = document.querySelector('h1');
  var nav = document.querySelector('nav');
  var toggle = document.querySelector('.nav-toggle');

  if (h1.offsetHeight > 70) {
    toggle.style.display = 'block';
    nav.style.display = 'none';
  } else {
    toggle.style.display = 'none';
    nav.style.display = 'flex';
  }
}

window.addEventListener('load', checkHeader);
window.addEventListener('resize', checkHeader);

// Toggle between menu sections
function toggleMenu(tabId) {
  const isActive = document.getElementById(tabId).classList.contains("active");
  if (isActive) {
    document.getElementById(tabId).classList.remove("active");
    document.querySelector(`.menu-option[onclick*="${tabId}"]`).classList.remove("active");
  } else {
    if (activeMenu && activeMenu !== tabId) {
      document.getElementById(activeMenu).classList.remove("active");
      document.querySelector(`.menu-option[onclick*="${activeMenu}"]`).classList.remove("active");
    }
    document.getElementById(tabId).classList.add("active");
    document.querySelector(`.menu-option[onclick*="${tabId}"]`).classList.add("active");
    activeMenu = tabId;
  }
}

// Apply color
function applyColor(event, color) {
  event.stopPropagation();
  if (selectedNail) {
    pushUndo({
      type: 'color',
      nail: selectedNail,
      oldColor: selectedNail.getAttribute('fill')
    });
    selectedNail.setAttribute("fill", color);
    removeTopCoat(selectedNail);
  }
  document.querySelectorAll(".color-btn").forEach((btn) => btn.classList.remove("selected"));
  if (event.currentTarget.classList.contains("color-btn")) {
    event.currentTarget.classList.add("selected");
  }
}

// Apply top coat
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

    if (type === "glossy") {
      overlay.setAttribute("fill", "url(#glossyGradient)");
      overlay.setAttribute("opacity", "0.6");
    } else if (type === "matte") {
      overlay.setAttribute("fill", "#ffffff");
      overlay.setAttribute("opacity", "0.3");
      overlay.style.filter = "blur(0.4px)";
    }

    overlay.classList.add("topcoat-layer");
    nail.parentNode.appendChild(overlay);
  });
}

// Remove all top coat layers
function removeAllTopCoat() {
  const nails = document.querySelectorAll(".nail-fill");
  nails.forEach((nail) => removeTopCoat(nail));
}

function removeTopCoat(nail) {
  const svg = nail.ownerSVGElement;
  const allLayers = svg.querySelectorAll(".topcoat-layer");
  allLayers.forEach((layer) => layer.remove());
}

function ensureGlossyGradient(svg) {
  if (svg.querySelector("#glossyGradient")) return;
  const defs = document.createElementNS("http://www.w3.org/2000/svg", "defs");
  const grad = document.createElementNS("http://www.w3.org/2000/svg", "linearGradient");
  grad.setAttribute("id", "glossyGradient");
  grad.setAttribute("x1", "0%");
  grad.setAttribute("y1", "0%");
  grad.setAttribute("x2", "0%");
  grad.setAttribute("y2", "100%");

  const stop1 = document.createElementNS("http://www.w3.org/2000/svg", "stop");
  stop1.setAttribute("offset", "0%");
  stop1.setAttribute("stop-color", "white");
  stop1.setAttribute("stop-opacity", "0.6");

  const stop2 = document.createElementNS("http://www.w3.org/2000/svg", "stop");
  stop2.setAttribute("offset", "100%");
  stop2.setAttribute("stop-color", "white");
  stop2.setAttribute("stop-opacity", "0");

  grad.appendChild(stop1);
  grad.appendChild(stop2);
  defs.appendChild(grad);
  svg.insertBefore(defs, svg.firstChild);
}

// Switch nail shapes
function changeShape(shapeName) {
  loadHand("left-hand", `./images/${shapeName}shape_left.svg`);
  loadHand("right-hand", `./images/${shapeName}shape_right.svg`);
}

// Load hand SVG
async function loadHand(containerId, svgPath) {
  const container = document.getElementById(containerId);
  const response = await fetch(svgPath);
  const svgText = await response.text();
  const parser = new DOMParser();
  const svgDoc = parser.parseFromString(svgText, "image/svg+xml");
  const svgEl = svgDoc.documentElement;

  container.innerHTML = "";
  container.appendChild(svgEl);

  enableDropOnNails();
}

// Start dragging a decoration
function startDrag(event, imagePath) {
  event.dataTransfer.setData("text/plain", imagePath);
}

// Enable nails to accept drops
function enableDropOnNails() {
  const nails = document.querySelectorAll(".nail-fill");
  nails.forEach((nail) => {
    if (!nail.getAttribute("fill")) {
      nail.setAttribute("fill", "#fff5ee");
    }
    nail.addEventListener("click", () => {
      selectedNail = nail;
      document.getElementById("selected-info").innerHTML = `❤️ Selected: <strong>${nail.id || "(no id)"}</strong>`;
    });
    nail.addEventListener("dragover", (e) => {
      e.preventDefault();
    });
    nail.addEventListener("drop", (e) => {
      e.preventDefault();
      const imagePath = e.dataTransfer.getData("text/plain");
      if (imagePath) {
        applyDecoration(nail, imagePath);
      }
    });
  });
}

// Apply a decoration to a nail
function applyDecoration(nail, imagePath) {
  const svg = nail.ownerSVGElement;
  const bbox = nail.getBBox();
  const centerX = bbox.x + bbox.width / 2;
  const centerY = bbox.y + bbox.height / 2;

  const img = document.createElementNS("http://www.w3.org/2000/svg", "image");
  img.setAttributeNS("http://www.w3.org/1999/xlink", "href", imagePath);
  img.setAttribute("width", "30");
  img.setAttribute("height", "30");

  const offsetX = Math.random() * 20 - 10;
  const offsetY = Math.random() * 20 - 10;
  img.setAttribute("x", centerX - 15 + offsetX);
  img.setAttribute("y", centerY - 15 + offsetY);

  img.classList.add(`decoration-${nail.id}`);
  img.setAttribute("id", `decoration-${nail.id}-${decorationCounter++}`);

  svg.appendChild(img);

  // Allow dragging this decoration
  img.addEventListener('mousedown', (e) => {
    draggedDecoration = img;
    e.preventDefault();
  });
}

// Handle mouse move and drop for decoration dragging
document.addEventListener('mousemove', (e) => {
  if (draggedDecoration) {
    draggedDecoration.setAttribute("x", e.offsetX - 15);
    draggedDecoration.setAttribute("y", e.offsetY - 15);
  }
});

document.addEventListener('mouseup', (e) => {
  if (draggedDecoration) {
    draggedDecoration = null;
  }
});

// Save undo history
function pushUndo(action) {
  undoStack.push(action);
}

// Undo the last action
function undoAction() {
  const last = undoStack.pop();
  if (!last) return;

  if (last.type === 'color') {
    last.nail.setAttribute("fill", last.oldColor);
  } else if (last.type === 'decoration') {
    const decor = document.getElementById(last.id);
    if (decor) {
      decor.remove();
    }
  }
}

// Reset all nails
function resetAll() {
  const nails = document.querySelectorAll(".nail-fill");
  nails.forEach((nail) => {
    nail.setAttribute("fill", "#fff5ee");
    removeTopCoat(nail);
  });

  const decorations = document.querySelectorAll("[class^='decoration-']");
  decorations.forEach((decor) => {
    decor.remove();
  });

  undoStack = [];
}

// Initialize page
window.onload = () => {
  changeShape("coffin");
  document.querySelector(".menu-option").classList.add("active");
  document.getElementById("shape").classList.add("active");
  activeMenu = "shape";
};

function handleFileUpload(event) {
  const file = event.target.files[0];
  if (!file) return;

  const reader = new FileReader();
  reader.onload = function(e) {
    const base64 = e.target.result;
    createUploadedDecoration(base64);
  };
  reader.readAsDataURL(file);
}

// Dynamically create a new draggable decoration
function createUploadedDecoration(base64Image) {
  const decorMenu = document.getElementById("decor");
  
  const button = document.createElement("button");
  const img = document.createElement("img");
  img.src = base64Image;
  img.style.width = "50px";
  img.style.height = "50px";
  img.draggable = true;
  img.ondragstart = (e) => startDrag(e, base64Image);

  button.appendChild(img);
  decorMenu.appendChild(button);
}
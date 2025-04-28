let selectedNail = null;
let undoStack = [];
let activeMenu = "shape";
let decorationCounter = 0; // Unique ID for each decoration
let draggedDecoration = null; // For moving decorations
let savedPreviewURL = null; // store preview URL
let selectedPattern = null; // currently selected pattern
let selectedDecoration = null; // your original decoration

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
      document.getElementById("selected-info-panel").innerHTML = `❤️ Selected: <strong>${nail.id || "(no id)"}</strong>`;
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

// Preview function: create a vertically stacked preview of nails including decorations
function previewDesign() {
  const left = document.getElementById('left-hand').querySelector('svg');
  const right = document.getElementById('right-hand').querySelector('svg');
  if (!left || !right) return;

  const wrapper = document.createElementNS("http://www.w3.org/2000/svg", "svg");
  wrapper.setAttribute('xmlns', 'http://www.w3.org/2000/svg');
  wrapper.setAttribute('width', '400');
  wrapper.setAttribute('height', '600'); // Smaller height, reduced spacing

  // Clone and adjust left hand
  const leftClone = left.cloneNode(true);
  const leftGroup = document.createElementNS("http://www.w3.org/2000/svg", "g");
  leftGroup.appendChild(leftClone);
  leftGroup.setAttribute('transform', 'translate(50, 30) scale(0.8)'); // tighten spacing

  // Clone and adjust right hand
  const rightClone = right.cloneNode(true);
  const rightGroup = document.createElementNS("http://www.w3.org/2000/svg", "g");
  rightGroup.appendChild(rightClone);
  rightGroup.setAttribute('transform', 'translate(50, 300) scale(0.8)');

  wrapper.appendChild(leftGroup);
  wrapper.appendChild(rightGroup);

  // Serialize to SVG string
  const serializer = new XMLSerializer();
  const svgString = serializer.serializeToString(wrapper);
  const blob = new Blob([svgString], { type: "image/svg+xml;charset=utf-8" });
  const url = URL.createObjectURL(blob);

  const img = new Image();
  img.onload = function () {
    const canvas = document.createElement('canvas');
    canvas.width = 400;
    canvas.height = 600;
    const ctx = canvas.getContext('2d');
    ctx.fillStyle = "#a48cb1"; // your background color
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.drawImage(img, 0, 0);

    canvas.toBlob(function (blob) {
      if (savedPreviewURL) {
        URL.revokeObjectURL(savedPreviewURL);
      }
      savedPreviewURL = URL.createObjectURL(blob);

      // Show preview
      showPreviewImage(savedPreviewURL);
    });

    URL.revokeObjectURL(url);
  };
  img.src = url;
}

// Show preview image in page
// Show preview image in page (with a close button)
function showPreviewImage(imageUrl) {
  let previewContainer = document.getElementById('preview-container');
  if (!previewContainer) {
    previewContainer = document.createElement('div');
    previewContainer.id = 'preview-container';
    previewContainer.style.textAlign = 'center';
    previewContainer.style.marginTop = '2rem';
    document.body.appendChild(previewContainer);
  }
  previewContainer.innerHTML = `
    <div style="position: relative; display: inline-block;">
      <img src="${imageUrl}" alt="Preview" style="max-width: 90%; border: 2px solid white; border-radius: 8px;"/>
      <button onclick="closePreview()" style="
        position: absolute;
        top: 5px;
        right: 5px;
        background: rgba(0,0,0,0.5);
        color: white;
        border: none;
        border-radius: 50%;
        width: 30px;
        height: 30px;
        font-size: 18px;
        cursor: pointer;
      ">×</button>
    </div>
    <br><br>
    <button onclick="downloadPreview()">Download</button>
  `;
}

// Close preview image
function closePreview() {
  const previewContainer = document.getElementById('preview-container');
  if (previewContainer) {
    previewContainer.remove();
  }
}


// Download the previewed image
function downloadPreview() {
  if (!savedPreviewURL) {
    alert("Please click Preview first!");
    return;
  }
  const today = new Date();
  const yyyy = today.getFullYear();
  const mm = String(today.getMonth() + 1).padStart(2, '0');
  const dd = String(today.getDate()).padStart(2, '0');
  const filename = `my_nail_design_${yyyy}-${mm}-${dd}.png`;

  const a = document.createElement('a');
  a.href = savedPreviewURL;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
}

// pattern
function selectPattern(imagePath) {
  selectedPattern = imagePath;
}
function applyPattern(nail, patternImagePath) {
  const svg = nail.ownerSVGElement;
  const bbox = nail.getBBox();

  // Remove old pattern if exists
  const oldPattern = svg.querySelector(`.pattern-${nail.id}`);
  if (oldPattern) {
    oldPattern.remove();
  }

  const img = document.createElementNS("http://www.w3.org/2000/svg", "image");
  img.setAttributeNS(null, "href", patternImagePath);
  img.setAttribute("width", bbox.width);
  img.setAttribute("height", bbox.height);
  img.setAttribute("x", bbox.x);
  img.setAttribute("y", bbox.y);
  img.setAttribute("opacity", "0.5");
  img.classList.add(`pattern-${nail.id}`);

  svg.appendChild(img);
}


nail.addEventListener("click", () => {
  selectedNail = nail;
  document.getElementById("selected-info").innerHTML = `❤️ Selected: <strong>${nail.id || "(no id)"}</strong>`;

  // If pattern is selected, apply it
  if (selectedPattern) {
    applyPattern(nail, selectedPattern);
    selectedPattern = null;
  }

  // If decoration is selected 
  if (selectedDecoration) {
    applyDecoration(nail, selectedDecoration);
    selectedDecoration = null;
  }
});
let selectedNail = null;
let undoStack = [];
let activeMenu = "shape";

function toggleNav() {
  var nav = document.querySelector('nav');
  if (nav.style.display === 'flex') {
    nav.style.display = 'none';
  } else {
    nav.style.display = 'flex';
  }
}

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

function toggleMenu(tabId) {
  // Check if this menu is already active
  const isActive = document.getElementById(tabId).classList.contains("active");

  if (isActive) {
    // If it's already active, just close it
    document.getElementById(tabId).classList.remove("active");
    document
      .querySelector(`.menu-option[onclick*="${tabId}"]`)
      .classList.remove("active");
  } else {
    // If a different menu is being opened, close the current one
    if (activeMenu && activeMenu !== tabId) {
      document.getElementById(activeMenu).classList.remove("active");
      document
        .querySelector(`.menu-option[onclick*="${activeMenu}"]`)
        .classList.remove("active");
    }

    // Open the clicked menu
    document.getElementById(tabId).classList.add("active");
    document
      .querySelector(`.menu-option[onclick*="${tabId}"]`)
      .classList.add("active");
    activeMenu = tabId;
  }
}

function switchTab(tabId) {
  toggleMenu(tabId);
}

function applyColor(event, color) {
  event.stopPropagation();
  if (selectedNail) {
    pushUndo(selectedNail);
    selectedNail.setAttribute("fill", color);
    removeTopCoat(selectedNail);
  }

  document
    .querySelectorAll(".color-btn")
    .forEach((btn) => btn.classList.remove("selected"));
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
    pushUndo(nail);
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
  const grad = document.createElementNS(
    "http://www.w3.org/2000/svg",
    "linearGradient"
  );
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

function changeShape(shapeName) {
  console.log(shapeName);
  loadHand("left-hand", `./images/${shapeName}shape_left.svg`);
  loadHand("right-hand", `./images/${shapeName}shape_right.svg`);
}

async function loadHand(containerId, svgPath) {
  const container = document.getElementById(containerId);
  const response = await fetch(svgPath);
  const svgText = await response.text();
  const parser = new DOMParser();
  const svgDoc = parser.parseFromString(svgText, "image/svg+xml");
  const svgEl = svgDoc.documentElement;

  container.innerHTML = "";
  container.appendChild(svgEl);

  const nails = container.querySelectorAll(".nail-fill");
  nails.forEach((nail) => {
    if (!nail.getAttribute("fill")) {
      nail.setAttribute("fill", "#fff5ee");
    }
    nail.addEventListener("click", () => {
      selectedNail = nail;
      document.getElementById(
        "selected-info"
      ).innerHTML = `❤️ Selected: <strong>${nail.id || "(no id)"}</strong>`;
    });
  });
}

function resetAll() {
  const nails = document.querySelectorAll(".nail-fill");
  nails.forEach((nail) => {
    nail.setAttribute("fill", "#fff5ee");
    removeTopCoat(nail);
  });
  undoStack = [];
}

function pushUndo(nail) {
  const current = {
    element: nail,
    color: nail.getAttribute("fill"),
    hadTopCoat: nail.ownerSVGElement.querySelector(".topcoat-layer") !== null,
  };
  undoStack.push(current);
}

function undoAction() {
  const last = undoStack.pop();
  if (!last) return;

  last.element.setAttribute("fill", last.color);
  if (last.hadTopCoat) {
    applyTopCoat("glossy");
  } else {
    removeTopCoat(last.element);
  }
}

window.onload = () => {
  changeShape("coffin");
  // Set the first tab as active by default
  document.querySelector(".menu-option").classList.add("active");
  document.getElementById("shape").classList.add("active");
  activeMenu = "shape";
};
message.txt
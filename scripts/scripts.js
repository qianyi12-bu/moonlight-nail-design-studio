let selectedNail = null;
let undoStack = [];
let redoStack = [];
let activeMenu = "shape";
let decorationCounter = 0;
let draggedDecoration = null;
let savedPreviewURL = null;
let selectedPattern = null;
let selectedDecoration = null;
let selectedColor = null;
let currentShape = "coffin";

// function toggleNav() {
//   const nav = document.querySelector("nav");
//   nav.style.display = nav.style.display === "flex" ? "none" : "flex";
// }
//
// function checkHeader() {
//   const h1 = document.querySelector("h1");
//   const nav = document.querySelector("nav");
//   const toggle = document.querySelector(".nav-toggle");
//   if (h1.offsetHeight > 70) {
//     toggle.style.display = "block";
//     nav.style.display = "none";
//   } else {
//     toggle.style.display = "none";
//     nav.style.display = "flex";
//   }
// }
// window.addEventListener("load", checkHeader);
// window.addEventListener("resize", checkHeader);

function toggleMenu(tabId) {
  const isActive = document.getElementById(tabId).classList.contains("active");
  document
    .querySelectorAll(".menu-content")
    .forEach((c) => c.classList.remove("active"));
  document
    .querySelectorAll(".menu-option")
    .forEach((c) => c.classList.remove("active"));
  if (!isActive) {
    document.getElementById(tabId).classList.add("active");
    document
      .querySelector(`.menu-option[onclick*="${tabId}"]`)
      .classList.add("active");
    activeMenu = tabId;
  }
}

function applyColor(event, color) {
  // Clear other selections first
  selectedPattern = null;
  selectedDecoration = null;

  // Then set the color
  selectedColor = color;
  document
    .querySelectorAll(".color-btn")
    .forEach((btn) => btn.classList.remove("selected"));
  if (event.currentTarget.classList.contains("color-btn")) {
    event.currentTarget.classList.add("selected");
  }
}

function removeTopCoat(nail) {
  const existingTopCoat = nail.parentNode.querySelector(`.topcoat-${nail.id}`);
  if (existingTopCoat) {
    existingTopCoat.remove();
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
    overlay.classList.add(`topcoat-${nail.id}`);
    if (type === "glossy") {
      overlay.setAttribute("fill", "url(#glossyGradient)");
      overlay.setAttribute("opacity", "0.6");
    } else {
      overlay.setAttribute("fill", "#ffffff");
      overlay.setAttribute("opacity", "0.3");
      overlay.style.filter = "blur(0.4px)";
    }
    // Always put topcoat as the last (top) layer
    insertAboveNail(nail, overlay);
  });
}

function removeAllTopCoat() {
  document
    .querySelectorAll(".topcoat-layer")
    .forEach((layer) => layer.remove());
}

function ensureGlossyGradient(svg) {
  if (svg.querySelector("#glossyGradient")) return;
  const defs = document.createElementNS("http://www.w3.org/2000/svg", "defs");
  const grad = document.createElementNS(
    "http://www.w3.org/2000/svg",
    "linearGradient"
  );
  grad.id = "glossyGradient";
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
  grad.append(stop1, stop2);
  defs.appendChild(grad);
  svg.insertBefore(defs, svg.firstChild);
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
  const svgEl = parser.parseFromString(
    svgText,
    "image/svg+xml"
  ).documentElement;
  container.innerHTML = "";
  container.appendChild(svgEl);

  // Remove old event listeners from all nails
  const oldNails = document.querySelectorAll(".nail-fill");
  oldNails.forEach((nail) => {
    const newNail = nail.cloneNode(true);
    nail.parentNode.replaceChild(newNail, nail);
  });

  // Add new event listeners
  enableDropOnNails();
}

function insertAboveNail(nail, element) {
  const parent = nail.parentNode;

  // Different insertion point based on element type to maintain proper layering
  if (element.classList.contains("pattern-layer")) {
    // Insert pattern right above the nail
    parent.insertBefore(element, nail.nextSibling);
  } else if (element.classList.contains("decoration-layer")) {
    // Insert decorations above patterns but below topcoat
    let ref = nail.nextSibling;
    while (
      ref &&
      ref.classList &&
      (ref.classList.contains("pattern-layer") ||
        ref.classList.contains("pattern-" + nail.id))
    ) {
      ref = ref.nextSibling;
    }
    parent.insertBefore(element, ref);
  } else if (element.classList.contains("topcoat-layer")) {
    // Always put topcoat as the last (top) layer
    parent.appendChild(element);
  } else {
    // Default insertion (for backward compatibility)
    let ref = nail.nextSibling;
    parent.insertBefore(element, ref);
  }
}

function selectPattern(imagePath) {
  // Clear other selections first
  selectedColor = null;
  selectedDecoration = null;

  // Then set the pattern
  selectedPattern = imagePath;

  // Reset visual selected states
  document
    .querySelectorAll(".color-btn")
    .forEach((btn) => btn.classList.remove("selected"));
}

function selectDecoration(imagePath) {
  // Clear other selections first
  selectedColor = null;
  selectedPattern = null;

  // Then set the decoration
  selectedDecoration = imagePath;

  // Reset visual selected states
  document
    .querySelectorAll(".color-btn")
    .forEach((btn) => btn.classList.remove("selected"));
}

function applyPattern(nail, patternImagePath, skipUndo = false) {
  const svg = nail.ownerSVGElement;
  const bbox = nail.getBBox();

  // First remove ALL previous pattern-related elements for this nail
  svg.querySelectorAll(`.pattern-${nail.id}`).forEach((el) => el.remove());

  // Save undo action for pattern removal if there was a pattern and we're not skipping undo
  const oldClip = svg.querySelector(`#clip-${nail.id}`);
  if (oldClip && !skipUndo) {
    pushUndo({
      type: "pattern",
      nail: nail,
      isAdd: false,
      patternPath: null, // We don't know the old pattern path
    });
  }

  // Remove the previous clipPath
  if (oldClip) {
    oldClip.remove();
  }

  // Ensure we have defs element
  const defs =
    svg.querySelector("defs") ||
    (() => {
      const d = document.createElementNS("http://www.w3.org/2000/svg", "defs");
      svg.insertBefore(d, svg.firstChild);
      return d;
    })();

  // Create new clipPath
  const clip = document.createElementNS(
    "http://www.w3.org/2000/svg",
    "clipPath"
  );
  clip.id = `clip-${nail.id}`;
  const nailClone = nail.cloneNode();
  clip.appendChild(nailClone);
  defs.appendChild(clip);

  // Create the pattern image
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
  img.classList.add("pattern-layer");

  // Make sure the pattern doesn't block mouse events
  img.setAttribute("pointer-events", "none");

  // Insert the new pattern above the nail
  insertAboveNail(nail, img);

  // Save undo information if we're not skipping undo
  if (!skipUndo) {
    pushUndo({
      type: "pattern",
      nail: nail,
      isAdd: true,
      patternPath: patternImagePath,
    });
  }
}

function handleFileUpload(event) {
  const file = event.target.files[0];
  if (file && file.type === "image/png") {
    const reader = new FileReader();
    reader.onload = (e) => {
      const imageUrl = e.target.result;

      // Create a unique ID for this decoration
      const decorationId = `custom-${Date.now()}.png`;

      // Create new decoration button
      const newDecorationBtn = document.createElement("button");
      newDecorationBtn.className = "design-option-btn";
      newDecorationBtn.onclick = () => selectDecoration(decorationId);

      // Create image element
      const img = document.createElement("img");
      img.src = imageUrl;
      img.alt = "Custom Decoration";
      img.draggable = true;
      img.style.width = "50px";
      img.style.height = "50px";

      // Add drag event
      img.ondragstart = (e) => startDrag(e, imageUrl);

      // Add image to button
      newDecorationBtn.appendChild(img);

      // Add button to decorations menu
      const decorMenu = document.getElementById("decor");
      const uploadBtn = decorMenu.querySelector("button:last-child");
      decorMenu.insertBefore(newDecorationBtn, uploadBtn);

      // Store the custom decoration
      window.customDecorations = window.customDecorations || {};
      window.customDecorations[decorationId] = imageUrl;
    };
    reader.readAsDataURL(file);
  } else {
    alert("Please upload a PNG image file.");
  }
}

function startDrag(event, imagePath) {
  event.dataTransfer.setData("text/plain", imagePath);
}

function applyDecoration(nail, imagePath) {
  const svg = nail.ownerSVGElement;
  const bbox = nail.getBBox();

  const group = document.createElementNS("http://www.w3.org/2000/svg", "g");
  group.classList.add("decoration-layer");

  const img = document.createElementNS("http://www.w3.org/2000/svg", "image");

  // Check if this is a custom decoration
  const imageUrl =
    window.customDecorations && window.customDecorations[imagePath]
      ? window.customDecorations[imagePath]
      : "/images/" + imagePath;

  img.setAttributeNS("http://www.w3.org/1999/xlink", "href", imageUrl);
  img.setAttribute("width", bbox.width * 0.5);
  img.setAttribute("height", bbox.height * 0.5);
  img.setAttribute("x", bbox.x + bbox.width * 0.25);
  img.setAttribute("y", bbox.y + bbox.height * 0.25);
  img.setAttribute("pointer-events", "visiblePainted");

  group.appendChild(img);
  insertAboveNail(nail, group);

  // Save undo information
  pushUndo({
    type: "decoration",
    nail: nail,
    element: group,
    isAdd: true,
  });

  group.addEventListener("mousedown", (e) => {
    draggedDecoration = {
      target: group,
      startX: e.clientX,
      startY: e.clientY,
      origTransform: group.getAttribute("transform") || "",
    };
    e.preventDefault();
  });
}

document.addEventListener("mousemove", (e) => {
  if (draggedDecoration) {
    const dx = e.clientX - draggedDecoration.startX;
    const dy = e.clientY - draggedDecoration.startY;
    draggedDecoration.target.setAttribute(
      "transform",
      `${draggedDecoration.origTransform} translate(${dx}, ${dy})`
    );
  }
});

document.addEventListener("mouseup", () => {
  draggedDecoration = null;
});

function pushUndo(action) {
  undoStack.push(action);
  // Clear redo stack when a new action is performed
  redoStack = [];
}

function undoAction() {
  const last = undoStack.pop();
  if (!last) return;

  // Perform the undo action based on type
  switch (last.type) {
    case "color":
      // Restore the old color
      last.nail.setAttribute("fill", last.oldColor);
      break;
    case "pattern":
      if (last.isAdd) {
        // Remove the pattern that was added
        const svg = last.nail.ownerSVGElement;
        svg
          .querySelectorAll(`.pattern-${last.nail.id}`)
          .forEach((el) => el.remove());

        // Remove the clipPath
        const clip = svg.querySelector(`#clip-${last.nail.id}`);
        if (clip) clip.remove();
      } else {
        // Restore the pattern that was removed, skip adding to undo stack
        applyPattern(last.nail, last.patternPath, true);
      }
      break;
    case "decoration":
      if (last.isAdd) {
        // Remove the decoration that was added
        last.element.remove();
      } else {
        // Restore the decoration that was removed
        last.nail.parentNode.appendChild(last.element);
      }
      break;
  }

  // Push to redo stack
  redoStack.push(last);
}

function redoAction() {
  const next = redoStack.pop();
  if (!next) return;

  // Perform the redo action based on type
  switch (next.type) {
    case "color":
      // Apply the new color
      next.nail.setAttribute("fill", next.newColor);
      break;
    case "pattern":
      if (next.isAdd) {
        // Add back the pattern, skip adding to undo stack
        applyPattern(next.nail, next.patternPath, true);
      } else {
        // Remove the pattern again
        const svg = next.nail.ownerSVGElement;
        svg
          .querySelectorAll(`.pattern-${next.nail.id}`)
          .forEach((el) => el.remove());

        // Remove the clipPath
        const clip = svg.querySelector(`#clip-${next.nail.id}`);
        if (clip) clip.remove();
      }
      break;
    case "decoration":
      if (next.isAdd) {
        // Add back the decoration
        next.nail.parentNode.appendChild(next.element);
      } else {
        // Remove the decoration again
        next.element.remove();
      }
      break;
  }

  // Push back to undo stack
  undoStack.push(next);
}

function resetAll() {
  undoStack = [];
  redoStack = [];
  changeShape(currentShape);
  selectedNail = null;
  selectedPattern = null;
  selectedDecoration = null;
  selectedColor = null;
  document.getElementById("selected-info-panel").innerHTML =
    "❤️ Selected: (none)";
}

window.onload = () => {
  changeShape(currentShape);
  document.querySelector(".menu-option").classList.add("active");
  document.getElementById("shape").classList.add("active");
};

function enableDropOnNails() {
  const nails = document.querySelectorAll(".nail-fill");
  nails.forEach((nail) => {
    if (!nail.getAttribute("fill")) nail.setAttribute("fill", "#fff5ee");
    nail.addEventListener("click", () => {
      selectedNail = nail;
      document.getElementById(
        "selected-info-panel"
      ).innerHTML = `❤️ Selected: <strong>${nail.id || "(no id)"}</strong>`;

      // Apply each effect independently if selected
      if (selectedColor) {
        pushUndo({
          type: "color",
          nail: selectedNail,
          oldColor: selectedNail.getAttribute("fill"),
          newColor: selectedColor,
        });
        selectedNail.setAttribute("fill", selectedColor);
        // Don't clear color selection so it can be applied to multiple nails
      }

      if (selectedPattern) {
        applyPattern(nail, selectedPattern);
        // Don't clear pattern selection so it can be applied to multiple nails
      }

      if (selectedDecoration) {
        // Apply the new decoration without removing existing ones
        applyDecoration(nail, selectedDecoration);
        // Don't clear decoration selection so it can be applied to multiple nails
      }
    });
  });
}

function downloadDesign() {
  // Create a clean screenshot layout that the user can manually capture
  const screenshotOverlay = document.createElement("div");
  screenshotOverlay.style.position = "fixed";
  screenshotOverlay.style.top = "0";
  screenshotOverlay.style.left = "0";
  screenshotOverlay.style.width = "100%";
  screenshotOverlay.style.height = "100%";
  screenshotOverlay.style.backgroundColor = "white";
  screenshotOverlay.style.zIndex = "9999";
  screenshotOverlay.style.overflow = "auto";
  screenshotOverlay.style.padding = "20px";

  // Create content container with clean styling
  const content = document.createElement("div");
  content.style.maxWidth = "800px";
  content.style.margin = "0 auto";
  content.style.backgroundColor = "white";
  content.style.padding = "20px";
  content.style.boxShadow = "0 2px 10px rgba(0,0,0,0.1)";
  content.style.borderRadius = "8px";

  // Add a title
  const title = document.createElement("h2");
  title.textContent = "My Nail Design";
  title.style.textAlign = "center";
  title.style.fontFamily = "Arial, sans-serif";
  title.style.marginBottom = "20px";
  content.appendChild(title);

  // Instructions for user
  const instructions = document.createElement("p");
  instructions.textContent =
    "Please use your device's screenshot tool to capture this screen (Windows: Win+Shift+S, macOS: Command+Shift+4)";
  instructions.style.textAlign = "center";
  instructions.style.fontFamily = "Arial, sans-serif";
  instructions.style.fontSize = "14px";
  instructions.style.color = "#666";
  instructions.style.marginBottom = "20px";
  content.appendChild(instructions);

  // Clone the hands
  const handsContainer = document.createElement("div");
  handsContainer.style.display = "flex";
  handsContainer.style.flexDirection = "column";
  handsContainer.style.gap = "30px";

  // Left hand section
  const leftHandSection = document.createElement("div");
  leftHandSection.style.borderBottom = "1px solid #eee";
  leftHandSection.style.paddingBottom = "20px";

  const leftHandTitle = document.createElement("h3");
  leftHandTitle.textContent = "Left Hand";
  leftHandTitle.style.fontFamily = "Arial, sans-serif";
  leftHandTitle.style.textAlign = "center";
  leftHandTitle.style.margin = "0 0 15px 0";

  const leftHandContent = document.createElement("div");
  leftHandContent.style.display = "flex";
  leftHandContent.style.justifyContent = "center";
  leftHandContent.style.padding = "10px";
  leftHandContent.style.border = "1px dashed #ccc";
  leftHandContent.style.backgroundColor = "#fafafa";

  // Clone left hand content (this preserves SVG patterns/decorations)
  const leftHandClone = document.getElementById("left-hand").cloneNode(true);
  leftHandContent.appendChild(leftHandClone);

  leftHandSection.appendChild(leftHandTitle);
  leftHandSection.appendChild(leftHandContent);
  handsContainer.appendChild(leftHandSection);

  // Right hand section
  const rightHandSection = document.createElement("div");

  const rightHandTitle = document.createElement("h3");
  rightHandTitle.textContent = "Right Hand";
  rightHandTitle.style.fontFamily = "Arial, sans-serif";
  rightHandTitle.style.textAlign = "center";
  rightHandTitle.style.margin = "0 0 15px 0";

  const rightHandContent = document.createElement("div");
  rightHandContent.style.display = "flex";
  rightHandContent.style.justifyContent = "center";
  rightHandContent.style.padding = "10px";
  rightHandContent.style.border = "1px dashed #ccc";
  rightHandContent.style.backgroundColor = "#fafafa";

  // Clone right hand content
  const rightHandClone = document.getElementById("right-hand").cloneNode(true);
  rightHandContent.appendChild(rightHandClone);

  rightHandSection.appendChild(rightHandTitle);
  rightHandSection.appendChild(rightHandContent);
  handsContainer.appendChild(rightHandSection);

  content.appendChild(handsContainer);

  // Close button
  const buttonContainer = document.createElement("div");
  buttonContainer.style.display = "flex";
  buttonContainer.style.justifyContent = "center";
  buttonContainer.style.marginTop = "20px";

  const closeButton = document.createElement("button");
  closeButton.textContent = "Close Screenshot Mode";
  closeButton.style.padding = "10px 20px";
  closeButton.style.borderRadius = "20px";
  closeButton.style.border = "none";
  closeButton.style.backgroundColor = "#f0f0f0";
  closeButton.style.cursor = "pointer";
  closeButton.style.fontFamily = "Arial, sans-serif";
  closeButton.style.boxShadow = "0 2px 4px rgba(0,0,0,0.2)";

  closeButton.onclick = () => {
    document.body.removeChild(screenshotOverlay);
  };

  buttonContainer.appendChild(closeButton);
  content.appendChild(buttonContainer);

  // Add content to overlay and display
  screenshotOverlay.appendChild(content);
  document.body.appendChild(screenshotOverlay);
}

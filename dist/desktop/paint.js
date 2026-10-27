import { select, selectAll } from "./dom.js";

const colors = [
  ["Black", "#242b30"],
  ["White", "#ffffff"],
  ["Red", "#b8544b"],
  ["Orange", "#d99354"],
  ["Yellow", "#e5c46c"],
  ["Green", "#5b8965"],
  ["Teal", "#327b78"],
  ["Blue", "#365f9a"],
  ["Purple", "#846890"],
  ["Pink", "#d9a6a2"],
];
const historyLimit = 12;

export function initializePaint(root, host, download) {
  const canvas = select("#paint-canvas", root);
  const status = select("#paint-status", root);
  const undo = select("#paint-undo", root);
  const brush = select("#paint-brush", root);
  const eraser = select("#paint-eraser", root);
  const history = [];
  let context = null;
  let color = colors[0][1];
  let colorName = colors[0][0];
  let tool = "brush";
  let stroke = null;

  try {
    context = canvas.getContext("2d");
  } catch {}
  if (!context) {
    for (const button of selectAll("#paint button, #paint select", root))
      button.disabled = true;
    status.textContent = "Drawing is unavailable in this browser.";
    return { cancelStroke() {} };
  }

  function selectTool(next) {
    tool = next;
    brush.setAttribute("aria-pressed", String(tool === "brush"));
    eraser.setAttribute("aria-pressed", String(tool === "eraser"));
    status.textContent = tool === "eraser" ? "Eraser" : "Brush · " + colorName;
  }

  function checkpoint() {
    history.push(context.getImageData(0, 0, canvas.width, canvas.height));
    if (history.length > historyLimit) history.shift();
    undo.disabled = false;
  }

  function blankCanvas() {
    context.fillStyle = "#ffffff";
    context.fillRect(0, 0, canvas.width, canvas.height);
  }

  function point(event) {
    const bounds = canvas.getBoundingClientRect();
    if (!bounds.width || !bounds.height) return null;
    return {
      x: ((event.clientX - bounds.left) * canvas.width) / bounds.width,
      y: ((event.clientY - bounds.top) * canvas.height) / bounds.height,
    };
  }

  function cancelStroke() {
    if (!stroke) return;
    const id = stroke.id;
    stroke = null;
    if (canvas.hasPointerCapture(id)) canvas.releasePointerCapture(id);
  }

  select("#paint-palette", root).innerHTML = colors
    .map(
      ([name, value], index) =>
        `<button type="button" class="color-swatch" style="background:${value}" data-color="${value}" data-color-name="${name}" aria-label="${name}" aria-pressed="${index === 0}"></button>`,
    )
    .join("");
  for (const button of selectAll("[data-color]", root)) {
    button.addEventListener("click", () => {
      color = button.dataset.color;
      colorName = button.dataset.colorName;
      for (const swatch of selectAll("[data-color]", root))
        swatch.setAttribute("aria-pressed", String(swatch === button));
      selectTool("brush");
    });
  }
  brush.addEventListener("click", () => selectTool("brush"));
  eraser.addEventListener("click", () => selectTool("eraser"));
  blankCanvas();

  canvas.addEventListener("pointerdown", (event) => {
    if (event.button !== 0 || stroke) return;
    const position = point(event);
    if (!position) return;
    event.preventDefault();
    checkpoint();
    canvas.setPointerCapture(event.pointerId);
    stroke = { id: event.pointerId, last: position };
    context.lineWidth =
      Number(select("#brush-size", root).value) * (tool === "eraser" ? 3 : 1);
    context.lineCap = "round";
    context.lineJoin = "round";
    context.strokeStyle = context.fillStyle =
      tool === "eraser" ? "#ffffff" : color;
    context.beginPath();
    context.arc(position.x, position.y, context.lineWidth / 2, 0, Math.PI * 2);
    context.fill();
  });
  canvas.addEventListener("pointermove", (event) => {
    if (!stroke || stroke.id !== event.pointerId) return;
    const position = point(event);
    if (!position) return;
    event.preventDefault();
    context.beginPath();
    context.moveTo(stroke.last.x, stroke.last.y);
    context.lineTo(position.x, position.y);
    context.stroke();
    stroke.last = position;
  });
  for (const name of ["pointerup", "pointercancel", "lostpointercapture"]) {
    canvas.addEventListener(name, (event) => {
      if (stroke?.id === event.pointerId) cancelStroke();
    });
  }
  host.addEventListener("blur", cancelStroke);
  undo.addEventListener("click", () => {
    if (!history.length) return;
    cancelStroke();
    context.putImageData(history.pop(), 0, 0);
    undo.disabled = !history.length;
  });
  select("#paint-clear", root).addEventListener("click", () => {
    cancelStroke();
    checkpoint();
    blankCanvas();
  });
  select("#paint-save", root).addEventListener("click", () => {
    canvas.toBlob((blob) => {
      try {
        if (!blob) throw new Error("Image encoding failed");
        download(blob, "drawing.png");
      } catch {
        status.textContent = "Could not save the drawing. Try again.";
      }
    }, "image/png");
  });
  return { cancelStroke };
}

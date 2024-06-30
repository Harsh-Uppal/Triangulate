//Algorithm Source - https://ics.uci.edu/~eppstein/pubs/BerEpp-CEG-95.pdf

let propertyElements,
  propertyLists = {};
let data = { v: [], t: [] };
let mode, logger;
let selectedVertex = null;
let eraser = {
  visibility: 0,
  trail: [],
  maxTrailLength: 16,
  trailDuration: 1,
  trailTimer: 0,
  trailSize: 3,
  trailLineWidth: 1,
};
let mousedown = false;
let lastMousePos = null;

const EDGE_COLOR = "orange",
  SELECTED_VERTEX_STROKE = "orange",
  SELECTED_VERTEX_FILL = "yellow",
  MESH_LINE_COLOR = "lightblue";
const VERTEX_SIZE = 9;
const ERASER_SIZE = 10;
const ERASER_ANIMATION_SPEED = 10;

const VERTEX_MODE = "v";
const EDGE_MODE = "e";
const ERASE_MODE = "x";
const TRIANGULATE_MODE = "t";
const mousePos = {
  get x() {
    return mouseX;
  },
  get y() {
    return mouseY;
  },
  get copy() {
    return { x: mouseX, y: mouseY };
  },
};
window.addEventListener("load", load);

function updateProperties() {}

function addProperty(dataType, values = {}, objectProperties = {}) {
  const elem = propertyElements[dataType].cloneNode(true);
  elem.style.display = "";
  elem.setAttribute("visible", true);

  const property = {};

  let l = elem.children.length,
    input;
  for (let i = 0; i < l; i++) {
    input = elem.children[i];
    if (input.nodeName !== "INPUT" && input.nodeName !== "SELECT") continue;

    input.value = values[input.name] || input.value;

    if (input.getAttribute("data-type") == "int")
      input.addEventListener("input", () => {
        input.value = input.value.split(".")[0];
      });

    input.dispatchEvent(new Event("input"));
    property[input.name] = input;
  }

  data[dataType].push({
    ...objectProperties,
    ...property,
    index: data[dataType].length,
    element: elem,
  });

  propertyLists[dataType].appendChild(elem);

  return data[dataType].at(-1);
}

function removeProperty(dataType, index) {
  data[dataType][index].element.remove();
  data[dataType].splice(index, 1);
}

function setup() {
  const canvas = createCanvas(
    document.body.clientWidth * 0.7,
    document.body.clientHeight * 0.8
  ).canvas;

  canvas.addEventListener("click", onClick);
  canvas.addEventListener("mousemove", onMouseMove);
  canvas.addEventListener("mousedown", () => {
    mousedown = true;
    lastMousePos = mousePos.copy;
  });
  canvas.addEventListener("mouseup", () => (mousedown = false));

  // dev_setup();

  noLoop();
}

//default testing setup
function dev_setup() {
  addProperty("v", { x: 256.3, y: 344.8 });
  addProperty("v", { x: 240.3, y: 138.8 });
  addProperty("v", { x: 379.3, y: 114.8 });
  addProperty("v", { x: 498.3, y: 139.8 });
  addProperty("v", { x: 533.3, y: 72.8 });
  addProperty("v", { x: 612.3, y: 195.8 });
  addProperty("v", { x: 697.3, y: 29.8 });
  addProperty("v", { x: 750.3, y: 146.8 });
  addProperty("v", { x: 943.3, y: 247.8 });
  addProperty("v", { x: 742.3, y: 281.8 });
  addProperty("v", { x: 813.3, y: 525.8 });
  addProperty("v", { x: 705.3, y: 373.8 });
  addProperty("v", { x: 631.3, y: 555.8 });
  addProperty("v", { x: 640.3, y: 365.8 });
  addProperty("v", { x: 438.3, y: 484.8 });
  addProperty("v", { x: 540.3, y: 407.8 });
  addProperty("v", { x: 437.3, y: 388.8 });
  addProperty("v", { x: 358.3, y: 456.8 });
  addProperty("v", { x: 364.3, y: 560.8 });
  addProperty("v", { x: 261.3, y: 526.8 });
  addProperty("v", { x: 289.3, y: 433.8 });
  addProperty("v", { x: 165.3, y: 395.8 });
  addProperty("v", { x: 172.3, y: 233.8 });

  mode.value = "e";

  data.v.forEach((v) => {
    mouseX = v.x.value;
    mouseY = v.y.value;
    onClick();
  });

  draw();
}

function update() {
  //update eraser
  if (eraser.visibility > 0 || eraser.trail.length > 0) {
    if (!mousedown) eraser.visibility -= ERASER_ANIMATION_SPEED / 100;

    eraser.trailTimer++;

    if (eraser.trailTimer > eraser.trailDuration)
      while (eraser.trailTimer > eraser.trailDuration) {
        eraser.trailTimer = eraser.trailTimer - eraser.trailDuration;
        eraser.trail.splice(0, 1);
      }

    draw();
  }
}

//Returns triangle[]
function triangulate(mesh) {
  if (mesh.length == 3) return [mesh]; //Triangle

  let A = mesh.at(-1);
  let B = mesh[0];
  let C = mesh[1];

  A = { x: A.x.value, y: A.y.value, index: mesh.length - 1 };
  B = { x: B.x.value, y: B.y.value, index: 0 };
  C = { x: C.x.value, y: C.y.value, index: 1 };

  //check if AC cuts the polygon and find the farthest point from AC towards B
  let maxDist = 0,
    Z = null,
    d;

  mesh.forEach((V, index) => {
    switch (index) {
      case 0:
      case mesh.length - 1:
      case 1:
        return;
    }

    V = { x: V.x.value, y: V.y.value };

    //check if the diagonal cuts the polygon
    const cutting = isPointInTriangle(V, A, B, C);

    if (cutting) {
      d = distToLine(A, C, V.x, V.y);

      if (maxDist < d) {
        maxDist = d;
        Z = { ...V, index };
      }
    }
  });

  let triangles = [];

  //AC cuts the polygon, diagonal is BZ otherwise diagonal is AC
  let diag = Z ? [B, Z] : [A, C];

  splitMesh(mesh, diag).forEach((newMesh) => {
    triangles.push(...triangulate(newMesh));
  });

  return triangles;
}

//SN
function eraseElements(p0, p1) {
  let vDel, eDel, v0, v1, a1, b1, c1, a2, b2, c2, d, x, y;

  data.v.forEach((v, index) => {
    v0 = { x: v.x.value, y: v.y.value };

    vDel = p1
      ? isTouchingLine(v0, p0, p1, VERTEX_SIZE)
      : (v0.x - p0.x) * (v0.x - p0.x) + (v0.y - p0.y) * (v0.y - p0.y) <
        (VERTEX_SIZE + ERASER_SIZE) * (VERTEX_SIZE + ERASER_SIZE);

    if (vDel) {
      removeProperty("v", index);
      return true;
    }

    if (v.edges)
      v.edges.forEach((e, i) => {
        v1 = { x: e.x.value, y: e.y.value };

        if (p1) {
          a1 = v1.y - v0.y;
          b1 = v0.x - v1.x;
          c1 = a1 * v0.x + b1 * v0.y;

          // Line CD represented as a2x + b2y = c2
          a2 = p1.y - p0.y;
          b2 = p0.x - p1.x;
          c2 = a2 * p0.x + b2 * p0.y;

          d = a1 * b2 - a2 * b1;

          if (d != 0) {
            x = (b2 * c1 - b1 * c2) / d;
            y = (a1 * c2 - a2 * c1) / d;

            eDel =
              x > Math.max(Math.min(v0.x, v1.x), Math.min(p0.x, p1.x)) &&
              y > Math.max(Math.min(v0.y, v1.y), Math.min(p0.y, p1.y)) &&
              x < Math.min(Math.max(v0.x, v1.x), Math.max(p0.x, p1.x)) &&
              y < Math.min(Math.max(v0.y, v1.y), Math.max(p0.y, p1.y));
          }
        } else eDel = isTouchingLine(p0, v0, v1, ERASER_SIZE);

        if (eDel) {
          //Delete edge
          e.edges.splice(e.edges.indexOf(v), 1);
          v.edges.splice(i, 1);
        }
      });
  });
}

//SN
function add_edge(v0, v1) {
  if ((v0.edges && v0.edges.length > 1) || (v1.edges && v1.edges.length > 1)) {
    loggg(
      "There are already 2 edges connected to either v0 or v1",
      true,
      true,
      "red"
    );
    return;
  }

  if (v0.edges && v0.edges.indexOf(v1) != -1) return;

  if (!v0.edges) v0.edges = [];
  if (!v1.edges) v1.edges = [];

  v0.edges.push(v1);
  v1.edges.push(v0);
}

//---------------------------Drawing---------------------------//

function draw() {
  background(50);

  switch (mode.value) {
    case "x":
      drawEraser();
    case "v":
    case "e":
      drawVertices();
      drawEdges();
      break;
    case "t":
      drawTriangles();
      break;
  }
  drawEraser();
}

function drawVertices(filled = false) {
  filled ? fill(255) : noFill();
  stroke(255);
  strokeWeight(1);

  data.v.forEach((v) => circle(v.x.value, v.y.value, VERTEX_SIZE));

  let v = isTouchingVertex().vertex;

  if (v) {
    fill(255);
    circle(v.x.value, v.y.value, VERTEX_SIZE);
  }

  if (selectedVertex) {
    stroke(SELECTED_VERTEX_STROKE);
    fill(SELECTED_VERTEX_FILL);
    circle(selectedVertex.x.value, selectedVertex.y.value, VERTEX_SIZE);
  }
}

//SN
function drawEdges() {
  stroke(EDGE_COLOR);

  data.v.forEach(
    (v) =>
      v.edges &&
      v.edges.forEach((e) => line(v.x.value, v.y.value, e.x.value, e.y.value))
  );
}

function drawTriangles() {
  if (!data.t || !data.t.length) return;

  data.t.forEach((t) => {
    beginShape();
    fill(
      ...(isPointInTriangle(mousePos, t[0], t[1], t[2])
        ? t.color
        : [t.color.reduce((sum, val) => sum + val) / 3])
    );

    for (let i = 0; i < 3; i++) vertex(t[i].x, t[i].y);
    endShape(CLOSE);
  });
}

function drawEraser() {
  fill(255, 255, 255, eraser.visibility * 255);
  noStroke();
  circle(mouseX, mouseY, ERASER_SIZE);

  stroke("white");
  for (let i = 2; i < eraser.trail.length; i++) {
    strokeWeight(i * eraser.trailLineWidth);

    line(
      eraser.trail[i - 1].x,
      eraser.trail[i - 1].y,
      eraser.trail[i].x,
      eraser.trail[i].y
    );

    circle(
      eraser.trail[i].x,
      eraser.trail[i].y,
      (i * eraser.trailSize) / eraser.maxTrailLength
    );
  }
}

//-----------------------Utility functions----------------------//

function distSqr(p0, p1) {
  return (p1.x - p0.x) * (p1.x - p0.x) + (p1.y - p0.y) * (p1.y - p0.y);
}

function sign(p1, p2, p3) {
  return (p1.x - p3.x) * (p2.y - p3.y) - (p2.x - p3.x) * (p1.y - p3.y);
}

function isPointInTriangle(pt, v1, v2, v3) {
  let d1, d2, d3;
  let has_neg, has_pos;

  d1 = sign(pt, v1, v2);
  d2 = sign(pt, v2, v3);
  d3 = sign(pt, v3, v1);

  has_neg = d1 < 0 || d2 < 0 || d3 < 0;
  has_pos = d1 > 0 || d2 > 0 || d3 > 0;

  return !(has_neg && has_pos);
}

function isTouchingVertex() {
  let r = null,
    i = -1;
  data.v.forEach((v, index) => {
    if (dist(v.x.value, v.y.value, mouseX, mouseY) < VERTEX_SIZE) {
      r = v;
      i = index;
      return true;
    }
  });
  return { vertex: r, index: i };
}

function isTouchingLine(p0, v0, v1, size = 1) {
  let m = distSqr(v0, v1) + size * size;
  return (
    distToLine(v0, v1, p0.x, p0.y) < size &&
    (size == 1 || (distSqr(v0, p0) < m && distSqr(v1, p0) < m))
  );
}

function generateMesh() {
  let mesh = [];

  let leastX = Infinity,
    V = null,
    x;
  let notAShape = false;

  data.v.forEach((v) => {
    x = parseFloat(v.x.value);

    if (v.edges && v.edges.length == 1) notAShape = true;

    if (x < leastX && v.edges && v.edges.length == 2) {
      leastX = x;
      V = v;
    }
  });

  if (!V || notAShape) {
    loggg("Error: Not a polygon", true, true, "red");
    return;
  }

  mesh[0] = V;

  let lV = V;
  V = V.edges[0];
  mesh[1] = V;

  let e;
  while (mesh.length != data.v.length) {
    e = V.edges[0] == lV;
    lV = V;
    V = e ? V.edges[1] : V.edges[0];

    mesh.push(V);
  }

  return mesh;
}

function splitMesh(mesh, diag) {
  let meshes = [];
  let v = diag[0].index,
    leastX,
    leftmostV;

  for (let i = 0; i < 2; i++) {
    leastX = Infinity;
    meshes[i] = [];

    const addVtoMesh = () => {
      if (mesh[v].x.value < leastX) {
        leastX = mesh[v].x.value;
        leftmostV = meshes[i].length;
      }

      meshes[i].push(mesh[v]);
    };

    do {
      addVtoMesh();
      v = (v + 1) % mesh.length;
    } while (v != diag[(i + 1) % 2].index);

    addVtoMesh();

    meshes[i].push(...meshes[i].splice(0, leftmostV));
  }

  return meshes;
}

function distToLine(v0, v1, x0, y0) {
  let l = Math.pow(
    (v1.x - v0.x) * (v1.x - v0.x) + (v1.y - v0.y) * (v1.y - v0.y),
    1 / 2
  );
  return (
    Math.abs(
      (v1.y - v0.y) * x0 - (v1.x - v0.x) * y0 + v1.x * v0.y - v1.y * v0.x
    ) / l
  );
}

function loggg(text, clear = false, newLine = false, color) {
  if (color) text = `<div class="${color}">${text}</div>`;
  if (!color && newLine) text += "<br>";
  if (clear) logger.innerHTML = text;
  else logger.innerHTML += text;
}

//-----------------------Event Handlers-----------------------//

function load() {
  propertyElements = {
    v: document.getElementById("v0"),
    e: document.getElementById("e0"),
  };

  const lists = document.getElementsByClassName("property-list");
  for (let i = 0; i < lists.length; i++) {
    const list = lists[i];
    propertyLists[list.getAttribute("type")] = list;
  }

  mode = document.getElementById("modeSelect");
  logger = document.getElementById("logger");
  mode.addEventListener("change", onModeChanged);

  setInterval(update, 20);
}

function onClick() {
  switch (mode.value) {
    case "v":
      mouseX = round(mouseX, 1);
      mouseY = round(mouseY, 1);

      if (isTouchingVertex().vertex) return;

      addProperty("v", mousePos);
      break;
    case "e":
      const v = isTouchingVertex();

      if (!v.vertex) {
        selectedVertex = null;
        break;
      }

      if (selectedVertex && v.vertex == selectedVertex) selectedVertex = null;
      else if (selectedVertex != null) add_edge(v.vertex, selectedVertex);

      selectedVertex = v.vertex;
      break;
    case "x":
      eraser.visibility = 1;
      eraseElements(mousePos);
      break;
  }
  draw();
}

function onMouseDrag() {
  if (mode.value == "x") {
    eraser.visibility = 1;

    eraser.trail.push(mousePos.copy);
    if (eraser.trail.length > eraser.maxTrailLength)
      eraser.trail.splice(0, eraser.trail.length - eraser.maxTrailLength);

    eraseElements(lastMousePos, mousePos);
  }
  lastMousePos = mousePos.copy;
}

function onMouseMove() {
  if (mousedown) onMouseDrag();
  draw();
}

const modeKeycodes = [69, 84, 86, 88];
function keyPressed() {
  if (modeKeycodes.indexOf(keyCode) == -1) return;

  mode.value = char(keyCode).toLowerCase();
  onModeChanged();
}

function onModeChanged() {
  if (mode.value == "t") {
    loggg("Starting Triangulation ...", true, true);
    let t = Date.now();
    try {
      let triangles = triangulate(generateMesh());
      loggg(`Triangulation Complete in ${Date.now() - t}ms`, false, true);

      for (let i = 0; i < triangles.length; i++) {
        for (let j = 0; j < 3; j++)
          triangles[i][j] = {
            x: triangles[i][j].x.value,
            y: triangles[i][j].y.value,
          };
        triangles[i].color = [random() * 255, random() * 255, random() * 255];
      }

      data.t = triangles;
    } catch (e) {
      console.error(e);
      loggg("Triangulation Failed", false, true, "red");
    }
  }

  draw();
}

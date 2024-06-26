let verts = [];
let triangles = [];
let meshCenter;
let propertyElements, propertyLists = {};
let data = { v: [], e: [] }
let mode;
let selectedVertex;

const vertexSize = 9;

window.addEventListener('load', load)

function load() {
  propertyElements = {
    v: document.getElementById('v0'),
    e: document.getElementById('e0')
  };

  const lists = document.getElementsByClassName('property-list')
  for (let i = 0; i < lists.length; i++) {
    const list = lists[i];
    propertyLists[list.getAttribute('type')] = list;
  }

  mode = document.getElementById('modeSelect');
}

function addProperty(dataType, values = {}) {
  const propertyElement = propertyElements[dataType].cloneNode(true);
  propertyElement.style.display = '';
  propertyElement.setAttribute('visible', true);

  const property = {};

  let l = propertyElement.children.length, input;
  for (let i = 0; i < l; i++) {
    input = propertyElement.children[i];
    if (input.nodeName !== 'INPUT' && input.nodeName !== 'SELECT')
      continue;

    input.value = values[input.name];
    property[input.name] = input;
  }

  data[dataType].push(property);

  propertyLists[dataType].appendChild(propertyElement)
}

function setup() {
  const canvas = createCanvas(document.body.clientWidth * .7, document.body.clientHeight * 0.8).canvas;
  canvas.addEventListener('click', onClick);
  canvas.addEventListener('mousemove', draw);
  setupTriangles();
  noLoop();
}

function draw() {
  background(50);
  drawVertices();
}

function drawVertices(filled = false) {
  filled ? fill(255) : noFill()
  stroke(255);
  strokeWeight(1);

  data.v.forEach(v => circle(v.x.value, v.y.value, vertexSize));

  let v = isTouchingVertex();

  if (v) {
    fill(255);
    circle(v.x.value, v.y.value, vertexSize);
  }

  if (selectedVertex) {
    stroke('orange');
    fill('yellow');
    circle(selectedVertex.x.value, selectedVertex.y.value, vertexSize);
  }
}

function setupVerts() {
  //rectangel();
  blobby();
}

function blobby() {
  let baseRad = random(20, 40);
  let maxx = 0, may = 0, mix = 1000000, miy = 1000000;
  for (var i = 0; i < TWO_PI; i += .01) {
    let xOff = sin(i) + 5;
    let yOff = cos(i) + 5;
    // let r = noise(xOff, yOff) * 100;
    let r = noise(xOff, yOff) * 50 + baseRad;
    let x = sin(i) * r + width / 2;
    let y = cos(i) * r + height / 2;
    verts.push({ x: x, y: y });

    maxx = max(maxx, x);
    mix = min(x, mix);
    may = max(may, y);
    miy = min(y, miy);
  }
  meshCenter = { x: (maxx + mix) / 2, y: (miy + may) / 2 };
}

function rectangel() {
  for (var x = width / 2 - 50; x < width / 2 + 50; x += 20) {
    verts.push({ x: x, y: height / 2 - 20 });
  }
  for (var y = height / 2 - 20; y < height / 2 + 20; y += 20) {
    verts.push({ x: width / 2 + 50, y: y });
  }
  for (var x = width / 2 + 50; x > width / 2 - 50; x -= 20) {
    verts.push({ x: x, y: height / 2 + 20 });
  }
  for (var y = height / 2 + 20; y > height / 2 - 20; y -= 20) {
    verts.push({ x: width / 2 - 50, y: y });
  }
  meshCenter = { x: width / 2, y: height / 2 };
}

function setupTriangles() {
  triangles = [];
  if (verts.length > 2) {
    for (var i = 0; i < verts.length / 2; i++) {
      triangles.push({ v1: verts[i * 2], v2: verts[min(i * 2 + 1, verts.length - 1)], v3: meshCenter });
      triangles.push({ v1: verts[min(i * 2 + 1, verts.length - 1)], v2: verts[min(i * 2 + 2, verts.length - 1)], v3: meshCenter });
    }
    triangles.push({ v1: verts[verts.length - 1], v2: verts[0], v3: meshCenter });
  }
}

function displayMesh() {
  beginShape();
  stroke(255);
  verts.forEach(function (val) {
    vertex(val.x, val.y);
  })
  endShape(CLOSE);
}

function displayTriangles() {
  strokeWeight(.2);
  stroke('grey');
  triangles.forEach(function (val) {
    line(val.v1.x, val.v1.y, val.v2.x, val.v2.y);
    line(val.v2.x, val.v2.y, val.v3.x, val.v3.y);
    line(val.v3.x, val.v3.y, val.v1.x, val.v1.y);
  });
}

function sign(p1, p2, p3) {
  return (p1.x - p3.x) * (p2.y - p3.y) - (p2.x - p3.x) * (p1.y - p3.y);
}

function PointInTriangle(pt, v1, v2, v3) {
  let d1, d2, d3;
  let has_neg, has_pos;

  d1 = sign(pt, v1, v2);
  d2 = sign(pt, v2, v3);
  d3 = sign(pt, v3, v1);

  has_neg = (d1 < 0) || (d2 < 0) || (d3 < 0);
  has_pos = (d1 > 0) || (d2 > 0) || (d3 > 0);

  return !(has_neg && has_pos);
}

function checkTouching(pt) {
  let get = false;
  triangles.forEach(function (val) {
    if (!get) {
      if (PointInTriangle(pt, val.v1, val.v2, val.v3)) {
        fill('blue');
        beginShape();
        vertex(val.v1.x, val.v1.y);
        vertex(val.v2.x, val.v2.y);
        vertex(val.v3.x, val.v3.y);
        endShape();
        get = true;
      }
    }
  });
}

function onClick() {
  switch (mode.value) {
    case 'v':
      mouseX = round(mouseX, 1);
      mouseY = round(mouseY, 1);

      if (isTouchingVertex())
        return;

      addProperty('v', { x: mouseX, y: mouseY });
      draw();
      break;
    case 'e':
      const v = isTouchingVertex();

      if (!v)
        return;

      selectedVertex = v;
      break;
  }
  return;

  if (mouseY > 10 && mouseY < 30) {
    if (mouseX > width - 30 && mouseX < width - 10) {
      blobby();
      setupTriangles();
    }
    else if (mouseX > width - 60 && mouseX < width - 40) {
      rectangel();
      setupTriangles();
    }
    else if (mouseX > width - 90 && mouseX < width - 70) {
      verts = [];
      triangles = [];
    }
  }
  else {
    setupTriangles();
    draw();
  }
}

function isTouchingVertex() {
  let r = null;
  data.v.forEach(v => {
    if (dist(v.x.value, v.y.value, mouseX, mouseY) < vertexSize) {
      r = v;
      return true;
    }
  });
  return r;
}

function keyPressed() {
  switch (keyCode) {
    case 69:
      mode.value = 'e';
      break;
    case 84:
      mode.value = 't';
      break;
    case 86:
      mode.value = 'v';
      break;
  }
}
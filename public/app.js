function escapeHtml(text) {
  return String(text)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

const MODE_ICON = { car: "\ud83d\ude97", bike: "\ud83d\udeb2", walk: "\ud83d\udeb6" };
const MODE_LABEL = { car: "Car", bike: "Bike", walk: "Walk" };
const MODE_SPEED = { car: 46, bike: 17, walk: 5 };

const NODES = {
  downtown: { label: "Downtown", x: 120, y: 300 },
  techPark: { label: "Tech Park", x: 230, y: 130 },
  university: { label: "University", x: 355, y: 110 },
  station: { label: "Central Station", x: 390, y: 300 },
  oldTown: { label: "Old Town", x: 240, y: 420 },
  hospital: { label: "City Hospital", x: 520, y: 200 },
  mall: { label: "Mall", x: 590, y: 360 },
  airport: { label: "Airport", x: 740, y: 260 },
  harbor: { label: "Harbor", x: 650, y: 480 },
};

const EDGES = [
  { a: "downtown", b: "techPark", distance: 5.2, highway: false, toll: false, scenic: true },
  { a: "techPark", b: "university", distance: 4.1, highway: false, toll: false, scenic: true },
  { a: "university", b: "station", distance: 6.5, highway: true, toll: false, scenic: false },
  { a: "downtown", b: "station", distance: 4.6, highway: false, toll: false, scenic: false },
  { a: "downtown", b: "oldTown", distance: 3.9, highway: false, toll: false, scenic: true },
  { a: "oldTown", b: "station", distance: 5.0, highway: false, toll: false, scenic: true },
  { a: "station", b: "hospital", distance: 5.4, highway: false, toll: false, scenic: false },
  { a: "hospital", b: "airport", distance: 7.5, highway: true, toll: true, scenic: false },
  { a: "station", b: "mall", distance: 5.7, highway: false, toll: false, scenic: false },
  { a: "mall", b: "airport", distance: 6.1, highway: true, toll: true, scenic: false },
  { a: "mall", b: "harbor", distance: 4.8, highway: false, toll: false, scenic: true },
  { a: "oldTown", b: "harbor", distance: 8.2, highway: false, toll: false, scenic: true },
  { a: "hospital", b: "mall", distance: 3.8, highway: false, toll: false, scenic: false },
  { a: "university", b: "hospital", distance: 4.9, highway: false, toll: false, scenic: false },
];

function estimateDistance(a, b) {
  const left = NODES[a];
  const right = NODES[b];
  if (!left || !right) return 0;
  const dx = left.x - right.x;
  const dy = left.y - right.y;
  return Math.round((Math.hypot(dx, dy) / 34) * 10) / 10;
}

function getEdgeTravelMinutes(edge, mode) {
  const speed = MODE_SPEED[mode] || MODE_SPEED.car;
  let minutes = (edge.distance / speed) * 60;
  if (edge.highway && mode === "bike") minutes *= 1.55;
  if (edge.highway && mode === "walk") minutes *= 1.8;
  return minutes;
}

function edgeWeight(edge, opts) {
  if (opts.mode === "walk" && edge.highway) return Infinity;
  if (opts.avoidHighways && edge.highway) return Infinity;
  if (opts.avoidTolls && edge.toll) return Infinity;

  if (opts.preference === "shortest") return edge.distance;
  if (opts.preference === "scenic") {
    let score = edge.distance;
    if (edge.scenic) score *= 0.7;
    if (edge.highway) score *= 1.45;
    if (edge.toll) score *= 1.2;
    return score;
  }
  return getEdgeTravelMinutes(edge, opts.mode);
}

function buildAdjacency() {
  const map = {};
  Object.keys(NODES).forEach((id) => { map[id] = []; });
  EDGES.forEach((edge) => {
    map[edge.a].push({ to: edge.b, edge });
    map[edge.b].push({ to: edge.a, edge });
  });
  return map;
}

const ADJ = buildAdjacency();

function dijkstra(start, end, opts) {
  const dist = {};
  const prev = {};
  const visited = new Set();
  Object.keys(NODES).forEach((id) => { dist[id] = Infinity; prev[id] = null; });
  dist[start] = 0;

  while (visited.size < Object.keys(NODES).length) {
    let node = null;
    let best = Infinity;
    Object.keys(NODES).forEach((id) => {
      if (!visited.has(id) && dist[id] < best) {
        best = dist[id];
        node = id;
      }
    });
    if (!node || best === Infinity) break;
    if (node === end) break;

    visited.add(node);
    ADJ[node].forEach(({ to, edge }) => {
      if (visited.has(to)) return;
      const weight = edgeWeight(edge, opts);
      if (!Number.isFinite(weight)) return;
      const candidate = dist[node] + weight;
      if (candidate < dist[to]) {
        dist[to] = candidate;
        prev[to] = { from: node, edge };
      }
    });
  }

  if (!prev[end] && start !== end) return null;

  const path = [end];
  const pathEdges = [];
  let current = end;
  while (current !== start) {
    const p = prev[current];
    if (!p) break;
    pathEdges.unshift(p.edge);
    current = p.from;
    path.unshift(current);
  }

  if (path[0] !== start) return null;
  return { path, pathEdges };
}

function routeForStops(stops, opts) {
  const fullPath = [];
  const legs = [];
  let totalKm = 0;
  let totalMinutes = 0;
  let tollCount = 0;

  for (let i = 0; i < stops.length - 1; i += 1) {
    const start = stops[i];
    const end = stops[i + 1];
    const res = dijkstra(start, end, opts);
    if (!res) return null;

    const legKm = res.pathEdges.reduce((sum, e) => sum + e.distance, 0);
    const legMin = res.pathEdges.reduce((sum, e) => sum + getEdgeTravelMinutes(e, opts.mode), 0);
    tollCount += res.pathEdges.filter((e) => e.toll).length;
    totalKm += legKm;
    totalMinutes += legMin;

    const legPath = res.path.map((id) => NODES[id].label);
    legs.push({ start, end, km: legKm, minutes: legMin, path: legPath, nodes: res.path });

    res.path.forEach((id, idx) => {
      if (i > 0 && idx === 0) return;
      fullPath.push(id);
    });
  }
  return { fullPath, legs, totalKm, totalMinutes, tollCount };
}

function waypointCost(from, to, opts) {
  const probeOpts = { ...opts, preference: "shortest" };
  const res = dijkstra(from, to, probeOpts);
  if (!res) return Infinity;
  return res.pathEdges.reduce((sum, edge) => sum + edge.distance, 0);
}

function optimizeWaypointOrder(start, waypoints, opts) {
  if (waypoints.length <= 1) {
    return { ordered: [...waypoints], changed: false };
  }

  const remaining = [...waypoints];
  const ordered = [];
  let current = start;

  while (remaining.length > 0) {
    let bestIndex = -1;
    let bestCost = Infinity;

    remaining.forEach((candidate, index) => {
      const cost = waypointCost(current, candidate, opts);
      if (cost < bestCost) {
        bestCost = cost;
        bestIndex = index;
      }
    });

    if (bestIndex === -1) {
      ordered.push(...remaining);
      break;
    }

    const [next] = remaining.splice(bestIndex, 1);
    ordered.push(next);
    current = next;
  }

  const changed = ordered.some((w, idx) => w !== waypoints[idx]);
  return { ordered, changed };
}

function formatEta(minutes) {
  const hrs = Math.floor(minutes / 60);
  const mins = Math.round(minutes % 60);
  if (hrs === 0) return `${mins} min`;
  return `${hrs}h ${mins}m`;
}

function renderMap(activePath = []) {
  const svg = document.querySelector("#network-map");
  const activeSet = new Set();
  for (let i = 0; i < activePath.length - 1; i += 1) {
    const a = activePath[i];
    const b = activePath[i + 1];
    activeSet.add(`${a}|${b}`);
    activeSet.add(`${b}|${a}`);
  }

  const edgesSvg = EDGES.map((e) => {
    const left = NODES[e.a];
    const right = NODES[e.b];
    const cls = activeSet.has(`${e.a}|${e.b}`) ? "edge-active" : "edge-base";
    return `<line class="${cls}" x1="${left.x}" y1="${left.y}" x2="${right.x}" y2="${right.y}" />`;
  }).join("");

  const nodesSvg = Object.entries(NODES).map(([id, n]) => {
    return `<g>
      <circle class="node-dot" cx="${n.x}" cy="${n.y}" r="9" />
      <text class="node-label" x="${n.x + 12}" y="${n.y + 4}">${escapeHtml(n.label)}</text>
    </g>`;
  }).join("");

  svg.innerHTML = `${edgesSvg}${nodesSvg}`;
}

function routeChainHtml(pathIds) {
  return pathIds
    .map((id, idx) => `<span class="stop-pill">${idx + 1}. ${escapeHtml(NODES[id].label)}</span>`)
    .join('<span class="note">-></span>');
}

function extractStops(formData) {
  const start = String(formData.get("start") || "");
  const end = String(formData.get("end") || "");
  const waypointList = formData.getAll("waypoints").map((v) => String(v));
  const cleanedWaypoints = waypointList.filter((w) => w !== start && w !== end);
  const uniqueWaypoints = [...new Set(cleanedWaypoints)];
  return { start, end, waypoints: uniqueWaypoints };
}

function renderRoute(event) {
  event.preventDefault();
  const result = document.querySelector("#route-result");
  const data = new FormData(event.currentTarget);
  const { start, end, waypoints } = extractStops(data);
  const mode = String(data.get("mode") || "car");
  const preference = String(data.get("preference") || "fastest");
  const opts = {
    mode,
    preference,
    avoidTolls: data.get("avoidTolls") === "on",
    avoidHighways: data.get("avoidHighways") === "on",
  };
  const optimizeWaypoints = data.get("optimizeWaypoints") === "on";

  if (!start || !end) {
    result.innerHTML = '<div class="route-alert">Start and destination are required.</div>';
    renderMap();
    return;
  }
  if (start === end && waypoints.length === 0) {
    result.innerHTML = '<div class="route-alert">Start and destination are the same. Pick at least one waypoint or another destination.</div>';
    renderMap();
    return;
  }

  const optimized = optimizeWaypoints ? optimizeWaypointOrder(start, waypoints, opts) : { ordered: waypoints, changed: false };
  const effectiveWaypoints = optimized.ordered;
  const plan = routeForStops([start, ...effectiveWaypoints, end], opts);
  if (!plan) {
    result.innerHTML = '<div class="route-alert">No route found with current constraints. Try turning off "avoid highways" or "avoid toll roads".</div>';
    renderMap();
    return;
  }

  renderMap(plan.fullPath);
  const modeIcon = MODE_ICON[mode] || "\ud83d\ude97";
  const modeLabel = MODE_LABEL[mode] || mode;

  result.innerHTML = `
    <div class="route-stats">
      <article class="stat"><div class="stat-icon">${modeIcon}</div><div class="stat-label">Distance</div><div class="stat-value">${plan.totalKm.toFixed(1)} km</div></article>
      <article class="stat"><div class="stat-icon">\u23f1\ufe0f</div><div class="stat-label">ETA</div><div class="stat-value">${formatEta(plan.totalMinutes)}</div></article>
      <article class="stat"><div class="stat-icon">\ud83d\uddfa\ufe0f</div><div class="stat-label">Mode</div><div class="stat-value">${modeLabel}</div></article>
      <article class="stat"><div class="stat-icon">\ud83d\udcb8</div><div class="stat-label">Toll Segments</div><div class="stat-value">${plan.tollCount}</div></article>
    </div>

    <div class="route-chain-wrap">
      <div class="route-chain-label">Computed route chain</div>
      <div class="stop-chain">${routeChainHtml(plan.fullPath)}</div>
    </div>

    <div class="step-list">
      ${plan.legs.map((leg, idx) => `<article class="step">
        <div class="step-num">${idx + 1}</div>
        <div class="step-path">${escapeHtml(NODES[leg.start].label)} -> ${escapeHtml(NODES[leg.end].label)} (${leg.path.length - 1} segment${leg.path.length - 1 === 1 ? "" : "s"})</div>
        <div class="step-dist">${leg.km.toFixed(1)} km | ${formatEta(leg.minutes)}</div>
      </article>`).join("")}
    </div>

    <div class="route-meta">Preference: <strong>${escapeHtml(preference)}</strong> | Constraints: ${opts.avoidHighways ? "avoid highways" : "highways allowed"}, ${opts.avoidTolls ? "avoid tolls" : "tolls allowed"} | Waypoints: ${optimizeWaypoints ? (optimized.changed ? "optimized" : "already optimal") : "manual order"}</div>
  `;
}

function populateLocationSelects() {
  const startSelect = document.querySelector("#start-select");
  const endSelect = document.querySelector("#end-select");
  const waypointSelect = document.querySelector("#waypoint-select");
  const entries = Object.entries(NODES);

  const options = entries.map(([id, node]) => `<option value="${id}">${escapeHtml(node.label)}</option>`).join("");
  startSelect.innerHTML = options;
  endSelect.innerHTML = options;
  waypointSelect.innerHTML = options;

  startSelect.value = "techPark";
  endSelect.value = "airport";
}

function attachScenarioButtons() {
  const form = document.querySelector("#route-form");
  const start = document.querySelector("#start-select");
  const end = document.querySelector("#end-select");
  const waypoints = document.querySelector("#waypoint-select");
  const mode = form.querySelector('select[name="mode"]');
  const preference = form.querySelector('select[name="preference"]');
  const avoidTolls = form.querySelector('input[name="avoidTolls"]');
  const avoidHighways = form.querySelector('input[name="avoidHighways"]');
  const optimizeWaypoints = form.querySelector('input[name="optimizeWaypoints"]');

  form.querySelectorAll("[data-scenario]").forEach((btn) => {
    btn.addEventListener("click", () => {
      if (btn.dataset.scenario === "commute") {
        start.value = "oldTown";
        end.value = "techPark";
        [...waypoints.options].forEach((o) => { o.selected = ["station"].includes(o.value); });
        mode.value = "car";
        preference.value = "fastest";
        avoidTolls.checked = false;
        avoidHighways.checked = false;
        optimizeWaypoints.checked = true;
      } else {
        start.value = "downtown";
        end.value = "airport";
        [...waypoints.options].forEach((o) => { o.selected = ["oldTown", "harbor"].includes(o.value); });
        mode.value = "bike";
        preference.value = "scenic";
        avoidTolls.checked = true;
        avoidHighways.checked = true;
        optimizeWaypoints.checked = true;
      }
      form.requestSubmit();
    });
  });
}

const form = document.querySelector("#route-form");
populateLocationSelects();
attachScenarioButtons();
renderMap();
form.addEventListener("submit", renderRoute);
form.requestSubmit();

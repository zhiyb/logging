import * as d3 from "https://cdn.skypack.dev/d3@7";
import "https://unpkg.com/htl@0.3.1";

// https://github.com/observablehq/stdlib/blob/main/src/dom/uid.js
var uid_count = 0;

function DOM_uid(name) {
  return new Id("O-" + (name == null ? "" : name + "-") + ++uid_count);
}

function Id(id) {
  this.id = id;
  this.href = new URL(`#${id}`, location) + "";
}

Id.prototype.toString = function() {
  return "url(" + this.href + ")";
};

// https://public.tableau.com/views/TableauColors/ColorPaletteswithRGBValues
const schemeTableau10 = [
  "#1F77B4", "#FF7F0E", "#2CA02C", "#D62728", "#9467BD", "#8C564B", "#E377C2", "#7F7F7F", "#BCBD22", "#17BECF"
];
const schemeTableau10Light = [
  "#AEC7E8", "#FFBB78", "#98DF8A", "#FF9896", "#C5B0D5", "#C49C94", "#F7B6D2", "#C7C7C7", "#DBDB8D", "#9EDAE5"
];
const schemeTableau10Medium = [
  "#729ECE", "#FF9E4A", "#67BF5C", "#ED665D", "#AD8BC9", "#A8786E", "#ED97CA", "#A2A2A2", "#CDCC5D", "#6DCCDA"
];
// Tableau 10 + Light
const schemeTableau20 = [
  "#1F77B4", "#AEC7E8", "#FF7F0E", "#FFBB78", "#2CA02C", "#98DF8A", "#D62728", "#FF9896", "#9467BD", "#C5B0D5",
  "#8C564B", "#C49C94", "#E377C2", "#F7B6D2", "#7F7F7F", "#C7C7C7", "#BCBD22", "#DBDB8D", "#17BECF", "#9EDAE5",
];

// Copyright 2021, Observable Inc.
// Released under the ISC license.
// https://observablehq.com/@d3/color-legend
function Swatches(color, {
  columns = null,
  format,
  unknown: formatUnknown,
  swatchSize = 15,
  swatchWidth = swatchSize,
  swatchHeight = swatchSize,
  marginLeft = 0
} = {}) {
  const id = `-swatches-${Math.random().toString(16).slice(2)}`;
  const unknown = formatUnknown == null ? undefined : color.unknown();
  const unknowns = unknown == null || unknown === d3.scaleImplicit ? [] : [unknown];
  const domain = color.domain().concat(unknowns);
  if (format === undefined) format = x => x === unknown ? formatUnknown : x;

  function entity(character) {
    return `&#${character.charCodeAt(0).toString()};`;
  }

  if (columns !== null) return htl.html`<div style="display: flex; align-items: center; margin-left: ${+marginLeft}px; min-height: 33px; font: 10px sans-serif;">
  <style>

.${id}-item {
  break-inside: avoid;
  display: flex;
  align-items: center;
  padding-bottom: 1px;
}

.${id}-label {
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  max-width: calc(100% - ${+swatchWidth}px - 0.5em);
}

.${id}-swatch {
  width: ${+swatchWidth}px;
  height: ${+swatchHeight}px;
  margin: 0 0.5em 0 0;
}

  </style>
  <div style=${{width: "100%", columns}}>${domain.map((value, i) => {
    const label = `${format(value, i)}`;
    return htl.html`<div class=${id}-item>
      <div class=${id}-swatch style=${{background: color(value)}}></div>
      <div class=${id}-label title=${label}>${label}</div>
    </div>`;
  })}
  </div>
</div>`;

  return htl.html`<div style="display: flex; align-items: center; min-height: 33px; margin-left: ${+marginLeft}px; font: 10px sans-serif;">
  <style>

.${id} {
  display: inline-flex;
  align-items: center;
  margin-right: 1em;
}

.${id}::before {
  content: "";
  width: ${+swatchWidth}px;
  height: ${+swatchHeight}px;
  margin-right: 0.5em;
  background: var(--color);
}

  </style>
  <div>${domain.map((value, i) => htl.html`<span class="${id}" style="--color: ${color(value)}">${format(value, i)}</span>`)}</div>`;
}

const formatMillisecond = d3.timeFormat(".%L"),
  formatSecond = d3.timeFormat(":%S"),
  formatMinute = d3.timeFormat("%H:%M"),
  formatHour = d3.timeFormat("%H:%M"),
  formatDay = d3.timeFormat("%a %d"),
  formatWeek = d3.timeFormat("%b %d"),
  formatMonth = d3.timeFormat("%B"),
  formatYear = d3.timeFormat("%Y");

function multiFormat(date) {
  return (d3.timeSecond(date) < date ? formatMillisecond
    : d3.timeMinute(date) < date ? formatSecond
    : d3.timeHour(date) < date ? formatMinute
    : d3.timeDay(date) < date ? formatHour
    : d3.timeMonth(date) < date ? (d3.timeWeek(date) < date ? formatDay : formatWeek)
    : d3.timeYear(date) < date ? formatMonth
    : formatYear)(date);
}

// Copyright 2021 Observable, Inc.
// Released under the ISC license.
// https://observablehq.com/@d3/multi-line-chart
function ChartZoomX(data, {
  x = ([x]) => x, // given d in data, returns the (temporal) x-value
  y = ([, y]) => y, // given d in data, returns the (quantitative) y-value
  z = () => 1, // given d in data, returns the (categorical) z-value
  title, // given d in data, returns the title text
  defined, // for gaps in data
  stacked = false,  // stacked area chart
  offset = d3.stackOffsetNone, // stack offset method
  order = d3.stackOrderNone, // stack order method
  curve = d3.curveLinear, // method of interpolation between points
  marginTop = 20, // top margin, in pixels
  marginRight = 30, // right margin, in pixels
  marginBottom = 30, // bottom margin, in pixels
  marginLeft = 50, // left margin, in pixels
  width = 640, // outer width, in pixels
  height = 400, // outer height, in pixels
  xType = d3.scaleUtc, // type of x-scale
  xDomain, // [xmin, xmax]
  xRange = [marginLeft, width - marginRight], // [left, right]
  yType = d3.scaleLinear, // type of y-scale
  yDomain, // [ymin, ymax]
  yRange = [height - marginBottom, marginTop], // [bottom, top]
  yFormat, // a format specifier string for the y-axis
  yLabel, // a label for the y-axis
  zDomain, // array of z-values
  lineHover = false,  // select line when hovering above
  colors = "auto", // array of colors for z
  dashed = false, // dashed lines for every second line
  strokeLinecap, // stroke line cap of line
  strokeLinejoin, // stroke line join of line
  strokeWidth = 1.5, // stroke width of line
  strokeOpacity, // stroke opacity of line
  mixBlendMode = "multiply", // blend mode of lines
  linkedZoom = [],  // link chart zoom together
} = {}) {
  // Compute values.
  const X = d3.map(data, x);
  const Y = d3.map(data, y);
  const Z = d3.map(data, z);
  const O = d3.map(data, d => d);
  if (defined === undefined) defined = (d, i) => !isNaN(Y[i]);
  const D = d3.map(data, defined);

  // Compute default domains, and unique the z-domain.
  const yDomainAuto = yDomain === undefined;
  if (xDomain === undefined) xDomain = d3.extent(X);
  if (yDomainAuto) yDomain = d3.extent(Y);  //[0, d3.max(Y)];
  if (zDomain === undefined) zDomain = Z;
  zDomain = new d3.InternSet(zDomain);

  if (colors === 'auto') {
    // https://stackoverflow.com/a/20298027
    const C = [
      "#000000", "#00FF00", "#0000FF", "#FF0000", "#01FFFE", "#FFA6FE", "#FFDB66", "#006401",
      "#010067", "#95003A", "#007DB5", "#FF00F6", /*"#FFEEE8",*/ "#774D00", "#90FB92", "#0076FF",
      "#D5FF00", "#FF937E", "#6A826C", "#FF029D", "#FE8900", "#7A4782", "#7E2DD2", "#85A900",
      "#FF0056", "#A42400", "#00AE7E", "#683D3B", "#BDC6FF", "#263400", "#BDD393", "#00B917",
      "#9E008E", "#001544", "#C28C9F", "#FF74A3", "#01D0FF", "#004754", "#E56FFE", "#788231",
      "#0E4CA1", "#91D0CB", "#BE9970", "#968AE8", "#BB8800", "#43002C", "#DEFF74", "#00FFC6",
      "#FFE502", "#620E00", "#008F9C", "#98FF52", "#7544B1", "#B500FF", "#00FF78", "#FF6E41",
      "#005F39", "#6B6882", "#5FAD4E", "#A75740", "#A5FFD2", "#FFB167", "#009BFF", "#E85EBE",
    ]

    const s = dashed ? (zDomain.size + 1) / 2 : zDomain.size;
    if (s <= d3.schemeTableau10.length)
      colors = d3.schemeTableau10;
    else if (s <= schemeTableau20.length)
      colors = schemeTableau20;
    else if (s <= C.length)
      colors = C;
    else
      colors = d3.interpolateSinebow;
    if (dashed && typeof colors === 'object')
      colors = colors.flatMap(c => [c, c]);
  }

  if (typeof colors === 'function')
    //colors = d3.map(zDomain, (z, i, a) => colors(Math.random()));
    colors = d3.map(zDomain, (z, i, a) => colors(i / a.size));
  const color = d3.scaleOrdinal(zDomain, colors);

  // Omit any data not present in the z-domain.
  const I = d3.range(X.length).filter(i => zDomain.has(Z[i]));

  // Construct scales and axes.
  const xScale = xType(xDomain, xRange);
  const yScale = yType(yDomain, yRange);
  //const xAxis = d3.axisBottom(xScale).ticks(width / 80).tickSizeOuter(0);
  //const yAxis = d3.axisLeft(yScale).ticks(height / 60, yFormat);

  let zx = xScale;
  let zy = yScale;

  const clipId = DOM_uid("clip");

  // Compute titles.
  const T = title === undefined ? Z : title === null ? null : d3.map(data, title);

  // Construct a line generator.
  let series = undefined;
  let line = undefined;
  let area = undefined;
  if (stacked) {
    // Compute a nested array of series where each series is [[y1, y2], [y1, y2],
    // [y1, y2], …] representing the y-extent of each stacked rect. In addition,
    // each tuple has an i (index) property so that we can refer back to the
    // original data point (data[i]). This code assumes that there is only one
    // data point for a given unique x- and z-value.
    series = d3.stack()
        .keys(zDomain)
        .value(([x, I], z) => Y[I.get(z)])
        .order(order)
        .offset(offset)
      (d3.rollup(I, ([i]) => i, i => X[i], i => Z[i]))
      .map(s => s.map(d => Object.assign(d, {i: d.data[1].get(s.key)})));

    area = (xs, ys) => d3.area()
      .defined(({i}) => D[i])
      .curve(curve)
      .x(({i}) => xs(X[i]))
      .y0(([y1]) => ys(y1))
      .y1(([, y2]) => ys(y2));

  } else {
    line = (x, y) => d3.line()
      .defined(i => D[i])
      .curve(curve)
      .x(i => x(X[i]))
      .y(i => y(Y[i]));
  }

  const svg = d3.create("svg")
      .attr("width", width)
      .attr("height", height)
      .attr("viewBox", [0, 0, width, height])
      .attr("style", "max-width: 100%; height: auto; height: intrinsic;")
      .style("-webkit-tap-highlight-color", "transparent")
      .on("touchstart", event => event.preventDefault());
  if (lineHover)
    svg.on("pointerenter", pointerentered)
      .on("pointermove", pointermoved)
      .on("pointerleave", pointerleft);

  let xAxis = (g, xs) => g
    .call(d3.axisBottom(xs).tickFormat(multiFormat).ticks(width / 80).tickSizeOuter(0));

  const gx = svg.append("g");
  gx.attr("transform", `translate(0,${height - marginBottom})`)
    .call(xAxis, xScale)
    .call(g => g.select(".domain").attr("display", "none"));

  let yAxis = (g, ys) => g
    .call(d3.axisLeft(ys).ticks(height / 60, yFormat));

  const gy = svg.append("g")
  gy.attr("transform", `translate(${marginLeft},0)`)
    .call(g => g.append("text")
    .attr("x", -marginLeft)
    .attr("y", 10)
    .attr("fill", "currentColor")
    .attr("text-anchor", "start")
    .text(yLabel))
    .call(yAxis, yScale)
    .call(g => g.select(".domain").attr("display", "none"));

  let grid = (g, xs, ys) => g
    /*.call(g => g
      .selectAll(".x")
      .data(xs.ticks(width / 80))
      .join(
        enter => enter.append("line").attr("class", "x").attr("y2", height),
        update => update,
        exit => exit.remove()
      )
      .attr("x1", d => 0.5 + xs(d))
      .attr("x2", d => 0.5 + xs(d)))*/ // x-tick grid
    .call(g => g
      .selectAll(".y")
      .data(ys.ticks(height / 60))
      .join(
        enter => enter.append("line").attr("class", "y").attr("x2", width),
        update => update,
        exit => exit.remove()
      )
      .attr("y1", d => 0.5 + ys(d))
      .attr("y2", d => 0.5 + ys(d)));

  const gGrid = svg.append("g")
    .attr("stroke", "currentColor")
    .attr("stroke-opacity", 0.1)
    .attr("clip-path", clipId)
    .call(grid, xScale, yScale);

  let path = undefined;
  if (stacked) {
    path = svg.append("g")
      .selectAll("path")
      .data(series)
      .join("path")
        .attr("fill", ([{i}]) => color(Z[i]))
    path.append("title").text(([{i}]) => Z[i]);
  } else {
    path = svg.append("g")
        .attr("fill", "none")
        .attr("stroke-linecap", strokeLinecap)
        .attr("stroke-linejoin", strokeLinejoin)
        .attr("stroke-width", strokeWidth)
        .attr("stroke-opacity", strokeOpacity)
      .selectAll("path")
      .data(d3.group(I, i => Z[i]))
      .join("path")
        .style("mix-blend-mode", mixBlendMode)
        .attr("stroke", typeof color === "function" ? ([z]) => color(z) : null);
    if (dashed)
      path.attr("stroke-dasharray", (z, i) => i % 2 ? ("2, 2") : null);
  }


  // Clip path
  svg.append("clipPath")
      .attr("id", clipId.id)
    .append("rect")
      .attr("x", marginLeft)
      .attr("y", marginTop)
      .attr("height", height - marginTop - marginBottom)
      .attr("width", width - marginLeft - marginRight);
  path.attr("clip-path", clipId);


  // Mouse hover selection
  const dot = svg.append("g")
      .attr("display", "none");

  dot.append("circle")
      .attr("r", 2.5);

  dot.append("text")
      .attr("font-family", "sans-serif")
      .attr("font-size", 10)
      .attr("text-anchor", "middle")
      .attr("y", -8);

  function pointermoved(event) {
    const [xm, ym] = d3.pointer(event);
    const i = d3.least(I, i => Math.hypot(zx(X[i]) - xm, zy(Y[i]) - ym)); // closest point
    path.style("stroke", ([z]) => Z[i] === z ? null : "#ddd").filter(([z]) => Z[i] === z).raise();
    dot.attr("transform", `translate(${zx(X[i])},${zy(Y[i])})`);
    if (T) dot.select("text").text(T[i]);
    svg.property("value", O[i]).dispatch("input", {bubbles: true});
  }

  function pointerentered() {
    path.style("mix-blend-mode", null).style("stroke", "#ddd");
    dot.attr("display", null);
  }

  function pointerleft() {
    path.style("mix-blend-mode", mixBlendMode).style("stroke", null);
    dot.attr("display", "none");
    svg.node().value = null;
    svg.dispatch("input", {bubbles: true});
  }


  // Zooming
  const zoom = d3.zoom()
    .scaleExtent([1, Infinity])
    .extent([[marginLeft, 0], [width - marginRight, height]])
    .translateExtent([[marginLeft, -Infinity], [width - marginRight, Infinity]])
    .on("zoom", zoomed);

  let zoomCnt = 0;
  function zoomed({transform}) {
    zx = transform.rescaleX(xScale).interpolate(d3.interpolateRound);
    //zy = transform.rescaleY(yScale).interpolate(d3.interpolateRound);

    const minX = zx.invert(marginLeft);
    const maxX = zx.invert(width - marginRight);
    if (yDomainAuto) {
      let extY;
      if (stacked) {
        const regMaxY = series[series.length-1].filter(I => D[I.i] && minX <= X[I.i] && maxX >= X[I.i]).map(([, y2]) => y2);
        const regMinY = series[0].filter(I => D[I.i] && minX <= X[I.i] && maxX >= X[I.i]).map(([, y2]) => y2);
        extY = [d3.min(regMinY), d3.max(regMaxY)];
      } else {
        const regY = I.filter(i => D[i] && minX <= X[i] && X[i] <= maxX).map(i => Y[i]);
        extY = d3.extent(regY);
      }
      if (extY[0] !== undefined) {
        zy = yType(extY, yRange);
        gy.call(yAxis, zy);
        gGrid.call(grid, zx, zy);
      }
    }
    gx.call(xAxis, zx);

    //path.attr("transform", transform).attr("stroke-width", 1 / transform.k);
    if (stacked)
      path.attr("d", area(zx, zy));
    else
      path.attr("d", ([, I]) => line(zx, zy)(I));

    zoomCnt++;
    for (const f of linkedZoom)
      f(zoomCnt, minX, maxX);
  }

  function zoomTo(cnt, minX, maxX) {
    if (zoomCnt == cnt)
      return;
    const sMinX = xScale(minX);
    const sMaxX = xScale(maxX);
    const idMinX = marginLeft;
    const idMaxX = width - marginRight;
    const scale = (idMaxX - idMinX) / (sMaxX - sMinX);
    const transX = idMinX - sMinX * scale;
    svg.call(zoom.transform, new d3.ZoomTransform(scale, transX, 0));
  }

  svg.call(zoom).call(zoom.transform, d3.zoomIdentity);

  linkedZoom.push(zoomTo);


  return Object.assign(svg.node(), {scales: {color}});
}



function parse_ts(ts) {
  let dt = ts.split(/[- :]/);
  dt[1]--;
  return new Date(Date.UTC(...dt));
}

function add_chart(e, values, opts, baseUrl = null) {
  const chart = ChartZoomX(values, opts);
  let format = opts.format;
  if (format === undefined) {
    let formatDash = (v, i) => v;
    if (opts.dashed)
      formatDash = (v, i) => (i % 2 ? "⋯ " : "") + v;
    let formatLink = formatDash;
    if (baseUrl !== null)
      formatLink = (v, i) => htl.html`<a href="${baseUrl + v}" style="color:inherit;">${formatDash(v, i)}</a>`;
    format = formatLink;
  }
  e.append(Swatches(chart.scales.color, {format: format}));
  e.append(chart);
}



function get_sensor_unit(type) {
  const units = {
    "temperature": "℃",
    "pressure": "Pa",
    "humidity": "%",
    "gas_resistance": "Ω",
  }
  const u = units[type];
  return u === undefined ? "value" : u;
}



export {
  add_chart, parse_ts, get_sensor_unit,
  schemeTableau10, schemeTableau10Light, schemeTableau10Medium, schemeTableau20,
};

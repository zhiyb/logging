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
  <div style=${{width: "100%", columns}}>${domain.map(value => {
    const label = `${format(value)}`;
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
  <div>${domain.map(value => htl.html`<span class="${id}" style="--color: ${color(value)}">${format(value)}</span>`)}</div>`;
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
  offset = d3.stackOffsetDiverging, // stack offset method
  order = d3.stackOrderNone, // stack order method
  curve = d3.curveLinear, // method of interpolation between points
  marginTop = 20, // top margin, in pixels
  marginRight = 30, // right margin, in pixels
  marginBottom = 30, // bottom margin, in pixels
  marginLeft = 40, // left margin, in pixels
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
  colors = d3.interpolateRainbow, // array of colors for z
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

  //const color = d3.scaleSequential(zDomain, d3.interpolateRainbow).unknown("none");
  const color = d3.scaleOrdinal(zDomain, d3.schemeTableau10);
  //console.log(color);

  // Omit any data not present in the z-domain.
  const I = d3.range(X.length).filter(i => zDomain.has(Z[i]));

  // Construct scales and axes.
  const xScale = xType(xDomain, xRange);
  const yScale = yType(yDomain, yRange);
  //const xAxis = d3.axisBottom(xScale).ticks(width / 80).tickSizeOuter(0);
  //const yAxis = d3.axisLeft(yScale).ticks(height / 60, yFormat);

  let zx = xScale;
  let zy = yScale;

  let xAxis = (g, x) => g
    .attr("transform", `translate(0,${height - marginBottom})`)
    .call(d3.axisBottom(x).tickFormat(multiFormat).ticks(width / 80).tickSizeOuter(0))
    .call(g => g.select(".domain").attr("display", "none"));

  let yAxis = (g, y) => g
    .attr("transform", `translate(${marginLeft},0)`)
    .call(d3.axisLeft(y).ticks(height / 60, yFormat))
    .call(g => g.select(".domain").attr("display", "none"));

  const clipId = DOM_uid("clip");

  let grid = (g, x, y) => g
    .attr("stroke", "currentColor")
    .attr("stroke-opacity", 0.1)
    .attr("clip-path", clipId)
    /*.call(g => g
      .selectAll(".x")
      .data(x.ticks(width / 80))
      .join(
        enter => enter.append("line").attr("class", "x").attr("y2", height),
        update => update,
        exit => exit.remove()
      )
      .attr("x1", d => 0.5 + x(d))
      .attr("x2", d => 0.5 + x(d)))*/ // x-tick grid
    .call(g => g
      .selectAll(".y")
      .data(y.ticks(height / 60))
      .join(
        enter => enter.append("line").attr("class", "y").attr("x2", width),
        update => update,
        exit => exit.remove()
      )
      .attr("y1", d => 0.5 + y(d))
      .attr("y2", d => 0.5 + y(d)));

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

  const gx = svg.append("g");

  const gy = svg.append("g");
  gy.call(g => g.append("text")
    .attr("x", -marginLeft)
    .attr("y", 10)
    .attr("fill", "currentColor")
    .attr("text-anchor", "start")
    .text(yLabel));

  const gGrid = svg.append("g");

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
        .attr("stroke", typeof color === "string" ? color : null)
        .attr("stroke-linecap", strokeLinecap)
        .attr("stroke-linejoin", strokeLinejoin)
        .attr("stroke-width", strokeWidth)
        .attr("stroke-opacity", strokeOpacity)
      .selectAll("path")
      .data(d3.group(I, i => Z[i]))
      .join("path")
        .style("mix-blend-mode", mixBlendMode)
        .attr("stroke", typeof color === "function" ? ([z]) => color(z) : null);
  }


  // Clip path
  svg.append("clipPath")
      .attr("id", clipId.id)
    .append("rect")
      .attr("x", marginLeft)
      .attr("y", 0)
      .attr("height", height)
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
      const regY = data.filter(d => !isNaN(x(d)) && minX <= x(d) && x(d) <= maxX).map(y);
      const maxY = d3.max(regY);
      if (maxY !== undefined) {
        const minY = d3.min(regY);
        zy = yType([minY, maxY], yRange);
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
  if (!yDomainAuto) { // Initialisation necessary
    gy.call(yAxis, zy);
    gGrid.call(grid, zx, zy);
  }

  linkedZoom.push(zoomTo);


  return Object.assign(svg.node(), {scales: {color}});
}



function parse_ts(ts) {
  let dt = ts.split(/[- :]/);
  dt[1]--;
  return new Date(...dt);
}

function add_chart(e, values, opts) {
  let chart = ChartZoomX(values, opts);
  e.append(Swatches(chart.scales.color));
  e.append(chart);
}

export {add_chart, parse_ts};

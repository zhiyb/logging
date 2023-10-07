function parse_ts(ts) {
  let dt = ts.split(/[- :]/);
  dt[1]--;
  return new Date(Date.UTC(...dt));
}

function get_sensor_unit(type) {
  const units = {
    "temperature": "℃",
    "pressure": "Pa",
    "humidity": "%",
    "gas_resistance": "Ω",
    "voltage": "V",
    "power": "W",
  }
  const u = units[type];
  return u === undefined ? "value" : u;
}



let traces = [];
let tracecfgs = {};

function draw_chart(domkey, cfg) {
  let ajaxs = [];
  for (let i = 0; i < cfg.length; i++) {
    let c = cfg[i];
    tracecfgs[c.id] = {
      legendrank: i,
      legendgroup: c.id,
      legendgrouptitle: {text: `- ${c.id} -`},
      yaxis: `y${i == cfg.length-1 ? "" : cfg.length-i}`,
      type: {line: "scattergl", stack: "scatter"}[c.type],
      mode: c.type == "line" ? "lines" : undefined,
      stackgroup: c.type == "stack" ? c.id : undefined,
      line: {"width": 1},
    };
    ajaxs.push($.getJSON(c.url, c.func));
  }

  $.when(...ajaxs).done(function () {
    let layout = {
      autosize: true,
      height: 400 + 300 * cfg.length,
      margin: {
        t: 20,
        b: 80,
        l: 60,
        r: 20,
      },
      showlegend: true,
      legend: {
        orientation: "h",
        //yanchor: "bottom",
        //y: 1,
        groupclick: "toggleitem",
      },
    };

    // yaxis domain(location) and title
    let dsize = 1 / cfg.length;
    for (let i = 1; i <= cfg.length; i++) {
      layout["yaxis" + (i == 0 ? "" : i)] = {
        title: cfg[cfg.length-i].ytitle,
        domain: [dsize * (i-1), dsize * i],
      };
    }

    Plotly.react(domkey, traces, layout, {responsive: true});
  });
}

function add_traces(id, values) {
  for (let key in values) {
    let v = values[key];
    for (let c in tracecfgs[id])
      v[c] = tracecfgs[id][c];
    v.name = key;
    traces.push(v);
  }
}



export {
  draw_chart, add_traces, parse_ts, get_sensor_unit,
};

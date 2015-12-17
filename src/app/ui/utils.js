import d3 from "d3";

export function rect(el) {
  return el.getBoundingClientRect();
}

export function timeline(el) {
  const progress = el,
        fill = query(".Timeline__fill", progress),
        mark = query(".Timeline__mark", progress);

  function updateFromEvent(e) {
    const r = rect(progress);

    const value = Math.max(0,Math.min(1,(e.clientX - r.left) / r.width));
    mark.style.left = (value * 100) + "%";
    fill.style.transform = `scaleX(${value})`;
  }

  function handleClick(e) {
    updateFromEvent(e);
  }

  function handleMove(e) {
    updateFromEvent(e);
  }

  function handleDown(e) {
    document.addEventListener("mousemove", handleMove);
    document.addEventListener("mouseup", handleUp);
  }

  function handleUp(e) {
    document.removeEventListener("mousemove", handleMove);
    document.removeEventListener("mouseup", handleUp);
  }

  mark.addEventListener("mousedown", handleDown);
  progress.addEventListener("click", handleClick);
}

export function query(selector, el = document) {
  return el.querySelector(selector);
}

export function queryAll(selector, el = document) {
  return Array.prototype.slice.apply(el.querySelectorAll(selector));
}

export function each(list, fn) {
  for (let index = 0; index < el.children.length; index++) {
    const current = el.children[index],
          result = fn(current);

    if (result) {
      return result;
    }
  }
  return null;
}

export function children(el, fn) {
  return each(el.children, fn);
}

export function siblings(el, fn) {
  let current = el.nextElementSibling;
  while (current) {
    fn(current);
    current = current.nextElementSibling;
  }

  current = el.previousElementSibling;
  while (current) {
    fn(current);
    current = current.previousElementSibling;
  }
  return el;
}

export function deactivate(el) {
  el.classList.remove("isActive");
  return el;
}

export function activate(el) {
  el.classList.add("isActive");
  siblings(el, deactivate);
  return el;
}

export function getAttr(el, name) {
  return el.getAttribute(name);
}

export function setAttr(el, name, value) {
  return el.setAttribute(name, value);
}

export function hasAttr(el, name) {
  return el.hasAttribute(name);
}

export function getActive(list) {
  return each(list, (current) => {
    if (current.classList.contains("isActive")) {
      return current;
    }
  });
}

export function clear(el) {
  while (el.childNodes.length > 0) {
    el.removeChild(el.lastChild);
  }
  return el;
}

export function add(el, child) {
  el.appendChild((typeof child === "function" ? child() : child));
  return el;
}

export function remove(el, child) {
  el.removeChild((typeof child === "function" ? child() : child));
  return el;
}

export function interpolateText(text, data = {}, filters = {}) {
  return text.replace(/\{(.*?)\}/g, (fullMatch,name) => {
    if (name in data) {
      if (name in filters) {
        const filter = filters[name];
        return filter(data[name]);
      }
      return data[name];
    }
    return name;
  });
}

export function interpolate(el, data = {}, filters = {}) {
  for (let index = 0; index < el.childNodes.length; index++) {
    const childNode = el.childNodes[index];
    if (childNode.nodeType === document.TEXT_NODE) {
      childNode.textContent = interpolateText(childNode.textContent, data, filters);
    } else if (childNode.nodeType === document.ELEMENT_NODE) {
      for (let index = 0; index < childNode.attributes.length; index++) {
        const attribute = childNode.attributes[index];
        attribute.value = interpolateText(attribute.value, data, filters);
      }
      interpolate(childNode, data, filters);
    }
  }
  return el;
}

export function template(selector, data = {}, filters = {}) {
  const element = query(selector);
  if (!element) {
    throw `Element ${selector} not found`;
  }
  const templated = document.importNode(element.content, true);
  interpolate(templated, data, filters);
  return templated;
}

function graph(el, data, options = {}) {

  options = Object.assign({
    yStart: Infinity,
    yEnd: Infinity
  }, options);

  const container = query(".Graph__content", el);
  clear(container);

  const parseDate = d3.time.format("%Y-%m-%dT%H:%M:%SZ").parse;

  data.forEach(function(d) {
    d.date = parseDate(d.date);
  });

  const rect = rect(container);

  const margin = {
      top: 0,
      right: 0,
      bottom: 36,
      left: 64
    },
    width = rect.width - margin.left - margin.right,
    height = rect.height - margin.top - margin.bottom,
    sWidth = rect.width + margin.left,
    sHeight = rect.height + margin.top;

  const x = d3.time.scale()
    .range([0, width]);

  const y = d3.scale.log()
    .base(10)
    .range([height, 0]);

  const xAxis = d3.svg.axis()
    .scale(x)
    .orient("bottom")
    .tickSize(-height, 0)
    .tickPadding(16);

  const yAxis = d3.svg.axis()
    .scale(y)
    .orient("left")
    .tickSize(-width)
    .tickPadding(16);

  const line = d3.svg.line()
    .interpolate("basis")
    .x(function(d) { return x(d.date); })
    .y(function(d) { return y(d.value); });

  const area = (Number.isFinite(options.yStart) && Number.isFinite(options.yEnd))
  ? d3.svg.area()
    .interpolate("basis")
    .x(function(d) { return x(d.date); })
    .y0(function(d) { return y(options.yStart); })
    .y1(function(d) { return y(d.value); })
  : null;

  const svg = d3.select(container)
    .append("svg")
    .attr("class", "Graph__image")
    .attr("width", rect.width)
    .attr("height", rect.height)
    //.attr("viewBox","0 0 " + Math.max(sWidth,sHeight) + " " + Math.min(sWidth,sHeight))
    .attr("viewBox","0 0 " + rect.width + " " + rect.height)
    //.attr("preserveAspectRatio", "none")
    .append("g")
    .attr("transform", "translate(" + margin.left + "," + margin.top + ")");

  x.domain(d3.extent(data, function(d) { return d.date; }));
  if (Number.isFinite(options.yStart) && Number.isFinite(options.yEnd)) {
    y.domain([options.yStart,options.yEnd]);
  } else {
    y.domain(d3.extent(data, function(d) { return d.value; }));
  }

  if (area) {
    svg.append("path")
      .datum(data)
      .attr("class", "Graph__area")
      .attr("d", area);
  }

  svg.append("path")
    .datum(data)
    .attr("class", "Graph__line")
    .attr("d", line);

  svg.append("g")
    .attr("class", "Graph__axis")
    .attr("transform", "translate(0," + height + ")")
    .call(xAxis);

  svg.append("g")
    .attr("class", "Graph__axis")
    .call(yAxis)
    .append("text")
    .attr("class", "Graph__text")
    .attr("transform", "rotate(-90)")
    .style("text-anchor", "end")
    .text("MeV");

  return el;

}

export function sunspotsGraph(el, type1, type2, type3) {

  const container = query(".Graph__content", el);
  clear(container);

  const parseDate = d3.time.format("%Y-%m-%d").parse;

  let minDate = Number.MAX_VALUE,
      maxDate = Number.MIN_VALUE,
      minValue = Number.MAX_VALUE,
      maxValue = Number.MIN_VALUE;

  type1.forEach(function(d) {

    d.date = parseDate(d.date);

    minDate = Math.min(d.date.getTime(), minDate);

    minValue = Math.min(d.value, minValue);
    maxValue = Math.max(d.value, maxValue);

  });

  type2.forEach(function(d) {

    d.date = parseDate(d.date);

    maxDate = Math.max(d.date.getTime(), maxDate);

    minValue = Math.min(d.value, minValue);
    maxValue = Math.max(d.value, maxValue);

  });

  type3.forEach(function(d) {

    d.date = parseDate(d.date);

    minValue = Math.min(d.value, minValue);
    maxValue = Math.max(d.value, maxValue);

  });

  const rect = rect(container);

  const margin = {
      top: 0,
      right: 0,
      bottom: 36,
      left: 64
    },
    width = rect.width - margin.left - margin.right,
    height = rect.height - margin.top - margin.bottom,
    sWidth = rect.width + margin.left,
    sHeight = rect.height + margin.top;

  const x = d3.time.scale()
    .range([0, width]);

  const y = d3.scale.linear()
    .range([height, 0]);

  const xAxis = d3.svg.axis()
    .scale(x)
    .orient("bottom")
    .tickSize(-height, 0)
    .tickPadding(16);

  const yAxis = d3.svg.axis()
    .scale(y)
    .orient("left")
    .tickSize(-width)
    .tickPadding(16);

  const line1 = d3.svg.line()
    .interpolate("basis")
    .x(function(d) { return x(d.date); })
    .y(function(d) { return y(d.value); });

  const line2 = d3.svg.line()
    .interpolate("basis")
    .x(function(d) { return x(d.date); })
    .y(function(d) { return y(d.value); });

  const line3 = d3.svg.line()
    .interpolate("basis")
    .x(function(d) { return x(d.date); })
    .y(function(d) { return y(d.value); });

  const svg = d3.select(container)
    .append("svg")
    .attr("class", "Graph__image")
    .attr("width", rect.width)
    .attr("height", rect.height)
    //.attr("viewBox","0 0 " + Math.max(sWidth,sHeight) + " " + Math.min(sWidth,sHeight))
    .attr("viewBox","0 0 " + rect.width + " " + rect.height)
    //.attr("preserveAspectRatio", "none")
    .append("g")
    .attr("transform", "translate(" + margin.left + "," + margin.top + ")");

  x.domain([minDate, maxDate]);
  y.domain([minValue, maxValue]);

  svg.append("path")
    .datum(type1)
    .attr("class", "Graph__line Graph__smoothed")
    .attr("d", line1);

  svg.append("path")
    .datum(type2)
    .attr("class", "Graph__line Graph__predicted")
    .attr("d", line2);

  svg.append("path")
    .datum(type3)
    .attr("class", "Graph__line Graph__observed")
    .attr("d", line3);

  svg.append("g")
    .attr("class", "Graph__axis")
    .attr("transform", "translate(0," + height + ")")
    .call(xAxis);

  svg.append("g")
    .attr("class", "Graph__axis")
    .call(yAxis)
    .append("text")
    .attr("class", "Graph__text")
    .attr("transform", "rotate(-90)")
    .style("text-anchor", "end")
    .text("MeV");

  return el;

}

export function xrayFluxGraph(el, data) {
  return graph(el, data, {
    yStart: 0.00000001,
    yEnd: 0.00006
  });
}

export function protonFluxGraph(el, data) {
  return graph(el, data, {
    yStart: 0.01,
    yEnd: 120
  });
}

export function electronFluxGraph(el, data) {
  return graph(el, data, {
    yStart: 1,
    yEnd: 120000
  });
}

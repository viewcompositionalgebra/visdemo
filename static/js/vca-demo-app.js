(function (global, factory) {
typeof exports === 'object' && typeof module !== 'undefined' ? factory(exports, require('ramda'), require('vca'), require('pg'), require('squel'), require('jquery'), require('sql.js')) :
typeof define === 'function' && define.amd ? define(['exports', 'ramda', 'vca', 'pg', 'squel', 'jquery', 'sql.js'], factory) :
(global = typeof globalThis !== 'undefined' ? globalThis : global || self, factory(global.vcademo = global.vcademo || {}, global.R, global.vca, null, global.squel, global.$, global.sql_js));
}(this, (function (exports, R$1, vca, pg, squelbase, $$1, sql_js) { 'use strict';

function _interopDefaultLegacy (e) { return e && typeof e === 'object' && 'default' in e ? e : { 'default': e }; }

function _interopNamespace(e) {
if (e && e.__esModule) return e;
var n = Object.create(null);
if (e) {
Object.keys(e).forEach(function (k) {
if (k !== 'default') {
var d = Object.getOwnPropertyDescriptor(e, k);
Object.defineProperty(n, k, d.get ? d : {
enumerable: true,
get: function () {
return e[k];
}
});
}
});
}
n['default'] = e;
return Object.freeze(n);
}

var R__namespace = /*#__PURE__*/_interopNamespace(R$1);
var R__default = /*#__PURE__*/_interopDefaultLegacy(R$1);
var squelbase__namespace = /*#__PURE__*/_interopNamespace(squelbase);
var $__default = /*#__PURE__*/_interopDefaultLegacy($$1);

squelbase__namespace.useFlavour('postgres');

let debug = ((msg) => {
  try {
    var el = $("#text");
    var c = document.createElement("div");
    if (R__namespace.is(Array, msg))
      c.innerText = msg.map(R__namespace.invoker(0, "toString")).join(", ");
    else if (msg)
      c.innerText = msg.toString();
    c.className = "alert alert-warning";
    el.prepend(c);
  } catch (e) {
  }
  console.log(msg);
});


//
// @el: jQuery element
// @css: key-val object of css attributes to set
//
function setAndSaveCss(el, css) {
  R__namespace.forEach(([k,v]) => {
    el.attr(k, el.attr(k) || el.css(k));
  }, R__namespace.toPairs(css));
  el.css(css);
}

function restoreCss(el, cssAttrs) {
  cssAttrs.forEach((k) => {
    el.css(k, el.attr(k) || '');
    el.removeAttr(k);
  });
}


function descendantOfClass(n, klass) {
	while(n.parentNode) {
	  if ($(n).hasClass(klass)) return true;
	  n = n.parentNode;
	}
	return false;
  }

function bboxOverlap(b1, b2) {
  return !(
    b1.l + b1.w < b2.l ||
    b2.l + b2.w < b1.l ||
    b1.t + b1.h < b2.t ||
    b2.t + b2.h < b1.t
  )
}

let ContextMenu = (({containerid, app}) => {
  let me = () => {};
  me.type = "ContextMenu";
  me.app = app;
  me.dom = $(`#${containerid}`);
  me.state = null;
  me.binaryCM = BinaryContextMenu({cm:me});
  me.naryCM = NaryContextMenu({cm:me});
  me.liftCM = LiftMenu({cm:me});

  me.render = (opts) => {
    me.dom.empty();
    if (me.state == "binary") {
      me.dom.append(me.binaryCM.render(opts).dom);
    } else if (me.state == "nary") {
      me.dom.append(me.naryCM.render(opts).dom);
    } else if (me.state == "lift") {
      me.dom.append(me.liftCM.render(opts).dom);
    }
    return me;
  };

  me.close = () => {
    me.state = null;
    me.render();
  };

  // user pressed enter key
  // @key string of pressed key
  me.onHotKey = (key) => {
    if (!me.state) return;

    if (me.state == "binary") {
      if (key == "Enter") 
        me.binaryCM.onLabel(me.binaryCM.selected.label);
      else if (key == "u") 
        me.onBinaryOp({type:"union"});
      else if (key == "-" || key == "+") 
        me.binaryCM.onLabel(key);
    } else if (me.state == "nary") {
      if (key == "Enter")
        me.naryCM.onLabel(me.naryCM.selected.label);
      else if (key == "u") 
        me.onNaryOp({type:"union"});
    } else if (me.state == "lift") {
      if (key == "Enter")
        me.liftCM.onLabel(me.liftCM.selected.label);

    }
  };

  me.onBinaryOp = (op) => me.app.onBinaryOp(op);
  me.onNaryOp = (op) => me.app.onNaryOp(op);
  me.onLift = (op) => me.app.onLift(op);

  return me;
});

let MarkContainer$1 = ((marks, defaultMark) => {
  function me() {}
  me.type = "MarkContainer";
  me.marks = marks;   // list of mark names
  me.markEls = {};     // mark name -> jquery el
  me.chosen = null;   // the chosen mark to render
  me.dom = null;      // root jquery el

  me.render = () => {
    me.dom = $("<div class='mark-container'></div>");
    me.markEls = {};
    me.marks.forEach((mark) => {
      let el = $(`<input type='radio' name='mark' id='mark-${mark}' value='${mark}'/>`);
      let div = $("<div/>");
      div.append(el).append($(`<label for='mark-${mark}'>${mark}</label>`));
      div.on("click", () => me.choose(mark));
      me.dom.append(div);
      me.markEls[mark] = el;
      
      if (defaultMark == mark)
        el.click();
    });

    return me;
  };

  me.choose = (mark) => {
    if (me.markEls[mark]) ;
    me.chosen = mark;
    return me;
  };

  return me;
});



let BinaryContextMenu = (({cm}) => {
  const defaults = [
    {label: "+", f: (a1, a2) => `${a1} + coalesce(${a2}, 0)`},
    {label: "-", f: (a1, a2) => `${a1} - coalesce(${a2}, 0)`},
    {label: "min", f: (a1, a2) => `coalesce(least(${a1}, ${a2}), coalesce(${a1}, ${a2}))`},
    {label: "max", f: (a1, a2) => `coalesce(greatest(${a1}, ${a2}), coalesce(${a1}, ${a2}))`}
  ];
  let me = () => {};
  me.type = "BinaryContextMenu";
  me.cm = cm;
  me.dom = $("<div id='contextmenu-binary' class='contextmenu binary'></div>");
  me.selected = defaults[1];
  //me.markContainer = MarkContainer(['line', 'point', 'bar', 'table'])

  me.render = () => {
    me.dom.empty();
    me.dom.append($("<h3>Binary Stats</h3>"));
    defaults.forEach(({label, f}) => {
      let el = $(`<div class="btn btn-outline-primary operator">${label}</div>`);
      el.on("click", () => {
        $(".operator").addClass("btn-outline-primary").removeClass("btn-primary");
        el.removeClass("btn-outline-primary").addClass("btn-primary");
        me.onLabel(label);
      });
      if (me.selected.label == label)
        el.removeClass("btn-outline-primary").addClass("btn-primary");

      me.dom.append(el);
    });

    me.dom.append($("<h3>Union</h3>"));
    let el = $(`<div class="btn btn-outline-primary operator">Union</div>`);
    el.on("click", () => {
      me.cm.onBinaryOp({type:"union"});
    });
    me.dom.append(el);

    //me.dom.append("<h3 style='margin-top: 1em;'>Mark Type</h3>")
    //me.dom.append(me.markContainer.render().dom)

    return me;
  };

  me.onLabel = (label) => {
    defaults.forEach(({label: l, f} ) => {
      if (l == label) 
        me.cm.onBinaryOp({label, f, type: "stats"});
    });
  };

  return me;
});


let NaryContextMenu = (({cm}) => {
  const defaults = [
    {label: "avg", f: "avg" },
    {label: "count", f: "count"},
    {label: "min", f: "min"},
    {label: "max", f: "max" }
  ];
  let me = () => {};
  me.type = "NaryContextMenu";
  me.cm = cm;
  me.dom = $("<div id='contextmenu-nary' class='contextmenu nary'></div>");
  me.selected = defaults[0];

  me.render = () => {
    me.dom.empty();
    me.dom.append($("<h3>Nary Stats</h3>"));
    defaults.forEach(({label, f}) => {
      let el = $(`<div class="btn btn-outline-primary operator">${label}</div>`);
      el.on("click", () => {
        $(".operator").addClass("btn-outline-primary").removeClass("btn-primary");
        el.removeClass("btn-outline-primary").addClass("btn-primary");
        me.onLabel(label);
      });
      if (me.selected.label == label)
        el.removeClass("btn-outline-primary").addClass("btn-primary");

      me.dom.append(el);
    });

    me.dom.append($("<h3>Union</h3>"));
    let el = $(`<div class="btn btn-outline-primary operator">Union</div>`);
    el.on("click", () => {
      me.cm.onNaryOp({type:"union"});
    });
    me.dom.append(el);

    return me;
  };

  me.onLabel = (label) => {
    defaults.forEach(({label: l, f} ) => {
      if (l == label) 
        me.cm.onNaryOp({label, f, type: "stats"});
    });
  };



  return me;
});





let LiftMenu = (({cm}) => {
  const defaults = [
    {label: "linear"},
    {label: "logistic"},
    //{label: "poly", n: 3},
    {label: "glm"}
  ];
  let me = () => {};
  me.type = "LiftMenu";
  me.cm = cm;
  me.dom = $("<div id='contextmenu-lift' class='contextmenu lift'></div>");
  me.selected = defaults[0];

  me.Af = {};
  me.Ac = {};
  me.measure = null;

  me.render = ({v}) => {
    me.dom.empty();
    me.dom.append($("<h3>Lift</h3>"));
    defaults.forEach(({label, f}) => {
      let el = $(`<div class="btn btn-outline-primary operator">${label}</div>`);
      el.on("click", () => {
        $(".operator").addClass("btn-outline-primary").removeClass("btn-primary");
        el.removeClass("btn-outline-primary").addClass("btn-primary");
        me.onLabel(label);
      });
      if (me.selected.label == label)
        el.removeClass("btn-outline-primary").addClass("btn-primary");

      me.dom.append(el);
    });

    me.dom.append($("<h3>Attributes</h3>"));
    let table = $("<table class='table table-striped lift'></table>");
    me.dom.append(table);
    let tbody = $("<tbody></tbody>");
    tbody.append($("<tr><th>Feature</th><th>Condition</th><th></th></tr>"));
    table.append(tbody);
    console.group("liftmenu");
    v.q.schema().forEach((a) => {
      if (a.attr == v.mapping.measure) {
        me.measure = a;
        return;
      }
      tbody.append(me.renderAttribute(a, v));
      console.log(R.keys(me.Af));
    });
    console.groupEnd();

    return me;
  };

  // return <tr>
  me.renderAttribute = (a, v) => {
    let tr = $("<tr/>");
    let td1 = $("<td/>");
    let td2 = $("<td/>");
    let td3 = $("<td/>");
    let cb1 = $("<input class='af' type='checkbox'/>");
    let cb2 = $("<input class='ac' type='checkbox'/>");
    td1.append(cb1);
    td2.append(cb2);
    td3.append($(`<span>${a.attr}</span>`));

    cb1.on("click", (e) => {
      if (cb1[0].checked) {
        me.Af[a.attr] = a;
        delete me.Ac[a.attr];
        cb2[0].checked = false;
      } else {
        delete me.Af[a.attr];
      }
    });
    cb2.on("click", (e) => {
      if (cb2[0].checked) {
        me.Ac[a.attr] = a;
        delete me.Af[a.attr];
        cb1[0].checked = false;
      } else {
        delete me.Ac[a.attr];
      }
    });

    if (v.mapping['x'] == a.attr) 
      cb1.click();

    tr.append(td1);
    tr.append(td2);
    tr.append(td3);
    return tr;
  };

  me.onLabel = (label) => {
    defaults.forEach((op) => {
      if (op.label != label) return;
      op = R.clone(op);
      op.model = op.label;
      op.Af = R.values(me.Af);
      op.Ac = R.values(me.Ac);
      op.y = me.measure;
      me.cm.onLift(op);
    });
    me.Af = {};
    me.Ac = {};
    me.measure = null;

  };

  return me;
});

let VegaliteView = (({view, dom, mapping, opts}) => {
  let id = 0;
  let newAlias = (prefix="t") => `${prefix}${id++}`;

  let me = () => {};
  me.view = view;

  me.dom = dom;
  me.vlview = null;
  me.spec = null;
  me.data = [];
  me.selection = {};
  me.opts = opts || {};
  me.width = opts.width || 200;
  me.height = opts.height || 200;

  me.dataChanged = false;
  me.shouldRefresh = false;

  me.setData = (data) => {
    me.data = data;
    me.dataChanged = true;
  };

  me.init = () => {
  };

  me.render = () => {
    if (me.vlview && me.dataChanged) { // update
      let changeset = vega.changeset()
        .remove(()=>true)
        .insert(me.data);
      me.vlview.view.change('data', changeset).run();
      me.dataChanged = false;
    } 

    if (!me.vlview || me.shouldRefresh)  { // create
      me.spec = genSpec(me.data);
      console.log(me.spec);
      vegaEmbed(me.dom[0], me.spec, {renderer: "svg"})
        .then(vegaOnLoad);
      me.shouldRefresh = false;
    }
  };


  // XXX: if view is faceted, we can't figure out which facet the user 
  //      is selecting within!
  me.onNewView =  async (e) => {
    if (R__default['default'].keys(me.selection).length == 0) return;
    e.preventDefault();
    console.log("newviewbtn: ", me.selection);
    let predicates = [];
    R__default['default'].forEachObjIndexed((bound, dattr) => {
      let vattr = me.view.rmapping[dattr];
      let type = me.spec.encoding[vattr] && me.spec.encoding[vattr].type;

      if (type == "quantitative") { // min <= attr && attr < max
        predicates.push(vca.Expr({
          op: ">=", l: vca.Attr(dattr), r: vca.Value({value: bound[0]})
        }));
        predicates.push(vca.Expr({
          op: "<", l: vca.Attr(dattr), r: vca.Value({value: bound[1]})
        }));
      } else {  // attr IN (...)
        let args = bound.map((v) => vca.Value({value: v})).map((V) => V.toSql()).join(",");
        predicates.push(vca.Expr({
          op: "IN",
          l: vca.Attr(dattr),
          r: vca.Value({value: `(${args})`, raw: true})
        }));
      }
    }, me.selection);

    let newq = vca.Where({
      exprs: predicates,
      child: vca.Source({ source: me.view.q, alias: newAlias('newview')})
    });

    // TODO: drop non positional attrs that are unary
    let mapping = R__default['default'].clone(me.view.mapping);
    let exists = (attr) => me.view.mapping[attr];
    let attrs = R__default['default'].filter(exists, ["column", "color", "shape", "size"])
      .map((vattr) => vca.Attr(me.view.mapping[vattr]));
    let cards = await me.view.viewManager.app.VCA.getExprCardinalities(attrs, newq);
    R__default['default'].zip(attrs, cards).forEach(([dattr, card]) => {
      if (card == 0) 
        delete mapping[me.view.rmapping[attr]];
    });

    let v = View({
      q: newq,
      r: mapping,
      name: `${me.view.viewName}[${predicates.map((p) => p.toSql()).join(",")}]`,
      opts: {
        width: me.view.width,
        height: me.view.height
      }
    });
    await me.view.viewManager.addView(v);
  };


  function genSpec(data) {
    var spec = {
      width: me.width,
      height: me.height,
      autosize: {
        type: "fit",
        contains: "padding",
        resize: true
      },
      data: { name: "data", values: data },
      mark: me.view.mapping["mark"] || "bar", 
      axis: {
        titleFontSize: 30,
        labelFontSize: 30
      },
      encoding: {},
      params: []
    };
    let mapping = me.view.mapping;

    if (me.view.isCompositionMode()) {
      let selection = {
        name: "selection",
        select: {
          type: "interval",
          on:  "[mousedown[event.shiftKey], mouseup] > mousemove",
          translate: "[mousedown[event.shiftKey], mouseup] > mousemove!"
        }
      };

      if (mapping.y == mapping.measure && mapping.x) {
        selection.select.encodings = ["x"];
      } else if (mapping.x == mapping.measure && mapping.y) {
        selection.select.encodings = ["y"];
      } else if (!mapping.x || !mapping.y) {
        selection = null;
      }
      if (selection)
        spec.params.push(selection);
    }

    R__default['default'].forEach(([vattr, dattr]) => {
      if (vattr == "measure" || vattr == "mark") return;
      spec.encoding[vattr] = {
        axis: {
          title: dattr || vattr,
          titleFontSize: 18,
          labelFontSize: 14,
          titleFontWeight: "normal",
          labelOverlap: "parity"
        },
      };
      if (vattr == "color") {
        let type = (dattr == mapping.measure)? "quantitative" : "nominal";
        spec.encoding[vattr].field = dattr;
        spec.encoding[vattr].type = type;
      } else {
        spec.encoding[vattr].field = dattr;
        spec.encoding[vattr].type = getType(dattr, vattr, spec.mark);
      }
    }, R__default['default'].toPairs(mapping));


    if (mapping["column"]) {
      let n = R__default['default'].uniq(R__default['default'].pluck(mapping["column"], me.data)).length;
      spec.width = me.width - 100;
      if (n > 1) 
        spec.width = (spec.width / n) - 15;
      spec.height = (me.height - 120);
    }

    return spec;
  }

  function isNumber(v) {
    return !Number.isNaN(+v);
  }


  function getType(dataAttr, visAttr, mark) {
    if (visAttr == "x") {
      if (mark == "line" || mark == "point") {
        if (isNumber(me.data[0][dataAttr]))
          return "quantitative"
      }
      return "ordinal"
    }
    if (visAttr == "column") return "ordinal"
    if (visAttr == "color") {
      if (dataAttr == "qid") return "ordinal"
      if (isNumber(me.data[0][dataAttr])) return "quantitative"
      return "ordinal"
    }
    return "quantitative"
  }

  const vegaOnLoad = (p) => {
    p.view.preventDefault(false);
    me.vlview = p;
    if (!me.view.isCompositionMode()) return;

    const handler = me.view.viewManager.composeHandler;
    p.view.addEventListener("pointerdown", (e, i) => {
      if (e.shiftKey) return;
      if (!(i && i.datum)) return;
      if (i.datum[me.view.mapping.measure] === undefined) return;
      const thumb = $__default['default']("<svg><g></g></svg>");
      thumb.children(0).append($__default['default'](e.srcElement).clone());
      handler.onStart(e, datumToOperand(e,i), thumb);
      e.stopPropagation();
    });
    p.view.addEventListener("pointermove", (e, i) => {
      if (e.shiftKey) return;
      if (!(i && i.datum)) return;
      handler.onMove(e, datumToOperand(e,i));
      e.stopPropagation();
    });
    p.view.addEventListener("pointerup", (e, i) => {
      if (e.shiftKey) return;
      if (!(i && i.datum)) return;
      if (i.datum[me.view.mapping.measure] === undefined) return;
      handler.onDrop(e, datumToOperand(e,i));
      e.stopPropagation();
    });

    if (p.view._signals["selection"]) {
      p.view.addSignalListener("selection", (e, i) => {
        if (R__default['default'].keys(i).length == 0) {
          me.view.btn_newview.addClass("disabled");
          return; 
        }
        me.view.btn_newview.removeClass("disabled");
        me.selection = i;
      });
    }

    // Hack together handlers for legend!
    let qattrs = R__default['default'].pluck("attr", me.view.q.schema());

    let legends = me.dom.find(".mark-group.role-legend");
    legends.each((i,legend) => {
      $__default['default'](legend).find("*[pointer-events=none]").attr("pointer-events", "all");
      let titles = $__default['default'](legend).find(".role-legend-title");
      titles.each((j, title) => {
        let dattr = $__default['default'](title).text();
        let labels = $__default['default'](legend).find(".role-legend-label");
        labels.each((k, label) => {
          let val = +$__default['default'](label).text();
          if (Number.isNaN(val))
            val = $__default['default'](label).text();

          // TODO: drop the selected legend attribute from 
          //       query since we know its unary
          const q = vca.Project({
            exprs: R__default['default'].difference(qattrs, [dattr]).map(vca.PClause.fromAttr),
            child: vca.Where({
              exprs: vca.Expr({op: "=", l: vca.Attr(dattr), r: vca.Value({value: val})}),
              child: me.view.q })
          });
          const datum = {
            type: "Legend",
            data: View({
              q,
              r: R__default['default'].clone(me.view.mapping),
              name: `${dattr}=${val}`
            }),
            svg: $__default['default'](label.parentNode),
            view: me.view
          };
          label.parentNode.addEventListener("mousedown", (e,i) => {
            console.log("legend down",  dattr, val);
            const thumb = $__default['default']("<svg><g></g></svg>");
            thumb.children(0).append(datum.svg.clone());
            console.log(thumb);
            handler.onStart(e, datum, thumb);

            e.stopPropagation();
          });
          label.parentNode.addEventListener("mousemove", (e,i) => {
            handler.onMove(e, datum);
            e.stopPropagation();
          });
          label.parentNode.addEventListener("mouseup", (e,i) => {
            console.log("legend up",   dattr, val);
            handler.onDrop(e, datum);
            e.stopPropagation();
          });
        });
      });

    });


  };


  const datumToOperand = (e, i) => {
	return { 
	  type: "Mark",
	  data: datumToView(i),
	  svg: $__default['default'](e.srcElement),
	  view: me.view
	}
  };


  const datumToView = (i) => {
	if (!(i && i.datum)) return null;
    // turn datum into a 0-dimensional View object
    // that only contains the data attribute mapped to y
    const dattr = me.view.mapping.measure;
    const yval = i.datum[dattr];
    const pc = vca.PClause({ e: vca.Value({value: yval}), alias: dattr});
    const Fs = [pc];

    //const Fs = R.reject(R.isNil, 
	//  R.map(([k, v]) => {
	//	if (k == "Symbol(vega_id)" || k == "__proto__") return;
	//	return PClause({ e: Value({value: v}),  alias: k})
	//  }, R.toPairs(i.datum)))

    const q = vca.Project({exprs: Fs });
    return View({ 
      q, 
      r: R__default['default'].pick(["y", "measure"], me.view.mapping),
      name: yval,
      opts: R__default['default'].clone(me.view.opts)
    })

  };




  return me;

});

let TableView = (({dom, view, mapping, opts}) => {
  let me = () => {};
  me.view = view;

  me.dom = dom;
  me.data = [];
  me.mapping = mapping; 
  me.opts = opts || {};
  me.width = opts.width || 200;
  me.height = opts.height || 200;

  me.setData = (data) => me.data = data;

  me.init = () => {
  };

  me.render = () => {
    me.dom.empty();

    const table = $__default['default']("<table class='table table-striped disable-select tableview'>");
    const header = $__default['default']("<tr></tr>");
    const body = $__default['default']("<tbody></tbody>");
    table
      .append(header)
      .append(body);

    let tablehandle = $__default['default']("<th></th>");
    header.append(tablehandle);
    let keys = R__default['default'].keys(me.data[0]);
    keys.forEach((v) => {
      if (v == me.view.mapping.measure)
        header.append($__default['default'](`<th>${v} (measure)</th>`));
      else
        header.append($__default['default'](`<th>${v}</th>`));
    });

    me.data.forEach((row) => {
      let tr = $__default['default']("<tr></tr>");
      let rowhandle = $__default['default']("<td>&Xi;</td>");
      if (!me.view.isCompositionMode())
        rowhandle = $__default['default']("<td/>");
      tr.append(rowhandle);

      keys.forEach((key) => {
        let tdclass = (key == me.view.mapping.measure)? 'measure' : 'dimension';
        let cell = $__default['default'](`<td class='${tdclass}'>${row[key]}</td>`);
        tr.append(cell);
        if (me.view.isCompositionMode())
          addCellListeners(cell, key, row[key]);
      });

      if (me.view.isCompositionMode())
        addRowListeners(rowhandle, tr, row);
      body.append(tr);
    });


    me.dom.append(table);
    me.dom.css({
      overflow: "scroll",
      height: "85%"
    });
  };

  const addTableListeners = (el, data, thumb) => {
    el.addClass("enabled");


    const handler = me.view.viewManager.composeHandler;
    el[0].addEventListener("pointerdown", (e, i) => {
      handler.onStart(e, data, thumb);
    });
    el[0].addEventListener("pointermove", (e) => {
      handler.onMove(e, data);
    });
    el[0].addEventListener("pointerup", (e) => {
      handler.onDrop(e, data);
    });

  };


  const addCellListeners = (cell, attr, val) => {
    let q = null;
    let v = null;
    if (attr == me.view.mapping.measure) {
      q = vca.Project({
        exprs: [vca.PClause({ e: vca.Value({value: val}), alias: attr })]
      });
      v = View({q, r:{ y:attr, measure:attr }, name: val});
    } else {
      q = vca.Where({
        exprs: vca.Expr({ op: "=", l: vca.Attr(attr), r: vca.Value({value: val})}),
        child: me.view.q
      });
      v = View({q, r: me.view.mapping, name: `${attr}=${val}`});
    }

    const data = {
      type: "Mark",
      data: v,
      svg: cell,
      view: me.view
    };

    const thumb = $__default['default']("<div class='table-thumb'></div>");
    thumb.append($__default['default'](cell).clone());
    addTableListeners(cell, data, thumb);
  };

  const addRowListeners = (td, tr, row) => {
    const Fs = [];
    R__default['default'].forEachObjIndexed((dattr, vattr) => {
      if (row[dattr] !== undefined)
        Fs.push(vca.PClause({
          e: vca.Value({ value: row[dattr] }),
          alias: dattr
        }));
    }, me.mapping);
    const q = vca.Project({exprs: Fs});
    const v = View({q, r:R__default['default'].clone(me.mapping), name: row[me.view.mapping.measure]});
    const data = {
      type: "Mark",
      data: v,
      svg: td,
      view: me.view
    };
    const thumb = $__default['default']("<div class='table-thumb'></div>");
    const table = $__default['default']("<table></table>");
    thumb.append(table);
    table.append(tr.clone());
    addTableListeners(td, data, thumb);
  };

  return me;
});

let MapView = (({dom, view, opts}) => {

  let me = () => {};
  me.dom = dom;
  me.view = view;
  me.opts = opts || {};
  me.height = (me.opts.height)? `${me.opts.height}px` : "100%";
  me.style = () => {};
  me.statesData = null;
  me.map = null;

  me.mapping = R__default['default'].omit(['mark', 'measure'], me.view.mapping);
  me.mapping.state = me.mapping.state || 'state';
  me.mapping.count = me.mapping.count || 'count';

  me.setData = (data) => {
    let stateCounts = {};
    data.forEach((d) => {
      stateCounts[d[me.mapping.state]] = +d[me.mapping.count];
    });

    me.statesData.features.forEach((feat) => {
      if (stateCounts[feat.properties.name])
        feat.properties.count = stateCounts[feat.properties.name];
    });
    
    let counts = R__default['default'].values(stateCounts);
    let [minc, maxc] = [.1, .9];
    if (R__default['default'].any((c) => c<0, counts)) {
      minc = d3.min(counts);
      maxc = d3.max(counts);
      const absmax = Math.max(Math.abs(minc), Math.abs(maxc));
      minc = -absmax;
      maxc = absmax;
    }
    console.log("min, max", minc, maxc);
    
    let domain = R__default['default'].times((v) => (maxc-minc)/8.0 * v + minc, 8);
    let range = ["#b2182b","#d6604d","#f4a582","#fddbc7","#d1e5f0","#92c5de","#4393c3","#2166ac"];
    let color = d3.scaleLinear().domain(domain).range(range);

    me.style = (feature) => {
      let count = feature.properties.count;
      return {
          fillColor: color(count) || 'white',
          weight: 2,
          opacity: 1,
          color: 'white',
          dashArray: '3',
          fillOpacity: 0.7
      };
    };
  };

  me.init = () => {
    me.statesData = R__default['default'].clone(statesData);
    me.dom.css({
      width: `100%`,
      height: me.height
    });

  };

  // assumes statesData is a global variable...
  // assumes schema: (state, value)
  me.render = (data) => {
    if (!me.map) {
      me.map = L.map(me.dom[0]).setView([37.8, -96], 3);
    }

    me.map.eachLayer((layer) => layer.remove());

    //L.tileLayer('https://api.mapbox.com/styles/v1/{id}/tiles/{z}/{x}/{y}?access_token=' + accessToken, {
    //      id: 'mapbox/light-v9',
    //      tileSize: 512,
    //      zoomOffset: -1
    //}).addTo(me.map);
    L.geoJson(me.statesData).addTo(me.map);
    L.geoJson(me.statesData, {style: me.style}).addTo(me.map);
  };

  return me;
});

/*
 * q: query plan
 * r: { vis attr : data attr name, measure: data attr name }
 *    r MUST contain "measure" so we know which vis attribute
 *    is encoding the measure variable
 *
 * TODO: support axis labels and other configurations in r
 */
function View({q, r, id, name, opts}) {
  const visualVars = ["x", "y", "color", "size"];

  function me(){}  me.type = "View";
  me.dom = null;
  me.viewManager = null;
  me.data = null;
  me.q = q;
  me.mapping = r;
  me.id = id;
  me.viewName = name;
  me.opts = opts || {};
  me.width = me.opts.width || 500;
  me.height = me.opts.height || 350;
  me.viewType = me.opts.viewType; // null if base view, else composed

  me.subview = null;
  me.mappingEditMenu = null;
  me.explodeMenu = null;

  me.btn_newview = null;
  me.map = null;
 

  if (!me.mapping['measure']) {
    throw new Error("View: mapping must contain measure:", me.mapping)
  }

  me.setViewManager = (viewManager) => {
    me.viewManager = viewManager;
  };

  me.isCompositionMode = () => 
    (me.viewManager)? me.viewManager.app.isCompositionMode() : false;

  me.setCompositionMode = (mode) => {
    me.subview.shouldRefresh = true;
  };

  me.setMapping = (mapping) => {
    me.mapping = mapping;
    resolveMapping();
    me.vldiv.empty();

    // create the subviews
    let args = {
      dom: me.vldiv,
      view: me,
      mapping: me.mapping,
      opts: {
        width: me.width - 50,
        height: me.height - 50
      }
    };
    me.subview = getViewFromMark(me.mapping.mark)(args);
    me.subview.init();
    me.subview.setData(me.data);
  };

  const getViewFromMark = (mark) => {
    if (mark == "map") 
      return MapView
    else if (mark == "table")
      return TableView
    return VegaliteView
  };

  // If there are any unmapped data attributes, bind them
  // Then update the reverse visual mapping
  function resolveMapping() {
    // temporary 
    let rmapping = R__default['default'].invertObj(R__default['default'].omit(["measure"], me.mapping));
    let dattrs = R__default['default'].pluck("attr", me.q.schema())
      .filter((dattr) => !rmapping[dattr]);

    // first fill out exact mappings e.g., x->x
    dattrs.forEach((dattr) => {
      if (R__default['default'].contains(dattr, availVars())) 
        me.mapping[dattr] = dattr;
    });

    // then assign mappings to remaining data attrs
    dattrs.forEach((dattr) => {
      if (!me.mapping[dattr]) {
        let vattr = assignMapping(dattr);
        me.mapping[vattr] = dattr;
      }
    });

    me.rmapping = R__default['default'].invertObj(R__default['default'].omit(["measure"], me.mapping));
  }

  function availVars() {
    return visualVars.filter((v) => !me.mapping[v]);
  }

  function assignMapping(alias) {
    if (R__default['default'].contains(alias, availVars())) return alias;
    return availVars()[0];
  }

  me.init = () => {
    if (me.dom) return;
    const mark = me.mapping.mark;

    const dom = $__default['default'](`<div class="col"></div>`);
	const holder = $__default['default'](`<div class="holder"></div>`);
    const title = $__default['default'](`<div class="title ${me.viewType? "composed" : ""}">${me.viewName}</div>`);
    const rightmenu = $__default['default']("<span class='rightmenu'></span>");
    const newview = $__default['default'](`<span class='newview' data-toggle="tooltip" data-placement="top" title="Turn selection into a new view"></span>`).addClass("disabled");
    const explode = $__default['default'](`<span class='explode' data-toggle="tooltip" data-placement="top" title="Facet this view">&Xi;</span>`);
    const edit = $__default['default'](`<span class='edit' data-toggle="tooltip" data-placement="top" title="Edit visual mappings"></span>`);
    const lift = $__default['default'](`<span class='lift' data-toggle="tooltip" data-placement="top" title="Lift view into a model"></span>`);
    const close = $__default['default'](`<span class="close"  data-toggle="tooltip" data-placement="top" title="Remove this view"></span>`);
    const div = $__default['default'](`<div id="${me.id}"></div>`);

    const nonposVattrs = ["color", "size", "column", "shape"].filter((vattr) => 
      me.mapping[vattr] && me.mapping[vattr] != me.mapping.measure
    );
    
    title.append(rightmenu);
    rightmenu.append(close);
    rightmenu.append(edit);
    if (mark != "map") rightmenu.append(lift);
    if (nonposVattrs.length > 0) rightmenu.append(explode);
    rightmenu.append(newview);
    holder.append(title);
    holder.append(div);
	dom.append(holder);
    holder.css({
      width: me.width,
      height: me.height
    });

    me.title = title;
    me.vldiv = div;    // div that vegalite will render into
	me.holder = holder;
    me.dom = dom;
    me.btn_newview = newview;
    registerViewHandlers();

    // create the subviews
    let args = {
      dom: me.vldiv,
      view: me,
      mapping: me.mapping,
      opts: {
        width: me.width - 50,
        height: me.height - 50
      }
    };
    me.subview = getViewFromMark(mark)(args);
    me.subview.init();


    newview.tooltip();
    explode.tooltip();
    edit.tooltip();
    lift.tooltip();
    close.tooltip();



    close.on("click", (e) => { 
      if (me.viewManager) {
        e.stopPropagation();
        me.viewManager.onRemoveHandler(me);
      }
    }); 

    edit.on("click", (e) => {
      e.stopPropagation();
      $__default['default']("#editmenu-container").append(me.mappingEditMenu.render().dom);
    });
    
    if (mark != "map")
      lift.on("click", (e) => {
        if (me.viewManager) {
          me.viewManager.app.onLiftView(me);
          e.preventDefault();
        }
      });

    explode.on("click", (e) => {
      $__default['default']("#explodemenu-container").append(me.explodeMenu.render().dom);
    });

    if (me.subview.onNewView)
      newview.on("click", me.subview.onNewView);

    me.explodeMenu = ExplodeMenu({v:me, vattrs:nonposVattrs}).init();
    me.mappingEditMenu = MappingEditMenu({v:me}).init();
  };

  me.updateQuery = (q) => {
    me.data = null;
    me.q = q;
  };


  // a view is responsible for 
  // * updating its visual state throughout an interaction
  //   its states can be unselected, selected, hovered
  // * providing a View object to represent an operand
  // The actual interaction logic is managed by the viewmanager in views.js
  me.interactionState = null;

  const registerViewHandlers = () => {
    const handler = me.viewManager.composeHandler;
    me.holder[0].addEventListener("pointerup", (e) => {
      if (descendantOfClass(e.target, "role-legend")) return;
	  handler.onDrop(e, {type: "View", data: me, view: me});
    });
	me.dom[0].addEventListener("pointerup", (e) => {
      if (descendantOfClass(e.target, "role-legend")) return;
	  if (me.dom[0] != e.target) return;
	  handler.onDrop(e, null);
	});
	me.dom[0].addEventListener("pointermove", (e) => {
	  if (me.dom[0] != e.target) return;
	  me.viewManager.onMoveViews(e);
	});
	me.holder[0].addEventListener("pointermove", (e) => {
	  handler.onMove(e, { type: "View", data: me, view: me });
	});
    me.title[0].addEventListener("pointerdown", (e) => {
	  if (descendantOfClass(e.target, "close")) return;
      if (e.button != 0) return;
	  handler.onStart(e, { type: "View", data: View({
        q: me.q.clone(),
        r: R__default['default'].clone(me.mapping),
        name: me.viewName
      }), view: me }, me.vldiv.clone());
    });
  };

  me.render = async () => {
    if (!me.data) {
      me.data = await vca.runQuery(me.viewManager.app.db, me.q.toSql().toString());
      me.subview.setData(me.data);
    }
    me.subview.render(me.data);
    me.title.text(me.viewName);
    return me;
  };

  resolveMapping();
  return me;
}


let ExplodeMenu = (({v, vattrs}) => {
  let me = () => {};
  me.dom = $__default['default']("<div></div>");
  me.view = v;
  me.vattrs = vattrs;
  me.chosen = null;

  me.init = () => {
    return me;
  };

  me.clear = () => {
    me.dom.empty();
    me.chosen = null;
    me.dom[0].remove();
    return me;
  };

  me.render = () => {
    me.dom.empty();
    me.dom.append($__default['default']("<h3>Choose Attr to Explode</h3>"));

    me.inputs = {};
    me.vattrs.map((vattr) => {
      let dattr = me.view.mapping[vattr];
      let el = $__default['default']("<div/>");
      let input = $__default['default'](`<input type='radio' id='r-${dattr}' name='explodemenu'/>`);
      let label = $__default['default'](`<label for='r-${dattr}' style='margin-left: 1em;'>${dattr}</label>`);
      el.append(input).append(label);
      me.dom.append(el);

      input.on("input", () => {
        me.chosen = dattr;
      });
      return input;
    });

    let btn = $__default['default']("<button>Explode</button>");
    btn.on("click", async () => {
      if (!me.chosen) return;
      let views = await me.view.viewManager.facetView(me.view, me.chosen);
      // TODO: drop the exploded attribute
      // find nearest project or groupby
      // remove facet attr from it
      await me.view.viewManager.addViews(views);
      me.clear();
    });
    me.dom.append(btn);

    return me;
  };
  return me;
});
 

let MappingEditMenu = (({v}) => {
  let me = () => {};
  me.dom = $__default['default']("<div></div>");
  me.mc = null;

  me.init = () => {
    let marks = ["line", "bar", "point", "table"];
    let dattrs = R__default['default'].pluck("attr", v.q.schema());
    if (R__default['default'].all((dattr) => R__default['default'].contains(dattr, ["state", "count"]), dattrs))
      marks.push("map");
    console.log(v.mapping.mark);
    me.mc = MarkContainer$1(marks, v.mapping.mark);
    return me;
  };

  me.clear = () => {
    me.dom.empty();
    me.dom[0].remove();
  };

  me.render = () => {
    me.dom.empty();
    let vattrs = ['x', 'y', 'color', 'shape', 'column', 'size' ]; 
    let selects = {};

    me.dom.append($__default['default']("<h3>Marks</h3>"));
    me.dom.append(me.mc.render().dom);

    me.dom.append($__default['default']("<h3>Visual Mappings</h3>"));
    for (let A of v.q.schema()) {
      let dattr = A.attr;
      let el = $__default['default']("<div class='row'/>");
      let label = $__default['default'](`<div style='display: inline; text-align: right; width: 15em;'>${dattr}</div>`);
      let select = $__default['default']("<select/>");
      for (let vattr of vattrs) {
        let option = $__default['default'](`<option value='${vattr}'>${vattr}</option>`);
        select.append(option);
      }
      console.log(v.rmapping[dattr]);
      select.val(v.rmapping[dattr]);
      el
        .append($__default['default']("<div class='col-md-4'/>").append(label))
        .append($__default['default']("<div class='col-md-8'/>").append(select));
      me.dom.append(el);
      selects[dattr] = select;
    }

    let btn = $__default['default']("<button style='margin-top: 1em'>Update Mapping</button>");
    btn.on("click", () => {
      let mapping = {
        mark: me.mc.chosen,
        measure: v.mapping.measure
      };
      for (let [dattr, select] of R__default['default'].toPairs(selects)) {
        let vattr = select.val();
        if (mapping[vattr]) {
          debug(`${vattr} already mapped to ${mapping[vattr]}`);
          return
        }
        mapping[vattr] = dattr;
      }
      console.log(mapping);
      v.setMapping(mapping);
      v.render();
      me.clear();
    });
    me.dom.append(btn);

    return me;
  };
  return me
});

//
// For dragging from data shelf to encoding shelf
//
let ViewCreateHandler = (() => {
  let tableAttrData = null;  // { table, attr, type }
  let body = document.body;
  let dragImage = $(`<div class="drag-image-container button btn-light"></div>`);
  body.appendChild(dragImage[0]);

  let me = (e, type, data) => {
    if (!data || (data.type != "DataShelf" && data.type != "DropZone")) 
      return;
    if (type == "start")
      start(e, type, data);
    else if (type == "drop")
      drop(e, type, data);
    else if (type == "dragover")
      over(e, type, data);
    else if (type == "enter")
      enter(e, type, data);
    else if (type == "leave")
      leave(e, type, data);
    else if (type == "end")
      end(e);
  };

  function start(e, type, data) {
    dragImage.text(data.attr);
    e.dataTransfer.setDragImage(dragImage[0], 100, 0);
    tableAttrData = data;
    $(".encshelf-drop").addClass("dragstart");
  }
  function end(e) {
    e.preventDefault();
    $(".encshelf-drop").removeClass("dragover");
    $(".encshelf-drop").removeClass("dragstart");
    tableAttrData = null;
  }
  function drop(e, type, shelf) {
    if (!tableAttrData) return;
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
    shelf.addDataAttr(tableAttrData);
    $(".encshelf-drop").removeClass("dragover");
    $(".encshelf-drop").removeClass("dragstart");
  }
  function over(e, type, shelf) {
    e.preventDefault();
    if (shelf.dataAttr) return;
    $(".encshelf-drop").removeClass("dragover");
    $(shelf.dropzoneEl).addClass("dragover");
  }
  function enter(e, type, shelf) {
    e.preventDefault();
    if (shelf.dataAttr) return
    shelf.dropzoneEl.addClass("dragover");
  }
  function leave(e, type, shelf) {
    e.preventDefault();
    shelf.dropzoneEl.removeClass("dragover");
  }

  return me;
});



//
// For VCA interactions
//
let ComposeHandler = ((viewManager) => {
  const me = () => {};
  me.viewManager = viewManager;
  me.app = viewManager.app;
  me.srcOperand = null;
  me.thumbDiv = null;

  const updateThumbPosition = (e) => {
	if (!me.thumbDiv) return;
	me.thumbDiv.css({
	  left: `${e.pageX + 30}px`,
	  top: `${e.pageY + 30}px`
	});
  };


  me.onStart = (e, src, thumb) => {
	if (!me.viewManager.app.isCompositionMode()) return;
	if (!src) return;

	console.info("Iact.onStart src", src);
	me.srcOperand = src;
	me.viewManager.selectionHandler.reset();
	if (src.type == "Viewset")
	  me.viewManager.selectViews(null, true);
	else
	  me.viewManager.selectViews(null);


	// update visuals
	if (src.type == "View") {
	  src.view.holder.addClass("anchor");
	  me.viewManager.dom[0].setPointerCapture(e.pointerId);
	} else if (src.type == "Mark") {
	  setAndSaveCss(src.svg, { stroke: "red" });
	} else if (src.type == "Viewset") {
	  src.dom.addClass("anchor");
	} else if (src.type == "Legend") {
      setAndSaveCss(src.svg, { stroke: "red"});
    }
	
	if (thumb) {
      if (me.thumbDiv)
    	  me.thumbDiv[0].remove();
	  me.thumbDiv = $("<div id='thumb'></div>");
	  $("html").append(me.thumbDiv);
	  me.thumbDiv.append(thumb);
	  updateThumbPosition(e);
	}
  };

  me._prevOnMoveData = null;
  me.onMove = (e, data) => {
	if (!me.viewManager.app.isCompositionMode()) return;
	if (!me.srcOperand) return;
	$(".holder").removeClass("dragover");
	$("#newviewdrop").removeClass("dragover");
	updateThumbPosition(e);

	if (me._prevOnMoveData &&
	    !(data && data.svg[0] == me.srcOperand.svg[0]
          && R.contains(data.type, ["Mark" , "Legend"]))) {
	  restoreCss(me._prevOnMoveData.svg, ["stroke"]);
	}

	if (!data) return;
	if (data.type == "Mark") {
	  if (me.srcOperand.type == "Mark" && data.data) {
		setAndSaveCss(data.svg, { stroke: "red" });
		if (data.svg[0] != me.srcOperand.svg[0]) 
		  me._prevOnMoveData = data;
		else
		  me._prevOnMoveData = null;
	  } else if (me.srcOperand.type == "View") {
		// treat mark as a view instead
		me._prevOnMoveData = null;
		if (me.srcOperand.view != data.view) {
		  data.view.holder.addClass("dragover");
		}
	  }
	} else if (data.type == "View") {
	  if (me.srcOperand.type == "Mark") {
		if (me.srcOperand.view != data.view) {
		  data.view.holder.addClass("dragover");
		}
	  } else if (me.srcOperand.type == "View") {
		if (me.srcOperand.view != data.view) {
		  data.view.holder.addClass("dragover");
		}
	  }  else if (me.srcOperand.type == "Viewset") {
		data.view.holder.addClass("dragover");
	  }
	} else if (data.type == "Create") {
      $("#newviewdrop").addClass("dragover");
    } else if (data.type == "Legend") {
      if (me.srcOperand.type == "Legend" && data.data) {
        setAndSaveCss(data.svg, { stroke: "red" });
        if (data.svg[0] != me.srcOperand.svg[0])
          me._prevOnMoveData = data;
        else
          me._prevOnMoveData = null;
      } else if (me.srcOperand.type == "View") {
        me._prevOnMoveData = null;
        if (me.srcOperand.view != data.view) {
          data.view.holder.addClass("dragover");
        }
      }
    }

	e.stopPropagation();
  };


  // only views can be targets currently
  // @tgt: { type: "View", "Mark", or "Create", 
  //         data: View or null }
  //        type="Create" turns srcOperand into a new View
  //        the src Operand cannot be a viewset
  me.onDrop = (e, tgt) => {
	if (!me.viewManager.app.isCompositionMode()) return;
	if (!me.srcOperand) return;

	// reset visuals
	console.info("Iact.onDrop target", tgt, "src", me.srcOperand);
	$(".holder").removeClass("dragover").removeClass("anchor");
	$("#newviewdrop").removeClass("dragover");
	$("#viewsetdrop").removeClass("anchor");
	if (R.contains(me.srcOperand.type, ["Mark", "Legend"])) {
	  restoreCss(me.srcOperand.svg, ["stroke"]);
	} 
	if (me._prevOnMoveData) {
	  restoreCss(me._prevOnMoveData.svg, ["stroke"]);
	  me._prevOnMoveData = null;
	}
	if (me.thumbDiv) {
	  me.thumbDiv[0].remove();
	  me.thumbDiv = null;
	}

    try {
      me.viewManager.dom[0].releasePointerCapture(e.pointerId);
    } catch (e) {}
	if (tgt) {
	  if (tgt.type == "View") {
		if (me.srcOperand.type == "View" && me.srcOperand.data != tgt.data) {
		  me.app.onComposeView(tgt.data, me.srcOperand.data);
		} else if (me.srcOperand.type == "Mark") {
		  me.app.onComposeView(tgt.data, me.srcOperand.data);
		} else if (me.srcOperand.type == "Viewset") {
		  me.app.onComposeView(tgt.data, me.srcOperand.data);
		} else if (me.srcOperand.type == "Legend") {
		  me.app.onComposeView(tgt.data, me.srcOperand.data);
        }
	  } else if (tgt.type == "Mark") {
		if (me.srcOperand.type == "Mark" && me.srcOperand.svg[0] != tgt.svg[0]) {
		  me.app.onComposeView(tgt.data, me.srcOperand.data);
		} else if (me.srcOperand.type == "View") {
		  // treat target as a view instead
		  console.info("Iact.onDrop: mark target -> View", me.srcOperand.view.id, tgt.view.id);
		  if (me.srcOperand.view != tgt.view) {
			me.app.onComposeView(tgt.view, me.srcOperand.view);
		  }
		} else if (me.srcOperand.type == "Viewset") {
		  me.app.onComposeView(tgt.view, me.srcOperand.data);
		}
	  } else if (tgt.type == "Viewset") {
		// src better not be viewset!
		me.app.onComposeView(tgt.data, me.srcOperand.data);
	  } else if (tgt.type == "Create") {
        console.group("Iact.onDrop Create new view");
        console.log(me.srcOperand.data.q.toSql().toString());
        console.groupEnd();
        me.app.onCreateView(me.srcOperand.data);
	  } else if (tgt.type == "Legend") {
        me.app.onComposeView(tgt.data, me.srcOperand.data);
      }
	}

	e.stopPropagation();
	me.srcOperand = null;
  };

  return me;
});




let SelectionHandler = (function selectionHandler({boxid, viewManager}){
  let start = null;
  let end = null;

  function me() { }
  me.type = "selectionHandler";
  me.dom = $(`#${boxid}`);
  me.onStartHandler = () => {};
  me.isDisabled = false;
  me.onStart = (cb) => {
	if (cb) me.onStartHandler = cb;
  };
  me.disable = () => {
    me.isDisabled = true;
    me.reset();
	viewManager.selectViews(null);
  };
  me.enable = () => {
    me.isDisabled = false;
  };


  me.onDown = (e) => { 
    if (me.isDisabled) return;
    if (descendantOfClass(e.target, "holder")){
      start = null;
      viewManager.dom[0].releasePointerCapture(e.pointerId);
      return;
    }
	me.onStartHandler(me);
    start = end = { x: e.pageX, y: e.pageY };
    viewManager.dom[0].setPointerCapture(e.pointerId);
  };
  me.onMove = (e) => { 
    if (me.isDisabled) return;
    if (!start) return;
    if (e.buttons != 1) {
      start = null;
      return;
    }
    end = { x: e.pageX, y: e.pageY };
    me.render();
  };

  me.onUp = (e) => { 
    if (me.isDisabled) return;
    if (!start) {
	  end = null;
	  me.render();
	  return;
	}
    end = { x: e.pageX, y: e.pageY };
    if (end.x == start.x && end.y == start.y) {
      start = end = null;
      me.render();
    } else {
      me.render();
      // rendering before setting start to null makes sure we preserve
      // the selection box
      start = null;
    }
    viewManager.dom[0].releasePointerCapture(e.pointerId);
  };

  me.getBBox = () => {
    return {
      l: Math.min(start.x, end.x), // left
      t: Math.min(start.y, end.y), // top
      w: Math.abs(start.x - end.x),
      h: Math.abs(start.y - end.y)
    }
  };

  me.render = () => {
    if (!start || !end) {
      me.reset();
	  viewManager.selectViews(null);
      return;
    }
    let bbox = me.getBBox();
	let viewOffset = $("#views").offset();
	bbox.l -= viewOffset.left;
	bbox.t -= viewOffset.top;
    let css = {
      display: "block",
      left: `${bbox.l}px`,
      top: `${bbox.t}px`,
      width: `${bbox.w}px`,
      height: `${bbox.h}px`
    };
    me.dom.css(css);

    viewManager.selectViews(bbox);
  };

  me.reset = () => {
	start = end = null;
    me.dom.css({ display: "none" });
  };

  return me;
});



let ViewSetDropzone = ((viewManager) => {
  let me = () => {};
  me.viewManager = viewManager;
  me.dom = $("#viewsetdrop");
  me.views = [];

  me.setViews = (views) => {
	me.views = views || [];
	me.render();
  };

  me.render = () => {
	me.dom.empty();

	me.views.forEach((view) => {
	  let el = $(`<div>${view.viewName}</div>`);
	  me.dom.append(el);
	});

	return me;
  };

  const handler = me.viewManager.composeHandler;
  me.dom[0].addEventListener("pointerdown", (e) => {
	if (!me.views || !me.views.length) return
	handler.onStart(e, {
	  type: "Viewset",
	  data: me.views,
	  dom: me.dom
	}, me.dom.clone());
  });

  me.dom[0].addEventListener("pointerup", (e) => {
	handler.onDrop(e, {
	  type: "Viewset",
	  data: me.views,
	  dom: me.dom
	});
  });

  me.dom[0].addEventListener("pointermove", (e) => {
	handler.onMove(e, {
	  type: "Viewset",
	  data: me.views,
	  dom: me.dom
	});
  });


  return me;
});

let NewViewDropzone = ((viewManager) => {
  let me = () => {};
  me.viewManager = viewManager;
  me.dom = $("#newviewdrop");
  me.view = null;


  const handler = me.viewManager.composeHandler;
  me.dom[0].addEventListener("pointerup", (e) => {
	handler.onDrop(e, {
	  type: "Create",
	  dom: me.dom
	});
  });

  me.dom[0].addEventListener("pointermove", (e) => {
	handler.onMove(e, {
	  type: "Create",
	  dom: me.dom
	});
  });



  return me;
});

let DropZone = (({attr, app}) => {
  function me() {}
  me.dom = null;    // root dom element
  me.type = "DropZone";
  me.dropzoneEl = null;
  me.helpTextEl = null;
  me.chosenAttrEl = null;
  me.attr = attr;
  me.dataInfo = null;  // {table, attr, type}

  me.addDataAttr = (dataInfo) => {
    me.dataInfo = dataInfo;
    me.dropzoneEl.removeClass("dragover");
    me.dropzoneEl.addClass("filled");
    me.chosenAttrEl.text(dataInfo.attr);
  };

  me.removeDataAttr = () => {
    me.dataInfo = null;
    me.dropzoneEl.removeClass("filled");
    me.chosenAttrEl.text("");
  };

  me.render = () => {
    let base = $__default['default'](`<div class='encshelf-base'></div>`);
    let dropzone = $__default['default'](`<div class="encshelf-drop btn btn-outline-secondary">
      </div>`);
    dropzone.attr("id", `encshelf-axis-${attr}`);
    dropzone.data("attr", attr);
    base[0].addEventListener("drop", (e) => app.viewCreateHandler(e, "drop", me));
    base[0].addEventListener("dragover", (e) => app.viewCreateHandler(e, "dragover", me));
    //base[0].addEventListener("dragenter", (e) => app.viewCreateHandler(e, "enter", me))
    //base[0].addEventListener("dragleave", (e) => app.viewCreateHandler(e, "leave", me))

    let helpText = $__default['default']("<div class='help'>Drop field here</div>");
    let chosenAttr = $__default['default']("<div class='chosenattr'></div>");
    let chosenRemove = $__default['default']("<span class='remove'>X</span>");
    chosenRemove.on("click", () => { me.removeDataAttr(); });
    dropzone.append(helpText);
    dropzone.append(chosenAttr);
    dropzone.append(chosenRemove);


    base.append($__default['default'](`<div class="encshelf-label">${attr}</div>`));
    base.append(dropzone);

    me.dom = base;
    me.dropzoneEl = dropzone;
    me.helpTextEl = helpText;
    me.chosenAttrEl = chosenAttr;
    return me;
  };

  me.render();
  return me;
});

let MarkContainer = ((marks) => {
  function me() {}
  me.type = "MarkContainer";
  me.marks = marks;   // list of mark names
  me.markEls = {};     // mark name -> jquery el
  me.chosen = null;   // the chosen mark to render
  me.dom = null;      // root jquery el

  me.render = () => {
    me.dom = $__default['default']("<div></div>");
    me.markEls = {};
    me.marks.forEach((mark) => {
      let el = $__default['default'](`<span class="encshelf-mark btn ">${mark}</span>`);
      if (mark == me.chosen) 
        el.addClass("btn-primary");
      else
        el.addClass("btn-outline-primary");

      el.on("click", () => me.choose(mark));
      me.dom.append(el);
      me.markEls[mark] = el;
    });
    return me;
  };

  me.choose = (mark) => {
    if (me.markEls[mark]) {
      $__default['default'](".encshelf-mark").removeClass("btn-primary");
      $__default['default'](".encshelf-mark").addClass("btn-outline-primary");
      me.markEls[mark].removeClass("btn-outline-primary");
      me.markEls[mark].addClass("btn-primary");
    }
    me.chosen = mark;
    return me;
  };

  return me;
});

/*
 * @visualAttrs: list of visual attribute names
 */
let EncodingShelf = (({visualAttrs, app}) => {
  function me() {}
  me.app = app;
  me.type = "EncodingShelf";
  me.dom = $__default['default']("#encoding-shelf-container");
  me.markContainer = MarkContainer(["point", "bar", "line", "table"]);
  me.markContainer.choose("bar");
  me.visualAttrs = visualAttrs;
  me.dropZones = {};        // visual attr -> dropzone object
  me.nameInput = null;     // text box to input new view's name 
  me.createViewHandler = null;

  me.setVisualAttributes = (visualAttrs) => {
    me.visualAttrs = visualAttrs;
    me.render();
    return me;
  };



  me.render = () => {
    me.dom.empty();

    let markDom = $__default['default'](`<div id="mark-container">
       <h4>Mark</h4>
     </div>`);
    me.markContainer.render();
    markDom.append(me.markContainer.dom);
    me.dom.append(markDom);

    let shelfDom = $__default['default'](`<div id="shelf-container" >
        <h4>Axes</h4>
      </div>`);
    me.dropZones = {}; // visual attr -> dropzone object
    me.visualAttrs.forEach((attr) => {
      let dz = DropZone({attr, app});
      shelfDom.append(dz.dom);
      me.dropZones[attr] = dz;
    });
    me.dom.append(shelfDom);


    let nameDom = $__default['default'](`<div id="name-container" >
        <h4>View Name</h4>
      </div>`);
    me.nameInput = $__default['default'](`<input type="text" placeholder="new view's name"></input>`);
    nameDom.append(me.nameInput);
    me.dom.append(nameDom);

    let createBtn = $__default['default'](`
    <button id="createview-submit" class="createview-submit btn btn-primary">
        Create View
      </button>
      `);
    let createView = $__default['default'](`<div class="col col-md-12"> <h3> </h3> </div>`);
    createView.append(createBtn);
    me.dom.append(createView);

    createBtn.on("click", me.onCreateView);
    return me;
  };


  // return {
  //    table: tablename,
  //    mapping: { visual attribute name : Expr or Attr objcet }
  // }
  me.getMapping = () => {
    var mapping = { };
    
    let tables = {};
    me.visualAttrs.forEach((vattr) => {
      let dz = me.dropZones[vattr];
      if (!dz || !dz.dataInfo) return;
      let {table, attr, datatype} = dz.dataInfo;
      let visattr = dz.attr;

      mapping[visattr] = vca.Attr({table, attr});
      tables[table] = table;
    });

    // TODO; assuming the "y" visual atribute is the measure
    mapping.measure = mapping['y'];

    if (R.pipe(R.keys, R.length)(tables) > 1) {
      console.error(`Too many tables in mapping ${R.keys(tables)}`);
      return null;
    }
    const table = R.keys(tables)[0];

    return { 
      table,
      mapping
    };
  };



  me.getViewName = () => {
    let name = me.nameInput.val().trim();
    return R.isNil(name)? "V" : name;
  };

  // TODO: construct actual query object rather than query strings
  me.onCreateView = () => {
    const {table, mapping} = me.getMapping();
    me.getViewName();

    me.app.viewManager.createViews(
      table, mapping, me.markContainer.chosen, me.getViewName());
  };

  return me;
});

let SQLInput = ((db, cb) => {
  function me() {}
  me.dom = $__default['default'](`#sql-container`);
  me.textarea = null;
  me.db = db;

  me.render = () => {
    me.dom.empty();
    me.textarea = $__default['default'](`<textarea class="sql-input"></textarea>`);
    me.btn = $__default['default'](`<button class="btn btn-primary">Create Table</button>`);
    me.btn.on("click", handleClick);
    me.dom.append($__default['default'](`<h4>Custom SQL</h4>`));
    me.dom.append(me.textarea);
    me.dom.append(me.btn);
    return me;
  };

  function handleClick() {
    if (!me.textarea) return;
    if (!cb) return;
    cb(me.textarea.val());
  }

  return me;
});


let DataShelf = (function DataShelf({app}){
  function me() {}
  me.type = "DataShelf";
  me.app = app;
  me.db = null;
  me.containerid = null;
  me.dom = null;
  me.sqlInput = null;
  me.queries = [];   // list of all the submitted queries
  me.schemas = [];   // list of all the schemas from submitted queries


  me.init = async (db, containerid) => {
    me.db = db;
    me.containerid = containerid;
    me.dom = $__default['default'](`#${containerid}`);
    me.schemas = await vca.getSchemas(db);
    me.sqlInput = SQLInput(db, handleSqlSubmit);

    document.addEventListener("dragend", (e) => app.viewCreateHandler(e, "end"));
    return me;
  };

  let handleSqlSubmit = async (q) => {
    const qid = `Q${me.queries.length}`;
    await vca.createSQLView(db, q, qid);
    const schema = await vca.getSchema(db, qid);

    me.schemas.push(schema);
    me.queries.push(q);
    renderTable([qid, schema]);
  };

  // render in interface
  me.render = () => {
    me.dom.empty();
    me.schemas.forEach((o) => renderTable(o));

    if (me.sqlInput)
      $__default['default']("#sql-container").append(me.sqlInput.render().dom);
    return me;
  };

  let toTriplets = (tbl_name, schema) => {
    return R.reject(({attr}) => R.isEmpty(attr),
      R.map(([attr, type]) =>  {
        return { table: tbl_name, attr, datatype: type } 
      }, R.toPairs(schema)))
  };

  function renderTriplet({table, attr, datatype}) {
    let col = $__default['default'](`<li class='button btn-light'>
      ${attr} 
      <span class='badge'>${datatype}</span>
    </li>`);
    col.attr("draggable", true);
    return col;
  }

  function renderTable([tbl_name, schema]) {
    const title = $__default['default'](`<h4>${tbl_name}</h4>`);
    const ul = $__default['default']("<ul class='schema'></ul>");
    const triplets = toTriplets(tbl_name, schema);

    triplets.forEach((data) => {
      let col = renderTriplet(data);
      col[0].addEventListener("dragstart", (e) =>  {
        data.type = "DataShelf";
        app.viewCreateHandler(e, "start", data);
      });
      ul.append(col);
    });

    me.dom.append(title);
    me.dom.append(ul);
  }

  return me;

});

function Views({app}) {
  const db = app.db;
  const containerid = app.containerid;
  const viewsDomEl = $__default['default']("#views");
  let viewid = 0;

  function me() {}
  me.app = app;
  me.dom = $__default['default'](`#${containerid}`);
  me.views = [];
  me.selectedViews = [];
  me.composeHandler = ComposeHandler(me);
  me.selectionHandler = SelectionHandler({ boxid: "selbox", viewManager: me });
  me.viewsetDropzone = ViewSetDropzone(me);
  me.newViewDropzone = NewViewDropzone(me);

  me.newViewId = (prefix="V") => `${prefix}${viewid++}`;

  me.render = () => {
    me.views.forEach(async (v) => {
      // need to add v.dom to DOM before vega-lite can render a chart
      //me.dom.append(v.dom);
      await v.render(db);
    });
    return me;
  };

  me.enable = () => {
    $__default['default'](".table-handle").addClass("enabled");
    me.selectionHandler.enable();
    me.views.forEach(async (v) => {
      v.setCompositionMode(true);
    });
    me.render();
  };

  me.disable = () => {
    $__default['default'](".table-handle").removeClass("enabled");
    me.selectionHandler.disable();
    me.views.forEach((v) => {
      v.setCompositionMode(false);
    });
    me.render();
  };


  /*
  * given the mapping defined by user interactions, construct 
  * the Query object.  Make some "sensible" decisions about how
  * to construct the query
  *
  * @table: String base table/view name
  * @mapping: { vis attr: Attr object }
  *
  * @return: Query plan
  */
  function toQuery(table, mapping) {
    const gbattrs = R__namespace.values(R__namespace.pick(["x", "color", "shape"], mapping));
    let Agb = gbattrs.map((attr) => vca.PClause({e:attr, alias: attr.attr }));
    let y = null;
    if (mapping.y){
      y = vca.PClause({e:vca.Func({fname:"avg", args:[mapping.y]}), alias: mapping.y.attr});
    } else {
      y = vca.PClause({e:vca.VCA.parse("count(1)"), alias: "count"});
    }
    mapping.measure = y.alias;


    return vca.GroupBy({ 
      Agb, 
      Fs: [y], 
      child: vca.Source({ source: table })
    })

  }


  // Creates new View objects given output of encoding shelf
  //
  // @table: String base table/view name
  // @mapping: { vis attr: Attr object }
  // @mark: String mark type
  // @name: optional view name
  //
  // @return: Array of View objects.  
  me.createViews = async (table, mapping, mark, name) => {
    const Q = toQuery(table, mapping);
    const r = R__namespace.map((attr) => { return attr.attr }, mapping);
    r.mark = mark;
    r.measure = Q.Fs[0].alias;

    let V = View({ q: Q, r, name });
    if (mapping.facet) {
      delete V.mapping.facet;
      let Vs = me.facetView(V, mapping.facet.attr, name);
      await me.addViews(Vs);
    } else {
      await me.addView(V);
    }
  };

  me.facetView = async (view, facetAttr) => {
    const buckets = await vca.getFacetBuckets(me.app.db, view.q, facetAttr);
    let views = [];
    for (let {where, facet, val} of buckets) {
      let fq = vca.Where({ exprs: where, child: view.q.clone()});
      views.push(View({
        q: fq,
        r: R__namespace.clone(view.mapping),
        name: `${view.viewName} (${facet}=${val})`
      }));
    }
    return views;
  };


  me.addView = async (view) => {
    await me.addViews([view]);
    return me;
  };

  me.addViews = async (views) => {
    if (!R__namespace.is(Array, views))
      views = [views];

    for (let v of views) {
      try {
        if (!v.id) 
          v.id = me.newViewId();
        if (!v.viewName) 
          v.viewName = v.id;

        v.setViewManager(me);
        me.views.push(v);

        if (v.init)
          v.init(db);
        me.dom.append(v.dom);
        await v.render(db);

      } catch (e) {
        me.onRemoveHandler(v);
        console.error(v);
        throw e;
      }
    }

    return me;
  };

  me.onRemoveHandler = (v) => {
    // remove from views
    const idx = me.views.indexOf(v);
    if (idx > -1) {
      me.views.splice(idx, 1);
      v.dom[0].remove(); // remove view's dom directly, no need to rerender
    } else {
      debug(`ERR: Couldn't find view ${v.id} to remove`);
    }
  };

  me.clear = (v) => {
    me.views.forEach((v) => v.dom[0].remove());
    me.views = [];
  };


  function getViewBBox(v) {
    let viewOffset = viewsDomEl.offset();
    let {top, left} = v.vldiv.offset();
    top -= viewOffset.top;
    left -= viewOffset.left;
    return {
      t: top, l: left, w: v.vldiv.width(), h: v.vldiv.height()
    }
  }

  // TODO: SPLIT this into multiple methods
  // 1. update selected interface
  // 2. update viewset dropzone
  // 3. update contextmenu (don't render if dropzone used to start drag)
  //
  // @displayOnly: falsy to update me.selectedViews.  true to only update display
  me.selectViews = (bbox, displayOnly) => {
	let selectedViews = [];
    me.views.forEach((v) => {
      if (!v.holder) return;
      v.holder.removeClass("selected");
      if (bbox && bboxOverlap(bbox, getViewBBox(v))) {
        v.holder.addClass("selected");
        selectedViews.push(v);
      }
    });
	if (!displayOnly) {
	  me.selectedViews = selectedViews;

	  if (bbox)
		me.viewsetDropzone.setViews(me.selectedViews);
	  if (me.selectedViews.length > 0 && me.app.onViewsSelected)
		me.app.onViewsSelected(me.selectedViews);
	}

  };



  //
  //
  // Logic to manage composition interactions and the display updates
  // 1. views construct the source and target data in the format:
  // {
  // 	type: "View" | "Mark" | "Viewset" | "Create"
  // 	data: the View object(s) of the actual operand
  // 	svg:  for Mark operands, the SVG dom element
  // 	view: the originating View object for the event
  // }
  // 2. during an interaction, update the displays
  //
  //
  me.dom[0].addEventListener("pointerdown", me.onStartViews);
  me.dom[0].addEventListener("pointermove", me.onMoveViews, true);
  me.dom[0].addEventListener("pointerup", me.onDropViews, true);

  me.onStartViews = (e) => {
	if (!me.isCompositionMode()) return;
	if (!me.composeHandler.srcOperand) return;
	me.dom[0].setPointerCapture(e.pointerId);
  };

  // onMove handler for #views container
  me.onMoveViews = (e) => {
	me.composeHandler.onMove(e, null);
  };

  me.onDropViews = (e) => {
	if (e.target == me.dom[0]) {
	  console.log("Views.onDropViews target:", e.target);
	  me.composeHandler.onDrop(e, null);
	} 
  };




  // finally, register handlers
  me.dom[0].addEventListener("pointerdown", (e) => {me.selectionHandler.onDown(e);});
  me.dom[0].addEventListener("pointermove", (e) => {me.selectionHandler.onMove(e);});
  me.dom[0].addEventListener("pointerup", (e) => {me.selectionHandler.onUp(e);});
  //me.dom[0].addEventListener("dragend", (e) => me.composeHandler(e, "end", me))

  return me;
}

let DummyViewManager = (({slider, viewManager}) => {
  let me = () => {};
  me.viewManager = viewManager;
  me.slider = slider;
  me.app = viewManager.app;

  me.addView = me.viewManager.addView;
  me.onMoveViews = me.viewManager.onMoveViews;
  me.onLiftView = me.viewManager.onLiftView;
  me.composeHandler = me.viewManager.composeHandler;

  me.onRemoveHandler = (view) => {
    viewManager.onRemoveHandler(slider);
  };

  return me;
});


let Slider = (({ q, view, sliderAttr, opts }) => {
  let me = () => {};
  me.dom = $("<div class='slider'/>");
  me.q = q; // base query, canonical form
  me.view = view;
  me.viewManager = null;
  me.min = opts.min || 0;
  me.max = opts.max || 100;
  me.value = opts.value || me.min;
  me.step = opts.step || (me.max - me.min) / 10;
  me.width = opts.width || 200;
  me.sliderAttr = sliderAttr;
  me.slider = null;
  me.label = null;

  me.setViewManager = (viewManager) => {
    me.viewManager = viewManager;
    me.view.setViewManager(DummyViewManager({slider: me, viewManager}));
  };

  me.isCompositionMode = () => 
    (me.viewManager)? me.viewManager.app.isCompositionMode() : false;

  me.setCompositionMode = (mode) => {
    me.view.setCompositionMode(mode);
  };

  me.setMapping = (mapping) => {
    if (me.view.setMapping)
      me.view.setMapping(mapping);
  };




  me.init = () => {
    if (me.view) {
      if (!me.view.id)
        me.view.id = me.viewManager.newViewId();
      me.view.width = me.width;
      me.view.setViewManager(DummyViewManager({
        slider: me, 
        viewManager:me.viewManager
      }));
      if (me.view.init) {
        me.view.init(me.viewManager.app.db);
      }
    }

    me.label = $("<span class='label'/>");
    me.label.text(`${me.sliderAttr.attr}: ${me.value}`);
    me.slider = $(`<input type="range" 
      class="" min="${me.min}" max="${me.max}"
      value="${me.value}" step="${me.step}"
      style="width:${me.width-75}px" >`);
    me.slider.on("input", me.onChange);
    me.slider_container = $("<div/>");
    me.slider_container
      .append(me.label)
      .append(me.slider);

    me.dom.append(me.view.dom);
    me.dom.append(me.slider_container);


    // store a copy so we can muck with subview's name
    me.viewName = me.view.viewName;

    return me
  };

  me.render = async () => {
    //me.dom.empty()

    await me.view.render();
    me.slider.off("input").on("input", me.onChange);
    me.onChange();

    return me
  };

  me.onChange = async (e) => {
    if (!me.slider) return;
    if (e) e.stopPropagation();

    let val = +me.slider.val();
    let newQ = me.q.clone();
    let a = me.sliderAttr;
    let where = vca.Where({exprs:[
      vca.Expr({op:">=", l:a, r:vca.Value({value:val-me.step})}),
      vca.Expr({op:"<", l:a, r:vca.Value({value:val+me.step})})
    ] });
    where.c = newQ.c;
    newQ.c = where;
    
    me.label.text(val);

    const newViewName = `${me.viewName}[${val}]`;

    // update chart
    me.view.updateQuery(newQ);
    me.view.viewName = newViewName;
    await me.view.render();
  };

  return me;
});

async function App({db,  containerid, demo}){
  const visualAttrs = ["x", "y", "color", "shape", "size", "column"];

  function me() {}
  me.db = db;
  me.containerid = containerid;
  me.viewCreateHandler = ViewCreateHandler();

  me.VCA = vca.VCA({app:me, View});
  me.viewManager = Views({ app: me });
  me.contextMenu = ContextMenu({ containerid: "contextmenu-container", app: me });

  me.demoMode = demo || false;


  me.renderDemo = async () => {
    if (me.demoMode) {
      $("#data-container").hide();
      $("#encoding-shelf-col").hide();
      $("#viewset-col").removeClass("col-md-6").addClass("col-md-10");
      if (me.encodingShelf)
        me.encodingShelf.dom.empty();
      if (me.dataShelf)
        me.dataShelf.dom.empty();
    } else {
      $("#data-container").show();
      $("#encoding-shelf-col").show();
      $("#viewset-col").removeClass("col-md-10").addClass("col-md-6");
      if (!me.encodingShelf)
        me.encodingShelf = await EncodingShelf({ visualAttrs, app: me });
      if (!me.dataShelf)
        me.dataShelf = await DataShelf({app: me}).init(db, "schema-container");
      me.encodingShelf.render();
      me.dataShelf.render();

    }
  };

  me.toggleDemoMode = async () => {
    me.demoMode = !me.demoMode;
    await me.renderDemo();
  };
  await me.renderDemo();
  $("#toggle-shelves").on("click", me.toggleDemoMode);


  //
  // Logic to manage algebra interactions
  //

  me.onViewsSelected = (views) => {
    me.contextMenu.state = R__namespace.isEmpty(views)? null : "nary";
    me.contextMenu.render();
    me.v1 = me.v2 = null;
  };

  me.onComposeView = (v1, v2) => {
    me.contextMenu.state = (v1 && v2)? "binary" : null;
    me.contextMenu.render();
    me.v1 = v1;
    me.v2 = v2;
  };

  me.onLiftView = (v) => {
    me.v2 = null;
    me.v1 = v;
    me.contextMenu.state = (v)? "lift" : null;
    me.contextMenu.render({v});
  };

  me.onNaryOp = async (op) => {
    let views = me.viewManager.selectedViews;
    if (R__namespace.isEmpty(views)) return;

    let operation = me.VCA.dot;
    if (op.type == "stats") 
      operation = me.VCA.dot;
    else if (op.type == "union") 
      operation = me.VCA.union;
    else
      return

    try {
      let v3 = await operation(op, views);
      await me.viewManager.addView(v3);
    } catch (e) {
      debug(e);
    }

    me.contextMenu.close();
  };

  me.onCreateView = async (v) => {
    await me.viewManager.addView(v);
  };


  me.onBinaryOp = async (op) => {
    // check that source and target views/viewsets are actually set
    if (me.v1 && me.v2) {
      let operation = null;
      if (op.type == "stats") 
        operation = me.VCA.dot;
      else if (op.type == "union") 
        operation = me.VCA.union;
      else
        console.log(`Binary op type ${op.type} not recognized`);

      try {
        let v3 = await operation(op, me.v1, me.v2);
        await me.viewManager.addViews(v3);
      } catch (e) {
        debug(e);
      }

      me.contextMenu.close();
    }
  };

  me.onLift = async (op) => {
    if (me.v1) {
      try {
        let v2 = await me.VCA.lift(op, me.v1);
        await me.viewManager.addViews(v2);
      } catch (e) {
        debug(e);
      }
    }
    me.contextMenu.close();
  };

  // pressing enter chooses defaults if context menue is active
  document.body.addEventListener("keydown", (e) => {
    if (e.key == "Enter" || e.key == "u" || e.key == "+" || e.key == "-") {
      me.contextMenu.onHotKey(e.key);
    } else if (e.key == "t") {
      me.toggleInteractionMode();
    }
  });


  //
  // initialize toggle for interaction vs composition modes
  // 
  me.toggleModeBtn = $("#toggle-mode");
  me.toggleModeBtn.on("click", () => me.toggleInteractionMode());
  me.interactionMode = "interaction"; // or "composition"
  me.isCompositionMode = () => me.interactionMode == "composition";
  me.toggleInteractionMode = () => {
    me.interactionMode = (me.isCompositionMode())? "interaction":"composition";
    me.updateInteractionMode();
  };


  me.updateInteractionMode = () => {
    if (me.isCompositionMode()) {
      me.toggleModeBtn
        .text("Composition Mode")
        .removeClass("btn-primary")
        .addClass("btn-info");
      me.viewManager.enable();
    } else {
      me.toggleModeBtn.text("Interaction Mode")
        .removeClass("btn-info")
        .addClass("btn-primary");
      me.viewManager.disable();
    } 
  };
  me.updateInteractionMode();

  return me;
}

async function loadSlider(app) {
  let viewManager = app.viewManager;
  viewManager.clear();

  let v = View({
    q: vca.VCA.parse("SELECT cyl, avg(mpg) as mpg FROM cars "),
    r: { x: "cyl", y: "mpg", measure: "mpg"  },
    name: "all",
    opts: {
      height: 300
    }
  });

 v = View({
    q: vca.VCA.parse(`select state, percdem from electionrd where party = \"DEMOCRAT\"`),
    r: { mark: "map", count: 'percdem', measure: "percdem"},
    name: "Election Statistics",
    opts: {
      width: 300,
      height: 300
    }
  });
 
  //viewManager.addView(v)
  await viewManager.addView(Slider({
    q: v.q,
    view: v,
    sliderAttr: vca.Attr('year'),
    opts: {
      min: 1976, max: 2020, step: 4,
      width: 400
    }
  }));
  return app;
}
async function loadElection(app) {
  let viewManager = app.viewManager;
  let years = [ 2008, 2012, 2016, 2020];
  for (let year of years) {
   let map = View({
      q: vca.VCA.parse(`select state, percdem from electionrd where year = ${year} and party = \"DEMOCRAT\"`),
      r: { mark: "map", count: "percdem", measure: "percdem"},
      name: year,
      opts: {
        width: 400,
        height: 300
      }
    });
    await viewManager.addView(map);
  }

  //await viewManager.addView(View({
  //  q: VCA.parse("select year, avg(percdem) as avg from electionrd where year >= 2008"),
  //  r: { mark: "table", measure: "avg", avg: "avg"},
  //  name: "Nationide Domcratic Percentage"
  //}))
  return app;
}

async function loadMusicBasic(app) {
  let viewManager = app.viewManager;
  let boros = ['Vinyl Single', 'Cassette'];//, 'CD']
  let views = boros.map((boro) => 
    View({
      q: vca.VCA.parse(`SELECT year, avg(revenue) as revenue FROM music WHERE format = '${boro}'`),
      r: { x: "year", y: 'revenue', measure: "revenue", mark: "bar" },
      name: `${boro} revenue`,
      opts: {
        width: 600, height: 250
      }
    }));
  await viewManager.addViews(views);
}


async function loadCarsNary(app) {
  let viewManager = app.viewManager;
  let carbs = [4,5,6,8];
  let views = carbs.map((carb) => 
    View({
      q: vca.VCA.parse(`SELECT gear, avg(mpg) as mpg FROM cars WHERE cyl = ${carb}`),
      r: { x: "gear", y: 'mpg', measure: "mpg", mark: "bar" },
      name: `cyl=${carb}`,
      opts: {
        width: 300, height: 250
      }
    })
  );
  await viewManager.addViews(views);
}


async function loadCarsLift(app) {
  let viewManager = app.viewManager;
  let carbs = [1,2,4];
  let views = carbs.map((carb) => 
    View({
      q: vca.VCA.parse(`SELECT cyl, avg(mpg) as mpg FROM cars WHERE carb = ${carb}`),
      r: { x: "cyl", y: 'mpg', measure: "mpg", mark: "bar" },
      name: `carb=${carb}`,
      opts: {
        width: 300, height: 250
      }
    })
  );
  await viewManager.addViews(views);

}





async function loadSPEncoding(app) {
  let viewManager = app.viewManager;
  let marks = ['bar', 'line', 'point'];
  let tickers = ['BAC', 'AXP', 'COF'];
  let names = ["Bank of America", "American Express", "Capital One"];
  let views = R__namespace.times((i) => {
    let [symb, name, mark] = [tickers[i], names[i], marks[i]];
    return View({
      q: vca.VCA.parse(`select day, high from sp100 where name = '${symb}'`),
      r: { x: "day", y: 'high', measure: "high", mark },
      name: `${name} daily price`,
      opts: {
        width: 400,
        height: 200
      }
    })
  }, marks.length);

  views.push(
    View({
      q: vca.VCA.parse("SELECT day, avg(high) as high FROM sp100 where day > 120 "),
      r: { mark: "table",  day: "day", high: "high", measure: "high" },
      name: "Recent Average Prices",
      opts: {
        width: 400,
        height: 200
      }
    })
  );
  //views.push(
  //  View({
  //    q: VCA.parse("SELECT volume, open, avg(high) as high from sp100 where name = 'MSFT'"),
  //    r: { x: "volume", y: "open", color: "high", measure: "high", mark: "point"},
  //    name: "Microsoft volume vs open"
  //  })
  //)
  await viewManager.addViews(views);
}

async function loadCarsEncoding(app) {
  let viewManager = app.viewManager;
  let views = [
    View({
      q: vca.VCA.parse("SELECT cyl, avg(mpg) as mpg FROM cars WHERE am = 1"),
      r: { x: "cyl", y: 'mpg', measure: "mpg" },
      name: "am=1"
    }),

    View({
      q: vca.VCA.parse("SELECT cyl, hp, avg(mpg) as mpg FROM cars "),
      r: { mark: "point",  x: "cyl", color: "mpg", y: "hp", measure: "mpg" },
      name: "all"
    }),
    View({
      q: vca.VCA.parse("select cyl, mpg  from cars where hp < 100"),
      r: { mark: "table", y: "mpg", cyl: "cyl", measure: 'mpg' },
      name: "low hp",
    })
  ];
  await viewManager.addViews(views);
}



const demos = [
  {
    name: "--",
    description: `<div>
     <h3>VCA Demonstration</h3>
    <p>View Composition Algebra is a formalism for composing data that are visually encoded in visualizations.  
  </p>
  <p>
    This website contains demo applications to illustrate the expressiveness of a view composition algebra.   
    The core library can be found at <a href="https://github.com/viewcompositionalgebra/vca">https://github.com/viewcompositionalgebra/vca</a>
  </p>
  <p>Please use the above dropdown to select each demo in sequence.</p>
  <h5>Abstract</h5>
  <p> Comparison is a core task in visual analysis.  Although there are numerous guidelines to help users design effective visualizations to aid known comparison tasks, there are few techniques available when users want to make ad hoc comparisons between marks, trends, or charts during data exploration and visual analysis.  For instance, to compare voting count maps from different years, two stock trends in a line chart, or a scatterplot of country GDPs with a textual summary of the average GDP.  Ideally, users can directly select the comparison targets and compare them, however what elements of a visualization should be candidate targets, which combinations of targets are safe to compare, and what comparison operations make sense?  This paper proposes a view composition algebra that lets users compose combinations of values, marks, legend elements, and charts using a set of composition operators that summarize, compute differences, merge, and model their operands.  We propose a formal algebra that is compatible with datacube-based visualization systems, derive an interaction model based on this algebra that supports ad hoc visual comparisons, and illustrate its usefulness through numerous use cases.</p>


    <p><a href="https://www.dropbox.com/s/bg5nggs681qttjf/compalgebra-vis22-revision-v4.pdf?dl=0">Click here for the accompanying paper.</a> </p>
  <p>The following is a demo of a Google Finance-like application that supports comparison interactions</p>
  <div style="position: relative; padding-bottom: 62.5%; height: 0;"><iframe src="https://www.loom.com/embed/6ab46ab3fabe41539cef6668dfbd0b69" frameborder="0" webkitallowfullscreen mozallowfullscreen allowfullscreen style="position: absolute; top: 0; left: 0; width: 100%; height: 100%;"></iframe></div>
    </div> `
  },
  {
    name: "Binary Composition",
    description: `<div>
    <h3>Basic Composition</h3>
    <p>
      These examples will guide you in using VCA's view composition interactions.
    The charts visualize annual music sales revenue for vinyl and cassette music formats. 
    At what point did cassette sales exceed vinyl sales?  
    The charts have different y-axis scales, so it is hard to compare. 
    </p>
    <p>
      To start, click "Interaction Mode" in the title bar, or press 't' to enter "Composition Mode" (the title bar should turn blue when you are in composition mode). 
Drag the title bar for the vinyl chart over the cassette chart.  
    This will show a context menu on the right side, with the composition operator "-" already highlighted.  Click the button or press <code>enter</code> to compose the charts</p>
  <p>
  Now try dragging the right chart onto the left, or choosing different binary stats operations, such as "+", "min", or "max".     You can also drag an individual mark to any title bar!
  </p>
  <p>
  Finally, you can select the "Union" operation as well, which will juxtapose (for bar charts) or superpose the marks into a single view.  Since there are many years, juxtaposing the marks will create a very wide chart!
  </p>
    </div>`,
    f: loadMusicBasic
  },
  {
    name: "Nary Composition",
    description: `<div>
    <h3>Nary Composition</h3>
    <p>
      This example illustrates VCA's nary operators. 
      Each chart shows average MPG by number of gears for cars with different numbers of cylinders.
      Notice that cars with different numbers of cylinders may not use the same number of gears.
    </p>
    <p>
    How many cars containing 5, 6, or 8 cylinders are there per gear?  
  Drag a selection box in the space below (start the drag
    in an empty space and not on a chart) to select the first three charts.     The context menu on the right lists different aggregation functions for statistical composition, as well as the option to union the marks together.  
  To answer the above question, click on <code>count</code>.
    </p>
    <p>
  When you select a set of views, the <b>Selected Viewset</b>
  box on the left will list the views that you have selected.  
VCA lets you compose individual charts with viewsets as well.
  For instance, try selecting the 6 and 8 cylinder charts and comparing that selection with the 4 cylinder chart.  
    </p>
    </div>`,
    f: loadCarsNary
  },
  {
  name: "VCA and Models",
  description: `<div>
  <h3>Lifting Views into Models</h3>
  <p>
  This example illustrates how to lift a view into a model to better
facilitate view comparisons.
  Notice that <code>carb=2</code> only contains data for 4 and 8 cylinder cars, while <code>carb=4</code> only contains 6 and 8 cylinder cars.  Thus, if we compare the two charts, only the 8 cylinder statistics will be compared.  
  </p>
  <p>
  Lifting the view lets us compare <code>carb=4</code> with the <i>expected</i> MPG statistics in <code>carb=2</code>, assuming that there is a linear relationship between cylinders and MPG.  To do so, click on <img src="./static/images/trending_up_black_24dp.svg"/> in the title bar of <code>carb=2</code>.  </p>
  <p>The context menu lists three models, and lets you pick which grouping attributes should be used as features to fit the model, or conditioning variables for which a separate model is fit for each unique value.  Simply press <b>enter</b> to create the model view.  You can now drag <code>carb=4</code> onto the model view to compare the two charts.
  </p>
  </div>`,
  f: loadCarsLift

  },
  {
    name: "Cross Encoding Composition",
    description: `<div>
    <h3>Cross Encoding Composition</h3>
    <p>
      This example shows how VCA helps users compare across different visual encodings.  The three charts show 100 days of stock prices for Bank of America, American Express, and Capital One, and the table shows the average stock prices over the recent 3 days.
    </p>
    <p>
    A basic question is how each stock compares with the average price in day 124.   Drag the desired table cell onto a chart (or a view set of all three charts) to perform the comparison.  The output renders the difference between the company's daily stock price and the overall average.
    </p>
    </div>`,
    f: loadSPEncoding
  },
  {
    name: "Third-Party Map Composition",
    description: `<div>
    <h3>Third-party Map Composition</h3>
    <p>
    This example is an illustration of adapting a third-party visualization library (<a href="https://leafletjs.com/">LeafletJs</a>) to support VCA.  Each map renders per state Democrat-Republican voting percentages for a given presidential election year.
  Because VCA performs transformations at the data level, third party visualizations can be integrated by writing a simple wrapper.
    </p>
  <p>How did voting percentages change between 2008 and each of the other three elections?   Do answer this, select the 2012-2020 maps to create a view set, and then drag 2008 onto the <b>Selected Viewset</b> box.
  </p>
    </div>`,
    f: loadElection
  },
  {

    name: `VCA + Interaction`,
    description: `<div>
      <h3>VCA and Slider Interaction</h3>
      <p>
      This example illustrates how you can save and compose different states of an interactive view.
      The chart renders US presidentia election statistics from 1976 to 2020 with the help of the interactive slider.  
      </p>
      <p>
      The current chart can be saved by dragging the title of the chart onto
the <b>Create View Dropzone</b>.  In bar charts and scatterplots you can also select marks in the chart
and press the <img src="./static/images/open_in_new_black_24dp.svg"/> button in the title bar to create a new view.  
      You can now compare the slider's chart with the saved one.
      </p>
    </div>`,
    f: loadSlider
  }
];

let loadDemo = (app) => {
  let dom = $("<div class='nav-item nav-link active demo'/>");
  let ul = $("<select/>");
  dom.append($("<span>Demos</span>"));
  dom.append(ul);

  let onChange = () => {
    let {name, description, f} = R__namespace.filter(({name}) => name == ul.val(), demos)[0];
    $("#demo-description").empty()
      .append($(description))
      .css({display: "block"});
    app.viewManager.clear();
    if (f) f(app);
  };

  demos.forEach(({ name, description, f}) => {
    let option = $(`<option value='${name}'>${name}</option>`);
    ul.append(option);
  });

  ul.on("change", onChange);
  onChange();

  $("#navbar .navbar-nav").append(dom);
  return app;
};

Object.defineProperty(exports, 'Attr', {
enumerable: true,
get: function () {
return vca.Attr;
}
});
Object.defineProperty(exports, 'Expr', {
enumerable: true,
get: function () {
return vca.Expr;
}
});
Object.defineProperty(exports, 'Func', {
enumerable: true,
get: function () {
return vca.Func;
}
});
Object.defineProperty(exports, 'GroupBy', {
enumerable: true,
get: function () {
return vca.GroupBy;
}
});
Object.defineProperty(exports, 'Join', {
enumerable: true,
get: function () {
return vca.Join;
}
});
Object.defineProperty(exports, 'PClause', {
enumerable: true,
get: function () {
return vca.PClause;
}
});
Object.defineProperty(exports, 'Paren', {
enumerable: true,
get: function () {
return vca.Paren;
}
});
Object.defineProperty(exports, 'Project', {
enumerable: true,
get: function () {
return vca.Project;
}
});
Object.defineProperty(exports, 'RemoteDB', {
enumerable: true,
get: function () {
return vca.RemoteDB;
}
});
Object.defineProperty(exports, 'Source', {
enumerable: true,
get: function () {
return vca.Source;
}
});
Object.defineProperty(exports, 'Union', {
enumerable: true,
get: function () {
return vca.Union;
}
});
Object.defineProperty(exports, 'VCA', {
enumerable: true,
get: function () {
return vca.VCA;
}
});
Object.defineProperty(exports, 'Value', {
enumerable: true,
get: function () {
return vca.Value;
}
});
Object.defineProperty(exports, 'Where', {
enumerable: true,
get: function () {
return vca.Where;
}
});
Object.defineProperty(exports, 'loadSqliteDB', {
enumerable: true,
get: function () {
return vca.loadSqliteDB;
}
});
Object.defineProperty(exports, 'parse', {
enumerable: true,
get: function () {
return vca.parse;
}
});
Object.defineProperty(exports, 'runQuery', {
enumerable: true,
get: function () {
return vca.runQuery;
}
});
Object.defineProperty(exports, 'sql', {
enumerable: true,
get: function () {
return vca.sql;
}
});
Object.defineProperty(exports, 'initSqlJs', {
enumerable: true,
get: function () {
return sql_js.initSqlJs;
}
});
exports.App = App;
exports.View = View;
exports.Views = Views;
exports.loadCarsEncoding = loadCarsEncoding;
exports.loadCarsLift = loadCarsLift;
exports.loadCarsNary = loadCarsNary;
exports.loadDemo = loadDemo;
exports.loadElection = loadElection;
exports.loadMusicBasic = loadMusicBasic;
exports.loadSPEncoding = loadSPEncoding;
exports.loadSlider = loadSlider;

Object.defineProperty(exports, '__esModule', { value: true });

})));

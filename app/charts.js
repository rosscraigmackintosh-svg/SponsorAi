/* charts.js — SponsorAI Chart Utilities
   Exposes window.SAI_CHARTS with reusable ECharts builders.

   Requirements:
     Apache ECharts 5 must be loaded before this file.
     Falls back silently (no-ops) when ECharts is unavailable.

   Public API:
     SAI_CHARTS.createFanScoreChart(elementId, data)
     SAI_CHARTS.createAudienceGrowthChart(elementId, data)
     SAI_CHARTS.createEngagementComparisonChart(elementId, data)
     SAI_CHARTS.createMomentumSparkline(elementId, data)
     SAI_CHARTS.fromSparks(sparks)
     SAI_CHARTS.resizeAll()
     SAI_CHARTS.dispose(elementId)

   Data format (for chart builders):
     [{date: 'YYYY-MM-DD', value: Number|null}, ...]

   Engagement chart data format:
     [{label: 'Property Name', value: 3.4}, ...]

   Sparks format (from API):
     [{d: 'YYYY-MM-DD', v: Number|null}, ...]
     Use SAI_CHARTS.fromSparks(sparks) to convert.
*/

window.SAI_CHARTS = (function() {

  'use strict';

  /* ── Instance registry ──────────────────────────────────────────── */
  var _instances = {};

  /* ── Resolve a CSS color expression (incl. var()) to rgb(r,g,b) ── */
  /* Creates a throwaway element, applies the color, reads back the   */
  /* computed value. Handles chained CSS custom properties correctly.  */
  function _resolveColor(expr) {
    if (!document || !document.body) return '';
    var el = document.createElement('div');
    el.style.cssText = 'position:absolute;visibility:hidden;pointer-events:none;color:' + expr;
    document.body.appendChild(el);
    var computed = window.getComputedStyle(el).color;
    document.body.removeChild(el);
    return computed; /* 'rgb(r, g, b)' */
  }

  /* ── Convert an rgb/rgba string to rgba(r,g,b,alpha) ───────────── */
  function _rgba(rgbStr, alpha) {
    var m = (rgbStr || '').match(/(\d+)[,\s]+(\d+)[,\s]+(\d+)/);
    if (!m) return 'rgba(105,56,239,' + alpha + ')';
    return 'rgba(' + m[1] + ',' + m[2] + ',' + m[3] + ',' + alpha + ')';
  }

  /* ── Read design tokens at call-time (theme-aware) ─────────────── */
  /* All colors are fully resolved through computed style to guarantee */
  /* ECharts (which uses inline SVG attributes) receives real values.  */
  function _palette() {
    function rc(v) { return _resolveColor('var(' + v + ')'); }
    var accent       = rc('--accent');
    var border       = rc('--border');
    var text1        = rc('--text-1');
    var text2        = rc('--text-2');
    var text3        = rc('--text-3');
    var surface      = rc('--surface');
    var surfaceMuted = rc('--surface-muted');

    return {
      accent:       accent       || 'rgb(105,56,239)',
      accentA:      function(a)  { return _rgba(accent, a); },
      border:       border       || 'rgb(230,230,232)',
      text1:        text1        || 'rgb(65,70,81)',
      text2:        text2        || 'rgb(107,114,128)',
      text3:        text3        || 'rgb(156,163,175)',
      text3A:       function(a)  { return _rgba(text3, a); },
      surface:      surface      || 'rgb(255,255,255)',
      surfaceMuted: surfaceMuted || 'rgb(241,242,244)'
    };
  }

  /* ── Shared axis / grid defaults ────────────────────────────────── */
  function _timeXAxis(p, opts) {
    opts = opts || {};
    return {
      type: 'time',
      boundaryGap: false,
      axisLine: { lineStyle: { color: p.border } },
      axisTick: { show: false },
      axisLabel: {
        color: p.text3,
        fontSize: 10,
        formatter: function(val) {
          var d = new Date(val);
          var M = ['Jan','Feb','Mar','Apr','May','Jun',
                   'Jul','Aug','Sep','Oct','Nov','Dec'];
          return M[d.getMonth()] + ' ' + d.getDate();
        },
        showMinLabel: true,
        showMaxLabel: true
      },
      splitLine: { show: false }
    };
  }

  function _valueYAxis(p, opts) {
    opts = opts || {};
    return {
      type: 'value',
      min: opts.min,
      max: opts.max,
      axisLine: { show: false },
      axisTick: { show: false },
      axisLabel: {
        color: p.text3,
        fontSize: 10,
        margin: 4,
        formatter: opts.labelFmt || null
      },
      splitLine: {
        lineStyle: { color: p.border, type: 'solid', width: 1 }
      }
    };
  }

  function _tooltip(p, fmtFn) {
    return {
      trigger: 'axis',
      backgroundColor: p.surface,
      borderColor: p.border,
      borderWidth: 1,
      padding: [6, 10],
      textStyle: { color: p.text1, fontSize: 12 },
      formatter: fmtFn,
      axisPointer: { type: 'line', lineStyle: { color: p.border, width: 1 } }
    };
  }

  function _monthDayFmt(timestamp) {
    var d = new Date(timestamp);
    var M = ['Jan','Feb','Mar','Apr','May','Jun',
             'Jul','Aug','Sep','Oct','Nov','Dec'];
    return M[d.getMonth()] + ' ' + d.getDate();
  }

  /* ── Initialise or re-initialise an ECharts instance ───────────── */
  function _init(elementId) {
    if (typeof echarts === 'undefined') return null;
    var el = document.getElementById(elementId);
    if (!el) return null;

    /* Dispose any existing instance to prevent double-binding */
    if (_instances[elementId]) {
      try { _instances[elementId].dispose(); } catch(e) {}
      delete _instances[elementId];
    }

    var chart = echarts.init(el, null, { renderer: 'svg' });
    _instances[elementId] = chart;
    return chart;
  }

  /* ── Filter null values ─────────────────────────────────────────── */
  function _validPoints(data) {
    return (data || []).filter(function(d) { return d != null && d.value != null; });
  }

  /* ── Y-axis range with breathing room ──────────────────────────── */
  function _yRange(vals, pctPad, minPad) {
    var lo   = Math.min.apply(null, vals);
    var hi   = Math.max.apply(null, vals);
    var pad  = Math.max((hi - lo) * pctPad, minPad == null ? 0 : minPad);
    return { min: Math.floor(lo - pad), max: Math.ceil(hi + pad) };
  }

  /* ── Convert sparks {d, v} format to chart {date, value} format ── */
  function fromSparks(sparks) {
    return (sparks || []).map(function(s) {
      return { date: s.d, value: s.v };
    });
  }

  /* ── Safe HTML escape for tooltip strings ───────────────────────── */
  function _esc(s) {
    return String(s)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }

  /* ═══════════════════════════════════════════════════════════════════
     1. FanScore trend chart
        Line + area, X = time, Y = FanScore.
        Property page Audience tab: #momentum-chart
        Container must have an explicit height (200px recommended).
     ═══════════════════════════════════════════════════════════════════ */
  function createFanScoreChart(elementId, data) {
    var chart = _init(elementId);
    if (!chart) return;

    var p   = _palette();
    var pts = _validPoints(data);
    if (pts.length < 2) {
      chart.dispose();
      delete _instances[elementId];
      return;
    }

    var seriesData = pts.map(function(d) { return [d.date, d.value]; });
    var vals       = pts.map(function(d) { return d.value; });
    var yr         = _yRange(vals, 0.12, 1);

    var option = {
      animation: false,
      backgroundColor: 'transparent',
      grid: { top: 16, right: 12, bottom: 28, left: 8, containLabel: true },
      xAxis: _timeXAxis(p),
      yAxis: _valueYAxis(p, { min: yr.min, max: yr.max }),
      tooltip: _tooltip(p, function(params) {
        var pt = params[0];
        if (!pt) return '';
        return '<span style="color:' + p.text3 + ';font-size:11px">' + _monthDayFmt(pt.value[0]) + '</span>'
             + '<br><span style="font-size:13px;font-weight:500">'   + Number(pt.value[1]).toFixed(1) + '</span>';
      }),
      series: [{
        type: 'line',
        data: seriesData,
        smooth: 0.3,
        symbol: 'none',
        lineStyle: { color: p.accent, width: 1.5 },
        areaStyle: {
          color: {
            type: 'linear', x: 0, y: 0, x2: 0, y2: 1,
            colorStops: [
              { offset: 0, color: p.accentA(0.12) },
              { offset: 1, color: p.accentA(0.01) }
            ]
          }
        }
      }]
    };

    chart.setOption(option);
  }

  /* ═══════════════════════════════════════════════════════════════════
     2. Audience growth chart
        Line, neutral grey, X = time, Y = follower count.
        Property page Audience tab.
        Container must have an explicit height.
     ═══════════════════════════════════════════════════════════════════ */
  function createAudienceGrowthChart(elementId, data) {
    var chart = _init(elementId);
    if (!chart) return;

    var p   = _palette();
    var pts = _validPoints(data);
    if (pts.length < 2) {
      chart.dispose();
      delete _instances[elementId];
      return;
    }

    var seriesData = pts.map(function(d) { return [d.date, d.value]; });
    var vals       = pts.map(function(d) { return d.value; });
    var yr         = _yRange(vals, 0.12, 1000);
    yr.min         = Math.max(0, yr.min);

    function audienceFmt(val) {
      if (val >= 1000000) return (val / 1000000).toFixed(1) + 'M';
      if (val >= 1000)    return (val / 1000).toFixed(0) + 'K';
      return val;
    }

    var option = {
      animation: false,
      backgroundColor: 'transparent',
      grid: { top: 16, right: 12, bottom: 28, left: 8, containLabel: true },
      xAxis: _timeXAxis(p),
      yAxis: _valueYAxis(p, {
        min: yr.min,
        max: yr.max,
        labelFmt: audienceFmt
      }),
      tooltip: _tooltip(p, function(params) {
        var pt = params[0];
        if (!pt) return '';
        var v = Number(pt.value[1]);
        return '<span style="color:' + p.text3 + ';font-size:11px">' + _monthDayFmt(pt.value[0]) + '</span>'
             + '<br><span style="font-size:13px;font-weight:500">'   + audienceFmt(v) + '</span>';
      }),
      series: [{
        type: 'line',
        data: seriesData,
        smooth: 0.3,
        symbol: 'none',
        lineStyle: { color: p.text2, width: 1.5 },
        areaStyle: {
          color: {
            type: 'linear', x: 0, y: 0, x2: 0, y2: 1,
            colorStops: [
              { offset: 0, color: p.text3A(0.12) },
              { offset: 1, color: p.text3A(0.01) }
            ]
          }
        }
      }]
    };

    chart.setOption(option);
  }

  /* ═══════════════════════════════════════════════════════════════════
     3. Engagement comparison chart
        Horizontal bar, sorted descending, highest bar in accent.
        Compare page: #cmp-engagement-chart-wrap
        Container height computed from bar count.
        data format: [{label: String, value: Number}, ...]
     ═══════════════════════════════════════════════════════════════════ */
  function createEngagementComparisonChart(elementId, data) {
    var chart = _init(elementId);
    if (!chart) return;

    var p = _palette();

    if (!data || data.length === 0) {
      chart.dispose();
      delete _instances[elementId];
      return;
    }

    /* Sort ascending so highest appears at top in a horizontal bar */
    var sorted  = (data || []).slice().sort(function(a, b) { return a.value - b.value; });
    var labels  = sorted.map(function(d) { return d.label; });
    var values  = sorted.map(function(d) { return d.value; });
    var highest = Math.max.apply(null, values);

    var seriesData = values.map(function(v) {
      var isTop = (v === highest);
      return {
        value: v,
        itemStyle: {
          color: isTop ? p.accent : p.surfaceMuted,
          borderColor: isTop ? p.accent : p.border,
          borderWidth: 1,
          borderRadius: [0, 2, 2, 0]
        },
        label: {
          color: isTop ? p.accent : p.text3
        }
      };
    });

    var option = {
      animation: false,
      backgroundColor: 'transparent',
      grid: { top: 8, right: 56, bottom: 8, left: 8, containLabel: true },
      xAxis: {
        type: 'value',
        min: 0,
        axisLine:  { show: false },
        axisTick:  { show: false },
        axisLabel: { show: false },
        splitLine: { lineStyle: { color: p.border, type: 'solid', width: 1 } }
      },
      yAxis: {
        type: 'category',
        data: labels,
        axisLine: { show: false },
        axisTick: { show: false },
        axisLabel: { color: p.text2, fontSize: 12 }
      },
      tooltip: {
        trigger: 'axis',
        backgroundColor: p.surface,
        borderColor: p.border,
        borderWidth: 1,
        padding: [6, 10],
        textStyle: { color: p.text1, fontSize: 12 },
        axisPointer: { type: 'shadow' },
        formatter: function(params) {
          var pt = params[0];
          if (!pt) return '';
          return '<span style="color:' + p.text3 + ';font-size:11px">' + _esc(pt.name) + '</span>'
               + '<br><span style="font-size:13px;font-weight:500">'   + Number(pt.value).toFixed(1) + '% eng.</span>';
        }
      },
      series: [{
        type: 'bar',
        data: seriesData,
        barMaxWidth: 20,
        label: {
          show: true,
          position: 'right',
          fontSize: 11,
          formatter: function(params) {
            return Number(params.value).toFixed(1) + '%';
          }
        }
      }]
    };

    chart.setOption(option);
  }

  /* ═══════════════════════════════════════════════════════════════════
     4. Momentum sparkline
        Compact line + area, no axes, no tooltip. Hero panel.
        Property page FanScore block: #prop-spark
        Container must have an explicit height (72px).
     ═══════════════════════════════════════════════════════════════════ */
  function createMomentumSparkline(elementId, data) {
    var chart = _init(elementId);
    if (!chart) return;

    var p   = _palette();
    var pts = _validPoints(data);
    if (pts.length < 2) {
      chart.dispose();
      delete _instances[elementId];
      return;
    }

    var seriesData = pts.map(function(d) { return [d.date, d.value]; });
    var vals       = pts.map(function(d) { return d.value; });
    var yr         = _yRange(vals, 0.15, 1);

    var option = {
      animation: false,
      backgroundColor: 'transparent',
      grid: { top: 2, right: 0, bottom: 2, left: 0 },
      xAxis: { type: 'time', boundaryGap: false, show: false },
      yAxis: { type: 'value', min: yr.min, max: yr.max, show: false },
      tooltip: { show: false },
      series: [{
        type: 'line',
        data: seriesData,
        smooth: 0.35,
        symbol: 'none',
        lineStyle: { color: p.accent, width: 1.5 },
        areaStyle: {
          color: {
            type: 'linear', x: 0, y: 0, x2: 0, y2: 1,
            colorStops: [
              { offset: 0, color: p.accentA(0.18) },
              { offset: 1, color: p.accentA(0.02) }
            ]
          }
        }
      }]
    };

    chart.setOption(option);
  }

  /* ── Resize all live instances ──────────────────────────────────── */
  /* Called on window resize so charts remain fluid.                   */
  function resizeAll() {
    Object.keys(_instances).forEach(function(id) {
      try { if (_instances[id]) _instances[id].resize(); } catch(e) {}
    });
  }

  /* ── Dispose a single instance ──────────────────────────────────── */
  function dispose(elementId) {
    if (_instances[elementId]) {
      try { _instances[elementId].dispose(); } catch(e) {}
      delete _instances[elementId];
    }
  }

  /* ── Bind window resize ─────────────────────────────────────────── */
  window.addEventListener('resize', resizeAll);

  /* ── Public API ─────────────────────────────────────────────────── */
  return {
    fromSparks:                      fromSparks,
    createFanScoreChart:             createFanScoreChart,
    createAudienceGrowthChart:       createAudienceGrowthChart,
    createEngagementComparisonChart: createEngagementComparisonChart,
    createMomentumSparkline:         createMomentumSparkline,
    resizeAll:                       resizeAll,
    dispose:                         dispose
  };

})();

import { useEffect, useRef } from 'react';
import union from 'lodash.union';
import * as d3 from 'd3';
import { Box, Layer, Heading } from 'grommet';
import files from './sample-data.json';

const overflow = "visible";

const getData = (expenditure) => {

  /**
   * get subgroups
   * user can add different types of expenditures in his csv files
   * in one year he might have spent on 'travel' and in another he might not have
   * so for different years we can expect different types of expenditures
   * keeping this in mind, we need to make sure we pass ALL the types of expenditures
   * to our x-axis sub-group domain
   */
  /**
   * while you're doing this computation, you can also compute the maximum expenditure
   * so you can properly set the y-axis range from 0 to maxExpenditure
   */
  const subgroups = Object.values(expenditure).map(obj => Object.keys(obj.analytics) );
  const yRange = Object.values(expenditure).map(obj => Object.values(obj.analytics));
  const years = Object.keys(expenditure); // fill in the missing years in this array
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  const dataMonth = Object.keys(expenditure).map(year => (
    months
      .filter(month => expenditure[year][month]?.analytics)
      .map(month => ({ group: year, groupSecondary: month, ...expenditure[year][month]?.analytics }),
  ))).flat();
  return {
    xAxisDomainYear: years,
    xAxisDomainMonth: months,
    // xAxisDomainMonth: dataMonth.map(d => d.groupSecondary),
    subgroups: union(...subgroups),
    yRange: union(...yRange),
    dataYear: Object.keys(expenditure).map(year => (
      {
        group: year,
        ...expenditure[year].analytics,
      }
    )),
    dataMonth,
  }
};

export default App = () => {
  const graphZoomedRef = useRef(false);
  const brushRef = useRef();
  
  const { dataYear, dataMonth, xAxisDomainYear, xAxisDomainMonth, subgroups, yRange } = getData(files);
  
  
  console.log(files, dataMonth, xAxisDomainMonth);

  const defineChartDimensions = () => {
    const margin = {top: 10, right: 50, bottom: 20, left: 50};
    const element = document.getElementById('chart-wrapper');
    console.log(element);
    const computedStyle = getComputedStyle(element);
    let width = element.clientWidth;   // width with padding
    width -= parseFloat(computedStyle.paddingLeft) + parseFloat(computedStyle.paddingRight);
    const height = (window.innerHeight * .7) - margin.top - margin.bottom;
    const parentWidth = document.getElementById('chart-wrapper').offsetWidth;
    const chartWidth = width * .9;
    const legendWidth = width * .085;
    return { height, parentWidth, chartWidth, legendWidth, margin };
  }

  const createChartSvg = (width, height, margin) => {
    // append the svg object to the body of the page
    const svg = d3.select("#my_dataviz")
    .append("svg")
      .attr("width", (width))
      .attr("height", height + margin.top + margin.bottom)
      .append('g')
		  .attr("transform", "translate(10, 0)");
    return svg;
  }

  const createBrushChartSvg = (width, height, margin) => {
    const svg = d3.select("#brush_chart")
    .append("svg")
      .attr("overflow", overflow)
      .attr("width", (width))
      .attr("height", height + margin.top + margin.bottom)
      // .style("border", "1px solid lightgrey")\
    return svg;
  }

  const addXAxis = (svg, xAxisDomainYear, width, height) => {
    // Add X axis
    let x = d3.scaleBand()
      .domain(xAxisDomainYear)
      .range([0, width])
      .padding([0.2])
    svg.append("g")
      .attr("transform", `translate(0, ${height})`)
      .style("font-size", "12px")
      .style("font-weight", "bold")
      .attr("class", "x-axis")
      .call(d3.axisBottom(x));
    // x.invert = function(x){ return d3.scaleQuantize().domain(this.range()).range(this.domain())(x);}
    return x;
  };

  const addYAxis = (svg, yRange, height, margin) => {
    const y = d3.scaleLog()
      .base(2)
      .domain([1, d3.max(yRange)])
      .range([ height - margin.bottom, margin.top ]);
    svg.append("g")
      .attr("transform", `translate(30,0)`)
      .attr("class", "y-axis")
      .call(d3.axisLeft(y))
    .append("text")
      .attr("x", 5)
      .attr("y", y(y.ticks().pop()) + 0.5)
      .attr("dy", "0.32em")
      .attr("fill", "#000")
      .attr("font-weight", "bold")
      .attr("text-anchor", "start")
      .text("Expenditure");
    
    svg.selectAll(".y-axis > .tick > text").attr("transform", "rotate(0)");
    return y;
  };

  const addHiddenDateAxis = (svg, width, xAxisDomainYear) => {
    const xDateAxis = d3.scaleTime()
      .domain([ new Date(d3.min(xAxisDomainYear)), new Date(d3.max(xAxisDomainYear)) ])
      .range([0, width])
    svg.append("g")
      .attr("class", "hidden-date-axis")
      .style("visibility", "hidden")
      .call(d3.axisBottom(xDateAxis));
    return xDateAxis;
  };

  const addSecondaryXAxis = (x, xAxisDomainMonth, currentYear = 'nm') => {
    const x2 = d3.scaleBand()
      .domain(xAxisDomainMonth.map(month => `${currentYear}-${month}`))
      .range([0, x.bandwidth()])
      .padding(0);
    return x2;
  };

  const showSecondaryXAxis = (svg, x, height, call = true) => {
    const x2s = []
    const ticks = svg
      .selectAll(".barGroup")
      .append("g")
      .attr("transform", "translate(0," + height + ")")
      .style("font-size", "10px")
      .style("font-weight", "bold")
      .attr("class",(_, i) => `x-axis-2-${i}`)
      .each((_, i) => {
        const barGroup = d3.select(`.barGroup:nth-child(${i+1})`);
        const group = barGroup.data()[0]?.group;
        const x2 = addSecondaryXAxis(x, xAxisDomainMonth, group);
        x2s.push(x2);
      });
    if(call) {
      x2s.forEach((x2, i) =>
      svg.selectAll(`.x-axis-2-${i}`)
        .call(
          d3.axisBottom(x2)
          .tickFormat(d => d.split('-')[1])
        )
      )
    }
    ticks.selectAll("text").attr("transform", "translate(-10, 10), rotate(-65)");
    return x2s;
  };

  const addSubXAxis = (x, subgroups) => {
    const xSubgroup = d3.scaleBand()
      .domain(subgroups)
      .rangeRound([0, x.bandwidth()])
      .padding([0.05]);
    return xSubgroup;
  };

  const updateYAxisByMonth = (svg, y, yRange, height) => {
    y.domain([1, d3.max(dataMonth, function(d) { return d3.max(yRange) })]).nice()
    .range([ height, 0 ]);
    svg.selectAll(".y-axis")
      .call(d3.axisLeft(y))
  }

  const updateYAxisByYear = (svg, y, yRange, height) => {
    y.domain([1, d3.max(dataYear, function(d) { return d3.max(yRange) })]).nice()
    .range([ height, 0 ]);
    svg.selectAll(".y-axis")
      .call(d3.axisLeft(y))
  }

  const addYAxisAndAppendBarsArea = (svg, x, height) => {
    // add y axis
    const y = d3.scaleLog()
      .domain([1, d3.max(yRange)])
      .range([ height, 0]);

    // add bar areas for each year
    svg.append("g")
      .selectAll("g")
      // Enter in data = loop group per group
      .data(dataYear)
      .enter()
      .append("g")
        .attr("class", "barGroup")
        .attr("transform", function(d) { return "translate(" + x(d.group) + ",0)"; })
    return y;    
  }

  const addGridLines = (svg, y, width) => {
    svg.append("g")
      .attr("class", "grid")
      .call(d3.axisLeft(y)
        .tickSize(-width)
        .tickFormat("")
      )
    svg.selectAll(".grid line, .grid path")
      .attr("stroke", "#e0e0e0")
      .attr("stroke-opacity", "0.5")
      .attr("stroke-dasharray", "4 4")
      .attr("stroke-width", "1px")
  }

  const defineColorPalette = (svg) => {
    const color = d3.scaleOrdinal()
      .domain(subgroups)
      .range([
        '#864000',
        '#D44000',
        '#FF7A00',
        '#FFD369',
        '#583D72',
        '#9F5F80',
        '#FFEFCF',
        '#FF8E71',
        '#940A37',
        '#FFBA93',
      ]) // make colors dynamic
    return color;
  };

  const generateBarsYear = (svg, x, y, height, color) => {
    updateYAxisByYear(svg, y, yRange, height);
    const xSubgroup = addSubXAxis(x, subgroups);

    svg.selectAll(".barGroup").remove();
    svg.append("g")
      .selectAll("g")
      // Enter in data = loop group per group
      .data(dataYear)
      .enter()
      .append("g")
        .attr("class", "barGroup")
        .attr("transform", function(d) { return "translate(" + x(d.group) + ",0)"; })
      .selectAll("rect")
      .data(d =>
        subgroups
          .filter(subgroup => !!d[subgroup])
          .map(subgroup => ({key: subgroup, value: d[subgroup]}))
      )
      .enter().append("rect") // enter = new data array - already existing DOM elements (previous data array)
        .attr("class", "bar")
        .attr("x", function(d) { return xSubgroup(d.key); })
        .attr("y", function(d) { return y(d.value); })
        .attr("width", xSubgroup.bandwidth())
        .attr("fill", function(d) { return color(d.key); })
      .exit().remove();
      svg.selectAll("rect")
        .transition() //assures the transition of the bars
        .duration(400) //the transition lasts 800 ms
          .attr("height", function(d) { return y(1) - y(d.value); })
        .delay(300)
      // this gets called every time the data changes, it removes previous data you just added (and the ones before that)
      // ^ this ensures the selection array is empty for the next update
      // if you don't do this, you'll get a bunch of duplicate bars
  };

  const generateBarsMonth = (svg, x, x2, y, height, color) => {
    updateYAxisByMonth(svg, y, yRange, height);
    const xSubgroup = addSubXAxis(x2[0], subgroups); // create new xSubgroup

    svg.selectAll(".bar").remove()
    generateBarsMonthHelper(svg, x2, y, color, xSubgroup);
  };

  const generateBarsMonthHelper = (svg, x2, y, color, xSubgroup, xs) => {
    svg
    .selectAll(".barGroup")
      .append("g")
      .attr("class", "barGroup-Secondary")
      .selectAll("g")
        // Enter in data = loop group per group
        .data((d) => { return dataMonth.filter(data => data.group === d.group) })
        .enter()
          .append("g")
          .style("background-color", "pink")
          .attr("transform", function(d, i) {
            const xCoord = x2
              .find(x =>  x(`${d.group}-${d.groupSecondary}`) !== undefined)
              (`${d.group}-${d.groupSecondary}`)
            // console.log('top', i, `${d.group}-${d.groupSecondary}`, xCoord);
            return "translate(" + xCoord + ",0)";
          })
          .selectAll("rect")
          .data(d =>
            subgroups
              .filter(subgroup => !!d[subgroup])
              .map(subgroup => ({key: subgroup, value: d[subgroup]}))
          )
          .enter().append("rect") // enter = new data array - selection array (previous data array)
            .attr("class", "bar")
            .attr("fill", function(d) { return color(d.key); })
            .attr("x", function(d) { return xSubgroup(d.key); })
            .attr("y", function(d) { return y(d.value); })
            .attr("width", xSubgroup.bandwidth() || x2[0].bandwidth() / xSubgroup.domain().length)
          .exit().remove();
          svg.selectAll("rect")
            .transition() //assures the transition of the bars
            .duration(400) //the transition lasts 800 ms
              .attr("y", d => y(d.value))
              .attr("height", function(d) { return y(1) - y(d.value); })
            .delay(300)
  };

  // got code from here https://medium.com/@kj_schmidt/show-data-on-mouse-over-with-d3-js-3bf598ff8fc2
  const showDataOnHover = (svg) => {
    let div;
    if (d3.selectAll("[class*='svg1-tooltip']").empty()) {
      div = d3.select("body").append("div")
        .attr("class", "svg1-tooltip")
    } else {
      div = d3.selectAll("[class*='svg1-tooltip']");
    }

    svg.selectAll("rect")
    .on('mouseover', function (event, d) {
        d3.select(this).transition()
          .duration('50')
          .attr('opacity', '.8')
          .attr('cursor', 'pointer');
        div.html(`${Math.round(d.value)}, ${d.key}`)
          .transition().duration(50)
          .style("left", (event.pageX + 10) + "px")
          .style("top", (event.pageY - 15) + "px")
          .style("visibility", 'visible');
      })
      .on('mouseout', function (event, d) {
        d3.select(this).transition()
          .duration('50')
          .attr('opacity', '1')
          .attr('cursor', 'default');
        div.transition()
          .duration('50')
          .style("visibility", 'hidden');
      });
  }

  const createLegends = (height, width, margin, color) => {
    const xCoord = width * .12;
    const yCoord = xCoord + (height * .3);
    const svg_legend = d3.select("#chart_legends")
    .append("svg")
      .attr("width", (width))
      .attr("overflow", "visible")
      .attr("height", height + margin.top + margin.bottom)
      // .style("border", "1px solid lightgrey")

    const size = 10
    svg_legend.selectAll("mydots")
      .data(subgroups)
      .enter()
      .append("rect")
        .attr("x", xCoord)
        .attr("y", function(d,i){ return yCoord + i*(size+10)}) // 100 is where the first dot appears. 25 is the distance between dots
        .attr("width", size)
        .attr("height", size)
        .style("fill", function(d){ return color(d)})
    
    // Add one dot in the legend for each name.
    svg_legend.selectAll("mylabels")
      .data(subgroups)
      .enter()
      .append("text")
        .attr("x", xCoord + size*1.2)
        .attr("y", function(d,i){ return yCoord + i*(size+10) + (size/2)}) // 100 is where the first dot appears. 25 is the distance between dots
        .style("fill", '#363535')
        .text(function(d){ return d})
        .attr("text-anchor", "left")
        .style("alignment-baseline", "middle")
        .style("font-weight", "bold")
        .style("font-size", "15px")
        .style("text-overflow", "ellipsis")
        .style("overflow", "hidden")
        .style("white-space", "nowrap")
  };

  const createBrush = (svg, height, width, x, zoom) => {
    const brush = d3.brushX()
      .extent([[0, 0], [width, height]])
      .on("brush", brushed);

    brushRef.current = {brush, x};
    svg.append("g")
      .attr("class", "brush")
      // .attr("visibility", "hidden")
      .call(brush)
      .call(brush.move, x.range());
      // .call(brush.move, [x(x.domain()[0]), x(x.domain()[1])]);

    d3.selectAll('.handle').remove();
    d3.selectAll('.resize').remove();
    d3.selectAll('.background').remove();
    d3.selectAll('.overlay').remove();
  
    function brushed(event) {
      if (
        !event.sourceEvent ||
        (event.sourceEvent && event.sourceEvent.type === "zoom")
      ) return; // ignore brush-by-zoom
      const s = event.selection;
      d3.select(".zoom").call(zoom.transform, d3.zoomIdentity
        .scale(width / (s[1] - s[0]))
        .translate(-s[0], 0));
    }
  }

  // for zooming functionality initially refered to this code https://stackoverflow.com/a/49286715/6051241
  const zoomChart = (svg, margin, x, xSubgroup, xDateAxis, xDateAxisReference, y, width, height, color) => {
    const extent = [[margin.left, margin.top], [width - margin.right, height - margin.top]];
    const zoomScale = x.domain().length * 1.2;
    console.log('svg', svg)
    const zoom = d3.zoom()
      .scaleExtent([1, zoomScale])
      .translateExtent(extent)
      .extent(extent)
      .on("zoom", zoomed);

    svg
      .attr("class", "zoom")
      .call(zoom);

    function zoomed(event) {
      console.log('zoomed', event.transform.k);
      /* bit of a hack here: need to manually disable hovered datas when the user zooms */
      d3.selectAll('.svg1-tooltip').style("visibility", 'hidden');
      /* hack end */

      graphZoomedRef.current = (event.transform.k === zoomScale);

      x.range([0, width].map(d => event.transform.applyX(d)));
      svg.select(".x-axis").call(d3.axisBottom(x));
      xSubgroup.rangeRound([0, x.bandwidth()]);
      svg.selectAll(".barGroup").attr("transform", (d) => "translate(" + x(d.group) + ",0)");

      /**
       * we need to use a reference scale here so that zooming
       * is relative to the original zoom state and not the last zoom state
       * explanation: https://stackoverflow.com/a/50185040/6051241 (which is a bit confusing)
       *  */
       if (
        (event.sourceEvent && event.sourceEvent.type) !== "brush"
      ) {
        xDateAxis.domain(event.transform.rescaleX(xDateAxisReference).domain());
        const [startPoint, endPoint] = xDateAxis.domain();
        d3.select(".brush")
        .call(
          brushRef.current.brush.move,
          [xDateAxisReference(startPoint), xDateAxisReference(endPoint)]
          );
      }
      /**
       * the transform value we get from the brush-triggered zoom event is
       * not accurate upto 6/7 decimal places, so we check if the difference
       * between the zoomScale and event.transform.k is less than 0.000001 or not
       * as a hack to check if we've fully zoomed in or not
       * example: we get 8.99999998 instead of 9
       */
      const transformValue = Math.abs(event.transform.k - zoomScale);
      if (transformValue < 0.00001) {
        if (event.sourceEvent && event.sourceEvent.type !== "brush") {
          // if the secondary axes have already been rendered then just go back
          if (svg.selectAll("[class*='x-axis-2']").empty()) {
            const x2 = showSecondaryXAxis(svg, x, height);
            if (svg.selectAll(".barGroup-Secondary").empty()) generateBarsMonth(svg, x, x2, y, height, color)
          }
        }
      } else {
        svg.selectAll(".bar")
          .attr("x", function(d) { return xSubgroup(d.key);})
          .attr("width", xSubgroup.bandwidth());
        if (!svg.selectAll(".barGroup-Secondary").empty()) {
          generateBarsYear(svg, x, y, height, color);
          svg.selectAll("[class*='x-axis-2']").remove();
        }
      }
      showDataOnHover(svg);
    }

    return zoom;
  };

  // initially refered to this code https://d3-graph-gallery.com/graph/barplot_grouped_basicWide.html
  const renderChart = () => {
    // set the dimensions and margins of the graph
    const { height, chartWidth, legendWidth, margin } = defineChartDimensions();

    // append the svg object to the body of the page
    const svg = createChartSvg(chartWidth, height, margin);

    const x = addXAxis(svg, xAxisDomainYear, chartWidth, height);

    const y = addYAxis(svg, yRange, height, margin);

    const xDateAxis = addHiddenDateAxis(svg, chartWidth, xAxisDomainYear);

    const xDateAxisReference = xDateAxis.copy();

    addGridLines(svg, y, chartWidth);

    // Another axis for subgroup position
    const xSubgroup = addSubXAxis(x, subgroups);

    // color palette = one color per subgroup
    const color = defineColorPalette(svg);

    // Show the bars
    generateBarsYear(svg, x, y, height, color);

    // Show data on hover
    showDataOnHover(svg);

    // Create legend
    // Add one dot in the legend for each name.
    createLegends(height, legendWidth, margin, color);

    // add zoom
    const zoom = zoomChart(svg, margin, x, xSubgroup, xDateAxis, xDateAxisReference, y, chartWidth, height, color);

    renderBrushChart(chartWidth, margin, zoom);
  };

  const renderBrushChart = (width, margin, zoom) => {
    const height = 70 - margin.top - margin.bottom;

    const svg = createBrushChartSvg(width, height, margin);

    const x = addXAxis(svg, xAxisDomainYear, width, height);

    const y = addYAxisAndAppendBarsArea(svg, x, height);

    // add Monthly axis
    const x2 = showSecondaryXAxis(svg, x, height, false);

    const xSubgroup = addSubXAxis(x2[0], subgroups);

    const color = defineColorPalette(svg);

    generateBarsMonthHelper(svg, x2, y, color, xSubgroup);

    createBrush(svg, height, width, x, zoom);
  }

  useEffect(() => {
    setTimeout(() => { renderChart(); }, 300)
  }, []);

  return (
    <Layer
      full
    >
      <Heading level={4} margin="small" alignSelf="center">Expenditure vs Time 📊</Heading>
      <Box id="chart-wrapper" margin="small" align="center" direction="row" overflow={overflow}>
        <div id="my_dataviz" overflow={overflow}></div>
        <div id="chart_legends" overflow={overflow}></div>
      </Box>
      <Box id="brush-wrapper" margin="small" align="center" direction="row" overflow={overflow}>
          <div id="brush_chart" overflow={overflow}></div>
      </Box>
    </Layer>
  );
};

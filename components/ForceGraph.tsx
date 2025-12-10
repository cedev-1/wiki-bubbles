import React, { useEffect, useRef, useCallback } from 'react';
import * as d3 from 'd3';
import { GraphData, GraphNode, GraphLink } from '../types';

interface ForceGraphProps {
  data: GraphData;
  onNodeClick: (node: GraphNode) => void;
  width: number;
  height: number;
  theme: 'light' | 'dark';
  focusedNodeId?: string | null;
}

const ForceGraph: React.FC<ForceGraphProps> = ({ data, onNodeClick, width, height, theme, focusedNodeId }) => {
  const svgRef = useRef<SVGSVGElement>(null);
  
  // Keep track of simulation and zoom behavior
  const simulationRef = useRef<d3.Simulation<GraphNode, GraphLink> | null>(null);
  const zoomRef = useRef<d3.ZoomBehavior<SVGSVGElement, unknown> | null>(null);

  const initGraph = useCallback(() => {
    if (!svgRef.current) return;

    const svg = d3.select(svgRef.current);
    svg.selectAll("*").remove(); // Clear previous render

    // Define colors based on theme
    const primaryColor = theme === 'light' ? '#000000' : '#ffffff';
    const bgColor = theme === 'light' ? '#ffffff' : '#000000';

    // Zoom behavior
    const g = svg.append("g");
    const zoom = d3.zoom<SVGSVGElement, unknown>()
      .scaleExtent([0.05, 4]) // Allow zooming out further for large graphs
      .on("zoom", (event) => {
        g.attr("transform", event.transform);
      });
    
    zoomRef.current = zoom;
    svg.call(zoom);

    // Create a deep copy of data to prevent D3 from mutating React state directly
    const nodes: GraphNode[] = data.nodes.map(d => ({ ...d }));
    const links: GraphLink[] = data.links.map(d => ({ ...d }));

    const nodeCount = nodes.length;

    // Dynamic Physics Calculation
    // If many nodes, increase distance and repulsion to create an "airy" layout
    const isHighCount = nodeCount > 100;
    
    // Base distance increases with node count to give room on the circumference
    // Formula approximation: 100 base + 0.8 unit per node, capped at 600
    const dynamicLinkDistance = Math.min(600, 100 + (nodeCount * 0.8));

    // Repulsion strength increases (more negative) to push nodes apart
    // Formula approximation: -300 base - 3 units per node, capped at -2000
    const dynamicChargeStrength = Math.max(-2000, -300 - (nodeCount * 3));

    const simulation = d3.forceSimulation(nodes)
      .force("link", d3.forceLink(links).id((d: any) => d.id).distance(dynamicLinkDistance)) 
      .force("charge", d3.forceManyBody().strength(dynamicChargeStrength)) 
      .force("center", d3.forceCenter(width / 2, height / 2))
      .force("collide", d3.forceCollide().radius(40).iterations(2)); // Increased radius and iterations to prevent overlap

    simulationRef.current = simulation;

    // Define Arrowhead
    svg.append("defs").selectAll("marker")
      .data(["end"])
      .enter().append("marker")
      .attr("id", "arrow")
      .attr("viewBox", "0 -5 10 10")
      .attr("refX", 25) 
      .attr("refY", 0)
      .attr("markerWidth", 6)
      .attr("markerHeight", 6)
      .attr("orient", "auto")
      .append("path")
      .attr("d", "M0,-5L10,0L0,5")
      .attr("fill", primaryColor);

    const link = g.append("g")
      .attr("stroke", primaryColor)
      .attr("stroke-opacity", theme === 'light' ? 0.4 : 0.2) 
      .selectAll("line")
      .data(links)
      .join("line")
      .attr("stroke-width", 1);

    const node = g.append("g")
      .selectAll("g")
      .data(nodes)
      .join("g")
      .attr("cursor", "pointer")
      .call(d3.drag<any, any>()
        .on("start", dragstarted)
        .on("drag", dragged)
        .on("end", dragended)
      )
      .on("click", (event, d) => {
        if (event.defaultPrevented) return;
        onNodeClick(d);
      });

    // Node Circle
    node.append("circle")
      .attr("r", (d) => d.val ? Math.max(20, d.val * 5) : 20) 
      .attr("fill", bgColor)
      .attr("stroke", primaryColor)
      .attr("stroke-width", 1.5)
      .transition().duration(500)
      .attr("r", 25); 

    // Node Text
    node.append("text")
      .attr("dy", 45) 
      .attr("text-anchor", "middle")
      .text(d => d.id)
      .attr("fill", primaryColor)
      .attr("font-size", "10px")
      .attr("font-family", "Inter, sans-serif")
      .style("pointer-events", "none") 
      .style("text-transform", "uppercase")
      .style("letter-spacing", "1px");

    // Icons or initials inside bubble
    node.append("text")
        .attr("dy", 4)
        .attr("text-anchor", "middle")
        .text(d => d.id.substring(0, 2).toUpperCase())
        .attr("font-size", "10px")
        .attr("fill", primaryColor)
        .style("pointer-events", "none");


    simulation.on("tick", () => {
      link
        .attr("x1", (d: any) => d.source.x)
        .attr("y1", (d: any) => d.source.y)
        .attr("x2", (d: any) => d.target.x)
        .attr("y2", (d: any) => d.target.y);

      node
        .attr("transform", (d: any) => `translate(${d.x},${d.y})`);
    });

    function dragstarted(event: any, d: any) {
      if (!event.active) simulation.alphaTarget(0.3).restart();
      d.fx = d.x;
      d.fy = d.y;
    }

    function dragged(event: any, d: any) {
      d.fx = event.x;
      d.fy = event.y;
    }

    function dragended(event: any, d: any) {
      if (!event.active) simulation.alphaTarget(0);
      d.fx = null;
      d.fy = null;
    }

    // Auto-zoom out if huge graph to show the whole structure
    if (isHighCount && zoomRef.current) {
         // Start zoom transition to center and fit content better
         // Using a timeout to ensure simulation has spread out a bit
         setTimeout(() => {
            if (svgRef.current && zoomRef.current) {
                d3.select(svgRef.current)
                  .transition().duration(2000)
                  .call(zoomRef.current.transform, 
                        d3.zoomIdentity.translate(width/2, height/2).scale(0.2).translate(-width/2, -height/2));
            }
         }, 100);
    }

  }, [data, onNodeClick, width, height, theme]);

  // Initial render
  useEffect(() => {
    initGraph();
    return () => {
      simulationRef.current?.stop();
    };
  }, [initGraph]);

  // Handle Focus Zoom
  useEffect(() => {
    if (!focusedNodeId || !simulationRef.current || !svgRef.current || !zoomRef.current) return;
    
    // Find the node in the CURRENT simulation (which has the updated x/y coordinates)
    const node = simulationRef.current.nodes().find(n => n.id === focusedNodeId);
    
    if (node && node.x !== undefined && node.y !== undefined) {
      const svg = d3.select(svgRef.current);
      const scale = 1.2; // Comfortable zoom level
      
      // Calculate transform to center the node
      const transform = d3.zoomIdentity
        .translate(width / 2 - node.x * scale, height / 2 - node.y * scale)
        .scale(scale);

      svg.transition()
        .duration(1000) // Smooth flight
        .call(zoomRef.current.transform, transform);
    }
  }, [focusedNodeId, width, height]);

  return (
    <svg 
      ref={svgRef} 
      width={width} 
      height={height} 
      className={`w-full h-full block transition-colors duration-500 ${theme === 'light' ? 'bg-white' : 'bg-black'}`}
      style={{ cursor: 'grab' }}
    />
  );
};

export default ForceGraph;
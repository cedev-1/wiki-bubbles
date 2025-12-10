import * as d3 from 'd3';

export type Language = 'en' | 'fr';

export interface GraphNode extends d3.SimulationNodeDatum {
  id: string;
  group?: number;
  val?: number; // Influence size
}

export interface GraphLink extends d3.SimulationLinkDatum<GraphNode> {
  source: string | GraphNode;
  target: string | GraphNode;
}

export interface GraphData {
  nodes: GraphNode[];
  links: GraphLink[];
}

export interface WikiSearchResult {
  title: string;
  snippet: string;
}

export enum AppState {
  IDLE,
  LOADING,
  VIEWING,
  ERROR
}
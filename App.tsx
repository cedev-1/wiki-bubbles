import React, { useState, useEffect, useCallback, useRef } from 'react';
import { getArticleLinks, extractTitleFromUrl, getWikiUrl, getWikiSummary, getBatchTranslations } from './services/wikiService';
import ForceGraph from './components/ForceGraph';
import { GraphData, GraphNode, AppState, Language } from './types';

const translations = {
    en: {
        title: "WIKI BUBBLES",
        subtitle: "Minimalist Knowledge Explorer",
        placeholder: "Enter a Wikipedia URL...",
        explore: "Explore",
        reset: "Reset",
        index: "Index",
        filter: "Filter...",
        noResults: "No results.",
        analyzing: "Analyzing connections...",
        loadingInfo: "Loading info...",
        readArticle: "Read Article",
        expand: "Expand",
        tipsNav: "Click a bubble to navigate",
        tipsZoom: "Zoom/Scroll to explore",
        errorInvalid: "The URL seems invalid or does not come from Wikipedia.",
        errorFetch: "Error fetching data.",
        errorSummary: "No summary available.",
        close: "Close",
        translating: "Translating topic..."
    },
    fr: {
        title: "WIKI BUBBLES",
        subtitle: "Explorer wikipédia avec des bulles",
        placeholder: "Entrez une URL Wikipédia...",
        explore: "Explorer",
        reset: "Réinitialiser",
        index: "Index",
        filter: "Filtrer...",
        noResults: "Aucun résultat.",
        analyzing: "Analyse des connexions...",
        loadingInfo: "Chargement des infos...",
        readArticle: "Lire l'article",
        expand: "Étendre",
        tipsNav: "Cliquez sur une bulle pour naviguer",
        tipsZoom: "Zoom/Scroll pour explorer",
        errorInvalid: "L'URL semble invalide ou ne provient pas de Wikipédia.",
        errorFetch: "Erreur lors de la récupération des données.",
        errorSummary: "Aucun résumé disponible.",
        close: "Fermer",
        translating: "Traduction du sujet..."
    }
};

const App: React.FC = () => {
  const [inputUrl, setInputUrl] = useState('');
  const [appState, setAppState] = useState<AppState>(AppState.IDLE);
  const [graphData, setGraphData] = useState<GraphData>({ nodes: [], links: [] });
  const [selectedNode, setSelectedNode] = useState<GraphNode | null>(null);
  const [summary, setSummary] = useState<string>('');
  const [loadingSummary, setLoadingSummary] = useState(false);
  const [dimensions, setDimensions] = useState({ width: window.innerWidth, height: window.innerHeight });
  const [errorMsg, setErrorMsg] = useState('');
  const [theme, setTheme] = useState<'light' | 'dark'>('light');
  const [lang, setLang] = useState<Language>('en'); // Language state
  
  const measureRef = useRef<HTMLSpanElement>(null);
  const [inputWidth, setInputWidth] = useState(0);
  
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [menuSearch, setMenuSearch] = useState('');
  const [focusedNodeId, setFocusedNodeId] = useState<string | null>(null);

  const t = translations[lang];

  useEffect(() => {
    if (measureRef.current) {
        setInputWidth(measureRef.current.offsetWidth);
    }
  }, [inputUrl, t.placeholder, lang, appState]);

  useEffect(() => {
    const handleResize = () => setDimensions({ width: window.innerWidth, height: window.innerHeight });
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const toggleTheme = () => {
    setTheme(prev => prev === 'light' ? 'dark' : 'light');
  };

  const loadGraphData = async (title: string, language: Language) => {
    setAppState(AppState.LOADING);
    setSelectedNode(null);
    setSummary('');
    setIsMenuOpen(false); 

    try {
      const links = await getArticleLinks(title, language);
      
      const newNodes = [
        { id: title, val: 2 },
        ...links.map(link => ({ id: link, val: 1 }))
      ];

      const newLinks = links.map(link => ({
        source: title,
        target: link
      }));

      setGraphData({
        nodes: newNodes,
        links: newLinks
      });
      setAppState(AppState.VIEWING);
    } catch (err) {
      console.error(err);
      setAppState(AppState.ERROR);
      setErrorMsg(t.errorFetch);
    }
  };

  const toggleLang = async () => {
      const targetLang = lang === 'en' ? 'fr' : 'en';
      
      if (appState === AppState.VIEWING && graphData.nodes.length > 0) {
          setAppState(AppState.LOADING); 
          
          try {
              const allNodeIds = graphData.nodes.map(n => n.id);
              
              const translationMap = await getBatchTranslations(allNodeIds, lang, targetLang);
              
              const newNodes = graphData.nodes.map(node => ({
                  ...node,
                  id: translationMap[node.id] || node.id,
                  x: undefined, y: undefined, vx: undefined, vy: undefined, index: undefined
              }));

              const newLinks = graphData.links.map(link => {
                  const sourceId = typeof link.source === 'object' ? (link.source as GraphNode).id : link.source as string;
                  const targetId = typeof link.target === 'object' ? (link.target as GraphNode).id : link.target as string;

                  return {
                      source: translationMap[sourceId] || sourceId,
                      target: translationMap[targetId] || targetId
                  };
              });
              
              setLang(targetLang);
              setGraphData({ nodes: newNodes, links: newLinks });

              if (newNodes.length > 0) {
                  const newRootTitle = newNodes[0].id; // Assuming first node is root
                  setInputUrl(getWikiUrl(newRootTitle, targetLang));
              }

              setSelectedNode(null);
              setAppState(AppState.VIEWING);

          } catch (e) {
              console.error("Translation failed, switching language anyway", e);
              setLang(targetLang);
              setAppState(AppState.VIEWING);
          }
      } else {
          setLang(targetLang);
      }
  };

  const handleSearch = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    
    const title = extractTitleFromUrl(inputUrl);
    if (!title) {
      setErrorMsg(t.errorInvalid);
      return;
    }
    setErrorMsg('');
    
    await loadGraphData(title, lang);
  };

  const handleNodeClick = useCallback(async (node: GraphNode) => {
    setSelectedNode(node);
    setLoadingSummary(true);
    setSummary(''); 

    try {
      const summaryText = await getWikiSummary(node.id, lang);
      setSummary(summaryText || t.errorSummary);
    } catch (e) {
      console.error(e);
      setSummary(t.errorSummary);
    } finally {
        setLoadingSummary(false);
    }
  }, [lang, t.errorSummary]);

  const handleExpandNode = useCallback(async () => {
    if (!selectedNode) return;

    try {
        const newLinksData = await getArticleLinks(selectedNode.id, lang);
        setGraphData(prevData => {
            const existingNodeIds = new Set(prevData.nodes.map(n => n.id));
            
            const getId = (n: string | GraphNode) => (typeof n === 'string' ? n : n.id);
            const existingLinkKeys = new Set(prevData.links.map(l => `${getId(l.source)}-${getId(l.target)}`));

            const nodesToAdd = newLinksData
                .filter(id => !existingNodeIds.has(id))
                .map(id => ({ id, val: 1 }));

            const linksToAdd = newLinksData.map(targetId => ({
                source: selectedNode.id,
                target: targetId
            })).filter(l => !existingLinkKeys.has(`${l.source}-${l.target}`));

            const safeNodesToAdd = nodesToAdd; 
            const safeLinksToAdd = linksToAdd.filter(l => safeNodesToAdd.some(n => n.id === l.target as string) || existingNodeIds.has(l.target as string));

            if (safeNodesToAdd.length === 0) return prevData;

            return {
                nodes: [...prevData.nodes, ...safeNodesToAdd],
                links: [...prevData.links, ...safeLinksToAdd]
            };
        });
    } catch (err) {
        console.error("Failed to expand graph", err);
    }
  }, [selectedNode, lang]);

  const reset = () => {
    setInputUrl('');
    setAppState(AppState.IDLE);
    setGraphData({ nodes: [], links: [] });
    setSelectedNode(null);
  };

  const openWikiPage = () => {
      if (selectedNode) {
          window.open(getWikiUrl(selectedNode.id, lang), '_blank');
      }
  };

  const bgClass = theme === 'light' ? 'bg-white text-black' : 'bg-black text-white';
  const borderClass = theme === 'light' ? 'border-black' : 'border-white';
  const headerBgClass = theme === 'light' ? 'bg-white/90' : 'bg-black/90';
  const panelBgClass = theme === 'light' ? 'bg-white shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]' : 'bg-black shadow-[4px_4px_0px_0px_rgba(255,255,255,1)]';
  const buttonPrimaryClass = theme === 'light' 
    ? 'bg-black text-white hover:bg-white hover:text-black' 
    : 'bg-white text-black hover:bg-black hover:text-white';
  const buttonSecondaryClass = theme === 'light'
    ? 'bg-white text-black hover:bg-gray-50'
    : 'bg-black text-white hover:bg-gray-900';

  const getMaxInputWidth = () => {
      if (appState === AppState.IDLE) return dimensions.width - 40;
      const reservedSpace = dimensions.width < 768 ? 140 : 250;
      return Math.max(100, dimensions.width - reservedSpace);
  };

  return (
    <div className={`relative w-full h-screen overflow-hidden font-light transition-colors duration-500 selection:bg-gray-500 selection:text-white ${bgClass}`}>
      
      {/* Hidden Span for measuring input width */}
      <span 
        ref={measureRef} 
        className="absolute opacity-0 pointer-events-none text-lg md:text-xl font-light whitespace-pre -z-50 left-0 top-0"
        style={{ visibility: 'hidden' }}
      >
        {inputUrl || t.placeholder}
      </span>

      {/* Header */}
      <div className={`absolute top-0 left-0 w-full z-20 transition-all duration-500 ease-in-out ${appState === AppState.IDLE ? 'h-screen flex items-center justify-center' : `h-16 border-b ${borderClass} ${headerBgClass} backdrop-blur-sm`}`}>
        
        <div className={`w-full max-w-2xl px-4 md:px-6 transition-all duration-500 ${appState === AppState.IDLE ? 'scale-100 flex flex-col items-center' : 'flex items-center justify-between'}`}>
          
          <div className={appState === AppState.IDLE ? "text-center mb-8" : "hidden"}>
             <h1 className="text-4xl md:text-6xl font-thin tracking-tighter mb-4">{t.title}</h1>
             <p className={`text-xs md:text-sm uppercase tracking-widest ${theme === 'light' ? 'text-gray-500' : 'text-gray-400'}`}>{t.subtitle}</p>
          </div>

          <form onSubmit={handleSearch} className={`relative flex items-center transition-all duration-300 ${borderClass} ${appState === AppState.IDLE ? 'border-b-2' : 'border-b mr-auto'}`}>
            <input
              type="text"
              value={inputUrl}
              onChange={(e) => setInputUrl(e.target.value)}
              placeholder={t.placeholder}
              style={{ 
                  width: inputWidth ? `${Math.min(inputWidth, getMaxInputWidth())}px` : 'auto', 
                  maxWidth: '100%' 
              }}
              className={`bg-transparent py-2 md:py-3 text-base md:text-xl outline-none font-light truncate ${theme === 'light' ? 'placeholder:text-gray-300' : 'placeholder:text-gray-600'}`}
            />
          </form>

          {/* Desktop Reset Button */}
          {appState !== AppState.IDLE && (
            <button onClick={reset} className={`hidden md:block uppercase text-[10px] md:text-xs tracking-widest border px-3 py-2 transition-colors ml-2 md:ml-4 ${borderClass} ${buttonPrimaryClass}`}>
              {t.reset}
            </button>
          )}
        </div>
      </div>

      {/* Controls */}
      <div className={`
        fixed z-50 flex gap-2 transition-all duration-500
        bottom-6 left-6 
        md:absolute md:top-4 md:right-6 md:bottom-auto md:left-auto md:flex-row
        ${selectedNode && dimensions.width < 768 ? 'opacity-0 pointer-events-none' : 'opacity-100'}
      `}>
         
         <button 
            onClick={toggleLang} 
            className={`uppercase text-[10px] md:text-xs tracking-widest border px-2 md:px-3 py-1 transition-colors ${borderClass} hover:opacity-70 ${buttonSecondaryClass}`}
            title="Switch Language"
         >
            {lang === 'en' ? 'FR' : 'EN'}
         </button>
         <button 
            onClick={toggleTheme} 
            className={`uppercase text-[10px] md:text-xs tracking-widest border px-2 md:px-3 py-1 transition-colors ${borderClass} hover:opacity-70 ${buttonSecondaryClass}`}
            title="Switch Theme"
         >
            {theme === 'light' ? 'Dark' : 'Light'}
         </button>
      </div>

      {/* Mobile Reset Button (Bottom Right) */}
      {appState === AppState.VIEWING && !selectedNode && (
         <button 
            onClick={reset} 
            className={`md:hidden fixed bottom-6 right-6 z-50 uppercase text-[10px] tracking-widest border px-3 py-2 transition-colors ${borderClass} ${buttonPrimaryClass}`}
         >
            {t.reset}
         </button>
      )}

      {/* Error Message */}
      {errorMsg && (
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 text-center z-50 w-full px-4">
           <p className="text-red-600 border-b border-red-600 pb-1 inline-block">{errorMsg}</p>
           <div className="mt-4">
            <button onClick={() => setErrorMsg('')} className="text-xs underline">{t.close}</button>
           </div>
        </div>
      )}

      {/* Main Canvas */}
      {appState === AppState.VIEWING && (
        <div className="w-full h-full animate-in fade-in duration-1000">
           <ForceGraph 
                data={graphData} 
                onNodeClick={handleNodeClick} 
                width={dimensions.width} 
                height={dimensions.height} 
                theme={theme}
           />
        </div>
      )}

      {/* Loading State */}
      {appState === AppState.LOADING && (
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 flex flex-col items-center">
              <div className={`w-12 h-12 border-2 ${borderClass} border-t-transparent rounded-full animate-spin mb-4`}></div>
              <p className="uppercase tracking-widest text-xs animate-pulse">{t.analyzing}</p>
          </div>
      )}

      {/* Info Panel */}
      {selectedNode && (
        <div className={`absolute bottom-6 left-6 md:bottom-10 md:left-10 z-30 w-[calc(100%-48px)] md:w-[400px] border ${borderClass} p-6 ${panelBgClass}`}>
            <div className="flex justify-between items-start mb-4">
                <h2 className="text-xl md:text-2xl font-light leading-none truncate pr-4">{selectedNode.id}</h2>
                <button onClick={() => setSelectedNode(null)} className="text-xl leading-none hover:rotate-90 transition-transform">&times;</button>
            </div>
            
            <div className={`min-h-[60px] text-xs md:text-sm leading-relaxed mb-6 max-h-[200px] overflow-y-auto ${theme === 'light' ? 'text-gray-800' : 'text-gray-300'}`}>
                {loadingSummary ? (
                    <span className="animate-pulse">{t.loadingInfo}</span>
                ) : (
                    summary
                )}
            </div>

            <div className="flex gap-3">
                <button 
                    onClick={openWikiPage}
                    className={`flex-1 py-3 text-[10px] md:text-xs uppercase tracking-widest border ${borderClass} transition-colors ${buttonPrimaryClass}`}
                >
                    {t.readArticle}
                </button>
                 <button 
                    className={`flex-1 py-3 text-[10px] md:text-xs uppercase tracking-widest border ${borderClass} transition-colors ${buttonSecondaryClass}`}
                    onClick={handleExpandNode}
                >
                    {t.expand}
                </button>
            </div>
        </div>
      )}

      {/* Tips */}
      {appState === AppState.VIEWING && !selectedNode && (
          <div className="absolute bottom-6 right-6 text-right pointer-events-none opacity-50 hidden md:block">
              <p className="text-xs uppercase tracking-widest">{t.tipsNav}</p>
              <p className="text-xs uppercase tracking-widest">{t.tipsZoom}</p>
          </div>
      )}

      {/* Copyright */}
      <div className="absolute bottom-4 left-4 text-xs opacity-50 pointer-events-none">
          All rights reserved © cedev-1
      </div>

    </div>
  );
};

export default App;
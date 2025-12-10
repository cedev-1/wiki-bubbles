import { Language } from '../types';

const getApiUrl = (lang: Language) => `https://${lang}.wikipedia.org/w/api.php`;

export const getArticleLinks = async (title: string, lang: Language): Promise<string[]> => {
  try {
    const params = new URLSearchParams({
      action: 'query',
      titles: title,
      prop: 'links',
      pllimit: 'max',
      plnamespace: '0',
      format: 'json',
      origin: '*'
    });

    const response = await fetch(`${getApiUrl(lang)}?${params.toString()}`);
    const data = await response.json();
    
    const pages = data.query?.pages;
    if (!pages) return [];

    const pageId = Object.keys(pages)[0];
    if (pageId === '-1') return [];

    const links = pages[pageId].links || [];

    return links.map((link: any) => link.title);
  } catch (error) {
    console.error("Error fetching wiki links:", error);
    return [];
  }
};

export const getWikiSummary = async (title: string, lang: Language): Promise<string> => {
    try {
        const params = new URLSearchParams({
            action: 'query',
            format: 'json',
            prop: 'extracts',
            titles: title,
            exintro: 'true',
            explaintext: 'true',
            redirects: '1',
            origin: '*'
        });

        const response = await fetch(`${getApiUrl(lang)}?${params.toString()}`);
        const data = await response.json();
        const pages = data.query?.pages;
        if (!pages) return "";

        const pageId = Object.keys(pages)[0];
        if (pageId === '-1') return "";

        const extract = pages[pageId].extract;

        if (!extract) return "";
        
        return extract.length > 350 ? extract.substring(0, 350) + "..." : extract;
    } catch (error) {
        console.error("Error fetching summary", error);
        return "";
    }
}

export const getTranslatedTitle = async (title: string, sourceLang: Language, targetLang: Language): Promise<string | null> => {
  try {
    const params = new URLSearchParams({
      action: 'query',
      titles: title,
      prop: 'langlinks',
      lllang: targetLang,
      format: 'json',
      origin: '*'
    });

    const response = await fetch(`${getApiUrl(sourceLang)}?${params.toString()}`);
    const data = await response.json();
    
    const pages = data.query?.pages;
    if (!pages) return null;

    const pageId = Object.keys(pages)[0];
    if (pageId === '-1' || !pages[pageId].langlinks) return null;

    return pages[pageId].langlinks[0]['*'];
  } catch (error) {
    console.error("Error fetching translation:", error);
    return null;
  }
};

export const getBatchTranslations = async (titles: string[], sourceLang: Language, targetLang: Language): Promise<Record<string, string>> => {
  if (titles.length === 0) return {};

  const translations: Record<string, string> = {};
  const uniqueTitles = Array.from(new Set(titles));
  const chunkSize = 50;
  
  for (let i = 0; i < uniqueTitles.length; i += chunkSize) {
    const chunk = uniqueTitles.slice(i, i + chunkSize);
    const titlesParam = chunk.join('|');
    
    try {
      const params = new URLSearchParams({
        action: 'query',
        titles: titlesParam,
        prop: 'langlinks',
        lllang: targetLang,
        format: 'json',
        origin: '*',
        lllimit: 'max'
      });

      const response = await fetch(`${getApiUrl(sourceLang)}?${params.toString()}`);
      const data = await response.json();
      const pages = data.query?.pages;

      if (pages) {
        Object.values(pages).forEach((page: any) => {
          if (page.langlinks && page.langlinks.length > 0) {
            translations[page.title] = page.langlinks[0]['*'];
          }
        });
      }
    } catch (e) {
      console.error("Error batch translating:", e);
    }
  }
  
  return translations;
};

export const extractTitleFromUrl = (url: string): string | null => {
  try {
    const urlObj = new URL(url);
    if (!urlObj.hostname.includes('wikipedia.org')) return null;
    
    const parts = urlObj.pathname.split('/');
    const titlePart = parts[parts.length - 1];
    return decodeURIComponent(titlePart).replace(/_/g, ' ');
  } catch (e) {
    if (!url.startsWith('http')) return url;
    return null;
  }
};

export const getWikiUrl = (title: string, lang: Language): string => {
    return `https://${lang}.wikipedia.org/wiki/${encodeURIComponent(title.replace(/ /g, '_'))}`;
}
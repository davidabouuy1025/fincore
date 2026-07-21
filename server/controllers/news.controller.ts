import { Request, Response } from "express";
import { 
  loadNewsDb, 
  saveNewsDb, 
  crawlKeywordRSS, 
  scrapeArticleText, 
  deduplicateArticles, 
  rankAndFilterRecommended,
  Article 
} from "../news_service";

export class NewsController {
  getState = async (req: Request, res: Response) => {
    try {
      const state = loadNewsDb();
      const deduped = deduplicateArticles(state.articles);
      const ranked = rankAndFilterRecommended(deduped, state.keywords, state.clicks);
      return res.json({
        success: true,
        keywords: state.keywords,
        articles: ranked,
      });
    } catch (err: any) {
      return res.status(500).json({ error: err.message });
    }
  };

  refresh = async (req: Request, res: Response) => {
    try {
      const state = loadNewsDb();
      console.log("[NEWS SERVICE] Starting background keyword scrape...");
      const allNewArticles: Article[] = [];

      for (const kw of state.keywords) {
        const results = await crawlKeywordRSS(kw);
        allNewArticles.push(...results);
      }

      const articleMap = new Map<string, Article>();
      state.articles.forEach((art) => articleMap.set(art.id, art));

      allNewArticles.forEach((art) => {
        const existing = articleMap.get(art.id);
        if (existing) {
          const mergedKws = Array.from(new Set([...existing.matchedKeywords, ...art.matchedKeywords]));
          articleMap.set(art.id, { ...existing, matchedKeywords: mergedKws });
        } else {
          articleMap.set(art.id, art);
        }
      });

      state.articles = Array.from(articleMap.values());
      saveNewsDb(state);

      const deduped = deduplicateArticles(state.articles);
      const ranked = rankAndFilterRecommended(deduped, state.keywords, state.clicks);
      return res.json({ success: true, articles: ranked });
    } catch (err: any) {
      return res.status(500).json({ error: err.message });
    }
  };

  updateKeywords = async (req: Request, res: Response) => {
    try {
      const { keywords } = req.body;
      if (!Array.isArray(keywords)) {
        return res.status(400).json({ error: "Keywords must be an array" });
      }

      const state = loadNewsDb();
      state.keywords = keywords;
      saveNewsDb(state);

      const deduped = deduplicateArticles(state.articles);
      const ranked = rankAndFilterRecommended(deduped, state.keywords, state.clicks);
      return res.json({ success: true, keywords: state.keywords, articles: ranked });
    } catch (err: any) {
      return res.status(500).json({ error: err.message });
    }
  };

  trackClick = async (req: Request, res: Response) => {
    try {
      const { title } = req.body;
      if (!title) {
        return res.status(400).json({ error: "No title provided" });
      }

      const state = loadNewsDb();
      if (!state.clicks.includes(title)) {
        state.clicks.push(title);
        if (state.clicks.length > 50) {
          state.clicks.shift();
        }
        saveNewsDb(state);
      }
      return res.json({ success: true });
    } catch (err: any) {
      return res.status(500).json({ error: err.message });
    }
  };

  scrapeFull = async (req: Request, res: Response) => {
    try {
      const { id, url, title } = req.body;
      if (!url) {
        return res.status(400).json({ error: "No url provided" });
      }

      const state = loadNewsDb();
      const art = state.articles.find((a) => a.id === id);

      if (art && art.fullContent) {
        return res.json({ success: true, fullContent: art.fullContent });
      }

      const extractedContent = await scrapeArticleText(url, title);

      if (art) {
        art.fullContent = extractedContent;
        saveNewsDb(state);
      }

      return res.json({ success: true, fullContent: extractedContent });
    } catch (err: any) {
      return res.status(500).json({ error: err.message });
    }
  };
}

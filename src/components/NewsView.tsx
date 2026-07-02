import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "motion/react";
import { 
  Search, 
  RefreshCw, 
  Sparkles, 
  BookOpen, 
  Hash, 
  ExternalLink, 
  Clock, 
  FileText, 
  ChevronLeft, 
  ChevronRight, 
  Plus, 
  Trash2, 
  CheckCircle, 
  AlertTriangle 
} from "lucide-react";

export interface Article {
  id: string;
  title: string;
  description?: string;
  fullContent?: string;
  sourceName: string;
  sourceUrl: string;
  publishedTimestamp: string;
  matchedKeywords: string[];
  contentType: "News" | "Announcement" | "Social Post" | "Blog";
  sources?: { name: string; url: string }[];
}

export interface NewsState {
  keywords: string[];
  clicks: string[];
  articles: Article[];
}

export function NewsView() {
  const [newsState, setNewsState] = useState<NewsState>({
    keywords: [],
    clicks: [],
    articles: [],
  });
  
  // Tabs: 'recommended' | 'saved' | 'all'
  const [activeTab, setActiveTab] = useState<"recommended" | "saved" | "all">("all");
  
  // Filter by specific keyword inside "Saved Keywords" tab
  const [selectedKeywordFilter, setSelectedKeywordFilter] = useState<string | null>(null);
  
  // Search query state
  const [searchQuery, setSearchQuery] = useState("");
  
  // Keyword management state
  const [newKeywordInput, setNewKeywordInput] = useState("");
  const [keywordError, setKeywordError] = useState<string | null>(null);
  const [keywordSuccessMessage, setKeywordSuccessMessage] = useState<string | null>(null);
  const [isSavingKeywords, setIsSavingKeywords] = useState(false);
  const [tempKeywords, setTempKeywords] = useState<string[]>([]);

  // Page loading & scraping state
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isLoadingState, setIsLoadingState] = useState(true);
  
  // Pagination state (10 articles per page as specified)
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  // Selected article for Detail Mode
  const [selectedArticle, setSelectedArticle] = useState<Article | null>(null);
  const [isFetchingFullContent, setIsFetchingFullContent] = useState(false);
  const [fullArticleContent, setFullArticleContent] = useState<string>("");

  // Load state on mount
  useEffect(() => {
    fetchNewsState();
  }, []);

  const fetchNewsState = async () => {
    setIsLoadingState(true);
    try {
      const res = await fetch("/api/news/state");
      if (res.ok) {
        const data: NewsState = await res.json();
        setNewsState(data);
        setTempKeywords(data.keywords || []);
      }
    } catch (err) {
      console.error("[NEWS VIEW] Failed to load news state:", err);
    } finally {
      setIsLoadingState(false);
    }
  };

  const handleRefresh = async () => {
    setIsRefreshing(true);
    try {
      const res = await fetch("/api/news/refresh", { method: "POST" });
      if (res.ok) {
        const data = await res.json();
        if (data.success) {
          // Re-fetch database stats
          await fetchNewsState();
        }
      }
    } catch (err) {
      console.error("[NEWS VIEW] Refresh failed:", err);
    } finally {
      setIsRefreshing(false);
    }
  };

  const handleAddKeyword = () => {
    setKeywordError(null);
    setKeywordSuccessMessage(null);
    const kw = newKeywordInput.trim();
    if (!kw) return;

    if (tempKeywords.some(k => k.toLowerCase() === kw.toLowerCase())) {
      setKeywordError("Keyword already exists locally.");
      return;
    }

    if (tempKeywords.length >= 10) {
      setKeywordError("Maximum limit of 10 keywords reached.");
      return;
    }

    setTempKeywords([...tempKeywords, kw]);
    setNewKeywordInput("");
  };

  const handleRemoveKeyword = (indexToRemove: number) => {
    setKeywordError(null);
    setKeywordSuccessMessage(null);
    const filtered = tempKeywords.filter((_, idx) => idx !== indexToRemove);
    setTempKeywords(filtered);
    if (selectedKeywordFilter === tempKeywords[indexToRemove]) {
      setSelectedKeywordFilter(null);
    }
  };

  const handleSaveKeywords = async () => {
    setIsSavingKeywords(true);
    setKeywordError(null);
    setKeywordSuccessMessage(null);
    try {
      const res = await fetch("/api/news/keywords", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ keywords: tempKeywords })
      });
      if (res.ok) {
        const data = await res.json();
        if (data.success) {
          setKeywordSuccessMessage("Keywords saved successfully.");
          // Update global state and automatically refresh news content
          setNewsState(prev => ({ ...prev, keywords: tempKeywords }));
          handleRefresh();
        }
      } else {
        setKeywordError("Failed to save keywords to database.");
      }
    } catch (err) {
      setKeywordError("Error saving keywords.");
    } finally {
      setIsSavingKeywords(false);
    }
  };

  // Click tracking and Full scrape
  const handleOpenArticle = async (art: Article) => {
    setSelectedArticle(art);
    setFullArticleContent(art.fullContent || "");
    setIsFetchingFullContent(true);

    try {
      // 1. Log click tracking for recommended ranking boosters
      await fetch("/api/news/click", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title: art.title })
      });

      // 2. Fetch or Scrape full content on-demand
      const res = await fetch("/api/news/scrape-full", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: art.id, url: art.sourceUrl, title: art.title })
      });
      if (res.ok) {
        const data = await res.json();
        if (data.success) {
          setFullArticleContent(data.fullContent || "No content returned.");
          // Update locally
          setNewsState(prev => ({
            ...prev,
            articles: prev.articles.map(a => a.id === art.id ? { ...a, fullContent: data.fullContent } : a)
          }));
        }
      }
    } catch (err) {
      console.error("[NEWS VIEW] Failed to complete full scrape:", err);
    } finally {
      setIsFetchingFullContent(false);
    }
  };

  // Helper score to classify: "Recommended", "Saved Match", "General"
  const getArticleBadge = (art: Article): "Recommended" | "Saved Match" | "General" => {
    const keywordSet = new Set<string>(newsState.keywords.map(k => String(k).toLowerCase()));
    
    // Check if it matches any active saved keywords
    let matchesKeyword = art.matchedKeywords.some(k => keywordSet.has(String(k).toLowerCase()));
    if (!matchesKeyword) {
      // fall back scan
      const titleLower = art.title.toLowerCase();
      const descLower = (art.description || "").toLowerCase();
      matchesKeyword = Array.from(keywordSet).some((kw: string) => titleLower.includes(String(kw)) || descLower.includes(String(kw)));
    }

    // Recommended boosts based on clicks
    const clickTitleWords = new Set<string>(
      newsState.clicks.flatMap((c: string) => String(c).toLowerCase().split(/\s+/)).filter((w: string) => w.length > 3)
    );
    let hasClickMatch = false;
    for (const word of Array.from(clickTitleWords)) {
      if (art.title.toLowerCase().includes(String(word))) {
        hasClickMatch = true;
        break;
      }
    }

    if (hasClickMatch && matchesKeyword) {
      return "Recommended";
    } else if (matchesKeyword) {
      return "Saved Match";
    }
    return "General";
  };

  // Filter & Search & Ranking Implementation
  const getProcessedArticles = (): Article[] => {
    let result = [...newsState.articles];

    // 1. Search filter: Exact keyword-based matching preferred
    if (searchQuery.trim()) {
      const sq = searchQuery.toLowerCase().trim();
      result = result.filter(art => {
        const matchesTitle = art.title.toLowerCase().includes(sq);
        const matchesDesc = (art.description || "").toLowerCase().includes(sq);
        const matchesContent = (art.fullContent || "").toLowerCase().includes(sq);
        const matchesSources = (art.sources || []).some(s => s.name.toLowerCase().includes(sq));
        return matchesTitle || matchesDesc || matchesContent || matchesSources;
      });
    }

    // 2. Tab filtering and sorting
    if (activeTab === "recommended") {
      // Score and sort
      const keywordSet = new Set<string>(newsState.keywords.map(k => String(k).toLowerCase()));
      const clickWords = new Set<string>(newsState.clicks.flatMap((c: string) => String(c).toLowerCase().split(/\s+/)).filter((w: string) => w.length > 3));

      const scored = result.map(art => {
        let score = 0;
        const lowerTitle = art.title.toLowerCase();
        const lowerDesc = (art.description || "").toLowerCase();

        // Saved keyword matches get heavy weights
        keywordSet.forEach((kw: string) => {
          if (lowerTitle.includes(String(kw))) score += 10;
          if (lowerDesc.includes(String(kw))) score += 5;
        });

        // Reading history clicks
        clickWords.forEach((w: string) => {
          if (lowerTitle.includes(String(w))) score += 4;
          if (lowerDesc.includes(String(w))) score += 1;
        });

        if (art.contentType === "Announcement") score += 2;

        return { article: art, score };
      });

      // Sort by score desc, then date desc
      result = scored
        .sort((a, b) => {
          if (b.score !== a.score) return b.score - a.score;
          return new Date(b.article.publishedTimestamp).getTime() - new Date(a.article.publishedTimestamp).getTime();
        })
        .map(x => x.article);

    } else if (activeTab === "saved") {
      // Saved match category filters
      const keywordSet = new Set(newsState.keywords.map(k => k.toLowerCase()));
      result = result.filter(art => {
        const matches = art.matchedKeywords.some(k => keywordSet.has(k.toLowerCase()));
        if (!matches) {
          const lowerTitle = art.title.toLowerCase();
          const lowerDesc = (art.description || "").toLowerCase();
          return Array.from(keywordSet).some(kw => lowerTitle.includes(kw) || lowerDesc.includes(kw));
        }
        return true;
      });

      // Filter further by specific keyword button tag if clicked
      if (selectedKeywordFilter) {
        const skf = selectedKeywordFilter.toLowerCase();
        result = result.filter(art => {
          const matchesKeyword = art.matchedKeywords.some(k => k.toLowerCase() === skf);
          const matchesText = art.title.toLowerCase().includes(skf) || (art.description || "").toLowerCase().includes(skf);
          return matchesKeyword || matchesText;
        });
      }

      // Sort by date desc
      result = result.sort((a, b) => new Date(b.publishedTimestamp).getTime() - new Date(a.publishedTimestamp).getTime());

    } else {
      // State "All News": sorted by timestamp desc
      result = result.sort((a, b) => new Date(b.publishedTimestamp).getTime() - new Date(a.publishedTimestamp).getTime());
    }

    return result;
  };

  const processedArticles = getProcessedArticles();

  // Reset pagination when filter changes
  useEffect(() => {
    setCurrentPage(1);
  }, [activeTab, searchQuery, selectedKeywordFilter]);

  // Paginated articles
  const totalPages = Math.ceil(processedArticles.length / itemsPerPage) || 1;
  const paginatedArticles = processedArticles.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  // Format Date ISO helper
  const formatDate = (isoStr: string) => {
    try {
      const dt = new Date(isoStr);
      return dt.toLocaleDateString("en-MY", {
        day: "numeric",
        month: "short",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit"
      });
    } catch {
      return isoStr;
    }
  };

  // Helper to extract first 20 words for card preview summary
  const getExcerpt = (text: string | undefined, originalDesc: string | undefined): string => {
    const raw = text || originalDesc || "";
    if (!raw) return "No preview content available.";
    const clean = raw.replace(/<[^>]+>/g, " ").trim();
    const words = clean.split(/\s+/);
    if (words.length <= 18) return clean;
    return words.slice(0, 18).join(" ") + "...";
  };

  return (
    <div className="max-w-6xl mx-auto space-y-8 font-sans pb-16 relative p-8 lg:p-12">
      
      {/* Header and Quick Stats */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-200 pb-6">
        <div>
          <div className="flex items-center gap-2.5">
            <span className="p-1 px-2.5 bg-emerald-100 text-emerald-800 text-[10px] uppercase tracking-wider font-extrabold rounded-md">
              Bursa Media Core
            </span>
          </div>

          <h1 className="text-3xl font-bold font-sans text-[var(--color-hacker-black-white)] tracking-tight mt-1.5">
            News Intelligence Dashboard
          </h1>
          
          <p className="text-sm text-slate-500 font-medium mt-1">
            Real-time keyword-based news crawling, deduplication, and public aggregation infrastructure.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={handleRefresh}
            disabled={isRefreshing || isLoadingState}
            className="flex items-center gap-2 px-4 py-2 border border-slate-200 bg-white hover:bg-[var(--color-hacker-text-main)] text-black hover:text-white text-xs font-bold rounded-xl transition duration-150 disabled:opacity-50 cursor-pointer shadow-3xs hover:border-[var(--color-hacker-border-green)] hover:border-2"
          >
            <RefreshCw className={`w-3.5 h-3.5 text-slate-500 hover:text-white ${isRefreshing ? "animate-spin text-emerald-600" : ""}`} />
            {isRefreshing ? "Crawling Feeds..." : "Refresh Feeds"}
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        
        {/* Left Column: Filter tabs, Search and Articles feed */}
        <div className="lg:col-span-8 space-y-6">
          
          {/* Main Sorting & Category Tabs */}
          <div 
            className="border p-2 rounded-2xl flex flex-wrap items-center justify-between gap-2 shadow-3xs opacity-100 border border-[var(--color-hacker-border)] hover:border-[var(--color-hacker-border-green)] hover:border-2"
            style={{backgroundColor: "var(--color-newsview-box-bckgrd)"}}
          >
            <div className="flex gap-1.5">
              <button
                onClick={() => {
                  setActiveTab("all");
                  setSelectedKeywordFilter(null);
                }}
                className={`px-4 py-2 text-xs font-bold rounded-xl transition-all ${
                  activeTab === "all"
                    ? "bg-slate-800 text-white"
                    : "text-slate-600 hover:bg-slate-100"
                }`}
              >
                All News
              </button>
              
              <button
                onClick={() => {
                  setActiveTab("recommended");
                  setSelectedKeywordFilter(null);
                }}
                className={`px-4 py-2 text-xs font-bold rounded-xl transition-all flex items-center gap-1.5 ${
                  activeTab === "recommended"
                    ? "bg-slate-800 text-white"
                    : "text-slate-600 hover:bg-slate-100"
                }`}
              >
                <Sparkles className="w-3.5 h-3.5 text-amber-500" />
                Recommended
              </button>
              
              <button
                onClick={() => setActiveTab("saved")}
                className={`px-4 py-2 text-xs font-bold rounded-xl transition-all ${
                  activeTab === "saved"
                    ? "bg-slate-800 text-white"
                    : "text-slate-600 hover:bg-slate-100"
                }`}
              >
                Saved Keywords Filter
              </button>
            </div>

            {/* Keyword Search Engine for News Only */}
            <div className="relative w-full sm:w-64">
              <span className="absolute inset-y-0 left-3 flex items-center pointer-events-none">
                <Search className="h-3.5 w-3.5 text-slate-400" />
              </span>
              <input
                type="text"
                placeholder="Search aggregated articles..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200/90 rounded-xl py-1.5 pl-9 pr-4 text-xs font-medium placeholder-slate-400 focus:outline-none focus:border-emerald-600 focus:bg-white transition"
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery("")}
                  className="absolute inset-y-0 right-3 flex items-center text-slate-400 hover:text-slate-600 text-xs font-bold"
                >
                  Clear
                </button>
              )}
            </div>
          </div>

          {/* Sub-keywords Row inside Saved Keywords Tab */}
          {activeTab === "saved" && (
            <motion.div 
              initial={{ opacity: 0, y: -5 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-emerald-50/50 border border-emerald-100/50 p-4 rounded-2xl space-y-2"
            >
              <div className="flex items-center gap-2">
                <Hash className="w-3.5 h-3.5 text-emerald-700" />
                <span className="text-[10px] font-extrabold uppercase text-emerald-800 tracking-wider">
                  Targeted Keyword Tracking Feed
                </span>
              </div>
              <div className="flex flex-wrap gap-1.5 mt-2">
                <button
                  onClick={() => setSelectedKeywordFilter(null)}
                  className={`px-3 py-1 rounded-lg text-xs font-bold leading-none ${
                    selectedKeywordFilter === null
                      ? "bg-emerald-700 text-white"
                      : "bg-white border border-emerald-200 text-emerald-700 hover:bg-emerald-100/30"
                  }`}
                >
                  {`All Matches (${newsState.articles.filter(a => a.matchedKeywords.length > 0).length})`}
                </button>

                {newsState.keywords.map((kw, idx) => {
                  const matchesCount = newsState.articles.filter(a => 
                    a.matchedKeywords.some(m => m.toLowerCase() === kw.toLowerCase()) ||
                    a.title.toLowerCase().includes(kw.toLowerCase())
                  ).length;

                  return (
                    <button
                      key={idx}
                      onClick={() => setSelectedKeywordFilter(kw)}
                      className={`px-3 py-1 rounded-lg text-xs font-bold leading-none transition ${
                        selectedKeywordFilter === kw
                          ? "bg-emerald-700 text-white"
                          : "bg-white border border-emerald-200 text-emerald-700 hover:bg-emerald-100/30"
                      }`}
                    >
                      {kw} {matchesCount > 0 && `(${matchesCount})`}
                    </button>
                  );
                })}
              </div>
            </motion.div>
          )}

          {/* Articles Feed */}
          {isLoadingState ? (
            <div className="border p-12 rounded-3xl flex flex-col items-center justify-center text-center" style={{backgroundColor: "var(--color-newsview-box-bckgrd)", borderColor: "var(--color-newsview-box-border)"}}>
              <div className="animate-spin text-emerald-700 mb-3">
                <RefreshCw className="w-10 h-10" />
              </div>
              <p className="text-xs font-semibold text-slate-500">Loading aggregated feed...</p>
            </div>
          ) : paginatedArticles.length === 0 ? (
            <div className="border p-12 rounded-3xl text-center" style={{backgroundColor: "var(--color-newsview-box-bckgrd)", borderColor: "var(--color-hacker-border)"}}>
              <BookOpen className="w-12 h-12 text-slate-300 mx-auto mb-3" />
              <p className="text-sm font-bold text-slate-700">No matching developments found</p>
              <p className="text-xs text-slate-400 mt-1 max-w-sm mx-auto">
                {searchQuery 
                  ? "Try adjusting your search query, or check key terms."
                  : "We couldn't locate reports for your tracking keywords. Try adding more general indicators or tickers in the dashboard rail."}
              </p>
              {(searchQuery || selectedKeywordFilter) && (
                <button
                  onClick={() => {
                    setSearchQuery("");
                    setSelectedKeywordFilter(null);
                  }}
                  className="mt-4 px-4 py-2 border border-slate-200 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-50"
                >
                  Reset Active Filters
                </button>
              )}
            </div>
          ) : (
            <div className="space-y-4">
              {paginatedArticles.map((art) => {
                const badge = getArticleBadge(art);
                
                return (
                  <div
                    key={art.id}
                    onClick={() => handleOpenArticle(art)}
                    className="group border border-[var(--color-newsview-box-border)] p-5 rounded-2xl flex flex-col justify-between transition-colors shadow-3xs hover:shadow-2xs cursor-pointer hover:border-[var(--color-newsview-box-border-hover)] hover:border-2"
                    style={{backgroundColor: "var(--color-newsview-box-bckgrd)"}}
                  >
                    <div>
                      {/* Meta information and badge */}
                      <div className="flex flex-wrap items-center justify-between gap-2 mb-2.5">
                        <div className="flex items-center gap-1.5 text-[10px] text-[var(--color-newsview-box-subdetail)] font-bold">
                          <span className="text-[var(--color-newsview-box-subdetail)]font-extrabold pr-1.5 border-r border-slate-200">
                            {art.sourceName}
                          </span>
                          <Clock className="w-3.5 h-3.5" />
                          <span>{formatDate(art.publishedTimestamp)}</span>
                        </div>

                        {/* Custom Category Tag */}
                        <div className="flex items-center gap-1.5">
                          {badge === "Recommended" && (
                            <span className="px-2 py-0.5 bg-amber-50 border border-amber-200 text-amber-800 text-[9px] font-extrabold rounded-md uppercase tracking-wider">
                              Recommended
                            </span>
                          )}
                          {badge === "Saved Match" && (
                            <span className="px-2 py-0.5 bg-emerald-50 border border-emerald-200 text-emerald-800 text-[9px] font-extrabold rounded-md uppercase tracking-wider">
                              Saved Match
                            </span>
                          )}
                          {badge === "General" && (
                            <span className="px-2 py-0.5 bg-slate-50 border border-slate-200 text-slate-500 text-[9px] font-extrabold rounded-md uppercase tracking-wider">
                              General
                            </span>
                          )}

                          <span className="px-2 py-0.5 bg-sky-50 border border-sky-100 text-sky-700 text-[9px] font-medium rounded-md">
                            {art.contentType}
                          </span>
                        </div>
                      </div>

                      {/* Header Title */}
                      <h3 className="text-sm font-bold text-[var(--color-newsview-box-title)] group-hover:text-[var(--color-newsview-box-title-hover)] transition-colors tracking-tight leading-snug">
                        {art.title}
                      </h3>

                      {/* Excerpt Summary (10 to 20 words limit) */}
                      <p className="text-xs text-[var(--color-newsview-box-title)] group-hover:text-[var(--color-newsview-box-title-hover)] font-medium leading-relaxed mt-2">
                        {getExcerpt(art.description, art.fullContent)}
                      </p>
                    </div>

                    {/* Deduplication & Merged Sources Segment */}
                    <div className="mt-4 pt-3.5 border-t border-slate-100/80 flex flex-wrap items-center justify-between gap-3">
                      <div className="flex items-center gap-2">
                        {art.sources && art.sources.length > 1 ? (
                          <div className="flex flex-wrap items-center gap-2.5">
                            <span className="text-[10px] text-zinc-400 font-bold">Coverage in:</span>
                            {art.sources.map((src, sIdx) => (
                              <span 
                                key={sIdx} 
                                className="inline-flex items-center gap-1 text-[10px] text-slate-600 bg-slate-50 hover:bg-slate-100 border border-slate-200/80 px-2 py-0.5 rounded-md font-semibold"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  window.open(src.url, "_blank");
                                }}
                              >
                                {src.name}
                                <ExternalLink className="w-2.5 h-2.5 text-slate-400" />
                              </span>
                            ))}
                          </div>
                        ) : (
                          <div className="flex items-center gap-1.5 text-[10px] font-semibold text-[var(--color-newsview-box-subdetail)]">
                            <span>Read original source</span>
                            <ExternalLink className="w-3 h-3 text-slate-400" />
                          </div>
                        )}
                      </div>

                      {art.matchedKeywords.length > 0 && (
                        <div className="flex items-center gap-1">
                          {art.matchedKeywords.slice(0, 3).map((kw, kwIdx) => (
                            <span key={kwIdx} className="text-[10px] font-bold text-slate-400 bg-slate-50 px-2 py-0.5 rounded-md">
                              #{kw}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* Compact Pagination Controls */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between bg-[var(--color-hacker-universal-bckgrd)] border border-[var(--color-hacker-border)] p-4 rounded-2xl shadow-3xs mt-4">
              <span className="text-xs text-[var(--color-hacker-black-white)] font-medium">
                Page <strong className="font-extrabold text-[var(--color-hacker-black-white)]">{currentPage}</strong> of <strong className="font-extrabold">{totalPages}</strong> ({processedArticles.length} items)
              </span>
              
              <div className="flex gap-2">
                <button
                  onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                  disabled={currentPage === 1}
                  className="p-1 px-3 border border-slate-200 bg-white hover:bg-slate-50 text-slate-600 text-xs font-bold rounded-lg disabled:opacity-40 transition cursor-pointer"
                >
                  <ChevronLeft className="w-4 h-4 inline-block mr-1 align-middle" />
                  Prev
                </button>
                <button
                  onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                  disabled={currentPage === totalPages}
                  className="p-1 px-3 border border-slate-200 bg-white hover:bg-slate-50 text-slate-600 text-xs font-bold rounded-lg disabled:opacity-40 transition cursor-pointer"
                >
                  Next
                  <ChevronRight className="w-4 h-4 inline-block ml-1 align-middle" />
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Right Column: Interactive Keyword Management System */}
        <div className="lg:col-span-4 space-y-6">
          <div className="bg-[var(--color-hacker-univeresal-bckgrd)] border border-[var(--color-hacker-border)] hover:border-[var(--color-hacker-border-green)] hover:border-2 p-6 rounded-3xl shadow-3xs space-y-4">
            <div>
              <h2 className="text-xs font-extrabold uppercase text-[var(--color-hacker-black-white)] tracking-wider">
                Keyword Management System
              </h2>
              <p className="text-[10px] text-[var(--color-hacker-black-white)] mt-0.5">
                Saved keywords drive custom aggregation pipelines and score smart user lists (Max 10).
              </p>
            </div>

            {/* Keyword Limits progress bar */}
            <div className="space-y-1">
              <div className="flex justify-between text-[11px] font-bold text-[var(--color-hacker-black-white)]">
                <span>Active keywords limit</span>
                <span className={tempKeywords.length >= 10 ? "text-red-600" : "text-ggreen-700"}>
                  {tempKeywords.length} / 10
                </span>
              </div>
              <div className="w-full bg-slate-100 rounded-full h-1.5 overflow-hidden">
                <div 
                  className={`h-full transition-all duration-300 ${tempKeywords.length >= 10 ? "bg-red-800" : "bg-green-500 animate-pulse"}`}
                  style={{ width: `${(tempKeywords.length / 10) * 100}%` }}
                />
              </div>
            </div>

            {/* Feedback notifications */}
            {keywordError && (
              <div className="p-3 bg-rose-50 border border-rose-100 rounded-xl flex items-start gap-2 text-[10px] text-rose-800 font-medium">
                <AlertTriangle className="w-3.5 h-3.5 text-rose-600 flex-shrink-0 mt-0.5" />
                <span>{keywordError}</span>
              </div>
            )}
            {keywordSuccessMessage && (
              <div className="p-3 bg-emerald-50 border border-emerald-100 rounded-xl flex items-start gap-2 text-[10px] text-emerald-800 font-medium animate-pulse">
                <CheckCircle className="w-3.5 h-3.5 text-emerald-600 flex-shrink-0 mt-0.5" />
                <span>{keywordSuccessMessage}</span>
              </div>
            )}

            {/* Add keyword form */}
            <div className="flex gap-2">
              <input
                type="text"
                placeholder="e.g. TSLA, Banking, Celcom"
                value={newKeywordInput}
                onChange={(e) => setNewKeywordInput(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleAddKeyword()}
                disabled={tempKeywords.length >= 10}
                className="flex-1 bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-medium placeholder-slate-400 focus:outline-none focus:border-emerald-600 focus:bg-white transition disabled:opacity-50"
              />
              <button
                type="button"
                onClick={handleAddKeyword}
                disabled={tempKeywords.length >= 10 || !newKeywordInput.trim()}
                className="p-2 bg-[var(--color-hacker-infoview-logo)] hover:bg-emerald-700 text-white rounded-xl disabled:opacity-50 transition cursor-pointer"
              >
                <Plus className="w-4 h-4" />
              </button>
            </div>

            {/* Active Keyword badges with remove actions */}
            <div className="flex flex-wrap gap-2 pt-2">
              {tempKeywords.map((kw, index) => (
                <div
                  key={index}
                  className="inline-flex items-center gap-1.5 p-1.5 px-3 bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-xl text-xs font-bold text-slate-700 transition"
                >
                  <span>{kw}</span>
                  <button
                    type="button"
                    onClick={() => handleRemoveKeyword(index)}
                    className="text-slate-400 hover:text-rose-600 p-0.5 transition"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              ))}
              {tempKeywords.length === 0 && (
                <p className="text-[11px] text-slate-400 py-4 font-medium italic">
                  No active keywords added. Add up to 10 monitoring targets above.
                </p>
              )}
            </div>

            <button
              onClick={handleSaveKeywords}
              disabled={isSavingKeywords}
              className="w-full py-2.5 bg-slate-800 hover:bg-slate-900 text-white text-xs font-extrabold tracking-wide uppercase rounded-xl transition shadow-3xs disabled:opacity-50 mt-4 cursor-pointer"
            >
              {isSavingKeywords ? "Preserving Preferences..." : "Save Rules & Sync"}
            </button>
          </div>

          <div className="bg-[var(--color-newsview-dedupl-box)] border border-[var(--color-hacker-border)] p-5 rounded-3xl text-[var(--color-hacker-black-white)] text-[11px] leading-relaxed select-none hover:border-[var(--color-hacker-border-green)] hover:border-2">
            <h4 className="font-extrabold text-[var(--color-hacker-black-white)] uppercase tracking-wider mb-2 text-[15px]">
              Deduplication Protocol
            </h4>
            <p>
              The crawling framework parses title vectors using a Jaccard overlap algorithm. Stories sharing greater than 45% of key terms are automatically grouped into unified developments carrying multiple publisher URLs.
            </p>
          </div>
        </div>

      </div>

      {/* Full Article Overlay (No AI summarizes/rewrites as requested in Section 10) */}
      <AnimatePresence>
        {selectedArticle && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 md:p-6 z-50 overflow-hidden"
          >
            <motion.div
              initial={{ scale: 0.95, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.95, y: 20 }}
              className="bg-white border border-slate-200 w-full max-w-2xl rounded-3xl shadow-xl flex flex-col max-h-[85vh]"
            >
              {/* Overlay Modal Header */}
              <div className="p-6 border-b border-slate-200/80 flex justify-between items-start gap-4">
                <div>
                  <div className="flex items-center gap-1.5 text-[10px] text-slate-400 font-extrabold uppercase tracking-wide">
                    <span>{selectedArticle.sourceName}</span>
                    <span>•</span>
                    <span>{formatDate(selectedArticle.publishedTimestamp)}</span>
                  </div>
                  <h2 className="text-base font-bold text-slate-800 mt-2 tracking-tight leading-snug">
                    {selectedArticle.title}
                  </h2>
                </div>
                <button
                  type="button"
                  onClick={() => setSelectedArticle(null)}
                  className="p-1 px-2.5 border border-slate-100 hover:bg-slate-100 rounded-lg text-slate-400 hover:text-slate-600 transition"
                >
                  ✕
                </button>
              </div>

              {/* Scrape Content Area */}
              <div className="p-6 md:p-8 overflow-y-auto flex-1 font-sans text-xs leading-relaxed text-slate-600 space-y-4">
                {isFetchingFullContent ? (
                  <div className="py-20 flex flex-col items-center justify-center text-center">
                    <div className="animate-spin text-emerald-700 mb-3">
                      <RefreshCw className="w-8 h-8" />
                    </div>
                    <p className="font-bold text-slate-700">Connecting to dynamic target...</p>
                    <p className="text-[10px] text-zinc-400 mt-1 max-w-xs leading-normal">
                      Initiating background HTTP scrapers to clean raw readable paragraphs. This respects rate limits.
                    </p>
                  </div>
                ) : (
                  <div className="space-y-4 font-sans whitespace-pre-wrap select-text selection:bg-emerald-100 selection:text-emerald-950">
                    {/* Rendered fully scraped raw content without summaries or rewriting */}
                    {fullArticleContent}
                  </div>
                )}
              </div>

              {/* Overlay Modal Footer */}
              <div className="p-6 border-t border-slate-100 bg-slate-50 rounded-b-3xl flex flex-col sm:flex-row items-center justify-between gap-4">
                <div className="flex flex-col items-center sm:items-start text-center sm:text-left">
                  <span className="text-[10px] text-slate-400 font-bold uppercase">Original Publisher</span>
                  <p className="text-xs font-bold text-slate-600 truncate max-w-sm mt-0.5">
                    {selectedArticle.sourceName}
                  </p>
                </div>
                
                <div className="flex gap-2">
                  <a
                    href={selectedArticle.sourceUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="flex items-center gap-1.5 px-4 py-2 bg-slate-800 hover:bg-slate-900 text-white text-xs font-bold rounded-xl transition cursor-pointer"
                  >
                    Open Source Link
                    <ExternalLink className="w-3.5 h-3.5" />
                  </a>
                  <button
                    type="button"
                    onClick={() => setSelectedArticle(null)}
                    className="px-4 py-2 border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 text-xs font-semibold rounded-xl transition cursor-pointer"
                  >
                    Close Reader
                  </button>
                </div>
              </div>

            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
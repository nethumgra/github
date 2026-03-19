"use client";
import React, { useState, useEffect, useMemo, useRef, useCallback } from "react";
import { db } from "../../lib/firebase";
import {
  collection, query, onSnapshot, orderBy, where,
  doc, getDocs, startAfter, limit, QueryDocumentSnapshot, DocumentData
} from "firebase/firestore";
import Link from "next/link";
import { useSearchParams, useRouter } from "next/navigation";
import {
  Filter, ChevronRight, Search, Grid3x3, List,
  SlidersHorizontal, X, Sparkles, TrendingUp, Percent, Layers, Loader2
} from "lucide-react";
import ProductCard from "../../components/ProductCard";
import { motion, AnimatePresence } from "framer-motion";

// ─── Constants ────────────────────────────────────────────────────────
const PAGE_SIZE = 12; // products per batch
const SCROLL_KEY = "shop_scroll_pos";
const SCROLL_CAT_KEY = "shop_scroll_cat";

export default function UltimateShopPage() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const categoryFilter = searchParams.get("category");

  // ─── State ────────────────────────────────────────────────────────
  const [products, setProducts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [activeCategory, setActiveCategory] = useState(categoryFilter || "All");
  const [activeSubCategory, setActiveSubCategory] = useState<string>("All");

  const [firestoreCategories, setFirestoreCategories] = useState<any[]>([]);
  const [homeConfig, setHomeConfig] = useState<any>(null);
  const [currentSlide, setCurrentSlide] = useState(0);
  const [searchQuery, setSearchQuery] = useState("");
  const [sortBy, setSortBy] = useState("newest");
  const [priceRange, setPriceRange] = useState([0, 50000]);
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");
  const [showFilters, setShowFilters] = useState(false);

  // ─── Refs ─────────────────────────────────────────────────────────
  // Cursor for Firestore pagination
  const lastDocRef = useRef<QueryDocumentSnapshot<DocumentData> | null>(null);
  // Sentinel div at bottom of product list
  const sentinelRef = useRef<HTMLDivElement | null>(null);
  // Track if scroll restore has been attempted
  const scrollRestoredRef = useRef(false);

  // ─── Scroll position: save on scroll ──────────────────────────────
  useEffect(() => {
    const handleScroll = () => {
      sessionStorage.setItem(SCROLL_KEY, String(window.scrollY));
    };
    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  // ─── Scroll position: restore after products render ───────────────
  useEffect(() => {
    if (loading || scrollRestoredRef.current) return;
    const savedCat = sessionStorage.getItem(SCROLL_CAT_KEY);
    const savedPos = sessionStorage.getItem(SCROLL_KEY);
    // Only restore if same category as when we left
    if (savedPos && savedCat === (categoryFilter || "All")) {
      requestAnimationFrame(() => {
        window.scrollTo({ top: parseInt(savedPos), behavior: "instant" });
        scrollRestoredRef.current = true;
      });
    }
  }, [loading, categoryFilter]);

  // ─── Save active category for scroll restore matching ─────────────
  useEffect(() => {
    sessionStorage.setItem(SCROLL_CAT_KEY, categoryFilter || "All");
    // When category changes, clear saved scroll pos so we start from top
    if (categoryFilter !== sessionStorage.getItem(SCROLL_CAT_KEY)) {
      sessionStorage.removeItem(SCROLL_KEY);
    }
    scrollRestoredRef.current = false;
  }, [categoryFilter]);

  // ─── Sync category from URL ────────────────────────────────────────
  useEffect(() => {
    if (categoryFilter) {
      setActiveCategory(categoryFilter);
      setActiveSubCategory("All");
    } else {
      setActiveCategory("All");
    }
  }, [categoryFilter]);

  // ─── Fetch categories (realtime — small collection, OK) ───────────
  useEffect(() => {
    const unsub = onSnapshot(
      collection(db, "categories"),
      (snapshot) => {
        setFirestoreCategories(
          snapshot.docs.map((d) => ({
            id: d.id,
            name: d.data().name,
            subCategories: d.data().subCategories || [],
          }))
        );
      },
      (err) => console.error("Categories error:", err)
    );
    return () => unsub();
  }, []);

  // ─── Fetch homepage config (realtime — single doc, OK) ────────────
  useEffect(() => {
    const unsub = onSnapshot(doc(db, "settings", "homepage"), (snap) => {
      if (snap.exists()) {
        const data = snap.data();
        if (data.mainBanners && !Array.isArray(data.mainBanners)) {
          data.mainBanners = [{ pc: data.mainBanners.pc, mobile: data.mainBanners.mobile }];
        }
        setHomeConfig(data);
      }
    });
    return () => unsub();
  }, []);

  // ─── Banner auto-slide ────────────────────────────────────────────
  useEffect(() => {
    if (Array.isArray(homeConfig?.mainBanners) && homeConfig.mainBanners.length > 1) {
      const timer = setInterval(() => {
        setCurrentSlide((prev) =>
          prev === homeConfig.mainBanners.length - 1 ? 0 : prev + 1
        );
      }, 5000);
      return () => clearInterval(timer);
    }
  }, [homeConfig]);

  // ─── Build base Firestore query ────────────────────────────────────
  const buildQuery = useCallback(
    (cursor: QueryDocumentSnapshot<DocumentData> | null) => {
      const base =
        activeCategory !== "All"
          ? query(
              collection(db, "products"),
              where("mainCategory", "==", activeCategory),
              orderBy("createdAt", "desc"),
              limit(PAGE_SIZE)
            )
          : query(
              collection(db, "products"),
              orderBy("createdAt", "desc"),
              limit(PAGE_SIZE)
            );

      if (cursor) {
        return activeCategory !== "All"
          ? query(
              collection(db, "products"),
              where("mainCategory", "==", activeCategory),
              orderBy("createdAt", "desc"),
              startAfter(cursor),
              limit(PAGE_SIZE)
            )
          : query(
              collection(db, "products"),
              orderBy("createdAt", "desc"),
              startAfter(cursor),
              limit(PAGE_SIZE)
            );
      }
      return base;
    },
    [activeCategory]
  );

  // ─── Initial load / category change ───────────────────────────────
  useEffect(() => {
    setLoading(true);
    setProducts([]);
    setHasMore(true);
    lastDocRef.current = null;

    const q = buildQuery(null);
    getDocs(q)
      .then((snap) => {
        const docs = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
        setProducts(docs);
        lastDocRef.current = snap.docs[snap.docs.length - 1] ?? null;
        setHasMore(snap.docs.length === PAGE_SIZE);
      })
      .catch((err) => console.error("Products fetch error:", err))
      .finally(() => setLoading(false));
  }, [activeCategory, buildQuery]);

  // ─── Load next page ────────────────────────────────────────────────
  const loadMore = useCallback(async () => {
    if (loadingMore || !hasMore || !lastDocRef.current) return;
    setLoadingMore(true);
    try {
      const q = buildQuery(lastDocRef.current);
      const snap = await getDocs(q);
      const newDocs = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
      setProducts((prev) => {
        // Deduplicate by id
        const existingIds = new Set(prev.map((p) => p.id));
        return [...prev, ...newDocs.filter((p) => !existingIds.has(p.id))];
      });
      lastDocRef.current = snap.docs[snap.docs.length - 1] ?? null;
      setHasMore(snap.docs.length === PAGE_SIZE);
    } catch (err) {
      console.error("Load more error:", err);
    } finally {
      setLoadingMore(false);
    }
  }, [loadingMore, hasMore, buildQuery]);

  // ─── Intersection Observer — trigger loadMore ─────────────────────
  useEffect(() => {
    const sentinel = sentinelRef.current;
    if (!sentinel) return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && hasMore && !loading && !loadingMore) {
          loadMore();
        }
      },
      { rootMargin: "400px" } // start loading 400px before reaching the bottom
    );

    observer.observe(sentinel);
    return () => observer.disconnect();
  }, [loadMore, hasMore, loading, loadingMore]);

  // ─── Derived data ─────────────────────────────────────────────────
  const categoryList = useMemo(
    () => ["All", ...firestoreCategories.map((c) => c.name)],
    [firestoreCategories]
  );

  const subCategoryList = useMemo(() => {
    if (activeCategory === "All") return [];
    return firestoreCategories.find((c) => c.name === activeCategory)?.subCategories ?? [];
  }, [activeCategory, firestoreCategories]);

  // Client-side filtering (on already-loaded products)
  const filteredAndSortedProducts = useMemo(() => {
    let filtered = [...products];

    if (activeSubCategory !== "All") {
      filtered = filtered.filter((p) => p.subCategory === activeSubCategory);
    }

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      filtered = filtered.filter(
        (p) =>
          p.name?.toLowerCase().includes(q) ||
          p.description?.toLowerCase().includes(q) ||
          p.mainCategory?.toLowerCase().includes(q) ||
          p.subCategory?.toLowerCase().includes(q) ||
          p.tags?.some((t: string) => t.toLowerCase().includes(q))
      );
    }

    filtered = filtered.filter((p) => {
      const price = p.discountedPrice || p.price || 0;
      return price >= priceRange[0] && price <= priceRange[1];
    });

    if (sortBy === "price-low") {
      filtered.sort((a, b) => (a.discountedPrice || a.price || 0) - (b.discountedPrice || b.price || 0));
    } else if (sortBy === "price-high") {
      filtered.sort((a, b) => (b.discountedPrice || b.price || 0) - (a.discountedPrice || a.price || 0));
    } else if (sortBy === "name") {
      filtered.sort((a, b) => (a.name || "").localeCompare(b.name || ""));
    }

    return filtered;
  }, [products, activeSubCategory, searchQuery, priceRange, sortBy]);

  const handleCategoryChange = (cat: string) => {
    // Clear scroll pos so new category starts at top
    sessionStorage.removeItem(SCROLL_KEY);
    scrollRestoredRef.current = false;
    setActiveCategory(cat);
    setActiveSubCategory("All");
    setSearchQuery("");
    router.push(cat === "All" ? "/shop" : `/shop?category=${cat}`);
  };

  const resetFilters = () => {
    setSearchQuery("");
    setSortBy("newest");
    setPriceRange([0, 50000]);
    setActiveSubCategory("All");
  };

  // ─── JSX ──────────────────────────────────────────────────────────
  return (
    <main className="bg-white min-h-screen pb-20">

      {/* Hero Banner */}
      <section className="container mx-auto px-5 py-4">
        <div className="w-full relative rounded-[2.5rem] overflow-hidden shadow-2xl border-4 border-white">
          <div className="relative aspect-[4/5] md:aspect-[21/7] bg-gradient-to-br from-gray-50 to-gray-100">
            {Array.isArray(homeConfig?.mainBanners) && homeConfig.mainBanners.length > 0 ? (
              homeConfig.mainBanners.map((banner: any, index: number) => (
                <motion.div
                  key={index}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: index === currentSlide ? 1 : 0 }}
                  transition={{ duration: 0.8 }}
                  className={`absolute inset-0 ${index === currentSlide ? "z-10" : "z-0"}`}
                >
                  <picture className="w-full h-full">
                    <source media="(max-width: 768px)" srcSet={banner.mobile || banner.pc} />
                    <img
                      src={banner.pc}
                      className="w-full h-full object-cover"
                      alt={`Banner ${index + 1}`}
                      loading={index === 0 ? "eager" : "lazy"}
                    />
                  </picture>
                </motion.div>
              ))
            ) : (
              <div className="w-full h-full flex flex-col items-center justify-center gap-4">
                <Sparkles className="text-gray-300 animate-pulse" size={40} />
                <p className="text-gray-300 font-black text-[10px] uppercase tracking-widest">Loading shop...</p>
              </div>
            )}

            {Array.isArray(homeConfig?.mainBanners) && homeConfig.mainBanners.length > 1 && (
              <div className="absolute bottom-6 left-1/2 -translate-x-1/2 flex gap-3 z-20">
                {homeConfig.mainBanners.map((_: any, i: number) => (
                  <button
                    key={i}
                    onClick={() => setCurrentSlide(i)}
                    className={`h-2 rounded-full transition-all ${
                      i === currentSlide ? "w-8 bg-white" : "w-2 bg-white/50 hover:bg-white/80"
                    }`}
                    aria-label={`Go to slide ${i + 1}`}
                  />
                ))}
              </div>
            )}
          </div>
        </div>
      </section>

      <div className="container mx-auto px-6 py-10">

        {/* Breadcrumbs */}
        <nav
          aria-label="Breadcrumb"
          className="flex items-center gap-2 text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-8"
        >
          <Link href="/" className="hover:text-[#111] transition-colors">Home</Link>
          <ChevronRight size={12} />
          <span className="text-gray-900">Shop</span>
          {activeCategory !== "All" && (
            <>
              <ChevronRight size={12} />
              <span className="text-[#111]">{activeCategory}</span>
            </>
          )}
          {activeSubCategory !== "All" && (
            <>
              <ChevronRight size={12} />
              <span className="text-[#111]">{activeSubCategory}</span>
            </>
          )}
        </nav>

        <div className="flex flex-col lg:flex-row gap-12">

          {/* Desktop Sidebar */}
          <aside className="hidden lg:block w-72 flex-shrink-0">
            <div className="sticky top-28 space-y-8">

              {/* Main Categories */}
              <div className="bg-white p-6 rounded-[2.5rem] border border-gray-100 shadow-sm">
                <div className="flex items-center gap-2 mb-6">
                  <Filter size={18} className="text-[#111]" />
                  <h2 className="text-lg font-black uppercase tracking-tight">Categories</h2>
                </div>
                <div className="flex flex-col gap-2">
                  {categoryList.map((cat) => {
                    const count =
                      cat === "All"
                        ? products.length
                        : products.filter((p) => p.mainCategory === cat).length;
                    return (
                      <button
                        key={cat}
                        onClick={() => handleCategoryChange(cat)}
                        className={`text-sm font-bold text-left px-4 py-3 rounded-xl transition-all group ${
                          activeCategory === cat
                            ? "bg-[#111] text-white shadow-lg "
                            : "text-gray-500 hover:bg-gray-50 hover:text-[#111]"
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <span>{cat}</span>
                          {count > 0 && (
                            <span
                              className={`text-[10px] font-black px-2 py-0.5 rounded-full ${
                                activeCategory === cat
                                  ? "bg-white/20 text-white"
                                  : "bg-gray-100 text-gray-400 group-hover:bg-gray-100 group-hover:text-[#111]"
                              }`}
                            >
                              {count}
                            </span>
                          )}
                        </div>
                      </button>
                    );
                  })}
                </div>
                {firestoreCategories.length > 0 && (
                  <div className="mt-4 pt-4 border-t border-gray-100 flex items-center gap-2 text-[9px] font-bold text-green-500 uppercase">
                    <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
                    Live Sync Active
                  </div>
                )}
              </div>

              {/* Sub Categories */}
              {subCategoryList.length > 0 && (
                <div className="bg-white p-6 rounded-[2.5rem] border border-gray-100 shadow-sm">
                  <div className="flex items-center gap-2 mb-4">
                    <Layers size={14} className="text-gray-500" />
                    <h3 className="text-[11px] font-black text-gray-400 uppercase tracking-[0.2em]">
                      Sub Categories
                    </h3>
                  </div>
                  <div className="flex flex-col gap-2">
                    <button
                      onClick={() => setActiveSubCategory("All")}
                      className={`text-xs font-bold text-left px-4 py-2.5 rounded-xl transition-all ${
                        activeSubCategory === "All"
                          ? "text-[#111] bg-gray-50"
                          : "text-gray-500 hover:bg-gray-50"
                      }`}
                    >
                      All {activeCategory}
                    </button>
                    {subCategoryList.map((sub: string) => {
                      const subCount = products.filter(
                        (p) => p.mainCategory === activeCategory && p.subCategory === sub
                      ).length;
                      return (
                        <button
                          key={sub}
                          onClick={() => setActiveSubCategory(sub)}
                          className={`text-xs font-bold text-left px-4 py-2.5 rounded-xl transition-all group ${
                            activeSubCategory === sub
                              ? "text-[#111] bg-gray-50"
                              : "text-gray-500 hover:bg-gray-50"
                          }`}
                        >
                          <div className="flex items-center justify-between">
                            <span>{sub}</span>
                            {subCount > 0 && (
                              <span
                                className={`text-[9px] font-black px-2 py-0.5 rounded-full ${
                                  activeSubCategory === sub
                                    ? "bg-gray-100 text-[#111]"
                                    : "bg-gray-100 text-gray-400 group-hover:bg-gray-50"
                                }`}
                              >
                                {subCount}
                              </span>
                            )}
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Price Range */}
              <div className="bg-white p-6 rounded-[2.5rem] border border-gray-100 shadow-sm">
                <h3 className="text-[11px] font-black text-gray-400 uppercase tracking-[0.2em] mb-6 flex items-center gap-2">
                  <Percent size={14} className="text-gray-500" />
                  Price Range
                </h3>
                <div className="space-y-4">
                  <div className="flex justify-between text-xs font-bold text-gray-600">
                    <span>Rs. {priceRange[0].toLocaleString()}</span>
                    <span>Rs. {priceRange[1].toLocaleString()}</span>
                  </div>
                  <input
                    type="range"
                    min="0"
                    max="50000"
                    step="500"
                    value={priceRange[1]}
                    onChange={(e) => setPriceRange([0, parseInt(e.target.value)])}
                    className="w-full accent-black cursor-pointer"
                  />
                  <div className="pt-2 text-center">
                    <span className="text-[10px] font-bold text-[#111] uppercase tracking-widest">
                      {filteredAndSortedProducts.length} items in range
                    </span>
                  </div>
                </div>
              </div>

              <button
                onClick={resetFilters}
                className="w-full py-4 bg-gray-100 text-gray-600 rounded-2xl font-bold text-xs uppercase hover:bg-gray-200 transition-all shadow-sm flex items-center justify-center gap-2"
              >
                <X size={14} />
                Reset All Filters
              </button>
            </div>
          </aside>

          {/* Main Content */}
          <div className="flex-1">

            {/* Top Bar */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-8">
              <div className="flex-1 w-full md:max-w-md">
                <div className="relative group">
                  <Search
                    className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 group-focus-within:text-[#111] transition-colors"
                    size={18}
                  />
                  <input
                    type="text"
                    placeholder="Search products, brands, styles..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full pl-12 pr-10 py-3.5 bg-gray-50 rounded-2xl text-sm font-medium outline-none border-2 border-transparent focus:border-gray-300 focus:bg-white transition-all shadow-sm focus:shadow-md"
                  />
                  {searchQuery && (
                    <button
                      onClick={() => setSearchQuery("")}
                      className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-[#111] transition-colors"
                    >
                      <X size={16} />
                    </button>
                  )}
                </div>
              </div>

              <div className="flex items-center gap-3 w-full md:w-auto">
                <select
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value)}
                  className="flex-1 md:flex-none px-5 py-3.5 bg-gray-50 rounded-2xl text-xs font-bold outline-none cursor-pointer border-2 border-transparent hover:border-gray-200 transition-all shadow-sm"
                >
                  <option value="newest">Newest First</option>
                  <option value="price-low">Price: Low to High</option>
                  <option value="price-high">Price: High to Low</option>
                  <option value="name">Name A-Z</option>
                </select>

                <div className="hidden md:flex gap-1 bg-gray-50 rounded-2xl p-1.5 shadow-sm">
                  <button
                    onClick={() => setViewMode("grid")}
                    className={`p-2.5 rounded-xl transition-all ${
                      viewMode === "grid" ? "bg-white text-[#111] shadow-sm" : "text-gray-400 hover:text-gray-600"
                    }`}
                  >
                    <Grid3x3 size={18} />
                  </button>
                  <button
                    onClick={() => setViewMode("list")}
                    className={`p-2.5 rounded-xl transition-all ${
                      viewMode === "list" ? "bg-white text-[#111] shadow-sm" : "text-gray-400 hover:text-gray-600"
                    }`}
                  >
                    <List size={18} />
                  </button>
                </div>

                <button
                  onClick={() => setShowFilters(!showFilters)}
                  className="lg:hidden p-3.5 bg-gray-900 text-white rounded-2xl shadow-lg hover:bg-[#111] transition-all"
                >
                  <SlidersHorizontal size={18} />
                </button>
              </div>
            </div>

            {/* Title & Count */}
            <div className="flex justify-between items-center mb-8">
              <div>
                <h1 className="text-2xl md:text-3xl font-black uppercase tracking-tighter text-gray-900 flex items-center gap-3">
                  {activeCategory === "All" ? "All Products" : activeCategory}
                  {activeSubCategory !== "All" && (
                    <span className="text-[#111]"> / {activeSubCategory}</span>
                  )}
                </h1>
                {searchQuery && (
                  <p className="text-xs font-bold text-gray-400 mt-2">
                    Search results for &quot;<span className="text-[#111]">{searchQuery}</span>&quot;
                  </p>
                )}
              </div>
              <div className="flex items-center gap-2 bg-gray-50 px-4 py-2 rounded-full">
                <TrendingUp size={14} className="text-gray-500" />
                <span className="text-[10px] font-bold text-gray-600 uppercase tracking-widest">
                  {filteredAndSortedProducts.length} {filteredAndSortedProducts.length === 1 ? "Item" : "Items"}
                  {hasMore && !searchQuery && activeSubCategory === "All" && "+"}
                </span>
              </div>
            </div>

            {/* Mobile Filters Drawer */}
            <AnimatePresence>
              {showFilters && (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="lg:hidden fixed inset-0 z-50 bg-black/50 backdrop-blur-sm"
                  onClick={() => setShowFilters(false)}
                >
                  <motion.div
                    initial={{ x: "-100%" }}
                    animate={{ x: 0 }}
                    exit={{ x: "-100%" }}
                    className="absolute left-0 top-0 bottom-0 w-80 bg-white p-6 overflow-y-auto shadow-2xl"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <div className="flex justify-between items-center mb-8">
                      <h3 className="font-black text-lg uppercase tracking-tight">Filters</h3>
                      <button onClick={() => setShowFilters(false)} className="p-2 hover:bg-gray-100 rounded-xl">
                        <X size={24} />
                      </button>
                    </div>

                    <div className="space-y-2 mb-8">
                      <h4 className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-3">Categories</h4>
                      {categoryList.map((cat) => (
                        <button
                          key={cat}
                          onClick={() => { handleCategoryChange(cat); setShowFilters(false); }}
                          className={`block w-full text-left px-5 py-3.5 rounded-xl font-bold text-sm transition-all ${
                            activeCategory === cat
                              ? "bg-[#111] text-white shadow-lg"
                              : "bg-gray-50 text-gray-600 hover:bg-gray-100"
                          }`}
                        >
                          {cat}
                        </button>
                      ))}
                    </div>

                    <div className="mb-8">
                      <h4 className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-4">Price Range</h4>
                      <div className="space-y-3">
                        <div className="flex justify-between text-xs font-bold text-gray-600">
                          <span>Rs. {priceRange[0].toLocaleString()}</span>
                          <span>Rs. {priceRange[1].toLocaleString()}</span>
                        </div>
                        <input
                          type="range"
                          min="0"
                          max="50000"
                          step="500"
                          value={priceRange[1]}
                          onChange={(e) => setPriceRange([0, parseInt(e.target.value)])}
                          className="w-full accent-black"
                        />
                      </div>
                    </div>

                    <button
                      onClick={() => { resetFilters(); setShowFilters(false); }}
                      className="w-full py-4 bg-gray-900 text-white rounded-2xl font-bold text-xs uppercase hover:bg-[#111] transition-all shadow-lg"
                    >
                      Reset &amp; Close
                    </button>
                  </motion.div>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Products Grid */}
            {loading ? (
              <div
                className={
                  viewMode === "grid"
                    ? "grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6"
                    : "flex flex-col gap-4"
                }
              >
                {[1, 2, 3, 4, 5, 6, 7, 8].map((i) => (
                  <div
                    key={i}
                    className={
                      viewMode === "grid"
                        ? "aspect-square bg-gray-50 rounded-2xl animate-pulse"
                        : "h-32 bg-gray-50 rounded-2xl animate-pulse"
                    }
                  />
                ))}
              </div>
            ) : filteredAndSortedProducts.length > 0 ? (
              <>
                <motion.div
                  layout
                  className={
                    viewMode === "grid"
                      ? "grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6"
                      : "flex flex-col gap-4"
                  }
                >
                  {filteredAndSortedProducts.map((p) => (
                    <motion.div
                      key={p.id}
                      layout
                      initial={{ opacity: 0, scale: 0.9 }}
                      animate={{ opacity: 1, scale: 1 }}
                      exit={{ opacity: 0, scale: 0.9 }}
                      transition={{ duration: 0.2 }}
                    >
                      <ProductCard product={p} />
                    </motion.div>
                  ))}
                </motion.div>

                {/* ── Infinite scroll sentinel ── */}
                <div ref={sentinelRef} className="w-full mt-8 flex justify-center">
                  {loadingMore && (
                    <div className="flex flex-col items-center gap-3 py-6">
                      <Loader2 size={28} className="text-gray-500 animate-spin" />
                      <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">
                        Loading more...
                      </p>
                    </div>
                  )}
                  {!hasMore && products.length > PAGE_SIZE && !searchQuery && (
                    <p className="text-[10px] font-bold text-gray-300 uppercase tracking-widest py-6">
                      ✅ All products loaded
                    </p>
                  )}
                </div>
              </>
            ) : (
              <div className="text-center py-32 bg-gradient-to-br from-gray-50 to-gray-100 rounded-[3rem] border-2 border-dashed border-gray-200">
                <div className="max-w-md mx-auto">
                  <div className="text-6xl mb-6">😔</div>
                  <h3 className="text-xl font-black text-gray-800 uppercase tracking-tight mb-3">
                    No Products Found
                  </h3>
                  <p className="text-gray-400 font-bold text-sm mb-8">
                    Try adjusting your filters or search terms
                  </p>
                  <button
                    onClick={resetFilters}
                    className="inline-flex items-center gap-2 bg-[#111] text-white px-8 py-4 rounded-2xl font-black text-xs uppercase tracking-widest hover:bg-gray-800 transition-all shadow-lg "
                  >
                    <X size={14} />
                    Clear All Filters
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </main>
  );
}
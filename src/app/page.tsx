"use client";
import { useAffiliate } from "../hooks/useAffiliate";
import React, { useState, useEffect, useRef, useCallback, useMemo } from "react";
import { db } from "../lib/firebase";
import {
  collection,
  doc,
  getDocs,
  onSnapshot,
  orderBy,
  query,
  where,
  limit,
  startAfter,
  QueryDocumentSnapshot,
  DocumentData,
} from "firebase/firestore";
import Link from "next/link";
import ProductCard from "../components/ProductCard";

// ─── Types ───────────────────────────────────────────────────────────────────
interface SectionBanner { pc: string; mobile: string; }
type LayoutType = "horizontal-scroll" | "vertical-infinite";

interface ProductArea {
  id: number;
  title: string;
  subtitle?: string;
  targetCategory: string;
  layoutType: LayoutType;
  banner?: SectionBanner;
}

interface BannerSlide { id: number; pc: string; mobile: string; }

const PAGE_SIZE = 12;

// ─── Per-Section Data Hook ───────────────────────────────────────────────────
function useProductSection(targetCategory: string) {
  const [products, setProducts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(true);

  const lastDocRef = useRef<QueryDocumentSnapshot<DocumentData> | null>(null);
  const loadingMoreRef = useRef(false);
  const hasMoreRef = useRef(true);

  const isAll = targetCategory === "__all__";
  const isSpecial = targetCategory.startsWith("__special__");
  const specialId = isSpecial ? targetCategory.replace("__special__", "") : null;

  const normalizedTarget = useMemo(
    () => targetCategory.toLowerCase().trim(),
    [targetCategory]
  );

  const buildQuery = useCallback(
    (after?: QueryDocumentSnapshot<DocumentData>) => {
      const constraints: any[] = [orderBy("createdAt", "desc"), limit(PAGE_SIZE)];
      if (isSpecial && specialId) {
        constraints.unshift(where("specialCategory", "==", specialId));
      } else if (!isAll) {
        constraints.unshift(where("mainCategory", "==", targetCategory));
      }
      if (after) constraints.push(startAfter(after));
      return query(collection(db, "products"), ...constraints);
    },
    [targetCategory, isAll, isSpecial, specialId]
  );

  const buildFallbackQuery = useCallback(
    (after?: QueryDocumentSnapshot<DocumentData>) => {
      const constraints: any[] = [orderBy("createdAt", "desc"), limit(PAGE_SIZE)];
      if (!isAll && !isSpecial) constraints.unshift(where("mainCategory", "==", normalizedTarget));
      if (after) constraints.push(startAfter(after));
      return query(collection(db, "products"), ...constraints);
    },
    [normalizedTarget, isAll, isSpecial]
  );

  useEffect(() => {
    setProducts([]);
    setLoading(true);
    setHasMore(true);
    hasMoreRef.current = true;
    lastDocRef.current = null;
    loadingMoreRef.current = false;

    const fetchFirstPage = async () => {
      try {
        const snap = await getDocs(buildQuery());
        let docs = snap.docs;
        if (docs.length === 0 && !isAll && !isSpecial) {
          const fallbackSnap = await getDocs(buildFallbackQuery());
          docs = fallbackSnap.docs;
        }
        const items = docs.map((d) => ({ id: d.id, ...d.data() }));
        setProducts(items);
        lastDocRef.current = docs[docs.length - 1] ?? null;
        const more = docs.length === PAGE_SIZE;
        setHasMore(more);
        hasMoreRef.current = more;
      } catch (err) {
        console.error("Section fetch error:", err);
      } finally {
        setLoading(false);
      }
    };

    fetchFirstPage();
  }, [buildQuery, buildFallbackQuery, isAll]);

  const loadMore = useCallback(async () => {
    if (loadingMoreRef.current || !hasMoreRef.current || !lastDocRef.current) return;
    loadingMoreRef.current = true;
    setLoadingMore(true);
    try {
      const snap = await getDocs(buildQuery(lastDocRef.current));
      let docs = snap.docs;
      if (docs.length === 0 && !isAll && !isSpecial) {
        const fallbackSnap = await getDocs(buildFallbackQuery(lastDocRef.current));
        docs = fallbackSnap.docs;
      }
      setProducts((prev) => [...prev, ...docs.map((d) => ({ id: d.id, ...d.data() }))]);
      lastDocRef.current = docs[docs.length - 1] ?? null;
      const more = docs.length === PAGE_SIZE;
      setHasMore(more);
      hasMoreRef.current = more;
    } catch (err) {
      console.error("Load more error:", err);
    } finally {
      loadingMoreRef.current = false;
      setLoadingMore(false);
    }
  }, [buildQuery, buildFallbackQuery, isAll]);

  return { products, loading, loadingMore, hasMore, loadMore };
}

// ─── Skeleton Card ────────────────────────────────────────────────────────────
function SkeletonCard({ className = "" }: { className?: string }) {
  return (
    <div
      className={`bg-[#e8e8e8] rounded-2xl overflow-hidden ${className}`}
      style={{ animation: "bw-pulse 1.6s ease-in-out infinite" }}
    >
      <div className="aspect-square" />
    </div>
  );
}

// ─── Horizontal Scroll Section ───────────────────────────────────────────────
function HorizontalSection({ area }: { area: ProductArea }) {
  const { products, loading, loadingMore, hasMore, loadMore } = useProductSection(area.targetCategory);
  const scrollRef = useRef<HTMLDivElement>(null);
  const sentinelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = scrollRef.current;
    if (!el || loading) return;
    let isDown = false, startX = 0, scrollLeft = 0;
    const onDown = (e: MouseEvent) => {
      isDown = true; el.style.cursor = "grabbing";
      startX = e.pageX - el.offsetLeft; scrollLeft = el.scrollLeft;
    };
    const onLeave = () => { isDown = false; el.style.cursor = "grab"; };
    const onUp = () => { isDown = false; el.style.cursor = "grab"; };
    const onMove = (e: MouseEvent) => {
      if (!isDown) return; e.preventDefault();
      el.scrollLeft = scrollLeft - (e.pageX - el.offsetLeft - startX) * 1.5;
    };
    el.addEventListener("mousedown", onDown);
    el.addEventListener("mouseleave", onLeave);
    el.addEventListener("mouseup", onUp);
    el.addEventListener("mousemove", onMove);
    return () => {
      el.removeEventListener("mousedown", onDown);
      el.removeEventListener("mouseleave", onLeave);
      el.removeEventListener("mouseup", onUp);
      el.removeEventListener("mousemove", onMove);
    };
  }, [loading]);

  useEffect(() => {
    const sentinel = sentinelRef.current;
    const container = scrollRef.current;
    if (!sentinel || !container) return;
    const obs = new IntersectionObserver(
      (entries) => { if (entries[0].isIntersecting) loadMore(); },
      { root: container, rootMargin: "0px 400px 0px 0px", threshold: 0 }
    );
    obs.observe(sentinel);
    return () => obs.disconnect();
  }, [loadMore, loading]);

  return (
    <div
      ref={scrollRef}
      className="flex gap-4 md:gap-5 overflow-x-auto no-scrollbar pb-4 select-none"
      style={{ scrollSnapType: "x mandatory", cursor: "grab" }}
    >
      {loading
        ? Array.from({ length: PAGE_SIZE }).map((_, i) => (
            <div key={i} className="flex-shrink-0 w-44 md:w-56" style={{ scrollSnapAlign: "start" }}>
              <SkeletonCard className="w-full" />
            </div>
          ))
        : products.map((p) => (
            <div key={p.id} className="flex-shrink-0 w-44 md:w-56" style={{ scrollSnapAlign: "start" }}>
              <ProductCard product={p} />
            </div>
          ))}

      {loadingMore && Array.from({ length: 4 }).map((_, i) => (
        <div key={`sk-${i}`} className="flex-shrink-0 w-44 md:w-56" style={{ scrollSnapAlign: "start" }}>
          <SkeletonCard className="w-full" />
        </div>
      ))}

      {!loading && hasMore && (
        <div ref={sentinelRef} className="flex-shrink-0 w-4 self-stretch" aria-hidden="true" />
      )}

      {!loading && !hasMore && products.length > 0 && (
        <div className="flex-shrink-0 flex flex-col items-center justify-center w-36 gap-3 px-4 border-l border-[#d4d4d4]">
          <span className="text-2xl opacity-30">◆</span>
          <p className="text-[9px] font-black uppercase tracking-[0.25em] text-[#aaa] text-center">
            END OF LIST
          </p>
        </div>
      )}

      {!loading && products.length === 0 && (
        <div className="flex-shrink-0 flex flex-col items-center justify-center w-64 gap-3 px-6 py-8 border border-dashed border-[#d4d4d4] rounded-2xl">
          <span className="text-3xl opacity-20">◻</span>
          <p className="text-[9px] font-black uppercase tracking-[0.25em] text-[#bbb] text-center">
            NO PRODUCTS YET
          </p>
        </div>
      )}
    </div>
  );
}

// ─── Vertical Infinite Scroll Section ───────────────────────────────────────
function VerticalSection({ area }: { area: ProductArea }) {
  const { products, loading, loadingMore, hasMore, loadMore } = useProductSection(area.targetCategory);
  const sentinelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const sentinel = sentinelRef.current;
    if (!sentinel) return;
    const obs = new IntersectionObserver(
      (entries) => { if (entries[0].isIntersecting) loadMore(); },
      { rootMargin: "300px", threshold: 0 }
    );
    obs.observe(sentinel);
    return () => obs.disconnect();
  }, [loadMore, loading]);

  return (
    <>
      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4 md:gap-5">
        {loading
          ? Array.from({ length: PAGE_SIZE }).map((_, i) => (
              <SkeletonCard key={i} />
            ))
          : products.map((p) => <ProductCard key={p.id} product={p} />)}
        {loadingMore && Array.from({ length: 6 }).map((_, i) => (
          <SkeletonCard key={`sk-${i}`} />
        ))}
      </div>

      {!loading && products.length === 0 && (
        <div className="flex flex-col items-center justify-center py-20 gap-4">
          <div className="w-16 h-px bg-[#d4d4d4]" />
          <p className="text-[10px] font-black uppercase tracking-[0.3em] text-[#bbb]">
            NOTHING HERE YET
          </p>
          <div className="w-16 h-px bg-[#d4d4d4]" />
        </div>
      )}

      {!loading && (
        <div ref={sentinelRef} className="flex justify-center py-10">
          {!hasMore && products.length > 0 && (
            <div className="flex items-center gap-4">
              <div className="w-10 h-px bg-[#d4d4d4]" />
              <p className="text-[9px] font-black uppercase tracking-[0.3em] text-[#bbb]">
                YOU'VE SEEN IT ALL
              </p>
              <div className="w-10 h-px bg-[#d4d4d4]" />
            </div>
          )}
        </div>
      )}
    </>
  );
}

// ─── Section Banner ──────────────────────────────────────────────────────────
function SectionBannerImg({ banner }: { banner: SectionBanner }) {
  const src = banner.pc || banner.mobile;
  if (!src) return null;
  return (
    <div className="w-full rounded-2xl overflow-hidden mb-6 border border-[#1e1e1e]">
      <picture className="block w-full">
        {banner.mobile && <source media="(max-width: 768px)" srcSet={banner.mobile} />}
        <img
          src={src}
          alt="Section banner"
          loading="lazy"
          className="w-full object-cover max-h-48 md:max-h-64"
        />
      </picture>
    </div>
  );
}

// ─── Main Home Page ──────────────────────────────────────────────────────────
export default function Home() {
  useAffiliate();

  const [homeConfig, setHomeConfig] = useState<any>(null);
  const [categories, setCategories] = useState<any[]>([]);
  const [currentSlide, setCurrentSlide] = useState(0);

  useEffect(() => {
    const unsub = onSnapshot(doc(db, "settings", "homepage"), (snap) => {
      if (!snap.exists()) return;
      const data = snap.data();

      let banners: BannerSlide[] = [];
      if (Array.isArray(data.mainBanners)) {
        banners = data.mainBanners.map((b: any) => ({
          id: b.id || Math.random(),
          pc: b.pc || b.img || "",
          mobile: b.mobile || b.pc || b.img || "",
        }));
      } else if (data.mainBanners && typeof data.mainBanners === "object") {
        banners = [{
          id: Date.now(),
          pc: data.mainBanners.pc || "",
          mobile: data.mainBanners.mobile || data.mainBanners.pc || "",
        }];
      }

      setHomeConfig({ ...data, mainBanners: banners });
    });
    return () => unsub();
  }, []);

  useEffect(() => {
    const unsub = onSnapshot(collection(db, "categories"), (snap) => {
      setCategories(
        snap.docs.map((d) => ({
          id: d.id,
          name: d.data().name || "",
          img: d.data().img || null,
          bgColor: d.data().bgColor || "#f0f0f0",
        }))
      );
    });
    return () => unsub();
  }, []);

  useEffect(() => {
    const banners = homeConfig?.mainBanners;
    if (!Array.isArray(banners) || banners.length <= 1) return;
    const timer = setInterval(
      () => setCurrentSlide((p) => (p === banners.length - 1 ? 0 : p + 1)),
      5000
    );
    return () => clearInterval(timer);
  }, [homeConfig]);

  const banners: BannerSlide[] = homeConfig?.mainBanners || [];

  const productAreas: ProductArea[] = useMemo(
    () => (homeConfig?.productAreas || []) as ProductArea[],
    [homeConfig]
  );

  return (
    <>
      {/* ── GLOBAL STYLES ── */}
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Bebas+Neue&family=DM+Sans:wght@300;400;500;700;900&display=swap');

        :root {
          --bg: #f5f5f5;
          --surface: #ffffff;
          --surface-2: #eeeeee;
          --border: #d4d4d4;
          --text: #111111;
          --text-muted: #888888;
          --text-dim: #cccccc;
          --accent: #111111;
          --accent-dim: rgba(0,0,0,0.05);
        }

        body { background: var(--bg); color: var(--text); }

        @keyframes bw-pulse {
          0%, 100% { opacity: 0.5; }
          50% { opacity: 0.9; }
        }

        @keyframes slideReveal {
          from { opacity: 0; transform: translateY(18px); }
          to   { opacity: 1; transform: translateY(0); }
        }

        @keyframes fadeIn {
          from { opacity: 0; }
          to   { opacity: 1; }
        }

        .animate-reveal { animation: slideReveal 0.6s cubic-bezier(0.22,1,0.36,1) both; }
        .animate-fade   { animation: fadeIn 0.4s ease both; }

        .no-scrollbar::-webkit-scrollbar { display: none; }
        .no-scrollbar { -ms-overflow-style: none; scrollbar-width: none; }

        /* Noise texture overlay */
        .noise::after {
          content: "";
          position: absolute;
          inset: 0;
          background-image: url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noise'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noise)' opacity='0.04'/%3E%3C/svg%3E");
          pointer-events: none;
          z-index: 5;
          border-radius: inherit;
        }

        .bw-btn {
          display: inline-flex;
          align-items: center;
          font-size: 10px;
          font-weight: 900;
          letter-spacing: 0.2em;
          text-transform: uppercase;
          color: var(--text-muted);
          border: 1px solid var(--border);
          padding: 6px 14px;
          border-radius: 100px;
          transition: all 0.2s ease;
          font-family: 'DM Sans', sans-serif;
          background: transparent;
        }
        .bw-btn:hover {
          color: #111;
          border-color: #999;
          background: rgba(0,0,0,0.04);
        }

        .cat-card-img {
          transform: translateY(0);
          box-shadow: 0 2px 8px rgba(0,0,0,0.06);
        }
        .cat-card:hover .cat-card-img {
          transform: translateY(-3px);
          box-shadow: 0 8px 20px rgba(0,0,0,0.12);
        }
        .cat-card:hover .cat-card-label {
          color: #111;
        }

        /* ── BANNER RESPONSIVE ── */
        /* Mobile: portrait 4:5, show mobile image only */
        .banner-aspect {
          aspect-ratio: 4/5;
        }
        .banner-mobile-img {
          display: block;
        }
        .banner-desktop-img {
          display: none;
        }
        /* Desktop: wide 21:7, show desktop image only */
        @media (min-width: 768px) {
          .banner-aspect {
            aspect-ratio: 21/7;
          }
          .banner-mobile-img {
            display: none;
          }
          .banner-desktop-img {
            display: block;
          }
        }
      `}</style>

      <main style={{ background: "var(--bg)", minHeight: "100vh", paddingBottom: "5rem", fontFamily: "'DM Sans', sans-serif" }}>
        <div style={{ maxWidth: "1400px", margin: "0 auto", padding: "1rem 1.25rem" }}>

          {/* ── HERO BANNER ── */}
          <div
            style={{
              position: "relative",
              borderRadius: "1.5rem",
              overflow: "hidden",
              border: "1px solid var(--border)",
              boxShadow: "0 0 0 1px #ddd, 0 20px 50px rgba(0,0,0,0.12)",
            }}
          >
            {/* aspectRatio changes on mobile vs desktop via className */}
            <div className="banner-aspect" style={{ position: "relative", background: "#e8e8e8", overflow: "hidden" }}>
              {banners.length > 0 ? (
                banners.map((banner, index) => (
                  <div
                    key={banner.id}
                    style={{
                      position: "absolute",
                      inset: 0,
                      transition: "opacity 1s ease",
                      opacity: index === currentSlide ? 1 : 0,
                      zIndex: index === currentSlide ? 10 : 0,
                    }}
                  >
                    {/* Mobile image */}
                    {banner.mobile && (
                      <img
                        src={banner.mobile}
                        style={{ width: "100%", height: "100%", objectFit: "cover", objectPosition: "center" }}
                        alt={`Slide ${index + 1}`}
                        loading={index === 0 ? "eager" : "lazy"}
                        className="banner-mobile-img"
                      />
                    )}
                    {/* Desktop image */}
                    {banner.pc && (
                      <img
                        src={banner.pc}
                        style={{ width: "100%", height: "100%", objectFit: "cover", objectPosition: "center" }}
                        alt={`Slide ${index + 1}`}
                        loading={index === 0 ? "eager" : "lazy"}
                        className="banner-desktop-img"
                      />
                    )}
                    {/* Dark gradient overlay */}
                    <div style={{ position: "absolute", inset: 0, background: "linear-gradient(to top, rgba(0,0,0,0.5) 0%, transparent 60%)", zIndex: 2 }} />
                  </div>
                ))
              ) : (
                <div style={{
                  width: "100%", height: "100%", display: "flex", alignItems: "center", justifyContent: "center",
                  color: "#bbb", fontSize: "10px", fontWeight: 900, letterSpacing: "0.3em",
                  animation: "bw-pulse 1.6s ease-in-out infinite"
                }}>
                  SYNCING...
                </div>
              )}

              {/* Slide dots */}
              {banners.length > 1 && (
                <div style={{ position: "absolute", bottom: "1.5rem", left: "50%", transform: "translateX(-50%)", display: "flex", gap: "8px", zIndex: 20 }}>
                  {banners.map((_, i) => (
                    <button
                      key={i}
                      onClick={() => setCurrentSlide(i)}
                      style={{
                        height: "2px",
                        width: i === currentSlide ? "2rem" : "0.5rem",
                        background: i === currentSlide ? "#111" : "rgba(0,0,0,0.25)",
                        border: "none",
                        cursor: "pointer",
                        borderRadius: "100px",
                        transition: "all 0.3s ease",
                        padding: 0,
                      }}
                    />
                  ))}
                </div>
              )}

              {/* Prev / Next */}
              {banners.length > 1 && (
                <>
                  <button
                    onClick={() => setCurrentSlide((p) => (p === 0 ? banners.length - 1 : p - 1))}
                    style={{
                      position: "absolute", left: "1rem", top: "50%", transform: "translateY(-50%)", zIndex: 20,
                      width: "36px", height: "36px", borderRadius: "50%",
                      background: "rgba(255,255,255,0.75)", backdropFilter: "blur(8px)",
                      border: "1px solid rgba(0,0,0,0.1)", color: "#111",
                      cursor: "pointer", fontSize: "18px", display: "flex", alignItems: "center", justifyContent: "center",
                      transition: "all 0.2s ease",
                    }}
                  >‹</button>
                  <button
                    onClick={() => setCurrentSlide((p) => (p === banners.length - 1 ? 0 : p + 1))}
                    style={{
                      position: "absolute", right: "1rem", top: "50%", transform: "translateY(-50%)", zIndex: 20,
                      width: "36px", height: "36px", borderRadius: "50%",
                      background: "rgba(255,255,255,0.75)", backdropFilter: "blur(8px)",
                      border: "1px solid rgba(0,0,0,0.1)", color: "#111",
                      cursor: "pointer", fontSize: "18px", display: "flex", alignItems: "center", justifyContent: "center",
                      transition: "all 0.2s ease",
                    }}
                  >›</button>
                </>
              )}
            </div>
          </div>

          {/* ── CATEGORIES ── */}
          {categories.length > 0 && (
            <div style={{ margin: "3rem 0 4rem", overflowX: "auto", WebkitOverflowScrolling: "touch" }} className="no-scrollbar">
              <div style={{ display: "flex", gap: "0.75rem", padding: "0 1rem", minWidth: "max-content" }}>
                {categories.map((cat, i) => (
                  <Link
                    href={`/shop?category=${cat.name}`}
                    key={cat.id}
                    className="cat-card"
                    style={{
                      display: "block",
                      textDecoration: "none",
                      width: "10rem",
                      flexShrink: 0,
                      animation: `slideReveal 0.5s cubic-bezier(0.22,1,0.36,1) ${i * 60}ms both`,
                    }}
                  >
                    {/* Square image */}
                    <div style={{
                      width: "10rem",
                      height: "14rem",
                      borderRadius: "1.25rem",
                      overflow: "hidden",
                      background: cat.bgColor || "#f0f0f0",
                      position: "relative",
                      border: "1px solid #e8e8e8",
                      transition: "transform 0.25s ease, box-shadow 0.25s ease",
                    }} className="cat-card-img">
                      {cat.img ? (
                        <img
                          src={cat.img}
                          alt={cat.name}
                          loading="lazy"
                          style={{
                            width: "100%",
                            height: "100%",
                            objectFit: "cover",
                            objectPosition: "center",
                            display: "block",
                          }}
                        />
                      ) : (
                        <div style={{
                          width: "100%", height: "100%",
                          display: "flex", alignItems: "center", justifyContent: "center",
                        }}>
                          <span style={{
                            fontFamily: "'Bebas Neue', sans-serif",
                            fontSize: "12px", letterSpacing: "0.08em",
                            color: "#999", textAlign: "center", padding: "0 8px",
                          }}>
                            {cat.name}
                          </span>
                        </div>
                      )}
                    </div>

                    {/* Name label below */}
                    <p style={{
                      fontSize: "9px", fontWeight: 800,
                      textTransform: "uppercase", letterSpacing: "0.18em",
                      color: "#999", textAlign: "center",
                      marginTop: "0.5rem", margin: "0.5rem 0 0",
                      transition: "color 0.2s ease",
                      whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis",
                    }} className="cat-card-label">
                      {cat.name}
                    </p>
                  </Link>
                ))}
              </div>
            </div>
          )}

          {/* ── DIVIDER ── */}
          <div style={{ display: "flex", alignItems: "center", gap: "1rem", marginBottom: "3rem", opacity: 0.3 }}>
            <div style={{ flex: 1, height: "1px", background: "#111" }} />
            <span style={{ fontFamily: "'Bebas Neue'", fontSize: "11px", letterSpacing: "0.4em", color: "#111" }}>◆</span>
            <div style={{ flex: 1, height: "1px", background: "#111" }} />
          </div>

          {/* ── PRODUCT SECTIONS ── */}
          {productAreas.length > 0 ? (
            productAreas.map((area, areaIdx) => (
              <div
                key={area.id}
                style={{
                  marginBottom: "4rem",
                  animation: `slideReveal 0.6s cubic-bezier(0.22,1,0.36,1) ${areaIdx * 80}ms both`,
                }}
              >
                {/* Section header */}
                <div style={{ marginBottom: "1.5rem", display: "flex", alignItems: "flex-end", justifyContent: "space-between", padding: "0 2px" }}>
                  <div>
                    <h2 style={{
                      fontFamily: "'Bebas Neue', sans-serif",
                      fontSize: "clamp(2rem, 4vw, 3rem)",
                      fontWeight: 400,
                      color: "var(--text)",
                      letterSpacing: "0.05em",
                      lineHeight: 1,
                      margin: 0,
                    }}>
                      {area.title}
                    </h2>
                    {area.subtitle && (
                      <p style={{
                        fontSize: "9px", fontWeight: 700, color: "var(--text-muted)",
                        textTransform: "uppercase", letterSpacing: "0.25em", marginTop: "0.4rem"
                      }}>
                        {area.subtitle}
                      </p>
                    )}
                    {/* Accent line */}
                    <div style={{ width: "2.5rem", height: "2px", background: "#111", marginTop: "0.75rem", opacity: 0.2 }} />
                  </div>

                  <Link
                    href={
                      area.targetCategory === "__all__"
                        ? "/shop"
                        : area.targetCategory.startsWith("__special__")
                        ? `/shop?special=${area.targetCategory.replace("__special__", "")}`
                        : `/shop?category=${area.targetCategory}`
                    }
                    className="bw-btn"
                  >
                    View All →
                  </Link>
                </div>

                {area.banner && <SectionBannerImg banner={area.banner} />}

                {area.layoutType === "horizontal-scroll" ? (
                  <HorizontalSection area={area} />
                ) : (
                  <VerticalSection area={area} />
                )}
              </div>
            ))
          ) : (
            <div style={{ marginBottom: "4rem" }}>
              <div style={{ marginBottom: "1.5rem", display: "flex", alignItems: "flex-end", justifyContent: "space-between", padding: "0 2px" }}>
                <div>
                  <h2 style={{
                    fontFamily: "'Bebas Neue', sans-serif",
                    fontSize: "clamp(2rem, 4vw, 3rem)",
                    fontWeight: 400,
                    color: "var(--text)",
                    letterSpacing: "0.05em",
                    lineHeight: 1,
                    margin: 0,
                  }}>
                    New Arrivals
                  </h2>
                  <div style={{ width: "2.5rem", height: "2px", background: "#111", marginTop: "0.75rem", opacity: 0.2 }} />
                </div>
                <Link href="/shop" className="bw-btn">View All →</Link>
              </div>
              <HorizontalSection
                area={{ id: 0, title: "New Arrivals", targetCategory: "__all__", layoutType: "horizontal-scroll" }}
              />
            </div>
          )}

        </div>
      </main>
    </>
  );
}
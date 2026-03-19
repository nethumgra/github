"use client";
import React, { useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { db } from '../../lib/firebase';
import { collection, getDocs } from 'firebase/firestore';
import { Loader2, Search, Heart, ShoppingCart, X, SlidersHorizontal } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { toast } from 'react-hot-toast';

export default function SearchPage() {
  const searchParams = useSearchParams();
  const query = searchParams.get('q')?.toLowerCase() || '';
  const { user } = useAuth();

  const [products, setProducts] = useState<any[]>([]);
  const [filteredProducts, setFilteredProducts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [cartLoadingId, setCartLoadingId] = useState<string | null>(null);
  const [sortBy, setSortBy] = useState<'relevance' | 'price-asc' | 'price-desc' | 'newest'>('relevance');

  useEffect(() => {
    const fetchProducts = async () => {
      setLoading(true);
      try {
        const snap = await getDocs(collection(db, "products"));
        const all = snap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        setProducts(all);
      } catch (error) {
        console.error("Error fetching products:", error);
      } finally {
        setLoading(false);
      }
    };
    fetchProducts();
  }, []);

  // ✅ Filter + sort
  useEffect(() => {
    let results = query
      ? products.filter(p =>
          p.name?.toLowerCase().includes(query) ||
          p.mainCategory?.toLowerCase().includes(query) ||
          p.category?.toLowerCase().includes(query) ||
          p.description?.toLowerCase().includes(query) ||
          (p.tags || []).some((t: string) => t.toLowerCase().includes(query))
        )
      : [...products];

    // Sort
    if (sortBy === 'price-asc') {
      results.sort((a, b) => (a.discountedPrice || a.price || 0) - (b.discountedPrice || b.price || 0));
    } else if (sortBy === 'price-desc') {
      results.sort((a, b) => (b.discountedPrice || b.price || 0) - (a.discountedPrice || a.price || 0));
    } else if (sortBy === 'newest') {
      results.sort((a, b) => {
        const aTime = a.createdAt?.toMillis?.() || 0;
        const bTime = b.createdAt?.toMillis?.() || 0;
        return bTime - aTime;
      });
    }

    setFilteredProducts(results);
  }, [query, products, sortBy]);

  // ✅ Add to cart — matches ProductCard logic
  const handleAddToCart = (e: React.MouseEvent, product: any) => {
    e.preventDefault();
    e.stopPropagation();
    setCartLoadingId(product.id);

    try {
      const cart: any[] = JSON.parse(localStorage.getItem("loversmart_cart") || "[]");
      const idx = cart.findIndex(item => item.id === product.id);
      if (idx > -1) {
        cart[idx].qty += 1;
        toast.success("Cart eke quantity wada kala! 🛒");
      } else {
        cart.push({
          id: product.id,
          name: product.name,
          price: product.discountedPrice || product.price || 0,
          image: product.images?.[0] || "",
          qty: 1,
          deliveryCharge: product.deliveryCharge || 450,
        });
        toast.success("Cart ekata dunna! 🛒");
      }
      localStorage.setItem("loversmart_cart", JSON.stringify(cart));
      window.dispatchEvent(new Event("cart-updated"));
    } catch {
      toast.error("Cart ekata denna bari una!");
    } finally {
      setTimeout(() => setCartLoadingId(null), 500);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-4 bg-[#fafafa]">
        <Loader2 className="animate-spin text-[#111]" size={40} />
        <p className="text-[10px] font-black uppercase tracking-[0.3em] text-gray-300">Searching...</p>
      </div>
    );
  }

  return (
    <main className="bg-[#fafafa] min-h-screen">
      <div className="max-w-7xl mx-auto px-4 py-12">

        {/* ── Header ── */}
        <div className="mb-10 flex flex-col md:flex-row md:items-end justify-between gap-6">
          <div>
            <p className="text-[10px] font-black uppercase tracking-[0.3em] text-gray-500 mb-2">
              Search Results
            </p>
            <h1 className="text-3xl md:text-4xl font-black text-gray-900 uppercase tracking-tighter">
              {query ? (
                <>
                  Results for{" "}
                  <span className="relative inline-block">
                    <span className="relative z-10">"{query}"</span>
                    <span className="absolute bottom-1 left-0 w-full h-2 bg-gray-200 -z-10 rounded" />
                  </span>
                </>
              ) : "All Products"}
            </h1>
            <p className="text-gray-400 font-bold text-sm mt-2">
              {filteredProducts.length} item{filteredProducts.length !== 1 ? "s" : ""} found
            </p>
          </div>

          {/* Sort */}
          {filteredProducts.length > 0 && (
            <div className="flex items-center gap-3">
              <SlidersHorizontal size={14} className="text-gray-400" />
              <div className="flex gap-2 flex-wrap">
                {([
                  { value: 'relevance', label: 'Best Match' },
                  { value: 'price-asc', label: 'Price ↑' },
                  { value: 'price-desc', label: 'Price ↓' },
                  { value: 'newest', label: 'Newest' },
                ] as const).map(opt => (
                  <button
                    key={opt.value}
                    onClick={() => setSortBy(opt.value)}
                    className={`px-4 py-2 rounded-full text-[10px] font-black uppercase tracking-wide transition-all ${
                      sortBy === opt.value
                        ? 'bg-gray-900 text-white shadow-md'
                        : 'bg-white text-gray-500 border border-gray-100 hover:border-gray-300'
                    }`}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* ── Results Grid ── */}
        {filteredProducts.length > 0 ? (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4 md:gap-6">
            {filteredProducts.map((product) => {
              // ✅ Correct field names matching ProductsTab save logic
              const displayPrice = product.discountedPrice || product.price || 0;
              const originalPrice = product.originalPrice || product.price || 0;
              const hasDiscount = product.originalPrice && product.discountedPrice && product.originalPrice > product.discountedPrice;
              const discountPct = hasDiscount
                ? Math.round(((product.originalPrice - product.discountedPrice) / product.originalPrice) * 100)
                : 0;
              // ✅ Correct image field — images array
              const image = product.images?.[0] || "/placeholder.jpg";
              const isOutOfStock = product.stock === 0;

              return (
                <div key={product.id} className="group cursor-pointer relative">
                  <Link href={`/product/${product.id}`}>
                    <div className="aspect-square bg-gray-50 rounded-2xl md:rounded-[2rem] relative overflow-hidden mb-3 border border-gray-100 transition-all duration-500 group-hover:shadow-2xl group-hover:shadow-gray-200 group-hover:-translate-y-1">

                      {/* Image */}
                      <img
                        src={image}
                        alt={product.name}
                        className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110"
                      />

                      {/* Badges */}
                      <div className="absolute top-3 left-3 flex flex-col gap-1.5 z-10">
                        {discountPct > 0 && (
                          <span className="bg-[#111] text-white text-[9px] font-black px-2 py-1 rounded-lg shadow uppercase">
                            -{discountPct}%
                          </span>
                        )}
                        {isOutOfStock && (
                          <span className="bg-gray-700 text-white text-[9px] font-black px-2 py-1 rounded-lg shadow uppercase">
                            Sold Out
                          </span>
                        )}
                        {product.stock > 0 && product.stock <= 5 && (
                          <span className="bg-[#555] text-white text-[9px] font-black px-2 py-1 rounded-lg shadow uppercase">
                            {product.stock} Left
                          </span>
                        )}
                      </div>

                      {/* Quick Add overlay */}
                      <div className="absolute inset-0 bg-gradient-to-t from-black/50 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex items-end justify-center pb-4 z-10">
                        <button
                          onClick={(e) => handleAddToCart(e, product)}
                          disabled={cartLoadingId === product.id || isOutOfStock}
                          className="bg-white text-gray-900 px-5 py-2.5 rounded-full font-black text-[10px] uppercase tracking-widest flex items-center gap-2 shadow-xl hover:bg-[#111] hover:text-white transition-all active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          {cartLoadingId === product.id ? (
                            <Loader2 size={13} className="animate-spin" />
                          ) : (
                            <><ShoppingCart size={13} /> Quick Add</>
                          )}
                        </button>
                      </div>
                    </div>
                  </Link>

                  {/* Product Info */}
                  <div className="px-1">
                    <p className="text-[9px] font-black text-gray-500 uppercase tracking-[0.2em] mb-1">
                      {product.mainCategory || product.category}
                    </p>
                    <Link href={`/product/${product.id}`}>
                      <h3 className="text-[12px] md:text-[13px] font-bold text-gray-800 line-clamp-2 uppercase mb-2 hover:text-[#111] transition-colors leading-snug">
                        {product.name}
                      </h3>
                    </Link>
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="text-[14px] font-black text-[#111]">
                        Rs. {displayPrice.toLocaleString()}
                      </p>
                      {hasDiscount && (
                        <p className="text-[11px] text-gray-400 line-through font-bold">
                          Rs. {originalPrice.toLocaleString()}
                        </p>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          // ── Empty State ──
          <div className="flex flex-col items-center justify-center py-32 gap-6">
            <div className="w-24 h-24 bg-gray-100 rounded-full flex items-center justify-center">
              <Search size={36} className="text-gray-300" />
            </div>
            <div className="text-center">
              <h2 className="text-xl font-black text-gray-800 uppercase tracking-tight mb-2">
                No results for "{query}"
              </h2>
              <p className="text-gray-400 font-bold text-sm">
                Try different keywords or browse all products
              </p>
            </div>
            <Link
              href="/shop"
              className="bg-gray-900 text-white px-8 py-4 rounded-2xl font-black text-xs uppercase tracking-widest hover:bg-[#111] transition-all"
            >
              Browse All Products
            </Link>
          </div>
        )}
      </div>
    </main>
  );
}
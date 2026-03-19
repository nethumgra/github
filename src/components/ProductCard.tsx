"use client";
import React, { useState, useEffect } from "react";
import Link from "next/link";
import { Heart, ShoppingCart, Loader2 } from "lucide-react";
import { db } from "../lib/firebase";
import { doc, setDoc, deleteDoc, getDoc, onSnapshot } from "firebase/firestore";
import { useAuth } from "../context/AuthContext";
import { toast } from "react-hot-toast";

interface ProductProps {
  product: any;
}

const ProductCard = ({ product }: ProductProps) => {
  const { user } = useAuth();
  const [isFavorite, setIsFavorite] = useState(false);
  const [wishlistLoading, setWishlistLoading] = useState(false);
  const [cartLoading, setCartLoading] = useState(false);
  const [liveStock, setLiveStock] = useState<number | undefined>(product.stock);

  useEffect(() => {
    if (!product?.id) return;
    const ref = doc(db, "products", product.id);
    const unsub = onSnapshot(ref, (snap) => {
      if (snap.exists()) {
        const data = snap.data();
        if (data.stock !== undefined) setLiveStock(data.stock);
      }
    });
    return () => unsub();
  }, [product?.id]);

  useEffect(() => {
    if (!user?.uid || !product?.id) return;
    const checkWishlist = async () => {
      try {
        const ref = doc(db, "wishlist", `${user.uid}_${product.id}`);
        const snap = await getDoc(ref);
        setIsFavorite(snap.exists());
      } catch (e) {}
    };
    checkWishlist();
  }, [user?.uid, product?.id]);

  const toggleWishlist = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (!user) { toast.error("Login karanna wishlist use karannat! 🔒"); return; }
    if (wishlistLoading) return;
    setWishlistLoading(true);
    try {
      const docId = `${user.uid}_${product.id}`;
      const ref = doc(db, "wishlist", docId);
      if (isFavorite) {
        await deleteDoc(ref);
        setIsFavorite(false);
        toast.success("Wishlist ekin ayin kala ✔");
      } else {
        await setDoc(ref, {
          userId: user.uid,
          productId: product.id,
          name: product.name,
          price: product.discountedPrice || product.price || 0,
          originalPrice: product.originalPrice || product.price || 0,
          image: product.images?.[0] || "",
          images: product.images || [],
          mainCategory: product.mainCategory || product.category || "",
          category: product.category || "",
          addedAt: new Date().toISOString(),
        });
        setIsFavorite(true);
        toast.success("Wishlist ekata dunna! 💖");
      }
      window.dispatchEvent(new Event("wishlist-updated"));
    } catch (err) {
      console.error("Wishlist error:", err);
      toast.error("Error una, anith wishlist karanna try karanna!");
    } finally {
      setWishlistLoading(false);
    }
  };

  const handleQuickAdd = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (isSoldOut) { toast.error("Meya sold out! 😢"); return; }
    if (cartLoading) return;
    setCartLoading(true);
    try {
      const cart: any[] = JSON.parse(localStorage.getItem("loversmart_cart") || "[]");
      const existingIndex = cart.findIndex((item) => item.id === product.id);
      if (existingIndex > -1) {
        const newQty = cart[existingIndex].qty + 1;
        if (liveStock !== undefined && newQty > liveStock) {
          toast.error(`Only ${liveStock} in stock! 📦`);
          setCartLoading(false);
          return;
        }
        cart[existingIndex].qty = newQty;
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
    } catch (err) {
      console.error("Cart error:", err);
      toast.error("Cart ekata denna bari una!");
    } finally {
      setTimeout(() => setCartLoading(false), 500);
    }
  };

  const isSpecial = !!product.specialCategory;
  const displayPrice = product.discountedPrice || product.price || 0;
  const originalPrice = product.originalPrice || product.price || 0;
  const hasDiscount =
    product.originalPrice && product.discountedPrice &&
    product.originalPrice > product.discountedPrice;
  const discountPercent = hasDiscount
    ? Math.round(((product.originalPrice - product.discountedPrice) / product.originalPrice) * 100) : 0;

  const isNew = (() => {
    try {
      if (!product.createdAt) return false;
      const created = product.createdAt?.toDate ? product.createdAt.toDate() : new Date(product.createdAt);
      return (Date.now() - created.getTime()) / (1000 * 60 * 60 * 24) <= 14;
    } catch { return false; }
  })();

  const isSoldOut = liveStock !== undefined && liveStock === 0;
  const isLowStock = liveStock !== undefined && liveStock > 0 && liveStock <= 5;

  // ── SPECIAL CARD ──────────────────────────────────────────────────────────
  if (isSpecial) {
    return (
      <div className="group cursor-pointer relative col-span-2 row-span-2">
        <Link href={`/product/${product.id}`}>
          <div style={{
            position: "relative", borderRadius: "1.5rem", overflow: "hidden",
            background: "#fff", boxShadow: "0 2px 16px rgba(0,0,0,0.07)",
            transition: "box-shadow 0.3s ease, transform 0.3s ease", aspectRatio: "3/4",
          }} className="group-hover:-translate-y-1 group-hover:shadow-2xl">
            <button onClick={toggleWishlist} disabled={wishlistLoading} style={{
              position: "absolute", top: "0.75rem", right: "0.75rem", zIndex: 20,
              padding: "0.45rem", background: "rgba(255,255,255,0.95)", borderRadius: "50%",
              border: "none", cursor: "pointer", boxShadow: "0 1px 8px rgba(0,0,0,0.1)",
              display: "flex", alignItems: "center", justifyContent: "center",
            }}>
              {wishlistLoading
                ? <Loader2 size={15} style={{ color: "#bbb", animation: "spin 1s linear infinite" }} />
                : <Heart size={17} style={{ color: isFavorite ? "#e11d48" : "#ccc", fill: isFavorite ? "#e11d48" : "none", transition: "all 0.2s" }} />
              }
            </button>
            <div style={{ position: "absolute", top: "0.75rem", left: "0.75rem", zIndex: 10, display: "flex", flexDirection: "column", gap: "4px" }}>
              {discountPercent > 0 && !isSoldOut && (
                <span style={{ background: "#111", color: "#fff", fontSize: "9px", fontWeight: 900, padding: "2px 8px", borderRadius: "6px" }}>-{discountPercent}%</span>
              )}
              {isNew && !isSoldOut && (
                <span style={{ background: "#18b06a", color: "#fff", fontSize: "9px", fontWeight: 900, padding: "2px 8px", borderRadius: "6px" }}>NEW</span>
              )}
            </div>
            <img src={product.images?.[0] || "/placeholder.jpg"} alt={product.name}
              style={{ width: "100%", height: "100%", objectFit: "cover", objectPosition: "top", transition: "transform 0.6s ease" }}
              className="group-hover:scale-105" />
            <div style={{
              position: "absolute", inset: 0,
              background: "linear-gradient(to top, rgba(0,0,0,0.4) 0%, transparent 55%)",
              opacity: 0, transition: "opacity 0.3s ease",
              display: "flex", alignItems: "flex-end", justifyContent: "center", paddingBottom: "1.25rem", zIndex: 10,
            }} className="group-hover:opacity-100">
              <div style={{
                background: "rgba(255,255,255,0.97)", color: "#111", width: "80%", padding: "0.6rem",
                borderRadius: "100px", fontSize: "10px", fontWeight: 900, textTransform: "uppercase",
                letterSpacing: "0.2em", textAlign: "center",
              }}>View Details →</div>
            </div>
          </div>
        </Link>
        <div style={{ padding: "0.6rem 4px 0" }}>
          <Link href={`/product/${product.id}`} style={{ textDecoration: "none" }}>
            <h3 style={{ fontSize: "13px", fontWeight: 700, color: "#e5e5e5", marginBottom: "4px", lineHeight: 1.3, display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", overflow: "hidden" }}>
              {product.name}
            </h3>
          </Link>
          <p style={{ fontSize: "15px", fontWeight: 900, color: "#fff", margin: 0 }}>
            Rs. {displayPrice.toLocaleString()}
            {hasDiscount && <span style={{ fontSize: "11px", color: "#555", textDecoration: "line-through", fontWeight: 600, marginLeft: "8px" }}>Rs. {originalPrice.toLocaleString()}</span>}
          </p>
        </div>
      </div>
    );
  }

  // ── NORMAL CARD — white card, 3:4 portrait photo, clean info strip ─────────
  return (
    <div className="group cursor-pointer relative" style={{ opacity: isSoldOut ? 0.72 : 1 }}>
      <div style={{
        background: "#ffffff", borderRadius: "1.25rem", overflow: "hidden",
        boxShadow: "0 2px 12px rgba(0,0,0,0.06)",
        transition: "box-shadow 0.3s ease, transform 0.3s ease",
        display: "flex", flexDirection: "column",
      }} className={!isSoldOut ? "group-hover:-translate-y-0.5 group-hover:shadow-xl" : ""}>

        {/* PHOTO */}
        <Link href={isSoldOut ? "#" : `/product/${product.id}`}
          onClick={isSoldOut ? (e) => e.preventDefault() : undefined}
          style={{ display: "block", position: "relative", aspectRatio: "3/4", overflow: "hidden", background: "#f5f5f5" }}>

          {/* Wishlist btn */}
          <button onClick={toggleWishlist} disabled={wishlistLoading} style={{
            position: "absolute", top: "0.6rem", right: "0.6rem", zIndex: 20,
            padding: "0.35rem", background: "rgba(255,255,255,0.92)", borderRadius: "50%",
            border: "none", cursor: "pointer", boxShadow: "0 1px 6px rgba(0,0,0,0.1)",
            display: "flex", alignItems: "center", justifyContent: "center",
            opacity: 0, transition: "opacity 0.2s ease",
          }} className="group-hover:opacity-100">
            {wishlistLoading
              ? <Loader2 size={13} style={{ color: "#aaa", animation: "spin 1s linear infinite" }} />
              : <Heart size={14} style={{ color: isFavorite ? "#e11d48" : "#bbb", fill: isFavorite ? "#e11d48" : "none", transition: "all 0.2s" }} />
            }
          </button>

          {/* Badges */}
          <div style={{ position: "absolute", top: "0.6rem", left: "0.6rem", zIndex: 10, display: "flex", flexDirection: "column", gap: "3px" }}>
            {discountPercent > 0 && !isSoldOut && (
              <span style={{ background: "#111", color: "#fff", fontSize: "8px", fontWeight: 900, padding: "2px 6px", borderRadius: "5px" }}>-{discountPercent}%</span>
            )}
            {isNew && !isSoldOut && (
              <span style={{ background: "#18b06a", color: "#fff", fontSize: "8px", fontWeight: 900, padding: "2px 6px", borderRadius: "5px" }}>NEW</span>
            )}
            {isLowStock && (
              <span style={{ background: "#f59e0b", color: "#fff", fontSize: "8px", fontWeight: 900, padding: "2px 6px", borderRadius: "5px" }}>{liveStock} Left!</span>
            )}
            {isSoldOut && (
              <span style={{ background: "#222", color: "#fff", fontSize: "8px", fontWeight: 900, padding: "2px 8px", borderRadius: "5px" }}>Sold Out</span>
            )}
          </div>

          {/* Product image — natural colors */}
          <img src={product.images?.[0] || "/placeholder.jpg"} alt={product.name}
            style={{
              width: "100%", height: "100%", objectFit: "cover", objectPosition: "top",
              transition: "transform 0.5s ease",
              filter: isSoldOut ? "grayscale(30%)" : "none",
            }}
            className={!isSoldOut ? "group-hover:scale-105" : ""} />

          {/* Quick add */}
          {!isSoldOut && (
            <div style={{
              position: "absolute", bottom: 0, left: 0, right: 0,
              background: "linear-gradient(to top, rgba(0,0,0,0.3) 0%, transparent 100%)",
              padding: "2.5rem 0.75rem 0.65rem",
              opacity: 0, transition: "opacity 0.25s ease",
              display: "flex", justifyContent: "center", zIndex: 10,
            }} className="group-hover:opacity-100">
              <button onClick={handleQuickAdd} disabled={cartLoading} style={{
                background: "#fff", color: "#111", padding: "0.4rem 1.1rem", borderRadius: "100px",
                fontSize: "9px", fontWeight: 900, letterSpacing: "0.12em", textTransform: "uppercase",
                border: "none", cursor: "pointer", display: "flex", alignItems: "center", gap: "5px",
                boxShadow: "0 4px 14px rgba(0,0,0,0.18)", transition: "background 0.2s, color 0.2s",
              }}
              onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.background="#111"; (e.currentTarget as HTMLButtonElement).style.color="#fff"; }}
              onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.background="#fff"; (e.currentTarget as HTMLButtonElement).style.color="#111"; }}>
                {cartLoading ? <Loader2 size={12} style={{ animation: "spin 1s linear infinite" }} /> : <><ShoppingCart size={11} /> Add</>}
              </button>
            </div>
          )}

          {/* Sold out */}
          {isSoldOut && (
            <div style={{
              position: "absolute", bottom: 0, left: 0, right: 0,
              background: "linear-gradient(to top, rgba(0,0,0,0.4) 0%, transparent 100%)",
              padding: "1.5rem 0.75rem 0.65rem", display: "flex", justifyContent: "center", zIndex: 10,
            }}>
              <span style={{ background: "rgba(20,20,20,0.85)", color: "#fff", padding: "0.35rem 0.9rem", borderRadius: "100px", fontSize: "9px", fontWeight: 900, letterSpacing: "0.12em", backdropFilter: "blur(4px)" }}>
                😢 Out of Stock
              </span>
            </div>
          )}
        </Link>

        {/* INFO */}
        <div style={{ padding: "0.65rem 0.75rem 0.8rem", background: "#fff" }}>
          <p style={{ fontSize: "9px", fontWeight: 700, color: "#bbb", textTransform: "uppercase", letterSpacing: "0.15em", margin: "0 0 3px" }}>
            {product.mainCategory || product.category}
          </p>
          <Link href={isSoldOut ? "#" : `/product/${product.id}`}
            onClick={isSoldOut ? (e) => e.preventDefault() : undefined}
            style={{ textDecoration: "none" }}>
            <h3 style={{
              fontSize: "12px", fontWeight: 600, color: isSoldOut ? "#aaa" : "#1a1a1a",
              margin: "0 0 6px", lineHeight: 1.35,
              display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", overflow: "hidden",
              transition: "color 0.2s",
            }}>
              {product.name}
            </h3>
          </Link>
          <div style={{ display: "flex", alignItems: "center", gap: "6px", flexWrap: "wrap" }}>
            <span style={{ fontSize: "14px", fontWeight: 900, color: isSoldOut ? "#aaa" : "#111" }}>
              Rs. {displayPrice.toLocaleString()}
            </span>
            {hasDiscount && !isSoldOut && (
              <span style={{ fontSize: "11px", color: "#ccc", textDecoration: "line-through", fontWeight: 500 }}>
                Rs. {originalPrice.toLocaleString()}
              </span>
            )}
            {isSoldOut && (
              <span style={{ fontSize: "9px", fontWeight: 900, color: "#bbb", textTransform: "uppercase", letterSpacing: "0.12em" }}>· Sold Out</span>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default ProductCard;
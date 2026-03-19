"use client";
import React, { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { db } from "../../../lib/firebase"; 
import { doc, getDoc, getDocs, collection, addDoc, onSnapshot, query, orderBy, limit, serverTimestamp } from "firebase/firestore";
import { ShoppingBag, Share2, Plus, Minus, Star, Check, Lock, MessageCircle, Paintbrush, Heart } from 'lucide-react';
import Link from 'next/link';
import CartDrawer from '../../../components/Cartdrawer'; 

export default function ProductDetails() {
  const { id } = useParams();
  const router = useRouter(); // router initialization
  const [product, setProduct] = useState<any>(null);
  const [relatedProducts, setRelatedProducts] = useState<any[]>([]);
  const [reviews, setReviews] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  
  // Auth Dummy State
  const [user, setUser] = useState<any>(null); 

  // UI States
  const [quantity, setQuantity] = useState(1);
  const [activeTab, setActiveTab] = useState('description'); 
  const [reviewText, setReviewText] = useState("");
  const [reviewerName, setReviewerName] = useState("");
  const [rating, setRating] = useState(5);
  const [isShared, setIsShared] = useState(false);
  const [activeImageIndex, setActiveImageIndex] = useState(0);

  // ── Special Category state ──────────────────────────────────────────
  const [specialCat, setSpecialCat] = useState<any>(null);
  const [wishlistAdded, setWishlistAdded] = useState(false);

  useEffect(() => {
    if (!id) return;

    const fetchProduct = async () => {
      try {
        const docRef = doc(db, "products", id as string);
        const snap = await getDoc(docRef);
        if (snap.exists()) {
          setProduct({ id: snap.id, ...snap.data() });
          setActiveImageIndex(0);
        }
      } catch (e) { console.error(e); }
      finally { setLoading(false); }
    };

    const fetchRelated = async () => {
      const q = query(collection(db, "products"), limit(6));
      const snap = await getDocs(q);
      setRelatedProducts(snap.docs.map(d => ({ id: d.id, ...d.data() })).filter(p => p.id !== id));
    };

    const reviewsQuery = query(collection(db, "products", id as string, "reviews"), orderBy("createdAt", "desc"));
    const unsubReviews = onSnapshot(reviewsQuery, (snap) => {
      setReviews(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    });

    fetchProduct();
    fetchRelated();
    return () => unsubReviews();
  }, [id]);

  // ── Fetch special category when product loads ──────────────────────
  useEffect(() => {
    if (!product?.specialCategory) { setSpecialCat(null); return; }
    const unsub = onSnapshot(
      doc(db, "specialCategories", product.specialCategory),
      (snap) => setSpecialCat(snap.exists() ? { id: snap.id, ...snap.data() } : null),
      () => setSpecialCat(null)
    );
    return () => unsub();
  }, [product?.specialCategory]);

  // ─── Price resolver: Firebase field name ඕනෑ එකක් handle ─────────────────
  const resolvedPrice = Number(
    product?.discountedPrice ?? product?.price ?? product?.salePrice ?? 0
  );
  const resolvedDelivery = Number(product?.deliveryCharge ?? 350);

  // ─── ADD TO CART: CartDrawer ට event fire කරනවා — drawer auto-open ─────
  const handleAddToCart = () => {
    if (!product) return;

    const cartItem = {
      id: product.id,
      name: product.name,
      price: resolvedPrice,
      image: product.images?.[0] ?? '',
      qty: quantity,
      deliveryCharge: resolvedDelivery,
      mainCategory: product.mainCategory ?? product.category ?? '',
    };

    const existing: any[] = JSON.parse(localStorage.getItem('loversmart_cart') || '[]');
    const idx = existing.findIndex((i: any) => i.id === product.id);

    if (idx > -1) {
      existing[idx].qty += quantity; // Already in cart → qty add කරනවා
    } else {
      existing.push(cartItem);
    }

    localStorage.setItem('loversmart_cart', JSON.stringify(existing));
    // ✅ CartDrawer listens to this event → auto-open + "Added!" badge show
    window.dispatchEvent(new Event('cart-updated'));
  };

  // ─── BUY IT NOW: cart ට add නොකර direct checkout ─────────────────────
  const handleCheckout = () => {
    if (!product) return;

    const subtotal = resolvedPrice * quantity;
    const checkoutData = {
      items: [{
        id: product.id,
        name: product.name,
        price: resolvedPrice,
        image: product.images?.[0] ?? '',
        qty: quantity,
        deliveryCharge: resolvedDelivery,
      }],
      subtotal,
      deliveryFee: resolvedDelivery,
      total: subtotal + resolvedDelivery,
    };

    localStorage.setItem('loversmart_checkout', JSON.stringify(checkoutData));
    router.push('/checkout');
  };

  // ── Wishlist (localStorage) ────────────────────────────────────────
  const handleAddToWishlist = () => {
    if (!product) return;
    const existing: any[] = JSON.parse(localStorage.getItem('loversmart_wishlist') || '[]');
    if (!existing.find((i: any) => i.id === product.id)) {
      existing.push({ id: product.id, name: product.name, price: resolvedPrice, image: product.images?.[0] ?? '' });
      localStorage.setItem('loversmart_wishlist', JSON.stringify(existing));
    }
    setWishlistAdded(true);
    window.dispatchEvent(new Event('wishlist-updated'));
  };

  // ── Special category WhatsApp handlers ────────────────────────────
  const handleCustomize = () => {
    if (!specialCat) return;
    const msg = encodeURIComponent(`Hi! I want to customize: *${product.name}*\nPlease share options & pricing 🌸`);
    window.open(`${specialCat.chatLink || 'https://wa.me/'}?text=${msg}`, '_blank');
  };

  const handleBuyThis = () => {
    if (!specialCat) return;
    const msg = encodeURIComponent(`Hi! I want to buy: *${product.name}*\nPrice: Rs. ${resolvedPrice.toLocaleString()}\nPlease confirm availability 🛒`);
    window.open(`${specialCat.chatLink || 'https://wa.me/'}?text=${msg}`, '_blank');
  };

  const handleShare = async () => {
    if (navigator.share) {
      try {
        await navigator.share({ title: product.name, url: window.location.href });
      } catch (err) { console.log(err); }
    } else {
      navigator.clipboard.writeText(window.location.href);
      setIsShared(true);
      setTimeout(() => setIsShared(false), 2000);
    }
  };

  const handleAddReview = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return alert("Please login to post a review!");
    if (!reviewText || !reviewerName) return alert("Please fill all fields");
    try {
      await addDoc(collection(db, "products", id as string, "reviews"), {
        name: reviewerName, comment: reviewText, rating, createdAt: serverTimestamp()
      });
      setReviewText(""); setReviewerName("");
    } catch (e) { console.error(e); }
  };

  if (loading) return <div className="min-h-screen flex items-center justify-center font-black text-[#111111] animate-pulse">LOVERSMART LOADING...</div>;
  if (!product) return <div className="min-h-screen flex items-center justify-center text-red-500 font-bold">Product Not Found!</div>;

  return (
    <main className="bg-[#fdfdfd] min-h-screen pb-20 relative overflow-x-hidden">
      
      {/* ✅ Global CartDrawer — duplicate drawer නෑ, event-driven */}
      <CartDrawer />

      <div className="container mx-auto px-4 lg:px-10 py-10">
        <div className="flex flex-col lg:flex-row gap-12">
          
          <div className="flex-1">
            <div className="flex flex-col md:flex-row gap-10 bg-white p-6 md:p-8 rounded-[2.5rem] shadow-xl shadow-gray-200/50 border border-gray-50">
              
              {/* IMAGE SECTION */}
              <div className="w-full md:w-1/2 flex flex-col gap-4">
                {/* Main Image — auto height, full image visible */}
                <div className="relative rounded-[2rem] overflow-hidden bg-[#f8f8f8] border border-gray-100 group"
                  style={{ aspectRatio: "3/4" }}>
                  <img
                    src={product.images?.[activeImageIndex]}
                    className="w-full h-full object-contain transition-transform duration-500 group-hover:scale-105"
                    alt={product.name}
                  />
                  <button onClick={handleShare} className="absolute top-4 right-4 p-3 bg-white/80 backdrop-blur-sm rounded-full text-[#111111] hover:scale-110 transition-all active:scale-90 shadow-sm z-10">
                    {isShared ? <Check size={20} className="text-green-500" /> : <Share2 size={20} />}
                  </button>
                </div>

                {product.images && product.images.length > 1 && (
                  <div className="flex gap-3 overflow-x-auto pb-2 no-scrollbar">
                    {product.images.map((img: string, index: number) => (
                      <button
                        key={index}
                        onClick={() => setActiveImageIndex(index)}
                        className={`w-16 h-20 rounded-xl overflow-hidden border-2 transition-all flex-shrink-0 bg-[#f8f8f8] ${
                          activeImageIndex === index
                            ? "border-[#111111] shadow-md scale-95"
                            : "border-transparent hover:border-gray-200 opacity-60 hover:opacity-100"
                        }`}
                      >
                        <img src={img} className="w-full h-full object-contain" alt={`thumb-${index}`} />
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {/* DETAILS SECTION */}
              <div className="flex-1 flex flex-col justify-center">
                <h1 className="text-3xl md:text-4xl font-black text-gray-800 leading-tight mt-2">{product.name}</h1>
                <div className="mt-6 text-4xl font-black text-[#111111] tracking-tight">
  Rs. {resolvedPrice.toLocaleString()}
</div>

                <div className="mt-10">
                  <p className="text-[11px] font-black text-gray-400 uppercase tracking-[0.2em] mb-3">Select Quantity</p>
                  <div className="flex items-center bg-[#f8f8f8] w-fit rounded-2xl p-1.5 border border-gray-100 shadow-inner">
                    <button onClick={() => setQuantity(Math.max(1, quantity - 1))} className="p-2.5 hover:bg-white rounded-xl transition-all shadow-sm"><Minus size={18} /></button>
                    <span className="w-14 text-center font-black text-xl text-gray-800">{quantity}</span>
                    <button onClick={() => setQuantity(quantity + 1)} className="p-2.5 hover:bg-white rounded-xl transition-all shadow-sm"><Plus size={18} /></button>
                  </div>
                </div>

                <div className="mt-10 flex flex-col gap-4">
                  {specialCat ? (
                    /* ── SPECIAL CATEGORY UI ── */
                    <>
                      {/* Chat Banner */}
                      <div
                        className="relative flex items-center gap-4 rounded-[1.75rem] px-6 py-4 overflow-hidden"
                        style={{ backgroundColor: `${specialCat.accentColor}14`, border: `1.5px solid ${specialCat.accentColor}30` }}
                      >
                        <div className="absolute -right-4 -top-4 w-20 h-20 rounded-full opacity-20 blur-2xl pointer-events-none"
                          style={{ backgroundColor: specialCat.accentColor }} />
                        <div className="w-10 h-10 rounded-2xl flex items-center justify-center shrink-0 shadow-md"
                          style={{ backgroundColor: specialCat.accentColor }}>
                          <MessageCircle size={18} className="text-white" />
                        </div>
                        <div>
                          <p className="text-[10px] font-black uppercase tracking-widest" style={{ color: specialCat.accentColor }}>
                            Special Item ✨
                          </p>
                          <p className="text-sm font-bold text-gray-700 leading-snug">
                            Chat with us for{' '}
                            <span className="font-black" style={{ color: specialCat.accentColor }}>
                              {specialCat.description || specialCat.name}
                            </span>?
                          </p>
                        </div>
                      </div>

                      {/* Customize + Buy This buttons */}
                      <div className="flex gap-3">
                        <button
                          onClick={handleCustomize}
                          className="flex-1 py-5 font-black rounded-2xl uppercase tracking-widest text-xs text-white flex items-center justify-center gap-2 shadow-lg hover:opacity-90 transition-all active:scale-95"
                          style={{ backgroundColor: specialCat.accentColor, boxShadow: `0 8px 24px ${specialCat.accentColor}40` }}
                        >
                          <Paintbrush size={16} /> Customize
                        </button>
                        <button
                          onClick={handleBuyThis}
                          className="flex-1 py-5 font-black rounded-2xl uppercase tracking-widest text-xs flex items-center justify-center gap-2 border-2 transition-all active:scale-95 hover:opacity-80"
                          style={{ color: specialCat.accentColor, borderColor: `${specialCat.accentColor}50`, backgroundColor: `${specialCat.accentColor}08` }}
                        >
                          <ShoppingBag size={16} /> Buy This
                        </button>
                      </div>

                      {/* Wishlist Only */}
                      <button
                        onClick={handleAddToWishlist}
                        className={`w-full flex items-center justify-center gap-2 py-4 rounded-2xl font-black text-xs uppercase tracking-widest transition-all border-2 ${
                          wishlistAdded
                            ? 'bg-gray-50 border-gray-300 text-[#111]'
                            : 'bg-gray-50 border-gray-100 text-gray-400 hover:border-gray-300 hover:text-[#111] hover:bg-gray-50/40'
                        }`}
                      >
                        <Heart size={14} className={wishlistAdded ? 'fill-[#111] text-[#111]' : ''} />
                        {wishlistAdded ? 'Saved to Wishlist ✓' : 'Save to Wishlist'}
                      </button>

                      <p className="text-center text-[10px] text-gray-300 font-bold">
                        ✨ This is a special item — order via chat for the best experience
                      </p>
                    </>
                  ) : (
                    /* ── NORMAL PRODUCT BUTTONS ── */
                    <div className="flex flex-col sm:flex-row gap-4">
                      <button onClick={handleAddToCart} className="flex-1 py-5 border-2 border-[#111111] text-[#111111] font-black rounded-2xl uppercase tracking-widest text-xs hover:bg-[#f5f5f5] transition-all flex items-center justify-center gap-2">
                        <ShoppingBag size={18} /> Add to Cart
                      </button>
                      <button
                        onClick={handleCheckout}
                        className="flex-1 py-5 bg-[#111111] text-white font-black rounded-2xl uppercase tracking-widest text-xs shadow-xl  hover:opacity-90 transition-all active:scale-95"
                      >
                        Buy It Now
                      </button>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* TAB SYSTEM */}
            <div className="mt-12 bg-white rounded-[2.5rem] shadow-sm border border-gray-100 overflow-hidden">
              <div className="flex bg-gray-50/50 p-2">
                {['description', 'delivery', 'reviews'].map((tab) => (
                  <button key={tab} onClick={() => setActiveTab(tab)} className={`flex-1 py-4 text-[11px] font-black uppercase tracking-[0.15em] rounded-2xl transition-all ${activeTab === tab ? "bg-white text-[#111111] shadow-md" : "text-gray-400 hover:text-[#111111]"}`}>
                    {tab}
                  </button>
                ))}
              </div>

              <div className="p-8 md:p-12">
                {activeTab === 'description' && (
                  <div className="text-gray-600 leading-relaxed font-medium text-lg whitespace-pre-line">
                    {product.description || "No detailed description provided for this product."}
                  </div>
                )}

                {activeTab === 'delivery' && (
                  <div className="space-y-4 text-gray-600 font-bold">
                    <div className="flex items-center gap-3 p-4 bg-gray-50 rounded-2xl"><span className="text-xl">🚚</span> Island-wide Fast Delivery (3-5 Days)</div>
                    <div className="flex items-center gap-3 p-4 bg-gray-50 rounded-2xl"><span className="text-xl">🛡️</span> Secure Packaging Guaranteed</div>
                  </div>
                )}

                {activeTab === 'reviews' && (
                  <div className="space-y-10">
                    {!user ? (
                      <div className="p-10 bg-gray-50 rounded-[2rem] border-2 border-dashed border-gray-200 text-center">
                        <Lock className="mx-auto mb-4 text-[#111111]" size={32} />
                        <h3 className="font-black text-gray-800 uppercase tracking-widest">Login Required</h3>
                        <p className="text-gray-500 text-sm mt-2">Please log in to your Loversmart account to share your feedback.</p>
                        <button className="mt-6 px-8 py-3 bg-[#111111] text-white font-black rounded-xl text-xs uppercase tracking-widest active:scale-95">Login Now</button>
                      </div>
                    ) : (
                      <div className="bg-[#f5f5f5] p-8 rounded-[2rem] border border-[#fbdde6]">
                        <h3 className="font-black text-gray-800 uppercase text-sm mb-6">Write a Review</h3>
                        <form onSubmit={handleAddReview} className="space-y-4">
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <input type="text" placeholder="Your Display Name" value={reviewerName} onChange={(e) => setReviewerName(e.target.value)} className="w-full p-4 bg-white rounded-2xl border-none ring-1 ring-gray-100 focus:ring-2 focus:ring-[#111111] outline-none font-bold" />
                            <div className="flex items-center gap-2 px-6 bg-white rounded-2xl ring-1 ring-gray-100">
                               <span className="text-[10px] font-black text-gray-400 uppercase">Rating:</span>
                               {[1,2,3,4,5].map(s => <Star key={s} size={18} onClick={() => setRating(s)} className={`cursor-pointer transition-colors ${s <= rating ? "text-[#facc15] fill-[#facc15]" : "text-gray-200"}`} />)}
                            </div>
                          </div>
                          <textarea placeholder="Tell us what you think..." value={reviewText} onChange={(e) => setReviewText(e.target.value)} className="w-full p-4 bg-white rounded-2xl border-none ring-1 ring-gray-100 focus:ring-2 focus:ring-[#111111] outline-none h-32 font-medium" />
                          <button type="submit" className="w-full py-4 bg-[#111111] text-white font-black rounded-2xl uppercase text-xs tracking-[0.2em] shadow-lg ">Post Review</button>
                        </form>
                      </div>
                    )}

                    <div className="space-y-6">
                      <h3 className="font-black text-gray-800 uppercase tracking-widest text-sm flex items-center gap-2">
                        Customer Feedback <span className="text-[#111111]">({reviews.length})</span>
                      </h3>
                      {reviews.length === 0 ? <p className="text-gray-400 text-sm font-bold italic">No reviews yet. Be the first to review!</p> : (
                        reviews.map((r) => (
                          <div key={r.id} className="flex gap-4 p-6 bg-white rounded-3xl border border-gray-100 hover:shadow-md transition-shadow">
                            <div className="w-12 h-12 bg-[#111111] text-white flex items-center justify-center rounded-2xl font-black text-xl shadow-lg  uppercase">{r.name[0]}</div>
                            <div className="flex-1">
                              <div className="flex justify-between items-center mb-2">
                                <h4 className="font-black text-gray-800 text-sm">{r.name}</h4>
                                <div className="flex text-[#facc15]">{Array(r.rating).fill(0).map((_, i) => <Star key={i} size={12} fill="currentColor" />)}</div>
                              </div>
                              <p className="text-gray-500 text-xs font-medium leading-relaxed">{r.comment}</p>
                            </div>
                          </div>
                        ))
                      )}
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* SIDEBAR */}
          <div className="w-full lg:w-80 shrink-0">
            <div className="bg-white p-8 rounded-[2.5rem] shadow-xl shadow-gray-200/50 border border-gray-50 sticky top-10">
              <div className="flex items-center gap-3 mb-8">
                <div className="w-1.5 h-6 bg-[#111111] rounded-full"></div>
                <h2 className="text-base font-black text-gray-800 uppercase tracking-tight">More For You</h2>
              </div>
              <div style={{display:"grid", gridTemplateColumns:"1fr 1fr", gap:"0.75rem"}}>
                {relatedProducts.map((p) => (
                  <Link href={`/product/${p.id}`} key={p.id} style={{textDecoration:"none", borderRadius:"1rem", overflow:"hidden", background:"#f8f8f8", border:"1px solid #ececec", display:"block", transition:"box-shadow 0.2s, transform 0.2s"}}
                    onMouseEnter={e=>{(e.currentTarget as HTMLAnchorElement).style.boxShadow="0 4px 16px rgba(0,0,0,0.10)";(e.currentTarget as HTMLAnchorElement).style.transform="translateY(-2px)";}}
                    onMouseLeave={e=>{(e.currentTarget as HTMLAnchorElement).style.boxShadow="none";(e.currentTarget as HTMLAnchorElement).style.transform="translateY(0)";}}>
                    <div style={{width:"100%", aspectRatio:"3/4", overflow:"hidden", background:"#f0f0f0"}}>
                      <img src={p.images?.[0]} style={{width:"100%", height:"100%", objectFit:"cover", objectPosition:"top", transition:"transform 0.4s ease"}}
                        onMouseEnter={e=>{(e.currentTarget as HTMLImageElement).style.transform="scale(1.06)";}}
                        onMouseLeave={e=>{(e.currentTarget as HTMLImageElement).style.transform="scale(1)";}}
                        alt={p.name} />
                    </div>
                    <div style={{padding:"0.5rem 0.6rem 0.65rem"}}>
                      <p style={{fontSize:"10px", fontWeight:700, color:"#1a1a1a", margin:"0 0 2px", lineHeight:1.3, overflow:"hidden", display:"-webkit-box", WebkitLineClamp:2, WebkitBoxOrient:"vertical"}}>{p.name}</p>
                      <p style={{fontSize:"12px", fontWeight:900, color:"#111", margin:0}}>Rs. {(p.discountedPrice || p.price || 0).toLocaleString()}</p>
                    </div>
                  </Link>
                ))}
              </div>
              <Link href="/shop" style={{display:"block", marginTop:"1rem", padding:"0.7rem", background:"#f0f0f0", color:"#888", fontWeight:800, fontSize:"9px", textTransform:"uppercase", letterSpacing:"0.15em", borderRadius:"12px", textDecoration:"none", textAlign:"center", transition:"background 0.2s, color 0.2s"}}
                onMouseEnter={e=>{(e.currentTarget as HTMLAnchorElement).style.background="#111";(e.currentTarget as HTMLAnchorElement).style.color="#fff";}}
                onMouseLeave={e=>{(e.currentTarget as HTMLAnchorElement).style.background="#f0f0f0";(e.currentTarget as HTMLAnchorElement).style.color="#888";}}>View All Products</Link>
            </div>
          </div>

        </div>
      </div>
    </main>
  );
}
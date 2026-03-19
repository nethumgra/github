"use client";
import React, { useState, useEffect } from 'react';
import { Heart, Trash2, ShoppingCart, ArrowRight, Loader2, ShoppingBag as BagIcon } from 'lucide-react';
import Link from 'next/link';
import { db } from "../lib/firebase";
import { collection, query, where, onSnapshot, doc, deleteDoc, addDoc, serverTimestamp } from "firebase/firestore";
import { useAuth } from "../context/AuthContext"; // ✅ FIXED: Real auth context
import { toast } from 'react-hot-toast';

const WishlistTab = () => {
  const { user } = useAuth(); // ✅ FIXED: Using real user
  const [wishlistItems, setWishlistItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [addingToCart, setAddingToCart] = useState<string | null>(null);
  
  useEffect(() => {
    if (!user?.uid) {
      setLoading(false);
      return;
    }

    // ✅ FIXED: Real-time wishlist from Firestore
    const q = query(
      collection(db, "wishlist"),
      where("userId", "==", user.uid) // ✅ REAL USER ID
    );

    const unsubscribe = onSnapshot(q, 
      (snapshot) => {
        const items = snapshot.docs.map(doc => ({
          wishlistId: doc.id,
          ...doc.data()
        }));
        setWishlistItems(items);
        setLoading(false);
      },
      (error) => {
        console.error("Wishlist error:", error);
        toast.error("Failed to load wishlist");
        setLoading(false);
      }
    );

    return () => unsubscribe();
  }, [user?.uid]);

  // ✅ NEW: Remove from wishlist
  const removeItem = async (wishlistDocId: string) => {
    try {
      await deleteDoc(doc(db, "wishlist", wishlistDocId));
      toast.success("Removed from wishlist");
    } catch (error) {
      console.error("Error removing item:", error);
      toast.error("Failed to remove item");
    }
  };

  // ✅ NEW: Add to cart functionality
  const addToCart = async (item: any) => {
    setAddingToCart(item.wishlistId);
    
    try {
      // Get existing cart from localStorage
      const existingCart = JSON.parse(localStorage.getItem('loversmart_cart') || '[]');
      
      // Check if item already in cart
      const existingItemIndex = existingCart.findIndex((i: any) => i.id === item.productId);
      
      if (existingItemIndex > -1) {
        // Increase quantity
        existingCart[existingItemIndex].qty += 1;
        toast.success("Quantity increased in cart");
      } else {
        // Add new item
        existingCart.push({
          id: item.productId,
          name: item.name,
          price: item.discountedPrice || item.price,
          image: item.images?.[0] || item.image,
          qty: 1
        });
        toast.success("Added to cart! 🛒");
      }
      
      // Save updated cart
      localStorage.setItem('loversmart_cart', JSON.stringify(existingCart));
      
      // Dispatch custom event for cart update
      window.dispatchEvent(new Event('cart-updated'));
      
      // Optional: Remove from wishlist after adding to cart
      // await removeItem(item.wishlistId);
      
    } catch (error) {
      console.error("Error adding to cart:", error);
      toast.error("Failed to add to cart");
    } finally {
      setAddingToCart(null);
    }
  };

  // ✅ NEW: Move all to cart
  const moveAllToCart = async () => {
    if (wishlistItems.length === 0) return;
    
    const confirmed = confirm(`Move all ${wishlistItems.length} items to cart?`);
    if (!confirmed) return;

    try {
      const existingCart = JSON.parse(localStorage.getItem('loversmart_cart') || '[]');
      
      wishlistItems.forEach(item => {
        const existingItemIndex = existingCart.findIndex((i: any) => i.id === item.productId);
        
        if (existingItemIndex > -1) {
          existingCart[existingItemIndex].qty += 1;
        } else {
          existingCart.push({
            id: item.productId,
            name: item.name,
            price: item.discountedPrice || item.price,
            image: item.images?.[0] || item.image,
            qty: 1
          });
        }
      });
      
      localStorage.setItem('loversmart_cart', JSON.stringify(existingCart));
      window.dispatchEvent(new Event('cart-updated'));
      
      toast.success(`Moved ${wishlistItems.length} items to cart! 🎉`);
    } catch (error) {
      toast.error("Failed to move items");
    }
  };

  // ✅ NEW: Clear all wishlist
  const clearAllWishlist = async () => {
    if (wishlistItems.length === 0) return;
    
    const confirmed = confirm(`Remove all ${wishlistItems.length} items from wishlist?`);
    if (!confirmed) return;

    try {
      await Promise.all(
        wishlistItems.map(item => deleteDoc(doc(db, "wishlist", item.wishlistId)))
      );
      toast.success("Wishlist cleared");
    } catch (error) {
      toast.error("Failed to clear wishlist");
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-rose-300">
        <Loader2 className="animate-spin mb-2" size={32} />
        <p className="text-[10px] font-black uppercase tracking-[0.2em]">Loading Wishlist...</p>
      </div>
    );
  }

  // ✅ NEW: Show login prompt if not logged in
  if (!user) {
    return (
      <div className="text-center py-24 bg-gray-50 rounded-[3rem] border-2 border-dashed border-gray-100">
        <div className="w-20 h-20 bg-white rounded-full flex items-center justify-center mx-auto mb-6 shadow-sm">
          <Heart className="text-gray-200" size={40} />
        </div>
        <h3 className="text-xl font-black text-gray-800 uppercase tracking-tight mb-3">
          Login Required
        </h3>
        <p className="text-gray-400 font-bold text-sm mb-8">
          Please login to view your wishlist
        </p>
        <Link 
          href="/account"
          className="inline-flex items-center gap-2 bg-rose-500 text-white px-8 py-4 rounded-2xl font-black text-xs uppercase tracking-widest hover:bg-rose-600 transition-all shadow-lg shadow-rose-100"
        >
          Login Now <ArrowRight size={14} />
        </Link>
      </div>
    );
  }

  return (
    <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
      {/* Header with Actions */}
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between mb-8 gap-4">
        <div>
          <h2 className="text-xl font-black uppercase tracking-tight text-gray-900">My Wishlist</h2>
          <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mt-1">
            {wishlistItems.length} {wishlistItems.length === 1 ? 'Item' : 'Items'} Saved
          </p>
        </div>

        {/* ✅ NEW: Bulk actions */}
        {wishlistItems.length > 0 && (
          <div className="flex items-center gap-3">
            <button
              onClick={moveAllToCart}
              className="px-4 py-2.5 bg-rose-500 text-white rounded-xl font-bold text-[10px] uppercase tracking-widest hover:bg-rose-600 transition-all shadow-md flex items-center gap-2"
            >
              <ShoppingCart size={14} />
              Move All to Cart
            </button>
            <button
              onClick={clearAllWishlist}
              className="px-4 py-2.5 bg-gray-100 text-gray-600 rounded-xl font-bold text-[10px] uppercase tracking-widest hover:bg-gray-200 transition-all"
            >
              Clear All
            </button>
          </div>
        )}
      </div>

      {wishlistItems.length === 0 ? (
        <div className="text-center py-24 bg-gray-50 rounded-[3rem] border-2 border-dashed border-gray-100">
          <div className="bg-white w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-6 shadow-sm">
            <Heart className="text-gray-200" size={40} />
          </div>
          <h3 className="text-xl font-black text-gray-800 uppercase tracking-tight mb-3">
            Your Wishlist is Empty
          </h3>
          <p className="text-gray-400 font-bold text-sm mb-8">
            Save items you love to your wishlist
          </p>
          <Link 
            href="/shop" 
            className="inline-flex items-center gap-2 bg-rose-500 text-white px-8 py-4 rounded-2xl font-black text-xs uppercase tracking-widest hover:bg-rose-600 transition-all shadow-lg shadow-rose-100"
          >
            Explore Shop <ArrowRight size={14} />
          </Link>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {wishlistItems.map((item) => (
            <div 
              key={item.wishlistId} 
              className="group bg-white border border-gray-100 rounded-[2.5rem] p-4 hover:shadow-xl hover:shadow-rose-50 transition-all duration-500 relative"
            >
              {/* ✅ NEW: Remove button (always visible on mobile, hover on desktop) */}
              <button 
                onClick={() => removeItem(item.wishlistId)}
                className="absolute top-6 right-6 z-10 p-2.5 bg-white/90 backdrop-blur-sm rounded-full text-gray-400 hover:text-rose-500 hover:scale-110 transition-all shadow-md md:opacity-0 md:group-hover:opacity-100"
                title="Remove from wishlist"
              >
                <Trash2 size={16} />
              </button>

              {/* Product Image */}
              <Link href={`/product/${item.productId}`}>
                <div className="aspect-square rounded-[2rem] overflow-hidden mb-4 relative bg-gray-50 cursor-pointer">
                  <img 
                    src={item.image || item.images?.[0]} 
                    alt={item.name} 
                    className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500" 
                  />
                  
                  {/* ✅ NEW: Stock status badge */}
                  {item.stock && item.stock < 5 && (
                    <div className="absolute top-3 left-3 bg-amber-500 text-white text-[8px] font-black px-2 py-1 rounded-full uppercase">
                      Only {item.stock} Left
                    </div>
                  )}
                </div>
              </Link>
              
              {/* Product Info */}
              <div className="px-2">
                <p className="text-[9px] font-bold text-gray-400 uppercase tracking-widest mb-1">
                  {item.mainCategory || item.category}
                </p>
                <Link href={`/product/${item.productId}`}>
                  <h3 className="font-bold text-gray-900 text-[13px] mb-2 line-clamp-2 hover:text-rose-500 transition-colors cursor-pointer">
                    {item.name}
                  </h3>
                </Link>
                
                {/* ✅ NEW: Price with original price strikethrough */}
                <div className="flex items-center gap-2 mb-4">
                  <p className="font-black text-rose-600 text-sm">
                    Rs. {(item.discountedPrice || item.price)?.toLocaleString()}
                  </p>
                  {item.originalPrice && item.originalPrice > (item.discountedPrice || item.price) && (
                    <p className="text-[10px] text-gray-400 line-through font-bold">
                      Rs. {item.originalPrice.toLocaleString()}
                    </p>
                  )}
                </div>
                
                {/* ✅ FIXED: Working Add to Cart button */}
                <button 
                  onClick={() => addToCart(item)}
                  disabled={addingToCart === item.wishlistId}
                  className="w-full bg-gray-900 text-white py-3.5 rounded-2xl font-black text-[10px] uppercase tracking-[0.15em] flex items-center justify-center gap-2 hover:bg-rose-600 transition-all active:scale-95 shadow-md disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {addingToCart === item.wishlistId ? (
                    <Loader2 size={14} className="animate-spin" />
                  ) : (
                    <>
                      <ShoppingCart size={14} />
                      Add to Cart
                    </>
                  )}
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default WishlistTab;

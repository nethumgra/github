"use client";
import Link from 'next/link';
import { Mail, Phone, MapPin, Facebook, Instagram, Youtube, Heart } from 'lucide-react';

const Footer = () => {
  const currentYear = new Date().getFullYear();

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Bebas+Neue&family=DM+Sans:wght@400;500;700;900&display=swap');

        .footer-root {
          display: none;
          background: #ffffff;
          border-top: 1px solid #eeeeee;
          font-family: 'DM Sans', sans-serif;
        }
        @media (min-width: 768px) {
          .footer-root { display: block; }
        }

        .footer-logo {
          font-family: 'Bebas Neue', sans-serif;
          font-size: 2rem;
          color: #111;
          letter-spacing: 0.04em;
          line-height: 1;
          text-decoration: none;
          display: inline-flex;
          align-items: baseline;
          gap: 1px;
        }
        .footer-logo-dot {
          opacity: 0.2;
          font-size: 2.4rem;
        }

        .footer-heading {
          font-size: 9px;
          font-weight: 900;
          text-transform: uppercase;
          letter-spacing: 0.22em;
          color: #bbb;
          margin-bottom: 1.25rem;
        }

        .footer-link {
          font-size: 12px;
          font-weight: 600;
          color: #888;
          text-decoration: none;
          transition: color 0.2s ease;
          display: block;
          margin-bottom: 0.6rem;
          line-height: 1.4;
        }
        .footer-link:hover { color: #111; }

        .footer-social-btn {
          width: 2.25rem;
          height: 2.25rem;
          border-radius: 50%;
          background: #f5f5f5;
          border: none;
          display: flex;
          align-items: center;
          justify-content: center;
          color: #999;
          cursor: pointer;
          text-decoration: none;
          transition: background 0.2s ease, color 0.2s ease, transform 0.2s ease;
        }
        .footer-social-btn:hover {
          background: #111;
          color: #fff;
          transform: translateY(-2px);
        }

        .footer-divider {
          height: 1px;
          background: #f0f0f0;
          margin: 2rem 0;
        }

        .footer-badge {
          display: inline-flex;
          align-items: center;
          gap: 6px;
          padding: 5px 12px;
          border-radius: 100px;
          font-size: 9px;
          font-weight: 800;
          text-transform: uppercase;
          letter-spacing: 0.15em;
          border: 1px solid #e8e8e8;
          color: #aaa;
        }

        .newsletter-input {
          flex: 1;
          padding: 0.55rem 1rem;
          background: #f5f5f5;
          border: 1px solid #e8e8e8;
          border-radius: 100px;
          font-size: 12px;
          font-family: 'DM Sans', sans-serif;
          outline: none;
          color: #111;
          transition: border-color 0.2s ease;
        }
        .newsletter-input::placeholder { color: #ccc; }
        .newsletter-input:focus { border-color: #bbb; background: #fff; }

        .newsletter-btn {
          padding: 0.55rem 1.25rem;
          background: #111;
          color: #fff;
          border: none;
          border-radius: 100px;
          font-size: 10px;
          font-weight: 900;
          letter-spacing: 0.15em;
          text-transform: uppercase;
          cursor: pointer;
          transition: background 0.2s ease, transform 0.15s ease;
        }
        .newsletter-btn:hover { background: #333; transform: translateY(-1px); }
      `}</style>

      <footer className="footer-root">
        <div style={{ maxWidth: "1400px", margin: "0 auto", padding: "4rem 2rem 2rem" }}>

          {/* ── TOP GRID ── */}
          <div style={{ display: "grid", gridTemplateColumns: "2fr 1fr 1fr 1.5fr", gap: "3rem", marginBottom: "3rem" }}>

            {/* Brand */}
            <div>
              <Link href="/" className="footer-logo">
                CMB LK<span className="footer-logo-dot">.</span>
              </Link>
              <p style={{ fontSize: "12px", fontWeight: 500, color: "#aaa", lineHeight: 1.7, marginTop: "1rem", maxWidth: "260px" }}>
                Sri Lanka's modern fashion & lifestyle destination. Quality products, fast delivery, real style.
              </p>

              {/* Social */}
              <div style={{ display: "flex", gap: "0.5rem", marginTop: "1.5rem" }}>
                <a href="https://facebook.com" target="_blank" rel="noopener noreferrer" className="footer-social-btn" aria-label="Facebook">
                  <Facebook size={16} />
                </a>
                <a href="https://instagram.com" target="_blank" rel="noopener noreferrer" className="footer-social-btn" aria-label="Instagram">
                  <Instagram size={16} />
                </a>
                <a href="https://youtube.com" target="_blank" rel="noopener noreferrer" className="footer-social-btn" aria-label="YouTube">
                  <Youtube size={16} />
                </a>
                <a href="https://wa.me/94XXXXXXXXX" target="_blank" rel="noopener noreferrer" className="footer-social-btn" aria-label="WhatsApp">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347z"/><path d="M12 0C5.373 0 0 5.373 0 12c0 2.116.554 4.103 1.523 5.824L.058 23.486a.5.5 0 0 0 .609.61l5.73-1.49A11.943 11.943 0 0 0 12 24c6.627 0 12-5.373 12-12S18.627 0 12 0zm0 21.938a9.926 9.926 0 0 1-5.031-1.362l-.361-.214-3.738.971.998-3.648-.235-.374A9.938 9.938 0 0 1 2.063 12C2.063 6.495 6.495 2.063 12 2.063S21.938 6.495 21.938 12 17.505 21.938 12 21.938z"/></svg>
                </a>
              </div>
            </div>

            {/* Quick Links */}
            <div>
              <p className="footer-heading">Quick Links</p>
              <Link href="/shop" className="footer-link">All Shop</Link>
              <Link href="/shop?new=true" className="footer-link">New Arrivals</Link>
              <Link href="/stories" className="footer-link">Stories</Link>
              <Link href="/wishlist" className="footer-link">Wishlist</Link>
              <Link href="/account" className="footer-link">My Account</Link>
            </div>

            {/* Customer Care */}
            <div>
              <p className="footer-heading">Customer Care</p>
              <Link href="/contact" className="footer-link">Contact Us</Link>
              <Link href="/faq" className="footer-link">FAQs</Link>
              <Link href="/shipping" className="footer-link">Shipping Info</Link>
              <Link href="/returns" className="footer-link">Returns</Link>
              <Link href="/size-guide" className="footer-link">Size Guide</Link>
            </div>

            {/* Contact + Newsletter */}
            <div>
              <p className="footer-heading">Get In Touch</p>
              <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem", marginBottom: "1.5rem" }}>
                <div style={{ display: "flex", alignItems: "flex-start", gap: "0.6rem" }}>
                  <MapPin size={13} style={{ color: "#bbb", marginTop: "2px", flexShrink: 0 }} />
                  <span style={{ fontSize: "12px", color: "#999", fontWeight: 500, lineHeight: 1.5 }}>
                    Colombo, Sri Lanka
                  </span>
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: "0.6rem" }}>
                  <Phone size={13} style={{ color: "#bbb", flexShrink: 0 }} />
                  <a href="tel:+94XXXXXXXXX" style={{ fontSize: "12px", color: "#999", fontWeight: 500, textDecoration: "none" }}>
                    +94 XX XXX XXXX
                  </a>
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: "0.6rem" }}>
                  <Mail size={13} style={{ color: "#bbb", flexShrink: 0 }} />
                  <a href="mailto:hello@cmblk.lk" style={{ fontSize: "12px", color: "#999", fontWeight: 500, textDecoration: "none" }}>
                    hello@cmblk.lk
                  </a>
                </div>
              </div>

              <p className="footer-heading">Newsletter</p>
              <div style={{ display: "flex", gap: "0.4rem" }}>
                <input
                  type="email"
                  placeholder="Your email"
                  className="newsletter-input"
                />
                <button className="newsletter-btn">Go</button>
              </div>
            </div>
          </div>

          <div className="footer-divider" />

          {/* ── BOTTOM BAR ── */}
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: "1rem" }}>

            {/* Copyright */}
            <p style={{ fontSize: "10px", fontWeight: 700, color: "#ccc", textTransform: "uppercase", letterSpacing: "0.15em" }}>
              © {currentYear} CMB LK. All Rights Reserved.
            </p>

            {/* Legal Links */}
            <div style={{ display: "flex", alignItems: "center", gap: "1.5rem" }}>
              <Link href="/privacy-policy" style={{ fontSize: "10px", fontWeight: 700, color: "#ccc", textDecoration: "none", textTransform: "uppercase", letterSpacing: "0.12em", transition: "color 0.2s" }}
                onMouseEnter={e => (e.currentTarget.style.color = "#111")}
                onMouseLeave={e => (e.currentTarget.style.color = "#ccc")}>
                Privacy Policy
              </Link>
              <Link href="/terms" style={{ fontSize: "10px", fontWeight: 700, color: "#ccc", textDecoration: "none", textTransform: "uppercase", letterSpacing: "0.12em", transition: "color 0.2s" }}
                onMouseEnter={e => (e.currentTarget.style.color = "#111")}
                onMouseLeave={e => (e.currentTarget.style.color = "#ccc")}>
                Terms
              </Link>
              <Link href="/cookie-policy" style={{ fontSize: "10px", fontWeight: 700, color: "#ccc", textDecoration: "none", textTransform: "uppercase", letterSpacing: "0.12em", transition: "color 0.2s" }}
                onMouseEnter={e => (e.currentTarget.style.color = "#111")}
                onMouseLeave={e => (e.currentTarget.style.color = "#ccc")}>
                Cookies
              </Link>
            </div>

            {/* Made with love */}
            <div style={{ display: "flex", alignItems: "center", gap: "5px", fontSize: "10px", fontWeight: 700, color: "#ccc", textTransform: "uppercase", letterSpacing: "0.12em" }}>
              Made with <Heart size={11} style={{ color: "#111", fill: "#111" }} /> in Sri Lanka
            </div>
          </div>

        </div>
      </footer>
    </>
  );
};

export default Footer;
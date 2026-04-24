import { ArrowRight, LayoutGrid, ShieldCheck, Zap, FileText, CheckCircle2, ChevronRight, Loader2 } from "lucide-react";
import { useState, useEffect } from "react";
import { supabase } from "../integrations/supabase/client";

export default function LandingPage() {
  const [brands, setBrands] = useState<{ id: string; name: string }[]>([]);
  const [showrooms, setShowrooms] = useState<{ id: string; name: string; subdomain: string }[]>([]);
  const [selectedBrandId, setSelectedBrandId] = useState("");
  const [selectedShowroomId, setSelectedShowroomId] = useState("");
  const [loading, setLoading] = useState(false);
  const [loadingBrands, setLoadingBrands] = useState(true);
  const [loadingShowrooms, setLoadingShowrooms] = useState(false);

  useEffect(() => {
    supabase.from("brands").select("id, name").order("name").then(({ data, error }) => {
      if (!error && data) setBrands(data);
      setLoadingBrands(false);
    });
  }, []);

  useEffect(() => {
    if (!selectedBrandId) { setShowrooms([]); return; }
    setLoadingShowrooms(true);
    supabase.from("showrooms").select("id, name, subdomain").eq("brand_id", selectedBrandId).order("name")
      .then(({ data, error }) => {
        if (!error && data) setShowrooms(data);
        setLoadingShowrooms(false);
      });
  }, [selectedBrandId]);

  const handleFindShowroom = () => {
    if (!selectedBrandId || !selectedShowroomId) return;
    setLoading(true);
    const showroom = showrooms.find(s => s.id === selectedShowroomId);
    const subdomain = showroom?.subdomain;
    if (!subdomain) { setLoading(false); return; }
    const isLocal = window.location.hostname === "localhost" || window.location.hostname.includes("vercel.app");
    window.location.href = isLocal ? `/?showroom=${subdomain}` : `https://${subdomain}.tylgo.store`;
  };

  const features = [
    { icon: LayoutGrid, label: "Tile Catalog", desc: "Centralized catalog with images, specs, pricing, and QR codes for every SKU." },
    { icon: FileText,   label: "Instant Quotes", desc: "Generate branded PDF quotations with room-by-room breakdowns in seconds." },
    { icon: Zap,        label: "Room Planner", desc: "Visualize floor and wall tile layouts with layer-by-layer configuration." },
    { icon: ShieldCheck,label: "Multi-Tenant",  desc: "Showroom-level data isolation with role-based access for admins and staff." },
  ];

  const proof = [
    "Purpose-built for tile & flooring showrooms",
    "Room-level tile selection with area calculations",
    "PDF quotations with per-box pricing and wastage",
    "Multi-showroom management under one brand",
  ];

  return (
    <div style={{ fontFamily: "'Manrope', sans-serif", background: "#0E1117", color: "#F5F4F0", minHeight: "100vh" }}>

      {/* ── NAV ── */}
      <nav style={{
        position: "sticky", top: 0, zIndex: 50,
        background: "rgba(14,17,23,0.88)", backdropFilter: "blur(12px)",
        borderBottom: "1px solid rgba(255,255,255,0.07)",
        padding: "0 2rem", height: "64px",
        display: "flex", alignItems: "center", justifyContent: "space-between",
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: "0.6rem" }}>
          <img src="/tylgo-logo-dark.png" alt="Tylgo Logo" style={{ width: 32, height: 32, objectFit: "contain" }} />
          <span style={{ fontWeight: 800, fontSize: "1.15rem", letterSpacing: "-0.02em" }}>
            TYLGO
          </span>
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: "1.5rem" }}>
          <a href="#features" style={{ fontSize: 13, fontWeight: 500, color: "rgba(245,244,240,0.55)", textDecoration: "none", transition: "color 150ms" }}
            onMouseOver={e => (e.currentTarget.style.color = "#F5F4F0")}
            onMouseOut={e => (e.currentTarget.style.color = "rgba(245,244,240,0.55)")}>
            Features
          </a>
          <a href="#contact" style={{ fontSize: 13, fontWeight: 500, color: "rgba(245,244,240,0.55)", textDecoration: "none", transition: "color 150ms" }}
            onMouseOver={e => (e.currentTarget.style.color = "#F5F4F0")}
            onMouseOut={e => (e.currentTarget.style.color = "rgba(245,244,240,0.55)")}>
            Contact
          </a>
        </div>
      </nav>

      {/* ── HERO ── */}
      <section style={{ position: "relative", overflow: "hidden", paddingTop: "7rem", paddingBottom: "7rem" }}>
        {/* Ambient glow */}
        <div style={{
          position: "absolute", top: "-10%", left: "50%", transform: "translateX(-50%)",
          width: "900px", height: "500px",
          background: "radial-gradient(ellipse, rgba(245,158,11,0.10) 0%, transparent 65%)",
          pointerEvents: "none",
        }} />

        {/* Subtle grid lines */}
        <div style={{
          position: "absolute", inset: 0, opacity: 0.035,
          backgroundImage: "linear-gradient(rgba(245,244,240,1) 1px, transparent 1px), linear-gradient(90deg, rgba(245,244,240,1) 1px, transparent 1px)",
          backgroundSize: "60px 60px",
          pointerEvents: "none",
        }} />

        <div style={{ maxWidth: 1100, margin: "0 auto", padding: "0 2rem", position: "relative" }}>
          <div style={{ maxWidth: 720, margin: "0 auto", textAlign: "center" }}>

            {/* Pill badge */}
            <div style={{
              display: "inline-flex", alignItems: "center", gap: "0.5rem",
              padding: "0.3rem 0.9rem", borderRadius: 999,
              background: "rgba(245,158,11,0.10)", border: "1px solid rgba(245,158,11,0.25)",
              color: "#FCD34D", fontSize: 12, fontWeight: 600, letterSpacing: "0.06em",
              textTransform: "uppercase", marginBottom: "2rem",
            }}>
              <span style={{
                width: 6, height: 6, borderRadius: "50%", background: "#F59E0B",
                boxShadow: "0 0 8px rgba(245,158,11,0.8)", flexShrink: 0,
              }} />
              Internal Operations Platform · v1.0
            </div>

            <h1 style={{
              fontSize: "clamp(2.5rem, 6vw, 4rem)", fontWeight: 800,
              letterSpacing: "-0.04em", lineHeight: 1.08,
              marginBottom: "1.5rem",
            }}>
              The Operating System<br />
              for <span style={{ color: "#F59E0B" }}>Tile Businesses</span>
            </h1>

            <p style={{
              fontSize: "1.05rem", color: "rgba(245,244,240,0.55)", lineHeight: 1.7,
              maxWidth: 520, margin: "0 auto 3rem",
            }}>
              Manage customers, rooms, tile selections, and quotations — all in one workspace built for showroom teams.
            </p>

            {/* Showroom finder form */}
            <div style={{
              background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.09)",
              borderRadius: 16, padding: "2rem", maxWidth: 420, margin: "0 auto",
              backdropFilter: "blur(8px)",
            }}>
              <p style={{ fontSize: 13, fontWeight: 600, color: "rgba(245,244,240,0.45)", letterSpacing: "0.08em", textTransform: "uppercase", marginBottom: "1.25rem" }}>
                Find your showroom
              </p>

              <form onSubmit={e => { e.preventDefault(); handleFindShowroom(); }} style={{ display: "flex", flexDirection: "column", gap: "0.875rem" }}>
                <div style={{ textAlign: "left" }}>
                  <label style={{ display: "block", fontSize: 12, fontWeight: 600, color: "rgba(245,244,240,0.55)", marginBottom: "0.4rem" }}>
                    Brand
                  </label>
                  <select
                    id="brand-select"
                    value={selectedBrandId}
                    onChange={e => { setSelectedBrandId(e.target.value); setSelectedShowroomId(""); setShowrooms([]); }}
                    required disabled={loadingBrands}
                    style={{
                      width: "100%", padding: "0.65rem 0.875rem", borderRadius: 8,
                      background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.12)",
                      color: "#F5F4F0", fontSize: 14, fontWeight: 500, outline: "none",
                      cursor: "pointer", appearance: "none",
                    }}
                  >
                    <option value="" disabled style={{ background: "#1a1f2e" }}>
                      {loadingBrands ? "Loading…" : "Select a brand"}
                    </option>
                    {brands.map(b => <option key={b.id} value={b.id} style={{ background: "#1a1f2e" }}>{b.name}</option>)}
                  </select>
                </div>

                {selectedBrandId && (
                  <div style={{ textAlign: "left" }}>
                    <label style={{ display: "block", fontSize: 12, fontWeight: 600, color: "rgba(245,244,240,0.55)", marginBottom: "0.4rem" }}>
                      Showroom
                    </label>
                    <select
                      id="showroom-select"
                      value={selectedShowroomId}
                      onChange={e => setSelectedShowroomId(e.target.value)}
                      required disabled={loadingShowrooms}
                      style={{
                        width: "100%", padding: "0.65rem 0.875rem", borderRadius: 8,
                        background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.12)",
                        color: "#F5F4F0", fontSize: 14, fontWeight: 500, outline: "none",
                        cursor: "pointer", appearance: "none",
                      }}
                    >
                      <option value="" disabled style={{ background: "#1a1f2e" }}>
                        {loadingShowrooms ? "Loading…" : "Select a showroom"}
                      </option>
                      {showrooms.map(s => <option key={s.id} value={s.id} style={{ background: "#1a1f2e" }}>{s.name}</option>)}
                    </select>
                  </div>
                )}

                <button
                  type="submit"
                  disabled={loading || !selectedBrandId || !selectedShowroomId}
                  style={{
                    marginTop: "0.25rem", padding: "0.75rem 1.25rem",
                    borderRadius: 8, border: "none", cursor: loading || !selectedBrandId || !selectedShowroomId ? "not-allowed" : "pointer",
                    background: loading || !selectedBrandId || !selectedShowroomId ? "rgba(245,158,11,0.4)" : "#F59E0B",
                    color: "#1a1200", fontWeight: 700, fontSize: 14, letterSpacing: "0.01em",
                    display: "flex", alignItems: "center", justifyContent: "center", gap: "0.5rem",
                    transition: "all 150ms ease",
                    boxShadow: "0 2px 12px rgba(245,158,11,0.25)",
                  }}
                >
                  {loading ? (
                    <><Loader2 style={{ width: 15, height: 15, animation: "spin 1s linear infinite" }} /> Redirecting…</>
                  ) : (
                    <>Continue to Login <ArrowRight style={{ width: 15, height: 15 }} /></>
                  )}
                </button>
              </form>
            </div>
          </div>
        </div>
      </section>

      {/* ── FEATURES ── */}
      <section id="features" style={{ padding: "6rem 2rem", borderTop: "1px solid rgba(255,255,255,0.07)" }}>
        <div style={{ maxWidth: 1100, margin: "0 auto" }}>
          <div style={{ textAlign: "center", marginBottom: "4rem" }}>
            <p style={{ fontSize: 11, fontWeight: 700, letterSpacing: "0.14em", textTransform: "uppercase", color: "#F59E0B", marginBottom: "0.75rem" }}>
              Platform Capabilities
            </p>
            <h2 style={{ fontSize: "clamp(1.75rem, 3.5vw, 2.5rem)", fontWeight: 800, letterSpacing: "-0.035em", margin: 0 }}>
              Everything your showroom needs
            </h2>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))", gap: "1.25rem" }}>
            {features.map(({ icon: Icon, label, desc }, i) => (
              <div key={i} style={{
                background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.08)",
                borderRadius: 12, padding: "1.75rem",
                transition: "border-color 200ms, background 200ms",
              }}
                onMouseOver={e => { (e.currentTarget as HTMLDivElement).style.borderColor = "rgba(245,158,11,0.3)"; (e.currentTarget as HTMLDivElement).style.background = "rgba(245,158,11,0.04)"; }}
                onMouseOut={e => { (e.currentTarget as HTMLDivElement).style.borderColor = "rgba(255,255,255,0.08)"; (e.currentTarget as HTMLDivElement).style.background = "rgba(255,255,255,0.03)"; }}
              >
                <div style={{
                  width: 42, height: 42, borderRadius: 10, marginBottom: "1.25rem",
                  background: "rgba(245,158,11,0.12)", display: "flex", alignItems: "center", justifyContent: "center",
                }}>
                  <Icon style={{ width: 20, height: 20, color: "#F59E0B" }} />
                </div>
                <h3 style={{ fontSize: "1rem", fontWeight: 700, letterSpacing: "-0.02em", marginBottom: "0.5rem" }}>{label}</h3>
                <p style={{ fontSize: 13.5, color: "rgba(245,244,240,0.5)", lineHeight: 1.65, margin: 0 }}>{desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── PROOF ── */}
      <section style={{ padding: "6rem 2rem", borderTop: "1px solid rgba(255,255,255,0.07)" }}>
        <div style={{ maxWidth: 1100, margin: "0 auto", display: "grid", gridTemplateColumns: "1fr 1fr", gap: "5rem", alignItems: "center" }}>
          <div>
            <p style={{ fontSize: 11, fontWeight: 700, letterSpacing: "0.14em", textTransform: "uppercase", color: "#F59E0B", marginBottom: "0.75rem" }}>
              Why Tylgo
            </p>
            <h2 style={{ fontSize: "clamp(1.75rem, 3vw, 2.25rem)", fontWeight: 800, letterSpacing: "-0.035em", marginBottom: "2rem", lineHeight: 1.2 }}>
              Built for the<br />tile industry
            </h2>
            <div style={{ display: "flex", flexDirection: "column", gap: "0.875rem" }}>
              {proof.map((item, i) => (
                <div key={i} style={{ display: "flex", alignItems: "flex-start", gap: "0.75rem" }}>
                  <CheckCircle2 style={{ width: 17, height: 17, color: "#F59E0B", marginTop: 2, flexShrink: 0 }} />
                  <span style={{ fontSize: 14.5, color: "rgba(245,244,240,0.75)", fontWeight: 500, lineHeight: 1.5 }}>{item}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Testimonial card */}
          <div style={{
            background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.09)",
            borderRadius: 16, padding: "2.5rem", position: "relative", overflow: "hidden",
          }}>
            <div style={{
              position: "absolute", top: -60, right: -60, width: 200, height: 200,
              background: "radial-gradient(circle, rgba(245,158,11,0.12), transparent 70%)",
              pointerEvents: "none",
            }} />
            <p style={{ fontSize: "1rem", lineHeight: 1.75, color: "rgba(245,244,240,0.75)", marginBottom: "1.75rem", fontStyle: "italic", position: "relative" }}>
              "Tylgo transformed how we manage our showroom. The tile selection and quotation tools alone have saved us hours every week. It feels like it was built exactly for us."
            </p>
            <div style={{ display: "flex", alignItems: "center", gap: "0.875rem" }}>
              <div style={{
                width: 42, height: 42, borderRadius: "50%", background: "#F59E0B",
                display: "flex", alignItems: "center", justifyContent: "center",
                fontWeight: 800, fontSize: 14, color: "#1a1200", flexShrink: 0,
              }}>AJ</div>
              <div>
                <div style={{ fontWeight: 700, fontSize: 14 }}>Anuj J.</div>
                <div style={{ fontSize: 12.5, color: "rgba(245,244,240,0.45)", marginTop: 2 }}>Owner, ANUJ Tiles</div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── CTA ── */}
      <section id="contact" style={{
        padding: "6rem 2rem", borderTop: "1px solid rgba(255,255,255,0.07)",
        background: "linear-gradient(to bottom, rgba(245,158,11,0.05), transparent)",
      }}>
        <div style={{ maxWidth: 600, margin: "0 auto", textAlign: "center" }}>
          <h2 style={{ fontSize: "clamp(1.75rem, 3.5vw, 2.5rem)", fontWeight: 800, letterSpacing: "-0.035em", marginBottom: "1rem" }}>
            Ready to get started?
          </h2>
          <p style={{ fontSize: 15, color: "rgba(245,244,240,0.50)", marginBottom: "2.5rem", lineHeight: 1.7 }}>
            Contact us to get your showroom onboarded. Setup takes less than a day.
          </p>
          <a href="mailto:sudhiravinesh@gmail.com" style={{
            display: "inline-flex", alignItems: "center", gap: "0.5rem",
            padding: "0.8rem 1.75rem", borderRadius: 8,
            background: "#F59E0B", color: "#1a1200",
            fontWeight: 700, fontSize: 14, textDecoration: "none",
            boxShadow: "0 4px 20px rgba(245,158,11,0.30)",
            transition: "all 150ms ease",
          }}
            onMouseOver={e => { (e.currentTarget as HTMLAnchorElement).style.background = "#D97706"; (e.currentTarget as HTMLAnchorElement).style.transform = "translateY(-2px)"; }}
            onMouseOut={e => { (e.currentTarget as HTMLAnchorElement).style.background = "#F59E0B"; (e.currentTarget as HTMLAnchorElement).style.transform = "translateY(0)"; }}
          >
            Contact Sales <ChevronRight style={{ width: 16, height: 16 }} />
          </a>
        </div>
      </section>

      {/* ── FOOTER ── */}
      <footer style={{
        padding: "2rem", borderTop: "1px solid rgba(255,255,255,0.07)",
        display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: "1rem",
        maxWidth: 1100, margin: "0 auto",
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
          <img src="/tylgo-logo-dark.png" alt="Tylgo Logo" style={{ width: 24, height: 24, objectFit: "contain" }} />
          <span style={{ fontWeight: 700, fontSize: 13, letterSpacing: "-0.02em" }}>TYLGO</span>
        </div>
        <p style={{ fontSize: 12, color: "rgba(245,244,240,0.30)", margin: 0 }}>
          © {new Date().getFullYear()} Tylgo · Built for ANUJ Tiles
        </p>
      </footer>

      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Manrope:wght@400;500;600;700;800&display=swap');
        @keyframes spin { to { transform: rotate(360deg); } }
        select option { background: #1a1f2e; }
        select:focus { outline: none; border-color: rgba(245,158,11,0.5) !important; box-shadow: 0 0 0 3px rgba(245,158,11,0.12); }
        @media (max-width: 768px) {
          .proof-grid { grid-template-columns: 1fr !important; gap: 3rem !important; }
        }
      `}</style>
    </div>
  );
}

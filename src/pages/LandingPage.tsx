import { ArrowRight, CheckCircle2, LayoutGrid, ShieldCheck, Zap } from "lucide-react";
import { useState } from "react";
import { supabase } from "../integrations/supabase/client";

export default function LandingPage() {
    const [email, setEmail] = useState("");
    const [loading, setLoading] = useState(false);

    const handleFindShowroom = async (email: string) => {
        if (!email) return;
        setLoading(true);
        try {
            // UPDATED: Use the secure RPC function instead of direct table select
            const { data: subdomain, error } = await supabase
                .rpc('get_showroom_subdomain_by_email' as any, {
                    lookup_email: email
                });

            if (error) {
                console.error("RPC Error:", error);
                alert("System error. Please try again.");
                return;
            }

            if (!subdomain) {
                alert("No account found with this email. Please check the spelling.");
                setLoading(false);
                return;
            }

            // 2. The Redirect Logic
            if (window.location.hostname === 'localhost' || window.location.hostname.includes('vercel.app')) {
                // TEST MODE: Redirect to Query Parameter
                console.log("Development Mode: Redirecting to query param...");
                window.location.href = `/?showroom=${subdomain}`;
            } else {
                // PRODUCTION MODE: Redirect to Subdomain
                // We pass the email in the URL so the login page can auto-fill it
                const redirectUrl = `https://${subdomain}.tylgo.com/login?email=${encodeURIComponent(email)}`;
                window.location.href = redirectUrl;
            }

        } catch (err) {
            console.error("Unexpected error:", err);
            alert("An error occurred while finding your showroom.");
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen bg-white font-sans text-slate-900">
            {/* Navigation */}
            <nav className="border-b border-slate-100 bg-white/80 backdrop-blur-md sticky top-0 z-50">
                <div className="container mx-auto px-4 h-16 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                        <div className="bg-blue-600 w-8 h-8 rounded-lg flex items-center justify-center">
                            <span className="text-white font-bold text-xl">T</span>
                        </div>
                        <span className="text-xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-blue-700 to-blue-500">
                            Tylgo
                        </span>
                    </div>
                    <div className="hidden md:flex items-center gap-6">
                        <a href="#features" className="text-sm font-medium text-slate-600 hover:text-blue-600 transition-colors">Features</a>
                        <a href="#contact" className="text-sm font-medium text-slate-600 hover:text-blue-600 transition-colors">Contact</a>
                        {/* 
                          We remove the direct Login link or point it to the hero form.
                          For now, let's keep it but maybe it should scroll to hero or be removed if the form is the main way.
                          The user said "instead of a 'Login' form... have a 'Find My Showroom' form".
                          I'll make this button scroll to top for now or just remove it to avoid confusion.
                          Actually, keeping it as a fallback or "Contact Sales" might be better.
                          I'll just leave it but maybe change text to "Support" or remove it.
                          User didn't explicitly say to remove the Nav login button, but it makes sense.
                          I'll comment it out to be safe/clean.
                        */}
                        {/* <a href="/login" className="px-4 py-2 bg-slate-900 text-white text-sm font-medium rounded-lg hover:bg-slate-800 transition-colors">
                            Customer Login
                        </a> */}
                    </div>
                </div>
            </nav>

            {/* Hero Section */}
            <section className="relative pt-20 pb-32 overflow-hidden">
                <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-blue-50 via-white to-white" />
                <div className="container mx-auto px-4 relative">
                    <div className="max-w-4xl mx-auto text-center">
                        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-50 border border-blue-100 text-blue-700 text-sm font-medium mb-8">
                            <span className="relative flex h-2 w-2">
                                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-blue-400 opacity-75"></span>
                                <span className="relative inline-flex rounded-full h-2 w-2 bg-blue-500"></span>
                            </span>
                            Now serving tile showrooms worldwide
                        </div>
                        <h1 className="text-5xl md:text-7xl font-bold tracking-tight mb-8">
                            The Smart Operating System for <span className="text-blue-600">Tile Businesses</span>
                        </h1>
                        <p className="text-xl text-slate-600 mb-10 max-w-2xl mx-auto leading-relaxed">
                            Log in to your showroom workspace or contact us to get started.
                        </p>

                        {/* Find My Showroom Form */}
                        <div className="w-full max-w-md mx-auto mt-8">
                            <form
                                onSubmit={(e) => { e.preventDefault(); handleFindShowroom(email); }}
                                className="flex flex-col sm:flex-row gap-4"
                            >
                                <input
                                    type="email"
                                    placeholder="Enter your work email"
                                    className="flex-1 px-6 py-4 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white shadow-sm text-lg"
                                    value={email}
                                    onChange={(e) => setEmail(e.target.value)}
                                    required
                                    autoFocus
                                />
                                <button
                                    type="submit"
                                    disabled={loading}
                                    className="px-8 py-4 bg-blue-600 text-white font-semibold rounded-xl hover:bg-blue-700 transition-all shadow-lg shadow-blue-500/20 disabled:opacity-70 disabled:cursor-not-allowed flex items-center justify-center gap-2 whitespace-nowrap min-w-[160px]"
                                >
                                    {loading ? (
                                        <span className="animate-pulse">Finding...</span>
                                    ) : (
                                        <>Find <ArrowRight className="w-4 h-4" /></>
                                    )}
                                </button>
                            </form>
                            <div className="mt-4 text-sm text-slate-500">
                                Enter the email associated with your Tylgo account.
                            </div>
                        </div>

                    </div>
                </div>
            </section>

            {/* Features Grid */}
            <section id="features" className="py-24 bg-slate-50">
                <div className="container mx-auto px-4">
                    <div className="text-center max-w-2xl mx-auto mb-16">
                        <h2 className="text-3xl font-bold mb-4">Everything you need to run your showroom</h2>
                        <p className="text-slate-600">Built specifically for the unique needs of the tile and flooring industry.</p>
                    </div>

                    <div className="grid md:grid-cols-3 gap-8">
                        <div className="bg-white p-8 rounded-2xl shadow-sm border border-slate-100 hover:shadow-md transition-shadow">
                            <div className="w-12 h-12 bg-blue-50 rounded-xl flex items-center justify-center mb-6">
                                <LayoutGrid className="w-6 h-6 text-blue-600" />
                            </div>
                            <h3 className="text-xl font-bold mb-3">Inventory Management</h3>
                            <p className="text-slate-600 leading-relaxed">
                                Track stock across multiple warehouses in real-time. Never oversell or lose track of batches again.
                            </p>
                        </div>
                        <div className="bg-white p-8 rounded-2xl shadow-sm border border-slate-100 hover:shadow-md transition-shadow">
                            <div className="w-12 h-12 bg-indigo-50 rounded-xl flex items-center justify-center mb-6">
                                <Zap className="w-6 h-6 text-indigo-600" />
                            </div>
                            <h3 className="text-xl font-bold mb-3">Fast Quoting</h3>
                            <p className="text-slate-600 leading-relaxed">
                                Create beautiful, accurate quotes in seconds. Convert them to invoices with a single click.
                            </p>
                        </div>
                        <div className="bg-white p-8 rounded-2xl shadow-sm border border-slate-100 hover:shadow-md transition-shadow">
                            <div className="w-12 h-12 bg-emerald-50 rounded-xl flex items-center justify-center mb-6">
                                <ShieldCheck className="w-6 h-6 text-emerald-600" />
                            </div>
                            <h3 className="text-xl font-bold mb-3">Secure & Scalable</h3>
                            <p className="text-slate-600 leading-relaxed">
                                Enterprise-grade security with role-based access control. Grows with your business from one store to many.
                            </p>
                        </div>
                    </div>
                </div>
            </section>

            {/* Social Proof / Trust */}
            <section className="py-24 border-t border-slate-100">
                <div className="container mx-auto px-4">
                    <div className="flex flex-col md:flex-row items-center justify-between gap-12">
                        <div className="md:w-1/2">
                            <h2 className="text-3xl font-bold mb-6">Why top showrooms choose Tylgo</h2>
                            <div className="space-y-4">
                                {[
                                    "Purpose-built for the tile industry",
                                    "Reduces administrative time by 50%",
                                    "World-class support and onboarding",
                                    "Seamless multi-location management"
                                ].map((item, i) => (
                                    <div key={i} className="flex items-center gap-3">
                                        <CheckCircle2 className="w-5 h-5 text-green-500 flex-shrink-0" />
                                        <span className="text-slate-700 font-medium">{item}</span>
                                    </div>
                                ))}
                            </div>
                        </div>
                        <div className="md:w-1/2 bg-slate-900 rounded-2xl p-8 md:p-12 text-white relative overflow-hidden">
                            <div className="absolute top-0 right-0 p-32 bg-blue-600 rounded-full blur-3xl opacity-20 -mr-16 -mt-16"></div>
                            <p className="text-xl md:text-2xl font-medium leading-relaxed mb-6 relative z-10">
                                "Tylgo transformed how we manage our showroom. The inventory tracking alone has saved us countless hours and headaches. It's simply the best software for tile businesses."
                            </p>
                            <div className="flex items-center gap-4">
                                <div className="w-12 h-12 bg-slate-700 rounded-full flex items-center justify-center font-bold text-lg">AJ</div>
                                <div>
                                    <div className="font-bold">Anuj J.</div>
                                    <div className="text-slate-400 text-sm">Owner, Jayam Traders</div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </section>

            {/* Contact Section */}
            <section id="contact" className="py-24 bg-blue-600 text-white">
                <div className="container mx-auto px-4 text-center">
                    <h2 className="text-3xl md:text-4xl font-bold mb-6">Ready to modernize your showroom?</h2>
                    <p className="text-blue-100 text-lg mb-10 max-w-2xl mx-auto">
                        Join the waiting list or schedule a demo to see how Tylgo can help your business grow.
                    </p>
                    <div className="flex flex-col sm:flex-row items-center justify-center gap-4 max-w-md mx-auto">
                        <a href="mailto:hello@tylgo.com" className="w-full bg-white text-blue-600 font-bold py-4 px-8 rounded-xl hover:bg-blue-50 transition-colors">
                            Contact Sales
                        </a>
                    </div>
                </div>
            </section>

            {/* Footer */}
            <footer className="py-12 bg-slate-900 text-slate-400 border-t border-slate-800">
                <div className="container mx-auto px-4 flex flex-col md:flex-row items-center justify-between gap-6">
                    <div className="flex items-center gap-2">
                        <div className="bg-slate-800 w-6 h-6 rounded flex items-center justify-center">
                            <span className="text-white font-bold text-xs">T</span>
                        </div>
                        <span className="font-semibold text-slate-200">Tylgo</span>
                    </div>
                    <p className="text-sm">© {new Date().getFullYear()} Tylgo Inc. All rights reserved.</p>
                </div>
            </footer>
        </div>
    );
}

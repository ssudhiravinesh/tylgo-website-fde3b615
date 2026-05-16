/**
 * install-service.js
 * Run this ONCE on Anuj's PC (as Administrator) to register the relay
 * as a Windows Service that starts automatically on boot.
 *
 * Usage:
 *   node install-service.js          → installs the service
 *   node install-service.js remove   → uninstalls the service
 */

const { Service } = require("node-windows");
const path = require("path");

const svc = new Service({
  name: "TylgoTallyRelay",
  description: "Tylgo → TallyPrime relay service (auto-sync billing vouchers)",
  script: path.join(__dirname, "index.js"),

  // Pass env variables so the relay doesn't need a .env file at runtime.
  // Edit these values to match the actual .env before running this script.
  env: [
    { name: "SUPABASE_URL",      value: "https://onucizagpgwdpcakskat.supabase.co" },
    { name: "SUPABASE_ANON_KEY", value: "YOUR_SUPABASE_ANON_KEY_HERE" },
    { name: "TALLY_URL",         value: "http://localhost:9000" },
    { name: "POLL_INTERVAL_MS",  value: "10000" },
  ],

  // Restart the service if it crashes — up to 3 times, then wait 60s
  nodeOptions: [],
  wait: 2,       // seconds between restart attempts
  grow: 0.5,     // exponential backoff factor
  maxRetries: 3,
});

const action = process.argv[2];

if (action === "remove") {
  svc.on("uninstall", () => {
    console.log("✅ TylgoTallyRelay service removed successfully.");
  });
  svc.uninstall();
} else {
  svc.on("install", () => {
    console.log("✅ TylgoTallyRelay service installed successfully.");
    console.log("   Starting service now...");
    svc.start();
  });

  svc.on("alreadyinstalled", () => {
    console.log("⚠️  Service is already installed. Remove it first:");
    console.log("   node install-service.js remove");
  });

  svc.on("error", (err) => {
    console.error("❌ Error:", err);
  });

  svc.install();
}

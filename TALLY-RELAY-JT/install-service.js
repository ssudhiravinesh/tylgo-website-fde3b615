/**
 * install-service.js
 * Run this ONCE on Anuj's PC (as Administrator) to register the relay
 * as a Windows Service that starts automatically on boot.
 *
 * Usage:
 *   node install-service.js          → installs the service
 *   node install-service.js remove   → uninstalls the service
 *   node install-service.js start    → manually starts the service
 *   node install-service.js stop     → manually stops the service
 */

const { Service } = require("node-windows");
const path = require("path");

// ✅ KEY FIX: Use the FULL path to node.exe (the one running this script right now).
// Windows Services don't inherit PATH, so 'node' alone would fail.
// process.execPath gives us e.g. "C:\Program Files\nodejs\node.exe"
const NODE_EXE = process.execPath;
console.log("Using node binary:", NODE_EXE);

const svc = new Service({
  name: "TylgoTallyRelay",
  description: "Tylgo → TallyPrime relay service (auto-sync billing vouchers)",
  script: path.join(__dirname, "index.js"),

  // Full path to node.exe — critical for services that run without user PATH
  execPath: NODE_EXE,

  // Pass env variables so the relay doesn't need a .env file at runtime.
  // Edit these values to match the actual .env before running this script.
  env: [
    { name: "SUPABASE_URL",         value: "https://onucizagpgwdpcakskat.supabase.co" },
    { name: "SUPABASE_SERVICE_KEY", value: "YOUR_SUPABASE_SERVICE_KEY_HERE" },   // ← paste the service role key here
    { name: "TALLY_HOST",           value: "localhost" },
    { name: "TALLY_PORT",           value: "9000" },
    { name: "POLL_INTERVAL_MS",     value: "5000" },
    { name: "SALES_LEDGER_NAME",    value: "Sales Account" },                    // ← must match Tally exactly
  ],

  // Restart the service if it crashes
  wait: 2,       // seconds between restart attempts
  grow: 0.5,     // exponential backoff factor
  maxRetries: 5,
});

const action = process.argv[2];

if (action === "remove") {
  svc.on("uninstall", () => {
    console.log("✅ TylgoTallyRelay service removed successfully.");
  });
  svc.uninstall();

} else if (action === "start") {
  svc.start();
  console.log("▶️  Starting TylgoTallyRelay service...");

} else if (action === "stop") {
  svc.stop();
  console.log("⏹️  Stopping TylgoTallyRelay service...");

} else {
  // Default: install
  svc.on("install", () => {
    console.log("✅ TylgoTallyRelay service installed successfully.");
    console.log("   Logs will appear in: " + path.join(__dirname, "daemon"));
    console.log("   Starting service now...");
    svc.start();
  });

  svc.on("alreadyinstalled", () => {
    console.log("⚠️  Service is already installed.");
    console.log("   To reinstall: node install-service.js remove  →  then  node install-service.js");
    console.log("   To start now: node install-service.js start");
  });

  svc.on("error", (err) => {
    console.error("❌ Error:", err);
    console.error("   Check logs in:", path.join(__dirname, "daemon"));
  });

  svc.install();
}

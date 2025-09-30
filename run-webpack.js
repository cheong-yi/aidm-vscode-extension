const webpack = require("webpack");
const config = require("./webpack.config.js");

console.log("🔨 Starting webpack build...");

const compiler = webpack(config);

compiler.run((err, stats) => {
  if (err) {
    console.error("❌ Webpack build failed:", err);
    process.exit(1);
  }

  if (stats.hasErrors()) {
    console.error("❌ Webpack build errors:", stats.toJson().errors);
    process.exit(1);
  }

  if (stats.hasWarnings()) {
    console.warn("⚠️ Webpack build warnings:", stats.toJson().warnings);
  }

  console.log("✅ Webpack build completed successfully");
  console.log("📊 Build stats:", {
    time: stats.toJson().time + "ms",
    assets: Object.keys(stats.toJson().assets).length,
    chunks: stats.toJson().chunks.length,
  });
});


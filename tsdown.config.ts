import { defineConfig } from "tsdown";
export default defineConfig({
  entry: ["./src/index.ts", "./src/utils.ts"],
  outDir: "./.dist",
  format: ["cjs", "esm"],
  dts: true,
  alias: {
    "~/*": "./src/*",
  },
});

import { dirname } from "path";
import { fileURLToPath } from "url";
import { FlatCompat } from "@eslint/eslintrc";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const compat = new FlatCompat({
  baseDirectory: __dirname,
});

const eslintConfig = [
  {
    ignores: [
      // Dependencies
      "node_modules/**",
      ".pnp",
      ".pnp.js",
      
      // Production builds
      ".next/**",
      "out/**",
      "build/**",
      "dist/**",
      
      // Environment and config files
      ".env*",
      ".eslintcache",
      
      // Database and migrations
      "drizzle/**",
      "**/*.sql",
      
      // Logs and temp files
      "npm-debug.log*",
      "yarn-debug.log*",
      "yarn-error.log*",
      ".DS_Store",
      "*.tsbuildinfo",
      
      // Test coverage
      "coverage/**",
      
      // Documentation (except README)
      "**/*.md",
      "!README.md",
      
      // Config files that don't need linting
      "*.config.js",
      "*.config.mjs",
      "tailwind.config.js",
      "postcss.config.mjs",
      "next.config.ts",
      "drizzle.config.ts",
      "jest.babel.config.js",
      
      // Next.js generated files
      "next-env.d.ts",
      
      // Public assets
      "public/**",
      
      // Specific directories
      "etc/**",
      "examples/**",
      ".trae/**",
      
      // Generated files
      "typedoc.json",
      "components.json"
    ]
  },
  ...compat.extends("next/core-web-vitals", "next/typescript"),
];

export default eslintConfig;

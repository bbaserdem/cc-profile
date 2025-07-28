#!/usr/bin/env node
/**
 * Prettier Check Hook for cc-profile
 * Runs Prettier in check mode on supported files at session end
 */

import { execSync } from "child_process";
import fs from "fs";
import path from "path";

// Supported file extensions for Prettier
const SUPPORTED_EXTENSIONS = [
  ".js",
  ".jsx",
  ".ts",
  ".tsx",
  ".mjs",
  ".cjs",
  ".css",
  ".scss",
  ".sass",
  ".less",
  ".json",
  ".jsonc",
  ".html",
  ".htm",
  ".md",
  ".markdown",
  ".yml",
  ".yaml",
  ".vue",
  ".svelte",
];

/**
 * Find all supported files in the current directory and subdirectories
 */
function findSupportedFiles(dir = process.cwd(), files = []) {
  try {
    const entries = fs.readdirSync(dir, { withFileTypes: true });

    for (const entry of entries) {
      const fullPath = path.join(dir, entry.name);

      // Skip node_modules, .git, and other common ignored directories
      if (entry.isDirectory()) {
        if (
          ![
            "node_modules",
            ".git",
            "dist",
            "build",
            ".next",
            "coverage",
          ].includes(entry.name)
        ) {
          findSupportedFiles(fullPath, files);
        }
      } else if (entry.isFile()) {
        const ext = path.extname(entry.name);
        if (SUPPORTED_EXTENSIONS.includes(ext)) {
          files.push(fullPath);
        }
      }
    }
  } catch (_error) {
    // Skip directories we can't read
  }

  return files;
}

/**
 * Run Prettier in check mode on all supported files
 */
function runPrettierCheck() {
  try {
    // Find all supported files
    const files = findSupportedFiles();

    if (files.length === 0) {
      console.log("No supported files found to check with Prettier");
      return true;
    }

    console.log(`🎨 Running Prettier check on ${files.length} files...`);

    // Run Prettier in check mode
    const _result = execSync("npx prettier --check .", {
      stdio: "pipe",
      encoding: "utf8",
      cwd: process.cwd(),
    });

    console.log("✅ Prettier check passed - all files are properly formatted");
    return true;
  } catch (_error) {
    console.log("❌ Prettier check found formatting issues:");
    if (_error.stdout) {
      console.log(_error.stdout);
    }
    if (_error.stderr) {
      console.error(_error.stderr);
    }

    console.log("\n💡 Run `npx prettier --write .` to fix formatting issues");

    // Return false to indicate formatting issues were found (blocking on Stop)
    return false;
  }
}

/**
 * Main execution
 */
async function main() {
  try {
    // Read event from stdin
    let input = "";

    // Set up stdin reading
    process.stdin.setEncoding("utf8");

    for await (const chunk of process.stdin) {
      input += chunk;
    }

    // Parse the hook event
    const event = JSON.parse(input.trim());

    // Only run on Stop events
    if (event.hook_event_name !== "Stop") {
      console.log("Prettier check only runs on Stop events");
      process.exit(0);
    }

    console.log("Running Prettier check at session end...");

    // Run Prettier check
    const success = runPrettierCheck();

    // Exit with appropriate code (BLOCKING on Stop - exit code 2 blocks and feeds stderr to Claude)
    if (!success) {
      console.error(
        "🚨 Prettier check failed - Run `npx prettier --write .` to fix formatting before proceeding",
      );
      // Exit with code 2 to block the session (feeds stderr back to Claude)
      process.exit(2);
    }

    process.exit(0);
  } catch (_error) {
    console.error("Prettier check hook error:", _error.message);
    process.exit(2);
  }
}

// Execute if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch((error) => {
    console.error("Fatal error in Prettier check hook:", error);
    process.exit(1);
  });
}

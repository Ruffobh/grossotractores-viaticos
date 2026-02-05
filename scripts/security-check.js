
const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

console.log("🔒 Running Security Check: Scanning for exposed keys...");

const KEY_PATTERN = /AIza[a-zA-Z0-9_\-]{35}/;
const EXCLUDED_DIRS = ['node_modules', '.git', '.next', 'build', '.gemini'];
const EXCLUDED_FILES = ['package-lock.json', '.env', '.env.local', 'SECURITY_PROTOCOL.md'];

function scanDir(dir) {
    const files = fs.readdirSync(dir);
    let found = false;

    for (const file of files) {
        if (EXCLUDED_DIRS.includes(file)) continue;
        if (EXCLUDED_FILES.includes(file)) continue;

        const fullPath = path.join(dir, file);
        const stat = fs.statSync(fullPath);

        if (stat.isDirectory()) {
            if (scanDir(fullPath)) found = true;
        } else {
            // Only scan source files
            if (!/\.(js|ts|tsx|jsx|json|md)$/.test(file)) continue;

            try {
                const content = fs.readFileSync(fullPath, 'utf8');
                if (KEY_PATTERN.test(content)) {
                    console.error(`❌ CRITICAL SECURITY FAIL: Exposed Key found in ${fullPath}`);
                    found = true;
                }
            } catch (e) {
                // Ignore read errors
            }
        }
    }
    return found;
}

// Get staged files if possible, or scan everything
// Simple full scan for now to be safe
const hasLeaks = scanDir(process.cwd());

if (hasLeaks) {
    console.error("\n🚫 COMMIT REJECTED. Remove hardcoded keys before proceeding.");
    process.exit(1);
} else {
    console.log("✅ Security Check Passed. No keys pattern matched.");
    process.exit(0);
}

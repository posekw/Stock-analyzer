
const fs = require('fs');
const path = require('path');

// Configuration
const PLUGIN_DIR = path.resolve('..', 'stock-valuation-plugin', 'stock-valuation-pro');
const APP_DIR = path.resolve('.');
const ASSETS_DEST = path.join(APP_DIR, 'public', 'plugin-assets');
const STYLES_DEST = path.join(APP_DIR, 'src', 'styles');

console.log(`Syncing from: ${PLUGIN_DIR}`);
console.log(`To: ${APP_DIR}`);

// Ensure directories exist
function ensureDir(dir) {
    if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
    }
}

// Recursive copy function
function copyRecursive(src, dest) {
    const exists = fs.existsSync(src);
    const stats = exists && fs.statSync(src);
    const isDirectory = exists && stats.isDirectory();

    if (isDirectory) {
        ensureDir(dest);
        fs.readdirSync(src).forEach(childItemName => {
            copyRecursive(path.join(src, childItemName), path.join(dest, childItemName));
        });
    } else {
        ensureDir(path.dirname(dest));
        fs.copyFileSync(src, dest);
        console.log(`Copied: ${src} -> ${dest}`);
    }
}

// 1. Sync Assets (Images, Fonts, generic CSS/JS) to public/plugin-assets
// This ensures ALL static assets are available to the web app
const pluginAssetsDir = path.join(PLUGIN_DIR, 'assets');
if (fs.existsSync(pluginAssetsDir)) {
    console.log('--- Syncing Assets ---');
    copyRecursive(pluginAssetsDir, ASSETS_DEST);
} else {
    console.warn('Warning: Plugin assets directory not found!');
}

// 2. Sync CSS to src/styles (for direct import into Next.js)
// We specifically want frontend.css to be easily imported in layout.tsx
const cssSource = path.join(PLUGIN_DIR, 'assets', 'css', 'frontend.css');
const cssDest = path.join(STYLES_DEST, 'plugin-frontend.css');

if (fs.existsSync(cssSource)) {
    console.log('--- Syncing Core CSS ---');
    ensureDir(STYLES_DEST);
    fs.copyFileSync(cssSource, cssDest);
    console.log(`Copied: ${cssSource} -> ${cssDest}`);
}

// 3. Sync Templates (Optional: for reference)
// Moving templates to a reference folder so we don't "skip" them
const templatesSrc = path.join(PLUGIN_DIR, 'templates');
const templatesDest = path.join(APP_DIR, 'src', 'reference', 'templates');
if (fs.existsSync(templatesSrc)) {
    console.log('--- Syncing Templates (Reference) ---');
    copyRecursive(templatesSrc, templatesDest);
}

// 4. Sync Includes (Logic Reference) -> src/reference/includes
// PHP logic can't run, but we want it for reference to port logic
const includesSrc = path.join(PLUGIN_DIR, 'includes');
const includesDest = path.join(APP_DIR, 'src', 'reference', 'includes');
if (fs.existsSync(includesSrc)) {
    console.log('--- Syncing Includes (Reference) ---');
    copyRecursive(includesSrc, includesDest);
}

// 5. Sync Root Files (Reference)
// Copy main plugin entry point and readme
const rootFiles = ['stock-valuation-pro.php', 'readme.txt'];
const referenceRootDest = path.join(APP_DIR, 'src', 'reference');
ensureDir(referenceRootDest);

rootFiles.forEach(file => {
    const src = path.join(PLUGIN_DIR, file);
    const dest = path.join(referenceRootDest, file);
    if (fs.existsSync(src)) {
        fs.copyFileSync(src, dest);
        console.log(`Copied: ${src} -> ${dest}`);
    }
});

console.log('Successfully synced all plugin files to App.');

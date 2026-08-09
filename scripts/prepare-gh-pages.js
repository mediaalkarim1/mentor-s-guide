import fs from "node:fs";
import path from "node:path";

function prepareGhPages() {
  const outputPublicDir = path.join(process.cwd(), ".output", "public");
  const distDir = path.join(process.cwd(), "dist");
  const basePath = "/mentor-s-guide/";

  if (!fs.existsSync(outputPublicDir)) {
    console.error("Error: .output/public does not exist. Please run build first.");
    process.exit(1);
  }

  // Clear & create dist directory
  if (fs.existsSync(distDir)) {
    fs.rmSync(distDir, { recursive: true, force: true });
  }
  fs.mkdirSync(distDir, { recursive: true });

  // Copy output public files to dist
  fs.cpSync(outputPublicDir, distDir, { recursive: true });

  // Create .nojekyll to prevent GitHub Pages from using Jekyll engine
  fs.writeFileSync(path.join(distDir, ".nojekyll"), "");

  // Find index-*.js and styles-*.css in assets/
  const assetsDir = path.join(distDir, "assets");
  let jsFile = "";
  let cssFile = "";

  if (fs.existsSync(assetsDir)) {
    const files = fs.readdirSync(assetsDir);
    jsFile = files.find((f) => f.startsWith("index-") && f.endsWith(".js")) || "";
    cssFile = files.find((f) => f.startsWith("styles-") && f.endsWith(".css")) || "";
  }

  console.log("Found JS asset:", jsFile);
  console.log("Found CSS asset:", cssFile);

  const indexHtmlContent = `<!DOCTYPE html>
<html lang="id">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>Mutabaah Guru — Sekolah Alam Al-Karim</title>
    <link rel="preconnect" href="https://fonts.googleapis.com" />
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
    <link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700&family=Sora:wght@500;600;700&display=swap" />
    ${cssFile ? `<link rel="stylesheet" href="${basePath}assets/${cssFile}" />` : ""}
    <link rel="icon" href="${basePath}favicon.ico" type="image/x-icon" />
    <script>
      // Single Page Apps for GitHub Pages SPA Routing Decode
      (function(l) {
        if (l.search[1] === '/' ) {
          var decoded = l.search.slice(1).split('&').map(function(s) { 
            return s.replace(/~and~/g, '&')
          }).join('?');
          window.history.replaceState(null, null,
              l.pathname.slice(0, -1) + decoded + l.hash
          );
        }
      }(window.location));
    </script>
  </head>
  <body>
    <div id="root"></div>
    ${jsFile ? `<script type="module" src="${basePath}assets/${jsFile}"></script>` : ""}
  </body>
</html>
`;

  const html404Content = `<!DOCTYPE html>
<html lang="id">
  <head>
    <meta charset="utf-8" />
    <title>Mutabaah Guru</title>
    <script>
      // Single Page Apps for GitHub Pages 404 Redirect
      (function(l) {
        if (l.pathname.length > 1) {
          var pathSegments = l.pathname.slice(1).split('/');
          var repo = pathSegments[0];
          var q = pathSegments.slice(1).join('/');
          l.replace(
            l.protocol + '//' + l.hostname + (l.port ? ':' + l.port : '') +
            '/' + repo + '/?/' + q + (l.search ? '&' + l.search.slice(1).replace(/&/g, '~and~') : '') +
            l.hash
          );
        }
      }(window.location));
    </script>
  </head>
  <body>
  </body>
</html>
`;

  // Write index.html and 404.html (for SPA routing on GitHub Pages)
  fs.writeFileSync(path.join(distDir, "index.html"), indexHtmlContent, "utf-8");
  fs.writeFileSync(path.join(distDir, "404.html"), html404Content, "utf-8");

  console.log("GitHub Pages deployment folder 'dist' prepared successfully!");
}

prepareGhPages();

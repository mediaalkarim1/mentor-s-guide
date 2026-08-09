import fs from "node:fs";
import path from "node:path";

function checkKeys() {
  const envPath = path.join(process.cwd(), ".env");
  if (fs.existsSync(envPath)) {
    console.log(".env contents:");
    console.log(fs.readFileSync(envPath, "utf-8"));
  }
}

checkKeys();

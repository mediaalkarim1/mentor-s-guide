import fs from "node:fs";
import path from "node:path";
import {
  MASTER_MENTORS,
  MASTER_BINAAN,
  MASTER_INDICATORS,
  MASTER_PERIODS,
} from "./master-data";

const STORE_FILE = path.join(process.cwd(), "src/lib/master_data_store.json");

export type MasterStoreData = {
  mentors: any[];
  binaan: any[];
  indicators: any[];
  periods: any[];
  submissions: any[];
};

let memoryStore: MasterStoreData = {
  mentors: [...MASTER_MENTORS],
  binaan: [...MASTER_BINAAN],
  indicators: [...MASTER_INDICATORS],
  periods: [...MASTER_PERIODS],
  submissions: [],
};

try {
  if (fs.existsSync(STORE_FILE)) {
    const raw = fs.readFileSync(STORE_FILE, "utf-8");
    const parsed = JSON.parse(raw);
    if (parsed.mentors && parsed.mentors.length > 0) memoryStore.mentors = parsed.mentors;
    if (parsed.binaan && parsed.binaan.length > 0) memoryStore.binaan = parsed.binaan;
    if (parsed.indicators && parsed.indicators.length > 0) memoryStore.indicators = parsed.indicators;
    if (parsed.periods && parsed.periods.length > 0) memoryStore.periods = parsed.periods;
    if (parsed.submissions && Array.isArray(parsed.submissions)) memoryStore.submissions = parsed.submissions;
  }
} catch (e) {
  console.warn("Failed to load master_data_store.json:", e);
}

function persistStore() {
  try {
    fs.writeFileSync(STORE_FILE, JSON.stringify(memoryStore, null, 2), "utf-8");
  } catch (e) {
    console.warn("Failed to persist master_data_store.json:", e);
  }
}

export function getMasterStore(): MasterStoreData {
  return memoryStore;
}

export function updateMasterStore(
  type: "mentors" | "binaan" | "indicators" | "periods" | "submissions",
  action: "upsert" | "delete" | "activate",
  item: any
) {
  if (type === "mentors") {
    if (action === "delete") {
      memoryStore.mentors = memoryStore.mentors.filter((m) => m.id !== item.id);
    } else {
      const idx = memoryStore.mentors.findIndex((m) => m.id === item.id);
      if (idx >= 0) memoryStore.mentors[idx] = { ...memoryStore.mentors[idx], ...item };
      else memoryStore.mentors.push(item);
    }
  } else if (type === "binaan") {
    if (action === "delete") {
      memoryStore.binaan = memoryStore.binaan.filter((b) => b.id !== item.id);
    } else {
      const idx = memoryStore.binaan.findIndex((b) => b.id === item.id);
      if (idx >= 0) memoryStore.binaan[idx] = { ...memoryStore.binaan[idx], ...item };
      else memoryStore.binaan.unshift(item);
    }
  } else if (type === "indicators") {
    if (action === "delete") {
      memoryStore.indicators = memoryStore.indicators.filter((i) => i.id !== item.id);
    } else {
      const idx = memoryStore.indicators.findIndex((i) => i.id === item.id);
      if (idx >= 0) memoryStore.indicators[idx] = { ...memoryStore.indicators[idx], ...item };
      else memoryStore.indicators.push(item);
    }
  } else if (type === "periods") {
    if (action === "activate") {
      memoryStore.periods.forEach((p) => {
        p.status = p.id === item.id ? "active" : "closed";
      });
    } else if (action === "delete") {
      memoryStore.periods = memoryStore.periods.filter((p) => p.id !== item.id);
    } else {
      const idx = memoryStore.periods.findIndex((p) => p.id === item.id);
      if (idx >= 0) memoryStore.periods[idx] = { ...memoryStore.periods[idx], ...item };
      else memoryStore.periods.unshift(item);
    }
  } else if (type === "submissions") {
    const idx = memoryStore.submissions.findIndex(
      (s) => (s.binaan_id === item.binaan_id || s.binaanName === item.binaanName) && s.period_id === item.period_id,
    );
    if (idx >= 0) memoryStore.submissions[idx] = { ...memoryStore.submissions[idx], ...item };
    else memoryStore.submissions.push(item);
  }

  persistStore();
}

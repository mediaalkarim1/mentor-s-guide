import {
  MASTER_MENTORS,
  MASTER_BINAAN,
  MASTER_INDICATORS,
  MASTER_PERIODS,
} from "./master-data";

const LOCAL_STORAGE_KEY = "mutabaah_admin_master_v3";

export type MasterClientStore = {
  mentors: any[];
  binaan: any[];
  indicators: any[];
  periods: any[];
};

export function getClientMasterStore(): MasterClientStore {
  if (typeof window === "undefined") {
    return {
      mentors: [...MASTER_MENTORS],
      binaan: [...MASTER_BINAAN],
      indicators: [...MASTER_INDICATORS],
      periods: [...MASTER_PERIODS],
    };
  }

  try {
    const raw = localStorage.getItem(LOCAL_STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      return {
        mentors: parsed.mentors && parsed.mentors.length > 0 ? parsed.mentors : [...MASTER_MENTORS],
        binaan: parsed.binaan && parsed.binaan.length > 0 ? parsed.binaan : [...MASTER_BINAAN],
        indicators: parsed.indicators && parsed.indicators.length > 0 ? parsed.indicators : [...MASTER_INDICATORS],
        periods: parsed.periods && parsed.periods.length > 0 ? parsed.periods : [...MASTER_PERIODS],
      };
    }
  } catch (e) {
    console.warn("Failed to read master client store", e);
  }

  const initial = {
    mentors: [...MASTER_MENTORS],
    binaan: [...MASTER_BINAAN],
    indicators: [...MASTER_INDICATORS],
    periods: [...MASTER_PERIODS],
  };
  try {
    localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(initial));
  } catch (e) {}

  return initial;
}

export function updateClientMasterStore(
  type: "mentors" | "binaan" | "indicators" | "periods",
  action: "upsert" | "delete" | "activate",
  item: any
): MasterClientStore {
  const store = getClientMasterStore();

  if (type === "mentors") {
    const cleanName = (item.name || "").toLowerCase().trim();
    if (action === "delete") {
      store.mentors = store.mentors.filter((m) => m.id !== item.id && (m.name || "").toLowerCase().trim() !== cleanName);
    } else {
      const idx = store.mentors.findIndex((m) => m.id === item.id || (m.name || "").toLowerCase().trim() === cleanName);
      if (idx >= 0) store.mentors[idx] = { ...store.mentors[idx], ...item };
      else store.mentors.push(item);
    }
  } else if (type === "binaan") {
    const cleanName = (item.name || "").toLowerCase().trim();
    if (action === "delete") {
      store.binaan = store.binaan.filter((b) => b.id !== item.id && (b.name || "").toLowerCase().trim() !== cleanName);
    } else {
      const idx = store.binaan.findIndex(
        (b) => b.id === item.id || ((b.name || "").toLowerCase().trim() === cleanName && b.mentor_id === item.mentor_id),
      );
      if (idx >= 0) store.binaan[idx] = { ...store.binaan[idx], ...item };
      else store.binaan.unshift(item);
    }
  } else if (type === "indicators") {
    const cleanCode = (item.code || "").toUpperCase().trim();
    if (action === "delete") {
      store.indicators = store.indicators.filter((i) => i.id !== item.id && (i.code || "").toUpperCase().trim() !== cleanCode);
    } else {
      const idx = store.indicators.findIndex((i) => i.id === item.id || (i.code || "").toUpperCase().trim() === cleanCode);
      if (idx >= 0) store.indicators[idx] = { ...store.indicators[idx], ...item };
      else store.indicators.push(item);
    }
  } else if (type === "periods") {
    if (action === "activate") {
      store.periods.forEach((p) => {
        if (p.id === item.id || (p.start_date === item.start_date && p.end_date === item.end_date)) {
          p.status = "active";
        } else {
          p.status = "closed";
        }
      });
      const exists = store.periods.some((p) => p.id === item.id || (p.start_date === item.start_date && p.end_date === item.end_date));
      if (!exists) {
        store.periods.unshift({ ...item, status: "active" });
      }
    } else if (action === "delete") {
      store.periods = store.periods.filter((p) => p.id !== item.id);
    } else {
      const idx = store.periods.findIndex((p) => p.id === item.id || (p.start_date === item.start_date && p.end_date === item.end_date));
      if (idx >= 0) store.periods[idx] = { ...store.periods[idx], ...item };
      else store.periods.unshift(item);
    }
  }

  try {
    if (typeof window !== "undefined") {
      localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(store));
      window.dispatchEvent(new Event("mutabaah_master_store_updated"));
    }
  } catch (e) {
    console.warn("Failed to write client master store", e);
  }

  return store;
}

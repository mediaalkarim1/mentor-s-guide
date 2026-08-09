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
    if (action === "delete") {
      store.mentors = store.mentors.filter((m) => m.id !== item.id);
    } else {
      const idx = store.mentors.findIndex((m) => m.id === item.id);
      if (idx >= 0) store.mentors[idx] = { ...store.mentors[idx], ...item };
      else store.mentors.push(item);
    }
  } else if (type === "binaan") {
    if (action === "delete") {
      store.binaan = store.binaan.filter((b) => b.id !== item.id);
    } else {
      const idx = store.binaan.findIndex((b) => b.id === item.id);
      if (idx >= 0) store.binaan[idx] = { ...store.binaan[idx], ...item };
      else store.binaan.unshift(item);
    }
  } else if (type === "indicators") {
    if (action === "delete") {
      store.indicators = store.indicators.filter((i) => i.id !== item.id);
    } else {
      const idx = store.indicators.findIndex((i) => i.id === item.id);
      if (idx >= 0) store.indicators[idx] = { ...store.indicators[idx], ...item };
      else store.indicators.push(item);
      store.indicators.sort((a, b) => (a.order_number || 0) - (b.order_number || 0));
    }
  } else if (type === "periods") {
    if (item.status === "active" || action === "activate") {
      store.periods.forEach((p) => {
        if (p.id !== item.id) p.status = "inactive";
      });
      item.status = "active";
    }
    if (action === "delete") {
      store.periods = store.periods.filter((p) => p.id !== item.id);
    } else {
      const idx = store.periods.findIndex((p) => p.id === item.id);
      if (idx >= 0) store.periods[idx] = { ...store.periods[idx], ...item };
      else store.periods.unshift(item);
      store.periods.sort((a, b) => b.start_date.localeCompare(a.start_date));
    }
  }

  if (typeof window !== "undefined") {
    try {
      localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(store));
      window.dispatchEvent(new CustomEvent("mutabaah_master_store_updated", { detail: store }));
    } catch (e) {}
  }

  return store;
}

import fs from "node:fs";
import path from "node:path";

export type MentorOverride = {
  isOverride: boolean;
  manualWeeklyScore?: number;
  manualMonthlyScore?: number;
  manualStatus?: string;
};

const OVERRIDES_FILE = path.join(process.cwd(), "src/lib/recap_overrides.json");

let memoryOverrides: Record<string, MentorOverride> = {};

try {
  if (fs.existsSync(OVERRIDES_FILE)) {
    const raw = fs.readFileSync(OVERRIDES_FILE, "utf-8");
    memoryOverrides = JSON.parse(raw);
  }
} catch (e) {
  console.warn("Failed to load recap_overrides.json:", e);
}

function persist() {
  try {
    fs.writeFileSync(OVERRIDES_FILE, JSON.stringify(memoryOverrides, null, 2), "utf-8");
  } catch (e) {
    console.warn("Failed to persist recap_overrides.json:", e);
  }
}

export function getMentorOverrideKey(mentorId: string, periodId?: string | null): string {
  return periodId ? `${mentorId}_${periodId}` : mentorId;
}

export function getMentorOverride(mentorId: string, periodId?: string | null): MentorOverride | undefined {
  const key = getMentorOverrideKey(mentorId, periodId);
  return memoryOverrides[key] ?? memoryOverrides[mentorId];
}

export function setMentorOverride(mentorId: string, periodId: string | null | undefined, override: MentorOverride) {
  const key = getMentorOverrideKey(mentorId, periodId);
  if (!override.isOverride) {
    delete memoryOverrides[key];
    if (periodId) delete memoryOverrides[mentorId];
  } else {
    memoryOverrides[key] = override;
  }
  persist();
}

export function clearMentorOverride(mentorId: string, periodId?: string | null) {
  const key = getMentorOverrideKey(mentorId, periodId);
  delete memoryOverrides[key];
  if (periodId) delete memoryOverrides[mentorId];
  persist();
}

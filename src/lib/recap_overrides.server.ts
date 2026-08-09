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

export function getMentorOverride(mentorId: string): MentorOverride | undefined {
  return memoryOverrides[mentorId];
}

export function setMentorOverride(mentorId: string, override: MentorOverride) {
  if (!override.isOverride) {
    delete memoryOverrides[mentorId];
  } else {
    memoryOverrides[mentorId] = override;
  }
  persist();
}

export function clearMentorOverride(mentorId: string) {
  delete memoryOverrides[mentorId];
  persist();
}

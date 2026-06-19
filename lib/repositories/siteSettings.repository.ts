import { one } from "@/lib/db/postgres";
import { date } from "./_mappers";

const DEFAULT_CONSULTATION = {
  heading: "Have Questions About Our Product? We're Here to Help.",
  subheading: "You can directly talk to our expert for personalized guidance.",
  description:
    "Our experienced team is here to understand your concerns and provide the right guidance. Whether you have questions about usage, duration, diet, or daily habits, you will receive clear and practical support tailored to your needs. This helps ensure you get the best possible results from our products safely and effectively, with complete confidence and long-term health support.",
  ctaText: "TAKE CONSULTATION NOW",
  ctaLink: "/contact",
};

const DEFAULT_BADGES = {
  heading: "Powerful Ayurvedic Care for\nComplete Piles Support",
};

export type SiteSettingsDoc = {
  key: string;
  consultation: Record<string, any>;
  badges: Record<string, any>;
  createdAt?: Date;
  updatedAt?: Date;
};

function rowToSettings(row: Record<string, any>): SiteSettingsDoc {
  return {
    key: row.key,
    consultation: { ...DEFAULT_CONSULTATION, ...(row.consultation ?? {}) },
    badges: { ...DEFAULT_BADGES, ...(row.badges ?? {}) },
    createdAt: date(row.created_at),
    updatedAt: date(row.updated_at),
  };
}

/** Replaces getSiteSettings(): fetch the single 'global' row, creating it with defaults if missing. */
export async function getGlobal(): Promise<SiteSettingsDoc> {
  const row = await one(
    `INSERT INTO site_settings (key, consultation, badges)
     VALUES ('global', $1::jsonb, $2::jsonb)
     ON CONFLICT (key) DO UPDATE SET key = 'global'
     RETURNING *`,
    [JSON.stringify(DEFAULT_CONSULTATION), JSON.stringify(DEFAULT_BADGES)],
  );
  return rowToSettings(row!);
}

/** Merge-update consultation / badges (mirrors findOneAndUpdate with $set + upsert). */
export async function upsertGlobal(patch: { consultation?: Record<string, any>; badges?: Record<string, any> }): Promise<SiteSettingsDoc> {
  await getGlobal(); // ensure row exists
  const row = await one(
    `UPDATE site_settings SET
       consultation = consultation || $1::jsonb,
       badges = badges || $2::jsonb,
       updated_at = now()
     WHERE key = 'global'
     RETURNING *`,
    [JSON.stringify(patch.consultation ?? {}), JSON.stringify(patch.badges ?? {})],
  );
  return rowToSettings(row!);
}

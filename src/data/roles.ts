import { z } from 'astro/zod';
import raw from './roles.json';

/**
 * Open AI-training roles shown on /experts/.
 *
 * Edit `roles.json`, not this file. For each role:
 * - `listingUrl` is the role's public page on the hiring platform.
 * - `referralUrl` is YOUR referral link for that role (from the platform's
 *   referral dashboard). Leave it empty and the button falls back to the
 *   public listing, which earns nothing.
 * - Never put a platform's name in `title`, `skills` or `terms`: the site
 *   doesn't name platforms (see CLAUDE.md content rules).
 */

export const domains = {
  law: 'Law',
  software: 'Software',
  'ai-data': 'AI and data',
  finance: 'Finance',
  medicine: 'Medicine',
  engineering: 'Engineering',
  science: 'Science and maths',
  language: 'Language',
  business: 'Business and media',
} as const;

export type DomainKey = keyof typeof domains;

const domainKeys = Object.keys(domains) as [DomainKey, ...DomainKey[]];

const Role = z.object({
  id: z.string().regex(/^[a-z0-9-]+$/),
  title: z.string().min(3),
  domain: z.enum(domainKeys),
  pay: z.string(),
  payMax: z.number().nonnegative(),
  skills: z.array(z.string().min(1)).min(1),
  terms: z.array(z.string().min(2)),
  posted: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  listingUrl: z.url(),
  referralUrl: z.union([z.url(), z.literal('')]),
});

export type Role = z.infer<typeof Role>;

const parsed = z.array(Role).parse(raw);

const duplicate = parsed.find(
  (role, index) => parsed.findIndex(({ id }) => id === role.id) !== index,
);
if (duplicate) throw new Error(`roles.json: duplicate id "${duplicate.id}"`);

export const roles = parsed;

/** Where the "View and apply" button goes: the referral link when set. */
export const applyUrl = (role: Role) => role.referralUrl || role.listingUrl;

/** Date the list was last checked, shown on /experts/. Update when you refresh roles.json. */
export const rolesCheckedOn = '2026-11-14';

const missing = roles.filter((role) => !role.referralUrl);
if (missing.length > 0 && import.meta.env.PROD) {
  console.warn(
    `[roles] ${missing.length} of ${roles.length} roles have no referralUrl yet; their buttons link to the public listing.`,
  );
}

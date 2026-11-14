export const site = {
  name: 'Dataceam',
  url: 'https://dataceam.com',
  xHandle: '@dataceam',
  email: 'hello@dataceam.com',
  personName: 'Syed Jawad',
} as const;

/**
 * Jawad's general referral links for the AI-training platforms on /experts/.
 * The platforms are not named on the site (see CLAUDE.md content rules), so
 * the page labels them "Platform 1" and "Platform 2".
 */
export const expertPlatforms = [
  {
    id: 'platform-1',
    label: 'Platform 1',
    summary:
      'Hourly contract roles for lawyers, doctors, engineers, scientists, finance specialists, linguists and more.',
    href: 'https://refer.micro1.ai/referral/jobs?referralCode=fd0f9173-a887-464d-b470-0b16a066198b&utm_source=referral&utm_medium=share&utm_campaign=job_referral',
  },
  {
    id: 'platform-2',
    label: 'Platform 2',
    summary:
      'Hourly and per-task projects for software engineers, doctors, researchers, economists and sales experts.',
    href: 'https://t.mercor.com/KRvxv',
  },
] as const;

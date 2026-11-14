/**
 * In-browser résumé matcher for /experts/.
 *
 * Privacy: the résumé is read with the File API (or from the textarea),
 * scored here, and never sent anywhere. PDFs are parsed with PDF.js, which
 * is bundled with the site and loaded from this origin only when needed.
 */

export interface MatcherRole {
  id: string;
  title: string;
  domain: string;
  domainLabel: string;
  pay: string;
  skills: string[];
  terms: string[];
  href: string;
}

export interface Match {
  role: MatcherRole;
  score: number;
  hits: string[];
  fit: 'strong' | 'good' | 'possible';
}

/** Signals that a résumé belongs to a field. Each distinct hit adds weight to roles in that field. */
const DOMAIN_SIGNALS: Record<string, string[]> = {
  law: [
    'attorney',
    'lawyer',
    'counsel',
    'litigation',
    'paralegal',
    'juris doctor',
    'j.d.',
    'llb',
    'bar admission',
    'admitted to the bar',
    'law firm',
    'solicitor',
    'barrister',
    'legal',
  ],
  software: [
    'software engineer',
    'software developer',
    'developer',
    'programming',
    'javascript',
    'typescript',
    'python',
    'java',
    'react',
    'node.js',
    'git',
    'api',
    'backend',
    'frontend',
    'full-stack',
    'full stack',
  ],
  'ai-data': [
    'machine learning',
    'data science',
    'data scientist',
    'data analyst',
    'sql',
    'deep learning',
    'pytorch',
    'tensorflow',
    'nlp',
    'llm',
    'annotation',
    'analytics',
    'power bi',
    'tableau',
  ],
  finance: [
    'accounting',
    'accountant',
    'finance',
    'financial',
    'audit',
    'acca',
    'cpa',
    'cfa',
    'chartered accountant',
    'reconciliation',
    'ledger',
    'ifrs',
    'gaap',
    'fp&a',
    'accounts receivable',
    'accounts payable',
    'bookkeeping',
    'invoicing',
  ],
  medicine: [
    'physician',
    'doctor',
    'm.d.',
    'mbbs',
    'nurse',
    'clinical',
    'hospital',
    'residency',
    'patient',
    'medical',
    'healthcare',
    'icd-10',
  ],
  engineering: [
    'mechanical engineering',
    'electrical engineering',
    'civil engineering',
    'cad',
    'solidworks',
    'autocad',
    'manufacturing',
    'pcb',
    'systems engineering',
    'quality engineer',
  ],
  science: [
    'physics',
    'mathematics',
    'statistics',
    'chemistry',
    'biology',
    'phd',
    'postdoc',
    'theorem',
  ],
  language: [
    'linguistics',
    'editing',
    'proofreading',
    'translation',
    'translator',
    'copywriting',
    'writer',
    'journalism',
    'tefl',
    'celta',
  ],
  business: [
    'marketing',
    'sales',
    'business development',
    'strategy',
    'consulting',
    'crm',
    'salesforce',
    'hubspot',
    'account executive',
    'revenue operations',
    'video production',
  ],
};

/** Title words too generic to count as evidence on their own. */
const TITLE_STOPWORDS = new Set([
  'expert',
  'experts',
  'specialist',
  'senior',
  'junior',
  'trainer',
  'engineer',
  'independent',
  'consultant',
  'domain',
  'with',
  'and',
  'the',
  'for',
  'role',
  'open',
  'contributions',
  'core',
  'contributor',
  'language',
  'english',
  'sciences',
  'leader',
]);

const escapeRegExp = (value: string) =>
  value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

const patternCache = new Map<string, RegExp>();

/** Whole-term match that also works for terms like "c++", "node.js" and "fp&a". */
function termPattern(term: string): RegExp {
  let pattern = patternCache.get(term);
  if (!pattern) {
    pattern = new RegExp(
      `(?<![a-z0-9+#])${escapeRegExp(term)}(?![a-z0-9+#])`,
      'i',
    );
    patternCache.set(term, pattern);
  }
  return pattern;
}

export function normalise(text: string): string {
  return text
    .normalize('NFKC')
    .replace(/[‘’]/g, "'")
    .replace(/[‐-―]/g, '-')
    .replace(/\s+/g, ' ')
    .toLowerCase();
}

const has = (text: string, term: string) => termPattern(term).test(text);

function domainAffinity(text: string): Record<string, number> {
  const affinity: Record<string, number> = {};
  for (const [domain, signals] of Object.entries(DOMAIN_SIGNALS)) {
    affinity[domain] = Math.min(
      6,
      signals.filter((signal) => has(text, signal)).length,
    );
  }
  return affinity;
}

function titleWords(title: string): string[] {
  return [
    ...new Set(
      normalise(title)
        .replace(/\([^)]*\)/g, (inner) => inner.slice(1, -1))
        .split(/[^a-z0-9+#.&-]+/)
        .map((word) => word.replace(/^[.-]+|[.-]+$/g, ''))
        .filter((word) => word.length >= 3 && !TITLE_STOPWORDS.has(word)),
    ),
  ];
}

/**
 * Score every role against the résumé text and return the best matches.
 * A role needs at least two pieces of direct evidence (a skill, a role term
 * or a distinctive title word); field affinity alone never makes a match.
 */
export function matchRoles(
  resume: string,
  roles: MatcherRole[],
  limit = 10,
): Match[] {
  const text = normalise(resume);
  const affinity = domainAffinity(text);
  const scored: Match[] = [];

  for (const role of roles) {
    const hits: string[] = [];
    let evidence = 0;
    let score = 0;

    for (const skill of role.skills) {
      const plain = normalise(skill)
        .replace(/\bor equivalent\b/, '')
        .trim();
      if (plain && has(text, plain)) {
        hits.push(skill);
        evidence += 1;
        score += 3;
      }
    }

    for (const term of role.terms) {
      if (has(text, term) && !hits.some((hit) => normalise(hit) === term)) {
        hits.push(term);
        evidence += 1;
        score += 2;
      }
    }

    for (const word of titleWords(role.title)) {
      if (
        has(text, word) &&
        !hits.some((hit) => normalise(hit).includes(word))
      ) {
        hits.push(word);
        evidence += 1;
        score += 2;
      }
    }

    score += (affinity[role.domain] ?? 0) * 1.5;

    if (evidence >= 2) {
      scored.push({ role, score, hits, fit: 'possible' });
    }
  }

  scored.sort(
    (a, b) => b.score - a.score || a.role.title.localeCompare(b.role.title),
  );
  const top = scored.slice(0, limit);
  const best = top[0]?.score ?? 0;
  for (const match of top) {
    const relative = best > 0 ? match.score / best : 0;
    match.fit =
      match.hits.length >= 4 && relative >= 0.75
        ? 'strong'
        : match.hits.length >= 3 && relative >= 0.5
          ? 'good'
          : 'possible';
  }
  return top;
}

/* ------------------------------------------------------------------ */
/* Reading files                                                        */
/* ------------------------------------------------------------------ */

const MAX_FILE_BYTES = 10 * 1024 * 1024;

export class UnreadableFileError extends Error {}
export class UnsupportedFileError extends Error {}

async function readPdf(file: File): Promise<string> {
  const [pdfjs, worker] = await Promise.all([
    import('pdfjs-dist'),
    import('pdfjs-dist/build/pdf.worker.min.mjs?url'),
  ]);
  pdfjs.GlobalWorkerOptions.workerSrc = worker.default;
  const data = new Uint8Array(await file.arrayBuffer());
  const task = pdfjs.getDocument({
    data,
    disableFontFace: true,
    useSystemFonts: false,
    stopAtErrors: false,
  });
  const pdf = await task.promise;
  const pages: string[] = [];
  const pageCount = Math.min(pdf.numPages, 20);
  for (let number = 1; number <= pageCount; number++) {
    const page = await pdf.getPage(number);
    const content = await page.getTextContent();
    pages.push(
      content.items.map((item) => ('str' in item ? item.str : '')).join(' '),
    );
  }
  await task.destroy();
  return pages.join('\n');
}

export async function readResumeFile(file: File): Promise<string> {
  if (file.size > MAX_FILE_BYTES) throw new UnreadableFileError('too large');
  const name = file.name.toLowerCase();
  const isPdf = file.type === 'application/pdf' || name.endsWith('.pdf');
  const isText = file.type.startsWith('text/') || /\.(txt|md|text)$/.test(name);

  if (isPdf) {
    try {
      return await readPdf(file);
    } catch {
      throw new UnreadableFileError('pdf');
    }
  }
  if (isText) return file.text();
  throw new UnsupportedFileError(name);
}

/* ------------------------------------------------------------------ */
/* Page wiring                                                          */
/* ------------------------------------------------------------------ */

const MESSAGES = {
  empty: 'Add your résumé first: choose a file or paste the text.',
  consent: "Tick the box to confirm you've read how the referral links work.",
  unreadable:
    "That file couldn't be read. Try a PDF with selectable text or a .txt file, or paste the text.",
  unsupported:
    "That file type isn't supported. Choose a PDF or .txt file, or paste the text.",
  tooShort:
    "There isn't enough text to match yet. Paste more of your résumé, or try a PDF with selectable text.",
  noMatches:
    'No close matches in the current list. Browse all roles below, or check back: the list is updated as roles open and close.',
};

const FIT_LABEL: Record<Match['fit'], string> = {
  strong: 'Strong fit',
  good: 'Good fit',
  possible: 'Possible fit',
};

function el<K extends keyof HTMLElementTagNameMap>(
  tag: K,
  className?: string,
  text?: string,
): HTMLElementTagNameMap[K] {
  const node = document.createElement(tag);
  if (className) node.className = className;
  if (text !== undefined) node.textContent = text;
  return node;
}

function renderMatch(match: Match): HTMLLIElement {
  const { role } = match;
  const item = el('li', 'role');
  const body = el('div', 'role-body');

  body.append(el('h3', undefined, role.title));

  const meta = el('p', 'role-meta');
  meta.append(
    el('span', `fit fit-${match.fit}`, FIT_LABEL[match.fit]),
    el('span', undefined, role.domainLabel),
    el('span', 'role-pay', role.pay || 'Pay shown on the listing'),
  );
  body.append(meta);

  const why = el('p', 'role-why');
  why.append(el('b', undefined, 'Matched: '));
  why.append(document.createTextNode(match.hits.slice(0, 6).join(', ')));
  body.append(why);

  const link = el('a', 'button button-primary', 'View and apply');
  link.href = role.href;
  link.target = '_blank';
  link.rel = 'sponsored noopener';
  link.append(
    el(
      'span',
      'sr-only',
      `: ${role.title} (opens the platform's site in a new tab)`,
    ),
  );

  item.append(body, link);
  return item;
}

export function initMatcher(): void {
  const form = document.querySelector<HTMLFormElement>('#matcher');
  const dataNode = document.querySelector('#roles-data');
  if (!form || !dataNode?.textContent) return;

  const roles = JSON.parse(dataNode.textContent) as MatcherRole[];
  const fileInput = form.querySelector<HTMLInputElement>('#resume-file')!;
  const textInput = form.querySelector<HTMLTextAreaElement>('#resume-text')!;
  const consent = form.querySelector<HTMLInputElement>('#consent')!;
  const dropzone = form.querySelector<HTMLElement>('#dropzone')!;
  const error = form.querySelector<HTMLElement>('#form-error')!;
  const status = form.querySelector<HTMLElement>('#form-status')!;
  const submit = form.querySelector<HTMLButtonElement>(
    'button[type="submit"]',
  )!;
  const results = document.querySelector<HTMLElement>('#results')!;
  const resultsHeading =
    document.querySelector<HTMLElement>('#results-heading')!;
  const summary = document.querySelector<HTMLElement>('#results-summary')!;
  const list = document.querySelector<HTMLOListElement>('#results-list')!;

  let droppedFile: File | null = null;

  const showError = (message: string) => {
    error.textContent = message;
    error.hidden = false;
    status.textContent = '';
  };
  const clearError = () => {
    error.hidden = true;
    error.textContent = '';
  };

  fileInput.addEventListener('change', () => {
    droppedFile = null;
    clearError();
  });

  for (const type of ['dragenter', 'dragover'] as const) {
    dropzone.addEventListener(type, (event) => {
      event.preventDefault();
      dropzone.classList.add('is-over');
    });
  }
  for (const type of ['dragleave', 'drop'] as const) {
    dropzone.addEventListener(type, () => dropzone.classList.remove('is-over'));
  }
  dropzone.addEventListener('drop', (event) => {
    event.preventDefault();
    const file = event.dataTransfer?.files?.[0];
    if (!file) return;
    droppedFile = file;
    fileInput.value = '';
    status.textContent = `Ready: ${file.name}`;
    clearError();
  });

  form.addEventListener('submit', async (event) => {
    event.preventDefault();
    clearError();

    const file = droppedFile ?? fileInput.files?.[0] ?? null;
    const pasted = textInput.value.trim();

    if (!file && !pasted) {
      showError(MESSAGES.empty);
      textInput.focus();
      return;
    }
    if (!consent.checked) {
      showError(MESSAGES.consent);
      consent.focus();
      return;
    }

    submit.disabled = true;
    status.textContent = file
      ? `Reading ${file.name} on your device…`
      : 'Matching…';

    let text = pasted;
    try {
      if (file) text = `${await readResumeFile(file)}\n${pasted}`;
    } catch (problem) {
      submit.disabled = false;
      showError(
        problem instanceof UnsupportedFileError
          ? MESSAGES.unsupported
          : MESSAGES.unreadable,
      );
      return;
    }

    if (normalise(text).replace(/[^a-z]/g, '').length < 40) {
      submit.disabled = false;
      showError(MESSAGES.tooShort);
      return;
    }

    const matches = matchRoles(text, roles);
    list.replaceChildren(...matches.map(renderMatch));
    summary.textContent =
      matches.length > 0
        ? `Top ${matches.length} of ${roles.length} roles, ranked by how many of the skills each role asks for appear in your résumé.`
        : MESSAGES.noMatches;
    results.hidden = false;
    status.textContent =
      matches.length > 0
        ? `Found ${matches.length} matching roles.`
        : 'No close matches found.';
    submit.disabled = false;
    resultsHeading.focus();
  });
}

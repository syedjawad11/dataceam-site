// Built-in pictures for --self-test, --samples and the --help example.
// The wording is plain-English sample copy; it is never published.

const cover = {
  file: 'cover',
  layout: 'cover',
  kicker: 'LLM basics',
  title: 'How does AI guess the next word?',
  subtitle:
    'A plain-English look at what happens between your question and the answer.',
  icons: ['chat', 'book', 'chip'],
};

const steps = {
  file: 'how-a-reply-is-built',
  layout: 'steps',
  title: 'Each word is picked one at a time',
  highlight: 'one at a time',
  items: [
    {
      icon: 'chat',
      label: 'You type a question',
      text: 'The app sends your words to the model.',
    },
    {
      icon: 'puzzle',
      label: 'Words become tokens',
      text: 'Text is cut into small pieces and turned into numbers.',
    },
    {
      icon: 'chart',
      label: 'Every next piece gets a score',
      text: 'The model ranks thousands of possible next pieces.',
    },
    {
      icon: 'dice',
      label: 'One piece is chosen',
      text: 'Usually a likely one, with a little chance mixed in.',
    },
  ],
  note: 'Then it repeats: the new piece joins the text and the scoring starts again.',
};

const compare = {
  file: 'search-or-chatbot',
  layout: 'compare',
  title: 'A search engine finds pages. A chatbot writes text.',
  highlight: 'writes text',
  columns: [
    {
      heading: 'Search engine',
      icon: 'search',
      items: [
        'Points you to pages that exist',
        'Shows who wrote each page',
        'You read and decide',
        'Good for facts and news',
      ],
    },
    {
      heading: 'Chatbot',
      icon: 'robot',
      items: [
        'Writes a new answer each time',
        'May not say where it came from',
        'You check what it says',
        'Good for drafts and ideas',
      ],
    },
  ],
  verdict: 'Use search to check a fact. Use a chatbot to shape a first draft.',
};

const cycle = {
  file: 'training-loop',
  layout: 'cycle',
  title: 'Training is guess, check, adjust, repeat',
  highlight: 'guess, check, adjust, repeat',
  center: 'Millions of rounds',
  items: [
    { label: 'Read', text: 'The model sees a sentence with the end hidden.' },
    { label: 'Guess', text: 'It predicts the hidden word.' },
    { label: 'Check', text: 'The guess is compared with the real word.' },
    { label: 'Adjust', text: 'Its settings move a tiny bit closer.' },
  ],
};

const layers = {
  file: 'what-sits-inside',
  layout: 'layers',
  title: 'Chat apps are built in layers',
  items: [
    { label: 'The app', text: 'The chat window you type into.' },
    {
      label: 'House rules',
      text: 'Hidden instructions about tone and what to refuse.',
    },
    { label: 'The model', text: 'The part that predicts the next words.' },
    {
      label: 'Training data',
      text: 'The books, pages and code it learned from.',
    },
  ],
  note: 'When something goes wrong, the cause can sit in any one of these layers.',
};

const bars = {
  file: 'how-much-it-can-read',
  layout: 'bars',
  title: 'How much text fits in one request',
  items: [
    { label: 'One email', value: 200, display: '200 words' },
    { label: 'A long report', value: 9000, display: '9,000 words' },
    { label: 'A short novel', value: 50000, display: '50,000 words' },
    { label: 'A large context window', value: 96000, display: '96,000 words' },
  ],
  note: 'A bigger window holds more text. It does not make the answers true.',
  source: 'Example figures for illustration, rounded.',
};

const cards = {
  file: 'good-first-uses',
  layout: 'cards',
  title: 'Four safe ways to start using AI at work',
  highlight: 'safe ways',
  items: [
    {
      icon: 'pencil',
      label: 'Polish a draft',
      text: 'Ask for a shorter, clearer version.',
    },
    {
      icon: 'list',
      label: 'Make a checklist',
      text: 'Turn loose notes into steps.',
    },
    {
      icon: 'lightbulb',
      label: 'Get unstuck',
      text: 'Ask for ten rough ideas, keep two.',
    },
    {
      icon: 'school',
      label: 'Learn a term',
      text: 'Ask for a simple example, then check it.',
    },
  ],
};

const analogy = {
  file: 'like-a-well-read-clerk',
  layout: 'analogy',
  title: 'An AI model is like a clerk who read the whole library',
  highlight: 'read the whole library',
  left: { heading: 'The clerk', icon: 'user' },
  right: { heading: 'The AI model', icon: 'chip' },
  pairs: [
    { left: 'Read every book once', right: 'Trained on huge amounts of text' },
    { left: 'Remembers the style', right: 'Keeps patterns, not pages' },
    { left: 'Finishes your sentence', right: 'Predicts the next word' },
    { left: 'Sometimes bluffs', right: 'Can sound sure and be wrong' },
  ],
  note: 'Fluent is not the same as correct. Check anything that matters.',
};

export const FIXTURES = [
  cover,
  steps,
  compare,
  cycle,
  layers,
  bars,
  cards,
  analogy,
];

export const EXAMPLE = {
  slug: 'how-ai-writes',
  theme: 'daylight',
  images: [cover, steps, compare, bars, analogy],
};

const text110 =
  'This text is as long as the rules allow, so the box has to grow and the letters must stay easy to read on it.';
const text96 =
  'This text is nearly as long as the rules allow, so every box has to grow to keep it easy to read';
const text84 =
  'A step with a fairly long text of about fourteen words, which is the advised maximum';
const label34 = 'A label with many letters and gaps';
const title70 =
  'This is the longest title that the rules allow, all seventy characters';
const note140 =
  'A closing note that uses every character it can, so we can see how the box behaves when a writer fills it to the very last letter allowed ok';
const iconCycle = [
  'server',
  'database',
  'shield',
  'calculator',
  'globe',
  'gear',
];
const longItems = (count, text = text110) =>
  Array.from({ length: count }, (_, i) => ({
    icon: iconCycle[i],
    label: label34,
    text,
  }));
const plain = (items) => items.map(({ label, text }) => ({ label, text }));

/** The hardest cases the limits allow. */
export const STRESS = [
  {
    file: 'cover',
    layout: 'cover',
    kicker: 'Working with AI at the office',
    title: title70,
    subtitle: text110,
    icons: ['warning', 'shield'],
  },
  {
    file: 'long-steps',
    layout: 'steps',
    title: title70,
    items: longItems(6, text84),
  },
  { file: 'long-cards', layout: 'cards', title: title70, items: longItems(6) },
  {
    file: 'long-cycle',
    layout: 'cycle',
    title: title70,
    center: label34,
    items: plain(longItems(4)),
  },
  {
    file: 'full-cycle',
    layout: 'cycle',
    title: 'A loop with five stations and a normal amount of text in each',
    center: 'Round and round',
    items: plain(
      longItems(5, 'A normal text for a loop with five cards in it.'),
    ),
  },
  {
    file: 'long-layers',
    layout: 'layers',
    title: title70,
    items: plain(longItems(5)),
  },
  {
    file: 'long-compare',
    layout: 'compare',
    title: title70,
    columns: [0, 1].map((side) => ({
      heading: label34,
      icon: iconCycle[side],
      items: Array(3).fill(text96),
    })),
    verdict: note140,
  },
  {
    file: 'long-bars',
    layout: 'bars',
    title: title70,
    items: Array.from({ length: 6 }, (_, i) => ({
      label: label34,
      value: i * i,
      display: `${i * i * 1000} tokens`,
    })),
    note: note140,
    source: text110,
  },
  {
    file: 'long-analogy',
    layout: 'analogy',
    title: title70,
    left: { heading: label34, icon: 'mail' },
    right: { heading: label34, icon: 'cloud' },
    pairs: Array(3).fill({ left: text110, right: text110 }),
    note: note140,
  },
];

const short = (count) =>
  ['Ask', 'Check', 'Save', 'Share', 'Learn', 'Rest']
    .slice(0, count)
    .map((label, i) => ({ icon: iconCycle[i], label, text: 'Keep it short.' }));

/** Short texts and other item counts. */
export const SPARSE = [
  {
    file: 'cover',
    layout: 'cover',
    kicker: 'AI',
    title: 'What is AI?',
    subtitle: 'A short answer.',
    icons: ['brain', 'lightbulb', 'target'],
  },
  {
    file: 'short-steps',
    layout: 'steps',
    title: 'Three steps',
    items: short(3),
  },
  {
    file: 'three-cards',
    layout: 'cards',
    title: 'Three habits that help',
    items: short(3),
  },
  {
    file: 'six-cards',
    layout: 'cards',
    title: 'Six habits that help',
    items: short(6),
  },
  {
    file: 'five-cards',
    layout: 'cards',
    title: 'Five habits that help',
    items: short(5),
  },
  {
    file: 'three-cycle',
    layout: 'cycle',
    title: 'Ask, check, save',
    center: 'Every day',
    items: plain(short(3)),
  },
  {
    file: 'five-cycle',
    layout: 'cycle',
    title: 'Good habits go round',
    center: 'Every week',
    items: plain(short(5)),
  },
  {
    file: 'six-layers',
    layout: 'layers',
    title: 'Six layers',
    items: plain(short(6)),
  },
  {
    file: 'three-layers',
    layout: 'layers',
    title: 'Three layers',
    items: plain(short(3)),
  },
  {
    file: 'two-bars',
    layout: 'bars',
    title: 'Two numbers',
    items: [
      { label: 'Small', value: 1, display: '1%' },
      { label: 'Big', value: 99, display: '99%' },
    ],
    source: 'Made up.',
  },
  {
    file: 'uneven-compare',
    layout: 'compare',
    title: 'Two against four',
    columns: [
      { heading: 'Paid', icon: 'cart', items: ['Fast', 'Private'] },
      {
        heading: 'Free',
        icon: 'check',
        items: ['Free', 'Slower', 'Shared', 'Limited'],
      },
    ],
  },
  {
    file: 'short-analogy',
    layout: 'analogy',
    title: 'Like a recipe',
    left: { heading: 'Recipe', icon: 'book' },
    right: { heading: 'Prompt', icon: 'chat' },
    pairs: [
      { left: 'Ingredients', right: 'Facts' },
      { left: 'Method', right: 'Instructions' },
      { left: 'Dish', right: 'Answer' },
    ],
  },
];

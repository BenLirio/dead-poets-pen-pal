// Dead Poets' Pen Pal — AI-driven personalization: name -> follow-ups -> letter.
// The AI uses its own knowledge of the given name (common associations, famous bearers,
// linguistic/cultural roots) to generate personalized follow-up questions and a letter
// in the voice of a historical correspondent. Deterministic fallbacks on every AI call.

const AI_ENDPOINT = 'https://uy3l6suz07.execute-api.us-east-1.amazonaws.com/ai';
const MODEL = 'gpt-5.4-mini';
const SLUG = 'dead-poets-pen-pal';

// ------- hashing / seeded determinism -------
function hash(str) {
  let h = 0;
  for (let i = 0; i < str.length; i++) h = (Math.imul(31, h) + str.charCodeAt(i)) | 0;
  return Math.abs(h);
}

// ------- archetypes: historical letter-writers (voices the letter can be drafted in) -------
const ARCHETYPES = [
  {
    key: 'keats',
    name: 'John Keats',
    era: 'London, autumn 1819',
    tagline: 'A consumptive romantic with a pocket full of odes — he writes the way a nightingale sings: late, and too well.',
    voice: 'tender, lyrical English Romantic, fond of Fanny Brawne, aware of his own mortality, uses phrases like "fine phrases" and "negative capability", writes in nervous beauty',
    signoff: 'Yours — ever, in the brief light,\nJohn Keats',
  },
  {
    key: 'woolf',
    name: 'Virginia Woolf',
    era: 'Bloomsbury, a Tuesday between the wars',
    tagline: 'She watches a room and makes you realize it has been watching you back.',
    voice: 'Virginia Woolf — interior, perceptive, long sentences braided with small observations, slightly amused, slightly drowning, references tides, rooms, small dinners',
    signoff: 'Ever yours,\nVirginia',
  },
  {
    key: 'wilde',
    name: 'Oscar Wilde',
    era: 'a rented hotel room, Paris, well past midnight',
    tagline: 'He would rather be misquoted than misunderstood. He is, usually, both.',
    voice: 'Oscar Wilde — flamboyant, epigrammatic, witty paradoxes, theatrical sorrow, velvet-coated self-pity with a wink, speaks of beauty and debt in the same breath',
    signoff: 'Entirely and theatrically yours,\nOscar',
  },
  {
    key: 'pony',
    name: 'A Pony Express Rider',
    era: 'a way station east of Carson City, 1861',
    tagline: 'Forty miles behind them, eighty ahead, and a letter under the saddle that belongs to a stranger.',
    voice: 'a 19-year-old Pony Express rider — plainspoken Western American vernacular, dusty, practical, brief sentences, references horses, weather, the trail, spare with feeling but honest when it lands',
    signoff: 'Riding on,\nCal, of the long route',
  },
  {
    key: 'spy',
    name: 'A Cold War Letter Cipher',
    era: 'a safehouse in East Berlin, winter 1962',
    tagline: 'Every word is a decoy; the one you are meant to keep is already underlined.',
    voice: 'a Cold War intelligence agent — careful, coded, double-meaning sentences, references the weather in a suspiciously specific way, speaks of "our mutual friend", warm under the paranoia',
    signoff: 'Burn this after reading.\n— K.',
  },
  {
    key: 'alchemist',
    name: 'A Renaissance Alchemist',
    era: 'a Prague laboratory, 1587',
    tagline: 'Half of their letters are to patrons. The other half, to God. You got neither.',
    voice: 'a Renaissance alchemist — archaic spellings avoided but cadence preserved, reverent toward small miracles, references mercury, salt, the four humours, candlelight, the soul as a solvent',
    signoff: 'Ad lucem et per ignem,\nBrother Jánoš',
  },
  {
    key: 'ww1nurse',
    name: 'A Field Hospital Nurse, Somme, 1916',
    tagline: 'She writes with the bed-lamp shaded. Morphine next door, Mozart in her head.',
    era: 'a tent ward behind the Somme, 1916',
    voice: 'a WWI Red Cross nurse — quiet, composed British prose, pragmatic, uses "dear heart", references the ward, the boys, the blackout, tea that has gone cold three times, carries enormous tenderness without announcing it',
    signoff: 'With all my heart, kept quietly,\nElsie',
  },
  {
    key: 'dickinson',
    name: 'Emily Dickinson',
    era: 'the upstairs room on Main Street, Amherst',
    tagline: 'She sent her letters on slips of paper. She sent her soul on the dashes between them.',
    voice: 'Emily Dickinson — dashes, capitalizations mid-line, tiny images doing enormous work, questions disguised as statements, private, bird-and-bee metaphors, compressed',
    signoff: '— Yours, if such a thing is possible —\nEmily',
  },
  {
    key: 'samurai',
    name: 'An Edo-Period Ronin',
    era: 'a teahouse on the road to Kyoto, 1682',
    tagline: 'Masterless, but not without a sense of correspondence.',
    voice: 'an Edo-period masterless samurai — austere, seasonal references (plum blossom, first frost), restrained poetic cadence, short declaratives, honor and loneliness threaded together, writes with a brush',
    signoff: 'In the passing season,\nTakeo',
  },
  {
    key: 'explorer',
    name: 'A Polar Expedition Diarist',
    era: 'a tent on the Ross Ice Shelf, 1912',
    tagline: 'They wrote letters they were not sure would arrive, to people they were not sure would read them.',
    voice: 'an Edwardian polar explorer — British reserve, dry humor about frostbite, references the primus stove, the dogs, the unreasonable wind, love expressed by what is NOT said, the horizon used as punctuation',
    signoff: 'For the last post out,\nH.',
  },
  {
    key: 'rilke',
    name: 'Rainer Maria Rilke',
    era: 'a rented room in Duino, early 1912',
    tagline: 'He will tell you that you are a question the world has not finished asking.',
    voice: 'Rilke — reverent, philosophical, gentle, sentences that circle before landing, references angels, windows, slow growth, addresses the reader as "mein Freund" / my friend, turns the mundane into sacrament',
    signoff: 'In quiet continuance,\nRainer',
  },
  {
    key: 'lighthouse',
    name: 'A Lighthouse Keeper',
    era: 'Inishtrahull, autumn 1898',
    tagline: 'Four miles of sea between them and any reply. They write anyway.',
    voice: 'a late-Victorian lighthouse keeper — steady, sea-weathered, measured, references gulls, tides, the lamp-oil, loneliness treated as a job rather than a tragedy, offhand poetry',
    signoff: 'By the steady light,\nMr. Connell',
  },
];

const ARCHETYPE_KEYS = ARCHETYPES.map(a => a.key);
const ARCHETYPE_BY_KEY = Object.fromEntries(ARCHETYPES.map(a => [a.key, a]));

function pickArchetypeByKey(key, fallbackSeed) {
  if (key && ARCHETYPE_BY_KEY[key]) return ARCHETYPE_BY_KEY[key];
  return ARCHETYPES[(fallbackSeed || 0) % ARCHETYPES.length];
}

// ------- deterministic fallback follow-up questions (if AI fails on stage 1) -------
const FALLBACK_FOLLOWUPS = [
  'What is a room you have loved and left?',
  'What did you secretly want that you are almost willing to admit now?',
  'Who are you writing to, really, when no one is watching?',
];

const FALLBACK_PREAMBLE = 'The archive cannot find your exact file — but the shelf it would have been on is warm. A few intimate queries, and we will do the rest.';

// ------- deterministic fallback letter -------
const FALLBACK_LETTER =
  `My dear friend,\n\n` +
  `I write to you in that unkind hour when the candle has burned low and the world has gone quiet enough to be overheard. What you have told me arrived like weather — unarguable, and quietly rearranging the furniture of the room.\n\n` +
  `Do not mistake your missing for a verdict. It is only the ordinary proof that you loved the thing properly. Hold it the way one holds a candle in a draft: it will flicker; it will not go out.\n\n` +
  `Write again when the tide is right. I will be here, pretending to read.`;

// ------- URL-fragment sharing -------
// v2 payload: { v:2, n: full_name, qs: [strings], as: [strings], k: archetype_key, sal: string, ltr: string }
function encodeState(payload) {
  const json = JSON.stringify(payload);
  const b64 = btoa(unescape(encodeURIComponent(json)))
    .replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
  return b64;
}

function decodeState(frag) {
  try {
    let b64 = frag.replace(/-/g, '+').replace(/_/g, '/');
    while (b64.length % 4) b64 += '=';
    const json = decodeURIComponent(escape(atob(b64)));
    const obj = JSON.parse(json);
    if (!obj || typeof obj !== 'object') return null;
    if (obj.v !== 2) return null;
    if (typeof obj.n !== 'string') return null;
    if (!Array.isArray(obj.qs) || !Array.isArray(obj.as)) return null;
    if (typeof obj.ltr !== 'string') return null;
    return obj;
  } catch (_) { return null; }
}

// ------- state -------
const state = {
  name: '',
  questions: [],   // 3 strings (from AI or fallback)
  answers: [],     // parallel array of user responses
  archetypeKey: '',
  salutation: '',
  letter: '',
};

// ------- DOM -------
const el = {
  intro: document.getElementById('intro'),
  begin: document.getElementById('begin'),
  nameScreen: document.getElementById('name-screen'),
  nameInput: document.getElementById('name-input'),
  registerName: document.getElementById('register-name'),
  nameError: document.getElementById('name-error'),
  followups: document.getElementById('followups'),
  fuPreamble: document.getElementById('fu-preamble'),
  fuList: document.getElementById('fu-list'),
  sealEnvelope: document.getElementById('seal-envelope'),
  fuError: document.getElementById('fu-error'),
  loading: document.getElementById('loading'),
  loadingMsg: document.getElementById('loading-msg'),
  result: document.getElementById('result'),
  writerName: document.getElementById('writer-name'),
  writerLine: document.getElementById('writer-line'),
  letterSalutation: document.getElementById('letter-salutation'),
  letterBody: document.getElementById('letter-body'),
  letterSignature: document.getElementById('letter-signature'),
  share: document.getElementById('share'),
  restart: document.getElementById('restart'),
};

// ------- rendering -------
function showScreen(name) {
  const screens = ['intro', 'nameScreen', 'followups', 'loading', 'result'];
  screens.forEach(s => {
    const node = el[s];
    if (!node) return;
    if (s === name) {
      node.hidden = false;
      node.classList.remove('fade-enter');
      void node.offsetWidth;
      node.classList.add('fade-enter');
    } else {
      node.hidden = true;
    }
  });
}

function escapeHtml(s) {
  return String(s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function renderFollowups(preamble, questions) {
  el.fuPreamble.textContent = preamble || '';
  el.fuList.innerHTML = '';
  questions.forEach((q, i) => {
    const item = document.createElement('div');
    item.className = 'fu-item';

    const label = document.createElement('label');
    label.className = 'fu-question';
    label.setAttribute('for', 'fu-' + i);
    label.innerHTML = `<span class="q-num">${i + 1}.</span>${escapeHtml(q)}`;

    const input = document.createElement('textarea');
    input.className = 'fu-input';
    input.id = 'fu-' + i;
    input.rows = 2;
    input.maxLength = 280;
    input.placeholder = 'a line, or two, or as much as you can stand…';
    input.dataset.idx = String(i);

    item.appendChild(label);
    item.appendChild(input);
    el.fuList.appendChild(item);
  });
}

// ------- loading messages -------
const LOADING_MESSAGES = [
  'Dipping the nib in iron-gall ink…',
  'Searching the archive by candlelight…',
  'Finding someone in history who understands…',
  'Crossing out the first draft, gently…',
  'Pressing the wax seal while it\'s still warm…',
  'Folding the page along the same old crease…',
  'Listening for your name in the margins…',
];
const ARCHIVE_MESSAGES = [
  'Rifling the registry for your name…',
  'Consulting the index of forgotten correspondents…',
  'Lighting a second candle — the archive is dusty…',
];

function pickLoadingMessage(seed, from) {
  const pool = from || LOADING_MESSAGES;
  return pool[hash(String(seed || '')) % pool.length];
}

// ------- AI call: stage 1 — follow-up questions informed by the name -------
async function generateFollowups(fullName) {
  const systemPrompt = [
    `You are the intake archivist for a curated 19th/early-20th-century letter-correspondence service called "Dead Poets' Pen Pal".`,
    `The user has just given you a full name. Using whatever you know about that name — its cultural/linguistic roots, famous bearers across history, common associations, the kind of person who tends to carry it — draft three short, intimate follow-up questions that would personalize a handwritten letter addressed to this specific person.`,
    `The questions should feel warmly specific to the name (draw on associations) without being generic biographical prompts and without claiming facts about the actual user.`,
    `Also write a one-sentence "preamble" that gently acknowledges the name and invites them to answer.`,
    `Do NOT address the user as a celebrity even if the name matches one. The name is a hook for personalization, not a claim of identity.`,
    `Tone: the app's aesthetic is parchment, iron-gall ink, Victorian correspondence. Questions should sound like a thoughtful stranger across a candlelit desk — not a therapist, not a personality quiz. Short. Sentence-length. No multiple-choice.`,
    `Return strict JSON ONLY, matching exactly this schema:`,
    `{"preamble": string, "questions": [string, string, string]}`,
    `No markdown, no code fences, no explanation — JSON only.`,
  ].join(' ');

  const userPrompt = JSON.stringify({ full_name: fullName });

  try {
    const res = await fetch(AI_ENDPOINT, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        slug: SLUG,
        model: MODEL,
        temperature: 0.8,
        max_tokens: 400,
        response_format: 'json_object',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user',   content: userPrompt },
        ],
      }),
    });
    if (!res.ok) throw new Error('http_' + res.status);
    const data = await res.json();
    const raw = (data && typeof data.content === 'string') ? data.content.trim() : '';
    if (!raw) throw new Error('empty');

    // Strip accidental code fences if model wraps them.
    const cleaned = raw.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/, '');
    const parsed = JSON.parse(cleaned);

    if (!parsed || typeof parsed !== 'object') throw new Error('bad_obj');
    const questions = Array.isArray(parsed.questions) ? parsed.questions.map(q => String(q).trim()).filter(Boolean) : [];
    if (questions.length < 3) throw new Error('too_few_questions');
    const preamble = typeof parsed.preamble === 'string' ? parsed.preamble.trim() : '';

    return {
      preamble: preamble || FALLBACK_PREAMBLE,
      questions: questions.slice(0, 3),
    };
  } catch (_) {
    return { preamble: FALLBACK_PREAMBLE, questions: FALLBACK_FOLLOWUPS.slice() };
  }
}

// ------- AI call: stage 2 — letter itself (with archetype pick) -------
async function generateLetter(fullName, questions, answers) {
  const qa = questions.map((q, i) => ({ q, a: String(answers[i] || '').slice(0, 400) }));

  const allowed = ARCHETYPES.map(a => `- ${a.key}: ${a.name} — ${a.voice}`).join('\n');

  const systemPrompt = [
    `You are the scrivener for "Dead Poets' Pen Pal". You draft short, handwritten-style letters.`,
    `Task: given the recipient's full name and their answers to three intimate queries, (1) pick the ONE historical letter-writer archetype below whose voice best fits them, then (2) compose a personalized letter in that archetype's voice.`,
    `The letter MUST feel written TO this specific person: open with a handwritten-style salutation that uses their first name (e.g. "Dear Eleanor —" or "My dear Eleanor,"). Weave in at least two specific details from their answers by image or phrasing — not quoting verbatim. You may gently draw on warm, common associations of the name (linguistic roots, era, feel) without claiming facts about the actual user.`,
    `Length: 3 short paragraphs in the letter body (NOT counting the salutation). 100 to 160 words total in the body. No lists, no headings, no hashtags, no emojis.`,
    `Do NOT include a sign-off or signature in the body (it will be appended separately).`,
    `Stay in period-appropriate diction for the archetype. No modern slang. No references to AI, apps, websites, or the questionnaire.`,
    `Allowed archetype keys (pick EXACTLY one, exact key spelling):`,
    allowed,
    `Return strict JSON ONLY, schema:`,
    `{"archetype_key": string, "salutation": string, "letter": string}`,
    `"salutation" is just the opening line (e.g. "Dear Eleanor —"). "letter" is the 3 paragraphs of body text, separated by blank lines. No markdown. No code fences. JSON only.`,
  ].join('\n');

  const userPrompt = JSON.stringify({ full_name: fullName, follow_ups: qa });

  try {
    const res = await fetch(AI_ENDPOINT, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        slug: SLUG,
        model: MODEL,
        temperature: 0.85,
        max_tokens: 600,
        response_format: 'json_object',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user',   content: userPrompt },
        ],
      }),
    });
    if (!res.ok) throw new Error('http_' + res.status);
    const data = await res.json();
    const raw = (data && typeof data.content === 'string') ? data.content.trim() : '';
    if (!raw) throw new Error('empty');

    const cleaned = raw.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/, '');
    const parsed = JSON.parse(cleaned);

    if (!parsed || typeof parsed !== 'object') throw new Error('bad_obj');
    const key = ARCHETYPE_KEYS.indexOf(parsed.archetype_key) >= 0
      ? parsed.archetype_key
      : ARCHETYPE_KEYS[hash(fullName) % ARCHETYPE_KEYS.length];
    const salutation = (typeof parsed.salutation === 'string' && parsed.salutation.trim())
      ? parsed.salutation.trim()
      : defaultSalutation(fullName);
    const letter = typeof parsed.letter === 'string' ? parsed.letter.trim() : '';
    if (!letter) throw new Error('empty_letter');

    return { archetypeKey: key, salutation, letter };
  } catch (_) {
    return {
      archetypeKey: ARCHETYPE_KEYS[hash(fullName) % ARCHETYPE_KEYS.length],
      salutation: defaultSalutation(fullName),
      letter: FALLBACK_LETTER,
    };
  }
}

function defaultSalutation(fullName) {
  const first = String(fullName || '').trim().split(/\s+/)[0] || 'friend';
  return `Dear ${first} —`;
}

// ------- result flow -------
async function runFollowupStage() {
  el.loadingMsg.textContent = pickLoadingMessage(state.name, ARCHIVE_MESSAGES);
  showScreen('loading');

  const minLoad = new Promise(r => setTimeout(r, 900));
  const fuP = generateFollowups(state.name);
  const [_, { preamble, questions }] = await Promise.all([minLoad, fuP]);

  state.questions = questions;
  state.answers = new Array(questions.length).fill('');

  renderFollowups(preamble, questions);
  showScreen('followups');
}

async function runLetterStage() {
  el.loadingMsg.textContent = pickLoadingMessage(state.name + '|' + state.answers.join('|'));
  showScreen('loading');

  const minLoad = new Promise(r => setTimeout(r, 900));
  const letterP = generateLetter(state.name, state.questions, state.answers);
  const [_, out] = await Promise.all([minLoad, letterP]);

  state.archetypeKey = out.archetypeKey;
  state.salutation = out.salutation;
  state.letter = out.letter;

  renderResult();
  updateShareUrl();
}

function renderResult() {
  const archetype = pickArchetypeByKey(state.archetypeKey, hash(state.name));

  el.writerName.textContent = archetype.name;
  el.writerLine.textContent = archetype.tagline + ' — ' + archetype.era + '.';

  el.letterSalutation.textContent = state.salutation || defaultSalutation(state.name);

  el.letterBody.innerHTML = '';
  const paragraphs = (state.letter || '').split(/\n\s*\n/).map(p => p.trim()).filter(Boolean);
  (paragraphs.length ? paragraphs : [state.letter || '']).forEach(p => {
    const node = document.createElement('p');
    node.textContent = p;
    el.letterBody.appendChild(node);
  });
  el.letterSignature.textContent = archetype.signoff;

  el.share.style.display = 'block';
  showScreen('result');
}

function updateShareUrl() {
  try {
    const payload = {
      v: 2,
      n: state.name,
      qs: state.questions,
      as: state.answers,
      k: state.archetypeKey,
      sal: state.salutation,
      ltr: state.letter,
    };
    const frag = encodeState(payload);
    history.replaceState(null, '', '#l=' + frag);
  } catch (_) {}
}

// ------- share -------
function share() {
  if (navigator.share) {
    navigator.share({ title: document.title, url: location.href });
  } else {
    navigator.clipboard.writeText(location.href)
      .then(() => alert('Link copied!'));
  }
}

// ------- restart -------
function restart() {
  state.name = '';
  state.questions = [];
  state.answers = [];
  state.archetypeKey = '';
  state.salutation = '';
  state.letter = '';
  if (el.nameInput) el.nameInput.value = '';
  if (el.nameError) el.nameError.hidden = true;
  if (el.fuError) el.fuError.hidden = true;
  history.replaceState(null, '', location.pathname + location.search);
  showScreen('intro');
}

// ------- bootstrap -------
document.addEventListener('DOMContentLoaded', () => {
  // Restore from URL fragment, if present (full v2 payload).
  const frag = location.hash.startsWith('#l=') ? location.hash.slice(3) : '';
  const restored = frag ? decodeState(frag) : null;

  el.begin.addEventListener('click', () => {
    restart();
    showScreen('nameScreen');
    setTimeout(() => el.nameInput && el.nameInput.focus(), 40);
  });

  el.registerName.addEventListener('click', async () => {
    const val = (el.nameInput.value || '').trim();
    if (val.length < 2) {
      el.nameError.hidden = false;
      el.nameError.textContent = 'a full name, please — even a first will do.';
      el.nameInput.focus();
      return;
    }
    el.nameError.hidden = true;
    state.name = val;
    await runFollowupStage();
  });

  el.nameInput.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      el.registerName.click();
    }
  });

  el.sealEnvelope.addEventListener('click', async () => {
    // Collect answers
    const inputs = el.fuList.querySelectorAll('.fu-input');
    const answers = Array.from(inputs).map(n => (n.value || '').trim());
    const filled = answers.filter(a => a.length >= 2).length;
    if (filled < Math.max(1, Math.ceil(state.questions.length / 2))) {
      el.fuError.hidden = false;
      el.fuError.textContent = 'a line or two on at least half the queries, if you would — the letter needs somewhere to land.';
      return;
    }
    el.fuError.hidden = true;
    state.answers = answers;
    await runLetterStage();
  });

  if (el.restart) el.restart.addEventListener('click', restart);

  if (restored) {
    state.name = restored.n || '';
    state.questions = Array.isArray(restored.qs) ? restored.qs : [];
    state.answers = Array.isArray(restored.as) ? restored.as : [];
    state.archetypeKey = restored.k || '';
    state.salutation = restored.sal || defaultSalutation(state.name);
    state.letter = restored.ltr || '';
    renderResult();
  } else {
    showScreen('intro');
  }
});

// expose share for inline onclick
window.share = share;

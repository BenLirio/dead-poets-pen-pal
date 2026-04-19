// Dead Poets' Pen Pal — deterministic archetype pick + AI-generated personalized letter

const AI_ENDPOINT = 'https://uy3l6suz07.execute-api.us-east-1.amazonaws.com/ai';
const SLUG = 'dead-poets-pen-pal';

// ------- hashing / seeded determinism -------
function hash(str) {
  let h = 0;
  for (let i = 0; i < str.length; i++) h = (Math.imul(31, h) + str.charCodeAt(i)) | 0;
  return Math.abs(h);
}

// ------- the eight mood/life questions -------
// Each question has 4 options. Choice index (0..3) is stored per question.
const QUESTIONS = [
  {
    q: 'A letter, in your hand, would most likely begin:',
    options: [
      'My dearest,',
      'Comrade —',
      'To the stranger who will read this,',
      'Darling idiot,',
    ],
  },
  {
    q: 'Pick a room to write from:',
    options: [
      'a garret with a candle and a cracked window',
      'a rented chamber above a noisy street',
      'a parlor lit by oil lamps and bad news',
      'a wooden bunk, somewhere on the move',
    ],
  },
  {
    q: 'Your weather, lately:',
    options: [
      'a long, low autumn with bruised light',
      'the kind of winter that hides behind laughter',
      'one clear hour between two storms',
      'summer, but the wrong summer',
    ],
  },
  {
    q: 'Your great private suspicion:',
    options: [
      'that I am, in fact, brilliant and nobody knows',
      'that I have been fooling everyone, including myself',
      'that I will be understood, but only after I am gone',
      'that love is a kind of espionage',
    ],
  },
  {
    q: 'Choose a vice:',
    options: [
      'too much tea and too much hope',
      'absinthe, wit, and late returns home',
      'coded notes and second bottles of wine',
      'pacing — always pacing',
    ],
  },
  {
    q: 'Your relationship to the past:',
    options: [
      'I write to it almost nightly',
      'I refuse it, grandly, in a velvet coat',
      'I decoded it too late',
      'I am still riding away from it',
    ],
  },
  {
    q: 'What the dawn feels like, to you:',
    options: [
      'a promise made by someone who will not keep it',
      'the start of a performance',
      'a checkpoint I have survived',
      'another stage to the next town',
    ],
  },
  {
    q: 'If a friend opened your letter aloud, they would say:',
    options: [
      '"oh — they are in love with a ghost again"',
      '"only they could make heartbreak sound expensive"',
      '"read this one when the house is empty"',
      '"they signed off in a hurry — as always"',
    ],
  },
];

// ------- archetypes: historical letter-writers -------
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

// ------- deterministic archetype pick from the 8 choice indexes -------
// Uses hash over the chip selections (stringified) modulo archetype count.
function pickArchetype(choices) {
  const seed = hash(choices.join('-'));
  return ARCHETYPES[seed % ARCHETYPES.length];
}

// ------- deterministic fallback letter, per archetype -------
const FALLBACKS = {
  keats: `My dear friend,\n\nI write to you in that unkind hour when the candle has burned low and the world has gone quiet enough to be overheard. I have been thinking on what you said — that you miss the things you cannot name, and that is the very subject of every poem I have failed to finish.\n\nDo not mistake your melancholy for a verdict. It is a weather, and weather passes.\n\nIf the nightingale sings, listen. If it does not, you will still be kinder than most for having wanted to hear it.`,
  woolf: `Dear you,\n\nThere are afternoons — one of them was today — when a single sentence of yours arrives like a gust through the dining-room window, and rearranges all the smaller things I had set out so carefully. I am not sure whether to thank you or to close the sash.\n\nYou miss what you miss. I find the missing is often the most honest part of a person; the rest is arrangement.\n\nWrite again when the tide is right. I will be here, pretending to read.`,
  wilde: `My dear, dear thing,\n\nYou have written to me in the small hours, which is the only time anyone of any consequence writes at all. I have read your letter twice and held it against the lamp for a third reading, which revealed nothing but my own handwriting answering yours.\n\nTo miss something is merely to love it out loud, without permission. You have my permission. You did not need it.\n\nBe extravagant. It is the only economy left.`,
  pony: `Friend,\n\nGot your note passed down at the relay. Read it while the new mare ate. Short on time — storm's coming up from the south and I've got forty to go.\n\nWhat you miss sounded a lot like what I miss, only you said it better. Hold the reins looser than you think. That's how you keep going.\n\nPost won't wait. Neither will I. Riding on.`,
  spy: `Dear correspondent,\n\nThe weather here is, as always, colder than reported. Our mutual friend sends his regards, though I suspect he sends them to everyone. Please disregard the third paragraph of your last letter — or rather, please read only the third paragraph.\n\nWhat you miss, you have correctly identified. That is rarer than you think. Most people miss the wrong thing, loudly.\n\nBurn this after reading. Or don't. I trust you.`,
  alchemist: `To the seeker,\n\nI have read your letter beside the furnace, which is the only honest light in this house. There is, in every soul, a vessel that cracks under too much heat and another that only speaks under it. You, I think, are the latter.\n\nWhat you miss is not lost. It is merely in solution. The work is patience.\n\nBe of good courage. The lead of this hour has already begun to change.`,
  ww1nurse: `Dear heart,\n\nThe blackout's drawn, the ward's finally quiet, and I'm writing on the back of a requisition form because that is what we have. Don't apologize for what you said — it arrived at exactly the right moment, which is more than most sentences manage.\n\nWhat you miss, keep missing. It is proof you loved it properly.\n\nGet some rest. That is a medical order, issued without authority.`,
  dickinson: `Dear friend —\n\nA Letter — is a kind of Bird — that flies on borrowed Weather — and yours — has landed — here — at the upstairs window —\n\nYou miss what you miss — and I have found — that what is missed — is merely — Waiting — in another Room —\n\nDo not go down — for the voices — Stay — and write to me — again —`,
  samurai: `To the one who wrote:\n\nThe plum blossom in the courtyard has fallen. Your letter came the same morning; I read it twice, slowly, with tea gone cold.\n\nWhat you miss is a companion one does not dismiss. Walk with it. It will tire before you do.\n\nThe road continues. I continue on it.`,
  explorer: `Dear old thing,\n\nWriting this with three fingers that still work, two that are taking the winter off. The dogs are quieter than they should be. The wind is doing what the wind does.\n\nYou said what you miss, and I have underlined it in my head. It is a reasonable thing to miss. I miss similar.\n\nIf this letter arrives — splendid. If not, you already know what it said.`,
  rilke: `Mein Freund,\n\nYour letter came in the early hour when the window is still undecided between night and morning, and I read it as one reads a question put gently. Do not hurry the answer in yourself. Some things in us take a long season to ripen, and they are ruined by early harvest.\n\nWhat you miss — hold it the way one holds a candle in a draft. It will flicker; it will not go out.\n\nLive the question. The answer, when it comes, will find you already changed.`,
  lighthouse: `Friend,\n\nThe lamp is lit, the sea's the usual sea, the gulls are behaving — which is to say, badly. Your letter came out with the supply boat; I've read it twice over supper.\n\nWhat you miss, miss freely. Four miles of water between me and anyone, and I've learned that missing is only love doing its night-shift.\n\nLight holds. So will you.`,
};

// ------- URL-fragment sharing -------
function encodeState(choices, secret) {
  // choices: array of 8 ints 0..3; secret: string (<=180 chars)
  const payload = { c: choices, s: secret || '' };
  const json = JSON.stringify(payload);
  // URL-safe base64
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
    if (!Array.isArray(obj.c) || obj.c.length !== 8) return null;
    if (!obj.c.every(n => Number.isInteger(n) && n >= 0 && n <= 3)) return null;
    if (typeof obj.s !== 'string') return null;
    return obj;
  } catch (_) { return null; }
}

// ------- state -------
const state = {
  qIdx: 0,
  choices: [], // indexes into QUESTIONS[i].options
  secret: '',
};

// ------- DOM -------
const el = {
  intro: document.getElementById('intro'),
  begin: document.getElementById('begin'),
  quiz: document.getElementById('quiz'),
  quizProgress: document.getElementById('quiz-progress'),
  quizQuestion: document.getElementById('quiz-question'),
  quizSecret: document.getElementById('quiz-secret'),
  secretInput: document.getElementById('secret-input'),
  sealEnvelope: document.getElementById('seal-envelope'),
  secretError: document.getElementById('secret-error'),
  loading: document.getElementById('loading'),
  loadingMsg: document.getElementById('loading-msg'),
  result: document.getElementById('result'),
  writerName: document.getElementById('writer-name'),
  writerLine: document.getElementById('writer-line'),
  letterBody: document.getElementById('letter-body'),
  letterSignature: document.getElementById('letter-signature'),
  share: document.getElementById('share'),
  restart: document.getElementById('restart'),
};

// ------- rendering -------
function showScreen(name) {
  ['intro', 'quiz', 'loading', 'result'].forEach(s => {
    const node = el[s];
    if (!node) return;
    if (s === name) {
      node.hidden = false;
      node.classList.remove('fade-enter');
      // force reflow so animation replays
      void node.offsetWidth;
      node.classList.add('fade-enter');
    } else {
      node.hidden = true;
    }
  });
}

function renderQuestion(i) {
  state.qIdx = i;
  el.quizProgress.textContent = `Question ${i + 1} of 8`;
  const Q = QUESTIONS[i];
  el.quizQuestion.innerHTML = '';
  el.quizSecret.hidden = true;

  const title = document.createElement('h2');
  title.className = 'q-title';
  title.innerHTML = `<span class="q-num">${i + 1}.</span>${escapeHtml(Q.q)}`;
  el.quizQuestion.appendChild(title);

  const chips = document.createElement('div');
  chips.className = 'chips';
  Q.options.forEach((opt, idx) => {
    const b = document.createElement('button');
    b.className = 'chip';
    b.type = 'button';
    b.textContent = opt;
    b.addEventListener('click', () => {
      state.choices[i] = idx;
      if (i < QUESTIONS.length - 1) {
        renderQuestion(i + 1);
        // scroll to top of quiz region
        el.quiz.scrollIntoView({ behavior: 'smooth', block: 'start' });
      } else {
        showSecretPrompt();
      }
    });
    chips.appendChild(b);
  });
  el.quizQuestion.appendChild(chips);
}

function showSecretPrompt() {
  el.quizQuestion.innerHTML = '';
  el.quizProgress.textContent = 'One final question';
  el.quizSecret.hidden = false;
  el.secretInput.focus({ preventScroll: false });
}

function escapeHtml(s) {
  return String(s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
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

function pickLoadingMessage(choices) {
  return LOADING_MESSAGES[hash((choices || []).join('-')) % LOADING_MESSAGES.length];
}

// ------- AI call -------
async function generateLetter(archetype, choices, secret) {
  const chipAnswers = choices.map((idx, i) => ({
    q: QUESTIONS[i].q,
    a: QUESTIONS[i].options[idx],
  }));
  const systemPrompt = [
    `You are writing a short, personal, handwritten-style letter in the voice of ${archetype.name}.`,
    `Setting: ${archetype.era}.`,
    `Voice: ${archetype.voice}.`,
    `The letter is addressed directly to the reader (use "you" or "dear friend" or similar, never a real name).`,
    `It must clearly reference at least TWO of the answers below, by image or phrasing — not quoting verbatim. It must also acknowledge what they secretly miss (the final field).`,
    `Length: 3 short paragraphs. 90 to 140 words total. No lists, no headings, no hashtags, no emojis.`,
    `Do NOT include a signature or sign-off (that will be appended separately).`,
    `Do NOT use modern slang. Stay in period-appropriate diction for the persona.`,
    `Output plain text only. No markdown, no quotes around the whole letter.`,
  ].join(' ');

  // user content is compact JSON of their inputs
  const safeSecret = (secret || '').slice(0, 180).replace(/[\r\n]+/g, ' ');
  const userPrompt = JSON.stringify({
    chip_answers: chipAnswers,
    secretly_miss: safeSecret,
  });

  try {
    const res = await fetch(AI_ENDPOINT, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        slug: SLUG,
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user',   content: userPrompt },
        ],
        max_tokens: 320,
      }),
    });
    if (!res.ok) throw new Error('http_' + res.status);
    const data = await res.json();
    const text = (data.content || '').trim();
    if (!text) throw new Error('empty');
    return text;
  } catch (_) {
    return FALLBACKS[archetype.key] || FALLBACKS.keats;
  }
}

// ------- result flow -------
async function reveal() {
  const archetype = pickArchetype(state.choices);
  // loading screen
  el.loadingMsg.textContent = pickLoadingMessage(state.choices);
  showScreen('loading');

  const minLoad = new Promise(r => setTimeout(r, 900));
  const letterP = generateLetter(archetype, state.choices, state.secret);
  const [_, letterText] = await Promise.all([minLoad, letterP]);

  // render
  el.writerName.textContent = archetype.name;
  el.writerLine.textContent = archetype.tagline + ' — ' + archetype.era + '.';

  el.letterBody.innerHTML = '';
  // split on blank lines → paragraphs
  const paragraphs = letterText.split(/\n\s*\n/).map(p => p.trim()).filter(Boolean);
  (paragraphs.length ? paragraphs : [letterText]).forEach(p => {
    const node = document.createElement('p');
    node.textContent = p;
    el.letterBody.appendChild(node);
  });
  el.letterSignature.textContent = archetype.signoff;

  el.share.style.display = 'block';
  showScreen('result');

  // update URL fragment so this letter is shareable
  try {
    const frag = encodeState(state.choices, state.secret);
    history.replaceState(null, '', '#l=' + frag);
  } catch (_) {}
}

// ------- share (required) -------
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
  state.qIdx = 0;
  state.choices = [];
  state.secret = '';
  if (el.secretInput) el.secretInput.value = '';
  if (el.secretError) el.secretError.hidden = true;
  history.replaceState(null, '', location.pathname + location.search);
  showScreen('intro');
}

// ------- bootstrap -------
document.addEventListener('DOMContentLoaded', () => {
  // restore from URL fragment, if present
  const frag = location.hash.startsWith('#l=') ? location.hash.slice(3) : '';
  const restored = frag ? decodeState(frag) : null;

  el.begin.addEventListener('click', () => {
    state.choices = [];
    state.secret = '';
    showScreen('quiz');
    renderQuestion(0);
  });

  el.sealEnvelope.addEventListener('click', () => {
    const val = (el.secretInput.value || '').trim();
    if (val.length < 3) {
      el.secretError.hidden = false;
      el.secretError.textContent = 'hmm — write a line or two, even a small one, so we can find your twin.';
      el.secretInput.focus();
      return;
    }
    el.secretError.hidden = true;
    state.secret = val;
    reveal();
  });

  el.secretInput.addEventListener('keydown', (e) => {
    if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') el.sealEnvelope.click();
  });

  if (el.restart) el.restart.addEventListener('click', restart);

  if (restored) {
    state.choices = restored.c.slice();
    state.secret = restored.s || '';
    // go straight to reveal
    reveal();
  } else {
    showScreen('intro');
  }
});

// expose share for inline onclick
window.share = share;

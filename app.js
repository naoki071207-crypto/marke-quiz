// ===== App State =====
const state = {
  mode: 'list',
  flashcard: {
    list: [],
    index: 0,
  },
  quiz: {
    questions: [],
    currentIndex: 0,
    correctCount: 0,
    wrongCount: 0,
    wrongList: [],
    settings: {},
  },
};

// ===== Utilities =====
const $ = (sel) => document.querySelector(sel);
const $$ = (sel) => document.querySelectorAll(sel);

const shuffle = (arr) => {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
};

const filterByCategory = (cat) =>
  cat === '全て' ? TERMS : TERMS.filter((t) => t.category === cat);

// クイズの選択肢用に、説明の先頭1段落(定義部分)だけを抜き出す
const shortDesc = (desc) => desc.split('\n\n')[0].trim();

// ===== Tab Switching =====
function switchMode(mode) {
  state.mode = mode;
  $$('.tab').forEach((t) => t.classList.toggle('active', t.dataset.mode === mode));
  $$('.view').forEach((v) => v.classList.toggle('active', v.id === `view-${mode}`));
}

$$('.tab').forEach((tab) => {
  tab.addEventListener('click', () => switchMode(tab.dataset.mode));
});

// ===== Populate category selects =====
function populateCategorySelects() {
  const selects = ['#category-filter', '#flashcard-category', '#quiz-category'];
  selects.forEach((sel) => {
    const el = $(sel);
    el.innerHTML = CATEGORIES.map((c) => `<option value="${c}">${c}</option>`).join('');
  });
}

// ===== List View =====
function renderList() {
  const query = $('#search-input').value.trim().toLowerCase();
  const cat = $('#category-filter').value;
  let items = filterByCategory(cat);
  if (query) {
    items = items.filter(
      (t) =>
        t.term.toLowerCase().includes(query) ||
        t.full.toLowerCase().includes(query) ||
        t.description.toLowerCase().includes(query)
    );
  }
  $('#list-count').textContent = items.length;
  const grid = $('#term-grid');
  if (items.length === 0) {
    grid.innerHTML = `<p class="empty-state">該当する用語が見つかりませんでした。</p>`;
    return;
  }
  grid.innerHTML = items
    .map(
      (t) => `
    <div class="term-card">
      <div class="term-card-header">
        <div class="term-card-title">${escapeHtml(t.term)}</div>
        <span class="category-tag" data-cat="${escapeHtml(t.category)}">${escapeHtml(t.category)}</span>
      </div>
      <div class="term-card-full">${escapeHtml(t.full)}</div>
      <div class="term-card-desc">${escapeHtml(t.description)}</div>
      <span class="term-card-more">続きを読む</span>
    </div>`
    )
    .join('');
}

// カードをクリックすると全文を展開する
$('#term-grid').addEventListener('click', (e) => {
  const card = e.target.closest('.term-card');
  if (!card) return;
  const expanded = card.classList.toggle('expanded');
  card.querySelector('.term-card-more').textContent = expanded ? '閉じる' : '続きを読む';
});

function escapeHtml(s) {
  return String(s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

$('#search-input').addEventListener('input', renderList);
$('#category-filter').addEventListener('change', renderList);

// ===== Flashcard View =====
function loadFlashcards() {
  const cat = $('#flashcard-category').value;
  state.flashcard.list = filterByCategory(cat);
  state.flashcard.index = 0;
  renderFlashcard();
}

function renderFlashcard() {
  const { list, index } = state.flashcard;
  const total = list.length;
  $('#flashcard-total').textContent = total;
  $('#flashcard-pos').textContent = total === 0 ? 0 : index + 1;
  const card = $('#flashcard');
  card.classList.remove('flipped');

  if (total === 0) {
    $('#fc-term').textContent = '—';
    $('#fc-full').textContent = '該当する用語がありません';
    $('#fc-category').textContent = '';
    return;
  }

  const t = list[index];
  $('#fc-category').textContent = t.category;
  $('#fc-category-back').textContent = t.category;
  $('#fc-category').dataset.cat = t.category;
  $('#fc-category-back').dataset.cat = t.category;
  $('#fc-term').textContent = t.term;
  $('#fc-term-back').textContent = t.term;
  $('#fc-full').textContent = t.full;
  $('#fc-description').textContent = t.description;

  $('#fc-prev').disabled = index === 0;
  $('#fc-next').disabled = index >= total - 1;
}

$('#flashcard').addEventListener('click', () => {
  if (state.flashcard.list.length === 0) return;
  $('#flashcard').classList.toggle('flipped');
});

$('#fc-prev').addEventListener('click', () => {
  if (state.flashcard.index > 0) {
    state.flashcard.index--;
    renderFlashcard();
  }
});

$('#fc-next').addEventListener('click', () => {
  if (state.flashcard.index < state.flashcard.list.length - 1) {
    state.flashcard.index++;
    renderFlashcard();
  }
});

$('#flashcard-shuffle').addEventListener('click', () => {
  state.flashcard.list = shuffle(state.flashcard.list);
  state.flashcard.index = 0;
  renderFlashcard();
});

$('#flashcard-category').addEventListener('change', loadFlashcards);

// Keyboard nav for flashcards
document.addEventListener('keydown', (e) => {
  if (state.mode !== 'flashcard') return;
  if (e.target.tagName === 'INPUT' || e.target.tagName === 'SELECT') return;
  if (e.key === 'ArrowLeft') $('#fc-prev').click();
  else if (e.key === 'ArrowRight') $('#fc-next').click();
  else if (e.key === ' ' || e.key === 'Enter') {
    e.preventDefault();
    $('#flashcard').click();
  }
});

// ===== Quiz View =====
function buildQuestion(term, pool, direction) {
  // direction: 'term-to-desc' = 用語を見せて意味を選ばせる
  //            'desc-to-term' = 意味を見せて用語を選ばせる
  const isTermToDesc = direction === 'term-to-desc';

  // 同カテゴリから混乱しやすい誤答を優先的に選ぶ。足りなければ全体から補う。
  const sameCat = pool.filter((t) => t.id !== term.id && t.category === term.category);
  const others = pool.filter((t) => t.id !== term.id && t.category !== term.category);
  const distractorPool = [...shuffle(sameCat), ...shuffle(others)];
  const distractors = distractorPool.slice(0, 3);

  const choices = shuffle([term, ...distractors]);

  return {
    term,
    direction,
    prompt: isTermToDesc ? '次の用語の意味として正しいものは?' : '次の説明に当てはまる用語は?',
    questionText: isTermToDesc ? `${term.term}（${term.full}）` : shortDesc(term.description),
    choices: choices.map((c) => ({
      id: c.id,
      label: isTermToDesc ? shortDesc(c.description) : `${c.term} — ${c.full}`,
      isCorrect: c.id === term.id,
    })),
    correctAnswer: isTermToDesc ? shortDesc(term.description) : `${term.term} — ${term.full}`,
    explanation: `【${term.term}】（${term.full}）\n\n${term.description}`,
  };
}

function startQuiz() {
  const cat = $('#quiz-category').value;
  const count = parseInt($('#quiz-count').value, 10);
  const direction = $('#quiz-direction').value;
  const pool = filterByCategory(cat);

  if (pool.length < 4) {
    alert('このカテゴリは選択肢が少なすぎます（4問以上必要）。別のカテゴリを選んでください。');
    return;
  }

  const targetCount = count === 0 ? pool.length : Math.min(count, pool.length);
  const picked = shuffle(pool).slice(0, targetCount);

  state.quiz.questions = picked.map((term) => {
    const dir = direction === 'mixed'
      ? (Math.random() < 0.5 ? 'term-to-desc' : 'desc-to-term')
      : direction;
    return buildQuestion(term, pool, dir);
  });

  state.quiz.currentIndex = 0;
  state.quiz.correctCount = 0;
  state.quiz.wrongCount = 0;
  state.quiz.wrongList = [];
  state.quiz.settings = { cat, count, direction };

  $('#quiz-setup').classList.add('hidden');
  $('#quiz-result').classList.add('hidden');
  $('#quiz-play').classList.remove('hidden');

  renderQuestion();
}

function renderQuestion() {
  const { questions, currentIndex } = state.quiz;
  const q = questions[currentIndex];

  $('#quiz-current').textContent = currentIndex + 1;
  $('#quiz-total').textContent = questions.length;
  $('#quiz-correct').textContent = state.quiz.correctCount;
  $('#quiz-wrong').textContent = state.quiz.wrongCount;

  const progress = (currentIndex / questions.length) * 100;
  $('#quiz-progress-fill').style.width = `${progress}%`;

  $('#quiz-cat-tag').textContent = q.term.category;
  $('#quiz-cat-tag').dataset.cat = q.term.category;
  $('#quiz-prompt').textContent = q.prompt;
  $('#quiz-question-text').textContent = q.questionText;

  const letters = ['A', 'B', 'C', 'D'];
  const choicesEl = $('#quiz-choices');
  choicesEl.innerHTML = q.choices
    .map(
      (c, i) => `
    <button class="choice" data-correct="${c.isCorrect}" data-index="${i}">
      <span class="choice-letter">${letters[i]}</span>
      <span class="choice-text">${escapeHtml(c.label)}</span>
    </button>`
    )
    .join('');

  $$('#quiz-choices .choice').forEach((btn) => {
    btn.addEventListener('click', () => handleAnswer(btn, q));
  });

  $('#quiz-feedback').classList.add('hidden');
}

function handleAnswer(btn, q) {
  const isCorrect = btn.dataset.correct === 'true';
  $$('#quiz-choices .choice').forEach((b) => {
    b.disabled = true;
    if (b.dataset.correct === 'true') b.classList.add('correct');
    else if (b === btn && !isCorrect) b.classList.add('wrong');
  });

  if (isCorrect) {
    state.quiz.correctCount++;
    $('#feedback-result').textContent = '正解';
    $('#feedback-result').className = 'feedback-result correct';
  } else {
    state.quiz.wrongCount++;
    state.quiz.wrongList.push(q);
    $('#feedback-result').textContent = '不正解';
    $('#feedback-result').className = 'feedback-result wrong';
  }

  $('#feedback-explanation').textContent = q.explanation;
  $('#quiz-correct').textContent = state.quiz.correctCount;
  $('#quiz-wrong').textContent = state.quiz.wrongCount;
  $('#quiz-feedback').classList.remove('hidden');

  // Final question -> button label changes
  const isLast = state.quiz.currentIndex === state.quiz.questions.length - 1;
  $('#quiz-next').textContent = isLast ? '結果を見る' : '次の問題';
}

function nextQuestion() {
  if (state.quiz.currentIndex < state.quiz.questions.length - 1) {
    state.quiz.currentIndex++;
    renderQuestion();
  } else {
    showResult();
  }
}

function showResult() {
  $('#quiz-play').classList.add('hidden');
  $('#quiz-result').classList.remove('hidden');

  const total = state.quiz.questions.length;
  const correct = state.quiz.correctCount;
  const pct = Math.round((correct / total) * 100);

  $('#result-percent').textContent = pct;
  $('#result-correct').textContent = correct;
  $('#result-total').textContent = total;

  // スコアリング (r=54 → 円周 2πr ≒ 339.29) を 0 から描き起こす
  const CIRCUMFERENCE = 339.29;
  const ring = $('#score-ring');
  ring.style.strokeDashoffset = CIRCUMFERENCE;
  requestAnimationFrame(() => {
    ring.style.strokeDashoffset = CIRCUMFERENCE * (1 - pct / 100);
  });

  let comment = '';
  if (pct === 100) comment = '完璧です。全問正解。';
  else if (pct >= 80) comment = '十分に身についています。';
  else if (pct >= 60) comment = 'まずまず。あと一歩です。';
  else if (pct >= 40) comment = 'カードモードで復習してみましょう。';
  else comment = '一覧モードで基礎から確認してみましょう。';
  $('#result-comment').textContent = comment;

  // 間違えた問題のリスト
  const wrongEl = $('#wrong-answers');
  if (state.quiz.wrongList.length === 0) {
    wrongEl.innerHTML = '';
  } else {
    wrongEl.innerHTML = `
      <div class="wrong-answers-title">間違えた用語 · ${state.quiz.wrongList.length}件</div>
      ${state.quiz.wrongList
        .map(
          (q) => `
        <div class="wrong-item">
          <strong>${escapeHtml(q.term.term)}</strong>
          <span class="wrong-full">${escapeHtml(q.term.full)}</span>
          ${escapeHtml(q.term.description)}
        </div>`
        )
        .join('')}
    `;
  }
}

$('#quiz-start').addEventListener('click', startQuiz);
$('#quiz-next').addEventListener('click', nextQuestion);
$('#quiz-retry').addEventListener('click', startQuiz);
$('#quiz-back-setup').addEventListener('click', () => {
  $('#quiz-result').classList.add('hidden');
  $('#quiz-setup').classList.remove('hidden');
});

// ===== Init =====
function init() {
  populateCategorySelects();
  renderList();
  loadFlashcards();
}

init();

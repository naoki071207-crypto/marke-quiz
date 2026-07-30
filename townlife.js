// ===== タウンライフ個別基準：アプリ切替え + 基準一覧 + OK/NG判定クイズ =====
// 注: $ / $$ / shuffle / escapeHtml は app.js で定義済みのものを再利用する。

// ---------- App switching ----------
const APPS = {
  marke:    { mark: 'M', title: 'マーケ用語',        sub: () => `${TERMS.length} terms · ${CATEGORIES.length - 1} categories` },
  townlife: { mark: 'T', title: 'タウンライフ個別基準', sub: () => `広告出稿 個別基準 · 全${TL_RULES.length}項目` },
};

const tlState = {
  quiz: { questions: [], index: 0, correct: 0, wrong: 0, wrongList: [] },
  quizInited: false,
};

function switchApp(app) {
  document.body.dataset.app = app;
  const cfg = APPS[app];
  $('#brand-mark').textContent = cfg.mark;
  $('#brand-mark').classList.toggle('tl', app === 'townlife');
  $('#brand-title').textContent = cfg.title;
  $('#brand-sub').textContent = cfg.sub();
  $$('.brand-item').forEach((b) => b.classList.toggle('active', b.dataset.app === app));
  closeBrandMenu();
}

function openBrandMenu() {
  $('#brand-menu').classList.add('open');
  $('#brand-toggle').setAttribute('aria-expanded', 'true');
}
function closeBrandMenu() {
  $('#brand-menu').classList.remove('open');
  $('#brand-toggle').setAttribute('aria-expanded', 'false');
}

$('#brand-toggle').addEventListener('click', (e) => {
  e.stopPropagation();
  $('#brand-menu').classList.contains('open') ? closeBrandMenu() : openBrandMenu();
});
$$('.brand-item').forEach((btn) => {
  btn.addEventListener('click', () => switchApp(btn.dataset.app));
});
document.addEventListener('click', (e) => {
  if (!e.target.closest('.brand-switch')) closeBrandMenu();
});
document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape') closeBrandMenu();
});

// ---------- Townlife tab switching ----------
function switchTLMode(mode) {
  $$('.tl-tab').forEach((t) => t.classList.toggle('active', t.dataset.tlmode === mode));
  $$('.tl-view').forEach((v) => v.classList.toggle('active', v.id === `view-tl-${mode}`));
}
$$('.tl-tab').forEach((tab) => {
  tab.addEventListener('click', () => switchTLMode(tab.dataset.tlmode));
});

// ---------- 基準一覧 ----------
function populateTLSelects() {
  ['#tl-category-filter', '#tl-quiz-category'].forEach((sel) => {
    $(sel).innerHTML = TL_CATEGORIES.map((c) => `<option value="${c}">${c}</option>`).join('');
  });
}

function ruleSearchText(r) {
  const ex = r.examples.map((e) => e.text + ' ' + e.why).join(' ');
  return `${r.no} ${r.title} ${r.summary} ${r.detail || ''} ${ex}`.toLowerCase();
}

function renderExamples(r, query) {
  if (!r.examples.length) return '';
  const row = (e) => `
    <li class="tl-ex ${e.ok ? 'ok' : 'ng'}">
      <span class="tl-ex-badge">${e.ok ? 'OK' : 'NG'}</span>
      <span class="tl-ex-body">
        <span class="tl-ex-text">${highlight(e.text, query)}</span>
        <span class="tl-ex-why">${highlight(e.why, query)}</span>
      </span>
    </li>`;
  return `<ul class="tl-ex-list">${r.examples.map(row).join('')}</ul>`;
}

function renderTLList() {
  const query = $('#tl-search').value.trim().toLowerCase();
  const cat = $('#tl-category-filter').value;
  let items = cat === '全て' ? TL_RULES : TL_RULES.filter((r) => r.category === cat);
  if (query) items = items.filter((r) => ruleSearchText(r).includes(query));

  $('#tl-count').textContent = items.length;
  const list = $('#tl-rule-list');
  if (!items.length) {
    list.innerHTML = `<p class="empty-state">該当する基準が見つかりませんでした。</p>`;
    return;
  }
  list.innerHTML = items
    .map((r) => {
      const detail = r.detail
        ? `<div class="tl-rule-detail">${highlight(r.detail, query)}</div>`
        : '';
      return `
      <article class="tl-rule">
        <div class="tl-rule-head">
          <span class="tl-rule-no">${String(r.no).padStart(2, '0')}</span>
          <h3 class="tl-rule-title">${highlight(r.title, query)}</h3>
          <span class="category-tag" data-cat="${escapeHtml(r.category)}">${escapeHtml(r.category)}</span>
        </div>
        <p class="tl-rule-summary">${highlight(r.summary, query)}</p>
        ${detail}
        ${renderExamples(r, query)}
      </article>`;
    })
    .join('');
}

$('#tl-search').addEventListener('input', renderTLList);
$('#tl-category-filter').addEventListener('change', renderTLList);

// ---------- OK/NG判定クイズ ----------
function buildExamplePool(cat) {
  const rules = cat === '全て' ? TL_RULES : TL_RULES.filter((r) => r.category === cat);
  return rules.flatMap((r) => r.examples.map((e) => ({ ...e, rule: r })));
}

function startTLQuiz() {
  const cat = $('#tl-quiz-category').value;
  const count = parseInt($('#tl-quiz-count').value, 10);
  const pool = buildExamplePool(cat);

  if (pool.length < 4) {
    alert('このカテゴリはOK/NG判定できる例が少なすぎます。別のカテゴリを選んでください。');
    return;
  }

  const target = count === 0 ? pool.length : Math.min(count, pool.length);
  tlState.quiz = {
    questions: shuffle(pool).slice(0, target),
    index: 0,
    correct: 0,
    wrong: 0,
    wrongList: [],
  };

  $('#tl-quiz-setup').classList.add('hidden');
  $('#tl-quiz-result').classList.add('hidden');
  $('#tl-quiz-play').classList.remove('hidden');
  renderTLQuestion();
}

function renderTLQuestion() {
  const { questions, index } = tlState.quiz;
  const q = questions[index];

  $('#tl-quiz-current').textContent = index + 1;
  $('#tl-quiz-total').textContent = questions.length;
  $('#tl-quiz-correct').textContent = tlState.quiz.correct;
  $('#tl-quiz-wrong').textContent = tlState.quiz.wrong;
  $('#tl-quiz-progress-fill').style.width = `${(index / questions.length) * 100}%`;

  $('#tl-quiz-cat-tag').textContent = q.rule.category;
  $('#tl-quiz-cat-tag').dataset.cat = q.rule.category;
  $('#tl-quiz-question-text').textContent = q.text;

  $$('.judge-btn').forEach((b) => {
    b.disabled = false;
    b.classList.remove('judge-correct', 'judge-wrong', 'picked');
  });
  $('#tl-quiz-feedback').classList.add('hidden');
}

function handleTLAnswer(answer) {
  const q = tlState.quiz.questions[tlState.quiz.index];
  const userSaysOk = answer === 'ok';
  const isCorrect = userSaysOk === q.ok;
  const correctAnswer = q.ok ? 'ok' : 'ng';

  $$('.judge-btn').forEach((b) => {
    b.disabled = true;
    if (b.dataset.answer === correctAnswer) b.classList.add('judge-correct');
    if (b.dataset.answer === answer && !isCorrect) b.classList.add('judge-wrong');
  });

  if (isCorrect) {
    tlState.quiz.correct++;
    $('#tl-feedback-result').textContent = '正解';
    $('#tl-feedback-result').className = 'feedback-result correct';
  } else {
    tlState.quiz.wrong++;
    tlState.quiz.wrongList.push(q);
    $('#tl-feedback-result').textContent = '不正解';
    $('#tl-feedback-result').className = 'feedback-result wrong';
  }

  const verdict = q.ok ? 'これは OK な表現' : 'これは NG な表現';
  $('#tl-feedback-explanation').textContent =
    `${verdict}です。\n\n【基準${q.rule.no}: ${q.rule.title}】\n${q.why}\n\n${q.rule.summary}`;

  $('#tl-quiz-correct').textContent = tlState.quiz.correct;
  $('#tl-quiz-wrong').textContent = tlState.quiz.wrong;
  $('#tl-quiz-feedback').classList.remove('hidden');

  const isLast = tlState.quiz.index === tlState.quiz.questions.length - 1;
  $('#tl-quiz-next').textContent = isLast ? '結果を見る' : '次の問題';
}

$$('.judge-btn').forEach((btn) => {
  btn.addEventListener('click', () => handleTLAnswer(btn.dataset.answer));
});

function nextTLQuestion() {
  if (tlState.quiz.index < tlState.quiz.questions.length - 1) {
    tlState.quiz.index++;
    renderTLQuestion();
  } else {
    showTLResult();
  }
}

function showTLResult() {
  $('#tl-quiz-play').classList.add('hidden');
  $('#tl-quiz-result').classList.remove('hidden');

  const total = tlState.quiz.questions.length;
  const correct = tlState.quiz.correct;
  const pct = Math.round((correct / total) * 100);

  $('#tl-result-percent').textContent = pct;
  $('#tl-result-correct').textContent = correct;
  $('#tl-result-total').textContent = total;

  const CIRC = 339.29;
  const ring = $('#tl-score-ring');
  ring.style.strokeDashoffset = CIRC;
  requestAnimationFrame(() => {
    ring.style.strokeDashoffset = CIRC * (1 - pct / 100);
  });

  let comment = '';
  if (pct === 100) comment = '完璧です。基準を正確に把握できています。';
  else if (pct >= 80) comment = '十分に理解できています。';
  else if (pct >= 60) comment = 'まずまず。間違えた基準を見直しましょう。';
  else comment = '基準一覧でOK/NG例を確認してから再挑戦しましょう。';
  $('#tl-result-comment').textContent = comment;

  const wrongEl = $('#tl-wrong-answers');
  if (!tlState.quiz.wrongList.length) {
    wrongEl.innerHTML = '';
  } else {
    wrongEl.innerHTML = `
      <div class="wrong-answers-title">間違えた表現 · ${tlState.quiz.wrongList.length}件</div>
      ${tlState.quiz.wrongList
        .map(
          (q) => `
        <div class="wrong-item">
          <strong>${q.ok ? 'OK' : 'NG'}が正解</strong>
          <span class="wrong-full">基準${q.rule.no} ${escapeHtml(q.rule.title)}</span>
          ${escapeHtml(q.text)}
          <span class="tl-wrong-why">${escapeHtml(q.why)}</span>
        </div>`
        )
        .join('')}
    `;
  }
}

$('#tl-quiz-start').addEventListener('click', startTLQuiz);
$('#tl-quiz-next').addEventListener('click', nextTLQuestion);
$('#tl-quiz-retry').addEventListener('click', startTLQuiz);
$('#tl-quiz-back-setup').addEventListener('click', () => {
  $('#tl-quiz-result').classList.add('hidden');
  $('#tl-quiz-setup').classList.remove('hidden');
});

// ---------- Init ----------
(function initTownlife() {
  document.body.dataset.app = 'marke';
  $('#tl-principle').textContent = TL_PRINCIPLE;
  populateTLSelects();
  renderTLList();
})();

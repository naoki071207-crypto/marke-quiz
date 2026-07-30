// ===== 条件早見表：素材種別・遷移先で変わる基準 =====
// 注: $ / $$ / escapeHtml は既存スクリプトのものを再利用。

const COND_MATERIALS = ['記事', '動画', 'バナー・静止画'];
const COND_DESTINATIONS = ['記事に遷移する', '直接LP・チャットボットに遷移する'];

// 条件で内容が変わる基準。branches の when は material / destination で分岐。
// when に指定のない軸は「どれでも一致」。material が「記事」の枝は destination を問わない。
const TL_CONDITIONS = [
  {
    no: 5,
    title: '画像・動画素材の注釈',
    category: '画像・素材',
    note: '体験談・ストーリーに関連する素材が対象。家の画像がない場合は「※写真はイメージです」「動画はイメージです」等で足りる。画像販売サイトから取得した場合は「広告撮影用です → 広告素材です」に変更する。',
    branches: [
      { when: { material: '記事' }, label: '記事', text: 'FV（ファーストビュー）に「本記事中の画像（や動画）は広告撮影用です」を掲載する（必須）。' },
      { when: { material: '動画' }, label: '動画', text: '「動画中の物件は広告撮影用です」を記載する。' },
      { when: { material: 'バナー・静止画', destination: '記事に遷移する' }, label: 'バナー・静止画（記事に遷移）', text: '「※写真はイメージです」を記載する。' },
      { when: { material: 'バナー・静止画', destination: '直接LP・チャットボットに遷移する' }, label: 'バナー・静止画（直接LP）', text: '家の画像に関連した金額・安さ訴求が含まれる場合は「※画像中の物件は広告撮影用です」が必要。それ以外は「※写真はイメージです」。' },
    ],
  },
  {
    no: 9,
    title: '「金額・内容は一例です」注釈の配置',
    category: '注釈・表記',
    note: 'サービスの事実のみの訴求（無料で使える／オンラインで一括依頼できる等）の場合は不要。金額に触れていない場合は「※内容は一例です」でよい。',
    branches: [
      { when: { material: '記事' }, label: '記事', text: '「※（本記事の）金額・内容は一例です」を、FV付近の視認性の高い箇所に記載する。' },
      { when: { material: '動画' }, label: '動画', text: '「※金額・内容は一例です」を、広告枠にかぶらずユーザーが視認できる位置に記載する。' },
      { when: { material: 'バナー・静止画' }, label: 'バナー・静止画', text: '「※金額・内容は一例です」を、広告枠にかぶらずユーザーが視認できる位置に記載する。' },
    ],
  },
  {
    no: 12,
    title: 'PR表記・運営者表記',
    category: '注釈・表記',
    note: '記事でタウンライフ以外の会社も紹介する構成では、「【PR】タウンライフ家づくり」はタウンライフを紹介する項目内の任意の箇所に置く。',
    branches: [
      { when: { material: '記事' }, label: '記事', text: '①記事上部（FV等）に【PR】 ②別の任意の箇所に「【PR】タウンライフ家づくり」 ③運営者表記（記事内の任意の箇所）。' },
      { when: { material: ['動画', 'バナー・静止画'], destination: '記事に遷移する' }, label: '動画/バナー（記事に遷移）', text: 'PR表記・運営者表記とも不要（遷移先の記事側で表記する）。' },
      { when: { material: ['動画', 'バナー・静止画'], destination: '直接LP・チャットボットに遷移する' }, label: '動画/バナー（直接LP）', text: 'PR表記・運営者表記が必須。' },
    ],
  },
  {
    no: 15,
    title: '価格の安さ訴求の上限',
    category: '金額・数値',
    note: 'シミュレーション等の根拠が前提。土地込み建売と土地なし注文住宅の比較など不適切な比較による過度な安さ表現は不可。家の差額で見せる場合、結果的な差額は1,000万円まで（値段対応表に従う）。',
    branches: [
      { when: { material: '記事' }, label: '記事', text: '金額の上限は定めない。ただし記事内にシミュレーション等の根拠が必要。' },
      { when: { material: ['動画', 'バナー・静止画'], destination: '記事に遷移する' }, label: '動画/バナー（記事に遷移）', text: '金額の上限は1,000万円まで。遷移先の記事にシミュレーション等の根拠が必要。' },
      { when: { material: ['動画', 'バナー・静止画'], destination: '直接LP・チャットボットに遷移する' }, label: '動画/バナー（直接LP）', text: '安さ・損得の訴求は不可。' },
    ],
  },
  {
    no: 24,
    title: '記事に遷移しない素材の扱い',
    category: '訴求・コンプラ',
    branches: [
      { when: { material: '記事' }, label: '記事', text: '本項の対象外（本項は「記事に遷移しない素材」向けの基準）。' },
      { when: { material: ['動画', 'バナー・静止画'], destination: '記事に遷移する' }, label: '動画/バナー（記事に遷移）', text: '本項の対象外（遷移先の記事側で判断する）。' },
      { when: { material: ['動画', 'バナー・静止画'], destination: '直接LP・チャットボットに遷移する' }, label: '動画/バナー（直接LP）', text: 'サービス内容の説明が必須。金額訴求・補助金訴求を当社と直接紐付ける表現は不可（例:「6万円台で家建てられた！その秘密はタウンライフ！」はNG）。' },
    ],
  },
  {
    no: 23,
    title: '素材ごとの可否の厳しさ',
    category: '訴求・コンプラ',
    note: '特に基準21・22に該当しうる表現（優良誤認・不可表現）で差が出る。',
    branches: [
      { when: { material: '記事' }, label: '記事', text: 'ひとつの表現が全体に与える影響が小さいため、総合的に問題なしと判断されやすい。' },
      { when: { material: '動画' }, label: '動画', text: '構成全体で判断する。1つの表現の影響は記事より大きい。' },
      { when: { material: 'バナー・静止画' }, label: 'バナー・静止画', text: '1つの表現の影響が大きいため、記事で可とした内容でも不可となる場合がある。' },
    ],
  },
];

const condState = { material: '記事', destination: '記事に遷移する' };

function condBranchMatch(when, sel) {
  for (const axis of ['material', 'destination']) {
    if (when[axis] == null) continue;
    const allowed = Array.isArray(when[axis]) ? when[axis] : [when[axis]];
    if (!allowed.includes(sel[axis])) return false;
  }
  return true;
}

function renderCondSelectors() {
  const isArticle = condState.material === '記事';

  $('#cond-material').innerHTML = COND_MATERIALS.map(
    (m) => `<button class="seg-btn ${m === condState.material ? 'active' : ''}" data-axis="material" data-val="${escapeHtml(m)}">${escapeHtml(m)}</button>`
  ).join('');

  $('#cond-destination').innerHTML = COND_DESTINATIONS.map(
    (d) => `<button class="seg-btn ${d === condState.destination ? 'active' : ''}" data-axis="destination" data-val="${escapeHtml(d)}" ${isArticle ? 'disabled' : ''}>${escapeHtml(d)}</button>`
  ).join('');

  $('#cond-dest-field').classList.toggle('is-disabled', isArticle);
  $('#cond-dest-note').textContent = isArticle ? '※ 記事そのものが対象のため、遷移先は関係しません' : '';
}

function renderCondList() {
  $('#cond-list').innerHTML = TL_CONDITIONS.map((topic) => {
    const active = topic.branches.find((b) => condBranchMatch(b.when, condState)) || topic.branches[0];
    const others = topic.branches.filter((b) => b !== active);
    const othersHtml = others.length
      ? `<details class="cond-others">
           <summary>他の条件での基準（${others.length}）</summary>
           <ul class="cond-others-list">
             ${others
               .map(
                 (b) => `<li><span class="cond-other-label">${escapeHtml(b.label)}</span><span class="cond-other-text">${escapeHtml(b.text)}</span></li>`
               )
               .join('')}
           </ul>
         </details>`
      : '';
    return `
      <article class="cond-card">
        <div class="cond-card-head">
          <span class="tl-rule-no">${String(topic.no).padStart(2, '0')}</span>
          <h3 class="cond-card-title">${escapeHtml(topic.title)}</h3>
          <span class="category-tag" data-cat="${escapeHtml(topic.category)}">${escapeHtml(topic.category)}</span>
        </div>
        <div class="cond-active">
          <span class="cond-active-label">${escapeHtml(active.label)}の場合</span>
          <p class="cond-active-text">${escapeHtml(active.text)}</p>
        </div>
        ${topic.note ? `<p class="cond-note">${escapeHtml(topic.note)}</p>` : ''}
        ${othersHtml}
      </article>`;
  }).join('');
}

function renderCond() {
  renderCondSelectors();
  renderCondList();
}

// クリックで条件切り替え（ボタン群はイベント委譲）
$('#cond-material').addEventListener('click', (e) => {
  const btn = e.target.closest('.seg-btn');
  if (!btn || btn.disabled) return;
  condState.material = btn.dataset.val;
  renderCond();
});
$('#cond-destination').addEventListener('click', (e) => {
  const btn = e.target.closest('.seg-btn');
  if (!btn || btn.disabled) return;
  condState.destination = btn.dataset.val;
  renderCond();
});

renderCond();

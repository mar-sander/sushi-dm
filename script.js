const state = {
  screen: "setup",
  playerA: "A",
  playerB: "B",
  trumpA: "",
  trumpB: "",
  turnsPerPlayer: 3,
  currentIndex: 0,
  scoreA: 0,
  scoreB: 0,
  history: [],
  bonusActive: false,
};

const totalRounds = () => state.turnsPerPlayer * 2;
const isGameFinished = () => state.currentIndex >= totalRounds();

const el = (id) => document.getElementById(id);

function saveState() {
  localStorage.setItem("sushiDeathmatchStateV1", JSON.stringify(state));
}

function loadState() {
  const saved = localStorage.getItem("sushiDeathmatchStateV1");
  if (!saved) return;

  try {
    const parsed = JSON.parse(saved);
    Object.assign(state, parsed);
    state.bonusActive = Boolean(state.bonusActive);
  } catch {
    localStorage.removeItem("sushiDeathmatchStateV1");
  }
}

function showScreen(screen) {
  state.screen = screen;

  document.querySelectorAll(".screen").forEach((section) => {
    section.classList.toggle("is-active", section.id === `screen-${screen}`);
  });

  document.querySelectorAll(".tab").forEach((tab) => {
    tab.classList.toggle("is-active", tab.dataset.screenTarget === screen);
  });

  saveState();
}

function createTurnButtons() {
  const wrap = el("turnButtons");
  wrap.innerHTML = "";

  for (let i = 1; i <= 10; i += 1) {
    const button = document.createElement("button");
    button.type = "button";
    button.className = "turn-button";
    button.textContent = i;
    button.dataset.turn = i;

    button.addEventListener("click", () => {
      state.turnsPerPlayer = i;
      syncSetup();
      saveState();
    });

    wrap.appendChild(button);
  }
}

function syncSetup() {
  el("playerA").value = state.playerA;
  el("playerB").value = state.playerB;
  el("trumpA").value = state.trumpA;
  el("trumpB").value = state.trumpB;

  document.querySelectorAll(".turn-button").forEach((button) => {
    button.classList.toggle("is-selected", Number(button.dataset.turn) === state.turnsPerPlayer);
  });
}

function getTurnInfo(index = state.currentIndex) {
  const isATurn = index % 2 === 0;

  return {
    attackerKey: isATurn ? "A" : "B",
    defenderKey: isATurn ? "B" : "A",
    attackerName: isATurn ? state.playerA : state.playerB,
    defenderName: isATurn ? state.playerB : state.playerA,
    attackerTrump: isATurn ? state.trumpA : state.trumpB,
    defenderTrump: isATurn ? state.trumpB : state.trumpA,
  };
}

function syncBattle() {
  el("scoreNameA").textContent = state.playerA;
  el("scoreNameB").textContent = state.playerB;
  el("scoreA").textContent = state.scoreA;
  el("scoreB").textContent = state.scoreB;
  el("battleTrumpA").textContent = state.trumpA || "未設定";
  el("battleTrumpB").textContent = state.trumpB || "未設定";

  const turn = getTurnInfo();

  el("roundLabel").textContent = isGameFinished()
    ? `全${totalRounds()}問終了`
    : `第${state.currentIndex + 1}問 / 全${totalRounds()}問`;

  el("currentAttacker").textContent = isGameFinished() ? "終了" : turn.attackerName;
  el("attackerName").textContent = isGameFinished() ? "勝負あり" : turn.attackerName;
  el("defenderName").textContent = isGameFinished() ? "結果確認" : turn.defenderName;

  el("scoreCardA").classList.toggle("is-turn", !isGameFinished() && turn.attackerKey === "A");
  el("scoreCardB").classList.toggle("is-turn", !isGameFinished() && turn.attackerKey === "B");

  document.querySelectorAll(".judge-button").forEach((button) => {
    button.disabled = isGameFinished();
  });

  const bonusToggle = el("bonusToggle");
  if (bonusToggle) {
    bonusToggle.disabled = isGameFinished();
    bonusToggle.classList.toggle("is-active", state.bonusActive && !isGameFinished());
    bonusToggle.setAttribute("aria-pressed", String(state.bonusActive && !isGameFinished()));
  }

  const point = state.bonusActive && !isGameFinished() ? 2 : 1;
  el("bonusToggleText").textContent = state.bonusActive && !isGameFinished()
    ? "発動中：この勝負は2点"
    : "未発動：通常1点";
  el("correctPointText").textContent = `回答者に +${point}点`;
  el("wrongPointText").textContent = `出題者に +${point}点`;

  el("turnNotice").textContent = isGameFinished()
    ? "全ターン終了です。結果画面を確認してください。"
    : "結果を選ぶと、自動で次のターンへ進みます。";

  renderHistory();
  syncResult();
}

function syncResult() {
  el("finalNameA").textContent = state.playerA;
  el("finalNameB").textContent = state.playerB;
  el("finalScoreA").textContent = state.scoreA;
  el("finalScoreB").textContent = state.scoreB;

  let winner = "引き分け";
  let loserText = "罰ゲーム対象：なし";

  if (state.scoreA > state.scoreB) {
    winner = state.playerA;
    loserText = `罰ゲーム対象：${state.playerB}`;
  } else if (state.scoreB > state.scoreA) {
    winner = state.playerB;
    loserText = `罰ゲーム対象：${state.playerA}`;
  }

  el("winnerName").textContent = winner;
  el("loserText").textContent = loserText;
}

function renderHistory() {
  const list = el("historyList");
  list.innerHTML = "";

  if (state.history.length === 0) {
    const item = document.createElement("li");
    item.textContent = "まだ勝負履歴はありません。";
    list.appendChild(item);
    return;
  }

  state.history.slice().reverse().forEach((record) => {
    const item = document.createElement("li");
    const memo = record.memo ? `｜${escapeHtml(record.memo)}` : "";
    const bonus = record.bonus ? "｜切り札" : "";
    item.innerHTML = `
      <strong>第${record.round}問</strong>
      ${escapeHtml(record.attacker)} → ${escapeHtml(record.defender)}
      ｜${record.result === "correct" ? "回答者が正解" : "回答者が不正解"}
      ｜${escapeHtml(record.scoredPlayer)}に+${record.point}点
      ${bonus}
      ${memo}
    `;
    list.appendChild(item);
  });
}

function escapeHtml(str) {
  return String(str)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function applyRoundResult(result) {
  if (isGameFinished()) return;

  const turn = getTurnInfo();
  const bonus = state.bonusActive;
  const point = bonus ? 2 : 1;
  const memo = el("roundMemo").value.trim();

  let scoredKey;
  let scoredPlayer;

  if (result === "correct") {
    scoredKey = turn.defenderKey;
    scoredPlayer = turn.defenderName;
  } else {
    scoredKey = turn.attackerKey;
    scoredPlayer = turn.attackerName;
  }

  if (scoredKey === "A") {
    state.scoreA += point;
  } else {
    state.scoreB += point;
  }

  state.history.push({
    round: state.currentIndex + 1,
    attackerKey: turn.attackerKey,
    defenderKey: turn.defenderKey,
    attacker: turn.attackerName,
    defender: turn.defenderName,
    result,
    bonus,
    point,
    scoredKey,
    scoredPlayer,
    memo,
  });

  state.currentIndex += 1;
  state.bonusActive = false;
  el("roundMemo").value = "";

  if (isGameFinished()) {
    showScreen("result");
  }

  syncBattle();
  saveState();
}

function undoLast() {
  const last = state.history.pop();
  if (!last) return;

  if (last.scoredKey === "A") {
    state.scoreA -= last.point;
  } else {
    state.scoreB -= last.point;
  }

  state.currentIndex = Math.max(0, state.currentIndex - 1);
  state.bonusActive = false;
  syncBattle();
  showScreen("battle");
  saveState();
}

function startGame() {
  state.playerA = el("playerA").value.trim() || "A";
  state.playerB = el("playerB").value.trim() || "B";
  state.trumpA = el("trumpA").value.trim();
  state.trumpB = el("trumpB").value.trim();
  state.currentIndex = 0;
  state.scoreA = 0;
  state.scoreB = 0;
  state.history = [];
  state.bonusActive = false;

  syncSetup();
  syncBattle();
  showScreen("battle");
  saveState();
}

function resetGame() {
  const ok = confirm("ゲームを最初からやり直しますか？");
  if (!ok) return;

  state.currentIndex = 0;
  state.scoreA = 0;
  state.scoreB = 0;
  state.history = [];
  state.bonusActive = false;
  el("roundMemo").value = "";

  syncBattle();
  showScreen("setup");
  saveState();
}

function bindEvents() {
  document.querySelectorAll("[data-screen-target]").forEach((button) => {
    button.addEventListener("click", () => {
      const target = button.dataset.screenTarget;
      if (target === "battle") syncBattle();
      if (target === "result") syncResult();
      showScreen(target);
    });
  });

  el("openRulesFromHeader").addEventListener("click", () => showScreen("rules"));
  el("startGame").addEventListener("click", startGame);
  el("resetGame").addEventListener("click", resetGame);
  el("backToBattle").addEventListener("click", () => {
    syncBattle();
    showScreen("battle");
  });

  el("undoButton").addEventListener("click", undoLast);

  el("bonusToggle").addEventListener("click", () => {
    if (isGameFinished()) return;
    state.bonusActive = !state.bonusActive;
    syncBattle();
    saveState();
  });

  document.querySelectorAll(".judge-button").forEach((button) => {
    button.addEventListener("click", () => {
      const result = button.dataset.result;
      applyRoundResult(result);
    });
  });

  ["playerA", "playerB", "trumpA", "trumpB"].forEach((id) => {
    el(id).addEventListener("input", () => {
      state.playerA = el("playerA").value.trim() || "A";
      state.playerB = el("playerB").value.trim() || "B";
      state.trumpA = el("trumpA").value.trim();
      state.trumpB = el("trumpB").value.trim();
      syncBattle();
      saveState();
    });
  });
}

function init() {
  createTurnButtons();
  loadState();
  bindEvents();
  syncSetup();
  syncBattle();
  showScreen(state.screen || "setup");
}

init();

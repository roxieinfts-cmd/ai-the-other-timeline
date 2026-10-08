(() => {
  const content = window.GAME_CONTENT;
  const screen = document.getElementById("screen");
  const game = document.getElementById("game");
  const statusStrip = document.getElementById("statusStrip");
  const timelineStatus = document.getElementById("timelineStatus");
  const dayStatus = document.getElementById("dayStatus");
  const timeStatus = document.getElementById("timeStatus");
  const notesButton = document.getElementById("notesButton");
  const notesDialog = document.getElementById("notesDialog");
  const notesContent = document.getElementById("notesContent");
  const closeNotes = document.getElementById("closeNotes");
  const soundButton = document.getElementById("soundButton");
  const progressDots = document.getElementById("progressDots");
  const sourceLabel = document.getElementById("sourceLabel");

  const STORAGE_KEY = "ai-other-timeline-v1";
  const solutionNames = Object.fromEntries(content.stages[1].solutions.map(item => [item.id, item.label]));

  function freshTimeline(seedLevels = null) {
    return {
      stageIndex: 0,
      phase: "intro",
      configs: content.stages.map((_, index) => ({
        aiLevel: seedLevels ? seedLevels[index] : 60,
        strategy: seedLevels && seedLevels[index] === 0 ? "independent" : "guided"
      })),
      decisions: {},
      solutions: [],
      flags: [],
      notes: [],
      qualityPoints: 40,
      ownership: 0,
      addedTime: 0,
      presentationAnswers: [],
      results: null
    };
  }

  let state = {
    screen: "title",
    playerName: "Jamie",
    activeTimeline: "A",
    timelines: { A: freshTimeline(), B: null },
    sound: false
  };

  function active() { return state.timelines[state.activeTimeline]; }

  function save() {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  }

  function load() {
    try {
      const saved = JSON.parse(localStorage.getItem(STORAGE_KEY));
      if (saved && saved.timelines && saved.activeTimeline) state = saved;
    } catch (_) {}
  }

  function reset() {
    localStorage.removeItem(STORAGE_KEY);
    state = { screen: "title", playerName: "Jamie", activeTimeline: "A", timelines: { A: freshTimeline(), B: null }, sound: false };
    render();
  }

  function escapeHtml(value) {
    return String(value).replace(/[&<>"]/g, char => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[char]));
  }

  function setScene(scene) {
    game.className = `game-shell scene-${scene}`;
  }

  function setStatus(stage = null) {
    const playing = !["title", "rewind", "dashboard"].includes(state.screen);
    statusStrip.hidden = !playing;
    notesButton.hidden = !playing;
    if (stage) {
      timelineStatus.textContent = `TIMELINE ${state.activeTimeline}`;
      dayStatus.textContent = stage.day;
      timeStatus.textContent = stage.time;
    }
  }

  function renderProgress() {
    const t = active();
    const current = state.screen === "friday" || state.screen === "summary" ? 3 : (t?.stageIndex ?? -1);
    progressDots.innerHTML = [0,1,2,3].map(i => `<i class="${i < current ? "done" : i === current ? "active" : ""}"></i>`).join("");
  }

  function stageHeader(stage) {
    return `<span class="section-label">${stage.day} · ${stage.time} · ${stage.place}</span><h2>${stage.title}</h2>`;
  }

  function renderTitle() {
    setScene("title");
    setStatus();
    progressDots.innerHTML = "";
    sourceLabel.textContent = "A scripted interactive prototype. No live AI is used.";
    const hasSave = Boolean(localStorage.getItem(STORAGE_KEY)) && state.screen !== "title";
    screen.innerHTML = `
      <section class="title-screen">
        <span class="eyebrow">A HORIZON SECONDARY STORY</span>
        <h1>THE OTHER <span>TIMELINE</span></h1>
        <p class="subtitle">Same task. Different AI choices. Different futures.</p>
        <div class="button-row" style="justify-content:center">
          <button class="primary-button" id="newGame">BEGIN MONDAY</button>
          ${hasSave ? '<button class="secondary-button" id="continueGame">CONTINUE</button>' : ''}
        </div>
        <p class="meta">You will complete the same school proposal twice. AI involvement does not decide whether a choice is good or bad.</p>
      </section>`;
    document.getElementById("newGame").onclick = () => {
      const currentSound = state.sound;
      state = { screen: "stageIntro", playerName: "Jamie", activeTimeline: "A", timelines: { A: freshTimeline(), B: null }, sound: currentSound };
      save(); render();
    };
    if (hasSave) document.getElementById("continueGame").onclick = () => { render(); };
  }

  function renderStageIntro() {
    const t = active();
    const stage = content.stages[t.stageIndex];
    setScene(stage.scene);
    setStatus(stage);
    sourceLabel.textContent = stage.id === "research" ? "The school waste survey is a fictional dataset created for this game." : "School conditions and budget are simulated game settings.";
    screen.innerHTML = `
      <section class="stage-intro">
        <div class="panel">
          ${stageHeader(stage)}
          <div class="task-card"><strong>YOUR TASK</strong><br>${stage.task}</div>
          <p class="cream-text">${stage.prompt}</p>
          <button class="primary-button" id="openConfig">CHOOSE HOW TO WORK</button>
        </div>
      </section>`;
    document.getElementById("openConfig").onclick = () => { t.phase = "config"; state.screen = "config"; save(); render(); };
  }

  function strategyOptions(config) {
    return content.strategies.map(s => `
      <button class="strategy-card ${config.strategy === s.id ? "selected" : ""}" data-strategy="${s.id}" ${config.aiLevel === 0 ? "disabled" : ""}>
        <strong>${s.name}</strong><small>${s.description}</small>
      </button>`).join("");
  }

  function renderConfig() {
    const t = active();
    const stage = content.stages[t.stageIndex];
    const config = t.configs[t.stageIndex];
    setScene(stage.scene); setStatus(stage);
    screen.innerHTML = `
      <section class="panel">
        ${stageHeader(stage)}
        <p class="muted">AI involvement controls how much of this stage A.I.D.E. can support. Strategy controls the type of support.</p>
        <div class="config-grid">
          <div class="level-picker">
            <span class="eyebrow">AI INVOLVEMENT</span>
            <div class="level-value" id="levelValue">${config.aiLevel}%</div>
            <input class="range" id="levelRange" type="range" min="0" max="100" step="20" value="${config.aiLevel}" aria-label="AI involvement percentage">
            <div class="level-ticks"><span>0</span><span>20</span><span>40</span><span>60</span><span>80</span><span>100</span></div>
            <p id="levelHelp">${config.aiLevel === 0 ? "Independent Work — no AI strategy is selected." : "This is the range of AI support, not the percentage of work completed by AI."}</p>
          </div>
          <div>
            <span class="eyebrow">AI STRATEGY</span>
            <div class="strategy-grid" id="strategyGrid">${strategyOptions(config)}</div>
          </div>
        </div>
        <div class="button-row">
          <button class="primary-button" id="confirmConfig">START THIS STAGE</button>
        </div>
      </section>`;
    const range = document.getElementById("levelRange");
    range.oninput = () => {
      config.aiLevel = Number(range.value);
      if (config.aiLevel === 0) config.strategy = "independent";
      if (config.aiLevel > 0 && config.strategy === "independent") config.strategy = "guided";
      save(); renderConfig();
    };
    document.querySelectorAll("[data-strategy]").forEach(button => {
      button.onclick = () => { config.strategy = button.dataset.strategy; save(); renderConfig(); };
    });
    document.getElementById("confirmConfig").onclick = () => { state.screen = "event"; t.phase = "event"; save(); render(); };
  }

  function aiSupportLine(stage, config) {
    if (config.aiLevel === 0) return "Independent Work mode. You will make the decision without A.I.D.E.";
    const strategy = content.strategies.find(item => item.id === config.strategy);
    const range = config.aiLevel <= 20 ? "one small part" : config.aiLevel <= 40 ? "part of the stage" : config.aiLevel <= 60 ? "several steps" : config.aiLevel <= 80 ? "most major steps" : "all major steps";
    return `${strategy.name} supports ${range}. ${stage.aiClaim || stage.prompt}`;
  }

  function renderSolutions(stage, t) {
    if (stage.id !== "writing") return "";
    return `<div class="solution-grid">${stage.solutions.map(s => `
      <button class="solution-card ${t.solutions.includes(s.id) ? "selected" : ""}" data-solution="${s.id}">
        <strong>${s.label}</strong><small>${s.detail}</small>
      </button>`).join("")}</div><p class="muted">Select exactly two solutions.</p>`;
  }

  function renderEvent() {
    const t = active();
    const stage = content.stages[t.stageIndex];
    const config = t.configs[t.stageIndex];
    const chosen = t.decisions[stage.id];
    setScene(stage.scene); setStatus(stage);
    screen.innerHTML = `
      <section class="dialogue-panel">
        <div class="portrait">${config.aiLevel === 0 ? "J" : "AI"}</div>
        <div>
          <span class="speaker">${config.aiLevel === 0 ? state.playerName.toUpperCase() : "A.I.D.E."}</span>
          <p>${stage.prompt}</p>
          <div class="ai-output">${escapeHtml(aiSupportLine(stage, config))}</div>
          ${renderSolutions(stage, t)}
          <div class="choices">${stage.choices.map(choice => `<button class="choice-button ${chosen === choice.id ? "selected" : ""}" data-choice="${choice.id}">${choice.label}</button>`).join("")}</div>
          <div id="eventResponse">${chosen ? `<div class="response-box">${stage.choices.find(c => c.id === chosen).response}</div>` : ""}</div>
          <div class="button-row"><button class="primary-button" id="completeStage" ${!chosen || (stage.id === "writing" && t.solutions.length !== 2) ? "disabled" : ""}>COMPLETE STAGE</button></div>
        </div>
      </section>`;
    document.querySelectorAll("[data-solution]").forEach(button => {
      button.onclick = () => {
        const id = button.dataset.solution;
        if (t.solutions.includes(id)) t.solutions = t.solutions.filter(x => x !== id);
        else if (t.solutions.length < 2) t.solutions.push(id);
        save(); renderEvent();
      };
    });
    document.querySelectorAll("[data-choice]").forEach(button => {
      button.onclick = () => { t.decisions[stage.id] = button.dataset.choice; save(); renderEvent(); };
    });
    document.getElementById("completeStage").onclick = () => completeStage(stage);
  }

  function completeStage(stage) {
    const t = active();
    const choice = stage.choices.find(c => c.id === t.decisions[stage.id]);
    choice.flags.forEach(flag => { if (!t.flags.includes(flag)) t.flags.push(flag); });
    t.notes = t.notes.filter(note => note.stage !== stage.id);
    t.notes.push({ stage: stage.id, day: stage.day, text: choice.note });
    t.ownership += choice.ownership;
    t.qualityPoints += choice.quality;
    t.addedTime += choice.time;
    if (stage.id === "writing") t.qualityPoints += 8;
    if (t.stageIndex < content.stages.length - 1) {
      t.stageIndex += 1; t.phase = "intro"; state.screen = "stageIntro";
    } else {
      state.screen = "friday"; t.phase = "proposal";
    }
    save(); render();
  }

  function calculateResults(t) {
    const levels = t.configs.map(c => c.aiLevel);
    const avgAI = Math.round(levels.reduce((a,b) => a+b, 0) / levels.length);
    const aiTimeReduction = Math.round(avgAI * .18);
    const proposalQuality = Math.max(0, Math.min(100, t.qualityPoints));
    const demonstratedUnderstanding = t.presentationAnswers.reduce((sum, score) => sum + score, 0);
    const simulatedTime = Math.max(35, 65 - aiTimeReduction + t.addedTime);
    return { aiInvolvement: avgAI, proposalQuality, demonstratedUnderstanding, decisionOwnership: Math.min(100, t.ownership), simulatedTime };
  }

  function proposalCopy(t) {
    const pair = t.solutions.length === 2 ? t.solutions.map(id => solutionNames[id]).join(" + ") : "A two-part plastic waste plan";
    const evidence = t.flags.includes("surveyInterpreted") ? "The proposal accurately describes the 300-item school sample." : "The proposal includes the 40% figure without fully defining the sample.";
    const prediction = t.flags.includes("unsupportedRetained") ? " It also predicts a 70% reduction within one month." : " It avoids claiming a result that the available evidence cannot predict.";
    return { pair, body: evidence + prediction };
  }

  function renderFriday() {
    const t = active();
    const stage = { day: "FRIDAY", time: "9:00 AM", place: "CLASSROOM" };
    setScene("classroom"); setStatus(stage);
    sourceLabel.textContent = "Scores describe performance inside this simulated game only.";
    const proposal = proposalCopy(t);
    if (t.phase === "proposal") {
      const quality = calculateResults(t).proposalQuality;
      screen.innerHTML = `<section class="panel"><span class="section-label">FRIDAY PRESENTATION · PROPOSAL REVEAL</span><div class="proposal-card"><h3>Make Our School Greener</h3><p><strong>${proposal.pair}</strong></p><p>${proposal.body}</p></div><div class="quality-reveal"><div><p class="muted">Your proposal is now submitted. Its quality will not change during the questions.</p><h3>Proposal Quality</h3></div><div class="big-score">${quality}</div></div><button class="primary-button" id="beginQuestions">PRESENT TO MS TAN</button></section>`;
      document.getElementById("beginQuestions").onclick = () => { t.phase = "q1"; save(); renderFriday(); };
      return;
    }
    const questions = {
      q1: { count: "QUESTION 1 OF 3", title: "Explain your evidence", text: "Your proposal says plastic bottles account for 40% of waste items. What exactly does this number mean?", answers: [
        ["40% of all waste produced by the whole school is plastic bottles.", 0],
        ["In the 300-item sample, 40% of the counted items were plastic bottles.", 30],
        ["Plastic bottles cause 40% of the school's environmental problems.", 0]
      ], next: "q2" },
      q2: { count: "QUESTION 2 OF 3", title: "Defend your solution", text: `Why is “${solutionNames[t.solutions[0]] || "your first solution"}” suitable for Horizon Secondary?`, answers: [
        ["Because A.I.D.E. ranked it first.", 5],
        ["It responds to the problem, but we still need to test cost, participation and practical limits.", 30],
        ["Because it sounds more ambitious than the other options.", 8]
      ], next: "q3" },
      q3: { count: "QUESTION 3 OF 3", title: "An unexpected constraint", text: `The school can only afford one solution. What do you do?`, answers: [
        [`Choose ${solutionNames[t.solutions[0]] || "the first solution"} immediately.`, 20],
        [`Choose ${solutionNames[t.solutions[1]] || "the second solution"} immediately.`, 20],
        ["Ask for cost and implementation evidence, then explain the trade-off before choosing.", 40]
      ], next: "done" }
    };
    const q = questions[t.phase];
    screen.innerHTML = `<section class="dialogue-panel"><div class="portrait">MT</div><div><span class="question-count">${q.count}</span><span class="speaker">MS TAN · ${q.title}</span><p>${q.text}</p><div class="choices">${q.answers.map((a,i) => `<button class="choice-button" data-answer="${i}">${a[0]}</button>`).join("")}</div></div></section>`;
    document.querySelectorAll("[data-answer]").forEach(button => {
      button.onclick = () => {
        const score = q.answers[Number(button.dataset.answer)][1];
        t.presentationAnswers.push(score);
        if (q.next === "done") {
          t.results = calculateResults(t);
          state.screen = "summary"; t.phase = "summary";
        } else t.phase = q.next;
        save(); render();
      };
    });
  }

  function renderSummary() {
    const t = active();
    if (!t.results) t.results = calculateResults(t);
    setScene("classroom"); setStatus({ day: "FRIDAY", time: "10:00 AM", place: "CLASSROOM" });
    const r = t.results;
    screen.innerHTML = `<section class="panel"><span class="section-label">TIMELINE ${state.activeTimeline} · COMPLETE</span><h2>This is the path you created.</h2><p class="muted">The proposal and your demonstrated understanding are shown separately.</p><div class="summary-grid">
      ${stat("AI involvement", `${r.aiInvolvement}%`)}${stat("Proposal quality", r.proposalQuality)}${stat("Understanding", r.demonstratedUnderstanding)}${stat("Simulated time", `${r.simulatedTime} min`)}
    </div><div class="button-row"><button class="primary-button" id="nextTimeline">${state.activeTimeline === "A" ? "REWIND TO MONDAY" : "COMPARE BOTH TIMELINES"}</button><button class="secondary-button" id="openNotesSummary">MY NOTES</button></div><p class="disclaimer">These scores reflect choices in this scripted scenario, not a validated assessment of real-world ability.</p></section>`;
    document.getElementById("openNotesSummary").onclick = openNotes;
    document.getElementById("nextTimeline").onclick = () => {
      if (state.activeTimeline === "A") { state.screen = "rewind"; }
      else { state.screen = "dashboard"; }
      save(); render();
    };
  }

  function stat(label, value) { return `<div class="stat-card"><span>${label}</span><strong>${value}</strong></div>`; }

  function renderRewind() {
    setScene("dashboard"); setStatus();
    sourceLabel.textContent = "Timeline B can keep the same AI involvement while changing how AI is used.";
    screen.innerHTML = `<section class="rewind"><div class="rewind-ring">B</div><span class="eyebrow">TIME REWIND</span><h2>What if you made different choices?</h2><p>Return to Monday. Your AI involvement levels will stay the same, but you can change them — or keep them and try a different strategy.</p><button class="primary-button" id="startB">ENTER TIMELINE B</button></section>`;
    document.getElementById("startB").onclick = () => {
      const seed = state.timelines.A.configs.map(c => c.aiLevel);
      state.timelines.B = freshTimeline(seed);
      state.activeTimeline = "B";
      state.screen = "stageIntro";
      save(); render();
    };
  }

  function metricBars(label, a, b, suffix = "") {
    const max = suffix === " min" ? Math.max(a, b, 80) : 100;
    return `<div class="metric-row"><div class="metric-label">${label}</div><div class="bars">
      <div class="bar"><i style="--value:${a/max*100}%;--bar-color:var(--orange)"></i><span><b>A</b><b>${a}${suffix}</b></span></div>
      <div class="bar"><i style="--value:${b/max*100}%;--bar-color:var(--mint)"></i><span><b>B</b><b>${b}${suffix}</b></span></div>
    </div></div>`;
  }

  function renderDashboard() {
    const a = state.timelines.A, b = state.timelines.B;
    setScene("dashboard"); setStatus();
    progressDots.innerHTML = "";
    sourceLabel.textContent = "Final comparison · two simulated personal timelines";
    screen.innerHTML = `<section class="dashboard"><span class="eyebrow">FINAL COMPARISON</span><h2>Same task. Two different processes.</h2><div class="dashboard-grid">
      <article class="chart-panel focus"><h3>Quality and understanding</h3><p class="muted">A polished proposal and a strong explanation are related, but they are not the same result.</p><div class="bar-pairs">${metricBars("Proposal quality", a.results.proposalQuality, b.results.proposalQuality)}${metricBars("Understanding", a.results.demonstratedUnderstanding, b.results.demonstratedUnderstanding)}</div></article>
      <article class="chart-panel"><h3>AI and time</h3><div class="bar-pairs">${metricBars("AI involvement", a.results.aiInvolvement, b.results.aiInvolvement, "%")}${metricBars("Simulated time", a.results.simulatedTime, b.results.simulatedTime, " min")}</div></article>
      <article class="chart-panel"><h3>Decision ownership</h3><div class="bar-pairs">${metricBars("Ownership", a.results.decisionOwnership, b.results.decisionOwnership)}</div><div class="behaviour-list">${behaviourRows(a,b)}</div></article>
    </div><div class="button-row"><button class="primary-button" id="playAgain">PLAY AGAIN</button><button class="secondary-button" id="notesDashboard">REVIEW NOTES</button></div><p class="disclaimer">Scores reflect performance in this simulated game, not a validated assessment of real-world abilities. AI involvement is not treated as a capability score.</p></section>`;
    document.getElementById("playAgain").onclick = reset;
    document.getElementById("notesDashboard").onclick = openNotes;
  }

  function behaviourRows(a,b) {
    const list = [
      ["Interpreted the survey sample", "surveyInterpreted"],
      ["Compared feasibility", "feasibilityCompared"],
      ["Handled the unsupported claim", "unsupportedRemoved"]
    ];
    return list.map(([label,flag]) => `<div class="behaviour ${(a.flags.includes(flag)||b.flags.includes(flag)) ? "yes" : "no"}"><span>${label}</span><strong>A ${a.flags.includes(flag) ? "YES" : "NO"} · B ${b.flags.includes(flag) ? "YES" : "NO"}</strong></div>`).join("");
  }

  function openNotes() {
    const timelines = ["A", "B"].filter(id => state.timelines[id]);
    const cards = timelines.flatMap(id => state.timelines[id].notes.map(note => `<article class="note-card"><small>TIMELINE ${id} · ${note.day}</small>${escapeHtml(note.text)}</article>`));
    notesContent.innerHTML = cards.length ? cards.join("") : '<p class="empty-note">Your notes will appear after you complete a stage.</p>';
    notesDialog.showModal();
  }

  function render() {
    soundButton.textContent = state.sound ? "SOUND ON" : "SOUND OFF";
    soundButton.setAttribute("aria-pressed", String(state.sound));
    renderProgress();
    switch (state.screen) {
      case "title": renderTitle(); break;
      case "stageIntro": renderStageIntro(); break;
      case "config": renderConfig(); break;
      case "event": renderEvent(); break;
      case "friday": renderFriday(); break;
      case "summary": renderSummary(); break;
      case "rewind": renderRewind(); break;
      case "dashboard": renderDashboard(); break;
      default: state.screen = "title"; renderTitle();
    }
  }

  notesButton.onclick = openNotes;
  closeNotes.onclick = () => notesDialog.close();
  soundButton.onclick = () => { state.sound = !state.sound; save(); render(); };
  load();
  render();
})();

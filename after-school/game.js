(() => {
  const content = window.AFTER_SCHOOL_CONTENT;
  const game = document.getElementById("game");
  const screen = document.getElementById("screen");
  const timeBlock = document.getElementById("timeBlock");
  const clock = document.getElementById("clock");
  const statusPanel = document.getElementById("statusPanel");
  const statusToggle = document.getElementById("statusToggle");
  const mapButton = document.getElementById("mapButton");
  const soundButton = document.getElementById("soundButton");
  const journalButton = document.getElementById("journalButton");
  const journalDialog = document.getElementById("journalDialog");
  const journalContent = document.getElementById("journalContent");
  const closeJournal = document.getElementById("closeJournal");
  const phoneDialog = document.getElementById("phoneDialog");
  const phoneContent = document.getElementById("phoneContent");
  const phoneClock = document.getElementById("phoneClock");
  const closePhone = document.getElementById("closePhone");
  const taskLine = document.getElementById("taskLine");
  const toast = document.getElementById("toast");

  const STORAGE_KEY = "after-school-game-v2-prd";
  const HOME_ONLY_MINUTE = 20 * 60 + 40;
  const END_MINUTE = 21 * 60 + 40;
  const START_MINUTE = 15 * 60 + 40;
  const DAYS = ["MONDAY", "TUESDAY", "WEDNESDAY", "THURSDAY", "FRIDAY"];
  let toastTimer;
  let audioContext;
  let musicTimer;
  let musicStep = 0;
  let currentScene = "title";

  function freshState() {
    return {
      screen: "title",
      currentEvent: null,
      minute: START_MINUTE,
      dayIndex: 0,
      daysCompleted: 0,
      stats: { project: 10, connection: 50, personal: 20 },
      flags: [],
      completedLocations: [],
      visitedLocations: [],
      notes: [],
      choices: [],
      revisedTasks: [],
      pendingReflection: null,
      pendingReallocation: null,
      dayProgress: DAYS.map(() => ({ activities: {}, locations: [], minutes: 0, mainEvents: [], timeReclaimed: 0, aiUsed: false, aiTypes: [] })),
      storyEvents: [],
      phoneBriefDays: [],
      v2: freshV2State(),
      sound: false,
      ending: null
    };
  }

  let state = freshState();

  function freshV2State() {
    return {
      energy: 80,
      academic: { taskPerformance: 50, knowledgeMastery: 50, criticalThinking: 50, aiLiteracy: 50, academicIntegrity: 50 },
      personal: { responsibility: 50, empathy: 50, agency: 50, selfManagement: 50 },
      activities: { basketballPracticeMinutes: 0, socialMinutes: 0, restMinutes: 0, independentStudyMinutes: 0 },
      relationships: { maya: { trust: 60, friendship: 65 }, jay: { trust: 60, friendship: 70 } },
      aiUsageHistory: [], timeReclaimed: 0
    };
  }

  function clamp(value) { return Math.max(0, Math.min(100, value)); }
  function hasFlag(flag) { return state.flags.includes(flag); }
  function addFlag(flag) { if (flag && !hasFlag(flag)) state.flags.push(flag); }
  function completed(location) { return state.completedLocations.includes(location); }
  function dayLabel() { return DAYS[Math.max(0, Math.min(DAYS.length - 1, state.dayIndex || 0))]; }
  function advanceDay() {
    state.dayIndex = Math.min((state.dayIndex || 0) + 1, DAYS.length - 1);
    state.daysCompleted = Math.min((state.daysCompleted || 0) + 1, DAYS.length);
    state.minute = START_MINUTE;
  }

  function progress() { return state.dayProgress[state.dayIndex]; }
  function storyDone(id) { return state.storyEvents.includes(id); }
  function recordStory(id) { if (!storyDone(id)) state.storyEvents.push(id); }

  function clone(value) { return JSON.parse(JSON.stringify(value)); }
  function bump(object, key, amount) { object[key] = clamp((object[key] ?? 50) + amount); }
  function aiUsageType(flags) {
    if (flags.includes("usedAiDraft") || flags.includes("uncheckedClaim")) return "REPLACE";
    if (flags.includes("usedAiFeedback") || flags.includes("checkedClaim")) return "ASSIST";
    if (flags.includes("understandsOpening")) return "LEARN";
    return "NONE";
  }

  function applyChoiceModel(model, event, choice) {
    const flags = choice.flags || [];
    const effects = choice.effects || {};
    const baseline = Math.max(...event.choices.map(item => item.time || 0), choice.time || 0);
    const type = aiUsageType(flags);
    const timeSaved = type === "NONE" ? 0 : Math.max(0, baseline - (choice.time || 0));
    model.timeReclaimed += timeSaved;
    if (type !== "NONE") model.aiUsageHistory.push({ type, event: state.currentEvent, verified: flags.includes("checkedClaim") || flags.includes("understandsOpening") });
    bump(model.academic, "taskPerformance", Math.round((effects.project || 0) * .45));
    bump(model.academic, "knowledgeMastery", flags.includes("understandsOpening") ? 8 : flags.includes("uncheckedClaim") ? -5 : 1);
    bump(model.academic, "criticalThinking", flags.includes("checkedClaim") ? 8 : flags.includes("uncheckedClaim") ? -6 : flags.includes("usedAiFeedback") ? 4 : 0);
    bump(model.academic, "aiLiteracy", type === "ASSIST" || type === "LEARN" ? 7 : type === "REPLACE" ? -3 : 0);
    bump(model.academic, "academicIntegrity", flags.includes("uncheckedClaim") ? -8 : flags.includes("checkedClaim") ? 5 : 0);
    bump(model.personal, "responsibility", flags.some(flag => ["checkedClaim", "resolvedMayaComment", "keptBasketballPromise"].includes(flag)) ? 6 : flags.includes("missedBasketball") ? -5 : 0);
    bump(model.personal, "empathy", Math.round((effects.connection || 0) * .35));
    bump(model.personal, "agency", flags.includes("understandsOpening") || flags.includes("stoppedScrolling") ? 5 : flags.includes("lostTrackOfTime") ? -6 : 0);
    bump(model.personal, "selfManagement", flags.includes("lostTrackOfTime") ? -8 : effects.personal > 0 ? 5 : effects.personal < 0 ? -3 : 0);
    model.energy = clamp(model.energy + Math.round((effects.personal || 0) * .4) - Math.max(0, (choice.time || 0) - 45) / 10);
    if (event.scene === "court") model.activities.basketballPracticeMinutes += choice.time || 0;
    if ((effects.connection || 0) > 0) model.activities.socialMinutes += choice.time || 0;
    if ((effects.personal || 0) > 0) model.activities.restMinutes += choice.time || 0;
    if ((effects.project || 0) > 0 && type !== "REPLACE") model.activities.independentStudyMinutes += choice.time || 0;
    bump(model.relationships.maya, "trust", flags.includes("resolvedMayaComment") || flags.includes("sharedEarly") ? 8 : flags.includes("ignoredMayaComment") ? -5 : 0);
    bump(model.relationships.jay, "trust", flags.includes("keptBasketballPromise") ? 8 : flags.includes("missedBasketball") ? -8 : 0);
    return { type, timeSaved };
  }

  function save() { localStorage.setItem(STORAGE_KEY, JSON.stringify(state)); }
  function load() {
    try {
      const saved = JSON.parse(localStorage.getItem(STORAGE_KEY));
      if (saved && saved.stats && Array.isArray(saved.flags)) {
        state = saved;
        state.v2 ||= freshV2State();
        state.daysCompleted ||= 0;
        state.dayProgress ||= DAYS.map(() => ({ activities: {}, locations: [], minutes: 0, mainEvents: [], timeReclaimed: 0, aiUsed: false, aiTypes: [] }));
        state.dayProgress.forEach(day => { day.timeReclaimed ||= 0; day.aiUsed ||= false; day.aiTypes ||= []; });
        state.storyEvents ||= [];
        state.phoneBriefDays ||= [];
        state.pendingReallocation ||= null;
      }
    } catch (_) {}
  }

  function formatTime(total) {
    const safe = Math.min(total, END_MINUTE);
    let hour = Math.floor(safe / 60);
    const minute = safe % 60;
    const suffix = hour >= 12 ? "PM" : "AM";
    hour = hour % 12 || 12;
    return `${hour}:${String(minute).padStart(2, "0")} ${suffix}`;
  }

  function setScene(scene) {
    currentScene = scene;
    game.className = `game-shell scene-${scene}`;
    startSceneMusic(scene);
  }

  function setChrome(visible = true) {
    timeBlock.hidden = !visible;
    statusPanel.hidden = !visible;
    journalButton.hidden = !visible;
    mapButton.disabled = !visible || state.screen === "event" || state.screen === "reflection" || state.screen === "ending";
    timeBlock.querySelector("span").textContent = dayLabel();
    clock.textContent = formatTime(state.minute);
    for (const key of ["project", "connection", "personal"]) {
      document.getElementById(`${key}Value`).textContent = state.stats[key];
      document.getElementById(`${key}Bar`).style.width = `${state.stats[key]}%`;
    }
    document.getElementById("energyValue").textContent = Math.round(state.v2.energy);
    document.getElementById("energyBar").style.width = `${state.v2.energy}%`;
  }

  function getAudioContext() {
    if (!audioContext) {
      const AudioContext = window.AudioContext || window.webkitAudioContext;
      audioContext = new AudioContext();
    }
    if (audioContext.state === "suspended") audioContext.resume();
    return audioContext;
  }

  function playTone(tone, duration, type = "square", volume = 0.025) {
    if (!state.sound) return;
    try {
      const ctx = getAudioContext();
      const oscillator = ctx.createOscillator();
      const gain = ctx.createGain();
      oscillator.frequency.value = tone;
      oscillator.type = type;
      gain.gain.setValueAtTime(volume, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + duration);
      oscillator.connect(gain).connect(ctx.destination);
      oscillator.start();
      oscillator.stop(ctx.currentTime + duration);
    } catch (_) {}
  }

  function beep(tone = 440, duration = 0.06) { playTone(tone, duration, "square", 0.025); }

  const SCENE_MUSIC = {
    title: { notes: [523, 659, 784, 659, 587, 698, 880, 698], chords: [[262,330,392],[220,277,330]], pace: 560, type: "triangle", beat: false },
    map: { notes: [587, 740, 880, 740, 659, 831, 988, 831], chords: [[294,370,440],[262,330,392]], pace: 460, type: "triangle", beat: true },
    transit: { notes: [494, 587, 740, 659, 554, 659, 831, 740], chords: [[247,311,370],[277,349,415]], pace: 400, type: "triangle", beat: true },
    canteen: { notes: [523, 659, 698, 784, 698, 659, 587, 523], chords: [[262,330,392],[294,370,440]], pace: 510, type: "sine", beat: true },
    library: { notes: [440, 523, 659, 523, 494, 587, 698, 587], chords: [[220,262,330],[196,247,294]], pace: 680, type: "sine", beat: false },
    court: { notes: [392, 392, 587, 494, 392, 659, 587, 494], chords: [[196,247,294],[220,277,330]], pace: 300, type: "triangle", beat: true },
    classroom: { notes: [523, 587,659,784,659,587,523,440], chords: [[262,330,392],[247,294,370]], pace: 520, type: "triangle", beat: true },
    home: { notes: [392,494,587,494,440,523,659,523], chords: [[196,247,294],[220,262,330]], pace: 720, type: "sine", beat: false },
    ending: { notes: [440,554,659,831,740,659,554,494], chords: [[220,277,330],[185,233,277]], pace: 760, type: "triangle", beat: false }
  };

  function stopSceneMusic() {
    clearInterval(musicTimer);
    musicTimer = null;
  }

  function startSceneMusic(scene = currentScene) {
    stopSceneMusic();
    if (!state.sound) return;
    const track = SCENE_MUSIC[scene] || SCENE_MUSIC.map;
    musicStep = 0;
    const nextNote = () => {
      const note = track.notes[musicStep % track.notes.length];
      playTone(note, Math.min(.38, track.pace / 1450), track.type, 0.006);
      if (musicStep % 4 === 0) {
        const chord = track.chords[Math.floor(musicStep / 4) % track.chords.length];
        chord.forEach((frequency, index) => playTone(frequency, track.pace * 3.4 / 1000, index === 0 ? "sine" : "triangle", index === 0 ? 0.0045 : 0.0025));
      }
      if (track.beat && musicStep % 2 === 0) playTone(musicStep % 4 === 0 ? 82 : 110, .07, "sine", .006);
      musicStep += 1;
    };
    nextNote();
    musicTimer = setInterval(nextNote, track.pace);
  }

  function showToast(message) {
    toast.textContent = message;
    toast.classList.add("show");
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => toast.classList.remove("show"), 2200);
  }

  function renderTitle() {
    setScene("title");
    setChrome(false);
    taskLine.textContent = "A scripted interactive prototype. No live AI is used.";
    const hasSave = Boolean(localStorage.getItem(STORAGE_KEY)) && state.screen !== "title";
    screen.innerHTML = `
      <section class="title-screen">
        <span class="micro">ONE STUDENT · ONE WEEK · MANY POSSIBLE EVENINGS</span>
        <h1>AFTER<br><span>SCHOOL</span></h1>
        <p class="title-copy">The last bell has rung. A group project, a basketball game, an unfinished track and a glowing phone are all waiting.</p>
        <div class="button-row centered">
          <button class="primary-button" id="newGame" type="button">START THE WEEK</button>
          ${hasSave ? '<button class="secondary-button" id="continueGame" type="button">CONTINUE</button>' : ''}
        </div>
        <p class="smallprint">A fictional interactive story. No choice is scored as morally right or wrong.</p>
      </section>`;
    document.getElementById("newGame").onclick = () => {
      const sound = state.sound;
      state = freshState();
      state.sound = sound;
      renderDayIntro();
    };
    const continueButton = document.getElementById("continueGame");
    if (continueButton) continueButton.onclick = () => {
      load();
      if (state.screen === "event" && state.currentEvent) renderEvent();
      else if (state.screen === "ending") renderEnding();
      else if (state.screen === "reflection") renderDailyReflection();
      else if (state.screen === "dayIntro") renderDayIntro();
      else renderMap();
    };
  }

  function renderDayIntro() {
    const brief = content.dailyBriefs[state.dayIndex];
    state.screen = "dayIntro";
    setScene("classroom");
    setChrome(true);
    taskLine.textContent = state.dayIndex === 4 ? "DEADLINE · The presentation must be addressed today." : "Choose where to go and how to spend the afternoon.";
    screen.innerHTML = `<section class="dialogue-panel"><div class="portrait day-portrait" aria-label="${dayLabel()}">${dayLabel()}</div><div class="dialogue-copy"><span class="location-label">${dayLabel()} · 3:40 PM</span><span class="speaker">AFTER THE LAST BELL</span><h2>${brief.title}</h2><p>${brief.body}</p><p>You can visit several places, do more than one activity, and return to the map while time remains.</p><button class="primary-button" id="startDay" type="button">CHOOSE A LOCATION</button></div></section>`;
    document.getElementById("startDay").onclick = () => {
      if (state.dayIndex === 0 && !storyDone("last_bell")) return openEvent("last_bell");
      state.minute = 16 * 60;
      renderMap();
    };
    save();
  }

  function eventMessages(event) {
    if (!event.messages) return "";
    return `<div class="message-stack">${event.messages.map(message => `<article><span>${message.from}</span><p>${message.text}</p></article>`).join("")}</div>`;
  }

  function portraitClass(event) {
    if (event.portrait === "M") return "portrait-maya";
    if (event.portrait === "J") return "portrait-jay";
    if (event.portrait === "T") return "portrait-teacher";
    if (event.portrait === "YOU") return "portrait-player";
    return "";
  }

  function locationLogoClass(id) {
    return { library: "scene-library", court: "scene-court-action", canteen: "scene-hawker", transit: "scene-mrt", home: "scene-family" }[id] || "scene-mrt";
  }

  function sceneLogo(id, label) {
    return `<div class="portrait scene-logo ${locationLogoClass(id)}" role="img" aria-label="${label} scene emblem"></div>`;
  }

  function renderEvent() {
    const event = content.events[state.currentEvent];
    setScene(event.scene);
    setChrome(true);
    taskLine.textContent = currentTask();
    screen.innerHTML = `
      <section class="dialogue-panel">
        <div class="portrait ${portraitClass(event) ? `character-art ${portraitClass(event)}` : ""}" aria-hidden="true">${portraitClass(event) ? "" : event.portrait}</div>
        <div class="dialogue-copy">
          <span class="location-label">${event.location}</span>
          <span class="speaker">${event.speaker}</span>
          <h2>${event.title}</h2>
          ${event.body.map(paragraph => `<p>${paragraph}</p>`).join("")}
          ${eventMessages(event)}
          <div class="choices">
            ${event.choices.map((choice, index) => {
              const blockedReplace = state.pendingReallocation && aiUsageType(choice.flags || []) === "REPLACE";
              return `
              <button class="choice-button" type="button" data-choice="${index}" ${blockedReplace ? "disabled" : ""}>
                <span>${choice.label}</span><small>${choice.hint || ""}</small>
              </button>`;
            }).join("")}
          </div>
        </div>
      </section>`;
    document.querySelectorAll("[data-choice]").forEach(button => {
      button.onclick = () => choose(event, event.choices[Number(button.dataset.choice)]);
    });
  }

  function choose(event, choice) {
    document.querySelectorAll("[data-choice]").forEach(button => button.disabled = true);
    const before = { ...state.stats };
    const modelBefore = clone(state.v2);
    const learning = applyChoiceModel(state.v2, event, choice);
    const terminalChoice = choice.next === "map" && state.currentEvent !== "last_bell";
    const usingReclaimedHour = Boolean(state.pendingReallocation);
    const createsReclaimedHour = terminalChoice && learning.type === "REPLACE" && !usingReclaimedHour;
    const consumesSlot = terminalChoice && !createsReclaimedHour;
    if (consumesSlot) {
      state.minute = Math.min(END_MINUTE, state.minute < 16 * 60 ? 17 * 60 : state.minute + 60);
      progress().minutes += 60;
      if (usingReclaimedHour) state.pendingReallocation = null;
    } else if (createsReclaimedHour) {
      state.pendingReallocation = { source: choice.label, location: event.location, locationId: ["library", "court", "home"].includes(event.scene) ? event.scene : null };
    } else if (state.currentEvent === "last_bell") {
      state.minute = 16 * 60;
    }
    progress().timeReclaimed += learning.timeSaved || 0;
    if (learning.type !== "NONE") { progress().aiUsed = true; progress().aiTypes.push(learning.type); }
    for (const [key, value] of Object.entries(choice.effects || {})) {
      state.stats[key] = clamp(state.stats[key] + value);
    }
    (choice.flags || []).forEach(addFlag);
    if (choice.complete && !completed(choice.complete)) state.completedLocations.push(choice.complete);
    state.notes.push({ time: `${dayLabel()} · ${formatTime(state.minute)}`, text: choice.note, location: event.location });
    state.choices.push({ event: state.currentEvent, label: choice.label, aiType: learning.type, timeSaved: learning.timeSaved, modelBefore });
    save();
    beep(520, 0.08);

    const deltas = Object.keys(state.stats)
      .filter(key => state.stats[key] !== before[key])
      .map(key => `${key[0].toUpperCase() + key.slice(1)} ${state.stats[key] > before[key] ? "+" : ""}${state.stats[key] - before[key]}`);
    const timeText = createsReclaimedHour ? "1 hour reclaimed · choose another activity" : consumesSlot ? (usingReclaimedHour ? "Reclaimed hour reallocated" : "1-hour block used") : state.currentEvent === "last_bell" ? "Exploration starts at 4 PM" : "Decision in progress";
    const reclaimedText = learning.timeSaved ? `<span>${learning.timeSaved} min reclaimed</span>` : "";

    const response = document.createElement("div");
    response.className = "response-card";
    const canRevise = choice.complete && (choice.effects?.project || 0) > 0 && !state.revisedTasks.includes(choice.complete);
    response.innerHTML = `<div class="choice-illustration ${eventResultArtClass(event)}" aria-hidden="true"></div><p>${choice.response}</p><div class="effect-line"><span>${timeText}</span>${reclaimedText}${learning.type !== "NONE" ? `<span>AI · ${learning.type}</span>` : ""}${deltas.map(delta => `<span>${delta}</span>`).join("")}</div>${canRevise ? `<div class="button-row"><button class="secondary-button" data-revision="ai" type="button">REVIEW WITH AI · 10 MIN</button><button class="secondary-button" data-revision="independent" type="button">EDIT INDEPENDENTLY · 10 MIN</button></div>` : ""}<button class="primary-button" id="continueChoice" type="button">CONTINUE</button>`;
    document.querySelector(".dialogue-copy").append(response);
    response.scrollIntoView({ behavior: "smooth", block: "nearest" });
    setChrome(true);
    document.querySelectorAll("[data-revision]").forEach(button => button.onclick = () => {
      const method = button.dataset.revision;
      state.minute += 10;
      state.stats.project = clamp(state.stats.project + 5);
      bump(state.v2.academic, "taskPerformance", 4);
      bump(state.v2.academic, method === "ai" ? "aiLiteracy" : "criticalThinking", 3);
      state.revisedTasks.push(choice.complete);
      state.notes.push({ time: `${dayLabel()} · ${formatTime(state.minute)}`, text: method === "ai" ? "You reviewed the draft with AI and decided which feedback to use." : "You independently revised the draft before submitting.", location: event.location });
      document.querySelectorAll("[data-revision]").forEach(item => item.disabled = true);
      showToast("Draft reviewed · 10 min passed · Project +5");
      setChrome(true);
      save();
    });
    document.getElementById("continueChoice").onclick = () => {
      if (state.currentEvent) recordStory(state.currentEvent);
      if (choice.next === "map") returnAfterAction(choice.note, choice.response, learning);
      else openEvent(choice.next);
    };
  }

  function eventResultScene(event) {
    if (event.scene === "court") return "scene-court-action";
    if (state.currentEvent === "personal") return "scene-music";
    if (state.currentEvent === "library_together") return "scene-maya-discuss";
    if (event.portrait === "M" || state.currentEvent === "maya_comment") return "scene-maya-slides";
    if (event.scene === "library") return "scene-library";
    if (event.scene === "home") return "scene-sleep";
    return "scene-mrt";
  }

  function eventResultArtClass(event) {
    if (event.scene === "court") return "scene-concepts scene-concept-court";
    if (state.currentEvent === "library_together") return "scene-concepts scene-concept-hawker";
    if (event.scene === "library") return "scene-concepts scene-concept-library";
    return `atlas ${eventResultScene(event)}`;
  }

  function returnAfterAction(note, response, learning = { timeSaved: 0, type: "NONE" }) {
    state.pendingReflection = { day: dayLabel(), note, response, timeSaved: progress().timeReclaimed, aiType: dailyAiType() };
    if (state.minute >= END_MINUTE) endCurrentDay("It is 9:40 PM. You put everything down and go to sleep. The day ends automatically.");
    else renderMap();
  }

  function openEvent(id) {
    state.screen = "event";
    state.currentEvent = id;
    save();
    renderEvent();
  }

  function takeaway(reflection) {
    if (reflection.aiType === "REPLACE") return "Finishing the work is not the same as understanding it.";
    if (reflection.aiType === "ASSIST" || reflection.aiType === "LEARN") return "AI can support your thinking without replacing it.";
    if (reflection.timeSaved > 0) return "AI can save time. It cannot decide what matters to you.";
    return "A slower choice can still be worthwhile when you understand its cost.";
  }

  function renderDailyReflection() {
    const reflection = state.pendingReflection;
    if (!reflection) return renderMap();
    state.screen = "reflection";
    setChrome(true);
    taskLine.textContent = "TODAY'S TAKEAWAY · Choices create trade-offs, not moral scores.";
    screen.innerHTML = `<section class="dialogue-panel"><div class="portrait day-portrait" aria-label="${reflection.day}">${reflection.day}</div><div class="dialogue-copy"><span class="location-label">${reflection.day} · DAILY REFLECTION</span><span class="speaker">YOUR ROUTE</span><h2>The Compromise</h2><p>${reflection.note}</p><div class="message-stack"><article><span>WHAT YOU GAINED</span><p>${reflection.response}</p></article><article><span>AI SAVED TIME TODAY</span><p>${reflection.timeSaved > 0 ? `About ${reflection.timeSaved} minutes compared with doing the same task without AI.` : reflection.aiType === "NONE" ? "0 minutes · You did not use AI for a measured time-saving task today." : "0 minutes · AI supported the work, but did not shorten it."}</p></article></div><p class="metric-explainer">This is an estimate of time saved by AI—not the time remaining in your evening.</p><blockquote>${takeaway(reflection)}</blockquote><button class="primary-button" id="nextDay" type="button">${state.daysCompleted >= 5 ? "SEE 16-WEEK PROJECTION" : "CONTINUE TO NEXT DAY"}</button></div></section>`;
    document.getElementById("nextDay").onclick = () => {
      state.pendingReflection = null;
      applyMissedDailyTasks();
      if (state.daysCompleted >= 5) finishDay();
      else {
        advanceDay();
        renderDayIntro();
        showDailyPhoneBrief();
      }
    };
    save();
  }

  function showDailyPhoneBrief() {
    if (state.phoneBriefDays.includes(state.dayIndex)) return;
    state.phoneBriefDays.push(state.dayIndex);
    save();
    openPhone(true);
  }

  function applyMissedDailyTasks() {
    const mayaTask = content.dailyTasks.maya[state.dayIndex];
    const jayTask = content.dailyTasks.jay[state.dayIndex];
    if (!progress().activities[mayaTask.id]) {
      bump(state.v2.relationships.maya, "trust", -5);
      state.stats.project = clamp(state.stats.project - 3);
      addFlag(`missed_${mayaTask.id}`);
      state.notes.push({ time: `${dayLabel()} · END OF DAY`, text: `Maya's task remained unanswered: ${mayaTask.label}.`, location: "Phone" });
    }
    if (!progress().activities[jayTask.id]) {
      bump(state.v2.relationships.jay, "trust", -4);
      state.stats.connection = clamp(state.stats.connection - 2);
      addFlag(`missed_${jayTask.id}`);
      state.notes.push({ time: `${dayLabel()} · END OF DAY`, text: `Jay's basketball task remained unanswered: ${jayTask.label}.`, location: "Phone" });
    }
  }

  function currentTask() {
    const blocks = Math.max(0, Math.ceil((END_MINUTE - state.minute) / 60));
    const timeLeft = `${blocks} one-hour block${blocks === 1 ? "" : "s"} left today`;
    if (!completed("library")) return `WEEK TASK · Presentation opening due Friday · ${timeLeft}`;
    if (!hasFlag("resolvedMayaComment") && state.dayIndex > 0) return `OPEN THREAD · Maya's comment · ${timeLeft}`;
    return `YOUR ROUTE · ${progress().locations.length} places visited · ${timeLeft}`;
  }

  function phoneEventId() {
    if (completed("library") && !hasFlag("handledMayaComment")) return "maya_comment";
    if (!hasFlag("scrolledOnce")) return "scroll_1";
    if (!hasFlag("scrolledTwice")) return "scroll_2";
    if (!hasFlag("lostTrackOfTime") && !hasFlag("stoppedScrolling")) return "scroll_3";
    return null;
  }

  function locationState(id) {
    if (state.minute >= END_MINUTE) return "closed";
    if (state.minute >= HOME_ONLY_MINUTE && id !== "home") return "closed";
    if (state.pendingReallocation?.locationId === id) return "blocked";
    if (id === "court" && state.minute >= 18 * 60 + 45) return "closed";
    return progress().locations.includes(id) ? "visited" : "open";
  }

  function mapHotspot(id, position) {
    const location = content.locations[id];
    const status = locationState(id);
    const labels = { open: "AVAILABLE", visited: "VISIT AGAIN", closed: "CLOSED", blocked: "CHOOSE ANOTHER PLACE" };
    return `
      <button class="map-hotspot ${position} ${status}" type="button" data-location="${id}" ${["closed", "blocked"].includes(status) ? "disabled" : ""}>
        <span class="map-icon">${location.icon}</span>
        <strong>${location.name}</strong>
        <small>${labels[status]}</small>
      </button>`;
  }

  function renderMap() {
    state.screen = "map";
    state.currentEvent = null;
    setScene("map");
    setChrome(true);
    taskLine.textContent = currentTask();
    screen.innerHTML = `
      <section class="map-screen" aria-label="Campus map">
        <div class="map-heading"><span class="micro">${dayLabel()} ROUTE · ${Math.max(0, Math.ceil((END_MINUTE - state.minute) / 60))} BLOCK${Math.ceil((END_MINUTE - state.minute) / 60) === 1 ? "" : "S"} LEFT</span><h2>${state.minute >= HOME_ONLY_MINUTE ? "It's late. Time to go home." : state.pendingReallocation ? "Where will you use the reclaimed hour?" : "Where will you spend the next hour?"}</h2><p>${state.minute >= HOME_ONLY_MINUTE ? "After 8:40 PM, only home activities are available. One final hour ends at 9:40 PM, then sleep is automatic." : state.pendingReallocation ? `AI is handling “${state.pendingReallocation.source}”. Choose one different activity; the clock advances after it.` : "Each activity reserves one hour, including travel and transition time."}</p></div>
        <div class="singapore-landmarks" aria-hidden="true"><span>HDB</span><span>HAWKER</span><span>MRT</span><span>PCN</span></div>
        ${mapHotspot("library", "library-spot")}
        ${mapHotspot("court", "court-spot")}
        ${mapHotspot("canteen", "canteen-spot")}
        ${mapHotspot("transit", "transit-spot")}
        ${mapHotspot("home", "home-spot")}
        <div class="map-actions">
          <button class="secondary-button" id="openPhoneMap" type="button">OPEN PHONE</button>
          <button class="primary-button" id="finishDay" type="button" ${progress().minutes < 10 || state.pendingReallocation || state.minute >= HOME_ONLY_MINUTE ? "disabled" : ""}>${state.minute >= HOME_ONLY_MINUTE ? "GO HOME BEFORE SLEEP" : state.pendingReallocation ? "USE RECLAIMED HOUR FIRST" : `END ${dayLabel()}`}</button>
        </div>
      </section>`;

    document.querySelectorAll("[data-location]").forEach(button => {
      button.onclick = () => visitLocation(button.dataset.location);
    });
    document.getElementById("openPhoneMap").onclick = () => openPhone(false);
    document.getElementById("finishDay").onclick = () => endCurrentDay("You decided this was enough for today.");
    save();
  }

  function visitLocation(id) {
    if (!state.visitedLocations.includes(id)) state.visitedLocations.push(id);
    if (!progress().locations.includes(id)) progress().locations.push(id);
    const eventId = locationStoryEvent(id);
    if (eventId) return openEvent(eventId);
    renderLocation(id);
  }

  function locationStoryEvent(id) {
    if (id === "library" && !completed("library")) return "library_start";
    if (id === "court" && state.dayIndex === 0 && !storyDone("court")) return "court";
    if (id === "home" && state.dayIndex >= 2 && !completed("home")) return "personal";
    if (id === "canteen" && hasFlag("askedCollaboration") && !storyDone("library_together")) return "library_together";
    if (id === "home" && state.dayIndex > 0 && completed("library") && !hasFlag("handledMayaComment")) { addFlag("handledMayaComment"); return "maya_comment"; }
    return null;
  }

  function renderLocation(id) {
    const location = content.locations[id];
    const isBedtime = id === "home" && state.minute >= HOME_ONLY_MINUTE;
    const remainingHomeActivities = isBedtime ? content.activities.home.filter(activity => !progress().activities[activity.id]) : [];
    const activities = isBedtime
      ? (remainingHomeActivities.length ? remainingHomeActivities : [{ id: "bedtime", label: "Wind down and prepare for bed", hint: "wash up, pack tomorrow's bag, put the phone away, then sleep", time: 60, energy: 15, effects: { personal: 8 }, activity: "restMinutes", note: "You packed for tomorrow, put the phone away, and let the day end at 9:40 PM." }])
      : [...content.activities[id]];
    state.screen = "location";
    state.currentEvent = null;
    setScene(id === "transit" ? "transit" : id === "canteen" ? "canteen" : location.scene);
    setChrome(true);
    taskLine.textContent = currentTask();
    const cards = activities.map(activity => {
      const count = progress().activities[activity.id] || 0;
      const tooLate = !isBedtime && state.minute + 60 > END_MINUTE;
      const depleted = count >= 1;
      const detail = activity.hint.replace(/^\d+ min · /, "");
      return `<button class="choice-button" data-activity="${activity.id}" type="button" ${tooLate || depleted ? "disabled" : ""}><span>${activity.label}</span><small>${depleted ? "Already done here today" : tooLate ? "No one-hour block left today" : `${formatTime(state.minute)}–${formatTime(state.minute + 60)} · ${detail}`}</small></button>`;
    }).join("");
    screen.innerHTML = `<section class="dialogue-panel has-scene-logo">${sceneLogo(id, location.name)}<div class="dialogue-copy"><span class="location-label">${location.name.toUpperCase()} · ${formatTime(state.minute)}</span><span class="speaker">${isBedtime ? "CHOOSE ONE FINAL HOME ACTIVITY" : "CHOOSE A ONE-HOUR BLOCK"}</span><h2>${isBedtime ? "One last thing before sleep" : location.subtitle}</h2><p>${isBedtime ? "Choose one remaining HDB activity. When it finishes, the clock moves to 9:40 PM and sleep begins automatically." : "One activity advances the clock by one hour. Activities here can be completed once per day."}</p><div class="choices">${cards}</div>${isBedtime ? "" : '<button class="secondary-button" id="backMap" type="button">BACK TO MAP</button>'}</div></section>`;
    document.querySelectorAll("[data-activity]").forEach(button => button.onclick = () => {
      const activity = activities.find(item => item.id === button.dataset.activity);
      if (activity.id === "bedtime") return doActivity(id, activity, { id: "manual", label: "Prepare for bed", saved: 0, aiType: "NONE", note: activity.note });
      renderActivityDecision(id, activity);
    });
    const backMap = document.getElementById("backMap");
    if (backMap) backMap.onclick = renderMap;
    save();
  }

  function activityApproaches(id, activity) {
    const manual = { id: "manual", label: "Do it without AI", hint: "Keep the full process in your hands", saved: 0, aiType: "NONE", note: activity.note };
    if (id === "library") return [
      manual,
      { id: "outline", label: "Ask AI for a plan or outline", hint: "AI structures the task; you make the decisions · saves about 20 min", saved: 20, aiType: "ASSIST", academic: { aiLiteracy: 4, criticalThinking: 2 }, note: `AI helped you structure “${activity.label.toLowerCase()},” but you chose what to keep.` },
      { id: "tutor", label: "Use AI as a tutor", hint: "Ask questions and request explanations · saves about 25 min", saved: 25, aiType: "LEARN", academic: { aiLiteracy: 5, knowledgeMastery: 5 }, note: `You asked AI to explain difficult parts of “${activity.label.toLowerCase()}” and checked your understanding.` },
      { id: "feedback", label: "Create first, then ask AI for feedback", hint: "Preserves your starting point · saves about 30 min", saved: 30, aiType: "ASSIST", academic: { aiLiteracy: 5, criticalThinking: 4 }, note: `You did the first pass yourself, then judged which AI feedback improved “${activity.label.toLowerCase()}.”` },
      { id: "delegate", label: "Ask AI to complete most of it", hint: "Fastest · little practice or ownership · saves about 45 min", saved: 45, aiType: "REPLACE", academic: { knowledgeMastery: -5, criticalThinking: -5, academicIntegrity: -4 }, effects: { project: 2 }, note: `AI completed most of “${activity.label.toLowerCase()}.” The result was quick, but you practised very little.` }
    ];
    if (id === "court") return [
      manual,
      { id: "video", label: "Ask AI to analyse a short practice video", hint: "Use the feedback as one observation · saves about 15 min", saved: 15, aiType: "ASSIST", academic: { aiLiteracy: 4 }, effects: { personal: 3 }, note: `AI noticed a movement pattern during “${activity.label.toLowerCase()}.” You compared it with how your body actually felt.` },
      { id: "adaptive", label: "Ask AI for an adaptive training plan", hint: "Provide goals and limits, then edit the plan · saves about 25 min", saved: 25, aiType: "ASSIST", academic: { aiLiteracy: 5, criticalThinking: 3 }, effects: { personal: 4 }, note: `You revised an AI training plan around your energy, experience, and coach's advice.` },
      { id: "copy", label: "Follow the first AI routine exactly", hint: "Fast setup · ignores context · saves about 35 min", saved: 35, aiType: "REPLACE", academic: { criticalThinking: -4 }, effects: { personal: -3 }, note: `You followed a generic AI routine without checking whether it fit today's conditions.` }
    ];
    const labels = {
      meal: ["Ask AI to compare balanced meal options", "Follow an AI meal choice without checking your needs"],
      friends: ["Ask AI for conversation starters, then speak naturally", "Let AI script your side of the conversation"],
      maya_checkin: ["Ask AI to organise a short check-in agenda", "Let AI write the entire project conversation"],
      mall: ["Ask AI to compare routes, budgets, and food options", "Let AI order online and send scripted replies instead of meeting up"],
      movie: ["Ask AI for spoiler-free recommendations based on the group", "Ask AI to summarise the entire film instead of watching it"],
      tuition: ["Use AI to identify weak areas and prepare questions", "Ask AI to complete the tuition worksheet for you"],
      rest: ["Ask AI for a simple wind-down routine", "Let AI schedule and judge every part of your rest"],
      family: ["Ask AI for thoughtful conversation prompts", "Use AI-generated replies instead of responding yourself"],
      study: ["Use AI as a tutor and quiz yourself", "Ask AI for answers without practising the material"]
    }[activity.id];
    const replaceOffsets = {
      mall: { connection: -10, personal: -5 },
      movie: { connection: -4, personal: -12 },
      tuition: { project: -7 }
    }[activity.id] || { connection: id === "canteen" ? -2 : 0 };
    return [
      manual,
      { id: "assist", label: labels[0], hint: "You review and adapt the suggestion · saves about 20 min", saved: 20, aiType: "ASSIST", academic: { aiLiteracy: 4, criticalThinking: 2 }, note: `AI supported “${activity.label.toLowerCase()},” and you adapted its suggestion to the real situation.` },
      { id: "replace", label: labels[1], hint: "Fast, but less personal and less practice · saves about 40 min", saved: 40, aiType: "REPLACE", academic: { criticalThinking: -4, knowledgeMastery: activity.id === "tuition" ? -7 : 0 }, effects: replaceOffsets, note: `AI handled most of “${activity.label.toLowerCase()}.” It saved time, but some of the experience and your own judgment disappeared.` }
    ];
  }

  function renderActivityDecision(id, activity) {
    const location = content.locations[id];
    const approaches = activityApproaches(id, activity);
    state.screen = "activityDecision";
    setScene(id === "transit" ? "transit" : id === "canteen" ? "canteen" : location.scene);
    setChrome(true);
    screen.innerHTML = `<section class="dialogue-panel has-scene-logo">${sceneLogo(id, location.name)}<div class="dialogue-copy"><span class="location-label">${location.name.toUpperCase()} · ${formatTime(state.minute)}–${formatTime(state.minute + 60)}</span><span class="speaker">${state.minute >= HOME_ONLY_MINUTE ? "FINAL HOUR BEFORE SLEEP" : state.pendingReallocation ? "REALLOCATE THE RECLAIMED HOUR" : "HOW WILL YOU DO IT?"}</span><h2>${activity.label}</h2><p>${state.minute >= HOME_ONLY_MINUTE ? "This is the final activity tonight. At 9:40 PM, the day ends and you go to sleep." : state.pendingReallocation ? "This activity uses the hour AI freed. You must stay involved, so another full-delegation choice is unavailable." : "AI use is not automatically good or bad. Decide how much thinking, checking, and ownership to keep."}</p><div class="choices">${approaches.map((approach, index) => {
      const blocked = (state.pendingReallocation || state.minute >= HOME_ONLY_MINUTE) && approach.aiType === "REPLACE";
      const blockedHint = state.minute >= HOME_ONLY_MINUTE ? "Too late to delegate again—stay involved in the final hour" : "Cannot delegate the reclaimed hour again";
      return `<button class="choice-button" type="button" data-approach="${index}" ${blocked ? "disabled" : ""}><span>${approach.label}</span><small>${blocked ? blockedHint : approach.hint}</small></button>`;
    }).join("")}</div><button class="secondary-button" id="backLocation" type="button">BACK TO ACTIVITIES</button></div></section>`;
    document.querySelectorAll("[data-approach]").forEach(button => button.onclick = () => doActivity(id, activity, approaches[Number(button.dataset.approach)]));
    document.getElementById("backLocation").onclick = () => renderLocation(id);
  }

  function doActivity(id, activity, approach) {
    const usingReclaimedHour = Boolean(state.pendingReallocation);
    const finalHomeActivity = id === "home" && state.minute >= HOME_ONLY_MINUTE;
    const createsReclaimedHour = approach.aiType === "REPLACE" && !usingReclaimedHour && !finalHomeActivity;
    progress().activities[activity.id] = (progress().activities[activity.id] || 0) + 1;
    if (finalHomeActivity) {
      progress().minutes += 60;
      state.minute = END_MINUTE;
      state.pendingReallocation = null;
    } else if (createsReclaimedHour) {
      state.pendingReallocation = { source: activity.label, location: content.locations[id].name, locationId: id };
    } else {
      progress().minutes += 60;
      state.minute += 60;
      if (usingReclaimedHour) state.pendingReallocation = null;
    }
    state.v2.energy = clamp(state.v2.energy + activity.energy);
    Object.entries(activity.effects || {}).forEach(([key, value]) => state.stats[key] = clamp(state.stats[key] + value));
    Object.entries(activity.academic || {}).forEach(([key, value]) => bump(state.v2.academic, key, value));
    Object.entries(approach.academic || {}).forEach(([key, value]) => bump(state.v2.academic, key, value));
    Object.entries(approach.effects || {}).forEach(([key, value]) => state.stats[key] = clamp(state.stats[key] + value));
    (activity.flags || []).forEach(addFlag);
    if (activity.activity) state.v2.activities[activity.activity] += activity.time;
    if (activity.relationship) bump(state.v2.relationships[activity.relationship[0]], "trust", activity.relationship[1]);
    if (approach.aiType !== "NONE") state.v2.aiUsageHistory.push({ type: approach.aiType, event: activity.id, verified: approach.aiType !== "REPLACE" });
    if (approach.aiType !== "NONE") {
      progress().aiUsed = true;
      progress().aiTypes.push(approach.aiType);
      progress().timeReclaimed += approach.saved;
      state.v2.timeReclaimed += approach.saved;
    }
    state.notes.push({ time: `${dayLabel()} · ${formatTime(state.minute)}`, text: approach.note, location: content.locations[id].name });
    state.choices.push({ event: `activity:${activity.id}`, label: `${activity.label} — ${approach.label}`, aiType: approach.aiType, timeSaved: approach.saved, modelBefore: clone(state.v2) });
    save();
    showToast(`${createsReclaimedHour ? "1 hour reclaimed — choose another activity" : usingReclaimedHour ? "Reclaimed hour reallocated" : "1-hour block used"} · Energy ${activity.energy >= 0 ? "+" : ""}${activity.energy}`);
    renderActivityResult(id, activity, approach);
  }

  function activitySceneClass(id, activity) {
    const scenes = {
      meal: "scene-hawker", friends: "scene-hawker", maya_checkin: "scene-maya-discuss",
      mall: "scene-mall", movie: "scene-cinema", tuition: "scene-tuition",
      family: "scene-family", rest: "scene-sleep", bedtime: "scene-sleep", study: "scene-library",
      homework: "scene-library", ai_plan: "scene-library", research: "scene-library",
      drills: "scene-court-action", jay_chat: "scene-court-action", ai_training: "scene-court-action",
      maya_mon: "scene-maya-discuss", maya_tue: "scene-maya-slides", maya_wed: "scene-maya-discuss", maya_thu: "scene-maya-slides", maya_fri: "scene-maya-slides",
      jay_mon: "scene-court-action", jay_tue: "scene-court-action", jay_wed: "scene-court-action", jay_thu: "scene-court-action", jay_fri: "scene-court-action"
    };
    return scenes[activity.id] || (id === "court" ? "scene-court-action" : id === "library" ? "scene-library" : "scene-mrt");
  }

  function activityArtClass(id, activity) {
    if (id === "library") return "scene-concepts scene-concept-library";
    if (id === "court") return "scene-concepts scene-concept-court";
    if (id === "canteen") return "scene-concepts scene-concept-hawker";
    if (activity.id === "movie") return "scene-concepts scene-concept-cinema";
    return `atlas ${activitySceneClass(id, activity)}`;
  }

  function renderActivityResult(id, activity, approach) {
    const location = content.locations[id];
    state.screen = "activityResult";
    setScene(id === "transit" ? "transit" : id === "canteen" ? "canteen" : location.scene);
    setChrome(true);
    screen.innerHTML = `<section class="activity-result"><div class="activity-illustration ${activityArtClass(id, activity)}" role="img" aria-label="${activity.label}"></div><div class="activity-caption"><span class="location-label">${location.name.toUpperCase()} · ${formatTime(state.minute)}</span><h2>${activity.label}</h2><p>${approach.note}</p><div class="effect-line"><span>${approach.aiType === "NONE" ? "NO AI" : `AI · ${approach.aiType}`}</span>${approach.saved ? `<span>${approach.saved} min reclaimed</span>` : ""}</div><button class="primary-button" id="continueActivity" type="button">CONTINUE</button></div></section>`;
    document.getElementById("continueActivity").onclick = () => returnAfterAction(approach.note, `${activity.label} — ${approach.label}`, { type: approach.aiType, timeSaved: approach.saved });
  }

  function endCurrentDay(reason) {
    if (state.dayIndex === 4 && !completed("library") && !storyDone("friday_deadline")) {
      addFlag("fridayDeadline");
      return openEvent("friday_deadline");
    }
    state.daysCompleted = Math.max(state.daysCompleted, state.dayIndex + 1);
    const blocks = progress().minutes / 60;
    const places = progress().locations.length;
    state.pendingReflection = { day: dayLabel(), note: reason, response: `${blocks} one-hour block${blocks === 1 ? "" : "s"} across ${places} location${places === 1 ? "" : "s"}.`, timeSaved: progress().timeReclaimed, aiType: dailyAiType() };
    renderDailyReflection();
  }

  function dailyAiType() {
    if (progress().aiTypes.includes("REPLACE")) return "REPLACE";
    if (progress().aiTypes.includes("LEARN")) return "LEARN";
    if (progress().aiTypes.includes("ASSIST")) return "ASSIST";
    return "NONE";
  }

  function openPhone(isDailyBrief = false) {
    document.querySelector(".phone-head span").textContent = isDailyBrief ? `TODAY'S TASKS · ${dayLabel()}` : "MESSAGES";
    phoneClock.textContent = formatTime(state.minute).replace(" PM", "").replace(" AM", "");
    const mayaTask = content.dailyTasks.maya[state.dayIndex];
    const jayTask = content.dailyTasks.jay[state.dayIndex];
    const mayaDone = Boolean(progress().activities[mayaTask.id]);
    const jayDone = Boolean(progress().activities[jayTask.id]);
    phoneContent.innerHTML = `
      <article class="phone-message has-avatar"><div class="phone-avatar character-art portrait-maya" aria-hidden="true"></div><div><span>${mayaTask.sender} · ${mayaDone ? "DONE" : "NEW TASK"}</span><p>${mayaTask.message}</p><button class="phone-task" id="mayaDailyTask" type="button" ${mayaDone ? "disabled" : ""}>${mayaDone ? "COMPLETED TODAY" : `OPEN · ${mayaTask.label}`}</button></div></article>
      <article class="phone-message has-avatar"><div class="phone-avatar character-art portrait-jay" aria-hidden="true"></div><div><span>${jayTask.sender} · ${jayDone ? "DONE" : "NEW TASK"}</span><p>${jayTask.message}</p><button class="phone-task" id="jayDailyTask" type="button" ${jayDone ? "disabled" : ""}>${jayDone ? "COMPLETED TODAY" : `OPEN · ${jayTask.label}`}</button></div></article>
      ${isDailyBrief ? '<p class="phone-brief">New day, new messages. Check both tasks before planning your route.</p>' : ''}
      <article class="phone-message feed"><span>SHORT VIDEOS · SG FEED</span><p>${hasFlag("scrolledOnce") ? "The feed remembers where you stopped. Still scrolling, ah?" : "12 new videos: rain memes, canteen rankings, and one extremely dramatic MRT delay edit."}</p></article>
      <button class="phone-action" id="phoneAction" type="button">${phoneEventId() === "maya_comment" ? "OPEN MAYA’S COMMENT" : phoneEventId() ? "OPEN THE FEED" : "NOTHING NEW"}</button>`;
    document.getElementById("mayaDailyTask").onclick = () => openDailyPhoneTask("maya", mayaTask);
    document.getElementById("jayDailyTask").onclick = () => openDailyPhoneTask("jay", jayTask);
    document.getElementById("phoneAction").disabled = !phoneEventId();
    document.getElementById("phoneAction").onclick = () => {
      phoneDialog.close();
      const id = phoneEventId();
      if (id === "maya_comment") addFlag("handledMayaComment");
      if (id) openEvent(id);
    };
    phoneDialog.showModal();
    beep(700, 0.04);
  }

  function openDailyPhoneTask(kind, task) {
    phoneDialog.close();
    const locationId = kind === "maya" ? "library" : "court";
    if (!progress().locations.includes(locationId)) progress().locations.push(locationId);
    if (!state.visitedLocations.includes(locationId)) state.visitedLocations.push(locationId);
    renderActivityDecision(locationId, task);
  }

  function openJournal() {
    const route = state.notes.length
      ? state.notes.map(note => `<article class="journal-note"><span>${note.time} · ${note.location}</span><p>${note.text}</p></article>`).join("")
      : '<p class="empty">Your route will appear here as you make choices.</p>';
    journalContent.innerHTML = `
      <section class="journal-stats">
        <div><span>PROJECT</span><strong>${state.stats.project}</strong></div>
        <div><span>CONNECTION</span><strong>${state.stats.connection}</strong></div>
        <div><span>PERSONAL</span><strong>${state.stats.personal}</strong></div>
      </section>
      <h3>Your route</h3>${route}`;
    journalDialog.showModal();
  }

  function chooseEnding() {
    const s = state.stats;
    if (hasFlag("lostTrackOfTime") && s.project < 40 && s.personal < 30) return "scroll";
    if (s.project >= 55 && hasFlag("understandsOpening")) return "reliable";
    if (s.project >= 45 && hasFlag("usedAiDraft") && !hasFlag("understandsOpening")) return "polished";
    if (s.connection >= 70 && hasFlag("playedFullGame")) return "social";
    if (s.personal >= 40 && s.project >= 30) return "creator";
    return "compromise";
  }

  function finishDay() {
    state.screen = "ending";
    state.ending = chooseEnding();
    save();
    renderEnding();
  }

  function bar(label, value, className) {
    return `<div class="ending-bar"><span>${label}</span><div><i class="${className}" style="width:${value}%"></i></div><b>${value}</b></div>`;
  }

  function average(values) { return values.reduce((sum, value) => sum + value, 0) / values.length; }
  function normaliseMinutes(value, target) { return value === 0 ? 65 : clamp(Math.round(value / target * 100)); }
  function semesterScores(model = state.v2) {
    const a = model.academic;
    const p = model.personal;
    const activities = model.activities;
    const relationshipTrust = average([model.relationships.maya.trust, model.relationships.jay.trust]);
    const assignmentCompletion = clamp(40 + state.completedLocations.length * 20);
    const projectQuality = clamp((a.taskPerformance + state.stats.project) / 2);
    const collaboration = clamp((state.stats.connection + p.empathy) / 2);
    const basketballPractice = normaliseMinutes(activities.basketballPracticeMinutes, 90);
    const independentStudy = normaliseMinutes(activities.independentStudyMinutes, 120);
    const restQuality = normaliseMinutes(activities.restMinutes, 90);
    const promisesKept = clamp(50 + (hasFlag("keptBasketballPromise") ? 25 : 0) - (hasFlag("missedBasketball") ? 20 : 0));
    return {
      homework: Math.round(.45 * assignmentCompletion + .35 * a.taskPerformance + .20 * a.academicIntegrity),
      independentExams: Math.round(.60 * a.knowledgeMastery + .25 * a.criticalThinking + .15 * independentStudy),
      groupProjects: Math.round(.40 * projectQuality + .30 * collaboration + .30 * p.responsibility),
      aiLiteracy: Math.round(a.aiLiteracy),
      criticalThinking: Math.round(a.criticalThinking),
      basketball: Math.round(.60 * basketballPractice + .25 * clamp(50 + (hasFlag("playedFullGame") ? 30 : hasFlag("playedShortGame") ? 15 : 0)) + .15 * 60),
      socialLife: Math.round(.40 * relationshipTrust + .30 * promisesKept + .30 * p.empathy),
      wellbeing: Math.round(.40 * restQuality + .30 * model.energy + .30 * p.selfManagement)
    };
  }

  function getGrade(score) {
    if (score >= 90) return "A";
    if (score >= 80) return "B";
    if (score >= 70) return "C";
    if (score >= 60) return "D";
    return "F";
  }

  function scoreCards(scores) {
    const labels = { homework: "Homework", independentExams: "Independent Exams", groupProjects: "Group Projects", aiLiteracy: "AI Literacy", criticalThinking: "Critical Thinking", basketball: "Basketball", socialLife: "Social Life", wellbeing: "Wellbeing" };
    return Object.entries(scores).map(([key, score]) => `<article class="journal-note"><span>${labels[key]}</span><p><strong>${getGrade(score)} · ${score}</strong></p></article>`).join("");
  }

  function renderReportCard() {
    const scores = semesterScores();
    setScene("ending");
    setChrome(false);
    taskLine.textContent = "A fictional 16-week projection based on this playthrough—not a real prediction.";
    screen.innerHTML = `<section class="dialogue-panel"><div class="portrait" aria-hidden="true">16W</div><div class="dialogue-copy"><span class="location-label">16 WEEKS LATER · SIMULATION</span><span class="speaker">SEMESTER REPORT</span><h2>Your projected pattern</h2><p>These deterministic scores apply the same rules to every route. They describe this playthrough, not your real ability.</p><div class="message-stack">${scoreCards(scores)}</div><p><strong>Time reclaimed:</strong> ${state.v2.timeReclaimed} minutes. <strong>AI uses recorded:</strong> ${state.v2.aiUsageHistory.length}.</p><div class="button-row"><button class="primary-button" id="whatIf" type="button">WHAT IF?</button><button class="secondary-button" id="backEnding" type="button">BACK TO ENDING</button></div></div></section>`;
    document.getElementById("whatIf").onclick = renderWhatIf;
    document.getElementById("backEnding").onclick = renderEnding;
  }

  function renderWhatIf() {
    const record = state.choices.at(-1);
    if (record && String(record.event).startsWith("activity:")) return renderReportCard();
    const event = record && content.events[record.event];
    if (!record || !event) return renderReportCard();
    const original = semesterScores();
    const alternatives = event.choices.filter(choice => choice.label !== record.label);
    screen.innerHTML = `<section class="dialogue-panel"><div class="portrait" aria-hidden="true">?</div><div class="dialogue-copy"><span class="location-label">WHAT IF? · SAME SCORING RULES</span><span class="speaker">ORIGINAL CHOICE</span><h2>${record.label}</h2><p>Select another option from the most recent event to compare its projected effect.</p><div class="choices">${alternatives.map((choice, index) => `<button class="choice-button" type="button" data-alt="${index}"><span>${choice.label}</span><small>${choice.hint || "Alternative route"}</small></button>`).join("")}</div><div id="whatIfResult"></div><button class="secondary-button" id="backReport" type="button">BACK TO REPORT</button></div></section>`;
    document.querySelectorAll("[data-alt]").forEach(button => button.onclick = () => {
      const choice = alternatives[Number(button.dataset.alt)];
      const model = clone(record.modelBefore);
      applyChoiceModel(model, event, choice);
      const alternative = semesterScores(model);
      document.getElementById("whatIfResult").innerHTML = `<div class="message-stack">${Object.keys(original).map(key => `<article><span>${key.replace(/([A-Z])/g, " $1").toUpperCase()}</span><p>${getGrade(original[key])} ${original[key]} → ${getGrade(alternative[key])} ${alternative[key]}</p></article>`).join("")}</div>`;
    });
    document.getElementById("backReport").onclick = renderReportCard;
  }

  function renderEnding() {
    const ending = content.endings.find(item => item.id === state.ending) || content.endings.at(-1);
    const otherEndings = content.endings.filter(item => item.id !== ending.id);
    setScene("ending");
    setChrome(false);
    taskLine.textContent = "This ending describes a fictional route, not a score of the player.";
    screen.innerHTML = `
      <section class="ending-screen">
        <div class="ending-copy">
          <span class="micro">${dayLabel()} · ${formatTime(state.minute)}</span>
          <h1>${ending.title}</h1>
          ${ending.text.map(paragraph => `<p>${paragraph}</p>`).join("")}
          <blockquote>${ending.reflection}</blockquote>
          <div class="button-row">
            <button class="primary-button" id="seeRoute" type="button">SEE MY ROUTE</button>
            <button class="secondary-button" id="reportCard" type="button">16-WEEK REPORT</button>
            <button class="secondary-button" id="playAgain" type="button">PLAY ANOTHER WEEK</button>
          </div>
        </div>
        <aside class="ending-summary">
          <span class="micro">HOW THE EVENING MOVED</span>
          ${bar("Project", state.stats.project, "project-fill")}
          ${bar("Connection", state.stats.connection, "connection-fill")}
          ${bar("Personal", state.stats.personal, "personal-fill")}
          <div class="route-count"><strong>${state.visitedLocations.length}</strong><span>places visited</span></div>
          <div class="route-count"><strong>${state.notes.length}</strong><span>moments recorded</span></div>
          <h3>Other Possible Endings</h3>
          ${otherEndings.map(item => `<article class="journal-note"><span>${item.title}</span><p>${item.reflection}</p></article>`).join("")}
        </aside>
      </section>`;
    document.getElementById("seeRoute").onclick = openJournal;
    document.getElementById("reportCard").onclick = renderReportCard;
    document.getElementById("playAgain").onclick = () => {
      const sound = state.sound;
      state = freshState();
      state.sound = sound;
      save();
      renderTitle();
    };
  }

  mapButton.onclick = () => { if (!["event", "reflection", "ending"].includes(state.screen)) renderMap(); };
  soundButton.onclick = () => {
    state.sound = !state.sound;
    soundButton.textContent = state.sound ? "SOUND ON" : "SOUND OFF";
    soundButton.setAttribute("aria-pressed", String(state.sound));
    save();
    if (state.sound) {
      beep(620, 0.08);
      startSceneMusic(currentScene);
    } else stopSceneMusic();
  };
  journalButton.onclick = openJournal;
  closeJournal.onclick = () => journalDialog.close();
  closePhone.onclick = () => phoneDialog.close();
  statusToggle.onclick = () => {
    const collapsed = statusPanel.classList.toggle("collapsed");
    statusToggle.setAttribute("aria-expanded", String(!collapsed));
    statusToggle.querySelector("b").textContent = collapsed ? "+" : "−";
    localStorage.setItem(`${STORAGE_KEY}-status-collapsed`, String(collapsed));
    beep(collapsed ? 360 : 480, .04);
  };
  journalDialog.addEventListener("click", event => { if (event.target === journalDialog) journalDialog.close(); });
  phoneDialog.addEventListener("click", event => { if (event.target === phoneDialog) phoneDialog.close(); });
  document.addEventListener("click", event => {
    const button = event.target.closest("button");
    if (!button || button.disabled || button === soundButton || !state.sound) return;
    if (button.classList.contains("choice-button")) beep(520, .055);
    else if (button.classList.contains("primary-button")) beep(660, .07);
    else if (button.classList.contains("phone-task") || button.classList.contains("phone-action")) beep(760, .05);
    else beep(390, .045);
  });

  load();
  if (localStorage.getItem(`${STORAGE_KEY}-status-collapsed`) === "true") {
    statusPanel.classList.add("collapsed");
    statusToggle.setAttribute("aria-expanded", "false");
    statusToggle.querySelector("b").textContent = "+";
  }
  soundButton.textContent = state.sound ? "SOUND ON" : "SOUND OFF";
  soundButton.setAttribute("aria-pressed", String(state.sound));
  renderTitle();
})();

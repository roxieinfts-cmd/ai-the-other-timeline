(() => {
  const content = window.AFTER_SCHOOL_CONTENT;
  const game = document.getElementById("game");
  const screen = document.getElementById("screen");
  const timeBlock = document.getElementById("timeBlock");
  const clock = document.getElementById("clock");
  const statusPanel = document.getElementById("statusPanel");
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

  const STORAGE_KEY = "after-school-game-v1";
  const END_MINUTE = 21 * 60;
  let toastTimer;

  function freshState() {
    return {
      screen: "title",
      currentEvent: null,
      minute: 15 * 60 + 40,
      stats: { project: 10, connection: 50, personal: 20 },
      flags: [],
      completedLocations: [],
      visitedLocations: [],
      notes: [],
      choices: [],
      sound: false,
      ending: null
    };
  }

  let state = freshState();

  function clamp(value) { return Math.max(0, Math.min(100, value)); }
  function hasFlag(flag) { return state.flags.includes(flag); }
  function addFlag(flag) { if (flag && !hasFlag(flag)) state.flags.push(flag); }
  function completed(location) { return state.completedLocations.includes(location); }

  function save() { localStorage.setItem(STORAGE_KEY, JSON.stringify(state)); }
  function load() {
    try {
      const saved = JSON.parse(localStorage.getItem(STORAGE_KEY));
      if (saved && saved.stats && Array.isArray(saved.flags)) state = saved;
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
    game.className = `game-shell scene-${scene}`;
  }

  function setChrome(visible = true) {
    timeBlock.hidden = !visible;
    statusPanel.hidden = !visible;
    journalButton.hidden = !visible;
    mapButton.disabled = !visible || state.screen === "event" || state.screen === "ending";
    clock.textContent = formatTime(state.minute);
    for (const key of ["project", "connection", "personal"]) {
      document.getElementById(`${key}Value`).textContent = state.stats[key];
      document.getElementById(`${key}Bar`).style.width = `${state.stats[key]}%`;
    }
  }

  function beep(tone = 440, duration = 0.06) {
    if (!state.sound) return;
    try {
      const AudioContext = window.AudioContext || window.webkitAudioContext;
      const ctx = new AudioContext();
      const oscillator = ctx.createOscillator();
      const gain = ctx.createGain();
      oscillator.frequency.value = tone;
      oscillator.type = "square";
      gain.gain.setValueAtTime(0.025, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + duration);
      oscillator.connect(gain).connect(ctx.destination);
      oscillator.start();
      oscillator.stop(ctx.currentTime + duration);
    } catch (_) {}
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
        <span class="micro">ONE STUDENT · ONE MONDAY · MANY POSSIBLE EVENINGS</span>
        <h1>AFTER<br><span>SCHOOL</span></h1>
        <p class="title-copy">The last bell has rung. A group project, a basketball game, an unfinished track and a glowing phone are all waiting.</p>
        <div class="button-row centered">
          <button class="primary-button" id="newGame" type="button">START MONDAY</button>
          ${hasSave ? '<button class="secondary-button" id="continueGame" type="button">CONTINUE</button>' : ''}
        </div>
        <p class="smallprint">A fictional interactive story. No choice is scored as morally right or wrong.</p>
      </section>`;
    document.getElementById("newGame").onclick = () => {
      const sound = state.sound;
      state = freshState();
      state.sound = sound;
      openEvent("last_bell");
    };
    const continueButton = document.getElementById("continueGame");
    if (continueButton) continueButton.onclick = () => {
      load();
      if (state.screen === "event" && state.currentEvent) renderEvent();
      else if (state.screen === "ending") renderEnding();
      else renderMap();
    };
  }

  function eventMessages(event) {
    if (!event.messages) return "";
    return `<div class="message-stack">${event.messages.map(message => `<article><span>${message.from}</span><p>${message.text}</p></article>`).join("")}</div>`;
  }

  function renderEvent() {
    const event = content.events[state.currentEvent];
    setScene(event.scene);
    setChrome(true);
    taskLine.textContent = currentTask();
    screen.innerHTML = `
      <section class="dialogue-panel">
        <div class="portrait" aria-hidden="true">${event.portrait}</div>
        <div class="dialogue-copy">
          <span class="location-label">${event.location}</span>
          <span class="speaker">${event.speaker}</span>
          <h2>${event.title}</h2>
          ${event.body.map(paragraph => `<p>${paragraph}</p>`).join("")}
          ${eventMessages(event)}
          <div class="choices">
            ${event.choices.map((choice, index) => `
              <button class="choice-button" type="button" data-choice="${index}">
                <span>${choice.label}</span><small>${choice.hint || ""}</small>
              </button>`).join("")}
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
    state.minute += choice.time || 0;
    for (const [key, value] of Object.entries(choice.effects || {})) {
      state.stats[key] = clamp(state.stats[key] + value);
    }
    (choice.flags || []).forEach(addFlag);
    if (choice.complete && !completed(choice.complete)) state.completedLocations.push(choice.complete);
    state.notes.push({ time: formatTime(state.minute), text: choice.note, location: event.location });
    state.choices.push({ event: state.currentEvent, label: choice.label });
    save();
    beep(520, 0.08);

    const deltas = Object.keys(state.stats)
      .filter(key => state.stats[key] !== before[key])
      .map(key => `${key[0].toUpperCase() + key.slice(1)} ${state.stats[key] > before[key] ? "+" : ""}${state.stats[key] - before[key]}`);
    const timeText = choice.time ? `${choice.time} min passed` : "No time passed";

    const response = document.createElement("div");
    response.className = "response-card";
    response.innerHTML = `<p>${choice.response}</p><div class="effect-line"><span>${timeText}</span>${deltas.map(delta => `<span>${delta}</span>`).join("")}</div><button class="primary-button" id="continueChoice" type="button">CONTINUE</button>`;
    document.querySelector(".dialogue-copy").append(response);
    response.scrollIntoView({ behavior: "smooth", block: "nearest" });
    setChrome(true);
    document.getElementById("continueChoice").onclick = () => {
      if (state.minute >= END_MINUTE) return finishDay();
      if (choice.next === "map") renderMap();
      else openEvent(choice.next);
    };
  }

  function openEvent(id) {
    state.screen = "event";
    state.currentEvent = id;
    save();
    renderEvent();
  }

  function currentTask() {
    if (!completed("library")) return "CURRENT TASK · Decide what to do about Friday’s opening.";
    if (!completed("court") && !completed("home")) return "CURRENT TASK · The evening is still open.";
    if (!completed("home")) return "CURRENT TASK · Something personal is waiting at home.";
    return "CURRENT TASK · Decide when this Monday is finished.";
  }

  function phoneEventId() {
    if (completed("library") && !hasFlag("handledMayaComment")) return "maya_comment";
    if (!hasFlag("scrolledOnce")) return "scroll_1";
    if (!hasFlag("scrolledTwice")) return "scroll_2";
    if (!hasFlag("lostTrackOfTime") && !hasFlag("stoppedScrolling")) return "scroll_3";
    return null;
  }

  function locationState(id) {
    if (id === "phone") return phoneEventId() ? "open" : "quiet";
    if (completed(id)) return "complete";
    if (id === "court" && state.minute >= 18 * 60 + 45) return "closed";
    return "open";
  }

  function mapHotspot(id, icon, position) {
    const location = content.locations[id];
    const status = locationState(id);
    const labels = { open: "AVAILABLE", complete: "DONE", closed: "MISSED", quiet: "QUIET" };
    return `
      <button class="map-hotspot ${position} ${status}" type="button" data-location="${id}" ${["complete", "closed", "quiet"].includes(status) ? "disabled" : ""}>
        <span class="map-icon">${icon}</span>
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
        <div class="map-heading"><span class="micro">MONDAY ROUTE</span><h2>Where will you go?</h2><p>Every stop takes time. Some moments will not wait.</p></div>
        ${mapHotspot("library", "▦", "library-spot")}
        ${mapHotspot("court", "●", "court-spot")}
        ${mapHotspot("phone", "▣", "phone-spot")}
        ${mapHotspot("home", "⌂", "home-spot")}
        <div class="map-actions">
          <button class="secondary-button" id="openPhoneMap" type="button">OPEN PHONE</button>
          <button class="primary-button" id="finishDay" type="button">END MONDAY</button>
        </div>
      </section>`;

    document.querySelectorAll("[data-location]").forEach(button => {
      button.onclick = () => visitLocation(button.dataset.location);
    });
    document.getElementById("openPhoneMap").onclick = openPhone;
    document.getElementById("finishDay").onclick = finishDay;
    save();
  }

  function visitLocation(id) {
    if (!state.visitedLocations.includes(id)) state.visitedLocations.push(id);
    if (id === "library") return openEvent("library_start");
    if (id === "court") return openEvent("court");
    if (id === "home") return openEvent("personal");
    if (id === "phone") {
      const eventId = phoneEventId();
      if (eventId === "maya_comment") addFlag("handledMayaComment");
      if (eventId) return openEvent(eventId);
    }
  }

  function openPhone() {
    phoneClock.textContent = formatTime(state.minute).replace(" PM", "").replace(" AM", "");
    const mayaState = completed("library")
      ? "I left one comment on the opening. Still awake?"
      : "We still need an opening for Friday.";
    const jayState = completed("court")
      ? (hasFlag("missedBasketball") ? "Next time just tell me earlier 😐" : "Sending the court photo now")
      : "Court at 5? Don’t disappear again 😭";
    phoneContent.innerHTML = `
      <article class="phone-message"><span>MAYA · GROUP PROJECT</span><p>${mayaState}</p></article>
      <article class="phone-message"><span>JAY · BASKETBALL</span><p>${jayState}</p></article>
      <article class="phone-message feed"><span>SHORT VIDEOS</span><p>${hasFlag("scrolledOnce") ? "The feed remembers where you stopped." : "12 new videos since lunch."}</p></article>
      <button class="phone-action" id="phoneAction" type="button">${phoneEventId() === "maya_comment" ? "OPEN MAYA’S COMMENT" : phoneEventId() ? "OPEN THE FEED" : "NOTHING NEW"}</button>`;
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
    state.minute = Math.min(state.minute, END_MINUTE);
    state.ending = chooseEnding();
    save();
    renderEnding();
  }

  function bar(label, value, className) {
    return `<div class="ending-bar"><span>${label}</span><div><i class="${className}" style="width:${value}%"></i></div><b>${value}</b></div>`;
  }

  function renderEnding() {
    const ending = content.endings.find(item => item.id === state.ending) || content.endings.at(-1);
    setScene("ending");
    setChrome(false);
    taskLine.textContent = "This ending describes a fictional route, not a score of the player.";
    screen.innerHTML = `
      <section class="ending-screen">
        <div class="ending-copy">
          <span class="micro">MONDAY · ${formatTime(state.minute)}</span>
          <h1>${ending.title}</h1>
          ${ending.text.map(paragraph => `<p>${paragraph}</p>`).join("")}
          <blockquote>${ending.reflection}</blockquote>
          <div class="button-row">
            <button class="primary-button" id="seeRoute" type="button">SEE MY ROUTE</button>
            <button class="secondary-button" id="playAgain" type="button">PLAY ANOTHER MONDAY</button>
          </div>
        </div>
        <aside class="ending-summary">
          <span class="micro">HOW THE EVENING MOVED</span>
          ${bar("Project", state.stats.project, "project-fill")}
          ${bar("Connection", state.stats.connection, "connection-fill")}
          ${bar("Personal", state.stats.personal, "personal-fill")}
          <div class="route-count"><strong>${state.visitedLocations.length}</strong><span>places visited</span></div>
          <div class="route-count"><strong>${state.notes.length}</strong><span>moments recorded</span></div>
        </aside>
      </section>`;
    document.getElementById("seeRoute").onclick = openJournal;
    document.getElementById("playAgain").onclick = () => {
      const sound = state.sound;
      state = freshState();
      state.sound = sound;
      save();
      renderTitle();
    };
  }

  mapButton.onclick = () => { if (state.screen !== "event" && state.screen !== "ending") renderMap(); };
  soundButton.onclick = () => {
    state.sound = !state.sound;
    soundButton.textContent = state.sound ? "SOUND ON" : "SOUND OFF";
    soundButton.setAttribute("aria-pressed", String(state.sound));
    save();
    beep(620, 0.06);
  };
  journalButton.onclick = openJournal;
  closeJournal.onclick = () => journalDialog.close();
  closePhone.onclick = () => phoneDialog.close();
  journalDialog.addEventListener("click", event => { if (event.target === journalDialog) journalDialog.close(); });
  phoneDialog.addEventListener("click", event => { if (event.target === phoneDialog) phoneDialog.close(); });

  load();
  soundButton.textContent = state.sound ? "SOUND ON" : "SOUND OFF";
  soundButton.setAttribute("aria-pressed", String(state.sound));
  renderTitle();
})();

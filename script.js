
"use strict";

/* STUDYX — SMART STUDY OS
   Static GitHub Pages build. Data is saved in this browser.
*/

const $ = id => document.getElementById(id);
const STORE = "studyx_smart_os_v1";

const blankData = () => ({
  profile: null,
  tasks: [],
  flashcards: [],
  questions: [],
  quizAttempts: [],
  notes: [],
  resources: [],
  exams: [],
  focusMinutes: 0,
  achievements: [],
  school: "",
  about: "",
  photo: "",
  plan: "Free",
  theme: "dark"
});

function loadData() {
  try {
    const saved = JSON.parse(localStorage.getItem(STORE));
    return saved && typeof saved === "object"
      ? { ...blankData(), ...saved }
      : blankData();
  } catch {
    return blankData();
  }
}

let data = loadData();
let currentPage = "dashboard";
let cardIndex = 0;
let cardFlipped = false;
let quizIndex = 0;
let selectedOption = null;
let quizChecked = false;
let timerSeconds = 25 * 60;
let selectedMinutes = 25;
let timerInterval = null;
let timerRunning = false;
let toastTimeout = null;

function save() {
  try {
    localStorage.setItem(STORE, JSON.stringify(data));
    return true;
  } catch (error) {
    notify("Storage is full. Export your data or remove large photos.");
    console.error(error);
    return false;
  }
}

function escapeHTML(value) {
  return String(value ?? "").replace(/[&<>"']/g, ch => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;",
    '"': "&quot;", "'": "&#39;"
  })[ch]);
}

function makeId() {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
}

function notify(message) {
  const el = $("toast");
  el.textContent = message;
  el.classList.add("show");
  clearTimeout(toastTimeout);
  toastTimeout = setTimeout(() => el.classList.remove("show"), 2800);
}

function dateLabel(value) {
  if (!value) return "No due date";
  const date = new Date(value + "T12:00:00");
  return Number.isNaN(date.getTime())
    ? value
    : date.toLocaleDateString(undefined, {
        day: "numeric", month: "short", year: "numeric"
      });
}

function todayString() {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;
}

function safeExternalURL(value) {
  try {
    const url = new URL(value);
    return ["https:", "http:"].includes(url.protocol) ? url.href : null;
  } catch {
    return null;
  }
}

function youtubeURL(url) {
  try {
    const parsed = new URL(url);
    if (parsed.hostname === "youtu.be") {
      const id = parsed.pathname.slice(1);
      return id ? `https://www.youtube.com/watch?v=${encodeURIComponent(id)}` : null;
    }
    if (["youtube.com", "www.youtube.com", "m.youtube.com", "music.youtube.com"].includes(parsed.hostname)) {
      if (parsed.pathname === "/watch" && parsed.searchParams.get("v")) {
        return `https://www.youtube.com/watch?v=${encodeURIComponent(parsed.searchParams.get("v"))}`;
      }
      const match = parsed.pathname.match(/^\/(embed|shorts|live)\/([A-Za-z0-9_-]+)/);
      if (match) return `https://www.youtube.com/watch?v=${match[2]}`;
    }
    return null;
  } catch {
    return null;
  }
}

function setTheme() {
  document.body.classList.toggle("light", data.theme === "light");
  $("themeBtn").textContent = data.theme === "light" ? "☾" : "☼";
}

function updateProfile() {
  const profile = data.profile;
  if (!profile) return;
  $("topName").textContent = profile.name;
  $("avatar").textContent = profile.name.trim().charAt(0).toUpperCase() || "S";
  $("greeting").textContent = `Let's make today count, ${profile.name.split(" ")[0]}.`;
  $("studentName").textContent = profile.name;
  $("studentDetails").textContent = `${profile.className} · ${profile.board}`;
  $("studentCode").textContent = `SX-${String(profile.created || 1).slice(-6).toUpperCase()}`;
  $("studentAvatar").innerHTML = data.photo
    ? `<img src="${data.photo}" alt="Student profile photo">`
    : escapeHTML(profile.name.charAt(0).toUpperCase());
  $("schoolName").value = data.school || "";
  $("studentAbout").value = data.about || "";
}

function startApp() {
  $("onboarding").classList.add("hidden");
  $("app").classList.remove("hidden");
  setTheme();
  updateProfile();
  renderAll();
  navigate("dashboard", false);
}

$("profileForm").addEventListener("submit", event => {
  event.preventDefault();
  const name = $("profileName").value.trim();
  const age = Number($("profileAge").value);
  const className = $("profileClass").value.trim();
  const board = $("profileBoard").value;

  if (!name || age < 5 || age > 100 || !className) {
    notify("Please complete your profile correctly.");
    return;
  }

  data.profile = { name, age, className, board, created: Date.now() };
  save();
  startApp();
  notify(`Welcome to StudyX, ${name}!`);
});

function navigate(page, closeMenu = true) {
  const target = $("page-" + page);
  if (!target) return;

  currentPage = page;
  document.querySelectorAll(".page").forEach(el => el.classList.remove("active"));
  target.classList.add("active");

  document.querySelectorAll("[data-page]").forEach(button => {
    button.classList.toggle("active", button.dataset.page === page);
  });

  const labels = {
    dashboard: "Dashboard", planner: "Study planner",
    flashcards: "Flashcards", quiz: "Quiz lab", notes: "Smart notes",
    resources: "Video library", focus: "Focus room",
    exams: "Exam countdown", analytics: "Analytics",
    student: "Student ID", membership: "Membership", settings: "Settings"
  };

  $("pageLabel").textContent = labels[page] || page;
  if (closeMenu) $("sidebar").classList.remove("open");
  window.scrollTo({ top: 0, behavior: "smooth" });

  if (page === "flashcards") renderFlashcards();
  if (page === "quiz") renderQuiz();
  if (page === "student") renderAchievements();
  if (page === "analytics") renderAnalytics();
}

document.addEventListener("click", event => {
  const pageButton = event.target.closest("[data-page]");
  if (pageButton) navigate(pageButton.dataset.page);
});

$("menuBtn").addEventListener("click", () => {
  $("sidebar").classList.toggle("open");
});

$("mobileMore").addEventListener("click", () => {
  $("sidebar").classList.toggle("open");
});

$("profileShortcut").addEventListener("click", () => navigate("student"));
$("topProfile").addEventListener("click", () => navigate("student"));

$("themeBtn").addEventListener("click", () => {
  data.theme = data.theme === "light" ? "dark" : "light";
  save();
  setTheme();
});

/* TASK PLANNER */

$("taskForm").addEventListener("submit", event => {
  event.preventDefault();
  data.tasks.unshift({
    id: makeId(),
    title: $("taskTitle").value.trim(),
    subject: $("taskSubject").value.trim(),
    due: $("taskDate").value,
    done: false,
    created: Date.now()
  });
  save();
  event.target.reset();
  renderAll();
  notify("Study task added.");
});

function toggleTask(id, checked) {
  const task = data.tasks.find(item => item.id === id);
  if (!task) return;
  task.done = checked;
  save();
  renderAll();
}

function deleteItem(collection, id) {
  if (!Array.isArray(data[collection])) return;
  data[collection] = data[collection].filter(item => item.id !== id);

  if (collection === "flashcards") {
    cardIndex = Math.min(cardIndex, Math.max(0, data.flashcards.length - 1));
    cardFlipped = false;
  }

  if (collection === "questions") {
    quizIndex = Math.min(quizIndex, Math.max(0, data.questions.length - 1));
    selectedOption = null;
    quizChecked = false;
  }

  save();
  renderAll();
  notify("Item removed.");
}

function renderTasks() {
  const completed = data.tasks.filter(task => task.done).length;
  $("statTasks").innerHTML = `${completed} <small>/ ${data.tasks.length}</small>`;
  $("taskProgress").style.width = data.tasks.length
    ? `${completed / data.tasks.length * 100}%`
    : "0%";
  $("taskCount").textContent = `${completed} completed · ${data.tasks.length} total`;

  const taskHTML = task => `
    <div class="item-row">
      <input class="task-check" type="checkbox" data-task-check="${escapeHTML(task.id)}" ${task.done ? "checked" : ""} aria-label="Mark ${escapeHTML(task.title)} complete">
      <div class="item-main">
        <h3 style="${task.done ? "text-decoration:line-through;opacity:.6" : ""}">${escapeHTML(task.title)}</h3>
        <p>${escapeHTML(task.subject)} · ${escapeHTML(dateLabel(task.due))}</p>
      </div>
      <button class="small-btn delete" data-delete="tasks" data-id="${escapeHTML(task.id)}">Delete</button>
    </div>`;

  $("taskList").innerHTML = data.tasks.length
    ? data.tasks.map(taskHTML).join("")
    : `<div class="panel empty-state">No tasks yet. Add your first study task above.</div>`;

  const upcoming = data.tasks.filter(task => !task.done).slice(0, 4);
  $("dashboardTasks").innerHTML = upcoming.length
    ? upcoming.map(task => `
      <div class="compact-row">
        <input type="checkbox" class="task-check" data-task-check="${escapeHTML(task.id)}" aria-label="Complete task">
        <div class="grow"><b>${escapeHTML(task.title)}</b><small>${escapeHTML(task.subject)} · ${escapeHTML(dateLabel(task.due))}</small></div>
      </div>`).join("")
    : `<div class="empty-state">You're all caught up. Add a task to plan your next session.</div>`;
}

/* FLASHCARDS */

$("flashForm").addEventListener("submit", event => {
  event.preventDefault();
  data.flashcards.push({
    id: makeId(),
    subject: $("flashSubject").value.trim(),
    question: $("flashQuestion").value.trim(),
    answer: $("flashAnswer").value.trim(),
    difficulty: "new",
    created: Date.now()
  });
  save();
  event.target.reset();
  cardIndex = data.flashcards.length - 1;
  cardFlipped = false;
  renderAll();
  notify("Flashcard saved.");
});

function renderStudyCard() {
  const cards = data.flashcards;
  $("cardPosition").textContent = cards.length
    ? `${cardIndex + 1} / ${cards.length}`
    : "0 cards";

  $("prevCard").disabled = !cards.length || cardIndex <= 0;
  $("nextCard").disabled = !cards.length || cardIndex >= cards.length - 1;
  $("flipCard").disabled = !cards.length;
  $("markHard").disabled = !cards.length;
  $("markKnown").disabled = !cards.length;

  if (!cards.length) {
    $("studyCard").innerHTML = `<div class="empty-state">Create a flashcard to begin your revision.</div>`;
    return;
  }

  const card = cards[cardIndex];
  $("studyCard").innerHTML = `
    <div>
      <div class="flash-label">${cardFlipped ? "ANSWER" : "QUESTION"} · ${escapeHTML(card.subject)}</div>
      <div class="flash-content">${escapeHTML(cardFlipped ? card.answer : card.question)}</div>
      <p class="tiny muted" style="margin:20px 0 0">Card status: ${escapeHTML(card.difficulty)}</p>
    </div>`;
  $("flipCard").textContent = cardFlipped ? "Show question" : "Reveal answer";
}

function renderFlashcards() {
  $("statCards").textContent = data.flashcards.length;
  renderStudyCard();

  $("flashList").innerHTML = data.flashcards.length
    ? data.flashcards.map((card, index) => `
      <div class="item-row">
        <div class="item-main">
          <h3>${escapeHTML(card.question)}</h3>
          <p>${escapeHTML(card.subject)} · ${escapeHTML(card.difficulty)}</p>
        </div>
        <div class="item-actions">
          <button class="small-btn" data-study="${index}">Study</button>
          <button class="small-btn delete" data-delete="flashcards" data-id="${escapeHTML(card.id)}">Delete</button>
        </div>
      </div>`).join("")
    : `<div class="panel empty-state">Your flashcard collection will appear here.</div>`;
}

$("flipCard").addEventListener("click", () => {
  if (!data.flashcards.length) return;
  cardFlipped = !cardFlipped;
  renderStudyCard();
});

$("studyCard").addEventListener("click", () => {
  if (!data.flashcards.length) return;
  cardFlipped = !cardFlipped;
  renderStudyCard();
});

$("prevCard").addEventListener("click", () => {
  if (cardIndex > 0) {
    cardIndex--;
    cardFlipped = false;
    renderStudyCard();
  }
});

$("nextCard").addEventListener("click", () => {
  if (cardIndex < data.flashcards.length - 1) {
    cardIndex++;
    cardFlipped = false;
    renderStudyCard();
  }
});

function rateCard(status) {
  if (!data.flashcards.length) return;
  data.flashcards[cardIndex].difficulty = status;
  save();

  if (cardIndex < data.flashcards.length - 1) cardIndex++;
  cardFlipped = false;
  renderFlashcards();
  notify(status === "known" ? "Marked as known." : "Marked for extra practice.");
}

$("markHard").addEventListener("click", () => rateCard("practice"));
$("markKnown").addEventListener("click", () => rateCard("known"));

/* QUIZ LAB */

$("quizForm").addEventListener("submit", event => {
  event.preventDefault();

  const question = $("quizQuestion").value.trim();
  const options = [0, 1, 2, 3].map(index => $(`opt${index}`).value.trim());
  if (!question || options.some(option => !option)) {
    notify("Complete the question and all four options.");
    return;
  }

  data.questions.push({
    id: makeId(),
    question,
    options,
    correct: Number($("correctOption").value)
  });

  save();
  event.target.reset();
  quizIndex = data.questions.length - 1;
  selectedOption = null;
  quizChecked = false;
  renderAll();
  notify("Question added to your quiz bank.");
});

function renderQuiz() {
  const questions = data.questions;
  $("quizPosition").textContent = questions.length
    ? `${quizIndex + 1} / ${questions.length}`
    : "0 questions";

  $("checkQuiz").disabled = !questions.length || selectedOption === null || quizChecked;
  $("nextQuiz").disabled = !questions.length;

  if (!questions.length) {
    $("quizArea").innerHTML = `<div class="empty-state">Add a question or load the sample quiz to get started.</div>`;
  } else {
    const question = questions[quizIndex];
    $("quizArea").innerHTML = `
      <p class="eyebrow">QUESTION ${quizIndex + 1}</p>
      <div class="quiz-question">${escapeHTML(question.question)}</div>
      <div class="quiz-options">
        ${question.options.map((option, index) => {
          let classes = "quiz-option";
          if (selectedOption === index) classes += " selected";
          if (quizChecked && index === question.correct) classes += " correct";
          if (quizChecked && selectedOption === index && index !== question.correct) classes += " incorrect";
          return `<button class="${classes}" data-option="${index}" ${quizChecked ? "disabled" : ""}>
            <span>${"ABCD"[index]}</span><span>${escapeHTML(option)}</span>
          </button>`;
        }).join("")}
      </div>`;

    if (quizChecked) {
      $("quizFeedback").textContent = selectedOption === question.correct
        ? "Correct! Great work."
        : `Not quite. The correct answer is ${"ABCD"[question.correct]}: ${question.options[question.correct]}`;
    }
  }

  $("quizList").innerHTML = questions.length
    ? questions.map((question, index) => `
      <div class="item-row">
        <div class="item-main"><h3>${escapeHTML(question.question)}</h3><p>${question.options.length} options</p></div>
        <div class="item-actions">
          <button class="small-btn" data-qstudy="${index}">Practice</button>
          <button class="small-btn delete" data-delete="questions" data-id="${escapeHTML(question.id)}">Delete</button>
        </div>
      </div>`).join("")
    : `<div class="panel empty-state">Your custom question bank will appear here.</div>`;
}

$("quizArea").addEventListener("click", event => {
  const option = event.target.closest("[data-option]");
  if (!option || quizChecked) return;
  selectedOption = Number(option.dataset.option);
  $("quizFeedback").textContent = "";
  renderQuiz();
});

$("checkQuiz").addEventListener("click", () => {
  if (selectedOption === null || quizChecked || !data.questions.length) return;

  const question = data.questions[quizIndex];
  const correct = selectedOption === question.correct;
  data.quizAttempts.push({ correct, date: todayString() });
  quizChecked = true;
  save();
  renderQuiz();
  renderDashboardStats();
});

$("nextQuiz").addEventListener("click", () => {
  if (!data.questions.length) return;
  quizIndex = (quizIndex + 1) % data.questions.length;
  selectedOption = null;
  quizChecked = false;
  $("quizFeedback").textContent = "";
  renderQuiz();
});

$("sampleQuiz").addEventListener("click", () => {
  const samples = [
    { question: "What is 7 × 8?", options: ["54", "56", "64", "48"], correct: 1 },
    { question: "Which planet is known as the Red Planet?", options: ["Venus", "Jupiter", "Mars", "Mercury"], correct: 2 },
    { question: "What is the basic unit of life?", options: ["Atom", "Tissue", "Organ", "Cell"], correct: 3 }
  ];

  samples.forEach(sample => {
    if (!data.questions.some(q => q.question === sample.question)) {
      data.questions.push({ ...sample, id: makeId() });
    }
  });

  quizIndex = 0;
  selectedOption = null;
  quizChecked = false;
  save();
  renderAll();
  notify("Sample questions loaded.");
});

/* NOTES */

$("noteForm").addEventListener("submit", event => {
  event.preventDefault();
  data.notes.unshift({
    id: makeId(),
    title: $("noteTitle").value.trim(),
    subject: $("noteSubject").value.trim(),
    body: $("noteBody").value.trim(),
    created: Date.now()
  });
  save();
  event.target.reset();
  renderNotes();
  notify("Note saved.");
});

function renderNotes() {
  const query = $("noteSearch").value.trim().toLowerCase();
  const notes = data.notes.filter(note =>
    `${note.title} ${note.subject} ${note.body}`.toLowerCase().includes(query)
  );

  $("noteList").innerHTML = notes.length
    ? notes.map(note => `
      <article class="note-card">
        <div class="note-meta">${escapeHTML(note.subject)} · ${dateLabel(new Date(note.created).toISOString().slice(0, 10))}</div>
        <h3>${escapeHTML(note.title)}</h3>
        <div class="note-body">${escapeHTML(note.body)}</div>
        <div class="item-actions" style="margin-top:15px">
          <button class="small-btn" data-export-note="${escapeHTML(note.id)}">Export .txt</button>
          <button class="small-btn delete" data-delete="notes" data-id="${escapeHTML(note.id)}">Delete</button>
        </div>
      </article>`).join("")
    : `<div class="panel empty-state">No matching notes. Create a new note above.</div>`;
}

$("noteSearch").addEventListener("input", renderNotes);

/* VIDEO AND WEBSITE LIBRARY */

$("resourceForm").addEventListener("submit", event => {
  event.preventDefault();
  const url = safeExternalURL($("resourceUrl").value.trim());

  if (!url) {
    notify("Please enter a valid HTTP or HTTPS link.");
    return;
  }

  data.resources.unshift({
    id: makeId(),
    title: $("resourceTitle").value.trim(),
    url,
    subject: $("resourceSubject").value.trim() || "General",
    created: Date.now()
  });

  save();
  event.target.reset();
  renderResources();
  notify("Resource saved.");
});

function renderResources() {
  $("resourceList").innerHTML = data.resources.length
    ? data.resources.map(resource => `
      <div class="item-row">
        <div class="stat-icon cyan-bg">▷</div>
        <div class="item-main">
          <h3>${escapeHTML(resource.title)}</h3>
          <p>${escapeHTML(resource.subject)}</p>
          <a class="resource-link" href="${escapeHTML(resource.url)}" target="_blank" rel="noopener noreferrer">${escapeHTML(resource.url)}</a>
        </div>
        <div class="item-actions">
          <button class="small-btn" data-open-resource="${escapeHTML(resource.id)}">Open ↗</button>
          <button class="small-btn delete" data-delete="resources" data-id="${escapeHTML(resource.id)}">Delete</button>
        </div>
      </div>`).join("")
    : `<div class="panel empty-state">Save your first educational video or website above.</div>`;
}

/* FOCUS TIMER */

function updateTimerDisplay() {
  const minutes = Math.floor(timerSeconds / 60);
  const seconds = timerSeconds % 60;
  $("timerDisplay").textContent = `${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
}

function stopTimer() {
  if (timerInterval) clearInterval(timerInterval);
  timerInterval = null;
  timerRunning = false;
}

function resetTimer() {
  stopTimer();
  timerSeconds = selectedMinutes * 60;
  updateTimerDisplay();
  $("timerStatus").textContent = "Ready when you are.";
  $("timerStart").disabled = false;
}

function startTimer() {
  if (timerRunning) return;

  if (timerSeconds <= 0) resetTimer();
  timerRunning = true;
  $("timerStatus").textContent = "Focus mode is active. Keep going.";
  $("timerStart").disabled = true;

  timerInterval = setInterval(() => {
    timerSeconds--;
    updateTimerDisplay();

    if (timerSeconds <= 0) {
      stopTimer();
      data.focusMinutes += selectedMinutes;
      save();
      renderDashboardStats();
      $("timerStatus").textContent = "Session complete! Take a short break.";
      $("timerStart").disabled = false;
      notify(`Focus session complete: ${selectedMinutes} minutes.`);
    }
  }, 1000);
}

$("timerStart").addEventListener("click", startTimer);
$("timerPause").addEventListener("click", () => {
  stopTimer();
  $("timerStatus").textContent = "Session paused. Resume when ready.";
  $("timerStart").disabled = false;
});
$("timerReset").addEventListener("click", resetTimer);

document.querySelectorAll("[data-minutes]").forEach(button => {
  button.addEventListener("click", () => {
    selectedMinutes = Number(button.dataset.minutes);
    document.querySelectorAll("[data-minutes]").forEach(item =>
      item.classList.toggle("selected", item === button)
    );
    resetTimer();
  });
});

/* EXAM COUNTDOWN */

$("examForm").addEventListener("submit", event => {
  event.preventDefault();
  const title = $("examTitle").value.trim();
  const date = $("examDate").value;

  if (!date || date < todayString()) {
    notify("Choose today or a future exam date.");
    return;
  }

  data.exams.push({ id: makeId(), title, date });
  save();
  event.target.reset();
  renderExams();
  notify("Exam added to your countdown.");
});

function renderExams() {
  const sorted = [...data.exams].sort((a, b) => a.date.localeCompare(b.date));

  $("examList").innerHTML = sorted.length
    ? sorted.map(exam => {
      const days = Math.round(
        (new Date(exam.date + "T12:00:00") - new Date(todayString() + "T12:00:00")) / 86400000
      );
      const message = days === 0 ? "Your exam is today." :
        days === 1 ? "One day to go." : `${days} days remaining.`;

      return `<article class="exam-card">
        <div class="panel-heading"><span class="pill">${escapeHTML(dateLabel(exam.date))}</span>
          <button class="small-btn delete" data-delete="exams" data-id="${escapeHTML(exam.id)}">Delete</button>
        </div>
        <h3>${escapeHTML(exam.title)}</h3>
        <div class="exam-days">${days === 0 ? "Today" : days}</div>
        <p>${escapeHTML(message)}</p>
      </article>`;
    }).join("")
    : `<div class="panel empty-state">No exams added yet. Add an exam date to get started.</div>`;
}

/* ANALYTICS */

function renderDashboardStats() {
  const attempts = data.quizAttempts;
  const accuracy = attempts.length
    ? Math.round(attempts.filter(item => item.correct).length / attempts.length * 100)
    : null;

  $("statAccuracy").textContent = accuracy === null ? "—" : `${accuracy}%`;
  $("statFocus").textContent = data.focusMinutes;
  $("anaTasks").textContent = data.tasks.filter(task => task.done).length;
  $("anaCards").textContent = data.flashcards.length;
  $("anaAccuracy").textContent = accuracy === null ? "—" : `${accuracy}%`;
  $("anaFocus").textContent = data.focusMinutes;
}

function renderAnalytics() {
  renderDashboardStats();

  const metrics = [
    { name: "Tasks done", value: data.tasks.filter(task => task.done).length, total: data.tasks.length },
    { name: "Flashcards", value: data.flashcards.length, total: Math.max(data.flashcards.length, 1) },
    { name: "Quiz attempts", value: data.quizAttempts.length, total: Math.max(data.quizAttempts.length, 1) },
    { name: "Focus minutes", value: data.focusMinutes, total: Math.max(data.focusMinutes, 1) }
  ];

  $("analyticsBars").innerHTML = metrics.map(metric => {
    const width = Math.min(100, metric.value / Math.max(metric.total, 1) * 100);
    return `<div class="bar-row">
      <span>${escapeHTML(metric.name)}</span>
      <div class="bar-track"><i style="width:${width}%"></i></div>
      <b>${metric.value}</b>
    </div>`;
  }).join("");
}

/* STUDENT PROFILE AND ACHIEVEMENTS */

$("studentForm").addEventListener("submit", async event => {
  event.preventDefault();

  data.school = $("schoolName").value.trim();
  data.about = $("studentAbout").value.trim();

  const photoFile = $("photoInput").files[0];
  if (photoFile) {
    if (!photoFile.type.startsWith("image/")) {
      notify("Please select an image.");
      return;
    }

    if (photoFile.size > 700 * 1024) {
      notify("Please choose an image under 700 KB to fit local storage.");
      return;
    }

    try {
      data.photo = await new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result);
        reader.onerror = reject;
        reader.readAsDataURL(photoFile);
      });
    } catch {
      notify("Could not read that image.");
      return;
    }
  }

  const achievement = $("achievementTitle").value.trim();
  if (achievement) {
    data.achievements.unshift({ id: makeId(), title: achievement, date: todayString() });
  }

  save();
  updateProfile();
  renderAchievements();
  event.target.reset();
  $("schoolName").value = data.school;
  $("studentAbout").value = data.about;
  notify("Student profile saved.");
});

function renderAchievements() {
  $("achievementList").innerHTML = data.achievements.length
    ? data.achievements.map(item => `
      <div class="item-row">
        <div class="stat-icon violet-bg">✦</div>
        <div class="item-main"><h3>${escapeHTML(item.title)}</h3><p>${escapeHTML(dateLabel(item.date))}</p></div>
        <button class="small-btn delete" data-delete="achievements" data-id="${escapeHTML(item.id)}">Delete</button>
      </div>`).join("")
    : `<div class="empty-state">Your achievements will appear here.</div>`;
}

/* MEMBERSHIP DEMO */

document.querySelectorAll("[data-plan]").forEach(button => {
  button.addEventListener("click", () => {
    const plan = button.dataset.plan;

    if (plan !== "Free") {
      notify("Demo only: payment is not connected. No money has been charged.");
      return;
    }

    data.plan = "Free";
    save();
    notify("Free plan selected.");
  });
});

/* GLOBAL ITEM ACTIONS */

document.addEventListener("change", event => {
  if (event.target.matches("[data-task-check]")) {
    toggleTask(event.target.dataset.taskCheck, event.target.checked);
  }
});

document.addEventListener("click", event => {
  const deleteButton = event.target.closest("[data-delete]");
  if (deleteButton) {
    const collection = deleteButton.dataset.delete;
    const id = deleteButton.dataset.id;
    if (confirm("Delete this item?")) deleteItem(collection, id);
    return;
  }

  const studyButton = event.target.closest("[data-study]");
  if (studyButton) {
    cardIndex = Number(studyButton.dataset.study);
    cardFlipped = false;
    renderStudyCard();
    return;
  }

  const questionButton = event.target.closest("[data-qstudy]");
  if (questionButton) {
    quizIndex = Number(questionButton.dataset.qstudy);
    selectedOption = null;
    quizChecked = false;
    $("quizFeedback").textContent = "";
    renderQuiz();
    return;
  }

  const openResource = event.target.closest("[data-open-resource]");
  if (openResource) {
    const resource = data.resources.find(item => item.id === openResource.dataset.openResource);
    if (!resource) return;
    const url = youtubeURL(resource.url) || safeExternalURL(resource.url);
    if (url) window.open(url, "_blank", "noopener,noreferrer");
    else notify("This link is not valid.");
    return;
  }

  const exportNote = event.target.closest("[data-export-note]");
  if (exportNote) {
    const note = data.notes.find(item => item.id === exportNote.dataset.exportNote);
    if (!note) return;
    downloadFile(
      `${note.title.replace(/[^a-z0-9-_ ]/gi, "_")}.txt`,
      `${note.title}\nSubject: ${note.subject}\n\n${note.body}`,
      "text/plain;charset=utf-8"
    );
  }
});

/* BACKUP AND RESTORE */

function downloadFile(filename, content, type) {
  const blob = new Blob([content], { type });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

$("exportBtn").addEventListener("click", () => {
  downloadFile(
    `studyx-backup-${todayString()}.json`,
    JSON.stringify(data, null, 2),
    "application/json"
  );
  notify("Backup export started.");
});

$("importInput").addEventListener("change", async event => {
  const file = event.target.files[0];
  if (!file) return;

  try {
    const imported = JSON.parse(await file.text());
    const required = ["tasks", "flashcards", "questions", "notes", "resources", "exams", "achievements", "quizAttempts"];

    if (!imported || typeof imported !== "object" ||
        !required.every(key => Array.isArray(imported[key]))) {
      throw new Error("This file is not a valid StudyX backup.");
    }

    if (!confirm("Import this backup and replace your current StudyX data? Export your current data first if you want to keep it.")) {
      event.target.value = "";
      return;
    }

    data = { ...blankData(), ...imported };
    if (!data.profile) {
      save();
      location.reload();
      return;
    }

    save();
    setTheme();
    updateProfile();
    renderAll();
    notify("Backup restored.");
  } catch (error) {
    notify(error.message || "Could not import that file.");
  }

  event.target.value = "";
});

$("resetBtn").addEventListener("click", () => {
  if (!confirm("Permanently erase all StudyX data stored in this browser? Export a backup first if needed.")) return;
  stopTimer();
  localStorage.removeItem(STORE);
  data = blankData();
  location.reload();
});

$("restartOnboarding").addEventListener("click", () => {
  if (!confirm("Return to profile setup? Your saved study data will remain.")) return;
  $("app").classList.add("hidden");
  $("onboarding").classList.remove("hidden");
  if (data.profile) {
    $("profileName").value = data.profile.name;
    $("profileAge").value = data.profile.age;
    $("profileClass").value = data.profile.className;
    $("profileBoard").value = data.profile.board;
  }
});

/* RENDER */

function renderAll() {
  renderTasks();
  renderFlashcards();
  renderQuiz();
  renderNotes();
  renderResources();
  renderExams();
  renderDashboardStats();
  renderAnalytics();
  renderAchievements();
  updateProfile();
}

setTheme();

if (data.profile) {
  startApp();
} else {
  $("onboarding").classList.remove("hidden");
  $("app").classList.add("hidden");
}

window.addEventListener("beforeunload", () => {
  if (timerInterval) clearInterval(timerInterval);
});

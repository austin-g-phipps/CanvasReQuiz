import './style.css';
import { collectQuestionsFromUploads } from './browser-quiz-builder.js';

const DEFAULT_AI_CONFIG = window.PRACTICE_QUIZ_AI_CONFIG || {};
const AI_STORAGE_KEY = 'practiceQuizAiConfig';

document.querySelector('#app').innerHTML = `
  <header class="topbar">
    <div class="topbar-inner">
      <h1>CanvasReQuiz</h1>
      <p>Upload saved Canvas quiz reviews, build a practice bank in the browser, then study missed questions, random rounds, or AI-generated review prompts.</p>
    </div>
  </header>

  <main class="page">
    <section class="start-shell" id="start-shell">
      <div class="start-card">
        <div class="start-head">
          <h2>Start By Uploading Your Canvas Quizzes</h2>
          <p>This deployment starts empty on purpose. Build your own quiz set from saved Canvas review pages, directly in the browser.</p>
        </div>

        <section class="upload-shell">
          <div class="upload-grid">
            <article class="instruction-card">
              <div class="section-eyebrow">Before Uploading</div>
              <h3>Prepare each quiz like this</h3>
              <ol class="instruction-list">
                <li>Open the graded Canvas quiz review page you want to study and press <code>Ctrl+S</code> to save the page.</li>
                <li>Rename the saved HTML file to something like <code>quiz1.html</code>.</li>
                <li>Rename the matching asset folder to something like <code>quiz1contextFolder</code>.</li>
                <li>Put each HTML file and its matching context folder into one local parent folder, the same way you would place them in the project root when running locally.</li>
                <li>Upload that parent folder below, then press <strong>Build Quizzes</strong>.</li>
              </ol>
              <div class="inline-note">The browser app cannot write into a real project root on a deployed site, so it recreates that root-style layout in memory after upload.</div>
            </article>

            <article class="upload-card">
              <div class="section-eyebrow">Upload Package</div>
              <h3>Choose a folder that contains your quiz HTML files and context folders</h3>
              <p class="upload-copy">Example package contents: <code>quiz1.html</code>, <code>quiz1contextFolder/</code>, <code>quiz2.html</code>, <code>quiz2contextFolder/</code>.</p>
              <label class="upload-drop" for="package-upload">
                <input id="package-upload" type="file" webkitdirectory directory multiple>
                <span class="upload-title">Select quiz package folder</span>
                <span class="upload-subtitle">All processing stays in your browser. No server-side quiz upload is required.</span>
              </label>
              <div class="button-row upload-actions">
                <button class="button-primary" id="build-button" type="button" disabled>Build Quizzes</button>
                <button class="button-secondary" id="clear-upload-button" type="button" disabled>Clear Uploads</button>
              </div>
              <div class="build-status" id="build-status" aria-live="polite">No quiz package loaded yet.</div>
            </article>
          </div>

          <div class="upload-summary-card">
            <div class="upload-summary-head">
              <div>
                <div class="section-eyebrow">Current Upload</div>
                <h3>Package Summary</h3>
              </div>
              <div class="pill-row">
                <div class="pill" id="uploaded-html-pill">0 html files</div>
                <div class="pill" id="uploaded-folder-pill">0 folders</div>
                <div class="pill" id="uploaded-file-pill">0 total files</div>
              </div>
            </div>
            <div class="upload-list empty" id="upload-list">Select a folder to see the discovered HTML files and asset folders.</div>
          </div>
        </section>

        <div class="start-tabs" role="tablist" aria-label="Study mode groups">
          <button class="start-tab active" id="study-tab-button" type="button" role="tab" aria-selected="true" aria-controls="study-panel">Study Modes</button>
          <button class="start-tab" id="ai-tab-button" type="button" role="tab" aria-selected="false" aria-controls="ai-panel-tab">AI Mode <span class="beta-badge">Beta</span></button>
        </div>

        <div class="start-panel active" id="study-panel" role="tabpanel" aria-labelledby="study-tab-button">
          <div class="mode-grid">
            <div class="mode-card">
              <h3>Missed Before</h3>
              <p>Builds a review round from questions Canvas marked incorrect in your uploaded quiz package.</p>
              <div class="mode-stats">
                <div class="pill" id="start-missed-count">0 previously missed questions</div>
              </div>
              <button class="button-primary" id="start-missed-button" type="button" disabled>Start Missed-Only Quiz</button>
            </div>

            <div class="mode-card">
              <h3>All Questions</h3>
              <p>Builds a 20-question random round from every supported question found in your uploaded quizzes.</p>
              <div class="mode-stats">
                <div class="pill" id="start-all-count">0 total supported questions</div>
                <div class="pill">20 random questions per run</div>
              </div>
              <button class="button-primary" id="start-all-button" type="button" disabled>Start 20 Random Questions</button>
            </div>
          </div>
        </div>

        <div class="start-panel" id="ai-panel-tab" role="tabpanel" aria-labelledby="ai-tab-button">
          <div class="mode-card">
            <h3>AI-Generated Review <span class="beta-badge">Beta</span></h3>
            <p>Uses your missed questions as source material, then asks Codex or Gemini to create similar fresh prompts.</p>
            <div class="mode-stats">
              <div class="pill" id="start-ai-count">Based on 0 missed source questions</div>
              <div class="pill">Supports OpenAI and Gemini</div>
            </div>
            <div class="ai-panel">
              <div class="provider-stack">
                <div class="provider-card">
                  <h4>OpenAI / Codex</h4>
                  <div class="ai-grid">
                    <div class="field">
                      <label for="ai-token-input">API Token</label>
                      <input id="ai-token-input" type="password" placeholder="sk-..." autocomplete="off">
                      <div class="field-help">Users can paste their own token here. A default can also be set in <code>public/quiz-ai-config.js</code>.</div>
                    </div>
                    <div class="field">
                      <label for="ai-model-input">Model</label>
                      <input id="ai-model-input" type="text" value="gpt-5.2-codex" autocomplete="off">
                      <div class="field-help">Change the model per user if needed.</div>
                    </div>
                  </div>
                </div>

                <div class="provider-card">
                  <h4>Google Gemini</h4>
                  <div class="ai-grid">
                    <div class="field">
                      <label for="gemini-token-input">Gemini API Token</label>
                      <input id="gemini-token-input" type="password" placeholder="AIza..." autocomplete="off">
                      <div class="field-help">If this is filled in, the page uses Gemini instead of OpenAI.</div>
                    </div>
                    <div class="field">
                      <label for="gemini-model-input">Gemini Model</label>
                      <input id="gemini-model-input" type="text" value="gemini-2.5-flash" autocomplete="off">
                      <div class="field-help">This uses Gemini JSON mode through <code>generateContent</code>.</div>
                    </div>
                  </div>
                </div>

                <div class="field">
                  <label for="ai-count-input">Generated Questions</label>
                  <input id="ai-count-input" type="number" min="5" max="20" value="10">
                  <div class="field-help">Choose between 5 and 20 generated questions.</div>
                </div>
              </div>

              <div class="checkbox-row">
                <input id="ai-save-token-input" type="checkbox">
                <label for="ai-save-token-input">Save entered tokens locally in this browser</label>
              </div>

              <div class="inline-note">If a Gemini token is provided, Gemini is used. Otherwise the page falls back to OpenAI/Codex. Any token embedded in a static file is visible to anyone who can read that file.</div>
              <button class="button-primary" id="start-ai-button" type="button" disabled>Generate Similar Questions</button>
              <div class="ai-status" id="ai-status" aria-live="polite"></div>
            </div>
          </div>
        </div>
      </div>
    </section>

    <section class="summary-bar" id="summary-bar">
      <div class="pill-row">
        <div class="pill" id="question-count-pill"></div>
        <div class="pill" id="quiz-count-pill"></div>
        <div class="pill" id="mode-pill"></div>
        <div class="pill">Mode: Canvas-style review</div>
      </div>
    </section>

    <section class="quiz-shell" id="quiz-shell">
      <div class="toolbar">
        <div class="toolbar-note">
          Questions are shuffled each time you start over. The retry flow keeps only the ones you missed on your latest attempt.
        </div>
        <div class="button-row">
          <button class="button-secondary" id="home-button" type="button">Go Home</button>
          <button class="button-primary" id="submit-button" type="button">Submit Quiz</button>
          <button class="button-secondary" id="retry-button" type="button" disabled>Retry Missed Only</button>
          <button class="button-secondary" id="reset-button" type="button">Start Over</button>
        </div>
      </div>
      <section class="result-banner" id="result-banner" aria-live="polite"></section>
      <section class="question-list" id="question-list"></section>
    </section>
  </main>
`;

const state = {
  uploadedEntries: [],
  runtimeObjectUrls: [],
  quizSources: [],
  allQuestions: [],
  missedQuestions: [],
  mode: '',
  sourceQuestions: [],
  activeQuestions: [],
  lastResults: [],
  lastSubmitted: false,
  isGenerating: false,
};

const startShell = document.getElementById('start-shell');
const studyTabButton = document.getElementById('study-tab-button');
const aiTabButton = document.getElementById('ai-tab-button');
const studyPanel = document.getElementById('study-panel');
const aiPanelTab = document.getElementById('ai-panel-tab');
const quizShell = document.getElementById('quiz-shell');
const summaryBar = document.getElementById('summary-bar');
const resultBanner = document.getElementById('result-banner');
const questionList = document.getElementById('question-list');
const questionCountPill = document.getElementById('question-count-pill');
const quizCountPill = document.getElementById('quiz-count-pill');
const modePill = document.getElementById('mode-pill');
const homeButton = document.getElementById('home-button');
const submitButton = document.getElementById('submit-button');
const retryButton = document.getElementById('retry-button');
const resetButton = document.getElementById('reset-button');
const startMissedButton = document.getElementById('start-missed-button');
const startAllButton = document.getElementById('start-all-button');
const startAiButton = document.getElementById('start-ai-button');
const startMissedCount = document.getElementById('start-missed-count');
const startAllCount = document.getElementById('start-all-count');
const startAiCount = document.getElementById('start-ai-count');
const packageUpload = document.getElementById('package-upload');
const buildButton = document.getElementById('build-button');
const clearUploadButton = document.getElementById('clear-upload-button');
const uploadList = document.getElementById('upload-list');
const uploadedHtmlPill = document.getElementById('uploaded-html-pill');
const uploadedFolderPill = document.getElementById('uploaded-folder-pill');
const uploadedFilePill = document.getElementById('uploaded-file-pill');
const buildStatus = document.getElementById('build-status');
const aiTokenInput = document.getElementById('ai-token-input');
const aiModelInput = document.getElementById('ai-model-input');
const geminiTokenInput = document.getElementById('gemini-token-input');
const geminiModelInput = document.getElementById('gemini-model-input');
const aiCountInput = document.getElementById('ai-count-input');
const aiSaveTokenInput = document.getElementById('ai-save-token-input');
const aiStatus = document.getElementById('ai-status');

function escapeHtml(value = '') {
  return String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function plainTextToHtml(value = '') {
  return escapeHtml(String(value).trim()).replace(/\n/g, '<br>');
}

function htmlToText(html = '') {
  const wrapper = document.createElement('div');
  wrapper.innerHTML = html;
  return (wrapper.textContent || wrapper.innerText || '').replace(/\s+/g, ' ').trim();
}

function getStoredAiConfig() {
  try {
    return JSON.parse(localStorage.getItem(AI_STORAGE_KEY) || '{}');
  } catch {
    return {};
  }
}

function saveAiConfig(config) {
  localStorage.setItem(AI_STORAGE_KEY, JSON.stringify(config));
}

function setAiStatus(message, tone = '') {
  aiStatus.className = tone ? `ai-status ${tone}` : 'ai-status';
  aiStatus.textContent = message;
}

function applyAiConfigDefaults() {
  const stored = getStoredAiConfig();
  aiTokenInput.value = stored.openaiApiKey || DEFAULT_AI_CONFIG.defaultApiKey || '';
  aiModelInput.value = stored.openaiModel || DEFAULT_AI_CONFIG.defaultModel || 'gpt-5.2-codex';
  geminiTokenInput.value = stored.geminiApiKey || DEFAULT_AI_CONFIG.defaultGeminiApiKey || '';
  geminiModelInput.value = stored.geminiModel || DEFAULT_AI_CONFIG.defaultGeminiModel || 'gemini-2.5-flash';
  aiCountInput.value = String(stored.count || 10);
  aiSaveTokenInput.checked = Boolean(stored.openaiApiKey || stored.geminiApiKey);
}

function setBuildStatus(message, tone = '') {
  buildStatus.className = tone ? `build-status ${tone}` : 'build-status';
  buildStatus.textContent = message;
}

function normalizeUploadPath(value = '') {
  return String(value)
    .replace(/\\/g, '/')
    .replace(/^\/+/, '')
    .replace(/\/+/g, '/');
}

function basename(path) {
  const normalized = normalizeUploadPath(path);
  const parts = normalized.split('/');
  return parts[parts.length - 1] || '';
}

function stripPackageRoot(paths) {
  const firstSegments = new Set(paths.map(path => path.split('/')[0]).filter(Boolean));
  const everyPathNested = paths.length > 0 && paths.every(path => path.includes('/'));

  if (!everyPathNested || firstSegments.size !== 1) {
    return paths;
  }

  return paths.map(path => path.split('/').slice(1).join('/'));
}

function resetRuntimeObjectUrls() {
  for (const objectUrl of state.runtimeObjectUrls) {
    URL.revokeObjectURL(objectUrl);
  }
  state.runtimeObjectUrls = [];
}

function resetQuestionBank() {
  resetRuntimeObjectUrls();
  state.quizSources = [];
  state.allQuestions = [];
  state.missedQuestions = [];
  state.mode = '';
  state.sourceQuestions = [];
  state.activeQuestions = [];
  state.lastResults = [];
  state.lastSubmitted = false;
  resultBanner.className = 'result-banner';
  resultBanner.innerHTML = '';
  questionList.innerHTML = '';
  quizShell.className = 'quiz-shell';
  summaryBar.className = 'summary-bar';
  updateModeAvailability();
}

function updateModeAvailability() {
  const allCount = state.allQuestions.length;
  const missedCount = state.missedQuestions.length;

  startMissedCount.textContent = `${missedCount} previously missed question${missedCount === 1 ? '' : 's'}`;
  startAllCount.textContent = `${allCount} total supported question${allCount === 1 ? '' : 's'}`;
  startAiCount.textContent = `Based on ${missedCount} missed source question${missedCount === 1 ? '' : 's'}`;

  startMissedButton.disabled = missedCount === 0;
  startAllButton.disabled = allCount === 0;
  startAiButton.disabled = state.isGenerating || missedCount === 0;
}

function renderUploadSummary() {
  const htmlEntries = state.uploadedEntries.filter(entry => /\.html$/i.test(entry.name));
  const folderNames = [...new Set(
    state.uploadedEntries
      .filter(entry => entry.path.includes('/'))
      .map(entry => entry.path.split('/')[0])
  )].sort();

  uploadedHtmlPill.textContent = `${htmlEntries.length} html file${htmlEntries.length === 1 ? '' : 's'}`;
  uploadedFolderPill.textContent = `${folderNames.length} folder${folderNames.length === 1 ? '' : 's'}`;
  uploadedFilePill.textContent = `${state.uploadedEntries.length} total file${state.uploadedEntries.length === 1 ? '' : 's'}`;

  if (!state.uploadedEntries.length) {
    uploadList.className = 'upload-list empty';
    uploadList.textContent = 'Select a folder to see the discovered HTML files and asset folders.';
    return;
  }

  const rows = [];

  for (const htmlEntry of htmlEntries) {
    rows.push(`<div class="upload-item"><strong>${escapeHtml(htmlEntry.name)}</strong><span>Top-level HTML</span></div>`);
  }

  for (const folderName of folderNames) {
    const count = state.uploadedEntries.filter(entry => entry.path.startsWith(`${folderName}/`)).length;
    rows.push(`<div class="upload-item"><strong>${escapeHtml(folderName)}/</strong><span>${count} asset file${count === 1 ? '' : 's'}</span></div>`);
  }

  uploadList.className = 'upload-list';
  uploadList.innerHTML = rows.join('');
}

function handlePackageSelection(files) {
  const inputFiles = Array.from(files || []);

  if (!inputFiles.length) {
    return;
  }

  const normalizedPaths = stripPackageRoot(
    inputFiles.map(file => normalizeUploadPath(file.webkitRelativePath || file.name))
  );

  resetQuestionBank();
  state.uploadedEntries = inputFiles.map((file, index) => ({
    file,
    path: normalizedPaths[index],
    name: basename(normalizedPaths[index]),
  }));

  renderUploadSummary();
  buildButton.disabled = false;
  clearUploadButton.disabled = false;
  setBuildStatus(`Loaded ${state.uploadedEntries.length} files. Press Build Quizzes to parse the uploaded package.`);
}

function clearUploads() {
  packageUpload.value = '';
  state.uploadedEntries = [];
  resetQuestionBank();
  renderUploadSummary();
  buildButton.disabled = true;
  clearUploadButton.disabled = true;
  setBuildStatus('No quiz package loaded yet.');
  setAiStatus('');
}

function shuffle(items) {
  const copy = [...items];
  for (let index = copy.length - 1; index > 0; index -= 1) {
    const swapIndex = Math.floor(Math.random() * (index + 1));
    [copy[index], copy[swapIndex]] = [copy[swapIndex], copy[index]];
  }
  return copy;
}

function prepareQuestion(question) {
  const optionOrder = shuffle(question.options.map((option, index) => ({ option, index })));
  const renderedCorrectIndices = question.inputType === 'multiple'
    ? optionOrder
        .map((entry, index) => question.correctIndices.includes(entry.index) ? index : -1)
        .filter(index => index !== -1)
    : undefined;

  return {
    ...question,
    renderedOptions: optionOrder.map(entry => entry.option),
    renderedCorrectIndex: optionOrder.findIndex(entry => entry.index === question.correctIndex),
    renderedCorrectIndices,
  };
}

function showQuizUi() {
  summaryBar.className = 'summary-bar visible';
  quizShell.className = 'quiz-shell visible';
}

function showHomeUi() {
  summaryBar.className = 'summary-bar';
  quizShell.className = 'quiz-shell';
  window.scrollTo({ top: 0, behavior: 'smooth' });
}

function setStartTab(tabName) {
  const showingAi = tabName === 'ai';
  studyTabButton.className = showingAi ? 'start-tab' : 'start-tab active';
  aiTabButton.className = showingAi ? 'start-tab active' : 'start-tab';
  studyTabButton.setAttribute('aria-selected', showingAi ? 'false' : 'true');
  aiTabButton.setAttribute('aria-selected', showingAi ? 'true' : 'false');
  studyPanel.className = showingAi ? 'start-panel' : 'start-panel active';
  aiPanelTab.className = showingAi ? 'start-panel active' : 'start-panel';
}

function pickAllQuestionRound() {
  return shuffle(state.allQuestions).slice(0, Math.min(20, state.allQuestions.length));
}

function startQuiz(mode, questions) {
  state.mode = mode;
  state.sourceQuestions = [...questions];
  state.activeQuestions = questions.map(prepareQuestion);
  state.lastResults = [];
  state.lastSubmitted = false;
  retryButton.disabled = true;
  showQuizUi();
  renderBanner();
  renderQuestions();
  updatePills();
  window.scrollTo({ top: 0, behavior: 'smooth' });
}

function updatePills() {
  const quizNames = new Set(state.activeQuestions.map(question => question.quizLabel));
  questionCountPill.textContent = `${state.activeQuestions.length} practice ${state.activeQuestions.length === 1 ? 'question' : 'questions'}`;
  quizCountPill.textContent = `${quizNames.size} source ${quizNames.size === 1 ? 'quiz' : 'quizzes'}`;
  modePill.textContent = state.mode === 'missed'
    ? 'Round: missed-before mode'
    : state.mode === 'all'
      ? 'Round: 20 random from all questions'
      : 'Round: AI-generated review';
}

function renderBanner(summary) {
  if (!summary) {
    resultBanner.className = 'result-banner';
    resultBanner.innerHTML = '';
    return;
  }

  const message = summary.correctCount === summary.total
    ? 'Everything correct. If you want another pass, start over to reshuffle the same concepts.'
    : `${summary.incorrectCount} ${summary.incorrectCount === 1 ? 'question remains' : 'questions remain'} for the retry round.`;

  resultBanner.className = 'result-banner visible';
  resultBanner.innerHTML = `<strong>Score: ${summary.correctCount} / ${summary.total}</strong><div>${message}</div>`;
}

function renderQuestions() {
  if (!state.activeQuestions.length) {
    questionList.innerHTML = `
      <div class="empty-state">
        <strong>No questions to show.</strong>
        <div>That usually means every missed question in the current round is already correct.</div>
      </div>
    `;
    return;
  }

  questionList.innerHTML = state.activeQuestions.map((question, index) => {
    const result = state.lastResults.find(entry => entry.key === question.key);
    const cardStatus = result ? (result.correct ? 'correct' : 'incorrect') : '';
    const feedbackStatus = result ? (result.correct ? 'correct' : 'incorrect') : '';
    const feedbackVisible = result ? 'visible' : '';
    const statusChip = result
      ? `<span class="status-chip ${result.correct ? 'correct' : 'incorrect'}">${result.correct ? 'Correct' : 'Incorrect'}</span>`
      : '';

    const optionsHtml = question.renderedOptions.map((optionHtml, optionIndex) => {
      const optionId = `${question.key}-option-${optionIndex}`;
      const selectedIndexes = result ? (result.selectedIndices || (result.selectedIndex !== -1 ? [result.selectedIndex] : [])) : [];
      const checked = selectedIndexes.includes(optionIndex) ? 'checked' : '';
      let optionClass = 'option';

      if (result) {
        const isCorrectOption = question.inputType === 'multiple'
          ? question.renderedCorrectIndices.includes(optionIndex)
          : optionIndex === question.renderedCorrectIndex;

        if (isCorrectOption) {
          optionClass += ' correct';
        } else if (selectedIndexes.includes(optionIndex) && !result.correct) {
          optionClass += ' incorrect';
        }
      }

      const inputType = question.inputType === 'multiple' ? 'checkbox' : 'radio';

      return `
        <div class="${optionClass}">
          <input type="${inputType}" id="${optionId}" name="${question.key}" value="${optionIndex}" ${checked} ${state.lastSubmitted ? 'disabled' : ''}>
          <label for="${optionId}">
            <span class="option-marker" aria-hidden="true"></span>
            <span class="option-content">${optionHtml}</span>
          </label>
        </div>
      `;
    }).join('');

    const selectedText = result && (result.selectedIndices || []).length
      ? result.selectedIndices.map(choiceIndex => question.renderedOptions[choiceIndex]).join('<br>')
      : (result && result.selectedIndex !== -1
          ? question.renderedOptions[result.selectedIndex]
          : '<em>No answer selected.</em>');

    const correctText = question.inputType === 'multiple'
      ? question.renderedCorrectIndices.map(choiceIndex => question.renderedOptions[choiceIndex]).join('<br>')
      : question.renderedOptions[question.renderedCorrectIndex];
    const originalWrong = question.originalWrongAnswer
      ? `<div class="feedback-line"><strong>Original Canvas miss:</strong> ${question.originalWrongAnswer}</div>`
      : '';
    const explanation = question.explanationHtml
      ? `<div class="feedback-line"><strong>Explanation:</strong><div>${question.explanationHtml}</div></div>`
      : '';

    return `
      <article class="question-card ${cardStatus}" data-key="${question.key}">
        <div class="question-head">
          <div>
            <div class="question-title">${index + 1}. ${question.questionLabel}</div>
            <div class="question-meta">
              <span class="tag">${question.quizLabel}</span>
              <span>${question.questionType.replaceAll('_', ' ')}</span>
            </div>
          </div>
          <div>${statusChip}</div>
        </div>
        <div class="question-body">
          <div class="stem">${question.stemHtml}</div>
          <div class="option-list">${optionsHtml}</div>
          <div class="feedback ${feedbackStatus} ${feedbackVisible}">
            <div class="feedback-line"><strong>Your answer:</strong> ${selectedText}</div>
            <div class="feedback-line"><strong>Correct answer:</strong> ${correctText}</div>
            ${originalWrong}
            ${explanation}
          </div>
        </div>
      </article>
    `;
  }).join('');
}

function submitQuiz() {
  const results = state.activeQuestions.map(question => {
    if (question.inputType === 'multiple') {
      const selectedIndices = [...document.querySelectorAll(`input[name="${CSS.escape(question.key)}"]:checked`)]
        .map(node => Number(node.value))
        .sort((left, right) => left - right);
      const correctIndices = [...question.renderedCorrectIndices].sort((left, right) => left - right);
      const correct = selectedIndices.length === correctIndices.length
        && selectedIndices.every((value, index) => value === correctIndices[index]);

      return {
        key: question.key,
        selectedIndices,
        correct,
      };
    }

    const selected = document.querySelector(`input[name="${CSS.escape(question.key)}"]:checked`);
    const selectedIndex = selected ? Number(selected.value) : -1;
    return {
      key: question.key,
      selectedIndex,
      selectedIndices: selectedIndex === -1 ? [] : [selectedIndex],
      correct: selectedIndex === question.renderedCorrectIndex,
    };
  });

  state.lastResults = results;
  state.lastSubmitted = true;

  const correctCount = results.filter(result => result.correct).length;
  const incorrectCount = results.length - correctCount;
  retryButton.disabled = incorrectCount === 0;

  renderBanner({
    total: results.length,
    correctCount,
    incorrectCount,
  });
  renderQuestions();
  window.scrollTo({ top: 0, behavior: 'smooth' });
}

function retryMissedOnly() {
  const missedKeys = new Set(
    state.lastResults
      .filter(result => !result.correct)
      .map(result => result.key)
  );
  const missedQuestions = state.activeQuestions.filter(question => missedKeys.has(question.key));
  startQuiz(state.mode, missedQuestions);
}

async function buildUploadedQuizzes() {
  if (!state.uploadedEntries.length) {
    setBuildStatus('Upload a quiz package folder before building.', 'error');
    return;
  }

  setBuildStatus('Parsing uploaded Canvas quizzes...', '');
  buildButton.disabled = true;

  try {
    resetQuestionBank();
    const result = await collectQuestionsFromUploads(state.uploadedEntries);
    state.runtimeObjectUrls = result.runtime.objectUrls;
    state.quizSources = result.quizSources;
    state.allQuestions = result.allQuestions;
    state.missedQuestions = result.missedQuestions;

    if (!state.allQuestions.length) {
      throw new Error(
        'No supported Canvas quiz questions were found. Make sure your uploaded folder contains saved Canvas review HTML files and their matching context folders.'
      );
    }

    updateModeAvailability();
    setBuildStatus(
      `Built ${state.allQuestions.length} questions from ${state.quizSources.length} source ${state.quizSources.length === 1 ? 'quiz' : 'quizzes'}.`
      + (state.missedQuestions.length ? ` ${state.missedQuestions.length} were marked incorrect in Canvas.` : ' No missed questions were detected in the uploaded review pages.'),
      'success'
    );
  } catch (error) {
    resetQuestionBank();
    setBuildStatus(error.message || 'Failed to build quizzes from the uploaded package.', 'error');
  } finally {
    buildButton.disabled = state.uploadedEntries.length === 0;
  }
}

function getResponseText(responseData) {
  if (typeof responseData.output_text === 'string' && responseData.output_text.trim()) {
    return responseData.output_text;
  }

  const texts = [];
  for (const item of responseData.output || []) {
    for (const content of item.content || []) {
      if (typeof content.text === 'string') {
        texts.push(content.text);
      }
    }
  }
  return texts.join('\n').trim();
}

function summarizeMissedQuestion(question) {
  const correctAnswer = question.inputType === 'multiple'
    ? question.correctIndices.map(index => htmlToText(question.options[index])).join(' | ')
    : htmlToText(question.options[question.correctIndex]);

  return {
    question_label: question.questionLabel,
    question_type: question.questionType,
    prompt: htmlToText(question.stemHtml),
    options: question.options.map(option => htmlToText(option)),
    correct_answer: correctAnswer,
    explanation: htmlToText(question.explanationHtml),
  };
}

function normalizeGeneratedQuestions(payload) {
  if (!payload || !Array.isArray(payload.questions)) {
    throw new Error('The AI response did not include a "questions" array.');
  }

  const batchId = Date.now();

  return payload.questions.map((question, index) => {
    if (!question || !Array.isArray(question.options) || question.options.length < 2) {
      throw new Error(`Generated question ${index + 1} is missing answer choices.`);
    }

    const correctIndex = Number(question.correct_index);
    if (!Number.isInteger(correctIndex) || correctIndex < 0 || correctIndex >= question.options.length) {
      throw new Error(`Generated question ${index + 1} has an invalid correct_index.`);
    }

    return {
      id: `ai-generated-${batchId}-${index + 1}`,
      key: `ai-generated-${batchId}-${index + 1}`,
      quizLabel: 'AI Generated Review',
      questionLabel: question.question_label || `Generated Question ${index + 1}`,
      questionType: 'ai_generated_question',
      inputType: 'single',
      stemHtml: plainTextToHtml(question.question_text || ''),
      explanationHtml: plainTextToHtml(question.explanation || ''),
      options: question.options.map(option => plainTextToHtml(option || '')),
      correctIndex,
      originalWrongAnswer: '',
      wasMissed: false,
    };
  });
}

async function generateAiQuestions() {
  if (!state.missedQuestions.length) {
    setAiStatus('Build quizzes with at least one missed Canvas question before using AI mode.', 'error');
    return;
  }

  const openAiApiKey = aiTokenInput.value.trim();
  const openAiModel = aiModelInput.value.trim() || 'gpt-5.2-codex';
  const geminiApiKey = geminiTokenInput.value.trim();
  const geminiModel = geminiModelInput.value.trim() || 'gemini-2.5-flash';
  const requestedCount = Math.max(5, Math.min(20, Number(aiCountInput.value) || 10));
  const provider = geminiApiKey ? 'gemini' : 'openai';

  if (!geminiApiKey && !openAiApiKey) {
    setAiStatus('Enter either an OpenAI/Codex token or a Gemini token before generating questions.', 'error');
    return;
  }

  state.isGenerating = true;
  updateModeAvailability();
  setAiStatus('Generating similar questions from your missed set...');

  if (aiSaveTokenInput.checked) {
    saveAiConfig({
      openaiApiKey: openAiApiKey,
      openaiModel: openAiModel,
      geminiApiKey,
      geminiModel,
      count: requestedCount,
    });
  } else {
    saveAiConfig({
      openaiApiKey: '',
      openaiModel: openAiModel,
      geminiApiKey: '',
      geminiModel,
      count: requestedCount,
    });
  }

  const sourceQuestions = state.missedQuestions.map(summarizeMissedQuestion);
  const prompt = {
    task: 'Create similar but not identical practice questions for Canvas quiz review.',
    rules: [
      'Return valid JSON only.',
      'Create new questions that test the same skills and concepts as the source questions but use different values, labels, arrays, graph names, or answer choices.',
      'Do not copy source prompts verbatim.',
      'Each generated question must be a single-answer multiple-choice question.',
      'Each question must have exactly 4 answer options.',
      'Each question must have exactly 1 correct answer.',
      'Use plain text only in question_text, options, and explanation. No markdown, no HTML, no code fences.',
      'Keep the questions concise and quiz-like.',
    ],
    output_schema: {
      questions: [
        {
          question_label: 'short title',
          question_text: 'plain text question',
          options: ['choice A', 'choice B', 'choice C', 'choice D'],
          correct_index: 0,
          explanation: 'short explanation',
        }
      ]
    },
    requested_question_count: requestedCount,
    source_questions: sourceQuestions,
  };

  try {
    let responseText = '';

    if (provider === 'gemini') {
      const response = await fetch(
        `${(DEFAULT_AI_CONFIG.geminiApiBase || 'https://generativelanguage.googleapis.com/v1beta')}/models/${encodeURIComponent(geminiModel)}:generateContent?key=${encodeURIComponent(geminiApiKey)}`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            systemInstruction: {
              parts: [
                {
                  text: 'You generate practice questions. Follow the user JSON schema exactly and only return JSON.',
                }
              ],
            },
            contents: [
              {
                parts: [
                  {
                    text: JSON.stringify(prompt),
                  }
                ],
              }
            ],
            generationConfig: {
              response_mime_type: 'application/json',
              response_schema: {
                type: 'OBJECT',
                properties: {
                  questions: {
                    type: 'ARRAY',
                    items: {
                      type: 'OBJECT',
                      properties: {
                        question_label: { type: 'STRING' },
                        question_text: { type: 'STRING' },
                        options: {
                          type: 'ARRAY',
                          items: { type: 'STRING' },
                        },
                        correct_index: { type: 'INTEGER' },
                        explanation: { type: 'STRING' },
                      },
                      required: ['question_label', 'question_text', 'options', 'correct_index', 'explanation'],
                    },
                  },
                },
                required: ['questions'],
              },
            },
          }),
        }
      );

      const responseData = await response.json();
      if (!response.ok) {
        const message = responseData?.error?.message || 'Gemini request failed.';
        throw new Error(message);
      }

      responseText = responseData?.candidates?.[0]?.content?.parts?.map(part => part.text || '').join('\n').trim() || '';
    } else {
      const response = await fetch((DEFAULT_AI_CONFIG.apiBase || 'https://api.openai.com/v1/responses'), {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${openAiApiKey}`,
        },
        body: JSON.stringify({
          model: openAiModel,
          input: [
            {
              role: 'system',
              content: [
                {
                  type: 'input_text',
                  text: 'You generate practice questions. Follow the user JSON schema exactly and only return JSON.',
                }
              ],
            },
            {
              role: 'user',
              content: [
                {
                  type: 'input_text',
                  text: JSON.stringify(prompt),
                }
              ],
            },
          ],
          text: {
            format: {
              type: 'json_object',
            },
          },
        }),
      });

      const responseData = await response.json();
      if (!response.ok) {
        const message = responseData?.error?.message || 'OpenAI request failed.';
        throw new Error(message);
      }

      responseText = getResponseText(responseData);
    }

    if (!responseText) {
      throw new Error('The AI response was empty.');
    }

    const generatedPayload = JSON.parse(responseText);
    const generatedQuestions = normalizeGeneratedQuestions(generatedPayload);
    setAiStatus(`Generated ${generatedQuestions.length} new question${generatedQuestions.length === 1 ? '' : 's'} using ${provider === 'gemini' ? 'Gemini' : 'OpenAI/Codex'}.`, 'success');
    startQuiz('generated', generatedQuestions);
  } catch (error) {
    setAiStatus(error.message || 'Failed to generate questions.', 'error');
  } finally {
    state.isGenerating = false;
    updateModeAvailability();
  }
}

packageUpload.addEventListener('change', event => handlePackageSelection(event.target.files));
buildButton.addEventListener('click', buildUploadedQuizzes);
clearUploadButton.addEventListener('click', clearUploads);
studyTabButton.addEventListener('click', () => setStartTab('study'));
aiTabButton.addEventListener('click', () => setStartTab('ai'));
startMissedButton.addEventListener('click', () => startQuiz('missed', state.missedQuestions));
startAllButton.addEventListener('click', () => startQuiz('all', pickAllQuestionRound()));
startAiButton.addEventListener('click', generateAiQuestions);
submitButton.addEventListener('click', submitQuiz);
homeButton.addEventListener('click', showHomeUi);
retryButton.addEventListener('click', retryMissedOnly);
resetButton.addEventListener('click', () => {
  const nextQuestions = state.mode === 'missed'
    ? [...state.missedQuestions]
    : state.mode === 'all'
      ? pickAllQuestionRound()
      : [...state.sourceQuestions];
  startQuiz(state.mode, nextQuestions);
});

applyAiConfigDefaults();
renderUploadSummary();
updateModeAvailability();
if (window.location.protocol === 'file:') {
  setAiStatus('Local file mode can trigger browser security restrictions for API calls. If generation fails, serve this folder over http://localhost instead.', '');
}

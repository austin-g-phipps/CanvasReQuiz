const QUESTION_HOLDER_MARKER = '<div role="region" aria-label="Question" class="quiz_sortable question_holder ';
const QUESTION_HOLDER_REGEX = /<div[^>]*class="[^"]*\bquestion_holder\b[^"]*"[^>]*>/gi;

function decodeHtml(value = '') {
  return value
    .replace(/&#(\d+);/g, (_, code) => String.fromCharCode(Number(code)))
    .replace(/&#x([0-9a-f]+);/gi, (_, code) => String.fromCharCode(parseInt(code, 16)))
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>');
}

function escapeHtml(value = '') {
  return String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function normalizeSpace(value = '') {
  return decodeHtml(value)
    .replace(/<[^>]+>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function normalizePath(value = '') {
  return String(value)
    .replace(/\\/g, '/')
    .replace(/^\.?\//, '')
    .replace(/\/+/g, '/')
    .trim();
}

function cleanupFragmentHtml(html) {
  return html
    .replace(/^\s*<\/div>\s*/g, '')
    .replace(/\s*<\/div>\s*$/g, '')
    .trim();
}

function containsQuizMarkup(html = '') {
  return html.includes(QUESTION_HOLDER_MARKER)
    || /<div[^>]*class="[^"]*\bquestion_holder\b[^"]*"[^>]*>/i.test(html)
    || /display_question question [^"]* (?:correct|incorrect) bordered/.test(html);
}

function getBetween(block, startMarker, endMarker) {
  const start = block.indexOf(startMarker);
  if (start === -1) {
    return '';
  }

  const from = start + startMarker.length;
  const end = block.indexOf(endMarker, from);
  if (end === -1) {
    return '';
  }

  return block.slice(from, end);
}

function findQuestionHolders(html) {
  const indexes = [];
  let markerIndex = html.indexOf(QUESTION_HOLDER_MARKER);

  if (markerIndex !== -1) {
    let start = 0;
    while (markerIndex !== -1) {
      indexes.push(markerIndex);
      start = markerIndex + QUESTION_HOLDER_MARKER.length;
      markerIndex = html.indexOf(QUESTION_HOLDER_MARKER, start);
    }
  } else {
    indexes.push(...[...html.matchAll(QUESTION_HOLDER_REGEX)].map(match => match.index).filter(Number.isInteger));
  }

  return indexes.map((index, position) => {
    const nextIndex = indexes[position + 1] ?? html.length;
    return html.slice(index, nextIndex);
  });
}

function parseAnswerFragments(block) {
  const answersWrapper = getBetween(
    block,
    '<div class="answers_wrapper">',
    '<div class="after_answers">'
  );

  if (!answersWrapper) {
    return [];
  }

  return answersWrapper
    .split('<div class="answer answer_for_')
    .slice(1)
    .map(fragment => `<div class="answer answer_for_${fragment}`);
}

function guessAssetFolderNameFromHtml(html) {
  const folderMatch = html.match(/(?:src|href)=["']\.\/([^/"']+(?:_files|contextFolder))\//i);
  return folderMatch ? folderMatch[1] : '';
}

function findPairedFolderName(baseName, directoryNames, sourceHtml = '') {
  const normalizedBase = baseName.toLowerCase().replace(/[^a-z0-9]/g, '');
  const guessedFolderName = guessAssetFolderNameFromHtml(sourceHtml);

  if (guessedFolderName && directoryNames.includes(guessedFolderName)) {
    return guessedFolderName;
  }

  const exactCandidates = [
    `${baseName}_files`,
    `${baseName}contextFolder`,
    `${baseName}_contextFolder`,
    `${baseName}-contextFolder`,
  ];

  for (const candidate of exactCandidates) {
    if (directoryNames.includes(candidate)) {
      return candidate;
    }
  }

  return directoryNames.find(name => {
    const normalizedDir = name.toLowerCase().replace(/[^a-z0-9]/g, '');
    return normalizedDir === `${normalizedBase}files`
      || normalizedDir === `${normalizedBase}contextfolder`;
  }) || '';
}

function getQuizLabelFromBaseName(baseName) {
  return baseName.replace(/\s+/g, ' ').trim() || 'Canvas Quiz';
}

function sortHtmlNames(left, right) {
  const leftNumeric = /^\d+\.html$/i.test(left) ? 0 : 1;
  const rightNumeric = /^\d+\.html$/i.test(right) ? 0 : 1;

  if (leftNumeric !== rightNumeric) {
    return leftNumeric - rightNumeric;
  }

  return left.localeCompare(right);
}

function createAssetUrl(file, runtime) {
  const objectUrl = URL.createObjectURL(file);
  runtime.objectUrls.push(objectUrl);
  return objectUrl;
}

function resolveUploadedAssetPath(assetPath, folderName, runtime) {
  const cleaned = normalizePath(assetPath).replace(/^file:\/\//i, '');

  if (!cleaned || /^https?:\/\//i.test(cleaned) || cleaned.startsWith('data:') || cleaned.startsWith('blob:')) {
    return '';
  }

  const candidates = [];
  if (folderName && !cleaned.includes('/')) {
    candidates.push(`${folderName}/${cleaned}`);
  }
  candidates.push(cleaned);

  for (const candidate of candidates) {
    const resolved = runtime.assetUrls.get(candidate);
    if (resolved) {
      return resolved;
    }
  }

  return '';
}

function rewriteAssetPaths(html, folderName, runtime) {
  return html
    .replace(/(src|href)=["']([^"']+)["']/g, (match, attr, assetPath) => {
      const resolved = resolveUploadedAssetPath(assetPath, folderName, runtime);
      return resolved ? `${attr}="${resolved}"` : match;
    })
    .replace(/url\((['"]?)([^)'"]+)\1\)/g, (match, quote, assetPath) => {
      const resolved = resolveUploadedAssetPath(assetPath, folderName, runtime);
      return resolved ? `url("${resolved}")` : match;
    });
}

function optionHtmlFromFragment(fragment, folderName, runtime) {
  const answerText = (fragment.match(/<div class="answer_text">([\s\S]*?)<\/div>/) || [])[1] || '';
  const answerHtml = (fragment.match(/<div class="answer_html">([\s\S]*?)<\/div>/) || [])[1] || '';

  if (answerHtml.trim()) {
    const label = normalizeSpace(answerText);
    const labelHtml = label ? `<div class="practice-option-label">${escapeHtml(label)}</div>` : '';
    return `${labelHtml}${rewriteAssetPaths(answerHtml.trim(), folderName, runtime)}`;
  }

  return escapeHtml(normalizeSpace(answerText));
}

function parseMultipleChoiceQuestion(block, meta, runtime) {
  const answerFragments = parseAnswerFragments(block);
  const options = answerFragments.map(fragment => ({
    html: optionHtmlFromFragment(fragment, meta.folderName, runtime),
    selected: /selected_answer/.test(fragment),
    correct: /correct_answer/.test(fragment),
  }));

  const correctIndex = options.findIndex(option => option.correct);
  const originalWrongAnswer = options.find(option => option.selected && !option.correct);

  if (correctIndex === -1 || options.length < 2) {
    return [];
  }

  return [{
    id: meta.id,
    key: `${meta.quizSlug}-${meta.id}`,
    quizLabel: meta.quizLabel,
    questionLabel: meta.questionLabel,
    questionType: meta.questionType,
    inputType: 'single',
    stemHtml: meta.stemHtml,
    explanationHtml: meta.explanationHtml,
    options: options.map(option => option.html),
    correctIndex,
    originalWrongAnswer: originalWrongAnswer ? originalWrongAnswer.html : '',
    wasMissed: meta.wasMissed,
  }];
}

function parseMatchingQuestion(block, meta) {
  const answerFragments = parseAnswerFragments(block);
  const otherChoices = [...getBetween(block, '<ul class="matching_answer_incorrect_matches_list">', '</ul>')
    .matchAll(/<li>([\s\S]*?)<\/li>/g)]
    .map(match => normalizeSpace(match[1]))
    .filter(Boolean);

  return answerFragments
    .filter(fragment => /selected_answer/.test(fragment))
    .map((fragment, index) => {
      const title = decodeHtml((fragment.match(/title="([^"]*)"/) || [])[1] || '');
      const wrongMatch = title.match(/^(.*?)\. You selected (.*?)\. The correct answer was (.*?)\.$/);
      const correctMatch = title.match(/^(.*?)\. You selected (.*?)\. This was the correct answer\.$/);

      if (!wrongMatch && !correctMatch) {
        return null;
      }

      const prompt = (wrongMatch?.[1] || correctMatch?.[1] || '').trim();
      const selected = (wrongMatch?.[2] || correctMatch?.[2] || '').trim();
      const correct = (wrongMatch?.[3] || correctMatch?.[2] || '').trim();
      const choices = [...new Set([correct, selected, ...otherChoices].filter(Boolean))];

      if (choices.length < 2) {
        return null;
      }

      return {
        id: `${meta.id}_match_${index + 1}`,
        key: `${meta.quizSlug}-${meta.id}-match-${index + 1}`,
        quizLabel: meta.quizLabel,
        questionLabel: `${meta.questionLabel} (${prompt})`,
        questionType: 'matching_subquestion',
        inputType: 'single',
        stemHtml: `${meta.stemHtml}<div class="practice-subprompt"><strong>${escapeHtml(prompt)}</strong></div>`,
        explanationHtml: meta.explanationHtml,
        options: choices.map(choice => escapeHtml(choice)),
        correctIndex: choices.indexOf(correct),
        originalWrongAnswer: escapeHtml(selected),
        wasMissed: meta.wasMissed,
      };
    })
    .filter(Boolean);
}

function parseMultipleAnswersQuestion(block, meta, runtime) {
  const answerFragments = parseAnswerFragments(block);
  const options = answerFragments.map(fragment => ({
    html: optionHtmlFromFragment(fragment, meta.folderName, runtime),
    selected: /selected_answer/.test(fragment),
    correct: /correct_answer/.test(fragment),
  }));

  const correctIndices = options
    .map((option, index) => option.correct ? index : -1)
    .filter(index => index !== -1);

  if (!correctIndices.length || options.length < 2) {
    return [];
  }

  const selectedWrong = options.filter(option => option.selected && !option.correct).map(option => option.html);

  return [{
    id: meta.id,
    key: `${meta.quizSlug}-${meta.id}`,
    quizLabel: meta.quizLabel,
    questionLabel: meta.questionLabel,
    questionType: meta.questionType,
    inputType: 'multiple',
    stemHtml: meta.stemHtml,
    explanationHtml: meta.explanationHtml,
    options: options.map(option => option.html),
    correctIndices,
    originalWrongAnswer: selectedWrong.join(', '),
    wasMissed: meta.wasMissed,
  }];
}

function parseQuestionBlock(block, folderName, quizLabel, runtime) {
  const questionMatch = block.match(/<div class="display_question question ([^"]*?) (correct|incorrect) bordered" id="(question_\d+)"/);
  if (!questionMatch) {
    return [];
  }

  const questionType = questionMatch[1].trim();
  const status = questionMatch[2];
  const id = questionMatch[3];
  const questionLabel = normalizeSpace((block.match(/<span class="name question_name"[^>]*>([\s\S]*?)<\/span>/) || [])[1] || 'Question');
  const stemHtml = rewriteAssetPaths(
    cleanupFragmentHtml(
      getBetween(block, `<div id="${id}_question_text" class="question_text user_content enhanced">`, '<div class="answers">')
    ),
    folderName,
    runtime
  );
  const explanationHtml = rewriteAssetPaths(
    cleanupFragmentHtml(
      getBetween(block, '<div class="quiz_comment">', '<div class="clear"></div>')
    ),
    folderName,
    runtime
  );

  const quizSlugSource = folderName || quizLabel || id;
  const meta = {
    id,
    quizSlug: quizSlugSource.replace(/[^a-z0-9]+/gi, '-').toLowerCase(),
    folderName,
    quizLabel,
    questionLabel,
    questionType,
    stemHtml,
    explanationHtml,
    wasMissed: status === 'incorrect',
  };

  if (questionType === 'matching_question') {
    return parseMatchingQuestion(block, meta);
  }

  if (questionType === 'multiple_answers_question') {
    return parseMultipleAnswersQuestion(block, meta, runtime);
  }

  return parseMultipleChoiceQuestion(block, meta, runtime);
}

function topLevelDirectories(entries) {
  const directoryNames = new Set();

  for (const entry of entries) {
    const parts = entry.path.split('/');
    if (parts.length > 1) {
      directoryNames.add(parts[0]);
    }
  }

  return [...directoryNames].sort();
}

function topLevelHtmlEntries(htmlEntries) {
  return htmlEntries.filter(entry => !entry.path.includes('/'));
}

function folderHtmlEntries(htmlEntries, folderName) {
  return htmlEntries
    .filter(entry => entry.path.startsWith(`${folderName}/`))
    .sort((left, right) => sortHtmlNames(left.name, right.name));
}

function discoverQuizSources(runtime) {
  const directoryNames = topLevelDirectories(runtime.entries);
  const consumedFolders = new Set();

  const htmlSources = topLevelHtmlEntries(runtime.htmlEntries)
    .sort((left, right) => sortHtmlNames(left.name, right.name))
    .map(source => {
      if (!containsQuizMarkup(source.html)) {
        return null;
      }

      const baseName = source.name.replace(/\.html$/i, '');
      const folderName = findPairedFolderName(baseName, directoryNames, source.html);
      if (folderName) {
        consumedFolders.add(folderName);
      }

      return {
        html: source.html,
        folderName,
        quizLabel: getQuizLabelFromBaseName(baseName),
      };
    })
    .filter(Boolean);

  const folderSources = directoryNames
    .filter(folderName => !consumedFolders.has(folderName))
    .map(folderName => {
      const htmlEntry = folderHtmlEntries(runtime.htmlEntries, folderName)
        .find(entry => containsQuizMarkup(entry.html));

      if (!htmlEntry) {
        return null;
      }

      return {
        html: htmlEntry.html,
        folderName,
        quizLabel: getQuizLabelFromBaseName(folderName.replace(/(_files|contextFolder)$/i, '')),
      };
    })
    .filter(Boolean);

  return [...htmlSources, ...folderSources];
}

async function buildRuntime(entries) {
  const htmlEntries = [];
  const assetUrls = new Map();
  const objectUrls = [];

  for (const entry of entries) {
    if (/\.html$/i.test(entry.name)) {
      htmlEntries.push({
        ...entry,
        html: await entry.file.text(),
      });
      continue;
    }

    assetUrls.set(entry.path, createAssetUrl(entry.file, { objectUrls }));
  }

  return {
    entries,
    htmlEntries,
    assetUrls,
    objectUrls,
  };
}

export async function collectQuestionsFromUploads(entries) {
  const runtime = await buildRuntime(entries);
  const quizSources = discoverQuizSources(runtime);
  const questions = [];

  for (const source of quizSources) {
    const holders = findQuestionHolders(source.html);
    for (const holder of holders) {
      questions.push(...parseQuestionBlock(holder, source.folderName, source.quizLabel, runtime));
    }
  }

  return {
    runtime,
    quizSources,
    allQuestions: questions,
    missedQuestions: questions.filter(question => question.wasMissed),
  };
}

# CanvasReQuiz

<b>THIS PROJECT WAS BUILT FOR PERSONAL NECESSITY SO PLEASE LET ME KNOW IF YOU HAVE ISSUES</b>

I built this project using Codex so I could study Canvas quizzes that I knew would be reused on my midterm. The program will work with uploaded Canvas quizzes saved from the graded quiz page with `Ctrl+S`, and those files should be placed directly in the root of this project. Each saved quiz needs an HTML file plus its matching asset folder. This tool should work for any Canvas quiz uploaded this way, but I have only tested on my own quizzes so far. The program is tuned to work better with coding quizzes, so if you are using this project for a different subject, it may be necessary to download this repo and tweak the way the build file works. Furthermore, I don't believe the program currently works with textbox questions where the answer would be manually graded.

Recommended upload formats:

- Default Canvas save names, such as `Quiz 1 - Review.html` with `Quiz 1 - Review_files`
- Renamed pairs, such as `quiz1.html` with `quiz1contextFolder`

The HTML file and its matching folder must stay together in the project root.

CanvasReQuiz is now set up as a Vite project at the repo root and is designed to start empty when deployed. Users upload their own saved Canvas quiz review pages in the browser, the app builds a question bank locally, and then it runs the same study flow from that uploaded content. The legacy builder still exists for local standalone generation.

### AI MODE

I also wanted to make a mode that can make similar questions using the uploaded quizzes as context, but this mode is very finicky and should be considered a beta mode. I only use Gemini's free API to upload my quizzes and generate new questions, so the following issues may be because of the limitations of Gemini-Flash:
- The AI mode will not provide images for questions that typically need them
- The AI mode has trouble converting images with blocks of code to actual blocks of code
- Similarly, the AI mode has trouble converting images of trees to ASCII trees
- The questions will sometimes have incorrect answers, so double-check your own work

## What The Program Does

The project now has two primary paths:

1. Browser app: `index.html` + `src/` run in Vite and let users upload quiz packages directly from the browser.
2. Legacy builder: `build-practice-quiz.js` reads saved Canvas quiz HTML files from disk and writes `index.html` and `practice-quiz.html` for the older local-file workflow.

When you run the builder, it scans the archived quiz folders, pulls out question text, answer choices, correctness data, explanations, and referenced images, then embeds all of that into one self-contained HTML study page.

## How It Works

`build-practice-quiz.js` discovers quiz sources in two ways:

- It reads top-level saved quiz HTML files and pairs them with either their default Canvas asset folder or a renamed folder such as `quiz1contextFolder`.
- It also falls back to scanning quiz HTML files found inside asset folders when needed.

In both cases, it looks for graded Canvas quiz markup and uses that as the source of truth.

For each supported question block, the script:

- Finds Canvas question containers by locating the `question_holder` markup.
- Detects whether the original response was correct or incorrect.
- Extracts the question title, prompt HTML, explanation HTML, and answer area.
- Rewrites relative asset paths so images and other saved assets still load from the local quiz folders.
- Normalizes supported Canvas question types into one internal format.

Supported parsing behavior:

- Standard single-answer multiple choice questions are converted into one practice item.
- `multiple_answers_question` items are converted into multi-select practice items.
- `matching_question` items are split into separate single-answer subquestions, one per matched prompt.

Unsupported or unrecognized question blocks are skipped instead of crashing the build.

In the deployment-ready browser flow, users:

- Save a graded Canvas quiz review with `Ctrl+S`
- Rename the HTML file to something like `quiz1.html`
- Rename the matching asset folder to something like `quiz1contextFolder`
- Put the HTML files and folders into one local parent folder
- Upload that folder through the site
- Press `Build Quizzes`

In the legacy builder flow, the script writes a new `index.html` file and a matching `practice-quiz.html` copy containing:

- Embedded question data for all questions
- A browser UI for quiz rounds
- Retry logic
- Optional AI-generated review support

## Modes

The generated practice page has three start modes.

### Missed-before mode

This mode loads every question whose original Canvas result was marked `incorrect`. It is the direct review mode for material you previously missed.

Behavior:

- Includes all previously missed items
- Keeps explanations and the original missed answer when available
- Randomizes the displayed answer order each time the round starts
- Supports "Retry missed only" after submission

### All-questions mode

This mode builds a random round from the full supported question pool, not just missed items.

Behavior:

- Randomly selects up to 20 questions from all extracted items
- Reshuffles the selected questions' answer order on each round
- Useful for broader review instead of targeted remediation

### AI-generated review mode

This mode generates new questions based on the missed-question set instead of reusing the original Canvas prompts.

Behavior:

- Uses your missed questions as source material
- Asks OpenAI or Gemini to create similar but not identical questions
- Requires single-answer multiple choice output
- Requires exactly 4 answer options per generated question
- Converts the returned JSON into a normal quiz round inside the same interface

Provider behavior:

- If a Gemini API key is present, the page uses Gemini.
- Otherwise, if an OpenAI key is present, the page uses the OpenAI Responses API.

## AI Configuration

`quiz-ai-config.js` provides browser-side defaults for:

- OpenAI API key
- OpenAI model
- OpenAI Responses API base URL
- Gemini API key
- Gemini model
- Gemini API base URL

The generated page also stores entered AI settings in `localStorage` if you choose to save them.

Default models in this repo:

- OpenAI: `gpt-5.2-codex`
- Gemini: `gemini-2.5-flash`

## Files

- `build-practice-quiz.js`: Node.js builder that parses the saved Canvas quiz pages and generates the practice page.
- `index.html`: Vite entry page for the deployment-ready browser app.
- `src/`: Browser app source, including upload/build logic and quiz UI.
- `public/quiz-ai-config.js`: Browser-side AI defaults for the deployed app.
- `practice-quiz.html`: Standalone compatibility copy from the legacy builder flow.
- `quiz-ai-config.js`: Optional browser config for AI defaults.
- Saved quiz uploads: either the default Canvas HTML + `_files` folder pair, or a renamed pair like `quiz1.html` + `quiz1contextFolder`.

## How To Run

Prerequisite:

- Node.js installed locally

Install dependencies:

```powershell
npm install
```

Run the deployment-ready browser app:

```powershell
npm run dev
```

Create a production build:

```powershell
npm run build
```

If you want the old local generator flow, regenerate the quiz page from saved Canvas exports:

```powershell
npm run quiz:build
```

If you have fresh Canvas uploads in the root and want to regenerate the quiz page before bundling, use:

```powershell
npm run build:fresh
```

You can still open `practice-quiz.html` directly in a browser if you want the old standalone file-based flow, but the primary deployed experience is now the Vite app in `index.html`.

If the builder says no supported Canvas quiz questions were found, first verify that each uploaded quiz is present as a matching HTML file and asset folder pair in the project root.

If AI generation fails while opening the file directly from disk, serve the folder over `http://localhost` instead. The page already warns about possible browser restrictions in `file://` mode.

## Notes And Limitations

- This is a parser for a specific saved Canvas export format, not a general Canvas API client.
- The extractor depends on Canvas HTML class names and markup structure.
- Only supported question types are converted. (textbox questions may be ignored)
- AI-generated questions are always normalized to single-answer multiple choice, even if the original missed source included matching or multi-answer material.

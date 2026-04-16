# CanvasReQuiz

<b>THIS PROJECT WAS BUILT FOR PERSONAL NECESSITY SO PLEASE LET ME KNOW IF YOU HAVE ISSUES</b>

I built this project using Codex so I could study Canvas quizzes that I knew would be reused on my midterm. The program will work with uploaded canvas quizzes (which you can save by pressing ctrl+s on the graded quiz page) which you should save directly to the root of this project. The saved canvas quiz should have an html file and another content folder that stores assets necessary for the canvas quiz's html to load. This tool should work for any Canvas quiz uploaded this way, but I have only tested on my own quizzes so far. The program is tuned to work better with coding quizzes, so if you are using this project for a different subject, it may be necessary to download this repo and tweak the way the build file works. Furthermore, I don't believe the program currently works with textbox questions where the answer would be manually graded.

CanvasReQuiz is a small local quiz generator that turns saved Canvas quiz review pages into a standalone `practice-quiz.html` study page. It extracts questions you already answered in Canvas, rebuilds them into a cleaner practice interface, shuffles answer order for each round, and lets you retry only the questions you miss.

### AI MODE

I also wanted to make a mode that can make similar questions using the uploaded quizzes as context, but this mode is very finicky and should be considered a beta mode. I only use Gemini's free API to upload my quizzes and generate new questions, so the following issues may be because of the limitations of Gemini-Flash:
- The AI mode will not provide images for questions that typically need them
- The AI mode has trouble converting images with blocks of code to actual blocks of code
- Similarly, the AI mode has trouble converting images of trees to ASCII trees
- The questions will sometimes have incorrect answers, so double-check your own work

## What The Program Does

The project has two parts:

1. `build-practice-quiz.js` reads the saved Canvas quiz HTML files and converts them into a normalized question set.
2. `practice-quiz.html` is the generated output that runs entirely in the browser and serves the practice experience.

When you run the builder, it scans the archived quiz folders, pulls out question text, answer choices, correctness data, explanations, and referenced images, then embeds all of that into one self-contained HTML study page.

## How It Works

`build-practice-quiz.js` scans Canvas export folders ending in `_files`, finds the HTML file inside each folder that actually contains quiz question markup, and uses that as the source of truth.

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

After extraction, the script writes a new `practice-quiz.html` file containing:

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
- `practice-quiz.html`: Generated quiz UI.
- `quiz-ai-config.js`: Optional browser config for AI defaults.
- `Quiz *_  <name>.html` and `Quiz *_ <user_name>_files/`: Saved Canvas quiz pages and their assets.

## How To Run

Prerequisite:

- Node.js installed locally

Build the practice page:

```powershell
node build-practice-quiz.js
```

Then open `practice-quiz.html` in a browser.

If AI generation fails while opening the file directly from disk, serve the folder over `http://localhost` instead. The page already warns about possible browser restrictions in `file://` mode.

## Notes And Limitations

- This is a parser for a specific saved Canvas export format, not a general Canvas API client.
- The extractor depends on Canvas HTML class names and markup structure.
- Only supported question types are converted. (textbox questions may be ignored)
- AI-generated questions are always normalized to single-answer multiple choice, even if the original missed source included matching or multi-answer material.

export type SnapyJokeTopic = "image" | "text";

const IMAGE_JOKES = [
  "I asked the pixels for a punchline. They said: raise the resolution.",
  "This prompt has more layers than a PNG.",
  "I crop jokes the way I crop photos: keep the subject, drop the noise.",
  "If the image looks too sharp, blame the prompt — not the snake.",
];

const TEXT_JOKES = [
  "OCR read my joke as ‘0CR’. Close enough.",
  "I tried to remove text from a meme. The caption fought back.",
  "Extracted text is like a comment: useful, until it isn’t.",
  "Watermarks are just text that refused to log out.",
];

let imageCursor = 0;
let textCursor = 0;

function nextJoke(topic: SnapyJokeTopic) {
  if (topic === "image") {
    const joke = IMAGE_JOKES[imageCursor % IMAGE_JOKES.length] ?? IMAGE_JOKES[0];
    imageCursor += 1;
    return joke;
  }
  const joke = TEXT_JOKES[textCursor % TEXT_JOKES.length] ?? TEXT_JOKES[0];
  textCursor += 1;
  return joke;
}

/** Joke only when the reply is actually about images or text. */
export function withTopicJoke(body: string, topic: SnapyJokeTopic) {
  return `${body.trim()}\n\n🐍 ${nextJoke(topic)}`;
}

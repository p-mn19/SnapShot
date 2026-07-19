// parser.js
//
// Turns a File object (the .json the user picked in the browser's file
// input) into a plain JavaScript object. This is the mirror image of
// serializer.js, which went the other direction (object → file).

/**
 * Reads a File object's text content and JSON.parse()s it.
 * Throws a descriptive error if the file isn't valid JSON at all,
 * so the Import screen can show a clear message instead of a cryptic one.
 */
async function parseWorkspaceFile(file) {
  const text = await readFileAsText(file);

  try {
    return JSON.parse(text);
  } catch (err) {
    throw new Error("This file isn't valid JSON. Make sure you selected a Snapshot export file.");
  }
}

/**
 * Wraps the FileReader API (an older, callback-based browser API) in a
 * Promise so we can use async/await with it like everything else here.
 */
function readFileAsText(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = () => reject(new Error("Couldn't read the selected file."));
    reader.readAsText(file);
  });
}
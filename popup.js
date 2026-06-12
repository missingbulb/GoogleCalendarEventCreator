// Popup: runs the extractor in the active tab, shows a summary of what was
// found, and only opens the pre-filled Google Calendar event when the user
// clicks the button.
(async () => {
  const titleEl = document.getElementById("title");
  const whenEl = document.getElementById("when");
  const locationField = document.getElementById("location-field");
  const locationEl = document.getElementById("location");
  const multipleNoteEl = document.getElementById("multiple-note");
  const button = document.getElementById("create-btn");

  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });

  let data = {};
  try {
    const [injection] = await chrome.scripting.executeScript({
      target: { tabId: tab.id },
      files: EXTRACTOR_FILES,
    });
    data = (injection && injection.result) || {};
  } catch (e) {
    // Restricted page (chrome://, Web Store, etc.) — fall back to tab metadata.
    console.warn("Could not extract from page:", e);
  }

  titleEl.textContent = data.title || tab.title || "New event";
  whenEl.textContent = formatWhen(data.start, data.end);

  if (data.location) {
    locationEl.textContent = data.location;
    locationField.hidden = false;
  }

  if (data.multipleEvents) {
    multipleNoteEl.hidden = false;
  }

  const url = buildCalendarUrl(data, tab);
  button.disabled = false;
  button.addEventListener("click", async () => {
    await chrome.tabs.create({ url, index: tab.index + 1 });
    window.close();
  });
})().catch((e) => console.error("Popup failed to initialize:", e));

// Human-readable summary of the extracted date/time for the popup (separate
// from formatDatesParam's Google Calendar URL encoding).
function formatWhen(start, end) {
  if (!start) return "No date found";

  const dateOpts = { weekday: "short", year: "numeric", month: "short", day: "numeric" };

  if (/^\d{4}-\d{2}-\d{2}$/.test(start)) {
    return new Date(`${start}T00:00:00`).toLocaleDateString(undefined, dateOpts);
  }

  const startDate = new Date(start);
  if (isNaN(startDate)) return start;

  const timeOpts = { hour: "numeric", minute: "2-digit" };
  let text = `${startDate.toLocaleDateString(undefined, dateOpts)}, ${startDate.toLocaleTimeString(undefined, timeOpts)}`;

  const endDate = end ? new Date(end) : null;
  if (endDate && !isNaN(endDate) && endDate > startDate) {
    text += ` – ${endDate.toLocaleTimeString(undefined, timeOpts)}`;
  }

  return text;
}

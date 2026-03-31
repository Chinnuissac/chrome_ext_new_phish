const API_URL = "http://127.0.0.1:8000/predict_bulk";

// Track analyzed emails (NOT DOM nodes)
const analyzedEmails = new Set();

// Cache results to avoid repeated API calls
const emailCache = new Map();

// Color mapping
function getColor(color) {
  if (color === "red") return "#ea4335";
  if (color === "yellow") return "#fbbc05";
  return "#34a853";
}

// Extract emails
function getEmails() {
  const emails = [];

  document.querySelectorAll("tr.zA").forEach(row => {
    const subject = row.querySelector(".bog")?.innerText || "";
    const sender  = row.querySelector(".yP")?.innerText || "";
    const snippet = row.querySelector(".y2")?.innerText || "";

    if (!subject && !snippet) return;

    const key = subject + sender;

    emails.push({
      key,
      subject,
      sender,
      body: snippet,
      row
    });
  });

  return emails;
}

// Call backend ONLY for new emails
async function analyzeEmails(emails) {
  const newEmails = emails.filter(e => !emailCache.has(e.key));

  if (newEmails.length === 0) return null;

  try {
    const response = await fetch(API_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        emails: newEmails.map(e => ({
          subject: e.subject,
          sender: e.sender,
          body: e.body
        }))
      })
    });

    if (!response.ok) return null;

    const data = await response.json();

    // Store in cache
    newEmails.forEach((email, index) => {
      emailCache.set(email.key, data.results[index]);
    });

    return data;
  } catch (err) {
    console.error("API Error:", err);
    return null;
  }
}

// Add indicators (ALWAYS reapply UI)
function addIndicators(emails) {
  emails.forEach(email => {
    const row = email.row;
    const result = emailCache.get(email.key);

    if (!result) return;

    const subjectCell = row.querySelector(".bog");
    if (!subjectCell) return;

    // Remove old dot (if Gmail refreshed)
    const oldDot = row.querySelector(".ai-dot");
    if (oldDot) oldDot.remove();

    // Create new dot
    const dot = document.createElement("span");
    dot.className = "ai-dot";

    dot.style.background = getColor(result.color);

    dot.title = `${result.category} (${result.confidence}%)`;

    subjectCell.prepend(dot);

    // Apply row highlight
    row.classList.remove("row-red", "row-yellow", "row-green");

    if (result.color === "red") {
      row.classList.add("row-red");
    } else if (result.color === "yellow") {
      row.classList.add("row-yellow");
    } else {
      row.classList.add("row-green");
    }
  });
}

// Main function
async function runDetection() {
  const emails = getEmails();
  if (emails.length === 0) return;

  await analyzeEmails(emails);
  addIndicators(emails);
}

// Debounced observer (IMPORTANT)
let debounceTimer;

const observer = new MutationObserver(() => {
  clearTimeout(debounceTimer);

  debounceTimer = setTimeout(() => {
    runDetection();
  }, 1500);
});

observer.observe(document.body, {
  childList: true,
  subtree: true
});

// Initial run
setTimeout(runDetection, 4000);

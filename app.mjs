import { parseSearchQuery, searchMessages } from "./search.mjs";

const messages = [
  {
    id: "m-1",
    author: "Mira",
    channel: "design",
    timestamp: "2026-10-14T15:12:00.000Z",
    content: "I shared the updated launch checklist and the final review notes.",
    tags: ["file"],
    color: "#8b6fc3",
  },
  {
    id: "m-2",
    author: "Alex",
    channel: "product",
    timestamp: "2026-10-13T09:40:00.000Z",
    content: "The launch checklist is ready. The last open item is the onboarding copy.",
    tags: [],
    color: "#4a90a5",
  },
  {
    id: "m-3",
    author: "Jo",
    channel: "design",
    timestamp: "2026-10-12T17:05:00.000Z",
    content: "Here is the new dashboard image for the review. Please add comments by Friday.",
    tags: ["image"],
    color: "#c4798e",
  },
  {
    id: "m-4",
    author: "Alex",
    channel: "engineering",
    timestamp: "2026-10-11T13:28:00.000Z",
    content: "The search endpoint now supports sorting by relevance or timestamp.",
    tags: ["link"],
    color: "#4a90a5",
  },
  {
    id: "m-5",
    author: "Sam",
    channel: "product",
    timestamp: "2026-10-10T11:16:00.000Z",
    content: "Can we move the launch review to Thursday? The team has a conflict.",
    tags: [],
    color: "#5c9b78",
  },
  {
    id: "m-6",
    author: "Mira",
    channel: "design",
    timestamp: "2026-10-09T16:42:00.000Z",
    content: "The release plan is in the attached PDF. I added a short summary too.",
    tags: ["file"],
    color: "#8b6fc3",
  },
  {
    id: "m-7",
    author: "Niko",
    channel: "engineering",
    timestamp: "2026-10-08T08:54:00.000Z",
    content: "Found a small issue with the image upload. The fix is in the next build.",
    tags: ["image"],
    color: "#b78148",
  },
  {
    id: "m-8",
    author: "Alex",
    channel: "announcements",
    timestamp: "2026-10-06T12:30:00.000Z",
    content: "The launch is live! Thanks to everyone who helped with the release.",
    tags: [],
    color: "#4a90a5",
  },
  {
    id: "m-9",
    author: "Jo",
    channel: "product",
    timestamp: "2026-10-03T14:03:00.000Z",
    content: "I posted the launch checklist in the project folder. It includes the review owners.",
    tags: ["link"],
    color: "#c4798e",
  },
  {
    id: "m-10",
    author: "Mira",
    channel: "design",
    timestamp: "2026-09-29T10:21:00.000Z",
    content: "A quick look at the first dashboard mockup; the image is attached.",
    tags: ["image"],
    color: "#8b6fc3",
  },
];

const queryInput = document.querySelector("#query");
const form = document.querySelector("#search-form");
const resultsList = document.querySelector("#results");
const resultCount = document.querySelector("#result-count");
const emptyState = document.querySelector("#empty-state");
const activeFilters = document.querySelector("#active-filters");
const queryHelp = document.querySelector("#query-help");
let sortMode = "relevance";

function formatTimestamp(timestamp) {
  return new Intl.DateTimeFormat(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  }).format(new Date(timestamp));
}

function appendHighlightedContent(element, content, terms) {
  const needles = [...new Set(terms.map((term) => term.toLocaleLowerCase()).filter(Boolean))];
  const matches = [];

  for (const needle of needles) {
    let start = 0;
    while ((start = content.toLocaleLowerCase().indexOf(needle, start)) !== -1) {
      matches.push({ start, end: start + needle.length });
      start += needle.length;
    }
  }

  matches.sort((left, right) => left.start - right.start || right.end - left.end);
  let cursor = 0;
  for (const match of matches) {
    if (match.start < cursor) continue;
    element.append(document.createTextNode(content.slice(cursor, match.start)));
    const mark = document.createElement("mark");
    mark.textContent = content.slice(match.start, match.end);
    element.append(mark);
    cursor = match.end;
  }
  element.append(document.createTextNode(content.slice(cursor)));
}

function createResultCard(message, terms) {
  const item = document.createElement("li");
  const card = document.createElement("article");
  card.className = "result-card";

  const meta = document.createElement("div");
  meta.className = "result-meta";
  const avatar = document.createElement("span");
  avatar.className = "avatar";
  avatar.style.setProperty("--avatar-color", message.color);
  avatar.textContent = message.author.slice(0, 1).toUpperCase();

  const author = document.createElement("span");
  author.className = "author-name";
  author.textContent = message.author;
  const dot = document.createElement("span");
  dot.className = "meta-dot";
  dot.textContent = "·";
  const channel = document.createElement("span");
  channel.className = "channel-name";
  channel.textContent = `# ${message.channel}`;
  const time = document.createElement("time");
  time.className = "result-time";
  time.dateTime = message.timestamp;
  time.textContent = formatTimestamp(message.timestamp);

  meta.append(avatar, author, dot, channel, time);

  const content = document.createElement("p");
  content.className = "result-content";
  appendHighlightedContent(content, message.content, terms);

  card.append(meta, content);
  if (message.tags.length) {
    const tags = document.createElement("div");
    tags.className = "result-tags";
    for (const tag of message.tags) {
      const badge = document.createElement("span");
      badge.className = "result-tag";
      badge.textContent = tag;
      tags.append(badge);
    }
    card.append(tags);
  }
  item.append(card);
  return item;
}

function renderFilters(filters) {
  activeFilters.replaceChildren();
  for (const label of filters) {
    const chip = document.createElement("span");
    chip.className = "active-filter";
    chip.textContent = label;
    activeFilters.append(chip);
  }
}

function render() {
  let parsed;
  let results;
  try {
    ({ parsed, results } = searchMessages(messages, queryInput.value, sortMode));
  } catch (error) {
    queryHelp.textContent = error.message;
    queryHelp.classList.add("has-error");
    resultsList.replaceChildren();
    resultCount.textContent = "Fix the query to see results";
    emptyState.hidden = true;
    activeFilters.replaceChildren();
    return;
  }

  queryHelp.textContent = "Type a phrase or add filters. Press Enter to search.";
  queryHelp.classList.remove("has-error");
  resultCount.textContent = `${results.length} ${results.length === 1 ? "message" : "messages"} found`;
  renderFilters(parsed.filterLabels);
  resultsList.replaceChildren(
    ...results.map((message) => createResultCard(message, parsed.terms)),
  );
  emptyState.hidden = results.length !== 0;
}

form.addEventListener("submit", (event) => {
  event.preventDefault();
  render();
  queryInput.focus();
});

queryInput.addEventListener("input", render);

document.querySelectorAll(".sort-button").forEach((button) => {
  button.addEventListener("click", () => {
    sortMode = button.dataset.sort;
    document.querySelectorAll(".sort-button").forEach((option) => {
      const active = option === button;
      option.classList.toggle("is-active", active);
      option.setAttribute("aria-pressed", String(active));
    });
    render();
  });
});

document.querySelectorAll("[data-query]").forEach((button) => {
  button.addEventListener("click", () => {
    const example = button.dataset.query;
    const current = queryInput.value.trim();
    queryInput.value = current ? `${current} ${example}` : example;
    render();
    queryInput.focus();
  });
});

render();

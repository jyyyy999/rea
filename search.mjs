const FILTER_KEYS = new Set(["from", "in", "before", "after", "has", "content"]);
const VALID_HAS_TYPES = new Set([
  "image",
  "sound",
  "video",
  "file",
  "sticker",
  "embed",
  "link",
  "poll",
  "snapshot",
]);

function tokenize(query) {
  const tokens = [];
  let token = "";
  let quoted = false;
  let escaping = false;

  for (const character of query) {
    if (escaping) {
      token += character;
      escaping = false;
    } else if (character === "\\" && quoted) {
      escaping = true;
    } else if (character === '"') {
      quoted = !quoted;
    } else if (/\s/.test(character) && !quoted) {
      if (token) {
        tokens.push(token);
        token = "";
      }
    } else {
      token += character;
    }
  }

  if (escaping) token += "\\";
  if (quoted) throw new SyntaxError("Close the quotation mark around your phrase.");
  if (token) tokens.push(token);
  return tokens;
}

function isValidDate(value) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const date = new Date(`${value}T00:00:00.000Z`);
  return !Number.isNaN(date.getTime()) && date.toISOString().slice(0, 10) === value;
}

export function parseSearchQuery(query) {
  const parsed = {
    terms: [],
    filters: {
      from: [],
      in: [],
      before: null,
      after: null,
      has: [],
    },
    filterLabels: [],
  };

  for (const token of tokenize(query.trim())) {
    const separator = token.indexOf(":");
    if (separator === -1) {
      parsed.terms.push(token);
      continue;
    }

    const key = token.slice(0, separator).toLowerCase();
    const value = token.slice(separator + 1).trim();
    if (!FILTER_KEYS.has(key)) {
      throw new SyntaxError(`Unknown filter "${key}:".`);
    }
    if (!value) throw new SyntaxError(`Add a value after "${key}:".`);

    if (key === "from" || key === "in") {
      parsed.filters[key].push(value.toLocaleLowerCase());
      parsed.filterLabels.push(`${key}:${value}`);
    } else if (key === "before" || key === "after") {
      if (!isValidDate(value)) {
        throw new SyntaxError(`Use a real date in YYYY-MM-DD format after "${key}:".`);
      }
      if (parsed.filters[key]) {
        throw new SyntaxError(`Use "${key}:" only once.`);
      }
      parsed.filters[key] = value;
      parsed.filterLabels.push(`${key}:${value}`);
    } else if (key === "has") {
      const type = value.toLowerCase();
      if (!VALID_HAS_TYPES.has(type)) {
        throw new SyntaxError(`Unsupported has:${type}. Try image, file, link, or video.`);
      }
      if (!parsed.filters.has.includes(type)) parsed.filters.has.push(type);
      parsed.filterLabels.push(`has:${type}`);
    } else {
      parsed.terms.push(value);
    }
  }

  return parsed;
}

function matchesText(message, terms) {
  const content = message.content.toLocaleLowerCase();
  return terms.every((term) => content.includes(term.toLocaleLowerCase()));
}

function matchesFilters(message, filters) {
  const author = message.author.toLocaleLowerCase();
  const channel = message.channel.toLocaleLowerCase();
  const messageDate = message.timestamp.slice(0, 10);

  if (filters.from.length && !filters.from.some((name) => author.includes(name))) return false;
  if (filters.in.length && !filters.in.some((name) => channel.includes(name))) return false;
  if (filters.before && messageDate >= filters.before) return false;
  if (filters.after && messageDate <= filters.after) return false;
  if (filters.has.length && !filters.has.some((type) => message.tags.includes(type))) return false;
  return true;
}

function relevanceScore(message, terms) {
  const content = message.content.toLocaleLowerCase();
  return terms.reduce((score, term) => {
    const needle = term.toLocaleLowerCase();
    let index = 0;
    let occurrences = 0;
    while ((index = content.indexOf(needle, index)) !== -1) {
      occurrences += 1;
      index += needle.length;
    }
    return score + (occurrences ? 1 + Math.min(occurrences, 4) * 0.15 : 0);
  }, 0);
}

export function searchMessages(messages, query, sort = "relevance") {
  const parsed = parseSearchQuery(query);
  const results = messages
    .filter((message) => matchesText(message, parsed.terms) && matchesFilters(message, parsed.filters))
    .map((message) => ({
      ...message,
      score: relevanceScore(message, parsed.terms),
    }));

  results.sort((left, right) => {
    if (sort === "relevance" && right.score !== left.score) return right.score - left.score;
    return right.timestamp.localeCompare(left.timestamp);
  });

  return { parsed, results };
}

export const searchFilterKeys = [...FILTER_KEYS];

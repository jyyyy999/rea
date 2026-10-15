import assert from "node:assert/strict";
import test from "node:test";
import { parseSearchQuery, searchMessages } from "./search.mjs";

const records = [
  {
    id: "newest",
    author: "Mira",
    channel: "design",
    timestamp: "2026-10-14T10:00:00.000Z",
    content: "The launch checklist is ready.",
    tags: ["file"],
  },
  {
    id: "older",
    author: "Alex",
    channel: "product",
    timestamp: "2026-10-08T10:00:00.000Z",
    content: "Launch notes and checklist.",
    tags: ["image"],
  },
  {
    id: "old",
    author: "Mira",
    channel: "design",
    timestamp: "2026-09-28T10:00:00.000Z",
    content: "The launch plan.",
    tags: [],
  },
];

test("parses quoted phrases and supported filters", () => {
  const parsed = parseSearchQuery('"launch checklist" from:mira in:design has:file');
  assert.deepEqual(parsed.terms, ["launch checklist"]);
  assert.deepEqual(parsed.filters.from, ["mira"]);
  assert.deepEqual(parsed.filters.in, ["design"]);
  assert.deepEqual(parsed.filters.has, ["file"]);
});

test("rejects unknown filters and malformed dates", () => {
  assert.throws(() => parseSearchQuery("during:today"), /Unknown filter/);
  assert.throws(() => parseSearchQuery("after:2026-02-30"), /real date/);
  assert.throws(() => parseSearchQuery('"unfinished phrase'), /Close the quotation mark/);
});

test("applies text, author, channel, date, and attachment filters", () => {
  const { results } = searchMessages(
    records,
    "launch from:mira in:design after:2026-10-01 before:2026-10-15 has:file",
  );
  assert.deepEqual(results.map((message) => message.id), ["newest"]);
});

test("keeps all text terms required and supports any selected has filter", () => {
  const { results } = searchMessages(records, "launch checklist has:image has:file");
  assert.deepEqual(results.map((message) => message.id), ["newest", "older"]);
  assert.deepEqual(searchMessages(records, "launch missing").results, []);
});

test("sorts matching messages by recency or relevance", () => {
  const newestFirst = searchMessages(records, "launch", "newest").results;
  const relevantFirst = searchMessages(records, "launch checklist", "relevance").results;
  assert.deepEqual(newestFirst.map((message) => message.id), ["newest", "older", "old"]);
  assert.equal(relevantFirst[0].id, "newest");
});

# Arc Search demo

A dependency-free, client-side message-search demo inspired by Discord's message search. It runs against the sample records in `app.mjs`; it does not connect to Discord, a server, or a real account.

## Run

From this directory, start the included local static server:

```sh
node serve.mjs
```

Then open <http://127.0.0.1:8000>. Run the search tests with:

```powershell
node --test search.test.mjs
```

## Query syntax

- Plain words are all required and match message text without case sensitivity.
- Double quotes keep a phrase together, such as `"launch checklist"`.
- `from:name` matches an author; repeated author filters match any listed author.
- `in:channel` matches a channel; repeated channel filters match any listed channel.
- `after:YYYY-MM-DD` and `before:YYYY-MM-DD` restrict the date range. These boundaries are exclusive.
- `has:image`, `has:file`, `has:link`, `has:video`, `has:sound`, `has:sticker`, `has:embed`, `has:poll`, and `has:snapshot` filter attachment/message tags. Repeated `has:` filters match any selected type.
- The sort control switches between relevance and newest-first order.

The query parser and matching behavior live in `search.mjs`; replace the sample array in `app.mjs` and adapt the matcher when integrating a real project data source.

## Research basis and limits

- The installed Discord `app.asar` identifies itself as a desktop bootstrapper. REA static-analysis Evidence `ev_6c2ef0b328e1a4290c62385f5bb57fe2b9166fc145178e2785ada29e8f61f7ec` covers that archive (SHA-256 `535bcb3de917fa65289519e399ea82ab93d9e4df35f7b437ae8433e5ca9d39ca`).
- In the installed `core.asar`, the `bundle.js` text declares `DISCORD_SEARCH_INDEX_DOMAINS`, `DISCORD_SEARCH_CLEAR_INDEX`, `DISCORD_SEARCH_DELETE_DOMAINS`, and `DISCORD_SEARCH_DELETE_ITEMS`; handlers delegate to index/clear/delete methods. REA Evidence `ev_3c1a37654f3137771b5c111d7efdffba5a2a3294e535655bbc7d11db1ea7a870` covers the archive (SHA-256 `396088f647b3084fc3b6efedd7c5e50eb4d7b9575b817e9b689ff739a54e0c04`). This is static evidence of a desktop search-index bridge, not evidence that it powers message search.
- Discord's [official developer docs for guild message search](https://github.com/discord/discord-api-docs/blob/main/developers/resources/message.mdx#search-guild-messages-query-string-params) describe a server-side search endpoint, content and metadata filters, bounded result pages, and timestamp/relevance sorting. That API contract does not establish the exact Discord desktop UI parser or internal request flow.
- The app UI and query syntax here are an independent local implementation choice. The sample data and search index are in memory; no Discord account, message history, or network API is accessed.

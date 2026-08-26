// Navigate to GitHub repo URL and snapshot to check login state
await tools.browser_navigate({ url: "https://github.com/respect3227/OracleKnowledge" });
await tools.browser_wait_for({ time: 3 });
const snap = await tools.browser_snapshot({ compact: true, interactive: true, maxDepth: 6, maxNodes: 500 });
text(snap);

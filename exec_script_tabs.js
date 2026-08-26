const tabs = await tools.browser_tabs({ action: "list" });
text(JSON.stringify(tabs, null, 2));

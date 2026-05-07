chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === 'callApi') {
    const { method, url, apiKey, body } = request;

    const headers = {
      'Content-Type': 'application/json',
      'X-Api-Key': apiKey
    };
    const fetchOptions = { method, headers };
    if (body) fetchOptions.body = JSON.stringify(body);

    fetch(url, fetchOptions)
      .then(async (resp) => {
        const text = await resp.text();
        let data;
        try {
          data = JSON.parse(text);
        } catch (e) {
          throw new Error('Response không phải JSON: ' + text);
        }
        if (!resp.ok) throw new Error(data.error || `HTTP ${resp.status}`);
        sendResponse({ success: true, data });
      })
      .catch(err => sendResponse({ success: false, error: err.message }));

    return true;
  }
});

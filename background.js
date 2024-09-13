chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
    if (changeInfo.status === 'complete' && tab.url && tab.url.includes("youtube.com/watch")) {
        const queryParameters = tab.url.split("?")[1]; // get the segment after ? in the URL
        const urlParameters = new URLSearchParams(queryParameters);

        chrome.tabs.sendMessage(tabId, {
            type: "NEW_VIDEO_LOADED",
            videoId: urlParameters.get("v"), // get the video ID from the URL
        });
    }

});

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    // if the message is requesting the URL of the active tab
    if (message.action === 'getCurrentUrl') {
        chrome.tabs.query({ active: true, currentWindow: true}, (tabs) => {
            sendResponse({ url: tabs[0].url });
        });
    }
    // response will be sent async
    return true;
});




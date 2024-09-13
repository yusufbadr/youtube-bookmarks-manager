
// ------ UTILITY FUNCTIONS -----

const displayNotYouTubePage = () => {
    const mainContainerElement = document.getElementById("container");
    const notYouTubeElement = document.createElement("div");
    notYouTubeElement.id = "not-youtube";
    notYouTubeElement.innerText = "This is not a YouTube page :(";
    mainContainerElement.append(notYouTubeElement);
}


// return a string of the formatted time
const getFormattedTime = (time) => {
    // time is in seconds

    // convert to hours, minutes and seconds
    const hours = Math.floor(time/3600);
    const minutes = Math.floor((time % 3600) / 60);
    const seconds = Math.floor(time % 60);

    const hoursStr = hours > 0 ? `${hours}:` : ``;
    const minutesStr = minutes < 10 ? `0${minutes}:` : `${minutes}:`;
    const secondsStr = seconds < 10 ? `0${seconds}` : `${seconds}`;

    return `${hoursStr}${minutesStr}${secondsStr}`;

}


const setControl = (src, handleEvent, ParentElement) => {
    const controlElement = document.createElement("img");
    controlElement.src = "assets/" + src + ".png";
    controlElement.title = src;
    controlElement.addEventListener("click", handleEvent);
    ParentElement.append(controlElement);
}


const getActiveTab = async () => {
    const tabs = await chrome.tabs.query({ active: true, currentWindow: true});
    return tabs[0];
}


// ------ STORAGE HANDLING -----


const getCurrentVideoBookmarks = (currentVideoId) => {
    return new Promise ((resolve, reject) => {
        chrome.storage.local.get([currentVideoId], (obj) => {
            if (obj[currentVideoId]){
                resolve(obj[currentVideoId].bookmarks || []);
            } else {
                resolve([]);
            }
        });

    });

};


const getVideoTitle = (currentVideoId) => {
    return new Promise ((resolve, reject) => {
        chrome.storage.local.get([currentVideoId], (obj) => {
            if (obj[currentVideoId]){
                resolve(obj[currentVideoId].title || "YouTube Video");
            } else {
                resolve("YouTube Video");
            }
        });

    });

}


// ------ BOOKMARK RENDERING -----


const addNewBookmark = (mainContainerElement, timestamp) => {
    const bookmarkDescription = document.createElement("div");
    bookmarkDescription.textContent = "Bookmark at " + getFormattedTime(timestamp);
    bookmarkDescription.className = "bookmark-description";

    
    const bookmarkControls = document.createElement("div");
    bookmarkControls.className = "bookmarks-controls";

    setControl("play", onPlayBookmark, bookmarkControls);
    setControl("delete", onDeleteBookmark, bookmarkControls);

    const newBookmarkContainer = document.createElement("div");
    newBookmarkContainer.className = "bookmark-container";
    newBookmarkContainer.setAttribute("data-timestamp", timestamp)

    newBookmarkContainer.append(bookmarkDescription, bookmarkControls);
    mainContainerElement.append(newBookmarkContainer);
}


const viewCurrentVideoBookmarks = async (currentVideoId) => {
    const currentBookmarks = await getCurrentVideoBookmarks(currentVideoId);
    const videoTitle = await getVideoTitle(currentVideoId);
    
    const mainContainerElement = document.getElementById("container");
    
    // clear existing content if any
    mainContainerElement.innerHTML = "";

    const videoTitleElement = document.createElement("div");
    videoTitleElement.className = "main-video-title";
    videoTitleElement.innerText = videoTitle;

    mainContainerElement.append(videoTitleElement);

    
    if (currentBookmarks.length>0){
        for (let i = 0; i < currentBookmarks.length; i++){
            const timestamp = currentBookmarks[i];
            // adds a new bookmark to the user's view
            addNewBookmark(mainContainerElement, timestamp);
        }
    } else {
        const noBookmarksElement = document.createElement("div");
        noBookmarksElement.className = "no-bookmarks";
        noBookmarksElement.innerText = "No bookmarks to show";
        mainContainerElement.append(noBookmarksElement);
    }
}


const viewAllBookmarks = (videosData) => {

    // videosData => "videoId" : {"videoTitle": "testTitle", "bookmarks": [<timestamps>] }

    const mainContainerElement = document.getElementById("container");
    mainContainerElement.innerHTML = "";

    const pageTitleElement = document.createElement("div");
    pageTitleElement.id = "page-title";
    pageTitleElement.innerText = "YouTube Bookmarks Manager";

    mainContainerElement.append(pageTitleElement);

    if (videosData && Object.keys(videosData).length > 0){
        for (videoId in videosData) {
            const videoData = videosData[videoId];
            if (videoData) {
                const videoContainerElement = document.createElement("div");
                videoContainerElement.className = "video-container";
                videoContainerElement.setAttribute("data-video-id", videoId);
    
                // video title
                const videoTitleElement = document.createElement("div");
                videoTitleElement.className = "video-title";
                videoTitleElement.innerText = videoData.title;
                videoContainerElement.append(videoTitleElement);
    
                // video controls
                const videoControls = document.createElement("div");
                videoControls.className = "video-controls";
                setControl("play", openVideo, videoControls);
                setControl("delete", deleteAllBookmarks, videoControls);
                videoContainerElement.append(videoControls);
    
    
                mainContainerElement.append(videoContainerElement);
                
            }
            
        }

    } else {
        const noBookmarksElement = document.createElement("div");
        noBookmarksElement.className = "no-bookmarks";
        noBookmarksElement.innerText = "No bookmarks to show";
        mainContainerElement.append(noBookmarksElement);

    }   

}


// ------ EVENT HANDLERS -----


const onPlayBookmark = async (e) => {
    const activeTab = await getActiveTab();
    const bookmarkElement = e.target.closest(".bookmark-container");

    if (bookmarkElement) {
        const timestamp = bookmarkElement.getAttribute("data-timestamp");

        chrome.tabs.sendMessage(activeTab.id, {
            type: "PLAY_BOOKMARK",
            value: timestamp,
        });

    } 

}


const onDeleteBookmark = async (e) => {
    const activeTab = await getActiveTab();

    // element to delete
    const bookmarkElement = e.target.closest(".bookmark-container");
    
    if (bookmarkElement) {
        const timestamp = bookmarkElement.getAttribute("data-timestamp");

        chrome.tabs.sendMessage(activeTab.id, {
            type: "DELETE_BOOKMARK",
            value: timestamp,
        }, viewCurrentVideoBookmarks);

    }
}


const openVideo = (e) => {
    const videoContainerElement = e.target.closest(".video-container");
    const videoId = videoContainerElement.getAttribute("data-video-id");

    const videoURL = `https://www.youtube.com/watch?v=${videoId}`;
    chrome.tabs.create({url: videoURL});

}


const deleteAllBookmarks = (e) => {
    // closest video container element
    const videoContainerElement = e.target.closest(".video-container");
    const videoId = videoContainerElement.getAttribute("data-video-id");

    chrome.storage.local.remove(videoId, () => {
        // refresh view
        chrome.storage.local.get(null, (result) => {
            viewAllBookmarks(result);
        });
    });
}


// ------ MAIN EVENT LISTENER -----


document.addEventListener("DOMContentLoaded", async () => {
    const activeTab = await getActiveTab();
    const queryParameters = activeTab.url.split("?")[1]; // get the segment after ? in the URL
    const urlParameters = new URLSearchParams(queryParameters);
    const currentVideoId =  urlParameters.get("v"); // get the video ID from the URL

    if (activeTab.url.includes("youtube.com/watch") && currentVideoId) {
        viewCurrentVideoBookmarks(currentVideoId);
    } else if (activeTab.url.includes("youtube.com")){
        chrome.storage.local.get(null, (result) => {
            viewAllBookmarks(result);
        });
        
    } else {
        // this is not a youtube page :(
        displayNotYouTubePage();
    }

});
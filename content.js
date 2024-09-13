(() => {
    let youtubeLeftControls, youtubePlayer;
    let currentVideoId = "";
    let currentVideoBookmarks = [];
    let currentVideoTitle = "";


    // storage structure
    // "videoId" : {"videoTitle": "testTitle", "bookmarks": [<timestamps>] }


    // ------ HELPER FUNCTIONS -----


    const fetchCurrentVideoBookmarks = () => {
        // bookmarks for the video is accessed through currentVideoId
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


    const isYouTubeVideoPage = (url) => {
        return url.includes("youtube.com/watch");
    };


    // ------ Event Handlers -----


    const addNewBookmarkEventHandler = async () => {
        // set currentVideoTitle to match the title of the video
        if (currentVideoTitle == ""){
            currentVideoTitle = document.title;
            if (currentVideoTitle.includes("- YouTube")){
                currentVideoTitle = currentVideoTitle.replace("- YouTube", "").trim();
            }
        }
        
        
        const currentTime = youtubePlayer.currentTime;

        // get current bookmarks if any
        currentVideoBookmarks = await fetchCurrentVideoBookmarks();
        const newBookmark = currentTime;

        // save bookmarks to the storage inc. the new one
        chrome.storage.local.set({
            [currentVideoId]: {
                title: currentVideoTitle,
                bookmarks: [...currentVideoBookmarks, newBookmark].sort((a, b) => a - b)
            }
        }, () => {
            fetchCurrentVideoBookmarks().then(updatedBookmarks => {
                // update global var
                currentVideoBookmarks = updatedBookmarks; 
            });
        });  
    };

    
    const newVideoLoaded = async () => {

        youtubeLeftControls = document.getElementsByClassName("ytp-left-controls")[0];
        youtubePlayer = document.getElementsByClassName("video-stream")[0];
        
        currentVideoTitle = "";

        if (youtubeLeftControls && youtubePlayer) {

            currentVideoBookmarks = await fetchCurrentVideoBookmarks();
            
            // add a bookmarks button if it does not exist

            let bookmarkBtn = document.getElementsByClassName("bookmark-btn")[0];
    
            if(!bookmarkBtn){
                // create a an element for a bookmark button
                bookmarkBtn = document.createElement("img");
                bookmarkBtn.src = chrome.runtime.getURL("assets/bookmark.png");
                bookmarkBtn.className = "ytp-button " + "bookmark-btn";
                bookmarkBtn.title = "Click to add a bookmark here!";

                // maintain aspect ratio
                bookmarkBtn.style.objectFit = "contain";
                
                // add created element to left controls
                youtubeLeftControls.append(bookmarkBtn);

                // add an even listener to detect when the bookmark is clicked
                bookmarkBtn.addEventListener("click", addNewBookmarkEventHandler);

            }
        
        }

    };

    
    // ------ CORE LOGIC -----


    chrome.runtime.onMessage.addListener((obj, sender, response) => {
        const { type, value, videoId } = obj;
        if (type === "NEW_VIDEO_LOADED") {
            currentVideoId = videoId;
            newVideoLoaded();
        } else if (type === "PLAY_BOOKMARK") {
            youtubePlayer.currentTime = value;
        } else if (type === "DELETE_BOOKMARK") {
            // Tolerance level for timestamp comparisons
            const epsilon = 1e-3;

            currentVideoBookmarks = currentVideoBookmarks.filter( (bookmark) => {
                // since both values are floating-point numbers
                return Math.abs(bookmark - value) > epsilon;
            });

            if (currentVideoBookmarks.length>0){
                chrome.storage.local.set({ 
                    [currentVideoId]: {
                        title: currentVideoTitle,
                        bookmarks: currentVideoBookmarks
                    }
                }, () => {
                    // send the videoId back
                    response(currentVideoId);
                });
            } else {
                chrome.storage.local.remove(currentVideoId, () => {
                    // send the videoId back
                    response(currentVideoId);
                });
            }
            // return true to indicate that the response will be sent async
            return true;
        }
    });


    // ------ Event Listeners -----


    // shortcut alt + b for adding a new bookmark
    document.addEventListener("keydown", (e) => {
        if (e.altKey && e.key.toLowerCase() === 'b') {
            // check if current page is a youtube video page
            chrome.runtime.sendMessage({ action: "getCurrentUrl" }, (response) => {
                if (response.url && isYouTubeVideoPage(response.url)) {
                    e.preventDefault();
                    addNewBookmarkEventHandler();
                }
            }); 
        }
    });

})();


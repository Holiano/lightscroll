# Hidden suggested posts collapse, and the app holds the screen still

A hidden suggested post collapses to zero height but stays on the page, so the feed reads as if it was never there. Instagram's feed doesn't keep its place when something above the screen changes size, so whenever a post above the screen collapses, the app scrolls by the same amount to keep what you're looking at still. Two earlier attempts failed: removing posts outright (`display: none`) made the feed jump back to the top, and leaving a full-size empty box worked but looked bad.

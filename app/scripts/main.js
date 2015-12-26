// Initialize collapse button
$(".button-collapse").sideNav();
// Initialize collapsible (uncomment the line below if you use the dropdown variation)
//$('.collapsible').collapsible();

var notificationTimeout = 4000;
var attemptNotification = function (notification) {
    var doNotification = function () {
        var n = new Notification(notification.title,notification);
        setTimeout(function () {
            n.close();
        },notificationTimeout);
    };
    var doToast = function () {
        Materialize.toast(notification.title,notificationTimeout);
    };

    if (!("Notification" in window)) {
        console.log("This browser does not support desktop notification");
        doToast();
    }

    else if (Notification.permission === "granted") {
        doNotification();
    }

    else if (Notification.permission !== 'denied') {
        Notification.requestPermission(function (permission) {
            if (permission === "granted") {
                doNotification();
            } else {
                doToast();
            }
        });
    }
};
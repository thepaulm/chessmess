const port = 8245;
const feedback_url = `${window.location.origin}:${port}`;

function make_cancel_handler(w) {
    return async function (e) {
        window.self.close();
    }
}

function make_send_handler(ff) {
    return async function (e) {
        console.log("got feedback: " + ff.value);
        await fetch(feedback_url, {
            method: "POST",
            headers: {
                "Content-Type": "application/text"
            },
            body: ff.value}).catch(error => {
                    console.error("Error occurred:", error); // Handle errors
            });
        window.self.close();
    }
}

(function () {
    var cancel = document.getElementById('cancel');
    cancel.addEventListener('click', make_cancel_handler(cancel));
    var feedback_form = document.getElementById('feedback');
    var send = document.getElementById('send');
    send.addEventListener('click', make_send_handler(feedback_form));
})();

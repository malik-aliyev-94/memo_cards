function getMessage(theMessageEvent) {
    var x = 1;

    if (theMessageEvent.name === "get") {

        var docHost = document.location.host;
        var result = {
            error: true,
            message: ''
        };

        if ( docHost.includes('translate.google.') ) {
            var source =  document.querySelector('textarea#source').value;
            var translation = document.querySelector('.tlid-translation.translation span').innerText;
            var translit = document.querySelector('.tlid-transliteration-content.transliteration-content.full').innerHTML;
            var result = {
                error: false,
                message: '',
                source: source,
                translation: translation,
                translit: translit
            };
        } else {
            result['message'] = "Document URL not allowed.";
        }

        safari.self.tab.dispatchMessage("response", result);
    }
}

safari.self.addEventListener("message", getMessage, false);

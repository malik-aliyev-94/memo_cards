var socket = io.connect('http://localhost:4200');
var connected = false;

socket.on('connect', function(data) {
    connected = true;
    document.querySelector('#conn').style.color = 'green';
    document.querySelector('#conn').innerHTML = 'Connected';
    socket.emit('join', 'Hello World from client - chrome ext');
});

socket.on('connect_error', function(err) {
    connected = false;
    document.querySelector('#conn').style.color = 'red';
    document.querySelector('#conn').innerHTML = 'Not connected';
    console.log('can not connect');
});

socket.on('result', function(data) {
    console.log(data);
    if (data.result) {
        document.querySelector('#save').style.display = 'none';
        document.querySelector('#alert').style.display = 'none';
    } else {
        document.querySelector('#alert').style.display = 'block';
        document.querySelector('#alert').innerHTML = data.message;
        setTimeout(function(){
            document.querySelector('#save').style.display = 'block';
        }, 500);
    }
});

function modifyDOM() {
    //You can play with your DOM here or check URL against your regex
    var docHost = document.location.host;
    var result = {
        error: true,
        message: ''
    };

    // if ( docHost.includes('vocabulary.com') || docHost.includes('translate.google.') ) {
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

    return result;
}

//We have permission to access the activeTab, so we can call chrome.tabs.executeScript:
chrome.tabs.executeScript({
code: '(' + modifyDOM + ')();' //argument here is a string but function.toString() returns function's code
}, (results) => {
    var result = results[0];
    //Here we have just the innerHTML and not DOM structure
    console.log('Popup script:')
    if ( !result.error ) {
        document.querySelector('#save').style.display = 'block';
        document.querySelector('#result').style.display = 'table';
        document.querySelector('#alert').style.display = 'none';
        document.querySelector('#alert').innerHTML = '';

        document.querySelectorAll('#result tbody tr td')[0].querySelector('input').value = result.source;
        document.querySelectorAll('#result tbody tr td')[1].querySelector('input').value = result.translit;
        document.querySelectorAll('#result tbody tr td')[2].querySelector('input').value = result.translation;
    } else {
        document.querySelector('#save').style.display = 'none';
        document.querySelector('#result').style.display = 'none';
        document.querySelector('#alert').style.display = 'block';
        document.querySelector('#alert').innerHTML = result.message;
        
        console.log(result.message);
    }
    
});

document.getElementById("save").addEventListener('click', () => {
    if ( connected ) {
        var data = {
            source: document.querySelectorAll('#result tbody tr td')[0].querySelector('input').value,
            translit: document.querySelectorAll('#result tbody tr td')[1].querySelector('input').value,
            translation: document.querySelectorAll('#result tbody tr td')[2].querySelector('input').value
        };
        document.querySelector('#save').style.display = 'none';
        socket.emit('add', data);
    } else {
        document.querySelector('#alert').style.display = 'block';
        document.querySelector('#alert').innerHTML = "Can't establish socket connection";
    }
});


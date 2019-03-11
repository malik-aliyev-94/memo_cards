var socket = io.connect('http://localhost:4200');
var connected = false;

socket.on('connect', function(data) {
    connected = true;
    document.querySelector('#conn').style.color = 'green';
    document.querySelector('#conn').innerHTML = 'Connected';
    socket.emit('join', 'Hello World from client - safari ext');
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

function popoverHandler() {
    if (safari.application.activeBrowserWindow.activeTab.page)
        safari.application.activeBrowserWindow.activeTab.page.dispatchMessage('get', '');
    else {
        document.querySelector('#save').style.display = 'none';
        document.querySelector('#result').style.display = 'none';
        document.querySelector('#alert').style.display = 'block';
        document.querySelector('#alert').innerHTML = "Document URL not allowed.";
    }
}

safari.application.addEventListener("popover", popoverHandler, true);

function getMessage(theMessageEvent) {
    if(theMessageEvent.name === "response") {
        var result = theMessageEvent.message;

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
        }
    }
}

safari.application.addEventListener("message",getMessage,false);

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
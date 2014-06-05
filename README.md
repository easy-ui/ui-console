[![NPM](https://nodei.co/npm/uiconsole.png)](https://nodei.co/npm/uiconsole/)

ui-console
==========

Web developer tools for testing, scripting and debugging on remote devices.
This project is under work and maybe there some bug.


Installation
============

Install this globally and you'll have access to the `uiconsole` command anywhere on your system.

    npm install -g uiconsole
    
    
**Usage**
=========

You only need to start 'uiconsole' and a web server and a socket server run on port 8080.

Open your browser for access to the `uiconsole`.

    http://<your_ip>:8080
     

Then add this code on your target web page:

    
    <script src="http://<your_ip>:8080/socket.io/socket.io.js"></script>
    <script>
        if(typeof io != 'undefined'){
            var socket = io.connect('http://<your_ip>:8080');
            socket.on('connect', function(){console.log('CLIENT socket.on: connect');socket.emit('connect', {data: navigator.userAgent});});
            socket.on('jscmd', function(data){try{eval(data.cmd);}catch(error){console.log(error);}});
        }
    </script>
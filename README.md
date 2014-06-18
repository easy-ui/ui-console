[![NPM](https://nodei.co/npm/uiconsole.png?downloads=true&stars=true)](https://nodei.co/npm/uiconsole/)
[![NPM version](https://badge.fury.io/js/uiconsole.svg)](http://badge.fury.io/js/uiconsole)
[![Gittip](http://img.shields.io/gittip/easy-ui.svg)](https://www.gittip.com/easy-ui/)

Versions
=========

**v 0.1.8 - 2014/06/18**
* Add TAP support example with Broserify

**v 0.1.5 - 2014/06/18**

* Convert project to socket.io 1.0.4
* Fix bug on screenshot

**v 0.1.4 - 2014/06/17**

* Convert project to socket.io 1.0.0
* Not completly functional.

**v 0.1.0 - 2014/06/17**

* Bug fix, and is completly functional.


**ui-console the web console**
==========

Web developer tools for testing, scripting and debugging on remote
devices. This project is under work and maybe there some bug. I made
this tool for my own use at the beginning and I thought it might be
useful to other people too.

With `uiconsole` you run on remote devices (Android, IOS, Computer ...) [Firebug lite](https://getfirebug.com/firebuglite), [WEINRE](http://people.apache.org/~pmuellr/weinre/docs/latest/Home.html), [GREMLIN.JS](http://grml.in/), [TAPE](https://www.npmjs.org/package/tape)

You are able to take a Screenshot of the current web page too. This is possible with the [html2canvas](http://html2canvas.hertzen.com/documentation.html) library.

There is a JSCONSOLE, which allows you to send javascript commands to the target Web page.

You can also define commands javascript to run tests simultaneously on your different devices.

This is very useful when you need to see a page rendering on different devices, phone, tablet or computer at the same time. Need to enter the same login passwords on all devices, a real time saver.

![Screenshot of application](https://raw.githubusercontent.com/easy-ui/ui-console/master/images/uiconsole-screenshot.jpg "Uiconsole manager")

Installation
============

Install this globally and you'll have access to the `uiconsole` command anywhere on your system.

    npm install -g uiconsole
    
    
Usage
=====

 - Create a folder.

        mkdir uiconsole
        cd uiconsole
        
 - Generate config file.
 
        uiconsole init
        
 - Setup your server parameters in _conf.json
        
        {
            "host": "192.168.2.136",
            "port": "8080",
            "weinreHost": "192.168.2.136",
            "weinrePort": "8282"
        }
   
 - Populate database.
 
        uiconsole initdb
        
 - A small SQLite database is created for user management. The default account is `admin` for the User name and `password` for password.

 - Start 'uiconsole' and a web server and a socket server run on port 8080.
 
        uiconsole
    
 
 - Weinre is started on port 8282

 - Open your browser for access to the `uiconsole`.

        http://< your_ip >:8080
     
 - Then add this code on your target web page:

        <script src="http://<your_ip>:8080/socket.io/socket.io.js"></script>
        <script>
        if(typeof io != 'undefined'){
            var socket = io.connect('http://<your_ip>:8080');
            socket.on('connect', function(){console.log('CLIENT socket.on: connect');socket.emit('client_connect', {data: navigator.userAgent});});
            socket.on('jscmd', function(data){try{eval(data.cmd);}catch(error){console.log(error);}});
        }
        </script>
        
 - Soon I plan to incorporate the use of a bookmarklet target like this.:
 
        javascript:(function(e){e.setAttribute("src","http://<your_ip>:8080/socket.io/socket.io.js");document.getElementsByTagName("body")[0].appendChild(e);})(document.createElement("script"));void(0);
    
Weinre
=====

 - If you want to use 'weinre' you must click the button weinre "JSCONSOLE".
   This will inject the script server connection in your target web page.
   As the server is already started on the 8282 port, your target page will be displayed in the web interface weinre.
   
   Now injection is dynamic with the IP address of your server. See _conf.json `weinreHost`


 - Open your browser for access to the `weinre`.

        http://< your_ip >:8282
    


Command parameters
=====

Currently managing user has no security and no verification before the execution of the SQL command.

You can check the information with the tools [sqlite manager](https://code.google.com/p/sqlite-manager/). Or other tools if you prefer.

Add user
----

 - You can add a new user to the SQLite for user management.
 
        uiconsole addUser your_username your_password


Update user password
----

 - You can update the user password.
 
        uiconsole updateUserPassword username old_password new_password
     
Update default admin password
----

 - You can update the admin password.
 
        uiconsole updateAdminPassword old_password new_password
     

Delete user
----

 - You can delete a user to the SQLite.
 
        uiconsole deleteUser username


Schematic database.
----

 - Currently the schema of the database is very simplistic.

        CREATE TABLE ui_connected (jsondata TEXT);
        CREATE TABLE ui_users (userName TEXT, password TEXT, lastconnected TEXT);
        
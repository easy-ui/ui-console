/*
* Comment genere un certificat SSL
* openssl genrsa -des3 -out server.key 1024
* openssl req -new -key server.key -out server.csr
* cp server.key server.key.org
* openssl rsa -in server.key.org -out server.key
*
* */

/*
!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!
MEMO POUR LANCER LE SERVEUR ET LE CLIENT

Pour lancer le serveur:
=======================
node UicSocketDebug.js

Ouvrir cette URL pour avoir UiConsole:
======================================
https://192.168.2.136

Code dans la cible:
===================
<script src="https://192.168.2.136:443/socket.io/socket.io.js"></script>
<script>
    if(typeof io != 'undefined'){
        var socket = io.connect('https://192.168.2.136:443');
        socket.on('connect', function(){console.log('CLIENT socket.on: connect');socket.emit('connect', {data: navigator.userAgent});});
        socket.on('jscmd', function(data){try{eval(data.cmd);}catch(error){console.log(error);}});
    }
</script>
!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!
*/

/* TUTO
* http://cwbuecheler.com/web/tutorials/2014/restful-web-app-node-express-mongodb/
*
*
* GRUNT NODE WEBKIT
* https://www.npmjs.org/package/grunt-node-webkit-builder
*
* */


// Créer un Bin : http://www.anupshinde.com/posts/how-to-create-nodejs-npm-package/

// INSERT INTO ui_users (userName, password) VALUES ("manu", "manu1234")

'use strict';
var express         = require('express'),
    cookieParser    = require('cookie-parser'),
    expressSession  = require('express-session'),
    bodyParser      = require('body-parser'),
    https           = require('https'),
    http            = require('http'),
    fs              = require('fs'),
    databaseFile    = "uidb.db",
    exists          = fs.existsSync(databaseFile),
    sqlite3         = require("sqlite3").verbose(),
    db              = new sqlite3.Database(databaseFile),
    options         = {
                        key: fs.readFileSync('ssl/private/server.key'),
                        cert: fs.readFileSync('ssl/certs/server.crt'),
                        ca: fs.readFileSync('ssl/certs/server.crt')
                    },
    app             = module.exports = express(),
    port            = process.env.PORT || 443,
    server          = https.createServer(options, app).listen(port),
    io              = require('socket.io').listen(server),
    Log 		    = require('log-color'),
    log 		    = new Log({ level: 'debug', color: true }),
    browserList     = new Object(),
    socketList      = new Object(),
    consoleSocket   = new Object(),
    exec            = require('child_process').exec;

// create our router
//var router = express.Router();


// Get client IP address from request object ----------------------
var getClientAddress = function (req) {
    return (req.headers['x-forwarded-for'] || '').split(',')[0]
        || req.connection.remoteAddress;
};



log.alert('\tU');
 /*log.critical('\tI');
log.error('\tC');
log.warning('\tO');
log.notice('\tN');
log.notice('\tS');
//log.info('\tS');
log.debug('\tO');
log.alert('\tL');
log.critical('\tE');
*/
log.notice("START WEINRE SERVER");
exec('weinre -boundHost 192.168.2.136 -httpPort 8282 -verbose true', function(err, stdout, stderr) {
    console.log(stdout);
});

// Webserver config
log.notice("Webserver Express initialization");
// Express config
// On definit le dossier courant comme arborescence web
// On definit le moteur de template ejs
app.use(express.static(__dirname + '/'));
app.set('views', __dirname + '/');
app.set('view engine', 'ejs');
app.engine('html', require('ejs').renderFile);

// Express middleware
app.use(cookieParser());
app.use(expressSession({secret:'somesecrettokenhere'}));
app.use(bodyParser());

// Permet de connaitre l ip du client
app.enable('trust proxy');

// Session-persisted message middleware
app.use(function(req, res, next){
    var err = req.session.error;
    var msg = req.session.success;
    delete req.session.error;
    delete req.session.success;
    res.locals.message = '';
    if (err) res.locals.message = '<div class="alert alert-danger">' + err + '</div>';
    if (msg) res.locals.message = '<div class="alert alert-success">' + msg + '</div>';

    next();
});


// Routes
app.get('/', function(req, res) {

    if(req.session.userName == undefined){
        res.render('ejs/login');
    } else {
        res.render('ejs/UicConsole', {
            userName: req.session.userName,
            lastConnected: req.session.lastConnected
        });
    }
});

// Set Express REST Services
// https://192.168.2.136/connected/Chrome
app.get('/connected/:browser', function(req, res) {

    var sql = "SELECT rowid AS id, jsondata FROM ui_connected WHERE jsondata LIKE '%"+req.params.browser+"%'";
    db.get(sql, function(err, row) {
        //console.log(row.id + ": " + row.jsondata);
        res.json({ id: row.id, data: row.jsondata });
    });
});

app.get('/login/', function(req, res) {
    res.redirect('/');
});

app.get('/logout/', function(req, res) {
    req.session.destroy(function(){
        res.redirect('/');
    });
});

// http://runnable.com/U227vQJ-m3YpYDuC/nodejs%2Bcookie%2Bsession-for-node-js
app.post('/login/', function(req, res) {

    //console.log(req.body.userName);
    //console.log(req.body.password);
    //var ip = req.headers['x-forwarded-for'] || req.connection.remoteAddress;
    var ip = getClientAddress(req);
    console.log(ip);

    // Connect to Database and check if user found
    var sql = "SELECT userName, password FROM ui_users WHERE userName = '"+req.body.userName+"' AND password = '"+req.body.password+"'";
    //console.log(sql);

    db.get(sql, function(err, row) {

        if(row){
            // if userName found
            req.session.userName = row.userName;
            req.session.success = 'Connected as ' + row.userName;
            var lastConnected = Date();
            db.run("UPDATE ui_users SET lastconnected = ? WHERE userName = ? AND password = ?", lastConnected, row.userName, row.password);
            req.session.lastConnected = lastConnected; // utiliser avec le res.render('ejs/UicConsole', { userName: req.session.userName, lastConnected: req.session.lastConnected });

        } else {
            // Sinon on renvoie user not found
            req.session.error = 'Authentication failed, please check your username and password.'
        }
        res.redirect('/');
    });
});


// Sqlite3 database initialization
log.notice("Database initialization");
db.serialize(function() {
    if(!exists) {
        db.run('CREATE TABLE ui_connected (jsondata TEXT)');
        db.run('CREATE TABLE ui_users (userName TEXT, password TEXT, lastconnected TEXT)');
        db.run('INSERT INTO ui_users (userName, password) VALUES ("manu", "manu1234")');
    }
});

// Socket.io initialization
log.notice("Socket.io ready");
io.sockets.on('connection', function (socket) {

    var address = socket.handshake.address;
    var domainOrigin = socket.handshake.headers.origin;
    var connectionTime = socket.handshake.time;

    console.log("------------------------------------------");
    console.log("New connection from " + address.address + ":" + address.port);
    console.log("Domain Origin " + domainOrigin);
    //console.log(socket.handshake);
    console.log("------------------------------------------");


    // insert handshake on sqlite3 database
    var stmt = db.prepare("INSERT INTO ui_connected (jsondata) VALUES (?)");
    stmt.run( JSON.stringify( socket.handshake ));
    stmt.finalize();

    socket.on('connect', function(data, callback){
        log.notice('SERVER socket.on: connect:'+ data.data);
        log.notice('SERVER socket.on: connect:'+ socket.id);
        log.notice("Domain Origin " + domainOrigin);
        var clientData = new Object();
        clientData.data = data.data;
        clientData.origin = domainOrigin;
        clientData.time = connectionTime;

        //browserList[socket.id] = data.data;
        browserList[socket.id] = clientData;
        socketList[socket.id] = socket;
        //io.sockets.emit('BrowserList', {list: browserList});
        io.sockets.socket(consoleSocket[0]).emit('BrowserList', {list: browserList});
    });

    socket.on('imconsole', function(data, callback){
        log.notice('SERVER socket.on: imconsole:'+ JSON.stringify(data));
        consoleSocket[0] = data.data;
        log.notice('SERVER socket.on: consoleSocket:'+ consoleSocket[0]);
    });

    socket.on('jscmd', function(data){
        log.notice('SERVER socket.on: jscmd');
        socket.broadcast.emit('jscmd', {cmd: data});
    });

    socket.on('jscmdto', function(data){
        log.notice('SERVER socket.on: jscmdto');
        log.notice('SERVER socket.on: jscmdto:'+data.socketid);
        log.notice('SERVER socket.on: jscmdto:'+socketList[data.socketid].id);
        io.sockets.socket(socketList[data.socketid].id).emit('jscmd', {cmd: data.cmd});
    });

    socket.on('getBrowserList', function(){
        log.notice('SERVER socket.on: getBrowserList');
        socket.emit('BrowserList', {list: browserList});
    });

    socket.on('handlers', function(data, callback){
        log.notice('SERVER socket.on: handlers:'+ data.data);
        io.sockets.socket(consoleSocket[0]).emit('handlers', {data: data});
    });

    socket.on('screenshot', function(data, callback){
        log.notice('SERVER socket.on: screenshot:'+ data.data);
        io.sockets.socket(consoleSocket[0]).emit('screenshot', {data: data});
    });

    socket.on('tape', function(data, callback){
        log.notice('SERVER socket.on: tape:'+ data.console);
        io.sockets.socket(consoleSocket[0]).emit('tape', {data: data});
    });

    socket.on('disconnect', function(){
        log.notice('socket.on: disconnect');
        disconnect(socket);
    });



    /*
    * // send to current request socket client
     socket.emit('message', "this is a test");

     // sending to all clients, include sender
     io.sockets.emit('message', "this is a test");

     // sending to all clients except sender
     socket.broadcast.emit('message', "this is a test");

     // sending to all clients in 'game' room(channel) except sender
     socket.broadcast.to('game').emit('message', 'nice game');

     // sending to all clients in 'game' room(channel), include sender
     io.sockets.in('game').emit('message', 'cool game');

     // sending to individual socketid
     io.sockets.socket(socketid).emit('message', 'for your eyes only');
    * */



});

function disconnect(socket){
    // get a list of rooms for the client
    var rooms = io.sockets.manager.roomClients[socket.id];

    // unsubscribe from the rooms
    for(var room in rooms){
        if(room && rooms[room]){
            //unsubscribe(socket, { room: room.replace('/','') });
            socket.leave(room.replace('/',''));
        }
    }

    // client was unsubscribed from the rooms,
    // now we can selete him from the hash object
    delete browserList[socket.id];
    io.sockets.emit('BrowserList', {list: browserList});
    // Disconnect socket
    log.notice('socket.disconnect');
    //socket.disconnect()
}
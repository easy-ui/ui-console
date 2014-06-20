"use strict"

function convertUiconsole() {

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
        /*
        options         = {
            key: fs.readFileSync('ssl/private/server.key'),
            cert: fs.readFileSync('ssl/certs/server.crt'),
            ca: fs.readFileSync('ssl/certs/server.crt')
        },
        */
        app             = module.exports = express(),
        //port            = process.env.PORT || 443,
        port            = process.env.PORT || 8080,
        //server          = https.createServer(options, app).listen(port),
        server          = http.createServer(app).listen(port),
        io              = require('socket.io')(server),
        Log 		    = require('log-color'),
        log 		    = new Log({ level: 'debug', color: true }),
        browserList     = new Object(),
        socketList      = new Object(),
        consoleSocket   = new Object(),
        exec            = require('child_process').exec,
        confJsonFileName = '_conf.json',
        confJSON = {
            host:'127.0.0.1',
            port:'8080',
            weinreHost: '127.0.0.1',
            weinrePort: '8282'
        };

    // -----------------------------------------------------------------------------------------------------------------
    // Command line options --------------------------------------------------------------------------------------------
    // -----------------------------------------------------------------------------------------------------------------
    if(process.argv.length > 2) {

        var command_type = process.argv[2];

        if (command_type == "addUser") {

            var addUserName = process.argv[3];
            var addUserPass = process.argv[4];

            db.run('INSERT INTO ui_users (userName, password) VALUES ("'+addUserName+'", "'+addUserPass+'")');
            log.warning("User '"+addUserName+"' added !");
            process.exit(0);

        } else if(command_type == "updateAdminPassword") {

            var oldPass = process.argv[3];
            var newPass = process.argv[4];

            db.run('UPDATE ui_users SET password = "'+newPass+'" WHERE userName = "admin" AND password = "'+oldPass+'"');
            log.warning("Admin password updated !");
            process.exit(0);

        } else if(command_type == "updateUserPassword") {

            var updateUserName = process.argv[3];
            var oldPass = process.argv[4];
            var newPass = process.argv[5];

            db.run('UPDATE ui_users SET password = "'+newPass+'" WHERE userName = "'+updateUserName+'" AND password = "'+oldPass+'"');
            log.warning("User '"+updateUserName+"' password updated !");
            process.exit(0);

        } else if(command_type == "deleteUser") {

            var deleteUserName = process.argv[3];
            db.run('DELETE FROM ui_users WHERE userName = "'+deleteUserName+'"');
            log.warning("User '"+deleteUserName+"' deleted !");
            process.exit(0);

        } else if(command_type == "init") {

            var outputFilename = confJsonFileName;

            fs.writeFile(outputFilename, JSON.stringify(confJSON, null, 4), function(err) {
                if(err) {
                    console.log(err);
                    process.exit(0);
                } else {
                    log.warning("JSON saved to " + outputFilename);
                    process.exit(0);
                }
            });

        } else if(command_type == "initdb") {

            log.notice("Populate Database tables and data.");
            db.serialize(function() {
                db.run('CREATE TABLE ui_connected (jsondata TEXT)');
                db.run('CREATE TABLE ui_users (userName TEXT, password TEXT, lastconnected TEXT)');
                db.run('INSERT INTO ui_users (userName, password) VALUES ("admin", "password")',[], function(err){
                    console.log("insert ok");
                    console.log("result:"+err);
                    process.exit(0);
                });
            });

        } else {
            log.error("Command not found. Please read the README <https://www.npmjs.org/package/uiconsole> for more help.");
            process.exit(0);
        }
    }

    // Load configuration file `_conf.json`
    fs.readFile(confJsonFileName, 'utf8', function (err, data) {
        if (err) {
            console.log('There no config file! Please try to generate again. `uiconsole init` then edit '+confJsonFileName+' with your parameters.');
            process.exit(0);
        }

        confJSON = JSON.parse(data);

        log.notice("Config file loaded successfully.");

        runWeinre(confJSON);
    });

    // Get client IP address from request object
    var getClientAddress = function (req) {
        return (req.headers['x-forwarded-for'] || '').split(',')[0]
            || req.connection.remoteAddress;
    };

    var runWeinre = function(confJSON){

        log.notice("START WEINRE SERVER " + confJSON.weinreHost + ":" + confJSON.weinrePort);

        exec('weinre -boundHost '+confJSON.weinreHost+' -httpPort '+confJSON.weinrePort+' -verbose true', function(err, stdout, stderr) {
            console.log(stdout);
        });

        log.info("Open your browser with this url http://" + confJSON.host + ":" + confJSON.port + " for accessing to the admin panel.");
    };

    // -----------------------------------------------------------------------------------------------------------------
    // Express ---------------------------------------------------------------------------------------------------------
    // -----------------------------------------------------------------------------------------------------------------
    log.notice("Webserver Express initialization");

    app.use(express.static(__dirname + '/'));
    app.set('views', __dirname + '/');
    app.set('view engine', 'ejs');
    app.engine('html', require('ejs').renderFile);

    // Express middleware
    app.use(cookieParser());
    app.use(expressSession({secret:'astalavistababy'}));
    app.use(bodyParser());

    // Allows to know the client ip
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

    // -----------------------------------------------------------------------------------------------------------------
    // Routes ----------------------------------------------------------------------------------------------------------
    // -----------------------------------------------------------------------------------------------------------------
    /**
     * @todo: Convert routes with Router method.
     * see: var router = express.Router();
     * */
    app.get('/', function(req, res) {

        if(req.session.userName == undefined){
            res.render('ejs/login');
        } else {
            res.render('ejs/UicConsole', {
                userName: req.session.userName,
                lastConnected: req.session.lastConnected,
                host: confJSON.host,
                port: confJSON.port,
                weinreHost: confJSON.weinreHost,
                weinrePort: confJSON.weinrePort
            });
        }
    });

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

    app.post('/login/', function(req, res) {

        var ip = getClientAddress(req);

        //console.log(ip);

        // Connect to Database and check if user found
        var sql = "SELECT userName, password FROM ui_users WHERE userName = '"+req.body.userName+"' AND password = '"+req.body.password+"'";

        db.get(sql, function(err, row) {

            if(row){
                // if userName found
                req.session.userName = row.userName;
                req.session.success = 'Connected as ' + row.userName;
                var lastConnected = Date();
                db.run("UPDATE ui_users SET lastconnected = ? WHERE userName = ? AND password = ?", lastConnected, row.userName, row.password);
                req.session.lastConnected = lastConnected; // Used with res.render('ejs/UicConsole', { userName: req.session.userName, lastConnected: req.session.lastConnected });

            } else {
                // user not found
                req.session.error = 'Authentication failed, please check your username and password.'
            }
            res.redirect('/');
        });
    });

    // -----------------------------------------------------------------------------------------------------------------
    // Socket ----------------------------------------------------------------------------------------------------------
    // -----------------------------------------------------------------------------------------------------------------
    log.notice("Socket.io ready");
    io.on('connection', function (socket) {

        var address = socket.handshake.address;
        var domainOrigin = socket.handshake.headers.referer;
        var connectionTime = socket.handshake.time;

        log.warning("New connection from " + address.address + ":" + address.port + " - Domain Origin " + domainOrigin);

        /**
         * @todo: Put in separate function
         * */
        var stmt = db.prepare("INSERT INTO ui_connected (jsondata) VALUES (?)");
        stmt.run( JSON.stringify( socket.handshake ));
        stmt.finalize();

        socket.on('client_connect', function(data, callback){
            log.debug('SERVER socket.on: connect data.data:'+ data.data);
            log.debug('SERVER socket.on: connect socket.id:'+ socket.id);
            log.debug("Domain Origin " + domainOrigin);
            var clientData = new Object();
            clientData.data = data.data;
            clientData.origin = domainOrigin;
            clientData.time = connectionTime;
            browserList[socket.id] = clientData;
            socketList[socket.id] = socket;
            io.to(consoleSocket[0]).emit('BrowserList', {list: browserList});
        });

        socket.on('imconsole', function(data, callback){
            log.debug('SERVER socket.on: imconsole:'+ JSON.stringify(data));
            consoleSocket[0] = data.data;
            log.debug('SERVER socket.on: consoleSocket:'+ consoleSocket[0]);
        });

        socket.on('jscmd', function(data){
            log.debug('SERVER socket.on: jscmd');
            socket.broadcast.emit('jscmd', {cmd: data});
        });

        socket.on('jscmdto', function(data){
            log.debug('SERVER socket.on: jscmdto');
            log.debug('SERVER socket.on: jscmdto:'+data.socketid);
            log.debug('SERVER socket.on: jscmdto:'+socketList[data.socketid].id);
            io.to(socketList[data.socketid].id).emit('jscmd', {cmd: data.cmd});
        });

        socket.on('getBrowserList', function(){
            log.debug('SERVER socket.on: getBrowserList');
            io.to(consoleSocket[0]).emit('BrowserList', {list: browserList});
        });

        socket.on('handlers', function(data, callback){
            log.debug('SERVER socket.on: handlers:'+ data.data);
            io.to(consoleSocket[0]).emit('handlers', {data: data});
        });

        socket.on('screenshot', function(data, callback){
            log.debug('SERVER socket.on: screenshot:'+ data.data);
            io.to(consoleSocket[0]).emit('screenshot', {data: data});
        });

        socket.on('tape', function(data, callback){
            log.debug('SERVER socket.on: tape:'+ data.console);
            io.to(consoleSocket[0]).emit('tape', {data: data});
        });

        socket.on('disconnect', function(){
            log.warning('socket.on: disconnect');
            disconnect(socket);
        });
    });

    function disconnect(socket){

        socket.leave('');
        delete browserList[socket.id];
        io.emit('BrowserList', {list: browserList});
        log.warning('socket.disconnect');
    }
}

exports.convert = convertUiconsole;
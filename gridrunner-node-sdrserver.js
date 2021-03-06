var dongle = require('gridrunner-node-sdrrtl.node');
var express = require('express');
app = express();
http = require('http');
var connections=0;
var server = http.createServer(app).listen(3000);
io = require('socket.io').listen(server);
var jade = require('jade');
var running=false;
var chunksize=10000;

app.set('views', __dirname + '/views');
app.set('view engine', 'jade');
app.set("view options", { layout: false });

app.configure(function() {
    app.use(express.static(__dirname + '/public'));
});

app.get('/', function(req, res){
    res.render('home.jade');
});

io.sockets.on('connection', function (socket) {
    connection();
    console.log("CONNECTED");
    socket.on('disconnect', function(){
        disconnection();
    });
});

function arraychunker(a, n) {
    var len = a.length,out = [], i = 0;
    while (i < len) {
        var size = Math.ceil((len - i) / n--);
        out.push(a.slice(i, i += size));
    }
    return out;
}

var ondata = function(err,data){
    if(err){
        console.log(err);
    }
    else{
        if(data.data.length<chunksize){
            io.sockets.volatile.emit('radio', data.data);
        }
        else{
            var pieces = Math.round(data.data.length/chunksize);
            var chunks=arraychunker(data.data,pieces);
            for (var i=0; i<chunks.length;i++){
                io.sockets.volatile.emit('radio', chunks[i]);
            }
        }
    }
};

function connection(){
    connections++;
    if (!running){
        console.log("Users connected starting streaming.");
        dongle.DongleOpen(0);
        var frequency=88910000; //specified in HZ
        dongle.DongleSetCenterFreq(frequency);
        dongle.DongleSetSampleRate(2048000);
        dongle.DongleResetBuffer();
        console.log(dongle.DongleReadAsync(ondata));
        running=true;
    }
}

function disconnection(){
    connections--;
    if(connections==0){
     dongle.DongleStopRead();
     dongle.DongleResetBuffer();
     dongle.DongleClose();
     running=false;
     console.log("No users going to sleep.");
     }
}
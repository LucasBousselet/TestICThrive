const express = require('express');
const http = require('http');
const fs = require('fs');
const path = require('path');

const app = express();
const server = http.createServer(app);
const io = require('socket.io')(server);

let urlsStored = {};
const STORAGE_URL = 'urlsData.json';

/***
 * Updates our global variable with the storage's current content. 
 * If no storage file is found, creates it.
 ***/
function readStorage() {
    if (!fs.existsSync(STORAGE_URL)) {
        updateStorage();
    } else {
        try {
            const fileStorage = fs.readFileSync(STORAGE_URL);
            urlsStored = JSON.parse(fileStorage.toString());
        } catch(e) {
            throw Error(e);
        }
    }
    return;
}

/***
 * Persists the current state of our storage variable, into the storage file.
 ***/
function updateStorage() {
    fs.writeFile(STORAGE_URL, JSON.stringify(urlsStored), (error) => {
        if (error) {
            throw Error('Error while writing storage file : ' + error);
        }
    });
}

/***
 * Creates a short string, and makes sure the string isn't already used in the storage
 ***/
function createShortUrl() {
    if (!urlsStored) {
        readStorage();
    }
    let randomString = '';
    do {
        // Creates a 8-digit random string.
        randomString = Math.random().toString().substring(2, 8);  
    } while(randomString && urlsStored[randomString]);
    return randomString;
}
 
readStorage();
// first middleware, called upon every incoming request
app.use((req, res, next) => {
    res.setHeader('Access-Control-Allow-Origin', '*'); 
    res.setHeader('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content, Accept, Content-Type, Authorization');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, PATCH, OPTIONS');
    next();
});
  
// The home page of our server is accessible at the 'index' url
app.get('/index', function (req, res) {
    res.sendFile(__dirname + '/index.html');
});

// Performs the redirection to the desired url, which was saved in the storage with the short url as key.
app.get('/shorty/:shortUrl', (req, res) => {
    if (!urlsStored) {
        readStorage();
    }
    if (!req.params.shortUrl || !urlsStored[req.params.shortUrl]) {
        console.log('No redirection for url : ' + req.params.shortUrl);
        res.redirect('http://localhost:8080/index');
        return;
    }
    res.redirect(urlsStored[req.params.shortUrl]);
})

/***
 * We are using WebSockets to get back to the client when the short url is ready. 
 ***/
io.sockets.on('connection', function(socket) {
    socket.on('shortenUrl', function (longUrl) {
        const shortUrl = createShortUrl(longUrl);
        urlsStored[shortUrl] = longUrl;
        updateStorage();
        socket.emit('returnShortUrl', `http://localhost:8080/shorty/${shortUrl}`);
    });
});


server.listen('8080');
const db = require('sqlite');
const fetch = require('node-fetch');
const config = require('./config.js');
const fs = require('mz/fs');
const Spinner = require('cli-spinner').Spinner;
const jsesc = require('jsesc');

const baseUrl = "http://ws.audioscrobbler.com/2.0/";

const getData = async (endpoint, ...args) => {
    let url = baseUrl + `?method=${endpoint}&api_key=${config.token}&format=json${args ? '&' + args.join('&') : null}`;
    return await (await fetch(url)).json();
}

const getArtists = async () => {
    let totalPages = (await (await fetch(baseUrl + `?method=library.getartists&user=${config.user}&api_key=${config.token}&format=json&limit=1000`)).json())['artists']['@attr']['totalPages'];

     let spinner = new Spinner('%s Caching artists...');
         spinner.setSpinnerString(10);
         spinner.start();

    for (let i = 1; i <= totalPages; i++) {
        let artists = await getData('library.getartists', 'page=' + i, 'user=' + config.user, 'limit=1000');

        await db.exec(`BEGIN TRANSACTION;`);
        for (let artist of artists['artists']['artist']) {
          await db.run('INSERT OR IGNORE INTO artists VALUES (?,?,?,?);', artist.mbid !== "" ? artist.mbid : null, artist.name, artist.playcount, artist.url);
        }
        await db.exec(`COMMIT;`);
    }

    spinner.stop(true);
}

const getRecentTracks = async () => {
    let tracks = (await getData('user.getrecenttracks', 'user=' + config.user, 'limit=200'))['recenttracks']['track'];

    let spinner = new Spinner('%s Caching tracks...');
        spinner.setSpinnerString(10);
        spinner.start();
    
    for (let track of tracks) {
        await db.run('INSERT OR IGNORE INTO tracks VALUES (?,?,?,?)', track.mbid !== "" ? track.mbid : null, track.name, track.artist.mbid, track.album.mbid)
    }
}

module.exports = {
    updateDatabase: async () => {
        // Opens the database and creates the necessary tables (if it doesn't already exist)
        await db.open('./db.sqlite');
        for (let file of await fs.readdir('./queries')) {
            await db.run(await fs.readFile('./queries/' + file, 'utf8'));
        }

        await getArtists();

        let data = await (await fetch(baseUrl + `?method=user.getrecenttracks&user=${config.user}&api_key=${config.token}&format=json`)).json();
        let totalPages = parseInt(data['recenttracks']['@attr']['totalPages']);

        // for (let i = 1; i <= totalPages; i++) {
        //     let newData = await (await fetch(baseUrl + `?method=user.getrecenttracks&page=${i}&user=${config.user}&api_key=${config.token}&format=json`)).json();
        //     console.log(newData['recenttracks']['@attr']['page']);
        // }
    }
}
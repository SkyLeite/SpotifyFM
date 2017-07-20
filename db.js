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

    let cachedArtists = await db.all('SELECT * FROM artists');

    for (let i = 1; i <= totalPages; i++) {
        let artists = await getData('library.getartists', 'page=' + i, 'user=' + config.user, 'limit=1000');

        await db.exec(`BEGIN TRANSACTION;`);
        for (let artist of artists['artists']['artist']) {

            // Checks if artist is already in the database. If so, updates the playcount if necessary
            // if not, inserts the necessary data
            let cachedArtist = await db.all(`SELECT * FROM artists WHERE artist_name = ? AND artist_mbid ${artist.mbid !== "" ? `= '${artist.mbid}'` : 'IS NULL'}`, artist.name);

            if (cachedArtist.length > 0 && cachedArtist.artist_playcount !== artist.playcount) {
                await db.run(`UPDATE artists SET artist_playcount = ? WHERE artist_name = ? AND artist_mbid ${artist.mbid !== "" ? `= '${artist.mbid}'` : 'IS NULL'}`, artist.playcount, artist.name);
            }
            else {
                await db.run('INSERT OR IGNORE INTO artists VALUES (?,?,?,?);', artist.mbid !== "" ? artist.mbid : null, artist.name, artist.playcount, artist.url);
            }
        }
        await db.exec(`COMMIT;`);
    }

    spinner.stop(true);
    console.log("-> Artists cached successfully.")
}

const getRecentTracks = async () => {
    let tracks = (await getData('user.getrecenttracks', 'user=' + config.user, 'limit=200'))['recenttracks']['track'];

    let spinner = new Spinner('%s Caching recent tracks...');
    spinner.setSpinnerString(10);
    spinner.start();

    await db.exec(`BEGIN TRANSACTION;`);
    for (let track of tracks) {
        if (!track['@attr']) {
            let cachedTrack = await db.all(`SELECT * FROM recent_tracks WHERE track_name = ? AND track_scrobble_date = ?`, track.name, track.date.uts);

            // Checks if track is already in the database before adding it
            if (cachedTrack.length === 0) {
                await db.run('INSERT OR IGNORE INTO recent_tracks VALUES (?,?,?,?,?)', track.mbid !== "" ? track.mbid : null, track.name, track.artist['#text'], track.album['#text'], track.date.uts);
            }
        }
    }
    await db.exec(`COMMIT;`);

    spinner.stop(true);
    console.log('-> Recent tracks cached successfully.');
}

const getAllTracks = async () => {
    let totalPages = (await (await fetch(baseUrl + `?method=user.gettoptracks&user=${config.user}&api_key=${config.token}&format=json`)).json())['toptracks']['@attr']['totalPages'];

    let spinner = new Spinner('%s Caching tracks...');
    spinner.setSpinnerString(10);
    spinner.start();

    for (let i = 1; i <= totalPages; i++) {
        let tracks = await getData('user.gettoptracks', 'page=' + i, 'user=' + config.user, 'limit=5000');

        await db.exec('BEGIN TRANSACTION;');
        for (let track of tracks["toptracks"]["track"]) {
            let cachedTrack = await db.all('SELECT * FROM tracks WHERE track_name = ? AND track_artist_name = ?', track.name, track.artist.name);

            if (cachedTrack.length === 0) {
                await db.run('INSERT INTO tracks VALUES (?,?,?,?)', track.mbid !== "" ? track.mbid : null, track.name, track.artist.name, track.playcount);
            }

            else if (cachedTrack['track_playcount'] !== track.playcount) {
                await db.run('UPDATE tracks SET track_playcount = ? WHERE track_name = ? AND track_artist_name = ?', track.playcount, track.name, track.artist.name);
            }
        }
        await db.exec('COMMIT;');
    }

    spinner.stop(true);
    console.log('-> Tracks cached successfully.');
}

module.exports = {
    updateDatabase: async () => {
        // Opens the database and creates the necessary tables (if it doesn't already exist)
        await db.open('./db.sqlite');
        for (let file of await fs.readdir('./queries')) {
            await db.run(await fs.readFile('./queries/' + file, 'utf8'));
        }

        // Adds / updates artists and recent tracks on the database
        await getArtists();
        await getRecentTracks();
        await getAllTracks();
    },
    getNewPlaylist: async () => {
        let tracks = await db.all('SELECT * FROM recent_tracks ORDER BY track_scrobble_date DESC LIMIT 100');
        let playlistTracks = [];

        let spinner = new Spinner('%s Selecting tracks...');
        spinner.setSpinnerString(10);
        spinner.start();

        for (let track of tracks) {
            let recommended = (await getData('track.getsimilar', 'track=' + encodeURIComponent(track['track_name']), 'artist=' + encodeURIComponent(track['track_artist_name']), 'limit=3'))['similartracks']['track'];

            for (let i of recommended) {
                if (!playlistTracks.includes(i)) {
                    playlistTracks.push(i);
                }
            }
        }

        spinner.stop(true);
        console.log('-> Tracks selected');

        return playlistTracks;
    },
    getDiscoveryPlaylist: async () => {
        try {
            let recentTracks = await db.all('SELECT * FROM recent_tracks ORDER BY track_scrobble_date DESC LIMIT 300');

            let spinner = new Spinner('%s Selecting tracks...');
            spinner.setSpinnerString(10);
            spinner.start();

            let playlistTracks = [];
            for (let track of recentTracks) {
                let recommended = (await getData('track.getsimilar', 'track=' + encodeURIComponent(track['track_name']), 'artist=' + encodeURIComponent(track['track_artist_name']), 'limit=40'))['similartracks']['track'];

                for (let recommendedTrack of recommended) {
                    let userTracks = await db.all('SELECT * FROM tracks WHERE track_name = ? AND track_artist_name = ?', recommendedTrack.name, recommendedTrack.artist.name);
                    if (userTracks.length === 0 && !playlistTracks.includes(recommendedTrack)) {
                        playlistTracks.push(recommendedTrack);
                        break;
                    }
                }
            }

            spinner.stop(true);
            console.log('-> Tracks selected');

            return playlistTracks;
        } catch(err) {
            console.error(err);
        }
    }
}
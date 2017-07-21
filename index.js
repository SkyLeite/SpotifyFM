const express = require('express');
const app = express();
const db = require('./db.js');
const SpotifyWebApi = require('spotify-web-api-node');
const config = require('./config.js');
const cache = require('./cache.json');
const moment = require('moment');
const opn = require('opn');
const Spinner = require('cli-spinner').Spinner;
const fs = require('mz/fs');
const _ = require('lodash');

const spotify = new SpotifyWebApi({
    clientId: config.clientId,
    clientSecret: config.clientSecret,
    redirectUri: 'http://localhost:5000/spotify'
});

let authorizeSpotify = async () => {
    let data = await spotify.clientCredentialsGrant();
    await spotify.setAccessToken(data.body['access_token']);

    let authorizeURL = await spotify.createAuthorizeURL(['playlist-modify-public', 'playlist-modify-private', 'playlist-read-private', 'playlist-read-collaborative'], 'state');

    return new Promise((resolve, reject) => {
        app.get('/spotify', async (req, res) => {
            try {
                let data = await spotify.authorizationCodeGrant(req.query.code);
                await spotify.setAccessToken(data.body['access_token']);
                await spotify.setRefreshToken(data.body['refresh_token']);
                res.send('<script>window.close()</script>');
                resolve('hi');
            }
            catch (err) {
                reject(err);
            }
        });

        app.listen(5000, async () => { });
        opn(authorizeURL, { app: 'chrome' });
    })
}

const buildPlaylist = async (songs, name) => {
    let userPlaylists = (await spotify.getUserPlaylists(await spotify.getMe())).body.items.map(i => {
        return i.name;
    });

    let spinner = new Spinner('%s Building playlist. This might take a while (go grab a cup of coffee).');
    spinner.setSpinnerString(10);
    spinner.start();

    let playlistTracks = [];
    let i = 0;
    for (let song of songs) {
        i++;
        spinner.setSpinnerTitle(`${parseInt((i / songs.length) * 100)}% Building playlist...`);
        let uri = await spotify.searchTracks('track:' + song.name + ' artist:' + song.artist.name);
        if (uri.body.tracks.items) {
            try {
                playlistTracks.push(uri.body.tracks.items[0].uri)
            } catch (err) {
                // console.log(err);
            }
        }
    }

    if (!userPlaylists.includes(name)) {
        let playlist = await spotify.createPlaylist((await spotify.getMe()).body.id, name, { public: true });
        for (let i of _.chunk(playlistTracks, 99)) {
            await spotify.addTracksToPlaylist((await spotify.getMe()).body.id, playlist.body.id, i);
        }

        spinner.stop(true);
        console.log('-> Playlist ' + name + ' has been created. Have fun!');
    }
    else {
        let playlist = (await spotify.getUserPlaylists((await spotify.getMe()).body.id)).body.items.filter(i => i.name === name)[0].id;
        for (let [index, values] of _.chunk(playlistTracks, 99).entries()) {
            if (index === 0) {
                await spotify.replaceTracksInPlaylist((await spotify.getMe()).body.id, playlist, values);
            }
            else {
                await spotify.addTracksToPlaylist((await spotify.getMe()).body.id, playlist, values);
            }
        }

        spinner.stop(true);
        console.log('-> Playlist ' + name + ' has been updated. Have fun!');
    }
}

const main = async () => {
    try {
        await authorizeSpotify();
        await db.updateDatabase();

        // Build week playlist
        if (moment().diff(moment(cache.week), 'days') >= 7) {
            await buildPlaylist(await db.getNewPlaylist(), 'Semaninha');
            cache.week = moment();
            fs.writeFile('cache.json', JSON.stringify(cache));
        }

        // Build discovery playlist
        if (moment().diff(moment(cache.new), 'days') >= 7) {
            await buildPlaylist(await db.getDiscoveryPlaylist(), 'Novas');
            cache.new = moment();
            fs.writeFile('cache.json', JSON.stringify(cache));
        }

        return;
    } catch (err) {
        console.error(err);
    }
}

(async () => {
    await main();
    setInterval(async () => {
        await main();
        return;
    }, 1000000);
})();
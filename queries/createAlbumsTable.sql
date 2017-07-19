CREATE TABLE IF NOT EXISTS 'albums' (
    'album_mbid'            TEXT,
    'album_artist'          TEXT NOT NULL,
    'album_artist_mbid'     INTEGER,
    'album_release_date'    TEXT NOT NULL,
    'album_listeners'       INTEGER NOT NULL,
    'album_playcount'       INTEGER NOT NULL
);
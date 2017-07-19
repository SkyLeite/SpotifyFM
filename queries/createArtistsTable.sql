CREATE TABLE IF NOT EXISTS 'artists' (
    'artist_mbid'      TEXT,
    'artist_name'      TEXT NOT NULL PRIMARY KEY,
    'artist_playcount' INTEGER NOT NULL,
    'artist_url'       TEXT NOT NULL
);
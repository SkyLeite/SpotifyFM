CREATE TABLE IF NOT EXISTS 'tracks' (
    'track_mbid'            TEXT PRIMARY KEY,
    'track_name'            TEXT NOT NULL,
    'track_artist_mbid'     TEXT,
    'track_album_mbid'      TEXT
);
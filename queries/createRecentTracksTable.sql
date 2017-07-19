CREATE TABLE IF NOT EXISTS 'recent_tracks' (
    'track_mbid'            TEXT PRIMARY KEY,
    'track_name'            TEXT NOT NULL,
    'track_artist_name'     TEXT,
    'track_album_name'      TEXT,
    'track_scrobble_date'   TEXT NOT NULL
);
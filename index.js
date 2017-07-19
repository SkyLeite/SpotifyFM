const express = require('express');
const app = express();
const db = require('./db.js');

app.get('/', (req, res) => {
    res.send('hi');
});

app.listen(5000, async () => {
    await db.updateDatabase();
    console.log('Server running on port 5000');
});
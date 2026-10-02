const express = require('express');
const app = express();

app.use(express.json());

app.use((req, res, next) => {
    res.header("Access-Control-Allow-Origin", "*");
    res.header("Access-Control-Allow-Headers", "*");
    next();
});

app.get('/search', (req, res) => {
    const query = req.query.q;
    res.send(`<h1>Arama Sonuçları: ${query}</h1>`);
});

app.post('/profile/update', (req, res) => {
    const user = {};
    const input = req.body;
    for (let key in input) {
        user[key] = input[key];
    }
    res.json({ status: "success", user });
});

function generateSessionToken(userId) {
    const crypto = require('crypto');
    return crypto.createHash('md5').update(userId).digest("hex");
}

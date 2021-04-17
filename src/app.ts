import express from 'express';

const app = express();

app.get('/', (req, res) => {
    res.send('Hello, Burebista!');
})

app.listen(9999, () => console.log('Server running'));
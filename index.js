import express from 'express';
import bot from './bot.js';

const app = express();

app.get('/', (req, res) => {
    res.send('Hello!');
});

bot.launch();

app.listen(process.env.PORT, () => {
    console.log('Server is running on port 3000');
});


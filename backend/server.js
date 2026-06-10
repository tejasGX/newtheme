import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import discoverRouter from './routes/discover.js';
import backtestRouter from './routes/backtest.js';
import quoteRouter from './routes/quote.js';

const app = express();
const PORT = process.env.PORT || 3001;

app.use(cors());
app.use(express.json());

app.use('/api/discover', discoverRouter);
app.use('/api/backtest', backtestRouter);
app.use('/api/quote', quoteRouter);

app.get('/health', (req, res) => res.json({ status: 'ok' }));

app.listen(PORT, () => {
  console.log(`ETF Lab backend running on port ${PORT}`);
});

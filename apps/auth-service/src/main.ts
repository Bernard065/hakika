import express from 'express';
import cors from 'cors';

const app = express();

app.use(cors(
  {
    origin: 'http://localhost:4200',
    allowedHeaders: ['Content-Type', 'Authorization'],
    credentials: true,
  }
));

app.get('/', (req, res) => {
  res.send({ message: 'Hello API' });
});

const port = process.env.PORT || 6001;;

const server = app.listen(port, () => {
  console.log(`Auth service listening at http://localhost:${port}/api`);
});
server.on('error', console.error);

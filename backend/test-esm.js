// Test ES module support
import express from 'express';
import { createServer } from 'http';

console.log('ES modules are working!');
console.log('Express version:', express.version);
console.log('HTTP module loaded successfully');

const app = express();
const server = createServer(app);

app.get('/test', (req, res) => {
  res.json({ message: 'ES modules working!' });
});

server.listen(5001, () => {
  console.log('Test server running on port 5001');
});

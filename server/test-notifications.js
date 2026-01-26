// Test script to check if notifications routes work
const express = require('express');
const cors = require('cors');

const app = express();
app.use(cors());
app.use(express.json());

// Simple test route
app.get('/api/notificacoes/usuario/test', (req, res) => {
  res.json({ message: 'Notifications route is working!', userId: 'test' });
});

app.get('/api/notificacoes/usuario/:usuarioId', (req, res) => {
  const { usuarioId } = req.params;
  res.json({ message: 'Notifications route is working!', usuarioId });
});

const PORT = 3002;
app.listen(PORT, () => {
  console.log(`Test server running on port ${PORT}`);
  console.log(`Test route: http://localhost:${PORT}/api/notificacoes/usuario/test-id`);
});

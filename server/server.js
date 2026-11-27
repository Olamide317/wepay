require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const { getOrganizerPublicHub } = require('./controllers/profileController');
const { getCollectionBySlug } = require('./controllers/collectionController');

const app = express();

app.use(cors({ origin: process.env.CLIENT_URL || '*' }));
app.use(express.json());

app.use('/api/auth', require('./routes/authRoutes'));
app.use('/api/profile', require('./routes/profileRoutes'));
app.use('/api/collections', require('./routes/collectionRoutes'));
app.use('/api/payments', require('./routes/paymentRoutes'));
app.get('/api/public/u/:handle', getOrganizerPublicHub);
app.get('/api/public/c/:slug', getCollectionBySlug);

app.get('/api/health', (req, res) => {
  res.status(200).json({ status: 'ok', service: 'WePay API' });
});

const PORT = process.env.PORT || 3000;

mongoose
  .connect(process.env.MONGO_URI)
  .then(() => {
    console.log('MongoDB connected');
    app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
  })
  .catch((err) => {
    console.error('MongoDB connection error:', err.message);
    process.exit(1);
  });

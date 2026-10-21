require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const jwt = require('jsonwebtoken');
const path = require('path');
const fs = require('fs');

const app = express();
const PORT = Number(process.env.PORT) || 3000;
const MONGODB_URI = process.env.MONGODB_URI;
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD;
const JWT_SECRET = process.env.JWT_SECRET;

if (!MONGODB_URI || !ADMIN_PASSWORD || !JWT_SECRET) {
  console.error('Missing configuration. Copy .env.example to .env and set MONGODB_URI, ADMIN_PASSWORD, and JWT_SECRET.');
  process.exit(1);
}

app.use(express.json({ limit: '1mb' }));

const productSchema = new mongoose.Schema({
  id: { type: String, required: true, unique: true, trim: true },
  name: { type: String, required: true, unique: true, trim: true, maxlength: 80 },
  brand: { type: String, required: true, trim: true, maxlength: 80 },
  category: { type: String, enum: ['women', 'men', 'unisex'], default: 'unisex' },
  price: { type: Number, required: true, min: 1 },
  notes: { type: String, default: '', maxlength: 240 },
  description: { type: String, default: '', maxlength: 2000 },
  image: { type: String, required: true, trim: true },
  trending: { type: Boolean, default: false },
  bestSeller: { type: Boolean, default: false },
  stock: { type: Number, default: 0, min: 0 },
  active: { type: Boolean, default: true }
}, { timestamps: true, versionKey: false });
const Product = mongoose.model('Product', productSchema);

function requireAdmin(req, res, next) {
  const header = req.headers.authorization || '';
  const token = header.startsWith('Bearer ') ? header.slice(7) : '';
  try {
    const payload = jwt.verify(token, JWT_SECRET);
    if (payload.role !== 'admin') throw new Error('Not admin');
    next();
  } catch {
    res.status(401).json({ message: 'Admin login required. Please sign in again.' });
  }
}

function cleanProduct(body) {
  const allowed = ['id', 'name', 'brand', 'category', 'price', 'notes', 'description', 'image', 'trending', 'bestSeller', 'stock', 'active'];
  const product = {};
  for (const key of allowed) if (body[key] !== undefined) product[key] = body[key];
  if (product.id !== undefined) product.id = String(product.id).trim();
  if (product.name !== undefined) product.name = String(product.name).trim();
  if (product.brand !== undefined) product.brand = String(product.brand).trim();
  if (product.image !== undefined) product.image = String(product.image).trim();
  if (product.price !== undefined) product.price = Number(product.price);
  if (product.stock !== undefined) product.stock = Number(product.stock);
  for (const key of ['trending', 'bestSeller', 'active']) if (product[key] !== undefined) product[key] = Boolean(product[key]);
  return product;
}

app.get('/api/health', (req, res) => res.json({ ok: true, database: mongoose.connection.readyState === 1 ? 'connected' : 'disconnected' }));
app.post('/api/auth/login', (req, res) => {
  const password = String(req.body?.password || '');
  if (password !== ADMIN_PASSWORD) return res.status(401).json({ message: 'Incorrect admin password.' });
  const token = jwt.sign({ role: 'admin' }, JWT_SECRET, { expiresIn: '8h' });
  res.json({ token, expiresIn: 28800 });
});

// Public storefront: never send hidden products to customers.
app.get('/api/products', async (req, res, next) => {
  try {
    const products = await Product.find({ active: true }).select('-_id -createdAt -updatedAt').sort({ createdAt: -1 }).lean();
    res.json(products);
  } catch (error) { next(error); }
});

// All inventory operations below require an authenticated admin.
app.get('/api/admin/products', requireAdmin, async (req, res, next) => {
  try { res.json(await Product.find().select('-_id -createdAt -updatedAt').sort({ createdAt: -1 }).lean()); }
  catch (error) { next(error); }
});
app.post('/api/admin/products', requireAdmin, async (req, res, next) => {
  try {
    const product = cleanProduct(req.body || {});
    if (!product.id) product.id = `VEL${Date.now().toString().slice(-8)}`;
    const created = await Product.create(product);
    res.status(201).json(created.toJSON());
  } catch (error) { next(error); }
});
app.put('/api/admin/products/:id', requireAdmin, async (req, res, next) => {
  try {
    const product = cleanProduct(req.body || {});
    delete product.id; // Product IDs are stable after creation.
    const updated = await Product.findOneAndUpdate({ id: req.params.id }, { $set: product }, { new: true, runValidators: true }).select('-_id -createdAt -updatedAt').lean();
    if (!updated) return res.status(404).json({ message: 'Product not found.' });
    res.json(updated);
  } catch (error) { next(error); }
});
app.delete('/api/admin/products/:id', requireAdmin, async (req, res, next) => {
  try {
    const deleted = await Product.findOneAndDelete({ id: req.params.id });
    if (!deleted) return res.status(404).json({ message: 'Product not found.' });
    res.json({ message: 'Product deleted.' });
  } catch (error) { next(error); }
});

// Serve the existing HTML/CSS/JS storefront from the same origin as the API.
app.use(express.static(path.join(__dirname), { index: 'index.html' }));
app.use((error, req, res, next) => {
  console.error(error);
  if (error.code === 11000) return res.status(409).json({ message: 'A product with that ID already exists.' });
  if (error.name === 'ValidationError' || error.name === 'CastError') return res.status(400).json({ message: error.message });
  res.status(500).json({ message: 'Server error. Check the terminal for details.' });
});

async function start() {
  await mongoose.connect(MONGODB_URI);
  console.log('Connected to MongoDB.');
  // Import the sample JSON catalogue only when the collection is empty.
  if (await Product.countDocuments() === 0) {
    const seedPath = path.join(__dirname, 'data', 'products.json');
    if (fs.existsSync(seedPath)) {
      const sampleProducts = JSON.parse(fs.readFileSync(seedPath, 'utf8'));
      if (sampleProducts.length) {
        await Product.insertMany(sampleProducts, { ordered: false });
        console.log(`Imported ${sampleProducts.length} sample products into MongoDB.`);
      }
    }
  }
  app.listen(PORT, () => console.log(`Veloura is running at http://localhost:${PORT}`));
}
start().catch(error => { console.error('Could not start server:', error.message); process.exit(1); });

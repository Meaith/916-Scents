# Veloura Perfume Store — MongoDB version

This project includes the perfume storefront, a local shopping cart, WhatsApp checkout, and an admin dashboard that creates, edits, hides, and deletes products in MongoDB.

## What changed
- Products are fetched from `GET /api/products`; the website no longer reads `data/products.json` for storefront listings.
- Admin changes use protected API routes and are saved in MongoDB, not browser localStorage.
- The admin dashboard has password login. Its password is configured privately in `.env`.
- When the MongoDB collection is empty, the server imports the sample products from `data/products.json` once as starter content.
- WhatsApp cart checkout remains available; edit `config.js` to set the seller's WhatsApp number.

## 1. Install Node.js
Install a current LTS version of Node.js from https://nodejs.org/ if it is not already installed. In VS Code, open this project folder and open Terminal > New Terminal.

## 2. Create a MongoDB database
You can use MongoDB Atlas (cloud database) or a local MongoDB server.

For Atlas:
1. Sign in at https://www.mongodb.com/atlas/database and create a free cluster.
2. Create a database user with a username and password.
3. In Network Access, allow your current IP address. For a deployed website, configure access for your hosting environment; avoid opening database access to everyone unless you understand the security implications.
4. Choose Connect > Drivers > Node.js and copy the connection string.
5. Replace the username, password, and database name in that string with your own values. If the password contains special characters, URL-encode them.

## 3. Add your database connection details
1. Copy `.env.example` and name the copy `.env` in the project root (the same folder as `server.js`).
2. Open `.env` and edit these lines:

```env
MONGODB_URI=mongodb+srv://YOUR_DB_USER:YOUR_DB_PASSWORD@YOUR_CLUSTER.mongodb.net/veloura?retryWrites=true&w=majority
ADMIN_PASSWORD=use-a-long-unique-password-here
JWT_SECRET=replace-with-a-long-random-secret-at-least-32-characters
PORT=3000
```

**The main line you must edit to connect your database is `MONGODB_URI`.** Paste your real Atlas connection string there. Keep `.env` private and never paste it into frontend JavaScript or commit it to GitHub. `ADMIN_PASSWORD` is the password you will enter on `admin.html`. `JWT_SECRET` signs the temporary admin login token; use a separate random secret.

## 4. Install dependencies and run the server
In the VS Code terminal, make sure you are in the project root and run:

```bash
npm install
npm start
```

You should see a message that MongoDB is connected and the site is running at `http://localhost:3000`.

**Important:** do not launch this MongoDB version with the Live Server extension. Open the site at `http://localhost:3000` so the frontend and API are served by the Node.js server on the same origin.

## 5. Open the website and admin dashboard
- Storefront: http://localhost:3000
- Product catalogue: http://localhost:3000/products.html
- Admin dashboard: http://localhost:3000/admin.html

Sign into the admin dashboard with the value you chose for `ADMIN_PASSWORD` in `.env`. From there you can add products, edit names/prices/stock/images, change trending and best-seller flags, hide/show products, and delete products. Saved changes are written to MongoDB and the public storefront reads from that database.

## 6. Configure WhatsApp checkout
Open `config.js` and change `whatsappNumber` to the seller's WhatsApp number in international digits only, e.g. `2348012345678` (no `+`, spaces, or dashes). This value is public storefront configuration, so it is okay to keep it in `config.js`.

## API overview
- `GET /api/products` — active products for customers
- `POST /api/auth/login` — checks the admin password and returns a short-lived token
- `GET /api/admin/products` — all products (admin token required)
- `POST /api/admin/products` — add a product (admin token required)
- `PUT /api/admin/products/:id` — update a product (admin token required)
- `DELETE /api/admin/products/:id` — delete a product (admin token required)
- `GET /api/health` — server/database health status

## Deployment notes
The frontend and `server.js` need to be deployed to a Node.js-capable host, and `MONGODB_URI`, `ADMIN_PASSWORD`, and `JWT_SECRET` must be set as private environment variables in that host's dashboard. A static-only host cannot run this Express API by itself. Use HTTPS in production. The current cart is browser-local and WhatsApp checkout creates a prefilled message; it does not charge customers or reserve stock automatically.

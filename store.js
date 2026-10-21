// Shared storefront utilities and product data loader.
window.VelouraStore = (() => {
  const STORAGE_KEY = "veloura_products_override_v1";
  const CART_KEY = "veloura_cart_v1";
  const money = value => new Intl.NumberFormat("en-NG", {style:"currency",currency:"NGN",maximumFractionDigits:0}).format(Number(value)||0);
  async function loadProducts() {
    const response = await fetch("/api/products");
    if (!response.ok) throw new Error("Could not load products from the database. Make sure the Node.js server is running and MongoDB is connected.");
    return response.json();
  }
  // Product changes are made through the authenticated admin API, never localStorage.
  function saveProducts() {
    throw new Error("Products are saved through the secure admin API, not in the browser.");
  }
  function productCard(product) {
    const tags = product.bestSeller ? "Best seller" : (product.trending ? "Trending" : "");
    return `<article class="product-card"><div class="product-image-wrap"><img class="product-image" src="${escapeHTML(product.image)}" alt="${escapeHTML(product.name)} perfume" loading="lazy" onerror="this.src='https://images.unsplash.com/photo-1594035910387-fea47794261f?auto=format&fit=crop&w=700&q=80'">${tags ? `<span class="product-tag">${tags}</span>` : ""}<button class="quick-add" data-add-to-cart="${escapeHTML(product.id)}">Add to cart +</button></div><div class="product-info"><p class="product-brand">${escapeHTML(product.brand)}</p><div class="product-name-row"><h3 class="product-name">${escapeHTML(product.name)}</h3><span class="product-price">${money(product.price)}</span></div><p class="product-notes">${escapeHTML(product.notes)}</p></div></article>`;
  }
  function escapeHTML(value) {
    return String(value ?? "").replace(/[&<>"']/g, char => ({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[char]));
  }
  function getCart() {
    try { return JSON.parse(localStorage.getItem(CART_KEY) || "[]"); }
    catch { return []; }
  }
  function saveCart(cart) {
    localStorage.setItem(CART_KEY, JSON.stringify(cart));
    updateCartCount();
    document.dispatchEvent(new CustomEvent("veloura:cart-updated", {detail: cart}));
  }
  function addToCart(product) {
    const cart = getCart();
    const existing = cart.find(item => item.id === product.id);
    if (existing) existing.quantity += 1;
    else cart.push({id: product.id, name: product.name, brand: product.brand, image: product.image, price: Number(product.price) || 0, quantity: 1});
    saveCart(cart);
    showToast(`${product.name} added to your cart`);
  }
  function updateCartCount() {
    const count = getCart().reduce((sum, item) => sum + (Number(item.quantity) || 0), 0);
    document.querySelectorAll("[data-cart-count]").forEach(node => { node.textContent = count; node.hidden = false; });
  }
  function showToast(message) {
    let toast = document.getElementById("toast");
    if (!toast) {
      toast = document.createElement("div"); toast.className = "toast"; toast.id = "toast"; toast.setAttribute("role", "status"); toast.setAttribute("aria-live", "polite"); document.body.appendChild(toast);
    }
    toast.textContent = message; toast.classList.add("show");
    clearTimeout(window.__velouraToastTimer);
    window.__velouraToastTimer = setTimeout(() => toast.classList.remove("show"), 2200);
  }
  function changeCartQuantity(id, change) {
    const cart = getCart();
    const item = cart.find(product => product.id === id);
    if (!item) return;
    item.quantity += change;
    saveCart(cart.filter(product => product.quantity > 0));
  }
  function removeFromCart(id) { saveCart(getCart().filter(item => item.id !== id)); }
  function clearCart() { saveCart([]); }
  function checkoutCart() {
    const cart = getCart();
    if (!cart.length) { alert("Your cart is empty. Add a perfume before checking out."); return; }
    const number = (window.VELOURA_CONFIG?.whatsappNumber || "").replace(/\D/g, "");
    if (!number || number === "2348000000000") {
      alert("Please set the seller's real WhatsApp number in config.js first. Use international digits only, e.g. 2348012345678.");
      return;
    }
    const storeName = window.VELOURA_CONFIG?.storeName || "Our store";
    const lines = cart.map((item, index) => `${index + 1}. ${item.name}\n   Quantity: ${item.quantity}\n   Unit price: ${money(item.price)}\n   Line total: ${money(item.price * item.quantity)}`);
    const total = cart.reduce((sum, item) => sum + Number(item.price) * Number(item.quantity), 0);
    const message = `Hello ${storeName}! I'd like to place this order:\n\n${lines.join("\n\n")}\n\nTotal: ${money(total)}\n\nPlease confirm availability, delivery fee and payment details. Thank you!`;
    window.open(`https://wa.me/${number}?text=${encodeURIComponent(message)}`, "_blank", "noopener,noreferrer");
  }
  function orderOnWhatsApp(items) {
    const number = (window.VELOURA_CONFIG?.whatsappNumber || "").replace(/\D/g, "");
    if (!number || number === "2348000000000") {
      alert("Please set your real WhatsApp number in config.js first. Use international digits only, e.g. 2348012345678.");
      return;
    }
    const storeName = window.VELOURA_CONFIG?.storeName || "Our store";
    const lines = items.map(item => `${item.quantity} × ${item.name} — ${money(item.price * item.quantity)}`);
    const total = items.reduce((sum, item) => sum + Number(item.price) * Number(item.quantity), 0);
    const message = `Hello ${storeName}! I'd like to place an order:\n\n${lines.join("\n")}\n\nSubtotal: ${money(total)}\n\nPlease confirm availability, delivery fee and payment details.`;
    window.open(`https://wa.me/${number}?text=${encodeURIComponent(message)}`, "_blank", "noopener,noreferrer");
  }
  function orderSingle(product) { orderOnWhatsApp([{...product, quantity:1}]); }
  function setupMenu() {
    document.getElementById("menu-toggle")?.addEventListener("click", () => document.getElementById("main-nav")?.classList.toggle("open"));
  }
  function setupYear() { const year = document.getElementById("year"); if (year) year.textContent = new Date().getFullYear(); }
  return {loadProducts, saveProducts, money, productCard, orderOnWhatsApp, orderSingle, escapeHTML, setupMenu, setupYear, getCart, saveCart, addToCart, updateCartCount, changeCartQuantity, removeFromCart, clearCart, checkoutCart, storageKey:STORAGE_KEY};
})();
document.addEventListener("DOMContentLoaded", () => { VelouraStore.setupMenu(); VelouraStore.setupYear(); VelouraStore.updateCartCount(); });
document.addEventListener("DOMContentLoaded", async () => {
  const trendingGrid = document.getElementById("trending-grid");
  const bestsellerGrid = document.getElementById("bestseller-grid");
  try {
    const products = (await VelouraStore.loadProducts()).filter(p => p.active !== false);
    const trending = products.filter(p => p.trending).slice(0,4);
    const bestsellers = products.filter(p => p.bestSeller).slice(0,4);
    trendingGrid.innerHTML = trending.length ? trending.map(VelouraStore.productCard).join("") : '<p class="loading-note">No trending products selected yet.</p>';
    bestsellerGrid.innerHTML = bestsellers.length ? bestsellers.map(VelouraStore.productCard).join("") : '<p class="loading-note">No best sellers selected yet.</p>';
  } catch (error) {
    trendingGrid.innerHTML = bestsellerGrid.innerHTML = `<p class="error-note">${VelouraStore.escapeHTML(error.message)}</p>`;
  }
  document.body.addEventListener("click", event => {
    const button = event.target.closest("[data-add-to-cart]");
    if (!button) return;
    VelouraStore.loadProducts().then(products => {
      const product = products.find(p => p.id === button.dataset.addToCart);
      if (product) VelouraStore.addToCart(product);
    }).catch(() => alert("Unable to load products. Please refresh and try again."));
  });
});
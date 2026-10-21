document.addEventListener("DOMContentLoaded", async () => {
  const grid = document.getElementById("products-grid");
  const empty = document.getElementById("empty-state");
  const search = document.getElementById("search-input");
  const sort = document.getElementById("sort-select");
  const count = document.getElementById("results-count");
  let products = [];
  let filter = "all";
  const params = new URLSearchParams(location.search);
  if (["trending","bestseller"].includes(params.get("filter"))) filter = params.get("filter");
  document.querySelectorAll("[data-filter]").forEach(button => {
    button.classList.toggle("active", button.dataset.filter === filter);
    button.addEventListener("click", () => {
      filter = button.dataset.filter;
      document.querySelectorAll("[data-filter]").forEach(b => b.classList.toggle("active", b === button));
      render();
    });
  });
  function render() {
    const query = search.value.trim().toLowerCase();
    let visible = products.filter(p => p.active !== false).filter(p => {
      const categoryMatch = filter === "all" || (filter === "trending" ? p.trending : filter === "bestseller" ? p.bestSeller : p.category === filter);
      const text = `${p.name} ${p.brand} ${p.notes} ${p.category}`.toLowerCase();
      return categoryMatch && text.includes(query);
    });
    if (sort.value === "low") visible.sort((a,b) => a.price-b.price);
    if (sort.value === "high") visible.sort((a,b) => b.price-a.price);
    if (sort.value === "az") visible.sort((a,b) => a.name.localeCompare(b.name));
    grid.innerHTML = visible.map(VelouraStore.productCard).join("");
    count.textContent = `${visible.length} ${visible.length === 1 ? "fragrance" : "fragrances"}`;
    empty.hidden = visible.length > 0;
  }
  try { products = await VelouraStore.loadProducts(); render(); }
  catch(error) { grid.innerHTML = `<p class="error-note">${VelouraStore.escapeHTML(error.message)}</p>`; }
  search.addEventListener("input", render);
  sort.addEventListener("change", render);
  document.body.addEventListener("click", event => {
    const button = event.target.closest("[data-add-to-cart]");
    if (!button) return;
    const product = products.find(p => p.id === button.dataset.addToCart);
    if (product) VelouraStore.addToCart(product);
  });
});
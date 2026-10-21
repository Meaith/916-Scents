document.addEventListener("DOMContentLoaded", () => {
  const itemsContainer = document.getElementById("cart-items");
  const countLabel = document.getElementById("cart-item-count");
  const subtotalLabel = document.getElementById("cart-subtotal");
  const totalLabel = document.getElementById("cart-total");
  const checkoutButton = document.getElementById("checkout-button");

  function renderCart() {
    const cart = VelouraStore.getCart();
    const itemCount = cart.reduce((sum, item) => sum + item.quantity, 0);
    const total = cart.reduce(
      (sum, item) => sum + item.price * item.quantity,
      0,
    );
    countLabel.textContent = `${itemCount} ${itemCount === 1 ? "item" : "items"}`;
    subtotalLabel.textContent = VelouraStore.money(total);
    totalLabel.textContent = VelouraStore.money(total);
    checkoutButton.disabled = cart.length === 0;

    if (!cart.length) {
      itemsContainer.innerHTML =
        '<div class="cart-empty"><span>♡</span><h3>Your cart is waiting for a scent.</h3><p>You have not added any perfumes yet.</p><a class="primary-button" href="products.html">Explore perfumes</a></div>';
      return;
    }
    itemsContainer.innerHTML = cart
      .map(
        (item) =>
          `<article class="cart-item"><img src="${VelouraStore.escapeHTML(item.image)}" alt="${VelouraStore.escapeHTML(item.name)}" onerror="this.src='https://images.unsplash.com/photo-1594035910387-fea47794261f?auto=format&fit=crop&w=300&q=80'"><div class="cart-item-details"><p class="product-brand">${VelouraStore.escapeHTML(item.brand || "VELOURA COLLECTION")}</p><h3>${VelouraStore.escapeHTML(item.name)}</h3><p class="cart-unit-price">${VelouraStore.money(item.price)} each</p><div class="quantity-control"><button type="button" data-quantity="-1" data-id="${VelouraStore.escapeHTML(item.id)}" aria-label="Decrease quantity">−</button><span>${item.quantity}</span><button type="button" data-quantity="1" data-id="${VelouraStore.escapeHTML(item.id)}" aria-label="Increase quantity">+</button></div></div><div class="cart-item-end"><strong>${VelouraStore.money(item.price * item.quantity)}</strong><button class="remove-item" type="button" data-remove="${VelouraStore.escapeHTML(item.id)}">Remove</button></div></article>`,
      )
      .join("");
  }

  itemsContainer.addEventListener("click", (event) => {
    const quantityButton = event.target.closest("[data-quantity]");
    const removeButton = event.target.closest("[data-remove]");
    if (quantityButton)
      VelouraStore.changeCartQuantity(
        quantityButton.dataset.id,
        Number(quantityButton.dataset.quantity),
      );
    if (removeButton) VelouraStore.removeFromCart(removeButton.dataset.remove);
    renderCart();
  });
  checkoutButton.addEventListener("click", VelouraStore.checkoutCart);
  document.addEventListener("veloura:cart-updated", renderCart);
  renderCart();
});

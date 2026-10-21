document.addEventListener("DOMContentLoaded", () => {
  const rows = document.getElementById("admin-product-rows");
  const modal = document.getElementById("product-modal");
  const form = document.getElementById("product-form");
  const loginPanel = document.getElementById("admin-login-panel");
  const dashboard = document.getElementById("admin-dashboard");
  const loginForm = document.getElementById("admin-login-form");
  const loginError = document.getElementById("admin-login-error");
  const TOKEN_KEY = "veloura_admin_token";
  let products = [];
  let toastTimer;
  const $ = (id) => document.getElementById(id);
  const notify = (message) => {
    const toast = $("toast");
    toast.textContent = message;
    toast.classList.add("show");
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => toast.classList.remove("show"), 2600);
  };
  const token = () => sessionStorage.getItem(TOKEN_KEY) || "";
  async function api(url, options = {}) {
    const headers = {
      "Content-Type": "application/json",
      ...(options.headers || {}),
    };
    if (token()) headers.Authorization = `Bearer ${token()}`;
    const response = await fetch(url, { ...options, headers });
    const data = await response.json().catch(() => ({}));
    if (!response.ok) {
      if (response.status === 401) signOut(false);
      throw new Error(data.message || "The request failed.");
    }
    return data;
  }
  function showDashboard() {
    loginPanel.hidden = true;
    dashboard.hidden = false;
  }
  function signOut(showMessage = true) {
    sessionStorage.removeItem(TOKEN_KEY);
    dashboard.hidden = true;
    loginPanel.hidden = false;
    if (showMessage) notify("You have signed out.");
  }
  function render() {
    $("stat-products").textContent = products.length;
    $("stat-stock").textContent = products.reduce(
      (sum, p) => sum + Math.max(0, Number(p.stock) || 0),
      0,
    );
    $("stat-trending").textContent = products.filter(
      (p) => p.trending && p.active !== false,
    ).length;
    $("stat-best").textContent = products.filter(
      (p) => p.bestSeller && p.active !== false,
    ).length;
    const query = $("admin-search").value.trim().toLowerCase();
    const visible = products.filter((p) =>
      `${p.name} ${p.brand} ${p.id}`.toLowerCase().includes(query),
    );
    rows.innerHTML =
      visible
        .map(
          (p) => `<tr>
      <td><div class="inventory-product"><img src="${VelouraStore.escapeHTML(p.image)}" alt=""><div><strong>${VelouraStore.escapeHTML(p.name)}</strong><small>${VelouraStore.escapeHTML(p.id)} · ${VelouraStore.escapeHTML(p.brand)}</small></div></div></td>
      <td>${VelouraStore.escapeHTML(p.category)}</td><td>${VelouraStore.money(p.price)}</td><td>${Number(p.stock) || 0}</td>
      <td>${p.trending ? '<span class="mini-tag">Trending</span>' : ""} ${p.bestSeller ? '<span class="mini-tag">Best seller</span>' : ""}</td>
      <td><span class="status ${p.active === false ? "status-hidden" : "status-live"}">${p.active === false ? "Hidden" : "Live"}</span></td>
      <td><div class="row-actions"><button class="table-action" data-edit="${VelouraStore.escapeHTML(p.id)}">Edit</button><button class="table-action danger" data-delete="${VelouraStore.escapeHTML(p.id)}">Delete</button></div></td>
    </tr>`,
        )
        .join("") || '<tr><td colspan="7">No products found.</td></tr>';
  }
  async function refreshProducts() {
    products = await api("/api/admin/products");
    render();
  }
  function openModal(product) {
    form.reset();
    $("product-id").value = product?.id || "";
    $("modal-title").textContent = product ? "Edit perfume" : "Add a perfume";
    $("product-name").value = product?.name || "";
    $("product-brand").value = product?.brand || "";
    $("product-price").value = product?.price ?? "";
    $("product-stock").value = product?.stock ?? 1;
    $("product-category").value = product?.category || "unisex";
    $("product-image").value = product?.image || "";
    $("product-notes").value = product?.notes || "";
    $("product-description").value = product?.description || "";
    $("product-trending").checked = Boolean(product?.trending);
    $("product-bestseller").checked = Boolean(product?.bestSeller);
    $("product-active").checked = product?.active !== false;
    modal.hidden = false;
    $("product-name").focus();
  }
  function closeModal() {
    modal.hidden = true;
  }

  loginForm.addEventListener("submit", async (event) => {
    event.preventDefault();
    loginError.textContent = "";
    const button = loginForm.querySelector("button[type='submit']");
    button.disabled = true;
    try {
      const result = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password: $("admin-password").value }),
      });
      const data = await result.json().catch(() => ({}));
      if (!result.ok) throw new Error(data.message || "Could not sign in.");
      sessionStorage.setItem(TOKEN_KEY, data.token);
      $("admin-password").value = "";
      showDashboard();
      await refreshProducts();
    } catch (error) {
      loginError.textContent = error.message;
    } finally {
      button.disabled = false;
    }
  });

  $("admin-logout").addEventListener("click", () => signOut());
  $("add-product-button").addEventListener("click", () => openModal(null));
  $("modal-close").addEventListener("click", closeModal);
  $("cancel-product").addEventListener("click", closeModal);
  modal.addEventListener("click", (event) => {
    if (event.target === modal) closeModal();
  });
  $("admin-search").addEventListener("input", render);
  form.addEventListener("submit", async (event) => {
    event.preventDefault();
    const existingId = $("product-id").value.trim();
    const product = {
      name: $("product-name").value.trim(),
      brand: $("product-brand").value.trim(),
      category: $("product-category").value,
      price: Number($("product-price").value),
      stock: Number($("product-stock").value),
      image: $("product-image").value.trim(),
      notes: $("product-notes").value.trim(),
      description: $("product-description").value.trim(),
      trending: $("product-trending").checked,
      bestSeller: $("product-bestseller").checked,
      active: $("product-active").checked,
    };
    try {
      if (existingId)
        await api(`/api/admin/products/${encodeURIComponent(existingId)}`, {
          method: "PUT",
          body: JSON.stringify(product),
        });
      else
        await api("/api/admin/products", {
          method: "POST",
          body: JSON.stringify(product),
        });
      await refreshProducts();
      closeModal();
      notify(
        existingId
          ? "Perfume updated in MongoDB."
          : "Perfume added to MongoDB.",
      );
    } catch (error) {
      alert(error.message);
    }
  });
  rows.addEventListener("click", async (event) => {
    const edit = event.target.closest("[data-edit]");
    const del = event.target.closest("[data-delete]");
    if (edit) {
      const product = products.find((p) => p.id === edit.dataset.edit);
      if (product) openModal(product);
    }
    if (del) {
      const product = products.find((p) => p.id === del.dataset.delete);
      if (
        product &&
        confirm(`Permanently delete "${product.name}" from MongoDB?`)
      ) {
        try {
          await api(`/api/admin/products/${encodeURIComponent(product.id)}`, {
            method: "DELETE",
          });
          await refreshProducts();
          notify("Perfume deleted from MongoDB.");
        } catch (error) {
          alert(error.message);
        }
      }
    }
  });
  $("export-json").addEventListener("click", () => {
    const blob = new Blob([JSON.stringify(products, null, 2)], {
      type: "application/json",
    });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = "veloura-products.json";
    link.click();
    URL.revokeObjectURL(url);
  });

  if (token()) {
    showDashboard();
    refreshProducts().catch((error) => {
      rows.innerHTML = `<tr><td colspan="7">${VelouraStore.escapeHTML(error.message)}</td></tr>`;
    });
  }
});

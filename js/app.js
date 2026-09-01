// DishDash — single-page app logic.
// State-driven views: home → store → checkout → tracking → orders.

(function () {
  "use strict";

  /* ── State ─────────────────────────────────────────────────── */
  const state = {
    view: "home",            // home | store | checkout | tracking | orders
    storeId: null,
    category: "all",
    query: "",
    sort: "recommended",     // recommended | rating | time | fee
    cart: { storeId: null, items: [] }, // items: {itemId, name, price, emoji, qty, note}
    drawerOpen: false,
    modalItem: null,         // {store, item}
    modalQty: 1,
    tipRate: 0.15,
    activeOrder: null,       // live tracking order
    orders: [],
    address: "1420 Maple Ave",
  };

  let trackTimer = null;

  /* ── Persistence (best-effort; never required) ─────────────── */
  function loadOrders() {
    try {
      const raw = localStorage.getItem("dishdash-orders");
      if (raw) state.orders = JSON.parse(raw);
    } catch (e) { /* storage unavailable — run without history */ }
  }
  function saveOrders() {
    try {
      localStorage.setItem("dishdash-orders", JSON.stringify(state.orders.slice(0, 20)));
    } catch (e) { /* ignore */ }
  }

  /* ── Helpers ───────────────────────────────────────────────── */
  const $ = (sel, el) => (el || document).querySelector(sel);
  const money = (n) => "$" + n.toFixed(2);
  const store = (id) => RESTAURANTS.find((r) => r.id === id);
  const grad = (r) => `linear-gradient(135deg, ${r.gradient[0]}, ${r.gradient[1]})`;
  const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));

  function cartCount() {
    return state.cart.items.reduce((n, it) => n + it.qty, 0);
  }
  function cartSubtotal() {
    return state.cart.items.reduce((n, it) => n + it.price * it.qty, 0);
  }
  function findMenuItem(r, itemId) {
    for (const sec of r.menu) {
      const it = sec.items.find((i) => i.id === itemId);
      if (it) return it;
    }
    return null;
  }
  function orderTotals(subtotal, fee, tipRate) {
    const serviceFee = Math.min(subtotal * SERVICE_FEE_RATE, SERVICE_FEE_CAP);
    const tax = subtotal * TAX_RATE;
    const tip = subtotal * tipRate;
    return { subtotal, fee, serviceFee, tax, tip, total: subtotal + fee + serviceFee + tax + tip };
  }

  function toast(msg) {
    const old = $(".toast");
    if (old) old.remove();
    const el = document.createElement("div");
    el.className = "toast";
    el.textContent = msg;
    document.body.appendChild(el);
    setTimeout(() => el.remove(), 2200);
  }

  function go(view, storeId) {
    state.view = view;
    if (storeId !== undefined) state.storeId = storeId;
    state.modalItem = null;
    window.scrollTo({ top: 0 });
    render();
  }

  /* ── Cart operations ───────────────────────────────────────── */
  function addToCart(r, item, qty, note) {
    if (state.cart.storeId && state.cart.storeId !== r.id && state.cart.items.length) {
      const other = store(state.cart.storeId);
      const ok = window.confirm(
        `Your cart has items from ${other ? other.name : "another store"}. Start a new cart with ${r.name}?`
      );
      if (!ok) return false;
      state.cart.items = [];
    }
    state.cart.storeId = r.id;
    const existing = state.cart.items.find((it) => it.itemId === item.id && (it.note || "") === (note || ""));
    if (existing) existing.qty += qty;
    else state.cart.items.push({ itemId: item.id, name: item.name, price: item.price, emoji: item.emoji, qty, note: note || "" });
    toast(`Added ${item.name}`);
    const btn = $(".cart-btn");
    if (btn) { btn.classList.remove("bump"); void btn.offsetWidth; btn.classList.add("bump"); }
    return true;
  }

  function changeQty(index, delta) {
    const it = state.cart.items[index];
    if (!it) return;
    it.qty += delta;
    if (it.qty <= 0) state.cart.items.splice(index, 1);
    if (!state.cart.items.length) state.cart.storeId = null;
    render();
  }

  /* ── Order placement & tracking simulation ─────────────────── */
  const DASHERS = [
    { name: "Maya R.", avatar: "🚴", vehicle: "on a bike" },
    { name: "Jordan T.", avatar: "🛵", vehicle: "on a scooter" },
    { name: "Sam K.", avatar: "🚗", vehicle: "in a blue sedan" },
    { name: "Priya N.", avatar: "🚴", vehicle: "on a bike" },
  ];
  const STEPS = [
    { key: "confirmed", title: "Order confirmed", sub: "The restaurant has your order." },
    { key: "preparing", title: "Preparing your food", sub: "The kitchen is on it." },
    { key: "pickup", title: "Courier heading to pickup", sub: "Your courier is on the way to the restaurant." },
    { key: "delivering", title: "Out for delivery", sub: "Food is on the move." },
    { key: "delivered", title: "Delivered", sub: "Enjoy! Rate your order when you're ready." },
  ];

  function placeOrder(formAddress, formName) {
    const r = store(state.cart.storeId);
    if (!r || !state.cart.items.length) return;
    if (formAddress) state.address = formAddress;
    const totals = orderTotals(cartSubtotal(), r.fee, state.tipRate);
    const etaMin = r.deliveryMin + Math.floor(Math.random() * (r.deliveryMax - r.deliveryMin + 1));
    const order = {
      id: "DD-" + Math.random().toString(36).slice(2, 8).toUpperCase(),
      storeId: r.id,
      storeName: r.name,
      emoji: r.emoji,
      gradient: r.gradient,
      items: state.cart.items.map((it) => ({ ...it })),
      totals,
      name: formName || "",
      address: state.address,
      placedAt: Date.now(),
      etaMin,
      stepIndex: 0,
      status: "active",
      dasher: DASHERS[Math.floor(Math.random() * DASHERS.length)],
    };
    state.orders.unshift(order);
    saveOrders();
    state.activeOrder = order;
    state.cart = { storeId: null, items: [] };
    startTracking(order);
    go("tracking");
  }

  function startTracking(order) {
    stopTracking();
    // Advance one step every few seconds; sped-up simulation of the real timeline.
    trackTimer = setInterval(() => {
      if (order.stepIndex < STEPS.length - 1) {
        order.stepIndex += 1;
        order.etaMin = Math.max(1, Math.round(order.etaMin * (1 - order.stepIndex / STEPS.length)));
        if (order.stepIndex === STEPS.length - 1) {
          order.status = "delivered";
          order.etaMin = 0;
          saveOrders();
          stopTracking();
        }
        if (state.view === "tracking" && state.activeOrder === order) render();
      }
    }, 6000);
  }
  function stopTracking() {
    if (trackTimer) { clearInterval(trackTimer); trackTimer = null; }
  }

  function reorder(order) {
    const r = store(order.storeId);
    if (!r) return;
    state.cart = { storeId: r.id, items: order.items.map((it) => ({ ...it })) };
    state.drawerOpen = true;
    toast("Cart refilled from your order");
    render();
  }

  /* ── Rendering ─────────────────────────────────────────────── */
  function render() {
    renderHeader();
    const root = $("#view");
    switch (state.view) {
      case "store": root.innerHTML = viewStore(); break;
      case "checkout": root.innerHTML = viewCheckout(); break;
      case "tracking": root.innerHTML = viewTracking(); break;
      case "orders": root.innerHTML = viewOrders(); break;
      default: root.innerHTML = viewHome();
    }
    renderDrawer();
    renderModal();
    bindView();
  }

  function renderHeader() {
    $("#cart-count").textContent = cartCount();
    $("#address-label").textContent = state.address;
    $("#search-input").value = state.query;
  }

  /* Home */
  function filteredRestaurants() {
    let list = RESTAURANTS.slice();
    if (state.category !== "all") list = list.filter((r) => r.categories.includes(state.category));
    if (state.query.trim()) {
      const q = state.query.trim().toLowerCase();
      list = list.filter((r) =>
        r.name.toLowerCase().includes(q) ||
        r.tags.some((t) => t.toLowerCase().includes(q)) ||
        r.menu.some((sec) => sec.items.some((i) => i.name.toLowerCase().includes(q)))
      );
    }
    switch (state.sort) {
      case "rating": list.sort((a, b) => b.rating - a.rating); break;
      case "time": list.sort((a, b) => a.deliveryMin - b.deliveryMin); break;
      case "fee": list.sort((a, b) => a.fee - b.fee); break;
      default: list.sort((a, b) => (b.promoted ? 1 : 0) - (a.promoted ? 1 : 0) || b.rating - a.rating);
    }
    return list;
  }

  function viewHome() {
    const list = filteredRestaurants();
    const cards = list.map((r) => `
      <button class="card" data-store="${r.id}" aria-label="Open ${esc(r.name)}">
        <div class="card-img" style="background:${grad(r)}">
          <span aria-hidden="true">${r.emoji}</span>
          ${r.promo ? `<span class="promo-badge">${esc(r.promo)}</span>` : ""}
          <span class="eta-badge num">${r.deliveryMin}–${r.deliveryMax} min</span>
        </div>
        <div class="card-body">
          <div class="card-title-row">
            <span class="card-title">${esc(r.name)}</span>
            <span class="card-rating"><span class="star">★</span>${r.rating}<span class="count">(${r.ratingCount})</span></span>
          </div>
          <div class="card-meta">
            <span>${r.tags.join(" · ")}</span>
          </div>
          <div class="card-meta">
            <span class="${r.fee < 1 ? "fee-free" : ""}">${r.fee < 1 ? "$0.99 delivery" : money(r.fee) + " delivery"}</span>
            <span class="dot">${r.price}</span>
          </div>
        </div>
      </button>`).join("");

    const chips = CATEGORIES.map((c) => `
      <button class="cat-chip ${state.category === c.id ? "active" : ""}" data-cat="${c.id}">
        <span aria-hidden="true">${c.emoji}</span>${c.label}
      </button>`).join("");

    const sorts = [
      ["recommended", "Recommended"],
      ["rating", "Top rated"],
      ["time", "Fastest"],
      ["fee", "Lowest fee"],
    ].map(([k, label]) => `<button class="sort-chip ${state.sort === k ? "active" : ""}" data-sort="${k}">${label}</button>`).join("");

    return `
      <section class="hero">
        <h1>Crave it. Tap it. It's on the way.</h1>
        <p>Order from ${RESTAURANTS.length} neighborhood favorites near ${esc(state.address)} — delivered hot in as little as 10 minutes.</p>
        <span class="hero-emoji" aria-hidden="true">🛵</span>
      </section>
      <div class="cat-rail" role="tablist" aria-label="Cuisine categories">${chips}</div>
      <div class="toolbar">
        ${sorts}
        <span class="result-count num">${list.length} ${list.length === 1 ? "restaurant" : "restaurants"}</span>
      </div>
      ${list.length
        ? `<div class="grid">${cards}</div>`
        : `<div class="empty-state"><div class="big">🔍</div><p>No restaurants match “${esc(state.query)}”.<br>Try another dish or cuisine.</p></div>`}
    `;
  }

  /* Store */
  function viewStore() {
    const r = store(state.storeId);
    if (!r) return viewHome();
    const sections = r.menu.map((sec, si) => `
      <section class="menu-section" id="sec-${si}">
        <h2>${esc(sec.section)}</h2>
        <div class="menu-grid">
          ${sec.items.map((it) => `
            <button class="menu-item" data-item="${it.id}" aria-label="Add ${esc(it.name)}">
              <div class="mi-text">
                <span class="mi-name">${esc(it.name)}${it.popular ? '<span class="pop-tag">Popular</span>' : ""}</span>
                <span class="mi-desc">${esc(it.desc)}</span>
                <span class="mi-price num">${money(it.price)}</span>
              </div>
              <span class="mi-thumb" style="background:${grad(r)}">
                <span aria-hidden="true">${it.emoji}</span>
                <span class="mi-add" aria-hidden="true">+</span>
              </span>
            </button>`).join("")}
        </div>
      </section>`).join("");

    const nav = r.menu.map((sec, si) =>
      `<button class="cat-chip" data-jump="sec-${si}">${esc(sec.section)}</button>`).join("");

    return `
      <button class="back-btn" data-back>← Back to restaurants</button>
      <section class="store-hero" style="background:${grad(r)}">
        <span class="store-emoji" aria-hidden="true">${r.emoji}</span>
        <div>
          <h1>${esc(r.name)}</h1>
          <div class="store-sub">${r.tags.join(" · ")} &nbsp;·&nbsp; ${r.price}</div>
        </div>
      </section>
      <div class="store-info-bar">
        <span class="info-pill"><span class="star">★</span><span class="num">${r.rating}</span> (${r.ratingCount} ratings)</span>
        <span class="info-pill num">🕐 ${r.deliveryMin}–${r.deliveryMax} min</span>
        <span class="info-pill num">🚚 ${money(r.fee)} delivery</span>
        ${r.promo ? `<span class="info-pill pill-promo">🏷️ ${esc(r.promo)}</span>` : ""}
      </div>
      <nav class="menu-nav" aria-label="Menu sections">${nav}</nav>
      ${sections}
    `;
  }

  /* Checkout */
  function viewCheckout() {
    const r = store(state.cart.storeId);
    if (!r || !state.cart.items.length) {
      return `<div class="empty-state"><div class="big">🛒</div><p>Your cart is empty.</p>
        <p><button class="btn-secondary" data-back style="display:inline-block; flex:none; padding:10px 22px;">Browse restaurants</button></p></div>`;
    }
    const t = orderTotals(cartSubtotal(), r.fee, state.tipRate);
    const tipChips = TIP_PRESETS.map((rate) => `
      <button class="tip-chip ${state.tipRate === rate ? "active" : ""}" data-tip="${rate}">
        ${rate === 0 ? "None" : Math.round(rate * 100) + "%"}
        <small class="num">${rate === 0 ? "$0.00" : money(cartSubtotal() * rate)}</small>
      </button>`).join("");
    const items = state.cart.items.map((it) => `
      <div class="receipt-item">
        <span class="ri-qty num">${it.qty}×</span>
        <span class="ri-name">${esc(it.name)}</span>
        <span class="num">${money(it.price * it.qty)}</span>
      </div>`).join("");

    return `
      <button class="back-btn" data-goto-store="${r.id}">← Back to ${esc(r.name)}</button>
      <h1 class="page-title">Checkout</h1>
      <div class="checkout-layout">
        <div>
          <div class="panel">
            <h2>🏠 Delivery details</h2>
            <div class="field-grid">
              <div class="field-row">
                <label for="f-name">Name</label>
                <input id="f-name" type="text" placeholder="Your name" autocomplete="name">
              </div>
              <div class="field-row">
                <label for="f-phone">Phone</label>
                <input id="f-phone" type="tel" placeholder="(555) 555-0100" autocomplete="tel">
              </div>
            </div>
            <div class="field-row">
              <label for="f-address">Address</label>
              <input id="f-address" type="text" value="${esc(state.address)}" autocomplete="street-address">
            </div>
            <div class="field-row">
              <label for="f-notes">Drop-off instructions</label>
              <input id="f-notes" type="text" placeholder="e.g. Leave at door, gate code 4321">
            </div>
          </div>
          <div class="panel">
            <h2>💳 Payment</h2>
            <div class="field-grid">
              <div class="field-row">
                <label for="f-card">Card number</label>
                <input id="f-card" type="text" inputmode="numeric" placeholder="4242 4242 4242 4242">
              </div>
              <div class="field-row">
                <label for="f-exp">Expiry / CVC</label>
                <input id="f-exp" type="text" placeholder="12/29 · 123">
              </div>
            </div>
            <p style="color:var(--muted); font-size:12.5px; margin:4px 0 0;">Demo checkout — nothing is charged and card details are not stored or sent anywhere.</p>
          </div>
          <div class="panel">
            <h2>💜 Tip your courier</h2>
            <div class="tip-row">${tipChips}</div>
          </div>
        </div>
        <div class="panel">
          <h2>${r.emoji} ${esc(r.name)}</h2>
          <div class="receipt-items">${items}</div>
          <div class="receipt">
            <div class="receipt-row"><span>Subtotal</span><span class="num">${money(t.subtotal)}</span></div>
            <div class="receipt-row"><span>Delivery fee</span><span class="num">${money(t.fee)}</span></div>
            <div class="receipt-row"><span>Service fee</span><span class="num">${money(t.serviceFee)}</span></div>
            <div class="receipt-row"><span>Estimated tax</span><span class="num">${money(t.tax)}</span></div>
            <div class="receipt-row"><span>Courier tip</span><span class="num">${money(t.tip)}</span></div>
            <div class="receipt-row total"><span>Total</span><span class="num">${money(t.total)}</span></div>
          </div>
          <button class="btn-primary center" data-place-order style="margin-top:16px; width:100%;">
            Place order · ${money(t.total)}
          </button>
        </div>
      </div>
    `;
  }

  /* Tracking */
  function viewTracking() {
    const o = state.activeOrder || state.orders.find((x) => x.status === "active") || state.orders[0];
    if (!o) {
      return `<div class="empty-state"><div class="big">📦</div><p>No orders yet — your deliveries will show up here.</p></div>`;
    }
    state.activeOrder = o;
    const done = o.stepIndex >= STEPS.length - 1;
    const progress = (o.stepIndex / (STEPS.length - 1)) * 100;
    const courierLeft = 12 + (progress / 100) * 76; // 12% → 88%
    const steps = STEPS.map((s, i) => `
      <div class="step ${i < o.stepIndex ? "done" : i === o.stepIndex ? "current" : ""}">
        <div class="step-rail">
          <div class="step-dot">${i < o.stepIndex ? "✓" : i === o.stepIndex ? "●" : ""}</div>
          <div class="step-line"></div>
        </div>
        <div class="step-text">
          <div class="step-title">${s.title}</div>
          <div class="step-sub">${s.sub}</div>
        </div>
      </div>`).join("");

    return `
      <div class="track-wrap">
        <h1 class="page-title" style="text-align:center;">${done ? "Order delivered 🎉" : "Tracking your order"}</h1>
        <div class="track-card">
          <div class="track-map" aria-hidden="true">
            <div class="route"><div class="route-fill" style="width:${progress}%"></div></div>
            <span class="map-pin pin-store">${o.emoji}</span>
            <span class="map-pin pin-home">🏠</span>
            <span class="courier" style="left:${courierLeft}%">${o.dasher.avatar}</span>
          </div>
          <div class="track-body">
            <div class="track-eta">
              <div class="track-status-pill">${done ? "" : '<span class="pulse"></span>'}${STEPS[o.stepIndex].title}</div>
              <div class="eta-min num">${done ? "Delivered" : o.etaMin + " min"}</div>
              <div class="eta-label">${done ? "Order " + o.id + " · " + esc(o.address) : "Estimated arrival · Order " + o.id}</div>
            </div>
            <div class="steps">${steps}</div>
            <div class="dasher-card">
              <div class="dasher-avatar">${o.dasher.avatar}</div>
              <div>
                <div class="dasher-name">${esc(o.dasher.name)} is your courier</div>
                <div class="dasher-sub">Delivering ${o.dasher.vehicle} from ${esc(o.storeName)}</div>
              </div>
            </div>
            <div class="track-actions">
              <button class="btn-secondary" data-view="orders">View all orders</button>
              <button class="btn-secondary" data-back>Order more food</button>
            </div>
          </div>
        </div>
      </div>
    `;
  }

  /* Orders */
  function viewOrders() {
    if (!state.orders.length) {
      return `<div class="empty-state"><div class="big">🧾</div><p>No orders yet.<br>When you order, your history lives here.</p>
        <p><button class="btn-secondary" data-back style="display:inline-block; flex:none; padding:10px 22px;">Find something tasty</button></p></div>`;
    }
    const rows = state.orders.map((o, i) => {
      const when = new Date(o.placedAt);
      const timeStr = when.toLocaleDateString(undefined, { month: "short", day: "numeric" }) +
        " · " + when.toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" });
      const count = o.items.reduce((n, it) => n + it.qty, 0);
      const active = o.status === "active";
      return `
      <div class="order-row">
        <div class="or-thumb" style="background:linear-gradient(135deg, ${o.gradient[0]}, ${o.gradient[1]})">${o.emoji}</div>
        <div class="or-info">
          <div class="or-store">${esc(o.storeName)}</div>
          <div class="or-sub num">${timeStr} · ${count} item${count === 1 ? "" : "s"} · ${money(o.totals.total)}</div>
        </div>
        <span class="or-status ${active ? "active" : "delivered"}">${active ? "In progress" : "Delivered"}</span>
        ${active
          ? `<button class="or-reorder" data-track="${i}">Track</button>`
          : `<button class="or-reorder" data-reorder="${i}">Reorder</button>`}
      </div>`;
    }).join("");
    return `
      <h1 class="page-title" style="text-align:center;">Your orders</h1>
      <div class="orders-list">${rows}</div>
    `;
  }

  /* Cart drawer */
  function renderDrawer() {
    const host = $("#drawer-root");
    if (!state.drawerOpen) { host.innerHTML = ""; return; }
    const r = store(state.cart.storeId);
    const lines = state.cart.items.map((it, i) => `
      <div class="cart-line">
        <div class="cl-thumb" style="background:${r ? grad(r) : "var(--surface-2)"}">${it.emoji}</div>
        <div class="cl-info">
          <div class="cl-name">${esc(it.name)}</div>
          ${it.note ? `<div class="cl-note">“${esc(it.note)}”</div>` : ""}
          <div class="cl-price num">${money(it.price * it.qty)}</div>
        </div>
        <div class="qty-stepper">
          <button data-dec="${i}" aria-label="Decrease quantity">−</button>
          <span class="qty num">${it.qty}</span>
          <button data-inc="${i}" aria-label="Increase quantity">+</button>
        </div>
      </div>`).join("");

    host.innerHTML = `
      <div class="drawer-overlay" data-close-drawer></div>
      <aside class="drawer" role="dialog" aria-label="Cart">
        <div class="drawer-head">
          <h2>Your cart ${r ? `<span class="store-name">from ${esc(r.name)}</span>` : ""}</h2>
          <button data-close-drawer aria-label="Close cart" style="font-size:18px;">✕</button>
        </div>
        <div class="drawer-body">
          ${state.cart.items.length ? lines : `<div class="drawer-empty"><div class="big">🛒</div>Your cart is empty.<br>Add something delicious!</div>`}
        </div>
        ${state.cart.items.length ? `
        <div class="drawer-foot">
          <div class="subtotal-row"><span>Subtotal</span><span class="num">${money(cartSubtotal())}</span></div>
          <button class="btn-primary center" data-checkout style="width:100%;">Go to checkout</button>
        </div>` : ""}
      </aside>
    `;
  }

  /* Item modal */
  function renderModal() {
    const host = $("#modal-root");
    if (!state.modalItem) { host.innerHTML = ""; return; }
    const { store: r, item } = state.modalItem;
    host.innerHTML = `
      <div class="overlay" data-close-modal>
        <div class="modal" role="dialog" aria-label="${esc(item.name)}" data-stop>
          <div class="modal-hero" style="background:${grad(r)}">
            <span aria-hidden="true">${item.emoji}</span>
            <button class="modal-close" data-close-modal aria-label="Close">✕</button>
          </div>
          <div class="modal-body">
            <h3>${esc(item.name)} ${item.popular ? '<span class="pop-tag">Popular</span>' : ""}</h3>
            <p class="m-desc">${esc(item.desc)}</p>
            <div class="m-price num">${money(item.price)}</div>
            <textarea class="modal-note" id="modal-note" placeholder="Special instructions (e.g. no onions)"></textarea>
          </div>
          <div class="modal-footer">
            <div class="qty-stepper">
              <button data-mqty="-1" ${state.modalQty <= 1 ? "disabled" : ""} aria-label="Decrease">−</button>
              <span class="qty num">${state.modalQty}</span>
              <button data-mqty="1" aria-label="Increase">+</button>
            </div>
            <button class="btn-primary" data-modal-add>
              <span>Add to cart</span><span class="num">${money(item.price * state.modalQty)}</span>
            </button>
          </div>
        </div>
      </div>
    `;
  }

  /* ── Event wiring ──────────────────────────────────────────── */
  function bindView() {
    document.querySelectorAll("[data-store]").forEach((el) =>
      el.addEventListener("click", () => go("store", el.dataset.store)));
    document.querySelectorAll("[data-cat]").forEach((el) =>
      el.addEventListener("click", () => { state.category = el.dataset.cat; render(); }));
    document.querySelectorAll("[data-sort]").forEach((el) =>
      el.addEventListener("click", () => { state.sort = el.dataset.sort; render(); }));
    document.querySelectorAll("[data-back]").forEach((el) =>
      el.addEventListener("click", () => go("home")));
    document.querySelectorAll("[data-view]").forEach((el) =>
      el.addEventListener("click", () => go(el.dataset.view)));
    document.querySelectorAll("[data-jump]").forEach((el) =>
      el.addEventListener("click", () => {
        const sec = document.getElementById(el.dataset.jump);
        if (sec) sec.scrollIntoView({ behavior: "smooth", block: "start" });
      }));
    document.querySelectorAll("[data-item]").forEach((el) =>
      el.addEventListener("click", () => {
        const r = store(state.storeId);
        const item = r && findMenuItem(r, el.dataset.item);
        if (!item) return;
        state.modalItem = { store: r, item };
        state.modalQty = 1;
        renderModal();
        bindModal();
      }));
    document.querySelectorAll("[data-goto-store]").forEach((el) =>
      el.addEventListener("click", () => go("store", el.dataset.gotoStore)));
    document.querySelectorAll("[data-tip]").forEach((el) =>
      el.addEventListener("click", () => { state.tipRate = parseFloat(el.dataset.tip); render(); }));
    const place = $("[data-place-order]");
    if (place) place.addEventListener("click", () => {
      placeOrder(($("#f-address") || {}).value, ($("#f-name") || {}).value);
    });
    document.querySelectorAll("[data-track]").forEach((el) =>
      el.addEventListener("click", () => {
        state.activeOrder = state.orders[parseInt(el.dataset.track, 10)];
        go("tracking");
      }));
    document.querySelectorAll("[data-reorder]").forEach((el) =>
      el.addEventListener("click", () => reorder(state.orders[parseInt(el.dataset.reorder, 10)])));
    bindDrawer();
    bindModal();
  }

  function bindDrawer() {
    document.querySelectorAll("[data-close-drawer]").forEach((el) =>
      el.addEventListener("click", () => { state.drawerOpen = false; renderDrawer(); }));
    document.querySelectorAll("[data-inc]").forEach((el) =>
      el.addEventListener("click", () => changeQty(parseInt(el.dataset.inc, 10), 1)));
    document.querySelectorAll("[data-dec]").forEach((el) =>
      el.addEventListener("click", () => changeQty(parseInt(el.dataset.dec, 10), -1)));
    const co = $("[data-checkout]");
    if (co) co.addEventListener("click", () => { state.drawerOpen = false; go("checkout"); });
  }

  function bindModal() {
    document.querySelectorAll("[data-close-modal]").forEach((el) =>
      el.addEventListener("click", (e) => {
        if (e.target === el) { state.modalItem = null; renderModal(); }
      }));
    const box = $("[data-stop]");
    if (box) box.addEventListener("click", (e) => e.stopPropagation());
    document.querySelectorAll("[data-mqty]").forEach((el) =>
      el.addEventListener("click", () => {
        state.modalQty = Math.max(1, state.modalQty + parseInt(el.dataset.mqty, 10));
        renderModal();
        bindModal();
      }));
    const add = $("[data-modal-add]");
    if (add) add.addEventListener("click", () => {
      const note = ($("#modal-note") || {}).value || "";
      const { store: r, item } = state.modalItem;
      if (addToCart(r, item, state.modalQty, note.trim())) {
        state.modalItem = null;
        render();
      }
    });
  }

  /* ── Header (static) wiring ────────────────────────────────── */
  function bindHeader() {
    $("#logo-btn").addEventListener("click", () => { state.category = "all"; state.query = ""; go("home"); });
    $("#cart-open").addEventListener("click", () => { state.drawerOpen = true; renderDrawer(); bindDrawer(); });
    $("#orders-link").addEventListener("click", () => go("orders"));
    $("#address-btn").addEventListener("click", () => {
      const next = window.prompt("Deliver to:", state.address);
      if (next && next.trim()) { state.address = next.trim(); render(); }
    });
    $("#search-input").addEventListener("input", (e) => {
      state.query = e.target.value;
      if (state.view !== "home") { state.view = "home"; }
      const root = $("#view");
      root.innerHTML = viewHome();
      bindView();
    });
    document.addEventListener("keydown", (e) => {
      if (e.key === "Escape") {
        if (state.modalItem) { state.modalItem = null; renderModal(); }
        else if (state.drawerOpen) { state.drawerOpen = false; renderDrawer(); }
      }
    });
  }

  /* ── Boot ──────────────────────────────────────────────────── */
  loadOrders();
  // Resume ticking any order that was mid-delivery when the page closed.
  const inFlight = state.orders.find((o) => o.status === "active");
  if (inFlight) { state.activeOrder = inFlight; startTracking(inFlight); }
  bindHeader();
  render();
})();

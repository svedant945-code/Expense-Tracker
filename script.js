"use strict";

/* ============================================================
   Expense Tracker — Application Logic (Backend API Version)
   ============================================================ */

/* ===== Configuration ===== */
const STORAGE_KEY = "expense-tracker-premium";
const API_BASE = window.EXPENSE_TRACKER_API_BASE || "http://localhost:3000/api/v1";

let authToken = null;
let isOnline = true;

const CATEGORY_ICONS = {
  Food: "fa-utensils",
  Shopping: "fa-bag-shopping",
  Bills: "fa-file-invoice",
  Salary: "fa-money-bill-wave",
  Transport: "fa-bus",
  Entertainment: "fa-film",
  Healthcare: "fa-heart-pulse",
  Education: "fa-book",
  Others: "fa-circle",
};

/* ===== DOM References ===== */
const $ = (sel, ctx = document) => ctx.querySelector(sel);
const $$ = (sel, ctx = document) => [...ctx.querySelectorAll(sel)];

const form = $("#transactionForm");
const nameInput = $("#nameInput");
const amountInput = $("#amountInput");
const categoryInput = $("#categoryInput");
const dateInput = $("#dateInput");
const nameError = $("#nameError");
const amountError = $("#amountError");

const balanceDisplay = $("#balanceDisplay");
const incomeDisplay = $("#incomeDisplay");
const expenseDisplay = $("#expenseDisplay");
const transactionList = $("#transactionList");
const transactionCount = $("#transactionCount");

const searchInput = $("#searchInput");
const filterType = $("#filterType");
const filterCategory = $("#filterCategory");
const filterPeriod = $("#filterPeriod");
const sortBy = $("#sortBy");

const themeToggle = $("#themeToggle");
const toastContainer = $("#toastContainer");
const confirmModal = $("#confirmModal");
const editModal = $("#editModal");
const editForm = $("#editForm");
const editName = $("#editName");
const editAmount = $("#editAmount");
const editCategory = $("#editCategory");
const editDate = $("#editDate");
const editNameError = $("#editNameError");
const editAmountError = $("#editAmountError");

const budgetFill = $("#budgetFill");
const budgetSpent = $("#budgetSpent");
const budgetLimit = $("#budgetLimit");
const budgetPercent = $("#budgetPercent");
const budgetLimitInput = $("#budgetLimitInput");
const budgetSetBtn = $("#budgetSetBtn");
const historyMonthSelect = $("#historyMonthSelect");
const historyError = $("#historyError");
const historySpent = $("#historySpent");
const historyBudgetLimit = $("#historyBudgetLimit");
const historyBudgetRemaining = $("#historyBudgetRemaining");
const historyRemainingLabel = $("#historyRemainingLabel");
const historyBudgetUsage = $("#historyBudgetUsage");
const historyComparison = $("#historyComparison");
const historyProgressTrack = $(".history-progress-track");
const historyProgressFill = $("#historyProgressFill");
const historyCategoryList = $("#historyCategoryList");
const historyEmpty = $("#historyEmpty");

const incomeEarned = $("#incomeEarned");
const incomeGoalDisplay = $("#incomeGoalDisplay");
const incomeGoalPercent = $("#incomeGoalPercent");
const incomeGoalFill = $("#incomeGoalFill");
const incomeGoalInput = $("#incomeGoalInput");
const incomeGoalSetBtn = $("#incomeGoalSetBtn");

const exportCSV = $("#exportCSV");
const exportPDF = $("#exportPDF");

/* ===== State ===== */
let transactions = [];
let categories = [];
let deleteTargetId = null;
let editTargetId = null;
let pieChartInstance = null;
let barChartInstance = null;

/* ===== API Helpers ===== */

async function apiRequest(endpoint, options = {}) {
  const headers = {
    "Content-Type": "application/json",
    ...options.headers,
  };

  const token = getAuthToken();
  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }

  const response = await fetch(`${API_BASE}${endpoint}`, {
    ...options,
    cache: "no-store",
    headers,
  });

  if (response.status === 401) {
    // Token expired, clear auth but DON'T reload - let calling code handle it
    authToken = null;
    localStorage.removeItem("auth_token");
    showToast("Session expired. Please log in.", "error");
    throw new Error("Unauthorized");
  }

  const data = await response.json().catch(() => ({}));

  if (!response.ok) {
    throw new Error(data.error || `HTTP ${response.status}`);
  }

  return data;
}

function getAuthToken() {
  return authToken || localStorage.getItem("auth_token");
}

function setAuthToken(token) {
  authToken = token;
  if (token) {
    localStorage.setItem("auth_token", token);
  } else {
    localStorage.removeItem("auth_token");
  }
}

/* ===== Authentication ===== */

async function checkAuth() {
  const token = getAuthToken();
  if (!token) return false;

  try {
    // Verify token by fetching user profile
    await apiRequest("/auth/me");
    authToken = token;
    return true;
  } catch {
    setAuthToken(null);
    // Redirect to login page
    window.location.href = 'auth.html';
    return false;
  }
}

async function login(email, password) {
  const data = await apiRequest("/auth/login", {
    method: "POST",
    body: JSON.stringify({ email, password }),
  });
  setAuthToken(data.token);
  return data.user;
}

async function register(email, password, name) {
  const data = await apiRequest("/auth/register", {
    method: "POST",
    body: JSON.stringify({ email, password, name }),
  });
  setAuthToken(data.token);
  return data.user;
}

function logout() {
  setAuthToken(null);
  transactions = [];
  refresh();
  showToast("Logged out successfully", "success");
}

/* ===== Data Loading ===== */

async function loadCategories() {
  try {
    categories = await apiRequest("/categories");
    populateCategorySelects();
  } catch (e) {
    console.warn("Failed to load categories:", e);
    // Fallback to hardcoded
    categories = [];
  }
}

function populateCategorySelects() {
  const expenseCategories = categories.filter(c => c.type === "EXPENSE");
  const incomeCategories = categories.filter(c => c.type === "INCOME");

  [categoryInput, editCategory, filterCategory].forEach(select => {
    if (!select) return;
    const isFilter = select === filterCategory;
    const firstOption = select.options[0];
    select.innerHTML = "";
    if (isFilter) {
      select.add(new Option("All Categories", "all"));
    }
    expenseCategories.forEach(c => select.add(new Option(c.name, c.id)));
    incomeCategories.forEach(c => select.add(new Option(c.name, c.id)));
  });
}

async function loadData() {
  try {
    const result = await apiRequest("/transactions?limit=100");
    transactions = result.data || result;
    return transactions;
  } catch (e) {
    console.warn("API load failed, falling back to localStorage:", e);
    // Fallback to localStorage
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      const parsed = stored ? JSON.parse(stored) : [];
      return Array.isArray(parsed) ? parsed : [];
    } catch (e) {
      console.warn("Load error:", e);
      return [];
    }
  }
}

async function saveData() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(transactions));
}

/* ===== CRUD: Add ===== */

async function addTransaction(event) {
  event.preventDefault();

  const name = nameInput.value.trim();
  const rawAmount = amountInput.value.trim();
  const categoryId = categoryInput.value;
  const typeEl = $('input[name="type"]:checked');
  const type = typeEl ? typeEl.value.toUpperCase() : "EXPENSE";
  let date = dateInput.value || todayStr();

  let valid = true;

  if (!name) {
    showError(nameError, "Please enter a name.");
    valid = false;
  } else {
    hideError(nameError);
  }

  if (!rawAmount) {
    showError(amountError, "Please enter an amount.");
    valid = false;
  } else {
    const parsed = parseFloat(rawAmount);
    if (isNaN(parsed) || parsed <= 0) {
      showError(amountError, "Amount must be a positive number.");
      valid = false;
    } else {
      hideError(amountError);
    }
  }

  if (!categoryId || categoryId === "all") {
    showToast("Please select a category", "error");
    return;
  }

  if (!valid) return;

  const amount = Math.abs(parseFloat(rawAmount));

  try {
    const newTransaction = await apiRequest("/transactions", {
      method: "POST",
      body: JSON.stringify({
        title: name,
        amount,
        type,
        categoryId,
        transactionDate: date,
      }),
    });

    transactions.unshift(newTransaction);
    saveData();
    refresh();
    showToast(`"${name}" added as ${type.toLowerCase()}`, "success");

    nameInput.value = "";
    amountInput.value = "";
    dateInput.value = todayStr();
    nameInput.focus();
  } catch (e) {
    showToast(e.message || "Failed to add transaction", "error");
  }
}

/* ===== CRUD: Delete ===== */

function requestDelete(id) {
  deleteTargetId = id;
  confirmModal.classList.add("open");
}

async function confirmDelete() {
  if (deleteTargetId === null) return;
  const item = transactions.find((t) => t.id === deleteTargetId);
  try {
    await apiRequest(`/transactions/${deleteTargetId}`, { method: "DELETE" });
    transactions = transactions.filter((t) => t.id !== deleteTargetId);
    deleteTargetId = null;
    saveData();
    refresh();
    closeConfirmModal();
    showToast(`"${item ? item.title : "Transaction"}" deleted`, "error");
  } catch (e) {
    showToast(e.message || "Failed to delete", "error");
  }
}

function closeConfirmModal() {
  confirmModal.classList.remove("open");
  deleteTargetId = null;
}

/* ===== CRUD: Edit ===== */

function requestEdit(id) {
  const t = transactions.find((tr) => tr.id === id);
  if (!t) return;
  editTargetId = id;
  editName.value = t.title;
  editAmount.value = t.amount;
  editCategory.value = t.categoryId;
  editDate.value = t.transactionDate.split("T")[0];
  const radio = $(`input[name="editType"][value="${t.type.toLowerCase()}"]`);
  if (radio) radio.checked = true;
  hideError(editNameError);
  hideError(editAmountError);
  editModal.classList.add("open");
}

async function saveEdit(event) {
  event.preventDefault();
  const name = editName.value.trim();
  const rawAmount = editAmount.value.trim();
  const categoryId = editCategory.value;
  const typeEl = $('input[name="editType"]:checked');
  const type = typeEl ? typeEl.value.toUpperCase() : "EXPENSE";
  const date = editDate.value;

  let valid = true;
  if (!name) { showError(editNameError, "Please enter a name."); valid = false; }
  else { hideError(editNameError); }

  if (!rawAmount) { showError(editAmountError, "Please enter an amount."); valid = false; }
  else {
    const parsed = parseFloat(rawAmount);
    if (isNaN(parsed) || parsed <= 0) { showError(editAmountError, "Positive number required."); valid = false; }
    else { hideError(editAmountError); }
  }
  if (!valid) return;

  const amount = Math.abs(parseFloat(rawAmount));

  try {
    const updated = await apiRequest(`/transactions/${editTargetId}`, {
      method: "PUT",
      body: JSON.stringify({ title: name, amount, categoryId, type, transactionDate: date }),
    });

    const idx = transactions.findIndex((t) => t.id === editTargetId);
    if (idx !== -1) {
      transactions[idx] = updated;
      saveData();
      refresh();
      closeEditModal();
      showToast(`"${name}" updated`, "success");
    }
  } catch (e) {
    showToast(e.message || "Failed to update", "error");
  }
}

function closeEditModal() {
  editModal.classList.remove("open");
  editTargetId = null;
}

/* ===== Budget ===== */

async function loadBudget() {
  try {
    const now = new Date();
    const month = now.getMonth() + 1;
    const year = now.getFullYear();
    const budget = await apiRequest(`/budgets/current?month=${month}&year=${year}`);
    if (budget) {
      budgetLimitInput.value = budget.limit || 50000;
      updateBudgetDisplay(budget);
    }
  } catch (e) {
    console.warn("Budget load failed:", e);
  }
}

async function updateBudgetLimit() {
  const val = parseFloat(budgetLimitInput.value);
  if (isNaN(val) || val <= 0) {
    showToast("Enter a valid budget limit.", "error");
    return;
  }
  try {
    const now = new Date();
    await apiRequest("/budgets", {
      method: "POST",
      body: JSON.stringify({ amount: val, month: now.getMonth() + 1, year: now.getFullYear() }),
    });
    showToast(`Monthly limit set to ${fmt(val)}`, "success");
    loadBudget();
    loadMonthlyHistory();
  } catch (e) {
    showToast(e.message || "Failed to set budget", "error");
  }
}

function updateBudgetDisplay(budget) {
  if (!budget) return;
  budgetSpent.textContent = fmt(budget.spent);
  budgetLimit.textContent = fmt(budget.limit);
  budgetPercent.textContent = `${budget.percent}%`;
  budgetFill.style.width = `${budget.percent}%`;
  budgetFill.classList.toggle("danger", budget.isOverBudget);
  budgetFill.setAttribute("aria-valuenow", budget.percent);
}

/* ===== Monthly Spending History ===== */

function monthKey(date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
}

function populateHistoryMonths() {
  const selectedMonth = historyMonthSelect.value;
  const now = new Date();
  historyMonthSelect.innerHTML = "";

  for (let offset = 0; offset < 12; offset++) {
    const date = new Date(now.getFullYear(), now.getMonth() - offset, 1);
    const option = document.createElement("option");
    option.value = monthKey(date);
    option.textContent = date.toLocaleString("default", { month: "long", year: "numeric" });
    historyMonthSelect.appendChild(option);
  }

  const previousMonth = monthKey(new Date(now.getFullYear(), now.getMonth() - 1, 1));
  historyMonthSelect.value = selectedMonth || previousMonth;
}

async function loadMonthlyHistory() {
  populateHistoryMonths();
  historyError.hidden = true;
  await renderMonthlyHistory();
}

function getHistoryComparison(selectedKey, spent, previousSpent) {
  const [year, month] = selectedKey.split("-").map(Number);
  const previousDate = new Date(year, month - 2, 1);
  const previousKey = monthKey(previousDate);
  const hasPreviousMonth = [...historyMonthSelect.options].some(option => option.value === previousKey);

  if (!hasPreviousMonth) return "No previous-month comparison available.";

  const previousLabel = previousDate.toLocaleString("default", { month: "long" });

  if (previousSpent === 0) {
    return spent === 0
      ? `No expenses this month or in ${previousLabel}.`
      : `No expenses were recorded in ${previousLabel}.`;
  }

  const change = Math.round(Math.abs((spent - previousSpent) / previousSpent) * 100);
  if (change === 0) return `Spending was about the same as ${previousLabel}.`;
  return `You spent ${change}% ${spent > previousSpent ? "more" : "less"} than ${previousLabel}.`;
}

function renderHistoryCategories(entries, totalSpent) {
  historyCategoryList.innerHTML = "";
  historyEmpty.hidden = entries.length > 0;
  if (entries.length === 0) return;

  const maxAmount = entries[0].amount;
  entries.forEach((entry, index) => {
    const share = totalSpent > 0 ? (entry.amount / totalSpent) * 100 : 0;
    const row = document.createElement("div");
    row.className = "history-category";

    const header = document.createElement("div");
    header.className = "history-category-header";

    const name = document.createElement("span");
    name.className = "history-category-name";
    name.textContent = entry.name;

    const marker = document.createElement("span");
    marker.className = "history-category-marker";
    if (entries.length === 1) {
      marker.textContent = "Only category";
    } else if (index === 0) {
      marker.textContent = "Most";
    } else if (index === entries.length - 1) {
      marker.textContent = "Least";
    }

    const amount = document.createElement("strong");
    amount.className = "history-category-amount";
    amount.textContent = fmt(entry.amount);

    const details = document.createElement("div");
    details.className = "history-category-details";
    details.append(name, marker, amount);

    const shareLabel = document.createElement("span");
    shareLabel.className = "history-category-share";
    shareLabel.textContent = `${share.toFixed(1)}% of spending`;

    const meter = document.createElement("div");
    meter.className = "history-category-track";
    const fill = document.createElement("div");
    fill.className = "history-category-fill";
    fill.style.width = `${maxAmount > 0 ? (entry.amount / maxAmount) * 100 : 0}%`;
    meter.appendChild(fill);

    header.append(details, shareLabel);
    row.append(header, meter);
    historyCategoryList.appendChild(row);
  });
}

async function renderMonthlyHistory() {
  const selectedKey = historyMonthSelect.value;
  if (!selectedKey) return;

  const [year, month] = selectedKey.split("-").map(Number);
  historyError.hidden = true;
  try {
    const history = await apiRequest(`/reports/monthly-history?month=${month}&year=${year}`);
    if (historyMonthSelect.value !== selectedKey) return;

    const totalSpent = Number(history.spent) || 0;
    const limit = history.budgetLimit === null ? null : Number(history.budgetLimit);
    const percent = limit > 0 ? (totalSpent / limit) * 100 : 0;

    historySpent.textContent = fmt(totalSpent);
    historyBudgetLimit.textContent = limit === null ? "Not set" : fmt(limit);
    historyRemainingLabel.textContent = limit !== null && totalSpent > limit ? "Over budget" : "Remaining";
    historyBudgetRemaining.textContent = limit === null
      ? "Not set"
      : fmt(Math.abs(limit - totalSpent));
    historyBudgetUsage.textContent = limit === null
      ? "No overall budget was set for this month."
      : `${percent.toFixed(1)}% of the budget used`;
    historyProgressFill.style.width = `${Math.min(percent, 100)}%`;
    historyProgressFill.classList.toggle("danger", percent > 100);
    historyProgressTrack.setAttribute("aria-valuenow", String(Math.min(Math.round(percent), 100)));
    historyComparison.textContent = getHistoryComparison(
      selectedKey,
      totalSpent,
      Number(history.previousSpent) || 0
    );

    const categories = (history.categories || [])
      .map(item => ({ name: item.name || "Other", amount: Number(item.amount) || 0 }))
      .sort((a, b) => b.amount - a.amount);
    renderHistoryCategories(categories, totalSpent);
    historyError.hidden = true;
  } catch (error) {
    console.error("Monthly history load failed:", error);
    historyError.textContent = "Could not load this month's budget history. Please try again.";
    historyError.hidden = false;
  }
}

/* ===== Income Goal ===== */

async function loadIncomeGoal() {
  try {
    const goal = await apiRequest("/income-goals/current");
    if (goal) {
      incomeGoalInput.value = goal.goal;
      updateIncomeGoalDisplay(goal);
    }
  } catch (e) {
    console.warn("Income goal load failed:", e);
  }
}

async function setIncomeGoal() {
  const val = parseFloat(incomeGoalInput.value);
  if (isNaN(val) || val <= 0) {
    showToast("Enter a valid income target.", "error");
    return;
  }
  try {
    const now = new Date();
    await apiRequest("/income-goals", {
      method: "POST",
      body: JSON.stringify({ amount: val, month: now.getMonth() + 1, year: now.getFullYear() }),
    });
    showToast(`Monthly income target set to ${fmt(val)}`, "success");
    loadIncomeGoal();
  } catch (e) {
    showToast(e.message || "Failed to set income goal", "error");
  }
}

function updateIncomeGoalDisplay(goal) {
  if (!goal) return;
  incomeEarned.textContent = fmt(goal.actual);
  incomeGoalDisplay.textContent = fmt(goal.goal);
  incomeGoalPercent.textContent = `${goal.progress}%`;
  incomeGoalFill.style.width = `${goal.progress}%`;
  incomeGoalFill.setAttribute("aria-valuenow", goal.progress);
}

/* ===== Theme ===== */

function initTheme() {
  const saved = localStorage.getItem("expense-tracker-theme") || "light";
  document.documentElement.setAttribute("data-theme", saved);
  const icon = themeToggle.querySelector("i");
  icon.className = saved === "dark" ? "fas fa-sun" : "fas fa-moon";
}

function toggleTheme() {
  const html = document.documentElement;
  const current = html.getAttribute("data-theme");
  const next = current === "dark" ? "light" : "dark";
  html.setAttribute("data-theme", next);
  localStorage.setItem("expense-tracker-theme", next);
  const icon = themeToggle.querySelector("i");
  icon.className = next === "dark" ? "fas fa-sun" : "fas fa-moon";
  showToast(next === "dark" ? "Dark mode enabled" : "Light mode enabled", "info");
}

/* ===== Toast Notifications ===== */

function showToast(message, type = "info", duration = 3000) {
  const icons = { success: "fa-check-circle", error: "fa-times-circle", info: "fa-info-circle" };
  const toast = document.createElement("div");
  toast.className = `toast toast--${type}`;
  toast.innerHTML = `<i class="fas ${icons[type] || icons.info}"></i><span>${message}</span>`;
  toastContainer.appendChild(toast);
  setTimeout(() => {
    toast.classList.add("toast-out");
    setTimeout(() => toast.remove(), 300);
  }, duration);
}

/* ===== Validation Helpers ===== */

function showError(el, msg) {
  el.textContent = msg;
  el.classList.add("show");
}

function hideError(el) {
  el.textContent = "";
  el.classList.remove("show");
}

/* ===== Currency Formatting ===== */

function fmt(num) {
  return `PKR ${Number(num).toLocaleString("en-IN")}`;
}

function fmtSigned(amount, type) {
  const prefix = type === "INCOME" ? "+" : "-";
  return `${prefix}${fmt(amount)}`;
}

/* ===== Date Helpers ===== */

function todayStr() {
  return new Date().toISOString().slice(0, 10);
}

function isToday(d) {
  return d === todayStr();
}

function isThisWeek(d) {
  const now = new Date();
  const date = new Date(d + "T00:00:00");
  const start = new Date(now);
  start.setDate(now.getDate() - now.getDay());
  start.setHours(0, 0, 0, 0);
  const end = new Date(start);
  end.setDate(start.getDate() + 6);
  end.setHours(23, 59, 59, 999);
  return date >= start && date <= end;
}

function isThisMonth(d) {
  const now = new Date();
  const date = new Date(d + "T00:00:00");
  return date.getMonth() === now.getMonth() && date.getFullYear() === now.getFullYear();
}

/* ===== Dashboard Update ===== */

function updateDashboard() {
  let totalIncome = 0;
  let totalExpense = 0;
  for (const t of transactions) {
    if (t.type === "INCOME") totalIncome += t.amount;
    else totalExpense += t.amount;
  }
  const balance = totalIncome - totalExpense;
  balanceDisplay.textContent = fmt(balance);
  incomeDisplay.textContent = fmt(totalIncome);
  expenseDisplay.textContent = fmt(totalExpense);
}

/* ===== Filter & Sort ===== */

function getFilteredTransactions() {
  const search = searchInput.value.toLowerCase().trim();
  const type = filterType.value;
  const cat = filterCategory.value;
  const period = filterPeriod.value;
  const sort = sortBy.value;

  let filtered = transactions.filter((t) => {
    if (type !== "all" && t.type !== type.toUpperCase()) return false;
    if (cat !== "all" && t.categoryId !== cat) return false;
    if (period === "today" && !isToday(t.transactionDate.split("T")[0])) return false;
    if (period === "week" && !isThisWeek(t.transactionDate.split("T")[0])) return false;
    if (period === "month" && !isThisMonth(t.transactionDate.split("T")[0])) return false;
    if (search && !t.title.toLowerCase().includes(search)) return false;
    return true;
  });

  const [field, dir] = sort.split("-");
  filtered.sort((a, b) => {
    let va, vb;
    if (field === "date") {
      va = a.transactionDate;
      vb = b.transactionDate;
    } else {
      va = a.amount;
      vb = b.amount;
    }
    if (va < vb) return dir === "asc" ? -1 : 1;
    if (va > vb) return dir === "asc" ? 1 : -1;
    return 0;
  });

  return filtered;
}

/* ===== Render Transactions ===== */

function renderTransactions() {
  const filtered = getFilteredTransactions();
  transactionList.innerHTML = "";

  if (filtered.length === 0) {
    const li = document.createElement("li");
    li.className = "empty-state";
    li.innerHTML = '<i class="fas fa-inbox"></i><p>No transactions found.</p>';
    transactionList.appendChild(li);
    transactionCount.textContent = "0 transactions";
    return;
  }

  for (const t of filtered) {
    const li = document.createElement("li");
    li.className = "transaction-item";
    li.dataset.id = t.id;

    const cat = categories.find(c => c.id === t.categoryId);
    const catIcon = cat?.icon || CATEGORY_ICONS[t.category?.name] || "fa-circle";
    const dt = t.transactionDate ? new Date(t.transactionDate).toLocaleDateString([], { dateStyle: "medium" }) : "";

    li.innerHTML = `
      <div class="transaction-category-icon ${t.type.toLowerCase()}"><i class="fas ${catIcon}"></i></div>
      <div class="transaction-info">
        <div class="transaction-name">${escHtml(t.title)}</div>
        <div class="transaction-meta">
          <span>${dt}</span>
          <span class="transaction-type-badge ${t.type.toLowerCase()}">${t.type}</span>
          <span>${cat ? escHtml(cat.name) : escHtml(t.categoryId)}</span>
        </div>
      </div>
      <span class="transaction-amount ${t.type.toLowerCase()}">${fmtSigned(t.amount, t.type)}</span>
      <div class="transaction-actions">
        <button class="btn-sm-icon" data-edit="${t.id}" aria-label="Edit ${t.title}"><i class="fas fa-pen"></i></button>
        <button class="btn-sm-icon danger" data-delete="${t.id}" aria-label="Delete ${t.title}"><i class="fas fa-trash"></i></button>
      </div>
    `;

    transactionList.appendChild(li);
  }

  transactionCount.textContent = `${filtered.length} transaction${filtered.length !== 1 ? "s" : ""}`;
}

function escHtml(str) {
  const div = document.createElement("div");
  div.textContent = str;
  return div.innerHTML;
}

/* ===== Charts ===== */

function buildCharts() {
  buildPieChart();
  buildBarChart();
}

function buildPieChart() {
  const canvas = $("#pieChart");
  const empty = $("#pieEmpty");
  const expenses = transactions.filter((t) => t.type === "EXPENSE");
  const grouped = {};
  for (const t of expenses) {
    const catName = categories.find(c => c.id === t.categoryId)?.name || t.categoryId;
    grouped[catName] = (grouped[catName] || 0) + t.amount;
  }
  const labels = Object.keys(grouped);
  const data = Object.values(grouped);

  if (labels.length === 0) {
    empty.style.display = "block";
    canvas.style.display = "none";
    return;
  }
  empty.style.display = "none";
  canvas.style.display = "block";

  if (pieChartInstance) pieChartInstance.destroy();

  const colors = [
    "#6366f1", "#f59e0b", "#ef4444", "#10b981", "#3b82f6",
    "#ec4899", "#8b5cf6", "#14b8a6", "#f97316",
  ];

  pieChartInstance = new Chart(canvas, {
    type: "pie",
    data: {
      labels,
      datasets: [{
        data,
        backgroundColor: colors.slice(0, labels.length),
        borderWidth: 0,
      }],
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: {
          position: "bottom",
          labels: { color: getComputedStyle(document.documentElement).getPropertyValue("--text").trim() || "#1e293b", font: { size: 11 }, boxWidth: 12, padding: 12 },
        },
      },
    },
  });
}

function buildBarChart() {
  const canvas = $("#barChart");
  const empty = $("#barEmpty");
  const now = new Date();
  const months = [];
  for (let i = 5; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
    const label = d.toLocaleString("default", { month: "short", year: "numeric" });
    months.push({ key, label });
  }

  const incomeData = [];
  const expenseData = [];
  let hasData = false;

  for (const m of months) {
    let inc = 0, exp = 0;
    for (const t of transactions) {
      const td = new Date(t.transactionDate);
      const key = `${td.getFullYear()}-${String(td.getMonth() + 1).padStart(2, "0")}`;
      if (key === m.key) {
        if (t.type === "INCOME") inc += t.amount;
        else exp += t.amount;
        if (t.amount > 0) hasData = true;
      }
    }
    incomeData.push(inc);
    expenseData.push(exp);
  }

  if (!hasData) {
    empty.style.display = "block";
    canvas.style.display = "none";
    return;
  }
  empty.style.display = "none";
  canvas.style.display = "block";

  if (barChartInstance) barChartInstance.destroy();

  const textColor = getComputedStyle(document.documentElement).getPropertyValue("--text").trim() || "#1e293b";

  barChartInstance = new Chart(canvas, {
    type: "bar",
    data: {
      labels: months.map((m) => m.label),
      datasets: [
        {
          label: "Income",
          data: incomeData,
          backgroundColor: "rgba(5, 150, 105, 0.7)",
          borderColor: "#059669",
          borderWidth: 1,
          borderRadius: 4,
        },
        {
          label: "Expense",
          data: expenseData,
          backgroundColor: "rgba(220, 38, 38, 0.7)",
          borderColor: "#dc2626",
          borderWidth: 1,
          borderRadius: 4,
        },
      ],
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: {
          position: "bottom",
          labels: { color: textColor, font: { size: 11 }, boxWidth: 12, padding: 12 },
        },
      },
      scales: {
        x: {
          ticks: { color: textColor, font: { size: 10 } },
          grid: { display: false },
        },
        y: {
          ticks: { color: textColor, font: { size: 10 } },
          grid: { color: "rgba(128,128,128,0.1)" },
        },
      },
    },
  });
}

/* ===== Export ===== */

function exportAsCSV() {
  if (transactions.length === 0) {
    showToast("No transactions to export.", "error");
    return;
  }
  const headers = ["Date", "Title", "Amount", "Type", "Category"];
  const rows = transactions.map((t) => {
    const cat = categories.find(c => c.id === t.categoryId);
    return [t.transactionDate.split("T")[0], t.title, t.amount, t.type, cat?.name || t.categoryId];
  });
  const csv = [headers.join(","), ...rows.map((r) => r.map((v) => `"${v}"`).join(","))].join("\n");
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const link = document.createElement("a");
  link.href = URL.createObjectURL(blob);
  link.download = `expenses_${todayStr()}.csv`;
  link.click();
  URL.revokeObjectURL(link.href);
  showToast("CSV exported successfully", "success");
}

function exportAsPDF() {
  if (transactions.length === 0) {
    showToast("No transactions to export.", "error");
    return;
  }
  if (typeof jspdf === "undefined" && typeof window.jspdf === "undefined") {
    showToast("PDF library not loaded. Check internet.", "error");
    return;
  }
  try {
    const { jsPDF } = window.jspdf;
    const doc = new jsPDF();
    doc.setFontSize(18);
    doc.text("Expense Tracker Report", 14, 22);
    doc.setFontSize(10);
    doc.text(`Generated: ${new Date().toLocaleDateString()}`, 14, 30);
    doc.line(14, 33, 196, 33);
    let y = 40;
    doc.setFontSize(9);
    doc.text("Date", 14, y);
    doc.text("Title", 40, y);
    doc.text("Amount", 100, y);
    doc.text("Type", 130, y);
    doc.text("Category", 150, y);
    y += 6;
    doc.line(14, y - 1, 196, y - 1);
    for (const t of transactions) {
      if (y > 270) {
        doc.addPage();
        y = 20;
      }
      const cat = categories.find(c => c.id === t.categoryId);
      doc.text(t.transactionDate.split("T")[0], 14, y);
      doc.text(t.title.substring(0, 20), 40, y);
      doc.text(`${t.type === "INCOME" ? "+" : "-"}PKR ${t.amount}`, 100, y);
      doc.text(t.type, 130, y);
      doc.text(cat?.name || t.categoryId, 150, y);
      y += 6;
    }
    doc.save(`expenses_${todayStr()}.pdf`);
    showToast("PDF exported successfully", "success");
  } catch (e) {
    showToast("PDF export failed: " + e.message, "error");
  }
}

/* ===== Refresh ===== */

function refresh() {
  updateDashboard();
  loadBudget();
  loadIncomeGoal();
  loadMonthlyHistory();
  renderTransactions();
  buildCharts();
}

/* ===== Event Delegation ===== */

transactionList.addEventListener("click", (e) => {
  const delBtn = e.target.closest("[data-delete]");
  const editBtn = e.target.closest("[data-edit]");
  if (delBtn) requestDelete(delBtn.dataset.delete);
  if (editBtn) requestEdit(editBtn.dataset.edit);
});

/* ===== Filter/Sort Events ===== */
searchInput.addEventListener("input", renderTransactions);
filterType.addEventListener("change", renderTransactions);
filterCategory.addEventListener("change", renderTransactions);
filterPeriod.addEventListener("change", renderTransactions);
sortBy.addEventListener("change", renderTransactions);

/* ===== Form Events ===== */
form.addEventListener("submit", addTransaction);
nameInput.addEventListener("input", () => hideError(nameError));
amountInput.addEventListener("input", () => hideError(amountError));

/* ===== Modal Events ===== */
$("[data-confirm-cancel]").addEventListener("click", closeConfirmModal);
$("[data-confirm-delete]").addEventListener("click", confirmDelete);
confirmModal.addEventListener("click", (e) => { if (e.target === confirmModal) closeConfirmModal(); });

$("[data-edit-close]").addEventListener("click", closeEditModal);
$("[data-edit-cancel]").addEventListener("click", closeEditModal);
editForm.addEventListener("submit", saveEdit);
editModal.addEventListener("click", (e) => { if (e.target === editModal) closeEditModal(); });

/* ===== Income Goal ===== */
incomeGoalSetBtn.addEventListener("click", setIncomeGoal);

/* ===== Budget ===== */
budgetSetBtn.addEventListener("click", updateBudgetLimit);
historyMonthSelect.addEventListener("change", renderMonthlyHistory);

/* ===== Export ===== */
exportCSV.addEventListener("click", exportAsCSV);
exportPDF.addEventListener("click", exportAsPDF);

/* ===== Theme ===== */
themeToggle.addEventListener("click", toggleTheme);

/* ===== Logout ===== */
const logoutBtn = $("#logoutBtn");
if (logoutBtn) {
  logoutBtn.addEventListener("click", logout);
}

function logout() {
  localStorage.removeItem("auth_token");
  authToken = null;
  transactions = [];
  showToast("Logged out successfully", "success");
  setTimeout(() => window.location.href = "auth.html", 1000);
}

/* ===== Keyboard: Escape to close modals ===== */
document.addEventListener("keydown", (e) => {
  if (e.key === "Escape") {
    if (confirmModal.classList.contains("open")) closeConfirmModal();
    if (editModal.classList.contains("open")) closeEditModal();
  }
});

/* ===== Chart theme update on toggle ===== */
themeToggle.addEventListener("click", function chartThemeRefresh() {
  setTimeout(buildCharts, 150);
});

/* ===== Initialisation ===== */
(async function init() {
  initTheme();
  dateInput.value = todayStr();
  
  // Check authentication (redirects to auth.html if not logged in)
  const isLoggedIn = await checkAuth();
  if (!isLoggedIn) return;
  
  await loadCategories();
  transactions = await loadData();
  refresh();
})();
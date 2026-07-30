"use strict";

/* ============================================================
   Expense Tracker — Application Logic
   ============================================================ */

/* ===== Configuration ===== */
const STORAGE_KEY = "expense-tracker-premium";
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
let deleteTargetId = null;
let editTargetId = null;
let pieChartInstance = null;
let barChartInstance = null;

/* ===== Local Storage ===== */

function loadData() {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    const parsed = stored ? JSON.parse(stored) : [];
    return Array.isArray(parsed) ? parsed : [];
  } catch (e) {
    console.warn("Load error:", e);
    return [];
  }
}

function saveData() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(transactions));
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
  const prefix = type === "income" ? "+" : "-";
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
    if (t.type === "income") totalIncome += t.amount;
    else totalExpense += t.amount;
  }
  const balance = totalIncome - totalExpense;
  balanceDisplay.textContent = fmt(balance);
  incomeDisplay.textContent = fmt(totalIncome);
  expenseDisplay.textContent = fmt(totalExpense);
}

/* ===== Budget Update ===== */

function updateBudget() {
  const now = new Date();
  const month = now.getMonth();
  const year = now.getFullYear();
  let monthlyExpense = 0;
  for (const t of transactions) {
    if (t.type === "expense") {
      const td = new Date(t.date + "T00:00:00");
      if (td.getMonth() === month && td.getFullYear() === year) {
        monthlyExpense += t.amount;
      }
    }
  }
  const limit = parseFloat(budgetLimitInput.value) || 50000;
  const percent = Math.min((monthlyExpense / limit) * 100, 100);
  budgetSpent.textContent = fmt(monthlyExpense);
  budgetLimit.textContent = fmt(limit);
  budgetPercent.textContent = `${Math.round(percent)}%`;
  budgetFill.style.width = `${percent}%`;
  budgetFill.classList.toggle("danger", percent > 80);
  budgetFill.setAttribute("aria-valuenow", Math.round(percent));
}

/* ===== Income Goal ===== */

const INCOME_GOAL_KEY = "expense-tracker-income-goal";

function loadIncomeGoal() {
  try {
    const val = localStorage.getItem(INCOME_GOAL_KEY);
    return val ? parseFloat(val) : 100000;
  } catch { return 100000; }
}

function saveIncomeGoal(val) {
  localStorage.setItem(INCOME_GOAL_KEY, String(val));
}

function updateIncomeGoal() {
  const now = new Date();
  const month = now.getMonth();
  const year = now.getFullYear();
  let monthlyIncome = 0;
  for (const t of transactions) {
    if (t.type === "income") {
      const td = new Date(t.date + "T00:00:00");
      if (td.getMonth() === month && td.getFullYear() === year) {
        monthlyIncome += t.amount;
      }
    }
  }
  const goal = loadIncomeGoal();
  incomeGoalInput.value = goal;
  const percent = Math.min((monthlyIncome / goal) * 100, 100);
  incomeEarned.textContent = fmt(monthlyIncome);
  incomeGoalDisplay.textContent = fmt(goal);
  incomeGoalPercent.textContent = `${Math.round(percent)}%`;
  incomeGoalFill.style.width = `${percent}%`;
  incomeGoalFill.setAttribute("aria-valuenow", Math.round(percent));
}

/* ===== Filter & Sort ===== */

function getFilteredTransactions() {
  const search = searchInput.value.toLowerCase().trim();
  const type = filterType.value;
  const cat = filterCategory.value;
  const period = filterPeriod.value;
  const sort = sortBy.value;

  let filtered = transactions.filter((t) => {
    if (type !== "all" && t.type !== type) return false;
    if (cat !== "all" && t.category !== cat) return false;
    if (period === "today" && !isToday(t.date)) return false;
    if (period === "week" && !isThisWeek(t.date)) return false;
    if (period === "month" && !isThisMonth(t.date)) return false;
    if (search && !t.name.toLowerCase().includes(search)) return false;
    return true;
  });

  const [field, dir] = sort.split("-");
  filtered.sort((a, b) => {
    let va, vb;
    if (field === "date") {
      va = a.date;
      vb = b.date;
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

    const catIcon = CATEGORY_ICONS[t.category] || "fa-circle";
    const dt = t.date ? new Date(t.date + "T00:00:00").toLocaleDateString([], { dateStyle: "medium" }) : "";

    li.innerHTML = `
      <div class="transaction-category-icon ${t.type}"><i class="fas ${catIcon}"></i></div>
      <div class="transaction-info">
        <div class="transaction-name">${escHtml(t.name)}</div>
        <div class="transaction-meta">
          <span>${dt}</span>
          <span class="transaction-type-badge ${t.type}">${t.type}</span>
          <span>${escHtml(t.category)}</span>
        </div>
      </div>
      <span class="transaction-amount ${t.type}">${fmtSigned(t.amount, t.type)}</span>
      <div class="transaction-actions">
        <button class="btn-sm-icon" data-edit="${t.id}" aria-label="Edit ${t.name}"><i class="fas fa-pen"></i></button>
        <button class="btn-sm-icon danger" data-delete="${t.id}" aria-label="Delete ${t.name}"><i class="fas fa-trash"></i></button>
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

/* ===== CRUD: Add ===== */

function addTransaction(event) {
  event.preventDefault();

  const name = nameInput.value.trim();
  const rawAmount = amountInput.value.trim();
  const category = categoryInput.value;
  const typeEl = $('input[name="type"]:checked');
  const type = typeEl ? typeEl.value : "expense";
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

  if (!valid) return;

  const amount = Math.abs(parseFloat(rawAmount));

  transactions.unshift({
    id: Date.now(),
    name,
    amount,
    category,
    type,
    date,
  });

  saveData();
  refresh();
  showToast(`"${name}" added as ${type}`, "success");

  nameInput.value = "";
  amountInput.value = "";
  dateInput.value = todayStr();
  nameInput.focus();
}

/* ===== CRUD: Delete ===== */

function requestDelete(id) {
  deleteTargetId = id;
  confirmModal.classList.add("open");
}

function confirmDelete() {
  if (deleteTargetId === null) return;
  const item = transactions.find((t) => t.id === deleteTargetId);
  transactions = transactions.filter((t) => t.id !== deleteTargetId);
  deleteTargetId = null;
  saveData();
  refresh();
  closeConfirmModal();
  showToast(`"${item ? item.name : "Transaction"}" deleted`, "error");
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
  editName.value = t.name;
  editAmount.value = t.amount;
  editCategory.value = t.category;
  editDate.value = t.date;
  const radio = $(`input[name="editType"][value="${t.type}"]`);
  if (radio) radio.checked = true;
  hideError(editNameError);
  hideError(editAmountError);
  editModal.classList.add("open");
}

function saveEdit(event) {
  event.preventDefault();
  const name = editName.value.trim();
  const rawAmount = editAmount.value.trim();
  const category = editCategory.value;
  const typeEl = $('input[name="editType"]:checked');
  const type = typeEl ? typeEl.value : "expense";
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

  const idx = transactions.findIndex((t) => t.id === editTargetId);
  if (idx !== -1) {
    transactions[idx] = { ...transactions[idx], name, amount, category, type, date };
    saveData();
    refresh();
    closeEditModal();
    showToast(`"${name}" updated`, "success");
  }
}

function closeEditModal() {
  editModal.classList.remove("open");
  editTargetId = null;
}

/* ===== Charts ===== */

function buildCharts() {
  buildPieChart();
  buildBarChart();
}

function buildPieChart() {
  const canvas = $("#pieChart");
  const empty = $("#pieEmpty");
  const expenses = transactions.filter((t) => t.type === "expense");
  const grouped = {};
  for (const t of expenses) {
    grouped[t.category] = (grouped[t.category] || 0) + t.amount;
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
      const td = new Date(t.date + "T00:00:00");
      const key = `${td.getFullYear()}-${String(td.getMonth() + 1).padStart(2, "0")}`;
      if (key === m.key) {
        if (t.type === "income") inc += t.amount;
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
  const headers = ["Name", "Amount", "Category", "Type", "Date"];
  const rows = transactions.map((t) => [t.name, t.amount, t.category, t.type, t.date]);
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
    doc.text("Name", 14, y);
    doc.text("Amount", 80, y);
    doc.text("Category", 120, y);
    doc.text("Date", 160, y);
    y += 6;
    doc.line(14, y - 1, 196, y - 1);
    for (const t of transactions) {
      if (y > 270) {
        doc.addPage();
        y = 20;
      }
      doc.text(t.name.substring(0, 20), 14, y);
      doc.text(`${t.type === "income" ? "+" : "-"}PKR ${t.amount}`, 80, y);
      doc.text(t.category, 120, y);
      doc.text(t.date, 160, y);
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
  updateIncomeGoal();
  updateBudget();
  renderTransactions();
  buildCharts();
}

/* ===== Event Delegation ===== */

transactionList.addEventListener("click", (e) => {
  const delBtn = e.target.closest("[data-delete]");
  const editBtn = e.target.closest("[data-edit]");
  if (delBtn) requestDelete(Number(delBtn.dataset.delete));
  if (editBtn) requestEdit(Number(editBtn.dataset.edit));
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
incomeGoalSetBtn.addEventListener("click", () => {
  const val = parseFloat(incomeGoalInput.value);
  if (isNaN(val) || val <= 0) {
    showToast("Enter a valid income target.", "error");
    return;
  }
  saveIncomeGoal(val);
  updateIncomeGoal();
  showToast(`Monthly income target set to ${fmt(val)}`, "success");
});

/* ===== Budget ===== */
budgetSetBtn.addEventListener("click", () => {
  const val = parseFloat(budgetLimitInput.value);
  if (isNaN(val) || val <= 0) {
    showToast("Enter a valid budget limit.", "error");
    return;
  }
  updateBudget();
  showToast(`Monthly limit set to ${fmt(val)}`, "success");
});

/* ===== Export ===== */
exportCSV.addEventListener("click", exportAsCSV);
exportPDF.addEventListener("click", exportAsPDF);

/* ===== Theme ===== */
themeToggle.addEventListener("click", toggleTheme);

/* ===== Keyboard: Enter on filter period ===== */
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
(function init() {
  initTheme();
  dateInput.value = todayStr();
  transactions = loadData();
  refresh();
})();

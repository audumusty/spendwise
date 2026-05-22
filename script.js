// Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyCRQ_g8mgwxR6_1daZKNvHnhT-1vtuhl14",
  authDomain: "wallet-tracker-989f2.firebaseapp.com",
  projectId: "wallet-tracker-989f2",
  storageBucket: "wallet-tracker-989f2.firebasestorage.app",
  messagingSenderId: "306699494431",
  appId: "1:306699494431:web:1002d28bebc2f45161a12a"
};

// Initialize Firebase
firebase.initializeApp(firebaseConfig);
const auth = firebase.auth();
const db = firebase.firestore();

// Global state
let transactions = [];
let spendingChart = null;
let addMoneyVisible = false;
let expenseVisible = false;
let currentUser = null;
let currentUserId = null;
let monthlyLimit = null;
let lastToastPercent = 0; // to avoid repeated toasts

// DOM elements
const authOverlay = document.getElementById('authOverlay');
const appContainer = document.getElementById('appContainer');
const verifyNotice = document.getElementById('verifyNotice');
const loginFormDiv = document.getElementById('loginForm');
const registerFormDiv = document.getElementById('registerForm');
const loginTab = document.getElementById('loginTabBtn');
const registerTab = document.getElementById('registerTabBtn');
const loginBtn = document.getElementById('loginBtn');
const registerBtn = document.getElementById('registerBtn');
const logoutBtn = document.getElementById('logoutBtn');
const resendVerifyBtn = document.getElementById('resendVerifyBtn');
const logoutFromVerifyBtn = document.getElementById('logoutFromVerifyBtn');
const userDisplay = document.getElementById('userDisplay');
const profileImage = document.getElementById('profileImage');
const profileUpload = document.getElementById('profileUpload');
const removeProfileBtn = document.getElementById('removeProfileBtn');

// App elements
const balanceSpan = document.getElementById('balanceAmount');
const dynamicPanelDiv = document.getElementById('dynamicPanel');
const showAddMoneyPanelBtn = document.getElementById('showAddMoneyPanel');
const showExpensePanelBtn = document.getElementById('showExpensePanel');
const toggleAddMoneyBtn = document.getElementById('toggleAddMoneyBtn');
const toggleExpenseBtn = document.getElementById('toggleExpenseBtn');
const addMoneySection = document.getElementById('addMoneySection');
const expenseSection = document.getElementById('expenseSection');
const addMoneyContainer = document.getElementById('addMoneyTableContainer');
const expenseContainer = document.getElementById('expenseTableContainer');
const addPeriodFilter = document.getElementById('addPeriodFilter');
const expensePeriodFilter = document.getElementById('expensePeriodFilter');
const addSearchInput = document.getElementById('addSearchInput');
const expenseSearchInput = document.getElementById('expenseSearchInput');
const chartWrapper = document.getElementById('chartWrapper');
const darkModeToggle = document.getElementById('darkModeToggle');
const clearAllDataBtn = document.getElementById('clearAllDataBtn');
const exportCsvBtn = document.getElementById('exportCsvBtn');

// Limit elements
const monthlyLimitInput = document.getElementById('monthlyLimitInput');
const setLimitBtn = document.getElementById('setLimitBtn');
const spendingProgressBar = document.getElementById('spendingProgressBar');
const currentMonthSpendingSpan = document.getElementById('currentMonthSpending');
const limitStatusSpan = document.getElementById('limitStatus');

// Edit modal
const editModal = document.getElementById('editModal');
const closeModal = document.querySelector('.close-modal');
const saveEditBtn = document.getElementById('saveEditBtn');
const cancelEditBtn = document.getElementById('cancelEditBtn');
const editType = document.getElementById('editType');
const editDesc = document.getElementById('editDesc');
const editAmount = document.getElementById('editAmount');
const editCategory = document.getElementById('editCategory');
const editCategoryGroup = document.getElementById('editCategoryGroup');
let currentEditId = null;

// Helper functions
function formatNaira(amount) {
  return '₦' + amount.toLocaleString('en-NG', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}
function getCurrentTimestamp() { return new Date().toISOString(); }
function escapeHtml(str) { if (!str) return ''; return str.replace(/[&<>]/g, m => ({'&':'&amp;','<':'&lt;','>':'&gt;'}[m])); }

// Toast notification
function showToast(message, type = 'info') {
  const toast = document.createElement('div');
  toast.className = `toast ${type}`;
  toast.innerText = message;
  document.body.appendChild(toast);
  setTimeout(() => {
    toast.remove();
  }, 3000);
}

// Date filters
function isSameWeek(dateStr) {
  const now = new Date();
  const d = new Date(dateStr);
  const startOfWeek = new Date(now.setDate(now.getDate() - now.getDay()));
  startOfWeek.setHours(0,0,0,0);
  const endOfWeek = new Date(startOfWeek);
  endOfWeek.setDate(startOfWeek.getDate() + 6);
  endOfWeek.setHours(23,59,59,999);
  return d >= startOfWeek && d <= endOfWeek;
}
function isSameMonth(dateStr) {
  const d = new Date(dateStr);
  const now = new Date();
  return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
}
function filterByPeriod(timestamp, period) {
  if (period === 'all') return true;
  if (period === 'week') return isSameWeek(timestamp);
  if (period === 'month') return isSameMonth(timestamp);
  return true;
}

// ========== FIREBASE DATA OPERATIONS ==========
async function loadUserData() {
  if (!currentUserId) return;
  const userDoc = await db.collection('users').doc(currentUserId).get();
  if (userDoc.exists) {
    const data = userDoc.data();
    transactions = data.transactions || [];
    monthlyLimit = data.monthlyLimit || null;
    if (monthlyLimit) monthlyLimitInput.value = monthlyLimit;
    else monthlyLimitInput.value = '';
    const profilePic = data.profilePic || null;
    if (profilePic) {
      currentUser.photoURL = profilePic;
      profileImage.src = profilePic;
    } else {
      const initials = currentUser.displayName ? currentUser.displayName.charAt(0).toUpperCase() : 'U';
      profileImage.src = `https://ui-avatars.com/api/?name=${initials}&background=1c6e5e&color=fff&rounded=true&size=180&bold=true&t=${Date.now()}`;
    }
  } else {
    transactions = [];
  }
  updateBalanceDisplay();
  updateMonthlySpending();
  if (addMoneyVisible) renderAddMoneyTable();
  if (expenseVisible) { renderExpenseTable(); if (spendingChart) updateChart(); }
}

async function saveUserData() {
  if (!currentUserId) return;
  await db.collection('users').doc(currentUserId).set({
    transactions: transactions,
    monthlyLimit: monthlyLimit,
    profilePic: currentUser.photoURL || null,
    updatedAt: firebase.firestore.FieldValue.serverTimestamp()
  }, { merge: true });
}

async function saveProfilePicture(base64) {
  if (!currentUserId) return;
  currentUser.photoURL = base64;
  await db.collection('users').doc(currentUserId).set({
    profilePic: base64
  }, { merge: true });
  profileImage.src = base64;
}

async function removeProfilePictureFromFirestore() {
  if (!currentUserId) return;
  currentUser.photoURL = null;
  await db.collection('users').doc(currentUserId).set({
    profilePic: null
  }, { merge: true });
  const initials = currentUser.displayName ? currentUser.displayName.charAt(0).toUpperCase() : 'U';
  profileImage.src = `https://ui-avatars.com/api/?name=${initials}&background=1c6e5e&color=fff&rounded=true&size=180&bold=true&t=${Date.now()}`;
}

// ========== MONTHLY SPENDING LIMIT WITH TOASTS ==========
function getCurrentMonthExpenses() {
  const now = new Date();
  const currentMonth = now.getMonth();
  const currentYear = now.getFullYear();
  return transactions
    .filter(t => {
      if (t.type !== 'expense') return false;
      const d = new Date(t.timestamp);
      return d.getMonth() === currentMonth && d.getFullYear() === currentYear;
    })
    .reduce((sum, t) => sum + t.amount, 0);
}

function updateMonthlySpending() {
  currentMonthSpending = getCurrentMonthExpenses();
  currentMonthSpendingSpan.innerText = formatNaira(currentMonthSpending);
  if (monthlyLimit && monthlyLimit > 0) {
    const percent = Math.min(100, (currentMonthSpending / monthlyLimit) * 100);
    spendingProgressBar.style.width = percent + '%';
    if (percent >= 100) {
      spendingProgressBar.classList.add('danger');
      spendingProgressBar.classList.remove('warning');
      limitStatusSpan.innerText = '⚠️ Limit exceeded!';
      limitStatusSpan.style.color = '#ef4444';
      if (lastToastPercent !== 100) {
        showToast(`⚠️ You have exceeded your monthly limit of ${formatNaira(monthlyLimit)}!`, 'danger');
        lastToastPercent = 100;
      }
    } else if (percent >= 80) {
      spendingProgressBar.classList.add('warning');
      spendingProgressBar.classList.remove('danger');
      limitStatusSpan.innerText = '⚠️ Getting close to limit';
      limitStatusSpan.style.color = '#f59e0b';
      if (lastToastPercent < 80) {
        showToast(`⚠️ You have used ${percent.toFixed(0)}% of your monthly limit (${formatNaira(monthlyLimit)}).`, 'warning');
        lastToastPercent = 80;
      }
    } else {
      spendingProgressBar.classList.remove('warning', 'danger');
      limitStatusSpan.innerText = `${percent.toFixed(1)}% used`;
      limitStatusSpan.style.color = 'var(--text-color)';
      if (percent < 80) lastToastPercent = 0;
    }
  } else {
    spendingProgressBar.style.width = '0%';
    limitStatusSpan.innerText = 'No limit set';
    limitStatusSpan.style.color = 'var(--text-color)';
    lastToastPercent = 0;
  }
}

async function setMonthlyLimit() {
  let value = parseFloat(monthlyLimitInput.value);
  if (isNaN(value) || value <= 0) {
    monthlyLimit = null;
    monthlyLimitInput.value = '';
    showToast(`Monthly limit removed.`, 'info');
  } else {
    monthlyLimit = value;
    showToast(`Monthly spending limit set to ${formatNaira(monthlyLimit)}`, 'success');
  }
  await saveUserData();
  updateMonthlySpending();
}

// ========== EXPORT CSV ==========
function exportToCSV() {
  if (transactions.length === 0) {
    alert("No transactions to export.");
    return;
  }
  const headers = ["Type", "Description", "Category", "Amount (₦)", "Timestamp"];
  const rows = transactions.map(t => {
    const type = t.type === 'add' ? 'Add Money' : 'Expense';
    const category = t.type === 'expense' ? (t.category || 'Other') : '';
    const amount = t.amount.toFixed(2);
    const timestamp = new Date(t.timestamp).toLocaleString();
    return [type, t.desc, category, amount, timestamp];
  });
  const csvContent = [headers, ...rows].map(row => row.map(cell => `"${cell}"`).join(",")).join("\n");
  const blob = new Blob(["\uFEFF" + csvContent], { type: "text/csv;charset=utf-8;" });
  const link = document.createElement("a");
  const url = URL.createObjectURL(blob);
  link.href = url;
  link.setAttribute("download", `spendwise_export_${new Date().toISOString().slice(0,19)}.csv`);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

// ========== IMAGE COMPRESSION ==========
function compressImage(file, maxSizeKB = 300, callback) {
  const reader = new FileReader();
  reader.readAsDataURL(file);
  reader.onload = function(e) {
    const img = new Image();
    img.src = e.target.result;
    img.onload = function() {
      const canvas = document.createElement('canvas');
      let width = img.width;
      let height = img.height;
      const maxDimension = 400;
      if (width > height && width > maxDimension) {
        height = (height * maxDimension) / width;
        width = maxDimension;
      } else if (height > maxDimension) {
        width = (width * maxDimension) / height;
        height = maxDimension;
      }
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext('2d');
      ctx.drawImage(img, 0, 0, width, height);
      let quality = 0.8;
      let base64 = canvas.toDataURL('image/jpeg', quality);
      while (base64.length > maxSizeKB * 1024 && quality > 0.2) {
        quality -= 0.1;
        base64 = canvas.toDataURL('image/jpeg', quality);
      }
      callback(base64);
    };
  };
}

// ========== UI RENDER FUNCTIONS ==========
function calculateBalance() {
  let bal = 0;
  transactions.forEach(t => { if (t.type === 'add') bal += t.amount; else bal -= t.amount; });
  return bal;
}
function updateBalanceDisplay() {
  balanceSpan.innerText = formatNaira(calculateBalance());
}

function renderAddMoneyTable() {
  const period = addPeriodFilter.value;
  const search = addSearchInput.value.toLowerCase();
  let filtered = transactions.filter(t => t.type === 'add' && filterByPeriod(t.timestamp, period));
  if (search) filtered = filtered.filter(t => t.desc.toLowerCase().includes(search));
  const sorted = [...filtered].reverse();
  if (sorted.length === 0) {
    addMoneyContainer.innerHTML = '<div class="empty-table-msg">No add money transactions for this period/search.</div>';
    return;
  }
  let html = `<div class="transaction-table-wrapper"><table class="transaction-table"><thead><tr><th>Description</th><th>Timestamp</th><th>Amount</th><th>Actions</th></td></thead><tbody>`;
  sorted.forEach(t => {
    html += `<tr data-id="${t.id}">
      <td class="transaction-desc">${escapeHtml(t.desc)}</td>
      <td class="transaction-timestamp"><i class="far fa-calendar-alt"></i> ${escapeHtml(new Date(t.timestamp).toLocaleString())}</td>
      <td class="transaction-amount income-amount">${formatNaira(t.amount)}</td>
      <td><button class="edit-trans" data-id="${t.id}"><i class="fas fa-edit"></i></button> <button class="delete-trans" data-id="${t.id}"><i class="fas fa-trash-alt"></i></button></td>
    </tr>`;
  });
  html += `</tbody></table></div>`;
  addMoneyContainer.innerHTML = html;
}

function renderExpenseTable() {
  const period = expensePeriodFilter.value;
  const search = expenseSearchInput.value.toLowerCase();
  let filtered = transactions.filter(t => t.type === 'expense' && filterByPeriod(t.timestamp, period));
  if (search) filtered = filtered.filter(t => t.desc.toLowerCase().includes(search) || (t.category || '').toLowerCase().includes(search));
  const sorted = [...filtered].reverse();
  if (sorted.length === 0) {
    expenseContainer.innerHTML = '<div class="empty-table-msg">No expense transactions for this period/search.</div>';
    return;
  }
  let html = `<div class="transaction-table-wrapper"><table class="transaction-table"><thead><tr><th>Category</th><th>Description</th><th>Timestamp</th><th>Amount</th><th>Actions</th></td></thead><tbody>`;
  sorted.forEach(t => {
    html += `<tr data-id="${t.id}">
      <td><span class="category-badge">${escapeHtml(t.category)}</span></td>
      <td class="transaction-desc">${escapeHtml(t.desc)}</td>
      <td class="transaction-timestamp"><i class="far fa-calendar-alt"></i> ${escapeHtml(new Date(t.timestamp).toLocaleString())}</td>
      <td class="transaction-amount expense-amount">${formatNaira(t.amount)}</td>
      <td><button class="edit-trans" data-id="${t.id}"><i class="fas fa-edit"></i></button> <button class="delete-trans" data-id="${t.id}"><i class="fas fa-trash-alt"></i></button></td>
    </tr>`;
  });
  html += `</tbody></table></div>`;
  expenseContainer.innerHTML = html;
}

function updateChart() {
  if (!spendingChart || !expenseVisible) return;
  const period = expensePeriodFilter.value;
  const filtered = transactions.filter(t => t.type === 'expense' && filterByPeriod(t.timestamp, period));
  const map = new Map();
  filtered.forEach(t => { map.set(t.category || 'Other', (map.get(t.category)||0) + t.amount); });
  spendingChart.data.labels = Array.from(map.keys());
  spendingChart.data.datasets[0].data = Array.from(map.values());
  spendingChart.update();
}
function initChart() {
  if (!expenseVisible) return;
  const ctx = document.getElementById('spendingChart').getContext('2d');
  if (spendingChart) spendingChart.destroy();
  spendingChart = new Chart(ctx, {
    type: 'doughnut',
    data: { labels: [], datasets: [{ data: [], backgroundColor: ['#10b981','#f59e0b','#3b82f6','#ef4444','#8b5cf6','#ec489a','#06b6d4'], borderWidth: 0 }] },
    options: { responsive: true, maintainAspectRatio: true, plugins: { legend: { position: 'bottom' } } }
  });
  updateChart();
}

function toggleAddMoney() {
  addMoneyVisible = !addMoneyVisible;
  addMoneySection.style.display = addMoneyVisible ? 'block' : 'none';
  toggleAddMoneyBtn.innerHTML = addMoneyVisible ? '<i class="fas fa-eye-slash"></i> Hide Add Money' : '<i class="fas fa-eye"></i> Show Add Money';
  if (addMoneyVisible) renderAddMoneyTable();
}
function toggleExpense() {
  expenseVisible = !expenseVisible;
  expenseSection.style.display = expenseVisible ? 'block' : 'none';
  toggleExpenseBtn.innerHTML = expenseVisible ? '<i class="fas fa-eye-slash"></i> Hide Expenses' : '<i class="fas fa-eye"></i> Show Expenses';
  if (expenseVisible) {
    chartWrapper.style.display = 'block';
    renderExpenseTable();
    initChart();
  } else {
    chartWrapper.style.display = 'none';
    if (spendingChart) { spendingChart.destroy(); spendingChart = null; }
  }
}
function onExpenseFilterChange() {
  if (expenseVisible) { renderExpenseTable(); if (spendingChart) updateChart(); }
}

// ========== CRUD OPERATIONS ==========
async function addMoney(amount, desc) {
  if (isNaN(amount) || amount <= 0) { alert("💰 Please enter a positive amount."); return false; }
  if (!desc.trim()) { alert("📝 Description required."); return false; }
  const newTransaction = {
    id: Date.now(),
    type: 'add',
    amount: parseFloat(amount),
    desc: desc.trim(),
    category: null,
    timestamp: getCurrentTimestamp()
  };
  transactions.push(newTransaction);
  await saveUserData();
  if (addMoneyVisible) renderAddMoneyTable();
  updateBalanceDisplay();
  return true;
}
async function addExpense(amount, desc, category) {
  if (isNaN(amount) || amount <= 0) { alert("💸 Please enter a positive amount."); return false; }
  if (!desc.trim()) { alert("📝 Description required."); return false; }
  const bal = calculateBalance();
  if (bal < amount) { alert(`❌ Insufficient balance! You have ${formatNaira(bal)} but expense is ${formatNaira(amount)}.`); return false; }
  const newTransaction = {
    id: Date.now(),
    type: 'expense',
    amount: parseFloat(amount),
    desc: desc.trim(),
    category: category || 'Other',
    timestamp: getCurrentTimestamp()
  };
  transactions.push(newTransaction);
  await saveUserData();
  if (expenseVisible) { renderExpenseTable(); if (spendingChart) updateChart(); }
  updateBalanceDisplay();
  updateMonthlySpending(); // triggers toast if needed
  return true;
}
async function deleteTransaction(id) {
  const transactionToDelete = transactions.find(t => t.id === id);
  if (!transactionToDelete) return;
  if (transactionToDelete.type === 'add') {
    let tempBalance = calculateBalance() - transactionToDelete.amount;
    if (tempBalance < 0) {
      alert(`❌ Cannot delete this "Add Money" transaction because your current balance would become negative (${formatNaira(tempBalance)}).`);
      return;
    }
  }
  transactions = transactions.filter(t => t.id !== id);
  await saveUserData();
  if (addMoneyVisible) renderAddMoneyTable();
  if (expenseVisible) { renderExpenseTable(); if (spendingChart) updateChart(); }
  updateBalanceDisplay();
  updateMonthlySpending();
}
async function editTransaction(id, newType, newDesc, newAmount, newCategory) {
  const index = transactions.findIndex(t => t.id === id);
  if (index === -1) return false;
  const old = transactions[index];
  if (newType === 'expense') {
    let tempBalance = calculateBalance();
    if (old.type === 'expense') tempBalance += old.amount;
    else tempBalance -= old.amount;
    if (tempBalance - newAmount < 0) { alert(`❌ After edit, balance would be negative.`); return false; }
  }
  transactions[index] = { ...old, type: newType, desc: newDesc.trim(), amount: parseFloat(newAmount), category: newType === 'expense' ? newCategory : null, timestamp: getCurrentTimestamp() };
  await saveUserData();
  if (addMoneyVisible) renderAddMoneyTable();
  if (expenseVisible) { renderExpenseTable(); if (spendingChart) updateChart(); }
  updateBalanceDisplay();
  updateMonthlySpending();
  return true;
}
async function clearAllData() {
  if (confirm("⚠️ Delete ALL transactions? This will reset your balance to ₦0. This cannot be undone.")) {
    transactions = [];
    await saveUserData();
    if (addMoneyVisible) renderAddMoneyTable();
    if (expenseVisible) { renderExpenseTable(); if (spendingChart) updateChart(); }
    updateBalanceDisplay();
    updateMonthlySpending();
  }
}

// ========== EDIT MODAL ==========
function openEditModal(id) {
  const t = transactions.find(t => t.id === id);
  if (!t) return;
  currentEditId = id;
  editType.value = t.type;
  editDesc.value = t.desc;
  editAmount.value = t.amount;
  editCategoryGroup.style.display = t.type === 'expense' ? 'block' : 'none';
  if (t.type === 'expense') editCategory.value = t.category || 'Other';
  editModal.style.display = 'flex';
}
function closeEditModal() { editModal.style.display = 'none'; currentEditId = null; }
function saveEdit() {
  if (!currentEditId) return;
  const newType = editType.value;
  const newDesc = editDesc.value;
  const newAmount = parseFloat(editAmount.value);
  if (isNaN(newAmount) || newAmount <= 0) { alert("Amount must be positive."); return; }
  if (!newDesc.trim()) { alert("Description required."); return; }
  const newCategory = editCategory.value;
  editTransaction(currentEditId, newType, newDesc, newAmount, newCategory).then(() => closeEditModal());
}

// ========== UI PANELS ==========
function showAddMoneyPanelUI() {
  dynamicPanelDiv.innerHTML = `<button class="close-panel" id="closePanel"><i class="fas fa-times"></i></button>
    <div class="panel-title"><i class="fas fa-plus-circle"></i> Add money (₦)</div>
    <div class="form-group">
      <input type="number" id="moneyAmount" placeholder="Amount (₦)" step="any" min="0" oninput="this.value = Math.abs(this.value)" style="appearance: textfield; -moz-appearance: textfield;">
      <input type="text" id="moneyDesc" placeholder="Description">
      <button id="submitAddMoney">Add Money</button>
    </div>`;
  document.getElementById('closePanel').onclick = () => dynamicPanelDiv.innerHTML = '';
  document.getElementById('submitAddMoney').onclick = () => {
    let amt = parseFloat(document.getElementById('moneyAmount').value);
    if (isNaN(amt)) amt = 0;
    if (amt < 0) amt = Math.abs(amt);
    const desc = document.getElementById('moneyDesc').value;
    addMoney(amt, desc).then(() => dynamicPanelDiv.innerHTML = '');
  };
}
function showExpensePanelUI() {
  dynamicPanelDiv.innerHTML = `<button class="close-panel" id="closePanel"><i class="fas fa-times"></i></button>
    <div class="panel-title"><i class="fas fa-shopping-cart"></i> Add expense (₦)</div>
    <div class="form-group">
      <input type="number" id="expenseAmount" placeholder="Amount (₦)" step="any" min="0" oninput="this.value = Math.abs(this.value)" style="appearance: textfield; -moz-appearance: textfield;">
      <input type="text" id="expenseDesc" placeholder="Description">
      <select id="expenseCategory">${['Food','Transport','Entertainment','Shopping','Bills','Other'].map(c => `<option value="${c}">${c}</option>`).join('')}</select>
      <button id="submitExpense">Add Expense</button>
    </div>`;
  document.getElementById('closePanel').onclick = () => dynamicPanelDiv.innerHTML = '';
  document.getElementById('submitExpense').onclick = () => {
    let amt = parseFloat(document.getElementById('expenseAmount').value);
    if (isNaN(amt)) amt = 0;
    if (amt < 0) amt = Math.abs(amt);
    const desc = document.getElementById('expenseDesc').value;
    const cat = document.getElementById('expenseCategory').value;
    addExpense(amt, desc, cat).then(() => dynamicPanelDiv.innerHTML = '');
  };
}

function setupDelegation() {
  addMoneyContainer.addEventListener('click', (e) => {
    const del = e.target.closest('.delete-trans');
    const edit = e.target.closest('.edit-trans');
    if (del) deleteTransaction(parseInt(del.dataset.id));
    if (edit) openEditModal(parseInt(edit.dataset.id));
  });
  expenseContainer.addEventListener('click', (e) => {
    const del = e.target.closest('.delete-trans');
    const edit = e.target.closest('.edit-trans');
    if (del) deleteTransaction(parseInt(del.dataset.id));
    if (edit) openEditModal(parseInt(edit.dataset.id));
  });
}

// ========== DARK MODE ==========
function initDarkMode() {
  const saved = localStorage.getItem('darkMode');
  if (saved === 'enabled') document.body.classList.add('dark');
  darkModeToggle.innerHTML = document.body.classList.contains('dark') ? '<i class="fas fa-sun"></i>' : '<i class="fas fa-moon"></i>';
}
function toggleDarkMode() {
  document.body.classList.toggle('dark');
  const isDark = document.body.classList.contains('dark');
  localStorage.setItem('darkMode', isDark ? 'enabled' : 'disabled');
  darkModeToggle.innerHTML = isDark ? '<i class="fas fa-sun"></i>' : '<i class="fas fa-moon"></i>';
}

// ========== PROFILE PICTURE ==========
function handleProfileUpload(event) {
  const file = event.target.files[0];
  if (!file) return;
  if (!file.type.startsWith('image/')) {
    alert("Please upload an image file.");
    profileUpload.value = '';
    return;
  }
  compressImage(file, 300, async (compressedBase64) => {
    await saveProfilePicture(compressedBase64);
    profileUpload.value = '';
  });
}
function removeProfilePicture() {
  if (confirm("Remove your profile picture?")) {
    removeProfilePictureFromFirestore();
    profileUpload.value = '';
  }
}

// ========== AUTH UI ==========
function switchTab(showLogin) {
  if (showLogin) {
    loginFormDiv.style.display = 'block';
    registerFormDiv.style.display = 'none';
    loginTab.classList.add('active');
    registerTab.classList.remove('active');
  } else {
    loginFormDiv.style.display = 'none';
    registerFormDiv.style.display = 'block';
    registerTab.classList.add('active');
    loginTab.classList.remove('active');
  }
}
async function handleLogin() {
  const email = document.getElementById('loginEmail').value.trim();
  const password = document.getElementById('loginPassword').value;
  if (!email || !password) { alert("Please fill all fields."); return; }
  try {
    const userCredential = await auth.signInWithEmailAndPassword(email, password);
    const user = userCredential.user;
    if (!user.emailVerified) {
      authOverlay.style.display = 'none';
      verifyNotice.style.display = 'flex';
      currentUser = user;
      currentUserId = user.uid;
      return;
    }
    currentUser = user;
    currentUserId = user.uid;
    userDisplay.innerText = currentUser.displayName || email.split('@')[0];
    await loadUserData();
    authOverlay.style.display = 'none';
    appContainer.style.display = 'block';
    verifyNotice.style.display = 'none';
    addMoneyVisible = false; expenseVisible = false;
    addMoneySection.style.display = 'none';
    expenseSection.style.display = 'none';
    chartWrapper.style.display = 'none';
    toggleAddMoneyBtn.innerHTML = '<i class="fas fa-eye"></i> Show Add Money';
    toggleExpenseBtn.innerHTML = '<i class="fas fa-eye"></i> Show Expenses';
    if (spendingChart) { spendingChart.destroy(); spendingChart = null; }
    dynamicPanelDiv.innerHTML = '';
  } catch(error) {
    alert("Login failed: " + error.message);
  }
}
async function handleRegister() {
  const fullName = document.getElementById('regFullName').value.trim();
  const email = document.getElementById('regEmail').value.trim();
  const password = document.getElementById('regPassword').value;
  const confirm = document.getElementById('regConfirmPassword').value;
  if (!fullName || !email || !password || !confirm) { alert("Please fill all fields."); return; }
  if (password !== confirm) { alert("Passwords do not match."); return; }
  try {
    const userCredential = await auth.createUserWithEmailAndPassword(email, password);
    await userCredential.user.updateProfile({ displayName: fullName });
    await userCredential.user.sendEmailVerification();
    await db.collection('users').doc(userCredential.user.uid).set({
      fullName: fullName,
      email: email,
      transactions: [],
      profilePic: null,
      monthlyLimit: null,
      createdAt: firebase.firestore.FieldValue.serverTimestamp()
    });
    await auth.signOut();
    alert("Registration successful! A verification email has been sent. Please verify your email, then log in.");
    switchTab(true);
    document.getElementById('loginEmail').value = email;
    document.getElementById('loginPassword').value = '';
    document.getElementById('regFullName').value = '';
    document.getElementById('regEmail').value = '';
    document.getElementById('regPassword').value = '';
    document.getElementById('regConfirmPassword').value = '';
  } catch(error) {
    alert("Registration failed: " + error.message);
  }
}
async function resendVerificationEmail() {
  if (currentUser && !currentUser.emailVerified) {
    await currentUser.sendEmailVerification();
    alert("Verification email resent. Please check your inbox.");
  } else {
    logout();
  }
}
function logout() {
  auth.signOut().then(() => {
    currentUser = null;
    currentUserId = null;
    transactions = [];
    authOverlay.style.display = 'flex';
    appContainer.style.display = 'none';
    verifyNotice.style.display = 'none';
    addMoneyVisible = false; expenseVisible = false;
    addMoneySection.style.display = 'none';
    expenseSection.style.display = 'none';
    chartWrapper.style.display = 'none';
    toggleAddMoneyBtn.innerHTML = '<i class="fas fa-eye"></i> Show Add Money';
    toggleExpenseBtn.innerHTML = '<i class="fas fa-eye"></i> Show Expenses';
    if (spendingChart) { spendingChart.destroy(); spendingChart = null; }
    dynamicPanelDiv.innerHTML = '';
    profileUpload.value = '';
    monthlyLimitInput.value = '';
    monthlyLimit = null;
    document.getElementById('loginEmail').value = '';
    document.getElementById('loginPassword').value = '';
    document.getElementById('regFullName').value = '';
    document.getElementById('regEmail').value = '';
    document.getElementById('regPassword').value = '';
    document.getElementById('regConfirmPassword').value = '';
  });
}

function initPasswordToggles() {
  const toggleIcons = document.querySelectorAll('.toggle-password');
  toggleIcons.forEach(icon => {
    icon.addEventListener('click', function() {
      const targetId = this.getAttribute('data-target');
      const input = document.getElementById(targetId);
      if (input) {
        if (input.type === 'password') {
          input.type = 'text';
          this.classList.remove('fa-eye');
          this.classList.add('fa-eye-slash');
        } else {
          input.type = 'password';
          this.classList.remove('fa-eye-slash');
          this.classList.add('fa-eye');
        }
      }
    });
  });
}

// ========== EVENT LISTENERS ==========
showAddMoneyPanelBtn.addEventListener('click', showAddMoneyPanelUI);
showExpensePanelBtn.addEventListener('click', showExpensePanelUI);
toggleAddMoneyBtn.addEventListener('click', toggleAddMoney);
toggleExpenseBtn.addEventListener('click', toggleExpense);
addPeriodFilter.addEventListener('change', () => { if (addMoneyVisible) renderAddMoneyTable(); });
addSearchInput.addEventListener('input', () => { if (addMoneyVisible) renderAddMoneyTable(); });
expensePeriodFilter.addEventListener('change', onExpenseFilterChange);
expenseSearchInput.addEventListener('input', () => { if (expenseVisible) renderExpenseTable(); });
clearAllDataBtn.addEventListener('click', clearAllData);
darkModeToggle.addEventListener('click', toggleDarkMode);
closeModal.addEventListener('click', closeEditModal);
cancelEditBtn.addEventListener('click', closeEditModal);
saveEditBtn.addEventListener('click', saveEdit);
window.addEventListener('click', (e) => { if (e.target === editModal) closeEditModal(); });
logoutBtn.addEventListener('click', logout);
loginBtn.addEventListener('click', handleLogin);
registerBtn.addEventListener('click', handleRegister);
loginTab.addEventListener('click', () => switchTab(true));
registerTab.addEventListener('click', () => switchTab(false));
resendVerifyBtn.addEventListener('click', resendVerificationEmail);
logoutFromVerifyBtn.addEventListener('click', logout);
exportCsvBtn.addEventListener('click', exportToCSV);
setLimitBtn.addEventListener('click', setMonthlyLimit);

// Profile picture events
profileUpload.addEventListener('change', handleProfileUpload);
removeProfileBtn.addEventListener('click', removeProfilePicture);
const profilePicWrapper = document.getElementById('profilePicWrapper');
if (profilePicWrapper) {
  profilePicWrapper.addEventListener('click', (e) => {
    if (e.target.closest('.upload-icon') || e.target.closest('.remove-icon')) return;
    profileUpload.click();
  });
}

// ========== AUTH STATE MONITORING ==========
auth.onAuthStateChanged(async (user) => {
  if (user) {
    if (!user.emailVerified) {
      authOverlay.style.display = 'none';
      appContainer.style.display = 'none';
      verifyNotice.style.display = 'flex';
      currentUser = user;
      currentUserId = user.uid;
    } else {
      currentUser = user;
      currentUserId = user.uid;
      userDisplay.innerText = currentUser.displayName || user.email.split('@')[0];
      await loadUserData();
      authOverlay.style.display = 'none';
      appContainer.style.display = 'block';
      verifyNotice.style.display = 'none';
      addMoneyVisible = false; expenseVisible = false;
      addMoneySection.style.display = 'none';
      expenseSection.style.display = 'none';
      chartWrapper.style.display = 'none';
      toggleAddMoneyBtn.innerHTML = '<i class="fas fa-eye"></i> Show Add Money';
      toggleExpenseBtn.innerHTML = '<i class="fas fa-eye"></i> Show Expenses';
      if (spendingChart) { spendingChart.destroy(); spendingChart = null; }
      dynamicPanelDiv.innerHTML = '';
    }
  } else {
    authOverlay.style.display = 'flex';
    appContainer.style.display = 'none';
    verifyNotice.style.display = 'none';
    currentUser = null;
    currentUserId = null;
  }
});
initDarkMode();
setupDelegation();
switchTab(true);
initPasswordToggles();
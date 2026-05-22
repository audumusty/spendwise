// Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyCRQ_g8mgwxR6_1daZKNvHnhT-1vtuhl14",
  authDomain: "wallet-tracker-989f2.firebaseapp.com",
  projectId: "wallet-tracker-989f2",
  storageBucket: "wallet-tracker-989f2.firebasestorage.app",
  messagingSenderId: "306699494431",
  appId: "1:306699494431:web:1002d28bebc2f45161a12a"
};

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
let lastToastPercent = 0;

// DOM elements
const authOverlay = document.getElementById('authOverlay');
const appContainer = document.getElementById('appContainer');
const verifyNotice = document.getElementById('verifyNotice');
const loginForm = document.getElementById('loginForm');
const registerForm = document.getElementById('registerForm');
const loginTab = document.getElementById('loginTabBtn');
const registerTab = document.getElementById('registerTabBtn');
const loginBtn = document.getElementById('loginBtn');
const registerBtn = document.getElementById('registerBtn');
const logoutBtn = document.getElementById('logoutBtn');
const changePasswordBtn = document.getElementById('changePasswordBtn');
const forgotPasswordBtn = document.getElementById('forgotPasswordBtn');
const forgotModal = document.getElementById('forgotModal');
const closeForgotModal = document.getElementById('closeForgotModal');
const cancelForgotBtn = document.getElementById('cancelForgotBtn');
const sendResetBtn = document.getElementById('sendResetBtn');
const resetEmail = document.getElementById('resetEmail');
const changePasswordModal = document.getElementById('changePasswordModal');
const closeChangeModal = document.getElementById('closeChangeModal');
const cancelChangeBtn = document.getElementById('cancelChangeBtn');
const saveChangePasswordBtn = document.getElementById('saveChangePasswordBtn');
const currentPassword = document.getElementById('currentPassword');
const newPassword = document.getElementById('newPassword');
const confirmNewPassword = document.getElementById('confirmNewPassword');
const resendVerifyBtn = document.getElementById('resendVerifyBtn');
const logoutFromVerifyBtn = document.getElementById('logoutFromVerifyBtn');
const resendFromRegisterBtn = document.getElementById('resendFromRegisterBtn');
const checkVerifiedBtn = document.getElementById('checkVerifiedBtn');
const logoutFromRegisterBtn = document.getElementById('logoutFromRegisterBtn');
const registerVerifyPanel = document.getElementById('registerVerifyPanel');
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

// Helper: toast
function showToast(msg, type = 'info') {
  const toast = document.createElement('div');
  toast.className = `toast ${type}`;
  toast.innerText = msg;
  document.body.appendChild(toast);
  setTimeout(() => toast.remove(), 3000);
}

function formatNaira(amount) {
  return '₦' + amount.toLocaleString('en-NG', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}
function getCurrentTimestamp() { return new Date().toISOString(); }
function escapeHtml(str) { return (str || '').replace(/[&<>]/g, m => ({'&':'&amp;','<':'&lt;','>':'&gt;'}[m])); }

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

// ========== DATA FUNCTIONS ==========
async function loadUserData() {
  if (!currentUserId) return;
  const userDoc = await db.collection('users').doc(currentUserId).get();
  if (userDoc.exists) {
    const data = userDoc.data();
    transactions = data.transactions || [];
    monthlyLimit = data.monthlyLimit || null;
    monthlyLimitInput.value = monthlyLimit || '';
    const profilePic = data.profilePic;
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
    transactions,
    monthlyLimit,
    profilePic: currentUser?.photoURL || null,
    updatedAt: firebase.firestore.FieldValue.serverTimestamp()
  }, { merge: true });
}

async function saveProfilePicture(base64) {
  if (currentUserId) {
    currentUser.photoURL = base64;
    await db.collection('users').doc(currentUserId).set({ profilePic: base64 }, { merge: true });
    profileImage.src = base64;
  }
}

async function removeProfilePictureFromFirestore() {
  if (currentUserId) {
    currentUser.photoURL = null;
    await db.collection('users').doc(currentUserId).set({ profilePic: null }, { merge: true });
    const initials = currentUser.displayName ? currentUser.displayName.charAt(0).toUpperCase() : 'U';
    profileImage.src = `https://ui-avatars.com/api/?name=${initials}&background=1c6e5e&color=fff&rounded=true&size=180&bold=true&t=${Date.now()}`;
  }
}

// Spending limit
function getCurrentMonthExpenses() {
  const now = new Date();
  const currentMonth = now.getMonth();
  const currentYear = now.getFullYear();
  return transactions.filter(t => {
    if (t.type !== 'expense') return false;
    const d = new Date(t.timestamp);
    return d.getMonth() === currentMonth && d.getFullYear() === currentYear;
  }).reduce((sum, t) => sum + t.amount, 0);
}

function updateMonthlySpending() {
  const spent = getCurrentMonthExpenses();
  currentMonthSpendingSpan.innerText = formatNaira(spent);
  if (monthlyLimit && monthlyLimit > 0) {
    const percent = Math.min(100, (spent / monthlyLimit) * 100);
    spendingProgressBar.style.width = percent + '%';
    if (percent >= 100) {
      spendingProgressBar.classList.add('danger');
      spendingProgressBar.classList.remove('warning');
      limitStatusSpan.innerText = '⚠️ Limit exceeded!';
      limitStatusSpan.style.color = '#ef4444';
      if (lastToastPercent !== 100) {
        showToast(`Exceeded limit ${formatNaira(monthlyLimit)}`, 'danger');
        lastToastPercent = 100;
      }
    } else if (percent >= 80) {
      spendingProgressBar.classList.add('warning');
      spendingProgressBar.classList.remove('danger');
      limitStatusSpan.innerText = '⚠️ Close to limit';
      limitStatusSpan.style.color = '#f59e0b';
      if (lastToastPercent < 80) {
        showToast(`${percent.toFixed(0)}% of limit used`, 'warning');
        lastToastPercent = 80;
      }
    } else {
      spendingProgressBar.classList.remove('warning', 'danger');
      limitStatusSpan.innerText = `${percent.toFixed(1)}% used`;
      limitStatusSpan.style.color = 'var(--text-color)';
      lastToastPercent = 0;
    }
  } else {
    spendingProgressBar.style.width = '0%';
    limitStatusSpan.innerText = 'No limit set';
    limitStatusSpan.style.color = 'var(--text-color)';
    lastToastPercent = 0;
  }
}

async function setMonthlyLimit() {
  let val = parseFloat(monthlyLimitInput.value);
  monthlyLimit = (isNaN(val) || val <= 0) ? null : val;
  await saveUserData();
  updateMonthlySpending();
  showToast(monthlyLimit ? `Limit set to ${formatNaira(monthlyLimit)}` : 'Limit removed', 'success');
}

// Export CSV
function exportToCSV() {
  if (!transactions.length) { alert("No data"); return; }
  const rows = [["Type","Description","Category","Amount (₦)","Timestamp"]];
  transactions.forEach(t => {
    rows.push([
      t.type === 'add' ? 'Add Money' : 'Expense',
      t.desc,
      t.category || '',
      t.amount.toFixed(2),
      new Date(t.timestamp).toLocaleString()
    ]);
  });
  const csvContent = rows.map(row => row.map(cell => `"${cell}"`).join(",")).join("\n");
  const blob = new Blob(["\uFEFF" + csvContent], { type: "text/csv;charset=utf-8;" });
  const link = document.createElement('a');
  link.href = URL.createObjectURL(blob);
  link.download = `spendwise_export_${Date.now()}.csv`;
  link.click();
  URL.revokeObjectURL(link.href);
}

// Image compression
function compressImage(file, maxKB = 300, callback) {
  const reader = new FileReader();
  reader.readAsDataURL(file);
  reader.onload = e => {
    const img = new Image();
    img.src = e.target.result;
    img.onload = () => {
      const canvas = document.createElement('canvas');
      let w = img.width, h = img.height;
      const maxDim = 400;
      if (w > h && w > maxDim) { h = h * maxDim / w; w = maxDim; }
      else if (h > maxDim) { w = w * maxDim / h; h = maxDim; }
      canvas.width = w; canvas.height = h;
      const ctx = canvas.getContext('2d');
      ctx.drawImage(img, 0, 0, w, h);
      let quality = 0.8;
      let base64 = canvas.toDataURL('image/jpeg', quality);
      while (base64.length > maxKB * 1024 && quality > 0.2) {
        quality -= 0.1;
        base64 = canvas.toDataURL('image/jpeg', quality);
      }
      callback(base64);
    };
  };
}

// ========== UI RENDER FUNCTIONS ==========
function calculateBalance() {
  return transactions.reduce((b, t) => t.type === 'add' ? b + t.amount : b - t.amount, 0);
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
  let html = `<div class="transaction-table-wrapper"><table class="transaction-table"><thead><tr><th>Description</th><th>Timestamp</th><th>Amount</th><th>Actions</th></tr></thead><tbody>`;
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
  let html = `<div class="transaction-table-wrapper"><table class="transaction-table"><thead><tr><th>Category</th><th>Description</th><th>Timestamp</th><th>Amount</th><th>Actions</th></tr></thead><tbody>`;
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
  filtered.forEach(t => { map.set(t.category || 'Other', (map.get(t.category) || 0) + t.amount); });
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

// CRUD
async function addMoney(amount, desc) {
  if (isNaN(amount) || amount <= 0) { alert("Positive amount only"); return false; }
  if (!desc.trim()) { alert("Description required"); return false; }
  transactions.push({ id: Date.now(), type: 'add', amount: parseFloat(amount), desc: desc.trim(), timestamp: getCurrentTimestamp() });
  await saveUserData();
  if (addMoneyVisible) renderAddMoneyTable();
  updateBalanceDisplay();
  return true;
}
async function addExpense(amount, desc, category) {
  if (isNaN(amount) || amount <= 0) { alert("Positive amount only"); return false; }
  if (!desc.trim()) { alert("Description required"); return false; }
  const bal = calculateBalance();
  if (bal < amount) { alert(`Insufficient balance! You have ${formatNaira(bal)} but expense is ${formatNaira(amount)}.`); return false; }
  transactions.push({ id: Date.now(), type: 'expense', amount: parseFloat(amount), desc: desc.trim(), category: category || 'Other', timestamp: getCurrentTimestamp() });
  await saveUserData();
  if (expenseVisible) { renderExpenseTable(); if (spendingChart) updateChart(); }
  updateBalanceDisplay();
  updateMonthlySpending();
  return true;
}
async function deleteTransaction(id) {
  const t = transactions.find(t => t.id === id);
  if (!t) return;
  if (t.type === 'add') {
    let tempBalance = calculateBalance() - t.amount;
    if (tempBalance < 0) {
      alert(`Cannot delete this "Add Money" transaction because your balance would become negative (${formatNaira(tempBalance)}).`);
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
    if (tempBalance - newAmount < 0) { alert("After edit, balance would be negative."); return false; }
  }
  transactions[index] = { ...old, type: newType, desc: newDesc.trim(), amount: newAmount, category: newType === 'expense' ? newCategory : null, timestamp: getCurrentTimestamp() };
  await saveUserData();
  if (addMoneyVisible) renderAddMoneyTable();
  if (expenseVisible) { renderExpenseTable(); if (spendingChart) updateChart(); }
  updateBalanceDisplay();
  updateMonthlySpending();
  return true;
}
async function clearAllData() {
  if (confirm("Delete ALL transactions? This will reset your balance to ₦0. This cannot be undone.")) {
    transactions = [];
    await saveUserData();
    if (addMoneyVisible) renderAddMoneyTable();
    if (expenseVisible) { renderExpenseTable(); if (spendingChart) updateChart(); }
    updateBalanceDisplay();
    updateMonthlySpending();
  }
}

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

function showAddMoneyPanelUI() {
  dynamicPanelDiv.innerHTML = `<button class="close-panel" id="closePanel"><i class="fas fa-times"></i></button>
    <div class="panel-title"><i class="fas fa-plus-circle"></i> Add money (₦)</div>
    <div class="form-group">
      <input type="number" id="moneyAmount" placeholder="Amount (₦)" step="any" min="0" oninput="this.value=Math.abs(this.value)" style="appearance:textfield">
      <input type="text" id="moneyDesc" placeholder="Description">
      <button id="submitAddMoney">Add Money</button>
    </div>`;
  document.getElementById('closePanel').onclick = () => dynamicPanelDiv.innerHTML = '';
  document.getElementById('submitAddMoney').onclick = () => {
    let amt = parseFloat(document.getElementById('moneyAmount').value);
    if (isNaN(amt)) amt = 0;
    const desc = document.getElementById('moneyDesc').value;
    addMoney(amt, desc).then(() => dynamicPanelDiv.innerHTML = '');
  };
}
function showExpensePanelUI() {
  dynamicPanelDiv.innerHTML = `<button class="close-panel" id="closePanel"><i class="fas fa-times"></i></button>
    <div class="panel-title"><i class="fas fa-shopping-cart"></i> Add expense (₦)</div>
    <div class="form-group">
      <input type="number" id="expenseAmount" placeholder="Amount (₦)" step="any" min="0" oninput="this.value=Math.abs(this.value)" style="appearance:textfield">
      <input type="text" id="expenseDesc" placeholder="Description">
      <select id="expenseCategory">${['Food','Transport','Entertainment','Shopping','Bills','Other'].map(c => `<option value="${c}">${c}</option>`).join('')}</select>
      <button id="submitExpense">Add Expense</button>
    </div>`;
  document.getElementById('closePanel').onclick = () => dynamicPanelDiv.innerHTML = '';
  document.getElementById('submitExpense').onclick = () => {
    let amt = parseFloat(document.getElementById('expenseAmount').value);
    if (isNaN(amt)) amt = 0;
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

// Dark mode
function initDarkMode() {
  const saved = localStorage.getItem('darkMode');
  if (saved === 'enabled') document.body.classList.add('dark');
  darkModeToggle.innerHTML = document.body.classList.contains('dark') ? '<i class="fas fa-sun"></i>' : '<i class="fas fa-moon"></i>';
}
function toggleDarkMode() {
  document.body.classList.toggle('dark');
  localStorage.setItem('darkMode', document.body.classList.contains('dark') ? 'enabled' : 'disabled');
  darkModeToggle.innerHTML = document.body.classList.contains('dark') ? '<i class="fas fa-sun"></i>' : '<i class="fas fa-moon"></i>';
}

function handleProfileUpload(event) {
  const file = event.target.files[0];
  if (!file) return;
  if (!file.type.startsWith('image/')) { alert("Please upload an image file."); profileUpload.value = ''; return; }
  compressImage(file, 300, async (compressed) => { await saveProfilePicture(compressed); });
  profileUpload.value = '';
}
function removeProfilePicture() {
  if (confirm("Remove your profile picture?")) removeProfilePictureFromFirestore();
}

// ========== PASSWORD MANAGEMENT ==========
function openForgotModal() { forgotModal.style.display = 'flex'; }
async function sendResetEmail() {
  const email = resetEmail.value.trim();
  if (!email) { alert("Enter your email address."); return; }
  try {
    await auth.sendPasswordResetEmail(email);
    showToast(`Reset email sent to ${email}`, 'success');
    closeForgotModalFunc();
  } catch(e) { alert("Error: " + e.message); }
}
function closeForgotModalFunc() { forgotModal.style.display = 'none'; resetEmail.value = ''; }

function openChangePasswordModal() { changePasswordModal.style.display = 'flex'; }
async function updatePassword() {
  const curr = currentPassword.value;
  const newPwd = newPassword.value;
  const confirm = confirmNewPassword.value;
  if (!curr || !newPwd || !confirm) { alert("All fields required"); return; }
  if (newPwd !== confirm) { alert("New passwords do not match"); return; }
  if (newPwd.length < 6) { alert("Password must be at least 6 characters"); return; }
  const user = auth.currentUser;
  const email = user.email;
  const credential = firebase.auth.EmailAuthProvider.credential(email, curr);
  try {
    await user.reauthenticateWithCredential(credential);
    await user.updatePassword(newPwd);
    showToast("Password changed successfully", 'success');
    closeChangeModalFunc();
  } catch(e) { alert("Failed: " + e.message); }
}
function closeChangeModalFunc() { changePasswordModal.style.display = 'none'; currentPassword.value = ''; newPassword.value = ''; confirmNewPassword.value = ''; }

// ========== AUTH UI ==========
function switchTab(showLogin) {
  if (showLogin) {
    loginForm.style.display = 'block';
    registerForm.style.display = 'none';
    loginTab.classList.add('active');
    registerTab.classList.remove('active');
  } else {
    loginForm.style.display = 'none';
    registerForm.style.display = 'block';
    registerTab.classList.add('active');
    loginTab.classList.remove('active');
  }
}

async function handleLogin() {
  const email = document.getElementById('loginEmail').value.trim();
  const password = document.getElementById('loginPassword').value;
  if (!email || !password) { alert("Fill all fields"); return; }
  try {
    const cred = await auth.signInWithEmailAndPassword(email, password);
    if (!cred.user.emailVerified) {
      authOverlay.style.display = 'none';
      verifyNotice.style.display = 'flex';
      currentUser = cred.user;
      currentUserId = cred.user.uid;
      return;
    }
    currentUser = cred.user;
    currentUserId = cred.user.uid;
    userDisplay.innerText = currentUser.displayName || email.split('@')[0];
    await loadUserData();
    authOverlay.style.display = 'none';
    appContainer.style.display = 'block';
    verifyNotice.style.display = 'none';
    addMoneyVisible = expenseVisible = false;
    addMoneySection.style.display = 'none';
    expenseSection.style.display = 'none';
    chartWrapper.style.display = 'none';
    toggleAddMoneyBtn.innerHTML = '<i class="fas fa-eye"></i> Show Add Money';
    toggleExpenseBtn.innerHTML = '<i class="fas fa-eye"></i> Show Expenses';
    if (spendingChart) spendingChart.destroy();
    spendingChart = null;
    dynamicPanelDiv.innerHTML = '';
  } catch(e) { alert("Login failed: " + e.message); }
}

async function handleRegister() {
  const fullName = document.getElementById('regFullName').value.trim();
  const email = document.getElementById('regEmail').value.trim();
  const password = document.getElementById('regPassword').value;
  const confirm = document.getElementById('regConfirmPassword').value;
  if (!fullName || !email || !password || !confirm) { alert("All fields required"); return; }
  if (password !== confirm) { alert("Passwords do not match"); return; }
  try {
    const cred = await auth.createUserWithEmailAndPassword(email, password);
    await cred.user.updateProfile({ displayName: fullName });
    await cred.user.sendEmailVerification();
    await db.collection('users').doc(cred.user.uid).set({ fullName, email, transactions: [], profilePic: null, monthlyLimit: null });
    // Keep user signed in (unverified) to allow resend
    currentUser = cred.user;
    currentUserId = cred.user.uid;
    showToast(`✅ Verification sent to ${email}`, 'success');
    // Clear form fields
    document.getElementById('regFullName').value = '';
    document.getElementById('regEmail').value = '';
    document.getElementById('regPassword').value = '';
    document.getElementById('regConfirmPassword').value = '';
    // Show panel on register page
    registerVerifyPanel.style.display = 'block';
  } catch(e) { alert("Registration failed: " + e.message); }
}

async function resendVerificationFromRegister() {
  if (currentUser && !currentUser.emailVerified) {
    try {
      await currentUser.sendEmailVerification();
      showToast(`✅ Resent to ${currentUser.email}`, 'success');
    } catch(e) { alert("Error: " + e.message); }
  } else { alert("No unverified user found."); }
}

async function checkVerifiedAndRedirect() {
  if (currentUser && !currentUser.emailVerified) {
    await currentUser.reload();
    if (currentUser.emailVerified) {
      showToast("Email verified! Please log in.", 'success');
      // Log out the unverified user and switch to login tab
      await auth.signOut();
      currentUser = null;
      registerVerifyPanel.style.display = 'none';
      switchTab(true);
      // Optionally fill email
      document.getElementById('loginEmail').value = currentUser.email;
    } else {
      alert("Email not verified yet. Please check your inbox/spam.");
    }
  } else {
    alert("No unverified user found.");
  }
}

function logoutFromRegister() {
  auth.signOut().then(() => {
    currentUser = null;
    registerVerifyPanel.style.display = 'none';
    switchTab(true);
  });
}

async function resendVerificationFromNotice() {
  if (currentUser && !currentUser.emailVerified) {
    try { await currentUser.sendEmailVerification(); showToast(`Resent to ${currentUser.email}`, 'success'); } catch(e) { alert("Error: " + e.message); }
  } else { logout(); }
}
function logoutFromNotice() { logout(); }
function logout() {
  auth.signOut().then(() => {
    currentUser = null;
    currentUserId = null;
    authOverlay.style.display = 'flex';
    appContainer.style.display = 'none';
    verifyNotice.style.display = 'none';
    registerVerifyPanel.style.display = 'none';
    addMoneyVisible = expenseVisible = false;
    addMoneySection.style.display = 'none';
    expenseSection.style.display = 'none';
    chartWrapper.style.display = 'none';
    toggleAddMoneyBtn.innerHTML = '<i class="fas fa-eye"></i> Show Add Money';
    toggleExpenseBtn.innerHTML = '<i class="fas fa-eye"></i> Show Expenses';
    if (spendingChart) spendingChart.destroy();
    spendingChart = null;
    dynamicPanelDiv.innerHTML = '';
    document.getElementById('loginEmail').value = '';
    document.getElementById('loginPassword').value = '';
    document.getElementById('regFullName').value = '';
    document.getElementById('regEmail').value = '';
    document.getElementById('regPassword').value = '';
    document.getElementById('regConfirmPassword').value = '';
  });
}

function initPasswordToggles() {
  document.querySelectorAll('.toggle-password').forEach(icon => {
    icon.addEventListener('click', function() {
      const input = document.getElementById(this.dataset.target);
      if (input) {
        if (input.type === 'password') { input.type = 'text'; this.classList.replace('fa-eye','fa-eye-slash'); }
        else { input.type = 'password'; this.classList.replace('fa-eye-slash','fa-eye'); }
      }
    });
  });
}

// ========== EVENT LISTENERS ==========
showAddMoneyPanelBtn.addEventListener('click', showAddMoneyPanelUI);
showExpensePanelBtn.addEventListener('click', showExpensePanelUI);
toggleAddMoneyBtn.addEventListener('click', toggleAddMoney);
toggleExpenseBtn.addEventListener('click', toggleExpense);
addPeriodFilter.addEventListener('change', () => addMoneyVisible && renderAddMoneyTable());
addSearchInput.addEventListener('input', () => addMoneyVisible && renderAddMoneyTable());
expensePeriodFilter.addEventListener('change', onExpenseFilterChange);
expenseSearchInput.addEventListener('input', () => expenseVisible && renderExpenseTable());
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
resendVerifyBtn.addEventListener('click', resendVerificationFromNotice);
logoutFromVerifyBtn.addEventListener('click', logout);
resendFromRegisterBtn.addEventListener('click', resendVerificationFromRegister);
checkVerifiedBtn.addEventListener('click', checkVerifiedAndRedirect);
logoutFromRegisterBtn.addEventListener('click', logoutFromRegister);
exportCsvBtn.addEventListener('click', exportToCSV);
setLimitBtn.addEventListener('click', setMonthlyLimit);
changePasswordBtn.addEventListener('click', openChangePasswordModal);
forgotPasswordBtn.addEventListener('click', openForgotModal);
closeForgotModal.addEventListener('click', closeForgotModalFunc);
cancelForgotBtn.addEventListener('click', closeForgotModalFunc);
sendResetBtn.addEventListener('click', sendResetEmail);
closeChangeModal.addEventListener('click', closeChangeModalFunc);
cancelChangeBtn.addEventListener('click', closeChangeModalFunc);
saveChangePasswordBtn.addEventListener('click', updatePassword);

profileUpload.addEventListener('change', handleProfileUpload);
removeProfileBtn.addEventListener('click', removeProfilePicture);
const profilePicWrapper = document.getElementById('profilePicWrapper');
if (profilePicWrapper) profilePicWrapper.addEventListener('click', (e) => { if (!e.target.closest('.upload-icon') && !e.target.closest('.remove-icon')) profileUpload.click(); });

// Auth state observer
auth.onAuthStateChanged(async (user) => {
  if (user) {
    if (!user.emailVerified) {
      authOverlay.style.display = 'none';
      appContainer.style.display = 'none';
      verifyNotice.style.display = 'none';
      currentUser = user;
      currentUserId = user.uid;
      // Show register panel only if register tab is active
      if (registerForm.style.display !== 'none') registerVerifyPanel.style.display = 'block';
      else registerVerifyPanel.style.display = 'none';
    } else {
      currentUser = user;
      currentUserId = user.uid;
      userDisplay.innerText = user.displayName || user.email.split('@')[0];
      await loadUserData();
      authOverlay.style.display = 'none';
      appContainer.style.display = 'block';
      verifyNotice.style.display = 'none';
      registerVerifyPanel.style.display = 'none';
      addMoneyVisible = expenseVisible = false;
      addMoneySection.style.display = 'none';
      expenseSection.style.display = 'none';
      chartWrapper.style.display = 'none';
      toggleAddMoneyBtn.innerHTML = '<i class="fas fa-eye"></i> Show Add Money';
      toggleExpenseBtn.innerHTML = '<i class="fas fa-eye"></i> Show Expenses';
      if (spendingChart) spendingChart.destroy();
      spendingChart = null;
      dynamicPanelDiv.innerHTML = '';
    }
  } else {
    authOverlay.style.display = 'flex';
    appContainer.style.display = 'none';
    verifyNotice.style.display = 'none';
    registerVerifyPanel.style.display = 'none';
    currentUser = null;
    currentUserId = null;
  }
});
initDarkMode();
setupDelegation();
switchTab(true);
initPasswordToggles();
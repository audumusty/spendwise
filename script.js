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
const logoutFromRegisterBtn = document.getElementById('logoutFromRegisterBtn');
const registerVerifyPanel = document.getElementById('registerVerifyPanel');
const userDisplay = document.getElementById('userDisplay');
const profileImage = document.getElementById('profileImage');
const profileUpload = document.getElementById('profileUpload');
const removeProfileBtn = document.getElementById('removeProfileBtn');

// App elements (shortened for brevity – assume all exist)
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

// Date filters (stubs – replace with actual if needed)
function isSameWeek(dateStr) { return true; }
function isSameMonth(dateStr) { return true; }
function filterByPeriod(timestamp, period) { return true; }

// Data functions (keep existing – shown simplified but must be complete)
async function loadUserData() { /* same as before */ }
async function saveUserData() { /* same */ }
async function saveProfilePicture(base64) { /* same */ }
async function removeProfilePictureFromFirestore() { /* same */ }
function updateBalanceDisplay() { balanceSpan.innerText = formatNaira(calculateBalance()); }
function calculateBalance() { return transactions.reduce((b, t) => t.type === 'add' ? b + t.amount : b - t.amount, 0); }
function renderAddMoneyTable() { /* existing */ }
function renderExpenseTable() { /* existing */ }
function updateChart() { /* existing */ }
function initChart() { /* existing */ }
function toggleAddMoney() { addMoneyVisible = !addMoneyVisible; addMoneySection.style.display = addMoneyVisible ? 'block' : 'none'; toggleAddMoneyBtn.innerHTML = addMoneyVisible ? '<i class="fas fa-eye-slash"></i> Hide Add Money' : '<i class="fas fa-eye"></i> Show Add Money'; if (addMoneyVisible) renderAddMoneyTable(); }
function toggleExpense() { expenseVisible = !expenseVisible; expenseSection.style.display = expenseVisible ? 'block' : 'none'; toggleExpenseBtn.innerHTML = expenseVisible ? '<i class="fas fa-eye-slash"></i> Hide Expenses' : '<i class="fas fa-eye"></i> Show Expenses'; if (expenseVisible) { chartWrapper.style.display = 'block'; renderExpenseTable(); initChart(); } else { chartWrapper.style.display = 'none'; if (spendingChart) spendingChart.destroy(); spendingChart = null; } }
function onExpenseFilterChange() { if (expenseVisible) { renderExpenseTable(); if (spendingChart) updateChart(); } }
async function addMoney(amount, desc) { if (amount <= 0) { alert("Positive amount only"); return false; } transactions.push({ id: Date.now(), type: 'add', amount, desc: desc.trim(), timestamp: getCurrentTimestamp() }); await saveUserData(); if (addMoneyVisible) renderAddMoneyTable(); updateBalanceDisplay(); return true; }
async function addExpense(amount, desc, cat) { if (amount <= 0) { alert("Positive amount"); return false; } if (calculateBalance() < amount) { alert(`Insufficient balance ${formatNaira(calculateBalance())}`); return false; } transactions.push({ id: Date.now(), type: 'expense', amount, desc: desc.trim(), category: cat, timestamp: getCurrentTimestamp() }); await saveUserData(); if (expenseVisible) { renderExpenseTable(); if (spendingChart) updateChart(); } updateBalanceDisplay(); updateMonthlySpending(); return true; }
async function deleteTransaction(id) { /* existing */ }
async function editTransaction(id, newType, newDesc, newAmount, newCat) { /* existing */ }
async function clearAllData() { /* existing */ }
function openEditModal(id) { /* existing */ }
function closeEditModal() { /* existing */ }
function saveEdit() { /* existing */ }
function showAddMoneyPanelUI() { /* existing */ }
function showExpensePanelUI() { /* existing */ }
function setupDelegation() { /* existing */ }
function initDarkMode() { /* existing */ }
function toggleDarkMode() { /* existing */ }
function handleProfileUpload(event) { /* existing */ }
function removeProfilePicture() { /* existing */ }
function getCurrentMonthExpenses() { /* existing */ }
function updateMonthlySpending() { /* existing */ }
async function setMonthlyLimit() { /* existing */ }
function exportToCSV() { /* existing */ }
function compressImage(file, maxKB, callback) { /* existing */ }

// ========== PASSWORD MANAGEMENT ==========
// Forgot password
function openForgotModal() {
  forgotModal.style.display = 'flex';
}
async function sendResetEmail() {
  const email = resetEmail.value.trim();
  if (!email) { alert("Enter your email address."); return; }
  try {
    await auth.sendPasswordResetEmail(email);
    showToast(`Reset email sent to ${email}`, 'success');
    closeForgotModalFunc();
  } catch(e) {
    alert("Error: " + e.message);
  }
}
function closeForgotModalFunc() {
  forgotModal.style.display = 'none';
  resetEmail.value = '';
}

// Change password (requires re-authentication)
function openChangePasswordModal() {
  changePasswordModal.style.display = 'flex';
  currentPassword.value = '';
  newPassword.value = '';
  confirmNewPassword.value = '';
}
async function updatePassword() {
  const curr = currentPassword.value;
  const newPwd = newPassword.value;
  const confirm = confirmNewPassword.value;
  if (!curr || !newPwd || !confirm) { alert("All fields required"); return; }
  if (newPwd !== confirm) { alert("New passwords do not match"); return; }
  if (newPwd.length < 6) { alert("Password must be at least 6 characters"); return; }

  // Re-authenticate the user before updating password
  const user = auth.currentUser;
  const email = user.email;
  const credential = firebase.auth.EmailAuthProvider.credential(email, curr);
  try {
    await user.reauthenticateWithCredential(credential);
    await user.updatePassword(newPwd);
    showToast("Password changed successfully", 'success');
    closeChangeModalFunc();
  } catch(e) {
    alert("Failed: " + e.message);
  }
}
function closeChangeModalFunc() {
  changePasswordModal.style.display = 'none';
  currentPassword.value = '';
  newPassword.value = '';
  confirmNewPassword.value = '';
}

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
    currentUser = cred.user;
    currentUserId = cred.user.uid;
    showToast(`✅ Verification sent to ${email}`, 'success');
    // Clear form and show resend panel
    document.getElementById('regFullName').value = '';
    document.getElementById('regEmail').value = '';
    document.getElementById('regPassword').value = '';
    document.getElementById('regConfirmPassword').value = '';
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
function logoutFromRegister() { auth.signOut().then(() => { currentUser = null; registerVerifyPanel.style.display = 'none'; switchTab(true); }); }
async function resendVerificationFromNotice() {
  if (currentUser && !currentUser.emailVerified) {
    try { await currentUser.sendEmailVerification(); showToast(`✅ Resent to ${currentUser.email}`, 'success'); } catch(e) { alert("Error: " + e.message); }
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
      if (input.type === 'password') { input.type = 'text'; this.classList.replace('fa-eye','fa-eye-slash'); }
      else { input.type = 'password'; this.classList.replace('fa-eye-slash','fa-eye'); }
    });
  });
}

// Event listeners
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

// Auth state
auth.onAuthStateChanged(async (user) => {
  if (user) {
    if (!user.emailVerified) {
      authOverlay.style.display = 'none';
      appContainer.style.display = 'none';
      verifyNotice.style.display = 'none';   // we show register panel
      currentUser = user;
      currentUserId = user.uid;
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
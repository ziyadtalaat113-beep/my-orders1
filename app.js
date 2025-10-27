// --- 1. استيراد المكتبات (لازم يكون أول حاجة) ---
import { initializeApp } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-app.js";
import { 
// ... existing code ... -->
} from "https://www.gstatic.com/firebasejs/11.6.1/firebase-firestore.js";

// --- ⭐️ الخطوة 1: تعريف هوية الأدمن الرئيسي ⭐️ ---
// ... existing code ... -->
// ----------------------------------------------------

// --- ⭐️ الخطوة 4: وظيفة تحميل الخط العربي ⭐️ ---
// ... existing code ... -->
async function loadFontAsBase64(url) {
    try {
// ... existing code ... -->
        return null;
    }
}
// ... existing code ... -->
// --- 5. تهيئة Firebase وربط العناصر ---
// متغيرات عامة
let db, auth;
// ... existing code ... -->
let ordersUnsubscribe = null, usersUnsubscribe = null;

// --- 6. تعريف متغيرات عناصر الصفحة (DOM Elements) ---
// (سيتم تعيين قيمها بعد تحميل الصفحة)
let loadingSpinner, appContent, authScreen, mainApp,
    loginForm, registerForm, authToggleLinks,
    loginEmail, loginPassword, registerEmail, registerPassword,
    loginPasswordToggle, registerPasswordToggle,
    userInfo, userEmailSpan, userRoleSpan, logoutBtn,
    addOrderForm, orderType, orderName, orderRef, orderDate,
    expenseTableBody, incomeTableBody, filterSearch, filterDate, filterSort,
    clearFiltersBtn, adminPanelBtn, adminPanel, usersTableBody,
    closeAdminPanelBtn, toggleThemeBtn, sunIcon, moonIcon,
    exportBtn, exportDropdown, exportCsvBtn, exportPdfBtn,
    bulkDeleteBtn, checkAllExpense, checkAllIncome;


// --- 7. تشغيل التطبيق بعد تحميل الصفحة ---
// (!!! هذا هو الإصلاح !!!)
document.addEventListener('DOMContentLoaded', () => {
    
    // --- الخطوة 7أ: ربط كل العناصر الآن ---
    loadingSpinner = document.getElementById('loading-spinner');
    appContent = document.getElementById('app-content');
    authScreen = document.getElementById('auth-screen');
    mainApp = document.getElementById('main-app');
    loginForm = document.getElementById('login-form');
    registerForm = document.getElementById('register-form');
    authToggleLinks = document.querySelectorAll('.auth-toggle');
    loginEmail = document.getElementById('login-email');
    loginPassword = document.getElementById('login-password');
    registerEmail = document.getElementById('register-email');
    registerPassword = document.getElementById('register-password');
    loginPasswordToggle = document.getElementById('login-password-toggle');
    registerPasswordToggle = document.getElementById('register-password-toggle');
    userInfo = document.getElementById('user-info');
    userEmailSpan = document.getElementById('user-email');
    userRoleSpan = document.getElementById('user-role');
    logoutBtn = document.getElementById('logout-btn');
    addOrderForm = document.getElementById('add-order-form');
    orderType = document.getElementById('order-type');
    orderName = document.getElementById('order-name');
    orderRef = document.getElementById('order-ref');
    orderDate = document.getElementById('order-date');
    expenseTableBody = document.getElementById('expense-table-body');
    incomeTableBody = document.getElementById('income-table-body');
    filterSearch = document.getElementById('filter-search');
    filterDate = document.getElementById('filter-date');
    filterSort = document.getElementById('filter-sort');
    clearFiltersBtn = document.getElementById('clear-filters-btn');
    adminPanelBtn = document.getElementById('admin-panel-btn');
    adminPanel = document.getElementById('admin-panel');
    usersTableBody = document.getElementById('users-table-body');
    closeAdminPanelBtn = document.getElementById('close-admin-panel-btn');
    toggleThemeBtn = document.getElementById('toggle-theme-btn');
    sunIcon = document.getElementById('sun-icon');
    moonIcon = document.getElementById('moon-icon');
    exportBtn = document.getElementById('export-btn');
    exportDropdown = document.getElementById('export-dropdown');
    exportCsvBtn = document.getElementById('export-csv-btn');
    exportPdfBtn = document.getElementById('export-pdf-btn');
    bulkDeleteBtn = document.getElementById('bulk-delete-btn');
    checkAllExpense = document.getElementById('check-all-expense');
    checkAllIncome = document.getElementById('check-all-income');
    
    // --- الخطوة 7ب: تشغيل التطبيق ---
    try {
        initializeAppAndAuth();
        setupEventListeners();
        initTheme();
    } catch (error) {
        console.error("Fatal Error initializing app:", error);
        if (loadingSpinner) {
            loadingSpinner.innerHTML = "حدث خطأ فادح. يرجى تحديث الصفحة.";
        }
    }
});


// --- 8. الوظائف الأساسية ---

// تهيئة Firebase
async function initializeAppAndAuth() {
// ... existing code ... -->
        console.error("Firebase Init Error:", error);
        if (loadingSpinner) {
            loadingSpinner.innerHTML = "فشل الاتصال بقاعدة البيانات. تأكد من صحة بيانات الاتصال.";
        }
    }
}
// ... existing code ... -->
function hideLoadingSpinner() {
    if (loadingSpinner) {
        loadingSpinner.classList.add('opacity-0', 'pointer-events-none');
// ... existing code ... -->
    if (appContent) {
        appContent.classList.remove('opacity-0');
    }
}
// ... existing code ... -->
// --- 9. ربط الأحداث (Event Listeners) ---
function setupEventListeners() {

    // (شاشات الدخول والتسجيل)
// ... existing code ... -->
    checkAllIncome.addEventListener('change', (e) => {
        toggleCheckAll(e.target.checked, 'income');
    });

} // --- نهاية setupEventListeners ---
// ... existing code ... -->
// --- 10. وظائف مساعدة (التصدير) ---

// إظهار وإخفاء قايمة التصدير
// ... existing code ... -->
// تصدير PDF (تقرير)
exportPdfBtn.addEventListener('click', async (e) => { // <-- 1. أضفنا async
    e.preventDefault();
// ... existing code ... -->
    showToast('جاري إنشاء ملف الـ PDF...');
    // ---------------------------------

    const { jsPDF } = window.jspdf;
// ... existing code ... -->
    doc.setFont('Amiri', 'normal');
    // !!! -------------------------- !!!

    // فصل البيانات
// ... existing code ... -->
// --- 11. وظائف جلب البيانات (Real-time) ---

// جلب صلاحيات المستخدم
function listenToUserRole(uid) {
// ... existing code ... -->
        // بدء جلب الأوردرات بعد معرفة الصلاحية
        listenToOrders();
    });
}
// ... existing code ... -->
// --- 12. وظائف رسم الجداول (Rendering) ---

// فلترة وترتيب البيانات
function getFilteredAndSortedData() {
// ... existing code ... -->
    return filtered;
}

// رسم الجداول (مصروفات واستلامات)
function renderTables() {
// ... existing code ... -->
    if (!expenseTableBody || !incomeTableBody) return; // تأكد من أن العناصر موجودة

    const filteredData = getFilteredAndSortedData();
// ... existing code ... -->
    checkAllExpense.checked = false;
    checkAllIncome.checked = false;
}
// ... existing code ... -->
// --- 13. وظائف تفاعلية (Interactions) ---

// تفعيل الأزرار داخل الجداول
function setupTableInteractions() {
// ... existing code ... -->
    });
}

// (تحديث زرار المسح المجمع)
function updateBulkDeleteButton() {
    if (!bulkDeleteBtn) return; // إضافة فحص للتأكد
    
    if (userRole === 'admin' && selectedOrders.size > 0) {
        bulkDeleteBtn.classList.remove('hidden', 'opacity-0', 'scale-90');
// ... existing code ... -->
// --- 14. وظائف إضافية ---

// (الوضع الليلي)
function initTheme() {
// ... existing code ... -->
    if (!orderDate) return;
    const today = new Date();
    const yyyy = today.getFullYear();
// ... existing code ... -->


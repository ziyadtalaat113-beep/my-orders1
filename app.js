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

// --- 6. ربط عناصر الصفحة (DOM Elements) ---
// تم إزالة 'DOMContentLoaded' والربط مباشرة
// لأن 'type="module"' يؤجل التنفيذ تلقائياً
const loadingSpinner = document.getElementById('loading-spinner');
const appContent = document.getElementById('app-content');
// ... existing code ... -->
const checkAllExpense = document.getElementById('check-all-expense');
const checkAllIncome = document.getElementById('check-all-income');


// --- 7. تشغيل التطبيق ---
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


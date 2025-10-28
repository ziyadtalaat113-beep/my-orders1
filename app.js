// --- 1. استيراد المكتبات (لازم يكون أول حاجة) ---
import { initializeApp } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-app.js";
import { 
    getAuth, 
    onAuthStateChanged, 
    createUserWithEmailAndPassword, 
    signInWithEmailAndPassword, 
    signOut 
} from "https://www.gstatic.com/firebasejs/11.6.1/firebase-auth.js";
import { 
    getFirestore, 
    doc, 
    getDoc, 
    setDoc, 
    addDoc, 
    updateDoc, 
    deleteDoc, 
    onSnapshot, 
    collection, 
    query,
    writeBatch,
    enableIndexedDbPersistence 
} from "https://www.gstatic.com/firebasejs/11.6.1/firebase-firestore.js";

// --- ⭐️ الخطوة 1: تعريف هوية الأدمن الرئيسي ⭐️ ---
// !!! اكتب إيميلك اللي هتسجل بيه أول مرة هنا !!!
const SUPER_ADMIN_EMAIL = "ziyad@order.com";
// ----------------------------------------------------

// --- 2. بيانات الاتصال الخاصة بك (مهم جداً) ---
// !!! انسخ كود firebaseConfig اللي جبته من موقع فايربيز وحطه هنا !!!
const firebaseConfig = {
    apiKey: "AIzaSyDWWBIZqHdy36GYfR1L4_BFFs4c18TXY2E",
    authDomain: "order-c7dd2.firebaseapp.com",
    projectId: "order-c7dd2",
    storageBucket: "order-c7dd2.firebasestorage.app",
    messagingSenderId: "741648683831",
    appId: "1:741648683831:web:d768d0076ce51510c280b2",
    measurementId: "G-2S1R8BMLCH"
};
// ----------------------------------------------------

// --- ⭐️ الخطوة 3: تعريف المتغيرات الأساسية ⭐️ ---
const appId = "my-order-tracker"; // اسم ثابت للتطبيق (لا تغيره)
// ----------------------------------------------------

// --- ⭐️ الخطوة 4: وظيفة تحميل الخط العربي ⭐️ ---
// (لأن ملف الخط كبير، نقوم بطلبه عند الحاجة فقط)
let amiriFontBase64 = null;
async function loadFontAsBase64(url) {
    try {
        if (amiriFontBase64) return amiriFontBase64; // لو تم تحميله من قبل
        const response = await fetch(url);
        if (!response.ok) throw new Error('Network response was not ok');
        const blob = await response.blob();
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onloadend = () => {
                amiriFontBase64 = reader.result.split(',')[1]; // تخزين الخط لاستخدامه مرة أخرى
                resolve(amiriFontBase64);
            };
            reader.onerror = reject;
            reader.readAsDataURL(blob);
        });
    } catch (error) {
        console.error('Failed to fetch font:', error);
        return null;
    }
}
// ----------------------------------------------------


// --- 5. تهيئة Firebase وربط العناصر ---
// متغيرات عامة
let db, auth;
let userId;
let userRole = 'guest'; // 'guest' or 'admin'
let allOrders = [];
let allUsers = []; // Local cache for admin panel
const selectedOrders = new Set();
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
// (!!! هذا هو الإصلاح لمشكلة "جاري التحميل" !!!)
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
    try {
        const app = initializeApp(firebaseConfig);
        db = getFirestore(app);
        auth = getAuth(app);
        
        // تفعيل التخزين المحلي (Offline)
        await enableIndexedDbPersistence(db);

        // مراقبة حالة تسجيل الدخول
        onAuthStateChanged(auth, (user) => {
            if (user) {
                // المستخدم سجل دخوله
                userId = user.uid;
                userEmailSpan.textContent = user.email;
                listenToUserRole(user.uid); // جلب صلاحيات المستخدم
                listenToAdminUsers(); // جلب قايمة المستخدمين (للأدمن)
                showMainApp(); // إظهار التطبيق الرئيسي
            } else {
                // المستخدم سجل خروجه
                userId = null;
                userRole = 'guest';
                if (ordersUnsubscribe) ordersUnsubscribe(); // إيقاف مراقبة الأوردرات
                if (usersUnsubscribe) usersUnsubscribe(); // إيقاف مراقبة المستخدمين
                allOrders = [];
                allUsers = [];
                renderTables();
                showAuthScreen(); // إظهار شاشة الدخول
            }
        });

    } catch (error) {
        console.error("Firebase Init Error:", error);
        if (loadingSpinner) {
            loadingSpinner.innerHTML = "فشل الاتصال بقاعدة البيانات. تأكد من صحة بيانات الاتصال.";
        }
    }
}

// إظهار شاشة الدخول وإخفاء التحميل
function showAuthScreen() {
    if (authScreen) authScreen.classList.add('hidden');
    if (mainApp) mainApp.classList.add('hidden');
    hideLoadingSpinner();
}

// إظهار التطبيق الرئيسي وإخفاء التحميل
function showMainApp() {
    if (mainApp) mainApp.classList.remove('hidden');
    if (authScreen) authScreen.classList.add('hidden');
    setDefaultDate();
    hideLoadingSpinner();
}

// إخفاء شاشة "جاري التحميل"
function hideLoadingSpinner() {
    if (loadingSpinner) {
        loadingSpinner.classList.add('opacity-0', 'pointer-events-none');
    }
    if (appContent) {
        appContent.classList.remove('opacity-0');
    }
}

// عرض رسالة مؤقتة (Toast)
function showToast(message, isError = false) {
    const toast = document.createElement('div');
    toast.textContent = message;
    toast.className = `fixed bottom-5 right-5 p-4 rounded-lg shadow-lg text-white transition-all duration-300 transform translate-x-full ${isError ? 'bg-red-600' : 'bg-green-600'}`;
    document.body.appendChild(toast);

    // Animate in
    setTimeout(() => {
        toast.classList.remove('translate-x-full');
    }, 100);

    // Animate out
    setTimeout(() => {
        toast.classList.add('translate-x-full');
        setTimeout(() => toast.remove(), 300);
    }, 3000);
}


// --- 9. ربط الأحداث (Event Listeners) ---
function setupEventListeners() {

    // (شاشات الدخول والتسجيل)
    authToggleLinks.forEach(link => {
        link.addEventListener('click', (e) => {
            e.preventDefault();
            loginForm.classList.toggle('hidden');
            registerForm.classList.toggle('hidden');
        });
    });

    loginForm.addEventListener('submit', (e) => {
        e.preventDefault();
        handleLogin();
    });

    registerForm.addEventListener('submit', (e) => {
        e.preventDefault();
        handleRegister();
    });

    logoutBtn.addEventListener('click', () => {
        signOut(auth);
    });

    // (إظهار/إخفاء كلمة المرور)
    loginPasswordToggle.addEventListener('click', () => {
        togglePasswordVisibility(loginPassword, loginPasswordToggle);
    });
    registerPasswordToggle.addEventListener('click', () => {
        togglePasswordVisibility(registerPassword, registerPasswordToggle);
    });

    // (إضافة أوردر)
    addOrderForm.addEventListener('submit', (e) => {
        e.preventDefault();
        handleAddOrder();
    });

    // (الفلاتر والترتيب)
    filterSearch.addEventListener('input', renderTables);
    filterDate.addEventListener('change', renderTables);
    filterSort.addEventListener('change', renderTables);
    clearFiltersBtn.addEventListener('click', () => {
        filterSearch.value = '';
        filterDate.value = '';
        filterSort.value = 'date-desc';
        renderTables();
    });

    // (لوحة تحكم الأدمن)
    adminPanelBtn.addEventListener('click', () => {
        adminPanel.classList.remove('hidden');
    });
    closeAdminPanelBtn.addEventListener('click', () => {
        adminPanel.classList.add('hidden');
    });

    // (الوضع الليلي)
    toggleThemeBtn.addEventListener('click', toggleTheme);
    
    // (التصدير)
    exportBtn.addEventListener('click', (e) => {
        e.preventDefault();
        exportDropdown.classList.toggle('hidden');
        exportDropdown.classList.toggle('opacity-0', exportDropdown.classList.contains('hidden'));
        exportDropdown.classList.toggle('scale-95', exportDropdown.classList.contains('hidden'));
    });
    exportCsvBtn.addEventListener('click', exportCSV);
    exportPdfBtn.addEventListener('click', exportPDF);
    // إخفاء القائمة عند الضغط خارجها
    document.addEventListener('click', (e) => {
        if (!exportBtn.contains(e.target) && !exportDropdown.contains(e.target)) {
            exportDropdown.classList.add('hidden', 'opacity-0', 'scale-95');
        }
    });

    // (المسح المجمع)
    bulkDeleteBtn.addEventListener('click', handleBulkDelete);
    
    // (تحديد الكل)
    checkAllExpense.addEventListener('change', (e) => {
        toggleCheckAll(e.target.checked, 'expense');
    });
    checkAllIncome.addEventListener('change', (e) => {
        toggleCheckAll(e.target.checked, 'income');
    });

} // --- نهاية setupEventListeners ---


// --- 10. وظائف مساعدة (التصدير) ---

// تصدير CSV
function exportCSV(e) {
    e.preventDefault();
    exportDropdown.classList.add('hidden', 'opacity-0', 'scale-95');
    const dataToExport = getFilteredAndSortedData();
    if (dataToExport.length === 0) {
        showToast("لا توجد بيانات لتصديرها.", true);
        return;
    }

    let csvContent = "data:text/csv;charset=utf-8,\uFEFF"; // \uFEFF for BOM to support Arabic in Excel
    csvContent += "النوع,الاسم (عميل/مورد),الرقم المرجعي,التاريخ,الحالة\n";

    dataToExport.forEach(order => {
        const row = [
            order.type === 'expense' ? "مصروف" : "استلام",
            order.name.replace(/,/g, ''), // Remove commas
            order.ref,
            order.date,
            order.status === 'completed' ? "مكتمل" : "معلق"
        ].join(",");
        csvContent += row + "\r\n";
    });

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `orders_export_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    showToast("تم تصدير ملف CSV بنجاح!");
}

// تصدير PDF (تقرير)
async function exportPDF(e) { // <-- 1. أضفنا async
    e.preventDefault();
    exportDropdown.classList.add('hidden', 'opacity-0', 'scale-95');
    const dataToExport = getFilteredAndSortedData();
    if (dataToExport.length === 0) {
        showToast("لا توجد بيانات لتصديرها.", true);
        return;
    }

    // --- 2. تحميل الخط أولاً ---
    showToast('جاري تحميل الخطوط لملف الـ PDF...');
    const fontBase64 = await loadFontAsBase64('https://raw.githubusercontent.com/google/fonts/main/ofl/amiri/Amiri-Regular.ttf');
    if (!fontBase64) {
        showToast('فشل تحميل الخط، لا يمكن إنشاء PDF.', true);
        return;
    }
    showToast('جاري إنشاء ملف الـ PDF...');
    // ---------------------------------

    const { jsPDF } = window.jspdf;
    const doc = new jsPDF();
    
    // !!! --- إصلاح الخط العربي --- !!!
    try {
        doc.addFileToVFS('Amiri-Regular.ttf', fontBase64);
        doc.addFont('Amiri-Regular.ttf', 'Amiri', 'normal');
        doc.setFont('Amiri', 'normal');
    } catch (err) {
        console.error("PDF Font Error:", err);
        showToast("خطأ في إضافة الخط للـ PDF.", true);
    }
    // !!! -------------------------- !!!

    // فصل البيانات
    const expenseOrders = dataToExport.filter(o => o.type === 'expense');
    const incomeOrders = dataToExport.filter(o => o.type === 'income');

    // إعدادات الجدول
    const fontStyles = { font: "Amiri", halign: 'right' };
    const headerStyles = { fillColor: [41, 128, 185], textColor: 255, font: "Amiri", halign: 'right' };

    // العنوان الرئيسي
    doc.setFontSize(18);
    doc.text("تقرير الأوردرات", 105, 20, { align: 'center' });
    
    doc.setFontSize(10);
    doc.text(`تاريخ التقرير: ${new Date().toLocaleDateString('ar-EG')}`, 105, 28, { align: 'center' });
    
    let startY = 40;

    // جدول المصروفات
    if (expenseOrders.length > 0) {
        doc.setFontSize(14);
        doc.text("سجل المصروفات (لعميل)", 200, startY, { align: 'right' });
        startY += 5;

        const expenseBody = expenseOrders.map(o => [
            o.name,
            o.ref,
            o.date,
            o.status === 'completed' ? "مكتمل" : "معلق"
        ]);
        const expenseHead = [['العميل', 'الرقم المرجعي', 'التاريخ', 'الحالة']];

        doc.autoTable({
            head: expenseHead,
            body: expenseBody,
            startY: startY,
            theme: 'grid',
            styles: fontStyles,
            headStyles: headerStyles,
            bodyStyles: { halign: 'right' },
            didDrawPage: (data) => {
                doc.setFont("Amiri", "normal"); // إعادة تعيين الخط بعد كل صفحة
            }
        });
        startY = doc.autoTable.previous.finalY + 15;
    }
    
    // جدول الاستلامات
    if (incomeOrders.length > 0) {
         doc.setFontSize(14);
         doc.text("سجل الاستلامات (من مورد)", 200, startY, { align: 'right' });
         startY += 5;

         const incomeBody = incomeOrders.map(o => [
            o.name,
            o.ref,
            o.date,
            o.status === 'completed' ? "مكتمل" : "معلق"
        ]);
        const incomeHead = [['المورد', 'الرقم المرجعي', 'التاريخ', 'الحالة']];

         doc.autoTable({
            head: incomeHead,
            body: incomeBody,
            startY: startY,
            theme: 'grid',
            styles: fontStyles,
            headStyles: headerStyles,
            bodyStyles: { halign: 'right' },
            didDrawPage: (data) => {
                doc.setFont("Amiri", "normal"); // إعادة تعيين الخط بعد كل صفحة
            }
         });
    }

    // الحفظ
    doc.save(`orders_report_${new Date().toISOString().split('T')[0]}.pdf`);
    showToast("تم تصدير ملف PDF بنجاح!");
}


// --- 11. وظائف جلب البيانات (Real-time) ---

// جلب صلاحيات المستخدم
function listenToUserRole(uid) {
    const userDocRef = doc(db, `artifacts/${appId}/users`, uid);
    
    // مراقبة صلاحيات المستخدم
    onSnapshot(userDocRef, (docSnap) => {
        if (docSnap.exists() && docSnap.data().role) {
            userRole = docSnap.data().role;
            console.log("User role updated:", userRole);
        } else {
            // هذا مستخدم جديد (لم يسجل صلاحيته بعد)
            userRole = 'guest'; // افتراضي
            console.log("User role not found, defaulting to guest.");
        }
        
        // تحديث الواجهة بناءً على الصلاحية
        updateUIForRole();
        
        // بدء جلب الأوردرات (فقط بعد معرفة الصلاحية)
        if (!ordersUnsubscribe) { // التأكد من أنه لم يبدأ من قبل
             listenToOrders();
        }
    }, (error) => {
        console.error("Error listening to user role:", error);
        userRole = 'guest'; // في حالة الخطأ، اعتبره ضيف
        updateUIForRole();
        if (!ordersUnsubscribe) {
            listenToOrders();
        }
    });
}

// جلب الأوردرات
function listenToOrders() {
    const ordersColRef = collection(db, `artifacts/${appId}/orders`);
    
    if (ordersUnsubscribe) ordersUnsubscribe(); // إيقاف المراقبة القديمة إذا كانت موجودة

    ordersUnsubscribe = onSnapshot(ordersColRef, (snapshot) => {
        allOrders = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        console.log(`Fetched ${allOrders.length} orders.`);
        renderTables();
    }, (error) => {
        console.error("Error fetching orders:", error);
        showToast("خطأ في جلب الأوردرات: " + error.message, true);
    });
}

// جلب المستخدمين (للأدمن)
function listenToAdminUsers() {
    if (userRole !== 'admin') {
        if (usersUnsubscribe) usersUnsubscribe(); // إيقاف المراقبة إذا لم يعد أدمن
        usersUnsubscribe = null;
        allUsers = [];
        renderAdminPanel(); // إفراغ الجدول
        return;
    }

    const usersColRef = collection(db, `artifacts/${appId}/users`);
    
    if (usersUnsubscribe) return; // المراقبة شغالة بالفعل

    usersUnsubscribe = onSnapshot(usersColRef, (snapshot) => {
        allUsers = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        renderAdminPanel();
    }, (error) => {
        console.error("Error fetching users:", error);
    });
}

// --- 12. وظائف رسم الجداول (Rendering) ---

// فلترة وترتيب البيانات
function getFilteredAndSortedData() {
    let filtered = [...allOrders];

    // الفلترة بالبحث
    const searchTerm = filterSearch.value.toLowerCase();
    if (searchTerm) {
        filtered = filtered.filter(o => 
            o.name.toLowerCase().includes(searchTerm) || 
            o.ref.toLowerCase().includes(searchTerm)
        );
    }

    // الفلترة بالتاريخ
    const filterDateValue = filterDate.value;
    if (filterDateValue) {
        filtered = filtered.filter(o => o.date === filterDateValue);
    }

    // الترتيب
    const sortValue = filterSort.value;
    filtered.sort((a, b) => {
        switch (sortValue) {
            case 'date-asc':
                return new Date(a.date) - new Date(b.date);
            case 'name-asc':
                return a.name.localeCompare(b.name, 'ar');
            case 'name-desc':
                return b.name.localeCompare(a.name, 'ar');
            case 'ref-asc':
                return a.ref.localeCompare(b.ref, 'ar');
            case 'ref-desc':
                return b.ref.localeCompare(a.ref, 'ar');
            case 'date-desc':
            default:
                return new Date(b.date) - new Date(a.date);
        }
    });

    return filtered;
}

// رسم الجداول (مصروفات واستلامات)
function renderTables() {
    
    if (!expenseTableBody || !incomeTableBody) return; // تأكد من أن العناصر موجودة

    const filteredData = getFilteredAndSortedData();

    const expenseHtml = filteredData
        .filter(o => o.type === 'expense')
        .map(createOrderRowHtml)
        .join('');
    
    const incomeHtml = filteredData
        .filter(o => o.type === 'income')
        .map(createOrderRowHtml)
        .join('');

    expenseTableBody.innerHTML = expenseHtml || `<tr><td colspan="6" class="p-4 text-center text-gray-400">لا توجد مصروفات.</td></tr>`;
    incomeTableBody.innerHTML = incomeHtml || `<tr><td colspan="6" class="p-4 text-center text-gray-400">لا توجد استلامات.</td></tr>`;
    
    // (تحديث حالة "تحديد الكل")
    checkAllExpense.checked = false;
    checkAllIncome.checked = false;
    
    // (تحديث زرار المسح المجمع)
    updateBulkDeleteButton();
    
    // (إضافة التفاعلات للأزرار الجديدة)
    setupTableInteractions();
}

// إنشاء سطر HTML لكل أوردر
function createOrderRowHtml(order) {
    const isCompleted = order.status === 'completed';
    const statusColor = isCompleted ? 'bg-green-100 dark:bg-green-900' : 'bg-yellow-100 dark:bg-yellow-900';
    const nameLabel = order.type === 'expense' ? 'العميل' : 'المورد';
    const rowSelectedClass = selectedOrders.has(order.id) ? 'bg-blue-100 dark:bg-blue-900' : '';
    const checkboxHtml = userRole === 'admin' ? 
        `<td class="p-3"><input type="checkbox" data-id="${order.id}" class="order-checkbox form-checkbox rounded" ${selectedOrders.has(order.id) ? 'checked' : ''}></td>` : 
        '';
    const statusButtonHtml = userRole === 'admin' ?
        `<button data-id="${order.id}" data-status="${order.status}" class="status-toggle-btn p-2 rounded-full transition-all duration-200 ${isCompleted ? 'bg-green-500 hover:bg-green-600' : 'bg-yellow-400 hover:bg-yellow-500'}">
            <svg class="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"></path></svg>
        </button>` :
        (isCompleted ? "مكتمل" : "معلق");

    return `
        <tr id="order-${order.id}" class="border-b border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-750 transition-colors duration-150 ${statusColor} ${rowSelectedClass}">
            ${checkboxHtml}
            <td class="p-3" data-label="${nameLabel}">${order.name}</td>
            <td class="p-3" data-label="الرقم المرجعي">${order.ref}</td>
            <td class="p-3" data-label="التاريخ">${order.date}</td>
            <td class="p-3 text-center" data-label="الحالة">
                ${statusButtonHtml}
            </td>
        </tr>
    `;
}


// (رسم لوحة تحكم الأدمن)
function renderAdminPanel() {
    if (!usersTableBody) return;

    if (userRole !== 'admin') {
        usersTableBody.innerHTML = `<tr><td colspan="3" class="p-4 text-center text-gray-400">ليس لديك صلاحية.</td></tr>`;
        return;
    }

    const usersHtml = allUsers.map(user => {
        const isSelf = user.id === userId;
        const role = user.role || 'guest';
        
        const roleSelectHtml = isSelf ? 
            `<span class="font-bold text-blue-500">أدمن رئيسي (أنت)</span>` :
            `<select data-id="${user.id}" class="role-select form-select rounded bg-gray-100 dark:bg-gray-700 border-gray-300 dark:border-gray-600">
                <option value="guest" ${role === 'guest' ? 'selected' : ''}>ضيف (Guest)</option>
                <option value="admin" ${role === 'admin' ? 'selected' : ''}>أدمن (Admin)</option>
            </select>`;

        return `
            <tr class="border-b border-gray-200 dark:border-gray-700">
                <td class="p-3" data-label="الإيميل">${user.email}</td>
                <td class="p-3" data-label="الصلاحية">${role}</td>
                <td class="p-3" data-label="تغيير الصلاحية">
                    ${roleSelectHtml}
                </td>
            </tr>
        `;
    }).join('');
    
    usersTableBody.innerHTML = usersHtml;
    
    // إضافة الأحداث لقايمة تغيير الصلاحيات
    document.querySelectorAll('.role-select').forEach(select => {
        select.addEventListener('change', (e) => {
            const newRole = e.target.value;
            const targetUserId = e.target.dataset.id;
            handleChangeUserRole(targetUserId, newRole);
        });
    });
}

// (تحديث الواجهة بناءً على صلاحية المستخدم)
function updateUIForRole() {
    const adminOnlyElements = [
        addOrderForm, 
        adminPanelBtn, 
        bulkDeleteBtn,
        checkAllExpense, 
        checkAllIncome
    ];
    
    if (userRole === 'admin') {
        userRoleSpan.textContent = "أدمن";
        userRoleSpan.className = "px-2 py-0.5 text-xs bg-green-200 text-green-800 rounded-full dark:bg-green-700 dark:text-green-100";
        adminOnlyElements.forEach(el => el?.classList.remove('hidden'));
    } else {
        userRoleSpan.textContent = "ضيف";
        userRoleSpan.className = "px-2 py-0.5 text-xs bg-gray-200 text-gray-800 rounded-full dark:bg-gray-600 dark:text-gray-100";
        adminOnlyElements.forEach(el => el?.classList.add('hidden'));
        adminPanel.classList.add('hidden'); // إخفاء لوحة الأدمن إذا كانت مفتوحة
    }
    
    // إعادة رسم الجداول لإظهار/إخفاء أزرار التحكم
    renderTables();
}


// --- 13. وظائف تفاعلية (Interactions) ---

// (تسجيل الدخول)
async function handleLogin() {
    const email = loginEmail.value;
    const password = loginPassword.value;
    try {
        await signInWithEmailAndPassword(auth, email, password);
        showToast("تم تسجيل الدخول بنجاح!");
        loginForm.reset();
    } catch (error) {
        console.error("Login Error:", error);
        showToast(getFriendlyAuthError(error.code), true);
    }
}

// (إنشاء حساب جديد)
async function handleRegister() {
    const email = registerEmail.value;
    const password = registerPassword.value;
    
    // (تحديد الصلاحية)
    const role = (email.toLowerCase() === SUPER_ADMIN_EMAIL.toLowerCase()) ? 'admin' : 'guest';
    
    try {
        const userCredential = await createUserWithEmailAndPassword(auth, email, password);
        const user = userCredential.user;
        
        // (حفظ بيانات المستخدم (مثل الصلاحية) في Firestore)
        const userDocRef = doc(db, `artifacts/${appId}/users`, user.uid);
        await setDoc(userDocRef, {
            email: user.email,
            role: role
        });
        
        showToast("تم إنشاء الحساب وتسجيل الدخول بنجاح!");
        registerForm.reset();

    } catch (error) {
        console.error("Register Error:", error);
        showToast(getFriendlyAuthError(error.code), true);
    }
}

// (إضافة أوردر جديد)
async function handleAddOrder() {
    const type = orderType.value;
    const name = orderName.value.trim();
    const ref = orderRef.value.trim() || 'N/A';
    const date = orderDate.value;

    if (!name || !date) {
        showToast("يرجى ملء الاسم والتاريخ.", true);
        return;
    }

    try {
        const ordersColRef = collection(db, `artifacts/${appId}/orders`);
        await addDoc(ordersColRef, {
            type: type,
            name: name,
            ref: ref,
            date: date,
            status: 'pending', // 'pending' or 'completed'
            addedBy: userId 
        });
        
        showToast("تمت إضافة الأوردر بنجاح!");
        addOrderForm.reset();
        setDefaultDate(); // إعادة تعيين التاريخ لليوم

    } catch (error) {
        console.error("Error adding order: ", error);
        showToast("حدث خطأ أثناء إضافة الأوردر: " + error.message, true);
    }
}

// (تغيير صلاحية مستخدم)
async function handleChangeUserRole(targetUserId, newRole) {
    if (userRole !== 'admin' || userId === targetUserId) {
        showToast("ليس لديك الصلاحية.", true);
        return;
    }
    
    try {
        const userDocRef = doc(db, `artifacts/${appId}/users`, targetUserId);
        await updateDoc(userDocRef, {
            role: newRole
        });
        showToast("تم تحديث الصلاحية بنجاح!");
    } catch (error) {
        console.error("Error updating role:", error);
        showToast("خطأ في تحديث الصلاحية.", true);
        renderAdminPanel(); // إعادة الرسم للحالة الأصلية
    }
}

// (تغيير حالة الأوردر)
async function handleToggleStatus(orderId, currentStatus) {
    if (userRole !== 'admin') return;
    
    const newStatus = (currentStatus === 'pending') ? 'completed' : 'pending';
    const orderDocRef = doc(db, `artifacts/${appId}/orders`, orderId);
    
    try {
        await updateDoc(orderDocRef, {
            status: newStatus
        });
        // (سيتم تحديث الواجهة تلقائياً بفضل onSnapshot)
    } catch (error) {
        console.error("Error toggling status:", error);
        showToast("خطأ في تحديث الحالة.", true);
    }
}

// (المسح المجمع)
async function handleBulkDelete() {
    if (userRole !== 'admin' || selectedOrders.size === 0) {
        return;
    }

    // (استخدام custom confirm modal)
    showConfirmModal(`هل أنت متأكد من مسح ${selectedOrders.size} أوردر؟ لا يمكن التراجع عن هذا الإجراء.`, async () => {
        try {
            const batch = writeBatch(db);
            selectedOrders.forEach(orderId => {
                const docRef = doc(db, `artifacts/${appId}/orders`, orderId);
                batch.delete(docRef);
            });
            
            await batch.commit();
            
            showToast(`تم مسح ${selectedOrders.size} أوردر بنجاح!`);
            selectedOrders.clear();
            renderTables(); // لإعادة رسم الجداول
            
        } catch (error) {
            console.error("Error bulk deleting orders:", error);
            showToast("حدث خطأ أثناء المسح: " + error.message, true);
        }
    });
}


// (تفعيل الأزرار داخل الجداول)
function setupTableInteractions() {
    // (تغيير الحالة)
    document.querySelectorAll('.status-toggle-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            const id = e.currentTarget.dataset.id;
            const status = e.currentTarget.dataset.status;
            handleToggleStatus(id, status);
        });
    });

    // (تحديد Checkbox)
    document.querySelectorAll('.order-checkbox').forEach(box => {
        box.addEventListener('change', (e) => {
            const id = e.target.dataset.id;
            if (e.target.checked) {
                selectedOrders.add(id);
                document.getElementById(`order-${id}`).classList.add('bg-blue-100', 'dark:bg-blue-900');
            } else {
                selectedOrders.delete(id);
                document.getElementById(`order-${id}`).classList.remove('bg-blue-100', 'dark:bg-blue-900');
            }
            updateBulkDeleteButton();
        });
    });
}

// (تحديد الكل)
function toggleCheckAll(checked, type) {
    const rows = (type === 'expense') ? 
        expenseTableBody.querySelectorAll('tr') : 
        incomeTableBody.querySelectorAll('tr');
        
    rows.forEach(row => {
        const checkbox = row.querySelector('.order-checkbox');
        if (checkbox) {
            checkbox.checked = checked;
            const id = checkbox.dataset.id;
            if (checked) {
                selectedOrders.add(id);
                row.classList.add('bg-blue-100', 'dark:bg-blue-900');
            } else {
                selectedOrders.delete(id);
                row.classList.remove('bg-blue-100', 'dark:bg-blue-900');
            }
        }
    });
    updateBulkDeleteButton();
}


// (تحديث زرار المسح المجمع)
function updateBulkDeleteButton() {
    if (!bulkDeleteBtn) return; // إضافة فحص للتأكد
    
    if (userRole === 'admin' && selectedOrders.size > 0) {
        bulkDeleteBtn.classList.remove('hidden', 'opacity-0', 'scale-90');
        bulkDeleteBtn.querySelector('span').textContent = `(${selectedOrders.size})`;
    } else {
        bulkDeleteBtn.classList.add('hidden', 'opacity-0', 'scale-90');
        bulkDeleteBtn.querySelector('span').textContent = '(0)';
    }
}


// --- 14. وظائف إضافية ---

// (الوضع الليلي)
function initTheme() {
    if (localStorage.theme === 'dark' || (!('theme' in localStorage) && window.matchMedia('(prefers-color-scheme: dark)').matches)) {
        document.documentElement.classList.add('dark');
        moonIcon.classList.add('hidden');
        sunIcon.classList.remove('hidden');
    } else {
        document.documentElement.classList.remove('dark');
        moonIcon.classList.remove('hidden');
        sunIcon.classList.add('hidden');
    }
}

function toggleTheme() {
    const isDark = document.documentElement.classList.toggle('dark');
    localStorage.theme = isDark ? 'dark' : 'light';
    moonIcon.classList.toggle('hidden', isDark);
    sunIcon.classList.toggle('hidden', !isDark);
}

// (إظهار/إخفاء كلمة المرور)
function togglePasswordVisibility(inputElement, toggleElement) {
    const type = inputElement.getAttribute('type') === 'password' ? 'text' : 'password';
    inputElement.setAttribute('type', type);
    // (تغيير الأيقونة)
    const icon = toggleElement.querySelector('svg');
    if (type === 'password') {
        icon.innerHTML = `<path d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /><path d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-.258 1.055-.67 2.053-1.208 2.978M15 12a3 3 0 11-6 0 3 3 0 016 0z" />`;
    } else {
        icon.innerHTML = `<path d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.542-7 .844-3.14 3.1-5.64 5.922-6.756M12 12a3 3 0 100-6 3 3 0 000 6z" /><path d="M1 1l22 22" />`;
    }
}

// (تعيين تاريخ افتراضي)
function setDefaultDate() {
    if (!orderDate) return;
    const today = new Date();
    const yyyy = today.getFullYear();
    const mm = String(today.getMonth() + 1).padStart(2, '0'); // January is 0!
    const dd = String(today.getDate()).padStart(2, '0');
    orderDate.value = `${yyyy}-${mm}-${dd}`;
}

// (عرض رسائل خطأ أوضح للمستخدم)
function getFriendlyAuthError(code) {
    switch (code) {
        case 'auth/wrong-password':
            return 'كلمة المرور غير صحيحة. يرجى المحاولة مرة أخرى.';
        case 'auth/user-not-found':
            return 'لا يوجد حساب مسجل بهذا الإيميل.';
        case 'auth/email-already-in-use':
            return 'هذا الإيميل مسجل بالفعل. يرجى تسجيل الدخول.';
        case 'auth/weak-password':
            return 'كلمة المرور ضعيفة جداً. (يجب أن تكون 6 حروف على الأقل).';
        case 'auth/invalid-email':
            return 'الإيميل غير صالح. يرجى كتابته بشكل صحيح.';
        default:
            return 'حدث خطأ. يرجى المحاولة مرة أخرى.';
    }
}

// (عرض نافذة تأكيد)
function showConfirmModal(message, onConfirm) {
    // إنشاء خلفية
    const overlay = document.createElement('div');
    overlay.className = 'fixed inset-0 bg-black bg-opacity-50 dark:bg-opacity-70 flex items-center justify-center z-50 p-4 transition-opacity duration-300';
    overlay.id = 'confirm-overlay';

    // إنشاء النافذة
    const modal = document.createElement('div');
    modal.className = 'bg-white dark:bg-gray-800 rounded-lg shadow-xl p-6 w-full max-w-sm transform transition-all scale-95 opacity-0';
    modal.innerHTML = `
        <h3 class="text-lg font-bold text-gray-900 dark:text-white mb-4">تأكيد الإجراء</h3>
        <p class="text-sm text-gray-600 dark:text-gray-300 mb-6">${message}</p>
        <div class="flex justify-end space-x-2" dir="rtl">
            <button id="confirm-cancel" class="px-4 py-2 rounded-lg bg-gray-200 text-gray-800 hover:bg-gray-300 dark:bg-gray-700 dark:text-gray-200 dark:hover:bg-gray-600 transition-colors">إلغاء</button>
            <button id="confirm-ok" class="px-4 py-2 rounded-lg bg-red-600 text-white hover:bg-red-700 transition-colors">تأكيد المسح</button>
        </div>
    `;

    overlay.appendChild(modal);
    document.body.appendChild(overlay);

    // إضافة الأنيميشن
    setTimeout(() => {
        overlay.classList.add('opacity-100');
        modal.classList.remove('scale-95', 'opacity-0');
        modal.classList.add('scale-100', 'opacity-100');
    }, 10); // تأخير بسيط لبدء الأنيميشن

    // وظائف الأزرار
    const closeModal = () => {
        modal.classList.remove('scale-100', 'opacity-100');
        modal.classList.add('scale-95', 'opacity-0');
        overlay.classList.remove('opacity-100');
        setTimeout(() => overlay.remove(), 300);
    };

    document.getElementById('confirm-cancel').addEventListener('click', closeModal);
    
    document.getElementById('confirm-ok').addEventListener('click', () => {
        onConfirm(); // تنفيذ الوظيفة المطلوبة (المسح)
        closeModal();
    });
}


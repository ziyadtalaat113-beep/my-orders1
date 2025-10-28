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

// --- ⭐️ الخطوة 4: وظيفة تحميل الخط العربي (باستخدام خط Cairo) ⭐️ ---
let cairoFontBase64 = null; // تخزين الخط بعد تحميله
async function loadFontAsBase64(url) {
    try {
        if (cairoFontBase64) return cairoFontBase64; // لو تم تحميله من قبل

        const response = await fetch(url);
        if (!response.ok) throw new Error(`Network response was not ok (${response.status})`);
        const blob = await response.blob();
        
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onloadend = () => {
                const base64data = reader.result.split(',')[1];
                if (!base64data) {
                     reject(new Error("Failed to read font data as Base64"));
                     return;
                 }
                cairoFontBase64 = base64data; // تخزين الخط
                resolve(base64data);
            };
            reader.onerror = (error) => reject(error); // Pass the error object
            reader.readAsDataURL(blob);
        });
    } catch (error) {
        console.error('Failed to fetch or process font:', error);
        return null; // Return null on error
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
    
    // تأكد أن العناصر الأساسية تم ربطها
    if (!loadingSpinner || !appContent || !authScreen || !mainApp) {
        console.error("Critical DOM elements not found! App cannot start.");
        if(loadingSpinner) loadingSpinner.innerHTML = "خطأ في تحميل واجهة التطبيق. حاول تحديث الصفحة.";
        return; 
    }

    // --- الخطوة 7ب: تشغيل التطبيق ---
    try {
        initializeAppAndAuth(); // تهيئة Firebase ومراقبة الدخول
        setupEventListeners(); // ربط الأحداث للأزرار والنماذج
        initTheme(); // تهيئة الوضع الليلي/النهاري
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
        
        await enableIndexedDbPersistence(db);

        // مراقبة حالة تسجيل الدخول
        onAuthStateChanged(auth, (user) => {
            if (user) {
                // المستخدم سجل دخوله
                userId = user.uid;
                if (userEmailSpan) userEmailSpan.textContent = user.email;
                listenToUserRole(user.uid); 
                listenToAdminUsers(); 
                showMainApp(); 
            } else {
                // المستخدم سجل خروجه
                userId = null;
                userRole = 'guest';
                if (ordersUnsubscribe) ordersUnsubscribe(); 
                if (usersUnsubscribe) usersUnsubscribe(); 
                ordersUnsubscribe = null;
                usersUnsubscribe = null;
                allOrders = [];
                allUsers = [];
                renderTables();
                showAuthScreen(); // إظهار شاشة الدخول
            }
        });

    } catch (error) {
        console.error("Firebase Init Error:", error);
        if (loadingSpinner) {
            loadingSpinner.innerHTML = `فشل الاتصال بقاعدة البيانات (${error.code || error.message}). تأكد من صحة بيانات الاتصال.`;
        }
    }
}

// إظهار شاشة الدخول وإخفاء التحميل
function showAuthScreen() {
    if (authScreen) authScreen.classList.remove('hidden');
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
    if (loadingSpinner && !loadingSpinner.classList.contains('opacity-0')) {
        loadingSpinner.classList.add('opacity-0', 'pointer-events-none');
    }
    if (appContent && appContent.classList.contains('opacity-0')) {
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
    if (authToggleLinks) {
        authToggleLinks.forEach(link => {
            link.addEventListener('click', (e) => {
                e.preventDefault();
                loginForm?.classList.toggle('hidden');
                registerForm?.classList.toggle('hidden');
            });
        });
    }

    if (loginForm) loginForm.addEventListener('submit', (e) => { e.preventDefault(); handleLogin(); });
    if (registerForm) registerForm.addEventListener('submit', (e) => { e.preventDefault(); handleRegister(); });
    if (logoutBtn) logoutBtn.addEventListener('click', () => { signOut(auth); });

    // (إظهار/إخفاء كلمة المرور)
    if (loginPasswordToggle) loginPasswordToggle.addEventListener('click', () => togglePasswordVisibility(loginPassword, loginPasswordToggle));
    if (registerPasswordToggle) registerPasswordToggle.addEventListener('click', () => togglePasswordVisibility(registerPassword, registerPasswordToggle));

    // (إضافة أوردر)
    if (addOrderForm) addOrderForm.addEventListener('submit', (e) => { e.preventDefault(); handleAddOrder(); });

    // (الفلاتر والترتيب)
    if (filterSearch) filterSearch.addEventListener('input', renderTables);
    if (filterDate) filterDate.addEventListener('change', renderTables);
    if (filterSort) filterSort.addEventListener('change', renderTables);
    if (clearFiltersBtn) {
        clearFiltersBtn.addEventListener('click', () => {
            if (filterSearch) filterSearch.value = '';
            if (filterDate) filterDate.value = '';
            if (filterSort) filterSort.value = 'date-desc';
            renderTables();
        });
    }

    // (لوحة تحكم الأدمن)
    if (adminPanelBtn) adminPanelBtn.addEventListener('click', () => { adminPanel?.classList.remove('hidden'); });
    if (closeAdminPanelBtn) closeAdminPanelBtn.addEventListener('click', () => { adminPanel?.classList.add('hidden'); });

    // (الوضع الليلي)
    if (toggleThemeBtn) toggleThemeBtn.addEventListener('click', toggleTheme);
    
    // (التصدير)
    if (exportBtn) {
        exportBtn.addEventListener('click', (e) => {
            e.preventDefault();
            exportDropdown?.classList.toggle('hidden');
            exportDropdown?.classList.toggle('opacity-0', exportDropdown.classList.contains('hidden'));
            exportDropdown?.classList.toggle('scale-95', exportDropdown.classList.contains('hidden'));
        });
    }
    if (exportCsvBtn) exportCsvBtn.addEventListener('click', exportCSV);
    if (exportPdfBtn) exportPdfBtn.addEventListener('click', exportPDF);
    document.addEventListener('click', (e) => {
        if (exportBtn && exportDropdown && !exportBtn.contains(e.target) && !exportDropdown.contains(e.target)) {
            exportDropdown.classList.add('hidden', 'opacity-0', 'scale-95');
        }
    });

    // (المسح المجمع)
    if (bulkDeleteBtn) bulkDeleteBtn.addEventListener('click', handleBulkDelete);
    
    // (تحديد الكل)
    if (checkAllExpense) checkAllExpense.addEventListener('change', (e) => toggleCheckAll(e.target.checked, 'expense'));
    if (checkAllIncome) checkAllIncome.addEventListener('change', (e) => toggleCheckAll(e.target.checked, 'income'));

} // --- نهاية setupEventListeners ---


// --- 10. وظائف مساعدة (التصدير) ---

// تصدير CSV
function exportCSV(e) {
    e.preventDefault();
    if(exportDropdown) exportDropdown.classList.add('hidden', 'opacity-0', 'scale-95');
    const dataToExport = getFilteredAndSortedData();
    if (dataToExport.length === 0) {
        showToast("لا توجد بيانات لتصديرها.", true);
        return;
    }

    let csvContent = "data:text/csv;charset=utf-8,\uFEFF"; // لدعم العربي في إكسل
    csvContent += "النوع,الاسم (عميل/مورد),الرقم المرجعي,التاريخ,الحالة\n";

    dataToExport.forEach(order => {
        const row = [
            order.type === 'expense' ? "مصروف" : "استلام",
            `"${(order.name || '').replace(/"/g, '""')}"`, // Handle names with commas/quotes
            `"${(order.ref || '').replace(/"/g, '""')}"`,
            order.date || '',
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

// !!! --- إصلاح الـ PDF (استخدام خط Cairo) --- !!!
async function exportPDF(e) { 
    e.preventDefault();
    if(exportDropdown) exportDropdown.classList.add('hidden', 'opacity-0', 'scale-95');
    const dataToExport = getFilteredAndSortedData();
    if (dataToExport.length === 0) {
        showToast("لا توجد بيانات لتصديرها.", true);
        return;
    }

    showToast('جاري تحميل الخطوط لملف الـ PDF...');
    // استخدام خط جوجل Cairo Regular (نفس خط الموقع)
    const fontUrl = 'https://raw.githubusercontent.com/google/fonts/main/ofl/cairo/static/Cairo-Regular.ttf';
    const fontBase64 = await loadFontAsBase64(fontUrl);
    
    if (!fontBase64) {
        showToast('فشل تحميل الخط، لا يمكن إنشاء PDF.', true);
        return;
    }
    showToast('جاري إنشاء ملف الـ PDF...');

    const { jsPDF } = window.jspdf;
    const doc = new jsPDF({
        orientation: 'p', // portrait
        unit: 'pt',       // points
        format: 'a4'      // A4 size
    });
    
    const FONT_NAME = "Cairo"; // اسم الخط كما أضفناه
    
    try {
        doc.addFileToVFS('Cairo-Regular.ttf', fontBase64);
        doc.addFont('Cairo-Regular.ttf', FONT_NAME, 'normal');
        doc.setFont(FONT_NAME, 'normal');
    } catch (err) {
        console.error("PDF Font Error:", err);
        showToast("خطأ في إضافة الخط للـ PDF. قد تظهر الحروف غير صحيحة.", true);
    }

    // فصل البيانات
    const expenseOrders = dataToExport.filter(o => o.type === 'expense');
    const incomeOrders = dataToExport.filter(o => o.type === 'income');

    // إعدادات الجدول (محاذاة لليمين، استخدام الخط العربي)
    const commonStyles = { font: FONT_NAME, fontStyle: 'normal', cellPadding: 5, fontSize: 10 };
    const headStyles = { ...commonStyles, fillColor: [41, 128, 185], textColor: 255, fontStyle: 'bold', halign: 'center' }; // توسيط الهيدر
    const bodyStyles = { ...commonStyles, textColor: [50, 50, 50], halign: 'right' }; // محاذاة النص لليمين
    const columnStyles = { // تحديد الأعمدة من اليمين لليسار
        0: { halign: 'right' }, // العميل/المورد
        1: { halign: 'right' }, // الرقم المرجعي
        2: { halign: 'center' }, // التاريخ (توسيط)
        3: { halign: 'center' }  // الحالة (توسيط)
    };
    
    const pageWidth = doc.internal.pageSize.getWidth();
    const pageMargin = 40; // هامش أكبر بالنقاط

    // وظيفة لإضافة الهيدر والفوتر لكل صفحة (للتكرار)
    const addHeaderFooter = () => {
        doc.setFontSize(18);
        doc.setFont(FONT_NAME, 'bold');
        doc.text("تقرير الأوردرات", pageWidth / 2, pageMargin, { align: 'center' });
        
        doc.setFontSize(10);
        doc.setFont(FONT_NAME, 'normal');
        doc.text(`تاريخ التقرير: ${new Date().toLocaleDateString('ar-EG')}`, pageWidth / 2, pageMargin + 15, { align: 'center' });
    };

    let startY = pageMargin + 30; // نقطة بداية أول جدول تحت الهيدر

    // إضافة الهيدر والفوتر للصفحة الأولى
    addHeaderFooter();

    // جدول المصروفات
    if (expenseOrders.length > 0) {
        doc.setFontSize(14);
        doc.setFont(FONT_NAME, 'bold');
        doc.text("سجل المصروفات (لعميل)", pageWidth - pageMargin, startY, { align: 'right' });
        startY += 20;

        const expenseBody = expenseOrders.map(o => [
            o.name || 'N/A',
            o.ref || 'N/A',
            o.date || 'N/A',
            o.status === 'completed' ? "مكتمل" : "معلق"
        ]);
        const expenseHead = [['العميل', 'الرقم المرجعي', 'التاريخ', 'الحالة']];

        doc.autoTable({
            head: expenseHead,
            body: expenseBody,
            startY: startY,
            theme: 'grid', 
            styles: bodyStyles,
            headStyles: headStyles,
            columnStyles: columnStyles,
            margin: { top: startY - 5, right: pageMargin, bottom: pageMargin, left: pageMargin }, // تعديل الهامش العلوي
            didDrawPage: (data) => {
                if (data.pageNumber > 1) { // لا تضيف الهيدر للصفحة الأولى مرة أخرى
                    addHeaderFooter(); 
                }
                try { doc.setFont(FONT_NAME, "normal"); } catch(e){} 
            }
        });
        startY = doc.autoTable.previous.finalY + 20; 
    }
    
    // جدول الاستلامات
    if (incomeOrders.length > 0) {
         if (startY > doc.internal.pageSize.getHeight() - pageMargin * 2) {
            doc.addPage();
            startY = pageMargin + 30; // إعادة تعيين لصفحة جديدة
            addHeaderFooter(); 
         }
        
         doc.setFontSize(14);
         doc.setFont(FONT_NAME, 'bold');
         doc.text("سجل الاستلامات (من مورد)", pageWidth - pageMargin, startY, { align: 'right' });
         startY += 20;

         const incomeBody = incomeOrders.map(o => [
            o.name || 'N/A',
            o.ref || 'N/A',
            o.date || 'N/A',
            o.status === 'completed' ? "مكتمل" : "معلق"
        ]);
        const incomeHead = [['المورد', 'الرقم المرجعي', 'التاريخ', 'الحالة']];

         doc.autoTable({
            head: incomeHead,
            body: incomeBody,
            startY: startY,
            theme: 'grid',
            styles: bodyStyles,
            headStyles: headStyles,
            columnStyles: columnStyles,
            margin: { top: startY - 5, right: pageMargin, bottom: pageMargin, left: pageMargin }, // تعديل الهامش العلوي
            didDrawPage: (data) => {
                 if (data.pageNumber > 1 || expenseOrders.length === 0) { // أضف الهيدر إذا كانت أول صفحة أو صفحة جديدة
                     addHeaderFooter();
                 }
                 try { doc.setFont(FONT_NAME, "normal"); } catch(e){}
            }
         });
    }

    doc.save(`orders_report_${new Date().toISOString().split('T')[0]}.pdf`);
    showToast("تم تصدير ملف PDF بنجاح!");
}


// --- 11. وظائف جلب البيانات (Real-time) ---

// جلب صلاحيات المستخدم
function listenToUserRole(uid) {
    const userDocRef = doc(db, `artifacts/${appId}/users`, uid);
    
    onSnapshot(userDocRef, (docSnap) => {
        if (docSnap.exists() && docSnap.data().role) {
            userRole = docSnap.data().role;
        } else {
            userRole = 'guest'; 
        }
        updateUIForRole();
        if (!ordersUnsubscribe) listenToOrders();
    }, (error) => {
        console.error("Error listening to user role:", error);
        userRole = 'guest'; 
        updateUIForRole();
        if (!ordersUnsubscribe) listenToOrders();
    });
}

// جلب الأوردرات
function listenToOrders() {
    const ordersColRef = collection(db, `artifacts/${appId}/orders`);
    if (ordersUnsubscribe) return; 

    ordersUnsubscribe = onSnapshot(ordersColRef, (snapshot) => {
        allOrders = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        renderTables(); 
    }, (error) => {
        console.error("Error fetching orders:", error);
        showToast("خطأ في جلب الأوردرات: " + error.message, true);
        hideLoadingSpinner(); 
    });
}

// جلب المستخدمين (للأدمن)
function listenToAdminUsers() {
    if (userRole !== 'admin') {
        if (usersUnsubscribe) { usersUnsubscribe(); usersUnsubscribe = null; }
        allUsers = [];
        renderAdminPanel(); 
        return;
    }
    if (usersUnsubscribe) return; 

    const usersColRef = collection(db, `artifacts/${appId}/users`);
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
    const searchTerm = filterSearch?.value.toLowerCase() || '';
    if (searchTerm) {
        filtered = filtered.filter(o => 
            (o.name && o.name.toLowerCase().includes(searchTerm)) || 
            (o.ref && o.ref.toLowerCase().includes(searchTerm))
        );
    }
    const filterDateValue = filterDate?.value;
    if (filterDateValue) {
        filtered = filtered.filter(o => o.date === filterDateValue);
    }
    const sortValue = filterSort?.value || 'date-desc';
    filtered.sort((a, b) => {
         switch (sortValue) {
            case 'date-asc': return (new Date(a.date) || 0) - (new Date(b.date) || 0);
            case 'name-asc': return (a.name || '').localeCompare(b.name || '', 'ar');
            case 'name-desc': return (b.name || '').localeCompare(a.name || '', 'ar');
            case 'ref-asc': return (a.ref || '').localeCompare(b.ref || '', undefined, { numeric: true });
            case 'ref-desc': return (b.ref || '').localeCompare(a.ref || '', undefined, { numeric: true });
            case 'date-desc': default: return (new Date(b.date) || 0) - (new Date(a.date) || 0);
        }
    });
    return filtered;
}

// رسم الجداول (مصروفات واستلامات)
function renderTables() {
    if (!expenseTableBody || !incomeTableBody) return; 
    const filteredData = getFilteredAndSortedData();
    const expenseHtml = filteredData.filter(o => o.type === 'expense').map(createOrderRowHtml).join('');
    const incomeHtml = filteredData.filter(o => o.type === 'income').map(createOrderRowHtml).join('');
    expenseTableBody.innerHTML = expenseHtml || `<tr><td colspan="5" class="p-4 text-center text-gray-400">لا توجد مصروفات حالياً.</td></tr>`;
    incomeTableBody.innerHTML = incomeHtml || `<tr><td colspan="5" class="p-4 text-center text-gray-400">لا توجد استلامات حالياً.</td></tr>`;
    if (checkAllExpense) checkAllExpense.checked = false;
    if (checkAllIncome) checkAllIncome.checked = false;
    updateBulkDeleteButton();
    setupTableInteractions(); 
}

// إنشاء سطر HTML لكل أوردر
function createOrderRowHtml(order) {
    const isCompleted = order.status === 'completed';
    const statusColorClass = isCompleted ? 'bg-green-100 dark:bg-green-900' : 'bg-yellow-100 dark:bg-yellow-900';
    const nameLabel = order.type === 'expense' ? 'العميل' : 'المورد';
    const rowSelectedClass = selectedOrders.has(order.id) ? 'bg-blue-100 dark:bg-blue-900' : '';
    const adminColspan = userRole === 'admin' ? '' : 'hidden'; 
    const checkboxHtml = userRole === 'admin' ? 
        `<td class="p-3 w-12 text-center"><input type="checkbox" data-id="${order.id}" class="order-checkbox form-checkbox rounded border-gray-400 dark:border-gray-600" ${selectedOrders.has(order.id) ? 'checked' : ''}></td>` : 
        '';
    const statusButtonHtml = userRole === 'admin' ?
        `<button data-id="${order.id}" data-status="${order.status || 'pending'}" class="status-toggle-btn p-2 rounded-full transition-all duration-200 ${isCompleted ? 'bg-green-500 hover:bg-green-600' : 'bg-yellow-400 hover:bg-yellow-500'}">
            <svg class="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"></path></svg>
        </button>` :
        `<span class="px-2 py-1 text-xs rounded-full ${isCompleted ? 'bg-green-200 text-green-800 dark:bg-green-700 dark:text-green-100' : 'bg-yellow-200 text-yellow-800 dark:bg-yellow-700 dark:text-yellow-100'}">${isCompleted ? "مكتمل" : "معلق"}</span>`;
    const orderName = order.name || 'N/A';
    const orderRef = order.ref || 'N/A';
    const orderDate = order.date || 'N/A';
    
    // إخفاء الـ Checkbox column للضيف
    const displayCheckboxCol = userRole === 'admin' ? '' : 'hidden'; 

    return `
        <tr id="order-${order.id}" class="border-b border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-750 transition-colors duration-150 ${statusColorClass} ${rowSelectedClass}">
            <td class="p-3 w-12 text-center ${displayCheckboxCol}"><input type="checkbox" data-id="${order.id}" class="order-checkbox form-checkbox rounded border-gray-400 dark:border-gray-600" ${selectedOrders.has(order.id) ? 'checked' : ''}></td>
             {/* -- تعديل للـ CSS الجديد -- */}
            <td class="p-3" data-label="${nameLabel}"><span class="td-content">${orderName}</span></td>
            <td class="p-3" data-label="الرقم المرجعي"><span class="td-content">${orderRef}</span></td>
            <td class="p-3" data-label="التاريخ"><span class="td-content">${orderDate}</span></td>
            <td class="p-3 w-24 text-center" data-label="الحالة"><span class="td-content">${statusButtonHtml}</span></td> 
        </tr>
    `;
}


// (رسم لوحة تحكم الأدمن)
function renderAdminPanel() {
     if (!usersTableBody) return; 
    if (userRole !== 'admin') {
        usersTableBody.innerHTML = `<tr><td colspan="3" class="p-4 text-center text-gray-400">ليس لديك صلاحية لعرض هذه القائمة.</td></tr>`;
        return;
    }
    if (allUsers.length === 0) {
         usersTableBody.innerHTML = `<tr><td colspan="3" class="p-4 text-center text-gray-400">لا يوجد مستخدمون آخرون مسجلون.</td></tr>`;
        return;
    }
    const usersHtml = allUsers.map(user => {
        const isSelf = user.id === userId;
        const currentRole = user.role || 'guest';
        const userEmail = user.email || 'N/A';
        const roleSelectHtml = isSelf ? 
            `<span class="font-bold text-blue-500">أدمن رئيسي (أنت)</span>` :
            `<select data-id="${user.id}" class="role-select form-input py-1" ${!user.role ? 'disabled' : ''}>
                <option value="guest" ${currentRole === 'guest' ? 'selected' : ''}>ضيف (Guest)</option>
                <option value="admin" ${currentRole === 'admin' ? 'selected' : ''}>أدمن (Admin)</option>
            </select>`;
        return `
            <tr class="border-b border-gray-200 dark:border-gray-700">
                <td class="p-3" data-label="الإيميل"><span class="td-content">${userEmail}</span></td>
                <td class="p-3" data-label="الصلاحية"><span class="td-content">${currentRole}</span></td>
                <td class="p-3" data-label="تغيير الصلاحية"><span class="td-content">${roleSelectHtml}</span></td>
            </tr>
        `;
    }).join('');
    usersTableBody.innerHTML = usersHtml;
    document.querySelectorAll('.role-select').forEach(select => {
        const newSelect = select.cloneNode(true);
        select.parentNode.replaceChild(newSelect, select);
        newSelect.addEventListener('change', (e) => {
            if (e.target.disabled) return;
            const newRole = e.target.value;
            const targetUserId = e.target.dataset.id;
            handleChangeUserRole(targetUserId, newRole);
        });
     });
}

// (تحديث الواجهة بناءً على صلاحية المستخدم)
function updateUIForRole() {
    const adminOnlyElements = [
        adminPanelBtn, 
        bulkDeleteBtn,
        checkAllExpense, 
        checkAllIncome
    ].filter(Boolean); 
    const addOrderWrapper = document.getElementById('add-order-form-wrapper');
    const checkboxHeaders = document.querySelectorAll('th:first-child'); 

    if (userRole === 'admin') {
         if (userRoleSpan) {
            userRoleSpan.textContent = "أدمن";
            userRoleSpan.className = "px-2 py-0.5 text-xs bg-green-200 text-green-800 rounded-full dark:bg-green-700 dark:text-green-100";
        }
        if (addOrderWrapper) addOrderWrapper.classList.remove('hidden');
        adminOnlyElements.forEach(el => el.classList.remove('hidden'));
        checkboxHeaders.forEach(th => th.classList.remove('hidden'));
        listenToAdminUsers(); 
    } else {
        if (userRoleSpan) {
            userRoleSpan.textContent = "ضيف";
            userRoleSpan.className = "px-2 py-0.5 text-xs bg-gray-200 text-gray-800 rounded-full dark:bg-gray-600 dark:text-gray-100";
        }
        if (addOrderWrapper) addOrderWrapper.classList.add('hidden');
        adminOnlyElements.forEach(el => el.classList.add('hidden'));
        checkboxHeaders.forEach(th => th.classList.add('hidden'));
        if (adminPanel) adminPanel.classList.add('hidden');
         if (usersUnsubscribe) { 
             usersUnsubscribe();
             usersUnsubscribe = null;
             allUsers = []; 
             renderAdminPanel(); 
        }
    }
    
    renderTables(); 
}


// --- 13. وظائف تفاعلية (Interactions) ---

// (تسجيل الدخول)
async function handleLogin() {
    if (!loginEmail || !loginPassword) return;
    const email = loginEmail.value;
    const password = loginPassword.value;
    try {
        await signInWithEmailAndPassword(auth, email, password);
        showToast("تم تسجيل الدخول بنجاح!");
        loginForm?.reset();
    } catch (error) {
        console.error("Login Error:", error.code, error.message);
        showToast(getFriendlyAuthError(error.code), true);
    }
}

// (إنشاء حساب جديد)
async function handleRegister() {
    if (!registerEmail || !registerPassword) return;
    const email = registerEmail.value;
    const password = registerPassword.value;
    const role = (email.toLowerCase() === SUPER_ADMIN_EMAIL.toLowerCase()) ? 'admin' : 'guest';
    try {
        const userCredential = await createUserWithEmailAndPassword(auth, email, password);
        const user = userCredential.user;
        const userDocRef = doc(db, `artifacts/${appId}/users`, user.uid);
        await setDoc(userDocRef, { email: user.email, role: role, createdAt: new Date() });
        showToast("تم إنشاء الحساب وتسجيل الدخول بنجاح!");
        registerForm?.reset();
    } catch (error) {
        console.error("Register Error:", error.code, error.message);
        showToast(getFriendlyAuthError(error.code), true);
    }
}

// (إضافة أوردر جديد)
async function handleAddOrder() {
    if (!orderType || !orderName || !orderRef || !orderDate || !addOrderForm) return;
    const type = orderType.value;
    const name = orderName.value.trim();
    const ref = orderRef.value.trim() || 'N/A';
    const date = orderDate.value;
    if (!name || !date) { showToast("يرجى ملء الاسم والتاريخ.", true); return; }
    try {
        const ordersColRef = collection(db, `artifacts/${appId}/orders`);
        await addDoc(ordersColRef, { type: type, name: name, ref: ref, date: date, status: 'pending', addedBy: userId, createdAt: new Date() });
        showToast("تمت إضافة الأوردر بنجاح!");
        addOrderForm.reset();
        setDefaultDate(); 
    } catch (error) {
        console.error("Error adding order: ", error);
        showToast("حدث خطأ أثناء إضافة الأوردر: " + (error.message || error.code), true);
    }
}

// (تغيير صلاحية مستخدم)
async function handleChangeUserRole(targetUserId, newRole) {
    if (userRole !== 'admin') { showToast("ليس لديك الصلاحية لتغيير الأدوار.", true); return; }
    if (userId === targetUserId) { showToast("لا يمكنك تغيير صلاحيتك.", true); renderAdminPanel(); return; }
    try {
        const userDocRef = doc(db, `artifacts/${appId}/users`, targetUserId);
        await updateDoc(userDocRef, { role: newRole });
        showToast("تم تحديث الصلاحية بنجاح!");
    } catch (error) {
        console.error("Error updating role:", error);
        showToast("خطأ في تحديث الصلاحية: " + (error.message || error.code), true);
        renderAdminPanel(); 
    }
}

// (تغيير حالة الأوردر)
async function handleToggleStatus(orderId, currentStatus) {
    if (userRole !== 'admin') return;
    const newStatus = (currentStatus === 'pending') ? 'completed' : 'pending';
    const orderDocRef = doc(db, `artifacts/${appId}/orders`, orderId);
    try {
        await updateDoc(orderDocRef, { status: newStatus });
    } catch (error) {
        console.error("Error toggling status:", error);
        showToast("خطأ في تحديث الحالة: " + (error.message || error.code), true);
    }
}

// (المسح المجمع)
async function handleBulkDelete() {
    if (userRole !== 'admin' || selectedOrders.size === 0) return;
    showConfirmModal(`هل أنت متأكد من مسح ${selectedOrders.size} أوردر؟ لا يمكن التراجع عن هذا الإجراء.`, async () => {
        try {
            const batch = writeBatch(db);
            selectedOrders.forEach(orderId => { batch.delete(doc(db, `artifacts/${appId}/orders`, orderId)); });
            await batch.commit();
            showToast(`تم مسح ${selectedOrders.size} أوردر بنجاح!`);
            selectedOrders.clear();
            renderTables(); 
        } catch (error) {
            console.error("Error bulk deleting orders:", error);
            showToast("حدث خطأ أثناء المسح: " + (error.message || error.code), true);
        }
    });
}

// (تفعيل الأزرار داخل الجداول باستخدام event delegation)
function setupTableInteractions() {
    const expenseTable = document.getElementById('expense-table-body');
    const incomeTable = document.getElementById('income-table-body');

    const handleTableClick = (e) => {
        // تغيير الحالة
        const statusBtn = e.target.closest('.status-toggle-btn');
        if (statusBtn) {
            const id = statusBtn.dataset.id;
            const status = statusBtn.dataset.status;
            handleToggleStatus(id, status);
            return; 
        }

        // تحديد Checkbox
        const checkbox = e.target.closest('.order-checkbox');
        if (checkbox) {
            const id = checkbox.dataset.id;
            const row = document.getElementById(`order-${id}`);
            if (checkbox.checked) {
                selectedOrders.add(id);
                row?.classList.add('bg-blue-100', 'dark:bg-blue-900');
            } else {
                selectedOrders.delete(id);
                row?.classList.remove('bg-blue-100', 'dark:bg-blue-900');
            }
            updateBulkDeleteButton();
            return; 
        }
    };

    // Remove previous listeners before adding new ones (safer)
    expenseTable?.removeEventListener('click', handleTableClick);
    incomeTable?.removeEventListener('click', handleTableClick);
    expenseTable?.addEventListener('click', handleTableClick);
    incomeTable?.addEventListener('click', handleTableClick);
}


// (تحديد الكل)
function toggleCheckAll(checked, type) {
    const tableBody = (type === 'expense') ? expenseTableBody : incomeTableBody;
     if (!tableBody) return;
    const checkboxes = tableBody.querySelectorAll('.order-checkbox');
    checkboxes.forEach(checkbox => {
        checkbox.checked = checked;
        const id = checkbox.dataset.id;
        const row = document.getElementById(`order-${id}`);
        if (checked) {
            selectedOrders.add(id);
            row?.classList.add('bg-blue-100', 'dark:bg-blue-900');
        } else {
            selectedOrders.delete(id);
            row?.classList.remove('bg-blue-100', 'dark:bg-blue-900');
        }
    });
    updateBulkDeleteButton();
}

// (تحديث زرار المسح المجمع)
function updateBulkDeleteButton() {
    if (!bulkDeleteBtn) return; 
    const countSpan = bulkDeleteBtn.querySelector('span');
    if (userRole === 'admin' && selectedOrders.size > 0) {
        bulkDeleteBtn.classList.remove('hidden', 'opacity-0', 'scale-90');
        if (countSpan) countSpan.textContent = `(${selectedOrders.size})`;
    } else {
        bulkDeleteBtn.classList.add('hidden', 'opacity-0', 'scale-90');
        if (countSpan) countSpan.textContent = '(0)';
    }
}

// --- 14. وظائف إضافية ---

// (الوضع الليلي)
function initTheme() {
     const isDarkMode = localStorage.theme === 'dark' || (!('theme' in localStorage) && window.matchMedia('(prefers-color-scheme: dark)').matches);
    if (isDarkMode) {
        document.documentElement.classList.add('dark');
        moonIcon?.classList.add('hidden');
        sunIcon?.classList.remove('hidden');
    } else {
        document.documentElement.classList.remove('dark');
        moonIcon?.classList.remove('hidden');
        sunIcon?.classList.add('hidden');
    }
}
function toggleTheme() {
    const isDark = document.documentElement.classList.toggle('dark');
    localStorage.theme = isDark ? 'dark' : 'light';
    moonIcon?.classList.toggle('hidden', isDark);
    sunIcon?.classList.toggle('hidden', !isDark);
}

// (إظهار/إخفاء كلمة المرور)
function togglePasswordVisibility(inputElement, toggleElement) {
     if (!inputElement || !toggleElement) return;
    const type = inputElement.getAttribute('type') === 'password' ? 'text' : 'password';
    inputElement.setAttribute('type', type);
    const icon = toggleElement.querySelector('svg');
    if (!icon) return;
    if (type === 'password') {
        icon.innerHTML = `<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"></path><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"></path>`;
    } else {
        icon.innerHTML = `<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.542-7 .844-3.14 3.1-5.64 5.922-6.756M12 12a3 3 0 100-6 3 3 0 000 6z"></path><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M1 1l22 22"></path>`;
    }
}

// (تعيين تاريخ افتراضي)
function setDefaultDate() {
    if (!orderDate) return;
    try {
        const today = new Date();
        orderDate.value = today.toISOString().split('T')[0];
    } catch (e) {
        console.error("Error setting default date:", e);
    }
}

// (عرض رسائل خطأ أوضح للمستخدم)
function getFriendlyAuthError(code) {
     switch (code) {
        case 'auth/wrong-password': return 'كلمة المرور غير صحيحة.';
        case 'auth/user-not-found': return 'لا يوجد حساب بهذا الإيميل.';
        case 'auth/email-already-in-use': return 'هذا الإيميل مسجل بالفعل.';
        case 'auth/weak-password': return 'كلمة المرور ضعيفة (6 حروف على الأقل).';
        case 'auth/invalid-email': return 'الإيميل غير صالح.';
        case 'auth/network-request-failed': return 'فشل الاتصال بالشبكة.';
        case 'auth/too-many-requests': return 'تم حظر الطلبات مؤقتاً. حاول لاحقاً.';
        default: console.error("Unhandled Auth Error Code:", code); return `حدث خطأ غير متوقع (${code}).`;
    }
}

// (عرض نافذة تأكيد)
function showConfirmModal(message, onConfirm) {
    const overlay = document.createElement('div');
    overlay.className = 'fixed inset-0 bg-black bg-opacity-50 dark:bg-opacity-70 flex items-center justify-center z-50 p-4 transition-opacity duration-300 opacity-0';
    overlay.id = 'confirm-overlay';
    const modal = document.createElement('div');
    modal.className = 'bg-white dark:bg-gray-800 rounded-lg shadow-xl p-6 w-full max-w-sm transform transition-all scale-95 opacity-0';
    modal.innerHTML = `
        <h3 class="text-lg font-bold text-gray-900 dark:text-white mb-4">تأكيد الإجراء</h3>
        <p class="text-sm text-gray-600 dark:text-gray-300 mb-6">${message}</p>
        <div class="flex justify-end space-x-2 rtl:space-x-reverse">
            <button id="confirm-cancel" class="px-4 py-2 rounded-lg bg-gray-200 text-gray-800 hover:bg-gray-300 dark:bg-gray-700 dark:text-gray-200 dark:hover:bg-gray-600 transition-colors">إلغاء</button>
            <button id="confirm-ok" class="px-4 py-2 rounded-lg bg-red-600 text-white hover:bg-red-700 transition-colors focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2 dark:focus:ring-offset-gray-800">تأكيد المسح</button>
        </div>
    `;
    overlay.appendChild(modal);
    document.body.appendChild(overlay);
    requestAnimationFrame(() => {
        overlay.classList.add('opacity-100');
        modal.classList.remove('scale-95', 'opacity-0');
        modal.classList.add('scale-100', 'opacity-100');
    });
    const confirmOkBtn = document.getElementById('confirm-ok');
    const confirmCancelBtn = document.getElementById('confirm-cancel');
    const closeModal = () => {
         confirmOkBtn.disabled = true;
         confirmCancelBtn.disabled = true;
        modal.classList.remove('scale-100', 'opacity-100');
        modal.classList.add('scale-95', 'opacity-0');
        overlay.classList.remove('opacity-100');
        setTimeout(() => overlay.remove(), 300);
    };
    confirmCancelBtn.addEventListener('click', closeModal);
    confirmOkBtn.addEventListener('click', () => { onConfirm(); closeModal(); });
    overlay.addEventListener('click', (e) => { if (e.target === overlay) closeModal(); });
}


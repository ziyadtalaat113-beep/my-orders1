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
let amiriFontBase64 = null;
async function loadFontAsBase64(url) {
    // ... (الكود كما هو) ...
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
let userRole = 'guest';
let allOrders = [];
let allUsers = [];
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
    console.log("DOM fully loaded and parsed"); // للتأكد أن هذا يعمل

    // --- ربط كل العناصر الآن ---
    loadingSpinner = document.getElementById('loading-spinner');
    appContent = document.getElementById('app-content');
    authScreen = document.getElementById('auth-screen');
    // ... (باقي العناصر كما هي) ...
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

    // تأكد أن العناصر تم ربطها
    if (!loadingSpinner || !appContent || !authScreen || !mainApp) {
        console.error("Critical DOM elements not found!");
        // عرض رسالة خطأ للمستخدم بدل شاشة التحميل
        if(loadingSpinner) loadingSpinner.innerHTML = "خطأ في تحميل واجهة التطبيق. حاول تحديث الصفحة.";
        return; // إيقاف التنفيذ إذا كانت العناصر الأساسية مفقودة
    }

    console.log("DOM elements bound.");

    // --- تشغيل التطبيق ---
    try {
        console.log("Initializing Firebase and setting up listeners...");
        initializeAppAndAuth(); // تهيئة Firebase ومراقبة الدخول
        setupEventListeners(); // ربط الأحداث للأزرار والنماذج
        initTheme(); // تهيئة الوضع الليلي/النهاري
        console.log("App setup complete.");
    } catch (error) {
        console.error("Fatal Error initializing app:", error);
        if (loadingSpinner) {
            loadingSpinner.innerHTML = "حدث خطأ فادح. يرجى تحديث الصفحة.";
            // لا تخفي شاشة التحميل في حالة الخطأ الفادح
        }
    }
});


// --- 8. الوظائف الأساسية ---

// تهيئة Firebase
async function initializeAppAndAuth() {
    try {
        console.log("Initializing Firebase App...");
        const app = initializeApp(firebaseConfig);
        db = getFirestore(app);
        auth = getAuth(app);
        console.log("Firebase App initialized.");

        // تفعيل التخزين المحلي (Offline)
        console.log("Enabling offline persistence...");
        await enableIndexedDbPersistence(db);
        console.log("Offline persistence enabled.");

        // مراقبة حالة تسجيل الدخول
        console.log("Setting up Auth State Listener...");
        onAuthStateChanged(auth, (user) => {
             console.log("Auth state changed. User:", user ? user.uid : 'null');
            if (user) {
                // المستخدم سجل دخوله
                userId = user.uid;
                // تأكد أن العناصر موجودة قبل استخدامها
                if (userEmailSpan) userEmailSpan.textContent = user.email;
                listenToUserRole(user.uid); // جلب صلاحيات المستخدم (هذه ستستدعي listenToOrders)
                listenToAdminUsers(); // جلب قايمة المستخدمين (للأدمن)
                showMainApp(); // إظهار التطبيق الرئيسي (وهي تخفي التحميل)
            } else {
                // المستخدم سجل خروجه
                userId = null;
                userRole = 'guest';
                if (ordersUnsubscribe) {
                     console.log("Unsubscribing from orders listener.");
                     ordersUnsubscribe();
                     ordersUnsubscribe = null;
                 }
                if (usersUnsubscribe) {
                     console.log("Unsubscribing from users listener.");
                     usersUnsubscribe();
                     usersUnsubscribe = null;
                 }
                allOrders = [];
                allUsers = [];
                renderTables(); // مسح الجداول
                showAuthScreen(); // إظهار شاشة الدخول (وهي تخفي التحميل)
            }
        });
        console.log("Auth State Listener set up.");

    } catch (error) {
        console.error("Firebase Init Error:", error);
        if (loadingSpinner) {
            loadingSpinner.innerHTML = `فشل الاتصال بقاعدة البيانات (${error.code || error.message}). تأكد من صحة بيانات الاتصال.`;
            // لا تخفي شاشة التحميل هنا
        }
    }
}

// إظهار شاشة الدخول وإخفاء التحميل
function showAuthScreen() {
    console.log("Showing Auth Screen...");
    if (authScreen) authScreen.classList.remove('hidden');
    if (mainApp) mainApp.classList.add('hidden');
    // إخفاء التحميل فقط بعد التأكد من عرض الشاشة
    hideLoadingSpinner();
}

// إظهار التطبيق الرئيسي وإخفاء التحميل
function showMainApp() {
    console.log("Showing Main App...");
    if (mainApp) mainApp.classList.remove('hidden');
    if (authScreen) authScreen.classList.add('hidden');
    setDefaultDate(); // تأكد أن orderDate موجود قبل استدعاء هذه
    // إخفاء التحميل فقط بعد التأكد من عرض الشاشة
    hideLoadingSpinner();
}

// إخفاء شاشة "جاري التحميل"
function hideLoadingSpinner() {
    console.log("Hiding Loading Spinner...");
    if (loadingSpinner && !loadingSpinner.classList.contains('opacity-0')) {
        loadingSpinner.classList.add('opacity-0', 'pointer-events-none');
        console.log("Loading spinner hidden.");
    }
    // تأكد أن appContent موجود قبل إظهاره
    if (appContent && appContent.classList.contains('opacity-0')) {
        appContent.classList.remove('opacity-0');
        console.log("App content shown.");
    }
}

// عرض رسالة مؤقتة (Toast)
function showToast(message, isError = false) {
    // ... (الكود كما هو) ...
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
    console.log("Setting up event listeners...");
    // التأكد من وجود العناصر قبل ربط الأحداث
    if (authToggleLinks) {
        authToggleLinks.forEach(link => {
            link.addEventListener('click', (e) => {
                e.preventDefault();
                loginForm?.classList.toggle('hidden');
                registerForm?.classList.toggle('hidden');
            });
        });
    }

    if (loginForm) {
        loginForm.addEventListener('submit', (e) => {
            e.preventDefault();
            handleLogin();
        });
    }

    if (registerForm) {
        registerForm.addEventListener('submit', (e) => {
            e.preventDefault();
            handleRegister();
        });
    }

    if (logoutBtn) {
        logoutBtn.addEventListener('click', () => {
             console.log("Logout button clicked.");
             signOut(auth).catch(error => console.error("Sign out error:", error));
        });
    }

    if (loginPasswordToggle) {
        loginPasswordToggle.addEventListener('click', () => {
            togglePasswordVisibility(loginPassword, loginPasswordToggle);
        });
    }
    if (registerPasswordToggle) {
        registerPasswordToggle.addEventListener('click', () => {
            togglePasswordVisibility(registerPassword, registerPasswordToggle);
        });
    }

    if (addOrderForm) {
        addOrderForm.addEventListener('submit', (e) => {
            e.preventDefault();
            handleAddOrder();
        });
    }

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

    if (adminPanelBtn) {
        adminPanelBtn.addEventListener('click', () => {
            adminPanel?.classList.remove('hidden');
        });
    }
    if (closeAdminPanelBtn) {
        closeAdminPanelBtn.addEventListener('click', () => {
            adminPanel?.classList.add('hidden');
        });
    }

    if (toggleThemeBtn) toggleThemeBtn.addEventListener('click', toggleTheme);
    
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
    // إخفاء القائمة عند الضغط خارجها
    document.addEventListener('click', (e) => {
        if (exportBtn && exportDropdown && !exportBtn.contains(e.target) && !exportDropdown.contains(e.target)) {
            exportDropdown.classList.add('hidden', 'opacity-0', 'scale-95');
        }
    });

    if (bulkDeleteBtn) bulkDeleteBtn.addEventListener('click', handleBulkDelete);
    
    if (checkAllExpense) {
        checkAllExpense.addEventListener('change', (e) => {
            toggleCheckAll(e.target.checked, 'expense');
        });
    }
    if (checkAllIncome) {
        checkAllIncome.addEventListener('change', (e) => {
            toggleCheckAll(e.target.checked, 'income');
        });
    }
    console.log("Event listeners set up.");

} // --- نهاية setupEventListeners ---


// --- 10. وظائف مساعدة (التصدير) ---
// ... (الكود كما هو) ...
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
async function exportPDF(e) { 
    e.preventDefault();
    exportDropdown.classList.add('hidden', 'opacity-0', 'scale-95');
    const dataToExport = getFilteredAndSortedData();
    if (dataToExport.length === 0) {
        showToast("لا توجد بيانات لتصديرها.", true);
        return;
    }

    showToast('جاري تحميل الخطوط لملف الـ PDF...');
    const fontBase64 = await loadFontAsBase64('https://raw.githubusercontent.com/google/fonts/main/ofl/amiri/Amiri-Regular.ttf');
    if (!fontBase64) {
        showToast('فشل تحميل الخط، لا يمكن إنشاء PDF.', true);
        return;
    }
    showToast('جاري إنشاء ملف الـ PDF...');

    const { jsPDF } = window.jspdf;
    const doc = new jsPDF();
    
    try {
        doc.addFileToVFS('Amiri-Regular.ttf', fontBase64);
        doc.addFont('Amiri-Regular.ttf', 'Amiri', 'normal');
        doc.setFont('Amiri', 'normal');
    } catch (err) {
        console.error("PDF Font Error:", err);
        showToast("خطأ في إضافة الخط للـ PDF.", true);
        // لا توقف التنفيذ، حاول استخدام الخط الافتراضي
    }

    const expenseOrders = dataToExport.filter(o => o.type === 'expense');
    const incomeOrders = dataToExport.filter(o => o.type === 'income');

    const fontStyles = { font: "Amiri", fontStyle: 'normal', halign: 'right' }; // تأكد من fontStyle
    const headerStyles = { fillColor: [41, 128, 185], textColor: 255, font: "Amiri", fontStyle: 'normal', halign: 'right' }; // تأكد من fontStyle

    doc.setFontSize(18);
    doc.text("تقرير الأوردرات", 105, 20, { align: 'center' });
    
    doc.setFontSize(10);
    doc.text(`تاريخ التقرير: ${new Date().toLocaleDateString('ar-EG')}`, 105, 28, { align: 'center' });
    
    let startY = 40;

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
            bodyStyles: { halign: 'right' }, // محاذاة النص في الخلايا لليمين
             columnStyles: { // تأكد من محاذاة كل الأعمدة لليمين
                0: { halign: 'right' },
                1: { halign: 'right' },
                2: { halign: 'right' },
                3: { halign: 'right' }
            },
            didDrawPage: (data) => {
                 try { doc.setFont("Amiri", "normal"); } catch(e){} // إعادة تعيين الخط بعد كل صفحة
            }
        });
        startY = doc.autoTable.previous.finalY + 15;
    }
    
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
             columnStyles: { 
                0: { halign: 'right' },
                1: { halign: 'right' },
                2: { halign: 'right' },
                3: { halign: 'right' }
            },
            didDrawPage: (data) => {
                 try { doc.setFont("Amiri", "normal"); } catch(e){}
            }
         });
    }

    doc.save(`orders_report_${new Date().toISOString().split('T')[0]}.pdf`);
    showToast("تم تصدير ملف PDF بنجاح!");
}


// --- 11. وظائف جلب البيانات (Real-time) ---

// جلب صلاحيات المستخدم
function listenToUserRole(uid) {
    console.log(`Listening to user role for UID: ${uid}`);
    const userDocRef = doc(db, `artifacts/${appId}/users`, uid);
    
    onSnapshot(userDocRef, (docSnap) => {
        if (docSnap.exists() && docSnap.data().role) {
            userRole = docSnap.data().role;
            console.log("User role updated:", userRole);
        } else {
            userRole = 'guest'; // افتراضي
            console.log("User role not found or role field missing, defaulting to guest.");
             // إذا كان مستخدم جديد، قد نحتاج لإنشاء ملفه هنا إذا لم يتم إنشاؤه عند التسجيل
             // لكن الأفضل التأكد من الإنشاء عند التسجيل
        }
        
        updateUIForRole();
        
        // بدء جلب الأوردرات (فقط بعد معرفة الصلاحية والتأكد من عدم وجود مراقبة سابقة)
        if (!ordersUnsubscribe) {
             console.log("Starting orders listener...");
             listenToOrders();
        } else {
             console.log("Orders listener already active.");
        }
    }, (error) => {
        console.error("Error listening to user role:", error);
        userRole = 'guest'; // في حالة الخطأ، اعتبره ضيف
        updateUIForRole();
         if (!ordersUnsubscribe) { // حاول بدء مراقبة الأوردرات حتى لو فشل جلب الصلاحية
            console.warn("Starting orders listener despite role fetch error...");
            listenToOrders();
        }
    });
}

// جلب الأوردرات
function listenToOrders() {
    const ordersColRef = collection(db, `artifacts/${appId}/orders`);
    
    // لا توقف المراقبة هنا، بل تأكد أنها لا تتكرر
     if (ordersUnsubscribe) {
        console.warn("Attempted to start orders listener again, but it's already running.");
        return; 
    }

    ordersUnsubscribe = onSnapshot(ordersColRef, (snapshot) => {
        allOrders = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        console.log(`Fetched/Updated ${allOrders.length} orders.`);
        renderTables(); // إعادة الرسم عند أي تغيير
    }, (error) => {
        console.error("Error fetching orders:", error);
        showToast("خطأ في جلب الأوردرات: " + error.message, true);
        // قد تحتاج لإيقاف شاشة التحميل هنا أيضاً إذا حدث خطأ مبكر
         hideLoadingSpinner(); // حاول إخفاء التحميل حتى لو فشل جلب الأوردرات
    });
     console.log("Orders listener attached.");
}

// جلب المستخدمين (للأدمن)
function listenToAdminUsers() {
    // تأكد من صلاحية الأدمن قبل البدء
    if (userRole !== 'admin') {
        console.log("User is not admin, stopping/skipping users listener.");
        if (usersUnsubscribe) { 
            usersUnsubscribe(); 
            usersUnsubscribe = null; 
        }
        allUsers = [];
        renderAdminPanel(); 
        return;
    }

    // تأكد من عدم وجود مراقبة سابقة
    if (usersUnsubscribe) {
         console.log("Users listener already active.");
         return; 
     }

    console.log("Starting users listener for admin...");
    const usersColRef = collection(db, `artifacts/${appId}/users`);
    usersUnsubscribe = onSnapshot(usersColRef, (snapshot) => {
        allUsers = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        console.log(`Fetched ${allUsers.length} users for admin panel.`);
        renderAdminPanel();
    }, (error) => {
        console.error("Error fetching users:", error);
    });
     console.log("Users listener attached.");
}

// --- 12. وظائف رسم الجداول (Rendering) ---
// ... (الكود كما هو) ...
// فلترة وترتيب البيانات
function getFilteredAndSortedData() {
    let filtered = [...allOrders];

    // الفلترة بالبحث
    const searchTerm = filterSearch?.value.toLowerCase() || ''; // تأكد من وجود العنصر
    if (searchTerm) {
        filtered = filtered.filter(o => 
            (o.name && o.name.toLowerCase().includes(searchTerm)) || 
            (o.ref && o.ref.toLowerCase().includes(searchTerm))
        );
    }

    // الفلترة بالتاريخ
    const filterDateValue = filterDate?.value; // تأكد من وجود العنصر
    if (filterDateValue) {
        filtered = filtered.filter(o => o.date === filterDateValue);
    }

    // الترتيب
    const sortValue = filterSort?.value || 'date-desc'; // تأكد من وجود العنصر
    filtered.sort((a, b) => {
        // ... (منطق الترتيب كما هو) ...
         switch (sortValue) {
            case 'date-asc':
                // Handle potential invalid dates gracefully
                const dateA = a.date ? new Date(a.date) : 0;
                const dateB = b.date ? new Date(b.date) : 0;
                return dateA - dateB;
            case 'name-asc':
                return (a.name || '').localeCompare(b.name || '', 'ar');
            case 'name-desc':
                return (b.name || '').localeCompare(a.name || '', 'ar');
            case 'ref-asc':
                return (a.ref || '').localeCompare(b.ref || '', undefined, { numeric: true }); // Handle numeric refs if needed
            case 'ref-desc':
                return (b.ref || '').localeCompare(a.ref || '', undefined, { numeric: true });
            case 'date-desc':
            default:
                 const dateADesc = a.date ? new Date(a.date) : 0;
                 const dateBDesc = b.date ? new Date(b.date) : 0;
                return dateBDesc - dateADesc;
        }
    });

    return filtered;
}

// رسم الجداول (مصروفات واستلامات)
function renderTables() {
    console.log("Rendering tables...");
    // تأكد من أن العناصر موجودة قبل محاولة استخدامها
    if (!expenseTableBody || !incomeTableBody) {
         console.warn("Table body elements not found during render.");
         return; 
     }

    const filteredData = getFilteredAndSortedData();

    const expenseHtml = filteredData
        .filter(o => o.type === 'expense')
        .map(createOrderRowHtml)
        .join('');
    
    const incomeHtml = filteredData
        .filter(o => o.type === 'income')
        .map(createOrderRowHtml)
        .join('');

    expenseTableBody.innerHTML = expenseHtml || `<tr><td colspan="5" class="p-4 text-center text-gray-400">لا توجد مصروفات حالياً.</td></tr>`; // Updated colspan
    incomeTableBody.innerHTML = incomeHtml || `<tr><td colspan="5" class="p-4 text-center text-gray-400">لا توجد استلامات حالياً.</td></tr>`; // Updated colspan
    
    if (checkAllExpense) checkAllExpense.checked = false; // تأكد من وجود العنصر
    if (checkAllIncome) checkAllIncome.checked = false; // تأكد من وجود العنصر
    
    updateBulkDeleteButton();
    setupTableInteractions(); // إعادة ربط الأحداث بعد الرسم
     console.log("Tables rendered.");
}

// إنشاء سطر HTML لكل أوردر
function createOrderRowHtml(order) {
    // ... (الكود كما هو مع التأكد من وجود البيانات) ...
    const isCompleted = order.status === 'completed';
    const statusColorClass = isCompleted ? 'bg-green-100 dark:bg-green-900' : 'bg-yellow-100 dark:bg-yellow-900';
    const nameLabel = order.type === 'expense' ? 'العميل' : 'المورد';
    const rowSelectedClass = selectedOrders.has(order.id) ? 'bg-blue-100 dark:bg-blue-900' : '';
    const checkboxHtml = userRole === 'admin' ? 
        `<td class="p-3"><input type="checkbox" data-id="${order.id}" class="order-checkbox form-checkbox rounded border-gray-400 dark:border-gray-600" ${selectedOrders.has(order.id) ? 'checked' : ''}></td>` : 
        ''; // Added border for visibility
    const statusButtonHtml = userRole === 'admin' ?
        `<button data-id="${order.id}" data-status="${order.status || 'pending'}" class="status-toggle-btn p-2 rounded-full transition-all duration-200 ${isCompleted ? 'bg-green-500 hover:bg-green-600' : 'bg-yellow-400 hover:bg-yellow-500'}">
            <svg class="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"></path></svg>
        </button>` :
        `<span class="px-2 py-1 text-xs rounded-full ${isCompleted ? 'bg-green-200 text-green-800 dark:bg-green-700 dark:text-green-100' : 'bg-yellow-200 text-yellow-800 dark:bg-yellow-700 dark:text-yellow-100'}">${isCompleted ? "مكتمل" : "معلق"}</span>`; // Improved display for guests


    // Handle potentially missing data gracefully
    const orderName = order.name || 'غير متوفر';
    const orderRef = order.ref || 'N/A';
    const orderDate = order.date || 'غير متوفر';

    return `
        <tr id="order-${order.id}" class="border-b border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-750 transition-colors duration-150 ${statusColorClass} ${rowSelectedClass}">
            ${checkboxHtml}
            <td class="p-3" data-label="${nameLabel}">${orderName}</td>
            <td class="p-3" data-label="الرقم المرجعي">${orderRef}</td>
            <td class="p-3" data-label="التاريخ">${orderDate}</td>
            <td class="p-3 text-center" data-label="الحالة">
                ${statusButtonHtml}
            </td>
        </tr>
    `;
}


// (رسم لوحة تحكم الأدمن)
function renderAdminPanel() {
    // ... (الكود كما هو مع التأكد من وجود العنصر) ...
     if (!usersTableBody) {
          console.warn("Admin panel table body not found during render.");
          return; 
      }

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
        const currentRole = user.role || 'guest'; // Default to guest if role is missing
        const userEmail = user.email || 'غير متوفر'; // Handle missing email

        // Disable select for self or if role is missing/invalid
        const roleSelectHtml = isSelf ? 
            `<span class="font-bold text-blue-500">أدمن رئيسي (أنت)</span>` :
            `<select data-id="${user.id}" class="role-select form-select rounded bg-gray-100 dark:bg-gray-700 border-gray-300 dark:border-gray-600 focus:ring-blue-500 focus:border-blue-500" ${!user.role ? 'disabled' : ''}>
                <option value="guest" ${currentRole === 'guest' ? 'selected' : ''}>ضيف (Guest)</option>
                <option value="admin" ${currentRole === 'admin' ? 'selected' : ''}>أدمن (Admin)</option>
            </select>`;

        return `
            <tr class="border-b border-gray-200 dark:border-gray-700">
                <td class="p-3" data-label="الإيميل">${userEmail}</td>
                <td class="p-3" data-label="الصلاحية">${currentRole}</td>
                <td class="p-3" data-label="تغيير الصلاحية">
                    ${roleSelectHtml}
                </td>
            </tr>
        `;
    }).join('');
    
    usersTableBody.innerHTML = usersHtml;
    
    // Re-attach event listeners after rendering
    document.querySelectorAll('.role-select').forEach(select => {
        // Remove previous listener if any to prevent duplicates
        select.replaceWith(select.cloneNode(true)); 
    });
     document.querySelectorAll('.role-select').forEach(select => {
         select.addEventListener('change', (e) => {
            if (e.target.disabled) return; // Ignore disabled selects
            const newRole = e.target.value;
            const targetUserId = e.target.dataset.id;
             console.log(`Role change requested for user ${targetUserId} to ${newRole}`);
            handleChangeUserRole(targetUserId, newRole);
        });
     });
     console.log("Admin panel rendered.");
}

// (تحديث الواجهة بناءً على صلاحية المستخدم)
function updateUIForRole() {
    console.log(`Updating UI for role: ${userRole}`);
    // تأكد من وجود العناصر قبل محاولة تعديلها
    const adminOnlyElements = [
        addOrderForm, 
        adminPanelBtn, 
        bulkDeleteBtn,
        checkAllExpense, 
        checkAllIncome
    ].filter(Boolean); // Filter out null/undefined elements

    if (userRole === 'admin') {
         if (userRoleSpan) {
            userRoleSpan.textContent = "أدمن";
            userRoleSpan.className = "px-2 py-0.5 text-xs bg-green-200 text-green-800 rounded-full dark:bg-green-700 dark:text-green-100";
        }
        adminOnlyElements.forEach(el => el.classList.remove('hidden'));
         // تأكد من وجود زر لوحة الأدمن قبل إضافة الحدث
         if (adminPanelBtn) listenToAdminUsers(); // Start listening for users only if admin
    } else {
        if (userRoleSpan) {
            userRoleSpan.textContent = "ضيف";
            userRoleSpan.className = "px-2 py-0.5 text-xs bg-gray-200 text-gray-800 rounded-full dark:bg-gray-600 dark:text-gray-100";
        }
        adminOnlyElements.forEach(el => el.classList.add('hidden'));
        if (adminPanel) adminPanel.classList.add('hidden'); // Ensure panel is hidden
         if (usersUnsubscribe) { // Stop listening if no longer admin
             console.log("Stopping users listener as user is no longer admin.");
             usersUnsubscribe();
             usersUnsubscribe = null;
             allUsers = []; // Clear user cache
             renderAdminPanel(); // Clear admin panel table
        }
    }
    
    renderTables(); // Always re-render tables to show/hide checkboxes/buttons
    console.log("UI updated for role.");
}


// --- 13. وظائف تفاعلية (Interactions) ---
// ... (الكود كما هو مع إضافة console logs وتأكيدات) ...
// (تسجيل الدخول)
async function handleLogin() {
    // تأكد من وجود العناصر
    if (!loginEmail || !loginPassword) return;
    const email = loginEmail.value;
    const password = loginPassword.value;
    console.log(`Attempting login for: ${email}`);
    try {
        await signInWithEmailAndPassword(auth, email, password);
        showToast("تم تسجيل الدخول بنجاح!");
        loginForm?.reset(); // تأكد من وجود النموذج
    } catch (error) {
        console.error("Login Error:", error.code, error.message);
        showToast(getFriendlyAuthError(error.code), true);
    }
}

// (إنشاء حساب جديد)
async function handleRegister() {
     // تأكد من وجود العناصر
    if (!registerEmail || !registerPassword) return;
    const email = registerEmail.value;
    const password = registerPassword.value;
    console.log(`Attempting registration for: ${email}`);

    // (تحديد الصلاحية)
    const role = (email.toLowerCase() === SUPER_ADMIN_EMAIL.toLowerCase()) ? 'admin' : 'guest';
    console.log(`Assigning role: ${role}`);
    
    try {
        const userCredential = await createUserWithEmailAndPassword(auth, email, password);
        const user = userCredential.user;
        console.log(`User registered successfully: ${user.uid}`);
        
        // (حفظ بيانات المستخدم (مثل الصلاحية) في Firestore)
        const userDocRef = doc(db, `artifacts/${appId}/users`, user.uid);
         console.log(`Saving user data to Firestore at path: ${userDocRef.path}`);
        await setDoc(userDocRef, {
            email: user.email,
            role: role,
            createdAt: new Date() // Add a timestamp for tracking
        });
        console.log("User data saved to Firestore.");
        
        showToast("تم إنشاء الحساب وتسجيل الدخول بنجاح!");
        registerForm?.reset(); // تأكد من وجود النموذج

    } catch (error) {
        console.error("Register Error:", error.code, error.message);
        showToast(getFriendlyAuthError(error.code), true);
    }
}

// (إضافة أوردر جديد)
async function handleAddOrder() {
     // تأكد من وجود العناصر
    if (!orderType || !orderName || !orderRef || !orderDate || !addOrderForm) return;

    const type = orderType.value;
    const name = orderName.value.trim();
    const ref = orderRef.value.trim() || 'N/A';
    const date = orderDate.value;

    if (!name || !date) {
        showToast("يرجى ملء الاسم والتاريخ.", true);
        return;
    }
     console.log(`Attempting to add order: Type=${type}, Name=${name}, Ref=${ref}, Date=${date}`);

    try {
        const ordersColRef = collection(db, `artifacts/${appId}/orders`);
         console.log(`Adding document to collection: ${ordersColRef.path}`);
        await addDoc(ordersColRef, {
            type: type,
            name: name,
            ref: ref,
            date: date,
            status: 'pending', 
            addedBy: userId, // Ensure userId is available
            createdAt: new Date() // Add a timestamp
        });
         console.log("Order added successfully.");
        
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
    console.log(`Attempting to change role for user ${targetUserId} to ${newRole}`);
    if (userRole !== 'admin') {
         console.warn("Permission denied: Only admins can change roles.");
         showToast("ليس لديك الصلاحية لتغيير الأدوار.", true);
        return;
    }
     if (userId === targetUserId) {
         console.warn("Permission denied: Admin cannot change their own role.");
         showToast("لا يمكنك تغيير صلاحيتك.", true);
         renderAdminPanel(); // Re-render to reset the select dropdown
        return;
    }
    
    try {
        const userDocRef = doc(db, `artifacts/${appId}/users`, targetUserId);
         console.log(`Updating role at path: ${userDocRef.path}`);
        await updateDoc(userDocRef, {
            role: newRole
        });
         console.log("Role updated successfully.");
        showToast("تم تحديث الصلاحية بنجاح!");
        // The onSnapshot listener for users should automatically update the UI
    } catch (error) {
        console.error("Error updating role:", error);
        showToast("خطأ في تحديث الصلاحية: " + (error.message || error.code), true);
        renderAdminPanel(); // Re-render on error to reset dropdown
    }
}

// (تغيير حالة الأوردر)
async function handleToggleStatus(orderId, currentStatus) {
    console.log(`Toggling status for order ${orderId} from ${currentStatus}`);
    if (userRole !== 'admin') {
         console.warn("Permission denied: Only admins can toggle status.");
         return; // Silently fail for guests
     }
    
    const newStatus = (currentStatus === 'pending') ? 'completed' : 'pending';
    const orderDocRef = doc(db, `artifacts/${appId}/orders`, orderId);
     console.log(`Updating status to ${newStatus} at path: ${orderDocRef.path}`);
    
    try {
        await updateDoc(orderDocRef, {
            status: newStatus
        });
         console.log("Status updated successfully.");
        // UI updates via onSnapshot
    } catch (error) {
        console.error("Error toggling status:", error);
        showToast("خطأ في تحديث الحالة: " + (error.message || error.code), true);
    }
}

// (المسح المجمع)
async function handleBulkDelete() {
    console.log(`Bulk delete requested for ${selectedOrders.size} orders.`);
    if (userRole !== 'admin' || selectedOrders.size === 0) {
        console.warn("Permission denied or no orders selected.");
        return;
    }

    showConfirmModal(`هل أنت متأكد من مسح ${selectedOrders.size} أوردر؟ لا يمكن التراجع عن هذا الإجراء.`, async () => {
         console.log("Bulk delete confirmed by user.");
        try {
            const batch = writeBatch(db);
            selectedOrders.forEach(orderId => {
                const docRef = doc(db, `artifacts/${appId}/orders`, orderId);
                 console.log(`Adding delete operation to batch for: ${docRef.path}`);
                batch.delete(docRef);
            });
            
             console.log("Committing batch delete...");
            await batch.commit();
             console.log("Batch delete successful.");
            
            showToast(`تم مسح ${selectedOrders.size} أوردر بنجاح!`);
            selectedOrders.clear();
            renderTables(); // Re-render tables after deletion
            
        } catch (error) {
            console.error("Error bulk deleting orders:", error);
            showToast("حدث خطأ أثناء المسح: " + (error.message || error.code), true);
        }
    });
}


// (تفعيل الأزرار داخل الجداول)
function setupTableInteractions() {
     // console.log("Setting up table interactions..."); // Can be noisy, comment out if needed
    // (تغيير الحالة)
    document.querySelectorAll('.status-toggle-btn').forEach(btn => {
         // Remove old listener before adding new one
         const newBtn = btn.cloneNode(true);
         btn.parentNode.replaceChild(newBtn, btn);
         newBtn.addEventListener('click', (e) => {
            const id = e.currentTarget.dataset.id;
            const status = e.currentTarget.dataset.status;
            handleToggleStatus(id, status);
        });
    });

    // (تحديد Checkbox)
    document.querySelectorAll('.order-checkbox').forEach(box => {
         // Remove old listener before adding new one
         const newBox = box.cloneNode(true);
         box.parentNode.replaceChild(newBox, box);
         newBox.addEventListener('change', (e) => {
            const id = e.target.dataset.id;
             const row = document.getElementById(`order-${id}`);
            if (e.target.checked) {
                selectedOrders.add(id);
                row?.classList.add('bg-blue-100', 'dark:bg-blue-900'); // Check if row exists
            } else {
                selectedOrders.delete(id);
                row?.classList.remove('bg-blue-100', 'dark:bg-blue-900'); // Check if row exists
            }
            updateBulkDeleteButton();
        });
    });
     // console.log("Table interactions set up."); // Can be noisy
}

// (تحديد الكل)
function toggleCheckAll(checked, type) {
     console.log(`Toggling check all for type '${type}' to ${checked}`);
    const tableBody = (type === 'expense') ? expenseTableBody : incomeTableBody;
     if (!tableBody) return; // Ensure table body exists

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
     // console.log("Updating bulk delete button..."); // Can be noisy
    if (!bulkDeleteBtn) return; 
    
    const countSpan = bulkDeleteBtn.querySelector('span'); // Get the span inside
    
    if (userRole === 'admin' && selectedOrders.size > 0) {
        bulkDeleteBtn.classList.remove('hidden', 'opacity-0', 'scale-90');
        if (countSpan) countSpan.textContent = `(${selectedOrders.size})`; // Update count
    } else {
        bulkDeleteBtn.classList.add('hidden', 'opacity-0', 'scale-90');
        if (countSpan) countSpan.textContent = '(0)'; // Reset count
    }
     // console.log("Bulk delete button updated."); // Can be noisy
}


// --- 14. وظائف إضافية ---
// ... (الكود كما هو مع التأكد من وجود العناصر) ...
// (الوضع الليلي)
function initTheme() {
    console.log("Initializing theme...");
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
     console.log(`Theme set to: ${isDarkMode ? 'dark' : 'light'}`);
}

function toggleTheme() {
    const isDark = document.documentElement.classList.toggle('dark');
    localStorage.theme = isDark ? 'dark' : 'light';
    moonIcon?.classList.toggle('hidden', isDark); // تأكد من وجود العناصر
    sunIcon?.classList.toggle('hidden', !isDark); // تأكد من وجود العناصر
     console.log(`Theme toggled to: ${isDark ? 'dark' : 'light'}`);
}

// (إظهار/إخفاء كلمة المرور)
function togglePasswordVisibility(inputElement, toggleElement) {
     if (!inputElement || !toggleElement) return; // تأكد من وجود العناصر

    const type = inputElement.getAttribute('type') === 'password' ? 'text' : 'password';
    inputElement.setAttribute('type', type);
    const icon = toggleElement.querySelector('svg');
    if (!icon) return;

    if (type === 'password') {
        // Show eye icon
        icon.innerHTML = `<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"></path><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"></path>`;
    } else {
        // Show eye-off icon
        icon.innerHTML = `<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.542-7 .844-3.14 3.1-5.64 5.922-6.756M12 12a3 3 0 100-6 3 3 0 000 6z"></path><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M1 1l22 22"></path>`;
    }
}

// (تعيين تاريخ افتراضي)
function setDefaultDate() {
    if (!orderDate) return; // تأكد من وجود العنصر
    try {
        const today = new Date();
        const yyyy = today.getFullYear();
        const mm = String(today.getMonth() + 1).padStart(2, '0');
        const dd = String(today.getDate()).padStart(2, '0');
        orderDate.value = `${yyyy}-${mm}-${dd}`;
    } catch (e) {
        console.error("Error setting default date:", e);
    }
}

// (عرض رسائل خطأ أوضح للمستخدم)
function getFriendlyAuthError(code) {
    // ... (الكود كما هو) ...
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
         case 'auth/network-request-failed':
             return 'فشل الاتصال بالشبكة. تأكد من اتصالك بالإنترنت.';
        case 'auth/too-many-requests':
             return 'تم حظر الطلبات مؤقتاً بسبب كثرة المحاولات. حاول لاحقاً.';
        default:
             console.error("Unhandled Auth Error Code:", code); // Log unexpected codes
             return `حدث خطأ غير متوقع (${code}). يرجى المحاولة مرة أخرى.`;
    }
}

// (عرض نافذة تأكيد)
function showConfirmModal(message, onConfirm) {
    // ... (الكود كما هو) ...
    // إنشاء خلفية
    const overlay = document.createElement('div');
    overlay.className = 'fixed inset-0 bg-black bg-opacity-50 dark:bg-opacity-70 flex items-center justify-center z-50 p-4 transition-opacity duration-300 opacity-0'; // Start invisible
    overlay.id = 'confirm-overlay';

    // إنشاء النافذة
    const modal = document.createElement('div');
    modal.className = 'bg-white dark:bg-gray-800 rounded-lg shadow-xl p-6 w-full max-w-sm transform transition-all scale-95 opacity-0'; // Start invisible and scaled down
    modal.innerHTML = `
        <h3 class="text-lg font-bold text-gray-900 dark:text-white mb-4">تأكيد الإجراء</h3>
        <p class="text-sm text-gray-600 dark:text-gray-300 mb-6">${message}</p>
        <div class="flex justify-end space-x-2 rtl:space-x-reverse"> // Handle RTL spacing
            <button id="confirm-cancel" class="px-4 py-2 rounded-lg bg-gray-200 text-gray-800 hover:bg-gray-300 dark:bg-gray-700 dark:text-gray-200 dark:hover:bg-gray-600 transition-colors">إلغاء</button>
            <button id="confirm-ok" class="px-4 py-2 rounded-lg bg-red-600 text-white hover:bg-red-700 transition-colors focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2 dark:focus:ring-offset-gray-800">تأكيد المسح</button>
        </div>
    `;

    overlay.appendChild(modal);
    document.body.appendChild(overlay);

    // إضافة الأنيميشن
    requestAnimationFrame(() => { // Use requestAnimationFrame for smoother start
        overlay.classList.add('opacity-100');
        modal.classList.remove('scale-95', 'opacity-0');
        modal.classList.add('scale-100', 'opacity-100');
    });

    // وظائف الأزرار
    const confirmOkBtn = document.getElementById('confirm-ok');
    const confirmCancelBtn = document.getElementById('confirm-cancel');

    const closeModal = () => {
         // Prevent double clicks
         confirmOkBtn.disabled = true;
         confirmCancelBtn.disabled = true;

        modal.classList.remove('scale-100', 'opacity-100');
        modal.classList.add('scale-95', 'opacity-0');
        overlay.classList.remove('opacity-100');
        setTimeout(() => overlay.remove(), 300); // Remove after transition
    };

    confirmCancelBtn.addEventListener('click', closeModal);
    
    confirmOkBtn.addEventListener('click', () => {
        onConfirm(); 
        closeModal();
    });

     // Close modal if clicking outside
     overlay.addEventListener('click', (e) => {
         if (e.target === overlay) {
             closeModal();
         }
     });
}


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
// هذه وظيفة جديدة ستقوم بتحميل الخط من الإنترنت عند الحاجة
async function loadFontAsBase64(url) {
    try {
        const response = await fetch(url);
        if (!response.ok) throw new Error(`Failed to fetch font: ${response.statusText}`);
        const blob = await response.blob();
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onloadend = () => {
                // Get Base64 string, remove data: prefix
                const base64data = reader.result.split(',')[1];
                resolve(base64data);
            };
            reader.onerror = reject;
            reader.readAsDataURL(blob);
        });
    } catch (error) {
        console.error("Error loading font:", error);
        showToast("فشل تحميل الخط العربي للـ PDF", "error");
        return null;
    }
}

// ----------------------------------------------------


// --- 5. تهيئة Firebase وربط العناصر ---
// متغيرات عامة
let db, auth;
let userId, userRole = 'guest';
let allOrders = [], allUsers = [], selectedOrders = new Set();
let ordersUnsubscribe = null, usersUnsubscribe = null;

// --- !!! نقل العناصر إلى داخل DOMContentLoaded !!! ---
// سنقوم بتعريف المتغيرات هنا، وتعيين قيمها بعد تحميل الصفحة

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


// --- 6. تشغيل التطبيق بعد تحميل الصفحة ---
document.addEventListener('DOMContentLoaded', () => {
    
    // --- !!! الخطوة 6أ: ربط كل العناصر الآن ---
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
    
    // --- الخطوة 6ب: تهيئة التطبيق ---
    try {
        initializeAppAndAuth();
        setupEventListeners();
        initTheme();
    } catch (error) {
        console.error("Fatal Error initializing app:", error);
        loadingSpinner.innerHTML = "حدث خطأ فادح. يرجى تحديث الصفحة.";
    }
});

// --- 7. الوظائف الأساسية ---

// تهيئة Firebase
async function initializeAppAndAuth() {
    try {
        // تهيئة التطبيق
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
                
                // جلب صلاحيات المستخدم
                listenToUserRole(user.uid);
                
                // عرض التطبيق الرئيسي
                authScreen.classList.add('hidden');
                mainApp.classList.remove('hidden');
                
            } else {
                // المستخدم سجل خروجه
                userId = null;
                userRole = 'guest';
                
                // إخفاء التطبيق وعرض شاشة الدخول
                authScreen.classList.remove('hidden');
                mainApp.classList.add('hidden');
                hideLoadingSpinner(); // إخفاء التحميل لإظهار شاشة الدخول
                
                // إلغاء متابعة البيانات
                if (ordersUnsubscribe) ordersUnsubscribe();
                if (usersUnsubscribe) usersUnsubscribe();
            }
        });

    } catch (error) {
        console.error("Firebase Init Error:", error);
        loadingSpinner.innerHTML = "فشل الاتصال بقاعدة البيانات. تأكد من صحة بيانات الاتصال.";
    }
}

// إخفاء شاشة التحميل
function hideLoadingSpinner() {
    if (loadingSpinner) {
        loadingSpinner.classList.add('opacity-0', 'pointer-events-none');
    }
    if (appContent) {
        appContent.classList.remove('opacity-0');
    }
}

// إظهار رسالة مؤقتة
function showToast(message, type = 'success') {
    const toast = document.getElementById('toast');
    const toastMessage = document.getElementById('toast-message');
    
    toastMessage.textContent = message;
    
    // تحديد لون الرسالة
    if (type === 'error') {
        toast.classList.replace('bg-green-500', 'bg-red-500');
    } else {
        toast.classList.replace('bg-red-500', 'bg-green-500');
    }
    
    toast.classList.remove('opacity-0', '-translate-y-full');
    toast.classList.add('opacity-100', 'translate-y-4');
    
    setTimeout(() => {
        toast.classList.remove('opacity-100', 'translate-y-4');
        toast.classList.add('opacity-0', '-translate-y-full');
    }, 3000);
}

// --- 8. ربط الأحداث (Event Listeners) ---
function setupEventListeners() {

    // (شاشات الدخول والتسجيل)
    authToggleLinks.forEach(link => {
        link.addEventListener('click', (e) => {
            e.preventDefault();
            loginForm.classList.toggle('hidden');
            registerForm.classList.toggle('hidden');
        });
    });

    // إظهار/إخفاء كلمة المرور (تسجيل الدخول)
    loginPasswordToggle.addEventListener('click', () => {
        const type = loginPassword.getAttribute('type') === 'password' ? 'text' : 'password';
        loginPassword.setAttribute('type', type);
        loginPasswordToggle.querySelector('.eye-open').classList.toggle('hidden');
        loginPasswordToggle.querySelector('.eye-slash').classList.toggle('hidden');
    });

    // إظهار/إخفاء كلمة المرور (إنشاء حساب)
    registerPasswordToggle.addEventListener('click', () => {
        const type = registerPassword.getAttribute('type') === 'password' ? 'text' : 'password';
        registerPassword.setAttribute('type', type);
        registerPasswordToggle.querySelector('.eye-open').classList.toggle('hidden');
        registerPasswordToggle.querySelector('.eye-slash').classList.toggle('hidden');
    });

    // (تسجيل الدخول)
    loginForm.addEventListener('submit', (e) => {
        e.preventDefault();
        const email = loginEmail.value;
        const password = loginPassword.value;
        showToast('جاري تسجيل الدخول...', 'success');
        signInWithEmailAndPassword(auth, email, password)
            .catch(error => {
                console.error("Login Error:", error);
                showToast(`فشل تسجيل الدخول: ${translateError(error.code)}`, 'error');
            });
    });

    // (إنشاء حساب جديد)
    registerForm.addEventListener('submit', (e) => {
        e.preventDefault();
        const email = registerEmail.value;
        const password = registerPassword.value;
        
        if (password.length < 6) {
            showToast("كلمة المرور يجب أن تكون 6 أحرف على الأقل", "error");
            return;
        }
        
        showToast('جاري إنشاء الحساب...', 'success');
        createUserWithEmailAndPassword(auth, email, password)
            .then(userCredential => {
                // إنشاء ملف للمستخدم الجديد في قاعدة البيانات
                const userRef = doc(db, `artifacts/${appId}/users`, userCredential.user.uid);
                // تحديد الصلاحية (أدمن أو ضيف)
                const role = (userCredential.user.email === SUPER_ADMIN_EMAIL) ? 'admin' : 'guest';
                
                return setDoc(userRef, {
                    email: userCredential.user.email,
                    role: role,
                    uid: userCredential.user.uid
                });
            })
            .then(() => {
                showToast("تم إنشاء الحساب بنجاح", "success");
            })
            .catch(error => {
                console.error("Register Error:", error);
                showToast(`فشل إنشاء الحساب: ${translateError(error.code)}`, 'error');
            });
    });

    // (تسجيل الخروج)
    logoutBtn.addEventListener('click', () => {
        signOut(auth);
        showToast("تم تسجيل الخروج", "success");
    });

    // (الوضع الليلي)
    toggleThemeBtn.addEventListener('click', () => {
        const isDark = document.documentElement.classList.toggle('dark');
        localStorage.setItem('theme', isDark ? 'dark' : 'light');
        updateThemeIcons(isDark);
    });

    // (لوحة تحكم الأدمن)
    adminPanelBtn.addEventListener('click', () => {
        adminPanel.classList.remove('hidden');
        listenToAllUsers(); // جلب المستخدمين عند فتح اللوحة
    });
    closeAdminPanelBtn.addEventListener('click', () => {
        adminPanel.classList.add('hidden');
        if (usersUnsubscribe) usersUnsubscribe(); // إيقاف المتابعة عند إغلاق اللوحة
    });

    // (إضافة أوردر جديد)
    addOrderForm.addEventListener('submit', (e) => {
        e.preventDefault();
        
        const type = orderType.value;
        const name = orderName.value;
        const ref = orderRef.value;
        const date = orderDate.value;
        
        if (!name || !ref || !date) {
            showToast("يرجى ملء جميع الحقول", "error");
            return;
        }

        const newOrder = {
            type: type,
            name: name,
            ref: ref,
            date: date,
            status: "pending", // pending or completed
            addedBy: userId 
        };
        
        const ordersCollection = collection(db, `artifacts/${appId}/orders`);
        addDoc(ordersCollection, newOrder)
            .then(() => {
                showToast("تمت إضافة الأوردر بنجاح", "success");
                addOrderForm.reset();
                setDefaultDate(); // إعادة تعيين التاريخ لليوم
            })
            .catch(error => {
                console.error("Error adding order: ", error);
                showToast(`حدث خطأ أثناء إضافة الأوردر: ${error.message}`, 'error');
            });
    });

    // (الفلاتر والترتيب)
    filterSearch.addEventListener('input', renderTables);
    filterDate.addEventListener('change', renderTables);
    filterSort.addEventListener('change', renderTables);
    clearFiltersBtn.addEventListener('click', () => {
        filterSearch.value = '';
        filterDate.value = '';
        filterSort.value = 'date-desc';
        selectedOrders.clear();
        renderTables();
    });

    // (تصدير)
    exportBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        exportDropdown.classList.toggle('hidden');
    });
    document.addEventListener('click', () => {
        if (!exportDropdown.classList.contains('hidden')) {
            exportDropdown.classList.add('hidden');
        }
    });

    // (المسح المجمع)
    bulkDeleteBtn.addEventListener('click', () => {
        if (selectedOrders.size === 0) {
            showToast("يرجى تحديد أوردر واحد على الأقل للمسح", "error");
            return;
        }

        // استخدام نافذة تأكيد مخصصة (أو confirm مؤقتاً لو النافذة المخصصة غير جاهزة)
        if (!confirm(`هل أنت متأكد من مسح ${selectedOrders.size} أوردر؟ لا يمكن التراجع عن هذا الأمر.`)) {
            return;
        }
        
        showToast(`جاري مسح ${selectedOrders.size} أوردر...`, 'success');
        
        const batch = writeBatch(db);
        selectedOrders.forEach(orderId => {
            const docRef = doc(db, `artifacts/${appId}/orders`, orderId);
            batch.delete(docRef);
        });
        
        batch.commit()
            .then(() => {
                showToast("تم مسح الأوردرات المحددة بنجاح", "success");
                selectedOrders.clear();
                renderTables(); // إعادة رسم الجداول
            })
            .catch(error => {
                console.error("Error bulk deleting orders:", error);
                showToast(`فشل مسح الأوردرات: ${error.message}`, 'error');
            });
    });

    // (تحديد الكل)
    checkAllExpense.addEventListener('change', (e) => {
        toggleCheckAll(e.target.checked, 'expense');
    });
    checkAllIncome.addEventListener('change', (e) => {
        toggleCheckAll(e.target.checked, 'income');
    });

} // --- نهاية setupEventListeners ---


// --- 9. وظائف مساعدة (التصدير) ---

// إظهار وإخفاء قايمة التصدير
exportCsvBtn.addEventListener('click', (e) => {
    e.preventDefault();
    const dataToExport = getFilteredAndSortedData();
    if (dataToExport.length === 0) {
        showToast("لا يوجد بيانات لتصديرها", "error");
        return;
    }
    
    // تحضير بيانات CSV
    let csvContent = "data:text/csv;charset=utf-8,\uFEFF"; // \uFEFF لدعم العربي في Excel
    csvContent += "النوع,الاسم (عميل/مورد),الرقم المرجعي,التاريخ,الحالة\n"; // Header
    
    dataToExport.forEach(order => {
        const typeAr = order.type === 'expense' ? 'صرف' : 'استلام';
        const statusAr = order.status === 'completed' ? 'مكتمل' : 'معلق';
        const row = [typeAr, order.name.replace(/,/g, ''), order.ref, order.date, statusAr].join(",");
        csvContent += row + "\n";
    });
    
    // إنشاء لينك التحميل
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", "orders_report.csv");
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    showToast("تم تصدير ملف CSV", "success");
});

// تصدير PDF (تقرير)
exportPdfBtn.addEventListener('click', async (e) => { // <-- 1. أضفنا async
    e.preventDefault();
    const dataToExport = getFilteredAndSortedData();
    
    if (dataToExport.length === 0) {
        showToast("لا يوجد بيانات لتصديرها", "error");
        return;
    }

    // --- 2. خطوة تحميل الخط الجديدة ---
    showToast('جاري تحضير الخطوط للـ PDF...');
    // رابط لملف خط Amiri-Regular.ttf كامل وسليم
    const fontUrl = "https://github.com/alif-type/amiri/raw/main/fonts/ttf/Amiri-Regular.ttf";
    const fontBase64 = await loadFontAsBase64(fontUrl);
    
    if (!fontBase64) {
        showToast('فشل تحميل الخط العربي، لا يمكن إنشاء الـ PDF.', 'error');
        return; // نتوقف هنا لو الخط محملش
    }
    showToast('جاري إنشاء ملف الـ PDF...');
    // ---------------------------------

    const { jsPDF } = window.jspdf;
    const doc = new jsPDF();
    
    // !!! --- إصلاح الخط العربي --- !!!
    // 1. إضافة ملف الخط المضمن
    doc.addFileToVFS('Amiri-Regular.ttf', fontBase64); // <-- 3. استخدام الخط المحمل
    // 2. إضافة الخط لـ jsPDF
    doc.addFont('Amiri-Regular.ttf', 'Amiri', 'normal');
    // 3. تعيين الخط الافتراضي للمستند
    doc.setFont('Amiri', 'normal');
    // !!! -------------------------- !!!

    // فصل البيانات
    const expenseOrders = dataToExport.filter(o => o.type === 'expense');
    const incomeOrders = dataToExport.filter(o => o.type === 'income');
    
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
        startY += 8;
        
        const expenseHead = [['الحالة', 'التاريخ', 'الرقم المرجعي', 'العميل']];
        const expenseBody = expenseOrders.map(o => [
            o.status === 'completed' ? 'مكتمل' : 'معلق',
            o.date,
            o.ref,
            o.name
        ]);
        
        doc.autoTable({
            head: expenseHead,
            body: expenseBody,
            startY: startY,
            theme: 'grid',
            styles: fontStyles,
            headStyles: headerStyles,
            bodyStyles: { halign: 'right' },
            didDrawPage: (data) => {
                // التأكد من أن الخط العربي مفعل في كل صفحة
                doc.setFont("Amiri", "normal");
            }
        });
        startY = doc.autoTable.previous.finalY + 15;
    }

    // جدول الاستلامات
    if (incomeOrders.length > 0) {
         doc.setFontSize(14);
         doc.text("سجل الاستلامات (من مورد)", 200, startY, { align: 'right' });
         startY += 8;
         
         const incomeHead = [['الحالة', 'التاريخ', 'الرقم المرجعي', 'المورد']];
         const incomeBody = incomeOrders.map(o => [
             o.status === 'completed' ? 'مكتمل' : 'معلق',
             o.date,
             o.ref,
             o.name
         ]);
         
         doc.autoTable({
            head: incomeHead,
            body: incomeBody,
            startY: startY,
            theme: 'grid',
            styles: fontStyles,
            headStyles: headerStyles,
            bodyStyles: { halign: 'right' },
            didDrawPage: (data) => {
                doc.setFont("Amiri", "normal");
            }
         });
    }
    
    // الحفظ
    doc.save('orders_report.pdf');
    showToast("تم تصدير ملف PDF", "success");
});


// --- 10. وظائف جلب البيانات (Real-time) ---

// جلب صلاحيات المستخدم
function listenToUserRole(uid) {
    const userRef = doc(db, `artifacts/${appId}/users`, uid);
    onSnapshot(userRef, (docSnap) => {
        if (docSnap.exists()) {
            const userData = docSnap.data();
            userRole = userData.role; // 'admin' or 'guest'
            updateUIAfterRoleChange();
        } else {
            // حالة نادرة: المستخدم مسجل دخول لكن ليس له ملف
            userRole = 'guest';
            updateUIAfterRoleChange();
        }
        
        // إخفاء شاشة التحميل فقط بعد التأكد من الصلاحية
        hideLoadingSpinner();
        
        // بدء جلب الأوردرات بعد معرفة الصلاحية
        listenToOrders();
    });
}

// تحديث واجهة المستخدم بناءً على الصلاحية
function updateUIAfterRoleChange() {
    if (userRole === 'admin') {
        userRoleSpan.textContent = 'أدمن';
        userRoleSpan.className = 'px-2 py-0.5 text-xs font-semibold text-white bg-green-500 rounded-full shadow-md transition-all duration-300 ease-in-out';
        adminPanelBtn.classList.remove('hidden');
        addOrderForm.classList.remove('opacity-50', 'pointer-events-none');
        // إظهار عناصر الأدمن في الجداول (سيتم التعامل معها في renderTables)
    } else {
        userRoleSpan.textContent = 'ضيف';
        userRoleSpan.className = 'px-2 py-0.5 text-xs font-semibold text-gray-700 bg-gray-300 rounded-full shadow-md transition-all duration-300 ease-in-out';
        adminPanelBtn.classList.add('hidden');
        addOrderForm.classList.add('opacity-50', 'pointer-events-none');
    }
    // إعادة رسم الجداول لإظهار/إخفاء عناصر الأدمن
    renderTables();
}

// جلب الأوردرات (لحظياً)
function listenToOrders() {
    // إلغاء المتابعة القديمة إذا كانت موجودة
    if (ordersUnsubscribe) {
        ordersUnsubscribe();
    }
    
    const ordersQuery = query(collection(db, `artifacts/${appId}/orders`));
    
    ordersUnsubscribe = onSnapshot(ordersQuery, (snapshot) => {
        allOrders = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        renderTables(); // إعادة رسم الجداول مع كل تحديث
    }, (error) => {
        console.error("Error listening to orders:", error);
        showToast("خطأ في جلب الأوردرات", "error");
    });
}

// جلب كل المستخدمين (للوحة الأدمن)
function listenToAllUsers() {
    // إلغاء المتابعة القديمة
    if (usersUnsubscribe) {
        usersUnsubscribe();
    }
    
    const usersQuery = query(collection(db, `artifacts/${appId}/users`));
    
    usersUnsubscribe = onSnapshot(usersQuery, (snapshot) => {
        allUsers = snapshot.docs.map(doc => doc.data());
        renderUsersTable(); // إعادة رسم جدول المستخدمين
    }, (error) => {
        console.error("Error listening to users:", error);
    });
}


// --- 11. وظائف رسم الجداول (Rendering) ---

// فلترة وترتيب البيانات
function getFilteredAndSortedData() {
    const searchTerm = filterSearch.value.toLowerCase();
    const filterByDate = filterDate.value;
    const sortBy = filterSort.value;

    let filtered = allOrders;

    // 1. الفلترة بالبحث (الاسم أو الرقم المرجعي)
    if (searchTerm) {
        filtered = filtered.filter(order => 
            order.name.toLowerCase().includes(searchTerm) ||
            order.ref.toLowerCase().includes(searchTerm)
        );
    }

    // 2. الفلترة بالتاريخ
    if (filterByDate) {
        filtered = filtered.filter(order => order.date === filterByDate);
    }
    
    // 3. الترتيب
    filtered.sort((a, b) => {
        switch (sortBy) {
            case 'date-asc':
                return new Date(a.date) - new Date(b.date);
            case 'name-asc':
                return a.name.localeCompare(b.name);
            case 'name-desc':
                return b.name.localeCompare(a.name);
            case 'ref-asc':
                return a.ref.localeCompare(b.ref, undefined, { numeric: true });
            case 'ref-desc':
                return b.ref.localeCompare(a.ref, undefined, { numeric: true });
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
        .filter(order => order.type === 'expense')
        .map(order => createOrderRowHtml(order))
        .join('');
        
    const incomeHtml = filteredData
        .filter(order => order.type === 'income')
        .map(order => createOrderRowHtml(order))
        .join('');

    expenseTableBody.innerHTML = expenseHtml || `<tr><td colspan="6" class="p-4 text-center text-gray-500 dark:text-gray-400 animate-pulse">لا توجد مصروفات تطابق البحث...</td></tr>`;
    incomeTableBody.innerHTML = incomeHtml || `<tr><td colspan="6" class="p-4 text-center text-gray-500 dark:text-gray-400 animate-pulse">لا توجد استلامات تطابق البحث...</td></tr>`;

    // تفعيل وظائف الأزرار (تغيير الحالة، المسح)
    setupTableInteractions();
    
    // تحديث زرار "المسح المحدد"
    updateBulkDeleteButton();
    
    // تحديث "تحديد الكل"
    checkAllExpense.checked = false;
    checkAllIncome.checked = false;
}

// إنشاء سطر واحد في الجدول (HTML)
function createOrderRowHtml(order) {
    const isCompleted = order.status === 'completed';
    const statusColor = isCompleted ? 'bg-green-100 dark:bg-green-900' : 'bg-yellow-100 dark:bg-yellow-900';
    const statusText = isCompleted ? 'مكتمل' : 'معلق';
    const statusBtnColor = isCompleted 
        ? 'bg-green-500 hover:bg-green-600 dark:bg-green-600 dark:hover:bg-green-700' 
        : 'bg-yellow-500 hover:bg-yellow-600 dark:bg-yellow-600 dark:hover:bg-yellow-700';
    
    // إظهار خانة الاختيار فقط للأدمن
    const adminCheckbox = userRole === 'admin' ? `
        <td class="p-3 text-center">
            <input type="checkbox" data-id="${order.id}" class="order-checkbox rounded border-gray-300 dark:border-gray-600 dark:bg-gray-900 text-blue-600 focus:ring-blue-500 transition duration-150 ease-in-out" ${selectedOrders.has(order.id) ? 'checked' : ''}>
        </td>
    ` : '<td class="p-3"></td>'; // خلية فاضية للضيف
    
    // زرار تغيير الحالة (يظهر للأدمن فقط)
    const statusButton = userRole === 'admin' ? `
        <button data-id="${order.id}" data-status="${order.status}" class="status-toggle-btn ${statusBtnColor} text-white px-3 py-1 rounded-full text-xs font-semibold shadow-md hover:shadow-lg transition-all duration-200 ease-in-out transform hover:scale-105">
            ${statusText}
        </button>
    ` : `
        <span class="${isCompleted ? 'text-green-600 dark:text-green-400' : 'text-yellow-600 dark:text-yellow-400'} font-semibold text-xs">${statusText}</span>
    `;

    return `
        <tr class="${statusColor} border-b border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors duration-150 ease-in-out">
            ${adminCheckbox}
            <td class="p-3 font-semibold text-gray-800 dark:text-gray-200">${order.name}</td>
            <td class="p-3 text-gray-700 dark:text-gray-300">${order.ref}</td>
            <td class="p-3 text-gray-600 dark:text-gray-400">${order.date}</td>
            <td class="p-3 text-center">${statusButton}</td>
        </tr>
    `;
}


// رسم جدول المستخدمين (في لوحة الأدمن)
function renderUsersTable() {
    if (!usersTableBody) return;
    
    // ترتيب (الأدمن الرئيسي أولاً، ثم الأدمنز، ثم الضيوف)
    allUsers.sort((a, b) => {
        if (a.email === SUPER_ADMIN_EMAIL) return -1;
        if (b.email === SUPER_ADMIN_EMAIL) return 1;
        if (a.role === 'admin' && b.role !== 'admin') return -1;
        if (a.role !== 'admin' && b.role === 'admin') return 1;
        return a.email.localeCompare(b.email);
    });
    
    const usersHtml = allUsers.map(user => {
        const isSuperAdmin = user.email === SUPER_ADMIN_EMAIL;
        const isAdmin = user.role === 'admin';
        
        let roleToggle;
        if (isSuperAdmin) {
            roleToggle = `<span class="px-3 py-1 text-xs font-bold text-white bg-red-600 rounded-full">أدمن رئيسي</span>`;
        } else if (isAdmin) {
            roleToggle = `<button data-uid="${user.uid}" data-role="admin" class="role-toggle-btn bg-green-500 hover:bg-green-600 text-white px-3 py-1 rounded-full text-xs font-semibold shadow-md transition-all duration-200 ease-in-out">
                أدمن
            </button>`;
        } else {
            roleToggle = `<button data-uid="${user.uid}" data-role="guest" class="role-toggle-btn bg-gray-400 hover:bg-gray-500 text-white px-3 py-1 rounded-full text-xs font-semibold shadow-md transition-all duration-200 ease-in-out">
                ضيف
            </button>`;
        }

        return `
            <tr class="border-b border-gray-700 hover:bg-gray-800 transition-colors duration-150 ease-in-out">
                <td class="p-3">${user.email}</td>
                <td class="p-3 text-center">${roleToggle}</td>
            </tr>
        `;
    }).join('');
    
    usersTableBody.innerHTML = usersHtml;
    
    // تفعيل أزرار تغيير الصلاحيات
    document.querySelectorAll('.role-toggle-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            const uidToChange = btn.dataset.uid;
            const currentRole = btn.dataset.role;
            const newRole = currentRole === 'admin' ? 'guest' : 'admin';
            
            showToast(`جاري تغيير صلاحية ${uidToChange} إلى ${newRole}...`, 'success');
            const userRef = doc(db, `artifacts/${appId}/users`, uidToChange);
            updateDoc(userRef, { role: newRole })
                .catch(error => {
                    console.error("Error updating role:", error);
                    showToast("فشل تحديث الصلاحية", "error");
                });
        });
    });
}


// --- 12. وظائف تفاعلية (Interactions) ---

// تفعيل الأزرار داخل الجداول
function setupTableInteractions() {
    // (تغيير الحالة)
    document.querySelectorAll('.status-toggle-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            if (userRole !== 'admin') return;
            
            const orderId = e.target.dataset.id;
            const currentStatus = e.target.dataset.status;
            const newStatus = currentStatus === 'completed' ? 'pending' : 'completed';
            
            const docRef = doc(db, `artifacts/${appId}/orders`, orderId);
            updateDoc(docRef, { status: newStatus })
                .then(() => {
                    showToast("تم تحديث الحالة", "success");
                })
                .catch(error => {
                    console.error("Error updating status:", error);
                    showToast("فشل تحديث الحالة", "error");
                });
        });
    });
    
    // (تحديد أوردر للمسح)
    document.querySelectorAll('.order-checkbox').forEach(checkbox => {
        checkbox.addEventListener('change', (e) => {
            const orderId = e.target.dataset.id;
            if (e.target.checked) {
                selectedOrders.add(orderId);
            } else {
                selectedOrders.delete(orderId);
            }
            updateBulkDeleteButton();
        });
    });
}

// (تحديث زرار المسح المجمع)
function updateBulkDeleteButton() {
    if (userRole === 'admin' && selectedOrders.size > 0) {
        bulkDeleteBtn.classList.remove('hidden', 'opacity-0', 'scale-90');
        bulkDeleteBtn.classList.add('opacity-100', 'scale-100');
        bulkDeleteBtn.querySelector('span').textContent = `مسح (${selectedOrders.size})`;
    } else {
        bulkDeleteBtn.classList.add('opacity-0', 'scale-90');
        setTimeout(() => bulkDeleteBtn.classList.add('hidden'), 200); // إخفاء بعد الانيميشن
    }
}

// (تحديد كل الأوردرات في جدول)
function toggleCheckAll(isChecked, type) {
    const tableBody = type === 'expense' ? expenseTableBody : incomeTableBody;
    const checkboxes = tableBody.querySelectorAll('.order-checkbox');
    
    checkboxes.forEach(cb => {
        cb.checked = isChecked;
        const orderId = cb.dataset.id;
        if (isChecked) {
            selectedOrders.add(orderId);
        } else {
            selectedOrders.delete(orderId);
        }
    });
    updateBulkDeleteButton();
}


// --- 13. وظائف إضافية ---

// (الوضع الليلي)
function initTheme() {
    const savedTheme = localStorage.getItem('theme');
    if (savedTheme === 'dark' || (!savedTheme && window.matchMedia('(prefers-color-scheme: dark)').matches)) {
        document.documentElement.classList.add('dark');
        updateThemeIcons(true);
    } else {
        document.documentElement.classList.remove('dark');
        updateThemeIcons(false);
    }
}

function updateThemeIcons(isDark) {
    if (isDark) {
        moonIcon.classList.add('hidden');
        sunIcon.classList.remove('hidden');
    } else {
        moonIcon.classList.remove('hidden');
        sunIcon.classList.add('hidden');
    }
}

// (تعيين التاريخ الافتراضي)
function setDefaultDate() {
    if (!orderDate) return;
    const today = new Date();
    const yyyy = today.getFullYear();
    const mm = String(today.getMonth() + 1).padStart(2, '0');
    const dd = String(today.getDate()).padStart(2, '0');
    orderDate.value = `${yyyy}-${mm}-${dd}`;
}

// (ترجمة أخطاء Firebase)
function translateError(errorCode) {
    switch (errorCode) {
        case 'auth/email-already-in-use':
            return 'هذا الإيميل مسجل بالفعل.';
        case 'auth/invalid-email':
            return 'الإيميل غير صحيح.';
        case 'auth/weak-password':
            return 'كلمة المرور ضعيفة (6 أحرف على الأقل).';
        case 'auth/wrong-password':
        case 'auth/invalid-credential':
            return 'الإيميل أو كلمة المرور غير صحيحة.';
        default:
            return 'حدث خطأ غير معروف.';
    }
}


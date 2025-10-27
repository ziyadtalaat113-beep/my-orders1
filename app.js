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


// استيراد المكتبات
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

// تعريف متغيرات التطبيق
let db, auth;
let userId;
let userRole = 'guest'; // 'guest' or 'admin'
let allOrders = [];
let allUsers = []; // Local cache for admin panel
let ordersUnsubscribe = null;
let usersUnsubscribe = null;

let selectedOrders = new Set(); // لتخزين الأوردرات المحددة للمسح

// عناصر الواجهة
const loadingScreen = document.getElementById('loading-screen');
const authScreen = document.getElementById('auth-screen');
const appScreen = document.getElementById('app-screen');

const loginFormContainer = document.getElementById('login-form-container');
const registerFormContainer = document.getElementById('register-form-container');
const loginError = document.getElementById('login-error');
const registerError = document.getElementById('register-error');

const showLoginBtn = document.getElementById('show-login');
const showRegisterBtn = document.getElementById('show-register');

const userInfo = document.getElementById('user-info');
const userEmailDisplay = document.getElementById('user-email');
const userRoleBadge = document.getElementById('user-role-badge');
const logoutBtn = document.getElementById('logout-btn');

const adminOnlyElements = document.querySelectorAll('.admin-only');
const adminPanelContainer = document.getElementById('admin-panel-container');
const usersTableBody = document.getElementById('users-table-body');

const addOrderForm = document.getElementById('add-order-form');
const orderTypeSelect = document.getElementById('order-type');
const clientField = document.getElementById('client-field');
const supplierField = document.getElementById('supplier-field');
const clientNameInput = document.getElementById('client-name');
const supplierNameInput = document.getElementById('supplier-name');
const orderDateInput = document.getElementById('order-date');

const searchInput = document.getElementById('search-input');
const filterDateInput = document.getElementById('filter-date');
const sortSelect = document.getElementById('sort-select');
const clearFiltersBtn = document.getElementById('clear-filters');

// عناصر التصدير الجديدة
const exportMenuBtn = document.getElementById('export-menu-btn');
const exportMenu = document.getElementById('export-menu');
const exportCsvBtn = document.getElementById('export-csv-btn');
const exportPdfBtn = document.getElementById('export-pdf-btn');

const expenseTableBody = document.getElementById('expense-table-body');
const incomeTableBody = document.getElementById('income-table-body');
const noDataMessage = document.getElementById('no-data-message');

// عناصر المسح المجمع
const bulkDeleteContainer = document.getElementById('bulk-delete-container');
const bulkDeleteBtn = document.getElementById('bulk-delete-btn');
const selectAllExpense = document.getElementById('select-all-expense');
const selectAllIncome = document.getElementById('select-all-income');

// عناصر الوضع الليلي
const darkModeToggle = document.getElementById('dark-mode-toggle');
const sunIcon = document.getElementById('sun-icon');
const moonIcon = document.getElementById('moon-icon');

// --- 1. تهيئة الوضع الليلي ---
function initDarkMode() {
    // تحقق من الإعداد المحفوظ في localStorage
    if (localStorage.theme === 'dark' || (!('theme' in localStorage) && window.matchMedia('(prefers-color-scheme: dark)').matches)) {
        document.documentElement.classList.add('dark');
        moonIcon.classList.remove('hidden');
        sunIcon.classList.add('hidden');
    } else {
        document.documentElement.classList.remove('dark');
        sunIcon.classList.remove('hidden');
        moonIcon.classList.add('hidden');
    }

    darkModeToggle.addEventListener('click', () => {
        // تبديل الوضع
        const isDark = document.documentElement.classList.toggle('dark');
        localStorage.theme = isDark ? 'dark' : 'light';
        sunIcon.classList.toggle('hidden');
        moonIcon.classList.toggle('hidden');
    });
}

// --- 2. تهيئة Firebase والمصادقة ---
async function initializeAppAndAuth() {
    try {
        const app = initializeApp(firebaseConfig);
        db = getFirestore(app);
        auth = getAuth(app);

        // تفعيل التخزين المحلي (Offline)
        await enableIndexedDbPersistence(db);

        // مراقبة حالة تسجيل الدخول
        onAuthStateChanged(auth, async (user) => {
            if (user) {
                // المستخدم مسجل دخوله
                userId = user.uid;
                await fetchUserRole(user.uid, user.email);
                
                // إظهار واجهة التطبيق
                showAppScreen();
                
                // جلب البيانات
                setupDataListeners();
                
                // تحديث الواجهة بناءً على الصلاحية
                updateUIForRole();
                
                // ملء بيانات المستخدم
                userEmailDisplay.textContent = user.email;
                userRoleBadge.textContent = userRole === 'admin' ? 'أدمن' : 'ضيف';
                userRoleBadge.className = userRole === 'admin' 
                    ? 'px-2 py-0.5 rounded-full text-xs font-semibold bg-green-100 text-green-800 dark:bg-green-800 dark:text-green-100 transition-all duration-300' 
                    : 'px-2 py-0.5 rounded-full text-xs font-semibold bg-gray-100 text-gray-800 dark:bg-gray-600 dark:text-gray-100 transition-all duration-300';

            } else {
                // المستخدم غير مسجل دخوله
                userId = null;
                userRole = 'guest';
                showAuthScreen();
                cleanupDataListeners();
            }
        });

    } catch (error) {
        console.error("Firebase Initialization Error:", error);
        loadingScreen.innerHTML = '<p class="text-red-500">فشل في تحميل التطبيق. يرجى تحديث الصفحة.</p>';
    }
}

// جلب صلاحيات المستخدم
async function fetchUserRole(uid, email) {
    const userRef = doc(db, `artifacts/${appId}/users/${uid}`);
    try {
        const userSnap = await getDoc(userRef);
        if (userSnap.exists()) {
            // المستخدم موجود، اقرأ صلاحيته
            userRole = userSnap.data().role || 'guest';
        } else {
            // مستخدم جديد، قم بإنشاء ملفه
            const isSuperAdmin = (email === SUPER_ADMIN_EMAIL);
            const newUserRole = isSuperAdmin ? 'admin' : 'guest';
            
            await setDoc(userRef, {
                email: email,
                role: newUserRole,
                joinedAt: new Date()
            });
            userRole = newUserRole;
            console.log(`New user profile created with role: ${newUserRole}`);
        }
    } catch (error) {
        console.error("Error fetching or creating user role:", error);
        // إذا فشل (مثل: قواعد الأمان)، افترض أنه ضيف
        userRole = 'guest';
    }
}

// --- 3. إدارة واجهة المستخدم (UI Management) ---

function showLoadingScreen() {
    loadingScreen.classList.remove('hidden');
    authScreen.classList.add('hidden');
    appScreen.classList.add('hidden');
}

function showAuthScreen() {
    loadingScreen.classList.add('hidden');
    authScreen.classList.remove('hidden');
    appScreen.classList.add('hidden');
    showLoginForm(); // إظهار فورم الدخول افتراضياً
}

function showAppScreen() {
    loadingScreen.classList.add('hidden');
    authScreen.classList.add('hidden');
    appScreen.classList.remove('hidden');
}

function showLoginForm() {
    loginFormContainer.classList.remove('hidden');
    registerFormContainer.classList.add('hidden');
    loginError.classList.add('hidden');
    registerError.classList.add('hidden');
}

function showRegisterForm() {
    loginFormContainer.classList.add('hidden');
    registerFormContainer.classList.remove('hidden');
    loginError.classList.add('hidden');
    registerError.classList.add('hidden');
}

// تحديث الواجهة بناءً على صلاحية المستخدم
function updateUIForRole() {
    if (userRole === 'admin') {
        adminOnlyElements.forEach(el => el.classList.remove('hidden'));
    } else {
        adminOnlyElements.forEach(el => el.classList.add('hidden'));
    }
    // إعادة رسم الجداول لإظهار/إخفاء أزرار التحكم
    renderTables();
}

// إظهار/إخفاء كلمة المرور
window.togglePasswordVisibility = function(inputId) {
    const input = document.getElementById(inputId);
    const icon = input.nextElementSibling.querySelector('svg');
    if (input.type === "password") {
        input.type = "text";
        // تغيير الأيقونة إلى "إخفاء" (عين عليها خط)
        icon.innerHTML = `<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.542-7 .91-3.18 4.079-5.424 7.542-5.424 1.257 0 2.454.27 3.566.75A9.98 9.98 0 0118 12c.303 1.08.445 2.213.445 3.375-.304.052-.612.096-.922.127zM11 11a1 1 0 11-2 0 1 1 0 012 0z"></path><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 3l18 18"></path>`;
    } else {
        input.type = "password";
        // تغيير الأيقونة إلى "إظهار" (عين)
        icon.innerHTML = `<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"></path><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"></path>`;
    }
}

// --- 4. وظائف المصادقة (Auth Functions) ---

// إصلاح الخطأ: قراءة البيانات من خانات الإدخال مباشرة
window.handleLogin = async function(event) {
    event.preventDefault();
    const email = document.getElementById('login-email').value;
    const password = document.getElementById('login-password').value;
    loginError.classList.add('hidden');
    
    try {
        await signInWithEmailAndPassword(auth, email, password);
        // onAuthStateChanged سيقوم بالباقي
    } catch (error) {
        console.error("Login Error:", error);
        loginError.textContent = "فشل تسجيل الدخول. تأكد من الإيميل وكلمة المرور.";
        loginError.classList.remove('hidden');
    }
}

window.handleRegister = async function(event) {
    event.preventDefault();
    const email = document.getElementById('register-email').value;
    const password = document.getElementById('register-password').value;
    registerError.classList.add('hidden');
    
    // تحقق بسيط من قوة كلمة المرور (فايربيز يتطلب 6 أحرف)
    if (password.length < 6) {
        registerError.textContent = "فشل إنشاء الحساب. (كلمة المرور ضعيفة - 6 أحرف على الأقل؟)";
        registerError.classList.remove('hidden');
        return;
    }

    try {
        await createUserWithEmailAndPassword(auth, email, password);
        // onAuthStateChanged سيقوم بالباقي
        // سيتم إنشاء ملف المستخدم في fetchUserRole
    } catch (error) {
        console.error("Register Error:", error);
        if (error.code === 'auth/email-already-in-use') {
            registerError.textContent = "هذا الإيميل مستخدم بالفعل. حاول تسجيل الدخول.";
        } else {
            registerError.textContent = "فشل إنشاء الحساب. (هل كلمة المرور قوية؟)";
        }
        registerError.classList.remove('hidden');
    }
}

logoutBtn.addEventListener('click', async () => {
    try {
        await signOut(auth);
        // onAuthStateChanged سيقوم بالباقي
        allOrders = [];
        allUsers = [];
    } catch (error) {
        console.error("Logout Error:", error);
    }
});

// التنقل بين فورم الدخول وإنشاء الحساب
showRegisterBtn.addEventListener('click', (e) => { e.preventDefault(); showRegisterForm(); });
showLoginBtn.addEventListener('click', (e) => { e.preventDefault(); showLoginForm(); });


// --- 5. وظائف قاعدة البيانات (Firestore Functions) ---

// إعداد مراقبي البيانات
function setupDataListeners() {
    if (!userId) return;

    // مراقبة الأوردرات
    const ordersQuery = query(collection(db, `artifacts/${appId}/orders`));
    ordersUnsubscribe = onSnapshot(ordersQuery, (snapshot) => {
        allOrders = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        renderTables();
    }, (error) => {
        console.error("Error fetching orders: ", error);
        if (error.code === 'permission-denied' || error.code === 'PERMISSION_DENIED') {
             noDataMessage.textContent = "خطأ: ليس لديك إذن لقراءة الأوردرات.";
             noDataMessage.classList.remove('hidden');
        }
    });

    // مراقبة المستخدمين (للأدمن فقط)
    if (userRole === 'admin') {
        const usersQuery = query(collection(db, `artifacts/${appId}/users`));
        usersUnsubscribe = onSnapshot(usersQuery, (snapshot) => {
            allUsers = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
            renderUsersTable();
        }, (error) => {
            console.error("Error fetching users: ", error);
        });
    }
}

// تنظيف مراقبي البيانات عند تسجيل الخروج
function cleanupDataListeners() {
    if (ordersUnsubscribe) ordersUnsubscribe();
    if (usersUnsubscribe) usersUnsubscribe();
    ordersUnsubscribe = null;
    usersUnsubscribe = null;
}

// إضافة أوردر جديد
addOrderForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const type = orderTypeSelect.value;
    const date = orderDateInput.value;
    const client = clientNameInput.value;
    const supplier = supplierNameInput.value;
    const ref = document.getElementById('ref-number').value;

    if (type === 'expense' && !client) {
        alert("الرجاء إدخال اسم العميل للمصروفات.");
        return;
    }
    if (type === 'income' && !supplier) {
        alert("الرجاء إدخال اسم المورد للاستلامات.");
        return;
    }

    const newOrder = {
        type: type,
        date: date,
        name: type === 'expense' ? client : supplier,
        ref: ref,
        status: 'pending', // 'pending' or 'completed'
        addedAt: new Date(),
        addedBy: userId
    };

    try {
        await addDoc(collection(db, `artifacts/${appId}/orders`), newOrder);
        // مسح الفورم
        addOrderForm.reset();
        setDefaultDate();
        orderTypeSelect.dispatchEvent(new Event('change')); // لإعادة ضبط الحقول
    } catch (error) {
        console.error("Error adding order: ", error);
        alert("حدث خطأ أثناء إضافة الأوردر. (هل لديك صلاحيات؟)");
    }
});

// تغيير حالة الأوردر (معلق/مكتمل)
window.toggleOrderStatus = async function(orderId, currentStatus) {
    if (userRole !== 'admin') {
        alert("ليس لديك صلاحية لتغيير الحالة.");
        return;
    }
    const newStatus = currentStatus === 'pending' ? 'completed' : 'pending';
    const orderRef = doc(db, `artifacts/${appId}/orders`, orderId);
    try {
        await updateDoc(orderRef, { status: newStatus });
        // onSnapshot سيتولى تحديث الواجهة
    } catch (error) {
        console.error("Error updating order status: ", error);
        alert("فشل تحديث الحالة. (هل لديك صلاحيات؟)");
    }
}

// مسح الأوردرات المحددة
async function deleteSelectedOrders() {
    if (userRole !== 'admin' || selectedOrders.size === 0) return;

    const count = selectedOrders.size;
    if (!confirm(`هل أنت متأكد من مسح ${count} أوردر بشكل نهائي؟ لا يمكن التراجع عن هذا الإجراء.`)) {
        return;
    }

    try {
        // استخدام batch لكتابة مجمعة لضمان مسحهم كلهم أو ولا واحد
        const batch = writeBatch(db);
        selectedOrders.forEach(orderId => {
            const orderRef = doc(db, `artifacts/${appId}/orders`, orderId);
            batch.delete(orderRef);
        });
        
        await batch.commit();
        
        // مسح التحديد
        selectedOrders.clear();
        updateBulkDeleteButton();
        // onSnapshot سيقوم بتحديث الواجهة
        
    } catch (error) {
        console.error("Error deleting orders: ", error);
        alert("فشل في مسح الأوردرات. (هل لديك صلاحيات؟)");
    }
}

// تغيير صلاحية مستخدم (للأدمن)
window.changeUserRole = async function(targetUserId, newRole) {
    if (userRole !== 'admin') {
        alert("ليس لديك صلاحيات.");
        return;
    }
    
    // التأكد أن الأدمن الرئيسي لا يغير صلاحيته بالخطأ
    const targetUser = allUsers.find(u => u.id === targetUserId);
    if (targetUser && targetUser.email === SUPER_ADMIN_EMAIL && newRole !== 'admin') {
        alert("لا يمكن تغيير صلاحية الأدمن الرئيسي.");
        return;
    }

    const userRef = doc(db, `artifacts/${appId}/users`, targetUserId);
    try {
        await updateDoc(userRef, { role: newRole });
        // onSnapshot سيتولى تحديث الواجهة
    } catch (error) {
        console.error("Error changing user role: ", error);
        alert("فشل تغيير الصلاحية.");
    }
}

// --- 6. رسم الجداول والفلاتر (Rendering) ---

// رسم جدولي المصروفات والاستلامات
function renderTables() {
    // 1. تطبيق الفلاتر والترتيب
    const filteredOrders = getFilteredAndSortedOrders();
    
    // 2. فصل الأوردرات
    const expenseOrders = filteredOrders.filter(o => o.type === 'expense');
    const incomeOrders = filteredOrders.filter(o => o.type === 'income');

    // 3. رسم كل جدول
    expenseTableBody.innerHTML = expenseOrders.map(order => createOrderRowHtml(order)).join('');
    incomeTableBody.innerHTML = incomeOrders.map(order => createOrderRowHtml(order)).join('');
    
    // 4. إظهار/إخفاء رسالة "لا توجد بيانات"
    if (filteredOrders.length === 0 && allOrders.length > 0) {
        noDataMessage.textContent = "لا توجد بيانات لعرضها تطابق الفلتر الحالي.";
        noDataMessage.classList.remove('hidden');
    } else if (allOrders.length === 0) {
        noDataMessage.textContent = "السجل فارغ. قم بإضافة أوردر جديد.";
        noDataMessage.classList.remove('hidden');
    } else {
        noDataMessage.classList.add('hidden');
    }
    
    // 5. تحديث حالة "اختيار الكل" وأزرار المسح
    updateBulkDeleteButton();
    updateSelectAllCheckboxes(expenseOrders, incomeOrders);
}

// إنشاء صف HTML لكل أوردر
function createOrderRowHtml(order) {
    const statusClass = order.status === 'completed' 
        ? 'bg-green-100 text-green-800 dark:bg-green-800 dark:text-green-100' 
        : 'bg-yellow-100 text-yellow-800 dark:bg-yellow-800 dark:text-yellow-100';
    const statusText = order.status === 'completed' ? 'مكتمل' : 'معلق';
    const formattedDate = new Date(order.date).toLocaleDateString('ar-EG', { year: 'numeric', month: 'short', day: 'numeric' });
    
    // تحديد إذا كان الزرار قابل للضغط (للأدمن فقط)
    const statusButtonDisabled = userRole !== 'admin' ? 'disabled' : '';
    const statusCursorClass = userRole === 'admin' ? 'cursor-pointer hover:opacity-80 transition-opacity' : 'cursor-not-allowed';
    
    // خانة الاختيار (للأدمن فقط)
    const checkboxHtml = userRole === 'admin' ? `
        <td class="py-4 px-4 whitespace-nowrap admin-only">
            <input type="checkbox" data-id="${order.id}" 
                   class="order-checkbox rounded border-gray-300 text-indigo-600 shadow-sm focus:border-indigo-300 focus:ring focus:ring-indigo-200 focus:ring-opacity-50 dark:border-gray-600 dark:bg-gray-900 dark:checked:bg-indigo-600"
                   ${selectedOrders.has(order.id) ? 'checked' : ''}>
        </td>
    ` : `<td class="py-4 px-4 whitespace-nowrap admin-only hidden"></td>`;
    
    // إصلاح الخطأ: التأكد من أن الكلاس ليس فارغاً
    const checkboxHeaderClass = userRole === 'admin' ? '' : 'hidden';
    document.querySelectorAll('#select-all-expense, #select-all-income').forEach(th => {
        if(th.parentElement) {
             th.parentElement.classList.toggle('hidden', userRole !== 'admin');
        }
    });

    return `
        <tr id="order-${order.id}" class="hover:bg-gray-50 dark:hover:bg-gray-700">
            ${checkboxHtml}
            <td class="py-4 px-4 whitespace-nowrap">
                <button 
                    class="px-2 py-0.5 inline-flex text-xs leading-5 font-semibold rounded-full ${statusClass} ${statusCursorClass}"
                    onclick="toggleOrderStatus('${order.id}', '${order.status}')"
                    ${statusButtonDisabled}>
                    ${statusText}
                </button>
            </td>
            <td class="py-4 px-4 whitespace-nowrap text-sm text-gray-900 dark:text-gray-100">${formattedDate}</td>
            <td class="py-4 px-4 whitespace-nowrap text-sm text-gray-900 dark:text-gray-100">${order.name}</td>
            <td class="py-4 px-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-300">${order.ref}</td>
        </tr>
    `;
}

// رسم جدول المستخدمين (للأدمن)
function renderUsersTable() {
    if (userRole !== 'admin') return;

    usersTableBody.innerHTML = allUsers.map(user => {
        const isSuperAdmin = (user.email === SUPER_ADMIN_EMAIL);
        const roleText = user.role === 'admin' ? 'أدمن' : 'ضيف';
        const roleClass = user.role === 'admin' 
            ? 'bg-green-100 text-green-800 dark:bg-green-800 dark:text-green-100'
            : 'bg-gray-100 text-gray-800 dark:bg-gray-600 dark:text-gray-100';

        // أزرار تغيير الصلاحية
        let actionButtons;
        if (isSuperAdmin) {
            actionButtons = '<span class="text-sm text-gray-500 dark:text-gray-400">الأدمن الرئيسي (لا يمكن تغييره)</span>';
        } else {
            actionButtons = `
                <button 
                    onclick="changeUserRole('${user.id}', 'admin')" 
                    class="px-2 py-1 text-xs font-medium text-white bg-green-600 rounded-md hover:bg-green-700 transition-all duration-300 ${user.role === 'admin' ? 'opacity-50 cursor-not-allowed' : ''}"
                    ${user.role === 'admin' ? 'disabled' : ''}>
                    ترقية إلى أدمن
                </button>
                <button 
                    onclick="changeUserRole('${user.id}', 'guest')" 
                    class="px-2 py-1 text-xs font-medium text-white bg-red-600 rounded-md hover:bg-red-700 transition-all duration-300 ${user.role === 'guest' ? 'opacity-50 cursor-not-allowed' : ''}"
                    ${user.role === 'guest' ? 'disabled' : ''}>
                    تخفيض إلى ضيف
                </button>
            `;
        }

        return `
            <tr class="hover:bg-gray-50 dark:hover:bg-gray-700">
                <td class="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900 dark:text-gray-100">${user.email}</td>
                <td class="px-6 py-4 whitespace-nowrap">
                    <span class="px-2 py-0.5 inline-flex text-xs leading-5 font-semibold rounded-full ${roleClass}">
                        ${roleText}
                    </span>
                </td>
                <td class="px-6 py-4 whitespace-nowrap text-sm font-medium space-x-2 space-x-reverse">
                    ${actionButtons}
                </td>
            </tr>
        `;
    }).join('');
}

// --- 7. وظائف الفلاتر والترتيب ---

function getFilteredAndSortedOrders() {
    const searchTerm = searchInput.value.toLowerCase();
    const filterDate = filterDateInput.value;
    const sortValue = sortSelect.value;
    
    let filtered = allOrders;

    // تطبيق فلتر البحث
    if (searchTerm) {
        filtered = filtered.filter(order => 
            order.name.toLowerCase().includes(searchTerm) ||
            order.ref.toLowerCase().includes(searchTerm)
        );
    }

    // تطبيق فلتر التاريخ
    if (filterDate) {
        filtered = filtered.filter(order => order.date === filterDate);
    }
    
    // تطبيق الترتيب
    switch(sortValue) {
        case 'date_desc':
            filtered.sort((a, b) => new Date(b.date) - new Date(a.date));
            break;
        case 'date_asc':
            filtered.sort((a, b) => new Date(a.date) - new Date(b.date));
            break;
        case 'name_asc':
            filtered.sort((a, b) => a.name.localeCompare(b.name, 'ar'));
            break;
        case 'ref_asc':
            filtered.sort((a, b) => a.ref.localeCompare(b.ref, undefined, { numeric: true }));
            break;
    }
    
    return filtered;
}

// ربط الفلاتر بإعادة الرسم
searchInput.addEventListener('input', renderTables);
filterDateInput.addEventListener('change', renderTables);
sortSelect.addEventListener('change', renderTables);

// مسح الفلاتر
clearFiltersBtn.addEventListener('click', () => {
    searchInput.value = '';
    filterDateInput.value = '';
    sortSelect.value = 'date_desc'; // إرجاع للترتيب الافتراضي
    renderTables();
});

// --- 8. وظائف المسح المجمع (Bulk Delete) ---

// تحديث حالة زرار المسح المجمع
function updateBulkDeleteButton() {
    const count = selectedOrders.size;
    if (count > 0 && userRole === 'admin') {
        bulkDeleteContainer.classList.remove('hidden');
        bulkDeleteBtn.textContent = `مسح (${count}) عناصر محددة`;
        bulkDeleteBtn.disabled = false;
    } else {
        bulkDeleteBtn.textContent = `مسح (0) عناصر محددة`;
        bulkDeleteBtn.disabled = true;
        // إخفاء الزرار إذا لم يكن هناك تحديد
        if (count === 0) {
             bulkDeleteContainer.classList.add('hidden');
        }
    }
}

// تحديث حالة "اختيار الكل"
function updateSelectAllCheckboxes(expenseOrders, incomeOrders) {
    // تحديث "اختيار الكل" للمصروفات
    const allVisibleExpenseSelected = expenseOrders.length > 0 && expenseOrders.every(o => selectedOrders.has(o.id));
    if(selectAllExpense) {
        selectAllExpense.checked = allVisibleExpenseSelected;
        selectAllExpense.indeterminate = !allVisibleExpenseSelected && expenseOrders.some(o => selectedOrders.has(o.id));
    }

    // تحديث "اختيار الكل" للاستلامات
    const allVisibleIncomeSelected = incomeOrders.length > 0 && incomeOrders.every(o => selectedOrders.has(o.id));
    if(selectAllIncome) {
        selectAllIncome.checked = allVisibleIncomeSelected;
        selectAllIncome.indeterminate = !allVisibleIncomeSelected && incomeOrders.some(o => selectedOrders.has(o.id));
    }
}

// التعامل مع "اختيار الكل" (مصروفات)
selectAllExpense.addEventListener('change', (e) => {
    const isChecked = e.target.checked;
    const filteredExpense = getFilteredAndSortedOrders().filter(o => o.type === 'expense');
    
    filteredExpense.forEach(order => {
        if (isChecked) {
            selectedOrders.add(order.id);
        } else {
            selectedOrders.delete(order.id);
        }
    });
    renderTables(); // لإعادة رسم خانات الاختيار
});

// التعامل مع "اختيار الكل" (استلامات)
selectAllIncome.addEventListener('change', (e) => {
    const isChecked = e.target.checked;
    const filteredIncome = getFilteredAndSortedOrders().filter(o => o.type === 'income');
    
    filteredIncome.forEach(order => {
        if (isChecked) {
            selectedOrders.add(order.id);
        } else {
            selectedOrders.delete(order.id);
        }
    });
    renderTables(); // لإعادة رسم خانات الاختيار
});

// التعامل مع اختيار أوردر فردي (باستخدام تفويض الأحداث)
document.getElementById('app-screen').addEventListener('change', (e) => {
    if (e.target.classList.contains('order-checkbox')) {
        const orderId = e.target.dataset.id;
        if (e.target.checked) {
            selectedOrders.add(orderId);
        } else {
            selectedOrders.delete(orderId);
        }
        updateBulkDeleteButton();
        // نحتاج إعادة رسم الجداول لتحديث حالة "اختيار الكل"
        renderTables();
    }
});

// ربط زرار المسح المجمع بالوظيفة
bulkDeleteBtn.addEventListener('click', deleteSelectedOrders);


// --- 9. وظائف مساعدة (التصدير) ---

// إظهار وإخفاء قايمة التصدير
exportMenuBtn.addEventListener('click', () => {
    const isHidden = exportMenu.classList.contains('hidden');
    if (isHidden) {
        exportMenu.classList.remove('hidden');
        setTimeout(() => {
            exportMenu.classList.remove('opacity-0', 'scale-95');
        }, 10);
    } else {
        exportMenu.classList.add('opacity-0', 'scale-95');
        setTimeout(() => {
            exportMenu.classList.add('hidden');
        }, 300);
    }
});

// إغلاق القايمة عند الضغط خارجها
document.addEventListener('click', (e) => {
    if (!exportMenuBtn.contains(e.target) && !exportMenu.contains(e.target)) {
         exportMenu.classList.add('opacity-0', 'scale-95');
        setTimeout(() => {
            exportMenu.classList.add('hidden');
        }, 300);
    }
});


// تصدير CSV
exportCsvBtn.addEventListener('click', (e) => {
    e.preventDefault();
    if (allOrders.length === 0) {
        alert("لا توجد بيانات لتصديرها.");
        return;
    }

    // استخدام البيانات المفلتَرة الظاهرة حالياً
    const dataToExport = getFilteredAndSortedOrders();
    if (dataToExport.length === 0) {
         alert("لا توجد بيانات (حسب الفلتر الحالي) لتصديرها.");
        return;
    }

    let csvContent = "data:text/csv;charset=utf-8,\uFEFF"; // \uFEFF لدعم اللغة العربية في إكسل
    csvContent += "النوع,الحالة,التاريخ,الاسم (عميل/مورد),الرقم المرجعي\n"; // الهيدر

    dataToExport.forEach(order => {
        const type = order.type === 'expense' ? 'صرف' : 'استلام';
        const status = order.status === 'completed' ? 'مكتمل' : 'معلق';
        const row = [type, status, order.date, order.name, `"${order.ref}"`].join(",");
        csvContent += row + "\n";
    });

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", "orders_export.csv");
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    exportMenu.classList.add('hidden'); // إغلاق القايمة
});

// تصدير PDF (شيك)
exportPdfBtn.addEventListener('click', (e) => {
    e.preventDefault();
    const dataToExport = getFilteredAndSortedOrders();
    if (dataToExport.length === 0) {
         alert("لا توجد بيانات (حسب الفلتر الحالي) لتصديرها.");
        return;
    }

    const { jsPDF } = window.jspdf;
    const doc = new jsPDF();
    
    // فصل البيانات
    const expenseOrders = dataToExport.filter(o => o.type === 'expense');
    const incomeOrders = dataToExport.filter(o => o.type === 'income');

    // إعدادات الخط (مهم جداً للعربي)
    // سنستخدم الخط "Cairo" الذي تم تحميله في الهيدر
    // ملاحظة: الخطوط المخصصة تحتاج تحميلها في jspdf، سنستخدم خط افتراضي يدعم العربية
    try {
        // محاولة إضافة خط يدعم العربية (إذا لم يكن موجوداً)
        // هذا يتطلب ملف خط base64، للتبسيط سنعتمد على الخطوط الأساسية
        // doc.addFont('Cairo-Regular.ttf', 'Cairo', 'normal'); // This requires the font file
        // doc.setFont('Cairo', 'normal');
    } catch(err) {
        console.warn("PDF Font Error: Cairo font not embedded, using default.", err);
    }
    
    const fontStyles = { halign: 'right' }; // font: "Cairo" (تم إزالته لتجنب الأخطاء)
    const headerStyles = { fillColor: [41, 128, 185], textColor: 255, halign: 'right' }; // font: "Cairo"

    // العنوان الرئيسي
    doc.setFontSize(18);
    doc.text("تقرير الأوردرات", 105, 20, { align: 'center' });
    
    doc.setFontSize(10);
    doc.text(`تاريخ التقرير: ${new Date().toLocaleDateString('ar-EG')}`, 105, 28, { align: 'center' });
    
    let startY = 40;

    // جدول المصروفات (إذا وجد)
    if (expenseOrders.length > 0) {
        doc.setFontSize(14);
        doc.text("سجل المصروفات (لعميل)", 200, startY, { align: 'right' });
        startY += 8;

        const expenseHead = [['الرقم المرجعي', 'العميل', 'التاريخ', 'الحالة']];
        const expenseBody = expenseOrders.map(o => [
            o.ref,
            o.name,
            new Date(o.date).toLocaleDateString('ar-EG'),
            o.status === 'completed' ? 'مكتمل' : 'معلق'
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
                // doc.setFont("Cairo", "normal"); // (تم إزالته لتجنB الأخطاء)
            }
        });
        startY = doc.autoTable.previous.finalY + 15;
    }

    // جدول الاستلامات (إذا وجد)
    if (incomeOrders.length > 0) {
         doc.setFontSize(14);
         doc.text("سجل الاستلامات (من مورد)", 200, startY, { align: 'right' });
         startY += 8;
         
         const incomeHead = [['الرقم المرجعي', 'المورد', 'التاريخ', 'الحالة']];
         const incomeBody = incomeOrders.map(o => [
            o.ref,
            o.name,
            new Date(o.date).toLocaleDateString('ar-EG'),
            o.status === 'completed' ? 'مكتمل' : 'معلق'
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
                // doc.setFont("Cairo", "normal"); // (تم إزالته لتجنب الأخطاء)
            }
         });
    }

    doc.save('orders_report.pdf');
    exportMenu.classList.add('hidden'); // إغلاق القايمة
});


// --- 10. وظائف مساعدة متنوعة ---

// ضبط التاريخ الافتراضي في فورم الإضافة
function setDefaultDate() {
    const today = new Date().toISOString().split('T')[0];
    if(orderDateInput) {
        orderDateInput.value = today;
    }
}

// تبديل حقول العميل/المورد بناءً على نوع العملية
if(orderTypeSelect) {
    orderTypeSelect.addEventListener('change', (e) => {
        if (e.target.value === 'expense') {
            clientField.classList.remove('hidden');
            supplierField.classList.add('hidden');
            clientNameInput.required = true;
            supplierNameInput.required = false;
        } else {
            clientField.classList.add('hidden');
            supplierField.classList.remove('hidden');
            clientNameInput.required = false;
            supplierNameInput.required = true;
        }
    });
}


// --- 11. بدء تشغيل التطبيق ---
document.addEventListener('DOMContentLoaded', () => {
    initDarkMode();
    showLoadingScreen();
    setDefaultDate();
    if(orderTypeSelect) {
        orderTypeSelect.dispatchEvent(new Event('change')); // لضبط الحقول عند أول تحميل
    }
    initializeAppAndAuth();
});

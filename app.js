// --- 1. استيراد الإعدادات والمكتبات والوظائف ---
import { firebaseConfig, SUPER_ADMIN_EMAIL, appId } from './config.js';
import { initializeFirebase, onAuthStateChangedHandler, handleLogin, handleRegister, handleLogout, addOrder, updateOrderStatus, deleteOrdersBatch, updateUserRole, listenToUserRole, listenToOrders, listenToAdminUsers } from './firebaseService.js';
import { 
    elements, bindDOMElements, setupEventListeners, initTheme, 
    updateUIForRole, renderTables, renderAdminPanel, 
    showAuthScreen, showMainApp, hideLoadingSpinner, showToast, showConfirmModal 
} from './ui.js';

// --- 2. تعريف المتغيرات العامة للحالة ---
let userId = null;
let userRole = 'guest';
let allOrders = [];
let allUsers = [];
let ordersUnsubscribe = null;
let usersUnsubscribe = null;
const selectedOrders = new Set();


// --- 3. تشغيل التطبيق بعد تحميل الصفحة ---
document.addEventListener('DOMContentLoaded', async () => {
    
    // ربط عناصر الواجهة بالمتغيرات
    bindDOMElements();

    // التأكد من وجود العناصر الأساسية قبل المتابعة
    if (!elements.loadingSpinner || !elements.appContent || !elements.authScreen || !elements.mainApp) {
        console.error("Critical DOM elements not found! App cannot start.");
        if(elements.loadingSpinner) elements.loadingSpinner.innerHTML = "خطأ في تحميل واجهة التطبيق. حاول تحديث الصفحة.";
        return; 
    }

    try {
        // تهيئة Firebase
        const { auth, db } = await initializeFirebase(firebaseConfig);
        
        // إعداد مراقب حالة الدخول
        onAuthStateChangedHandler(auth, async (user) => {
            // إلغاء المستمعين القدامى (إذا وجدوا)
            if (ordersUnsubscribe) { ordersUnsubscribe(); ordersUnsubscribe = null; }
            if (usersUnsubscribe) { usersUnsubscribe(); usersUnsubscribe = null; }
            selectedOrders.clear(); // مسح التحديد عند تغيير المستخدم

            if (user) {
                // المستخدم سجل دخوله
                userId = user.uid;
                if (elements.userEmailSpan) elements.userEmailSpan.textContent = user.email;
                
                // الاستماع لصلاحيات المستخدم وتحديث الواجهة
                listenToUserRole(db, appId, userId, (role) => {
                    userRole = role;
                    updateUIForRole(userRole, userId, SUPER_ADMIN_EMAIL); // مرر الإيميل للمقارنة
                    
                    // الاستماع للأوردرات بعد معرفة الصلاحية
                    ordersUnsubscribe = listenToOrders(db, appId, (orders) => {
                         allOrders = orders;
                         renderTables(allOrders, userRole, selectedOrders); // مرر الحالة المحدثة
                     }, (error) => {
                         console.error("Error fetching orders:", error);
                         showToast("خطأ في جلب الأوردرات.", true);
                     });

                    // الاستماع للمستخدمين (للأدمن فقط)
                    if (userRole === 'admin') {
                        usersUnsubscribe = listenToAdminUsers(db, appId, (users) => {
                             allUsers = users;
                             renderAdminPanel(allUsers, userId, userRole); // مرر الحالة المحدثة
                        }, (error) => {
                            console.error("Error fetching users:", error);
                        });
                    }
                     showMainApp(); // إظهار التطبيق بعد معرفة الصلاحية وبدء تحميل البيانات
                });

            } else {
                // المستخدم سجل خروجه
                userId = null;
                userRole = 'guest';
                allOrders = [];
                allUsers = [];
                if(elements.userEmailSpan) elements.userEmailSpan.textContent = '';
                if(elements.userRoleSpan) elements.userRoleSpan.textContent = '';
                renderTables(allOrders, userRole, selectedOrders); // مسح الجداول
                renderAdminPanel(allUsers, userId, userRole); // مسح لوحة الأدمن
                showAuthScreen(); // إظهار شاشة الدخول
            }
        });

        // ربط الأحداث للأزرار والنماذج
        setupEventListeners({
            auth: auth, // تمرير auth
            db: db,     // تمرير db
            appId: appId, // تمرير appId
            userId: () => userId, // تمرير userId كدالة للحصول على أحدث قيمة
            userRole: () => userRole, // تمرير userRole كدالة
            allOrders: () => allOrders, // تمرير allOrders كدالة
            selectedOrders: selectedOrders, // تمرير selectedOrders
            SUPER_ADMIN_EMAIL: SUPER_ADMIN_EMAIL // تمرير إيميل الأدمن
        }); 
        
        // تهيئة الوضع الليلي/النهاري
        initTheme();

    } catch (error) {
        console.error("Fatal Error initializing app:", error);
        hideLoadingSpinner(); // إخفاء التحميل لإظهار الخطأ
        if (elements.loadingSpinner) {
             elements.loadingSpinner.innerHTML = `حدث خطأ فادح (${error.message}). يرجى تحديث الصفحة.`;
        }
    }
});


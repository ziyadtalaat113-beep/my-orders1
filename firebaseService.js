    // استيراد الوظائف اللازمة من SDKs
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
    
    // تصدير الوظائف المستوردة (لتجنب مشاكل الاستيراد المباشر في ui.js)
    // هذا يسمح لنا باستخدامها في ui.js عبر window._firebaseAuth و window._firestore
    window._firebaseAuth = { signInWithEmailAndPassword, createUserWithEmailAndPassword, signOut };
    window._firestore = { doc, setDoc, updateDoc, deleteDoc, writeBatch };
    
    let dbInstance = null; // لتخزين نسخة db
    
    // --- 1. تهيئة Firebase ---
    export async function initializeFirebase(firebaseConfig) {
        try {
            const app = initializeApp(firebaseConfig);
            const db = getFirestore(app);
            const auth = getAuth(app);
            dbInstance = db; // تخزين db للاستخدام لاحقاً
            await enableIndexedDbPersistence(db);
            console.log("Firebase initialized and offline persistence enabled.");
            return { auth, db };
        } catch (error) {
            console.error("Firebase Initialization Error:", error);
            throw error; // رمي الخطأ ليتم التعامل معه في app.js
        }
    }
    
    // --- 2. مراقبة حالة تسجيل الدخول ---
    export function onAuthStateChangedHandler(auth, callback) {
        onAuthStateChanged(auth, callback);
    }
    
    // --- 3. وظائف المصادقة (Authentication) ---
    export async function handleLogin(auth, email, password) {
        if (!email || !password) throw new Error("auth/missing-credentials"); // Use error codes
        return await signInWithEmailAndPassword(auth, email, password);
    }
    
    export async function handleRegister(auth, db, appId, SUPER_ADMIN_EMAIL, email, password) {
        if (!email || !password) throw new Error("auth/missing-credentials");
        const role = (email.toLowerCase() === SUPER_ADMIN_EMAIL.toLowerCase()) ? 'admin' : 'guest';
        const userCredential = await createUserWithEmailAndPassword(auth, email, password);
        const user = userCredential.user;
        const userDocRef = doc(db, `artifacts/${appId}/users`, user.uid);
        await setDoc(userDocRef, { email: user.email, role: role, createdAt: new Date() });
        return userCredential; // إرجاع بيانات الاعتماد للاستخدام المحتمل
    }
    
    export async function handleLogout(auth) {
        return await signOut(auth);
    }
    
    // --- 4. وظائف Firestore (قاعدة البيانات) ---
    
    // إضافة أوردر جديد
    export async function addOrder(db, appId, orderData) {
        const ordersColRef = collection(db, `artifacts/${appId}/orders`);
        return await addDoc(ordersColRef, { 
            ...orderData, 
            addedBy: orderData.addedBy || null, // Ensure addedBy exists
            createdAt: new Date() 
        });
    }
    
    // تحديث حالة الأوردر
    export async function updateOrderStatus(db, appId, orderId, newStatus) {
        const orderDocRef = doc(db, `artifacts/${appId}/orders`, orderId);
        return await updateDoc(orderDocRef, { status: newStatus });
    }
    
    // مسح مجموعة أوردرات (Batch)
    export async function deleteOrdersBatch(db, appId, orderIds) {
        if (!orderIds || orderIds.length === 0) return;
        const batch = writeBatch(db);
        orderIds.forEach(orderId => {
            batch.delete(doc(db, `artifacts/${appId}/orders`, orderId));
        });
        return await batch.commit();
    }
    
    // تحديث صلاحية مستخدم
    export async function updateUserRole(db, appId, targetUserId, newRole) {
        const userDocRef = doc(db, `artifacts/${appId}/users`, targetUserId);
        return await updateDoc(userDocRef, { role: newRole });
    }
    
    // --- 5. وظائف الاستماع للبيانات (Real-time Listeners) ---
    
    // الاستماع لصلاحية المستخدم الحالي
    export function listenToUserRole(db, appId, uid, callback) {
        const userDocRef = doc(db, `artifacts/${appId}/users`, uid);
        return onSnapshot(userDocRef, (docSnap) => {
            let role = 'guest'; // Default to guest
            if (docSnap.exists() && docSnap.data().role) {
                role = docSnap.data().role;
            } else {
                console.warn(`User document for ${uid} not found or role missing. Defaulting to 'guest'.`);
                // Optionally, create the user document if it doesn't exist
                // setDoc(userDocRef, { email: auth.currentUser?.email || 'unknown', role: 'guest', createdAt: new Date() });
            }
            callback(role); // إرسال الصلاحية إلى app.js
        }, (error) => {
            console.error("Error listening to user role:", error);
            callback('guest'); // إرسال صلاحية ضيف في حالة الخطأ
        });
    }
    
    // الاستماع لجميع الأوردرات
    export function listenToOrders(db, appId, callback, errorCallback) {
        const ordersColRef = collection(db, `artifacts/${appId}/orders`);
        const q = query(ordersColRef); // يمكن إضافة where أو orderBy هنا إذا لزم الأمر
    
        return onSnapshot(q, (snapshot) => {
            const orders = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
            callback(orders); // إرسال الأوردرات إلى app.js
        }, (error) => {
            console.error("Error fetching orders:", error);
            if (errorCallback) errorCallback(error); // إرسال الخطأ إلى app.js
        });
    }
    
    // الاستماع لجميع المستخدمين (للأدمن)
    export function listenToAdminUsers(db, appId, callback, errorCallback) {
        const usersColRef = collection(db, `artifacts/${appId}/users`);
        return onSnapshot(usersColRef, (snapshot) => {
            const users = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
            callback(users); // إرسال المستخدمين إلى app.js
        }, (error) => {
            console.error("Error fetching users:", error);
             if (errorCallback) errorCallback(error); // إرسال الخطأ إلى app.js
        });
    }
    

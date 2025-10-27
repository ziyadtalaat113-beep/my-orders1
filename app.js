// --- 1. استيراد المكتبات (لازم يكون أول حاجة) ---
import { initializeApp } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-app.js";
import { 
// ... existing code ... -->
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

// ... (هنا كان كود الخط الطويل اللي اتمسح) ...

// --- 5. تهيئة Firebase وربط العناصر ---
// ... existing code ... -->
// --- 9. وظائف مساعدة (التصدير) ---

// إظهار وإخفاء قايمة التصدير
// ... existing code ... -->
// تصدير PDF (تقرير)
exportPdfBtn.addEventListener('click', async (e) => { // <-- 1. أضفنا async
    e.preventDefault();
// ... existing code ... -->
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
// ... existing code ... -->
    const incomeOrders = dataToExport.filter(o => o.type === 'income');
    
    // try {
    //     doc.setFont('Amiri', 'normal'); // <-- 4. لا نحتاج هذا الجزء بعد الآن
    // } catch (err) {
    //     console.warn("PDF Font Error: Cairo font not embedded, using default.", err);
    // }
    
    const fontStyles = { font: "Amiri", halign: 'right' };
// ... existing code ... -->


    import { exportCSV, exportPDF } from './exportService.js';
    import { getFriendlyAuthError, getFilteredAndSortedData } from './utils.js';
    
    // --- 1. تعريف متغيرات عناصر الصفحة ---
    // (سيتم تعيين قيمها في bindDOMElements)
    export let elements = {}; 
    
    // --- 2. ربط عناصر الصفحة بالمتغيرات ---
    export function bindDOMElements() {
        elements = {
            loadingSpinner: document.getElementById('loading-spinner'),
            appContent: document.getElementById('app-content'),
            authScreen: document.getElementById('auth-screen'),
            mainApp: document.getElementById('main-app'),
            loginForm: document.getElementById('login-form'),
            registerForm: document.getElementById('register-form'),
            authToggleLinks: document.querySelectorAll('.auth-toggle'),
            loginEmail: document.getElementById('login-email'),
            loginPassword: document.getElementById('login-password'),
            registerEmail: document.getElementById('register-email'),
            registerPassword: document.getElementById('register-password'),
            loginPasswordToggle: document.getElementById('login-password-toggle'),
            registerPasswordToggle: document.getElementById('register-password-toggle'),
            userInfo: document.getElementById('user-info'),
            userEmailSpan: document.getElementById('user-email'),
            userRoleSpan: document.getElementById('user-role'),
            logoutBtn: document.getElementById('logout-btn'),
            addOrderForm: document.getElementById('add-order-form'),
            orderType: document.getElementById('order-type'),
            orderName: document.getElementById('order-name'),
            orderRef: document.getElementById('order-ref'),
            orderDate: document.getElementById('order-date'),
            expenseTableBody: document.getElementById('expense-table-body'),
            incomeTableBody: document.getElementById('income-table-body'),
            filterSearch: document.getElementById('filter-search'),
            filterDate: document.getElementById('filter-date'),
            filterSort: document.getElementById('filter-sort'),
            clearFiltersBtn: document.getElementById('clear-filters-btn'),
            adminPanelBtn: document.getElementById('admin-panel-btn'),
            adminPanel: document.getElementById('admin-panel'),
            usersTableBody: document.getElementById('users-table-body'),
            closeAdminPanelBtn: document.getElementById('close-admin-panel-btn'),
            toggleThemeBtn: document.getElementById('toggle-theme-btn'),
            sunIcon: document.getElementById('sun-icon'),
            moonIcon: document.getElementById('moon-icon'),
            exportBtn: document.getElementById('export-btn'),
            exportDropdown: document.getElementById('export-dropdown'),
            exportCsvBtn: document.getElementById('export-csv-btn'),
            exportPdfBtn: document.getElementById('export-pdf-btn'),
            bulkDeleteBtn: document.getElementById('bulk-delete-btn'),
            checkAllExpense: document.getElementById('check-all-expense'),
            checkAllIncome: document.getElementById('check-all-income')
        };
    }
    
    // --- 3. ربط الأحداث (Event Listeners) ---
    export function setupEventListeners(context) { // context contains { auth, db, appId, userId(), userRole(), allOrders(), selectedOrders, SUPER_ADMIN_EMAIL }
        const { auth, db, appId, userId, userRole, allOrders, selectedOrders, SUPER_ADMIN_EMAIL } = context;
        
        // (شاشات الدخول والتسجيل)
        if (elements.authToggleLinks) {
            elements.authToggleLinks.forEach(link => {
                link.addEventListener('click', (e) => {
                    e.preventDefault();
                    elements.loginForm?.classList.toggle('hidden');
                    elements.registerForm?.classList.toggle('hidden');
                });
            });
        }
    
        if (elements.loginForm) elements.loginForm.addEventListener('submit', (e) => { e.preventDefault(); handleLogin(auth, elements.loginEmail?.value, elements.loginPassword?.value); });
        if (elements.registerForm) elements.registerForm.addEventListener('submit', (e) => { e.preventDefault(); handleRegister(auth, db, appId, SUPER_ADMIN_EMAIL, elements.registerEmail?.value, elements.registerPassword?.value); });
        if (elements.logoutBtn) elements.logoutBtn.addEventListener('click', () => handleLogout(auth));
    
        // (إظهار/إخفاء كلمة المرور)
        if (elements.loginPasswordToggle) elements.loginPasswordToggle.addEventListener('click', () => togglePasswordVisibility(elements.loginPassword, elements.loginPasswordToggle));
        if (elements.registerPasswordToggle) elements.registerPasswordToggle.addEventListener('click', () => togglePasswordVisibility(elements.registerPassword, elements.registerPasswordToggle));
    
        // (إضافة أوردر)
        if (elements.addOrderForm) elements.addOrderForm.addEventListener('submit', (e) => { 
            e.preventDefault(); 
            handleAddOrder(db, appId, userId(), elements.orderType?.value, elements.orderName?.value, elements.orderRef?.value, elements.orderDate?.value); 
            elements.addOrderForm.reset();
            setDefaultDate();
        });
    
        // (الفلاتر والترتيب)
        if (elements.filterSearch) elements.filterSearch.addEventListener('input', () => renderTables(allOrders(), userRole(), selectedOrders));
        if (elements.filterDate) elements.filterDate.addEventListener('change', () => renderTables(allOrders(), userRole(), selectedOrders));
        if (elements.filterSort) elements.filterSort.addEventListener('change', () => renderTables(allOrders(), userRole(), selectedOrders));
        if (elements.clearFiltersBtn) {
            elements.clearFiltersBtn.addEventListener('click', () => {
                if (elements.filterSearch) elements.filterSearch.value = '';
                if (elements.filterDate) elements.filterDate.value = '';
                if (elements.filterSort) elements.filterSort.value = 'date-desc';
                renderTables(allOrders(), userRole(), selectedOrders);
            });
        }
    
        // (لوحة تحكم الأدمن)
        if (elements.adminPanelBtn) elements.adminPanelBtn.addEventListener('click', () => { elements.adminPanel?.classList.remove('hidden'); });
        if (elements.closeAdminPanelBtn) elements.closeAdminPanelBtn.addEventListener('click', () => { elements.adminPanel?.classList.add('hidden'); });
    
        // (الوضع الليلي)
        if (elements.toggleThemeBtn) elements.toggleThemeBtn.addEventListener('click', toggleTheme);
        
        // (التصدير)
        if (elements.exportBtn) {
            elements.exportBtn.addEventListener('click', (e) => {
                e.preventDefault();
                elements.exportDropdown?.classList.toggle('hidden');
                elements.exportDropdown?.classList.toggle('opacity-0', elements.exportDropdown.classList.contains('hidden'));
                elements.exportDropdown?.classList.toggle('scale-95', elements.exportDropdown.classList.contains('hidden'));
            });
        }
        if (elements.exportCsvBtn) elements.exportCsvBtn.addEventListener('click', (e) => exportCSV(e, allOrders()));
        if (elements.exportPdfBtn) elements.exportPdfBtn.addEventListener('click', (e) => exportPDF(e, allOrders()));
        document.addEventListener('click', (e) => {
            if (elements.exportBtn && elements.exportDropdown && !elements.exportBtn.contains(e.target) && !elements.exportDropdown.contains(e.target)) {
                elements.exportDropdown.classList.add('hidden', 'opacity-0', 'scale-95');
            }
        });
    
        // (المسح المجمع)
        if (elements.bulkDeleteBtn) elements.bulkDeleteBtn.addEventListener('click', () => handleBulkDelete(db, appId, userRole(), selectedOrders));
        
        // (تحديد الكل)
        if (elements.checkAllExpense) elements.checkAllExpense.addEventListener('change', (e) => toggleCheckAll(e.target.checked, 'expense', selectedOrders));
        if (elements.checkAllIncome) elements.checkAllIncome.addEventListener('change', (e) => toggleCheckAll(e.target.checked, 'income', selectedOrders));
    
        // (تفعيل الأزرار داخل الجداول باستخدام event delegation)
        const setupTableInteractionListeners = () => {
            const expenseTable = elements.expenseTableBody;
            const incomeTable = elements.incomeTableBody;
        
            const handleTableClick = (e) => {
                // تغيير الحالة
                const statusBtn = e.target.closest('.status-toggle-btn');
                if (statusBtn && userRole() === 'admin') {
                    const id = statusBtn.dataset.id;
                    const status = statusBtn.dataset.status;
                    handleToggleStatus(db, appId, id, status);
                    return; 
                }
        
                // تحديد Checkbox
                const checkbox = e.target.closest('.order-checkbox');
                if (checkbox && userRole() === 'admin') {
                    const id = checkbox.dataset.id;
                    const row = document.getElementById(`order-${id}`);
                    if (checkbox.checked) {
                        selectedOrders.add(id);
                        row?.classList.add('bg-blue-100', 'dark:bg-blue-900');
                    } else {
                        selectedOrders.delete(id);
                        row?.classList.remove('bg-blue-100', 'dark:bg-blue-900');
                    }
                    updateBulkDeleteButton(userRole(), selectedOrders);
                    return; 
                }
            };
            
            expenseTable?.removeEventListener('click', handleTableClick); // Remove old listener if exists
            incomeTable?.removeEventListener('click', handleTableClick); // Remove old listener if exists
            expenseTable?.addEventListener('click', handleTableClick);
            incomeTable?.addEventListener('click', handleTableClick);
        };
        
        setupTableInteractionListeners(); // Initial setup
        // Re-setup listeners after table renders (important for dynamic content)
        // This can be integrated into renderTables or called after it.
        // For simplicity, we assume renderTables calls setupTableInteractionListeners internally or indirectly.
    
    } // --- نهاية setupEventListeners ---
    
    
    // --- 4. وظائف تحديث واجهة المستخدم ---
    
    export function showAuthScreen() {
        if (elements.authScreen) elements.authScreen.classList.remove('hidden');
        if (elements.mainApp) elements.mainApp.classList.add('hidden');
        hideLoadingSpinner();
    }
    
    export function showMainApp() {
        if (elements.mainApp) elements.mainApp.classList.remove('hidden');
        if (elements.authScreen) elements.authScreen.classList.add('hidden');
        setDefaultDate();
        hideLoadingSpinner();
    }
    
    export function hideLoadingSpinner() {
        if (elements.loadingSpinner && !elements.loadingSpinner.classList.contains('opacity-0')) {
            elements.loadingSpinner.classList.add('opacity-0', 'pointer-events-none');
        }
        if (elements.appContent && elements.appContent.classList.contains('opacity-0')) {
            elements.appContent.classList.remove('opacity-0');
        }
    }
    
    export function showToast(message, isError = false) {
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
    
    export function showConfirmModal(message, onConfirm) {
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
    
    // (تحديث الواجهة بناءً على صلاحية المستخدم)
    export function updateUIForRole(userRole, currentUserId, SUPER_ADMIN_EMAIL) {
        const adminOnlyElements = [
            elements.adminPanelBtn, 
            elements.bulkDeleteBtn,
            elements.checkAllExpense, 
            elements.checkAllIncome
        ].filter(Boolean); 
        const addOrderWrapper = document.getElementById('add-order-form-wrapper');
        const checkboxHeaders = document.querySelectorAll('th:first-child'); 
    
        if (userRole === 'admin') {
             if (elements.userRoleSpan) {
                elements.userRoleSpan.textContent = "أدمن";
                elements.userRoleSpan.className = "px-2 py-0.5 text-xs bg-green-200 text-green-800 rounded-full dark:bg-green-700 dark:text-green-100";
            }
            if (addOrderWrapper) addOrderWrapper.classList.remove('hidden');
            adminOnlyElements.forEach(el => el.classList.remove('hidden'));
            checkboxHeaders.forEach(th => th.classList.remove('hidden'));
        } else {
            if (elements.userRoleSpan) {
                elements.userRoleSpan.textContent = "ضيف";
                elements.userRoleSpan.className = "px-2 py-0.5 text-xs bg-gray-200 text-gray-800 rounded-full dark:bg-gray-600 dark:text-gray-100";
            }
            if (addOrderWrapper) addOrderWrapper.classList.add('hidden');
            adminOnlyElements.forEach(el => el.classList.add('hidden'));
            checkboxHeaders.forEach(th => th.classList.add('hidden'));
            if (elements.adminPanel) elements.adminPanel.classList.add('hidden');
        }
        // Always re-render tables after role change to update checkboxes/buttons
        // This assumes 'allOrders' and 'selectedOrders' state is available
        // renderTables(allOrders, userRole, selectedOrders); // Call needs access to these variables
    }
    
    // --- 5. وظائف رسم الجداول ---
    
    // رسم الجداول (مصروفات واستلامات)
    export function renderTables(allOrders, userRole, selectedOrders) { // Accept state as arguments
        if (!elements.expenseTableBody || !elements.incomeTableBody) return; 
        const filteredData = getFilteredAndSortedData(allOrders); // Pass allOrders
        const expenseHtml = filteredData.filter(o => o.type === 'expense').map(order => createOrderRowHtml(order, userRole, selectedOrders)).join('');
        const incomeHtml = filteredData.filter(o => o.type === 'income').map(order => createOrderRowHtml(order, userRole, selectedOrders)).join('');
        elements.expenseTableBody.innerHTML = expenseHtml || `<tr><td colspan="5" class="p-4 text-center text-gray-400">لا توجد مصروفات حالياً.</td></tr>`;
        elements.incomeTableBody.innerHTML = incomeHtml || `<tr><td colspan="5" class="p-4 text-center text-gray-400">لا توجد استلامات حالياً.</td></tr>`;
        if (elements.checkAllExpense) elements.checkAllExpense.checked = false;
        if (elements.checkAllIncome) elements.checkAllIncome.checked = false;
        updateBulkDeleteButton(userRole, selectedOrders); // Pass state
        // setupTableInteractions(); // Re-setup listeners (ensure context is passed if needed)
    }
    
    // إنشاء سطر HTML لكل أوردر
    function createOrderRowHtml(order, userRole, selectedOrders) { // Accept state as arguments
        const isCompleted = order.status === 'completed';
        const statusColorClass = isCompleted ? 'bg-green-100 dark:bg-green-900' : 'bg-yellow-100 dark:bg-yellow-900';
        const nameLabel = order.type === 'expense' ? 'العميل' : 'المورد';
        const rowSelectedClass = selectedOrders.has(order.id) ? 'bg-blue-100 dark:bg-blue-900' : '';
        const displayCheckboxCol = userRole === 'admin' ? '' : 'hidden'; 
    
        const statusButtonHtml = userRole === 'admin' ?
            `<button data-id="${order.id}" data-status="${order.status || 'pending'}" class="status-toggle-btn p-2 rounded-full transition-all duration-200 ${isCompleted ? 'bg-green-500 hover:bg-green-600' : 'bg-yellow-400 hover:bg-yellow-500'}">
                <svg class="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"></path></svg>
            </button>` :
            `<span class="px-2 py-1 text-xs rounded-full ${isCompleted ? 'bg-green-200 text-green-800 dark:bg-green-700 dark:text-green-100' : 'bg-yellow-200 text-yellow-800 dark:bg-yellow-700 dark:text-yellow-100'}">${isCompleted ? "مكتمل" : "معلق"}</span>`;
        
        const orderName = order.name || 'N/A';
        const orderRef = order.ref || 'N/A';
        const orderDate = order.date || 'N/A';
        
        return `
            <tr id="order-${order.id}" class="border-b border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-750 transition-colors duration-150 ${statusColorClass} ${rowSelectedClass}">
                <td class="p-3 w-12 text-center ${displayCheckboxCol}" data-label=""> {/* Label is empty for checkbox */}
                    <input type="checkbox" data-id="${order.id}" class="order-checkbox form-checkbox rounded border-gray-400 dark:border-gray-600" ${selectedOrders.has(order.id) ? 'checked' : ''}>
                </td>
                <td class="p-3" data-label="${nameLabel}">${orderName}</td>
                <td class="p-3" data-label="الرقم المرجعي">${orderRef}</td>
                <td class="p-3" data-label="التاريخ">${orderDate}</td>
                <td class="p-3 w-24 text-center" data-label="الحالة">
                    ${statusButtonHtml} {/* Content is already wrapped */}
                </td> 
            </tr>
        `;
    }
    
    // (رسم لوحة تحكم الأدمن)
    export function renderAdminPanel(allUsers, currentUserId, currentUserRole) { // Accept state
         if (!elements.usersTableBody) return; 
        if (currentUserRole !== 'admin') {
            elements.usersTableBody.innerHTML = `<tr><td colspan="3" class="p-4 text-center text-gray-400">ليس لديك صلاحية لعرض هذه القائمة.</td></tr>`;
            return;
        }
        if (allUsers.length === 0) {
             elements.usersTableBody.innerHTML = `<tr><td colspan="3" class="p-4 text-center text-gray-400">لا يوجد مستخدمون آخرون مسجلون.</td></tr>`;
            return;
        }
        const usersHtml = allUsers.map(user => {
            const isSelf = user.id === currentUserId;
            const currentRole = user.role || 'guest';
            const userEmail = user.email || 'N/A';
            // Disable role change if the current user is not the SUPER_ADMIN
            // We need SUPER_ADMIN_EMAIL here, passed via context or imported
            // For now, assume only the initial SUPER_ADMIN can change roles (simplification)
            const disableRoleChange = isSelf; // Simplified: Only disable for self
            
            const roleSelectHtml = isSelf ? 
                `<span class="font-bold text-blue-500">أدمن رئيسي (أنت)</span>` :
                `<select data-id="${user.id}" class="role-select form-input py-1" ${disableRoleChange ? 'disabled' : ''}>
                    <option value="guest" ${currentRole === 'guest' ? 'selected' : ''}>ضيف (Guest)</option>
                    <option value="admin" ${currentRole === 'admin' ? 'selected' : ''}>أدمن (Admin)</option>
                </select>`;
            return `
                <tr class="border-b border-gray-200 dark:border-gray-700">
                    <td class="p-3" data-label="الإيميل">${userEmail}</td>
                    <td class="p-3" data-label="الصلاحية">${currentRole}</td>
                    <td class="p-3" data-label="تغيير الصلاحية">${roleSelectHtml}</td>
                </tr>
            `;
        }).join('');
        elements.usersTableBody.innerHTML = usersHtml;
        
        // Re-attach listeners for role change dropdowns
        document.querySelectorAll('.role-select').forEach(select => {
            // Clone and replace to remove old listeners
            const newSelect = select.cloneNode(true);
            select.parentNode.replaceChild(newSelect, select); 
            if (!newSelect.disabled) { // Only add listener if not disabled
                newSelect.addEventListener('change', (e) => {
                    const newRole = e.target.value;
                    const targetUserId = e.target.dataset.id;
                    // Need db and appId here - should be passed from the caller or made available globally/via context
                    // handleChangeUserRole(targetUserId, newRole); // This call needs db, appId
                    console.log(`Role change requested for ${targetUserId} to ${newRole}`); 
                });
            }
         });
    }
    
    // --- 6. وظائف تفاعلية ---
    
    // (تحديد الكل)
    function toggleCheckAll(checked, type, selectedOrders) { // Accept state
        const tableBody = (type === 'expense') ? elements.expenseTableBody : elements.incomeTableBody;
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
        updateBulkDeleteButton(userRole, selectedOrders); // Pass state
    }
    
    // (تحديث زرار المسح المجمع)
    function updateBulkDeleteButton(userRole, selectedOrders) { // Accept state
        if (!elements.bulkDeleteBtn) return; 
        const countSpan = elements.bulkDeleteBtn.querySelector('span');
        if (userRole === 'admin' && selectedOrders.size > 0) {
            elements.bulkDeleteBtn.classList.remove('hidden', 'opacity-0', 'scale-90');
            if (countSpan) countSpan.textContent = `(${selectedOrders.size})`;
        } else {
            elements.bulkDeleteBtn.classList.add('hidden', 'opacity-0', 'scale-90');
            if (countSpan) countSpan.textContent = '(0)';
        }
    }
    
    // --- 7. وظائف إضافية ---
    
    // (الوضع الليلي)
    export function initTheme() {
         const isDarkMode = localStorage.theme === 'dark' || (!('theme' in localStorage) && window.matchMedia('(prefers-color-scheme: dark)').matches);
        if (isDarkMode) {
            document.documentElement.classList.add('dark');
            elements.moonIcon?.classList.add('hidden');
            elements.sunIcon?.classList.remove('hidden');
        } else {
            document.documentElement.classList.remove('dark');
            elements.moonIcon?.classList.remove('hidden');
            elements.sunIcon?.classList.add('hidden');
        }
    }
    function toggleTheme() {
        const isDark = document.documentElement.classList.toggle('dark');
        localStorage.theme = isDark ? 'dark' : 'light';
        elements.moonIcon?.classList.toggle('hidden', isDark);
        elements.sunIcon?.classList.toggle('hidden', !isDark);
    }
    
    // (إظهار/إخفاء كلمة المرور)
    function togglePasswordVisibility(inputElement, toggleElement) {
         if (!inputElement || !toggleElement) return;
        const type = inputElement.getAttribute('type') === 'password' ? 'text' : 'password';
        inputElement.setAttribute('type', type);
        const icon = toggleElement.querySelector('svg');
        if (!icon) return;
        // Update icon based on type (example, replace with actual SVG paths)
        if (type === 'password') {
            icon.innerHTML = `<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"></path><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"></path>`; // Eye open
        } else {
            icon.innerHTML = `<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.542-7 .844-3.14 3.1-5.64 5.922-6.756M12 12a3 3 0 100-6 3 3 0 000 6z"></path><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M1 1l22 22"></path>`; // Eye closed/slashed
        }
    }
    
    // (تعيين تاريخ افتراضي)
    function setDefaultDate() {
        if (!elements.orderDate) return;
        try {
            const today = new Date();
            elements.orderDate.value = today.toISOString().split('T')[0];
        } catch (e) {
            console.error("Error setting default date:", e);
        }
    }
    
    // (Event handlers need access to Firebase services - passed via context in setupEventListeners)
    async function handleLogin(auth, email, password) {
        if (!email || !password) { showToast("يرجى إدخال الإيميل وكلمة المرور.", true); return; }
        try {
            await window._firebaseAuth.signInWithEmailAndPassword(auth, email, password); // Use imported function
            showToast("تم تسجيل الدخول بنجاح!");
            elements.loginForm?.reset();
        } catch (error) {
            console.error("Login Error:", error.code, error.message);
            showToast(getFriendlyAuthError(error.code), true);
        }
    }
    
    async function handleRegister(auth, db, appId, SUPER_ADMIN_EMAIL, email, password) {
         if (!email || !password) { showToast("يرجى إدخال الإيميل وكلمة المرور.", true); return; }
        const role = (email.toLowerCase() === SUPER_ADMIN_EMAIL.toLowerCase()) ? 'admin' : 'guest';
        try {
            const userCredential = await window._firebaseAuth.createUserWithEmailAndPassword(auth, email, password); // Use imported function
            const user = userCredential.user;
            const userDocRef = window._firestore.doc(db, `artifacts/${appId}/users`, user.uid); // Use imported function
            await window._firestore.setDoc(userDocRef, { email: user.email, role: role, createdAt: new Date() }); // Use imported function
            showToast("تم إنشاء الحساب وتسجيل الدخول بنجاح!");
            elements.registerForm?.reset();
        } catch (error) {
            console.error("Register Error:", error.code, error.message);
            showToast(getFriendlyAuthError(error.code), true);
        }
    }
    
    async function handleLogout(auth) {
        try {
            await window._firebaseAuth.signOut(auth); // Use imported function
            showToast("تم تسجيل الخروج.");
        } catch (error) {
            console.error("Logout error:", error);
            showToast("حدث خطأ أثناء تسجيل الخروج.", true);
        }
    }
    
    async function handleAddOrder(db, appId, userId, type, name, ref, date) {
        if (!userId) { showToast("يرجى تسجيل الدخول أولاً.", true); return; }
        name = name?.trim();
        ref = ref?.trim() || 'N/A';
        if (!name || !date || !type) { showToast("يرجى ملء الاسم والنوع والتاريخ.", true); return; }
        try {
            await addOrder(db, appId, { type, name, ref, date, status: 'pending', addedBy: userId });
            showToast("تمت إضافة الأوردر بنجاح!");
        } catch (error) {
            console.error("Error adding order: ", error);
            showToast("حدث خطأ أثناء إضافة الأوردر.", true);
        }
    }
    
    async function handleToggleStatus(db, appId, orderId, currentStatus) {
         const newStatus = (currentStatus === 'pending') ? 'completed' : 'pending';
        try {
            await updateOrderStatus(db, appId, orderId, newStatus);
            // Toast is optional here as the UI updates visually
        } catch (error) {
            console.error("Error toggling status:", error);
            showToast("خطأ في تحديث الحالة.", true);
        }
    }
    
    async function handleBulkDelete(db, appId, userRole, selectedOrders) {
        if (userRole !== 'admin' || selectedOrders.size === 0) return;
        showConfirmModal(`هل أنت متأكد من مسح ${selectedOrders.size} أوردر؟ لا يمكن التراجع عن هذا الإجراء.`, async () => {
            try {
                await deleteOrdersBatch(db, appId, Array.from(selectedOrders));
                showToast(`تم مسح ${selectedOrders.size} أوردر بنجاح!`);
                selectedOrders.clear();
                // Need to re-render tables after deletion
                // renderTables(allOrders, userRole, selectedOrders); // Requires access to allOrders
            } catch (error) {
                console.error("Error bulk deleting orders:", error);
                showToast("حدث خطأ أثناء المسح.", true);
            }
        });
    }
    
    async function handleChangeUserRole(db, appId, targetUserId, newRole) {
        // This function needs the current user's role and ID for validation, 
        // which might need to be passed down or accessed globally.
        // Simplified for now:
        try {
            await updateUserRole(db, appId, targetUserId, newRole);
            showToast("تم تحديث الصلاحية بنجاح!");
        } catch (error) {
            console.error("Error updating role:", error);
            showToast("خطأ في تحديث الصلاحية.", true);
            // Need to re-render admin panel to revert dropdown
            // renderAdminPanel(allUsers, userId, userRole); // Requires access to state
        }
    }
    

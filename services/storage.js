// services/storage.js (Bao gồm Products, Logs, Checks, Movements, và Tasks)
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as FileSystem from 'expo-file-system';
import * as Crypto from 'expo-crypto'; // Cần cho Task ID

// --- Keys ---
const PRODUCTS_KEY = '@QuanLyKhoHang:products';
const ACTIVITY_LOG_KEY = '@QuanLyKhoHang:activityLog';
const STOCK_CHECKS_KEY = '@QuanLyKhoHang:stockChecks'; // Dùng cho Backup/Restore
const STOCK_MOVEMENTS_KEY = '@QuanLyKhoHang:stockMovements'; // Dùng cho Nhập hàng
const TASKS_KEY = '@QuanLyKhoHang:tasks'; // <<< Key cho Tasks
// --- Giới hạn ---
const MAX_LOG_ENTRIES = 200;
const MAX_MOVEMENT_ENTRIES = 500;
const MAX_TASK_ENTRIES = 500; // Giới hạn số task nếu muốn

// --- Thư mục Ảnh ---
export const PRODUCT_IMAGES_DIR = FileSystem.documentDirectory + 'product_images/';
export const INVOICE_IMAGES_DIR = FileSystem.documentDirectory + 'invoice_images/';

// --- Hàm Sản phẩm (Đã chuẩn hóa quantity) ---
export const getProducts = async () => { try { const jsonValue = await AsyncStorage.getItem(PRODUCTS_KEY); if (jsonValue === null) return []; let products = JSON.parse(jsonValue); if (!Array.isArray(products)) { products = []; } products = products.map(p => ({ ...(p || {}), id: p?.id || `INVALID_ID_${Math.random()}`, name: p?.name || 'Sản phẩm lỗi', quantity: (typeof p?.quantity === 'number' && !isNaN(p.quantity)) ? p.quantity : 0, isOutOfStock: undefined })); products.sort((a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0)); return products; } catch (e) { console.error("GetProducts Error:", e); return []; } };
export const getProductById = async (id) => { if (!id) { return null; } try { const products = await getProducts(); const product = products.find((item) => item.id === id); return product || null; } catch (e) { console.error(`GetProductById Error (${id}):`, e); return null; } };
export const saveProducts = async (products) => { try { const validProducts = Array.isArray(products) ? products : []; const productsToSave = validProducts.map(p => ({ ...(p || {}), id: p?.id, name: p?.name, price: p?.price, specification: p?.specification, imageUri: p?.imageUri, quantity: (typeof p?.quantity === 'number' && !isNaN(p.quantity)) ? p.quantity : 0, createdAt: p?.createdAt, isOutOfStock: undefined })).filter(p => p.id && p.name); const jsonValue = JSON.stringify(productsToSave); await AsyncStorage.setItem(PRODUCTS_KEY, jsonValue); } catch (e) { console.error('SaveProducts Error:', e); throw e; } };
export const addProduct = async (newProductData) => { const currentProductsForId = await getProducts(); let nextIdNum = 1; const numericIds = currentProductsForId.map(p => p.id && typeof p.id === 'string' && p.id.startsWith('KD') ? parseInt(p.id.substring(2), 10) : NaN).filter(n => !isNaN(n)); if (numericIds.length > 0) { nextIdNum = Math.max(0, ...numericIds) + 1; } const newId = `KD${String(nextIdNum).padStart(3, '0')}`; if (currentProductsForId.some(p => p.id === newId)) { throw new Error(`Lỗi tạo ID sản phẩm.`); } const newProduct = { name: newProductData.name?.trim() || '', price: Number(newProductData.price) || 0, specification: newProductData.specification?.trim() || '', imageUri: newProductData.imageUri || null, id: newId, quantity: 0, createdAt: new Date().toISOString(), }; if (!newProduct.name || !newProduct.id) { throw new Error('Dữ liệu sản phẩm mới không hợp lệ.'); } try { const currentProducts = await getProducts(); const updatedProducts = [...currentProducts, newProduct]; await saveProducts(updatedProducts); const priceFormatted = Number(newProduct.price || 0).toLocaleString('vi-VN'); const logDetails = `Giá: ${priceFormatted} VNĐ; QC: ${newProduct.specification || 'N/A'}; SL: 0`; await logActivity('add', newProduct, logDetails); return updatedProducts; } catch (e) { console.error('AddProduct Error:', e); throw e; } };
export const updateProduct = async (updatedProductData) => { if (!updatedProductData || !updatedProductData.id) { throw new Error('Dữ liệu cập nhật không hợp lệ.'); } let originalProduct = null; try { originalProduct = await getProductById(updatedProductData.id); if (!originalProduct) { throw new Error(`SP gốc ${updatedProductData.id} không tồn tại.`); } let currentProducts = await getProducts(); const productIndex = currentProducts.findIndex(p => p.id === updatedProductData.id); if (productIndex === -1) { throw new Error(`SP ${updatedProductData.id} không tìm thấy.`); } const updatedProduct = { ...originalProduct, ...updatedProductData }; updatedProduct.quantity = (typeof updatedProductData.quantity === 'number' && !isNaN(updatedProductData.quantity)) ? updatedProductData.quantity : (originalProduct.quantity ?? 0); delete updatedProduct.isOutOfStock; const updatedProductsList = [...currentProducts]; updatedProductsList[productIndex] = updatedProduct; await saveProducts(updatedProductsList); const changes = []; if (originalProduct.name !== updatedProduct.name) changes.push(`Tên:"${originalProduct.name}"->"${updatedProduct.name}"`); if (Number(originalProduct.price || 0) !== Number(updatedProduct.price || 0)) { const o = Number(originalProduct.price || 0).toLocaleString('vi-VN'); const n = Number(updatedProduct.price || 0).toLocaleString('vi-VN'); changes.push(`Giá:${o}->${n} VNĐ`); } if (originalProduct.specification !== updatedProduct.specification) changes.push( `QC:"${originalProduct.specification || ''}"->"${ updatedProduct.specification || '' }"` ); if ((originalProduct.quantity ?? 0) !== updatedProduct.quantity) changes.push( `SL:${originalProduct.quantity ?? 0}->${updatedProduct.quantity}` ); if (originalProduct.imageUri !== updatedProduct.imageUri) changes.push(updatedProduct.imageUri ? 'Ảnh mới' : 'Xóa ảnh'); if (changes.length > 0) { await logActivity('edit', updatedProduct, changes.join('; ')); } return updatedProductsList; } catch (e) { console.error('UpdateProduct Error:', e); throw e; } };
export const deleteProduct = async (id) => { if (!id) { throw new Error('ID sản phẩm cần xóa không hợp lệ.'); } let productToDeleteInfo = null; try { const productToDelete = await getProductById(id); if (!productToDelete) { console.warn(`Product with ID ${id} not found for deletion.`); return await getProducts(); } productToDeleteInfo = { id: productToDelete.id, name: productToDelete.name }; let currentProducts = await getProducts(); const updatedProducts = currentProducts.filter((p) => p.id !== id); if (updatedProducts.length === currentProducts.length) { console.warn(`Failed to remove product ${id}.`); } await saveProducts(updatedProducts); await logActivity('delete', productToDeleteInfo); if (productToDelete.imageUri && productToDelete.imageUri.startsWith('file://')) { await FileSystem.deleteAsync(productToDelete.imageUri, { idempotent: true }).catch(e => console.warn(`Could not delete image ${productToDelete.imageUri}: ${e.message}`)); } return updatedProducts; } catch (e) { console.error('DeleteProduct Error:', e); throw e; } };


// --- Hàm xử lý Log hoạt động cũ ---
export const getActivityLog = async () => { try { const jsonValue = await AsyncStorage.getItem(ACTIVITY_LOG_KEY); if (jsonValue === null) return []; let logs = JSON.parse(jsonValue); if (!Array.isArray(logs)) logs = []; logs.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()); return logs; } catch (e) { console.error("GetActivityLog Error:", e); return []; } };
export const logActivity = async (action, productData, details = '') => { if (!action || !productData || !productData.id || !productData.name) { return; } const entry = { id: `LOG${Date.now()}${Math.floor(Math.random() * 100)}`, timestamp: new Date().toISOString(), action: action, productId: productData.id, productName: productData.name, details: details }; try { const currentLog = await getActivityLog(); const updatedLog = [entry, ...currentLog].slice(0, MAX_LOG_ENTRIES); await AsyncStorage.setItem(ACTIVITY_LOG_KEY, JSON.stringify(updatedLog)); } catch (e) { console.error("LogActivity Error:", e); } };
export const clearActivityLog = async () => { try { await AsyncStorage.removeItem(ACTIVITY_LOG_KEY); } catch (e) { console.error("ClearLog Error:", e); throw e; } };


// --- Hàm xử lý Dữ liệu Kiểm kê (Cho Backup/Restore) ---
export const getAllStockChecks = async () => { try { const jsonValue = await AsyncStorage.getItem(STOCK_CHECKS_KEY); if (jsonValue === null) return []; const checks = JSON.parse(jsonValue); let checksArray = []; if (Array.isArray(checks)) { checksArray = checks; } else if (typeof checks === 'object' && checks !== null) { checksArray = Object.values(checks); } checksArray.sort((a, b) => { if (a.checkDate > b.checkDate) return -1; if (a.checkDate < b.checkDate) return 1; if ((a.productName || '').localeCompare(b.productName || '') < 0) return -1; if ((a.productName || '').localeCompare(b.productName || '') > 0) return 1; return 0; }); return checksArray; } catch (e) { console.error("GetAllStockChecks Error:", e); return []; } };


// --- Hàm xử lý Lịch sử Nhập/Xuất Kho ---
export const getStockMovements = async (productId = null) => { try { const jsonValue = await AsyncStorage.getItem(STOCK_MOVEMENTS_KEY); if (jsonValue === null) return []; let movements = JSON.parse(jsonValue); if (!Array.isArray(movements)) movements = []; movements.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()); if (productId) { return movements.filter(m => m.productId === productId); } return movements; } catch (e) { console.error("GetStockMovements Error:", e); return []; } };
export const addStockMovement = async (movement) => { if (!movement || !movement.id || !movement.productId) { console.error("addStockMovement: Invalid data"); return; } try { const currentMovements = await getStockMovements(); const updatedMovements = [movement, ...currentMovements].slice(0, MAX_MOVEMENT_ENTRIES); await AsyncStorage.setItem(STOCK_MOVEMENTS_KEY, JSON.stringify(updatedMovements)); } catch (e) { console.error("AddStockMovement Error:", e); } };
export const recordStockIn = async ({ productId, amountToAdd, timestamp, productName = '', supplierName = '', reference = '', invoiceImageUri = null, costPrice = undefined, invoiceQuantity = undefined }) => { if (!productId || typeof amountToAdd !== 'number' || amountToAdd <= 0 || isNaN(amountToAdd) || !timestamp) { throw new Error("Thiếu thông tin nhập hàng."); } const invQty = (typeof invoiceQuantity === 'number' && !isNaN(invoiceQuantity) && invoiceQuantity >= 0) ? invoiceQuantity : undefined; const costP = (typeof costPrice === 'number' && !isNaN(costPrice)) ? costPrice : undefined; try { const product = await getProductById(productId); if (!product) { throw new Error(`Không tìm thấy SP ${productId}.`); } const currentQuantity = product.quantity ?? 0; const newQuantity = currentQuantity + amountToAdd; let quantityDifference = undefined; if (invQty !== undefined) { quantityDifference = amountToAdd - invQty; } const movement = { id: `MV_IN_${Date.now()}_${productId.slice(-4)}`, timestamp: timestamp, type: 'in', productId: productId, productName: productName || product.name, quantityChange: amountToAdd, newQuantity: newQuantity, supplierName: supplierName.trim() || undefined, reference: reference.trim() || undefined, invoiceImageUri: invoiceImageUri, costPrice: costP, invoiceQuantity: invQty, quantityDifference: quantityDifference }; let currentProducts = await getProducts(); const productIndex = currentProducts.findIndex(p => p.id === productId); if (productIndex === -1) { throw new Error(`SP ${productId} không tìm thấy (lỗi đồng bộ?).`); } currentProducts[productIndex] = { ...product, quantity: newQuantity }; await Promise.all([ saveProducts(currentProducts), addStockMovement(movement) ]); return newQuantity; } catch (e) { console.error(`[Storage] recordStockIn Error for ${productId}:`, e); throw e; } };


// --- HÀM CHO QUẢN LÝ CÔNG VIỆC (ĐÃ THÊM LẠI) ---

/** Lấy danh sách công việc */
export const getTasks = async (filterStatus = 'all') => {
    try {
        const jsonValue = await AsyncStorage.getItem(TASKS_KEY);
        if (jsonValue === null) return [];
        let tasks = JSON.parse(jsonValue);
        if (!Array.isArray(tasks)) tasks = [];
        if (filterStatus === 'pending') { tasks = tasks.filter(task => task.status === 'pending'); }
        else if (filterStatus === 'completed') { tasks = tasks.filter(task => task.status === 'completed'); }
        tasks.sort((a, b) => { if (a.status === 'pending' && b.status !== 'pending') return -1; if (a.status !== 'pending' && b.status === 'pending') return 1; return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(); });
        return tasks;
    } catch (e) { console.error("GetTasks Error:", e); return []; }
};

/** Lưu toàn bộ danh sách công việc */
export const saveTasks = async (tasks) => {
    try { const validTasks = Array.isArray(tasks) ? tasks : []; const jsonValue = JSON.stringify(validTasks); await AsyncStorage.setItem(TASKS_KEY, jsonValue); }
    catch (e) { console.error('SaveTasks Error:', e); throw e; }
};

/** Thêm công việc mới */
export const addTask = async (newTaskData) => {
    if (!newTaskData || !newTaskData.title || !newTaskData.title.trim()) { throw new Error("Tiêu đề công việc không được để trống."); }
    const newTask = { id: `TASK-${Crypto.randomUUID()}`, title: newTaskData.title.trim(), description: newTaskData.description?.trim() || '', status: 'pending', createdAt: new Date().toISOString(), completedAt: null, };
    try { const currentTasks = await getTasks('all'); const updatedTasks = [newTask, ...currentTasks].slice(0, MAX_TASK_ENTRIES); await saveTasks(updatedTasks); return newTask;
    } catch (e) { console.error("AddTask Error:", e); throw e; }
};

/** Cập nhật trạng thái công việc */
export const updateTaskStatus = async (taskId, newStatus) => {
    if (!taskId || (newStatus !== 'pending' && newStatus !== 'completed')) { throw new Error("Thông tin cập nhật trạng thái không hợp lệ."); }
    try { let currentTasks = await getTasks('all'); const taskIndex = currentTasks.findIndex(task => task.id === taskId); if (taskIndex === -1) { throw new Error(`Không tìm thấy công việc ID: ${taskId}`); } const updatedTask = { ...currentTasks[taskIndex], status: newStatus, completedAt: newStatus === 'completed' ? new Date().toISOString() : null, }; currentTasks[taskIndex] = updatedTask; await saveTasks(currentTasks); return currentTasks;
    } catch (e) { console.error("UpdateTaskStatus Error:", e); throw e; }
};

/** Xóa công việc */
export const deleteTask = async (taskId) => {
    if (!taskId) { throw new Error("Thiếu ID công việc cần xóa."); }
    try { let currentTasks = await getTasks('all'); const updatedTasks = currentTasks.filter(task => task.id !== taskId); if (updatedTasks.length === currentTasks.length) { console.warn(`[Storage] Task ${taskId} not found for deletion.`); } await saveTasks(updatedTasks); return updatedTasks;
    } catch (e) { console.error("DeleteTask Error:", e); throw e; }
};
// --- KẾT THÚC HÀM CÔNG VIỆC ---
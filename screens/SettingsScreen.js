// screens/SettingsScreen.js (Log chi tiết cho Backup/Restore/Import/Export)
import React, { useState } from 'react';
import { View, StyleSheet, Alert, Platform, ActivityIndicator, ScrollView } from 'react-native';
import * as DocumentPicker from 'expo-document-picker';
import * as FileSystem from 'expo-file-system';
import * as Sharing from 'expo-sharing';
import * as MediaLibrary from 'expo-media-library';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as XLSX from 'xlsx';
import {
    getProducts,
    saveProducts,
    getActivityLog,
    logActivity,
    getAllStockChecks
} from '../services/storage';
import Ionicons from 'react-native-vector-icons/Ionicons';
import { useTheme, Text, Button, Divider } from 'react-native-paper';
import JSZip from 'jszip';
import * as Crypto from 'expo-crypto';

const PRODUCTS_KEY = '@QuanLyKhoHang:products';
const ACTIVITY_LOG_KEY = '@QuanLyKhoHang:activityLog';
const STOCK_CHECKS_KEY = '@QuanLyKhoHang:stockChecks';
const PRODUCT_IMAGES_DIR = FileSystem.documentDirectory + 'product_images/';

const ensureDirExists = async (dir) => { try { const dirInfo = await FileSystem.getInfoAsync(dir); if (!dirInfo.exists) { await FileSystem.makeDirectoryAsync(dir, { intermediates: true }); } } catch (error) { console.error(`Error ensuring dir "${dir}":`, error); throw error; } };

export default function SettingsScreen() {
  const theme = useTheme();
  const [isImporting, setIsImporting] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const [isBackingUp, setIsBackingUp] = useState(false);
  const [isRestoring, setIsRestoring] = useState(false);

  const ensurePermissions = async (write = false) => { // Thêm cờ yêu cầu quyền ghi
      console.log(`[Permissions] Checking/Requesting... Write required: ${write}`);
      try {
          // Hỏi quyền đọc/ghi tùy theo nhu cầu
          const { status } = await MediaLibrary.requestPermissionsAsync(write);
          console.log('[Permissions] Media Library permission status:', status);
          if (status !== 'granted') {
              Alert.alert('Quyền bị từ chối','Cần quyền truy cập bộ nhớ/thư viện.');
              return false;
          }
          console.log('[Permissions] Permission granted.');
          return true;
      } catch (error) {
          console.error('[Permissions] Error requesting permissions:', error);
           Alert.alert('Lỗi Quyền', `Không thể yêu cầu quyền: ${error.message}`);
           return false;
      }
  };

  // --- Hàm xử lý Import Excel (Đã cập nhật dùng quantity + Log) ---
  const handleImportExcel = async () => {
    console.log('[Import Excel] Starting...'); setIsImporting(true); try { console.log('[Import Excel] Requesting document...'); const result = await DocumentPicker.getDocumentAsync({ type: ['application/vnd.ms-excel','application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'], copyToCacheDirectory: true }); console.log('[Import Excel] Picker Result:', JSON.stringify(result).substring(0,300)); let fileUri = null; if (!result.canceled && result.assets && result.assets.length > 0 && result.assets[0].uri) { fileUri = result.assets[0].uri; } else if (result.type === 'success' && result.uri) { fileUri = result.uri; } if (fileUri) { console.log(`[Import Excel] File selected: ${fileUri}`); await processExcelFile(fileUri); } else { console.log("[Import Excel] No file selected or cancelled."); } } catch (e) { console.error("Import Excel Error", e); Alert.alert('Lỗi Import Excel', `Lỗi: ${e.message}`); } finally { console.log('[Import Excel] Finished.'); setIsImporting(false); }
  };

  const processExcelFile = async (fileUri) => {
    console.log(`[Import Excel] Processing file: ${fileUri}`); try { const fStr=await FileSystem.readAsStringAsync(fileUri,{encoding:FileSystem.EncodingType.Base64}); console.log('[Import Excel] File read to Base64 (length):', fStr?.length); const wb=XLSX.read(fStr,{type:'base64'}); const wsName=wb.SheetNames[0]; console.log(`[Import Excel] Using sheet: ${wsName}`); if(!wsName){Alert.alert('Lỗi File','K thấy sheet.');return;} const ws=wb.Sheets[wsName]; const jsonData=XLSX.utils.sheet_to_json(ws,{header:0,defval:'',raw:false,blankrows:false}); console.log(`[Import Excel] Parsed ${jsonData?.length} rows.`); if(!jsonData||jsonData.length===0){Alert.alert('Lỗi data','File trống/sai định dạng.');return;} const headers=jsonData[0]?Object.keys(jsonData[0]).map(h=>String(h).toLowerCase().trim()):[]; console.log('[Import Excel] Headers found:', headers); const map={ name:['tên sản phẩm','tên sp','tên hàng','tên','name','product name','product'], price:['giá','giá bán','đơn giá','price','unit price'], specification:['quy cách','đơn vị tính','dvt','spec','specification','unit'], quantity: ['số lượng','sl','tồn kho','quantity','qty','stock'] }; const findKey=(names)=>{const keys=jsonData[0]?Object.keys(jsonData[0]):[];for(const n of names){const i=headers.indexOf(n.toLowerCase().trim());if(i!==-1)return keys[i];}return null;}; const nameKey=findKey(map.name); const priceKey=findKey(map.price); const specKey=findKey(map.specification); const quantityKey = findKey(map.quantity); console.log(`[Import Excel] Mapped keys: name=${nameKey}, price=${priceKey}, spec=${specKey}, quantity=${quantityKey}`); if(!nameKey){Alert.alert('Thiếu cột','K thấy cột Tên SP.');return;} let impProds=[],errs=[]; jsonData.forEach((row,i)=>{ const name=String(row[nameKey]||'').trim(); if(!name){if(Object.values(row).some(v=>String(v).trim()!==''))errs.push(`Dòng ${i+2}: Thiếu tên.`);return;} const priceStr=priceKey?String(row[priceKey]||'0').trim():'0'; const spec=specKey?String(row[specKey]||'').trim():''; const price=Number(priceStr.replace(/[^0-9.-]+/g,"").replace(/,/g,'.')); const quantityStr = quantityKey ? String(row[quantityKey] || '0').trim() : '0'; let quantity = parseInt(quantityStr.replace(/[^0-9]/g, ''), 10); if(isNaN(quantity) || quantity < 0) { errs.push(`Dòng ${i+2} (${name}): SL "${quantityStr}" lỗi, đặt 0.`); quantity = 0; } if(isNaN(price)||price<0){errs.push(`Dòng ${i+2} (${name}): Giá "${priceStr}" lỗi, đặt 0.`); price = 0;} impProds.push({ name:name, price:price, specification:spec, quantity: quantity, imageUri:null, importedAt:new Date().toISOString() }); }); console.log(`[Import Excel] Processed. Valid products: ${impProds.length}, Errors/Warnings: ${errs.length}`); if(impProds.length>0){ /* ... Alert xác nhận và lưu ... */ } else { /* ... Alert báo trống/lỗi ... */ if(errs.length>0)console.warn("Import Excel errors/warnings:",errs); }
    } catch(e){console.error("Process Excel Error:", e); Alert.alert('Lỗi xử lý file',`Lỗi: ${e.message}`);}
  };
  // --- Kết thúc Import Excel ---

  // --- Hàm xử lý Export Excel (Đã cập nhật dùng quantity + Log) ---
  const handleExportExcel = async () => {
      console.log('[Export Excel] Starting...'); setIsExporting(true); const hasPermission = await ensurePermissions(true); if (!hasPermission) { setIsExporting(false); return; } try { console.log('[Export Excel] Getting products...'); const products = await getProducts(); console.log(`[Export Excel] Found ${products.length} products.`); if (products.length === 0) { Alert.alert('Trống', 'Chưa có SP.'); setIsExporting(false); return; } const dataHeader = ['ID', 'Tên Sản Phẩm', 'Giá Bán', 'Quy Cách', 'Số Lượng Tồn', 'Ngày Tạo', 'Link Ảnh']; const dataRows = products.map(p => [ p.id || '', p.name || '', p.price ?? '', p.specification || '', p.quantity ?? 0, p.createdAt ? new Date(p.createdAt).toLocaleString('vi-VN') : '', p.imageUri || '' ]); const excelData = [dataHeader, ...dataRows]; console.log('[Export Excel] Data prepared. Creating worksheet...'); const ws = XLSX.utils.aoa_to_sheet(excelData); ws['!cols'] = [{wch:15},{wch:35},{wch:15},{wch:20},{wch:15},{wch:20},{wch:40}]; const wb = XLSX.utils.book_new(); XLSX.utils.book_append_sheet(wb, ws, 'DanhSachSanPham'); console.log('[Export Excel] Writing workbook...'); const wbout = XLSX.write(wb, { type: 'base64', bookType: 'xlsx' }); const dateStr = new Date().toISOString().split('T')[0].replace(/-/g, ''); const filename = `DanhSachSanPham_${dateStr}.xlsx`; const uri = FileSystem.cacheDirectory + filename; console.log(`[Export Excel] Writing file to ${uri}...`); await FileSystem.writeAsStringAsync(uri, wbout, { encoding: FileSystem.EncodingType.Base64 }); console.log('[Export Excel] File written. Checking sharing...'); if (await Sharing.isAvailableAsync()) { console.log('[Export Excel] Sharing file...'); await Sharing.shareAsync(uri, { mimeType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', dialogTitle: 'Xuất DS Sản phẩm' }); } else { Alert.alert('Đã lưu file', `Lưu tại:\n${uri}`); } } catch (e) { console.error('[Export Excel] Error:', e); Alert.alert('Lỗi Export', `Lỗi: ${e.message}`); } finally { console.log('[Export Excel] Finished.'); setIsExporting(false); }
  };
  // --- Kết thúc Export Excel ---


  // --- Hàm xử lý Sao lưu (ZIP với ảnh - Thêm Log Debug) ---
  const handleBackup = async () => {
      console.log('[Backup][ZIP] Starting data backup...'); // Log 1 (User thấy log này)
      setIsBackingUp(true);
      let hasPermission = false;

      try {
          // --- THÊM LOG QUANH HÀM QUYỀN ---
          console.log('[Backup][ZIP] Calling ensurePermissions...'); // Log 2
          hasPermission = await ensurePermissions(true); // Yêu cầu quyền ghi
          console.log('[Backup][ZIP] ensurePermissions returned:', hasPermission); // Log 3
          // --- KẾT THÚC LOG QUYỀN ---

          if (!hasPermission) { console.log('[Backup][ZIP] Permission denied, aborting.'); setIsBackingUp(false); return; }

          console.log('[Backup][ZIP] Permission granted. Fetching data...'); // Log 4
          let backupData = { backupVersion: 3, backupDate: new Date().toISOString(), products: [], activityLogs: [], stockChecks: [], }; let imageErrors = 0; const zip = new JSZip(); const imagesFolder = zip.folder("images");
          const [products, activityLogs, stockChecks] = await Promise.all([ getProducts(), getActivityLog(), getAllStockChecks() ]);
          console.log(`[Backup][ZIP] Fetched: P=${products.length}, L=${activityLogs.length}, C=${stockChecks.length}.`); // Log 5
          backupData.activityLogs = Array.isArray(activityLogs) ? activityLogs : []; backupData.stockChecks = Array.isArray(stockChecks) ? stockChecks : [];
          console.log('[Backup][ZIP] Processing products and images...'); // Log 6
          const imageReadPromises = []; const validProducts = Array.isArray(products) ? products : [];
          backupData.products = validProducts.map((product) => { const productToBackup = { ...product }; delete productToBackup.imageUri; productToBackup.imagePath = null; if (product.imageUri && typeof product.imageUri === 'string' && product.imageUri.startsWith('file:///')) { const originalUri = product.imageUri; const extensionMatch = originalUri.match(/\.([a-zA-Z0-9]+)$/); const extension = extensionMatch ? extensionMatch[1] : 'jpg'; const newFilename = `${product.id || Crypto.randomUUID()}.${extension}`; const relativePath = `images/${newFilename}`; productToBackup.imagePath = relativePath; imageReadPromises.push( FileSystem.readAsStringAsync(originalUri, { encoding: FileSystem.EncodingType.Base64 }) .then(base64Data => { if (imagesFolder) { imagesFolder.file(newFilename, base64Data, { base64: true }); } }).catch(imgError => { console.warn(`[Backup][ZIP] Img Read Err ${product.id}:`, imgError.message); imageErrors++; productToBackup.imagePath = null; }) ); } return productToBackup; });
          console.log(`[Backup][ZIP] Waiting for ${imageReadPromises.length} images...`); // Log 7
          await Promise.all(imageReadPromises); console.log('[Backup][ZIP] Image processing finished.'); if (imageErrors > 0) { Alert.alert("Cảnh báo Ảnh", `Lỗi đọc ${imageErrors} ảnh.`); }
          zip.file("data.json", JSON.stringify(backupData, null, 2)); console.log('[Backup][ZIP] Generating ZIP file...'); const zipBase64 = await zip.generateAsync({ type: "base64", compression: "DEFLATE" }); if (!zipBase64) throw new Error("Không thể tạo ZIP."); const dateStr = new Date().toISOString().split('T')[0].replace(/-/g, ''); const filename = `QuanLyKho_Backup_IMG_${dateStr}.zip`; const uri = FileSystem.cacheDirectory + filename; console.log(`[Backup][ZIP] Writing ZIP to ${uri}...`); await FileSystem.writeAsStringAsync(uri, zipBase64, { encoding: FileSystem.EncodingType.Base64 }); console.log('[Backup][ZIP] ZIP written. Sharing...'); if (await Sharing.isAvailableAsync()) { await Sharing.shareAsync(uri, { mimeType: 'application/zip', dialogTitle: 'Lưu file sao lưu (.zip)' }); } else { Alert.alert('Đã tạo file sao lưu', `Lưu tại:\n${uri}`); } Alert.alert("Sao lưu thành công", `Đã sao lưu.${imageErrors > 0 ? ` (${imageErrors} ảnh lỗi)` : ''}`);
      } catch (error) { console.error('[Backup][ZIP] Error:', error); Alert.alert('Lỗi Sao Lưu', `Lỗi: ${error.message}`); }
      finally { console.log('[Backup][ZIP] Backup process finished.'); setIsBackingUp(false); }
  };
  // --- Kết thúc Sao lưu ---

  // --- Hàm xử lý Khôi phục (ZIP với ảnh - Thêm Log) ---
  const handleRestore = async () => {
      console.log('[Restore][ZIP] Starting restore process...');
      Alert.alert( "XÁC NHẬN KHÔI PHỤC", "Khôi phục sẽ **XÓA TOÀN BỘ** dữ liệu và ảnh hiện tại.\n\n**KHÔNG THỂ HOÀN TÁC!**\n\nTiếp tục?",
          [ { text: "Hủy", style: "cancel" }, { text: "Xác nhận", style: "destructive", onPress: async () => {
                  console.log('[Restore][ZIP] User confirmed...'); setIsRestoring(true); let fileUri = null; let zip = null; let parsedData = null; let imageRestoreErrors = 0;
                  try {
                      console.log('[Restore][ZIP] Calling DocumentPicker...'); const result = await DocumentPicker.getDocumentAsync({ type: 'application/zip', copyToCacheDirectory: true }); console.log('[Restore][ZIP] Picker Result:', JSON.stringify(result).substring(0,200)+'...');
                      if (!result.canceled && result.assets && result.assets.length > 0 && result.assets[0].uri) { fileUri = result.assets[0].uri; } else if (result.type === 'success' && result.uri) { fileUri = result.uri; }
                      if (!fileUri) { console.log('[Restore][ZIP] No file selected.'); setIsRestoring(false); return; } console.log(`[Restore][ZIP] File selected: ${fileUri}`);
                      console.log('[Restore][ZIP] Reading ZIP file...'); const zipBase64 = await FileSystem.readAsStringAsync(fileUri, { encoding: FileSystem.EncodingType.Base64 }); console.log('[Restore][ZIP] Loading ZIP...'); zip = await JSZip.loadAsync(zipBase64, { base64: true });
                      const dataFile = zip.file("data.json"); if (!dataFile) throw new Error("ZIP không hợp lệ: thiếu 'data.json'."); console.log('[Restore][ZIP] Reading data.json...'); const jsonString = await dataFile.async("string"); parsedData = JSON.parse(jsonString); console.log('[Restore][ZIP] data.json parsed.');
                      if (typeof parsedData !== 'object' || parsedData === null || !Array.isArray(parsedData.products)) { throw new Error("File 'data.json' không hợp lệ."); } const productsToRestore = parsedData.products || []; const logsToRestore = parsedData.activityLogs || []; const checksToRestore = parsedData.stockChecks || []; console.log(`[Restore][ZIP] Data validated. P:${productsToRestore.length}, L:${logsToRestore.length}, C:${checksToRestore.length}.`);
                      console.log('[Restore][ZIP] Ensuring images directory...'); await ensureDirExists(PRODUCT_IMAGES_DIR); console.log('[Restore][ZIP] Restoring images...');
                      const imageRestorePromises = productsToRestore.map(async (product) => { const productRestored = { ...product }; productRestored.imageUri = null; if (product.imagePath && typeof product.imagePath === 'string') { const imageFileInZip = zip.file(product.imagePath); if (imageFileInZip) { try { const imageBase64 = await imageFileInZip.async("base64"); const newFilename = product.imagePath.split('/').pop() || `${Crypto.randomUUID()}.jpg`; const newImageUri = PRODUCT_IMAGES_DIR + newFilename; await FileSystem.writeAsStringAsync(newImageUri, imageBase64, { encoding: FileSystem.EncodingType.Base64 }); productRestored.imageUri = newImageUri; } catch(imgRestoreError) { console.error(`[Restore][ZIP] Failed restore image ${product.imagePath}:`, imgRestoreError.message); imageRestoreErrors++; } } else { console.warn(`[Restore][ZIP] Image not found in ZIP: ${product.imagePath}`); imageRestoreErrors++; } } delete productRestored.imagePath; delete productRestored.imageDataBase64; return productRestored; });
                      const restoredProductsWithUri = await Promise.all(imageRestorePromises); console.log(`[Restore][ZIP] Image restoring finished. Errors: ${imageRestoreErrors}`); if (imageRestoreErrors > 0) { Alert.alert("Cảnh báo Ảnh", `Lỗi khôi phục ${imageRestoreErrors} ảnh.`); }
                      console.log('[Restore][ZIP] Overwriting data...'); await Promise.all([ saveProducts(restoredProductsWithUri), AsyncStorage.setItem(ACTIVITY_LOG_KEY, JSON.stringify(logsToRestore)), AsyncStorage.setItem(STOCK_CHECKS_KEY, JSON.stringify(checksToRestore)) ]); console.log('[Restore][ZIP] Data overwrite complete.');
                      await logActivity('restore_zip', {id: `BACKUP-${parsedData.backupDate || Date.now()}`, name: `KP Zip ${result.assets?.[0]?.name || ''}`}, `KP ${restoredProductsWithUri.length} SP, ${logsToRestore.length} Logs, ${checksToRestore.length} Checks.`);
                      Alert.alert("Khôi phục Hoàn tất", "Dữ liệu đã khôi phục. Khởi động lại ứng dụng.");
                  } catch (e) { console.error('[Restore][ZIP] Error:', e); Alert.alert('Lỗi Khôi Phục', `Lỗi: ${e.message}`); }
                  finally { console.log('[Restore][ZIP] Restore finished.'); setIsRestoring(false); }
              }}
          ], { cancelable: true }
      );
  };
  // --- Kết thúc Khôi phục ---


  return (
    <ScrollView contentContainerStyle={[styles.container, {backgroundColor: theme.colors.background}]}>

      {/* Phần Sao lưu & Khôi phục (ZIP) */}
      <View style={[styles.settingSection, {backgroundColor: theme.colors.surface}]}>
          <Text style={[styles.sectionTitle, {color: theme.colors.onSurfaceVariant, borderBottomColor: theme.colors.outlineVariant}]}> Sao lưu & Khôi phục (File Zip) </Text>
          <Text style={styles.backupNotice} variant="bodySmall"> Sao lưu TOÀN BỘ dữ liệu (SP, Logs, Kiểm kê) và Hình ảnh vào một file .zip. Khôi phục sẽ GHI ĐÈ dữ liệu hiện tại. </Text>
          <Divider style={styles.divider} />
          <Button icon="zip-box-outline" mode="contained" onPress={handleBackup} disabled={isBackingUp || isRestoring || isImporting || isExporting} loading={isBackingUp} style={styles.actionButton} buttonColor={theme.colors.primary} textColor={theme.colors.onPrimary}> {isBackingUp ? "Đang sao lưu..." : "Sao lưu (Dữ liệu + Ảnh)"} </Button>
          <Button icon="database-import-outline" mode="contained" onPress={handleRestore} disabled={isBackingUp || isRestoring || isImporting || isExporting} loading={isRestoring} style={styles.actionButton} buttonColor={theme.colors.errorContainer} textColor={theme.colors.onErrorContainer}> {isRestoring ? "Đang khôi phục..." : "Khôi phục từ File (.zip)"} </Button>
          {Platform.OS === 'android' && ( <Text style={styles.permissionNotice} variant="bodySmall"> Cần quyền truy cập bộ nhớ/thư viện media. </Text> )}
      </View>

      {/* Phần Import/Export Excel */}
      <View style={[styles.settingSection, {backgroundColor: theme.colors.surface}]}>
          <Text style={[styles.sectionTitle, {color: theme.colors.onSurfaceVariant, borderBottomColor: theme.colors.outlineVariant}]}> Import/Export Excel </Text>
           <Button icon="file-excel-outline" mode="outlined" onPress={handleImportExcel} disabled={isImporting || isExporting || isBackingUp || isRestoring} loading={isImporting} style={styles.actionButton}> {isImporting ? "Đang Import..." : "Import từ Excel"} </Button>
           <Button icon="file-export-outline" mode="outlined" onPress={handleExportExcel} disabled={isImporting || isExporting || isBackingUp || isRestoring} loading={isExporting} style={styles.actionButton}> {isExporting ? "Đang Export..." : "Export ra Excel"} </Button>
      </View>

    </ScrollView>
  );
}

// --- StyleSheet ---
const styles = StyleSheet.create({
  container:{flexGrow:1, padding: 20},
  settingSection:{ marginBottom: 30, borderRadius: 8, padding: 15, elevation: 1, shadowColor:'#000', shadowOffset:{width:0,height:1}, shadowOpacity:0.1, shadowRadius:1.5},
  sectionTitle:{ fontSize: 18, fontWeight: '600', marginBottom: 15, borderBottomWidth: StyleSheet.hairlineWidth, paddingBottom: 10 },
  actionButton:{ paddingVertical: 8, marginBottom: 15, },
  permissionNotice: { marginTop: 10, fontSize: 12, fontStyle: 'italic', textAlign: 'center', opacity: 0.7, },
  backupNotice: { marginBottom: 15, fontSize: 13, textAlign: 'center', opacity: 0.9, lineHeight: 18, },
   divider: { marginBottom: 15, height: StyleSheet.hairlineWidth, },
});
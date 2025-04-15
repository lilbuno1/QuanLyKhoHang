// screens/TaskListScreen.js (Đã sửa lỗi thiếu import useEffect)
import React, { useState, useCallback, useEffect } from 'react'; // <<< ĐÃ THÊM useEffect VÀO ĐÂY
import {
    View,
    StyleSheet,
    FlatList,
    Alert,
    RefreshControl,
    SafeAreaView
} from 'react-native';
import {
    Appbar,
    Button,
    useTheme,
    Text,
    ActivityIndicator,
    Divider,
    List,
    Checkbox,
    IconButton,
    FAB,
    SegmentedButtons
} from 'react-native-paper';
import { useFocusEffect, useNavigation, useRoute } from '@react-navigation/native';
import Ionicons from 'react-native-vector-icons/Ionicons';
import { getTasks, updateTaskStatus, deleteTask } from '../services/storage';

// Hàm format ngày tạo
const formatDate = (iso) => {
     if (!iso) return ''; try { const d=new Date(iso); return isNaN(d.getTime())?'T/g lỗi':d.toLocaleDateString('vi-VN',{ day:'2-digit', month:'2-digit', year:'numeric' }); } catch(e){return 'Lỗi TG';}
};

// --- Component Item cho Task ---
const TaskItem = React.memo(({ item, theme, onToggleStatus, onDelete }) => {
    const isCompleted = item.status === 'completed';
    const handleToggle = useCallback(() => { onToggleStatus(item.id, isCompleted ? 'pending' : 'completed'); }, [item.id, isCompleted, onToggleStatus]);
    const handleDelete = useCallback(() => { Alert.alert( "Xác nhận xóa", `Xóa công việc "${item.title}"?`, [ { text: "Hủy", style: "cancel" }, { text: "Xóa", style: "destructive", onPress: () => onDelete(item.id) } ]); }, [item.id, item.title, onDelete]);

    return (
        <List.Item
            title={item.title || 'Không có tiêu đề'}
            titleNumberOfLines={2}
            description={item.description || `Tạo: ${formatDate(item.createdAt)}${item.completedAt ? ` - HT: ${formatDate(item.completedAt)}`:''}`}
            descriptionNumberOfLines={2}
            descriptionStyle={styles.itemDescription}
            style={[styles.listItem, { backgroundColor: isCompleted ? theme.colors.surfaceDisabled : theme.colors.surface }]}
            titleStyle={[styles.itemTitle, { textDecorationLine: isCompleted ? 'line-through' : 'none', color: isCompleted ? theme.colors.onSurfaceDisabled : theme.colors.onSurface }]}
            left={props => ( <Checkbox.Android {...props} status={isCompleted ? 'checked' : 'unchecked'} onPress={handleToggle} color={theme.colors.primary} /> )}
            right={props => ( <IconButton {...props} icon="delete-outline" onPress={handleDelete} iconColor={theme.colors.error} size={20} style={{ alignSelf: 'center' }} /> )}
        />
    );
});
// --- Kết thúc Item ---

// --- getItemLayout ---
const ESTIMATED_TASK_ITEM_HEIGHT = 80;
const getItemLayout = (data, index) => ({ length: ESTIMATED_TASK_ITEM_HEIGHT, offset: ESTIMATED_TASK_ITEM_HEIGHT * index, index });
// ---

// --- Component Màn hình chính ---
export default function TaskListScreen() {
    const navigation = useNavigation();
    const theme = useTheme();
    const route = useRoute();

    const initialFilter = route.params?.initialFilter ?? 'pending'; // Mặc định là pending
    const [tasks, setTasks] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isRefreshing, setIsRefreshing] = useState(false);
    const [filter, setFilter] = useState(initialFilter);

    // --- Logic tải dữ liệu ---
    const loadTasks = useCallback(async (showLoading = true) => {
        if (showLoading && !isRefreshing) setIsLoading(true);
        try {
            // console.log(`[TaskListScreen] Loading tasks with filter: ${filter}`);
            const fetchedTasks = await getTasks(filter);
            setTasks(fetchedTasks);
        } catch (error) { console.error("Error loading tasks:", error); Alert.alert("Lỗi", "Không thể tải công việc."); }
        finally { if (showLoading && !isRefreshing) setIsLoading(false); }
    }, [filter, isRefreshing]);

    // Sử dụng useEffect để load lại khi filter thay đổi (thay vì useFocusEffect chỉ chạy khi focus)
    useEffect(() => {
        // console.log(`[TaskListScreen] Filter changed to: ${filter}. Reloading tasks...`);
        loadTasks(true); // Load lại khi filter thay đổi
    }, [filter, loadTasks]); // Phụ thuộc vào filter và loadTasks

    // Vẫn dùng useFocusEffect để load lại khi quay về màn hình (nếu cần)
    useFocusEffect(
        useCallback(() => {
            // console.log("[TaskListScreen] Screen focused. Reloading tasks...");
            // Load data nhưng không hiển thị loading indicator chính nếu không phải lần đầu
            loadTasks(tasks.length === 0); // Chỉ hiện loading nếu danh sách đang trống
            return () => {};
        }, [loadTasks]) // Chỉ phụ thuộc loadTasks (vì loadTasks đã phụ thuộc filter)
    );


    const onRefresh = useCallback(async () => { setIsRefreshing(true); await loadTasks(false); setIsRefreshing(false); }, [loadTasks]);
    // --- Kết thúc logic tải dữ liệu ---

    // --- Logic cập nhật/xóa ---
    const handleToggleStatus = useCallback(async (taskId, newStatus) => { try { const updatedList = await updateTaskStatus(taskId, newStatus); if (updatedList) { if (filter === 'all') { setTasks(updatedList); } else { setTasks(updatedList.filter(t => t.status === filter)); } } } catch (error) { Alert.alert("Lỗi", `Không thể cập nhật: ${error.message}`); } }, [filter]);
    const handleDeleteTask = useCallback(async (taskId) => { try { const updatedList = await deleteTask(taskId); if (filter === 'all') { setTasks(updatedList); } else { setTasks(updatedList.filter(t => t.status === filter)); } } catch (error) { Alert.alert("Lỗi", `Không thể xóa: ${error.message}`); } }, [filter]);
    // --- Kết thúc logic cập nhật/xóa ---


    // --- Render Item ---
    const renderTaskItem = ({ item }) => ( <TaskItem item={item} theme={theme} onToggleStatus={handleToggleStatus} onDelete={handleDeleteTask} /> );
    // --- Kết thúc Render Item ---

    return (
        <SafeAreaView style={[styles.container, {backgroundColor: theme.colors.background}]}>
            <Appbar.Header elevated mode="small">
                {navigation.canGoBack() && <Appbar.BackAction onPress={() => navigation.goBack()} />}
                <Appbar.Content title="Quản lý Công việc" />
            </Appbar.Header>

            {/* Segmented Buttons để Filter */}
            <SegmentedButtons
                value={filter}
                onValueChange={setFilter}
                style={[styles.filterButtons, {backgroundColor: theme.colors.surfaceVariant}]}
                density="medium"
                buttons={[
                    { value: 'pending', label: 'Đang chờ', icon: 'clock-fast' },
                    { value: 'completed', label: 'Đã xong', icon: 'check-all' },
                    { value: 'all', label: 'Tất cả', icon: 'format-list-bulleted' },
                ]}
            />

            {isLoading ? ( <View style={styles.centered}><ActivityIndicator size="large" color={theme.colors.primary}/></View> ) : (
                <FlatList
                    data={tasks}
                    keyExtractor={(item) => item.id}
                    renderItem={renderTaskItem}
                    ItemSeparatorComponent={() => <Divider style={{backgroundColor: theme.colors.outlineVariant}} />}
                    ListEmptyComponent={
                        !isLoading && !isRefreshing && (
                            <View style={styles.centered}>
                                <Ionicons name={filter === 'pending' ? "file-tray-outline" : "checkmark-done-outline"} size={50} color={theme.colors.onSurfaceDisabled} />
                                <Text style={[styles.emptyText, { color: theme.colors.onSurfaceDisabled }]}>
                                    {filter === 'pending' ? 'Không có việc đang chờ.' : filter === 'completed' ? 'Chưa có việc hoàn thành.' : 'Chưa có công việc nào.'}
                                </Text>
                                {filter !== 'pending' && ( // Gợi ý thêm việc nếu đang ở tab khác pending
                                     <Button mode="text" onPress={() => navigation.navigate('AddTask')} style={{marginTop: 10}}>Thêm công việc mới</Button>
                                )}
                            </View>
                        )
                    }
                    refreshControl={<RefreshControl refreshing={isRefreshing} onRefresh={onRefresh} colors={[theme.colors.primary]} tintColor={theme.colors.primary}/>}
                    contentContainerStyle={tasks.length === 0 ? styles.centeredContent : styles.listPadding}
                    // getItemLayout={getItemLayout} // Có thể bật lại
                />
            )}

            {/* Nút FAB để thêm Task mới */}
            <FAB
                icon="plus"
                style={[styles.fab, { backgroundColor: theme.colors.primary }]}
                onPress={() => navigation.navigate('AddTask')}
                color={theme.colors.onPrimary}
                mode="elevated"
            />
        </SafeAreaView>
    );
}

// --- StyleSheet ---
const styles = StyleSheet.create({
    container: { flex: 1 },
    centered: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 20 },
    centeredContent: { flexGrow: 1, justifyContent: 'center', alignItems: 'center' },
    listPadding: { paddingBottom: 80 }, // Cho FAB
    emptyText: { marginTop: 15, fontSize: 16, textAlign: 'center' },
    fab: { position: 'absolute', margin: 16, right: 0, bottom: 0 },
    filterButtons: { paddingHorizontal: 10, paddingVertical: 8, }, // Bỏ màu nền
    listItem: { paddingLeft: 5, paddingRight: 0 },
    itemTitle: { fontSize: 16, fontWeight: '500' },
    itemDescription: { fontSize: 13, marginTop: 2 },
});
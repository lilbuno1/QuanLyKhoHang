// screens/AddTaskScreen.js (Sửa lỗi điều hướng sau khi Lưu)
import React, { useState } from 'react';
import { View, StyleSheet, Alert, KeyboardAvoidingView, Platform, ScrollView } from 'react-native';
import { Appbar, TextInput, Button, useTheme, ActivityIndicator, Text } from 'react-native-paper';
import { useNavigation } from '@react-navigation/native';
import { addTask } from '../services/storage';

export default function AddTaskScreen() {
    const navigation = useNavigation();
    const theme = useTheme();
    const [title, setTitle] = useState('');
    const [description, setDescription] = useState('');
    const [isSaving, setIsSaving] = useState(false);

    const handleAddTask = async () => {
        console.log("[AddTaskScreen] handleAddTask called."); // Log 1
        const trimmedTitle = title.trim();
        if (!trimmedTitle) {
            console.log("[AddTaskScreen] Validation failed: Title empty."); // Log 2a
            Alert.alert("Thiếu thông tin", "Vui lòng nhập tiêu đề công việc.");
            return;
        }
        console.log("[AddTaskScreen] Validation passed. Title:", trimmedTitle); // Log 2b

        console.log("[AddTaskScreen] Setting isSaving to true."); // Log 3
        setIsSaving(true);

        try {
            const taskData = { title: trimmedTitle, description: description.trim() };
            console.log("[AddTaskScreen] Calling storage.addTask with:", taskData); // Log 4
            const newTask = await addTask(taskData);
            console.log("[AddTaskScreen] storage.addTask successfully returned:", newTask); // Log 5

            // Alert.alert("Thành công", "Đã thêm công việc mới."); // Có thể bỏ

            // --- THAY ĐỔI ĐIỀU HƯỚNG ---
            // Thay vì goBack, điều hướng thẳng về TaskList
            console.log("[AddTaskScreen] Navigating to TaskList screen..."); // Log 6
            navigation.navigate('TaskList'); // <<< Sửa ở đây
            console.log("[AddTaskScreen] Navigation call finished."); // Log 7 (Có thể không thấy nếu unmount nhanh)
            // --- KẾT THÚC THAY ĐỔI ---

        } catch (error) {
            console.error("[AddTaskScreen] Error adding task:", error); // Log 8a
            Alert.alert("Lỗi", `Không thể thêm công việc: ${error.message}`);
            console.log("[AddTaskScreen] Setting isSaving to false due to error."); // Log 8b
            setIsSaving(false);
        }
        // Không cần setIsSaving(false) ở đây nếu navigate thành công
    };

    return (
        <KeyboardAvoidingView
            behavior={Platform.OS === "ios" ? "padding" : "height"}
            style={[styles.container, {backgroundColor: theme.colors.background}]}
        >
            <Appbar.Header elevated mode="center-aligned">
                {navigation.canGoBack() && <Appbar.BackAction onPress={() => navigation.goBack()} disabled={isSaving}/>}
                <Appbar.Content title="Thêm Công Việc Mới" />
                <Button
                    mode="contained"
                    // --- THÊM LOG VÀO onPress NẾU CẦN DEBUG THÊM ---
                    onPress={() => {
                        console.log("[AddTaskScreen] SAVE BUTTON PRESSED!");
                        handleAddTask();
                    }}
                    // onPress={handleAddTask} // << Hoặc dùng trực tiếp nếu log trên không cần nữa
                    disabled={isSaving || !title.trim()}
                    loading={isSaving}
                    style={{ marginRight: 8 }}
                >
                    {isSaving ? '' : 'Lưu'}
                </Button>
            </Appbar.Header>
            <ScrollView
                contentContainerStyle={styles.scrollContent}
                keyboardShouldPersistTaps="handled"
            >
                <TextInput label="Tiêu đề công việc (*)" value={title} onChangeText={setTitle} mode="outlined" style={styles.input} disabled={isSaving} maxLength={150} autoFocus={true} activeOutlineColor={theme.colors.primary} />
                <TextInput label="Mô tả chi tiết (Tùy chọn)" value={description} onChangeText={setDescription} mode="outlined" style={styles.input} multiline numberOfLines={4} disabled={isSaving} maxLength={500} activeOutlineColor={theme.colors.primary} />
            </ScrollView>
        </KeyboardAvoidingView>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, },
    scrollContent: { flexGrow: 1, padding: 20, },
    input: { marginBottom: 20, backgroundColor: 'transparent', },
});
// components/OutOfStockItem.js
import React, { useCallback } from 'react';
import { View, StyleSheet } from 'react-native'; // <<< Import StyleSheet
import { List, Text, useTheme } from 'react-native-paper'; // Import List, Text
import Ionicons from 'react-native-vector-icons/Ionicons';

const OutOfStockItemComponent = ({ item, theme, navigateToDetail }) => {
    // Kiểm tra props cơ bản
    if (!item || !theme || typeof navigateToDetail !== 'function') {
        console.warn("OutOfStockItemComponent received invalid props");
        return null;
    }

    const formattedPrice = item.price || item.price === 0 ? `${Number(item.price).toLocaleString('vi-VN')} VNĐ` : 'Chưa có';
    const quantity = item.quantity ?? 0; // Luôn lấy số lượng

    const onNavigate = useCallback(() => navigateToDetail(item.id), [ navigateToDetail, item.id ]);

    return (
         <List.Item
            title={item.name || 'Chưa tên'}
            description={`ID: ${item.id} | Giá: ${formattedPrice}\nQC: ${item.specification || 'N/A'} | Tồn: ${quantity.toLocaleString('vi-VN')}`} // Hiển thị số lượng
            titleNumberOfLines={2}
            descriptionNumberOfLines={2}
            descriptionStyle={styles.itemDesc} // Style mô tả nhỏ hơn
            left={props => <List.Icon {...props} icon="alert-circle-outline" color={theme.colors.error}/>} // Icon báo hết hàng
            // Hiển thị số lượng bên phải thay vì chữ "Hết hàng" cho rõ ràng
            right={props => (
                <View {...props} style={styles.itemRight}>
                    <Text style={[styles.quantityText, { color: theme.colors.error }]}>
                       {quantity.toLocaleString('vi-VN')}
                    </Text>
                </View>
            )}
            onPress={onNavigate}
            style={[styles.listItem,{backgroundColor:theme.colors.surface}]}
            titleStyle={[styles.itemTitle,{color:theme.colors.onSurface}]}
        />
    );
};

// <<< Sử dụng StyleSheet đã import >>>
const styles = StyleSheet.create({
    listItem:{ paddingLeft: 15, paddingVertical: 10 },
    itemTitle:{ fontSize:16, fontWeight:'500' },
    itemDesc:{ fontSize:12, lineHeight:18, color: theme.colors.onSurfaceVariant }, // Thêm màu theme
    itemRight: {
        justifyContent: 'center',
        alignItems: 'flex-end',
        paddingLeft: 10,
        minWidth: 40, // Đủ chỗ cho số lượng nhỏ
        marginRight: 10, // Thêm margin phải
    },
    quantityText: {
        fontSize: 16,
        fontWeight: 'bold', // Cho số lượng đậm
    },
});

// --- Đảm bảo export đúng tên ---
export const OutOfStockItem = React.memo(OutOfStockItemComponent);
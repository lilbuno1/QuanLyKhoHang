// components/ProductListItem.js
import React, { useCallback } from 'react';
import { View, StyleSheet } from 'react-native'; // <<<< Đảm bảo có StyleSheet
import { List, Checkbox } from 'react-native-paper';
import Ionicons from 'react-native-vector-icons/Ionicons';

const ProductListItemComponent = ({ item, theme, selectedIds, handleSelectItem, navigateToDetail }) => {
    if (!item || !theme || !selectedIds || typeof handleSelectItem !== 'function' || typeof navigateToDetail !== 'function') { console.warn("ProductListItemComponent received invalid props"); return null; }
    const isSelected = selectedIds.has(item.id);
    const formattedPrice = item.price || item.price === 0 ? `${Number(item.price).toLocaleString('vi-VN')} VNĐ` : 'Chưa có';
    const onSelectItem = useCallback(() => handleSelectItem(item.id), [ handleSelectItem, item.id ]);
    const onNavigate = useCallback(() => navigateToDetail(item.id), [ navigateToDetail, item.id ]);

    return (
        <List.Item
            title={item.name || 'Chưa tên'}
            description={`ID: ${item.id || 'N/A'} | Giá: ${formattedPrice}\nQC: ${item.specification || 'N/A'}`}
            titleNumberOfLines={2} descriptionNumberOfLines={2}
            left={(props) => ( <View {...props} style={styles.itemLeftContainer}><Checkbox.Android status={isSelected ? 'checked' : 'unchecked'} onPress={onSelectItem} color={theme.colors.primary} /><Ionicons name={item.isOutOfStock ? 'alert-circle' : 'checkmark-circle'} size={20} color={ item.isOutOfStock ? theme.colors.error : theme.colors.primary } style={styles.stockIcon} /></View> )}
            onPress={onNavigate}
            style={[ styles.listItem, { backgroundColor: theme.colors.surface }, isSelected && { backgroundColor: theme.colors.surfaceVariant }, ]}
            titleStyle={[styles.itemTitle, { color: theme.colors.onSurface }]}
            descriptionStyle={[ styles.itemDesc, { color: theme.colors.onSurfaceVariant }, ]} />
    );
};

const styles = StyleSheet.create({ // <<<< Sử dụng StyleSheet
    listItem: { paddingLeft: 0, paddingVertical: 8, }, itemLeftContainer: { flexDirection: 'row', alignItems: 'center', paddingLeft: 8, paddingRight: 0, marginRight: 8, }, stockIcon: { marginLeft: 10, }, itemTitle: { fontSize: 16, fontWeight: '500', }, itemDesc: { fontSize: 13, lineHeight: 18, },
});

export const ProductListItem = React.memo(ProductListItemComponent);
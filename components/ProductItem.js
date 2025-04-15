// components/ProductItem.js
import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, Image, TouchableOpacity, Platform } from 'react-native';
import { getProducts, saveProducts, logActivity } from '../services/storage';
import { Checkbox, List, useTheme } from 'react-native-paper';
import Ionicons from 'react-native-vector-icons/Ionicons';

// Component này không được dùng trực tiếp trong ProductListScreen nữa
export default function ProductItem({ product, onPress, onSelect, isSelected, onToggleOutOfStock }) {
  const theme = useTheme();
  const [isOutOfStock, setIsOutOfStock] = useState(product.isOutOfStock || false);
  useEffect(() => { setIsOutOfStock(product.isOutOfStock || false); }, [product.isOutOfStock]);
  const formattedPrice = product.price || product.price === 0 ? `${Number(product.price).toLocaleString('vi-VN')} VNĐ` : 'Chưa có';

  // Logic toggle cũ đã được bỏ đi để dùng bulk action
  // const handleDirectToggle = async (value) => { /* ... */ };

  return (
    <List.Item
      title={product.name || 'Chưa có tên'}
      description={`ID: ${product.id} | Giá: ${formattedPrice}\nQC: ${product.specification || 'N/A'}`}
      titleNumberOfLines={2} descriptionNumberOfLines={2}
      left={props => (<View style={{ justifyContent:'center', marginRight: 8 }}>
         <Checkbox.Android {...props} status={isSelected ? 'checked' : 'unchecked'} onPress={() => onSelect && onSelect(product.id)} color={theme.colors.primary}/>
      </View>)}
      right={props => (<View {...props} style={{ justifyContent:'center', marginLeft: 8 }}>
         <Ionicons name={isOutOfStock ? "alert-circle" : "checkmark-circle"} size={24} color={isOutOfStock ? theme.colors.error : theme.colors.primary}/>
      </View>)}
      onPress={onPress}
      style={[styles.listItem, {backgroundColor: theme.colors.surface}, isSelected && { backgroundColor: theme.colors.surfaceVariant || '#e0e0e0' }]}
      titleStyle={[styles.itemTitle, {color: theme.colors.onSurface}]}
      descriptionStyle={[styles.itemDesc, {color: theme.colors.onSurfaceVariant}]}
    />
  );
}
// Styles
const styles = StyleSheet.create({listItem:{},itemTitle:{fontSize:16,fontWeight:'500'},itemDesc:{fontSize:13,lineHeight:18}});
import React from 'react';
import {
  Modal,
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TouchableWithoutFeedback,
  KeyboardAvoidingView,
  Platform,
  ViewStyle,
  StyleProp,
  DimensionValue,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { X, LucideIcon } from 'lucide-react-native';
import { COLORS } from '@/theme/colors';
import { RADIUS } from '@/theme/spacing';

export interface AppModalProps {
  visible: boolean;
  onClose: () => void;
  title?: string;
  icon?: LucideIcon;
  iconColor?: string;
  headerRight?: React.ReactNode;
  children: React.ReactNode;
  footer?: React.ReactNode;
  height?: DimensionValue;
  maxHeight?: DimensionValue;
  dismissOnBackdropPress?: boolean;
  showDragHandle?: boolean;
  showCloseButton?: boolean;
  containerStyle?: StyleProp<ViewStyle>;
  contentStyle?: StyleProp<ViewStyle>;
  footerStyle?: StyleProp<ViewStyle>;
}

export const AppModal: React.FC<AppModalProps> = ({
  visible,
  onClose,
  title,
  icon: IconComponent,
  iconColor = '#00F0FF',
  headerRight,
  children,
  footer,
  height = '85%',
  maxHeight = '92%',
  dismissOnBackdropPress = true,
  showDragHandle = true,
  showCloseButton = true,
  containerStyle,
  contentStyle,
  footerStyle,
}) => {
  const insets = useSafeAreaInsets();
  // Ensure Android 3-button system navigation bar (Back/Home/Recents) never overlays content or buttons
  const bottomSafePadding = Math.max(insets.bottom, Platform.OS === 'android' ? 48 : 20) + 8;

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent
      onRequestClose={onClose}
    >
      <View style={styles.overlay}>
        {/* Backdrop overlay touch listener */}
        <TouchableWithoutFeedback
          onPress={dismissOnBackdropPress ? onClose : undefined}
        >
          <View style={StyleSheet.absoluteFill} />
        </TouchableWithoutFeedback>

        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          style={styles.keyboardAvoid}
          pointerEvents="box-none"
        >
          <View
            style={[
              styles.modalContainer,
              {
                height,
                maxHeight,
                paddingBottom: footer ? 0 : bottomSafePadding,
              },
              containerStyle,
            ]}
          >
            {/* Optional Top Drag Indicator Pill */}
            {showDragHandle && (
              <View style={styles.dragHandleContainer}>
                <View style={styles.dragHandle} />
              </View>
            )}

            {/* Modal Header */}
            {(title || showCloseButton || headerRight) && (
              <View style={styles.header}>
                <View style={styles.headerLeft}>
                  {IconComponent && (
                    <IconComponent size={20} color={iconColor} />
                  )}
                  {title ? (
                    <Text style={styles.title} numberOfLines={1}>
                      {title}
                    </Text>
                  ) : null}
                </View>

                <View style={styles.headerRight}>
                  {headerRight}
                  {showCloseButton && (
                    <TouchableOpacity
                      accessibilityRole="button"
                      accessibilityLabel="Close Modal"
                      style={styles.closeBtn}
                      onPress={onClose}
                      activeOpacity={0.7}
                    >
                      <X size={18} color={COLORS.textSecondary} />
                    </TouchableOpacity>
                  )}
                </View>
              </View>
            )}

            {/* Modal Body Content */}
            <View style={[styles.body, contentStyle]}>{children}</View>

            {/* Modal Footer (Always elevated above Android navigation bar) */}
            {footer && (
              <View
                style={[
                  styles.footerContainer,
                  { paddingBottom: bottomSafePadding },
                  footerStyle,
                ]}
              >
                {footer}
              </View>
            )}
          </View>
        </KeyboardAvoidingView>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.75)',
    justifyContent: 'flex-end',
  },
  keyboardAvoid: {
    justifyContent: 'flex-end',
    width: '100%',
  },
  modalContainer: {
    backgroundColor: '#0F141C',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
    width: '100%',
    overflow: 'hidden',
  },
  dragHandleContainer: {
    alignItems: 'center',
    paddingTop: 10,
    paddingBottom: 4,
  },
  dragHandle: {
    width: 38,
    height: 4,
    borderRadius: RADIUS.round,
    backgroundColor: 'rgba(255, 255, 255, 0.22)',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.07)',
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    flex: 1,
    marginRight: 8,
  },
  title: {
    color: COLORS.textPrimary,
    fontSize: 16,
    fontWeight: '700',
  },
  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  closeBtn: {
    width: 32,
    height: 32,
    borderRadius: RADIUS.round,
    backgroundColor: 'rgba(255, 255, 255, 0.06)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  body: {
    flex: 1,
    paddingHorizontal: 16,
  },
  footerContainer: {
    paddingHorizontal: 16,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255, 255, 255, 0.08)',
    backgroundColor: '#0F141C',
  },
});

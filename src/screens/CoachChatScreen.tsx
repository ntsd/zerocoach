import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  FlatList,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  Keyboard,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useChatStore } from '@/store/useChatStore';
import { useCoachStore } from '@/store/useCoachStore';
import { useModelStore } from '@/store/useModelStore';
import { COLORS, getModeColors } from '@/theme/colors';
import { SPACING, RADIUS } from '@/theme/spacing';
import { TYPOGRAPHY } from '@/theme/typography';
import { ChatBubble } from '@/components/chat/ChatBubble';
import { QuickPromptChips } from '@/components/chat/QuickPromptChips';
import { StreamingIndicator } from '@/components/chat/StreamingIndicator';
import { ZeroCoachLogo } from '@/components/common/ZeroCoachLogo';
import { useTranslation } from '@/i18n';
import {
  Send,
  Square,
  Trash2,
  Cpu,
  Zap,
  Globe,
  AlertTriangle,
  ChevronRight,
  Settings,
} from 'lucide-react-native';
import { llmService } from '@/services/llm/llmService';

interface CoachChatScreenProps {
  onNavigateToWorkout?: () => void;
  onNavigateToProgressions?: () => void;
  onNavigateToNutrition?: () => void;
  onNavigateToSettings?: () => void;
}

export const CoachChatScreen: React.FC<CoachChatScreenProps> = ({
  onNavigateToWorkout,
  onNavigateToProgressions,
  onNavigateToNutrition,
  onNavigateToSettings,
}) => {
  const { t } = useTranslation();
  const [inputText, setInputText] = useState('');
  const [isKeyboardVisible, setIsKeyboardVisible] = useState(false);
  const flatListRef = useRef<FlatList>(null);
  const textInputRef = useRef<TextInput>(null);

  const {
    messages,
    isGenerating,
    streamingMessage,
    sendMessage,
    clearHistory,
    stopGeneration,
  } = useChatStore();

  const {
    provider,
    status,
    downloadProgress,
    currentModel,
    geminiApiKey,
    openAIConfig,
  } = useModelStore();
  const modeColors = getModeColors();

  const isModelReady =
    provider === 'gemini'
      ? Boolean(geminiApiKey && geminiApiKey.trim())
      : provider === 'openai_compatible'
      ? Boolean(openAIConfig?.baseUrl && openAIConfig.baseUrl.trim())
      : status === 'loaded' && (Platform.OS === 'web' || llmService.isNativeReady());

  const getModelDisplayInfo = () => {
    if (provider === 'gemini') {
      const hasKey = Boolean(geminiApiKey && geminiApiKey.trim());
      return {
        name: 'Gemini 3.5 Flash Lite',
        badge: hasKey ? 'CLOUD ACTIVE' : 'API KEY MISSING',
        isReady: hasKey,
        icon: Zap,
        accentColor: '#00F0FF',
      };
    }
    if (provider === 'openai_compatible') {
      const hasUrl = Boolean(openAIConfig?.baseUrl && openAIConfig.baseUrl.trim());
      return {
        name: openAIConfig.modelName || 'OpenAI Compatible',
        badge: hasUrl ? 'REMOTE ACTIVE' : 'URL MISSING',
        isReady: hasUrl,
        icon: Globe,
        accentColor: modeColors.accent,
      };
    }
    // on_device
    const modelName = currentModel?.name || 'ZeroCoach Athletic AI';
    if (status === 'loaded') {
      return {
        name: modelName,
        badge: 'LOADED (METAL/GPU)',
        isReady: true,
        icon: Cpu,
        accentColor: COLORS.success,
      };
    }
    if (status === 'downloading') {
      return {
        name: modelName,
        badge: `DOWNLOADING (${downloadProgress}%)`,
        isReady: false,
        icon: Cpu,
        accentColor: COLORS.warning,
      };
    }
    if (status === 'loading') {
      return {
        name: modelName,
        badge: 'ALLOCATING RAM...',
        isReady: false,
        icon: Cpu,
        accentColor: COLORS.warning,
      };
    }
    if (status === 'ready') {
      return {
        name: modelName,
        badge: 'DOWNLOADED (NOT IN RAM)',
        isReady: false,
        icon: Cpu,
        accentColor: COLORS.warning,
      };
    }
    return {
      name: modelName,
      badge: 'NOT LOADED',
      isReady: false,
      icon: Cpu,
      accentColor: COLORS.danger,
    };
  };

  const modelInfo = getModelDisplayInfo();

  const handleSend = async (textToSend?: string) => {
    if (!isModelReady) {
      onNavigateToSettings?.();
      return;
    }
    const raw = textToSend !== undefined ? textToSend : inputText;
    const text = raw.trim();
    if (!text || isGenerating) return;

    // Immediately clear native input buffer and react state
    textInputRef.current?.clear();
    setInputText('');

    await sendMessage(text);
  };

  const handleTextChange = (text: string) => {
    // If user hit Enter on mobile software keyboard (which inserts \n)
    if (text.includes('\n')) {
      const clean = text.replace(/\r?\n/g, '').trim();
      if (clean) {
        handleSend(clean);
      } else {
        textInputRef.current?.clear();
        setInputText('');
      }
      return;
    }
    setInputText(text);
  };

  const handleKeyPress = (e: any) => {
    if (e.nativeEvent.key === 'Enter' && !e.nativeEvent.shiftKey) {
      if (Platform.OS === 'web') {
        e.preventDefault?.();
      }
      handleSend();
    }
  };

  useEffect(() => {
    const showEvent = Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow';
    const hideEvent = Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide';

    const showSub = Keyboard.addListener(showEvent, () => {
      setIsKeyboardVisible(true);
      setTimeout(() => {
        flatListRef.current?.scrollToEnd({ animated: true });
      }, 100);
    });

    const hideSub = Keyboard.addListener(hideEvent, () => {
      setIsKeyboardVisible(false);
    });

    return () => {
      showSub.remove();
      hideSub.remove();
    };
  }, []);

  useEffect(() => {
    // Scroll to bottom on message updates
    if (flatListRef.current) {
      setTimeout(() => {
        flatListRef.current?.scrollToEnd({ animated: true });
      }, 100);
    }
  }, [messages, streamingMessage]);

  return (
    <SafeAreaView style={styles.safeArea} edges={['top']}>
      <KeyboardAvoidingView
        style={styles.keyboardContainer}
        behavior="padding"
        keyboardVerticalOffset={Platform.OS === 'ios' ? 8 : 0}
      >
        {/* Top Header */}
        <View style={styles.header}>
          <View style={styles.brandContainer}>
            <View style={styles.brandRow}>
              <ZeroCoachLogo size={20} />
              <Text style={styles.brandTitle}>ZEROCOACH</Text>
            </View>
          </View>

          <View style={styles.headerRight}>
            <TouchableOpacity
              onPress={clearHistory}
              style={styles.iconButton}
              activeOpacity={0.7}
            >
              <Trash2 size={16} color={COLORS.textMuted} />
            </TouchableOpacity>
          </View>
        </View>

        {/* Active Model Indicator Pill */}
        <TouchableOpacity
          style={[
            styles.modelStatusBar,
            {
              borderColor: modelInfo.isReady
                ? `${modelInfo.accentColor}35`
                : `${COLORS.warning}45`,
            },
          ]}
          onPress={onNavigateToSettings}
          activeOpacity={0.8}
        >
          <View style={styles.modelStatusLeft}>
            <View
              style={[
                styles.modelStatusDot,
                {
                  backgroundColor: modelInfo.isReady
                    ? COLORS.success
                    : status === 'downloading' || status === 'loading'
                    ? COLORS.warning
                    : COLORS.danger,
                },
              ]}
            />
            <modelInfo.icon size={13} color={modelInfo.accentColor} />
            <Text style={styles.modelStatusName} numberOfLines={1}>
              {modelInfo.name}
            </Text>
          </View>
          <View style={styles.modelStatusRight}>
            <View
              style={[
                styles.modelStatusBadge,
                {
                  backgroundColor: modelInfo.isReady
                    ? `${COLORS.success}18`
                    : `${modelInfo.accentColor}18`,
                  borderColor: modelInfo.isReady
                    ? `${COLORS.success}40`
                    : `${modelInfo.accentColor}40`,
                },
              ]}
            >
              <Text
                style={[
                  styles.modelStatusBadgeText,
                  { color: modelInfo.isReady ? COLORS.success : modelInfo.accentColor },
                ]}
              >
                {modelInfo.badge}
              </Text>
            </View>
            <Settings size={12} color={COLORS.textMuted} />
          </View>
        </TouchableOpacity>

        {/* Automatic Model Download & RAM Context Allocation Banner */}
        {provider === 'on_device' && Platform.OS !== 'web' && status === 'downloading' && (
          <View style={styles.downloadBanner}>
            <View style={styles.downloadBannerHeader}>
              <Text style={styles.downloadBannerTitle}>
                {t.coach.downloadBannerTitle
                  .replace('{name}', currentModel?.name || 'ZeroCoach AI')
                  .replace('{progress}', String(downloadProgress))}
              </Text>
              <Text style={styles.downloadBannerSub}>{t.coach.downloadBannerSub}</Text>
            </View>
            <View style={styles.progressBarTrack}>
              <View
                style={[
                  styles.progressBarFill,
                  {
                    width: `${Math.max(5, downloadProgress)}%`,
                    backgroundColor: modeColors.accent,
                  },
                ]}
              />
            </View>
          </View>
        )}

        {provider === 'on_device' && Platform.OS !== 'web' && status === 'loading' && (
          <View style={styles.loadingBanner}>
            <Text style={[styles.loadingBannerText, { color: modeColors.accent }]}>
              {t.coach.loadingBannerText.replace('{name}', currentModel?.name || 'ZeroCoach AI')}
            </Text>
          </View>
        )}

        {/* Message Stream */}
        <FlatList
          ref={flatListRef}
          data={messages}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => (
            <ChatBubble
              message={item}
              onNavigateToNutrition={onNavigateToNutrition}
              onNavigateToWorkout={onNavigateToWorkout}
            />
          )}
          contentContainerStyle={styles.messageList}
          ListFooterComponent={
            isGenerating && streamingMessage ? (
              <ChatBubble
                message={{
                  id: 'streaming-temp',
                  role: 'assistant',
                  content: streamingMessage,
                  timestamp: Date.now(),
                }}
              />
            ) : null
          }
        />

        {/* Active Streaming Token Indicator */}
        {isGenerating && <StreamingIndicator />}

        {/* Quick Suggestion Chips (hidden when keyboard is open or model is not loaded) */}
        {!isKeyboardVisible && isModelReady && (
          <QuickPromptChips
            disabled={isGenerating || !isModelReady}
            onSelectPrompt={(prompt) => handleSend(prompt)}
          />
        )}

        {/* Model Required Warning Banner (shown when model is not ready to chat) */}
        {!isModelReady && (
          <TouchableOpacity
            style={[
              styles.modelAlertCard,
              {
                borderColor:
                  status === 'downloading' || status === 'loading'
                    ? `${COLORS.warning}50`
                    : `${COLORS.danger}50`,
              },
            ]}
            onPress={onNavigateToSettings}
            activeOpacity={0.8}
          >
            <AlertTriangle
              size={18}
              color={
                status === 'downloading' || status === 'loading'
                  ? COLORS.warning
                  : COLORS.danger
              }
            />
            <View style={styles.modelAlertContent}>
              <Text style={styles.modelAlertTitle}>
                {provider === 'on_device'
                  ? status === 'downloading'
                    ? `Downloading Model (${downloadProgress}%)...`
                    : status === 'loading'
                    ? 'Allocating Model into RAM...'
                    : status === 'ready'
                    ? 'Model Downloaded. Tap to Load into RAM'
                    : 'On-Device Model Not Loaded'
                  : provider === 'gemini'
                  ? 'Google Gemini API Key Required'
                  : 'OpenAI Endpoint Required'}
              </Text>
              <Text style={styles.modelAlertSub}>
                {provider === 'on_device'
                  ? status === 'downloading' || status === 'loading'
                    ? 'Chat will automatically unlock once the model is loaded.'
                    : 'Tap here to download weights or switch to Gemini in Settings.'
                  : 'Tap here to enter your API key in Settings.'}
              </Text>
            </View>
            <ChevronRight size={16} color={COLORS.textMuted} />
          </TouchableOpacity>
        )}

        {/* Input Bar */}
        <View
          style={[
            styles.inputContainer,
            { borderColor: isModelReady ? `${modeColors.accent}30` : `${COLORS.danger}30` },
            isKeyboardVisible && styles.inputContainerKeyboardActive,
          ]}
        >
          <TextInput
            ref={textInputRef}
            style={[
              styles.textInput,
              !isModelReady && styles.textInputDisabled,
            ]}
            onFocus={() => {
              setTimeout(() => {
                flatListRef.current?.scrollToEnd({ animated: true });
              }, 120);
            }}
            placeholder={
              !isModelReady
                ? t.coach.modelNotLoadedPlaceholder
                : t.coach.chatPlaceholder
            }
            placeholderTextColor={COLORS.textMuted}
            value={inputText}
            onChangeText={handleTextChange}
            onKeyPress={handleKeyPress}
            onSubmitEditing={() => {
              if (isModelReady) handleSend();
            }}
            returnKeyType="send"
            blurOnSubmit={false}
            multiline
            editable={!isGenerating && isModelReady}
          />

          {isGenerating ? (
            <TouchableOpacity
              onPress={stopGeneration}
              style={[styles.actionButton, { backgroundColor: COLORS.danger }]}
              activeOpacity={0.8}
            >
              <Square size={16} color="#FFFFFF" fill="#FFFFFF" />
            </TouchableOpacity>
          ) : (
            <TouchableOpacity
              onPress={() => handleSend()}
              disabled={!isModelReady || !inputText.trim()}
              style={[
                styles.actionButton,
                {
                  backgroundColor:
                    isModelReady && inputText.trim()
                      ? modeColors.accent
                      : COLORS.cardSecondary,
                },
              ]}
              activeOpacity={0.8}
            >
              <Send
                size={16}
                color={
                  isModelReady && inputText.trim()
                    ? COLORS.textDark
                    : COLORS.textMuted
                }
              />
            </TouchableOpacity>
          )}
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: COLORS.background,
    overflow: 'hidden',
  },
  keyboardContainer: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.xs + 2,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.borderSubtle,
    marginBottom: SPACING.xs,
  },
  brandContainer: {
    flex: 1,
    marginRight: SPACING.xs,
  },
  brandRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  brandTitle: {
    ...TYPOGRAPHY.h3,
    fontSize: 18,
    fontWeight: '900',
    letterSpacing: 0.5,
    color: COLORS.textPrimary,
  },
  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
  },
  iconButton: {
    padding: 7,
    borderRadius: RADIUS.round,
    backgroundColor: COLORS.cardSecondary,
  },
  messageList: {
    paddingVertical: SPACING.sm,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.cardBackground,
    borderWidth: 1,
    borderRadius: RADIUS.xl,
    paddingHorizontal: SPACING.md,
    paddingVertical: 3,
    marginHorizontal: SPACING.md,
    marginTop: 4,
    marginBottom: SPACING.sm,
    gap: SPACING.sm,
  },
  textInput: {
    flex: 1,
    ...TYPOGRAPHY.body,
    fontSize: 13,
    color: COLORS.textPrimary,
    maxHeight: 90,
    paddingVertical: 6,
  },
  actionButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  inputContainerKeyboardActive: {
    marginBottom: Platform.OS === 'ios' ? 12 : 8,
  },
  downloadBanner: {
    marginHorizontal: SPACING.md,
    marginTop: 4,
    marginBottom: 6,
    padding: SPACING.sm,
    backgroundColor: COLORS.cardSecondary,
    borderRadius: RADIUS.md,
    borderWidth: 1,
    borderColor: `${COLORS.strict.accent}40`,
  },
  downloadBannerHeader: {
    marginBottom: 6,
  },
  downloadBannerTitle: {
    ...TYPOGRAPHY.caption,
    fontSize: 12,
    fontWeight: '700',
    color: COLORS.textPrimary,
  },
  downloadBannerSub: {
    ...TYPOGRAPHY.caption,
    fontSize: 10,
    color: COLORS.textMuted,
    marginTop: 1,
  },
  progressBarTrack: {
    height: 4,
    backgroundColor: `${COLORS.textMuted}30`,
    borderRadius: 2,
    overflow: 'hidden',
  },
  progressBarFill: {
    height: '100%',
    borderRadius: 2,
  },
  loadingBanner: {
    marginHorizontal: SPACING.md,
    marginTop: 4,
    marginBottom: 6,
    paddingVertical: 6,
    paddingHorizontal: SPACING.sm,
    backgroundColor: COLORS.cardSecondary,
    borderRadius: RADIUS.md,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: COLORS.borderSubtle,
  },
  loadingBannerText: {
    ...TYPOGRAPHY.caption,
    fontSize: 11,
    fontWeight: '600',
  },
  modelStatusBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: COLORS.cardSecondary,
    borderWidth: 1,
    borderRadius: RADIUS.md,
    paddingHorizontal: SPACING.md,
    paddingVertical: 7,
    marginHorizontal: SPACING.md,
    marginBottom: SPACING.xs,
  },
  modelStatusLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
    flex: 1,
    marginRight: 8,
  },
  modelStatusDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  modelStatusName: {
    ...TYPOGRAPHY.caption,
    fontSize: 12,
    fontWeight: '700',
    color: COLORS.textPrimary,
    flexShrink: 1,
  },
  modelStatusRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  modelStatusBadge: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: RADIUS.xs,
    borderWidth: 1,
  },
  modelStatusBadgeText: {
    ...TYPOGRAPHY.caption,
    fontSize: 9,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  modelAlertCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.cardBackground,
    borderWidth: 1,
    borderRadius: RADIUS.md,
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm,
    marginHorizontal: SPACING.md,
    marginBottom: SPACING.xs,
    gap: SPACING.sm,
  },
  modelAlertContent: {
    flex: 1,
  },
  modelAlertTitle: {
    ...TYPOGRAPHY.caption,
    fontSize: 12,
    fontWeight: '700',
    color: COLORS.textPrimary,
  },
  modelAlertSub: {
    ...TYPOGRAPHY.caption,
    fontSize: 10,
    color: COLORS.textMuted,
    marginTop: 2,
  },
  textInputDisabled: {
    color: COLORS.textMuted,
    opacity: 0.7,
  },
});

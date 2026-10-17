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
import { ModeSwitch } from '@/components/common/ModeSwitch';
import { TelemetryBanner } from '@/components/chat/TelemetryBanner';
import { ChatBubble } from '@/components/chat/ChatBubble';
import { QuickPromptChips } from '@/components/chat/QuickPromptChips';
import { StreamingIndicator } from '@/components/chat/StreamingIndicator';
import { ZeroCoachLogo } from '@/components/common/ZeroCoachLogo';
import { Send, Square, Trash2 } from 'lucide-react-native';

interface CoachChatScreenProps {
  onNavigateToWorkout?: () => void;
  onNavigateToProgressions?: () => void;
  onNavigateToNutrition?: () => void;
}

export const CoachChatScreen: React.FC<CoachChatScreenProps> = ({
  onNavigateToWorkout,
  onNavigateToProgressions,
  onNavigateToNutrition,
}) => {
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

  const { mode } = useCoachStore();
  const { provider, openAIConfig, status, downloadProgress } = useModelStore();
  const modeColors = getModeColors(mode);

  const handleSend = async (textToSend?: string) => {
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
              <ZeroCoachLogo size={20} mode={mode} />
              <Text style={styles.brandTitle}>ZEROCOACH</Text>
            </View>
            <Text style={styles.brandSub} numberOfLines={1} ellipsizeMode="tail">
              {provider === 'openai_compatible'
                ? `${openAIConfig.modelName || 'LLM'} • OpenAI-Compatible`
                : Platform.OS === 'web'
                ? 'On-Device AI (Web Simulator) • Private'
                : status === 'loaded'
                ? 'Gemma 2 (2B On-Device RAM) • 100% Private'
                : status === 'loading'
                ? 'Loading Gemma 2 into RAM...'
                : status === 'downloading'
                ? `Downloading Gemma 2 (${downloadProgress}%)...`
                : '100% On-Device AI • Private'}
            </Text>
          </View>

          <View style={styles.headerRight}>
            <ModeSwitch />
            <TouchableOpacity
              onPress={clearHistory}
              style={styles.iconButton}
              activeOpacity={0.7}
            >
              <Trash2 size={16} color={COLORS.textMuted} />
            </TouchableOpacity>
          </View>
        </View>

        {/* Live Telemetry Banner */}
        <TelemetryBanner />

        {/* Automatic Model Download & RAM Context Allocation Banner */}
        {provider === 'on_device' && Platform.OS !== 'web' && status === 'downloading' && (
          <View style={styles.downloadBanner}>
            <View style={styles.downloadBannerHeader}>
              <Text style={styles.downloadBannerTitle}>
                Downloading Gemma 2 weights ({downloadProgress}%)
              </Text>
              <Text style={styles.downloadBannerSub}>Auto-loading into RAM upon completion</Text>
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
              ⚡ Allocating Gemma 2 context into device RAM via llama.rn...
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
                  modeAtCreation: mode,
                }}
              />
            ) : null
          }
        />

        {/* Active Streaming Token Indicator */}
        {isGenerating && <StreamingIndicator />}

        {/* Quick Suggestion Chips (hidden when keyboard is open to maximize screen space for chat & input) */}
        {!isKeyboardVisible && (
          <QuickPromptChips
            disabled={isGenerating}
            onSelectPrompt={(prompt) => handleSend(prompt)}
          />
        )}

        {/* Input Bar */}
        <View
          style={[
            styles.inputContainer,
            { borderColor: `${modeColors.accent}30` },
            isKeyboardVisible && styles.inputContainerKeyboardActive,
          ]}
        >
          <TextInput
            ref={textInputRef}
            style={styles.textInput}
            onFocus={() => {
              setTimeout(() => {
                flatListRef.current?.scrollToEnd({ animated: true });
              }, 120);
            }}
            placeholder={
              mode === 'strict'
                ? "Ask coach for macros, sets, or exercise form..."
                : "Ask coach about daily wellness, food, or movement..."
            }
            placeholderTextColor={COLORS.textMuted}
            value={inputText}
            onChangeText={handleTextChange}
            onKeyPress={handleKeyPress}
            onSubmitEditing={() => {
              handleSend();
            }}
            returnKeyType="send"
            blurOnSubmit={false}
            multiline
            editable={!isGenerating}
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
              disabled={!inputText.trim()}
              style={[
                styles.actionButton,
                {
                  backgroundColor: inputText.trim()
                    ? modeColors.accent
                    : COLORS.cardSecondary,
                },
              ]}
              activeOpacity={0.8}
            >
              <Send
                size={16}
                color={inputText.trim() ? COLORS.textDark : COLORS.textMuted}
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
  brandSub: {
    ...TYPOGRAPHY.caption,
    fontSize: 10,
    color: COLORS.textMuted,
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
});

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
import { Send, Square, Trash2, Cpu } from 'lucide-react-native';

interface CoachChatScreenProps {
  onNavigateToWorkout?: () => void;
  onNavigateToProgressions?: () => void;
}

export const CoachChatScreen: React.FC<CoachChatScreenProps> = () => {
  const [inputText, setInputText] = useState('');
  const flatListRef = useRef<FlatList>(null);

  const {
    messages,
    isGenerating,
    streamingMessage,
    sendMessage,
    clearHistory,
    stopGeneration,
  } = useChatStore();

  const { mode } = useCoachStore();
  const { provider, openAIConfig } = useModelStore();
  const modeColors = getModeColors(mode);

  const handleSend = async (textToSend?: string) => {
    const text = textToSend || inputText;
    if (!text.trim() || isGenerating) return;
    setInputText('');
    await sendMessage(text);
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
    // Scroll to bottom on message updates
    if (flatListRef.current) {
      setTimeout(() => {
        flatListRef.current?.scrollToEnd({ animated: true });
      }, 100);
    }
  }, [messages, streamingMessage]);

  return (
    <SafeAreaView style={styles.safeArea}>
      <KeyboardAvoidingView
        style={styles.keyboardContainer}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        {/* Top Header */}
        <View style={styles.header}>
          <View>
            <View style={styles.brandRow}>
              <Cpu size={18} color={modeColors.accent} />
              <Text style={styles.brandTitle}>ZEROCOACH</Text>
            </View>
            <Text style={styles.brandSub}>
              {provider === 'openai_compatible'
                ? `${openAIConfig.modelName || 'LLM'} • OpenAI-Compatible`
                : provider === 'simulator'
                ? 'Dev Simulator • Local'
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

        {/* Message Stream */}
        <FlatList
          ref={flatListRef}
          data={messages}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => <ChatBubble message={item} />}
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

        {/* Quick Suggestion Chips */}
        <QuickPromptChips
          disabled={isGenerating}
          onSelectPrompt={(prompt) => handleSend(prompt)}
        />

        {/* Input Bar */}
        <View style={[styles.inputContainer, { borderColor: `${modeColors.accent}30` }]}>
          <TextInput
            style={styles.textInput}
            placeholder={
              mode === 'strict'
                ? "Ask coach for macros, sets, or L-sit form..."
                : "Ask coach about daily wellness, food, or movement..."
            }
            placeholderTextColor={COLORS.textMuted}
            value={inputText}
            onChangeText={setInputText}
            onKeyPress={handleKeyPress}
            onSubmitEditing={() => {
              if (Platform.OS !== 'web') {
                handleSend();
              }
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
  },
  keyboardContainer: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: SPACING.lg,
    paddingVertical: SPACING.sm,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.borderSubtle,
    marginBottom: SPACING.xs,
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
    paddingVertical: SPACING.xs,
    marginHorizontal: SPACING.lg,
    marginVertical: SPACING.sm,
    gap: SPACING.sm,
  },
  textInput: {
    flex: 1,
    ...TYPOGRAPHY.body,
    fontSize: 14,
    color: COLORS.textPrimary,
    maxHeight: 90,
    paddingVertical: 8,
  },
  actionButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
});

import React, { useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  Modal,
  TextInput,
  Platform,
  Linking,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useModelStore } from '@/store/useModelStore';
import { useCoachStore } from '@/store/useCoachStore';
import { llmService } from '@/services/llm/llmService';
import { updateService } from '@/services/updates/updateService';
import { COLORS, getModeColors } from '@/theme/colors';
import { SPACING, RADIUS } from '@/theme/spacing';
import { TYPOGRAPHY } from '@/theme/typography';
import { GlassCard } from '@/components/common/GlassCard';
import {
  Cpu,
  Download,
  HardDrive,
  Zap,
  CheckCircle2,
  RefreshCw,
  Terminal,
  Trash2,
  ShieldCheck,
  AlertTriangle,
  RotateCcw,
  Globe,
  Server,
  Key,
  Sparkles,
  Eye,
  EyeOff,
  Settings,
  Database,
  User,
  Cloud,
} from 'lucide-react-native';
import {
  clearAllUserData,
  clearChatHistoryOnly,
  clearBiometricsAndProgressionsOnly,
} from '@/services/storage/userDataService';
import { useTranslation } from '@/i18n';
import { getDeviceMemoryInfo } from '@/services/device/deviceMemory';

const OPENAI_COMPATIBLE_PRESETS = [
  { label: 'OpenAI (GPT-4o-mini)', url: 'https://api.openai.com/v1', model: 'gpt-4o-mini' },
  { label: 'Ollama (Llama 3.2)', url: 'http://localhost:11434/v1', model: 'llama3.2' },
  { label: 'Groq (Llama 3.3)', url: 'https://api.groq.com/openai/v1', model: 'llama-3.3-70b-versatile' },
  { label: 'DeepSeek (R1)', url: 'https://api.deepseek.com/v1', model: 'deepseek-reasoner' },
];

export const ModelManagerScreen: React.FC = () => {
  const {
    currentModel,
    availableModels,
    status,
    downloadProgress,
    isMmprojDownloading,
    mmprojDownloadProgress,
    isMmprojDownloaded,
    downloadMmproj,
    provider,
    openAIConfig,
    geminiApiKey,
    setGeminiApiKey,
    selectModel,
    downloadModel,
    loadModel,
    unloadModel,
    setProvider,
    updateOpenAIConfig,
    testOpenAIConnection,
    testGeminiConnection,
  } = useModelStore();

  const { mode, userProfile, updateProfile, language, setLanguage } = useCoachStore();
  const { t } = useTranslation();
  const memoryInfo = getDeviceMemoryInfo();
  const modeColors = getModeColors(mode);
  const [otaStatus, setOtaStatus] = useState<string | null>(null);
  const [checkingOta, setCheckingOta] = useState(false);
  const [otaCanReload, setOtaCanReload] = useState(false);
  const otaMetadata = updateService.getUpdateMetadata();
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [isWiping, setIsWiping] = useState(false);
  const [actionNotice, setActionNotice] = useState<string | null>(null);
  const [testingConnection, setTestingConnection] = useState(false);
  const [testResult, setTestResult] = useState<{
    success: boolean;
    message: string;
    latencyMs?: number;
  } | null>(null);
  const [showApiKey, setShowApiKey] = useState(false);
  const [editingMetrics, setEditingMetrics] = useState(false);
  const [weightInput, setWeightInput] = useState(userProfile.weightKg > 0 ? userProfile.weightKg.toString() : '');
  const [heightInput, setHeightInput] = useState(userProfile.heightCm > 0 ? userProfile.heightCm.toString() : '');

  const [remoteSubTab, setRemoteSubTab] = useState<'gemini' | 'openai_compatible'>(() => {
    return provider === 'gemini' ? 'gemini' : 'openai_compatible';
  });

  React.useEffect(() => {
    if (provider === 'gemini' || provider === 'openai_compatible') {
      setRemoteSubTab(provider);
    }
  }, [provider]);

  const handleSelectRemoteSubTab = (subTab: 'gemini' | 'openai_compatible') => {
    setRemoteSubTab(subTab);
    setTestResult(null);
    setProvider(subTab);
  };

  const handleSelectMainProvider = (target: 'on_device' | 'remote') => {
    setTestResult(null);
    if (target === 'on_device') {
      setProvider('on_device');
    } else {
      setProvider(remoteSubTab);
    }
  };

  const handleSaveMetrics = () => {
    const w = parseFloat(weightInput);
    const h = parseFloat(heightInput);
    if (!isNaN(w) && w > 0 && !isNaN(h) && h > 0) {
      updateProfile({ weightKg: w, heightCm: h });
      setEditingMetrics(false);
      setActionNotice(t.settings.actionNoticeMetrics);
      setTimeout(() => setActionNotice(null), 3000);
    }
  };

  const handleTestConnection = async () => {
    setTestingConnection(true);
    setTestResult(null);
    const result = await testOpenAIConnection();
    setTestResult(result);
    setTestingConnection(false);
  };

  const handleTestGeminiConnection = async () => {
    setTestingConnection(true);
    setTestResult(null);
    const result = await testGeminiConnection();
    setTestResult(result);
    setTestingConnection(false);
  };

  const handleClearChat = async () => {
    await clearChatHistoryOnly();
    setActionNotice(t.settings.actionNoticeChat);
    setTimeout(() => setActionNotice(null), 3500);
  };

  const handleClearBiometrics = async () => {
    await clearBiometricsAndProgressionsOnly();
    setActionNotice(t.settings.actionNoticeBio);
    setTimeout(() => setActionNotice(null), 3500);
  };

  const handleConfirmClearAll = async () => {
    setIsWiping(true);
    await clearAllUserData();
    setIsWiping(false);
    setShowConfirmModal(false);
  };

  const handleCheckOTA = async () => {
    setCheckingOta(true);
    setOtaStatus(null);
    setOtaCanReload(false);
    try {
      const result = await updateService.checkForUpdate();
      setOtaStatus(result.statusMessage);
      if (result.canReload) {
        setOtaCanReload(true);
      }
    } catch (e: any) {
      setOtaStatus('Failed to check for updates: ' + (e?.message || 'Network error'));
    } finally {
      setCheckingOta(false);
    }
  };

  const handleApplyOTA = async () => {
    await updateService.applyUpdate();
  };

  return (
    <SafeAreaView style={styles.safeArea} edges={['top']}>
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Header */}
        <View style={styles.header}>
          <View>
            <View style={styles.titleRow}>
              <Settings size={20} color={modeColors.accent} />
              <Text style={styles.title}>{t.settings.headerTitle}</Text>
            </View>
            <Text style={styles.subtitle}>
              {t.settings.subtitle}
            </Text>
          </View>
        </View>

        {/* App Language Card */}
        <GlassCard style={styles.card}>
          <View style={styles.cardHeader}>
            <Globe size={16} color={modeColors.accent} />
            <Text style={styles.cardTitle}>{t.settings.languageSection}</Text>
          </View>
          <Text style={styles.otaDesc}>
            {t.settings.languageDesc}
          </Text>

          <View style={styles.providerTabs}>
            <TouchableOpacity
              onPress={() => setLanguage('en')}
              style={[
                styles.providerTab,
                language === 'en' && {
                  borderColor: modeColors.accent,
                  backgroundColor: `${modeColors.accent}15`,
                },
              ]}
              activeOpacity={0.8}
            >
              <Text
                style={[
                  styles.providerTabText,
                  language === 'en' && { color: modeColors.accent, fontWeight: '700' },
                ]}
              >
                🇺🇸 English (US)
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              onPress={() => setLanguage('th')}
              style={[
                styles.providerTab,
                language === 'th' && {
                  borderColor: modeColors.accent,
                  backgroundColor: `${modeColors.accent}15`,
                },
              ]}
              activeOpacity={0.8}
            >
              <Text
                style={[
                  styles.providerTabText,
                  language === 'th' && { color: modeColors.accent, fontWeight: '700' },
                ]}
              >
                🇹🇭 ภาษาไทย (Thai)
              </Text>
            </TouchableOpacity>
          </View>
        </GlassCard>

        {/* Inference Provider Selector Card */}
        <GlassCard style={styles.card}>
          <View style={styles.cardHeader}>
            <Sparkles size={16} color={modeColors.accent} />
            <Text style={styles.cardTitle}>{t.settings.providerTitle}</Text>
          </View>
          <Text style={styles.otaDesc}>
            {t.settings.providerDesc}
          </Text>

          {/* Main Provider Tabs: On-Device vs Remote */}
          <View style={styles.providerTabs}>
            <TouchableOpacity
              onPress={() => handleSelectMainProvider('on_device')}
              style={[
                styles.providerTab,
                provider === 'on_device' && {
                  borderColor: modeColors.accent,
                  backgroundColor: `${modeColors.accent}15`,
                },
              ]}
              activeOpacity={0.8}
            >
              <Cpu size={14} color={provider === 'on_device' ? modeColors.accent : COLORS.textMuted} />
              <Text
                style={[
                  styles.providerTabText,
                  provider === 'on_device' && { color: modeColors.accent, fontWeight: '700' },
                ]}
              >
                {t.settings.onDeviceProvider}
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              onPress={() => handleSelectMainProvider('remote')}
              style={[
                styles.providerTab,
                provider !== 'on_device' && {
                  borderColor: modeColors.accent,
                  backgroundColor: `${modeColors.accent}15`,
                },
              ]}
              activeOpacity={0.8}
            >
              <Cloud size={14} color={provider !== 'on_device' ? modeColors.accent : COLORS.textMuted} />
              <Text
                style={[
                  styles.providerTabText,
                  provider !== 'on_device' && { color: modeColors.accent, fontWeight: '700' },
                ]}
              >
                {t.settings.remoteProvider}
              </Text>
            </TouchableOpacity>
          </View>

          {/* Active Provider Description & Configuration */}
          {provider === 'on_device' && (
            <View style={styles.onDeviceSettingsContainer}>
              {/* Phone Memory & Auto Allocation Banner */}
              <View style={styles.memoryStatusBox}>
                <View style={styles.memoryStatusHeader}>
                  <HardDrive size={13} color={modeColors.accent} />
                  <Text style={styles.memoryStatusTitle}>
                    {t.settings.memoryDetected}{' '}
                    {memoryInfo.totalMemoryGb
                      ? `${memoryInfo.totalMemoryGb} GB RAM`
                      : Platform.OS === 'web'
                      ? 'Web Environment'
                      : 'Physical Device'}
                  </Text>
                </View>
                <Text style={styles.memoryStatusDesc}>
                  {memoryInfo.isHighMemory
                    ? t.settings.memoryHighNotice
                    : t.settings.memoryLowNotice}
                </Text>
              </View>

              <View style={styles.providerNoteBox}>
                <Cpu size={14} color={modeColors.accent} />
                <Text style={styles.providerNoteText}>
                  {Platform.OS === 'web'
                    ? t.settings.webSimActive
                    : t.settings.mobileGgufActive}
                </Text>
              </View>

              {/* Rectangular Model Selector Cards */}
              <View style={{ marginBottom: SPACING.md }}>
                <Text style={styles.fieldSectionLabel}>{t.settings.modelCatalogTitle}</Text>
                <View style={styles.modelCardGrid}>
                  {(availableModels || []).map((m) => {
                    const isSelected = currentModel.id === m.id;
                    const isQwenVL = m.id.includes('vl');
                    return (
                      <TouchableOpacity
                        key={m.id}
                        onPress={() => selectModel(m)}
                        style={[
                          styles.modelRectangleCard,
                          isSelected && {
                            borderColor: modeColors.accent,
                            backgroundColor: `${modeColors.accent}14`,
                          },
                        ]}
                        activeOpacity={0.8}
                      >
                        <View style={styles.modelRectangleTop}>
                          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 7, flex: 1, minWidth: 0 }}>
                            <Cpu size={14} color={isSelected ? modeColors.accent : COLORS.textMuted} />
                            <Text
                              style={[
                                styles.modelRectangleTitle,
                                isSelected && { color: modeColors.accent, fontWeight: '700' },
                              ]}
                              numberOfLines={1}
                            >
                              {m.name.split(' (')[0]}
                            </Text>
                          </View>
                          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                            {m.isFineTuned ? (
                              <View style={[styles.modelTag, { backgroundColor: `${COLORS.warning}22` }]}>
                                <Text style={[styles.modelTagText, { color: COLORS.warning }]}>
                                  {t.settings.experimentalBadge}
                                </Text>
                              </View>
                            ) : isQwenVL ? (
                              <View style={[styles.modelTag, { backgroundColor: `${modeColors.accent}22` }]}>
                                <Text style={[styles.modelTagText, { color: modeColors.accent }]}>
                                  {t.settings.recommendedBadge} {t.settings.defaultSuffix}
                                </Text>
                              </View>
                            ) : (
                              <View style={[styles.modelTag, { backgroundColor: 'rgba(255, 255, 255, 0.08)' }]}>
                                <Text style={[styles.modelTagText, { color: COLORS.textMuted }]}>
                                  {t.settings.baseBadge}
                                </Text>
                              </View>
                            )}
                            {isSelected && <CheckCircle2 size={14} color={modeColors.accent} />}
                          </View>
                        </View>
                        <View style={styles.modelRectangleBottom}>
                          <Text style={styles.modelRectangleMeta} numberOfLines={1}>
                            {m.sizeFormatted} • {m.quantization} • {m.isFineTuned ? t.settings.fineTunedWeights : isQwenVL ? 'Vision Multimodal' : t.settings.baseInstructWeights}
                          </Text>
                        </View>
                      </TouchableOpacity>
                    );
                  })}
                </View>
              </View>

              {/* Active On-Device Model Controls */}
              <View style={styles.modelHeader}>
                <View style={{ flex: 1, paddingRight: SPACING.sm }}>
                  <Text style={styles.modelName}>{currentModel.name}</Text>
                  <Text style={styles.quantBadge}>
                    {t.settings.quantization} {currentModel.quantization} ({t.settings.lowMemory})
                  </Text>
                </View>
                <View style={styles.statusBadge}>
                  <View
                    style={[
                      styles.statusDot,
                      {
                        backgroundColor:
                          status === 'loaded' || status === 'ready'
                            ? COLORS.success
                            : COLORS.warning,
                      },
                    ]}
                  />
                  <Text style={styles.statusText}>{status.toUpperCase()}</Text>
                </View>
              </View>

              <View style={styles.specsGrid}>
                <View style={styles.specItem}>
                  <HardDrive size={13} color={COLORS.textSecondary} />
                  <Text style={styles.specLabel}>{t.settings.onDisk}</Text>
                  <Text style={styles.specValue}>{currentModel.sizeFormatted}</Text>
                </View>
                <View style={styles.specItem}>
                  <Terminal size={13} color={COLORS.textSecondary} />
                  <Text style={styles.specLabel}>{t.settings.context}</Text>
                  <Text style={styles.specValue}>{currentModel.contextLength} {t.settings.tokens}</Text>
                </View>
              </View>

              {/* Download Progress */}
              {status === 'downloading' && (
                <View style={styles.downloadBox}>
                  <View style={styles.progressHeader}>
                    <Text style={styles.downloadingText}>
                      {t.settings.streamingWeights}
                    </Text>
                    <Text style={styles.downloadPercent}>{downloadProgress}%</Text>
                  </View>
                  <View style={styles.progressBarBg}>
                    <View
                      style={[
                        styles.progressBarFill,
                        {
                          width: `${downloadProgress}%`,
                          backgroundColor: modeColors.accent,
                        },
                      ]}
                    />
                  </View>
                </View>
              )}

              {/* Action Buttons */}
              <View style={styles.actionsRow}>
                {status !== 'downloading' && (
                  <TouchableOpacity
                    onPress={() => downloadModel()}
                    style={[
                      styles.btn,
                      { borderColor: `${modeColors.accent}40` },
                    ]}
                    activeOpacity={0.8}
                  >
                    <Download size={15} color={modeColors.accent} />
                    <Text style={[styles.btnText, { color: modeColors.accent }]}>
                      {status === 'ready' || status === 'loaded'
                        ? t.settings.reverifyWeights
                        : t.settings.downloadModel}
                    </Text>
                  </TouchableOpacity>
                )}

                {status === 'loaded' ? (
                  <TouchableOpacity
                    onPress={() => unloadModel()}
                    style={[styles.btn, styles.btnDanger]}
                    activeOpacity={0.8}
                  >
                    <Text style={styles.btnDangerText}>{t.settings.unloadModel}</Text>
                  </TouchableOpacity>
                ) : (
                  <TouchableOpacity
                    onPress={() => loadModel()}
                    style={[
                      styles.btn,
                      { backgroundColor: modeColors.accent, borderColor: modeColors.accent },
                    ]}
                    activeOpacity={0.8}
                  >
                    <Zap size={15} color={COLORS.textDark} />
                    <Text style={[styles.btnText, { color: COLORS.textDark }]}>
                      {t.settings.loadContext}
                    </Text>
                  </TouchableOpacity>
                )}
              </View>

              {/* Vision Projector Section (for models that support offline camera multimodal) */}
              {currentModel.mmprojDownloadUrl && (
                <View style={styles.projectorCard}>
                  <View style={styles.projectorHeader}>
                    <Eye size={14} color={modeColors.accent} />
                    <Text style={styles.projectorTitle}>Vision Projector (Offline Camera)</Text>
                    {isMmprojDownloaded && llmService.isMultimodalReady() ? (
                      <View style={styles.projectorActiveBadge}>
                        <CheckCircle2 size={11} color="#00F0FF" />
                        <Text style={styles.projectorActiveBadgeText}>ACTIVE IN RAM</Text>
                      </View>
                    ) : isMmprojDownloaded ? (
                      <View style={[styles.projectorActiveBadge, { borderColor: '#FFB800' }]}>
                        <Text style={[styles.projectorActiveBadgeText, { color: '#FFB800' }]}>DOWNLOADED</Text>
                      </View>
                    ) : null}
                  </View>
                  <Text style={styles.projectorDesc}>
                    Enables 100% offline food plate recognition directly from your device camera using Qwen 3 VL ({currentModel.mmprojSizeFormatted || '445 MB'}).
                  </Text>
                  {isMmprojDownloading ? (
                    <View style={styles.downloadBox}>
                      <View style={styles.progressHeader}>
                        <Text style={styles.downloadingText}>Downloading Projector...</Text>
                        <Text style={styles.downloadPercent}>{mmprojDownloadProgress}%</Text>
                      </View>
                      <View style={styles.progressBarBg}>
                        <View
                          style={[
                            styles.progressBarFill,
                            {
                              width: `${mmprojDownloadProgress}%`,
                              backgroundColor: modeColors.accent,
                            },
                          ]}
                        />
                      </View>
                    </View>
                  ) : (
                    <View style={{ gap: 8, marginTop: 10 }}>
                      {isMmprojDownloaded && !llmService.isMultimodalReady() && (
                        <TouchableOpacity
                          onPress={() => loadModel()}
                          style={[
                            styles.btn,
                            { backgroundColor: modeColors.accent, borderColor: modeColors.accent },
                          ]}
                          activeOpacity={0.8}
                        >
                          <Zap size={14} color={COLORS.textDark} />
                          <Text style={[styles.btnText, { color: COLORS.textDark }]}>
                            ACTIVATE OFFLINE VISION (LOAD CONTEXT)
                          </Text>
                        </TouchableOpacity>
                      )}
                      <TouchableOpacity
                        onPress={() => downloadMmproj()}
                        style={[
                          styles.btn,
                          { borderColor: `${modeColors.accent}40` },
                        ]}
                        activeOpacity={0.8}
                      >
                        <Download size={14} color={modeColors.accent} />
                        <Text style={[styles.btnText, { color: modeColors.accent }]}>
                          {isMmprojDownloaded
                            ? 'RE-VERIFY VISION PROJECTOR'
                            : `DOWNLOAD VISION PROJECTOR (${currentModel.mmprojSizeFormatted || '445 MB'})`}
                        </Text>
                      </TouchableOpacity>
                    </View>
                  )}
                </View>
              )}
            </View>
          )}

          {/* Remote / Cloud Provider Settings with Sub-selections */}
          {provider !== 'on_device' && (
            <View style={styles.remoteSettingsWrapper}>
              {/* Sub-selection Tabs: Gemini vs OpenAI / Ollama */}
              <View style={styles.subTabsContainer}>
                <TouchableOpacity
                  onPress={() => handleSelectRemoteSubTab('gemini')}
                  style={[
                    styles.subTab,
                    remoteSubTab === 'gemini' && {
                      backgroundColor: `${modeColors.accent}20`,
                      borderColor: modeColors.accent,
                    },
                  ]}
                  activeOpacity={0.8}
                >
                  <Zap size={13} color={remoteSubTab === 'gemini' ? modeColors.accent : COLORS.textMuted} />
                  <Text
                    numberOfLines={1}
                    style={[
                      styles.subTabText,
                      remoteSubTab === 'gemini' && { color: modeColors.accent, fontWeight: '700' },
                    ]}
                  >
                    {t.settings.remoteSubGemini}
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  onPress={() => handleSelectRemoteSubTab('openai_compatible')}
                  style={[
                    styles.subTab,
                    remoteSubTab === 'openai_compatible' && {
                      backgroundColor: `${modeColors.accent}20`,
                      borderColor: modeColors.accent,
                    },
                  ]}
                  activeOpacity={0.8}
                >
                  <Globe size={13} color={remoteSubTab === 'openai_compatible' ? modeColors.accent : COLORS.textMuted} />
                  <Text
                    numberOfLines={1}
                    style={[
                      styles.subTabText,
                      remoteSubTab === 'openai_compatible' && { color: modeColors.accent, fontWeight: '700' },
                    ]}
                  >
                    {t.settings.remoteSubOpenAI}
                  </Text>
                </TouchableOpacity>
              </View>

              {/* Sub-Selection 1: Google Gemini */}
              {remoteSubTab === 'gemini' && (
                <View style={styles.openAISettingsContainer}>
                  <View style={styles.providerNoteBox}>
                    <Zap size={16} color={modeColors.accent} />
                    <Text style={styles.providerNoteText}>
                      {t.settings.geminiDesc}
                    </Text>
                  </View>

                  <Text style={styles.fieldSectionLabel}>{t.settings.geminiKeyLabel}</Text>
                  <View style={styles.inputRow}>
                    <Key size={14} color={COLORS.textMuted} />
                    <TextInput
                      value={geminiApiKey}
                      onChangeText={(val) => {
                        setGeminiApiKey(val);
                        setTestResult(null);
                      }}
                      placeholder={t.settings.geminiKeyPlaceholder}
                      placeholderTextColor={COLORS.textMuted}
                      style={styles.textInput}
                      secureTextEntry={!showApiKey}
                      autoCapitalize="none"
                      autoCorrect={false}
                    />
                    <TouchableOpacity
                      onPress={() => setShowApiKey(!showApiKey)}
                      style={styles.eyeBtn}
                      activeOpacity={0.7}
                    >
                      {showApiKey ? (
                        <EyeOff size={14} color={COLORS.textMuted} />
                      ) : (
                        <Eye size={14} color={COLORS.textMuted} />
                      )}
                    </TouchableOpacity>
                  </View>

                  <TouchableOpacity
                    style={{ marginTop: 8 }}
                    onPress={() => Linking.openURL('https://aistudio.google.com/app/apikey')}
                    activeOpacity={0.7}
                  >
                    <Text style={{ color: modeColors.accent, fontSize: 12, fontWeight: '700' }}>
                      {t.settings.getGeminiKeyLink}
                    </Text>
                  </TouchableOpacity>

                  {/* Test Gemini Connection Button */}
                  <TouchableOpacity
                    onPress={handleTestGeminiConnection}
                    disabled={testingConnection}
                    style={[
                      styles.testConnBtn,
                      { borderColor: modeColors.accent, marginTop: SPACING.md },
                    ]}
                    activeOpacity={0.8}
                  >
                    {testingConnection ? (
                      <ActivityIndicator size="small" color={modeColors.accent} />
                    ) : (
                      <RefreshCw size={14} color={modeColors.accent} />
                    )}
                    <Text style={[styles.testConnBtnText, { color: modeColors.accent }]}>
                      {testingConnection ? t.settings.testingConnection : t.settings.testConnection}
                    </Text>
                  </TouchableOpacity>

                  {testResult && (
                    <View
                      style={[
                        styles.testResultBox,
                        testResult.success ? styles.testResultSuccess : styles.testResultError,
                      ]}
                    >
                      {testResult.success ? (
                        <CheckCircle2 size={14} color={COLORS.success} />
                      ) : (
                        <AlertTriangle size={14} color={COLORS.danger} />
                      )}
                      <Text
                        style={[
                          styles.testResultText,
                          { color: testResult.success ? COLORS.success : COLORS.danger },
                        ]}
                      >
                        {testResult.message}
                      </Text>
                    </View>
                  )}
                </View>
              )}

              {/* Sub-Selection 2: OpenAI / Ollama / Remote */}
              {remoteSubTab === 'openai_compatible' && (
                <View style={styles.openAISettingsContainer}>
                  <View style={styles.providerNoteBox}>
                    <Globe size={16} color={modeColors.accent} />
                    <Text style={styles.providerNoteText}>
                      {t.settings.openaiCompatibleDesc}
                    </Text>
                  </View>

                  <Text style={styles.fieldSectionLabel}>{t.settings.quickPresets}</Text>
                  <View style={styles.presetsRow}>
                    {OPENAI_COMPATIBLE_PRESETS.map((preset) => {
                      const isActive =
                        openAIConfig.baseUrl === preset.url &&
                        openAIConfig.modelName === preset.model;
                      return (
                        <TouchableOpacity
                          key={preset.label}
                          onPress={() => {
                            updateOpenAIConfig({
                              baseUrl: preset.url,
                              modelName: preset.model,
                            });
                            setTestResult(null);
                          }}
                          style={[
                            styles.presetChip,
                            isActive && {
                              borderColor: modeColors.accent,
                              backgroundColor: `${modeColors.accent}20`,
                            },
                          ]}
                          activeOpacity={0.8}
                        >
                          <Text
                            style={[
                              styles.presetChipText,
                              isActive && {
                                color: modeColors.accent,
                                fontWeight: '700',
                              },
                            ]}
                          >
                            {preset.label}
                          </Text>
                        </TouchableOpacity>
                      );
                    })}
                  </View>

                  <Text style={styles.fieldSectionLabel}>{t.settings.baseApiUrl}</Text>
                  <View style={styles.inputRow}>
                    <Server size={14} color={COLORS.textMuted} />
                    <TextInput
                      value={openAIConfig.baseUrl}
                      onChangeText={(val) => {
                        updateOpenAIConfig({ baseUrl: val });
                        setTestResult(null);
                      }}
                      placeholder="e.g. https://api.openai.com/v1 or http://localhost:11434/v1"
                      placeholderTextColor={COLORS.textMuted}
                      style={styles.textInput}
                      autoCapitalize="none"
                      autoCorrect={false}
                    />
                  </View>

                  <Text style={styles.fieldSectionLabel}>{t.settings.modelName}</Text>
                  <View style={styles.inputRow}>
                    <Cpu size={14} color={COLORS.textMuted} />
                    <TextInput
                      value={openAIConfig.modelName}
                      onChangeText={(val) => {
                        updateOpenAIConfig({ modelName: val });
                        setTestResult(null);
                      }}
                      placeholder="e.g. gpt-4o-mini, llama3.2, deepseek-reasoner"
                      placeholderTextColor={COLORS.textMuted}
                      style={styles.textInput}
                      autoCapitalize="none"
                      autoCorrect={false}
                    />
                  </View>

                  <Text style={styles.fieldSectionLabel}>{t.settings.apiKeyOptional}</Text>
                  <View style={styles.inputRow}>
                    <Key size={14} color={COLORS.textMuted} />
                    <TextInput
                      value={openAIConfig.apiKey}
                      onChangeText={(val) => {
                        updateOpenAIConfig({ apiKey: val });
                        setTestResult(null);
                      }}
                      placeholder={t.settings.apiKeyPlaceholder}
                      placeholderTextColor={COLORS.textMuted}
                      style={styles.textInput}
                      secureTextEntry={!showApiKey}
                      autoCapitalize="none"
                      autoCorrect={false}
                    />
                    <TouchableOpacity
                      onPress={() => setShowApiKey(!showApiKey)}
                      style={styles.eyeBtn}
                      activeOpacity={0.7}
                    >
                      {showApiKey ? (
                        <EyeOff size={14} color={COLORS.textMuted} />
                      ) : (
                        <Eye size={14} color={COLORS.textMuted} />
                      )}
                    </TouchableOpacity>
                  </View>

                  {/* Test Connection Button */}
                  <TouchableOpacity
                    onPress={handleTestConnection}
                    disabled={testingConnection}
                    style={[
                      styles.testConnBtn,
                      { borderColor: modeColors.accent, marginTop: SPACING.md },
                    ]}
                    activeOpacity={0.8}
                  >
                    {testingConnection ? (
                      <ActivityIndicator size="small" color={modeColors.accent} />
                    ) : (
                      <RefreshCw size={14} color={modeColors.accent} />
                    )}
                    <Text style={[styles.testConnBtnText, { color: modeColors.accent }]}>
                      {testingConnection ? t.settings.testingConnection : t.settings.testConnection}
                    </Text>
                  </TouchableOpacity>

                  {testResult && (
                    <View
                      style={[
                        styles.testResultBox,
                        testResult.success ? styles.testResultSuccess : styles.testResultError,
                      ]}
                    >
                      {testResult.success ? (
                        <CheckCircle2 size={14} color={COLORS.success} />
                      ) : (
                        <AlertTriangle size={14} color={COLORS.danger} />
                      )}
                      <Text
                        style={[
                          styles.testResultText,
                          { color: testResult.success ? COLORS.success : COLORS.danger },
                        ]}
                      >
                        {testResult.message}
                      </Text>
                    </View>
                  )}
                </View>
              )}
            </View>
          )}
        </GlassCard>

        {/* Google Gemini Vision API Key for Food AI Snap */}
        <GlassCard style={styles.card}>
          <View style={styles.cardHeader}>
            <Sparkles size={16} color="#00F0FF" />
            <Text style={styles.cardTitle}>{t.settings.aiSnapSection}</Text>
          </View>
          <Text style={styles.otaDesc}>
            {t.settings.aiSnapDesc}
          </Text>

          <Text style={[styles.fieldSectionLabel, { marginTop: 12 }]}>{t.settings.geminiKeyLabel}</Text>
          <View style={styles.inputRow}>
            <Key size={14} color={COLORS.textMuted} />
            <TextInput
              value={geminiApiKey}
              onChangeText={setGeminiApiKey}
              placeholder={t.settings.geminiKeyPlaceholder}
              placeholderTextColor={COLORS.textMuted}
              style={styles.textInput}
              secureTextEntry={!showApiKey}
              autoCapitalize="none"
              autoCorrect={false}
            />
            <TouchableOpacity
              onPress={() => setShowApiKey(!showApiKey)}
              style={styles.eyeBtn}
              activeOpacity={0.7}
            >
              {showApiKey ? (
                <EyeOff size={14} color={COLORS.textMuted} />
              ) : (
                <Eye size={14} color={COLORS.textMuted} />
              )}
            </TouchableOpacity>
          </View>

          <TouchableOpacity
            style={{ marginTop: 8 }}
            onPress={() => Linking.openURL('https://aistudio.google.com/app/apikey')}
            activeOpacity={0.7}
          >
            <Text style={{ color: '#00F0FF', fontSize: 12, fontWeight: '700' }}>
              {t.settings.getGeminiKeyLink}
            </Text>
          </TouchableOpacity>
        </GlassCard>




        {/* OTA Updates Section */}
        <GlassCard style={styles.card}>
          <View style={styles.cardHeader}>
            <RefreshCw size={16} color={COLORS.purpleAccent} />
            <Text style={styles.cardTitle}>{t.settings.otaHotfixTitle}</Text>
          </View>
          <Text style={styles.otaDesc}>
            {t.settings.otaHotfixDesc}
          </Text>

          {/* OTA Channel & Runtime Badges */}
          <View style={styles.otaBadgeRow}>
            <View style={styles.otaBadge}>
              <Text style={styles.otaBadgeLabel}>{t.settings.otaChannel}</Text>
              <Text style={styles.otaBadgeValue}>{otaMetadata.channel.toUpperCase()}</Text>
            </View>
            <View style={styles.otaBadge}>
              <Text style={styles.otaBadgeLabel}>{t.settings.otaRuntime}</Text>
              <Text style={styles.otaBadgeValue}>{otaMetadata.runtimeVersion}</Text>
            </View>
            <View style={styles.otaBadge}>
              <Text style={styles.otaBadgeLabel}>{t.settings.otaEngine}</Text>
              <Text style={styles.otaBadgeValue}>EXPO EAS</Text>
            </View>
          </View>

          <TouchableOpacity
            onPress={handleCheckOTA}
            disabled={checkingOta}
            style={styles.otaBtn}
            activeOpacity={0.8}
          >
            {checkingOta ? (
              <ActivityIndicator size="small" color={COLORS.textPrimary} />
            ) : (
              <>
                <RefreshCw size={14} color={COLORS.textPrimary} />
                <Text style={styles.otaBtnText}>{t.settings.checkOtaBtn}</Text>
              </>
            )}
          </TouchableOpacity>

          {otaStatus && (
            <View style={styles.otaStatusBox}>
              <CheckCircle2 size={14} color={COLORS.success} />
              <Text style={styles.otaStatusText}>{otaStatus}</Text>
            </View>
          )}

          {otaCanReload && (
            <TouchableOpacity
              onPress={handleApplyOTA}
              style={[styles.otaBtn, { backgroundColor: COLORS.success, borderColor: COLORS.success, marginTop: SPACING.xs }]}
              activeOpacity={0.8}
            >
              <RotateCcw size={14} color="#000" />
              <Text style={[styles.otaBtnText, { color: '#000', fontWeight: '800' }]}>{t.settings.restartAppBtn}</Text>
            </TouchableOpacity>
          )}
        </GlassCard>

        {/* Athlete Profile & Biological Training Parameters */}
        <GlassCard style={styles.card}>
          <View style={styles.cardHeader}>
            <User size={16} color={modeColors.accent} />
            <Text style={styles.cardTitle}>{t.settings.athleteProfileTitle}</Text>
          </View>
          <Text style={styles.otaDesc}>
            {t.settings.athleteProfileDesc}
          </Text>

          <View style={{ gap: SPACING.sm }}>
            {/* Biological Sex Selector */}
            <View>
              <Text style={styles.profileSectionLabel}>{t.settings.biologicalSex}</Text>
              <View style={styles.pillRow}>
                {(
                  [
                    { id: 'male', label: t.settings.male },
                    { id: 'female', label: t.settings.female },
                  ] as const
                ).map((s) => {
                  const isSelected = (userProfile.sex || 'male') === s.id;
                  return (
                    <TouchableOpacity
                      key={s.id}
                      onPress={() => updateProfile({ sex: s.id })}
                      style={[
                        styles.profilePill,
                        isSelected && {
                          borderColor: modeColors.accent,
                          backgroundColor: `${modeColors.accent}20`,
                        },
                      ]}
                      activeOpacity={0.8}
                    >
                      <Text
                        style={[
                          styles.profilePillText,
                          isSelected && { color: modeColors.accent, fontWeight: '700' },
                        ]}
                      >
                        {s.label}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
            </View>

            {/* Equipment Environment Preference */}
            <View>
              <Text style={styles.profileSectionLabel}>{t.settings.defaultEnvironment}</Text>
              <View style={styles.pillRow}>
                {(
                  [
                    { id: 'gym', label: t.settings.fullGym },
                    { id: 'home', label: t.settings.homeBw },
                    { id: 'both', label: t.settings.hybridBoth },
                  ] as const
                ).map((eq) => {
                  const isSelected = (userProfile.equipmentPreference || 'both') === eq.id;
                  return (
                    <TouchableOpacity
                      key={eq.id}
                      onPress={() => updateProfile({ equipmentPreference: eq.id })}
                      style={[
                        styles.profilePill,
                        isSelected && {
                          borderColor: modeColors.accent,
                          backgroundColor: `${modeColors.accent}20`,
                        },
                      ]}
                      activeOpacity={0.8}
                    >
                      <Text
                        style={[
                          styles.profilePillText,
                          isSelected && { color: modeColors.accent, fontWeight: '700' },
                        ]}
                      >
                        {eq.label}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
            </View>

            {/* Height & Weight Display / Edit */}
            <View style={{ marginTop: SPACING.xs }}>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
                <Text style={styles.profileSectionLabel}>{t.settings.anthropometrics}</Text>
                <TouchableOpacity
                  onPress={() => {
                    if (editingMetrics) {
                      handleSaveMetrics();
                    } else {
                      setWeightInput(userProfile.weightKg > 0 ? userProfile.weightKg.toString() : '');
                      setHeightInput(userProfile.heightCm > 0 ? userProfile.heightCm.toString() : '');
                      setEditingMetrics(true);
                    }
                  }}
                  activeOpacity={0.7}
                  style={{ paddingVertical: 2, paddingHorizontal: 6 }}
                >
                  <Text style={{ ...TYPOGRAPHY.captionBold, fontSize: 11, color: modeColors.accent }}>
                    {editingMetrics ? t.settings.save : t.settings.edit}
                  </Text>
                </TouchableOpacity>
              </View>

              {editingMetrics ? (
                <View style={styles.profileStatsRow}>
                  <View style={styles.profileStatItem}>
                    <Text style={styles.profileStatLabel}>{t.settings.weightKg}</Text>
                    <TextInput
                      style={[styles.textInput, { fontSize: 13, marginTop: 4 }]}
                      keyboardType="decimal-pad"
                      placeholder="e.g. 70"
                      placeholderTextColor={COLORS.textMuted}
                      value={weightInput}
                      onChangeText={setWeightInput}
                    />
                  </View>
                  <View style={styles.profileStatItem}>
                    <Text style={styles.profileStatLabel}>{t.settings.heightCm}</Text>
                    <TextInput
                      style={[styles.textInput, { fontSize: 13, marginTop: 4 }]}
                      keyboardType="number-pad"
                      placeholder="e.g. 175"
                      placeholderTextColor={COLORS.textMuted}
                      value={heightInput}
                      onChangeText={setHeightInput}
                    />
                  </View>
                </View>
              ) : (
                <View style={styles.profileStatsRow}>
                  <View style={styles.profileStatItem}>
                    <Text style={styles.profileStatLabel}>{t.settings.bodyWeight}</Text>
                    <Text style={styles.profileStatValue}>
                      {userProfile.weightKg > 0 ? `${userProfile.weightKg} kg` : t.settings.notSet}
                    </Text>
                  </View>
                  <View style={styles.profileStatItem}>
                    <Text style={styles.profileStatLabel}>{t.settings.height}</Text>
                    <Text style={styles.profileStatValue}>
                      {userProfile.heightCm > 0 ? `${userProfile.heightCm} cm` : t.settings.notSet}
                    </Text>
                  </View>
                </View>
              )}
            </View>
          </View>
        </GlassCard>

        {/* Open Source Exercise Dataset & Attributions */}
        <GlassCard style={styles.card}>
          <View style={styles.cardHeader}>
            <Database size={16} color={modeColors.accent} />
            <Text style={styles.cardTitle}>{t.settings.repDbTitle}</Text>
          </View>
          <Text style={styles.otaDesc}>
            {t.settings.repDbDesc}
          </Text>

          <View style={styles.datasetInfoBox}>
            <View style={styles.datasetInfoRow}>
              <Text style={styles.datasetInfoLabel}>{t.settings.source}</Text>
              <Text style={[styles.datasetInfoVal, { color: modeColors.accent }]}>RepDB (repdb.co)</Text>
            </View>
            <View style={styles.datasetInfoRow}>
              <Text style={styles.datasetInfoLabel}>{t.settings.movementsCount}</Text>
              <Text style={styles.datasetInfoVal}>{t.settings.movementsDetail}</Text>
            </View>
            <View style={styles.datasetInfoRow}>
              <Text style={styles.datasetInfoLabel}>{t.settings.calorieMetric}</Text>
              <Text style={styles.datasetInfoVal}>{t.settings.calorieMetricDetail}</Text>
            </View>
            <View style={styles.datasetInfoRow}>
              <Text style={styles.datasetInfoLabel}>{t.settings.attribution}</Text>
              <Text style={styles.datasetInfoVal}>{t.settings.attributionDetail}</Text>
            </View>
          </View>
        </GlassCard>

        {/* Local Storage & Data Privacy Wipe */}
        <GlassCard style={styles.card}>
          <View style={styles.cardHeader}>
            <ShieldCheck size={16} color={COLORS.success} />
            <Text style={styles.cardTitle}>{t.settings.localStorageTitle}</Text>
          </View>
          <Text style={styles.otaDesc}>
            {t.settings.localStorageDesc}
          </Text>

          {actionNotice && (
            <View style={styles.otaStatusBox}>
              <CheckCircle2 size={13} color={COLORS.success} />
              <Text style={styles.otaStatusText}>{actionNotice}</Text>
            </View>
          )}

          <View style={styles.storageActionGrid}>
            <TouchableOpacity
              onPress={handleClearChat}
              style={styles.storageBtnSecondary}
              activeOpacity={0.8}
            >
              <Trash2 size={13} color={COLORS.textSecondary} />
              <Text style={styles.storageBtnSecondaryText}>{t.settings.clearChatBtn}</Text>
            </TouchableOpacity>

            <TouchableOpacity
              onPress={handleClearBiometrics}
              style={styles.storageBtnSecondary}
              activeOpacity={0.8}
            >
              <RotateCcw size={13} color={COLORS.textSecondary} />
              <Text style={styles.storageBtnSecondaryText}>{t.settings.clearBiometricsBtn}</Text>
            </TouchableOpacity>
          </View>

          <TouchableOpacity
            onPress={() => setShowConfirmModal(true)}
            style={styles.wipeAllBtn}
            activeOpacity={0.85}
          >
            <AlertTriangle size={15} color={COLORS.danger} />
            <Text style={styles.wipeAllBtnText}>{t.settings.clearAllBtn}</Text>
          </TouchableOpacity>
        </GlassCard>
      </ScrollView>

      {/* Confirmation Modal */}
      <Modal
        visible={showConfirmModal}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setShowConfirmModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalIconBox}>
              <AlertTriangle size={28} color={COLORS.danger} />
            </View>
            <Text style={styles.modalTitle}>{t.settings.clearAllConfirmTitle}</Text>
            <Text style={styles.modalDesc}>
              {t.settings.clearAllConfirmDesc}
            </Text>
            <Text style={styles.modalWarning}>
              {t.settings.clearAllWarning}
            </Text>

            <View style={styles.modalBtnRow}>
              <TouchableOpacity
                onPress={() => setShowConfirmModal(false)}
                style={styles.modalCancelBtn}
                activeOpacity={0.8}
              >
                <Text style={styles.modalCancelText}>{t.common.cancel}</Text>
              </TouchableOpacity>

              <TouchableOpacity
                onPress={handleConfirmClearAll}
                disabled={isWiping}
                style={styles.modalDeleteBtn}
                activeOpacity={0.85}
              >
                {isWiping ? (
                  <ActivityIndicator size="small" color="#fff" />
                ) : (
                  <Text style={styles.modalDeleteText}>{t.settings.confirmClearAllBtn}</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: COLORS.background,
    overflow: 'hidden',
  },
  scrollContent: {
    padding: SPACING.lg,
    paddingBottom: SPACING.xxxl,
  },
  header: {
    marginBottom: SPACING.md,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  title: {
    ...TYPOGRAPHY.h3,
    fontSize: 18,
    fontWeight: '900',
    color: COLORS.textPrimary,
  },
  subtitle: {
    ...TYPOGRAPHY.caption,
    fontSize: 11,
    color: COLORS.textMuted,
  },
  card: {
    marginBottom: SPACING.md,
  },
  modelHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginTop: SPACING.xs,
    marginBottom: SPACING.xs,
  },
  modelName: {
    ...TYPOGRAPHY.h3,
    fontSize: 17,
    fontWeight: '800',
    color: COLORS.textPrimary,
  },
  quantBadge: {
    ...TYPOGRAPHY.badge,
    fontSize: 9,
    color: COLORS.textMuted,
    marginTop: 2,
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: COLORS.cardSecondary,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: RADIUS.round,
    borderWidth: 1,
    borderColor: COLORS.borderSubtle,
  },
  statusDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  statusText: {
    ...TYPOGRAPHY.badge,
    fontSize: 9,
    color: COLORS.textPrimary,
  },
  specsGrid: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: SPACING.sm,
    borderTopWidth: 1,
    borderBottomWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
    marginBottom: SPACING.sm,
    marginTop: SPACING.xs,
  },
  specItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    flexShrink: 1,
  },
  specLabel: {
    ...TYPOGRAPHY.badge,
    fontSize: 9,
    color: COLORS.textMuted,
  },
  specValue: {
    ...TYPOGRAPHY.caption,
    fontSize: 11,
    fontWeight: '700',
    color: COLORS.textPrimary,
  },
  downloadBox: {
    marginBottom: SPACING.md,
  },
  progressHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  downloadingText: {
    ...TYPOGRAPHY.caption,
    fontSize: 11,
    color: COLORS.textSecondary,
  },
  downloadPercent: {
    ...TYPOGRAPHY.badge,
    fontSize: 10,
    color: COLORS.textPrimary,
  },
  progressBarBg: {
    height: 6,
    borderRadius: 3,
    backgroundColor: COLORS.cardSecondary,
    overflow: 'hidden',
  },
  progressBarFill: {
    height: '100%',
    borderRadius: 3,
  },
  actionsRow: {
    flexDirection: 'row',
    gap: SPACING.sm,
  },
  btn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 10,
    borderRadius: RADIUS.md,
    borderWidth: 1,
    backgroundColor: COLORS.cardSecondary,
  },
  btnText: {
    ...TYPOGRAPHY.badge,
    fontSize: 11,
    fontWeight: '800',
  },
  btnDanger: {
    borderColor: 'rgba(239, 68, 68, 0.4)',
    backgroundColor: 'rgba(239, 68, 68, 0.1)',
  },
  btnDangerText: {
    ...TYPOGRAPHY.badge,
    fontSize: 11,
    color: COLORS.danger,
    fontWeight: '800',
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: SPACING.md,
  },
  cardTitle: {
    ...TYPOGRAPHY.badge,
    fontSize: 10,
    color: COLORS.textPrimary,
  },
  otaDesc: {
    ...TYPOGRAPHY.body,
    fontSize: 12,
    color: COLORS.textSecondary,
    lineHeight: 17,
    marginBottom: SPACING.md,
  },
  otaBadgeRow: {
    flexDirection: 'row',
    gap: SPACING.xs,
    marginBottom: SPACING.sm,
  },
  otaBadge: {
    flex: 1,
    backgroundColor: 'rgba(255, 255, 255, 0.03)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.06)',
    borderRadius: RADIUS.sm,
    paddingVertical: 6,
    paddingHorizontal: 8,
    alignItems: 'center',
  },
  otaBadgeLabel: {
    ...TYPOGRAPHY.mono,
    fontSize: 9,
    color: COLORS.textMuted,
    letterSpacing: 0.5,
  },
  otaBadgeValue: {
    ...TYPOGRAPHY.badge,
    fontSize: 10,
    color: COLORS.purpleAccent,
    marginTop: 2,
    fontWeight: '700',
  },
  otaBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: COLORS.cardSecondary,
    borderWidth: 1,
    borderColor: COLORS.borderSubtle,
    paddingVertical: 10,
    borderRadius: RADIUS.md,
  },
  otaBtnText: {
    ...TYPOGRAPHY.badge,
    fontSize: 11,
    color: COLORS.textPrimary,
  },
  otaStatusBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: SPACING.sm,
    backgroundColor: 'rgba(16, 185, 129, 0.1)',
    borderWidth: 1,
    borderColor: 'rgba(16, 185, 129, 0.3)',
    padding: 8,
    borderRadius: RADIUS.sm,
  },
  otaStatusText: {
    ...TYPOGRAPHY.caption,
    fontSize: 11,
    color: COLORS.success,
  },
  storageActionGrid: {
    flexDirection: 'row',
    gap: SPACING.sm,
    marginBottom: SPACING.sm,
  },
  storageBtnSecondary: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 10,
    borderRadius: RADIUS.sm,
    backgroundColor: COLORS.cardSecondary,
    borderWidth: 1,
    borderColor: COLORS.borderSubtle,
  },
  storageBtnSecondaryText: {
    ...TYPOGRAPHY.bodyBold,
    fontSize: 12,
    color: COLORS.textSecondary,
  },
  wipeAllBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 11,
    borderRadius: RADIUS.sm,
    backgroundColor: 'rgba(239, 68, 68, 0.12)',
    borderWidth: 1,
    borderColor: 'rgba(239, 68, 68, 0.35)',
    marginTop: 2,
  },
  wipeAllBtnText: {
    ...TYPOGRAPHY.bodyBold,
    fontSize: 13,
    color: COLORS.danger,
    letterSpacing: 0.3,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.75)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: SPACING.lg,
  },
  modalContent: {
    width: '100%',
    maxWidth: 400,
    backgroundColor: COLORS.cardBackground,
    borderRadius: RADIUS.lg,
    padding: SPACING.xl,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(239, 68, 68, 0.35)',
    gap: SPACING.sm,
  },
  modalIconBox: {
    width: 52,
    height: 52,
    borderRadius: RADIUS.round,
    backgroundColor: 'rgba(239, 68, 68, 0.12)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 4,
  },
  modalTitle: {
    ...TYPOGRAPHY.h3,
    fontSize: 18,
    color: COLORS.textPrimary,
  },
  modalDesc: {
    ...TYPOGRAPHY.body,
    fontSize: 13,
    color: COLORS.textSecondary,
    textAlign: 'center',
    lineHeight: 18,
  },
  modalWarning: {
    ...TYPOGRAPHY.caption,
    fontSize: 11,
    color: COLORS.danger,
    textAlign: 'center',
    fontWeight: '700',
    marginTop: 2,
  },
  modalBtnRow: {
    flexDirection: 'row',
    gap: SPACING.sm,
    marginTop: SPACING.md,
    width: '100%',
  },
  modalCancelBtn: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    borderRadius: RADIUS.md,
    backgroundColor: COLORS.cardSecondary,
    borderWidth: 1,
    borderColor: COLORS.borderSubtle,
  },
  modalCancelText: {
    ...TYPOGRAPHY.bodyBold,
    fontSize: 13,
    color: COLORS.textSecondary,
  },
  modalDeleteBtn: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    borderRadius: RADIUS.md,
    backgroundColor: COLORS.danger,
  },
  modalDeleteText: {
    ...TYPOGRAPHY.bodyBold,
    fontSize: 13,
    color: '#ffffff',
  },
  providerTabs: {
    flexDirection: 'row',
    gap: SPACING.xs,
    marginBottom: SPACING.md,
  },
  providerTab: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 10,
    borderRadius: RADIUS.sm,
    backgroundColor: COLORS.cardSecondary,
    borderWidth: 1,
    borderColor: COLORS.borderSubtle,
  },
  providerTabText: {
    ...TYPOGRAPHY.caption,
    fontSize: 11,
    color: COLORS.textMuted,
  },
  remoteSettingsWrapper: {
    marginTop: SPACING.xs,
  },
  subTabsContainer: {
    flexDirection: 'row',
    gap: 4,
    marginBottom: SPACING.md,
    backgroundColor: 'rgba(255, 255, 255, 0.03)',
    padding: 3,
    borderRadius: RADIUS.md,
    borderWidth: 1,
    borderColor: COLORS.borderSubtle,
  },
  subTab: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    paddingVertical: 8,
    paddingHorizontal: 2,
    borderRadius: RADIUS.sm,
    borderWidth: 1,
    borderColor: 'transparent',
  },
  subTabText: {
    ...TYPOGRAPHY.caption,
    fontSize: 10,
    color: COLORS.textMuted,
  },
  providerNoteBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: 'rgba(255, 255, 255, 0.03)',
    borderRadius: RADIUS.sm,
    borderWidth: 1,
    borderColor: COLORS.borderSubtle,
    padding: SPACING.sm,
  },
  providerNoteText: {
    ...TYPOGRAPHY.caption,
    fontSize: 11,
    color: COLORS.textSecondary,
    lineHeight: 16,
    flex: 1,
  },
  onDeviceSettingsContainer: {
    marginTop: SPACING.xs,
    gap: SPACING.sm,
  },
  openAISettingsContainer: {
    marginTop: SPACING.xs,
    gap: SPACING.xs,
  },
  fieldSectionLabel: {
    ...TYPOGRAPHY.badge,
    fontSize: 10,
    color: COLORS.textMuted,
    letterSpacing: 0.5,
    marginTop: SPACING.xs,
    marginBottom: 2,
  },
  presetsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginBottom: SPACING.xs,
  },
  modelCardGrid: {
    flexDirection: 'column',
    gap: SPACING.xs,
    marginTop: 4,
  },
  modelRectangleCard: {
    width: '100%',
    minHeight: 52,
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: RADIUS.sm,
    backgroundColor: COLORS.cardSecondary,
    borderWidth: 1,
    borderColor: COLORS.borderSubtle,
    justifyContent: 'center',
  },
  modelRectangleTop: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
  },
  modelRectangleTitle: {
    ...TYPOGRAPHY.bodyBold,
    fontSize: 13,
    color: COLORS.textPrimary,
  },
  modelRectangleBottom: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 3,
    gap: 6,
  },
  modelRectangleMeta: {
    ...TYPOGRAPHY.caption,
    fontSize: 10.5,
    color: COLORS.textMuted,
  },
  modelTag: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: RADIUS.xs,
  },
  modelTagText: {
    fontSize: 8.5,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  presetChip: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: RADIUS.round,
    backgroundColor: COLORS.cardSecondary,
    borderWidth: 1,
    borderColor: COLORS.borderSubtle,
  },
  presetChipText: {
    ...TYPOGRAPHY.caption,
    fontSize: 11,
    color: COLORS.textSecondary,
  },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.cardSecondary,
    borderWidth: 1,
    borderColor: COLORS.borderSubtle,
    borderRadius: RADIUS.sm,
    paddingHorizontal: SPACING.sm,
    height: 42,
    gap: 8,
  },
  textInput: {
    flex: 1,
    ...TYPOGRAPHY.body,
    fontSize: 12,
    color: COLORS.textPrimary,
    paddingVertical: 0,
  },
  eyeBtn: {
    padding: 6,
  },
  testConnBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: COLORS.cardSecondary,
    borderWidth: 1,
    paddingVertical: 10,
    borderRadius: RADIUS.sm,
    marginTop: SPACING.sm,
  },
  testConnBtnText: {
    ...TYPOGRAPHY.bodyBold,
    fontSize: 12,
    letterSpacing: 0.3,
  },
  testResultBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    padding: SPACING.sm,
    borderRadius: RADIUS.sm,
    borderWidth: 1,
    marginTop: SPACING.xs,
  },
  testResultSuccess: {
    backgroundColor: 'rgba(16, 185, 129, 0.1)',
    borderColor: 'rgba(16, 185, 129, 0.3)',
  },
  testResultError: {
    backgroundColor: 'rgba(239, 68, 68, 0.1)',
    borderColor: 'rgba(239, 68, 68, 0.3)',
  },
  testResultText: {
    ...TYPOGRAPHY.caption,
    fontSize: 11,
    lineHeight: 15,
    flex: 1,
  },
  datasetInfoBox: {
    backgroundColor: 'rgba(255, 255, 255, 0.03)',
    borderRadius: RADIUS.sm,
    borderWidth: 1,
    borderColor: COLORS.borderSubtle,
    padding: SPACING.sm,
    gap: 8,
  },
  datasetInfoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    gap: 10,
  },
  datasetInfoLabel: {
    ...TYPOGRAPHY.badge,
    fontSize: 9,
    color: COLORS.textMuted,
    fontWeight: '800',
    flexShrink: 0,
    marginTop: 1,
  },
  datasetInfoVal: {
    ...TYPOGRAPHY.captionBold,
    fontSize: 11,
    color: COLORS.textSecondary,
    textAlign: 'right',
    flex: 1,
    flexShrink: 1,
  },
  profileSectionLabel: {
    ...TYPOGRAPHY.badge,
    fontSize: 9,
    color: COLORS.textMuted,
    fontWeight: '800',
    marginBottom: 4,
  },
  pillRow: {
    flexDirection: 'row',
    gap: 6,
  },
  profilePill: {
    flex: 1,
    backgroundColor: COLORS.cardSecondary,
    borderWidth: 1,
    borderColor: COLORS.borderSubtle,
    borderRadius: RADIUS.sm,
    paddingVertical: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  profilePillText: {
    ...TYPOGRAPHY.captionBold,
    fontSize: 11,
    color: COLORS.textSecondary,
  },
  profileStatsRow: {
    flexDirection: 'row',
    gap: SPACING.sm,
    marginTop: 2,
  },
  profileStatItem: {
    flex: 1,
    backgroundColor: 'rgba(255, 255, 255, 0.03)',
    borderRadius: RADIUS.sm,
    padding: SPACING.sm,
    borderWidth: 1,
    borderColor: COLORS.borderSubtle,
  },
  profileStatLabel: {
    ...TYPOGRAPHY.badge,
    fontSize: 8,
    color: COLORS.textMuted,
  },
  profileStatValue: {
    ...TYPOGRAPHY.captionBold,
    fontSize: 12,
    color: COLORS.textPrimary,
    marginTop: 2,
  },
  memoryStatusBox: {
    backgroundColor: 'rgba(255, 255, 255, 0.04)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
    borderRadius: RADIUS.md,
    padding: SPACING.sm,
    marginBottom: SPACING.sm,
  },
  memoryStatusHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 4,
  },
  memoryStatusTitle: {
    ...TYPOGRAPHY.captionBold,
    fontSize: 11,
    color: COLORS.textPrimary,
  },
  memoryStatusDesc: {
    ...TYPOGRAPHY.caption,
    fontSize: 11,
    color: COLORS.textMuted,
    lineHeight: 16,
  },
  projectorCard: {
    marginTop: SPACING.md,
    paddingTop: SPACING.md,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255, 255, 255, 0.08)',
  },
  projectorHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 4,
  },
  projectorTitle: {
    ...TYPOGRAPHY.bodySmallBold,
    color: COLORS.textPrimary,
    flex: 1,
  },
  projectorActiveBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingVertical: 2,
    paddingHorizontal: 6,
    borderRadius: 6,
    backgroundColor: 'rgba(0, 240, 255, 0.1)',
  },
  projectorActiveBadgeText: {
    fontSize: 10,
    fontWeight: '800',
    color: '#00F0FF',
  },
  projectorDesc: {
    ...TYPOGRAPHY.caption,
    color: COLORS.textSecondary,
    fontSize: 11,
    lineHeight: 16,
  },
});

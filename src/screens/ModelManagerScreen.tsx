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
} from 'lucide-react-native';
import {
  clearAllUserData,
  clearChatHistoryOnly,
  clearBiometricsAndProgressionsOnly,
} from '@/services/storage/userDataService';
import { useTranslation } from '@/i18n';
import { getDeviceMemoryInfo } from '@/services/device/deviceMemory';

const PRESETS = [
  { label: 'Google Gemini', url: 'https://generativelanguage.googleapis.com/v1beta/openai', model: 'gemini-3.5-flash-lite' },
];

export const ModelManagerScreen: React.FC = () => {
  const {
    currentModel,
    availableModels,
    status,
    downloadProgress,
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

  const handleSaveMetrics = () => {
    const w = parseFloat(weightInput);
    const h = parseFloat(heightInput);
    if (!isNaN(w) && w > 0 && !isNaN(h) && h > 0) {
      updateProfile({ weightKg: w, heightCm: h });
      setEditingMetrics(false);
      setActionNotice('Updated athlete weight & height.');
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

  const handleClearChat = async () => {
    await clearChatHistoryOnly();
    setActionNotice('AI Chat conversation history cleared.');
    setTimeout(() => setActionNotice(null), 3500);
  };

  const handleClearBiometrics = async () => {
    await clearBiometricsAndProgressionsOnly();
    setActionNotice('Biometrics and skill milestones cleared.');
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

          {/* Provider Tabs */}
          <View style={styles.providerTabs}>
            <TouchableOpacity
              onPress={() => setProvider('on_device')}
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
              onPress={() => setProvider('openai_compatible')}
              style={[
                styles.providerTab,
                provider === 'openai_compatible' && {
                  borderColor: modeColors.accent,
                  backgroundColor: `${modeColors.accent}15`,
                },
              ]}
              activeOpacity={0.8}
            >
              <Globe size={14} color={provider === 'openai_compatible' ? modeColors.accent : COLORS.textMuted} />
              <Text
                style={[
                  styles.providerTabText,
                  provider === 'openai_compatible' && { color: modeColors.accent, fontWeight: '700' },
                ]}
              >
                {t.settings.openaiProvider}
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
                    ? 'Browser Simulation Active: Automatically running the local on-device streaming simulator (~35 tok/s). On native iOS/Android, executes local GGUF weights via llama.rn with Metal / OpenCL acceleration.'
                    : 'Mobile Mode: Runs quantized GGUF weights locally via llama.rn with Metal / OpenCL GPU acceleration and 0 cloud data transfer.'}
                </Text>
              </View>

              {/* Rectangular Model Selector Cards */}
              <View style={{ marginBottom: SPACING.md }}>
                <Text style={styles.fieldSectionLabel}>{t.settings.modelCatalogTitle}</Text>
                <View style={styles.modelCardGrid}>
                  {(availableModels || []).map((m) => {
                    const isSelected = currentModel.id === m.id;
                    const isGemma4 = m.id.includes('gemma-4');
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
                            ) : isGemma4 ? (
                              <View style={[styles.modelTag, { backgroundColor: `${modeColors.accent}22` }]}>
                                <Text style={[styles.modelTagText, { color: modeColors.accent }]}>
                                  {t.settings.recommendedBadge} (DEFAULT)
                                </Text>
                              </View>
                            ) : (
                              <View style={[styles.modelTag, { backgroundColor: 'rgba(255, 255, 255, 0.08)' }]}>
                                <Text style={[styles.modelTagText, { color: COLORS.textMuted }]}>
                                  BASE
                                </Text>
                              </View>
                            )}
                            {isSelected && <CheckCircle2 size={14} color={modeColors.accent} />}
                          </View>
                        </View>
                        <View style={styles.modelRectangleBottom}>
                          <Text style={styles.modelRectangleMeta} numberOfLines={1}>
                            {m.sizeFormatted} • {m.quantization} • {m.isFineTuned ? 'Fine-Tuned Athletic Weights' : isGemma4 ? 'Multimodal 4 E2B' : 'Base Instruct Weights'}
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
                    QUANTIZATION: {currentModel.quantization} (Low Memory)
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
                  <Text style={styles.specLabel}>ON-DISK:</Text>
                  <Text style={styles.specValue}>{currentModel.sizeFormatted}</Text>
                </View>
                <View style={styles.specItem}>
                  <Terminal size={13} color={COLORS.textSecondary} />
                  <Text style={styles.specLabel}>CONTEXT:</Text>
                  <Text style={styles.specValue}>{currentModel.contextLength} tokens</Text>
                </View>
              </View>

              {/* Download Progress */}
              {status === 'downloading' && (
                <View style={styles.downloadBox}>
                  <View style={styles.progressHeader}>
                    <Text style={styles.downloadingText}>
                      Streaming GGUF Model Weights...
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
                        ? 'RE-VERIFY WEIGHTS'
                        : 'DOWNLOAD MODEL'}
                    </Text>
                  </TouchableOpacity>
                )}

                {status === 'loaded' ? (
                  <TouchableOpacity
                    onPress={() => unloadModel()}
                    style={[styles.btn, styles.btnDanger]}
                    activeOpacity={0.8}
                  >
                    <Text style={styles.btnDangerText}>UNLOAD FROM RAM</Text>
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
                      LOAD CONTEXT
                    </Text>
                  </TouchableOpacity>
                )}
              </View>
            </View>
          )}

          {provider === 'openai_compatible' && (
            <View style={styles.openAISettingsContainer}>
              <Text style={styles.fieldSectionLabel}>QUICK PRESETS</Text>
              <View style={styles.presetsRow}>
                {PRESETS.map((preset) => (
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
                      openAIConfig.baseUrl === preset.url && {
                        borderColor: modeColors.accent,
                        backgroundColor: `${modeColors.accent}20`,
                      },
                    ]}
                    activeOpacity={0.8}
                  >
                    <Text
                      style={[
                        styles.presetChipText,
                        openAIConfig.baseUrl === preset.url && {
                          color: modeColors.accent,
                          fontWeight: '700',
                        },
                      ]}
                    >
                      {preset.label}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>

              <Text style={styles.fieldSectionLabel}>BASE API URL</Text>
              <View style={styles.inputRow}>
                <Server size={14} color={COLORS.textMuted} />
                <TextInput
                  value={openAIConfig.baseUrl}
                  onChangeText={(val) => {
                    updateOpenAIConfig({ baseUrl: val });
                    setTestResult(null);
                  }}
                  placeholder="e.g. http://localhost:11434/v1"
                  placeholderTextColor={COLORS.textMuted}
                  style={styles.textInput}
                  autoCapitalize="none"
                  autoCorrect={false}
                />
              </View>

              <Text style={styles.fieldSectionLabel}>MODEL NAME</Text>
              <View style={styles.inputRow}>
                <Cpu size={14} color={COLORS.textMuted} />
                <TextInput
                  value={openAIConfig.modelName}
                  onChangeText={(val) => {
                    updateOpenAIConfig({ modelName: val });
                    setTestResult(null);
                  }}
                  placeholder="e.g. llama3.2, gemma2, gpt-4o-mini"
                  placeholderTextColor={COLORS.textMuted}
                  style={styles.textInput}
                  autoCapitalize="none"
                  autoCorrect={false}
                />
              </View>

              <Text style={styles.fieldSectionLabel}>API KEY (OPTIONAL FOR OLLAMA / LM STUDIO)</Text>
              <View style={styles.inputRow}>
                <Key size={14} color={COLORS.textMuted} />
                <TextInput
                  value={openAIConfig.apiKey}
                  onChangeText={(val) => {
                    updateOpenAIConfig({ apiKey: val });
                    setTestResult(null);
                  }}
                  placeholder="Leave empty for Ollama or enter Bearer token"
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
                  { borderColor: modeColors.accent },
                ]}
                activeOpacity={0.8}
              >
                {testingConnection ? (
                  <ActivityIndicator size="small" color={modeColors.accent} />
                ) : (
                  <RefreshCw size={14} color={modeColors.accent} />
                )}
                <Text style={[styles.testConnBtnText, { color: modeColors.accent }]}>
                  {testingConnection ? 'Testing Connection...' : 'Test Connection'}
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
            <Text style={styles.cardTitle}>OVER-THE-AIR (OTA) HOTFIX CHANNEL</Text>
          </View>
          <Text style={styles.otaDesc}>
            Pull instant prompt refinements and UI enhancements without waiting for App Store / Google Play review cycles.
          </Text>

          {/* OTA Channel & Runtime Badges */}
          <View style={styles.otaBadgeRow}>
            <View style={styles.otaBadge}>
              <Text style={styles.otaBadgeLabel}>CHANNEL</Text>
              <Text style={styles.otaBadgeValue}>{otaMetadata.channel.toUpperCase()}</Text>
            </View>
            <View style={styles.otaBadge}>
              <Text style={styles.otaBadgeLabel}>RUNTIME</Text>
              <Text style={styles.otaBadgeValue}>{otaMetadata.runtimeVersion}</Text>
            </View>
            <View style={styles.otaBadge}>
              <Text style={styles.otaBadgeLabel}>ENGINE</Text>
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
                <Text style={styles.otaBtnText}>CHECK FOR OTA UPDATES</Text>
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
              <Text style={[styles.otaBtnText, { color: '#000', fontWeight: '800' }]}>RESTART APP TO APPLY UPDATE</Text>
            </TouchableOpacity>
          )}
        </GlassCard>

        {/* Athlete Profile & Biological Training Parameters */}
        <GlassCard style={styles.card}>
          <View style={styles.cardHeader}>
            <User size={16} color={modeColors.accent} />
            <Text style={styles.cardTitle}>ATHLETE PROFILE & PARAMETERS</Text>
          </View>
          <Text style={styles.otaDesc}>
            Biological profile and preferred environment calibrate rep targets, rest periods, and Mifflin-St Jeor metabolic equations.
          </Text>

          <View style={{ gap: SPACING.sm }}>
            {/* Biological Sex Selector */}
            <View>
              <Text style={styles.profileSectionLabel}>BIOLOGICAL SEX</Text>
              <View style={styles.pillRow}>
                {(
                  [
                    { id: 'male', label: 'Male 👨' },
                    { id: 'female', label: 'Female 👩' },
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
              <Text style={styles.profileSectionLabel}>DEFAULT TRAINING ENVIRONMENT</Text>
              <View style={styles.pillRow}>
                {(
                  [
                    { id: 'gym', label: '🏋️ Full Gym' },
                    { id: 'home', label: '🏠 Home / BW' },
                    { id: 'both', label: '🔄 Hybrid / Both' },
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
                <Text style={styles.profileSectionLabel}>BODY ANTHROPOMETRICS</Text>
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
                    {editingMetrics ? 'SAVE' : 'EDIT'}
                  </Text>
                </TouchableOpacity>
              </View>

              {editingMetrics ? (
                <View style={styles.profileStatsRow}>
                  <View style={styles.profileStatItem}>
                    <Text style={styles.profileStatLabel}>WEIGHT (KG)</Text>
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
                    <Text style={styles.profileStatLabel}>HEIGHT (CM)</Text>
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
                    <Text style={styles.profileStatLabel}>BODY WEIGHT</Text>
                    <Text style={styles.profileStatValue}>
                      {userProfile.weightKg > 0 ? `${userProfile.weightKg} kg` : 'Not Set'}
                    </Text>
                  </View>
                  <View style={styles.profileStatItem}>
                    <Text style={styles.profileStatLabel}>HEIGHT</Text>
                    <Text style={styles.profileStatValue}>
                      {userProfile.heightCm > 0 ? `${userProfile.heightCm} cm` : 'Not Set'}
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
            <Text style={styles.cardTitle}>OPEN SOURCE EXERCISE DATASET</Text>
          </View>
          <Text style={styles.otaDesc}>
            Exercise mechanics, metabolic equivalents (MET), and biomechanical coaching cues are powered by RepDB.
          </Text>

          <View style={styles.datasetInfoBox}>
            <View style={styles.datasetInfoRow}>
              <Text style={styles.datasetInfoLabel}>SOURCE:</Text>
              <Text style={[styles.datasetInfoVal, { color: modeColors.accent }]}>RepDB (repdb.co)</Text>
            </View>
            <View style={styles.datasetInfoRow}>
              <Text style={styles.datasetInfoLabel}>MOVEMENTS:</Text>
              <Text style={styles.datasetInfoVal}>643 Exercises (195 Bodyweight + 448 Gym)</Text>
            </View>
            <View style={styles.datasetInfoRow}>
              <Text style={styles.datasetInfoLabel}>CALORIE METRIC:</Text>
              <Text style={styles.datasetInfoVal}>ACSM Metabolic Equivalent (MET)</Text>
            </View>
            <View style={styles.datasetInfoRow}>
              <Text style={styles.datasetInfoLabel}>ATTRIBUTION:</Text>
              <Text style={styles.datasetInfoVal}>Exercise data by RepDB (repdb.co)</Text>
            </View>
          </View>
        </GlassCard>

        {/* Local Storage & Data Privacy Wipe */}
        <GlassCard style={styles.card}>
          <View style={styles.cardHeader}>
            <ShieldCheck size={16} color={COLORS.success} />
            <Text style={styles.cardTitle}>LOCAL STORAGE & USER DATA PRIVACY</Text>
          </View>
          <Text style={styles.otaDesc}>
            All athlete profiles, weight/height metrics, wearable telemetry, and AI chat transcripts are stored 100% locally on this device.
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
              <Text style={styles.storageBtnSecondaryText}>Clear AI Chat</Text>
            </TouchableOpacity>

            <TouchableOpacity
              onPress={handleClearBiometrics}
              style={styles.storageBtnSecondary}
              activeOpacity={0.8}
            >
              <RotateCcw size={13} color={COLORS.textSecondary} />
              <Text style={styles.storageBtnSecondaryText}>Clear Biometrics</Text>
            </TouchableOpacity>
          </View>

          <TouchableOpacity
            onPress={() => setShowConfirmModal(true)}
            style={styles.wipeAllBtn}
            activeOpacity={0.85}
          >
            <AlertTriangle size={15} color={COLORS.danger} />
            <Text style={styles.wipeAllBtnText}>Clear All User Data & Reset App</Text>
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
            <Text style={styles.modalTitle}>Clear All User Data?</Text>
            <Text style={styles.modalDesc}>
              This will permanently delete your athlete profile, body weight/height, training goals, fitness telemetry, and AI chat transcripts from this device.
            </Text>
            <Text style={styles.modalWarning}>
              You will return to the initial onboarding screen. This action cannot be undone.
            </Text>

            <View style={styles.modalBtnRow}>
              <TouchableOpacity
                onPress={() => setShowConfirmModal(false)}
                style={styles.modalCancelBtn}
                activeOpacity={0.8}
              >
                <Text style={styles.modalCancelText}>Cancel</Text>
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
                  <Text style={styles.modalDeleteText}>Yes, Clear All Data</Text>
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
});

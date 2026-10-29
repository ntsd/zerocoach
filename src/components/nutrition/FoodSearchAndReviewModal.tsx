import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TextInput,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  Image,
  KeyboardAvoidingView,
  Platform,
  Linking,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { CameraView, useCameraPermissions } from 'expo-camera';
import * as ImagePicker from 'expo-image-picker';
import { FoodItem, MealType, NutrientProfile } from '../../types/nutrition';
import {
  searchAllFoods,
  fetchProductByBarcode,
  FoodSourceFilter,
} from '../../services/nutrition/openFoodFactsService';
import {
  decomposeMealText,
  decomposeMealWithGemma,
  MealDecompositionResult,
} from '../../services/nutrition/mealDecomposer';
import { analyzeMealPhoto } from '../../services/nutrition/photoMealAnalyzer';
import {
  extractNutritionFromLabelPhoto,
} from '../../services/nutrition/nutritionLabelExtractor';
import { useModelStore, QWEN3_VL_2B_MODEL } from '../../store/useModelStore';
import { llmService } from '../../services/llm/llmService';
import { calculateNutrientsForGrams } from '../../store/useNutritionStore';
import { useTranslation } from '../../i18n';
import { COLORS } from '../../theme/colors';
import {
  X,
  Search,
  Barcode,
  Camera,
  Sparkles,
  CheckCircle,
  Plus,
  Minus,
  Utensils,
  ChevronRight,
  ShieldCheck,
  Flame,
  Zap,
  Image as ImageIcon,
  RotateCcw,
  Globe,
  AlertCircle,
  Tag,
  Download,
  Eye,
} from 'lucide-react-native';

interface FoodSearchAndReviewModalProps {
  visible: boolean;
  initialMealType?: MealType;
  onClose: () => void;
  onLogFood: (food: FoodItem, mealType: MealType, servings: number, consumedGrams: number) => void;
}

type ModalTab = 'snap' | 'search' | 'barcode';

export const FoodSearchAndReviewModal: React.FC<FoodSearchAndReviewModalProps> = ({
  visible,
  initialMealType = 'snack',
  onClose,
  onLogFood,
}) => {
  const { t } = useTranslation();
  const [activeTab, setActiveTab] = useState<ModalTab>('snap');
  const [selectedMealType, setSelectedMealType] = useState<MealType>(initialMealType);

  // Snap / AI & Photo Capture State
  const [capturedImageUri, setCapturedImageUri] = useState<string | null>(null);
  const [capturedBase64, setCapturedBase64] = useState<string | null>(null);
  const [isAnalyzingPhoto, setIsAnalyzingPhoto] = useState(false);
  const [isAnalyzingText, setIsAnalyzingText] = useState(false);
  const [photoAnalysisError, setPhotoAnalysisError] = useState<string | null>(null);

  const currentModel = useModelStore((state) => state.currentModel);
  const selectModel = useModelStore((state) => state.selectModel);
  const isMmprojDownloaded = useModelStore((state) => state.isMmprojDownloaded);
  const isMmprojDownloading = useModelStore((state) => state.isMmprojDownloading);
  const mmprojDownloadProgress = useModelStore((state) => state.mmprojDownloadProgress);
  const downloadMmproj = useModelStore((state) => state.downloadMmproj);
  const status = useModelStore((state) => state.status);
  const loadModel = useModelStore((state) => state.loadModel);
  const downloadProgress = useModelStore((state) => state.downloadProgress);
  const isLocalVisionCapable = Boolean(currentModel?.mmprojDownloadUrl);
  const isLocalVisionReady = isLocalVisionCapable && llmService.isMultimodalReady();
  const isQwenVLActive = isLocalVisionCapable;

  const geminiApiKey = useModelStore((state) => state.geminiApiKey);
  const openAIConfig = useModelStore((state) => state.openAIConfig);
  const hasGeminiVisionKey = Boolean(
    (geminiApiKey && geminiApiKey.trim().length > 0) ||
    (openAIConfig?.apiKey && openAIConfig.apiKey.trim().startsWith('AIza')) ||
    (openAIConfig?.geminiApiKey && openAIConfig.geminiApiKey.trim().length > 0) ||
    (openAIConfig?.baseUrl?.includes('generativelanguage.googleapis.com') &&
      openAIConfig?.apiKey &&
      openAIConfig.apiKey.trim().length > 0)
  );

  const hasOpenAIVision = Boolean(
    openAIConfig &&
    openAIConfig.baseUrl &&
    openAIConfig.baseUrl.trim().length > 0 &&
    !openAIConfig.baseUrl.includes('generativelanguage.googleapis.com')
  );

  const hasAnyVision = hasGeminiVisionKey || hasOpenAIVision;

  // Barcode Camera Scanner State
  const [permission, requestPermission] = useCameraPermissions();
  const [lastScannedCode, setLastScannedCode] = useState<string | null>(null);
  const [lastScanTime, setLastScanTime] = useState<number>(0);
  const [torchEnabled, setTorchEnabled] = useState(false);

  // Search state
  const [searchQuery, setSearchQuery] = useState('');
  const [sourceFilter, setSourceFilter] = useState<FoodSourceFilter>('all');
  const [searchResults, setSearchResults] = useState<FoodItem[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const searchTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Barcode state
  const [barcodeInput, setBarcodeInput] = useState('');
  const [isLookingUpBarcode, setIsLookingUpBarcode] = useState(false);
  const [barcodeError, setBarcodeError] = useState<string | null>(null);

  // Label Extractor State (in Barcode Tab)
  const [isExtractingLabel, setIsExtractingLabel] = useState(false);
  const [labelExtractError, setLabelExtractError] = useState<string | null>(null);

  // AI Meal Snap / Decomposer state
  const [nlpInput, setNlpInput] = useState('');
  const [decompositionResult, setDecompositionResult] = useState<MealDecompositionResult | null>(null);

  // Review Sheet State (when a food item is chosen)
  const [reviewFood, setReviewFood] = useState<FoodItem | null>(null);
  const [consumedGrams, setConsumedGrams] = useState(100);

  // Sync initial meal type and reset transient states when modal opens/closes
  useEffect(() => {
    setSelectedMealType(initialMealType);
    if (!visible) {
      setIsAnalyzingPhoto(false);
      setIsAnalyzingText(false);
      setPhotoAnalysisError(null);
    }
  }, [initialMealType, visible]);

  const performSearch = useCallback(
    async (query: string, filter: FoodSourceFilter = sourceFilter) => {
      setIsSearching(true);
      try {
        const results = await searchAllFoods(query, filter);
        setSearchResults(results);
      } catch (err) {
        console.warn('Search failed:', err);
      } finally {
        setIsSearching(false);
      }
    },
    [sourceFilter]
  );

  // Initial search load
  useEffect(() => {
    if (visible && activeTab === 'search' && !searchQuery.trim()) {
      performSearch('', sourceFilter);
    }
  }, [visible, activeTab, performSearch, sourceFilter]);

  const handleSearchChange = (query: string) => {
    setSearchQuery(query);
    if (searchTimeoutRef.current) {
      clearTimeout(searchTimeoutRef.current);
    }
    searchTimeoutRef.current = setTimeout(() => {
      performSearch(query, sourceFilter);
    }, 280);
  };

  const handleFilterSelect = (filter: FoodSourceFilter) => {
    setSourceFilter(filter);
    performSearch(searchQuery, filter);
  };

  const handleBarcodeLookup = async (code: string) => {
    const clean = code.trim();
    if (!clean) return;
    setBarcodeInput(clean);
    setIsLookingUpBarcode(true);
    setBarcodeError(null);

    try {
      const product = await fetchProductByBarcode(clean);
      if (product) {
        // Use the exact quantity following Open Food Facts (e.g. 330ml for Coke, 50g for Snickers)
        const offQuantityGrams = product.packageQuantityGrams || product.servingSizeGrams || 100;
        selectFoodForReview(product, offQuantityGrams);
      } else {
        setBarcodeError(`Product not found for barcode: ${clean}. Try USDA or text search.`);
      }
    } catch {
      setBarcodeError('Failed to query barcode network. Check internet connection.');
    } finally {
      setIsLookingUpBarcode(false);
    }
  };

  // AI Snap Food Plate Photo Handler
  const processCapturedFoodPhoto = async (
    uri: string,
    base64?: string | null
  ) => {
    setIsAnalyzingPhoto(true);
    setPhotoAnalysisError(null);
    if (base64) setCapturedBase64(base64);

    try {
      const openAIConfig = useModelStore.getState().openAIConfig;
      const geminiApiKey = useModelStore.getState().geminiApiKey;
      const analysis = await analyzeMealPhoto(
        uri,
        base64,
        openAIConfig,
        selectedMealType,
        undefined,
        geminiApiKey
      );
      if (analysis.canIdentify && analysis.decomposition) {
        setPhotoAnalysisError(null);
        setNlpInput(analysis.ingredientsText || '');
        if (uri) {
          analysis.decomposition.asFoodItem.imageUrl = uri;
        }
        setDecompositionResult(analysis.decomposition);
        selectFoodForReview(analysis.decomposition.asFoodItem, analysis.decomposition.totalGrams, analysis.decomposition);
      } else {
        setPhotoAnalysisError(analysis.errorMessage || "Can't identify food from the image. Please describe the meal above.");
      }
    } catch (err) {
      console.warn('[FoodSearchModal] Failed to process meal photo:', err);
      setPhotoAnalysisError("Can't identify food from the image. Please describe the meal above.");
    } finally {
      setIsAnalyzingPhoto(false);
    }
  };

  const handleTakeFoodPhoto = async () => {
    try {
      const { status } = await ImagePicker.requestCameraPermissionsAsync();
      if (status !== 'granted') {
        alert('Camera permission is required to capture photos.');
        return;
      }

      const result = await ImagePicker.launchCameraAsync({
        mediaTypes: ['images'],
        allowsEditing: true,
        quality: 0.4,
        base64: true,
      });

      if (!result.canceled && result.assets && result.assets[0]) {
        const asset = result.assets[0];
        setCapturedImageUri(asset.uri);
        if (asset.base64) setCapturedBase64(asset.base64);
        await processCapturedFoodPhoto(asset.uri, asset.base64);
      }
    } catch (err) {
      console.warn('Error launching camera:', err);
    }
  };

  const handlePickFoodPhoto = async () => {
    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],
        allowsEditing: true,
        quality: 0.4,
        base64: true,
      });

      if (!result.canceled && result.assets && result.assets[0]) {
        const asset = result.assets[0];
        setCapturedImageUri(asset.uri);
        if (asset.base64) setCapturedBase64(asset.base64);
        await processCapturedFoodPhoto(asset.uri, asset.base64);
      }
    } catch (err) {
      console.warn('Error picking image from library:', err);
    }
  };

  // Packaged Nutrition Facts Label Photo Handler (for Barcode Tab)
  const processCapturedLabelPhoto = async (
    uri: string,
    base64?: string | null
  ) => {
    setIsExtractingLabel(true);
    setLabelExtractError(null);
    try {
      const openAIConfig = useModelStore.getState().openAIConfig;
      const result = await extractNutritionFromLabelPhoto(uri, base64, openAIConfig);
      if (result.success && result.asFoodItem) {
        setLabelExtractError(null);
        selectFoodForReview(result.asFoodItem, result.data?.servingSizeGrams || 100);
      } else {
        setLabelExtractError(
          result.errorMessage ||
            "Could not read nutrition facts table from photo. Ensure the label is clear and well-lit."
        );
      }
    } catch (err) {
      console.warn('[FoodSearchModal] Failed to process label photo:', err);
      setLabelExtractError("Failed to extract nutrition table from photo. Try USDA or text search.");
    } finally {
      setIsExtractingLabel(false);
    }
  };

  const handleTakeLabelPhoto = async () => {
    try {
      const { status } = await ImagePicker.requestCameraPermissionsAsync();
      if (status !== 'granted') {
        alert('Camera permission is required to capture photos of nutrition labels.');
        return;
      }

      const result = await ImagePicker.launchCameraAsync({
        mediaTypes: ['images'],
        allowsEditing: true,
        quality: 0.5,
        base64: true,
      });

      if (!result.canceled && result.assets && result.assets[0]) {
        const asset = result.assets[0];
        await processCapturedLabelPhoto(asset.uri, asset.base64);
      }
    } catch (err) {
      console.warn('Error launching camera for label:', err);
    }
  };

  const handlePickLabelPhoto = async () => {
    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],
        allowsEditing: true,
        quality: 0.5,
        base64: true,
      });

      if (!result.canceled && result.assets && result.assets[0]) {
        const asset = result.assets[0];
        await processCapturedLabelPhoto(asset.uri, asset.base64);
      }
    } catch (err) {
      console.warn('Error picking label image from library:', err);
    }
  };

  const handleDecomposeText = async () => {
    if (!nlpInput.trim()) return;
    setIsAnalyzingText(true);
    setPhotoAnalysisError(null);

    try {
      // Text meal breakdown using on-device Gemma 2 AI
      const result = await decomposeMealWithGemma(nlpInput);
      if (capturedImageUri) {
        result.asFoodItem.imageUrl = capturedImageUri;
      }
      setDecompositionResult(result);
      selectFoodForReview(result.asFoodItem, result.totalGrams, result);
    } catch (err) {
      console.warn('[FoodSearchModal] Gemma decomposition error:', err);
      const fallback = decomposeMealText(nlpInput);
      if (capturedImageUri) {
        fallback.asFoodItem.imageUrl = capturedImageUri;
      }
      setDecompositionResult(fallback);
      selectFoodForReview(fallback.asFoodItem, fallback.totalGrams, fallback);
    } finally {
      setIsAnalyzingText(false);
    }
  };

  const selectFoodForReview = (
    food: FoodItem,
    defaultGrams?: number,
    decomp?: MealDecompositionResult | null
  ) => {
    setReviewFood(food);
    if (decomp !== undefined) {
      setDecompositionResult(decomp);
    } else if (food.source !== 'ai_decomposed') {
      setDecompositionResult(null);
    }
    const initialGrams = defaultGrams ?? food.packageQuantityGrams ?? food.servingSizeGrams ?? 100;
    setConsumedGrams(initialGrams);
  };

  const handleConfirmLog = () => {
    if (!reviewFood) return;
    const servings = Math.round((consumedGrams / (reviewFood.servingSizeGrams || 100)) * 10) / 10;
    onLogFood(reviewFood, selectedMealType, servings, consumedGrams);
    // Reset and close
    setReviewFood(null);
    setDecompositionResult(null);
    setCapturedImageUri(null);
    setCapturedBase64(null);
    setIsAnalyzingPhoto(false);
    setIsAnalyzingText(false);
    setPhotoAnalysisError(null);
    onClose();
  };

  const adjustGrams = (delta: number) => {
    setConsumedGrams((prev) => Math.max(10, Math.min(1500, prev + delta)));
  };

  const insets = useSafeAreaInsets();
  const bottomSafePadding = Math.max(insets.bottom, Platform.OS === 'android' ? 48 : 20) + 12;

  // Calculate live review nutrients
  const dynamicNutrients: NutrientProfile | null = reviewFood
    ? calculateNutrientsForGrams(reviewFood.nutrientsPer100g, consumedGrams)
    : null;

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <View style={styles.modalOverlay}>
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          style={styles.modalKeyboardAvoid}
        >
          <View style={[styles.modalContainer, { paddingBottom: bottomSafePadding }]}>
          {/* Top Bar */}
          <View style={styles.topBar}>
            <View style={styles.topBarLeft}>
              <Utensils size={18} color="#00F0FF" />
              <Text style={styles.topBarTitle}>
                {reviewFood ? 'Review & Log Portion' : 'Log Food'}
              </Text>
            </View>
            <TouchableOpacity
              style={styles.closeButton}
              onPress={() => {
                if (reviewFood) {
                  setReviewFood(null);
                  setDecompositionResult(null);
                } else {
                  setPhotoAnalysisError(null);
                  onClose();
                }
              }}
              activeOpacity={0.7}
            >
              <X size={20} color={COLORS.textSecondary} />
            </TouchableOpacity>
          </View>

          {/* If reviewing a chosen food item */}
          {reviewFood && dynamicNutrients ? (
            <View style={{ flex: 1 }}>
              <ScrollView style={styles.reviewContent} contentContainerStyle={{ paddingBottom: 16 }} showsVerticalScrollIndicator={false}>
              {/* Food Header Card */}
              <View style={styles.reviewHeaderCard}>
                {(capturedImageUri || reviewFood.imageUrl) && (
                  <View style={styles.reviewImageContainer}>
                    <Image
                      source={{ uri: capturedImageUri || reviewFood.imageUrl! }}
                      style={styles.reviewImage}
                      resizeMode="cover"
                    />
                    <View style={styles.reviewImageBadge}>
                      <Camera size={12} color="#00F0FF" />
                      <Text style={styles.reviewImageBadgeText}>
                        {t.nutrition.aiSnapPhotoBadge}
                      </Text>
                    </View>
                  </View>
                )}

                <View style={styles.reviewTitleRow}>
                  <View style={{ flex: 1, paddingRight: 8 }}>
                    <Text style={styles.reviewFoodName}>{reviewFood.name}</Text>
                    {reviewFood.brand && (
                      <Text style={styles.reviewFoodBrand}>{reviewFood.brand}</Text>
                    )}
                  </View>
                  <View style={styles.reviewTitleRight}>
                    <View
                      style={[
                        styles.sourceTag,
                        reviewFood.source === 'usda_bundled'
                          ? { backgroundColor: 'rgba(16, 185, 129, 0.15)' }
                          : { backgroundColor: 'rgba(56, 189, 248, 0.15)' },
                      ]}
                    >
                      <Text
                        style={[
                          styles.sourceTagText,
                          reviewFood.source === 'usda_bundled'
                            ? { color: '#10B981' }
                            : { color: '#38BDF8' },
                        ]}
                      >
                        {reviewFood.source === 'usda_bundled'
                          ? 'USDA Whole Food'
                          : reviewFood.source === 'ai_decomposed'
                          ? 'AI Decomposed (USDA)'
                          : 'Open Food Facts'}
                      </Text>
                    </View>

                    {reviewFood.offQuantity && (
                      <View style={styles.offQuantityBadge}>
                        <Text style={styles.offQuantityBadgeText}>
                          Qty: {reviewFood.offQuantity}
                        </Text>
                      </View>
                    )}
                  </View>
                </View>

                {/* Gram Weight Stepper */}
                <Text style={styles.subSectionTitle}>{t.nutrition.adjustServing.toUpperCase()}</Text>
                <View style={styles.stepperContainer}>
                  <TouchableOpacity
                    style={styles.stepBtn}
                    onPress={() => adjustGrams(-25)}
                    activeOpacity={0.6}
                  >
                    <Minus size={18} color={COLORS.textPrimary} />
                  </TouchableOpacity>

                  <View style={styles.stepperDisplay}>
                    <Text style={styles.stepperNumber}>{consumedGrams}</Text>
                    <Text style={styles.stepperUnit}>g</Text>
                  </View>

                  <TouchableOpacity
                    style={styles.stepBtn}
                    onPress={() => adjustGrams(25)}
                    activeOpacity={0.6}
                  >
                    <Plus size={18} color={COLORS.textPrimary} />
                  </TouchableOpacity>
                </View>

                {/* Quick gram chips */}
                <ScrollView
                  horizontal
                  showsHorizontalScrollIndicator={false}
                  contentContainerStyle={styles.quickGramsRow}
                >
                  {reviewFood.packageQuantityGrams ? (
                    <TouchableOpacity
                      style={[
                        styles.quickGramChip,
                        styles.quickGramChipOff,
                        consumedGrams === reviewFood.packageQuantityGrams && styles.quickGramChipActive,
                      ]}
                      onPress={() => setConsumedGrams(reviewFood.packageQuantityGrams!)}
                      activeOpacity={0.7}
                    >
                      <Text
                        style={[
                          styles.quickGramText,
                          styles.quickGramTextOff,
                          consumedGrams === reviewFood.packageQuantityGrams && styles.quickGramTextActive,
                        ]}
                      >
                        {reviewFood.packageQuantityUnitName || `${reviewFood.packageQuantityGrams}g`} (Full Pack)
                      </Text>
                    </TouchableOpacity>
                  ) : null}

                  {reviewFood.servingQuantityGrams &&
                  reviewFood.servingQuantityGrams !== reviewFood.packageQuantityGrams ? (
                    <TouchableOpacity
                      style={[
                        styles.quickGramChip,
                        styles.quickGramChipOff,
                        consumedGrams === reviewFood.servingQuantityGrams && styles.quickGramChipActive,
                      ]}
                      onPress={() => setConsumedGrams(reviewFood.servingQuantityGrams!)}
                      activeOpacity={0.7}
                    >
                      <Text
                        style={[
                          styles.quickGramText,
                          styles.quickGramTextOff,
                          consumedGrams === reviewFood.servingQuantityGrams && styles.quickGramTextActive,
                        ]}
                      >
                        {reviewFood.servingUnitName || `${reviewFood.servingQuantityGrams}g`} (1 Serving)
                      </Text>
                    </TouchableOpacity>
                  ) : null}

                  {[50, 100, 150, 200, 300]
                    .filter(
                      (g) =>
                        g !== reviewFood.packageQuantityGrams &&
                        g !== reviewFood.servingQuantityGrams
                    )
                    .map((g) => (
                      <TouchableOpacity
                        key={g}
                        style={[
                          styles.quickGramChip,
                          consumedGrams === g && styles.quickGramChipActive,
                        ]}
                        onPress={() => setConsumedGrams(g)}
                        activeOpacity={0.7}
                      >
                        <Text
                          style={[
                            styles.quickGramText,
                            consumedGrams === g && styles.quickGramTextActive,
                          ]}
                        >
                          {g}g
                        </Text>
                      </TouchableOpacity>
                    ))}
                </ScrollView>
              </View>

              {/* USDA Decomposed Ingredients Breakdown Card */}
              {decompositionResult &&
                decompositionResult.ingredients &&
                decompositionResult.ingredients.length > 0 && (
                  <View style={styles.decomposedIngredientsCard}>
                    <View style={styles.decomposedCardHeader}>
                      <View style={styles.decomposedCardTitleLeft}>
                        <View style={styles.decomposedIconWrap}>
                          <Sparkles size={16} color="#00F0FF" />
                        </View>
                        <View style={{ flex: 1 }}>
                          <Text style={styles.decomposedCardTitle}>
                            {t.nutrition.decomposedIngredientsTitle}
                          </Text>
                          <Text style={styles.decomposedCardSub}>
                            {t.nutrition.decomposedIngredientsSub}
                          </Text>
                        </View>
                      </View>
                      <View style={styles.decomposedCountBadge}>
                        <Text style={styles.decomposedCountBadgeText}>
                          {decompositionResult.ingredients.length} {t.nutrition.meals.itemsCount || 'ITEMS'}
                        </Text>
                      </View>
                    </View>

                    <View style={styles.decomposedList}>
                      {decompositionResult.ingredients.map((ing, idx) => {
                        const scale =
                          decompositionResult.totalGrams && decompositionResult.totalGrams > 0
                            ? consumedGrams / decompositionResult.totalGrams
                            : 1;
                        const currentGrams = Math.round(ing.quantityGrams * scale);
                        const currentCals = Math.round(ing.nutrients.calories * scale);
                        const currentProt = Math.round(ing.nutrients.proteinGrams * scale * 10) / 10;
                        const currentCarbs = Math.round(ing.nutrients.carbsGrams * scale * 10) / 10;
                        const currentFat = Math.round(ing.nutrients.fatGrams * scale * 10) / 10;

                        const isUsda = !!ing.matchedFoodItem;
                        const displayName = ing.matchedFoodItem ? ing.matchedFoodItem.name : ing.name;

                        return (
                          <View
                            key={`decomp_${idx}`}
                            style={[
                              styles.ingredientRow,
                              idx === decompositionResult.ingredients.length - 1 && styles.ingredientRowLast,
                            ]}
                          >
                            <View style={styles.ingredientIconCol}>
                              <View
                                style={[
                                  styles.ingredientIconWrap,
                                  isUsda ? styles.ingredientIconWrapUsda : styles.ingredientIconWrapAi,
                                ]}
                              >
                                {isUsda ? (
                                  <ShieldCheck size={14} color="#10B981" />
                                ) : (
                                  <Sparkles size={14} color="#F59E0B" />
                                )}
                              </View>
                            </View>

                            <View style={styles.ingredientInfoCol}>
                              <Text style={styles.ingredientNameText} numberOfLines={2}>
                                {displayName}
                              </Text>
                              <View style={styles.ingredientMetaRow}>
                                <View
                                  style={[
                                    styles.ingredientSourceBadge,
                                    isUsda ? styles.ingredientSourceBadgeUsda : styles.ingredientSourceBadgeAi,
                                  ]}
                                >
                                  <Text
                                    style={[
                                      styles.ingredientSourceBadgeText,
                                      isUsda ? { color: '#10B981' } : { color: '#F59E0B' },
                                    ]}
                                  >
                                    {isUsda ? t.nutrition.usdaVerifiedBadge : t.nutrition.aiEstimatedBadge}
                                  </Text>
                                </View>
                                <Text style={styles.ingredientGramsText}>{currentGrams}g</Text>
                              </View>
                            </View>

                            <View style={styles.ingredientNutrientCol}>
                              <Text style={styles.ingredientCalsText}>{currentCals} kcal</Text>
                              <Text style={styles.ingredientMacrosText}>
                                <Text style={{ color: '#10B981' }}>P:{currentProt}g</Text>
                                {'  '}
                                <Text style={{ color: '#38BDF8' }}>C:{currentCarbs}g</Text>
                                {'  '}
                                <Text style={{ color: '#F59E0B' }}>F:{currentFat}g</Text>
                              </Text>
                            </View>
                          </View>
                        );
                      })}
                    </View>
                  </View>
                )}

              {/* Dynamic Macro & Micronutrient Summary */}
              <View style={styles.nutrientsSummaryCard}>
                <View style={styles.calorieHighlight}>
                  <Flame size={20} color="#FF6B35" />
                  <Text style={styles.calorieBigText}>{dynamicNutrients.calories}</Text>
                  <Text style={styles.calorieBigUnit}>kcal</Text>
                </View>

                {/* 4 Macros */}
                <View style={styles.macrosFourRow}>
                  <View style={styles.macroMiniBox}>
                    <Text style={styles.macroMiniLabel}>{t.nutrition.header.protein}</Text>
                    <Text style={[styles.macroMiniVal, { color: '#10B981' }]}>
                      {dynamicNutrients.proteinGrams}g
                    </Text>
                  </View>
                  <View style={styles.macroMiniBox}>
                    <Text style={styles.macroMiniLabel}>{t.nutrition.header.carbs}</Text>
                    <Text style={[styles.macroMiniVal, { color: '#38BDF8' }]}>
                      {dynamicNutrients.carbsGrams}g
                    </Text>
                  </View>
                  <View style={styles.macroMiniBox}>
                    <Text style={styles.macroMiniLabel}>{t.nutrition.header.fat}</Text>
                    <Text style={[styles.macroMiniVal, { color: '#F59E0B' }]}>
                      {dynamicNutrients.fatGrams}g
                    </Text>
                  </View>
                  <View style={styles.macroMiniBox}>
                    <Text style={styles.macroMiniLabel}>{t.nutrition.scorecard.fiber}</Text>
                    <Text style={[styles.macroMiniVal, { color: '#A855F7' }]}>
                      {dynamicNutrients.fiberGrams}g
                    </Text>
                  </View>
                </View>

              {/* Key Micronutrients */}
                <Text style={styles.microsSubHeading}>{t.nutrition.micronutrientAssay}</Text>
                <View style={styles.microAssayGrid}>
                  <View style={styles.microChip}>
                    <Text style={styles.microChipLabel}>{t.nutrition.vitamins.vitA}</Text>
                    <Text style={styles.microChipVal}>{dynamicNutrients.vitaminA_mcg} mcg</Text>
                  </View>
                  <View style={styles.microChip}>
                    <Text style={styles.microChipLabel}>{t.nutrition.vitamins.vitC}</Text>
                    <Text style={styles.microChipVal}>{dynamicNutrients.vitaminC_mg} mg</Text>
                  </View>
                  <View style={styles.microChip}>
                    <Text style={styles.microChipLabel}>{t.nutrition.vitamins.vitD}</Text>
                    <Text style={styles.microChipVal}>{dynamicNutrients.vitaminD_mcg} mcg</Text>
                  </View>
                  <View style={styles.microChip}>
                    <Text style={styles.microChipLabel}>{t.nutrition.vitamins.vitB12}</Text>
                    <Text style={styles.microChipVal}>{dynamicNutrients.vitaminB12_mcg} mcg</Text>
                  </View>
                  <View style={styles.microChip}>
                    <Text style={styles.microChipLabel}>{t.nutrition.vitamins.iron}</Text>
                    <Text style={styles.microChipVal}>{dynamicNutrients.iron_mg} mg</Text>
                  </View>
                  <View style={styles.microChip}>
                    <Text style={styles.microChipLabel}>{t.nutrition.vitamins.calcium}</Text>
                    <Text style={styles.microChipVal}>{dynamicNutrients.calcium_mg} mg</Text>
                  </View>
                  <View style={styles.microChip}>
                    <Text style={styles.microChipLabel}>{t.nutrition.vitamins.magnesium}</Text>
                    <Text style={styles.microChipVal}>{dynamicNutrients.magnesium_mg} mg</Text>
                  </View>
                  <View style={styles.microChip}>
                    <Text style={styles.microChipLabel}>{t.nutrition.vitamins.potassium}</Text>
                    <Text style={styles.microChipVal}>{dynamicNutrients.potassium_mg} mg</Text>
                  </View>
                  <View style={styles.microChip}>
                    <Text style={styles.microChipLabel}>{t.nutrition.vitamins.sodium}</Text>
                    <Text style={styles.microChipVal}>{dynamicNutrients.sodium_mg} mg</Text>
                  </View>
                  <View style={styles.microChip}>
                    <Text style={styles.microChipLabel}>{t.nutrition.vitamins.zinc}</Text>
                    <Text style={styles.microChipVal}>{dynamicNutrients.zinc_mg} mg</Text>
                  </View>
                </View>
              </View>
            </ScrollView>

            {/* Docked Log Action Button */}
            <View style={styles.dockedFooter}>
              <TouchableOpacity
                accessibilityRole="button"
                style={styles.confirmLogButton}
                onPress={handleConfirmLog}
                activeOpacity={0.8}
              >
                <CheckCircle size={18} color="#080B10" />
                <Text style={styles.confirmLogButtonText}>
                  {t.nutrition.confirmLogBtn} ({consumedGrams}g • {dynamicNutrients.calories} kcal)
                </Text>
              </TouchableOpacity>
            </View>
          </View>
          ) : (
            <>
              {/* Tab Selector: Snap / AI is FIRST! */}
              <View style={styles.tabRow}>
                <TouchableOpacity
                  style={[styles.tabButton, activeTab === 'snap' && styles.tabButtonActive]}
                  onPress={() => setActiveTab('snap')}
                  activeOpacity={0.7}
                >
                  {hasGeminiVisionKey ? (
                    <Camera size={15} color={activeTab === 'snap' ? '#00F0FF' : COLORS.textMuted} />
                  ) : (
                    <Sparkles size={15} color={activeTab === 'snap' ? '#00F0FF' : COLORS.textMuted} />
                  )}
                  <Text
                    style={[styles.tabText, activeTab === 'snap' && styles.tabTextActive]}
                  >
                    {t.nutrition.aiSnapTab}
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[styles.tabButton, activeTab === 'search' && styles.tabButtonActive]}
                  onPress={() => setActiveTab('search')}
                  activeOpacity={0.7}
                >
                  <Search size={15} color={activeTab === 'search' ? '#00F0FF' : COLORS.textMuted} />
                  <Text
                    style={[styles.tabText, activeTab === 'search' && styles.tabTextActive]}
                  >
                    {t.nutrition.searchTab}
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[styles.tabButton, activeTab === 'barcode' && styles.tabButtonActive]}
                  onPress={() => setActiveTab('barcode')}
                  activeOpacity={0.7}
                >
                  <Barcode size={15} color={activeTab === 'barcode' ? '#00F0FF' : COLORS.textMuted} />
                  <Text
                    style={[styles.tabText, activeTab === 'barcode' && styles.tabTextActive]}
                  >
                    {t.nutrition.barcodeTab}
                  </Text>
                </TouchableOpacity>
              </View>

              {/* Tab 1: AI Snap (Gemma 4 E2B Local + Optional AI Studio Vision Photo Snap) */}
              {activeTab === 'snap' && (
                <ScrollView
                  style={styles.tabContent}
                  contentContainerStyle={styles.tabScrollContent}
                  showsVerticalScrollIndicator={false}
                >
                  {/* Warning banner when text model is active and no vision key is configured */}
                  {!isQwenVLActive && !hasAnyVision && (
                    <View style={styles.qwenAlertCard}>
                      <View style={styles.qwenAlertHeader}>
                        <AlertCircle size={15} color={COLORS.warning} />
                        <Text style={styles.qwenAlertTitle}>{t.nutrition.qwenNoticeTitle}</Text>
                      </View>
                      <Text style={styles.qwenAlertDesc}>{t.nutrition.qwenNoticeDesc}</Text>
                      <View style={styles.qwenActionRow}>
                        <TouchableOpacity
                          style={styles.qwenActionBtn}
                          onPress={() => selectModel(QWEN3_VL_2B_MODEL)}
                          activeOpacity={0.8}
                        >
                          <Zap size={13} color="#080B10" />
                          <Text style={styles.qwenActionBtnText}>Switch to Qwen 3 VL</Text>
                        </TouchableOpacity>
                      </View>
                    </View>
                  )}

                  {/* Part 1: Text Description (ZeroCoach On-Device AI) */}
                  <View style={styles.nlpBox}>
                    <View style={styles.nlpHeaderRow}>
                      <Text style={styles.nlpLabel}>{t.nutrition.describeMealLabel}</Text>
                      <View style={styles.gemmaPill}>
                        <Sparkles size={11} color="#00F0FF" />
                        <Text style={styles.gemmaPillText}>
                          {currentModel.isFineTuned
                            ? 'ZEROCOACH ATHLETIC'
                            : isLocalVisionCapable
                            ? 'QWEN 3 VL (ON-DEVICE)'
                            : hasAnyVision
                            ? t.nutrition.cloudAcceleratedBadge
                            : 'ZEROCOACH AI'}
                        </Text>
                      </View>
                    </View>
                    <TextInput
                      style={styles.nlpInput}
                      placeholder={t.nutrition.describePlaceholder}
                      placeholderTextColor={COLORS.textMuted}
                      value={nlpInput}
                      onChangeText={setNlpInput}
                      multiline
                    />
                    <TouchableOpacity
                      style={styles.decomposeBtn}
                      onPress={handleDecomposeText}
                      activeOpacity={0.7}
                      disabled={isAnalyzingText || isAnalyzingPhoto}
                    >
                      {isAnalyzingText ? (
                        <ActivityIndicator size="small" color="#080B10" />
                      ) : (
                        <Sparkles size={16} color="#080B10" />
                      )}
                      <Text style={styles.decomposeBtnText}>
                        {isAnalyzingText ? t.nutrition.analyzingMealBtn : t.nutrition.analyzeMealBtn}
                      </Text>
                    </TouchableOpacity>
                  </View>

                  {/* Part 2: Photo Snap Card */}
                  {(hasAnyVision || isLocalVisionCapable) && (
                    <>
                      {/* Divider */}
                      <View style={styles.snapDividerRow}>
                        <View style={styles.snapDividerLine} />
                        <Text style={styles.snapDividerText}>{t.nutrition.orSnapPhoto}</Text>
                        <View style={styles.snapDividerLine} />
                      </View>

                      {/* Meal Plate Photo Snap */}
                      <View style={styles.plateSnapCard}>
                        <View style={styles.plateSnapHeader}>
                          <View style={styles.plateSnapBadge}>
                            <Sparkles size={11} color="#00F0FF" />
                            <Text style={styles.plateSnapBadgeText}>
                              {isLocalVisionReady
                                ? 'QWEN 3 VL (100% OFFLINE VISION READY)'
                                : isMmprojDownloaded && isLocalVisionCapable && status !== 'loaded'
                                ? 'QWEN 3 VL (READY TO ACTIVATE)'
                                : hasGeminiVisionKey
                                ? 'GEMINI FLASH (CLOUD)'
                                : hasOpenAIVision
                                ? 'OPENAI VISION'
                                : 'QWEN 3 VL (OFFLINE VISION)'}
                            </Text>
                          </View>
                          <Text style={styles.plateSnapModelName}>
                            {isLocalVisionReady
                              ? 'Qwen 3 VL Offline Vision'
                              : isMmprojDownloaded && isLocalVisionCapable && status !== 'loaded'
                              ? 'Offline Vision (Tap to Activate)'
                              : hasGeminiVisionKey
                              ? 'AI Studio Gemini'
                              : hasOpenAIVision
                              ? 'OpenAI Vision'
                              : currentModel.name}
                          </Text>
                        </View>
                        <Text style={styles.plateSnapTitle}>{t.nutrition.snapFoodTitle}</Text>
                        <Text style={styles.plateSnapDesc}>
                          {t.nutrition.snapFoodDesc}
                        </Text>

                        {/* If projector is missing or not activated, show action prompt */}
                        {!isLocalVisionReady && !hasAnyVision && currentModel.mmprojDownloadUrl && (
                          <View style={styles.projectorDownloadPrompt}>
                            <Text style={styles.projectorDownloadTitle}>
                              {isMmprojDownloaded
                                ? 'Offline Vision Ready to Activate'
                                : 'Offline Vision Projector (445 MB) Needed'}
                            </Text>
                            <Text style={styles.projectorDownloadSub}>
                              {isMmprojDownloaded
                                ? 'Vision weights are stored on disk. Tap Activate to load Qwen 3 VL multimodal into RAM for offline camera plate recognition.'
                                : 'Download Qwen 3 VL\'s Vision Projector to recognize meals from camera 100% offline, or type your meal description above.'}
                            </Text>
                            {isMmprojDownloading || status === 'downloading' || status === 'loading' ? (
                              <View style={styles.projectorProgressContainer}>
                                <Text style={styles.projectorProgressText}>
                                  {status === 'loading'
                                    ? 'Activating Qwen 3 VL Vision in RAM...'
                                    : status === 'downloading'
                                    ? `Downloading Base Model: ${downloadProgress}%`
                                    : `Downloading Projector: ${mmprojDownloadProgress}%`}
                                </Text>
                                <View style={styles.projectorProgressBarBg}>
                                  <View
                                    style={[
                                      styles.projectorProgressBarFill,
                                      {
                                        width: `${
                                          status === 'loading'
                                            ? 100
                                            : status === 'downloading'
                                            ? downloadProgress
                                            : mmprojDownloadProgress
                                        }%`,
                                      },
                                    ]}
                                  />
                                </View>
                              </View>
                            ) : isMmprojDownloaded && status !== 'loaded' ? (
                              <TouchableOpacity
                                style={styles.downloadProjectorBtn}
                                onPress={async () => {
                                  await loadModel();
                                  if (capturedImageUri) {
                                    processCapturedFoodPhoto(capturedImageUri, capturedBase64);
                                  }
                                }}
                                activeOpacity={0.8}
                              >
                                <Zap size={14} color="#080B10" />
                                <Text style={styles.downloadProjectorBtnText}>
                                  ACTIVATE OFFLINE VISION (LOAD MODEL)
                                </Text>
                              </TouchableOpacity>
                            ) : (
                              <TouchableOpacity
                                style={styles.downloadProjectorBtn}
                                onPress={async () => {
                                  await downloadMmproj();
                                  if (capturedImageUri) {
                                    processCapturedFoodPhoto(capturedImageUri, capturedBase64);
                                  }
                                }}
                                activeOpacity={0.8}
                              >
                                <Download size={14} color="#080B10" />
                                <Text style={styles.downloadProjectorBtnText}>
                                  DOWNLOAD VISION PROJECTOR ({currentModel.mmprojSizeFormatted || '445 MB'})
                                </Text>
                              </TouchableOpacity>
                            )}
                          </View>
                        )}

                        {/* Camera & Gallery Action Buttons */}
                        <View style={styles.photoActionsRow}>
                          <TouchableOpacity
                            style={styles.cameraPrimaryBtn}
                            onPress={handleTakeFoodPhoto}
                            activeOpacity={0.7}
                            disabled={isAnalyzingPhoto || isAnalyzingText}
                          >
                            <Camera size={18} color="#080B10" />
                            <Text style={styles.cameraPrimaryBtnText}>{t.nutrition.snapPlateBtn}</Text>
                          </TouchableOpacity>

                          <TouchableOpacity
                            style={styles.gallerySecondaryBtn}
                            onPress={handlePickFoodPhoto}
                            activeOpacity={0.7}
                            disabled={isAnalyzingPhoto || isAnalyzingText}
                          >
                            <ImageIcon size={18} color="#00F0FF" />
                            <Text style={styles.gallerySecondaryBtnText}>{t.nutrition.uploadPhotoBtn}</Text>
                          </TouchableOpacity>
                        </View>
                      </View>

                      {/* Captured Food Photo Preview */}
                      {capturedImageUri && (
                        <View style={styles.capturedPhotoCard}>
                          <Image source={{ uri: capturedImageUri }} style={styles.capturedImage} />

                          {isAnalyzingPhoto && (
                            <View style={styles.photoAnalyzingOverlay}>
                              <ActivityIndicator size="large" color="#00F0FF" />
                              <Text style={styles.photoAnalyzingTitle}>{t.nutrition.analyzingMealPhoto}</Text>
                              <Text style={styles.photoAnalyzingSub}>
                                {t.nutrition.analyzingMealPhotoSub}
                              </Text>
                            </View>
                          )}

                          <View style={styles.capturedPhotoHeader}>
                            <View style={styles.photoBadge}>
                              <Sparkles size={12} color="#00F0FF" />
                              <Text style={styles.photoBadgeText}>{t.nutrition.photoAttached}</Text>
                            </View>
                            <TouchableOpacity
                              style={styles.retakeBtn}
                              onPress={handleTakeFoodPhoto}
                              activeOpacity={0.7}
                            >
                              <RotateCcw size={12} color={COLORS.textMuted} />
                              <Text style={styles.retakeBtnText}>{t.nutrition.retake}</Text>
                            </TouchableOpacity>
                          </View>
                        </View>
                      )}

                      {/* Unidentified Food Alert Banner */}
                      {photoAnalysisError && (
                        <View style={styles.photoErrorBanner}>
                          <AlertCircle size={18} color="#FF6B35" />
                          <View style={styles.photoErrorTextCol}>
                            <Text style={styles.photoErrorTitle}>{t.nutrition.cantIdentifyFood}</Text>
                            <Text style={styles.photoErrorSub}>{photoAnalysisError}</Text>
                            <View style={styles.photoErrorActionsRow}>
                              {!isLocalVisionReady && currentModel.mmprojDownloadUrl && (
                                <TouchableOpacity
                                  style={styles.downloadProjectorSmallBtn}
                                  onPress={async () => {
                                    if (!isMmprojDownloaded) {
                                      await downloadMmproj();
                                    } else {
                                      await loadModel();
                                    }
                                    if (capturedImageUri) {
                                      processCapturedFoodPhoto(capturedImageUri, capturedBase64);
                                    }
                                  }}
                                  activeOpacity={0.7}
                                >
                                  <Download size={12} color="#00F0FF" />
                                  <Text style={styles.downloadProjectorSmallBtnText}>
                                    {!isMmprojDownloaded
                                      ? `Download Projector (${currentModel.mmprojSizeFormatted || '445 MB'})`
                                      : 'Activate Offline Vision'}
                                  </Text>
                                </TouchableOpacity>
                              )}
                              {capturedImageUri && (
                                <TouchableOpacity
                                  style={styles.retryAnalysisBtn}
                                  onPress={() => processCapturedFoodPhoto(capturedImageUri, capturedBase64)}
                                  activeOpacity={0.7}
                                >
                                  <RotateCcw size={12} color="#00F0FF" />
                                  <Text style={styles.retryAnalysisBtnText}>{t.nutrition.retryAnalysis}</Text>
                                </TouchableOpacity>
                              )}
                            </View>
                          </View>
                        </View>
                      )}
                    </>
                  )}
                </ScrollView>
              )}

              {/* Tab 2: Search */}
              {activeTab === 'search' && (
                <View style={styles.tabContent}>
                  <View style={styles.searchBar}>
                    <Search size={16} color={COLORS.textSecondary} />
                    <TextInput
                      style={styles.searchInput}
                      placeholder={t.nutrition.searchPlaceholder}
                      placeholderTextColor={COLORS.textMuted}
                      value={searchQuery}
                      onChangeText={handleSearchChange}
                      autoCapitalize="none"
                      autoCorrect={false}
                    />
                    {isSearching && <ActivityIndicator size="small" color="#00F0FF" />}
                  </View>

                  {/* Source Filter Selector Chips */}
                  <View style={styles.sourceFilterRow}>
                    <TouchableOpacity
                      style={[
                        styles.sourceFilterChip,
                        sourceFilter === 'all' && styles.sourceFilterChipActive,
                      ]}
                      onPress={() => handleFilterSelect('all')}
                      activeOpacity={0.7}
                    >
                      <Text
                        style={[
                          styles.sourceFilterText,
                          sourceFilter === 'all' && styles.sourceFilterTextActive,
                        ]}
                      >
                        {t.nutrition.allSources}
                      </Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                      style={[
                        styles.sourceFilterChip,
                        sourceFilter === 'open_food_facts' && styles.sourceFilterChipActive,
                      ]}
                      onPress={() => handleFilterSelect('open_food_facts')}
                      activeOpacity={0.7}
                    >
                      <Globe
                        size={11}
                        color={sourceFilter === 'open_food_facts' ? '#080B10' : '#38BDF8'}
                        style={{ marginRight: 4 }}
                      />
                      <Text
                        style={[
                          styles.sourceFilterText,
                          sourceFilter === 'open_food_facts' && styles.sourceFilterTextActive,
                        ]}
                      >
                        {t.nutrition.openFoodFactsSource}
                      </Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                      style={[
                        styles.sourceFilterChip,
                        sourceFilter === 'usda_bundled' && styles.sourceFilterChipActive,
                      ]}
                      onPress={() => handleFilterSelect('usda_bundled')}
                      activeOpacity={0.7}
                    >
                      <Text
                        style={[
                          styles.sourceFilterText,
                          sourceFilter === 'usda_bundled' && styles.sourceFilterTextActive,
                        ]}
                      >
                        {t.nutrition.usdaWholeSource}
                      </Text>
                    </TouchableOpacity>
                  </View>

                  <ScrollView
                    style={styles.resultsList}
                    contentContainerStyle={styles.tabScrollContent}
                    showsVerticalScrollIndicator={false}
                  >
                    {searchResults.length === 0 && !isSearching ? (
                      <View style={styles.emptySearchResults}>
                        <Search size={30} color={COLORS.textMuted} />
                        <Text style={styles.emptySearchTitle}>
                          {searchQuery.trim() ? t.nutrition.noFoodsFound : t.nutrition.typeToSearchFoods}
                        </Text>
                        <Text style={styles.emptySearchSub}>
                          {searchQuery.trim()
                            ? t.nutrition.noFoodsFoundSub
                            : t.nutrition.typeToSearchFoodsSub}
                        </Text>
                      </View>
                    ) : (
                      searchResults.map((item) => (
                        <TouchableOpacity
                          key={item.id}
                          style={styles.resultItem}
                          onPress={() =>
                            selectFoodForReview(
                              item,
                              item.packageQuantityGrams || item.servingSizeGrams
                            )
                          }
                          activeOpacity={0.7}
                        >
                          {item.imageUrl ? (
                            <Image
                              source={{ uri: item.imageUrl }}
                              style={styles.resultThumb}
                              resizeMode="cover"
                            />
                          ) : (
                            <View style={styles.resultPlaceholderThumb}>
                              <Utensils size={14} color={COLORS.textMuted} />
                            </View>
                          )}

                          <View style={styles.resultMain}>
                            <Text style={styles.resultName} numberOfLines={1}>
                              {item.name}
                            </Text>
                            {item.brand ? (
                              <Text style={styles.resultBrand} numberOfLines={1}>
                                {item.brand}
                              </Text>
                            ) : null}
                            <Text style={styles.resultNutrients}>
                              {item.offQuantity ? `${item.offQuantity} • ` : ''}
                              {item.nutrientsPer100g.calories} kcal • {item.nutrientsPer100g.proteinGrams}g P •{' '}
                              {item.nutrientsPer100g.carbsGrams}g C • {item.nutrientsPer100g.fatGrams}g F (per 100g)
                            </Text>
                          </View>

                          <View style={styles.resultRight}>
                            <View
                              style={[
                                styles.miniSourceBadge,
                                item.source === 'usda_bundled'
                                  ? { backgroundColor: 'rgba(16, 185, 129, 0.15)' }
                                  : { backgroundColor: 'rgba(56, 189, 248, 0.15)' },
                              ]}
                            >
                              <Text
                                style={[
                                  styles.miniSourceText,
                                  item.source === 'usda_bundled'
                                    ? { color: '#10B981' }
                                    : { color: '#38BDF8' },
                                ]}
                              >
                                {item.source === 'usda_bundled' ? t.nutrition.usdaWholeSource : t.nutrition.openFoodFactsSource}
                              </Text>
                            </View>
                            <ChevronRight size={16} color={COLORS.textMuted} />
                          </View>
                        </TouchableOpacity>
                      ))
                    )}
                  </ScrollView>
                </View>
              )}

              {/* Tab 3: Barcode (with Live Camera Scanner) */}
              {activeTab === 'barcode' && (
                <ScrollView
                  style={styles.tabContent}
                  contentContainerStyle={styles.tabScrollContent}
                  showsVerticalScrollIndicator={false}
                >
                  <Text style={styles.sectionSubtitle}>
                    {t.nutrition.scanBarcodeInstruction}
                  </Text>

                  {/* Live Camera Barcode Scanner View */}
                  {!permission ? (
                    <View style={styles.cameraLoadingBox}>
                      <ActivityIndicator size="small" color="#00F0FF" />
                      <Text style={styles.cameraLoadingText}>{t.nutrition.initializingCamera}</Text>
                    </View>
                  ) : !permission.granted ? (
                    <View style={styles.permissionBox}>
                      <Camera size={32} color="#00F0FF" />
                      <Text style={styles.permissionTitle}>{t.nutrition.cameraAccessRequired}</Text>
                      <Text style={styles.permissionSub}>
                        {t.nutrition.cameraAccessRequiredSub}
                      </Text>
                      <TouchableOpacity
                        style={styles.permissionButton}
                        onPress={requestPermission}
                        activeOpacity={0.7}
                      >
                        <Text style={styles.permissionButtonText}>{t.nutrition.enableCamera}</Text>
                      </TouchableOpacity>
                    </View>
                  ) : (
                    <View style={styles.scannerWrapper}>
                      <CameraView
                        style={StyleSheet.absoluteFill}
                        enableTorch={torchEnabled}
                        barcodeScannerSettings={{
                          barcodeTypes: [
                            'ean13',
                            'ean8',
                            'upc_a',
                            'upc_e',
                            'code128',
                            'code39',
                            'qr',
                          ],
                        }}
                        onBarcodeScanned={(result) => {
                          if (result.data) {
                            const clean = result.data.trim();
                            const now = Date.now();
                            if (clean !== lastScannedCode || now - lastScanTime > 3000) {
                              setLastScannedCode(clean);
                              setLastScanTime(now);
                              handleBarcodeLookup(clean);
                            }
                          }
                        }}
                      />

                      {/* Viewfinder Overlay with Reticle & Controls */}
                      <View style={styles.scannerOverlay}>
                        <View style={styles.scannerHeaderRow}>
                          <View style={styles.liveIndicator}>
                            <View style={styles.liveDot} />
                            <Text style={styles.liveText}>{t.nutrition.liveScanner}</Text>
                          </View>
                          <TouchableOpacity
                            style={[styles.torchButton, torchEnabled && styles.torchButtonActive]}
                            onPress={() => setTorchEnabled((prev) => !prev)}
                            activeOpacity={0.7}
                          >
                            <Zap size={15} color={torchEnabled ? '#080B10' : '#F8FAFC'} />
                          </TouchableOpacity>
                        </View>

                        <View style={styles.reticleBox}>
                          <View style={[styles.reticleCorner, styles.cornerTL]} />
                          <View style={[styles.reticleCorner, styles.cornerTR]} />
                          <View style={[styles.reticleCorner, styles.cornerBL]} />
                          <View style={[styles.reticleCorner, styles.cornerBR]} />
                          <View style={styles.laserLine} />
                        </View>

                        <Text style={styles.scannerInstruction}>
                          {t.nutrition.alignBarcodeInstruction}
                        </Text>
                      </View>

                      {isLookingUpBarcode && (
                        <View style={styles.scanningLookupOverlay}>
                          <ActivityIndicator size="large" color="#00F0FF" />
                          <Text style={styles.scanningLookupText}>{t.nutrition.lookingUpBarcode}</Text>
                        </View>
                      )}
                    </View>
                  )}

                  {/* Manual Barcode Input Fallback */}
                  <View style={styles.barcodeInputRow}>
                    <TextInput
                      style={styles.barcodeInput}
                      placeholder="e.g. 0856312002772"
                      placeholderTextColor={COLORS.textMuted}
                      value={barcodeInput}
                      onChangeText={setBarcodeInput}
                      keyboardType="numeric"
                    />
                    <TouchableOpacity
                      style={styles.barcodeLookupBtn}
                      onPress={() => handleBarcodeLookup(barcodeInput)}
                      activeOpacity={0.7}
                    >
                      {isLookingUpBarcode ? (
                        <ActivityIndicator size="small" color="#080B10" />
                      ) : (
                        <Text style={styles.barcodeLookupText}>{t.nutrition.lookupBtn}</Text>
                      )}
                    </TouchableOpacity>
                  </View>

                  {barcodeError && (
                    <View style={styles.barcodeErrorCard}>
                      <View style={styles.barcodeErrorHeader}>
                        <AlertCircle size={16} color="#FF6B35" />
                        <Text style={styles.barcodeErrorTitle}>{t.nutrition.barcodeNotFound}</Text>
                      </View>
                      <Text style={styles.barcodeErrorCardText}>{barcodeError}</Text>
                      <TouchableOpacity
                        style={styles.quickScanLabelBtn}
                        onPress={handleTakeLabelPhoto}
                        activeOpacity={0.8}
                      >
                        <Camera size={15} color="#080B10" />
                        <Text style={styles.quickScanLabelBtnText}>
                          {t.nutrition.scanNutritionTableBtn}
                        </Text>
                      </TouchableOpacity>
                    </View>
                  )}

                  {/* Persistent No Barcode? Scan Nutrition Table Card */}
                  <View style={styles.labelScanCard}>
                    <View style={styles.labelScanHeader}>
                      <View style={styles.labelScanBadge}>
                        <Sparkles size={11} color="#00F0FF" />
                        <Text style={styles.labelScanBadgeText}>nutrition-extractor</Text>
                      </View>
                      <Text style={styles.labelScanCardSubTitle}>LayoutLMv3 AI</Text>
                    </View>

                    <Text style={styles.labelScanCardTitle}>{t.nutrition.noBarcodeTitle}</Text>
                    <Text style={styles.labelScanCardSub}>
                      {t.nutrition.noBarcodeSub}
                    </Text>

                    <View style={styles.labelScanBtnRow}>
                      <TouchableOpacity
                        style={styles.labelCameraBtn}
                        onPress={handleTakeLabelPhoto}
                        activeOpacity={0.7}
                        disabled={isExtractingLabel}
                      >
                        <Camera size={16} color="#080B10" />
                        <Text style={styles.labelCameraBtnText}>{t.nutrition.scanLabelPhotoBtn}</Text>
                      </TouchableOpacity>

                      <TouchableOpacity
                        style={styles.labelGalleryBtn}
                        onPress={handlePickLabelPhoto}
                        activeOpacity={0.7}
                        disabled={isExtractingLabel}
                      >
                        <ImageIcon size={16} color="#00F0FF" />
                        <Text style={styles.labelGalleryBtnText}>{t.nutrition.uploadLabelBtn}</Text>
                      </TouchableOpacity>
                    </View>

                    {isExtractingLabel && (
                      <View style={styles.labelExtractingBox}>
                        <ActivityIndicator size="small" color="#00F0FF" />
                        <Text style={styles.labelExtractingText}>
                          {t.nutrition.extractingNutritionTable}
                        </Text>
                      </View>
                    )}

                    {labelExtractError && (
                      <View style={styles.labelErrorBox}>
                        <AlertCircle size={15} color="#FF6B35" />
                        <Text style={styles.labelErrorText}>{labelExtractError}</Text>
                      </View>
                    )}
                  </View>
                </ScrollView>
              )}
            </>
          )}
        </View>
        </KeyboardAvoidingView>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.75)',
    justifyContent: 'flex-end',
  },
  modalKeyboardAvoid: {
    width: '100%',
    height: '100%',
    justifyContent: 'flex-end',
  },
  modalContainer: {
    backgroundColor: '#0F141C',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
    height: '88%',
    paddingTop: 16,
    paddingHorizontal: 16,
  },
  tabScrollContent: {
    paddingBottom: 24,
  },
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  topBarLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  topBarTitle: {
    color: COLORS.textPrimary,
    fontSize: 16,
    fontWeight: '700',
  },
  closeButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  tabRow: {
    flexDirection: 'row',
    backgroundColor: 'rgba(255, 255, 255, 0.04)',
    borderRadius: 12,
    padding: 3,
    marginBottom: 14,
  },
  tabButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 8,
    borderRadius: 10,
  },
  tabButtonActive: {
    backgroundColor: 'rgba(0, 240, 255, 0.12)',
    borderWidth: 1,
    borderColor: 'rgba(0, 240, 255, 0.3)',
  },
  tabText: {
    color: COLORS.textMuted,
    fontSize: 12,
    fontWeight: '600',
  },
  tabTextActive: {
    color: '#00F0FF',
    fontWeight: '700',
  },
  tabContent: {
    flex: 1,
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 8,
    gap: 8,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
  },
  searchInput: {
    flex: 1,
    color: COLORS.textPrimary,
    fontSize: 14,
  },
  sourceFilterRow: {
    flexDirection: 'row',
    gap: 6,
    marginBottom: 12,
  },
  sourceFilterChip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    backgroundColor: 'rgba(255, 255, 255, 0.04)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
  },
  sourceFilterChipActive: {
    backgroundColor: '#00F0FF',
    borderColor: '#00F0FF',
  },
  sourceFilterText: {
    color: COLORS.textSecondary,
    fontSize: 11,
    fontWeight: '600',
  },
  sourceFilterTextActive: {
    color: '#080B10',
    fontWeight: '700',
  },
  resultsList: {
    flex: 1,
  },
  emptySearchResults: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 40,
    paddingHorizontal: 20,
    gap: 8,
  },
  emptySearchTitle: {
    color: COLORS.textPrimary,
    fontSize: 14,
    fontWeight: '700',
    marginTop: 4,
  },
  emptySearchSub: {
    color: COLORS.textMuted,
    fontSize: 12,
    textAlign: 'center',
    lineHeight: 16,
  },
  resultItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 8,
    paddingHorizontal: 10,
    backgroundColor: 'rgba(255, 255, 255, 0.02)',
    borderRadius: 10,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.04)',
    gap: 10,
  },
  resultThumb: {
    width: 38,
    height: 38,
    borderRadius: 8,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
  },
  resultPlaceholderThumb: {
    width: 38,
    height: 38,
    borderRadius: 8,
    backgroundColor: 'rgba(255, 255, 255, 0.04)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  resultMain: {
    flex: 1,
    paddingRight: 4,
  },
  resultName: {
    color: COLORS.textPrimary,
    fontSize: 13,
    fontWeight: '600',
  },
  resultBrand: {
    color: '#38BDF8',
    fontSize: 11,
    fontWeight: '500',
    marginTop: 1,
  },
  resultNutrients: {
    color: COLORS.textSecondary,
    fontSize: 11,
    marginTop: 2,
  },
  resultRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  miniSourceBadge: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
  },
  miniSourceText: {
    fontSize: 9,
    fontWeight: '700',
  },
  sectionSubtitle: {
    color: COLORS.textSecondary,
    fontSize: 12,
    marginBottom: 10,
    lineHeight: 16,
  },
  barcodeInputRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 10,
  },
  barcodeInput: {
    flex: 1,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderRadius: 12,
    paddingHorizontal: 12,
    color: COLORS.textPrimary,
    fontSize: 14,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
  },
  barcodeLookupBtn: {
    backgroundColor: '#00F0FF',
    paddingHorizontal: 16,
    justifyContent: 'center',
    borderRadius: 12,
  },
  barcodeLookupText: {
    color: '#080B10',
    fontSize: 13,
    fontWeight: '700',
  },
  barcodeErrorText: {
    color: '#EF4444',
    fontSize: 12,
    marginBottom: 8,
  },
  nlpBox: {
    backgroundColor: 'rgba(255, 255, 255, 0.03)',
    borderRadius: 12,
    padding: 10,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
    gap: 8,
  },
  nlpHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  gemmaPill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 240, 255, 0.12)',
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: 6,
    gap: 4,
  },
  gemmaPillText: {
    color: '#00F0FF',
    fontSize: 9,
    fontWeight: '900',
    letterSpacing: 0.8,
  },
  nlpInput: {
    color: COLORS.textPrimary,
    fontSize: 13,
    minHeight: 50,
    textAlignVertical: 'top',
  },
  decomposeBtn: {
    backgroundColor: '#00F0FF',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 10,
    borderRadius: 10,
  },
  decomposeBtnText: {
    color: '#080B10',
    fontSize: 13,
    fontWeight: '700',
  },
  // Review sheet styles
  reviewContent: {
    flex: 1,
  },
  reviewHeaderCard: {
    backgroundColor: 'rgba(255, 255, 255, 0.03)',
    borderRadius: 14,
    padding: 14,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
  },
  reviewTitleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 14,
  },
  reviewTitleRight: {
    alignItems: 'flex-end',
    gap: 4,
  },
  offQuantityBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 7,
    paddingVertical: 2.5,
    borderRadius: 6,
    backgroundColor: 'rgba(0, 240, 255, 0.1)',
    borderWidth: 1,
    borderColor: 'rgba(0, 240, 255, 0.25)',
  },
  offQuantityBadgeText: {
    fontSize: 9.5,
    fontWeight: '700',
    color: '#00F0FF',
  },
  quickGramChipOff: {
    backgroundColor: 'rgba(0, 240, 255, 0.08)',
    borderWidth: 1,
    borderColor: 'rgba(0, 240, 255, 0.25)',
  },
  quickGramTextOff: {
    color: '#00F0FF',
    fontWeight: '700',
  },
  reviewFoodName: {
    color: COLORS.textPrimary,
    fontSize: 16,
    fontWeight: '700',
  },
  reviewFoodBrand: {
    color: COLORS.textMuted,
    fontSize: 12,
    marginTop: 2,
  },
  sourceTag: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  sourceTagText: {
    fontSize: 10,
    fontWeight: '700',
  },
  subSectionTitle: {
    color: COLORS.strict.accent,
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 0.8,
    marginBottom: 8,
  },
  mealChipRow: {
    flexDirection: 'row',
    gap: 6,
  },
  mealChip: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 6,
    backgroundColor: 'rgba(255, 255, 255, 0.04)',
    borderRadius: 8,
  },
  mealChipActive: {
    backgroundColor: 'rgba(0, 240, 255, 0.15)',
    borderWidth: 1,
    borderColor: 'rgba(0, 240, 255, 0.4)',
  },
  mealChipText: {
    color: COLORS.textMuted,
    fontSize: 10,
    fontWeight: '700',
  },
  mealChipTextActive: {
    color: '#00F0FF',
  },
  stepperContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 16,
    marginBottom: 10,
  },
  stepBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepperDisplay: {
    alignItems: 'center',
    minWidth: 90,
  },
  stepperNumber: {
    color: COLORS.textPrimary,
    fontSize: 26,
    fontWeight: '800',
  },
  stepperUnit: {
    color: COLORS.textMuted,
    fontSize: 11,
  },
  quickGramsRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 8,
  },
  quickGramChip: {
    paddingHorizontal: 12,
    paddingVertical: 5,
    backgroundColor: 'rgba(255, 255, 255, 0.04)',
    borderRadius: 12,
  },
  quickGramChipActive: {
    backgroundColor: 'rgba(0, 240, 255, 0.15)',
    borderWidth: 1,
    borderColor: '#00F0FF',
  },
  quickGramText: {
    color: COLORS.textSecondary,
    fontSize: 11,
    fontWeight: '600',
  },
  quickGramTextActive: {
    color: '#00F0FF',
    fontWeight: '700',
  },
  nutrientsSummaryCard: {
    backgroundColor: 'rgba(255, 255, 255, 0.03)',
    borderRadius: 14,
    padding: 14,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
  },
  calorieHighlight: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 6,
    marginBottom: 12,
  },
  calorieBigText: {
    color: COLORS.textPrimary,
    fontSize: 24,
    fontWeight: '800',
  },
  calorieBigUnit: {
    color: '#FF6B35',
    fontSize: 13,
    fontWeight: '700',
  },
  macrosFourRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 14,
  },
  macroMiniBox: {
    flex: 1,
    backgroundColor: 'rgba(255, 255, 255, 0.03)',
    borderRadius: 8,
    padding: 8,
  },
  macroMiniLabel: {
    color: COLORS.textMuted,
    fontSize: 9,
    fontWeight: '700',
  },
  macroMiniVal: {
    fontSize: 13,
    fontWeight: '700',
    marginTop: 2,
  },
  microsSubHeading: {
    color: COLORS.textSecondary,
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 0.8,
    marginBottom: 8,
  },
  microAssayGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
  microChip: {
    width: '31%',
    backgroundColor: 'rgba(255, 255, 255, 0.02)',
    paddingHorizontal: 8,
    paddingVertical: 5,
    borderRadius: 6,
  },
  microChipLabel: {
    color: COLORS.textMuted,
    fontSize: 9,
  },
  microChipVal: {
    color: COLORS.textPrimary,
    fontSize: 11,
    fontWeight: '600',
    marginTop: 1,
  },
  dockedFooter: {
    paddingTop: 8,
    paddingBottom: 8,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255, 255, 255, 0.08)',
    backgroundColor: '#0F141C',
  },
  confirmLogButton: {
    backgroundColor: '#00F0FF',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 14,
    borderRadius: 14,
  },
  confirmLogButtonText: {
    color: '#080B10',
    fontSize: 14,
    fontWeight: '800',
    letterSpacing: 0.3,
  },
  // Photo & Camera Action Styles
  photoActionsRow: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 12,
  },
  cameraPrimaryBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: '#00F0FF',
    paddingVertical: 12,
    borderRadius: 12,
  },
  cameraPrimaryBtnText: {
    color: '#080B10',
    fontSize: 13,
    fontWeight: '800',
    letterSpacing: 0.3,
  },
  gallerySecondaryBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: 'rgba(0, 240, 255, 0.08)',
    borderWidth: 1,
    borderColor: 'rgba(0, 240, 255, 0.25)',
    paddingVertical: 12,
    borderRadius: 12,
  },
  gallerySecondaryBtnText: {
    color: '#00F0FF',
    fontSize: 13,
    fontWeight: '700',
  },
  capturedPhotoCard: {
    borderRadius: 14,
    overflow: 'hidden',
    backgroundColor: 'rgba(255, 255, 255, 0.04)',
    borderWidth: 1,
    borderColor: 'rgba(0, 240, 255, 0.25)',
    marginBottom: 12,
  },
  capturedImage: {
    width: '100%',
    height: 180,
    resizeMode: 'cover',
  },
  capturedPhotoHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 12,
    paddingVertical: 8,
    backgroundColor: '#0F141C',
  },
  photoBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'rgba(0, 240, 255, 0.12)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  photoBadgeText: {
    color: '#00F0FF',
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  retakeBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
  },
  retakeBtnText: {
    color: COLORS.textMuted,
    fontSize: 11,
    fontWeight: '600',
  },
  photoAnalyzingOverlay: {
    ...StyleSheet.absoluteFill,
    backgroundColor: 'rgba(8, 11, 16, 0.88)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 16,
    gap: 8,
    zIndex: 10,
  },
  photoAnalyzingTitle: {
    color: '#00F0FF',
    fontSize: 14,
    fontWeight: '700',
    letterSpacing: 0.5,
    marginTop: 4,
  },
  photoAnalyzingSub: {
    color: COLORS.textSecondary,
    fontSize: 12,
    textAlign: 'center',
    lineHeight: 16,
  },
  photoErrorBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: 'rgba(255, 107, 53, 0.12)',
    borderWidth: 1,
    borderColor: 'rgba(255, 107, 53, 0.35)',
    borderRadius: 12,
    padding: 12,
    marginBottom: 12,
  },
  photoErrorTextCol: {
    flex: 1,
  },
  photoErrorTitle: {
    color: '#FF6B35',
    fontSize: 13,
    fontWeight: '700',
  },
  photoErrorSub: {
    color: COLORS.textSecondary,
    fontSize: 11,
    marginTop: 2,
    lineHeight: 15,
  },
  retryAnalysisBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 8,
    alignSelf: 'flex-start',
    backgroundColor: 'rgba(0, 240, 255, 0.12)',
    borderWidth: 1,
    borderColor: 'rgba(0, 240, 255, 0.3)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
  },
  retryAnalysisBtnText: {
    color: '#00F0FF',
    fontSize: 12,
    fontWeight: '700',
  },
  nlpLabel: {
    color: COLORS.textSecondary,
    fontSize: 11,
    fontWeight: '600',
    marginBottom: 4,
  },
  // Barcode Camera Scanner Styles
  cameraLoadingBox: {
    height: 180,
    borderRadius: 16,
    backgroundColor: 'rgba(255, 255, 255, 0.03)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    marginBottom: 14,
  },
  cameraLoadingText: {
    color: COLORS.textMuted,
    fontSize: 12,
    fontWeight: '600',
  },
  permissionBox: {
    padding: 20,
    borderRadius: 16,
    backgroundColor: 'rgba(0, 240, 255, 0.04)',
    borderWidth: 1,
    borderColor: 'rgba(0, 240, 255, 0.15)',
    alignItems: 'center',
    gap: 8,
    marginBottom: 14,
  },
  permissionTitle: {
    color: COLORS.textPrimary,
    fontSize: 14,
    fontWeight: '700',
    marginTop: 4,
  },
  permissionSub: {
    color: COLORS.textMuted,
    fontSize: 11,
    textAlign: 'center',
    lineHeight: 16,
    paddingHorizontal: 10,
  },
  permissionButton: {
    marginTop: 6,
    backgroundColor: '#00F0FF',
    paddingHorizontal: 18,
    paddingVertical: 10,
    borderRadius: 10,
  },
  permissionButtonText: {
    color: '#080B10',
    fontSize: 12,
    fontWeight: '800',
  },
  scannerWrapper: {
    height: 220,
    borderRadius: 16,
    overflow: 'hidden',
    backgroundColor: '#000000',
    borderWidth: 1,
    borderColor: 'rgba(0, 240, 255, 0.3)',
    marginBottom: 14,
    position: 'relative',
  },
  scannerCamera: {
    width: '100%',
    height: '100%',
  },
  scannerOverlay: {
    ...StyleSheet.absoluteFill,
    backgroundColor: 'rgba(0, 0, 0, 0.25)',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
    paddingHorizontal: 14,
  },
  scannerHeaderRow: {
    width: '100%',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  liveIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: 'rgba(8, 11, 16, 0.75)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  liveDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#10B981',
  },
  liveText: {
    color: '#10B981',
    fontSize: 9,
    fontWeight: '800',
    letterSpacing: 0.8,
  },
  torchButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: 'rgba(8, 11, 16, 0.75)',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  torchButtonActive: {
    backgroundColor: '#00F0FF',
    borderColor: '#00F0FF',
  },
  reticleBox: {
    width: 220,
    height: 120,
    position: 'relative',
    alignItems: 'center',
    justifyContent: 'center',
  },
  reticleCorner: {
    position: 'absolute',
    width: 20,
    height: 20,
    borderColor: '#00F0FF',
  },
  cornerTL: {
    top: 0,
    left: 0,
    borderTopWidth: 3,
    borderLeftWidth: 3,
    borderTopLeftRadius: 6,
  },
  cornerTR: {
    top: 0,
    right: 0,
    borderTopWidth: 3,
    borderRightWidth: 3,
    borderTopRightRadius: 6,
  },
  cornerBL: {
    bottom: 0,
    left: 0,
    borderBottomWidth: 3,
    borderLeftWidth: 3,
    borderBottomLeftRadius: 6,
  },
  cornerBR: {
    bottom: 0,
    right: 0,
    borderBottomWidth: 3,
    borderRightWidth: 3,
    borderBottomRightRadius: 6,
  },
  laserLine: {
    width: '90%',
    height: 2,
    backgroundColor: 'rgba(0, 240, 255, 0.75)',
    shadowColor: '#00F0FF',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.9,
    shadowRadius: 5,
  },
  scannerInstruction: {
    color: 'rgba(255, 255, 255, 0.85)',
    fontSize: 11,
    fontWeight: '600',
    backgroundColor: 'rgba(8, 11, 16, 0.65)',
    paddingHorizontal: 10,
    paddingVertical: 3,
    borderRadius: 8,
  },
  scanningLookupOverlay: {
    ...StyleSheet.absoluteFill,
    backgroundColor: 'rgba(8, 11, 16, 0.85)',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
  },
  scanningLookupText: {
    color: '#00F0FF',
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 0.3,
  },
  // Plate Snap Styles (AI Snap Tab)
  plateSnapCard: {
    backgroundColor: 'rgba(0, 240, 255, 0.04)',
    borderRadius: 14,
    padding: 14,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: 'rgba(0, 240, 255, 0.18)',
  },
  plateSnapHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  plateSnapBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 240, 255, 0.15)',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    gap: 4,
  },
  plateSnapBadgeText: {
    color: '#00F0FF',
    fontSize: 9,
    fontWeight: '900',
    letterSpacing: 0.8,
  },
  plateSnapModelName: {
    color: '#E0E7FF',
    fontSize: 11,
    fontWeight: '700',
  },
  plateSnapTitle: {
    color: COLORS.textPrimary,
    fontSize: 15,
    fontWeight: '800',
    marginBottom: 4,
  },
  plateSnapDesc: {
    color: COLORS.textSecondary,
    fontSize: 12,
    lineHeight: 17,
    marginBottom: 12,
  },
  snapDividerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 14,
    gap: 10,
  },
  snapDividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
  },
  snapDividerText: {
    color: COLORS.textMuted,
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 1,
  },

  // Barcode Error & Quick Fallback
  barcodeErrorCard: {
    backgroundColor: 'rgba(255, 107, 53, 0.08)',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(255, 107, 53, 0.3)',
    padding: 12,
    marginTop: 10,
    marginBottom: 14,
    gap: 8,
  },
  barcodeErrorHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  barcodeErrorTitle: {
    color: '#FF6B35',
    fontSize: 13,
    fontWeight: '700',
  },
  barcodeErrorCardText: {
    color: COLORS.textSecondary,
    fontSize: 12,
    lineHeight: 16,
  },
  quickScanLabelBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: '#00F0FF',
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderRadius: 10,
    marginTop: 4,
  },
  quickScanLabelBtnText: {
    color: '#080B10',
    fontSize: 12,
    fontWeight: '800',
    letterSpacing: 0.3,
  },

  // Persistent Nutrition Label Scan Card (Barcode Tab)
  labelScanCard: {
    backgroundColor: 'rgba(255, 255, 255, 0.03)',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
    padding: 14,
    marginTop: 12,
    marginBottom: 16,
  },
  labelScanHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  labelScanBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 240, 255, 0.12)',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    gap: 4,
  },
  labelScanBadgeText: {
    color: '#00F0FF',
    fontSize: 9,
    fontWeight: '900',
    letterSpacing: 0.8,
  },
  labelScanCardSubTitle: {
    color: COLORS.textMuted,
    fontSize: 11,
    fontWeight: '600',
  },
  labelScanCardTitle: {
    color: COLORS.textPrimary,
    fontSize: 14,
    fontWeight: '800',
    marginBottom: 4,
  },
  labelScanCardSub: {
    color: COLORS.textSecondary,
    fontSize: 12,
    lineHeight: 17,
    marginBottom: 12,
  },
  labelScanBtnRow: {
    flexDirection: 'row',
    gap: 10,
  },
  labelCameraBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: '#00F0FF',
    paddingVertical: 11,
    borderRadius: 10,
  },
  labelCameraBtnText: {
    color: '#080B10',
    fontSize: 12,
    fontWeight: '800',
    letterSpacing: 0.3,
  },
  labelGalleryBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: 'rgba(0, 240, 255, 0.08)',
    borderWidth: 1,
    borderColor: 'rgba(0, 240, 255, 0.25)',
    paddingVertical: 11,
    borderRadius: 10,
  },
  labelGalleryBtnText: {
    color: '#00F0FF',
    fontSize: 12,
    fontWeight: '700',
  },
  labelExtractingBox: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    marginTop: 12,
    paddingVertical: 8,
    backgroundColor: 'rgba(0, 240, 255, 0.05)',
    borderRadius: 8,
  },
  labelExtractingText: {
    color: '#00F0FF',
    fontSize: 12,
    fontWeight: '600',
  },
  labelErrorBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 10,
    padding: 8,
    backgroundColor: 'rgba(255, 107, 53, 0.1)',
    borderRadius: 8,
  },
  labelErrorText: {
    color: '#FF6B35',
    fontSize: 11,
    flex: 1,
    lineHeight: 15,
  },
  qwenAlertCard: {
    backgroundColor: 'rgba(255, 179, 0, 0.08)',
    borderWidth: 1,
    borderColor: 'rgba(255, 179, 0, 0.25)',
    borderRadius: 12,
    padding: 12,
    marginBottom: 12,
  },
  qwenAlertHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
    marginBottom: 5,
  },
  qwenAlertTitle: {
    fontSize: 12,
    fontWeight: '700',
    color: COLORS.warning,
  },
  qwenAlertDesc: {
    fontSize: 11,
    color: COLORS.textSecondary,
    lineHeight: 16,
    marginBottom: 10,
  },
  qwenActionRow: {
    flexDirection: 'row',
    gap: 8,
  },
  qwenActionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#00F0FF',
    paddingVertical: 7,
    paddingHorizontal: 12,
    borderRadius: 8,
  },
  qwenActionBtnText: {
    fontSize: 11,
    fontWeight: '800',
    color: '#080B10',
  },
  projectorDownloadPrompt: {
    backgroundColor: 'rgba(0, 240, 255, 0.05)',
    borderWidth: 1,
    borderColor: 'rgba(0, 240, 255, 0.2)',
    borderRadius: 10,
    padding: 10,
    marginBottom: 12,
  },
  projectorDownloadTitle: {
    color: '#00F0FF',
    fontSize: 12,
    fontWeight: '700',
    marginBottom: 4,
  },
  projectorDownloadSub: {
    color: COLORS.textSecondary,
    fontSize: 11,
    lineHeight: 15,
    marginBottom: 8,
  },
  projectorProgressContainer: {
    marginTop: 4,
  },
  projectorProgressText: {
    color: '#00F0FF',
    fontSize: 11,
    fontWeight: '700',
    marginBottom: 4,
  },
  projectorProgressBarBg: {
    height: 6,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 3,
    overflow: 'hidden',
  },
  projectorProgressBarFill: {
    height: '100%',
    backgroundColor: '#00F0FF',
    borderRadius: 3,
  },
  downloadProjectorBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: '#00F0FF',
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 8,
  },
  downloadProjectorBtnText: {
    color: '#080B10',
    fontSize: 11,
    fontWeight: '800',
  },
  photoErrorActionsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 6,
  },
  downloadProjectorSmallBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingVertical: 5,
    paddingHorizontal: 8,
    backgroundColor: 'rgba(0, 240, 255, 0.1)',
    borderRadius: 6,
    borderWidth: 1,
    borderColor: 'rgba(0, 240, 255, 0.3)',
  },
  downloadProjectorSmallBtnText: {
    color: '#00F0FF',
    fontSize: 11,
    fontWeight: '700',
  },
  reviewImageContainer: {
    width: '100%',
    height: 160,
    borderRadius: 10,
    overflow: 'hidden',
    marginBottom: 12,
    position: 'relative',
    backgroundColor: 'rgba(0, 0, 0, 0.4)',
  },
  reviewImage: {
    width: '100%',
    height: '100%',
  },
  reviewImageBadge: {
    position: 'absolute',
    top: 8,
    left: 8,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'rgba(8, 11, 16, 0.85)',
    paddingVertical: 3,
    paddingHorizontal: 7,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: 'rgba(0, 240, 255, 0.4)',
  },
  reviewImageBadgeText: {
    fontSize: 9,
    fontWeight: '800',
    color: '#00F0FF',
    letterSpacing: 0.5,
  },
  decomposedIngredientsCard: {
    backgroundColor: 'rgba(255, 255, 255, 0.03)',
    borderRadius: 14,
    padding: 14,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: 'rgba(0, 240, 255, 0.2)',
  },
  decomposedCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
    paddingBottom: 10,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.06)',
  },
  decomposedCardTitleLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flex: 1,
    paddingRight: 8,
  },
  decomposedIconWrap: {
    width: 28,
    height: 28,
    borderRadius: 8,
    backgroundColor: 'rgba(0, 240, 255, 0.12)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  decomposedCardTitle: {
    color: COLORS.textPrimary,
    fontSize: 13,
    fontWeight: '700',
    letterSpacing: 0.2,
  },
  decomposedCardSub: {
    color: COLORS.textMuted,
    fontSize: 10,
    marginTop: 2,
  },
  decomposedCountBadge: {
    paddingHorizontal: 7,
    paddingVertical: 3,
    borderRadius: 6,
    backgroundColor: 'rgba(16, 185, 129, 0.12)',
    borderWidth: 1,
    borderColor: 'rgba(16, 185, 129, 0.3)',
  },
  decomposedCountBadgeText: {
    fontSize: 9.5,
    fontWeight: '800',
    color: '#10B981',
    letterSpacing: 0.5,
  },
  decomposedList: {
    gap: 8,
  },
  ingredientRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.04)',
    gap: 10,
  },
  ingredientRowLast: {
    borderBottomWidth: 0,
    paddingBottom: 2,
  },
  ingredientIconCol: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  ingredientIconWrap: {
    width: 26,
    height: 26,
    borderRadius: 7,
    alignItems: 'center',
    justifyContent: 'center',
  },
  ingredientIconWrapUsda: {
    backgroundColor: 'rgba(16, 185, 129, 0.12)',
  },
  ingredientIconWrapAi: {
    backgroundColor: 'rgba(245, 158, 11, 0.12)',
  },
  ingredientInfoCol: {
    flex: 1,
  },
  ingredientNameText: {
    color: COLORS.textPrimary,
    fontSize: 12.5,
    fontWeight: '600',
    lineHeight: 16,
  },
  ingredientMetaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 3,
  },
  ingredientSourceBadge: {
    paddingHorizontal: 5,
    paddingVertical: 1.5,
    borderRadius: 4,
  },
  ingredientSourceBadgeUsda: {
    backgroundColor: 'rgba(16, 185, 129, 0.15)',
  },
  ingredientSourceBadgeAi: {
    backgroundColor: 'rgba(245, 158, 11, 0.15)',
  },
  ingredientSourceBadgeText: {
    fontSize: 8.5,
    fontWeight: '800',
    letterSpacing: 0.3,
  },
  ingredientGramsText: {
    color: '#00F0FF',
    fontSize: 10.5,
    fontWeight: '700',
  },
  ingredientNutrientCol: {
    alignItems: 'flex-end',
  },
  ingredientCalsText: {
    color: '#FF6B35',
    fontSize: 12,
    fontWeight: '700',
  },
  ingredientMacrosText: {
    fontSize: 9.5,
    fontWeight: '600',
    marginTop: 2,
  },
});

import React, { useState, useEffect } from 'react';
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
} from 'react-native';
import { CameraView, useCameraPermissions } from 'expo-camera';
import * as ImagePicker from 'expo-image-picker';
import { FoodItem, MealType, NutrientProfile } from '../../types/nutrition';
import { searchAllFoods, fetchProductByBarcode } from '../../services/nutrition/openFoodFactsService';
import {
  decomposeMealText,
  PHOTO_MEAL_PRESETS,
  MealDecompositionResult,
} from '../../services/nutrition/mealDecomposer';
import { calculateNutrientsForGrams } from '../../store/useNutritionStore';
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
} from 'lucide-react-native';

interface FoodSearchAndReviewModalProps {
  visible: boolean;
  initialMealType: MealType;
  onClose: () => void;
  onLogFood: (food: FoodItem, mealType: MealType, servings: number, consumedGrams: number) => void;
}

type ModalTab = 'snap' | 'search' | 'barcode';

const DEMO_BARCODES = [
  { label: 'Fairlife Core Power', code: '0856312002772' },
  { label: 'Quest Protein Bar', code: '888849000010' },
  { label: 'Chobani Greek Yogurt', code: '0894700010045' },
  { label: 'Quaker Rolled Oats', code: '0030000010402' },
];

export const FoodSearchAndReviewModal: React.FC<FoodSearchAndReviewModalProps> = ({
  visible,
  initialMealType,
  onClose,
  onLogFood,
}) => {
  const [activeTab, setActiveTab] = useState<ModalTab>('snap');
  const [selectedMealType, setSelectedMealType] = useState<MealType>(initialMealType);

  // Snap / AI & Photo Capture State
  const [capturedImageUri, setCapturedImageUri] = useState<string | null>(null);

  // Barcode Camera Scanner State
  const [permission, requestPermission] = useCameraPermissions();
  const [lastScannedCode, setLastScannedCode] = useState<string | null>(null);
  const [lastScanTime, setLastScanTime] = useState<number>(0);
  const [torchEnabled, setTorchEnabled] = useState(false);

  // Search state
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<FoodItem[]>([]);
  const [isSearching, setIsSearching] = useState(false);

  // Barcode state
  const [barcodeInput, setBarcodeInput] = useState('');
  const [isLookingUpBarcode, setIsLookingUpBarcode] = useState(false);
  const [barcodeError, setBarcodeError] = useState<string | null>(null);

  // AI Meal Snap / Decomposer state
  const [nlpInput, setNlpInput] = useState('');
  const [decompositionResult, setDecompositionResult] = useState<MealDecompositionResult | null>(null);

  // Review Sheet State (when a food item is chosen)
  const [reviewFood, setReviewFood] = useState<FoodItem | null>(null);
  const [consumedGrams, setConsumedGrams] = useState(100);

  // Sync initial meal type when modal opens
  useEffect(() => {
    setSelectedMealType(initialMealType);
  }, [initialMealType, visible]);

  // Initial search load
  useEffect(() => {
    if (visible && activeTab === 'search' && !searchQuery.trim()) {
      handleSearch('');
    }
  }, [visible, activeTab]);

  const handleSearch = async (query: string) => {
    setSearchQuery(query);
    setIsSearching(true);
    try {
      const results = await searchAllFoods(query);
      setSearchResults(results);
    } catch (err) {
      console.warn('Search failed:', err);
    } finally {
      setIsSearching(false);
    }
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
        selectFoodForReview(product);
      } else {
        setBarcodeError(`Product not found for barcode: ${clean}. Try USDA or text search.`);
      }
    } catch {
      setBarcodeError('Failed to query barcode network. Check internet connection.');
    } finally {
      setIsLookingUpBarcode(false);
    }
  };

  const handleTakePhoto = async () => {
    try {
      const { status } = await ImagePicker.requestCameraPermissionsAsync();
      if (status !== 'granted') {
        alert('Camera permission is required to capture photos of meals.');
        return;
      }

      const result = await ImagePicker.launchCameraAsync({
        mediaTypes: ['images'],
        allowsEditing: true,
        aspect: [4, 3],
        quality: 0.85,
      });

      if (!result.canceled && result.assets && result.assets[0]) {
        const uri = result.assets[0].uri;
        setCapturedImageUri(uri);
        if (!nlpInput.trim()) {
          setNlpInput('1 plate of homemade meal with mixed protein and greens');
        }
      }
    } catch (err) {
      console.warn('Error launching camera:', err);
    }
  };

  const handlePickImage = async () => {
    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],
        allowsEditing: true,
        aspect: [4, 3],
        quality: 0.85,
      });

      if (!result.canceled && result.assets && result.assets[0]) {
        const uri = result.assets[0].uri;
        setCapturedImageUri(uri);
        if (!nlpInput.trim()) {
          setNlpInput('1 plate of homemade meal with mixed protein and greens');
        }
      }
    } catch (err) {
      console.warn('Error picking image from library:', err);
    }
  };

  const handleDecomposeText = () => {
    if (!nlpInput.trim()) return;
    const result = decomposeMealText(nlpInput);
    if (capturedImageUri) {
      result.asFoodItem.imageUrl = capturedImageUri;
    }
    setDecompositionResult(result);
    selectFoodForReview(result.asFoodItem, result.totalGrams);
  };

  const handleSelectPreset = (preset: (typeof PHOTO_MEAL_PRESETS)[0]) => {
    const result = decomposeMealText(preset.query);
    result.dishTitle = preset.title;
    result.asFoodItem.name = preset.title;
    result.asFoodItem.imageUrl = preset.imageUrl;
    setDecompositionResult(result);
    selectFoodForReview(result.asFoodItem, result.totalGrams);
  };

  const selectFoodForReview = (food: FoodItem, defaultGrams?: number) => {
    setReviewFood(food);
    setConsumedGrams(defaultGrams ?? food.servingSizeGrams ?? 100);
  };

  const handleConfirmLog = () => {
    if (!reviewFood) return;
    const servings = Math.round((consumedGrams / (reviewFood.servingSizeGrams || 100)) * 10) / 10;
    onLogFood(reviewFood, selectedMealType, servings, consumedGrams);
    // Reset and close
    setReviewFood(null);
    setDecompositionResult(null);
    setCapturedImageUri(null);
    onClose();
  };

  const adjustGrams = (delta: number) => {
    setConsumedGrams((prev) => Math.max(10, Math.min(1500, prev + delta)));
  };

  // Calculate live review nutrients
  const dynamicNutrients: NutrientProfile | null = reviewFood
    ? calculateNutrientsForGrams(reviewFood.nutrientsPer100g, consumedGrams)
    : null;

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <View style={styles.modalOverlay}>
        <KeyboardAvoidingView
          behavior="padding"
          style={styles.modalKeyboardAvoid}
        >
          <View style={styles.modalContainer}>
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
                } else {
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
                <View style={styles.reviewTitleRow}>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.reviewFoodName}>{reviewFood.name}</Text>
                    {reviewFood.brand && (
                      <Text style={styles.reviewFoodBrand}>{reviewFood.brand}</Text>
                    )}
                  </View>
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
                        ? 'AI Decomposed'
                        : 'Open Food Facts'}
                    </Text>
                  </View>
                </View>

                {/* Target Meal Type Chips */}
                <Text style={styles.subSectionTitle}>TARGET MEAL</Text>
                <View style={styles.mealChipRow}>
                  {(['breakfast', 'lunch', 'dinner', 'snack'] as MealType[]).map((m) => (
                    <TouchableOpacity
                      key={m}
                      style={[
                        styles.mealChip,
                        selectedMealType === m && styles.mealChipActive,
                      ]}
                      onPress={() => setSelectedMealType(m)}
                      activeOpacity={0.7}
                    >
                      <Text
                        style={[
                          styles.mealChipText,
                          selectedMealType === m && styles.mealChipTextActive,
                        ]}
                      >
                        {m.toUpperCase()}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>

                {/* Gram Weight Stepper */}
                <Text style={[styles.subSectionTitle, { marginTop: 16 }]}>PORTION WEIGHT (GRAMS)</Text>
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
                    <Text style={styles.stepperUnit}>grams</Text>
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
                <View style={styles.quickGramsRow}>
                  {[50, 100, 150, 200, 300].map((g) => (
                    <TouchableOpacity
                      key={g}
                      style={[styles.quickGramChip, consumedGrams === g && styles.quickGramChipActive]}
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
                </View>
              </View>

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
                    <Text style={styles.macroMiniLabel}>PROTEIN</Text>
                    <Text style={[styles.macroMiniVal, { color: '#10B981' }]}>
                      {dynamicNutrients.proteinGrams}g
                    </Text>
                  </View>
                  <View style={styles.macroMiniBox}>
                    <Text style={styles.macroMiniLabel}>CARBS</Text>
                    <Text style={[styles.macroMiniVal, { color: '#38BDF8' }]}>
                      {dynamicNutrients.carbsGrams}g
                    </Text>
                  </View>
                  <View style={styles.macroMiniBox}>
                    <Text style={styles.macroMiniLabel}>FAT</Text>
                    <Text style={[styles.macroMiniVal, { color: '#F59E0B' }]}>
                      {dynamicNutrients.fatGrams}g
                    </Text>
                  </View>
                  <View style={styles.macroMiniBox}>
                    <Text style={styles.macroMiniLabel}>FIBER</Text>
                    <Text style={[styles.macroMiniVal, { color: '#A855F7' }]}>
                      {dynamicNutrients.fiberGrams}g
                    </Text>
                  </View>
                </View>

              {/* Key Micronutrients */}
                <Text style={styles.microsSubHeading}>MICRONUTRIENT ASSAY</Text>
                <View style={styles.microAssayGrid}>
                  <View style={styles.microChip}>
                    <Text style={styles.microChipLabel}>Vit A</Text>
                    <Text style={styles.microChipVal}>{dynamicNutrients.vitaminA_mcg} mcg</Text>
                  </View>
                  <View style={styles.microChip}>
                    <Text style={styles.microChipLabel}>Vit C</Text>
                    <Text style={styles.microChipVal}>{dynamicNutrients.vitaminC_mg} mg</Text>
                  </View>
                  <View style={styles.microChip}>
                    <Text style={styles.microChipLabel}>Vit D</Text>
                    <Text style={styles.microChipVal}>{dynamicNutrients.vitaminD_mcg} mcg</Text>
                  </View>
                  <View style={styles.microChip}>
                    <Text style={styles.microChipLabel}>Vit B12</Text>
                    <Text style={styles.microChipVal}>{dynamicNutrients.vitaminB12_mcg} mcg</Text>
                  </View>
                  <View style={styles.microChip}>
                    <Text style={styles.microChipLabel}>Iron</Text>
                    <Text style={styles.microChipVal}>{dynamicNutrients.iron_mg} mg</Text>
                  </View>
                  <View style={styles.microChip}>
                    <Text style={styles.microChipLabel}>Calcium</Text>
                    <Text style={styles.microChipVal}>{dynamicNutrients.calcium_mg} mg</Text>
                  </View>
                  <View style={styles.microChip}>
                    <Text style={styles.microChipLabel}>Magnesium</Text>
                    <Text style={styles.microChipVal}>{dynamicNutrients.magnesium_mg} mg</Text>
                  </View>
                  <View style={styles.microChip}>
                    <Text style={styles.microChipLabel}>Potassium</Text>
                    <Text style={styles.microChipVal}>{dynamicNutrients.potassium_mg} mg</Text>
                  </View>
                  <View style={styles.microChip}>
                    <Text style={styles.microChipLabel}>Sodium</Text>
                    <Text style={styles.microChipVal}>{dynamicNutrients.sodium_mg} mg</Text>
                  </View>
                  <View style={styles.microChip}>
                    <Text style={styles.microChipLabel}>Zinc</Text>
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
                  Log {consumedGrams}g to {selectedMealType.toUpperCase()}
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
                  <Camera size={15} color={activeTab === 'snap' ? '#00F0FF' : COLORS.textMuted} />
                  <Text
                    style={[styles.tabText, activeTab === 'snap' && styles.tabTextActive]}
                  >
                    AI Snap
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
                    Search
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
                    Barcode
                  </Text>
                </TouchableOpacity>
              </View>

              {/* Tab 1: Snap / AI (First Tab) */}
              {activeTab === 'snap' && (
                <ScrollView style={styles.tabContent} showsVerticalScrollIndicator={false}>
                  <Text style={styles.sectionSubtitle}>
                    Capture a meal with your camera or describe your dish to decompose ingredients and track lab micronutrients:
                  </Text>

                  {/* Camera Snap Action Buttons */}
                  <View style={styles.photoActionsRow}>
                    <TouchableOpacity
                      style={styles.cameraPrimaryBtn}
                      onPress={handleTakePhoto}
                      activeOpacity={0.7}
                    >
                      <Camera size={18} color="#080B10" />
                      <Text style={styles.cameraPrimaryBtnText}>Take Meal Photo</Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                      style={styles.gallerySecondaryBtn}
                      onPress={handlePickImage}
                      activeOpacity={0.7}
                    >
                      <ImageIcon size={18} color="#00F0FF" />
                      <Text style={styles.gallerySecondaryBtnText}>Upload Photo</Text>
                    </TouchableOpacity>
                  </View>

                  {/* Captured Photo Preview Card */}
                  {capturedImageUri && (
                    <View style={styles.capturedPhotoCard}>
                      <Image source={{ uri: capturedImageUri }} style={styles.capturedImage} />
                      <View style={styles.capturedPhotoHeader}>
                        <View style={styles.photoBadge}>
                          <Sparkles size={12} color="#00F0FF" />
                          <Text style={styles.photoBadgeText}>PHOTO ATTACHED</Text>
                        </View>
                        <TouchableOpacity
                          style={styles.retakeBtn}
                          onPress={handleTakePhoto}
                          activeOpacity={0.7}
                        >
                          <RotateCcw size={12} color={COLORS.textMuted} />
                          <Text style={styles.retakeBtnText}>Retake</Text>
                        </TouchableOpacity>
                      </View>
                    </View>
                  )}

                  {/* Description & Decomposition Input */}
                  <View style={styles.nlpBox}>
                    <Text style={styles.nlpLabel}>Describe or confirm ingredients:</Text>
                    <TextInput
                      style={styles.nlpInput}
                      placeholder="e.g., 2 eggs, 1 avocado, and 2 slices sourdough bread"
                      placeholderTextColor={COLORS.textMuted}
                      value={nlpInput}
                      onChangeText={setNlpInput}
                      multiline
                    />
                    <TouchableOpacity
                      style={styles.decomposeBtn}
                      onPress={handleDecomposeText}
                      activeOpacity={0.7}
                    >
                      <Sparkles size={16} color="#080B10" />
                      <Text style={styles.decomposeBtnText}>Decompose & Estimate Macros</Text>
                    </TouchableOpacity>
                  </View>

                  <Text style={[styles.sectionSubtitle, { marginTop: 16 }]}>
                    Or Select Instant Chef Plate Preset:
                  </Text>
                  <View style={styles.photoPresetsGrid}>
                    {PHOTO_MEAL_PRESETS.map((preset) => (
                      <TouchableOpacity
                        key={preset.title}
                        style={styles.photoPresetCard}
                        onPress={() => handleSelectPreset(preset)}
                        activeOpacity={0.7}
                      >
                        <Image source={{ uri: preset.imageUrl }} style={styles.presetImage} />
                        <View style={styles.presetOverlay}>
                          <Text style={styles.presetTitle}>{preset.title}</Text>
                          <Text style={styles.presetCaption} numberOfLines={2}>
                            {preset.caption}
                          </Text>
                        </View>
                      </TouchableOpacity>
                    ))}
                  </View>
                </ScrollView>
              )}

              {/* Tab 2: Search */}
              {activeTab === 'search' && (
                <View style={styles.tabContent}>
                  <View style={styles.searchBar}>
                    <Search size={16} color={COLORS.textSecondary} />
                    <TextInput
                      style={styles.searchInput}
                      placeholder="Search chicken, oats, eggs, protein bar..."
                      placeholderTextColor={COLORS.textMuted}
                      value={searchQuery}
                      onChangeText={handleSearch}
                      autoCapitalize="none"
                      autoCorrect={false}
                    />
                    {isSearching && <ActivityIndicator size="small" color="#00F0FF" />}
                  </View>

                  <ScrollView style={styles.resultsList} showsVerticalScrollIndicator={false}>
                    {searchResults.map((item) => (
                      <TouchableOpacity
                        key={item.id}
                        style={styles.resultItem}
                        onPress={() => selectFoodForReview(item)}
                        activeOpacity={0.7}
                      >
                        <View style={styles.resultMain}>
                          <Text style={styles.resultName} numberOfLines={1}>
                            {item.name}
                          </Text>
                          {item.brand && <Text style={styles.resultBrand}>{item.brand}</Text>}
                          <Text style={styles.resultNutrients}>
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
                              {item.source === 'usda_bundled' ? 'USDA Whole' : 'Open Food Facts'}
                            </Text>
                          </View>
                          <ChevronRight size={16} color={COLORS.textMuted} />
                        </View>
                      </TouchableOpacity>
                    ))}
                  </ScrollView>
                </View>
              )}

              {/* Tab 3: Barcode (with Live Camera Scanner) */}
              {activeTab === 'barcode' && (
                <ScrollView style={styles.tabContent} showsVerticalScrollIndicator={false}>
                  <Text style={styles.sectionSubtitle}>
                    Scan packaged food barcode with camera or enter code manually:
                  </Text>

                  {/* Live Camera Barcode Scanner View */}
                  {!permission ? (
                    <View style={styles.cameraLoadingBox}>
                      <ActivityIndicator size="small" color="#00F0FF" />
                      <Text style={styles.cameraLoadingText}>Initializing Camera...</Text>
                    </View>
                  ) : !permission.granted ? (
                    <View style={styles.permissionBox}>
                      <Camera size={32} color="#00F0FF" />
                      <Text style={styles.permissionTitle}>Camera Access Required</Text>
                      <Text style={styles.permissionSub}>
                        Grant camera permission to scan barcodes directly off food packages in real time.
                      </Text>
                      <TouchableOpacity
                        style={styles.permissionButton}
                        onPress={requestPermission}
                        activeOpacity={0.7}
                      >
                        <Text style={styles.permissionButtonText}>Enable Camera</Text>
                      </TouchableOpacity>
                    </View>
                  ) : (
                    <View style={styles.scannerWrapper}>
                      <CameraView
                        style={styles.scannerCamera}
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
                      >
                        {/* Viewfinder Overlay with Reticle & Controls */}
                        <View style={styles.scannerOverlay}>
                          <View style={styles.scannerHeaderRow}>
                            <View style={styles.liveIndicator}>
                              <View style={styles.liveDot} />
                              <Text style={styles.liveText}>LIVE SCANNER</Text>
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
                            Align barcode inside frame
                          </Text>
                        </View>

                        {isLookingUpBarcode && (
                          <View style={styles.scanningLookupOverlay}>
                            <ActivityIndicator size="large" color="#00F0FF" />
                            <Text style={styles.scanningLookupText}>Looking up product in Open Food Facts...</Text>
                          </View>
                        )}
                      </CameraView>
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
                        <Text style={styles.barcodeLookupText}>Lookup</Text>
                      )}
                    </TouchableOpacity>
                  </View>

                  {barcodeError && (
                    <Text style={styles.barcodeErrorText}>{barcodeError}</Text>
                  )}

                  <Text style={[styles.sectionSubtitle, { marginTop: 16 }]}>
                    Try Popular Grocery Barcodes:
                  </Text>
                  <View style={styles.barcodePresetsRow}>
                    {DEMO_BARCODES.map((item) => (
                      <TouchableOpacity
                        key={item.code}
                        style={styles.demoBarcodeChip}
                        onPress={() => handleBarcodeLookup(item.code)}
                        activeOpacity={0.7}
                      >
                        <Text style={styles.demoBarcodeLabel}>{item.label}</Text>
                        <Text style={styles.demoBarcodeCode}>{item.code}</Text>
                      </TouchableOpacity>
                    ))}
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
    padding: 16,
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
    marginBottom: 12,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
  },
  searchInput: {
    flex: 1,
    color: COLORS.textPrimary,
    fontSize: 14,
  },
  resultsList: {
    flex: 1,
  },
  resultItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 10,
    paddingHorizontal: 12,
    backgroundColor: 'rgba(255, 255, 255, 0.02)',
    borderRadius: 10,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.04)',
  },
  resultMain: {
    flex: 1,
    paddingRight: 8,
  },
  resultName: {
    color: COLORS.textPrimary,
    fontSize: 13,
    fontWeight: '600',
  },
  resultBrand: {
    color: COLORS.textMuted,
    fontSize: 11,
    marginTop: 1,
  },
  resultNutrients: {
    color: COLORS.textSecondary,
    fontSize: 11,
    marginTop: 3,
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
  barcodePresetsRow: {
    gap: 8,
  },
  demoBarcodeChip: {
    backgroundColor: 'rgba(255, 255, 255, 0.03)',
    borderRadius: 10,
    padding: 10,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.06)',
  },
  demoBarcodeLabel: {
    color: COLORS.textPrimary,
    fontSize: 13,
    fontWeight: '600',
  },
  demoBarcodeCode: {
    color: COLORS.textMuted,
    fontSize: 11,
    marginTop: 2,
    fontFamily: 'monospace',
  },
  nlpBox: {
    backgroundColor: 'rgba(255, 255, 255, 0.03)',
    borderRadius: 12,
    padding: 10,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
    gap: 8,
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
  photoPresetsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  photoPresetCard: {
    width: '48%',
    height: 110,
    borderRadius: 12,
    overflow: 'hidden',
    position: 'relative',
  },
  presetImage: {
    width: '100%',
    height: '100%',
  },
  presetOverlay: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    padding: 6,
    backgroundColor: 'rgba(8, 11, 16, 0.85)',
  },
  presetTitle: {
    color: COLORS.textPrimary,
    fontSize: 11,
    fontWeight: '700',
  },
  presetCaption: {
    color: COLORS.textMuted,
    fontSize: 9,
    marginTop: 1,
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
});

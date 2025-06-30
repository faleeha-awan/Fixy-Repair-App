import React, { useEffect, useState } from 'react';
import { useLocalSearchParams } from 'expo-router';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  Image,
  ActivityIndicator,
  TouchableOpacity,
} from 'react-native';
import { supabase } from '@/lib/supabase';
import { CheckCircle, Clock, CircleAlert, Volume2 } from 'lucide-react-native';
import * as Speech from 'expo-speech';
import { Picker } from '@react-native-picker/picker';

// Mock translation function (replace with real API for actual translation)
const translateText = async (text: string, targetLang: string) => {
  if (targetLang === 'en') return text;
  const map: any = {
    es: '[Spanish] ' + text,
    fr: '[French] ' + text,
    de: '[German] ' + text,
  };
  return map[targetLang] || text;
};

export default function GuideDetailScreen() {
  const { id } = useLocalSearchParams();
  const [guide, setGuide] = useState<any>(null);
  const [steps, setSteps] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [language, setLanguage] = useState('en');

  useEffect(() => {
    if (id) {
      fetchGuideAndSteps(id as string);
    }
  }, [id]);

  const fetchGuideAndSteps = async (guideId: string) => {
    setLoading(true);
    try {
      const { data: guideData, error: guideError } = await supabase
        .from('Repair_Guides')
        .select('*')
        .eq('id', guideId)
        .single();

      if (guideError) throw guideError;

      const { data: stepData, error: stepError } = await supabase
        .from('Repair_Steps')
        .select('*')
        .eq('guide_id', guideId)
        .order('step_number', { ascending: true });

      if (stepError) throw stepError;

      setGuide(guideData);
      setSteps(stepData);
    } catch (err) {
      console.error('Error loading guide:', err);
    } finally {
      setLoading(false);
    }
  };

  const speakStep = async (title: string, instruction: string) => {
    const fullText = `${title}. ${instruction || ''}`;
    const translated = await translateText(fullText, language);
    Speech.speak(translated, {
      language,
      pitch: 1.0,
      rate: 1.0,
    });
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#FF6B35" />
        <Text style={styles.loadingText}>Loading guide...</Text>
      </View>
    );
  }

  if (!guide) {
    return (
      <View style={styles.loadingContainer}>
        <CircleAlert size={48} color="#EF4444" />
        <Text style={styles.loadingText}>Guide not found.</Text>
      </View>
    );
  }

  return (
    <ScrollView style={styles.container}>
      <Text style={styles.title}>{guide.title}</Text>
      <Text style={styles.deviceName}>{guide.device_name}</Text>

      <View style={styles.meta}>
        <Clock size={16} color="#6B7280" />
        <Text style={styles.metaText}>
          {guide.time_required || guide.estimated_time || 'N/A'}
        </Text>
        <Text style={styles.metaText}>•</Text>
        <Text style={styles.metaText}>{guide.difficulty}</Text>
      </View>

      {guide.summary && <Text style={styles.summary}>{guide.summary}</Text>}

      {/* Language Picker */}
      <Text style={styles.sectionTitle}>Choose Language</Text>
      <View style={styles.pickerContainer}>
        <Picker
          selectedValue={language}
          onValueChange={(itemValue) => setLanguage(itemValue)}
          style={styles.picker}
        >
          <Picker.Item label="English" value="en" />
          <Picker.Item label="Spanish" value="es" />
          <Picker.Item label="French" value="fr" />
          <Picker.Item label="German" value="de" />
        </Picker>
      </View>

      <Text style={styles.sectionTitle}>Step-by-Step Instructions</Text>
      {steps.length === 0 ? (
        <Text style={styles.empty}>No steps available.</Text>
      ) : (
        steps.map((step, index) => {
          const titleText = `Step ${index + 1}: ${step.title || 'Untitled Step'}`;
          const instructionText = step.instruction || step.text_rendered || '';
          return (
            <View key={step.id} style={styles.stepBox}>
              <View style={styles.stepHeader}>
                <CheckCircle color="#10B981" size={18} />
                <Text style={styles.stepTitle}>{titleText}</Text>
              </View>

              {step.image_url && (
                <Image
                  source={{ uri: step.image_url }}
                  style={styles.stepImage}
                  resizeMode="contain"
                />
              )}

              {instructionText ? (
                <Text style={styles.stepInstruction}>{instructionText}</Text>
              ) : null}

              <TouchableOpacity
                onPress={() => speakStep(titleText, instructionText)}
                style={styles.speechButton}
              >
                <Volume2 color="#FFFFFF" size={18} strokeWidth={2} />
                <Text style={styles.speechButtonText}>Speak</Text>
              </TouchableOpacity>
            </View>
          );
        })
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#FFF',
    padding: 16,
  },
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 32,
  },
  loadingText: {
    marginTop: 12,
    fontSize: 16,
    color: '#6B7280',
    fontWeight: '500',
  },
  title: {
    fontSize: 22,
    fontWeight: '700',
    color: '#111827',
    marginBottom: 4,
  },
  deviceName: {
    fontSize: 14,
    color: '#6B7280',
    marginBottom: 4,
  },
  meta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 12,
  },
  metaText: {
    fontSize: 14,
    color: '#6B7280',
  },
  summary: {
    fontSize: 14,
    color: '#374151',
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 12,
    color: '#111827',
  },
  empty: {
    fontSize: 14,
    color: '#9CA3AF',
    marginTop: 12,
  },
  pickerContainer: {
    backgroundColor: '#F3F4F6',
    borderRadius: 8,
    marginBottom: 16,
  },
  picker: {
    height: 50,
    color: '#111827',
  },
  stepBox: {
    marginBottom: 20,
    padding: 14,
    backgroundColor: '#ECFDF5',
    borderRadius: 12,
  },
  stepHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 6,
    gap: 8,
  },
  stepTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: '#047857',
  },
  stepImage: {
    width: '100%',
    height: 200,
    borderRadius: 8,
    marginVertical: 10,
    backgroundColor: '#FFF',
  },
  stepInstruction: {
    fontSize: 14,
    color: '#374151',
    lineHeight: 20,
  },
  speechButton: {
    marginTop: 12,
    backgroundColor: '#10B981',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    alignSelf: 'flex-start',
  },
  speechButtonText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '600',
  },
});

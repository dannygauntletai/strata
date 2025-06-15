/**
 * Custom hook for managing onboarding state with invitation integration
 * Handles pre-filled data, progress tracking, and DynamoDB synchronization
 */

import { useState, useEffect, useCallback, useRef } from 'react'
import { 
  invitationAPI, 
  InvitationData, 
  OnboardingProgress,
  OnboardingStep,
  ONBOARDING_STEPS,
  getStoredInvitationData,
  getStoredOnboardingProgress,
  storeOnboardingProgress,
  isFieldPreFilled,
  getPreFilledValue,
  getCachedInvitationToken
} from '@/lib/invitation-api'

interface UseOnboardingStateOptions {
  currentStep: OnboardingStep;
  requiredFields?: string[];
}

interface OnboardingFormData {
  // Pre-filled from invitation (read-only)
  first_name: string;
  last_name: string;
  email: string;
  phone: string;
  city: string;
  state: string;
  bio: string;
  
  // Additional fields collected during onboarding
  middle_name: string;
  birth_date: string;
  gender: string;
  emergency_contact: string;
  experience: string;
  certifications: string[];
  specialties: string[];
  school_name: string;
  school_type: string;
  grade_levels: string[];
  
  // Step-specific data
  [key: string]: any;
}

interface UseOnboardingStateReturn {
  // Data state
  formData: OnboardingFormData;
  invitationData: InvitationData | null;
  progress: OnboardingProgress | null;
  
  // Loading states
  isLoading: boolean;
  isSaving: boolean;
  lastSaved: Date | null;
  hasUnsavedChanges: boolean;
  
  // Error states
  errors: Record<string, string>;
  hasErrors: boolean;
  
  // Actions
  updateField: (field: string, value: any) => void;
  updateMultipleFields: (fields: Record<string, any>) => void;
  saveProgress: () => Promise<boolean>;
  autoSave: () => Promise<boolean>;
  validateStep: () => boolean;
  markStepComplete: () => Promise<boolean>;
  
  // Utilities
  isFieldPreFilled: (field: string) => boolean;
  getFieldValue: (field: string) => any;
  getCompletedSteps: () => string[];
  getCurrentStepIndex: () => number;
  getTotalSteps: () => number;
  getProgressPercentage: () => number;
}

export function useOnboardingState({ 
  currentStep, 
  requiredFields = [] 
}: UseOnboardingStateOptions): UseOnboardingStateReturn {
  
  // State
  const [formData, setFormData] = useState<OnboardingFormData>({
    // Pre-filled fields
    first_name: '',
    last_name: '',
    email: '',
    phone: '',
    city: '',
    state: '',
    bio: '',
    
    // Additional fields
    middle_name: '',
    birth_date: '',
    gender: '',
    emergency_contact: '',
    experience: '',
    certifications: [],
    specialties: [],
    school_name: '',
    school_type: '',
    grade_levels: []
  });
  
  const [invitationData, setInvitationData] = useState<InvitationData | null>(null);
  const [progress, setProgress] = useState<OnboardingProgress | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [lastSaved, setLastSaved] = useState<Date | null>(null);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  // Refs for debouncing
  const autoSaveTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const periodicSaveIntervalRef = useRef<NodeJS.Timeout | null>(null);

  // Initialize data on mount
  useEffect(() => {
    initializeOnboardingState();
    
    // Set up periodic auto-save every 30 seconds
    periodicSaveIntervalRef.current = setInterval(() => {
      if (hasUnsavedChanges && !isSaving) {
        autoSave();
      }
    }, 30000); // 30 seconds
    
    // Cleanup on unmount
    return () => {
      if (autoSaveTimeoutRef.current) {
        clearTimeout(autoSaveTimeoutRef.current);
      }
      if (periodicSaveIntervalRef.current) {
        clearInterval(periodicSaveIntervalRef.current);
      }
    };
  }, []);

  // Auto-save when hasUnsavedChanges changes
  useEffect(() => {
    if (hasUnsavedChanges && !isSaving) {
      // Debounced auto-save after 3 seconds of inactivity
      if (autoSaveTimeoutRef.current) {
        clearTimeout(autoSaveTimeoutRef.current);
      }
      
      autoSaveTimeoutRef.current = setTimeout(() => {
        autoSave();
      }, 3000); // 3 seconds debounce
    }
  }, [hasUnsavedChanges, isSaving]);

  const initializeOnboardingState = async () => {
    setIsLoading(true);
    
    try {
      // Check local cache first
      const cachedProgress = getStoredOnboardingProgress();
      const storedInvitationData = getStoredInvitationData();
      
      if (storedInvitationData) {
        setInvitationData(storedInvitationData);
        
        // Pre-fill form with invitation data
        setFormData(prev => ({
          ...prev,
          first_name: storedInvitationData.first_name || '',
          last_name: storedInvitationData.last_name || '',
          email: storedInvitationData.email || '',
          phone: storedInvitationData.phone_formatted || storedInvitationData.phone || '',
          city: storedInvitationData.city || '',
          state: storedInvitationData.state || '',
          bio: storedInvitationData.bio || ''
        }));
      }
      
      // If we have cached progress, use it first
      if (cachedProgress) {
        setProgress(cachedProgress);
        setLastSaved(new Date(cachedProgress.last_updated));
        
        // Merge cached step data into form
        if (cachedProgress.step_data) {
          setFormData(prev => ({
            ...prev,
            ...cachedProgress.step_data
          }));
        }
      }
      
      // Then try to get fresh data from server
      const email = storedInvitationData?.email || cachedProgress?.email;
      const invitationToken = getCachedInvitationToken();
      
      if (email) {
        try {
          const backendProgress = await invitationAPI.getOnboardingProgress(email, invitationToken || undefined);
          
          if (backendProgress) {
            // Check if server data is newer than cached data
            const serverDate = new Date(backendProgress.last_updated);
            const cachedDate = cachedProgress ? new Date(cachedProgress.last_updated) : new Date(0);
            
            if (serverDate > cachedDate) {
              console.log('Server data is newer, using server progress');
              setProgress(backendProgress);
              setLastSaved(serverDate);
              storeOnboardingProgress(backendProgress);
              
              // Merge server step data into form
              if (backendProgress.step_data) {
                setFormData(prev => ({
                  ...prev,
                  ...backendProgress.step_data
                }));
              }
            } else {
              console.log('Local cache is up to date');
            }
          } else if (!cachedProgress) {
            // Create new progress if none exists locally or on server
            const newProgress: OnboardingProgress = {
              user_id: email,
              email,
              current_step: currentStep,
              completed_steps: [],
              step_data: {},
              last_updated: new Date().toISOString(),
              invitation_based: !!invitationToken,
              invitation_token: invitationToken || undefined
            };
            
            // ✅ Create backend session immediately
            console.log('Creating new backend onboarding session for:', email);
            const backendCreated = await invitationAPI.updateOnboardingProgress(
              email,
              currentStep,
              {}, // empty step data initially
              [],
              invitationToken || undefined
            );
            
            if (backendCreated) {
              console.log('✅ Backend session created successfully');
              setProgress(newProgress);
              storeOnboardingProgress(newProgress);
            } else {
              console.error('❌ Failed to create backend session, using local only');
              // Still set local progress as fallback
              setProgress(newProgress);
              storeOnboardingProgress(newProgress);
            }
          }
        } catch (error) {
          console.error('Error fetching server progress, using cached data:', error);
          // Continue with cached data if server fails
        }
      }
      
      // Load any additional cached form data from localStorage
      loadCachedFormData();
      
    } catch (error) {
      console.error('Error initializing onboarding state:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const loadCachedFormData = () => {
    // Load cached data from localStorage (legacy compatibility)
    const cachedFields = [
      'middle_name', 'birth_date', 'birth_city', 'birth_state_abbreviation_descriptor',
      'gender', 'hispanic_latino_ethnicity', 'races', 'generation_code_suffix',
      'emergency_contact', 'experience', 'school_name', 'school_type'
    ];
    
    cachedFields.forEach(field => {
      const cached = localStorage.getItem(`onboarding_${field}`);
      if (cached) {
        try {
          // Handle arrays and objects
          const value = field === 'races' || field === 'certifications' || field === 'specialties' 
            ? JSON.parse(cached) 
            : field === 'hispanic_latino_ethnicity' 
            ? cached === 'true' ? true : cached === 'false' ? false : undefined
            : cached;
          setFormData(prev => ({ ...prev, [field]: value }));
        } catch (error) {
          // If JSON parsing fails, use as string
          setFormData(prev => ({ ...prev, [field]: cached }));
        }
      }
    });
  };

  const updateField = useCallback((field: string, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    setHasUnsavedChanges(true);
    
    // Clear error for this field
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: '' }));
    }
    
    // Cache in localStorage for redundancy (non-pre-filled fields only)
    if (!isFieldPreFilled(field, invitationData)) {
      try {
        const cacheValue = typeof value === 'object' ? JSON.stringify(value) : String(value);
        localStorage.setItem(`onboarding_${field}`, cacheValue);
      } catch (error) {
        console.error('Error caching field data:', error);
      }
    }
  }, [errors, invitationData]);

  const updateMultipleFields = useCallback((fields: Record<string, any>) => {
    setFormData(prev => ({ ...prev, ...fields }));
    setHasUnsavedChanges(true);
    
    // Clear errors for updated fields
    const updatedErrorKeys = Object.keys(fields).filter(key => errors[key]);
    if (updatedErrorKeys.length > 0) {
      setErrors(prev => {
        const newErrors = { ...prev };
        updatedErrorKeys.forEach(key => delete newErrors[key]);
        return newErrors;
      });
    }
    
    // Cache non-pre-filled fields
    Object.entries(fields).forEach(([field, value]) => {
      if (!isFieldPreFilled(field, invitationData)) {
        try {
          const cacheValue = typeof value === 'object' ? JSON.stringify(value) : String(value);
          localStorage.setItem(`onboarding_${field}`, cacheValue);
        } catch (error) {
          console.error('Error caching field data:', error);
        }
      }
    });
  }, [errors, invitationData]);

  const autoSave = useCallback(async () => {
    if (!progress || !invitationData?.email || isSaving) return false;
    
    console.log('Auto-saving progress...');
    setIsSaving(true);
    
    try {
      const updatedProgress: OnboardingProgress = {
        ...progress,
        current_step: currentStep,
        step_data: { ...progress.step_data, ...formData },
        last_updated: new Date().toISOString()
      };
      
      // Save to backend
      const success = await invitationAPI.updateOnboardingProgress(
        invitationData.email,
        currentStep,
        formData,
        progress.completed_steps,
        progress.invitation_token
      );
      
      if (success) {
        setProgress(updatedProgress);
        storeOnboardingProgress(updatedProgress);
        setLastSaved(new Date());
        setHasUnsavedChanges(false);
        console.log('Auto-save successful');
        return true;
      } else {
        console.warn('Auto-save failed, keeping local changes');
        return false;
      }
    } catch (error) {
      console.error('Auto-save error:', error);
      return false;
    } finally {
      setIsSaving(false);
    }
  }, [progress, invitationData, currentStep, formData, isSaving]);

  const saveProgress = useCallback(async () => {
    if (!progress || !invitationData?.email) return false;
    
    setIsSaving(true);
    
    try {
      const updatedProgress: OnboardingProgress = {
        ...progress,
        current_step: currentStep,
        step_data: { ...progress.step_data, ...formData },
        last_updated: new Date().toISOString()
      };
      
      // Save to backend
      const success = await invitationAPI.updateOnboardingProgress(
        invitationData.email,
        currentStep,
        formData,
        progress.completed_steps,
        progress.invitation_token
      );
      
      if (success) {
        setProgress(updatedProgress);
        storeOnboardingProgress(updatedProgress);
        setLastSaved(new Date());
        setHasUnsavedChanges(false);
        return true;
      }
      
      return false;
    } catch (error) {
      console.error('Error saving progress:', error);
      return false;
    } finally {
      setIsSaving(false);
    }
  }, [progress, invitationData, currentStep, formData]);

  const validateStep = useCallback(() => {
    const newErrors: Record<string, string> = {};
    
    requiredFields.forEach(field => {
      const value = formData[field as keyof OnboardingFormData];
      if (!value || (Array.isArray(value) && value.length === 0)) {
        newErrors[field] = `${field.replace('_', ' ')} is required`;
      }
    });
    
    // Custom validation rules
    if (requiredFields.includes('birth_date') && formData.birth_date) {
      const birthDate = new Date(formData.birth_date);
      const today = new Date();
      const age = today.getFullYear() - birthDate.getFullYear();
      if (age < 18) {
        newErrors.birth_date = 'You must be at least 18 years old';
      }
    }
    
    if (requiredFields.includes('email') && formData.email) {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(formData.email)) {
        newErrors.email = 'Please enter a valid email address';
      }
    }
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  }, [formData, requiredFields]);

  const markStepComplete = useCallback(async () => {
    if (!progress || !validateStep()) return false;
    
    const completedSteps = [...progress.completed_steps];
    if (!completedSteps.includes(currentStep)) {
      completedSteps.push(currentStep);
    }
    
    setIsSaving(true);
    
    try {
      const updatedProgress: OnboardingProgress = {
        ...progress,
        current_step: currentStep,
        completed_steps: completedSteps,
        step_data: { ...progress.step_data, ...formData },
        last_updated: new Date().toISOString()
      };
      
      // Save to backend
      const success = await invitationAPI.updateOnboardingProgress(
        invitationData?.email || progress.email,
        currentStep,
        formData,
        completedSteps,
        progress.invitation_token
      );
      
      if (success) {
        setProgress(updatedProgress);
        storeOnboardingProgress(updatedProgress);
        setLastSaved(new Date());
        setHasUnsavedChanges(false);
        return true;
      }
      
      return false;
    } catch (error) {
      console.error('Error marking step complete:', error);
      return false;
    } finally {
      setIsSaving(false);
    }
  }, [progress, invitationData, currentStep, formData, validateStep]);

  // Utility functions
  const isFieldPreFilledFn = useCallback((field: string) => {
    return isFieldPreFilled(field, invitationData);
  }, [invitationData]);

  const getFieldValue = useCallback((field: string) => {
    return formData[field as keyof OnboardingFormData];
  }, [formData]);

  const getCompletedSteps = useCallback(() => {
    return progress?.completed_steps || [];
  }, [progress]);

  const getCurrentStepIndex = useCallback(() => {
    const stepOrder = Object.values(ONBOARDING_STEPS);
    return stepOrder.indexOf(currentStep);
  }, [currentStep]);

  const getTotalSteps = useCallback(() => {
    return Object.values(ONBOARDING_STEPS).length;
  }, []);

  const getProgressPercentage = useCallback(() => {
    const totalSteps = getTotalSteps();
    const completedCount = getCompletedSteps().length;
    return Math.round((completedCount / totalSteps) * 100);
  }, [getTotalSteps, getCompletedSteps]);

  return {
    // Data state
    formData,
    invitationData,
    progress,
    
    // Loading states
    isLoading,
    isSaving,
    lastSaved,
    hasUnsavedChanges,
    
    // Error states
    errors,
    hasErrors: Object.keys(errors).length > 0,
    
    // Actions
    updateField,
    updateMultipleFields,
    saveProgress,
    autoSave,
    validateStep,
    markStepComplete,
    
    // Utilities
    isFieldPreFilled: isFieldPreFilledFn,
    getFieldValue,
    getCompletedSteps,
    getCurrentStepIndex,
    getTotalSteps,
    getProgressPercentage
  };
} 
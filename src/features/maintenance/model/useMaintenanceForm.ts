'use client';

import { useState, useRef } from 'react';
import { supabase } from '@shared/api/supabase';
import { MaintenanceRequestForm, MaintenancePriority } from '@entities/maintenance';

export const categories = [
  { value: 'plumbing', label: 'Plumbing' },
  { value: 'electrical', label: 'Electrical' },
  { value: 'hvac', label: 'HVAC/Climate' },
  { value: 'structural', label: 'Structural' },
  { value: 'landscaping', label: 'Landscaping' },
  { value: 'common_area', label: 'Common Area' },
  { value: 'security', label: 'Security' },
  { value: 'other', label: 'Other' },
];

export const priorities = [
  { value: 'LOW', label: 'Low - Minor inconvenience' },
  { value: 'MEDIUM', label: 'Medium - Needs attention soon' },
  { value: 'HIGH', label: 'High - Urgent issue' },
  { value: 'EMERGENCY', label: 'Emergency - Immediate danger' },
];

export function useMaintenanceForm(onSubmit?: (data: MaintenanceRequestForm) => Promise<void>) {
  const [formData, setFormData] = useState<MaintenanceRequestForm>({
    category: '',
    priority: 'MEDIUM',
    description: '',
    images: [],
  });
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    const fileArray = Array.from(files);
    if (formData.images && formData.images.length + fileArray.length > 5) {
      setError('Maximum 5 images allowed');
      return;
    }

    setUploading(true);
    setError('');

    try {
      const uploadedUrls: string[] = [];

      for (const file of fileArray) {
        // Validate file type
        if (!file.type.startsWith('image/')) {
          continue;
        }

        // Validate file size (max 5MB)
        if (file.size > 5 * 1024 * 1024) {
          setError('Each image must be less than 5MB');
          continue;
        }

        const fileName = `${Date.now()}-${file.name.replace(/[^a-zA-Z0-9.-]/g, '_')}`;

        const { data, error: uploadError } = await supabase.storage
          .from('maintenance-images')
          .upload(fileName, file, {
            contentType: file.type,
            upsert: false,
          });

        if (uploadError) {
          console.error('Upload error:', uploadError);
          continue;
        }

        if (data) {
          const { data: urlData } = supabase.storage
            .from('maintenance-images')
            .getPublicUrl(data.path);
          uploadedUrls.push(urlData.publicUrl);
        }
      }

      if (uploadedUrls.length > 0) {
        setFormData(prev => ({
          ...prev,
          images: [...(prev.images || []), ...uploadedUrls],
        }));
      }
    } catch (err) {
      console.error('Upload error:', err);
      setError('Failed to upload images. Please try again.');
    } finally {
      setUploading(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const removeImage = (index: number) => {
    setFormData(prev => ({
      ...prev,
      images: (prev.images || []).filter((_, i) => i !== index),
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setError('');

    try {
      if (onSubmit) {
        await onSubmit(formData);
      } else {
        const res = await fetch('/api/maintenance', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(formData),
        });

        if (!res.ok) {
          throw new Error('Failed to submit request');
        }

        alert('Maintenance request submitted successfully!');
        setFormData({ category: '', priority: 'MEDIUM', description: '', images: [] });
      }
    } catch (err) {
      setError('Failed to submit request. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  const updateFormData = (updates: Partial<MaintenanceRequestForm>) => {
    setFormData(prev => ({ ...prev, ...updates }));
  };

  return {
    formData,
    submitting,
    error,
    uploading,
    fileInputRef,
    handleFileChange,
    removeImage,
    handleSubmit,
    updateFormData,
    resetForm: () => setFormData({ category: '', priority: 'MEDIUM', description: '', images: [] }),
  };
}

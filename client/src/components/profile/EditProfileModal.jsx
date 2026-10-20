import React, { useState, useEffect, useRef } from 'react';
import { Camera, Trash2, Link as LinkIcon, Loader2 } from 'lucide-react';
import Modal from '@/components/common/Modal';
import Button from '@/components/common/Button';
import Input from '@/components/common/Input';
import Textarea from '@/components/common/Textarea';
import Avatar from '@/components/common/Avatar';
import Alert from '@/components/common/Alert';
import { uploadAvatar, removeAvatar, updateProfile } from '@/api/users';
import { useAuth } from '@/context/AuthContext';
import { useToast } from '@/context/ToastContext';

const MAX_AVATAR_SIZE_BYTES = 2 * 1024 * 1024; // 2MB backend limit
const USERNAME_REGEX = /^[a-z0-9_.]+$/i;

export function EditProfileModal({ isOpen, onClose, profile, onProfileUpdated }) {
  const { updateUser, refreshUser } = useAuth();
  const toast = useToast();
  const fileInputRef = useRef(null);

  // Form states
  const [username, setUsername] = useState('');
  const [bio, setBio] = useState('');
  const [currentPicture, setCurrentPicture] = useState('');
  const [avatarMode, setAvatarMode] = useState('file'); // 'file' | 'url'
  const [imageUrl, setImageUrl] = useState('');
  const [selectedFile, setSelectedFile] = useState(null);
  const [previewUrl, setPreviewUrl] = useState('');
  const [removePictureOnSave, setRemovePictureOnSave] = useState(false);

  // Validation & Loading states
  const [formError, setFormError] = useState(null);
  const [usernameError, setUsernameError] = useState(null);
  const [urlError, setUrlError] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Initialize form fields whenever profile opens or changes
  useEffect(() => {
    if (profile && isOpen) {
      setUsername(profile.username || '');
      setBio(profile.bio || '');
      setCurrentPicture(profile.profilePicture || '');
      setAvatarMode('file');
      setImageUrl(
        profile.profilePicture && (profile.profilePicture.startsWith('http://') || profile.profilePicture.startsWith('https://'))
          ? profile.profilePicture
          : ''
      );
      setSelectedFile(null);
      setPreviewUrl('');
      setRemovePictureOnSave(false);
      setFormError(null);
      setUsernameError(null);
      setUrlError(null);
    }
  }, [profile, isOpen]);

  // Clean up object URL to prevent memory leaks
  useEffect(() => {
    return () => {
      if (previewUrl) {
        URL.revokeObjectURL(previewUrl);
      }
    };
  }, [previewUrl]);

  const handleFileChange = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate size (max 2MB)
    if (file.size > MAX_AVATAR_SIZE_BYTES) {
      setFormError('Image size must be 2MB or less. Please select a smaller photo.');
      return;
    }

    // Validate type
    const validTypes = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];
    if (!validTypes.includes(file.type)) {
      setFormError('Please select a valid image file (JPG, PNG, WebP, or GIF).');
      return;
    }

    setFormError(null);
    setUrlError(null);
    setSelectedFile(file);
    setRemovePictureOnSave(false);

    if (previewUrl) URL.revokeObjectURL(previewUrl);
    setPreviewUrl(URL.createObjectURL(file));
  };

  const handleRemoveAvatarClick = () => {
    setSelectedFile(null);
    if (previewUrl) {
      URL.revokeObjectURL(previewUrl);
      setPreviewUrl('');
    }
    setImageUrl('');
    setRemovePictureOnSave(true);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const validateForm = () => {
    setFormError(null);
    setUsernameError(null);
    setUrlError(null);

    const trimmedUsername = username.trim().toLowerCase();
    if (!trimmedUsername) {
      setUsernameError('Username is required.');
      return false;
    }
    if (trimmedUsername.length < 3 || trimmedUsername.length > 30) {
      setUsernameError('Username must be between 3 and 30 characters.');
      return false;
    }
    if (!USERNAME_REGEX.test(trimmedUsername)) {
      setUsernameError('Username may only contain letters, numbers, underscores, and dots.');
      return false;
    }
    if (trimmedUsername === 'me') {
      setUsernameError('The username "me" is reserved.');
      return false;
    }

    if (bio && bio.length > 300) {
      setFormError('Bio cannot exceed 300 characters.');
      return false;
    }

    if (avatarMode === 'url' && !removePictureOnSave && imageUrl.trim()) {
      const trimmedUrl = imageUrl.trim();
      const isValidHttp = /^https?:\/\/\S+$/i.test(trimmedUrl);
      if (!isValidHttp || trimmedUrl.length > 2048) {
        setUrlError('Profile picture must be a valid http(s) URL (max 2048 characters).');
        return false;
      }
    }

    return true;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validateForm()) return;

    setIsSubmitting(true);
    setFormError(null);

    try {
      let updatedProfile = { ...profile };

      // 1. Handle Profile Picture updates
      if (removePictureOnSave && currentPicture) {
        const removeRes = await removeAvatar();
        if (removeRes?.profile) {
          updatedProfile = { ...updatedProfile, ...removeRes.profile };
        }
      } else if (avatarMode === 'file' && selectedFile) {
        const uploadRes = await uploadAvatar(selectedFile);
        if (uploadRes?.profile) {
          updatedProfile = { ...updatedProfile, ...uploadRes.profile };
        }
      }

      // 2. Handle Username, Bio, and Image URL updates
      const trimmedUsername = username.trim().toLowerCase();
      const trimmedBio = bio.trim();

      const profileUpdates = {};
      if (trimmedUsername !== profile.username) {
        profileUpdates.username = trimmedUsername;
      }
      if (trimmedBio !== (profile.bio || '')) {
        profileUpdates.bio = trimmedBio;
      }
      if (
        avatarMode === 'url' &&
        !removePictureOnSave &&
        imageUrl.trim() &&
        imageUrl.trim() !== currentPicture
      ) {
        profileUpdates.profilePicture = imageUrl.trim();
      }

      if (Object.keys(profileUpdates).length > 0) {
        const patchRes = await updateProfile(profileUpdates);
        if (patchRes?.profile) {
          updatedProfile = { ...updatedProfile, ...patchRes.profile };
        }
      }

      // 3. Synchronize AuthContext and parent page
      updateUser({
        username: updatedProfile.username,
        bio: updatedProfile.bio,
        profilePicture: updatedProfile.profilePicture,
      });
      refreshUser();
      onProfileUpdated?.(updatedProfile);

      toast.success('Your profile has been updated successfully!');
      onClose();
    } catch (err) {
      console.error('[Edit Profile Error]:', err);
      const msg = err?.details?.[0]?.message || err?.message || 'Failed to update profile. Please try again.';
      if (err?.status === 409 || msg.toLowerCase().includes('username')) {
        setUsernameError(msg);
      } else if (msg.toLowerCase().includes('profile picture') || msg.toLowerCase().includes('url')) {
        setUrlError(msg);
      } else {
        setFormError(msg);
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const effectiveAvatarSrc = removePictureOnSave
    ? ''
    : avatarMode === 'file' && previewUrl
    ? previewUrl
    : avatarMode === 'url' && imageUrl.trim()
    ? imageUrl.trim()
    : currentPicture;

  return (
    <Modal
      isOpen={isOpen}
      onClose={() => !isSubmitting && onClose()}
      title="Edit StudySync Profile"
      description="Update your public academic persona, avatar photo, and bio."
      maxWidth="max-w-lg"
      footer={
        <div className="flex items-center justify-end gap-3 w-full">
          <Button
            type="button"
            variant="outline"
            size="sm"
            disabled={isSubmitting}
            onClick={onClose}
          >
            Cancel
          </Button>
          <Button
            type="submit"
            form="edit-profile-form"
            variant="primary"
            size="sm"
            isLoading={isSubmitting}
            disabled={isSubmitting}
          >
            {isSubmitting ? 'Saving Changes...' : 'Save Profile'}
          </Button>
        </div>
      }
    >
      <form id="edit-profile-form" onSubmit={handleSubmit} className="space-y-5">
        {formError && (
          <Alert variant="error" title="Update Failed">
            {formError}
          </Alert>
        )}

        {/* Profile Picture Section */}
        <div className="p-4 rounded-2xl bg-surface-50 border border-surface-200/80 space-y-3">
          <div className="flex flex-col sm:flex-row items-center gap-4">
            <div className="relative group shrink-0">
              <Avatar
                name={username || profile?.username || 'Student'}
                src={effectiveAvatarSrc}
                size="xl"
                className="ring-4 ring-white shadow-md bg-white"
              />
              {isSubmitting && (
                <div className="absolute inset-0 bg-surface-900/50 rounded-full flex items-center justify-center text-white">
                  <Loader2 className="w-5 h-5 animate-spin" />
                </div>
              )}
            </div>

            <div className="flex-1 text-center sm:text-left space-y-2">
              <div>
                <p className="text-xs font-semibold text-surface-900">Profile Picture</p>
                <p className="text-[11px] text-surface-500">
                  Upload an image (max 2MB) or link a web photo.
                </p>
              </div>

              {/* Mode switch */}
              <div className="flex items-center justify-center sm:justify-start gap-1 p-0.5 bg-surface-200/70 rounded-lg w-fit mx-auto sm:mx-0">
                <button
                  type="button"
                  onClick={() => {
                    setAvatarMode('file');
                    setRemovePictureOnSave(false);
                  }}
                  className={`px-2.5 py-1 text-[11px] font-medium rounded-md transition-colors ${
                    avatarMode === 'file'
                      ? 'bg-white text-surface-900 shadow-xs font-semibold'
                      : 'text-surface-600 hover:text-surface-900'
                  }`}
                >
                  Upload File
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setAvatarMode('url');
                    setRemovePictureOnSave(false);
                  }}
                  className={`px-2.5 py-1 text-[11px] font-medium rounded-md transition-colors ${
                    avatarMode === 'url'
                      ? 'bg-white text-surface-900 shadow-xs font-semibold'
                      : 'text-surface-600 hover:text-surface-900'
                  }`}
                >
                  Image URL
                </button>
              </div>

              <input
                ref={fileInputRef}
                type="file"
                accept="image/jpeg,image/png,image/webp,image/gif"
                className="hidden"
                onChange={handleFileChange}
                disabled={isSubmitting}
              />

              <div className="flex items-center justify-center sm:justify-start gap-2 flex-wrap pt-1">
                {avatarMode === 'file' ? (
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => fileInputRef.current?.click()}
                    disabled={isSubmitting}
                    leftIcon={<Camera className="w-3.5 h-3.5" />}
                    className="bg-white h-8 text-xs"
                  >
                    {previewUrl ? 'Choose Another Photo' : effectiveAvatarSrc ? 'Change Photo' : 'Upload Photo'}
                  </Button>
                ) : null}

                {effectiveAvatarSrc && (
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={handleRemoveAvatarClick}
                    disabled={isSubmitting}
                    leftIcon={<Trash2 className="w-3.5 h-3.5" />}
                    className="text-rose-600 hover:text-rose-700 hover:bg-rose-50 h-8 text-xs"
                  >
                    Remove
                  </Button>
                )}
              </div>
            </div>
          </div>

          {/* Web Image URL Input (if avatarMode === 'url') */}
          {avatarMode === 'url' && (
            <div className="pt-2 border-t border-surface-200/60">
              <Input
                label="Direct Image URL"
                value={imageUrl}
                onChange={(e) => {
                  setImageUrl(e.target.value);
                  setRemovePictureOnSave(false);
                  if (urlError) setUrlError(null);
                }}
                placeholder="https://example.com/avatar.jpg"
                error={urlError}
                helperText="Must be a direct http:// or https:// image address."
                leftIcon={<LinkIcon className="w-3.5 h-3.5 text-surface-400" />}
                disabled={isSubmitting}
              />
            </div>
          )}
        </div>

        {/* Username Field */}
        <div>
          <Input
            label="Username"
            value={username}
            onChange={(e) => {
              setUsername(e.target.value.toLowerCase());
              if (usernameError) setUsernameError(null);
            }}
            placeholder="e.g. alex_scholar"
            error={usernameError}
            helperText="Allowed: lowercase letters, numbers, underscores, and dots (3-30 characters)."
            disabled={isSubmitting}
            required
            autoComplete="username"
          />
        </div>

        {/* Bio Field */}
        <div>
          <Textarea
            label="Bio / Academic Focus"
            value={bio}
            onChange={(e) => setBio(e.target.value)}
            placeholder="Write a brief introduction about your study major, academic interests, or research topics..."
            maxLength={300}
            rows={3}
            helperText="Let fellow students know what topics or courses you study (max 300 characters)."
            disabled={isSubmitting}
          />
        </div>
      </form>
    </Modal>
  );
}

export default EditProfileModal;

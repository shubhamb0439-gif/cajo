import { useState, useRef } from 'react';
import { X, Upload, Trash2, User as UserIcon } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';

interface EditProfilePanelProps {
  onClose: () => void;
}

export default function EditProfilePanel({ onClose }: EditProfilePanelProps) {
  const { userProfile } = useAuth();
  const [uploading, setUploading] = useState(false);
  const [profilePicture, setProfilePicture] = useState(userProfile?.profile_pic || '');
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file || !userProfile) return;

    setUploading(true);
    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `${userProfile.id}-${Date.now()}.${fileExt}`;
      const filePath = `profile-pictures/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from('avatars')
        .upload(filePath, file, { upsert: true });

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from('avatars')
        .getPublicUrl(filePath);

      const { error: updateError } = await supabase
        .from('users')
        .update({ profile_pic: publicUrl })
        .eq('id', userProfile.id);

      if (updateError) throw updateError;

      setProfilePicture(publicUrl);

      await supabase.from('activity_logs').insert({
        user_id: userProfile.id,
        action: 'UPDATE_PROFILE_PICTURE',
        details: { action: 'upload' },
      });

      window.location.reload();
    } catch (error) {
      console.error('Error uploading profile picture:', error);
      alert('Failed to upload profile picture');
    } finally {
      setUploading(false);
    }
  };

  const handleDeletePicture = async () => {
    if (!userProfile || !confirm('Delete your profile picture?')) return;

    setUploading(true);
    try {
      const { error } = await supabase
        .from('users')
        .update({ profile_pic: null })
        .eq('id', userProfile.id);

      if (error) throw error;

      setProfilePicture('');

      await supabase.from('activity_logs').insert({
        user_id: userProfile.id,
        action: 'UPDATE_PROFILE_PICTURE',
        details: { action: 'delete' },
      });

      window.location.reload();
    } catch (error) {
      console.error('Error deleting profile picture:', error);
      alert('Failed to delete profile picture');
    } finally {
      setUploading(false);
    }
  };

  return (
    <>
      <div className="fixed inset-0 bg-slate-900/50 z-50" onClick={onClose} />
      <div className="fixed right-0 top-0 h-full w-full max-w-md bg-white dark:bg-slate-800 z-50 shadow-2xl">
        <div className="h-full flex flex-col">
          <div className="bg-white dark:bg-slate-800 border-b border-slate-200 dark:border-slate-700 px-6 py-4 flex items-center justify-between">
            <h2 className="text-xl font-bold text-slate-900 dark:text-white">Edit Profile</h2>
            <button
              onClick={onClose}
              className="p-1 hover:bg-slate-100 dark:hover:bg-slate-700 rounded"
            >
              <X className="w-5 h-5 text-slate-600 dark:text-slate-400" />
            </button>
          </div>

          <div className="flex-1 overflow-y-auto p-6 space-y-6">
          <div className="flex flex-col items-center space-y-4">
            <div className="relative">
              {profilePicture ? (
                <img
                  src={profilePicture}
                  alt="Profile"
                  className="w-32 h-32 rounded-full object-cover border-4 border-slate-200 dark:border-slate-700"
                />
              ) : (
                <div className="w-32 h-32 rounded-full bg-green-600 flex items-center justify-center border-4 border-slate-200 dark:border-slate-700">
                  <UserIcon className="w-16 h-16 text-white" />
                </div>
              )}
            </div>

            <div className="flex space-x-2">
              <button
                onClick={() => fileInputRef.current?.click()}
                disabled={uploading}
                className="flex items-center space-x-2 px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg transition-colors disabled:opacity-50"
              >
                <Upload className="w-4 h-4" />
                <span>{profilePicture ? 'Change' : 'Upload'}</span>
              </button>
              {profilePicture && (
                <button
                  onClick={handleDeletePicture}
                  disabled={uploading}
                  className="flex items-center space-x-2 px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg transition-colors disabled:opacity-50"
                >
                  <Trash2 className="w-4 h-4" />
                  <span>Delete</span>
                </button>
              )}
            </div>

            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              onChange={handleFileUpload}
              className="hidden"
            />
          </div>

          <div className="space-y-4 pt-4 border-t border-slate-200 dark:border-slate-700">
            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                Name
              </label>
              <input
                type="text"
                value={userProfile?.name || ''}
                disabled
                className="w-full px-4 py-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-slate-50 dark:bg-slate-900 text-slate-500 dark:text-slate-400"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                Email
              </label>
              <input
                type="email"
                value={userProfile?.email || ''}
                disabled
                className="w-full px-4 py-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-slate-50 dark:bg-slate-900 text-slate-500 dark:text-slate-400"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                Role
              </label>
              <input
                type="text"
                value={userProfile?.role || ''}
                disabled
                className="w-full px-4 py-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-slate-50 dark:bg-slate-900 text-slate-500 dark:text-slate-400 capitalize"
              />
            </div>
          </div>

          <div className="bg-slate-50 dark:bg-slate-900 rounded-lg p-4">
            <p className="text-sm text-slate-600 dark:text-slate-400">
              Only your profile picture can be changed here. Contact an administrator to update your name, email, or role.
            </p>
          </div>
          </div>
        </div>
      </div>
    </>
  );
}

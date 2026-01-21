import { useEffect, useState, useRef } from 'react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';
import { X, Upload, Download, Trash2, File, FileText, Image, FileArchive } from 'lucide-react';
import { formatDate } from '../../lib/dateUtils';

interface FilesPanelProps {
  isOpen: boolean;
  onClose: () => void;
  unitId: string;
  unitNumber: number;
  assemblyName: string;
}

interface AssemblyFile {
  id: string;
  file_name: string;
  file_path: string;
  file_size: number;
  file_type: string | null;
  uploaded_by: string;
  uploaded_at: string;
  uploader_email?: string;
}

export default function FilesPanel({ isOpen, onClose, unitId, unitNumber, assemblyName }: FilesPanelProps) {
  const { user, userProfile } = useAuth();
  const [files, setFiles] = useState<AssemblyFile[]>([]);
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isOpen) {
      loadFiles();
    }
  }, [isOpen, unitId]);

  const loadFiles = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('assembly_files')
        .select('*')
        .eq('assembly_unit_id', unitId)
        .order('uploaded_at', { ascending: false });

      if (error) throw error;

      // Fetch user emails for each file
      const filesWithEmails = await Promise.all(
        (data || []).map(async (file) => {
          const { data: userData } = await supabase
            .from('users')
            .select('email')
            .eq('auth_user_id', file.uploaded_by)
            .maybeSingle();

          return {
            ...file,
            uploader_email: userData?.email || 'Unknown'
          };
        })
      );

      setFiles(filesWithEmails);
    } catch (error) {
      console.error('Error loading files:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFiles = e.target.files;
    if (!selectedFiles || selectedFiles.length === 0 || !user?.id) return;

    setUploading(true);
    try {
      for (const file of Array.from(selectedFiles)) {
        const fileExt = file.name.split('.').pop();
        const fileName = file.name;
        const filePath = `${user.id}/${unitId}/${Date.now()}_${fileName}`;

        const { error: uploadError } = await supabase.storage
          .from('assembly-files')
          .upload(filePath, file, {
            cacheControl: '3600',
            upsert: false
          });

        if (uploadError) throw uploadError;

        const { error: dbError } = await supabase
          .from('assembly_files')
          .insert({
            assembly_unit_id: unitId,
            file_name: fileName,
            file_path: filePath,
            file_size: file.size,
            file_type: file.type || null,
            uploaded_by: user.id
          });

        if (dbError) throw dbError;

        if (userProfile?.id) {
          await supabase.from('activity_logs').insert({
            activity_type: 'file_upload',
            activity_description: `Uploaded file "${fileName}" for ${assemblyName} Unit #${unitNumber}`,
            activity_timestamp: new Date().toISOString(),
            activity_user_id: userProfile.id
          });
        }
      }

      await loadFiles();
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    } catch (error: any) {
      console.error('Error uploading files:', error);
      const errorMessage = error?.message || 'Unknown error';
      alert(`Failed to upload files: ${errorMessage}`);
    } finally {
      setUploading(false);
    }
  };

  const handleDownload = async (file: AssemblyFile) => {
    try {
      const { data, error } = await supabase.storage
        .from('assembly-files')
        .download(file.file_path);

      if (error) throw error;

      const url = URL.createObjectURL(data);
      const link = document.createElement('a');
      link.href = url;
      link.download = file.file_name;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);

      await supabase.from('activity_logs').insert({
        activity_type: 'file_download',
        activity_description: `Downloaded file "${file.file_name}" for ${assemblyName} Unit #${unitNumber}`,
        activity_timestamp: new Date().toISOString(),
        activity_user_id: userProfile?.id
      });
    } catch (error) {
      console.error('Error downloading file:', error);
      alert('Failed to download file. Please try again.');
    }
  };

  const handleDelete = async (file: AssemblyFile) => {
    if (!confirm(`Are you sure you want to delete "${file.file_name}"?`)) return;

    try {
      const { error: storageError } = await supabase.storage
        .from('assembly-files')
        .remove([file.file_path]);

      if (storageError) throw storageError;

      const { error: dbError } = await supabase
        .from('assembly_files')
        .delete()
        .eq('id', file.id);

      if (dbError) throw dbError;

      await supabase.from('activity_logs').insert({
        activity_type: 'file_delete',
        activity_description: `Deleted file "${file.file_name}" for ${assemblyName} Unit #${unitNumber}`,
        activity_timestamp: new Date().toISOString(),
        activity_user_id: userProfile?.id
      });

      await loadFiles();
    } catch (error) {
      console.error('Error deleting file:', error);
      alert('Failed to delete file. Please try again.');
    }
  };

  const getFileIcon = (fileType: string | null) => {
    if (!fileType) return File;
    if (fileType.startsWith('image/')) return Image;
    if (fileType.startsWith('text/')) return FileText;
    if (fileType.includes('zip') || fileType.includes('compressed')) return FileArchive;
    return File;
  };

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return Math.round((bytes / Math.pow(k, i)) * 100) / 100 + ' ' + sizes[i];
  };

  if (!isOpen) return null;

  return (
    <>
      <div
        className="fixed inset-0 bg-black/50 z-40"
        onClick={onClose}
      />
      <div className="fixed top-0 right-0 h-full w-full md:w-[500px] bg-white dark:bg-slate-800 shadow-2xl z-50 flex flex-col">
        <div className="flex items-center justify-between p-4 border-b border-slate-200 dark:border-slate-700">
          <div>
            <h3 className="text-lg font-semibold text-slate-900 dark:text-white">
              Files
            </h3>
            <p className="text-sm text-slate-600 dark:text-slate-400">
              {assemblyName} - Unit #{unitNumber}
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg transition-colors"
          >
            <X className="w-5 h-5 text-slate-500" />
          </button>
        </div>

        <div className="p-4 border-b border-slate-200 dark:border-slate-700">
          <input
            ref={fileInputRef}
            type="file"
            multiple
            onChange={handleFileUpload}
            className="hidden"
            id="file-upload"
          />
          <label
            htmlFor="file-upload"
            className={`flex items-center justify-center space-x-2 px-4 py-3 bg-green-600 hover:bg-green-700 text-white rounded-lg cursor-pointer transition-colors ${
              uploading ? 'opacity-50 cursor-not-allowed' : ''
            }`}
          >
            <Upload className="w-5 h-5" />
            <span>{uploading ? 'Uploading...' : 'Upload Files'}</span>
          </label>
        </div>

        <div className="flex-1 overflow-y-auto p-4">
          {loading ? (
            <div className="flex items-center justify-center h-32">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-green-600" />
            </div>
          ) : files.length === 0 ? (
            <div className="text-center py-12">
              <File className="w-12 h-12 text-slate-300 dark:text-slate-600 mx-auto mb-3" />
              <p className="text-slate-500 dark:text-slate-400">No files uploaded yet</p>
              <p className="text-sm text-slate-400 dark:text-slate-500 mt-1">
                Click "Upload Files" to add documents
              </p>
            </div>
          ) : (
            <div className="space-y-2">
              {files.map((file) => {
                const FileIcon = getFileIcon(file.file_type);
                const canDelete = user?.id === file.uploaded_by || userProfile?.role === 'admin';

                return (
                  <div
                    key={file.id}
                    className="flex items-center justify-between p-3 bg-slate-50 dark:bg-slate-900 rounded-lg border border-slate-200 dark:border-slate-700 hover:border-green-500 dark:hover:border-green-500 transition-colors"
                  >
                    <div className="flex items-center space-x-3 flex-1 min-w-0">
                      <FileIcon className="w-8 h-8 text-slate-400 flex-shrink-0" />
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-slate-900 dark:text-white truncate">
                          {file.file_name}
                        </p>
                        <div className="flex items-center space-x-2 text-xs text-slate-500 dark:text-slate-400">
                          <span>{formatFileSize(file.file_size)}</span>
                          <span>•</span>
                          <span>{formatDate(file.uploaded_at)}</span>
                        </div>
                        <p className="text-xs text-slate-400 dark:text-slate-500 truncate">
                          {file.uploader_email}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center space-x-1 flex-shrink-0">
                      <button
                        onClick={() => handleDownload(file)}
                        className="p-2 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-lg transition-colors"
                        title="Download"
                      >
                        <Download className="w-4 h-4 text-slate-600 dark:text-slate-400" />
                      </button>
                      {canDelete && (
                        <button
                          onClick={() => handleDelete(file)}
                          className="p-2 hover:bg-red-100 dark:hover:bg-red-900/20 rounded-lg transition-colors"
                          title="Delete"
                        >
                          <Trash2 className="w-4 h-4 text-red-600 dark:text-red-400" />
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </>
  );
}

import { useState, useEffect, useRef } from 'react';
import { X, Send, Image, Video, User, Loader2 } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import type { Database } from '../lib/database.types';

type User = Database['public']['Tables']['users']['Row'];
type Message = Database['public']['Tables']['messages']['Row'];
type MessageAttachment = Database['public']['Tables']['message_attachments']['Row'];

interface MessageWithDetails extends Message {
  sender: User;
  receiver: User;
  attachments: MessageAttachment[];
  is_read: boolean;
}

interface MessagingPanelProps {
  isOpen: boolean;
  onClose: () => void;
  onUnreadCountChange: (count: number) => void;
}

export default function MessagingPanel({ isOpen, onClose, onUnreadCountChange }: MessagingPanelProps) {
  const { userProfile } = useAuth();
  const [users, setUsers] = useState<User[]>([]);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [messages, setMessages] = useState<MessageWithDetails[]>([]);
  const [messageContent, setMessageContent] = useState('');
  const [uploadingFiles, setUploadingFiles] = useState(false);
  const [loading, setLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isOpen && userProfile) {
      fetchUsers();
      subscribeToMessages();
      updateUnreadCount();
    }
  }, [isOpen, userProfile]);

  useEffect(() => {
    if (selectedUser && userProfile) {
      fetchMessages();
      markMessagesAsRead();
    }
  }, [selectedUser, userProfile]);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const fetchUsers = async () => {
    const { data } = await supabase
      .from('users')
      .select('*')
      .neq('id', userProfile?.id)
      .in('role', ['admin', 'user'])
      .order('name');

    if (data) setUsers(data);
  };

  const fetchMessages = async () => {
    if (!selectedUser || !userProfile) return;

    setLoading(true);
    const { data: messagesData } = await supabase
      .from('messages')
      .select(`
        *,
        sender:sender_id(*),
        receiver:receiver_id(*)
      `)
      .or(`and(sender_id.eq.${userProfile.id},receiver_id.eq.${selectedUser.id}),and(sender_id.eq.${selectedUser.id},receiver_id.eq.${userProfile.id})`)
      .order('created_at', { ascending: true });

    if (messagesData) {
      const messageIds = messagesData.map(m => m.id);

      const { data: attachmentsData } = await supabase
        .from('message_attachments')
        .select('*')
        .in('message_id', messageIds);

      const { data: readsData } = await supabase
        .from('message_reads')
        .select('*')
        .in('message_id', messageIds)
        .eq('user_id', userProfile.id);

      const readMessageIds = new Set(readsData?.map(r => r.message_id) || []);

      const messagesWithDetails = messagesData.map(msg => ({
        ...msg,
        sender: msg.sender as unknown as User,
        receiver: msg.receiver as unknown as User,
        attachments: attachmentsData?.filter(a => a.message_id === msg.id) || [],
        is_read: readMessageIds.has(msg.id) || msg.sender_id === userProfile.id,
      }));

      setMessages(messagesWithDetails);
    }
    setLoading(false);
  };

  const markMessagesAsRead = async () => {
    if (!selectedUser || !userProfile) return;

    const unreadMessages = messages.filter(
      m => m.receiver_id === userProfile.id && !m.is_read
    );

    if (unreadMessages.length > 0) {
      const reads = unreadMessages.map(m => ({
        message_id: m.id,
        user_id: userProfile.id,
      }));

      await supabase.from('message_reads').insert(reads);
      updateUnreadCount();
    }
  };

  const updateUnreadCount = async () => {
    if (!userProfile) return;

    const { data: allMessages } = await supabase
      .from('messages')
      .select('id')
      .eq('receiver_id', userProfile.id);

    const { data: readMessages } = await supabase
      .from('message_reads')
      .select('message_id')
      .eq('user_id', userProfile.id);

    const readIds = new Set(readMessages?.map(r => r.message_id) || []);
    const unreadCount = allMessages?.filter(m => !readIds.has(m.id)).length || 0;

    onUnreadCountChange(unreadCount);
  };

  const subscribeToMessages = () => {
    if (!userProfile) return;

    const channel = supabase
      .channel('messages-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'messages',
        },
        (payload) => {
          if (payload.eventType === 'INSERT') {
            const newMessage = payload.new as Message;
            if (
              newMessage.sender_id === selectedUser?.id ||
              newMessage.receiver_id === selectedUser?.id
            ) {
              fetchMessages();
            }
            updateUnreadCount();
          }
        }
      )
      .subscribe();

    return () => {
      channel.unsubscribe();
    };
  };

  const handleSendMessage = async () => {
    if ((!messageContent.trim() && !fileInputRef.current?.files?.length) || !selectedUser || !userProfile) return;

    try {
      const { data: message, error } = await supabase
        .from('messages')
        .insert({
          sender_id: userProfile.id,
          receiver_id: selectedUser.id,
          content: messageContent.trim(),
        })
        .select()
        .single();

      if (error) throw error;

      if (fileInputRef.current?.files?.length && message) {
        await handleFileUpload(message.id);
      }

      await supabase.from('activity_logs').insert({
        user_id: userProfile.id,
        action: 'SEND_MESSAGE',
        details: { to: selectedUser.name },
      });

      setMessageContent('');
      if (fileInputRef.current) fileInputRef.current.value = '';
      fetchMessages();
    } catch (error) {
      console.error('Error sending message:', error);
    }
  };

  const handleFileUpload = async (messageId: string) => {
    if (!fileInputRef.current?.files?.length) return;

    setUploadingFiles(true);
    try {
      const files = Array.from(fileInputRef.current.files);

      for (const file of files) {
        const fileExt = file.name.split('.').pop();
        const fileName = `${messageId}-${Math.random()}.${fileExt}`;
        const filePath = `${userProfile?.id}/${fileName}`;

        const { error: uploadError } = await supabase.storage
          .from('message-media')
          .upload(filePath, file);

        if (uploadError) throw uploadError;

        const { data: { publicUrl } } = supabase.storage
          .from('message-media')
          .getPublicUrl(filePath);

        const fileType = file.type.startsWith('image/') ? 'image' : 'video';

        await supabase.from('message_attachments').insert({
          message_id: messageId,
          file_url: publicUrl,
          file_type: fileType,
          file_name: file.name,
        });
      }
    } catch (error) {
      console.error('Error uploading files:', error);
    } finally {
      setUploadingFiles(false);
    }
  };

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const formatTime = (timestamp: string) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diffInHours = (now.getTime() - date.getTime()) / (1000 * 60 * 60);

    if (diffInHours < 24) {
      return date.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });
    }
    const day = String(date.getDate()).padStart(2, '0');
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const year = String(date.getFullYear()).slice(-2);
    return `${day}/${month}/${year}`;
  };

  if (!isOpen) return null;

  return (
    <div className="fixed right-0 top-0 h-full w-96 bg-white dark:bg-gray-800 shadow-2xl z-[60] flex flex-col">
      <div className="flex items-center justify-between p-4 border-b dark:border-gray-700">
        <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Messages</h2>
        <button
          onClick={onClose}
          className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
        >
          <X className="w-5 h-5 text-gray-600 dark:text-gray-400" />
        </button>
      </div>

      <div className="flex-1 flex overflow-hidden">
        {!selectedUser ? (
          <div className="flex-1 overflow-y-auto">
            <div className="p-4">
              <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">Select a user to message</h3>
              <div className="space-y-2">
                {users.map((user) => (
                  <button
                    key={user.id}
                    onClick={() => setSelectedUser(user)}
                    className="w-full flex items-center gap-3 p-3 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                  >
                    <div className="w-10 h-10 rounded-full bg-blue-100 dark:bg-blue-900 flex items-center justify-center">
                      {user.profile_pic ? (
                        <img src={user.profile_pic} alt={user.name} className="w-10 h-10 rounded-full object-cover" />
                      ) : (
                        <User className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                      )}
                    </div>
                    <div className="flex-1 text-left">
                      <div className="font-medium text-gray-900 dark:text-white">{user.name}</div>
                      <div className="text-sm text-gray-500 dark:text-gray-400">{user.email}</div>
                    </div>
                  </button>
                ))}
              </div>
            </div>
          </div>
        ) : (
          <div className="flex-1 flex flex-col">
            <div className="p-4 border-b dark:border-gray-700 flex items-center gap-3">
              <button
                onClick={() => setSelectedUser(null)}
                className="text-blue-600 dark:text-blue-400 text-sm font-medium"
              >
                ← Back
              </button>
              <div className="w-8 h-8 rounded-full bg-blue-100 dark:bg-blue-900 flex items-center justify-center">
                {selectedUser.profile_pic ? (
                  <img src={selectedUser.profile_pic} alt={selectedUser.name} className="w-8 h-8 rounded-full object-cover" />
                ) : (
                  <User className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                )}
              </div>
              <div>
                <div className="font-medium text-gray-900 dark:text-white">{selectedUser.name}</div>
              </div>
            </div>

            <div className="flex-1 overflow-y-auto p-4 space-y-4">
              {loading ? (
                <div className="flex items-center justify-center h-full">
                  <Loader2 className="w-6 h-6 animate-spin text-gray-400" />
                </div>
              ) : (
                <>
                  {messages.map((message) => {
                    const isSender = message.sender_id === userProfile?.id;
                    return (
                      <div
                        key={message.id}
                        className={`flex ${isSender ? 'justify-end' : 'justify-start'}`}
                      >
                        <div className={`max-w-[75%] ${isSender ? 'bg-blue-600 text-white' : 'bg-gray-100 dark:bg-gray-700 text-gray-900 dark:text-white'} rounded-lg p-3`}>
                          {message.content && (
                            <div className="text-sm">{message.content}</div>
                          )}
                          {message.attachments.length > 0 && (
                            <div className="mt-2 space-y-2">
                              {message.attachments.map((attachment) => (
                                <div key={attachment.id}>
                                  {attachment.file_type === 'image' ? (
                                    <img
                                      src={attachment.file_url}
                                      alt={attachment.file_name}
                                      className="rounded max-w-full"
                                    />
                                  ) : (
                                    <video
                                      src={attachment.file_url}
                                      controls
                                      className="rounded max-w-full"
                                    />
                                  )}
                                </div>
                              ))}
                            </div>
                          )}
                          <div className={`text-xs mt-1 ${isSender ? 'text-blue-100' : 'text-gray-500 dark:text-gray-400'}`}>
                            {formatTime(message.created_at)}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                  <div ref={messagesEndRef} />
                </>
              )}
            </div>

            <div className="p-4 border-t dark:border-gray-700">
              <div className="flex gap-2">
                <input
                  type="file"
                  ref={fileInputRef}
                  accept="image/*,video/*"
                  multiple
                  className="hidden"
                  onChange={() => {}}
                />
                <button
                  onClick={() => fileInputRef.current?.click()}
                  disabled={uploadingFiles}
                  className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors disabled:opacity-50"
                >
                  <Image className="w-5 h-5 text-gray-600 dark:text-gray-400" />
                </button>
                <input
                  type="text"
                  value={messageContent}
                  onChange={(e) => setMessageContent(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && handleSendMessage()}
                  placeholder="Type a message..."
                  className="flex-1 px-4 py-2 border dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                <button
                  onClick={handleSendMessage}
                  disabled={uploadingFiles || (!messageContent.trim() && !fileInputRef.current?.files?.length)}
                  className="p-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {uploadingFiles ? (
                    <Loader2 className="w-5 h-5 animate-spin" />
                  ) : (
                    <Send className="w-5 h-5" />
                  )}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

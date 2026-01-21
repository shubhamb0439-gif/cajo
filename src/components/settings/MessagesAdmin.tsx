import { useState, useEffect } from 'react';
import { Search, User, Image as ImageIcon, Video, Loader2 } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import type { Database } from '../../lib/database.types';

type User = Database['public']['Tables']['users']['Row'];
type Message = Database['public']['Tables']['messages']['Row'];
type MessageAttachment = Database['public']['Tables']['message_attachments']['Row'];

interface MessageWithDetails extends Message {
  sender: User;
  receiver: User;
  attachments: MessageAttachment[];
}

export default function MessagesAdmin() {
  const [messages, setMessages] = useState<MessageWithDetails[]>([]);
  const [filteredMessages, setFilteredMessages] = useState<MessageWithDetails[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(true);
  const [selectedMessage, setSelectedMessage] = useState<MessageWithDetails | null>(null);

  useEffect(() => {
    fetchMessages();
  }, []);

  useEffect(() => {
    if (searchTerm) {
      const filtered = messages.filter(
        (msg) =>
          msg.sender.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
          msg.receiver.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
          msg.content.toLowerCase().includes(searchTerm.toLowerCase())
      );
      setFilteredMessages(filtered);
    } else {
      setFilteredMessages(messages);
    }
  }, [searchTerm, messages]);

  const fetchMessages = async () => {
    setLoading(true);
    try {
      const { data: messagesData } = await supabase
        .from('messages')
        .select(`
          *,
          sender:sender_id(*),
          receiver:receiver_id(*)
        `)
        .order('created_at', { ascending: false });

      if (messagesData) {
        const messageIds = messagesData.map((m) => m.id);

        const { data: attachmentsData } = await supabase
          .from('message_attachments')
          .select('*')
          .in('message_id', messageIds);

        const messagesWithDetails = messagesData.map((msg) => ({
          ...msg,
          sender: msg.sender as unknown as User,
          receiver: msg.receiver as unknown as User,
          attachments: attachmentsData?.filter((a) => a.message_id === msg.id) || [],
        }));

        setMessages(messagesWithDetails);
        setFilteredMessages(messagesWithDetails);
      }
    } catch (error) {
      console.error('Error fetching messages:', error);
    } finally {
      setLoading(false);
    }
  };

  const formatDateTime = (timestamp: string) => {
    return new Date(timestamp).toLocaleString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
    });
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-semibold text-slate-900 dark:text-white mb-2">
          Message History
        </h2>
        <p className="text-slate-600 dark:text-slate-400">
          View all messages sent between users in the system.
        </p>
      </div>

      <div className="relative">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400 w-5 h-5" />
        <input
          type="text"
          placeholder="Search by sender, receiver, or content..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="w-full pl-10 pr-4 py-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-green-500"
        />
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="w-8 h-8 animate-spin text-slate-400" />
        </div>
      ) : (
        <div className="space-y-4">
          <div className="text-sm text-slate-600 dark:text-slate-400">
            Showing {filteredMessages.length} of {messages.length} messages
          </div>

          <div className="grid gap-4">
            {filteredMessages.map((message) => (
              <div
                key={message.id}
                className="bg-white dark:bg-slate-700 border border-slate-200 dark:border-slate-600 rounded-lg p-4 hover:shadow-md transition-shadow cursor-pointer"
                onClick={() => setSelectedMessage(message)}
              >
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-center gap-3">
                    <div className="flex items-center gap-2">
                      <div className="w-8 h-8 rounded-full bg-blue-100 dark:bg-blue-900 flex items-center justify-center">
                        {message.sender.profile_picture_url ? (
                          <img
                            src={message.sender.profile_picture_url}
                            alt={message.sender.name}
                            className="w-8 h-8 rounded-full object-cover"
                          />
                        ) : (
                          <User className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                        )}
                      </div>
                      <span className="font-medium text-slate-900 dark:text-white">
                        {message.sender.name}
                      </span>
                    </div>
                    <span className="text-slate-400">→</span>
                    <div className="flex items-center gap-2">
                      <div className="w-8 h-8 rounded-full bg-green-100 dark:bg-green-900 flex items-center justify-center">
                        {message.receiver.profile_picture_url ? (
                          <img
                            src={message.receiver.profile_picture_url}
                            alt={message.receiver.name}
                            className="w-8 h-8 rounded-full object-cover"
                          />
                        ) : (
                          <User className="w-4 h-4 text-green-600 dark:text-green-400" />
                        )}
                      </div>
                      <span className="font-medium text-slate-900 dark:text-white">
                        {message.receiver.name}
                      </span>
                    </div>
                  </div>
                  <span className="text-sm text-slate-500 dark:text-slate-400">
                    {formatDateTime(message.created_at)}
                  </span>
                </div>

                {message.content && (
                  <p className="text-slate-700 dark:text-slate-300 mb-2 line-clamp-2">
                    {message.content}
                  </p>
                )}

                {message.attachments.length > 0 && (
                  <div className="flex gap-2 flex-wrap">
                    {message.attachments.map((attachment) => (
                      <div
                        key={attachment.id}
                        className="flex items-center gap-1 px-2 py-1 bg-slate-100 dark:bg-slate-600 rounded text-sm text-slate-600 dark:text-slate-300"
                      >
                        {attachment.file_type === 'image' ? (
                          <ImageIcon className="w-4 h-4" />
                        ) : (
                          <Video className="w-4 h-4" />
                        )}
                        <span>{attachment.file_name}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ))}

            {filteredMessages.length === 0 && (
              <div className="text-center py-12">
                <p className="text-slate-500 dark:text-slate-400">No messages found</p>
              </div>
            )}
          </div>
        </div>
      )}

      {selectedMessage && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-slate-800 rounded-lg max-w-2xl w-full max-h-[80vh] overflow-y-auto">
            <div className="p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-xl font-semibold text-slate-900 dark:text-white">
                  Message Details
                </h3>
                <button
                  onClick={() => setSelectedMessage(null)}
                  className="text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200"
                >
                  ×
                </button>
              </div>

              <div className="space-y-4">
                <div className="flex items-center gap-3 pb-4 border-b dark:border-slate-700">
                  <div className="flex items-center gap-2">
                    <div className="w-10 h-10 rounded-full bg-blue-100 dark:bg-blue-900 flex items-center justify-center">
                      {selectedMessage.sender.profile_picture_url ? (
                        <img
                          src={selectedMessage.sender.profile_picture_url}
                          alt={selectedMessage.sender.name}
                          className="w-10 h-10 rounded-full object-cover"
                        />
                      ) : (
                        <User className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                      )}
                    </div>
                    <div>
                      <div className="font-medium text-slate-900 dark:text-white">
                        {selectedMessage.sender.name}
                      </div>
                      <div className="text-sm text-slate-500 dark:text-slate-400">
                        {selectedMessage.sender.email}
                      </div>
                    </div>
                  </div>
                  <span className="text-slate-400">→</span>
                  <div className="flex items-center gap-2">
                    <div className="w-10 h-10 rounded-full bg-green-100 dark:bg-green-900 flex items-center justify-center">
                      {selectedMessage.receiver.profile_picture_url ? (
                        <img
                          src={selectedMessage.receiver.profile_picture_url}
                          alt={selectedMessage.receiver.name}
                          className="w-10 h-10 rounded-full object-cover"
                        />
                      ) : (
                        <User className="w-5 h-5 text-green-600 dark:text-green-400" />
                      )}
                    </div>
                    <div>
                      <div className="font-medium text-slate-900 dark:text-white">
                        {selectedMessage.receiver.name}
                      </div>
                      <div className="text-sm text-slate-500 dark:text-slate-400">
                        {selectedMessage.receiver.email}
                      </div>
                    </div>
                  </div>
                </div>

                <div>
                  <div className="text-sm text-slate-500 dark:text-slate-400 mb-2">
                    Sent: {formatDateTime(selectedMessage.created_at)}
                  </div>
                  {selectedMessage.content && (
                    <div className="bg-slate-50 dark:bg-slate-700 rounded-lg p-4">
                      <p className="text-slate-900 dark:text-white whitespace-pre-wrap">
                        {selectedMessage.content}
                      </p>
                    </div>
                  )}
                </div>

                {selectedMessage.attachments.length > 0 && (
                  <div>
                    <h4 className="font-medium text-slate-900 dark:text-white mb-3">
                      Attachments ({selectedMessage.attachments.length})
                    </h4>
                    <div className="space-y-3">
                      {selectedMessage.attachments.map((attachment) => (
                        <div key={attachment.id} className="space-y-2">
                          <div className="flex items-center gap-2 text-sm text-slate-600 dark:text-slate-400">
                            {attachment.file_type === 'image' ? (
                              <ImageIcon className="w-4 h-4" />
                            ) : (
                              <Video className="w-4 h-4" />
                            )}
                            <span>{attachment.file_name}</span>
                          </div>
                          {attachment.file_type === 'image' ? (
                            <img
                              src={attachment.file_url}
                              alt={attachment.file_name}
                              className="rounded-lg max-w-full"
                            />
                          ) : (
                            <video
                              src={attachment.file_url}
                              controls
                              className="rounded-lg max-w-full"
                            />
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              <div className="mt-6 pt-4 border-t dark:border-slate-700">
                <button
                  onClick={() => setSelectedMessage(null)}
                  className="w-full px-4 py-2 bg-slate-100 dark:bg-slate-700 text-slate-900 dark:text-white rounded-lg hover:bg-slate-200 dark:hover:bg-slate-600 transition-colors"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

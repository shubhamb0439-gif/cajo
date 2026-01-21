import { useState, useEffect, useRef } from 'react';
import { supabase } from '../lib/supabase';
import { Search, X, ChevronRight, Book, HelpCircle, Lightbulb, Home } from 'lucide-react';

interface HelpCategory {
  id: string;
  name: string;
  icon: string;
  order: number;
}

interface HelpArticle {
  id: string;
  category_id: string;
  title: string;
  content: string;
  type: 'knowledgebase' | 'faq' | 'howto';
  tags: string[];
  order: number;
}

interface HelpChatbotProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function HelpChatbot({ isOpen, onClose }: HelpChatbotProps) {
  const [view, setView] = useState<'home' | 'category' | 'article'>('home');
  const [selectedType, setSelectedType] = useState<'knowledgebase' | 'faq' | 'howto' | null>(null);
  const [selectedCategory, setSelectedCategory] = useState<HelpCategory | null>(null);
  const [selectedArticle, setSelectedArticle] = useState<HelpArticle | null>(null);
  const [categories, setCategories] = useState<HelpCategory[]>([]);
  const [articles, setArticles] = useState<HelpArticle[]>([]);
  const [filteredArticles, setFilteredArticles] = useState<HelpArticle[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const contentRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (isOpen) {
      loadCategories();
      loadArticles();
    }
  }, [isOpen]);

  useEffect(() => {
    filterArticles();
  }, [searchQuery, articles, selectedType, selectedCategory]);

  const loadCategories = async () => {
    const { data, error } = await supabase
      .from('help_categories')
      .select('*')
      .order('order');

    if (!error && data) {
      setCategories(data);
    }
  };

  const loadArticles = async () => {
    const { data, error } = await supabase
      .from('help_articles')
      .select('*')
      .order('order');

    if (!error && data) {
      setArticles(data);
    }
  };

  const filterArticles = () => {
    let filtered = articles;

    if (selectedType) {
      filtered = filtered.filter(a => a.type === selectedType);
    }

    if (selectedCategory) {
      filtered = filtered.filter(a => a.category_id === selectedCategory.id);
    }

    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(a =>
        a.title.toLowerCase().includes(query) ||
        a.content.toLowerCase().includes(query) ||
        a.tags.some(tag => tag.toLowerCase().includes(query))
      );
    }

    setFilteredArticles(filtered);
  };

  const handleTypeSelect = (type: 'knowledgebase' | 'faq' | 'howto') => {
    setSelectedType(type);
    setSelectedCategory(null);
    setView('category');
    setSearchQuery('');
  };

  const handleCategorySelect = (category: HelpCategory) => {
    setSelectedCategory(category);
  };

  const handleArticleSelect = (article: HelpArticle) => {
    setSelectedArticle(article);
    setView('article');
  };

  const handleBack = () => {
    if (view === 'article') {
      setView('category');
      setSelectedArticle(null);
    } else if (view === 'category') {
      setView('home');
      setSelectedType(null);
      setSelectedCategory(null);
      setSearchQuery('');
    }
  };

  const handleHome = () => {
    setView('home');
    setSelectedType(null);
    setSelectedCategory(null);
    setSelectedArticle(null);
    setSearchQuery('');
  };

  const getIconForType = (type: string) => {
    switch (type) {
      case 'knowledgebase':
        return <Book className="w-5 h-5" />;
      case 'faq':
        return <HelpCircle className="w-5 h-5" />;
      case 'howto':
        return <Lightbulb className="w-5 h-5" />;
      default:
        return <Book className="w-5 h-5" />;
    }
  };

  const getTypeLabel = (type: string) => {
    switch (type) {
      case 'knowledgebase':
        return 'Knowledge Base';
      case 'faq':
        return 'FAQ';
      case 'howto':
        return 'How To Guides';
      default:
        return type;
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed bottom-20 right-6 w-96 h-[600px] bg-white dark:bg-slate-800 rounded-lg shadow-2xl flex flex-col z-[60] border border-slate-200 dark:border-slate-700">
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-slate-200 dark:border-slate-700 bg-gradient-to-r from-green-600 to-green-700 rounded-t-lg">
        <div className="flex items-center gap-3">
          {(view === 'category' || view === 'article') && (
            <button
              onClick={handleBack}
              className="text-white hover:bg-white/10 p-1 rounded transition-colors"
            >
              <ChevronRight className="w-5 h-5 rotate-180" />
            </button>
          )}
          {view !== 'home' && (
            <button
              onClick={handleHome}
              className="text-white hover:bg-white/10 p-1 rounded transition-colors"
            >
              <Home className="w-5 h-5" />
            </button>
          )}
          <h3 className="text-lg font-semibold text-white">
            {view === 'home' && 'Help Center'}
            {view === 'category' && selectedType && getTypeLabel(selectedType)}
            {view === 'article' && 'Article'}
          </h3>
        </div>
        <button
          onClick={onClose}
          className="text-white hover:bg-white/10 p-1 rounded transition-colors"
        >
          <X className="w-5 h-5" />
        </button>
      </div>

      {/* Search Bar */}
      {view !== 'home' && (
        <div className="p-4 border-b border-slate-200 dark:border-slate-700">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search help articles..."
              className="w-full pl-10 pr-4 py-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-green-500"
            />
          </div>
        </div>
      )}

      {/* Content */}
      <div ref={contentRef} className="flex-1 overflow-y-auto p-4">
        {view === 'home' && (
          <div className="space-y-3">
            <p className="text-sm text-slate-600 dark:text-slate-400 mb-4">
              Welcome to the CAJO ERP Help Center. Choose a section to get started:
            </p>

            <button
              onClick={() => handleTypeSelect('knowledgebase')}
              className="w-full flex items-center gap-3 p-4 bg-slate-50 dark:bg-slate-700/50 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg transition-colors text-left group"
            >
              <div className="p-2 bg-green-100 dark:bg-green-900/30 text-green-600 dark:text-green-400 rounded-lg">
                <Book className="w-5 h-5" />
              </div>
              <div className="flex-1">
                <h4 className="font-medium text-slate-900 dark:text-white">Knowledge Base</h4>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  Comprehensive guides and documentation
                </p>
              </div>
              <ChevronRight className="w-5 h-5 text-slate-400 group-hover:text-slate-600 dark:group-hover:text-slate-300" />
            </button>

            <button
              onClick={() => handleTypeSelect('faq')}
              className="w-full flex items-center gap-3 p-4 bg-slate-50 dark:bg-slate-700/50 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg transition-colors text-left group"
            >
              <div className="p-2 bg-green-100 dark:bg-green-900/30 text-green-600 dark:text-green-400 rounded-lg">
                <HelpCircle className="w-5 h-5" />
              </div>
              <div className="flex-1">
                <h4 className="font-medium text-slate-900 dark:text-white">FAQ</h4>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  Frequently asked questions
                </p>
              </div>
              <ChevronRight className="w-5 h-5 text-slate-400 group-hover:text-slate-600 dark:group-hover:text-slate-300" />
            </button>

            <button
              onClick={() => handleTypeSelect('howto')}
              className="w-full flex items-center gap-3 p-4 bg-slate-50 dark:bg-slate-700/50 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg transition-colors text-left group"
            >
              <div className="p-2 bg-green-100 dark:bg-green-900/30 text-green-600 dark:text-green-400 rounded-lg">
                <Lightbulb className="w-5 h-5" />
              </div>
              <div className="flex-1">
                <h4 className="font-medium text-slate-900 dark:text-white">How To Guides</h4>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  Step-by-step instructions for common tasks
                </p>
              </div>
              <ChevronRight className="w-5 h-5 text-slate-400 group-hover:text-slate-600 dark:group-hover:text-slate-300" />
            </button>
          </div>
        )}

        {view === 'category' && (
          <div className="space-y-2">
            {filteredArticles.length === 0 ? (
              <div className="text-center py-8">
                <p className="text-slate-500 dark:text-slate-400">
                  {searchQuery ? 'No articles found matching your search.' : 'No articles available in this section yet.'}
                </p>
              </div>
            ) : (
              filteredArticles.map((article) => (
                <button
                  key={article.id}
                  onClick={() => handleArticleSelect(article)}
                  className="w-full flex items-start gap-3 p-3 bg-slate-50 dark:bg-slate-700/50 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg transition-colors text-left group"
                >
                  <div className="mt-1">
                    {getIconForType(article.type)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <h4 className="font-medium text-slate-900 dark:text-white text-sm group-hover:text-green-600 dark:group-hover:text-green-400">
                      {article.title}
                    </h4>
                    {article.tags.length > 0 && (
                      <div className="flex flex-wrap gap-1 mt-1">
                        {article.tags.slice(0, 3).map((tag, idx) => (
                          <span
                            key={idx}
                            className="text-xs px-2 py-0.5 bg-slate-200 dark:bg-slate-600 text-slate-600 dark:text-slate-300 rounded"
                          >
                            {tag}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                  <ChevronRight className="w-4 h-4 text-slate-400 mt-1 group-hover:text-slate-600 dark:group-hover:text-slate-300" />
                </button>
              ))
            )}
          </div>
        )}

        {view === 'article' && selectedArticle && (
          <div className="prose prose-sm dark:prose-invert max-w-none">
            <h2 className="text-xl font-bold text-slate-900 dark:text-white mb-4">
              {selectedArticle.title}
            </h2>
            <div className="text-slate-700 dark:text-slate-300 whitespace-pre-wrap leading-relaxed">
              {selectedArticle.content}
            </div>
            {selectedArticle.tags.length > 0 && (
              <div className="mt-6 pt-4 border-t border-slate-200 dark:border-slate-700">
                <p className="text-xs font-medium text-slate-500 dark:text-slate-400 mb-2">Tags:</p>
                <div className="flex flex-wrap gap-2">
                  {selectedArticle.tags.map((tag, idx) => (
                    <span
                      key={idx}
                      className="text-xs px-2 py-1 bg-slate-200 dark:bg-slate-600 text-slate-600 dark:text-slate-300 rounded"
                    >
                      {tag}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

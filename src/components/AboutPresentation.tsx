import { useState } from 'react';
import {
  X, ChevronLeft, ChevronRight, Zap, Shield, Cloud, Target, TrendingUp, Rocket,
  Package, Factory, Briefcase, ShoppingCart, CheckCircle, ArrowRight, Lock,
  Smartphone, BarChart3, Users, FileText, Eye, Ticket, MessageSquare,
  Monitor, Database, Wifi, Activity, Crown, User, Globe, CheckSquare, BookOpen,
  Settings, MessageCircle, RotateCw, Server, RefreshCw
} from 'lucide-react';

interface AboutPresentationProps {
  isOpen: boolean;
  onClose: () => void;
}

const slides = [
  {
    title: 'Cajo ERP',
    subtitle: 'Complete Business Management Solution',
    content: (
      <div className="text-center h-full flex flex-col justify-center">
        <img src="/cajo_a.png" alt="Cajo Technologies Logo" className="w-24 h-24 mx-auto mb-6 filter drop-shadow-lg" />
        <h1 className="text-4xl font-bold mb-3 text-white dark:text-white">Cajo ERP</h1>
        <p className="text-xl mb-6 text-slate-300 dark:text-slate-300">Complete Business Management Solution</p>
        <p className="text-base text-slate-400 dark:text-slate-400 max-w-2xl mx-auto">
          Transform your business operations with our comprehensive ERP system.
          From inventory and manufacturing to sales and customer management—everything you need in one powerful platform.
        </p>
      </div>
    ),
  },
  {
    title: 'Why Choose Cajo ERP?',
    content: (
      <div className="h-full flex flex-col justify-center">
        <div className="grid grid-cols-3 gap-4 mb-6">
          {[
            { Icon: Zap, title: 'Real-Time Updates', desc: 'Instant data synchronization' },
            { Icon: Shield, title: 'Enterprise Security', desc: 'Bank-level encryption' },
            { Icon: Cloud, title: 'Cloud-Based', desc: 'Access anywhere, anytime' },
            { Icon: Target, title: 'Complete Traceability', desc: 'Track every product' },
            { Icon: BarChart3, title: 'Powerful Analytics', desc: 'Real-time insights' },
            { Icon: Rocket, title: 'Scalable Growth', desc: 'Grows with your business' },
          ].map((item, idx) => (
            <div key={idx} className="text-center p-3 bg-slate-700 dark:bg-slate-700 rounded-lg">
              <item.Icon className="w-8 h-8 mx-auto mb-2 text-green-400" />
              <h4 className="font-semibold text-sm mb-1 text-white dark:text-white">{item.title}</h4>
              <p className="text-xs text-slate-300 dark:text-slate-300">{item.desc}</p>
            </div>
          ))}
        </div>
        <div className="grid grid-cols-4 gap-3">
          {[
            { number: '8+', label: 'Major Modules' },
            { number: '40+', label: 'Features' },
            { number: '100%', label: 'Cloud-Based' },
            { number: '24/7', label: 'Availability' },
          ].map((stat, idx) => (
            <div key={idx} className="bg-green-600 dark:bg-green-600 text-white p-4 rounded-lg text-center">
              <div className="text-2xl font-bold mb-1">{stat.number}</div>
              <div className="text-xs uppercase tracking-wide">{stat.label}</div>
            </div>
          ))}
        </div>
      </div>
    ),
  },
  {
    title: 'Core Business Modules',
    content: (
      <div className="h-full flex items-center">
        <div className="grid grid-cols-2 gap-4 w-full">
          {[
            {
              Icon: Package,
              title: 'Inventory Management',
              features: ['Item master data', 'Stock monitoring & alerts', 'Serial number tracking', 'Cost tracking & averaging'],
            },
            {
              Icon: Factory,
              title: 'Manufacturing',
              features: ['BOM builder', 'Assembly management', 'FIFO consumption', 'Complete traceability'],
            },
            {
              Icon: Briefcase,
              title: 'Sales & CRM',
              features: ['Lead management', 'Customer database', 'Sales orders', 'Delivery management'],
            },
            {
              Icon: ShoppingCart,
              title: 'Procurement',
              features: ['Vendor management', 'Purchase orders', 'Lead time tracking', 'Vendor ratings'],
            },
          ].map((module, idx) => (
            <div key={idx} className="bg-slate-700 dark:bg-slate-700 rounded-lg p-4">
              <module.Icon className="w-8 h-8 mb-2 text-green-400" />
              <h3 className="text-base font-semibold mb-2 text-white dark:text-white">{module.title}</h3>
              <ul className="space-y-1">
                {module.features.map((feature, fIdx) => (
                  <li key={fIdx} className="text-xs text-slate-300 dark:text-slate-300 flex items-start">
                    <CheckCircle className="w-3 h-3 mr-2 mt-0.5 text-green-400 dark:text-green-400 flex-shrink-0" />
                    {feature}
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </div>
    ),
  },
  {
    title: 'Complete Product Traceability',
    content: (
      <div className="h-full flex flex-col justify-center">
        <p className="text-base mb-4 text-slate-300 dark:text-slate-300">
          Track every component from vendor to finished product to customer delivery. Know exactly which vendor supplied which component in which unit.
        </p>
        <div className="grid grid-cols-2 gap-3 mb-4">
          {[
            'Component-to-unit mapping',
            'Serial number tracking',
            'Vendor source tracking',
            'Assembly timestamps',
            'Delivery confirmation',
            'Complete audit trail',
            'Batch/lot tracking',
            'Quality assurance support',
          ].map((feature, idx) => (
            <div key={idx} className="bg-slate-700 dark:bg-slate-700 rounded-lg p-3 flex items-center">
              <ArrowRight className="w-4 h-4 mr-2 text-green-400 dark:text-green-400 flex-shrink-0" />
              <span className="text-sm text-white dark:text-white">{feature}</span>
            </div>
          ))}
        </div>
        <div className="bg-green-900/30 dark:bg-green-900/30 border-l-4 border-green-500 dark:border-green-500 p-4 rounded-lg">
          <h4 className="font-semibold text-green-400 dark:text-green-400 mb-1 text-sm">Complete Integration</h4>
          <p className="text-slate-300 dark:text-slate-300 text-xs">
            All modules work seamlessly together. Inventory updates automatically on receipt. Components consumed using FIFO logic during assembly. Stock adjusts in real-time on delivery.
          </p>
        </div>
      </div>
    ),
  },
  {
    title: 'Customer Portal',
    content: (
      <div className="h-full flex flex-col justify-center">
        <p className="text-base mb-4 text-slate-300 dark:text-slate-300">
          Give customers their own portal to track orders, monitor device status, and report issues—all without contacting support.
        </p>
        <div className="grid grid-cols-2 gap-3">
          {[
            'Real-time device monitoring',
            'QR code scanning',
            'Online/offline status tracking',
            'Support ticket creation',
            'Order history visibility',
            'Delivery tracking',
            'Self-service support',
            'Multi-device management',
          ].map((feature, idx) => (
            <div key={idx} className="bg-slate-700 dark:bg-slate-700 rounded-lg p-3 flex items-center">
              <CheckCircle className="w-4 h-4 mr-2 text-green-400 dark:text-green-400 flex-shrink-0" />
              <span className="text-sm text-white dark:text-white">{feature}</span>
            </div>
          ))}
        </div>
      </div>
    ),
  },
  {
    title: 'Security & Administration',
    content: (
      <div className="h-full flex flex-col justify-center">
        <div className="mb-4">
          <h3 className="text-lg font-semibold mb-2 text-white dark:text-white">Enterprise-Grade Security</h3>
          <p className="text-slate-300 dark:text-slate-300 mb-3 text-sm">Built with industry-leading security practices and compliance standards.</p>
          <div className="grid grid-cols-2 gap-2 mb-4">
            {[
              'Row-level security (RLS)',
              'Role-based access (RBAC)',
              'Encrypted data storage',
              'Secure authentication',
              'Activity audit trails',
              'Data isolation',
              'Password policies',
              'Session management',
            ].map((feature, idx) => (
              <div key={idx} className="bg-slate-700 dark:bg-slate-700 rounded-lg p-2 flex items-center">
                <Lock className="w-3 h-3 mr-2 text-green-400 dark:text-green-400 flex-shrink-0" />
                <span className="text-xs text-slate-300 dark:text-slate-300">{feature}</span>
              </div>
            ))}
          </div>
        </div>
        <div className="grid grid-cols-4 gap-3">
          {[
            { Icon: Crown, title: 'Administrator', desc: 'Full access' },
            { Icon: User, title: 'Standard User', desc: 'Operations' },
            { Icon: Users, title: 'Manager', desc: 'Customer mgmt' },
            { Icon: Globe, title: 'Client', desc: 'Self-service' },
          ].map((role, idx) => (
            <div key={idx} className="bg-green-600 dark:bg-green-600 p-3 rounded-lg text-center">
              <role.Icon className="w-6 h-6 mx-auto mb-1 text-white" />
              <h4 className="font-semibold text-white dark:text-white text-xs mb-0.5">{role.title}</h4>
              <p className="text-xs text-green-100 dark:text-green-100">{role.desc}</p>
            </div>
          ))}
        </div>
      </div>
    ),
  },
  {
    title: 'What Makes Cajo ERP Different',
    content: (
      <div className="h-full flex flex-col justify-center space-y-4">
        {[
          {
            Icon: TrendingUp,
            title: 'Smart Cost Management',
            features: ['Weighted average cost', 'Auto cost updates', 'Min/max tracking', 'Lead time averaging'],
          },
          {
            Icon: RefreshCw,
            title: 'FIFO Inventory',
            features: ['Automatic lot selection', 'Component age tracking', 'Receipt order enforcement', 'Accurate COGS'],
          },
          {
            Icon: Zap,
            title: 'Real-Time Sync',
            features: ['Live inventory updates', 'Instant alerts', 'Real-time order status', 'No page refresh'],
          },
        ].map((item, idx) => (
          <div key={idx} className="bg-slate-700 dark:bg-slate-700 rounded-lg p-3">
            <div className="flex items-start mb-2">
              <item.Icon className="w-6 h-6 mr-3 text-green-400" />
              <div>
                <h3 className="text-base font-semibold text-white dark:text-white">{item.title}</h3>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-2 ml-9">
              {item.features.map((feature, fIdx) => (
                <div key={fIdx} className="flex items-center text-xs text-slate-300 dark:text-slate-300">
                  <ArrowRight className="w-3 h-3 mr-1 text-green-400 dark:text-green-400 flex-shrink-0" />
                  {feature}
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    ),
  },
  {
    title: 'Sales & CRM',
    content: (
      <div className="h-full flex flex-col justify-center">
        <p className="text-base mb-4 text-slate-300 dark:text-slate-300">
          Manage your entire sales process from first contact to loyal customer.
        </p>
        <div className="grid grid-cols-2 gap-4">
          {[
            {
              Icon: Target,
              title: 'Lead Management',
              features: ['Lead capture', 'Source attribution', 'Status workflow', 'Conversion tracking'],
            },
            {
              Icon: Users,
              title: 'Prospects',
              features: ['Demo scheduling', 'Proposal management', 'Deal tracking', 'Win/loss analysis'],
            },
            {
              Icon: User,
              title: 'Customers',
              features: ['Complete profiles', 'Purchase history', 'Lifetime value', 'Account assignments'],
            },
            {
              Icon: FileText,
              title: 'Sales Orders',
              features: ['Quick creation', 'Serial numbers', 'Multi-item orders', 'Delivery tracking'],
            },
          ].map((module, idx) => (
            <div key={idx} className="bg-slate-700 dark:bg-slate-700 rounded-lg p-3">
              <module.Icon className="w-6 h-6 mb-2 text-green-400" />
              <h3 className="text-sm font-semibold mb-2 text-white dark:text-white">{module.title}</h3>
              <ul className="space-y-1">
                {module.features.map((feature, fIdx) => (
                  <li key={fIdx} className="text-xs text-slate-300 dark:text-slate-300 flex items-start">
                    <ArrowRight className="w-3 h-3 mr-1 mt-0.5 text-green-400 dark:text-green-400 flex-shrink-0" />
                    {feature}
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </div>
    ),
  },
  {
    title: 'Built with Modern Technology',
    content: (
      <div className="h-full flex flex-col justify-center">
        <p className="text-base mb-4 text-slate-300 dark:text-slate-300">
          Powered by cutting-edge cloud technology for exceptional performance, reliability, and scalability.
        </p>
        <div className="grid grid-cols-2 gap-4 mb-4">
          {[
            {
              Icon: Cloud,
              title: 'Cloud-Native',
              features: ['100% cloud-based', 'No installation', 'Automatic updates', '99.9% uptime'],
            },
            {
              Icon: Zap,
              title: 'Real-Time Engine',
              features: ['WebSocket connections', 'Instant sync', 'Live updates', 'Event-driven'],
            },
            {
              Icon: Database,
              title: 'PostgreSQL',
              features: ['Data integrity', 'ACID compliance', 'Advanced queries', 'Scalable'],
            },
            {
              Icon: Smartphone,
              title: 'Responsive',
              features: ['Mobile-optimized', 'Touch-friendly', 'QR scanning', 'Cross-browser'],
            },
          ].map((tech, idx) => (
            <div key={idx} className="bg-slate-700 dark:bg-slate-700 rounded-lg p-3">
              <tech.Icon className="w-6 h-6 mb-2 text-green-400" />
              <h3 className="text-sm font-semibold mb-2 text-white dark:text-white">{tech.title}</h3>
              <ul className="space-y-1">
                {tech.features.map((feature, fIdx) => (
                  <li key={fIdx} className="text-xs text-slate-300 dark:text-slate-300 flex items-start">
                    <CheckCircle className="w-3 h-3 mr-1 mt-0.5 text-green-400 dark:text-green-400 flex-shrink-0" />
                    {feature}
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
        <div className="grid grid-cols-4 gap-3">
          {[
            { number: '23', label: 'Tables' },
            { number: '100%', label: 'Real-Time' },
            { number: '∞', label: 'Scalable' },
            { label: 'Secure' },
          ].map((stat, idx) => (
            <div key={idx} className="bg-green-600 dark:bg-green-600 text-white p-3 rounded-lg text-center">
              {stat.number ? (
                <div className="text-2xl font-bold mb-1">{stat.number}</div>
              ) : (
                <Shield className="w-7 h-7 mx-auto mb-1" />
              )}
              <div className="text-xs uppercase tracking-wide">{stat.label}</div>
            </div>
          ))}
        </div>
      </div>
    ),
  },
  {
    title: 'Perfect For Your Business',
    content: (
      <div className="h-full flex flex-col justify-center space-y-3">
        {[
          {
            Icon: Factory,
            title: 'Manufacturers',
            benefits: ['BOM management', 'Assembly tracking', 'Component traceability', 'FIFO consumption', 'Production efficiency'],
          },
          {
            Icon: Package,
            title: 'Distributors & Wholesalers',
            benefits: ['Multi-vendor management', 'Stock optimization', 'Vendor tracking', 'Real-time visibility', 'Customer portal'],
          },
          {
            Icon: Monitor,
            title: 'Service & Technology',
            benefits: ['Device tracking', 'Self-service portal', 'Ticket management', 'Online/offline monitoring', 'Customer lifecycle'],
          },
        ].map((useCase, idx) => (
          <div key={idx} className="bg-slate-700 dark:bg-slate-700 rounded-lg p-4">
            <div className="flex items-center mb-2">
              <useCase.Icon className="w-8 h-8 mr-3 text-green-400" />
              <h3 className="text-lg font-semibold text-white dark:text-white">{useCase.title}</h3>
            </div>
            <div className="grid grid-cols-3 gap-2 ml-11">
              {useCase.benefits.map((benefit, bIdx) => (
                <div key={bIdx} className="flex items-start text-xs text-slate-300 dark:text-slate-300">
                  <CheckCircle className="w-3 h-3 mr-1 mt-0.5 text-green-400 dark:text-green-400 flex-shrink-0" />
                  {benefit}
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    ),
  },
  {
    title: 'Ready to Transform Your Business?',
    content: (
      <div className="h-full flex flex-col justify-center text-center">
        <p className="text-base mb-6 text-slate-300 dark:text-slate-300 max-w-3xl mx-auto">
          Join forward-thinking companies that have transformed their operations with Cajo ERP.
          From inventory and manufacturing to sales and customer management, everything you need is here.
        </p>
        <div className="grid grid-cols-3 gap-3 mb-6">
          {[
            { Icon: CheckSquare, title: 'Complete Setup', desc: 'Full system configuration' },
            { Icon: BookOpen, title: 'Training', desc: 'User training' },
            { Icon: Settings, title: 'Customization', desc: 'Tailor to needs' },
            { Icon: MessageCircle, title: 'Support', desc: 'Dedicated team' },
            { Icon: RefreshCw, title: 'Updates', desc: 'Regular improvements' },
            { Icon: Shield, title: 'Security', desc: 'Enterprise-grade' },
          ].map((benefit, idx) => (
            <div key={idx} className="bg-slate-700 dark:bg-slate-700 p-3 rounded-lg">
              <benefit.Icon className="w-6 h-6 mb-1 text-green-400" />
              <h4 className="font-semibold text-white dark:text-white text-xs mb-0.5">{benefit.title}</h4>
              <p className="text-xs text-slate-300 dark:text-slate-300">{benefit.desc}</p>
            </div>
          ))}
        </div>
        <div className="grid grid-cols-4 gap-3">
          {[
            { number: '8+', label: 'Core Modules' },
            { number: '40+', label: 'Features' },
            { number: '23+', label: 'Tables' },
            { number: '∞', label: 'Possibilities' },
          ].map((stat, idx) => (
            <div key={idx} className="bg-green-600 dark:bg-green-600 text-white p-4 rounded-lg text-center">
              <div className="text-2xl font-bold mb-1">{stat.number}</div>
              <div className="text-xs uppercase tracking-wide">{stat.label}</div>
            </div>
          ))}
        </div>
      </div>
    ),
  },
];

export default function AboutPresentation({ isOpen, onClose }: AboutPresentationProps) {
  const [currentSlide, setCurrentSlide] = useState(0);

  if (!isOpen) return null;

  const goToNext = () => {
    if (currentSlide < slides.length - 1) {
      setCurrentSlide(currentSlide + 1);
    }
  };

  const goToPrevious = () => {
    if (currentSlide > 0) {
      setCurrentSlide(currentSlide - 1);
    }
  };

  const currentSlideData = slides[currentSlide];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900 dark:bg-slate-900 border-t-[3px]" style={{ borderTopColor: '#b5272d' }}>
      <button
        onClick={onClose}
        className="absolute top-4 right-4 p-2 rounded-lg bg-slate-700 hover:bg-slate-600 dark:bg-slate-700 dark:hover:bg-slate-600 text-white transition-colors z-10"
      >
        <X className="w-6 h-6" />
      </button>

      <div className="w-full h-full flex flex-col">
        <div className="flex-1 flex flex-col items-center justify-center px-12 py-8 overflow-hidden bg-slate-800 dark:bg-slate-800">
          <div className="max-w-6xl w-full h-full flex flex-col">
            {currentSlideData.title && currentSlide !== 0 && (
              <h2 className="text-3xl font-bold mb-6 text-white dark:text-white text-center">{currentSlideData.title}</h2>
            )}
            <div className="text-white dark:text-white flex-1 flex flex-col">{currentSlideData.content}</div>
          </div>
        </div>

        <div className="bg-slate-900 dark:bg-slate-900 px-8 py-3 flex items-center justify-between border-t border-slate-700 dark:border-slate-700">
          <button
            onClick={goToPrevious}
            disabled={currentSlide === 0}
            className="flex items-center space-x-2 px-6 py-2 rounded-lg bg-slate-700 hover:bg-slate-600 dark:bg-slate-700 dark:hover:bg-slate-600 text-white disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
          >
            <ChevronLeft className="w-5 h-5" />
            <span className="font-medium">Previous</span>
          </button>

          <div className="flex items-center space-x-3">
            <span className="text-white dark:text-white font-medium">
              {currentSlide + 1} / {slides.length}
            </span>
            <div className="flex space-x-1">
              {slides.map((_, idx) => (
                <button
                  key={idx}
                  onClick={() => setCurrentSlide(idx)}
                  className={`w-2 h-2 rounded-full transition-colors ${
                    idx === currentSlide ? 'bg-green-500 dark:bg-green-500' : 'bg-slate-600 dark:bg-slate-600'
                  }`}
                />
              ))}
            </div>
          </div>

          <button
            onClick={goToNext}
            disabled={currentSlide === slides.length - 1}
            className="flex items-center space-x-2 px-6 py-2 rounded-lg bg-green-600 hover:bg-green-700 dark:bg-green-600 dark:hover:bg-green-700 text-white disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
          >
            <span className="font-medium">Next</span>
            <ChevronRight className="w-5 h-5" />
          </button>
        </div>
      </div>
    </div>
  );
}

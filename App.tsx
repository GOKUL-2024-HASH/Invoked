
import React, { useState, useCallback } from 'react';
import { getPedagogicalAdvice } from './services/geminiService';
import { PedagogicalGuidance, AppState } from './types';

const DEMO_PROMPTS = [
  "Students are talking loudly while I am teaching",
  "The lesson is too fast for half the class",
  "A student is refusing to participate",
  "Restless energy after lunch break"
];

const App: React.FC = () => {
  const [problem, setProblem] = useState('');
  const [status, setStatus] = useState<AppState>('IDLE');
  const [guidance, setGuidance] = useState<PedagogicalGuidance | null>(null);
  const [showRationale, setShowRationale] = useState(false);
  const [reflection, setReflection] = useState<'HELPED' | 'NOT_HELPED' | null>(null);

  const handleGetHelp = useCallback(async (customPrompt?: string) => {
    const activePrompt = customPrompt || problem;
    if (!activePrompt.trim()) return;

    if (customPrompt) setProblem(customPrompt);

    setStatus('LOADING');
    setShowRationale(false);
    setReflection(null);
    const result = await getPedagogicalAdvice(activePrompt);
    setGuidance(result.data);
    setStatus(result.isFallback ? 'FALLBACK' : 'SUCCESS');
    
    setTimeout(() => {
      window.scrollTo({ top: document.body.scrollHeight, behavior: 'smooth' });
    }, 100);
  }, [problem]);

  return (
    <div className="app-container max-w-md mx-auto px-4 py-6 sm:py-8 bg-gray-50 flex flex-col min-h-screen">
      {/* 1. Header */}
      <header className="mb-6 text-left">
        <h1 className="text-xl font-bold text-gray-900 leading-tight">
          Classroom Help
        </h1>
        <p className="text-sm text-gray-500 mt-1">
          Describe what’s happening in your class right now
        </p>
      </header>

      {/* 2. Input Section */}
      <section className="relative mb-3">
        <div className="relative">
          <textarea
            value={problem}
            onChange={(e) => setProblem(e.target.value)}
            disabled={status === 'LOADING'}
            placeholder="Example: Some students don’t understand subtraction and others are getting restless"
            className="w-full h-32 p-4 text-base border border-gray-300 rounded-xl bg-white shadow-sm resize-none transition-all placeholder:text-gray-400 focus:ring-2 focus:ring-blue-500"
          />
          <div className="absolute right-3 bottom-3 opacity-40 hover:opacity-60 cursor-pointer p-2">
            <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M12 2a3 3 0 0 0-3 3v7a3 3 0 0 0 6 0V5a3 3 0 0 0-3-3Z"/><path d="M19 10v2a7 7 0 0 1-14 0v-2"/><line x1="12" x2="12" y1="19" y2="22"/>
            </svg>
          </div>
        </div>
      </section>

      {/* Demo Prompts */}
      <div className="mb-6">
        <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-2 px-1">Try these common situations:</p>
        <div className="flex flex-wrap gap-2">
          {DEMO_PROMPTS.map((p, i) => (
            <button
              key={i}
              onClick={() => handleGetHelp(p)}
              disabled={status === 'LOADING'}
              className="text-left text-xs bg-white border border-gray-200 text-gray-600 px-3 py-2 rounded-lg shadow-sm hover:border-blue-300 hover:text-blue-600 transition-colors active:bg-blue-50"
            >
              {p}
            </button>
          ))}
        </div>
      </div>

      {/* 3. Primary Action Button */}
      <button
        onClick={() => handleGetHelp()}
        disabled={status === 'LOADING' || !problem.trim()}
        className={`w-full py-4 text-lg font-bold rounded-xl transition-all shadow-md active:scale-[0.98] ${
          status === 'LOADING' 
            ? 'bg-blue-200 text-blue-700 cursor-not-allowed' 
            : 'bg-blue-600 text-white hover:bg-blue-700 active:bg-blue-800'
        }`}
      >
        {status === 'LOADING' ? (
          <span className="flex items-center justify-center gap-2">
            <svg className="animate-spin h-5 w-5 text-blue-700" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
            </svg>
            Finding the best approach...
          </span>
        ) : (
          'Get Help Now'
        )}
      </button>

      {/* 4. Response Section */}
      {guidance && (
        <div className="mt-8 space-y-4 animate-in fade-in slide-in-from-bottom-4 duration-500">
          
          {/* Constraint Awareness Indicators */}
          <div className="flex flex-wrap gap-2 mb-2">
            {guidance.badges.map((badge, idx) => (
              <span key={idx} className="px-2 py-0.5 bg-gray-200 text-gray-700 text-[10px] font-semibold rounded uppercase tracking-wide">
                {badge}
              </span>
            ))}
          </div>

          <ResponseCard 
            title="Do This Now" 
            content={guidance.doNow} 
            borderColor="border-green-500"
            footer={`⏱️ ${guidance.timeEstimate}`}
            bgIcon={<svg className="w-6 h-6 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" /></svg>}
          />
          <ResponseCard 
            title="Explain Like This" 
            content={guidance.explainLikeThis} 
            borderColor="border-amber-500"
            bgIcon={<svg className="w-6 h-6 text-amber-600" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" /></svg>}
          />
          <ResponseCard 
            title="Try This Activity" 
            content={guidance.tryThisActivity} 
            borderColor="border-indigo-500"
            bgIcon={<svg className="w-6 h-6 text-indigo-600" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" /></svg>}
          />

          {/* Decision Rationale */}
          <div className="pt-2 border-t border-gray-200">
            <button 
              onClick={() => setShowRationale(!showRationale)}
              className="flex items-center gap-1 text-xs font-semibold text-gray-500 hover:text-gray-700 transition-colors uppercase tracking-wider"
            >
              <svg className={`w-3 h-3 transition-transform ${showRationale ? 'rotate-180' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M19 9l-7 7-7-7" />
              </svg>
              Why this suggestion works
            </button>
            {showRationale && (
              <div className="mt-2 text-sm text-gray-600 leading-relaxed bg-white/50 p-3 rounded-lg border border-gray-100 italic">
                {guidance.rationale}
              </div>
            )}
          </div>

          {/* Alternative Strategy */}
          <div className="mt-6 p-4 bg-gray-100 rounded-xl border border-gray-200">
            <h3 className="text-[10px] font-bold uppercase tracking-widest text-gray-500 mb-2">
              Alternative approach (if this doesn't work)
            </h3>
            <p className="text-sm text-gray-700 font-medium">
              {guidance.alternativeStrategy}
            </p>
          </div>

          {/* Reflection & Next Step Support */}
          <div className="mt-8 pt-6 border-t border-gray-200">
            <div className="flex flex-col items-center">
              <p className="text-sm font-semibold text-gray-700 mb-4">Did this approach help in your class?</p>
              <div className="flex gap-4 w-full">
                <button 
                  onClick={() => setReflection('HELPED')}
                  className={`flex-1 py-3 px-4 rounded-xl text-sm font-bold flex items-center justify-center gap-2 transition-all ${
                    reflection === 'HELPED' 
                    ? 'bg-green-600 text-white shadow-inner' 
                    : 'bg-white border border-gray-200 text-gray-600 hover:bg-green-50'
                  }`}
                >
                  <span className="text-lg">✅</span> Yes, it helped
                </button>
                <button 
                  onClick={() => setReflection('NOT_HELPED')}
                  className={`flex-1 py-3 px-4 rounded-xl text-sm font-bold flex items-center justify-center gap-2 transition-all ${
                    reflection === 'NOT_HELPED' 
                    ? 'bg-amber-600 text-white shadow-inner' 
                    : 'bg-white border border-gray-200 text-gray-600 hover:bg-amber-50'
                  }`}
                >
                  <span className="text-lg">⚠️</span> Partially / No
                </button>
              </div>

              {reflection && (
                <div className="mt-6 w-full p-4 rounded-xl bg-blue-50 border border-blue-100 animate-in fade-in zoom-in-95 duration-300">
                  <h4 className="text-[10px] font-bold uppercase tracking-widest text-blue-500 mb-1">
                    {reflection === 'HELPED' ? 'Suggested next step:' : 'Try this next instead:'}
                  </h4>
                  <p className="text-sm text-blue-900 font-medium leading-relaxed">
                    {reflection === 'HELPED' ? guidance.reinforcingAction : guidance.backupAction}
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* 5. Reliability Feedback */}
      <footer className="mt-auto pt-8 pb-4 text-center">
        {status === 'FALLBACK' && (
          <p className="text-[10px] text-gray-400 font-medium uppercase tracking-wider">
            Showing offline-approved guidance to avoid disruption.
          </p>
        )}
      </footer>
    </div>
  );
};

interface ResponseCardProps {
  title: string;
  content: string;
  borderColor: string;
  bgIcon: React.ReactNode;
  footer?: string;
}

const ResponseCard: React.FC<ResponseCardProps> = ({ title, content, borderColor, bgIcon, footer }) => {
  return (
    <div className={`bg-white border-l-4 ${borderColor} p-4 rounded-r-xl shadow-sm flex items-start gap-3`}>
      <div className="flex-shrink-0 mt-1 opacity-80">
        {bgIcon}
      </div>
      <div className="flex-grow">
        <h3 className="text-xs font-bold uppercase tracking-widest text-gray-500 mb-1">
          {title}
        </h3>
        <p className="text-[15px] leading-relaxed font-medium text-gray-800">
          {content}
        </p>
        {footer && (
          <div className="mt-2 pt-1 border-t border-gray-50 text-[10px] font-semibold text-gray-400 uppercase tracking-wide">
            {footer}
          </div>
        )}
      </div>
    </div>
  );
};

export default App;

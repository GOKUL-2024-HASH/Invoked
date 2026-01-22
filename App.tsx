
import React, { useState, useCallback, useRef, useEffect } from 'react';
import { GoogleGenAI, Modality, LiveServerMessage } from '@google/genai';
import { getPedagogicalAdvice } from './services/geminiService';
import { PedagogicalGuidance, AppState } from './types';

const DEMO_PROMPTS = [
  "Some students don’t understand subtraction and others are getting restless.",
  "My class is noisy during group work and I’m losing control.",
  "A few students finish early and start disturbing others.",
  "Students look bored and are not participating in today’s lesson."
];

// Audio Utilities
function encode(bytes: Uint8Array) {
  let binary = '';
  const len = bytes.byteLength;
  for (let i = 0; i < len; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
}

function decode(base64: string) {
  const binaryString = atob(base64);
  const len = binaryString.length;
  const bytes = new Uint8Array(len);
  for (let i = 0; i < len; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }
  return bytes;
}

async function decodeAudioData(
  data: Uint8Array,
  ctx: AudioContext,
  sampleRate: number,
  numChannels: number,
): Promise<AudioBuffer> {
  const dataInt16 = new Int16Array(data.buffer);
  const frameCount = dataInt16.length / numChannels;
  const buffer = ctx.createBuffer(numChannels, frameCount, sampleRate);

  for (let channel = 0; channel < numChannels; channel++) {
    const channelData = buffer.getChannelData(channel);
    for (let i = 0; i < frameCount; i++) {
      channelData[i] = dataInt16[i * numChannels + channel] / 32768.0;
    }
  }
  return buffer;
}

const SILENCE_THRESHOLD = 0.01; // Sensitivity for silence detection
const SILENCE_TIMEOUT = 5000; // 5 seconds of silence to stop

const App: React.FC = () => {
  const [problem, setProblem] = useState('');
  const [status, setStatus] = useState<AppState>('IDLE');
  const [guidance, setGuidance] = useState<PedagogicalGuidance | null>(null);
  const [showRationale, setShowRationale] = useState(false);
  const [reflection, setReflection] = useState<'HELPED' | 'NOT_HELPED' | null>(null);

  // Live Assistant State
  const [isLive, setIsLive] = useState(false);
  const [liveTranscript, setLiveTranscript] = useState('');
  const [aiTranscript, setAiTranscript] = useState('');
  const [micLevel, setMicLevel] = useState(0);
  
  const audioContextRef = useRef<AudioContext | null>(null);
  const outputAudioContextRef = useRef<AudioContext | null>(null);
  const nextStartTimeRef = useRef(0);
  const sessionRef = useRef<any>(null);
  const sourcesRef = useRef<Set<AudioBufferSourceNode>>(new Set());
  const lastAudioTimeRef = useRef<number>(Date.now());
  const silenceTimerRef = useRef<number | null>(null);

  const stopLiveSession = useCallback(() => {
    if (sessionRef.current) {
      sessionRef.current.close();
      sessionRef.current = null;
    }
    if (audioContextRef.current) {
      audioContextRef.current.close();
      audioContextRef.current = null;
    }
    if (outputAudioContextRef.current) {
      outputAudioContextRef.current.close();
      outputAudioContextRef.current = null;
    }
    if (silenceTimerRef.current) {
      window.clearInterval(silenceTimerRef.current);
      silenceTimerRef.current = null;
    }
    setIsLive(false);
    setMicLevel(0);
    for (const source of sourcesRef.current) {
      source.stop();
    }
    sourcesRef.current.clear();
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return () => stopLiveSession();
  }, [stopLiveSession]);

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

  const startLiveSession = useCallback(async () => {
    try {
      // Clear previous transcripts
      setLiveTranscript('');
      setAiTranscript('');

      // Initialize with process.env.API_KEY directly per guidelines.
      const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      
      const inputCtx = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 16000 });
      const outputCtx = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 24000 });
      audioContextRef.current = inputCtx;
      outputAudioContextRef.current = outputCtx;
      
      // Setup Analyser for Silence Detection
      const analyser = inputCtx.createAnalyser();
      analyser.fftSize = 256;
      const dataArray = new Float32Array(analyser.frequencyBinCount);

      const sessionPromise = ai.live.connect({
        model: 'gemini-2.5-flash-native-audio-preview-12-2025',
        callbacks: {
          onopen: () => {
            const source = inputCtx.createMediaStreamSource(stream);
            const scriptProcessor = inputCtx.createScriptProcessor(4096, 1, 1);
            
            source.connect(analyser);
            
            scriptProcessor.onaudioprocess = (e) => {
              const inputData = e.inputBuffer.getChannelData(0);
              
              // Calculate volume level for silence detection
              let sum = 0;
              for (let i = 0; i < inputData.length; i++) {
                sum += inputData[i] * inputData[i];
              }
              const rms = Math.sqrt(sum / inputData.length);
              setMicLevel(rms);

              if (rms > SILENCE_THRESHOLD) {
                lastAudioTimeRef.current = Date.now();
              }

              const int16 = new Int16Array(inputData.length);
              for (let i = 0; i < inputData.length; i++) {
                int16[i] = inputData[i] * 32768;
              }
              const pcmBlob = {
                data: encode(new Uint8Array(int16.buffer)),
                mimeType: 'audio/pcm;rate=16000',
              };
              
              sessionPromise.then(session => {
                if (session) session.sendRealtimeInput({ media: pcmBlob });
              });
            };
            
            source.connect(scriptProcessor);
            scriptProcessor.connect(inputCtx.destination);
            setIsLive(true);
            lastAudioTimeRef.current = Date.now();

            // Start silence detection timer
            silenceTimerRef.current = window.setInterval(() => {
              if (Date.now() - lastAudioTimeRef.current > SILENCE_TIMEOUT) {
                console.log("Silence detected, stopping session...");
                stopLiveSession();
              }
            }, 1000);
          },
          onmessage: async (message: LiveServerMessage) => {
            // Handle Audio Output
            const base64Audio = message.serverContent?.modelTurn?.parts?.[0]?.inlineData?.data;
            if (base64Audio && outputCtx) {
              nextStartTimeRef.current = Math.max(nextStartTimeRef.current, outputCtx.currentTime);
              const audioBuffer = await decodeAudioData(decode(base64Audio), outputCtx, 24000, 1);
              const source = outputCtx.createBufferSource();
              source.buffer = audioBuffer;
              source.connect(outputCtx.destination);
              source.start(nextStartTimeRef.current);
              nextStartTimeRef.current += audioBuffer.duration;
              sourcesRef.current.add(source);
              source.onended = () => sourcesRef.current.delete(source);
              
              // If AI is speaking, keep the session alive
              lastAudioTimeRef.current = Date.now();
            }

            // Handle Transcriptions
            if (message.serverContent?.inputTranscription?.text) {
              setLiveTranscript(prev => prev + message.serverContent!.inputTranscription!.text + ' ');
              lastAudioTimeRef.current = Date.now();
            }
            if (message.serverContent?.outputTranscription?.text) {
              setAiTranscript(prev => prev + message.serverContent!.outputTranscription!.text + ' ');
              lastAudioTimeRef.current = Date.now();
            }
            
            if (message.serverContent?.interrupted) {
              for (const source of sourcesRef.current) source.stop();
              sourcesRef.current.clear();
              nextStartTimeRef.current = 0;
            }
          },
          onerror: (e) => {
            console.error("Live Error:", e);
            stopLiveSession();
          },
          onclose: () => stopLiveSession(),
        },
        config: {
          responseModalities: [Modality.AUDIO],
          speechConfig: {
            voiceConfig: { prebuiltVoiceConfig: { voiceName: 'Zephyr' } },
          },
          inputAudioTranscription: {},
          outputAudioTranscription: {},
          systemInstruction: 'You are a pedagogical assistant. Provide immediate, 1-2 sentence spoken advice based on the teacher\'s description. Be calm and supportive. Focus on actionable classroom steps.',
        }
      });

      sessionRef.current = await sessionPromise;
    } catch (err) {
      console.error("Failed to start live session:", err);
      setIsLive(false);
    }
  }, [stopLiveSession]);

  return (
    <div className="app-container max-w-md mx-auto px-4 py-6 sm:py-8 bg-gray-50 flex flex-col min-h-screen">
      {/* 1. Header */}
      <header className="mb-6 text-left flex justify-between items-center">
        <div>
          <h1 className="text-xl font-bold text-gray-900 leading-tight">
            Classroom Help
          </h1>
          <p className="text-sm text-gray-500 mt-1">
            {isLive ? 'Live Voice Mode' : 'Instant Pedagogical Support'}
          </p>
        </div>
        {isLive && (
          <div className="flex items-center gap-2">
            <div className="h-1.5 w-12 bg-gray-200 rounded-full overflow-hidden flex items-center">
                <div 
                    className="h-full bg-blue-500 transition-all duration-100" 
                    style={{ width: `${Math.min(100, micLevel * 500)}%` }}
                ></div>
            </div>
            <span className="flex h-3 w-3 relative">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-3 w-3 bg-red-500"></span>
            </span>
          </div>
        )}
      </header>

      {/* 2. Input Section */}
      <section className="relative mb-3">
        <div className="relative">
          <textarea
            value={problem}
            onChange={(e) => setProblem(e.target.value)}
            disabled={status === 'LOADING' || isLive}
            placeholder={isLive ? "Listening for your voice..." : "Example: My class is noisy during group work..."}
            className={`w-full h-32 p-4 text-base border border-gray-300 rounded-xl bg-white shadow-sm resize-none transition-all placeholder:text-gray-400 focus:ring-2 focus:ring-blue-500 ${isLive ? 'bg-blue-50/30' : ''}`}
          />
          <button 
            onClick={isLive ? stopLiveSession : startLiveSession}
            className={`absolute right-3 bottom-3 p-3 rounded-full transition-all duration-300 ${isLive ? 'bg-red-500 text-white pulse shadow-lg' : 'bg-gray-100 text-gray-400 hover:text-blue-600 hover:bg-blue-50'}`}
            aria-label={isLive ? "Stop" : "Speak"}
          >
            {isLive ? (
               <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><rect width="12" height="12" x="6" y="6" rx="2"/></svg>
            ) : (
                <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M12 2a3 3 0 0 0-3 3v7a3 3 0 0 0 6 0V5a3 3 0 0 0-3-3Z"/><path d="M19 10v2a7 7 0 0 1-14 0v-2"/><line x1="12" x2="12" y1="19" y2="22"/>
                </svg>
            )}
          </button>
        </div>
        {isLive && (
            <p className="text-[10px] text-gray-400 text-center mt-2 font-bold uppercase tracking-widest animate-pulse">
                Assistant stops after 5s of silence
            </p>
        )}
      </section>

      {/* Live Transcript Display - Show both during and after session until new one starts */}
      {(liveTranscript || aiTranscript) && (
        <div className="mb-6 p-4 bg-white border border-gray-200 rounded-xl shadow-sm animate-in fade-in slide-in-from-top-2">
          {liveTranscript && (
            <div className="mb-3">
              <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest block mb-1">Your Context:</span>
              <p className="text-sm text-gray-700 leading-relaxed italic">"{liveTranscript.trim()}"</p>
            </div>
          )}
          {aiTranscript && (
            <div className="mt-3 border-t border-gray-100 pt-3">
              <span className="text-[10px] font-bold text-blue-500 uppercase tracking-widest block mb-1">AI Feedback:</span>
              <p className="text-sm text-gray-900 font-bold leading-relaxed">{aiTranscript.trim()}</p>
            </div>
          )}
        </div>
      )}

      {/* Demo Prompts */}
      {!isLive && !guidance && (
        <div className="mb-6">
          <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-2 px-1">Try these examples:</p>
          <div className="flex flex-col gap-2">
            {DEMO_PROMPTS.map((p, i) => (
              <button
                key={i}
                onClick={() => handleGetHelp(p)}
                disabled={status === 'LOADING'}
                className="text-left text-xs bg-white border border-gray-200 text-gray-600 px-3 py-2 rounded-lg shadow-sm hover:border-blue-300 hover:text-blue-600 transition-colors active:bg-blue-50"
              >
                "{p}"
              </button>
            ))}
          </div>
        </div>
      )}

      {/* 3. Primary Action Button */}
      {!isLive && (
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
              Thinking...
            </span>
          ) : (
            'Get Structured Advice'
          )}
        </button>
      )}

      {/* 4. Response Section (Text-based mode) */}
      {guidance && !isLive && (
        <div className="mt-8 space-y-4 animate-in fade-in slide-in-from-bottom-4 duration-500 pb-12">
          
          <div className="flex flex-wrap gap-2 mb-2">
            {guidance.badges.map((badge, idx) => (
              <span key={idx} className="px-2 py-0.5 bg-gray-200 text-gray-700 text-[10px] font-semibold rounded uppercase tracking-wide">
                {badge}
              </span>
            ))}
          </div>

          <ResponseCard 
            title="Immediate Step" 
            content={guidance.doNow} 
            borderColor="border-green-500"
            footer={`⏱️ ${guidance.timeEstimate}`}
            bgIcon={<svg className="w-6 h-6 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" /></svg>}
          />
          <ResponseCard 
            title="What to Say" 
            content={guidance.explainLikeThis} 
            borderColor="border-amber-500"
            bgIcon={<svg className="w-6 h-6 text-amber-600" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" /></svg>}
          />
          <ResponseCard 
            title="Class Activity" 
            content={guidance.tryThisActivity} 
            borderColor="border-indigo-500"
            bgIcon={<svg className="w-6 h-6 text-indigo-600" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" /></svg>}
          />

          <div className="pt-2">
            <button 
              onClick={() => setShowRationale(!showRationale)}
              className="flex items-center gap-1 text-[10px] font-bold text-gray-400 hover:text-gray-600 transition-colors uppercase tracking-widest"
            >
              <svg className={`w-3 h-3 transition-transform ${showRationale ? 'rotate-180' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M19 9l-7 7-7-7" />
              </svg>
              The Pedagogy behind this
            </button>
            {showRationale && (
              <div className="mt-2 text-sm text-gray-600 leading-relaxed bg-white p-3 rounded-lg border border-gray-100 italic">
                {guidance.rationale}
              </div>
            )}
          </div>

          <div className="mt-6 p-4 bg-gray-100 rounded-xl border border-gray-200">
            <h3 className="text-[10px] font-bold uppercase tracking-widest text-gray-500 mb-2">
              If that doesn't work:
            </h3>
            <p className="text-sm text-gray-700 font-medium">
              {guidance.alternativeStrategy}
            </p>
          </div>

          <div className="mt-8 pt-6 border-t border-gray-200">
            <div className="flex flex-col items-center">
              <p className="text-sm font-semibold text-gray-700 mb-4">Did this approach help?</p>
              <div className="flex gap-4 w-full">
                <button 
                  onClick={() => setReflection('HELPED')}
                  className={`flex-1 py-3 px-4 rounded-xl text-sm font-bold flex items-center justify-center gap-2 transition-all ${
                    reflection === 'HELPED' 
                    ? 'bg-green-600 text-white shadow-inner' 
                    : 'bg-white border border-gray-200 text-gray-600 hover:bg-green-50'
                  }`}
                >
                  Yes
                </button>
                <button 
                  onClick={() => setReflection('NOT_HELPED')}
                  className={`flex-1 py-3 px-4 rounded-xl text-sm font-bold flex items-center justify-center gap-2 transition-all ${
                    reflection === 'NOT_HELPED' 
                    ? 'bg-amber-600 text-white shadow-inner' 
                    : 'bg-white border border-gray-200 text-gray-600 hover:bg-amber-50'
                  }`}
                >
                  Not quite
                </button>
              </div>

              {reflection && (
                <div className="mt-6 w-full p-4 rounded-xl bg-blue-50 border border-blue-100 animate-in fade-in zoom-in-95 duration-300">
                  <h4 className="text-[10px] font-bold uppercase tracking-widest text-blue-500 mb-1">
                    {reflection === 'HELPED' ? 'Consolidate learning:' : 'Alternative tactical move:'}
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
        {status === 'FALLBACK' && !isLive && (
          <p className="text-[10px] text-gray-400 font-medium uppercase tracking-wider">
            Using offline-ready pedagogy to ensure uptime.
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

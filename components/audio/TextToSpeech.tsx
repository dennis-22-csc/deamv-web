import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Volume2, VolumeX, Play, Pause, SkipForward, RotateCcw } from 'lucide-react';
import Button from '@/components/ui/Button';

interface TextToSpeechProps {
  text?: string;
  rate?: number;
  pitch?: number;
  volume?: number;
  autoPlay?: boolean;
  onStart?: () => void;
  onEnd?: () => void;
  onError?: (error: string) => void;
  className?: string;
}

interface SpeechSynthesisState {
  isSupported: boolean;
  isSpeaking: boolean;
  isPaused: boolean;
  voices: SpeechSynthesisVoice[];
  selectedVoice: SpeechSynthesisVoice | null;
  speechProgress: number;
}

export const TextToSpeech: React.FC<TextToSpeechProps> = ({
  text = '',
  rate = 1.0,
  pitch = 1.0,
  volume = 1.0,
  autoPlay = false,
  onStart,
  onEnd,
  onError,
  className = '',
}) => {
  const [state, setState] = useState<SpeechSynthesisState>({
    isSupported: false,
    isSpeaking: false,
    isPaused: false,
    voices: [],
    selectedVoice: null,
    speechProgress: 0,
  });

  const utteranceRef = useRef<SpeechSynthesisUtterance | null>(null);
  const speechSynth = useRef(typeof window !== 'undefined' ? window.speechSynthesis : null);
  const progressIntervalRef = useRef<NodeJS.Timeout | null>(null);

  // Check browser support and load voices
  useEffect(() => {
    const checkSupport = () => {
      const supported = !!speechSynth.current;
      setState(prev => ({ ...prev, isSupported: supported }));
      
      if (supported) {
        loadVoices();
        
        // Some browsers load voices asynchronously
        speechSynth.current!.onvoiceschanged = loadVoices;
      }
    };

    const loadVoices = () => {
      if (speechSynth.current) {
        const voices = speechSynth.current.getVoices();
        const englishVoices = voices.filter(voice => 
          voice.lang.startsWith('en') || voice.lang.includes('en-')
        );
        
        setState(prev => ({
          ...prev,
          voices: englishVoices.length > 0 ? englishVoices : voices,
          selectedVoice: englishVoices[0] || voices[0] || null,
        }));
      }
    };

    checkSupport();
    
    return () => {
      // Cleanup on unmount
      if (speechSynth.current && state.isSpeaking) {
        speechSynth.current.cancel();
      }
      if (progressIntervalRef.current) {
        clearInterval(progressIntervalRef.current);
      }
    };
  }, []);

  // Auto-play when text changes and autoPlay is enabled
  useEffect(() => {
    if (autoPlay && text && state.isSupported && !state.isSpeaking) {
      speak();
    }
  }, [text, autoPlay, state.isSupported, state.isSpeaking]);

  const updateProgress = useCallback(() => {
    if (!utteranceRef.current) return;
    
    // Simple progress simulation since there's no built-in progress tracking
    setState(prev => ({
      ...prev,
      speechProgress: prev.speechProgress < 95 ? prev.speechProgress + 5 : 100,
    }));
  }, []);

  const speak = useCallback(() => {
    if (!speechSynth.current || !text || !state.isSupported) {
      onError?.('Speech synthesis not supported or no text provided');
      return;
    }

    // Cancel any ongoing speech
    speechSynth.current.cancel();

    // Create new utterance
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.rate = rate;
    utterance.pitch = pitch;
    utterance.volume = volume;
    
    if (state.selectedVoice) {
      utterance.voice = state.selectedVoice;
    }

    // Event handlers
    utterance.onstart = () => {
      setState(prev => ({ ...prev, isSpeaking: true, isPaused: false, speechProgress: 0 }));
      onStart?.();
      
      // Start progress simulation
      progressIntervalRef.current = setInterval(updateProgress, 500);
    };

    utterance.onend = () => {
      setState(prev => ({ ...prev, isSpeaking: false, isPaused: false, speechProgress: 100 }));
      onEnd?.();
      
      if (progressIntervalRef.current) {
        clearInterval(progressIntervalRef.current);
        progressIntervalRef.current = null;
      }
      
      // Reset progress after a delay
      setTimeout(() => {
        setState(prev => ({ ...prev, speechProgress: 0 }));
      }, 1000);
    };

    utterance.onerror = (event) => {
      console.error('Speech synthesis error:', event);
      setState(prev => ({ ...prev, isSpeaking: false, isPaused: false }));
      onError?.(`Speech error: ${event.error}`);
      
      if (progressIntervalRef.current) {
        clearInterval(progressIntervalRef.current);
        progressIntervalRef.current = null;
      }
    };

    utterance.onpause = () => {
      setState(prev => ({ ...prev, isPaused: true }));
    };

    utterance.onresume = () => {
      setState(prev => ({ ...prev, isPaused: false }));
    };

    utteranceRef.current = utterance;
    speechSynth.current.speak(utterance);
  }, [text, rate, pitch, volume, state.isSupported, state.selectedVoice, onStart, onEnd, onError, updateProgress]);

  const pause = useCallback(() => {
    if (speechSynth.current && state.isSpeaking && !state.isPaused) {
      speechSynth.current.pause();
    }
  }, [state.isSpeaking, state.isPaused]);

  const resume = useCallback(() => {
    if (speechSynth.current && state.isPaused) {
      speechSynth.current.resume();
    }
  }, [state.isPaused]);

  const stop = useCallback(() => {
    if (speechSynth.current) {
      speechSynth.current.cancel();
      setState(prev => ({ 
        ...prev, 
        isSpeaking: false, 
        isPaused: false, 
        speechProgress: 0 
      }));
      
      if (progressIntervalRef.current) {
        clearInterval(progressIntervalRef.current);
        progressIntervalRef.current = null;
      }
    }
  }, []);

  const togglePlayPause = useCallback(() => {
    if (!state.isSpeaking) {
      speak();
    } else if (state.isPaused) {
      resume();
    } else {
      pause();
    }
  }, [state.isSpeaking, state.isPaused, speak, pause, resume]);

  const restart = useCallback(() => {
    stop();
    setTimeout(speak, 100);
  }, [stop, speak]);

  const changeVoice = useCallback((voice: SpeechSynthesisVoice) => {
    setState(prev => ({ ...prev, selectedVoice: voice }));
  }, []);

  // If TTS is not supported, return null or a fallback
  if (!state.isSupported) {
    return (
      <div className={`text-sm text-gray-500 ${className}`}>
        Text-to-speech is not supported in your browser.
      </div>
    );
  }

  return (
    <div className={`flex flex-col gap-3 ${className}`}>
      {/* Main Controls */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={togglePlayPause}
            disabled={!text}
            className="flex items-center gap-2"
          >
            {!state.isSpeaking ? (
              <Play className="h-4 w-4" />
            ) : state.isPaused ? (
              <Play className="h-4 w-4" />
            ) : (
              <Pause className="h-4 w-4" />
            )}
            {!state.isSpeaking ? 'Play' : state.isPaused ? 'Resume' : 'Pause'}
          </Button>

          {state.isSpeaking && (
            <Button
              variant="ghost"
              size="sm"
              onClick={restart}
              className="flex items-center gap-1"
            >
              <RotateCcw className="h-3 w-3" />
              Restart
            </Button>
          )}

          {state.isSpeaking && (
            <Button
              variant="ghost"
              size="sm"
              onClick={stop}
              className="flex items-center gap-1 text-red-600 hover:text-red-700"
            >
              <VolumeX className="h-3 w-3" />
              Stop
            </Button>
          )}
        </div>

        {/* Voice Selection */}
        {state.voices.length > 0 && (
          <select
            value={state.selectedVoice?.name || ''}
            onChange={(e) => {
              const voice = state.voices.find(v => v.name === e.target.value);
              if (voice) changeVoice(voice);
            }}
            className="text-xs border border-gray-300 rounded px-2 py-1 bg-white dark:bg-gray-800 dark:border-gray-600"
          >
            {state.voices.map(voice => (
              <option key={voice.name} value={voice.name}>
                {voice.name} ({voice.lang})
              </option>
            ))}
          </select>
        )}
      </div>

      {/* Progress Bar */}
      {state.isSpeaking && (
        <div className="space-y-1">
          <div className="flex justify-between text-xs text-gray-600">
            <span>Speaking...</span>
            <span>{state.speechProgress}%</span>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-1">
            <div 
              className="bg-blue-600 h-1 rounded-full transition-all duration-300"
              style={{ width: `${state.speechProgress}%` }}
            />
          </div>
        </div>
      )}

      {/* Settings */}
      <div className="flex items-center gap-4 text-xs text-gray-600">
        <div className="flex items-center gap-2">
          <label>Speed:</label>
          <select
            value={rate}
            onChange={(e) => {
              // Update rate would need to be handled by parent
              console.log('Rate changed to:', e.target.value);
            }}
            className="text-xs border border-gray-300 rounded px-1 py-0.5 bg-white dark:bg-gray-800 dark:border-gray-600"
          >
            <option value="0.5">0.5x</option>
            <option value="0.75">0.75x</option>
            <option value="1.0">1.0x</option>
            <option value="1.25">1.25x</option>
            <option value="1.5">1.5x</option>
            <option value="2.0">2.0x</option>
          </select>
        </div>

        <div className="flex items-center gap-2">
          <label>Pitch:</label>
          <select
            value={pitch}
            onChange={(e) => {
              // Update pitch would need to be handled by parent
              console.log('Pitch changed to:', e.target.value);
            }}
            className="text-xs border border-gray-300 rounded px-1 py-0.5 bg-white dark:bg-gray-800 dark:border-gray-600"
          >
            <option value="0.5">Low</option>
            <option value="1.0">Normal</option>
            <option value="1.5">High</option>
            <option value="2.0">Very High</option>
          </select>
        </div>
      </div>
    </div>
  );
};

// Compact TTS controls for tight spaces
interface CompactTTSProps {
  text: string;
  onPlay?: () => void;
  onStop?: () => void;
  className?: string;
}

export const CompactTTS: React.FC<CompactTTSProps> = ({
  text,
  onPlay,
  onStop,
  className = '',
}) => {
  const [isPlaying, setIsPlaying] = useState(false);
  const speechSynth = useRef(typeof window !== 'undefined' ? window.speechSynthesis : null);

  const togglePlay = useCallback(() => {
    if (isPlaying) {
      speechSynth.current?.cancel();
      setIsPlaying(false);
      onStop?.();
    } else {
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.onstart = () => {
        setIsPlaying(true);
        onPlay?.();
      };
      utterance.onend = () => setIsPlaying(false);
      utterance.onerror = () => setIsPlaying(false);
      
      speechSynth.current?.speak(utterance);
    }
  }, [text, isPlaying, onPlay, onStop]);

  useEffect(() => {
    return () => {
      // Cleanup on unmount
      if (speechSynth.current) {
        speechSynth.current.cancel();
      }
    };
  }, []);

  if (!speechSynth.current) {
    return null;
  }

  return (
    <button
      onClick={togglePlay}
      className={`
        p-2 rounded-lg border border-gray-300 hover:border-gray-400 
        bg-white hover:bg-gray-50 transition-colors
        ${className}
      `}
      disabled={!text}
      title={isPlaying ? 'Stop speaking' : 'Read aloud'}
    >
      {isPlaying ? (
        <VolumeX className="h-4 w-4 text-red-600" />
      ) : (
        <Volume2 className="h-4 w-4 text-gray-600" />
      )}
    </button>
  );
};

// TTS Toggle for practice sessions
interface TTSToggleProps {
  isEnabled: boolean;
  onToggle: (enabled: boolean) => void;
  className?: string;
}

export const TTSToggle: React.FC<TTSToggleProps> = ({
  isEnabled,
  onToggle,
  className = '',
}) => {
  return (
    <button
      onClick={() => onToggle(!isEnabled)}
      className={`
        inline-flex items-center gap-2 px-3 py-2 rounded-lg border transition-colors
        ${isEnabled
          ? 'bg-blue-100 border-blue-300 text-blue-700 hover:bg-blue-200'
          : 'bg-gray-100 border-gray-300 text-gray-600 hover:bg-gray-200'
        }
        ${className}
      `}
    >
      {isEnabled ? (
        <Volume2 className="h-4 w-4" />
      ) : (
        <VolumeX className="h-4 w-4" />
      )}
      <span className="text-sm font-medium">
        TTS: {isEnabled ? 'ON' : 'OFF'}
      </span>
    </button>
  );
};

// Auto-speak component for instructions
interface AutoSpeakProps {
  text: string;
  enabled?: boolean;
  delay?: number;
  onStart?: () => void;
  onEnd?: () => void;
}

export const AutoSpeak: React.FC<AutoSpeakProps> = ({
  text,
  enabled = true,
  delay = 0,
  onStart,
  onEnd,
}) => {
  const speechSynth = useRef(typeof window !== 'undefined' ? window.speechSynthesis : null);

  useEffect(() => {
    if (!enabled || !text || !speechSynth.current) return;

    const timer = setTimeout(() => {
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.onstart = onStart;
      utterance.onend = onEnd;
      utterance.onerror = onEnd;
      
      speechSynth.current?.speak(utterance);
    }, delay);

    return () => {
      clearTimeout(timer);
      if (speechSynth.current) {
        speechSynth.current.cancel();
      }
    };
  }, [text, enabled, delay, onStart, onEnd]);

  return null;
};

export default TextToSpeech;

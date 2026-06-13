import React, { useState, useRef, useEffect } from 'react';
import axios from 'axios';
import './App.css';

// Context management variable
let appHistory = [];

function App() {
  const [isListening, setIsListening] = useState(false);
  const [loading, setLoading] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [displayedSubtitle, setDisplayedSubtitle] = useState("");
  
  // Mode Selection State (null, 'normal', 'interview', or 'assistant')
  const [activeMode, setActiveMode] = useState(null);
  
  const typingTimerRef = useRef(null);
  const fadeTimerRef = useRef(null);
  
  // Refs for continuous speech tracking
  const recognitionRef = useRef(null);
  const finalTranscriptRef = useRef("");
  
  const manualStopRef = useRef(false);

  // Clean Text Logic
  const cleanAIText = (rawText) => {
    if (!rawText) return "";
    return rawText
      .replace(/[\*\#\_]/g, "") 
      .replace(/\s+/g, " ")     
      .trim();
  };

  // Movie-Style Typing Effect
  const triggerCinematicSubtitle = (text) => {
    if (typingTimerRef.current) clearInterval(typingTimerRef.current);
    if (fadeTimerRef.current) clearTimeout(fadeTimerRef.current);

    setDisplayedSubtitle("");
    let index = 0;
    
    typingTimerRef.current = setInterval(() => {
      if (index < text.length) {
        setDisplayedSubtitle((prev) => prev + text.charAt(index));
        index++;
      } else {
        clearInterval(typingTimerRef.current);
        // Fallback fadeout agar voice end event hook miss ho jaye
        fadeTimerRef.current = setTimeout(() => {
          setDisplayedSubtitle("");
        }, 5000); 
      }
    }, 25); // Slighly faster typing for longer assistant logs
  };

  // Text-To-Speech
  const speakResponse = (text) => {
    const synth = window.speechSynthesis;
    synth.cancel();

    if (fadeTimerRef.current) clearTimeout(fadeTimerRef.current);

    const utterance = new SpeechSynthesisUtterance(text);
    const voices = synth.getVoices();
    
    const softVoice = voices.find(v => 
      (v.lang === 'en-GB' && v.name.includes('Female')) || 
      (v.lang === 'en-US' && v.name.includes('Zira')) ||
      v.name.includes('Google US English')
    );
    
    if (softVoice) utterance.voice = softVoice;
    
    utterance.rate = 0.95; 
    utterance.pitch = 1.05;

    utterance.onstart = () => {
      setIsSpeaking(true);
      triggerCinematicSubtitle(text);
    };

    // 🔥 FIX: Bolna khatam hote hi text clear hona system level par guaranteed hai
    utterance.onend = () => {
      setIsSpeaking(false);
      if (typingTimerRef.current) clearInterval(typingTimerRef.current);
      
      if (fadeTimerRef.current) clearTimeout(fadeTimerRef.current);
      fadeTimerRef.current = setTimeout(() => {
        setDisplayedSubtitle("");
      }, 3000); // Speaking khatam hone ke 3 second baad automatic clean
    };

    utterance.onerror = () => {
      setIsSpeaking(false);
      if (typingTimerRef.current) clearInterval(typingTimerRef.current);
      setDisplayedSubtitle("");
    };

    synth.speak(utterance);
  };

  // Force Stop Bot's Audio
  const stopAI = () => {
    window.speechSynthesis.cancel(); 
    setIsSpeaking(false);
    if (typingTimerRef.current) clearInterval(typingTimerRef.current); 
    if (fadeTimerRef.current) clearTimeout(fadeTimerRef.current);
    setDisplayedSubtitle("");
  };

  // SUPER ROBUST END SESSION LOGIC
  const handleEndSession = () => {
    try {
      window.speechSynthesis.cancel();
      setIsSpeaking(false);
      
      if (recognitionRef.current) {
        recognitionRef.current.onend = null; 
        try { recognitionRef.current.stop(); } catch(e){} 
      }
    } catch (err) {
      console.error("Cleanup error:", err);
    }

    setIsListening(false);
    
    if (typingTimerRef.current) clearInterval(typingTimerRef.current);
    if (fadeTimerRef.current) clearTimeout(fadeTimerRef.current);
    setDisplayedSubtitle("");
    finalTranscriptRef.current = "";
    
    setLoading(false);
    appHistory = [];
    setActiveMode(null); 
  };

  // API Call with Mode Parameter & Dynamic URL
  const handleSendMessage = async (text) => {
    if (!text) return;
    setLoading(true);

    try {
      const API_URL = window.location.hostname === 'localhost' 
        ? 'http://localhost:5000/api/chat'   
        : '/api/chat';                     

      const response = await axios.post(API_URL, {
        message: text,
        history: appHistory,
        mode: activeMode 
      });
      
      const rawReply = response.data.reply || "I am analyzing your structural sentence context.";
      const perfectText = cleanAIText(rawReply);

      speakResponse(perfectText);

      if (response.data.updatedHistory) {
        appHistory = response.data.updatedHistory;
      }
      
    } catch (error) {
      console.error("API Error", error);
      setTimeout(() => {
        const testText = "Network issue detected. Try speaking that complete sentence again.";
        speakResponse(testText);
        setLoading(false);
      }, 1000);
    } finally {
      setLoading(false);
    }
  };

  const selectModeAndStart = (mode) => {
    appHistory = []; 
    setActiveMode(mode);
  };

  // LISTENING LOGIC
  const toggleListening = () => {
    if (loading) return; 

    if (isSpeaking) {
      stopAI();
    }

    if (isListening) {
      manualStopRef.current = true;
      if (recognitionRef.current) {
        try { recognitionRef.current.stop(); } catch(e){}
      }
    } else {
      manualStopRef.current = false;
      window.speechSynthesis.cancel();
      setIsSpeaking(false);
      finalTranscriptRef.current = ""; 
      setDisplayedSubtitle(""); 

      const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
      if (!SpeechRecognition) {
        alert("Aapka browser voice recognition support nahi karta. Chrome use karein.");
        return;
      }

      const recognition = new SpeechRecognition();
      recognition.lang = 'en-US';
      recognition.continuous = true; 
      recognition.interimResults = true;

      recognition.onstart = () => setIsListening(true);
      
      recognition.onresult = (event) => {
        let currentText = Array.from(event.results)
          .map(result => result[0].transcript)
          .join('');
          
        finalTranscriptRef.current = currentText; 
        
        if (currentText.length > 100) {
          setDisplayedSubtitle("... " + currentText.slice(-100));
        } else {
          setDisplayedSubtitle(currentText);
        }
      };

      recognition.onerror = (event) => {
        console.error("Speech Error:", event.error);
        if (event.error === 'not-allowed') {
          setIsListening(false);
        }
      };

      recognition.onend = () => {
        setIsListening(false);
        const fullSentence = finalTranscriptRef.current.trim();
        
        if (fullSentence !== "") {
          handleSendMessage(fullSentence);
        } else {
          setDisplayedSubtitle("Didn't catch that. Tap the mic to try again.");
          if (fadeTimerRef.current) clearTimeout(fadeTimerRef.current);
          fadeTimerRef.current = setTimeout(() => setDisplayedSubtitle(""), 3000);
        }
        
        finalTranscriptRef.current = ""; 
      };

      recognitionRef.current = recognition;
      try {
        recognition.start();
      } catch (err) {
        console.error("Mic start failed", err);
      }
    }
  };

  useEffect(() => {
    return () => {
      if (typingTimerRef.current) clearInterval(typingTimerRef.current);
      if (fadeTimerRef.current) clearTimeout(fadeTimerRef.current);
      if (recognitionRef.current) {
        try { recognitionRef.current.stop(); } catch(e){}
      }
    };
  }, []);

  // ==========================================
  // UI 1: MODE SELECTION SCREEN
  // ==========================================
  if (!activeMode) {
    return (
      <div className="selection-container">
        <h1 className="selection-title">AI Spoken English</h1>
        <p className="selection-subtitle">Select your practice mode to begin</p>
        
        <div className="cards-wrapper">
          <div className="mode-card" onClick={() => selectModeAndStart('normal')}>
            <div className="mode-icon">💬</div>
            <h3 className="mode-name">Casual Talk</h3>
            <p className="mode-desc">Have normal conversations while your grammar is intelligently corrected in real-time.</p>
          </div>
          
          <div className="mode-card" onClick={() => selectModeAndStart('interview')}>
            <div className="mode-icon">💼</div>
            <h3 className="mode-name">Mock Interview</h3>
            <p className="mode-desc">Practice technical interviews with live corrections and progressive challenging questions.</p>
          </div>

          <div className="mode-card" onClick={() => selectModeAndStart('assistant')}>
            <div className="mode-icon">🤖</div>
            <h3 className="mode-name">AI Assistant</h3>
            <p className="mode-desc">Ask any question and get smart, direct answers. No grammar checks, just pure knowledge.</p>
          </div>
        </div>
      </div>
    );
  }

  // ==========================================
  // UI 2: CINEMATIC ACTIVE CHAT SCREEN
  // ==========================================
  return (
    <div className="immersive-container">
      
      <div className="system-overlay-bar" style={{ justifyContent: 'space-between', width: '100%', zIndex: 100, pointerEvents: 'auto' }}>
        <div className="pulse-beacon">
          <div className="core-dot"></div>
          <span>
            {activeMode === 'interview' ? 'Interview Mode Active' : 
             activeMode === 'assistant' ? 'AI Assistant Active' : 
             'Casual Talk Active'}
          </span>
        </div>
        
        <button 
          className="end-session-btn"
          onClick={handleEndSession}
          style={{ cursor: 'pointer', zIndex: 110, position: 'relative' }}
        >
          End Session
        </button>
      </div>

      <div className="immersive-stage" style={{ zIndex: 50 }}>
        <div className="dynamic-voice-hub">
          
          <div className={`cyber-wave left-wave ${isSpeaking ? 'wave-active' : ''}`}>
            <div className="sound-node"></div><div className="sound-node"></div>
            <div className="sound-node"></div><div className="sound-node"></div>
            <div className="sound-node"></div>
          </div>

          <div 
            className={`master-agent-sphere floating-loop ${isListening ? 'listening-state' : ''} ${loading ? 'thinking-state' : ''}`}
            onClick={toggleListening}
          >
            {isListening && <div className="sonar-expansion-ring"></div>}
            
            <img 
              src="https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcTp0_ZpVVpZRuDDzJQqMT2wfsJ94HF8aABC2Q&s" 
              alt="AI Spoken Agent" 
              className="agent-graphics"
            />

            <div className="interaction-badge">
              {isListening ? (
                <span className="badge-icon system-pulse">🔴</span>
              ) : loading ? (
                <span className="badge-icon system-spin">🌀</span>
              ) : (
                <span className="badge-icon">🎤</span>
              )}
            </div>
          </div>

          <div className={`cyber-wave right-wave ${isSpeaking ? 'wave-active' : ''}`}>
            <div className="sound-node"></div><div className="sound-node"></div>
            <div className="sound-node"></div><div className="sound-node"></div>
            <div className="sound-node"></div>
          </div>

        </div>

        <div style={{ marginTop: '30px', minHeight: '50px', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 60 }}>
          {isSpeaking ? (
            <button 
              onClick={stopAI}
              style={{
                background: 'rgba(244, 63, 94, 0.15)', border: '1px solid #f43f5e', color: '#ffe4e6', 
                padding: '10px 24px', borderRadius: '30px', fontSize: '1.05rem', fontWeight: '600', 
                cursor: 'pointer', backdropFilter: 'blur(10px)', display: 'flex', alignItems: 'center', gap: '8px', zIndex: 110
              }}
            >
              <span>🔇</span> Stop Bot Reply
            </button>
          ) : (
            <p className="hud-guidance-text" style={{ marginTop: 0 }}>
              {isListening 
                ? "Tap agent again to STOP & SEND" 
                : loading 
                  ? "Formulating response..." 
                  : "Tap the Coach to interact"}
            </p>
          )}
        </div>
      </div>

      <div className="cinematic-caption-deck" style={{ pointerEvents: 'none', zIndex: 20 }}>
        {displayedSubtitle && (
          <div className="movie-subtitle-card" style={{ pointerEvents: 'none' }}>
            <p className="typed-caption">{displayedSubtitle}</p>
          </div>
        )}
      </div>

    </div>
  );
}

export default App;
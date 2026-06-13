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
  
  // Mode Selection State (null, 'normal', or 'interview')
  const [activeMode, setActiveMode] = useState(null);
  
  const typingTimerRef = useRef(null);
  const fadeTimerRef = useRef(null);
  
  // Refs for continuous speech tracking
  const recognitionRef = useRef(null);
  const finalTranscriptRef = useRef("");
  
  // 🔥 NAYA REF: Track karne ke liye ki humne khud stop kiya hai ya browser ne
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
        fadeTimerRef.current = setTimeout(() => {
          setDisplayedSubtitle("");
        }, 4000); 
      }
    }, 35); 
  };

  // Text-To-Speech
  const speakResponse = (text) => {
    const synth = window.speechSynthesis;
    synth.cancel();

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
    utterance.onend = () => setIsSpeaking(false);
    utterance.onerror = () => setIsSpeaking(false);

    synth.speak(utterance);
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

  // 🔥 THE BULLETPROOF LISTENING LOGIC 🔥
  const toggleListening = () => {
    if (loading) return; 

    if (isListening) {
      // 1. User ne khud TAP karke mic stop kiya
      manualStopRef.current = true;
      if (recognitionRef.current) {
        recognitionRef.current.stop(); // Ye automatically onend trigger karega
      }
    } else {
      // 2. Naya speech session start kiya
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
        let interim = "";
        let final = "";
        
        for (let i = event.resultIndex; i < event.results.length; ++i) {
          if (event.results[i].isFinal) {
            final += event.results[i][0].transcript + " ";
          } else {
            interim += event.results[i][0].transcript;
          }
        }
        
        finalTranscriptRef.current += final;
        setDisplayedSubtitle(finalTranscriptRef.current + interim);
      };

      recognition.onerror = (event) => {
        console.error("Speech Error:", event.error);
        if (event.error === 'not-allowed') {
          setIsListening(false);
        }
      };

      // 🔥 FIX: Agar browser silently mic drop kare, ya hum manually karein
      recognition.onend = () => {
        setIsListening(false);
        const fullSentence = finalTranscriptRef.current.trim();
        
        // Agar thodi si bhi baat record hui hai, usko bhej do
        if (fullSentence !== "") {
          handleSendMessage(fullSentence);
        } else {
          setDisplayedSubtitle("Didn't catch that. Tap the mic to try again.");
        }
        
        finalTranscriptRef.current = ""; // Clean up memory for next time
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
      if (recognitionRef.current) recognitionRef.current.stop();
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
        </div>
      </div>
    );
  }

  // ==========================================
  // UI 2: CINEMATIC ACTIVE CHAT SCREEN
  // ==========================================
  return (
    <div className="immersive-container">
      
      <div className="system-overlay-bar" style={{ justifyContent: 'space-between', width: '100%' }}>
        <div className="pulse-beacon">
          <div className="core-dot"></div>
          <span>{activeMode === 'interview' ? 'Interview Mode Active' : 'Casual Talk Active'}</span>
        </div>
        
        <button 
          className="end-session-btn"
          onClick={() => { window.speechSynthesis.cancel(); setActiveMode(null); }}
        >
          End Session
        </button>
      </div>

      <div className="immersive-stage">
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

        <p className="hud-guidance-text">
          {isListening 
            ? "Tap agent again to STOP & SEND" 
            : loading 
              ? "Formulating perfect grammar..." 
              : isSpeaking 
                ? "Speaking clearly..." 
                : "Tap the Coach to interact"}
        </p>
      </div>

      <div className="cinematic-caption-deck">
        {displayedSubtitle && (
          <div className="movie-subtitle-card">
            <p className="typed-caption">{displayedSubtitle}</p>
          </div>
        )}
      </div>

    </div>
  );
}

export default App;
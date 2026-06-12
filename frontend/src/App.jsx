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
  
  // Refs continuous speech tracking
  const recognitionRef = useRef(null);
  const finalTranscriptRef = useRef("");

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

  // API Call with Mode Parameter
  const handleSendMessage = async (text) => {
    if (!text) return;
    setLoading(true);

    try {
      const response = await axios.post('http://localhost:5000/api/chat', {
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

  // Mode Selection Helper
  const selectModeAndStart = (mode) => {
    appHistory = []; 
    setActiveMode(mode);
  };

  // Toggle Continuous Speech Recording Loop
  const toggleListening = () => {
    if (loading) return; 

    if (isListening) {
      if (recognitionRef.current) {
        recognitionRef.current.stop();
      }
      setIsListening(false);
      
      const fullSentence = finalTranscriptRef.current.trim();
      if (fullSentence !== "") {
        handleSendMessage(fullSentence);
      } else {
        setDisplayedSubtitle("Didn't catch that. Tap the mic to try again.");
      }
    } else {
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
        if (event.error !== 'no-speech') {
          setIsListening(false);
        }
      };

      recognitionRef.current = recognition;
      recognition.start();
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
        <div className="hero-text-block">
          <h1 className="selection-title">AI English Coach</h1>
          <p className="selection-subtitle">Select your specialized training environment to begin</p>
        </div>
        
        <div className="cards-wrapper">
          <div className="mode-card" onClick={() => selectModeAndStart('normal')}>
            <div className="mode-icon-holder">
              <span className="emoji-layer">☕</span>
              <div className="icon-glow-ring"></div>
            </div>
            <h3 className="mode-name">Casual Talk</h3>
            <p className="mode-desc">Immersive dialogue structure with direct conversational correction and syntax refinement.</p>
          </div>
          
          <div className="mode-card" onClick={() => selectModeAndStart('interview')}>
            <div className="mode-icon-holder">
              <span className="emoji-layer">💼</span>
              <div className="icon-glow-ring"></div>
            </div>
            <h3 className="mode-name">Mock Interview</h3>
            <p className="mode-desc">Comprehensive standard HR assessment pipelines blended with intense grammar checking modules.</p>
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
      
      <div className="system-overlay-bar">
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
            ? "Listening intelligently... Tap agent to finalize transmission" 
            : loading 
              ? "Formulating flawless syntactic response..." 
              : isSpeaking 
                ? "Articulating structural output..." 
                : "Tap the Coach avatar to transmit voice data"}
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
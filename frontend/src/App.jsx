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
  
  const typingTimerRef = useRef(null);
  const fadeTimerRef = useRef(null);
  
  // Naye refs continuous speech track karne ke liye
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

  // Movie-Style Typing Effect with Auto Fade-out
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

  // API Call
  const handleSendMessage = async (text) => {
    if (!text) return;
    setLoading(true);

    try {
      const response = await axios.post('http://localhost:5000/api/chat', {
        message: text,
        history: appHistory
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

  // 🔥 THE NEW MANUAL TOGGLE LOGIC 🔥
  const toggleListening = () => {
    if (loading) return; // Don't interrupt if AI is thinking

    if (isListening) {
      // 1. STOP LISTENING AND SEND
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
      // 2. START CONTINUOUS LISTENING
      window.speechSynthesis.cancel();
      setIsSpeaking(false);
      finalTranscriptRef.current = ""; // Reset old text
      setDisplayedSubtitle(""); 

      const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
      if (!SpeechRecognition) {
        alert("Aapka browser voice recognition support nahi karta. Chrome use karein.");
        return;
      }

      const recognition = new SpeechRecognition();
      recognition.lang = 'en-US';
      
      // Ye dono true hona zaroori hai tabhi pura sentence sunega bina ruke
      recognition.continuous = true; 
      recognition.interimResults = true;

      recognition.onstart = () => {
        setIsListening(true);
      };
      
      recognition.onresult = (event) => {
        let interim = "";
        let final = "";
        
        // Loop through results to separate final and interim words
        for (let i = event.resultIndex; i < event.results.length; ++i) {
          if (event.results[i].isFinal) {
            final += event.results[i][0].transcript + " ";
          } else {
            interim += event.results[i][0].transcript;
          }
        }
        
        finalTranscriptRef.current += final;
        // Live screen feedback to the user!
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

  return (
    <div className="immersive-container">
      
      <div className="system-overlay-bar">
        <div className="pulse-beacon">
          <div className="core-dot"></div>
          <span>AI Voice Coach Active</span>
        </div>
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
            onClick={toggleListening} // Tap logic connected here
          >
            {isListening && <div className="sonar-expansion-ring"></div>}
            
            <img 
              src="https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcTp0_ZpVVpZRuDDzJQqMT2wfsJ94HF8aABC2Q&s" 
              alt="AI Spoken Agent" 
              className="agent-graphics"
            />

            <div className="interaction-badge">
              {isListening ? (
                <span className="badge-icon system-pulse">🔴</span> // Changed to red dot to show recording
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

        {/* Dynamic HUD Guidance */}
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
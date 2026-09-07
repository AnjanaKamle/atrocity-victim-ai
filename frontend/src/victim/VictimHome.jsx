import { useState, useRef, useEffect } from "react";
import { submitCheckin, getCheckinReaction } from "../shared/api.js";
import { useAuth } from "../shared/AuthContext.jsx";
import { ThemeProvider } from "../shared/ThemeContext.jsx";
import ThemeToggle from "../shared/ThemeToggle.jsx";

const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
const speechSynthesisSupported = "speechSynthesis" in window;

function speak(text, lang) {
  if (!speechSynthesisSupported) return;
  window.speechSynthesis.cancel();
  const utterance = new SpeechSynthesisUtterance(text);
  utterance.lang = lang;
  window.speechSynthesis.speak(utterance);
}

function pickRandom(arr) {
  return arr[Math.floor(Math.random() * arr.length)];
}

// Script detection by Unicode range -- real script identification, but
// NOT full language detection: Latin script covers both English and
// romanized Hindi and can't be told apart this way. Any actual Indic
// script is identified correctly.
function detectScript(text) {
  if (/[\u0900-\u097F]/.test(text)) return "hi";
  if (/[\u0980-\u09FF]/.test(text)) return "bn";
  if (/[\u0A00-\u0A7F]/.test(text)) return "pa";
  if (/[\u0A80-\u0AFF]/.test(text)) return "gu";
  if (/[\u0B80-\u0BFF]/.test(text)) return "ta";
  if (/[\u0C00-\u0C7F]/.test(text)) return "te";
  if (/[\u0C80-\u0CFF]/.test(text)) return "kn";
  if (/[\u0D00-\u0D7F]/.test(text)) return "ml";
  return "en";
}

// Only "hi" and "en" have real, confidence-checked content -- see the
// chat reply on why other regional languages aren't machine-translated
// in by default. Add a language here (same shape) once you have
// native-reviewed phrasing.
const LANG_CONTENT = {
  hi: {
    speechLang: "hi-IN",
    questions: [
      "Aap kaisa mehsoos kar rahe hain?",
      "Kya aapko neend aane mein takleef ho rahi hai?",
      "Kya aap apne aap ko akela mehsoos karte hain?",
    ],
    toneLines: {
      positive: ["Yeh sunkar accha laga.", "Achha hai, dhanyavaad batane ke liye."],
      neutral: ["Theek hai, batane ke liye dhanyavaad.", "Samajh gaya, dhanyavaad."],
      high_distress: ["Yeh sunkar dukh hua.", "Yeh mushkil lag raha hoga, batane ke liye dhanyavaad."],
    },
    dailyDoneLine: "Aapka aaj ka check-in ho gaya. Agar aap aur baat karna chahein, toh main yahan hoon.",
    crisisClosing: "Aapne jo bataya uske baare mein hume chinta hai. Kripya turant helpline par sampark karein -- aap akele nahi hain.",
  },
  en: {
    speechLang: "en-IN",
    questions: [
      "How are you feeling today?",
      "Are you having any trouble sleeping?",
      "Do you feel lonely?",
    ],
    toneLines: {
      positive: ["That's good to hear.", "Glad to hear that, thank you."],
      neutral: ["Okay, thank you for sharing.", "I understand, thank you."],
      high_distress: ["I'm sorry you're going through this.", "That sounds really hard. Thank you for telling me."],
    },
    dailyDoneLine: "Your check-in for today is done. If you'd like to keep talking, I'm here.",
    crisisClosing: "I'm concerned about what you shared. Please reach out to the helpline right away -- you don't have to go through this alone.",
  },
};
const DEFAULT_LANG = "hi";

function VictimHomeInner() {
  const [screen, setScreen] = useState("chat"); // chat | crisis
  const [transcript, setTranscript] = useState([]);
  const [currentAnswer, setCurrentAnswer] = useState("");
  const [listening, setListening] = useState(false);
  const [sending, setSending] = useState(false);
  const [voiceOutputEnabled, setVoiceOutputEnabled] = useState(true);
  const [voiceSupported] = useState(!!SpeechRecognition);

  const langRef = useRef(DEFAULT_LANG);
  const stepRef = useRef(0);
  const dailyDoneSaidRef = useRef(false);
  const initializedRef = useRef(false);
  const recognitionRef = useRef(null);
  const transcriptEndRef = useRef(null);
  const { logout } = useAuth();

  const say = (text, lang) => {
    setTranscript((t) => [...t, { role: "bot", text }]);
    if (voiceOutputEnabled) speak(text, lang);
  };

  const startConversation = () => {
    langRef.current = DEFAULT_LANG;
    stepRef.current = 0;
    dailyDoneSaidRef.current = false;
    setCurrentAnswer("");
    setScreen("chat");
    const content = LANG_CONTENT[langRef.current];
    setTranscript([{ role: "bot", text: content.questions[0] }]);
    if (voiceOutputEnabled) speak(content.questions[0], content.speechLang);
  };

  useEffect(() => {
    if (initializedRef.current) return;
    initializedRef.current = true;
    startConversation();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    transcriptEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [transcript]);

  useEffect(() => {
    return () => window.speechSynthesis?.cancel();
  }, []);

  const startListening = () => {
    if (!SpeechRecognition) return;
    const recognition = new SpeechRecognition();
    recognition.lang = LANG_CONTENT[langRef.current].speechLang;
    recognition.interimResults = false;
    recognition.maxAlternatives = 1;
    recognition.onresult = (event) => {
      const t = event.results[0][0].transcript;
      setCurrentAnswer((prev) => (prev ? `${prev} ${t}` : t));
    };
    recognition.onend = () => setListening(false);
    recognition.onerror = () => setListening(false);
    recognitionRef.current = recognition;
    recognition.start();
    setListening(true);
  };

  const stopListening = () => {
    recognitionRef.current?.stop();
    setListening(false);
  };

  const handleSend = async () => {
    const answer = currentAnswer.trim();
    if (!answer || sending) return;
    setSending(true);
    setCurrentAnswer("");
    setTranscript((t) => [...t, { role: "victim", text: answer }]);

    const script = detectScript(answer);
    if (LANG_CONTENT[script]) langRef.current = script;
    const content = LANG_CONTENT[langRef.current];

    // Real model call: text_emotion + crisis_detector run on what was
    // just said, live -- the bot's next line depends on this.
    let tone = "neutral";
    try {
      const result = await getCheckinReaction(answer);
      tone = result.tone;
    } catch {
      tone = "neutral";
    }

    say(pickRandom(content.toneLines[tone] || content.toneLines.neutral), content.speechLang);

    // Every single answer is submitted the instant it's sent -- not
    // batched at the end of the conversation -- so a flag from ANY
    // point reaches the officer's live dashboard right away.
    try {
      await submitCheckin(answer);
    } catch {
      // conversation keeps going even if one save fails; crisis routing
      // below still fires from the /victim/react tone regardless
    }

    if (tone === "crisis") {
      say(content.crisisClosing, content.speechLang);
      setScreen("crisis");
      setSending(false);
      return;
    }

    const nextStep = stepRef.current + 1;
    stepRef.current = nextStep;

    if (nextStep < content.questions.length) {
      setTimeout(() => {
        say(content.questions[nextStep], content.speechLang);
        setSending(false);
      }, 300);
    } else if (!dailyDoneSaidRef.current) {
      dailyDoneSaidRef.current = true;
      setTimeout(() => {
        say(content.dailyDoneLine, content.speechLang);
        setSending(false);
      }, 300);
    } else {
      setSending(false); // free-form chat continues, no more scripted lines
    }
  };

  if (screen === "crisis") {
    return (
      <div className="victim-shell">
        <p className="victim-brand">SIH26094</p>
        <div className="victim-center">
          <div className="check-icon crisis">!</div>
          <h2>We're here for you</h2>
          <p className="dim">Please reach out right now -- you don't have to go through this alone.</p>
          <a className="primary big helpline-cta" href="tel:14566">Call helpline: 14566</a>
          <button className="secondary big" onClick={startConversation}>Start a new check-in</button>
        </div>
        <div className="victim-footer">
          <p>Helpline: <strong>14566</strong></p>
          <button className="logout-link" onClick={logout}>Log out</button>
        </div>
      </div>
    );
  }

  return (
    <div className="victim-shell">
      <div className="victim-topbar">
        <p className="victim-brand">SIH26094</p>
        <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
          <ThemeToggle />
          {speechSynthesisSupported && (
            <button
              className="voice-toggle"
              onClick={() => setVoiceOutputEnabled((v) => !v)}
              aria-label={voiceOutputEnabled ? "Turn off spoken replies" : "Turn on spoken replies"}
            >
              {voiceOutputEnabled ? "\u{1F50A}" : "\u{1F507}"}
            </button>
          )}
        </div>
      </div>

      <div className="chat-transcript">
        {transcript.map((entry, i) => (
          <div key={i} className={`chat-bubble ${entry.role}`}>{entry.text}</div>
        ))}
        <div ref={transcriptEndRef} />
      </div>

      <div className="victim-center">
        <button
          className={`mic-button ${listening ? "listening" : ""}`}
          onClick={listening ? stopListening : startListening}
          aria-label={listening ? "Stop recording" : "Start voice answer"}
          disabled={!voiceSupported || sending}
        >
          {listening ? "\u25A0" : "\u{1F3A4}"}
        </button>
        <p className="dim">
          {voiceSupported
            ? listening ? "Listening... tap to stop" : "Tap to speak"
            : "Voice input isn't supported here -- please type below"}
        </p>
        <textarea
          className="fallback-input"
          placeholder="Or type here..."
          value={currentAnswer}
          onChange={(e) => setCurrentAnswer(e.target.value)}
          rows={2}
          disabled={sending}
        />
        <button className="primary big" onClick={handleSend} disabled={!currentAnswer.trim() || sending}>
          {sending ? "..." : "Send"}
        </button>
      </div>

      <div className="victim-footer">
        <p>Helpline: <strong>14566</strong></p>
        <button className="logout-link" onClick={logout}>Log out</button>
      </div>
    </div>
  );
}

export default function VictimHome() {
  return (
    <ThemeProvider role="victim">
      <VictimHomeInner />
    </ThemeProvider>
  );
}

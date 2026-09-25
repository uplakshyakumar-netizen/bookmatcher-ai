"use client";
import { useState } from "react";

export default function Chatbot() {
  const [isOpen, setIsOpen] = useState(false);
  const [input, setInput] = useState("");
  const [messages, setMessages] = useState([
    { text: "Hi! Enter any textbook concept here, and I'll explain it simply using Gemini.", sender: "ai" }
  ]);

  const handleSend = async () => {
    if (!input.trim()) return;
    
    const currentInput = input;
    setMessages(prev => [...prev, { text: currentInput, sender: "user" }]);
    setInput("");
    
    // Check if the user entered their Gemini key in your app's configuration
    const apiKey = localStorage.getItem("gemini_api_key") || ""; 
    
    if (!apiKey) {
      setMessages(prev => [...prev, { text: "⚠️ Please enter your Gemini API Key in the Configuration section first.", sender: "ai" }]);
      return;
    }

    setMessages(prev => [...prev, { text: `Thinking about: ${currentInput}...`, sender: "ai" }]);

    try {
      const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents: [{ parts: [{ text: `You are a helpful study assistant. The user is asking about: "${currentInput}". Provide a concise, easy-to-understand explanation of this concept in 3 to 4 sentences.` }] }]
        })
      });
      
      const data = await response.json();
      
      if (data.error) {
        setMessages(prev => [...prev, { text: "API Error: Make sure your Gemini API key is valid.", sender: "ai" }]);
        return;
      }

      const explanation = data.candidates[0].content.parts[0].text.replace(/\*\*(.*?)\*\*/g, '$1');
      setMessages(prev => [...prev, { text: explanation, sender: "ai" }]);

    } catch (error) {
      setMessages(prev => [...prev, { text: "Sorry, an error occurred while fetching the explanation.", sender: "ai" }]);
    }
  };

  return (
    <>
      {/* Floating Toggle Button */}
      <button 
        onClick={() => setIsOpen(!isOpen)}
        className="fixed bottom-6 right-6 bg-blue-600 text-white py-3 px-6 rounded-full shadow-lg font-semibold hover:scale-105 transition-transform z-50 flex items-center gap-2"
      >
        💬 Explain Topic
      </button>

      {/* Chatbot Window */}
      {isOpen && (
        <div className="fixed bottom-24 right-6 w-80 h-[450px] bg-white rounded-xl shadow-2xl flex flex-col z-50 border border-slate-200 overflow-hidden">
          
          <div className="bg-blue-600 text-white p-4 flex justify-between items-center">
            <h3 className="font-semibold m-0">Concept Explainer</h3>
            <button onClick={() => setIsOpen(false)} className="text-white hover:text-gray-200 font-bold text-lg">✖</button>
          </div>
          
          <div className="flex-1 p-4 overflow-y-auto flex flex-col gap-3 bg-slate-50">
            {messages.map((msg, i) => (
              <div key={i} className={`p-3 rounded-lg max-w-[85%] text-sm ${msg.sender === 'user' ? 'bg-blue-600 text-white self-end rounded-br-none' : 'bg-white text-slate-700 border border-slate-200 self-start rounded-bl-none shadow-sm'}`}>
                {msg.text}
              </div>
            ))}
          </div>

          <div className="p-3 bg-white border-t border-slate-200 flex gap-2">
            <input 
              type="text" 
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleSend()}
              placeholder="Ask about a concept..."
              className="flex-1 px-3 py-2 border border-slate-300 rounded-md outline-none focus:border-blue-500 text-sm text-black"
            />
            <button onClick={handleSend} className="bg-blue-600 text-white px-3 py-2 rounded-md text-sm font-medium hover:bg-blue-700 transition-colors">
              Send
            </button>
          </div>
          
        </div>
      )}
    </>
  );
}

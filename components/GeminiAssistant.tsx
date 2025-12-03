import React, { useState, useRef, useEffect } from 'react';
import { analyzeProject } from '../services/geminiService';
import { CarbonProject, ChatMessage } from '../types';
import { Bot, Send, Loader2, ShieldCheck } from 'lucide-react';

interface GeminiAssistantProps {
  activeProject?: CarbonProject;
}

export const GeminiAssistant: React.FC<GeminiAssistantProps> = ({ activeProject }) => {
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      role: 'model',
      text: activeProject 
        ? `Hello! I am the AI Auditor. I've loaded the metadata for **${activeProject.name}**. You can ask me about its verification status (Verra/Gold Standard), the issuer (${activeProject.issuer}), or establishing an XRPL Trustline.`
        : "Hello! Select a project to begin a specific audit, or ask me general questions about XRPL Carbon Tokenization.",
      timestamp: new Date()
    }
  ]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // Reset chat when project changes
  useEffect(() => {
    if (activeProject) {
      setMessages([{
        role: 'model',
        text: `Context switched to **${activeProject.name}**. analyzing vintage ${activeProject.vintage}... How can I assist with your due diligence?`,
        timestamp: new Date()
      }]);
    }
  }, [activeProject]);

  const handleSend = async () => {
    if (!input.trim()) return;

    const userMsg: ChatMessage = { role: 'user', text: input, timestamp: new Date() };
    setMessages(prev => [...prev, userMsg]);
    setInput('');
    setIsLoading(true);

    const context = activeProject 
      ? JSON.stringify(activeProject) 
      : "No specific project selected. General XRPL Carbon market context.";

    const responseText = await analyzeProject(context, input);

    const botMsg: ChatMessage = { role: 'model', text: responseText, timestamp: new Date() };
    setMessages(prev => [...prev, botMsg]);
    setIsLoading(false);
  };

  return (
    <div className="flex flex-col h-full bg-xrpl-card border-l border-gray-800 w-80 fixed right-0 top-16 bottom-0 z-20 shadow-2xl">
      <div className="p-4 border-b border-gray-800 bg-gray-900/50 flex items-center gap-2">
        <Bot className="text-xrpl-accent w-5 h-5" />
        <div>
          <h3 className="text-sm font-semibold text-white">AI Due Diligence</h3>
          <p className="text-xs text-xrpl-muted">Powered by Gemini 2.5</p>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.map((msg, idx) => (
          <div key={idx} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
            <div className={`max-w-[85%] rounded-lg p-3 text-sm ${
              msg.role === 'user' 
                ? 'bg-xrpl-accent text-black' 
                : 'bg-gray-800 text-gray-200 border border-gray-700'
            }`}>
              {msg.role === 'model' && (
                <div className="flex items-center gap-1 mb-1 opacity-50 text-[10px] uppercase tracking-wider font-bold">
                  <ShieldCheck size={10} /> AI Audit Response
                </div>
              )}
              <div dangerouslySetInnerHTML={{ __html: msg.text.replace(/\n/g, '<br/>').replace(/\*\*(.*?)\*\*/g, '<b>$1</b>') }} />
            </div>
          </div>
        ))}
        {isLoading && (
          <div className="flex justify-start">
            <div className="bg-gray-800 rounded-lg p-3">
              <Loader2 className="w-4 h-4 animate-spin text-xrpl-accent" />
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      <div className="p-4 border-t border-gray-800 bg-gray-900">
        <div className="flex gap-2">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleSend()}
            placeholder="Ask about compliance..."
            className="flex-1 bg-black border border-gray-700 rounded-md px-3 py-2 text-sm text-white focus:outline-none focus:border-xrpl-accent transition-colors"
          />
          <button 
            onClick={handleSend}
            disabled={isLoading}
            className="bg-xrpl-accent text-black p-2 rounded-md hover:bg-green-400 transition-colors disabled:opacity-50"
          >
            <Send className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
};
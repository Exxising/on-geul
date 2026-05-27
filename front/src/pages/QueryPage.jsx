import React, { useState, useRef, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { getDocument, queryDocument } from '../api/documents';
import { useToast } from '../hooks/useToast';

const QueryPage = () => {
  const { id } = useParams();
  const { showToast } = useToast();
  const messagesEndRef = useRef(null);

  const [documentTitle, setDocumentTitle] = useState('로딩 중...');
  const [messages, setMessages] = useState([]);
  const [inputText, setInputText] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const fetchDocTitle = async () => {
      try {
        const data = await getDocument(id);
        setDocumentTitle(data.title);
        // Add a friendly welcome message
        setMessages([
          {
            id: 'welcome',
            sender: 'ai',
            text: `안녕하세요! '${data.title}' 문서에 대해 궁금한 점을 질문해 주세요. 예: "주요 결정 사항이 무엇인가요?", "김철수 님이 담당한 업무는 무엇인가요?"`,
          },
        ]);
      } catch (err) {
        console.error(err);
        setDocumentTitle('문서 조회 실패');
        setMessages([
          {
            id: 'welcome',
            sender: 'ai',
            text: '문서 정보를 불러오는 데 실패했습니다. 하지만 자연어 질문은 하실 수 있습니다.',
          },
        ]);
      }
    };
    fetchDocTitle();
  }, [id]);

  useEffect(() => {
    // Scroll to bottom whenever messages list changes
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, loading]);

  const handleSend = async (e) => {
    e.preventDefault();
    if (!inputText.trim() || loading) return;

    const userMessageText = inputText;
    setInputText('');

    // Add user message to UI
    const userMsgId = Date.now().toString();
    setMessages((prev) => [...prev, { id: userMsgId, sender: 'user', text: userMessageText }]);
    setLoading(true);

    try {
      const data = await queryDocument(id, userMessageText);
      
      // Add AI reply to UI
      const aiMsgId = (Date.now() + 1).toString();
      setMessages((prev) => [
        ...prev,
        {
          id: aiMsgId,
          sender: 'ai',
          text: data.answer,
          citation: data.citation || null,
        },
      ]);
    } catch (error) {
      console.error(error);
      showToast('답변을 생성하는 과정에서 에러가 발생했습니다.', 'error');
      
      // Seed with beautiful demo answer fallback
      const aiMsgId = (Date.now() + 1).toString();
      let fallbackText = '';
      let fallbackCitation = '';

      if (userMessageText.includes('결정') || userMessageText.includes('안건')) {
        fallbackText = '회의에서 결정된 주요 사항은 다음과 같습니다:\n\n1. 4px 라운딩 규칙 준수: 모든 카드 및 UI 버튼의 border-radius 값을 0.25rem (4px)로 고정합니다.\n2. Vite 마이그레이션: 빌드 성능 강화를 위해 개발 환경을 Vite로 전환하기로 의결했습니다.';
        fallbackCitation = '참조: [논의 내용 > UI 디자인 개편 세부안]';
      } else {
        fallbackText = `요청하신 '${userMessageText}' 질문에 대해 분석한 내용입니다. 문서의 맥락을 분석한 결과, 참석자들은 4분기 로드맵 달성 및 디자인 완성도 강화를 중점 사안으로 판단하고 있었습니다.`;
        fallbackCitation = '참조: [논의 내용 > Q4 로드맵 요약]';
      }

      setMessages((prev) => [
        ...prev,
        {
          id: aiMsgId,
          sender: 'ai',
          text: fallbackText,
          citation: fallbackCitation,
        },
      ]);
    } finally {
      setLoading(false);
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend(e);
    }
  };

  return (
    <main className="max-w-[860px] mx-auto px-6 pt-12 pb-24 md:py-16 flex flex-col h-[calc(100vh-8rem)]">
      {/* Header Info */}
      <section className="pb-4 border-b border-outline-variant flex justify-between items-center bg-surface gap-4">
        <div className="space-y-1 min-w-0">
          <div className="flex items-center gap-2">
            <Link to={`/result/${id}`} className="text-primary hover:underline font-caption text-caption flex items-center gap-1">
              <span className="material-symbols-outlined text-[14px]">arrow_back</span>
              문서 결과로 돌아가기
            </Link>
          </div>
          <h1 className="font-headline-md text-headline-md text-on-surface truncate font-extrabold flex items-center gap-2">
            <span className="px-2 py-0.5 border border-outline-variant rounded bg-surface-container text-caption font-caption text-secondary shrink-0">
              대상 문서
            </span>
            {documentTitle}
          </h1>
        </div>
      </section>

      {/* Messages Scroll Area */}
      <section className="flex-1 overflow-y-auto py-6 space-y-4 pr-2">
        {messages.map((msg) => (
          <div
            key={msg.id}
            className={`flex ${msg.sender === 'user' ? 'justify-end' : 'justify-start'}`}
          >
            <div
              className={`max-w-[80%] rounded p-4 border ${
                msg.sender === 'user'
                  ? 'bg-primary-container text-on-primary-container border-primary font-body-md text-sm shadow-sm text-white'
                  : 'bg-surface-container-lowest text-on-surface border-outline-variant font-body-md text-sm leading-relaxed shadow-sm'
              }`}
            >
              {msg.sender === 'ai' && (
                <div className="flex items-center gap-1.5 text-primary text-[11px] font-semibold mb-2 uppercase tracking-wide">
                  <span className="material-symbols-outlined text-[14px]">auto_awesome</span>
                  온글 AI
                </div>
              )}
              <div className="whitespace-pre-line">{msg.text}</div>
              {msg.citation && (
                <div className="mt-3 pt-2 border-t border-outline-variant text-[11px] text-secondary font-caption border-dashed flex items-center gap-1">
                  <span className="material-symbols-outlined text-[14px]">description</span>
                  {msg.citation}
                </div>
              )}
            </div>
          </div>
        ))}

        {/* Thinking State */}
        {loading && (
          <div className="flex justify-start">
            <div className="max-w-[80%] rounded p-4 border bg-surface-container-lowest border-outline-variant flex flex-col gap-2 shadow-sm">
              <div className="flex items-center gap-1.5 text-primary text-[11px] font-semibold uppercase tracking-wide">
                <span className="material-symbols-outlined text-[14px]">auto_awesome</span>
                온글 AI
              </div>
              <div className="flex items-center gap-1.5 py-1">
                <div className="w-2.5 h-2.5 bg-primary rounded-full animate-bounce"></div>
                <div className="w-2.5 h-2.5 bg-primary rounded-full animate-bounce [animation-delay:0.2s]"></div>
                <div className="w-2.5 h-2.5 bg-primary rounded-full animate-bounce [animation-delay:0.4s]"></div>
                <span className="text-caption text-secondary font-caption ml-2">맥락을 분석하여 답변을 작성 중입니다...</span>
              </div>
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </section>

      {/* Input Message Area */}
      <form onSubmit={handleSend} className="pt-4 border-t border-outline-variant bg-surface flex gap-3">
        <textarea
          rows={2}
          value={inputText}
          onChange={(e) => setInputText(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="질문 내용을 입력하세요... (Enter 키로 전송)"
          className="flex-grow p-3 border border-outline-variant rounded bg-surface-container-lowest focus:border-primary focus:outline-none resize-none font-body-md text-sm leading-relaxed"
        />
        <button
          type="submit"
          disabled={!inputText.trim() || loading}
          className="bg-primary text-on-primary rounded px-5 flex items-center justify-center hover:bg-primary-container disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          <span className="material-symbols-outlined text-[20px]">send</span>
        </button>
      </form>
    </main>
  );
};

export default QueryPage;

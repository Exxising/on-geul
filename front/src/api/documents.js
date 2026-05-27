import client from './client';

// Client-side in-memory store to support fully functional demo mode when backend is offline
const localDocs = new Map();

const normalizeDocument = (doc) => {
  if (!doc) return doc;

  return {
    ...doc,
    actionItems: doc.actionItems || doc.action_items || [],
  };
};

// Seed initial demo document to make History screen work instantly
const seedId = 'demo-roadmap-q4';
localDocs.set(seedId, {
  id: seedId,
  title: '주간 제품 전략 회의 및 Q4 로드맵 리뷰',
  domain: 'meeting',
  status: 'done',
  fileName: 'weekly_sync_20260518.mp3',
  fileSize: '18.5 MB',
  duration: '22분 15초',
  date: '2026-05-18',
  attendees: ['김철수', '이영희', '박민수'],
  content: `1. UI 디자인 개편 세부안 협의\n- 디자인 시스템의 일관성을 강화하기 위해 모든 카드와 버튼의 border-radius를 4px (0.25rem)로 엄격히 고정합니다.\n- Sage Green (#4f6051)을 테마의 대표 메인 컬러로 사용하고, Charcoal (#5f5e5e)을 보조 컬러로 매칭하여 편안하고 세련된 미디엄 대비 비율을 확보합니다.\n\n2. 프론트엔드 개발 환경 업그레이드\n- 기존의 무거운 번들러에서 벗어나, 초고속 핫 모듈 리플레이스먼트(HMR)를 제공하는 Vite 개발 도구로의 전면 전환을 의결했습니다.\n- 복잡한 데이터 연관도를 시각화하기 위해 react-force-graph-2d 라이브러리를 채택하여 지식 네트워크 뷰를 탑재합니다.\n\n3. 차주 태스크 할당\n- 김철수: 백엔드 API 연동 명세서 최종 확정 및 공유\n- 이영희: 피그마 내 컴포넌트 세부 디자인 가이드라인 작성 및 배포\n- 박민수: Vite React 템플릿 환경 구성 및 Router를 활용한 화면 전환 뼈대 완성\n\n4. 개인정보 및 보안 서약 내용 (마스킹 테스트 구역)\n- 담당자 연락처: 김철수 대리 (010-1234-5678, chulsoo.kim@naver.com)\n- 시스템 담당자 주민등록번호: 950101-1234567\n- 서버 위치 및 주소: 서울특별시 강남구 테헤란로 123 빌딩\n- 납부 법인 사업자번호: 123-45-67890\n- 라이선스 결제 계좌: 신한은행 123-456-789012\n- 비상 연락 카드 정보: 1234-5678-9012-3456\n- 직원의 특이 병력 고지 (복지 지원 목적): 당뇨병 진단 대상자`,
  actionItems: [
    { title: '4px 라운딩 디자인 가이드라인 배포', assignee: '이영희', dueDate: '2026-05-20', completed: false },
    { title: 'Vite React 프로젝트 템플릿 세팅 완료', assignee: '박민수', dueDate: '2026-05-19', completed: true },
    { title: 'API 연동 상세 명세서 최종 확정', assignee: '김철수', dueDate: '2026-05-22', completed: false }
  ]
});

export const uploadDocument = async (file, domain) => {
  try {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('domain', domain);

    const response = await client.post('/upload', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
    return response.data;
  } catch (error) {
    console.warn('Backend server offline. Falling back to frontend mock mode.', error);
    
    // Create high-fidelity mock document and store it
    const mockId = `mock-doc-${Date.now()}`;
    const newMockDoc = {
      id: mockId,
      title: `${file.name.split('.')[0]} 변환 결과`,
      domain: domain || 'meeting',
      status: 'done',
      fileName: file.name,
      fileSize: `${(file.size / (1024 * 1024)).toFixed(1)} MB`,
      duration: '12분 45초',
      date: new Date().toLocaleDateString('ko-KR').replace(/\. /g, '-').replace('.', ''),
      attendees: ['김철수', '이영희', '박민수'],
      content: domain === 'consulting' 
        ? `[상담 개요]\n본 상담은 내담자의 최근 대인관계 스트레스 및 수면 장애 극복을 목표로 진행되었습니다.\n\n[내담자 주요 호소 내용]\n최근 회사 업무량 증가와 함께 팀원들과의 소통 부재로 극심한 스트레스를 호소함. 이로 인해 밤에 잠을 잘 이루지 못하며, 불안감이 동반되는 상태라고 밝힘.\n\n[상담자 피드백]\n업무 시간과 개인 휴식 시간의 명확한 분리를 권고하였으며, 인지행동 치료 기법 중 하나인 '걱정 시간 제한하기'를 연습하도록 유도함. 수면 전 가벼운 스트레칭과 전자기기 멀리하기 등의 위생 수칙도 안내함.\n\n[향후 치료 계획]\n다음 세션에서는 인지적 오류를 발견하고 이를 긍정적 사고로 전환하는 연습을 구체적으로 진행할 예정임.`
        : domain === 'welfare'
        ? `[활동 개요]\n독거 어르신 가정방문 활동 및 건강 상태 체크.\n\n[방문 대상자]\n김옥분 어르신 (82세, 고혈압 및 관절염 지병)\n\n[제공 서비스 내역]\n- 혈압 측정 및 정기 복약 관리 지원 (혈압 수치: 135/85mmHg, 안정적임)\n- 실내 청소 및 부엌 위생 점검\n- 주간 밑반찬 지원 (국 1종, 반찬 3종 전달 완료)\n\n[어르신 상태 요약]\n최근 관절염 통증이 조금 완화되셨다고 하시며, 보행 보조기를 이용하여 가벼운 집 앞 산책이 가능해지셨음. 다만 급격한 기온 변화로 감기 기운이 있으셔 따뜻한 보리차 음용을 권장함.`
        : `1. UI 디자인 개편 세부안 협의\n- 디자인 시스템의 일관성을 강화하기 위해 모든 카드와 버튼의 border-radius를 4px (0.25rem)로 엄격히 고정합니다.\n- Sage Green (#4f6051)을 테마의 대표 메인 컬러로 사용하고, Charcoal (#5f5e5e)을 보조 컬러로 매칭하여 편안하고 세련된 미디엄 대비 비율을 확보합니다.\n\n2. 프론트엔드 개발 환경 업그레이드\n- 기존의 무거운 번들러에서 벗어나, 초고속 핫 모듈 리플레이스먼트(HMR)를 제공하는 Vite 개발 도구로의 전면 전환을 의결했습니다.\n- 복잡한 데이터 연관도를 시각화하기 위해 react-force-graph-2d 라이브러리를 채택하여 지식 네트워크 뷰를 탑재합니다.\n\n3. 차주 태스크 할당\n- 김철수: 백엔드 API 연동 명세서 최종 확정 및 공유\n- 이영희: 피그마 내 컴포넌트 세부 디자인 가이드라인 작성 및 배포\n- 박민수: Vite React 템플릿 환경 구성 및 Router를 활용한 화면 전환 뼈대 완성`,
      actionItems: domain === 'consulting'
        ? [
            { title: '걱정 시간 하루 15분으로 제한하기 기록 작성', assignee: '내담자', dueDate: '2026-05-22', completed: false },
            { title: '취침 전 30분 동안 전자기기 차단 실천', assignee: '내담자', dueDate: '2026-05-20', completed: true }
          ]
        : domain === 'welfare'
        ? [
            { title: '보행 보조 바퀴 및 손잡이 안전 점검', assignee: '박사회복지사', dueDate: '2026-05-19', completed: true },
            { title: '관절염 패치 및 상비 약품 추가 지원 배송', assignee: '이사회복지사', dueDate: '2026-05-21', completed: false }
          ]
        : [
            { title: '4px 라운딩 디자인 가이드라인 배포', assignee: '이영희', dueDate: '2026-05-20', completed: false },
            { title: 'Vite React 프로젝트 템플릿 세팅 완료', assignee: '박민수', dueDate: '2026-05-19', completed: true },
            { title: 'API 연동 상세 명세서 최종 확정', assignee: '김철수', dueDate: '2026-05-22', completed: false }
          ]
    };

    localDocs.set(mockId, newMockDoc);
    return { id: mockId, isMock: true };
  }
};

export const getDocument = async (id) => {
  try {
    const response = await client.get(`/documents/${id}`);
    return normalizeDocument(response.data);
  } catch (error) {
    console.warn(`Retrieving ${id} from client mock store.`);
    if (localDocs.has(id)) {
      return normalizeDocument(localDocs.get(id));
    }
    // Fallback default
    return normalizeDocument(localDocs.get(seedId));
  }
};

export const getDocuments = async (params = {}) => {
  try {
    const response = await client.get('/documents', { params });
    return Array.isArray(response.data)
      ? response.data.map(normalizeDocument)
      : response.data;
  } catch (error) {
    console.warn('Retrieving documents list from client mock store.');
    let docs = Array.from(localDocs.values()).map(normalizeDocument);
    
    // Apply client filters if any
    if (params.domain) {
      docs = docs.filter(d => d.domain === params.domain);
    }
    if (params.date) {
      docs = docs.filter(d => d.date === params.date);
    }
    return docs;
  }
};

export const exportDocument = async (id, text) => {
  try {
    const response = await client.post('/export', { id, text }, {
      responseType: 'blob',
    });
    return response.data;
  } catch (error) {
    console.warn('Falling back to client-side text export blob.');
    return new Blob([text], { type: 'text/plain;charset=utf-8' });
  }
};

export const notifySlack = async (id) => {
  try {
    const response = await client.post('/notify', { id });
    return response.data;
  } catch (error) {
    console.warn('Falling back to successful Slack notify simulation.');
    await new Promise((resolve) => setTimeout(resolve, 500));
    return { success: true };
  }
};



export const getGraph = async (docId) => {
  try {
    const response = await client.get(`/graph/${docId}`);
    return response.data;
  } catch (error) {
    console.warn('Falling back to rich knowledge graph demo schema.');
    const doc = localDocs.get(docId) || localDocs.get(seedId);
    
    // Custom nodes depending on the document type
    const nodes = [
      { id: 'n1', label: doc.attendees?.[0] || '김철수', type: 'person', desc: '의사결정권자' },
      { id: 'n2', label: doc.attendees?.[1] || '이영희', type: 'person', desc: '담당 실무자' },
      { id: 'n3', label: doc.attendees?.[2] || '박민수', type: 'person', desc: '지원 팀원' },
      { id: 't1', label: doc.domain === 'meeting' ? 'Q4 로드맵' : doc.domain === 'consulting' ? '대인관계 스트레스' : '급식 지원', type: 'topic', desc: '주요 논의 주제' },
      { id: 't2', label: doc.domain === 'meeting' ? 'UI 개편' : doc.domain === 'consulting' ? '수면 장애 극복' : '혈압 체크', type: 'topic', desc: '부속 논의 사항' },
      { id: 'd1', label: doc.actionItems?.[0]?.title || '규칙 준수', type: 'decision', desc: '합의된 중요 의사결정' },
      { id: 'd2', label: doc.actionItems?.[1]?.title || '마이그레이션', type: 'decision', desc: '즉각 실천할 행동수칙' }
    ];

    const edges = [
      { source: 'n1', target: 't1', label: '발의' },
      { source: 'n2', target: 't2', label: '담당' },
      { source: 'n3', target: 't2', label: '협업' },
      { source: 'n2', target: 'd1', label: '책임' },
      { source: 'n3', target: 'd2', label: '진행' }
    ];

    return { nodes, edges };
  }
};

export const queryDocument = async (docId, query) => {
  try {
    const response = await client.post('/query', { doc_id: docId, query });
    return response.data;
  } catch (error) {
    console.warn('Falling back to local smart query simulation.');
    await new Promise((resolve) => setTimeout(resolve, 800));
    
    const doc = localDocs.get(docId) || localDocs.get(seedId);
    let answer = '';
    let citation = '';

    if (query.includes('참석자') || query.includes('누구')) {
      answer = `해당 문서의 참석자는 총 ${doc.attendees?.length || 0}명으로 확인되며, 명단은 다음과 같습니다:\n\n- ${doc.attendees?.join('\n- ')}`;
      citation = '참조: [참석자 목록]';
    } else if (query.includes('결정') || query.includes('의결') || query.includes('합의')) {
      answer = `문서 내에서 확인된 핵심 의사결정 사항 및 논의 내용은 다음과 같습니다:\n\n1. ${doc.actionItems?.[0]?.title || '핵심 의제'} (담당자: ${doc.actionItems?.[0]?.assignee || '미지정'})\n2. ${doc.actionItems?.[1]?.title || '보조 의제'} (담당자: ${doc.actionItems?.[1]?.assignee || '미지정'})`;
      citation = '참조: [액션 아이템 및 논의 내용]';
    } else {
      answer = `질문해 주신 '${query}'에 관한 문서 분석 결과입니다:\n\n${doc.content.substring(0, 300)}...\n\n위 내용에 명시된 흐름을 기반으로 논의가 전개되었습니다.`;
      citation = '참조: [논의 내용 본문]';
    }

    return { answer, citation };
  }
};



export const getCalendarEvents = () => {
  try {
    const events = localStorage.getItem('ongle_calendar_events');
    return events ? JSON.parse(events) : [
      // Seed a few gorgeous events initially so the calendar isn't blank
      { id: 'ev1', title: '4px 라운딩 디자인 가이드라인 배포', assignee: '이영희', date: '2026-05-20', docTitle: '주간 제품 전략 회의 및 Q4 로드맵 리뷰' },
      { id: 'ev2', title: 'API 연동 상세 명세서 최종 확정', assignee: '김철수', date: '2026-05-22', docTitle: '주간 제품 전략 회의 및 Q4 로드맵 리뷰' },
    ];
  } catch (e) {
    return [];
  }
};

const saveLocalCalendarEvent = (docId, item) => {
  try {
    const doc = localDocs.get(docId) || { title: '알 수 없는 문서' };
    const currentEvents = localStorage.getItem('ongle_calendar_events');
    const list = currentEvents ? JSON.parse(currentEvents) : [
      { id: 'ev1', title: '4px 라운딩 디자인 가이드라인 배포', assignee: '이영희', date: '2026-05-20', docTitle: '주간 제품 전략 회의 및 Q4 로드맵 리뷰' },
      { id: 'ev2', title: 'API 연동 상세 명세서 최종 확정', assignee: '김철수', date: '2026-05-22', docTitle: '주간 제품 전략 회의 및 Q4 로드맵 리뷰' },
    ];
    
    // Check for duplicates
    if (!list.some(e => e.title === item.title && e.date === item.dueDate)) {
      list.push({
        id: `ev-${Date.now()}`,
        title: item.title,
        assignee: item.assignee || '미지정',
        date: item.dueDate || new Date().toISOString().split('T')[0],
        docTitle: doc.title,
        docId: docId
      });
      localStorage.setItem('ongle_calendar_events', JSON.stringify(list));
    }
  } catch (e) {
    console.error('Failed to save local calendar event', e);
  }
};


export const addToCalendar = async (id, item) => {
  try {
    const response = await client.post('/schedule', { id, item });
    saveLocalCalendarEvent(id, item);
    return response.data;
  } catch (error) {
    console.warn('Falling back to successful Calendar add simulation.');
    saveLocalCalendarEvent(id, item);
    await new Promise((resolve) => setTimeout(resolve, 500));
    return { success: true };
  }
};

// ─────────────────────────────────────────────────────────────────────────────
// Client-side Precision Masking Engine (mirrors backend/security.py)
// ─────────────────────────────────────────────────────────────────────────────

const MASK_PATTERNS = {
  // 주민등록번호: 6자리-7자리 (앞자리 1~4)
  주민번호: /\b(\d{6})\s*-\s*([1-4]\d{6})\b/g,
  // 전화번호: 010/02/031 등 국번 + 3-4자리 + 4자리
  전화번호: /\b(010|02|031|032|033|041|042|043|051|052|053|054|055|061|062|063|064|0505|070|080)-\d{3,4}-\d{4}\b/g,
  // 이메일
  이메일: /\b[a-zA-Z0-9._%+\-]+@[a-zA-Z0-9.\-]+\.[a-zA-Z]{2,}\b/g,
  // 16자리 카드번호 (4-4-4-4)
  '금융정보(카드)': /\b\d{4}-\d{4}-\d{4}-\d{4}\b/g,
  // 계좌번호: 은행별 3~6-2~6-4~8 (카드번호와 겹치지 않도록 카드 먼저 검사)
  계좌번호: /\b\d{3,6}-\d{2,6}-\d{4,8}\b/g,
  // 사업자번호: 3-2-5
  사업자번호: /\b\d{3}-\d{2}-\d{5}\b/g,
  // 주소: 광역시/도 키워드 포함 패턴
  주소: /\b(서울특별시|서울시|경기도|인천광역시|인천시|부산광역시|부산시|대구광역시|대구시|광주광역시|광주시|대전광역시|대전시|울산광역시|울산시|세종특별자치시|세종시|충청북도|충청남도|전라북도|전라남도|경상북도|경상남도|강원도|제주도)\s+[가-힣0-9\s\-\.]+?(구|시|군|로|길|동|읍|면|번지)\b/g,
  // 병명 키워드
  병명: /(고혈압|당뇨병|당뇨|관절염|우울증|조현병|치매|고지혈증|폐암|위암|대장암|심장질환|뇌졸중|불면증|수면장애|공황장애|불안장애|ADHD)/g,
  // 소속/직책
  '소속/직책': /[가-힣]{1,6}?\s*(대리|과장|차장|부장|이사|상무|전무|사장|대표|팀장|실장|본부장|센터장|사회복지사|복지사|상담사|상담원|주임|수석|책임|선임)/g,
  // 이름: 2~4글자 한글 (일반 단어와 구별 어려우므로 마지막에 적용)
  이름: /[가-힣]{2,4}/g,
};

// 이름 스캔 시 제외할 일반 단어 목록
const NAME_EXCLUSIONS = new Set([
  '회의','회의록','결과','전략','협의','의결','차주','할당','일정','달력','디자인',
  '프론트','백엔드','상담','복지','어르신','활동','방문','독거','보건','의사','환자',
  '서울시','경기도','성남시','강남구','분당구','대화','요청','확인','의견',
  '네이버','카카오','구글','라인','토스','대리','과장','부장','차장','사장',
  '완료','처리','적용','등록','배포','연동','설계','구성','개발','업로드','히스토리',
  '캘린더','업그레이드','라이브러리','시스템','컴포넌트','환경','템플릿','화면','전환',
  '뼈대','완성','공유','작성','가이드','라인','색상','디자인','버튼','테마','컬러',
]);

// 마스킹 적용 함수 (레벨별)
function applyMask(type, value, level) {
  if (level === 'original') return value;

  if (level === 'full') {
    const fullMap = {
      '이름':           '***',
      '전화번호':       '***-****-****',
      '주민번호':       '******-*******',
      '주소':           '[주소삭제]',
      '병명':           '[병명삭제]',
      '금융정보(카드)': '****-****-****-****',
      '이메일':         '***@***.***',
      '계좌번호':       '***-***-******',
      '사업자번호':     '***-**-*****',
      '소속/직책':      '[직책삭제]',
    };
    return fullMap[type] || '***';
  }

  // pseudonym
  if (type === '이름') {
    if (value.length === 2) return value[0] + '*';
    if (value.length === 3) return value[0] + '*' + value[2];
    return value[0] + '*'.repeat(value.length - 2) + value[value.length - 1];
  }
  if (type === '전화번호') {
    const parts = value.split('-');
    if (parts.length === 3) return `${parts[0]}-****-${parts[2]}`;
    return '***-****-****';
  }
  if (type === '주민번호') {
    const parts = value.split('-');
    return `${parts[0].trim()}-*******`;
  }
  if (type === '이메일') {
    const [user, domain] = value.split('@');
    const masked = user.length <= 2 ? user[0] + '*' : user.slice(0, 2) + '*'.repeat(user.length - 2);
    return `${masked}@${domain}`;
  }
  if (type === '금융정보(카드)') {
    const parts = value.split('-');
    return `${parts[0]}-****-****-${parts[3]}`;
  }
  if (type === '계좌번호') {
    const parts = value.split('-');
    if (parts.length >= 3) return `${parts[0]}-***-${'*'.repeat(parts[parts.length - 1].length)}`;
    return '***-***-******';
  }
  if (type === '사업자번호') {
    const parts = value.split('-');
    if (parts.length === 3) return `${parts[0]}-**-***${parts[2].slice(-2)}`;
    return '***-**-*****';
  }
  if (type === '주소') {
    const words = value.trim().split(/\s+/);
    return words.length >= 2 ? `${words[0]} ${words[1]} ****` : `${words[0]} ****`;
  }
  if (type === '병명') {
    if (value.length === 2) return value[0] + '*';
    return value[0] + '*' + value[value.length - 1];
  }
  if (type === '소속/직책') {
    if (value.length <= 2) return value[0] + '*';
    return value[0] + '*'.repeat(value.length - 2) + value[value.length - 1];
  }
  return value;
}

// Regex-based full detection engine (mirrors backend/security.py)
function detectAllItems(text) {
  const detected = [];
  let id = 1;

  // Helper: push detected match while avoiding duplicates by value+type
  const push = (type, value) => {
    if (!detected.find(d => d.type === type && d.value === value)) {
      detected.push({ id: id++, type, value, masked: value, level: '원본유지' });
    }
  };

  // Order matters: longer/more specific patterns first to avoid substring collisions

  // 1. 주민번호
  for (const m of text.matchAll(new RegExp(MASK_PATTERNS['주민번호'].source, 'g')))
    push('주민번호', m[0]);

  // 2. 카드번호 (before account to avoid partial match)
  for (const m of text.matchAll(new RegExp(MASK_PATTERNS['금융정보(카드)'].source, 'g')))
    push('금융정보(카드)', m[0]);

  // 3. 계좌번호 (skip if already matched as card or RRN)
  for (const m of text.matchAll(new RegExp(MASK_PATTERNS['계좌번호'].source, 'g'))) {
    const v = m[0];
    if (!detected.find(d => d.value === v)) push('계좌번호', v);
  }

  // 4. 사업자번호
  for (const m of text.matchAll(new RegExp(MASK_PATTERNS['사업자번호'].source, 'g')))
    push('사업자번호', m[0]);

  // 5. 전화번호
  for (const m of text.matchAll(new RegExp(MASK_PATTERNS['전화번호'].source, 'g')))
    push('전화번호', m[0]);

  // 6. 이메일
  for (const m of text.matchAll(new RegExp(MASK_PATTERNS['이메일'].source, 'g')))
    push('이메일', m[0]);

  // 7. 주소
  for (const m of text.matchAll(new RegExp(MASK_PATTERNS['주소'].source, 'g')))
    push('주소', m[0]);

  // 8. 병명
  for (const m of text.matchAll(new RegExp(MASK_PATTERNS['병명'].source, 'g')))
    push('병명', m[0]);

  // 9. 소속/직책
  for (const m of text.matchAll(new RegExp(MASK_PATTERNS['소속/직책'].source, 'g')))
    push('소속/직책', m[0]);

  // 10. 이름 (last, most ambiguous — exclude known non-names)
  const alreadyMatched = new Set(detected.map(d => d.value));
  for (const m of text.matchAll(new RegExp(MASK_PATTERNS['이름'].source, 'g'))) {
    const v = m[0];
    if (NAME_EXCLUSIONS.has(v)) continue;
    if ([...alreadyMatched].some(existing => existing.includes(v))) continue;
    push('이름', v);
  }

  return detected;
}

export const maskDocument = async (docId, level = 'pseudonym', selectedTypes = null) => {
  try {
    const response = await client.post('/mask', { id: docId, level, selectedTypes });
    const data = response.data || {};
    const detectedItems = data.detectedItems || data.detected || [];
    return {
      ...data,
      detectedItems,
      detected: detectedItems,
    };
  } catch (error) {
    console.warn(`[Masking] Backend offline — using client-side engine (level: ${level})`);
    await new Promise(r => setTimeout(r, 350));

    const doc = localDocs.get(docId) || localDocs.get(seedId);
    if (!doc) throw new Error('Document not found');

    // Run full detection
    let detectedItems = detectAllItems(doc.content);

    // Filter to only selected types (if provided)
    if (selectedTypes) {
      detectedItems = detectedItems.filter(item => selectedTypes[item.type] !== false);
    }

    // Apply masking level to each item
    detectedItems.forEach(item => {
      item.masked = applyMask(item.type, item.value, level);
      item.level  = level === 'full' ? '완전삭제' : level === 'pseudonym' ? '가명처리' : '원본유지';
    });

    // Build masked text: replace longest values first to prevent substring collision
    let maskedContent = doc.content;
    if (level !== 'original') {
      const sorted = [...detectedItems].sort((a, b) => b.value.length - a.value.length);
      for (const item of sorted) {
        if (item.masked !== item.value) {
          maskedContent = maskedContent.replaceAll(item.value, item.masked);
        }
      }
    }

    return { maskedContent, detectedItems, detected: detectedItems };
  }
};



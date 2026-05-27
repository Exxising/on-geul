import React, { useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useToast } from '../hooks/useToast';
import { uploadDocument } from '../api/documents';

const UploadPage = () => {
  const [file, setFile] = useState(null);
  const [domain, setDomain] = useState('meeting');
  const [loading, setLoading] = useState(false);
  const fileInputRef = useRef(null);
  const navigate = useNavigate();
  const { showToast } = useToast();

  const validateFile = (selectedFile) => {
    if (!selectedFile) return false;
    const allowedExtensions = ['mp3', 'wav', 'm4a'];
    const extension = selectedFile.name.split('.').pop().toLowerCase();
    
    if (!allowedExtensions.includes(extension)) {
      showToast('지원하지 않는 파일 형식입니다. (mp3, wav, m4a만 가능)', 'error');
      return false;
    }

    const maxSizeInBytes = 25 * 1024 * 1024; // 25MB
    if (selectedFile.size > maxSizeInBytes) {
      showToast('파일 크기는 최대 25MB를 초과할 수 없습니다.', 'error');
      return false;
    }

    return true;
  };

  const handleFileChange = (e) => {
    const selectedFile = e.target.files[0];
    if (validateFile(selectedFile)) {
      setFile(selectedFile);
      showToast('파일이 정상적으로 선택되었습니다.', 'success');
    }
  };

  const handleDragOver = (e) => {
    e.preventDefault();
  };

  const handleDrop = (e) => {
    e.preventDefault();
    const selectedFile = e.dataTransfer.files[0];
    if (validateFile(selectedFile)) {
      setFile(selectedFile);
      showToast('파일이 정상적으로 업로드되었습니다.', 'success');
    }
  };

  const handleUploadClick = () => {
    fileInputRef.current.click();
  };

  const handleStartConversion = async () => {
    if (!file) {
      showToast('먼저 변환할 음성 파일을 업로드해 주세요.', 'error');
      return;
    }

    setLoading(true);
    try {
      const data = await uploadDocument(file, domain);
      showToast('파일 변환이 시작되었습니다.', 'success');
      navigate(`/loading/${data.id}`);
    } catch (error) {
      console.error(error);
      showToast(error.response?.data?.message || '업로드 중 오류가 발생했습니다. 다시 시도해 주세요.', 'error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-[860px] mx-auto px-6 pt-12 flex flex-col gap-section-gap pb-24">
      {/* Section 1: Intro */}
      <section className="text-center md:text-left flex flex-col gap-4">
        <h1 className="font-display text-display text-on-surface">음성 파일 업로드</h1>
        <p className="font-body-lg text-body-lg text-on-surface-variant max-w-2xl">
          회의, 인터뷰, 또는 아이디어 메모를 녹음한 파일을 올려주세요.<br />
          온글의 AI가 맥락을 이해하고 전문적인 형태의 문서로 정제하여 변환해 드립니다.
        </p>
      </section>

      {/* Section 2: Upload Zone */}
      <section
        onDragOver={handleDragOver}
        onDrop={handleDrop}
        onClick={handleUploadClick}
        className="border border-outline-variant bg-surface-container-lowest rounded-lg p-8 flex flex-col items-center justify-center min-h-[300px] border-dashed hover:bg-surface-container-low transition-colors duration-150 cursor-pointer group"
      >
        <input
          type="file"
          ref={fileInputRef}
          onChange={handleFileChange}
          accept=".mp3,.wav,.m4a"
          className="hidden"
        />
        <span className="material-symbols-outlined text-4xl text-outline mb-4 group-hover:text-primary transition-colors duration-150">
          upload_file
        </span>
        <h2 className="font-headline-md text-headline-md mb-2 text-center">
          {file ? file.name : '여기로 파일을 드래그하거나 클릭하여 선택하세요'}
        </h2>
        <p className="font-body-md text-body-md text-secondary mb-6">
          {file ? `크기: ${(file.size / (1024 * 1024)).toFixed(2)} MB` : '지원 형식: mp3, wav, m4a (최대 25MB)'}
        </p>
        <button
          type="button"
          className="bg-primary text-on-primary font-label-md text-label-md px-6 py-3 rounded hover:bg-surface-tint transition-colors duration-150 flex items-center gap-2"
        >
          <span className="material-symbols-outlined" style={{ fontVariationSettings: "'FILL' 1" }}>
            folder_open
          </span>
          파일 찾기
        </button>
      </section>

      {/* Section 3: Domain Selection */}
      <section className="flex flex-col gap-4">
        <h3 className="font-headline-md text-headline-md text-on-surface">문서 유형 선택</h3>
        <p className="font-body-md text-body-md text-secondary">AI가 어떤 형식의 문서로 정리할지 알려주세요.</p>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-2">
          {/* Option 1: Meeting */}
          <label className="cursor-pointer relative">
            <input
              type="radio"
              name="domain"
              value="meeting"
              checked={domain === 'meeting'}
              onChange={() => setDomain('meeting')}
              className="peer sr-only"
            />
            <div className="border border-outline-variant rounded p-6 h-full bg-surface-container-lowest peer-checked:border-primary peer-checked:bg-[#eaf1eb] hover:bg-surface-container-low transition-all duration-150 flex flex-col gap-2">
              <div className="flex items-center justify-between mb-2">
                <span className="material-symbols-outlined text-primary">groups</span>
                <div className={`w-4 h-4 rounded-full border flex items-center justify-center ${domain === 'meeting' ? 'border-primary bg-primary' : 'border-outline-variant'}`}>
                  {domain === 'meeting' && <div className="w-2 h-2 rounded-full bg-surface-container-lowest"></div>}
                </div>
              </div>
              <span className="font-label-md text-label-md text-on-surface block">회의록</span>
              <span className="font-caption text-caption text-secondary">주요 안건, 결정 사항, 다음 할 일 중심으로 정리합니다.</span>
            </div>
          </label>

          {/* Option 2: Consulting */}
          <label className="cursor-pointer relative">
            <input
              type="radio"
              name="domain"
              value="consulting"
              checked={domain === 'consulting'}
              onChange={() => setDomain('consulting')}
              className="peer sr-only"
            />
            <div className="border border-outline-variant rounded p-6 h-full bg-surface-container-lowest peer-checked:border-primary peer-checked:bg-[#eaf1eb] hover:bg-surface-container-low transition-all duration-150 flex flex-col gap-2">
              <div className="flex items-center justify-between mb-2">
                <span className={`material-symbols-outlined ${domain === 'consulting' ? 'text-primary' : 'text-outline'}`}>support_agent</span>
                <div className={`w-4 h-4 rounded-full border flex items-center justify-center ${domain === 'consulting' ? 'border-primary bg-primary' : 'border-outline-variant'}`}>
                  {domain === 'consulting' && <div className="w-2 h-2 rounded-full bg-surface-container-lowest"></div>}
                </div>
              </div>
              <span className="font-label-md text-label-md text-on-surface block">상담일지</span>
              <span className="font-caption text-caption text-secondary">내담자의 주요 호소 내용과 상담자의 피드백을 구조화합니다.</span>
            </div>
          </label>

          {/* Option 3: Welfare */}
          <label className="cursor-pointer relative">
            <input
              type="radio"
              name="domain"
              value="welfare"
              checked={domain === 'welfare'}
              onChange={() => setDomain('welfare')}
              className="peer sr-only"
            />
            <div className="border border-outline-variant rounded p-6 h-full bg-surface-container-lowest peer-checked:border-primary peer-checked:bg-[#eaf1eb] hover:bg-surface-container-low transition-all duration-150 flex flex-col gap-2">
              <div className="flex items-center justify-between mb-2">
                <span className={`material-symbols-outlined ${domain === 'welfare' ? 'text-primary' : 'text-outline'}`}>volunteer_activism</span>
                <div className={`w-4 h-4 rounded-full border flex items-center justify-center ${domain === 'welfare' ? 'border-primary bg-primary' : 'border-outline-variant'}`}>
                  {domain === 'welfare' && <div className="w-2 h-2 rounded-full bg-surface-container-lowest"></div>}
                </div>
              </div>
              <span className="font-label-md text-label-md text-on-surface block">복지활동일지</span>
              <span className="font-caption text-caption text-secondary">대상자의 상태 변화, 제공된 서비스 내역을 상세히 기록합니다.</span>
            </div>
          </label>
        </div>
      </section>

      {/* Section 4: Action */}
      <section className="flex justify-center pt-4">
        <button
          onClick={handleStartConversion}
          disabled={loading}
          className="bg-primary text-on-primary font-label-md text-label-md px-12 py-4 rounded-lg hover:bg-surface-tint transition-colors duration-150 w-full md:w-auto shadow-sm flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {loading ? '변환 업로드 중...' : '변환 시작'}
          <span className="material-symbols-outlined">arrow_forward</span>
        </button>
      </section>

      {/* Footer Guide */}
      <footer className="mt-12 mb-20 border-t border-outline-variant pt-12 pb-8">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          <div className="flex flex-col items-center text-center gap-3">
            <div className="w-12 h-12 rounded-full bg-surface-container-highest flex items-center justify-center text-secondary font-headline-md">1</div>
            <h4 class="font-label-md text-label-md">음성 업로드</h4>
            <p className="font-caption text-caption text-secondary">녹음된 파일을 업로드하고 문서 유형을 선택합니다.</p>
          </div>
          <div className="flex flex-col items-center text-center gap-3">
            <div className="w-12 h-12 rounded-full bg-surface-container-highest flex items-center justify-center text-secondary font-headline-md">2</div>
            <h4 class="font-label-md text-label-md">AI 변환</h4>
            <p className="font-caption text-caption text-secondary">온글 AI가 맥락을 분석하여 초안 문서를 작성합니다.</p>
          </div>
          <div className="flex flex-col items-center text-center gap-3">
            <div className="w-12 h-12 rounded-full bg-surface-container-highest flex items-center justify-center text-secondary font-headline-md">3</div>
            <h4 class="font-label-md text-label-md">편집 및 저장</h4>
            <p className="font-caption text-caption text-secondary">결과물을 검토, 수정하고 원하는 형식으로 내보냅니다.</p>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default UploadPage;

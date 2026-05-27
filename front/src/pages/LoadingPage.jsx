import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { getDocument } from '../api/documents';
import { useToast } from '../hooks/useToast';

const LoadingPage = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { showToast } = useToast();
  const [doc, setDoc] = useState(null);
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    let intervalId;
    let localProgress = 0;

    // Fake progress simulation to give smooth visual feedback
    const progressInterval = setInterval(() => {
      setProgress((prev) => {
        if (prev < 90) {
          return prev + Math.floor(Math.random() * 5) + 1;
        }
        return prev;
      });
    }, 500);

    const checkStatus = async () => {
      try {
        const data = await getDocument(id);
        setDoc(data);
        if (data.status === 'done') {
          clearInterval(progressInterval);
          setProgress(100);
          showToast('변환이 성공적으로 완료되었습니다!', 'success');
          // Brief delay for the 100% fill visual to show
          setTimeout(() => {
            navigate(`/result/${id}`);
          }, 500);
        } else if (data.status === 'error') {
          clearInterval(progressInterval);
          showToast(data.errorMessage || '변환에 실패했습니다. 업로드 페이지로 돌아갑니다.', 'error');
          navigate('/');
        }
      } catch (error) {
        console.error('Error polling status:', error);
        // We will continue polling even on temporary network/api failures
      }
    };

    // Initial check
    checkStatus();

    // Start polling every 2 seconds
    intervalId = setInterval(checkStatus, 2000);

    return () => {
      clearInterval(intervalId);
      clearInterval(progressInterval);
    };
  }, [id, navigate, showToast]);

  const getStepStatus = (stepIndex) => {
    if (doc?.status === 'done') return 'complete';
    
    // Simulate steps based on progress
    if (stepIndex === 1) {
      return 'complete'; // Upload is complete when we are on loading page
    }
    if (stepIndex === 2) {
      return progress >= 50 ? 'complete' : 'processing';
    }
    if (stepIndex === 3) {
      return progress >= 80 ? 'processing' : 'pending';
    }
    return 'pending';
  };

  return (
    <main className="flex-grow flex items-center justify-center px-6 min-h-[calc(100vh-4rem)]">
      <div className="max-w-[860px] w-full flex flex-col items-center py-section-gap">
        {/* Loading Visual Section */}
        <div className="w-full flex flex-col items-center gap-component-gap mb-8">
          <div className="relative w-full max-w-md h-1.5 bg-surface-container rounded-full overflow-hidden border border-outline-variant">
            <div
              style={{ width: `${progress}%` }}
              className="absolute top-0 left-0 h-full bg-primary rounded-full progress-shimmer transition-all duration-300"
            ></div>
          </div>
          <div className="flex flex-col items-center gap-2 text-center">
            <h2 className="font-headline-md text-headline-md text-on-surface">오디오를 텍스트로 변환하고 있어요.</h2>
            <p className="font-body-md text-body-md text-on-surface-variant">잠시만 기다려 주세요. 고품질의 텍스트 생성을 위해 인공지능이 분석 중입니다.</p>
          </div>
        </div>

        {/* Detailed Status Card */}
        <div className="w-full border border-outline-variant p-6 rounded-lg bg-surface flex flex-col gap-4 max-w-md">
          <div className="flex items-center justify-between border-b border-outline-variant pb-4">
            <div className="flex items-center gap-3">
              <span className="material-symbols-outlined text-primary" style={{ fontVariationSettings: "'FILL' 1" }}>
                audio_file
              </span>
              <div>
                <p className="font-label-md text-label-md text-on-surface truncate max-w-[200px]">
                  {doc?.fileName || '녹음_파일.mp3'}
                </p>
                <p className="font-caption text-caption text-secondary">
                  {doc?.fileSize || '계산 중...'} {doc?.duration ? `• ${doc.duration}` : ''}
                </p>
              </div>
            </div>
            <span className="font-label-md text-label-md text-primary font-bold">{progress}% 완료</span>
          </div>

          <div className="space-y-4 pt-2">
            {/* Step 1 */}
            <div className="flex items-center gap-3">
              <span className="material-symbols-outlined text-primary" style={{ fontVariationSettings: "'FILL' 1" }}>
                check_circle
              </span>
              <p className="font-body-md text-body-md text-on-surface">오디오 파일 업로드 완료</p>
            </div>

            {/* Step 2 */}
            <div className="flex items-center gap-3">
              {getStepStatus(2) === 'complete' ? (
                <span className="material-symbols-outlined text-primary" style={{ fontVariationSettings: "'FILL' 1" }}>
                  check_circle
                </span>
              ) : (
                <span className="material-symbols-outlined text-secondary animate-pulse">pending</span>
              )}
              <p className={`font-body-md text-body-md ${getStepStatus(2) === 'complete' ? 'text-on-surface' : 'text-secondary'}`}>
                음성 인식 및 분리 중
              </p>
            </div>

            {/* Step 3 */}
            <div className="flex items-center gap-3">
              {getStepStatus(3) === 'complete' ? (
                <span className="material-symbols-outlined text-primary" style={{ fontVariationSettings: "'FILL' 1" }}>
                  check_circle
                </span>
              ) : getStepStatus(3) === 'processing' ? (
                <span className="material-symbols-outlined text-secondary animate-pulse">pending</span>
              ) : (
                <span className="material-symbols-outlined text-secondary opacity-40">pending</span>
              )}
              <p className={`font-body-md text-body-md ${getStepStatus(3) === 'complete' ? 'text-on-surface' : getStepStatus(3) === 'processing' ? 'text-secondary font-semibold' : 'text-secondary opacity-40'}`}>
                문맥 보정 및 텍스트 구조화
              </p>
            </div>
          </div>
        </div>

        {/* Fixed Bottom Action */}
        <div className="mt-section-gap w-full flex flex-col items-center gap-4">
          <button className="w-full max-w-sm py-4 bg-surface-variant text-outline rounded font-label-md text-label-md border border-outline-variant cursor-not-allowed opacity-60" disabled>
            변환이 완료될 때까지 기다려 주세요
          </button>
          <p className="font-caption text-caption text-secondary text-center">
            중복 요청을 방지하기 위해 작업 중에는 버튼이 비활성화됩니다.
          </p>
        </div>
      </div>
    </main>
  );
};

export default LoadingPage;

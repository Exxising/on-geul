import React, { useEffect, useState, useRef } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import ForceGraph2D from 'react-force-graph-2d';
import { getGraph } from '../api/documents';
import { useToast } from '../hooks/useToast';

const GraphPage = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { showToast } = useToast();
  const graphRef = useRef();

  const [loading, setLoading] = useState(true);
  const [graphData, setGraphData] = useState({ nodes: [], links: [] });
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedNode, setSelectedNode] = useState(null);
  const [dimensions, setDimensions] = useState({ width: 800, height: 600 });

  const containerRef = useRef(null);

  useEffect(() => {
    // Handle resizing of the graph container
    const updateDimensions = () => {
      if (containerRef.current) {
        setDimensions({
          width: containerRef.current.clientWidth,
          height: containerRef.current.clientHeight || 550,
        });
      }
    };

    window.addEventListener('resize', updateDimensions);
    updateDimensions();

    const fetchGraph = async () => {
      try {
        const data = await getGraph(id);
        
        // Match the ForceGraph2D expected link structure (source, target)
        // If API returns edges, map edges to links
        const links = (data.edges || data.links || []).map((e) => ({
          source: e.source,
          target: e.target,
          label: e.label || '',
        }));

        setGraphData({
          nodes: data.nodes || [],
          links,
        });
      } catch (error) {
        console.error(error);
        showToast('그래프 데이터를 가져오지 못했습니다. 데모 데이터로 표시합니다.', 'info');
        
        // Seed gorgeous demo graph data containing people, topics, decisions
        const demoNodes = [
          { id: 'n1', label: '김철수', type: 'person', desc: '제품 총괄 파트장' },
          { id: 'n2', label: '이영희', type: 'person', desc: 'UX/UI 리드 디자이너' },
          { id: 'n3', label: '박민수', type: 'person', desc: '프론트엔드 시니어 개발자' },
          { id: 't1', label: 'Q4 로드맵', type: 'topic', desc: '4분기 서비스 고도화 및 배포 주기' },
          { id: 't2', label: 'UI 개편', type: 'topic', desc: '미니멀리즘 에디토리얼 디자인 시스템 구축' },
          { id: 'd1', label: '4px 라운딩 규칙 준수', type: 'decision', desc: '모든 카드 및 버튼의 border-radius를 0.25rem(4px)으로 일체화' },
          { id: 'd2', label: 'Vite 마이그레이션', type: 'decision', desc: '프론트 개발 환경의 빌드 속도 개선을 위해 Vite 채택' },
          { id: 'e1', label: '디자인 싱크 세션', type: 'event', desc: '2026-05-18 진행된 프론트 디자인 조율 세션' }
        ];

        const demoLinks = [
          { source: 'n1', target: 't1', label: '발의' },
          { source: 'n2', target: 't2', label: '리드' },
          { source: 'n3', target: 't2', label: '참여' },
          { source: 'n2', target: 'd1', label: '제안' },
          { source: 'n3', target: 'd2', label: '결정' },
          { source: 'n1', target: 'e1', label: '참석' },
          { source: 'n2', target: 'e1', label: '참석' },
          { source: 'n3', target: 'e1', label: '참석' },
          { source: 't1', target: 'e1', label: '연관' },
          { source: 't2', target: 'e1', label: '연관' }
        ];

        setGraphData({ nodes: demoNodes, links: demoLinks });
      } finally {
        setLoading(false);
        // Short timeout to allow container rendering before centering zoom
        setTimeout(() => {
          if (graphRef.current) {
            graphRef.current.zoomToFit(400, 100);
          }
        }, 100);
      }
    };

    fetchGraph();

    return () => window.removeEventListener('resize', updateDimensions);
  }, [id, showToast]);

  const handleZoomIn = () => {
    if (graphRef.current) {
      const zoom = graphRef.current.zoom();
      graphRef.current.zoom(zoom * 1.3, 300);
    }
  };

  const handleZoomOut = () => {
    if (graphRef.current) {
      const zoom = graphRef.current.zoom();
      graphRef.current.zoom(zoom / 1.3, 300);
    }
  };

  const handleZoomReset = () => {
    if (graphRef.current) {
      graphRef.current.zoomToFit(400, 100);
    }
  };

  // Node color maps depending on node type
  const getNodeColor = (node) => {
    if (node === selectedNode) return '#4f6051'; // highlighted primary
    switch (node.type) {
      case 'person': return '#c3c8c0'; // outline-variant style
      case 'topic': return '#677968'; // primary-container
      case 'decision': return '#4f6051'; // primary
      case 'event': return '#5f5e5e'; // secondary
      default: return '#747872';
    }
  };

  // Node drawing custom callback for high visual quality (circle with border and text)
  const drawNode = (node, ctx, globalScale) => {
    const isSelected = selectedNode && selectedNode.id === node.id;
    const isSearched = searchQuery && node.label.toLowerCase().includes(searchQuery.toLowerCase());
    
    let radius = 10;
    if (node.type === 'decision') radius = 12;
    if (node.type === 'event') radius = 11;
    if (isSelected) radius += 3;
    
    // Draw fill
    ctx.beginPath();
    ctx.arc(node.x, node.y, radius, 0, 2 * Math.PI, false);
    ctx.fillStyle = getNodeColor(node);
    ctx.fill();

    // Draw stroke
    ctx.lineWidth = isSelected || isSearched ? 3 : 1.5;
    ctx.strokeStyle = isSelected ? '#1a1c1c' : isSearched ? '#ba1a1a' : '#ffffff';
    ctx.stroke();

    // Draw text label
    const label = node.label;
    const fontSize = isSelected ? 13 / globalScale : 11 / globalScale;
    ctx.font = `${isSelected ? 'bold ' : ''}${fontSize}px Pretendard, sans-serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'top';
    ctx.fillStyle = '#1a1c1c';
    
    // Keep labels visible when scale is reasonable
    if (globalScale > 0.4) {
      ctx.fillText(label, node.x, node.y + radius + 3);
    }
  };

  return (
    <main className="max-w-[1200px] mx-auto px-6 pt-12 pb-24 md:py-16 flex flex-col gap-6">
      {/* Header Info */}
      <section className="flex flex-col md:flex-row md:justify-between md:items-start gap-4">
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <Link to={`/result/${id}`} className="text-primary hover:underline font-caption text-caption flex items-center gap-1">
              <span className="material-symbols-outlined text-[14px]">arrow_back</span>
              문서 결과로 돌아가기
            </Link>
          </div>
          <h1 className="font-display text-display text-on-surface">Knowledge Graph</h1>
          <p className="font-body-md text-body-md text-secondary">
            인공지능이 문서 내 언급된 사람, 안건, 의사결정 간의 관계를 지식 네트워크 그래프로 추출했습니다.
          </p>
        </div>
      </section>

      {/* Main Canvas & Sidebar Container */}
      <div className="flex flex-col lg:flex-row border border-outline-variant rounded bg-surface-container-lowest overflow-hidden h-[600px] relative">
        
        {/* Left Side: Toolbar and Canvas Graph */}
        <div ref={containerRef} className="flex-1 h-full relative flex flex-col min-h-[400px]">
          
          {/* Internal Toolbar */}
          <div className="absolute top-4 left-4 z-10 flex flex-wrap gap-2 pointer-events-auto bg-surface/90 backdrop-blur p-2 rounded border border-outline-variant max-w-[calc(100%-2rem)]">
            <div className="flex items-center border border-outline-variant rounded bg-surface-container-lowest px-2 py-1 max-w-[180px] md:max-w-xs">
              <span className="material-symbols-outlined text-secondary mr-1 text-[18px]">search</span>
              <input
                type="text"
                placeholder="노드 검색..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="bg-transparent border-none text-sm focus:outline-none w-full font-body-md"
              />
            </div>
            <button
              onClick={handleZoomReset}
              className="flex items-center gap-1 px-3 py-1.5 border border-outline-variant rounded bg-surface hover:bg-surface-container-low transition text-label-md font-label-md"
            >
              <span className="material-symbols-outlined text-[18px]">center_focus_strong</span>
              맞춤
            </button>
          </div>

          {/* Canvas Component */}
          {loading ? (
            <div className="flex-1 flex items-center justify-center">
              <div className="loading-spinner"></div>
            </div>
          ) : (
            <div className="flex-grow w-full h-full bg-[#fcfcfc]">
              <ForceGraph2D
                ref={graphRef}
                graphData={graphData}
                width={dimensions.width}
                height={550}
                nodeCanvasObject={drawNode}
                nodePointerAreaPaint={(node, color, ctx) => {
                  ctx.fillStyle = color;
                  ctx.beginPath();
                  ctx.arc(node.x, node.y, 14, 0, 2 * Math.PI, false);
                  ctx.fill();
                }}
                linkLabel={(link) => `<div class="bg-surface text-on-surface border border-outline-variant p-2 text-caption rounded shadow font-caption">${link.label}</div>`}
                linkDirectionalParticles={2}
                linkDirectionalParticleSpeed={0.005}
                linkDirectionalParticleWidth={1.5}
                linkDirectionalParticleColor={() => '#4f6051'}
                linkColor={() => '#c3c8c0'}
                linkWidth={1.5}
                onNodeClick={(node) => setSelectedNode(node)}
                d3VelocityDecay={0.4}
              />
            </div>
          )}

          {/* Floating Zoom Controls (Bottom Left) */}
          <div className="absolute bottom-4 left-4 z-10 flex flex-col gap-1.5 pointer-events-auto bg-surface/90 backdrop-blur p-1.5 rounded border border-outline-variant">
            <button
              onClick={handleZoomIn}
              className="w-8 h-8 flex items-center justify-center border border-outline-variant rounded bg-surface hover:bg-surface-container-low transition"
            >
              <span className="material-symbols-outlined text-[20px]">add</span>
            </button>
            <button
              onClick={handleZoomOut}
              className="w-8 h-8 flex items-center justify-center border border-outline-variant rounded bg-surface hover:bg-surface-container-low transition"
            >
              <span className="material-symbols-outlined text-[20px]">remove</span>
            </button>
          </div>
        </div>

        {/* Right Side: Detail Sidebar Panel */}
        <div className="w-full lg:w-[320px] border-t lg:border-t-0 lg:border-l border-outline-variant bg-surface h-full flex flex-col">
          <div className="p-4 border-b border-outline-variant flex justify-between items-center bg-surface-container-low">
            <h3 className="font-label-md text-label-md text-on-surface flex items-center gap-1.5">
              <span className="material-symbols-outlined text-[18px]">info</span>
              노드 상세 정보
            </h3>
            {selectedNode && (
              <button
                onClick={() => setSelectedNode(null)}
                className="text-secondary hover:text-on-surface"
              >
                <span className="material-symbols-outlined text-[18px]">close</span>
              </button>
            )}
          </div>
          
          <div className="flex-grow overflow-y-auto p-4 space-y-6">
            {selectedNode ? (
              <div className="space-y-4">
                <div className="space-y-1.5">
                  <span className="px-2 py-0.5 border border-outline-variant rounded bg-surface-container text-caption font-caption text-secondary">
                    {selectedNode.type === 'person' ? '인물' :
                     selectedNode.type === 'topic' ? '안건' :
                     selectedNode.type === 'decision' ? '의사결정' :
                     selectedNode.type === 'event' ? '행사/일정' : '기타'}
                  </span>
                  <h4 className="font-headline-md text-headline-md text-on-surface font-extrabold">{selectedNode.label}</h4>
                  <p className="font-body-md text-body-md text-on-surface-variant leading-relaxed">
                    {selectedNode.desc || '설명이 등록되어 있지 않은 노드입니다.'}
                  </p>
                </div>

                <div className="border-t border-outline-variant pt-4 space-y-3">
                  <h5 className="font-label-md text-label-md text-on-surface flex items-center gap-1">
                    <span className="material-symbols-outlined text-[16px]">link</span>
                    연관 회의 목록
                  </h5>
                  <div className="space-y-2">
                    <div className="p-3 border border-outline-variant bg-surface-container-lowest hover:bg-surface-container-low rounded cursor-pointer transition-colors duration-150">
                      <p className="font-body-md text-sm font-semibold text-on-surface line-clamp-1">
                        주간 제품 전략 회의 및 Q4 로드맵 리뷰
                      </p>
                      <p className="font-caption text-caption text-secondary mt-1">
                        2026-05-18 • 회의록
                      </p>
                    </div>
                    {selectedNode.type === 'person' && (
                      <div className="p-3 border border-outline-variant bg-surface-container-lowest hover:bg-surface-container-low rounded cursor-pointer transition-colors duration-150">
                        <p className="font-body-md text-sm font-semibold text-on-surface line-clamp-1">
                          디자인 싱크 세션
                        </p>
                        <p className="font-caption text-caption text-secondary mt-1">
                          2026-05-18 • 회의록
                        </p>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ) : (
              <div className="h-full flex flex-col items-center justify-center text-center py-20 text-secondary gap-3">
                <span className="material-symbols-outlined text-4xl text-outline-variant">
                  ads_click
                </span>
                <p className="font-body-md text-body-md">그래프 위의 노드를 선택하시면 상세 정보를 확인할 수 있습니다.</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </main>
  );
};

export default GraphPage;

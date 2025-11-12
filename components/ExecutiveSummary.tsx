'use client';

import React, { useState } from 'react';
import { CheckCircle, AlertTriangle } from 'lucide-react';

interface ExecutiveSummaryProps {
  summary: any;
}

const ExecutiveSummary: React.FC<ExecutiveSummaryProps> = ({ summary }) => {
  if (!summary || !summary.total) {
    return <div>데이터를 불러오는 중...</div>;
  }

  const { total } = summary;

  // 편집 가능한 텍스트 상태
  const [usdTexts, setUsdTexts] = useState({
    mainChange: `▼ ${Math.abs(total.costRate25F_usd - total.costRate24F_usd).toFixed(1)}%p 개선`,
    items: [
      {
        icon: '🎨',
        title: '원부자재 효율화',
        change: `▼ ${(total.materialRate24F_usd - total.materialRate25F_usd).toFixed(1)}%p`,
        description: '원부자재 단가 8.9% → 8.7%, 대량생산(758만개) 체제 진입으로 규모의 경제 달성 및 협상력 강화'
      },
      {
        icon: '💼',
        title: '마진율 최적화',
        change: `▼ ${(total.marginRate24F_usd - total.marginRate25F_usd).toFixed(1)}%p`,
        description: '벤더 마진 1.5% → 1.3%, 생산량 증가(+170.8%)로 공급망 단가 협상 구조 개선'
      },
      {
        icon: '📦',
        title: '경비율 절감',
        change: `▼ ${(total.expenseRate24F_usd - total.expenseRate25F_usd).toFixed(1)}%p`,
        description: '물량 증가에 따른 고정비 분산 효과 및 효율적 운영으로 경비율 1.0% → 0.4% 축소'
      },
      {
        icon: '⚙️',
        title: 'TAG 상승을 통한 생산단가 방어',
        change: '',
        description: '생산단가 $8.00 → $9.24(+15.5%) 상승에도 TAG +23.2%로 상쇄, 고가제품 믹스 효과로 원가율 방어'
      }
    ],
    summary: 'TAG 상승과 원가 절감의 동시효과로 USD 기준 원가율 –1.1%p 개선. 생산단가 인상 압력 속에서도 가격·믹스 전략으로 구조적 개선 달성'
  });

  const [krwTexts, setKrwTexts] = useState({
    mainChange: `▲ ${(total.costRate25F_krw - total.costRate25F_usd).toFixed(1)}%p 악화`,
    items: [
      {
        icon: '💱',
        title: '환율 효과',
        change: `▲${(total.costRate25F_krw - total.costRate25F_usd).toFixed(1)}%p`,
        description: '환율 1,288원 → 1,420원(+10.2%)으로 USD 개선 효과 상쇄. 실질 절감 노력에도 KRW 환산 시 개선 제한'
      },
      {
        icon: '👟',
        title: 'Shoes 카테고리 집중',
        change: '리스크',
        description: 'Shoes 원가율 18.8% → 16.8% 개선, 하지만 환율 상승으로 KRW 실적 반영 시 이익 전환 제한'
      },
      {
        icon: '📊',
        title: '생산단가 상승 영향',
        change: `+${(total.costYoY_usd - 100).toFixed(1)}%`,
        description: '단가 +15.5% 상승으로 원화 원가 부담 확대, TAG 효과는 일부 상쇄에 그침'
      },
      {
        icon: '⚙️',
        title: '제품 믹스 효과로 원부자재 평균단가 상승',
        change: '',
        description: '카테고리별 단가는 대부분 하락했으나, 고단가군(신발·가방) 비중 확대로 전체 평균단가는 상승. 저단가군(헤드웨어·양말) 비중 축소 영향이 큼'
      }
    ],
    summary: 'USD 기준으론 +TAG 효과로 원가율이 개선됐으나, 환율 상승(+10.2%)이 KRW 환산 이익을 잠식하며 +1.5%p 악화. 향후 환율 리스크 관리 및 원화 단가 협상력 강화가 핵심 과제'
  });

  const [editMode, setEditMode] = useState<string | null>(null);

  const handleTextEdit = (section: 'usd' | 'krw', field: string, value: string, itemIndex?: number) => {
    if (section === 'usd') {
      if (itemIndex !== undefined) {
        const newItems = [...usdTexts.items];
        newItems[itemIndex] = { ...newItems[itemIndex], [field]: value };
        setUsdTexts({ ...usdTexts, items: newItems });
      } else {
        setUsdTexts({ ...usdTexts, [field]: value });
      }
    } else {
      if (itemIndex !== undefined) {
        const newItems = [...krwTexts.items];
        newItems[itemIndex] = { ...newItems[itemIndex], [field]: value };
        setKrwTexts({ ...krwTexts, items: newItems });
      } else {
        setKrwTexts({ ...krwTexts, [field]: value });
      }
    }
  };

  // 편집 가능한 텍스트 컴포넌트
  const EditableText = ({ id, value, multiline = false, className, onSave }: any) => {
    const isEditing = editMode === id;
    
    return isEditing ? (
      <div className="flex flex-col gap-1">
        {multiline ? (
          <textarea
            value={value}
            onChange={(e) => onSave(e.target.value)}
            className="w-full p-2 border border-blue-300 rounded text-sm"
            rows={3}
            autoFocus
          />
        ) : (
          <input
            type="text"
            value={value}
            onChange={(e) => onSave(e.target.value)}
            className="w-full p-1 border border-blue-300 rounded text-sm"
            autoFocus
          />
        )}
        <button
          onClick={() => setEditMode(null)}
          className="self-end text-xs bg-blue-500 text-white px-2 py-1 rounded"
        >
          저장
        </button>
      </div>
    ) : (
      <div className="group relative">
        <span className={className}>{value}</span>
        <button
          onClick={() => setEditMode(id)}
          className="ml-2 text-xs text-blue-500 opacity-0 group-hover:opacity-100"
        >
          ✏️
        </button>
      </div>
    );
  };

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-5 mb-6">
      <h2 className="text-xl font-bold text-gray-700 mb-5">
        USD 기준 vs KRW 기준 원가율 비교 분석
      </h2>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* 왼쪽: USD 기준 (전년 → 당년) */}
        <div className="border-l-4 border-green-400 bg-blue-50/50 rounded-r-lg p-5">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-base font-bold text-green-600 flex items-center gap-2">
                <CheckCircle className="w-4 h-4" />
                USD 기준: 개선 성공
              </h3>
              <div className="text-2xl font-bold text-gray-700 mt-2">
                <span className="text-gray-500">{total.costRate24F_usd.toFixed(1)}%</span>
                {' → '}
                <span className="text-green-600">{total.costRate25F_usd.toFixed(1)}%</span>
              </div>
              <div className="text-sm text-green-600 font-bold mt-2">
                <EditableText
                  id="usd-main-change"
                  value={usdTexts.mainChange}
                  className=""
                  onSave={(val: string) => handleTextEdit('usd', 'mainChange', val)}
                />
              </div>
            </div>
          </div>

          {/* USD 개선 항목들 */}
          <div className="space-y-2.5 mb-3">
            {usdTexts.items.map((item, idx) => (
              <div key={idx} className="bg-white rounded p-3 shadow-sm border border-gray-100">
                <div className="flex items-start gap-3 mb-1">
                  <span className="text-base w-5 flex-shrink-0">{item.icon}</span>
                  <div className="flex-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <EditableText
                        id={`usd-title-${idx}`}
                        value={item.title}
                        className="font-semibold text-gray-700 text-sm"
                        onSave={(val: string) => handleTextEdit('usd', 'title', val, idx)}
                      />
                      <EditableText
                        id={`usd-change-${idx}`}
                        value={item.change}
                        className="text-xs font-bold text-green-600"
                        onSave={(val: string) => handleTextEdit('usd', 'change', val, idx)}
                      />
                    </div>
                  </div>
                </div>
                <div className="ml-8">
                  <EditableText
                    id={`usd-desc-${idx}`}
                    value={item.description}
                    multiline
                    className="text-xs text-gray-600"
                    onSave={(val: string) => handleTextEdit('usd', 'description', val, idx)}
                  />
                  <div className="h-0.5 bg-green-400 rounded-full mt-2" style={{ width: '60%' }}></div>
                </div>
              </div>
            ))}
          </div>

          {/* USD 핵심 메시지 */}
          <div className="bg-blue-500/90 text-white rounded p-3">
            <div className="flex items-start gap-3">
              <span className="text-base w-5 flex-shrink-0">💡</span>
              <div className="flex-1">
                <div className="font-bold text-sm mb-1">핵심 메시지</div>
                <div className="text-xs leading-relaxed">
                  <EditableText
                    id="usd-summary"
                    value={usdTexts.summary}
                    multiline
                    className=""
                    onSave={(val: string) => handleTextEdit('usd', 'summary', val)}
                  />
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* 오른쪽: KRW 기준 (당년 USD → 당년 KRW) */}
        <div className="border-l-4 border-orange-400 bg-orange-50/50 rounded-r-lg p-5">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-base font-bold text-orange-600 flex items-center gap-2">
                <AlertTriangle className="w-4 h-4" />
                KRW 기준: 환율에 상쇄
              </h3>
              <div className="text-2xl font-bold text-gray-700 mt-2">
                <span className="text-gray-500">{total.costRate25F_usd.toFixed(1)}%</span>
                {' → '}
                <span className="text-red-600">{total.costRate25F_krw.toFixed(1)}%</span>
              </div>
              <div className="text-sm text-red-600 font-bold mt-2">
                <EditableText
                  id="krw-main-change"
                  value={krwTexts.mainChange}
                  className=""
                  onSave={(val: string) => handleTextEdit('krw', 'mainChange', val)}
                />
              </div>
            </div>
          </div>

          {/* KRW 리스크 항목들 */}
          <div className="space-y-2.5 mb-3">
            {krwTexts.items.map((item, idx) => (
              <div key={idx} className="bg-white rounded p-3 shadow-sm border border-gray-100">
                <div className="flex items-start gap-3 mb-1">
                  <span className="text-base w-5 flex-shrink-0">{item.icon}</span>
                  <div className="flex-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <EditableText
                        id={`krw-title-${idx}`}
                        value={item.title}
                        className="font-semibold text-gray-700 text-sm"
                        onSave={(val: string) => handleTextEdit('krw', 'title', val, idx)}
                      />
                      <EditableText
                        id={`krw-change-${idx}`}
                        value={item.change}
                        className="text-xs font-bold text-red-600"
                        onSave={(val: string) => handleTextEdit('krw', 'change', val, idx)}
                      />
                    </div>
                  </div>
                </div>
                <div className="ml-8">
                  <EditableText
                    id={`krw-desc-${idx}`}
                    value={item.description}
                    multiline
                    className="text-xs text-gray-600"
                    onSave={(val: string) => handleTextEdit('krw', 'description', val, idx)}
                  />
                  <div className="h-0.5 bg-orange-400 rounded-full mt-2" style={{ width: '60%' }}></div>
                </div>
              </div>
            ))}
          </div>

          {/* KRW 핵심 메시지 */}
          <div className="bg-orange-500/90 text-white rounded p-3">
            <div className="flex items-start gap-3">
              <span className="text-base w-5 flex-shrink-0">⚠️</span>
              <div className="flex-1">
                <div className="font-bold text-sm mb-1">핵심 메시지</div>
                <div className="text-xs leading-relaxed">
                  <EditableText
                    id="krw-summary"
                    value={krwTexts.summary}
                    multiline
                    className=""
                    onSave={(val: string) => handleTextEdit('krw', 'summary', val)}
                  />
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ExecutiveSummary;

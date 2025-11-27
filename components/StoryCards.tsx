'use client';

import React, { useState, useEffect } from 'react';
import { TrendingUp, TrendingDown, DollarSign } from 'lucide-react';

interface StoryCardsProps {
  summary: any;
}

const StoryCards: React.FC<StoryCardsProps> = ({ summary }) => {
  const [usdComment, setUsdComment] = useState<string>('');
  const [krwComment, setKrwComment] = useState<string>('');
  const [loadingUsd, setLoadingUsd] = useState(false);
  const [loadingKrw, setLoadingKrw] = useState(false);

  if (!summary || !summary.total) {
    return <div>데이터를 불러오는 중...</div>;
  }

  const { total } = summary;

  const generateAIComment = async (section: 'usd' | 'krw') => {
    const setLoading = section === 'usd' ? setLoadingUsd : setLoadingKrw;
    const setComment = section === 'usd' ? setUsdComment : setKrwComment;

    setLoading(true);
    try {
      const data = section === 'usd' ? {
        costRate24F_usd: total.costRate24F_usd,
        costRate25F_usd: total.costRate25F_usd,
        costRateChange_usd: total.costRateChange_usd,
        avgTag24F_usd: total.avgTag24F_usd,
        avgTag25F_usd: total.avgTag25F_usd,
        tagYoY_usd: total.tagYoY_usd,
        avgCost24F_usd: total.avgCost24F_usd,
        avgCost25F_usd: total.avgCost25F_usd,
        costYoY_usd: total.costYoY_usd,
        // 세부 항목별 원가율 (USD)
        materialRate24F_usd: total.materialRate24F_usd,
        materialRate25F_usd: total.materialRate25F_usd,
        artworkRate24F_usd: total.artworkRate24F_usd,
        artworkRate25F_usd: total.artworkRate25F_usd,
        laborRate24F_usd: total.laborRate24F_usd,
        laborRate25F_usd: total.laborRate25F_usd,
        marginRate24F_usd: total.marginRate24F_usd,
        marginRate25F_usd: total.marginRate25F_usd,
        expenseRate24F_usd: total.expenseRate24F_usd,
        expenseRate25F_usd: total.expenseRate25F_usd,
        // 세부 항목별 평균단가 (USD)
        material24F_usd: total.material24F_usd,
        material25F_usd: total.material25F_usd,
        artwork24F_usd: total.artwork24F_usd,
        artwork25F_usd: total.artwork25F_usd,
        labor24F_usd: total.labor24F_usd,
        labor25F_usd: total.labor25F_usd,
        margin24F_usd: total.margin24F_usd,
        margin25F_usd: total.margin25F_usd,
        expense24F_usd: total.expense24F_usd,
        expense25F_usd: total.expense25F_usd,
      } : {
        costRate24F_krw: total.costRate24F_krw,
        costRate25F_krw: total.costRate25F_krw,
        costRateChange_krw: total.costRateChange_krw,
        costRate25F_usd: total.costRate25F_usd,
        avgTag24F_krw: total.avgTag24F_krw,
        avgTag25F_krw: total.avgTag25F_krw,
        tagYoY_krw: total.tagYoY_krw,
        avgCost24F_krw: total.avgCost24F_krw,
        avgCost25F_krw: total.avgCost25F_krw,
        costYoY_krw: total.costYoY_krw,
        // 세부 항목별 원가율 (KRW)
        materialRate24F_krw: total.materialRate24F_krw || 0,
        materialRate25F_krw: total.materialRate25F_krw || 0,
        artworkRate24F_krw: total.artworkRate24F_krw || 0,
        artworkRate25F_krw: total.artworkRate25F_krw || 0,
        laborRate24F_krw: total.laborRate24F_krw || 0,
        laborRate25F_krw: total.laborRate25F_krw || 0,
        marginRate24F_krw: total.marginRate24F_krw || 0,
        marginRate25F_krw: total.marginRate25F_krw || 0,
        expenseRate24F_krw: total.expenseRate24F_krw || 0,
        expenseRate25F_krw: total.expenseRate25F_krw || 0,
        // 세부 항목별 평균단가 (USD - 참고용)
        material24F_usd: total.material24F_usd,
        material25F_usd: total.material25F_usd,
        artwork24F_usd: total.artwork24F_usd,
        artwork25F_usd: total.artwork25F_usd,
        labor24F_usd: total.labor24F_usd,
        labor25F_usd: total.labor25F_usd,
        margin24F_usd: total.margin24F_usd,
        margin25F_usd: total.margin25F_usd,
        expense24F_usd: total.expense24F_usd,
        expense25F_usd: total.expense25F_usd,
      };

      const response = await fetch('/api/generate-comment', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ section, data }),
      });

      if (response.ok) {
        const result = await response.json();
        setComment(result.comment);
      } else {
        setComment('AI 코멘트를 생성할 수 없습니다.');
      }
    } catch (error) {
      console.error('AI 코멘트 생성 오류:', error);
      setComment('AI 코멘트 생성 중 오류가 발생했습니다.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
      {/* USD 카드 */}
      <div className="bg-white rounded-lg shadow-lg p-6 border-l-4 border-blue-500">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-bold text-gray-800">전체 (USD 기준)</h3>
          <DollarSign className="w-6 h-6 text-blue-500" />
        </div>

        <div className="space-y-4">
          {/* 24F 원가율 */}
          <div>
            <p className="text-sm text-gray-600">24F 원가율</p>
            <p className="text-2xl font-bold text-gray-800">
              {total.costRate24F_usd.toFixed(1)}%
            </p>
          </div>

          {/* 25F 원가율 */}
          <div>
            <p className="text-sm text-gray-600">25F 원가율</p>
            <p className="text-2xl font-bold text-gray-800">
              {total.costRate25F_usd.toFixed(1)}%
            </p>
          </div>

          {/* 변동 */}
          <div className="flex items-center gap-2 pt-2 border-t">
            {total.costRateChange_usd < 0 ? (
              <TrendingDown className="w-5 h-5 text-green-500" />
            ) : (
              <TrendingUp className="w-5 h-5 text-red-500" />
            )}
            <span
              className={`text-lg font-semibold ${
                total.costRateChange_usd < 0 ? 'text-green-500' : 'text-red-500'
              }`}
            >
              {total.costRateChange_usd > 0 ? '+' : ''}
              {total.costRateChange_usd.toFixed(1)}%p
            </span>
            <span className="text-sm text-gray-600">변동</span>
          </div>

          {/* 세부 원가 정보 */}
          <div className="space-y-2 pt-4 border-t">
            <div className="flex justify-between text-sm">
              <span className="text-gray-600">평균 TAG</span>
              <span className="font-medium">
                ${total.avgTag24F_usd.toFixed(2)} → ${total.avgTag25F_usd.toFixed(2)}
              </span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-gray-600">평균 원가</span>
              <span className="font-medium">
                ${total.avgCost24F_usd.toFixed(2)} → ${total.avgCost25F_usd.toFixed(2)}
              </span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-gray-600">TAG YOY</span>
              <span className="font-medium">{total.tagYoY_usd.toFixed(1)}%</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-gray-600">원가 YOY</span>
              <span className="font-medium">{total.costYoY_usd.toFixed(1)}%</span>
            </div>
          </div>

          {/* AI 코멘트 버튼 */}
          {process.env.NODE_ENV !== 'production' && (
            <button
              onClick={() => generateAIComment('usd')}
              disabled={loadingUsd}
              className="w-full mt-4 px-4 py-2 bg-blue-500 text-white rounded-md hover:bg-blue-600 disabled:bg-gray-400 transition-colors"
            >
              {loadingUsd ? '생성 중...' : 'AI 인사이트 생성'}
            </button>
          )}

          {/* AI 코멘트 표시 */}
          {usdComment && (
            <div className="mt-3 p-3 bg-blue-50 rounded-md text-sm text-gray-700">
              {usdComment}
            </div>
          )}
        </div>
      </div>

      {/* KRW 카드 */}
      <div className="bg-white rounded-lg shadow-lg p-6 border-l-4 border-green-500">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-bold text-gray-800">전체 (KRW 기준)</h3>
          <DollarSign className="w-6 h-6 text-green-500" />
        </div>

        <div className="space-y-4">
          {/* 24F 원가율 */}
          <div>
            <p className="text-sm text-gray-600">24F 원가율</p>
            <p className="text-2xl font-bold text-gray-800">
              {total.costRate24F_krw.toFixed(1)}%
            </p>
          </div>

          {/* 25F 원가율 */}
          <div>
            <p className="text-sm text-gray-600">25F 원가율</p>
            <p className="text-2xl font-bold text-gray-800">
              {total.costRate25F_krw.toFixed(1)}%
            </p>
          </div>

          {/* 변동 */}
          <div className="flex items-center gap-2 pt-2 border-t">
            {total.costRateChange_krw < 0 ? (
              <TrendingDown className="w-5 h-5 text-green-500" />
            ) : (
              <TrendingUp className="w-5 h-5 text-red-500" />
            )}
            <span
              className={`text-lg font-semibold ${
                total.costRateChange_krw < 0 ? 'text-green-500' : 'text-red-500'
              }`}
            >
              {total.costRateChange_krw > 0 ? '+' : ''}
              {total.costRateChange_krw.toFixed(1)}%p
            </span>
            <span className="text-sm text-gray-600">변동</span>
          </div>

          {/* 세부 원가 정보 */}
          <div className="space-y-2 pt-4 border-t">
            <div className="flex justify-between text-sm">
              <span className="text-gray-600">평균 TAG</span>
              <span className="font-medium">
                ₩{total.avgTag24F_krw.toLocaleString()} → ₩{total.avgTag25F_krw.toLocaleString()}
              </span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-gray-600">평균 원가</span>
              <span className="font-medium">
                ₩{total.avgCost24F_krw.toLocaleString()} → ₩{total.avgCost25F_krw.toLocaleString()}
              </span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-gray-600">TAG YOY</span>
              <span className="font-medium">{total.tagYoY_krw.toFixed(1)}%</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-gray-600">원가 YOY</span>
              <span className="font-medium">{total.costYoY_krw.toFixed(1)}%</span>
            </div>
          </div>

          {/* AI 코멘트 버튼 */}
          {process.env.NODE_ENV !== 'production' && (
            <button
              onClick={() => generateAIComment('krw')}
              disabled={loadingKrw}
              className="w-full mt-4 px-4 py-2 bg-green-500 text-white rounded-md hover:bg-green-600 disabled:bg-gray-400 transition-colors"
            >
              {loadingKrw ? '생성 중...' : 'AI 인사이트 생성'}
            </button>
          )}

          {/* AI 코멘트 표시 */}
          {krwComment && (
            <div className="mt-3 p-3 bg-green-50 rounded-md text-sm text-gray-700">
              {krwComment}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default StoryCards;


















# 🧾 F&F 원가대시보드

F&F 시즌별 원가 데이터를 분석하고 시각화하는 Next.js 기반 웹 애플리케이션입니다.

## 📌 주요 기능

- 📊 전체/카테고리별 원가율 분석
- 🔥 아이템별 원가 구성 히트맵
- 📈 시즌 간 비교 차트
- 🤖 AI 기반 인사이트 생성
- 💹 실시간 데이터 연동

## 🚀 시작하기

### 1. 의존성 설치

```bash
npm install
```

### 2. 환경 변수 설정 (선택사항)

AI 기능을 사용하려면 OpenAI API 키가 필요합니다.

`.env.local` 파일을 생성하고 다음 내용을 추가하세요:

```
OPENAI_API_KEY=sk-your-actual-api-key-here
```

### 3. Summary JSON 생성

CSV 파일에서 집계 데이터를 생성합니다:

```bash
python generate_summary.py
```

### 4. 개발 서버 실행

```bash
npm run dev
```

브라우저에서 [http://localhost:3000](http://localhost:3000)을 열어 확인하세요.

## 📁 프로젝트 구조

```
COST2/
├── app/                          # Next.js 앱 디렉토리
│   ├── page.tsx                 # 메인 페이지
│   ├── layout.tsx               # 레이아웃
│   ├── globals.css              # 전역 스타일
│   └── api/
│       └── generate-comment/
│           └── route.ts         # AI 코멘트 생성 API
├── components/                   # React 컴포넌트
│   ├── Dashboard.tsx            # 히트맵 테이블
│   ├── StoryCards.tsx           # 원가율 카드
│   ├── CategoryComparison.tsx   # 레이더 차트
│   ├── WaterfallChart.tsx       # 워터폴 차트
│   └── ExecutiveSummary.tsx     # 경영진 요약
├── lib/                         # 유틸리티 함수
│   ├── csvParser.ts             # CSV 파싱 로직
│   └── types.ts                 # TypeScript 타입
├── public/                       # 정적 파일
│   ├── MLB 251107.csv           # 원본 데이터
│   └── summary.json             # 집계 데이터
├── generate_summary.py           # Python 집계 스크립트
├── package.json
├── tsconfig.json
├── tailwind.config.ts
└── next.config.js
```

## 🔑 핵심 원칙

### 화폐 기준

- **USD 기준 (기본)**: 모든 계산은 USD 기준으로 진행
- **KRW 기준 (예외)**: 오직 "전체(KRW)" 카드만 예외적으로 KRW 사용

### 환율 적용 원칙 ⚠️ 중요!

```
당시즌 TAG USD 변환 = 전시즌 환율 적용
- 24F TAG USD: KRW TAG ÷ 1288 (24F 환율)
- 25F TAG USD: KRW TAG ÷ 1288 (전시즌 24F 환율 사용!)

※ CSV의 KRW 원가 컬럼:
  - 24F: USD × 1288 환율로 저장됨
  - 25F: USD × 1420 환율로 저장됨

🆕 환율 파일 연동:
- NON 시즌: FX 251111.csv (전년: 1296.77, 당년: 1415.00)
- 25FW 시즌: FX FW.csv (24F: 1288, 25F: 1420)
- 환율 정보 자동 반영 위치:
  - ✅ XXX(글로벌기준) 주요 지표 비교 테이블 (XXX는 탭 이름: MLB 25FW, MLB NON, MLB KIDS, DISCOVERY)
  - ✅ 워터폴 차트 "환율효과 (FX)" 섹션
  - ✅ 데이터 정보 박스 "USD 환율" 표시
```

### 원가 항목 정의

```
원부자재 = 원자재 + 부자재 + 본사공급자재 + 택/라벨
⚠️ 주의: 아트웍은 원부자재에 포함되지 않습니다!

총원가 = 원부자재 + 아트웍 + 공임 + 정상마진 + 경비
```

### 원가율 계산 공식

```javascript
원가율 = (평균원가 ÷ (평균TAG / 1.1)) × 100
```

### 카테고리 동적 필터링 🆕

**시스템이 CSV 파일에 실제로 존재하는 카테고리만 자동으로 표시합니다.**

#### 적용 위치
1. **카테고리 필터 드롭다운** (히트맵 테이블 상단)
2. **레이더 차트** (카테고리별 원가 구성 비교)
3. **카테고리 색상 범례** (페이지 하단) 🆕

```typescript
// 예시: MLB non 251111.csv 파일의 경우
실제 존재하는 카테고리 (자동 표시):
- Shoes (슈즈) - #8b5cf6 (보라색)
- Bag (가방) - #ec4899 (핑크색)
- Acc_etc (악세사리) - #ef4444 (빨간색)

표시되지 않는 카테고리 (데이터 없음):
- Outer (아우터) - #3b82f6 (파란색)
- Inner (이너) - #10b981 (초록색)
- Bottom (바텀) - #f59e0b (주황색)
```

**구현 방법:**
```typescript
// items 배열에서 실제 존재하는 카테고리 추출
const categorySet = new Set(items.map(item => item.category));
const availableCategories = CATEGORIES.filter(cat => categorySet.has(cat.id));
```

### 카테고리 표시 순서 (전체 목록)

1. **의류 (Apparel)**
   - Outer (아우터) - 파란색 `#3b82f6`
   - Inner (이너) - 초록색 `#10b981`
   - Bottom (바텀) - 주황색 `#f59e0b`

2. **시즌 악세사리 (Seasonal Accessories)**
   - Shoes (슈즈) - 보라색 `#8b5cf6`
   - Bag (가방) - 핑크색 `#ec4899`
   - Headwear (헤드웨어) - 하늘색 `#06b6d4` 🆕
   - Acc_etc (악세사리) - 빨간색 `#ef4444`

### 카테고리 카드 표시 규칙 🆕

**원가율 카드 및 평균단가 카드는 발주 비중이 큰 상위 4개 카테고리만 표시합니다.**

**각 카드에는 생산수량 정보가 표시됩니다** 🆕:
- 전체/카테고리별 USD 카드: `생산수량: X.XM (YOY%)`
- 전체 KRW 카드: `생산수량: X.XM (YOY%)`
- 카테고리별 KRW 카드: 생산수량 미표시 (TAG YOY, 원가 YOY만)

```typescript
// 그리드 레이아웃: 5열 (XL 화면 이상)
grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5

// 표시 기준: 전체 + 4개 카테고리 = 총 5개 카드

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
🎯 FW/SS 시즌 (MLB 25FW, MLB KIDS, DISCOVERY):
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

고정 카테고리 표시:
┌─────┬───────┬───────┬────────┬────────────────────┐
│전체 │ Outer │ Inner │ Bottom │ WEAR_ETC or ACC_ETC │
└─────┴───────┴───────┴────────┴────────────────────┘

✅ Outer, Inner, Bottom 무조건 표시 (고정)
✅ 4번째: WEAR_ETC 있으면 WEAR_ETC, 없으면 ACC_ETC
✅ ETC 카드는 제일 마지막 위치

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
🎯 NON 시즌 (MLB NON):
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

발주 비중(생산수량) 상위 4개 표시:
┌─────┬──────────┬──────────┬──────────┬──────────┐
│전체 │  1위 Cat │  2위 Cat │  3위 Cat │ ETC (4위)│
└─────┴──────────┴──────────┴──────────┴──────────┘

✅ 생산수량 기준 내림차순 정렬
✅ 상위 4개 카테고리 선택
✅ ETC (Acc_etc, Wear_etc 등)는 순위와 관계없이 제일 마지막에 배치
✅ 예: Headwear, Bag, Shoes, Acc_etc (발주 비중 순, ETC는 마지막)

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
공통 규칙:
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

✅ 전체 원가율/평균단가 (항상 첫 번째)
✅ ETC 카테고리는 항상 제일 마지막 위치
✅ XL 화면(1280px+)에서 한 줄 표시로 비교 용이

표시되지 않는 카테고리:
❌ 5위 이하 카테고리 (NON 시즌)
❌ 데이터가 없는 카테고리
```

**반응형 브레이크포인트:**

**원가율/평균단가 카드:**
- Mobile (< 640px): 1열 (세로 나열)
- Small (640px+): 2열
- Large (1024px+): 3열
- **XL (1280px+): 5열** ⭐ 모든 카드 한 줄 표시

**레이더 차트 (카테고리별 원가 구성 비교 - USD 기준):**
- Mobile (< 768px): 1열 (세로 나열)
- Medium (768px+): 2열
- **XL (1280px+): 5열** ⭐ 모든 차트 한 줄 표시
- **카테고리 표시 규칙**: 원가율 카드와 동일 (FW/SS 시즌: 고정 카테고리, NON 시즌: 발주 비중 순)

**히트맵 중분류 필터:**
- 모든 실제 존재하는 카테고리가 드롭다운에 표시됨
- 사용자가 필터를 통해 선택 가능

## 📊 데이터 흐름

```
CSV 파일 (MLB non 251111.csv / MLB FW.csv) + FX 파일 (FX 251111.csv / FX FW.csv)
    ↓
parseCsv() - CSV 파싱
    ↓
loadExchangeRates() - 환율 데이터 로드 🆕
    ↓
aggregateByItem() - 아이템별 집계
    ├→ 수량 필터링 (qty24F > 0 AND qty25F > 0)
    ├→ 히트맵 테이블
    └→ 상세 내역

         summary.json (generate_summary.py / generate_summary_25fw.py)
             ↓
         calculateTotalStats() - 전체 통계 (qty24F, qty25F, qtyYoY 포함) 🆕
         calculateCategoryStats() - 카테고리 통계 (qty24F, qty25F, qtyYoY 포함) 🆕
             ├→ StoryCards (원가율 카드 - 생산수량 정보 포함) 🆕
             ├→ CategoryComparison (레이더 차트)
             ├→ WaterfallChart (워터폴 차트 - 환율 정보 포함) 🆕
             └→ KeyMetricsTable (MLB 주요 지표 - 환율 정보 포함) 🆕
```

### 히트맵 아이템 필터링 규칙 🆕

**전년 또는 당년 수량이 0인 아이템은 자동으로 제외됩니다.**

```typescript
// 표시되는 아이템
✅ 전년 수량 > 0 AND 당년 수량 > 0

// 제외되는 아이템
❌ 전년 수량 = 0 (당년에만 존재)
❌ 당년 수량 = 0 (전년에만 존재)
❌ 둘 다 0 (데이터 없음)
```

**목적**: 의미있는 YOY 비교만 표시하여 데이터 품질 향상

### 히트맵 표시 형식 🆕

**평균TAG 및 원가 항목 변동 표시 규칙**

```typescript
// 평균 KRW TAG
- ₩ 기호 제거: 숫자만 표시 (예: 45,000)
- 전년 환율 적용: item.avgTag × 1297

// 히트맵 테이블 - 원가 항목별 변동
- 증가: +$0.00 형식 (빨간색 배경)
- 감소: -$0.00 형식 (파란색 배경)
- 적용 항목: 원부자재, 아트웍, 공임, 마진, 기타경비

// 히트맵 테이블 - 총원가차이(USD) 컬럼 🆕
- 위치: 원가율 변동 컬럼 바로 뒤
- 계산식: 원부자재 차이 + 아트웍 차이 + 공임 차이 + 마진 차이 + 기타경비 차이
- 표시 형식: +$X.XX 또는 -$X.XX
- 색상:
  - 음수(감소): 초록색 배경 (#d1fae5)
  - 양수(증가): 빨간색 배경 (#fee2e2)
- 목적: 각 아이템의 총원가 차이를 한눈에 파악

// 상세 내역 (접기/펼치기) - 원가 항목별 변동
- 증가: +$0.00 형식 (빨간색 텍스트)
- 감소: -$0.00 형식 (초록색 텍스트)
- 적용 항목: 원부자재, 아트웍, 공임, 마진, 경비, 평균 원가

// 코드 예시
{materialChange >= 0 ? '+' : '-'}${Math.abs(materialChange).toFixed(2)}
// 결과: +$1.23 또는 -$1.23 (부호가 $ 앞에 위치)
```

**수정 내역**:
- ❌ Before: `+$-0.36` (잘못된 형식)
- ✅ After: `-$0.36` (올바른 형식)
- 총 11개 위치 수정 (테이블 5개 + 상세 내역 6개)

**목적**: 직관적인 금액 변동 표시로 실무 의사결정 지원

### 카테고리별 원가 구성 비교 - 차이 컬럼 🆕

**"카테고리별 원가 구성 비교 (USD 기준)" 하단 테이블에 "차이" 컬럼 추가**

```typescript
// 테이블 구조
┌─────────┬────────┬────────┬──────────┐
│  구분   │  전년  │  당년  │   차이   │
├─────────┼────────┼────────┼──────────┤
│ 원가율  │ 24.5%  │ 22.8%  │ -1.7%p ⬇ │ (초록색)
│ 원부자재│ 15.2%  │ 14.8%  │ -0.4%p ⬇ │ (초록색)
│ 아트웍  │  2.1%  │  2.3%  │ +0.2%p ⬆ │ (빨간색)
│ 공임    │  4.5%  │  4.2%  │ -0.3%p ⬇ │ (초록색)
│ 마진    │  1.8%  │  1.9%  │ +0.1%p ⬆ │ (빨간색)
│ 경비    │  0.9%  │  0.8%  │ -0.1%p ⬇ │ (초록색)
└─────────┴────────┴────────┴──────────┘
```

**코드 예시:**
```typescript
// 차이 계산 및 표시
<div className={`font-bold text-center py-1.5 text-[11px] ${
  (stats.costRate25F - stats.costRate24F) < 0 
    ? 'text-green-600'  // 감소 = 긍정
    : 'text-red-600'    // 증가 = 부정
}`}>
  {(stats.costRate25F - stats.costRate24F) > 0 ? '+' : ''}
  {(stats.costRate25F - stats.costRate24F).toFixed(1)}%p
</div>
```

**표시 규칙:**
- 증가: `+x.x%p` 형식, 빨간색 (text-red-600)
- 감소: `-x.x%p` 형식, 초록색 (text-green-600)
- 소수점 첫째자리까지 표시 (.toFixed(1))
- 모든 카테고리별로 동일하게 적용

**목적**: 전년 대비 변동폭 즉시 파악으로 카테고리별 원가 트렌드 분석 강화

### 평균단가 카드 - "전년 대비" 레이블 🆕

**평균단가 (USD 기준) 카드에 "전년 대비" 텍스트 추가**

```typescript
// Before
┌───────────────────────────┐
│ 전체 평균단가             │
│ $10.58                    │
│            ↑ +$1.24       │ (레이블 없음)
└───────────────────────────┘

// After
┌───────────────────────────┐
│ 전체 평균단가             │
│ $10.58                    │
│ 전년 대비      ↑ +$1.24  │ ✅ 레이블 추가
└───────────────────────────┘
```

**코드 예시:**
```typescript
// 전체 평균단가 카드 (Teal 배경)
<div className="flex items-center justify-between mb-2.5">
  <span className="text-[10px] opacity-80">전년 대비</span>
  <div className="flex items-center gap-1">
    <ArrowUp className="w-3 h-3 text-red-300" />
    <span className="text-[10px] font-bold text-red-300">
      +$1.24
    </span>
  </div>
</div>

// 카테고리별 평균단가 카드 (흰색 배경)
<div className="flex items-center justify-between mb-2.5">
  <span className="text-[10px] text-gray-500">전년 대비</span>
  <div className="flex items-center gap-1">
    <ArrowDown className="w-3 h-3 text-green-600" />
    <span className="text-[10px] font-bold text-green-600">
      -$0.45
    </span>
  </div>
</div>
```

**적용 카드:**
1. **전체 평균단가** (Teal 그라데이션)
   - 레이블 색상: `opacity-80` (흰색 반투명)
2. **카테고리별 평균단가** (Shoes, Bag, Acc_etc 등)
   - 레이블 색상: `text-gray-500`

**레이아웃 구조:**
- `flex justify-between`: 좌측(레이블) - 우측(화살표+금액) 배치
- 원가율 카드와 동일한 UI 패턴으로 일관성 확보
- 글씨 크기: `text-[10px]` (10px) 통일

**목적**: 변동량의 의미를 명확히 전달하여 대시보드 가독성 및 전문성 향상

## 🎯 콜아웃 정렬 개선

USD/KRW 비교 분석 섹션의 콜아웃 정렬을 개선하여 시각적 일관성을 확보했습니다.

### 변경 사항

**아이콘 정렬:**
- 아이콘 너비 고정: `w-5 flex-shrink-0` (20px 고정 너비)
- 간격 통일: `gap-3` (12px 간격)
- 좌측 정렬 일관성 확보

**텍스트 정렬:**
- 설명 텍스트에 `ml-8` 적용 (아이콘 너비 + gap 보정)
- 모든 콜아웃의 텍스트가 동일한 좌측 라인에서 시작
- 프로그레스 바도 동일한 들여쓰기 적용

**적용 위치:**
```typescript
// USD 개선 항목
<div className="flex items-start gap-3 mb-1">
  <span className="text-base w-5 flex-shrink-0">{item.icon}</span>
  <div className="flex-1">...</div>
</div>
<div className="ml-8">
  <EditableText ... />  // 설명 텍스트
  <div className="h-0.5 bg-green-400 ..."></div>  // 프로그레스 바
</div>

// KRW 리스크 항목
<div className="flex items-start gap-3 mb-1">
  <span className="text-base w-5 flex-shrink-0">{item.icon}</span>
  <div className="flex-1">...</div>
</div>
<div className="ml-8">
  <EditableText ... />  // 설명 텍스트
  <div className="h-0.5 bg-orange-400 ..."></div>  // 프로그레스 바
</div>

// 핵심 메시지
<div className="flex items-start gap-3">
  <span className="text-base w-5 flex-shrink-0">💡/⚠️</span>
  <div className="flex-1">...</div>
</div>
```

**시각적 효과:**
```
Before:
🎨 원부자재 효율화 ▼0.2%p
원부자재 단가 8.9% → 8.7%, 대량생산...
━━━━━━━━━━━━━━━━━━━━━━━━

💼 마진율 최적화 ▼0.2%p
   벤더 마진 1.5% → 1.3%, 생산량...
   ━━━━━━━━━━━━━━━━━━━━━━━━

After:
🎨 원부자재 효율화 ▼0.2%p
   원부자재 단가 8.9% → 8.7%, 대량생산...
   ━━━━━━━━━━━━━━━━━━━━━━━━

💼 마진율 최적화 ▼0.2%p
   벤더 마진 1.5% → 1.3%, 생산량...
   ━━━━━━━━━━━━━━━━━━━━━━━━
```

**개선 효과:**
- ✅ 모든 콜아웃의 텍스트가 동일한 수직선에서 시작
- ✅ 아이콘 크기 차이로 인한 정렬 불일치 해소
- ✅ 프로페셔널한 시각적 일관성 확보
- ✅ 가독성 향상

## 🎨 편집 기능

### Alt 키 편집 모드

**USD/KRW 비교 분석 섹션에서 항목을 동적으로 관리할 수 있습니다.**

#### 평소 (보고 모드)
```
- 추가/삭제 버튼이 완전히 숨김
- 깔끔한 보고서 화면
- 우측 상단: "💡 Alt 키를 눌러 편집 모드"
```

#### Alt 키 누를 때 (편집 모드)
```
1. 항목 추가:
   - 각 섹션 하단의 "+ 항목 추가" 버튼 클릭
   - 새 항목 추가 후 ✏️ 버튼으로 내용 수정 가능

2. 항목 삭제:
   - 각 항목 우측의 🗑️ 버튼 클릭
   - 해당 항목 즉시 삭제

3. 내용 편집:
   - 제목, 변화량, 설명 모두 ✏️ 버튼으로 수정 가능
   - 이모지도 변경 가능

4. 접기/펼치기:
   - 이모지 클릭으로 설명 토글
```

#### 키보드 단축키
- **Alt**: 편집 모드 활성화/비활성화 (누르고 있는 동안만)
- **이모지 클릭**: 항목 접기/펼치기 토글

#### 적용 범위
- ✅ USD 기준 섹션 (좌측)
- ✅ KRW 기준 섹션 (우측)
- ✅ 25FW 탭 / NON 탭 모두

## 🤖 AI 기능

AI 인사이트 생성을 사용하려면:

1. OpenAI API 키 발급: https://platform.openai.com/api-keys
2. `.env.local` 파일에 `OPENAI_API_KEY` 추가
3. 개발 서버 재시작

### 사용 가능 기능

- USD/KRW 카드 AI 생성
- 워터폴 차트 AI 인사이트
- 카테고리 비교 AI 인사이트
- 경영진 종합 요약

## 🔧 문제 해결

### 히트맵 데이터가 잘못 표시되는 경우

```bash
# 1. 캐시 삭제
Remove-Item -Recurse -Force .next
Remove-Item -Recurse -Force node_modules\.cache

# 2. Node 프로세스 종료
taskkill /F /IM node.exe

# 3. 개발 서버 재시작
npm run dev

# 4. 브라우저 하드 리프레시
Ctrl + Shift + R (Windows)
```

### summary.json 재생성

CSV 파일이 업데이트될 때마다 실행:

```bash
python generate_summary.py
```

## 📝 버전 히스토리

### v1.4.0 (2025-11-11)
- **데이터 파일 업데이트**: MLB non 251111.csv + FX 251111.csv 적용
- **시즌명 변경**: 24F/25F → 전년/당년
- **동적 환율 적용** 🆕: FX 파일에서 자동으로 환율 로드
  - `loadExchangeRates()` 함수로 환율 정보 추출
  - NON 시즌: `FX 251111.csv` (전년: 1296.77, 당년: 1415.00)
  - 25FW 시즌: `FX FW.csv` (24F: 1288, 25F: 1420)
  - KeyMetricsTable에서 `summary.fx` 객체로 환율 정보 전달
  - XXX(글로벌기준) 주요 지표 비교 테이블에 자동 반영 (XXX는 각 탭 이름으로 동적 표시)
- **카테고리 동적 필터링**: CSV에 실제 존재하는 카테고리만 자동 표시
  - 카테고리 필터 드롭다운
  - 레이더 차트
  - 카테고리 색상 범례
- **히트맵 필터링**: 전년 또는 당년 수량이 0인 아이템 자동 제외
- **원가율 카드 생산수량 정보 추가** 🆕:
  - 모든 원가율 카드(USD/KRW)에 생산수량 정보 표시
  - 표시 형식: `생산수량: X.XM (YOY%)`
  - 예시: `생산수량: 7.6M (170.8%)` 또는 `생산수량: 2.0M (95.7%)`
  - M 단위: Million (백만 개), 소수점 1자리
  - 적용 대상:
    - ✅ 전체 USD 카드
    - ✅ 전체 KRW 카드
    - ✅ 카테고리별 USD 카드 (Outer, Inner, Bottom, Acc_etc 등)
    - ❌ 카테고리별 KRW 카드 (생산수량 미표시)
  - 데이터 출처: `summary.json` 및 `summary_25fw.json`의 `qty25F`, `qtyYoY` 필드
  - 목적: 생산 규모와 증감률을 한눈에 파악하여 물량 기반 의사결정 지원
- **워터폴 차트 환율 정보 동적 연동** 🆕:
  - 환율효과 (FX) 섹션에 CSV 파일의 환율 정보 자동 반영
  - 표시 형식: `전년 USD원가율 (17.4) × 환율 (1,297→1,415)`
  - 25FW 탭: FX FW.csv (24F: 1,288 / 25F: 1,420)
  - NON 탭: FX 251111.csv (전년: 1,296.77 / 당년: 1,415)
  - 적용 범위: 워터폴 차트 + MLB 주요지표 + 데이터 정보 박스
- **레이아웃 통일** 🆕:
  - 모든 주요 컴포넌트의 너비를 통일하여 일관된 UI 제공
  - 워터폴 차트: 전체 너비 사용
  - 주요지표 & 원가율 요약: 2열 그리드로 나란히 배치
  - 카테고리 비교: 전체 너비 사용
  - 히트맵: 전체 너비 사용
  - 목적: 시각적 일관성 및 가독성 향상
- **워터폴 차트 개선**:
  - 변화율 표시: 소수점 첫째자리로 통일 (0.1%p)
  - 표시 형식: 감소 `-x.x%p`, 증가 `+x.x%p` 통일 (차트 박스 및 하단 테이블 모두)
  - 색상 규칙: 감소(비용절감) = 🟢 초록색, 증가(비용상승) = 🔴 빨간색
  - 동적 색상 적용: 모든 변동 항목에 값에 따른 색상 자동 변경
  - 라벨 명확화: "원부자재변동(아트웍포함)"
  - 박스 내부 텍스트 제거로 깔끔한 UI
  - 액션/리스크/성공 포인트 멘트 데이터 기반으로 업데이트
  - **그래프 높이 비례 스케일 적용** 🆕:
    - 시즌별 동적 스케일 조정:
      - **MLB KIDS**: 1%p = 100px, 최소 높이 30px (작은 차이도 명확히 구분)
        - 시작/끝 박스(전년, 당년 USD, 당년 KRW): 180px 고정
        - 변화량 막대: 원부자재 60px(-0.6%p), 공임 40px(+0.4%p), 마진/경비 30px(-0.1%p), 환율 210px(+2.1%p)
        - 최소 높이를 30px로 낮춰 -0.1%p와 -0.6%p 차이가 시각적으로 구분됨
      - **기타 시즌**: 1%p = 100px, 최소 높이 50px
    - 목적: 시작/끝 원가율이 더 눈에 띄고, 작은 변화량도 정확히 구분되며, 전체 흐름 파악 용이
    - 모든 막대가 실제 수치에 정확히 비례하여 표시
    - 예시: 0.1%p → 10px, 0.2%p → 20px, 0.6%p → 60px
    - 시각적 정확성 및 비교 용이성 대폭 향상
- **원가율 카드 대시보드 개선**:
  - **그리드 레이아웃: 5열 그리드로 변경** 🆕:
    - 원가율 카드: `grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5`
    - 레이더 차트: `grid-cols-1 md:grid-cols-2 xl:grid-cols-5`
    - XL 화면(1280px 이상)에서 5개 카드(전체 + 4개 카테고리)가 한 줄에 표시
    - 적용 섹션: 원가율(USD), 평균단가(USD), 원가율(KRW), 카테고리별 원가 구성 비교
    - 목적: 모든 카테고리를 한눈에 비교 가능하도록 공간 효율 극대화
  - 원가율 카드: 호버 효과, 글씨 크기 최적화 (36px → 30px)
  - 평균단가 카드: 전년대비 변화량 표시 추가 (화살표 + 금액), 글씨 크기 조정 (30px → 24px)
  - **평균단가 "전년 대비" 레이블 추가** 🆕:
    - 전체 평균단가 카드: "전년 대비" 텍스트 좌측 배치 (opacity-80)
    - 카테고리별 평균단가 카드: "전년 대비" 텍스트 좌측 배치 (text-gray-500)
    - 원가율 카드와 동일한 레이아웃으로 UI 일관성 확보
    - `flex justify-between` 구조로 좌측(레이블) - 우측(화살표+금액) 배치
  - 레이더 차트: 높이 최적화 (350px → 300px), 글씨 크기 조정 (13px → 11px)
  - 전체적인 글씨 크기 축소로 정보 밀도 향상 및 가독성 개선
  - 패딩 최적화 (p-7 → p-6, p-5 → p-4)
  - 통일된 디자인 시스템 (그라데이션, 둥근 테두리, 그림자)
- **카테고리별 원가 구성 비교 테이블 개선** 🆕:
  - **"차이" 컬럼 추가**: 각 카테고리의 전년 대비 원가율 차이 표시
  - 표시 형식: `+x.x%p` (증가, 빨간색) / `-x.x%p` (감소, 초록색)
  - 적용 항목: 원가율, 원부자재, 아트웍, 공임, 마진, 경비
  - 그리드 레이아웃: 3열(구분-전년-당년) → 4열(구분-전년-당년-차이)
  - 동적 색상 적용: 값에 따른 red/green 자동 변경
  - 계산 로직: `당년 - 전년` (소수점 첫째자리)
- **멘트 전체 업데이트**:
  - 주요 지표 테이블: 핵심 성과 요약 데이터 기반 분석
  - USD/KRW 비교 분석: 실제 수치 반영한 상세 인사이트
  - YOY 열 한 줄 표시, ✅ 체크 표시 제거
- **Headwear 카테고리 추가** 🆕:
  - 전체 카테고리 목록에 Headwear (헤드웨어) 추가
  - 색상: 하늘색 `#06b6d4` (Cyan)
  - 표시 순서: Bag 다음, Acc_etc 이전 (order: 6)
  - 적용 위치: 원가율 카드, 평균단가 카드, 레이더 차트, 히트맵 필터
  - 원가율: 15.3% → 14.3% (-1.0%p 개선)
- **카테고리 카드 표시 규칙 명확화** 🆕:
  - 원가율/평균단가 카드: 발주 비중 상위 4개 카테고리만 표시 (전체 포함 총 5개 카드)
  - 레이더 차트: 발주 비중 상위 4개 카테고리만 표시 (전체 포함 총 5개)
  - 5열 그리드 레이아웃으로 모든 차트/카드가 한 줄에 표시: 전체 + Headwear + Bag + Shoes + Acc_etc
  - 히트맵 필터: 모든 실제 존재 카테고리 표시 (사용자 선택 가능)
- **대시보드 제목 업데이트**:
  - "F&F 원가 대시보드" → "F&F 원가 대시보드 (MLB NON시즌 원가)"
  - 헤더 및 푸터 양쪽 모두 적용
- **USD/KRW 비교 분석 콜아웃 정렬 개선** 🆕:
  - 아이콘 너비 고정: `w-5 flex-shrink-0` (20px)
  - 간격 통일: `gap-3` (12px)
  - 설명 텍스트 들여쓰기: `ml-8` 적용
  - 프로그레스 바 정렬: 텍스트와 동일한 들여쓰기
  - 모든 콜아웃의 텍스트가 동일한 수직선에서 시작
  - 시각적 일관성 및 가독성 향상
- **KRW 기준 분석 항목 추가** 🆕:
  - "제품 믹스 효과로 원부자재 평균단가 상승" 항목 추가
  - 고단가군(신발·가방) vs 저단가군(헤드웨어·양말) 비중 변화 분석
  - 카테고리별 단가 하락에도 전체 평균단가 상승 원인 설명
  - 제품 포트폴리오 믹스 변화가 원가에 미치는 영향 가시화
- **USD/KRW 비교 분석 토글 기능 추가** 🆕:
  - 각 항목의 이모지 클릭으로 설명 접기/펼치기 가능
  - 기본값: 모든 항목 접힌 상태로 시작
  - 호버 시 이모지 확대 효과 (hover:scale-110)
  - 툴팁으로 "펼치기"/"접기" 안내
  - 목적: 공간 효율성 향상 및 핵심 정보 우선 표시
- **Alt 키 편집 모드** 🆕:
  - **평소**: 추가/삭제 버튼 완전히 숨김 (보고서 화면에 적합)
  - **Alt 키 누름**: 항목 추가/삭제 버튼 표시
  - 우측 상단 힌트: "💡 Alt 키를 눌러 편집 모드"
  - 편집 모드 활성화 시: "✏️ 편집 모드 활성화" (파란색, 애니메이션)
  - 실시간 키 이벤트 감지로 즉시 반응
  - 목적: 보고 시 깔끔한 UI, 편집 시에만 관리 기능 제공
- **핵심 메시지 박스 크기 통일** 🆕:
  - USD/KRW 핵심 메시지 박스에 `min-h-[80px]` 최소 높이 적용
  - 좌우 박스가 항상 동일한 크기로 표시되어 시각적 균형 유지
  - 25FW/NON 탭 모두 일관된 UI 제공
- **초기 탭 변경** 🆕:
  - 대시보드 실행 시 기본 탭: NON → **25FW**
  - 최신 시즌 데이터를 기본으로 표시
- **히트맵 테이블 총원가차이(USD) 컬럼 추가** 🆕:
  - 위치: 원가율 변동 컬럼 바로 뒤
  - 계산식: 원부자재 차이 + 아트웍 차이 + 공임 차이 + 마진 차이 + 기타경비 차이
  - 표시 형식: +$X.XX 또는 -$X.XX
  - 색상: 음수(감소)는 초록색, 양수(증가)는 빨간색 배경
  - 목적: 각 아이템의 총원가 차이를 한눈에 파악

### v1.4.0 (2025-01-12) 🆕
- **MLB KIDS / DISCOVERY 브랜드 탭 추가**:
  - MLB 25FW / MLB NON / **MLB KIDS** / **DISCOVERY** 총 4개 브랜드 탭
  - 각 브랜드별 독립된 CSV 파일 및 FX 파일 연결
  - 브랜드별 독립된 summary JSON 생성 (generate_summary_kids.py, generate_summary_discovery.py)
- **카테고리 카드 표시 규칙 변경** 🔄:
  - **기존**: 발주 비중 상위 4개 카테고리 표시
  - **변경**: FW/SS 시즌 고정 카테고리 표시
    - **고정 3개**: Outer, Inner, Bottom (무조건 표시)
    - **4번째 카드**: WEAR_ETC 있으면 WEAR_ETC, 없으면 ACC_ETC
    - **순서**: [전체] [Outer] [Inner] [Bottom] [WEAR_ETC or ACC_ETC]
  - 목적: 시즌별 일관된 카테고리 비교 가능
- **카드 표시 순서**: ETC 카드가 제일 마지막에 표시되도록 보장
- **주요 지표 테이블 제목 동적화** 🆕:
  - "MLB(글로벌기준) 주요 지표 비교" → "XXX(글로벌기준) 주요 지표 비교"
  - XXX는 각 탭 이름으로 자동 변경: MLB 25FW, MLB NON, MLB KIDS, DISCOVERY
  - 목적: 각 브랜드별 명확한 구분 및 일관성 향상
- **워터폴 차트 스케일 최적화** 🆕:
  - **시작/끝 박스 (전년/당년 원가율)**: 고정 180px
    - 전년 USD/KRW 원가율 (회색)
    - 당년 USD 원가율 (파란색)
    - 당년 KRW 원가율 (주황색)
  - **변동 바 (원부자재/마진/공임/경비/환율)**:
    - 최소 높이: 40px → 0.1%p 변화도 눈에 잘 보임
    - 최대 높이: 120px → 시작/끝 박스의 2/3 크기 (절대 180px를 넘지 않음)
    - 선형 스케일: 0.1%p = 40px, 0.5%p = 72px, 1.0%p = 120px
  - **개선 효과**:
    - ✅ 시작/끝 박스가 항상 변동 바보다 큼 (180px > 최대 120px)
    - ✅ 작은 변화도 구분 가능 (0.1%, 0.2%, 0.5% 차이가 명확)
    - ✅ 큰 변화는 적당히 제한 (1.0%p 이상도 120px까지만)
- **주요 지표 하단 분석 멘트 편집 기능** ✏️🆕:
  - 모든 탭(MLB 25FW, MLB NON, MLB KIDS, DISCOVERY)에서 하단 분석 멘트 실시간 편집 가능
  - 편집 항목: 핵심 성과, 생산 규모, TAG 효과, 환율 리스크, 시사점 (총 5개)
  - 각 텍스트 항목에 마우스 오버 시 ✏️ 버튼 표시 → 클릭하여 편집 → 저장 버튼으로 저장
  - 탭별 기본 분석 내용:
    - **MLB KIDS**: 생산수량 87.9% 감소, TAG +7.3% 상승으로 USD 원가율 0.5%p 개선, 환율 +9.4% 상승으로 KRW 원가율 1.6%p 악화
    - **DISCOVERY**: 원자재 가격 상승과 환율 악재로 USD +0.5%p, KRW +0.8%p 원가율 악화
      - USD: 원부자재 단가 상승 +0.78%p, 공임비 절감 -0.06%p, 정상마진 상승 +0.09%p, 경비 절감 -0.23%p
      - KRW: 환율 효과 +0.8%p, Outer 카테고리 58% 비중 환율 영향 집중
      - 즉시액션/리스크관리/시사점 구조 (성공포인트→시사점 변경)
    - **MLB 25FW**: Inner 공정개선, 충전재 믹스 최적화로 실질 원가 효율 개선, 환율 압박으로 KRW 수익성 제한
    - **MLB NON**: 대량생산(+170.8%) + TAG 전략적 상승(+23.2%)으로 USD 원가율 -1.1%p 개선
      - 즉시액션: 대량생산 체제 유지, 고가 믹스 전략 지속, 벤더 마진율 관리 체계화, 경비율 최적화
      - 리스크: 생산단가 급등(+15.5%), 환율 변동성(+9.1%), TAG 의존 구조 취약성, 카테고리 불균형
      - 성공포인트: 스케일 메리트, TAG 전략적 상승, 벤더 협상력 강화, USD 원가율 구조적 개선
  - DISCOVERY 탭 전용 섹션 제목:
    - 📦 원부자재 단가 상승 (다른 탭: 🔼 생산 규모)
    - 🏷️ 공임비 절감 (다른 탭: 💰 TAG 효과)
    - 💱 환율 효과 (다른 탭: ⚠️ 환율 리스크)
    - 🔥 Outer 카테고리 환율 영향 집중 (다른 탭: 💡 시사점)
- **환율 표시 형식 통일** 🆕:
  - 모든 환율 표시를 소수점 둘째자리까지 통일
  - 적용 위치: 주요 지표 테이블, 워터폴 차트, 데이터 정보 박스, 하단 분석 멘트
  - 예시: 1,297 → 1297.00, 1,415 → 1415.00
- **KRW 기준 환율 효과 동적 계산** 🆕:
  - **계산 방식**: 당년 USD 원가율과 당년 KRW 원가율의 차이로 환율 효과 계산
    - 환율 효과 = `total.costRate25F_krw - total.costRate25F_usd`
    - 예시: 당년 USD 원가율 22.7% → 당년 KRW 원가율 23.6% = 환율 효과 0.9%p
  - **적용 위치**: 모든 브랜드 탭 (MLB 25FW, MLB NON, MLB KIDS, DISCOVERY)
    - `ExecutiveSummary.tsx`의 KRW 기준 섹션
    - `mainChange`: 동적으로 계산된 환율 효과 표시
    - `items[0].change`: 환율 효과 값 동적 표시
    - `items[0].description`: 당년 USD/KRW 원가율과 환율 효과 동적 표시
  - **이점**:
    - ✅ 데이터 업데이트 시 자동으로 환율 효과 재계산
    - ✅ 하드코딩된 값 제거로 유지보수 용이
    - ✅ summary JSON 기반으로 항상 정확한 값 표시
- **CSV 기반 인사이트 관리 시스템** 🆕📝:
  - **구조**: 각 탭별로 독립된 CSV 파일로 인사이트 관리
    - `public/insights_25fw.csv` - MLB 25FW 시즌 멘트
    - `public/insights_non.csv` - MLB NON 시즌 멘트
    - `public/insights_kids.csv` - MLB KIDS 시즌 멘트
    - `public/insights_discovery.csv` - DISCOVERY 시즌 멘트
  - **CSV 파일 형식** (UTF-8 BOM, Excel 호환):
    ```csv
    section,key,value
    prev_usd_cost_rate,,18.2
    prev_krw_cost_rate,,18.2
    usd_title,,USD 기준: 개선 성공
    usd_main_change,,▼ 0.8%p 개선
    usd_item_1_icon,,🎨
    usd_item_1_title,,소재단가 절감
    usd_item_1_change,,▼ 0.9%p
    usd_item_1_description,,구스/덕 충전재 80/20...
    action_1,,Inner 공정개선 모델을 Outer·Bottom으로 확대 적용
    risk_1,,Outer·팬츠류 공임 비중 상승...
    success_1,,정상마진 –0.2%p 하락...
    message,,25F 시즌은 구스→덕(80/20)...
    ```
  - **수정 가능한 항목**:
    - ✅ **전년 USD/KRW 원가율** 🆕: CSV에서 자동 로드, 00.0% 형식으로 표시
      - `prev_usd_cost_rate`: 워터폴 차트 "전년 시작 USD/KRW" 박스에 표시
      - `prev_krw_cost_rate`: 필요 시 사용 (현재는 USD와 동일)
      - 각 탭별 기본값:
        - **MLB 25FW**: 18.2%
        - **MLB NON**: 17.1%
        - **MLB KIDS**: 23.9%
        - **DISCOVERY**: 22.2%
      - 적용 위치:
        - 워터폴 차트 전년 시작 박스 (회색)
        - ExecutiveSummary USD 기준 섹션
    - ✅ USD/KRW 기준 제목 (예: "USD 기준: 개선 성공")
    - ✅ 변동폭 (예: "▼ 0.8%p 개선")
    - ✅ 각 항목 아이콘/제목/변화량/설명
    - ✅ 핵심 메시지
    - ✅ 즉시 액션 (action_1, action_2, ...)
    - ✅ 리스크 관리 (risk_1, risk_2, ...)
    - ✅ 성공 포인트/시사점 (success_1, success_2, ...)
    - ✅ 경영진 핵심 메시지 (message)
  - **작동 방식**:
    - 시즌 자동 감지 → 해당 CSV 파일 로드 → UI 자동 업데이트
    - Excel에서 CSV 파일 수정 → 저장 → 브라우저 새로고침 → 즉시 반영 🚀
  - **⚠️ 편집 기능 저장 방식 및 주의사항**:
    - **현재 상태**: 편집 기능으로 수정한 내용은 **브라우저 메모리에만 저장**됨
      - React `useState`로만 관리 (localStorage, 서버 저장 없음)
      - 페이지 새로고침 시 **편집 내용이 사라짐**
      - 새로운 배포 시 **편집 내용이 초기화됨**
    - **영구 저장 방법**:
      1. **CSV 파일 직접 수정** (권장):
         - `public/insights_*.csv` 파일을 Excel에서 열기
         - 편집한 내용을 CSV 파일에 직접 입력
         - CSV 저장 → Git 커밋 → 배포
         - ✅ 영구 저장, 버전 관리 가능
      2. **편집 기능 사용 시 주의**:
         - 편집 기능은 **임시 수정용**으로만 사용
         - 중요한 수정은 반드시 CSV 파일에 직접 저장
         - 배포 전에 CSV 파일 확인 필수
    - **향후 개선 계획**:
      - localStorage에 자동 저장 기능 추가
      - CSV 파일 자동 업데이트 기능 추가
      - 편집 내용을 서버에 저장하는 기능 추가
  - **적용 범위**:
    - USD/KRW 기준 원가율 비교 분석 (`ExecutiveSummary.tsx`)
    - 즉시 액션 / 리스크 관리 / 성공 포인트(시사점) (`WaterfallChart.tsx`)
    - 경영진 핵심 메시지 (`WaterfallChart.tsx`)
  - **CSV 생성 스크립트**:
    - `generate_all_insights.py` - 25FW, NON CSV 생성
    - `generate_kids_discovery.py` - KIDS, DISCOVERY CSV 생성
    - UTF-8 BOM 인코딩으로 Excel 한글 깨짐 방지
  - **현재 상태** ⚠️:
    - 일부 인사이트는 컴포넌트 코드에 하드코딩된 기본값 사용 중
    - CSV 파일이 없거나 로드 실패 시 하드코딩된 기본값으로 폴백
    - 향후 모든 하드코딩 제거 예정
  - **하드코딩 제거 계획** 🔧 (향후 구현 예정):
    - **현재 하드코딩된 위치**:
      1. **`components/ExecutiveSummary.tsx`** - `getInitialTexts()` 함수
         - MLB 25FW, MLB NON, MLB KIDS, DISCOVERY 각 탭별 USD/KRW 비교 분석 텍스트
         - `usd.title`, `usd.mainChange`, `usd.items[]`, `krw.title`, `krw.mainChange`, `krw.items[]` 등
      2. **`components/WaterfallChart.tsx`** - `defaultInsights` 객체
         - DISCOVERY, MLB KIDS, MLB 25FW, MLB NON 각 탭별 인사이트
         - `action[]`, `risk[]`, `success[]`, `message` 등
      3. **`components/KeyMetricsTable.tsx`** - `getDefaultInsights()` 함수
         - MLB KIDS, DISCOVERY, MLB 25FW, MLB NON 각 탭별 분석 멘트
         - `title`, `volume`, `tag`, `fx`, `conclusion` 등
    - **제거 방법**:
      1. **CSV 파일 확장**:
         - 현재 `insights_*.csv` 파일에 모든 하드코딩된 텍스트 추가
         - 각 탭별로 필요한 모든 필드 정의:
           - `usd_title`, `usd_main_change`, `usd_item_1_icon`, `usd_item_1_title`, `usd_item_1_change`, `usd_item_1_description`, ...
           - `krw_title`, `krw_main_change`, `krw_item_1_icon`, `krw_item_1_title`, `krw_item_1_change`, `krw_item_1_description`, ...
           - `action_1`, `action_2`, `action_3`, `action_4`, ...
           - `risk_1`, `risk_2`, `risk_3`, `risk_4`, ...
           - `success_1`, `success_2`, `success_3`, `success_4`, ...
           - `message`
           - `title`, `volume`, `tag`, `fx`, `conclusion` (KeyMetricsTable용)
      2. **컴포넌트 코드 수정**:
         - `getInitialTexts()` 함수 제거 또는 빈 객체 반환
         - CSV 로드 실패 시에도 하드코딩된 기본값 사용하지 않음
         - 대신 에러 메시지 표시 또는 빈 상태 유지
         - `defaultInsights` 객체 제거
         - `getDefaultInsights()` 함수 제거
         - 모든 텍스트는 `loadInsightsFromCSV()` 함수로만 로드
      3. **Python 스크립트 확장**:
         - `generate_insights_auto.py` 스크립트 생성
         - CSV/JSON 데이터 읽기 → 분석 → 모든 인사이트 텍스트 자동 생성
         - 동적 계산된 값들을 템플릿에 삽입하여 완성된 텍스트 생성
         - 예: `"생산수량 ${qty24F/10000}만개 → ${qty25F/10000}만개 (${qtyYoY}%) 감소"`
      4. **에러 처리 강화**:
         - CSV 파일이 없거나 로드 실패 시:
           - 하드코딩된 기본값 대신 "데이터 로딩 중..." 또는 "인사이트 데이터를 불러올 수 없습니다" 메시지 표시
           - 사용자에게 CSV 파일 확인 요청
    - **구현 단계**:
      ```
      Step 1: CSV 파일 구조 확장
      - insights_25fw.csv, insights_non.csv, insights_kids.csv, insights_discovery.csv
      - 모든 하드코딩된 텍스트를 CSV 필드로 추가
      
      Step 2: Python 스크립트로 기본값 생성
      - generate_insights_auto.py 작성
      - CSV/JSON 데이터 읽기 → 분석 → 텍스트 생성 → CSV 파일 업데이트
      
      Step 3: 컴포넌트 코드 수정
      - getInitialTexts() 함수 제거 또는 수정
      - defaultInsights 객체 제거
      - getDefaultInsights() 함수 제거
      - CSV 로드 실패 시 에러 처리만 추가
      
      Step 4: 테스트
      - 각 탭별로 CSV 파일 로드 확인
      - CSV 파일 삭제 시 에러 메시지 확인
      - Excel에서 CSV 수정 후 반영 확인
      ```
    - **⚠️ 주의사항: 데이터 변경 가능성**:
      - **현재 상태**: CSV 파일이 있으면 CSV 내용 표시, 없으면 하드코딩된 기본값 표시
      - **하드코딩 제거 후**: CSV 파일이 있으면 CSV 내용 표시, 없으면 에러 메시지만 표시
      - **데이터 변경 시나리오**:
        1. **CSV 파일이 이미 있고 내용이 있는 경우**:
           - ✅ CSV 내용이 표시됨 (하드코딩된 기본값과 다를 수 있음)
           - ⚠️ CSV 내용이 하드코딩된 내용과 다르면 표시되는 데이터가 바뀜
        2. **CSV 파일이 없거나 로드 실패하는 경우**:
           - ❌ 현재: 하드코딩된 기본값이 표시됨
           - ❌ 하드코딩 제거 후: 에러 메시지만 표시됨 (데이터가 안 보임)
      - **안전한 구현 방법**:
        1. **사전 확인**:
           - 모든 탭별 CSV 파일 존재 확인 (`insights_25fw.csv`, `insights_non.csv`, `insights_kids.csv`, `insights_discovery.csv`)
           - 각 CSV 파일에 모든 필수 필드가 채워져 있는지 확인
           - CSV 내용과 현재 하드코딩된 내용을 비교하여 차이점 확인
        2. **점진적 전환**:
           - 먼저 CSV 파일에 모든 하드코딩된 내용을 복사하여 추가
           - CSV 파일이 완전히 채워진 후 하드코딩 제거
           - 또는 하드코딩을 주석 처리하여 백업으로 유지
        3. **테스트 전략**:
           - 개발 환경에서 먼저 테스트
           - 각 탭별로 CSV 로드 확인
           - CSV 파일 삭제 시나리오 테스트
           - CSV 내용 수정 후 반영 확인
    - **예상 효과**:
      - ✅ 코드에서 모든 하드코딩 제거
      - ✅ CSV 파일만 수정하면 모든 인사이트 업데이트 가능
      - ✅ Python 스크립트로 자동 기본값 생성
      - ✅ Excel에서 직관적으로 텍스트 관리
      - ✅ Git으로 버전 관리 용이
      - ✅ 코드 수정 없이 콘텐츠만 관리
  - **자동 분석 및 동적 업데이트 계획** 🚀 (향후 구현 예정):
    - **목적**: CSV 파일의 숫자가 업데이트되면 자동으로 분석하여 기본 인사이트 생성
    - **대상 항목**:
      - ✅ USD 기준 vs KRW 기준 원가율 비교 분석 (`ExecutiveSummary.tsx`)
      - ✅ 즉시 액션 (`WaterfallChart.tsx` - InsightSection)
      - ✅ 리스크 관리 (`WaterfallChart.tsx` - InsightSection)
      - ✅ 시사점/성공 포인트 (`WaterfallChart.tsx` - InsightSection)
      - ✅ 경영진 핵심 메시지 (`WaterfallChart.tsx` - InsightSection)
      - ✅ 글로벌기준 주요지표 비교 하단 분석 멘트 (`KeyMetricsTable.tsx`)
    - **작동 방식**:
      1. CSV 파일(예: `MLB FW.csv`, `MLB non 251111.csv`) 및 Summary JSON 파일 읽기
      2. 데이터 분석 및 계산:
         - 생산수량, TAG, 원가, 원가율 변화율 계산
         - 카테고리별 원가 구성 변화 분석
         - 환율 효과 계산
         - 원부자재/아트웍/공임/마진/경비 변동 분석
      3. Python 스크립트로 자동 인사이트 생성:
         - `generate_insights_auto.py` - CSV/JSON 데이터 기반 자동 분석
         - 각 탭별로 `insights_*.csv` 파일 자동 업데이트
      4. 프론트엔드에서 CSV 파일 로드하여 UI에 반영
    - **사용자 수정 관리 방식** (하드코딩 없이) ✅ **이미 가능**:
      - ✅ **CSV 파일 기반 저장**: 사용자가 수정한 내용은 `insights_*.csv` 파일에 저장
        - 현재 시스템이 이미 CSV 기반으로 작동 중
        - 컴포넌트에서 `loadInsightsFromCSV()` 함수로 CSV 파일 읽기
        - 사용자가 Excel에서 CSV 수정 → 저장 → 브라우저 새로고침 → 즉시 반영
      - ✅ **Excel 편집 지원**: CSV 파일을 Excel에서 열어 직접 수정 가능
        - UTF-8 BOM 인코딩으로 한글 깨짐 없이 Excel에서 편집 가능
        - 수정 후 저장하면 바로 적용됨 (코드 수정 불필요)
      - ✅ **버전 관리**: Git으로 CSV 파일 버전 관리 (수정 이력 추적)
        - CSV 파일만 Git에 커밋하면 수정 이력 자동 추적
        - 코드 변경 없이 콘텐츠만 관리 가능
      - ✅ **자동 생성 vs 수동 수정 구분**:
        - 자동 생성: Python 스크립트 실행 시 기본값 생성
        - 수동 수정: Excel에서 CSV 파일 직접 수정 → 브라우저 새로고침 → 즉시 반영
      - ✅ **하드코딩 제거**: 모든 인사이트 텍스트는 CSV 파일에서 로드
        - 컴포넌트 코드에는 하드코딩된 텍스트 없음
        - `loadInsightsFromCSV()` 함수로 동적 로드
        - **현재**: `getDefaultInsights()`, `getInitialTexts()` 등 하드코딩된 함수 존재
        - **향후**: 모든 기본값도 CSV에서 로드하도록 변경
        - **이점**: 코드 수정 없이 Excel에서만 텍스트 관리 가능
      - ✅ **워크플로우** (현재 가능한 방식):
        ```
        [데이터 업데이트 시]
        1. 원본 CSV 파일 업데이트 (예: MLB FW.csv)
        2. Summary JSON 재생성 (python generate_summary_25fw.py)
        3. Python 스크립트 실행 → insights_25fw.csv 자동 생성 (기본값)
           - 예: python generate_all_insights.py
        4. Excel에서 insights_25fw.csv 열기
        5. 사용자가 원하는 대로 텍스트 수정 (하드코딩 없이!)
        6. CSV 저장 (UTF-8 BOM 형식 유지)
        7. Git 커밋 (선택사항, 버전 관리용)
        8. 브라우저 새로고침 → 수정된 내용 즉시 반영
        ```
      - ✅ **실제 사용 예시**:
        - 시나리오: MLB 25FW 탭의 "즉시 액션" 멘트 수정
        1. `public/insights_25fw.csv` 파일을 Excel에서 열기
        2. `action_1`, `action_2`, `action_3` 행의 `value` 컬럼 수정
        3. 저장 (UTF-8 BOM 형식으로 저장)
        4. 브라우저에서 대시보드 새로고침
        5. ✅ 수정된 내용이 즉시 반영됨 (코드 수정 불필요!)
    - **장점**:
      - 📊 데이터 변경 시 자동으로 기본 인사이트 재생성
      - ✏️ Excel에서 직관적으로 텍스트 수정 가능
      - 🔄 하드코딩 없이 유연한 콘텐츠 관리
      - 📝 Git으로 수정 이력 추적 가능
      - 🚀 코드 수정 없이 인사이트 업데이트 가능

### v1.3.0 (2025-01-07)
- **환율 적용 로직 변경**: 25F TAG USD 변환 시 24F 환율(1288) 적용
- 워터폴 차트 UI 박스 형태로 변경
- 환율효과(FX) 및 실질원가효과(Real) 설명 카드 추가

### v1.2.0 (2025-01-07)
- 원부자재 정의 수정 (아트웍 제외, 본사공급자재 포함)
- CSV 파싱 인덱스 수정
- 히트맵 데이터 연결 완료
- 카테고리 순서 통일

## 📞 문의

**담당**: F&F 경영관리팀 FP&A / Cost Analysis

## 📄 라이선스

© F&F 경영관리팀 FP&A / Cost Analysis Dashboard Framework


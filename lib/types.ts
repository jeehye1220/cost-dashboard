// TypeScript 타입 정의 파일

/**
 * CSV 원본 데이터 구조
 */
export interface RawCostData {
  brand: string;                 // 브랜드 (M, I, X, V, ST)
  season: string;                // 시즌 (24F, 25F, NON)
  style: string;                 // 스타일 코드
  category: string;              // 중분류 (Outer, Inner, Bottom, Shoes, Bag, Acc_etc)
  item_name: string;             // 아이템명
  po: string;                    // PO 번호
  tag: number;                   // TAG 가격 (KRW)
  qty: number;                   // 수량
  tag_total: number;             // TAG 총금액
  tag_usd_amount: number;        // TAG USD 금액
  estimate_no: string;           // 원가견적번호
  currency: string;              // 발주통화
  manufacturer: string;          // 제조업체
  submit_date: string;           // 견적서제출일자
  
  // USD 단가 컬럼 (인덱스 14~21)
  usd_material: number;          // 원자재
  usd_artwork: number;           // 아트웍
  usd_submaterial: number;       // 부자재
  usd_tag: number;               // 택/라벨
  usd_labor: number;             // 공임
  usd_hq_supply: number;         // 본사공급자재
  usd_margin: number;            // 정상마진
  usd_expense: number;           // 경비
  
  // KRW 단가 컬럼 (인덱스 22~29)
  krw_material: number;          // 원자재
  krw_artwork: number;           // 아트웍
  krw_submaterial: number;       // 부자재
  krw_tag: number;               // 택/라벨
  krw_labor: number;             // 공임
  krw_hq_supply: number;         // 본사공급자재
  krw_margin: number;            // 정상마진
  krw_expense: number;           // 경비
}

/**
 * 아이템별 집계 데이터 (히트맵용)
 */
export interface CostDataItem {
  category: string;              // 중분류
  item_name: string;             // 아이템명
  
  // 24F 데이터
  qty24F: number;                // 수량
  avgTag24F: number;             // 평균 TAG (USD)
  material24F: number;           // 원부자재 평균단가 (USD)
  artwork24F: number;            // 아트웍 평균단가
  labor24F: number;              // 공임 평균단가
  margin24F: number;             // 마진 평균단가
  expense24F: number;            // 경비 평균단가
  avgCost24F: number;            // 평균 원가
  costRate24F: number;           // 원가율 (%)
  
  // 25F 데이터
  qty25F: number;
  avgTag25F: number;
  material25F: number;
  artwork25F: number;
  labor25F: number;
  margin25F: number;
  expense25F: number;
  avgCost25F: number;
  costRate25F: number;
  
  // 변동
  qtyChange: number;             // 수량 변동
  tagYoY: number;                // TAG YOY (%)
  costYoY: number;               // 원가 YOY (%)
  costRateChange: number;        // 원가율 변동 (%p)
}

/**
 * 카테고리별 통계 데이터
 */
export interface CategoryStats {
  category: string;
  
  // USD 기준
  costRate24F_usd: number;
  costRate25F_usd: number;
  costRateChange_usd: number;
  
  avgTag24F_usd: number;
  avgTag25F_usd: number;
  tagYoY_usd: number;
  
  avgCost24F_usd: number;
  avgCost25F_usd: number;
  costYoY_usd: number;
  
  // 세부 원가 항목 (USD)
  material24F_usd: number;
  material25F_usd: number;
  artwork24F_usd: number;
  artwork25F_usd: number;
  labor24F_usd: number;
  labor25F_usd: number;
  margin24F_usd: number;
  margin25F_usd: number;
  expense24F_usd: number;
  expense25F_usd: number;
  
  // 원가율 세부 (USD)
  materialRate24F_usd: number;
  materialRate25F_usd: number;
  artworkRate24F_usd: number;
  artworkRate25F_usd: number;
  laborRate24F_usd: number;
  laborRate25F_usd: number;
  marginRate24F_usd: number;
  marginRate25F_usd: number;
  expenseRate24F_usd: number;
  expenseRate25F_usd: number;
  
  // KRW 기준
  costRate24F_krw: number;
  costRate25F_krw: number;
  costRateChange_krw: number;
  
  avgTag24F_krw: number;
  avgTag25F_krw: number;
  tagYoY_krw: number;
  
  avgCost24F_krw: number;
  avgCost25F_krw: number;
  costYoY_krw: number;
}

/**
 * 전체 통계 데이터
 */
export interface TotalStats {
  // USD 기준
  costRate24F_usd: number;
  costRate25F_usd: number;
  costRateChange_usd: number;
  
  avgTag24F_usd: number;
  avgTag25F_usd: number;
  tagYoY_usd: number;
  
  avgCost24F_usd: number;
  avgCost25F_usd: number;
  costYoY_usd: number;
  
  // 세부 원가 항목 (USD)
  material24F_usd: number;
  material25F_usd: number;
  artwork24F_usd: number;
  artwork25F_usd: number;
  labor24F_usd: number;
  labor25F_usd: number;
  margin24F_usd: number;
  margin25F_usd: number;
  expense24F_usd: number;
  expense25F_usd: number;
  
  // 원가율 세부 (USD)
  materialRate24F_usd: number;
  materialRate25F_usd: number;
  artworkRate24F_usd: number;
  artworkRate25F_usd: number;
  laborRate24F_usd: number;
  laborRate25F_usd: number;
  marginRate24F_usd: number;
  marginRate25F_usd: number;
  expenseRate24F_usd: number;
  expenseRate25F_usd: number;
  
  // KRW 기준
  costRate24F_krw: number;
  costRate25F_krw: number;
  costRateChange_krw: number;
  
  avgTag24F_krw: number;
  avgTag25F_krw: number;
  tagYoY_krw: number;
  
  avgCost24F_krw: number;
  avgCost25F_krw: number;
  costYoY_krw: number;
}

/**
 * Summary JSON 데이터 구조
 */
export interface SummaryData {
  total: TotalStats;
  categories: CategoryStats[];
}

/**
 * 카테고리 정보
 */
export interface CategoryInfo {
  id: string;
  name: string;
  color: string;
  order: number;
}

/**
 * AI 코멘트 요청
 */
export interface AICommentRequest {
  section: string;
  data: any;
}

/**
 * AI 코멘트 응답
 */
export interface AICommentResponse {
  comment: string;
}






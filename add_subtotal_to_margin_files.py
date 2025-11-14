import pandas as pd
import numpy as np

# 1. margin_rate_analysis.csv 파일 처리
print("=" * 100)
print("1. margin_rate_analysis.csv 파일에 중분류별 소계 추가")
print("=" * 100)

df1 = pd.read_csv('margin_rate_analysis.csv', encoding='utf-8-sig')

# 유효한 데이터만 필터링 (양쪽 시즌 모두 값이 있는 경우)
df1_valid = df1[(df1['24F_정상마진율(%)'] > 0) & (df1['25F_정상마진율(%)'] > 0)].copy()

# 중분류별 소계 계산
subtotals = []
for category in sorted(df1['중분류'].unique()):
    cat_data = df1_valid[df1_valid['중분류'] == category]
    
    if len(cat_data) > 0:
        subtotal_row = {
            '중분류': category,
            '아이템명': '[소계]',
            '24F_정상마진율(%)': cat_data['24F_정상마진율(%)'].mean(),
            '25F_정상마진율(%)': cat_data['25F_정상마진율(%)'].mean(),
            '정상마진율_차이(%p)': cat_data['25F_정상마진율(%)'].mean() - cat_data['24F_정상마진율(%)'].mean()
        }
        subtotals.append(subtotal_row)

# 원본 데이터와 소계 결합
df1_with_subtotal = pd.concat([df1, pd.DataFrame(subtotals)], ignore_index=True)

# 정렬: 중분류별로 정렬하고, 각 중분류 내에서 소계는 마지막에 위치
df1_with_subtotal['sort_key'] = df1_with_subtotal.apply(
    lambda row: (row['중분류'], 1 if row['아이템명'] == '[소계]' else 0, row['아이템명']),
    axis=1
)
df1_with_subtotal = df1_with_subtotal.sort_values('sort_key').drop('sort_key', axis=1)

# 저장
df1_with_subtotal.to_csv('margin_rate_analysis.csv', index=False, encoding='utf-8-sig')
print(f"[완료] margin_rate_analysis.csv 업데이트 완료")
print(f"  - 총 {len(df1)}개 아이템 + {len(subtotals)}개 소계 = {len(df1_with_subtotal)}개 행")

# 2. margin_rate_pivot_by_vendor.csv 파일 처리
print("\n" + "=" * 100)
print("2. margin_rate_pivot_by_vendor.csv 파일에 중분류별 소계 추가")
print("=" * 100)

df2 = pd.read_csv('margin_rate_pivot_by_vendor.csv', encoding='utf-8-sig')

# 유효한 데이터만 필터링
df2_valid = df2[(df2['24F_정상마진율(%)'] > 0) & (df2['25F_정상마진율(%)'] > 0)].copy()

# 중분류별 소계 계산
subtotals2 = []
for category in sorted(df2['중분류'].unique()):
    cat_data = df2_valid[df2_valid['중분류'] == category]
    
    if len(cat_data) > 0:
        subtotal_row = {
            '중분류': category,
            '아이템명': '[소계]',
            '제조업체': '',
            '24F_정상마진율(%)': cat_data['24F_정상마진율(%)'].mean(),
            '25F_정상마진율(%)': cat_data['25F_정상마진율(%)'].mean(),
            '정상마진율_차이(%p)': cat_data['25F_정상마진율(%)'].mean() - cat_data['24F_정상마진율(%)'].mean()
        }
        subtotals2.append(subtotal_row)

# 원본 데이터와 소계 결합
df2_with_subtotal = pd.concat([df2, pd.DataFrame(subtotals2)], ignore_index=True)

# 정렬: 중분류별로 정렬하고, 각 중분류 내에서 소계는 마지막에 위치
df2_with_subtotal['sort_key'] = df2_with_subtotal.apply(
    lambda row: (row['중분류'], 1 if row['아이템명'] == '[소계]' else 0, row['아이템명'], row['제조업체']),
    axis=1
)
df2_with_subtotal = df2_with_subtotal.sort_values('sort_key').drop('sort_key', axis=1)

# 저장
df2_with_subtotal.to_csv('margin_rate_pivot_by_vendor.csv', index=False, encoding='utf-8-sig')
print(f"[완료] margin_rate_pivot_by_vendor.csv 업데이트 완료")
print(f"  - 총 {len(df2)}개 조합 + {len(subtotals2)}개 소계 = {len(df2_with_subtotal)}개 행")

# 소계 요약 출력
print("\n" + "=" * 100)
print("중분류별 소계 요약")
print("=" * 100)
print(f"{'중분류':<15} {'24F 평균':>12} {'25F 평균':>12} {'차이':>12} {'아이템수':>10}")
print("-" * 100)

for st in subtotals:
    cat_data = df1_valid[df1_valid['중분류'] == st['중분류']]
    print(f"{st['중분류']:<15} {st['24F_정상마진율(%)']:>11.2f}% {st['25F_정상마진율(%)']:>11.2f}% {st['정상마진율_차이(%p)']:>+11.2f}%p {len(cat_data):>10}개")

print("\n" + "=" * 100)
print("완료! 두 파일 모두 업데이트되었습니다.")
print("=" * 100)


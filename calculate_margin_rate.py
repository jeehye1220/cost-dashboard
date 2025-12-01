import pandas as pd
import numpy as np

# CSV 파일 읽기
df = pd.read_csv('public/MLB FW.csv', encoding='utf-8-sig')

# 필요한 컬럼 확인
print("컬럼 목록:")
print(df.columns.tolist())
print("\n")

# 데이터 정리
df['시즌'] = df['시즌'].astype(str).str.strip()
df['중분류'] = df['중분류'].astype(str).str.strip()
df['아이템명'] = df['아이템명'].astype(str).str.strip()

# USD 단가 컬럼 정리 (숫자로 변환, 에러는 NaN)
usd_cols = ['(USD)_원자재', '(USD)_아트웍', '(USD)_부자재', '(USD) 공임', '(USD)_정상마진']
for col in usd_cols:
    df[col] = pd.to_numeric(df[col], errors='coerce').fillna(0)

# 원자재 + 부자재 + 공임 + 아트웍 합계 계산
df['원가합계'] = df['(USD)_원자재'] + df['(USD)_부자재'] + df['(USD) 공임'] + df['(USD)_아트웍']

# 정상마진율 계산 (정상마진 / 원가합계)
df['정상마진율'] = np.where(
    df['원가합계'] > 0,
    (df['(USD)_정상마진'] / df['원가합계']) * 100,
    np.nan
)

# 24F와 25F 데이터 분리
df_24f = df[df['시즌'] == '24F'].copy()
df_25f = df[df['시즌'] == '25F'].copy()

# 아이템-중분류별로 그룹화하여 평균 정상마진율 계산
def calculate_margin_by_group(df_season, season_name):
    grouped = df_season.groupby(['중분류', '아이템명']).agg({
        '정상마진율': 'mean',
        '원가합계': 'mean',
        '(USD)_정상마진': 'mean'
    }).reset_index()
    grouped.columns = ['중분류', '아이템명', f'{season_name}_정상마진율', f'{season_name}_원가합계', f'{season_name}_정상마진']
    return grouped

margin_24f = calculate_margin_by_group(df_24f, '24F')
margin_25f = calculate_margin_by_group(df_25f, '25F')

# 두 시즌 데이터 병합
result = pd.merge(
    margin_24f,
    margin_25f,
    on=['중분류', '아이템명'],
    how='outer'
)

# 차이 계산
result['정상마진율_차이'] = result['25F_정상마진율'] - result['24F_정상마진율']
result['정상마진율_차이_pct'] = result['정상마진율_차이']

# 결과 정리 (NaN 처리)
result = result.fillna(0)

# 정렬 (중분류, 아이템명 순)
result = result.sort_values(['중분류', '아이템명'])

# 결과 출력
print("=" * 100)
print("아이템-중분류별 정상마진율 분석 (24F vs 25F)")
print("=" * 100)
print(f"\n총 {len(result)}개 아이템-중분류 조합\n")

# 중분류별로 그룹화하여 출력
for category in sorted(result['중분류'].unique()):
    cat_data = result[result['중분류'] == category]
    print(f"\n[{category}] ({len(cat_data)}개 아이템)")
    print("-" * 100)
    print(f"{'아이템명':<30} {'24F 정상마진율':>15} {'25F 정상마진율':>15} {'차이':>15}")
    print("-" * 100)
    
    for _, row in cat_data.iterrows():
        item_name = row['아이템명'][:28] if len(row['아이템명']) > 28 else row['아이템명']
        margin_24 = row['24F_정상마진율'] if pd.notna(row['24F_정상마진율']) else 0
        margin_25 = row['25F_정상마진율'] if pd.notna(row['25F_정상마진율']) else 0
        diff = row['정상마진율_차이'] if pd.notna(row['정상마진율_차이']) else 0
        
        print(f"{item_name:<30} {margin_24:>14.2f}% {margin_25:>14.2f}% {diff:>+14.2f}%p")
    
    # 중분류별 평균
    avg_24 = cat_data['24F_정상마진율'].mean()
    avg_25 = cat_data['25F_정상마진율'].mean()
    avg_diff = avg_25 - avg_24
    print("-" * 100)
    print(f"{'[중분류 평균]':<30} {avg_24:>14.2f}% {avg_25:>14.2f}% {avg_diff:>+14.2f}%p")

# 전체 요약
print("\n" + "=" * 100)
print("전체 요약")
print("=" * 100)
print(f"24F 평균 정상마진율: {result['24F_정상마진율'].mean():.2f}%")
print(f"25F 평균 정상마진율: {result['25F_정상마진율'].mean():.2f}%")
print(f"전체 평균 차이: {result['정상마진율_차이'].mean():+.2f}%p")

# CSV로 저장
result_output = result[['중분류', '아이템명', '24F_정상마진율', '25F_정상마진율', '정상마진율_차이']].copy()
result_output.columns = ['중분류', '아이템명', '24F_정상마진율(%)', '25F_정상마진율(%)', '정상마진율_차이(%p)']
result_output.to_csv('margin_rate_analysis.csv', index=False, encoding='utf-8-sig')
print(f"\n결과가 'margin_rate_analysis.csv' 파일로 저장되었습니다.")





















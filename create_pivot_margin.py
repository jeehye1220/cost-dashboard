import pandas as pd
import numpy as np

# CSV 파일 읽기
df = pd.read_csv('public/MLB FW.csv', encoding='utf-8-sig')

# 필요한 컬럼 정리
df['시즌'] = df['시즌'].astype(str).str.strip()
df['중분류'] = df['중분류'].astype(str).str.strip()
df['아이템명'] = df['아이템명'].astype(str).str.strip()
df['제조업체'] = df['제조업체'].astype(str).str.strip()

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

# 중분류, 아이템명, 제조업체별로 그룹화하여 평균 정상마진율 계산
def calculate_margin_by_vendor(df_season, season_name):
    grouped = df_season.groupby(['중분류', '아이템명', '제조업체']).agg({
        '정상마진율': 'mean',
        '원가합계': 'mean',
        '(USD)_정상마진': 'mean'
    }).reset_index()
    grouped.columns = ['중분류', '아이템명', '제조업체', f'{season_name}_정상마진율', f'{season_name}_원가합계', f'{season_name}_정상마진']
    return grouped

margin_24f = calculate_margin_by_vendor(df_24f, '24F')
margin_25f = calculate_margin_by_vendor(df_25f, '25F')

# 두 시즌 데이터 병합
result = pd.merge(
    margin_24f,
    margin_25f,
    on=['중분류', '아이템명', '제조업체'],
    how='outer'
)

# 차이 계산
result['정상마진율_차이'] = result['25F_정상마진율'] - result['24F_정상마진율']
result = result.fillna(0)

# 정렬 (중분류, 아이템명, 제조업체 순)
result = result.sort_values(['중분류', '아이템명', '제조업체'])

# 피벗 형태로 저장할 데이터 준비
pivot_data = result[[
    '중분류', 
    '아이템명', 
    '제조업체', 
    '24F_정상마진율', 
    '25F_정상마진율', 
    '정상마진율_차이'
]].copy()

pivot_data.columns = ['중분류', '아이템명', '제조업체', '24F_정상마진율(%)', '25F_정상마진율(%)', '정상마진율_차이(%p)']

# CSV로 저장
pivot_data.to_csv('margin_rate_pivot_by_vendor.csv', index=False, encoding='utf-8-sig')

print("=" * 120)
print("중분류-아이템-업체별 정상마진율 피벗 테이블 생성 완료")
print("=" * 120)
print(f"\n총 {len(pivot_data)}개 조합 (중분류-아이템-업체)")
print(f"\n파일 저장 위치: margin_rate_pivot_by_vendor.csv")
print("\n컬럼 구성:")
print("  - 중분류")
print("  - 아이템명")
print("  - 제조업체")
print("  - 24F_정상마진율(%)")
print("  - 25F_정상마진율(%)")
print("  - 정상마진율_차이(%p)")

# 중분류별 요약 출력
print("\n" + "=" * 120)
print("중분류별 요약")
print("=" * 120)

for category in sorted(pivot_data['중분류'].unique()):
    cat_data = pivot_data[pivot_data['중분류'] == category]
    valid_data = cat_data[
        (cat_data['24F_정상마진율(%)'] > 0) & (cat_data['25F_정상마진율(%)'] > 0)
    ]
    
    if len(valid_data) > 0:
        print(f"\n[{category}] - {len(valid_data)}개 조합")
        print(f"  평균 24F 정상마진율: {valid_data['24F_정상마진율(%)'].mean():.2f}%")
        print(f"  평균 25F 정상마진율: {valid_data['25F_정상마진율(%)'].mean():.2f}%")
        print(f"  평균 차이: {(valid_data['25F_정상마진율(%)'].mean() - valid_data['24F_정상마진율(%)'].mean()):+.2f}%p")

print("\n" + "=" * 120)
print("파일이 성공적으로 생성되었습니다!")
print("=" * 120)





















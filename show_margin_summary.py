import pandas as pd

# CSV 파일 읽기
df = pd.read_csv('margin_rate_analysis.csv', encoding='utf-8-sig')

print("=" * 100)
print("MLB FW - 아이템별 정상마진율 분석 (24F vs 25F)")
print("=" * 100)
print("\n정상마진율 = 정상마진 / (원자재 + 부자재 + 공임 + 아트웍) × 100\n")

# 중분류별로 그룹화
for category in sorted(df['중분류'].unique()):
    cat_data = df[df['중분류'] == category].copy()
    
    # 0.0%인 경우는 해당 시즌에 데이터가 없는 것으로 간주하고 제외
    cat_data_valid = cat_data[
        (cat_data['24F_정상마진율(%)'] > 0) & (cat_data['25F_정상마진율(%)'] > 0)
    ].copy()
    
    print(f"\n[{category}]")
    print("-" * 100)
    
    if len(cat_data_valid) > 0:
        # 유효한 데이터만 표시
        for _, row in cat_data_valid.iterrows():
            item = row['아이템명']
            margin_24 = row['24F_정상마진율(%)']
            margin_25 = row['25F_정상마진율(%)']
            diff = row['정상마진율_차이(%p)']
            
            diff_str = f"{diff:+.2f}%p" if abs(diff) >= 0.01 else "변화없음"
            print(f"  {item:<25} | 24F: {margin_24:>6.2f}% | 25F: {margin_25:>6.2f}% | 차이: {diff_str}")
        
        # 중분류별 평균
        avg_24 = cat_data_valid['24F_정상마진율(%)'].mean()
        avg_25 = cat_data_valid['25F_정상마진율(%)'].mean()
        avg_diff = avg_25 - avg_24
        print("-" * 100)
        print(f"  [평균] {'':<20} | 24F: {avg_24:>6.2f}% | 25F: {avg_25:>6.2f}% | 차이: {avg_diff:+.2f}%p")
    else:
        print("  (24F와 25F 모두에 데이터가 있는 아이템이 없습니다)")

# 전체 요약
print("\n" + "=" * 100)
print("전체 요약")
print("=" * 100)

# 양쪽 시즌 모두에 데이터가 있는 아이템만 필터링
valid_data = df[(df['24F_정상마진율(%)'] > 0) & (df['25F_정상마진율(%)'] > 0)]

if len(valid_data) > 0:
    overall_24 = valid_data['24F_정상마진율(%)'].mean()
    overall_25 = valid_data['25F_정상마진율(%)'].mean()
    overall_diff = overall_25 - overall_24
    
    print(f"전체 평균 정상마진율 (24F): {overall_24:.2f}%")
    print(f"전체 평균 정상마진율 (25F): {overall_25:.2f}%")
    print(f"전체 평균 차이: {overall_diff:+.2f}%p")
    print(f"\n분석 대상 아이템 수: {len(valid_data)}개")

# 중분류별 요약 테이블
print("\n" + "=" * 100)
print("중분류별 요약")
print("=" * 100)
print(f"{'중분류':<15} {'24F 평균':>12} {'25F 평균':>12} {'차이':>12} {'아이템수':>10}")
print("-" * 100)

for category in sorted(df['중분류'].unique()):
    cat_data = df[df['중분류'] == category].copy()
    cat_valid = cat_data[(cat_data['24F_정상마진율(%)'] > 0) & (cat_data['25F_정상마진율(%)'] > 0)]
    
    if len(cat_valid) > 0:
        avg_24 = cat_valid['24F_정상마진율(%)'].mean()
        avg_25 = cat_valid['25F_정상마진율(%)'].mean()
        diff = avg_25 - avg_24
        count = len(cat_valid)
        print(f"{category:<15} {avg_24:>11.2f}% {avg_25:>11.2f}% {diff:>+11.2f}%p {count:>10}개")

print("\n" + "=" * 100)



















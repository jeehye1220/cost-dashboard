import pandas as pd

df = pd.read_csv('public/COST RAW/25FW/M_25F_NON.csv', encoding='utf-8-sig')
excluded = ['3ASHC104NE0001', '3ASHC104NM0001', '3ASHC104NS0001', '3ASXCA12NK0031']

print('제외할 PO:', excluded)
if 'PO' in df.columns:
    excluded_df = df[df['PO'].isin(excluded)]
    print('제외된 PO 행 수:', len(excluded_df))
    if len(excluded_df) > 0:
        print('제외된 PO 목록:', excluded_df['PO'].unique().tolist())
        if 'USD_재료계(원/부/택/본공)_총금액(단가×수량)' in excluded_df.columns:
            usd_total = excluded_df['USD_재료계(원/부/택/본공)_총금액(단가×수량)'].sum()
            print('제외된 PO의 USD 총액:', usd_total)
            
            # 기간별로 확인
            if '시즌' in excluded_df.columns:
                for period in ['전년', '당년']:
                    period_df = excluded_df[excluded_df['시즌'].str.startswith(period, na=False)]
                    if len(period_df) > 0:
                        period_usd = period_df['USD_재료계(원/부/택/본공)_총금액(단가×수량)'].sum()
                        print(f'{period} 기간 제외된 PO USD 총액: {period_usd:,.2f}')



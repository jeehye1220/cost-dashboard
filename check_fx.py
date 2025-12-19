# -*- coding: utf-8 -*-
import pandas as pd

df = pd.read_csv('public/COST RAW/FX.csv', encoding='utf-8-sig')

print("I 브랜드 환율 (24F, 25F):")
print(df[(df['브랜드'] == 'I') & (df['시즌'].isin(['24F', '25F']))].to_string())


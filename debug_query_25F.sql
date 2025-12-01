
with 
-- A) 전년/당년 기간 필터 + 기간 라벨링
stor_filtered as (
    select 
        po_no,
        stor_dt,
        qty,
        case 
            when stor_dt between date '2024-06-01' and date '2024-11-30' then '전년'
            when stor_dt between date '2025-06-01' and date '2025-11-28' then '당년'
        end as period_label
    from prcs.dw_stor
    where (stor_dt between date '2024-06-01' and date '2024-11-30')
       or (stor_dt between date '2025-06-01' and date '2025-11-28')
),
-- B) 기간 내 PO만 (중복 방지용)
stor_po as (
    select distinct po_no, period_label
    from stor_filtered
),
-- C) 기간별 PO 집계: 입고수량 합계 + 최초/최종 입고일
stor_sum as (
    select 
        po_no,
        period_label,
        sum(qty) as stor_qty_sum,
        min(stor_dt) as first_stor_dt,
        max(stor_dt) as last_stor_dt
    from stor_filtered
    group by po_no, period_label
),
main as (
    select 
        a.brd_cd,
        a.sesn,
        a.part_cd,
        a.po_no,
        a.cost_quotation_no,
        a.quotation_apv_stat_nm,
        a.tag_amt,
        a.quotation_submit_dt,
        b.type1,
        b.type1_nm,
        b.type2,
        b.type2_nm,
        b.type3,
        a.mfac_compy_nm,
        b.unit,
        b.width,
        b.currency,
        b.mfac_offer_cons,
        b.mfac_offer_cost,
        b.mfac_offer_cost_amt,
        b.mfac_offer_cost_amt_curr,
        b.mfac_nego_cost,
        b.mfac_nego_cost_amt,
        b.mfac_nego_cost_amt_curr,
        p.item_nm as item_nm,
        s.vtext2 as vtext2,
        o1.tag_price as tag_price,
        o2.po_qty_sum as po_qty_sum,
        sp.period_label as period_label,
        ss.stor_qty_sum as stor_qty_sum,
        ss.first_stor_dt as first_stor_dt,
        ss.last_stor_dt as last_stor_dt
    from prcs.db_cost_mst a
    join prcs.db_cost_dtl b on a.po_no = b.po_no 
        and a.quotation_seq = b.quotation_seq 
        and a.quotation_apv_stat_nm = '확정'
    inner join stor_po sp on sp.po_no = a.po_no
    left join stor_sum ss on ss.po_no = a.po_no and ss.period_label = sp.period_label
    left join prcs.db_prdt p on p.prdt_cd = a.brd_cd || a.sesn || a.part_cd
    left join sap_fnf.mst_prdt s on s.prdt_cd = p.prdt_cd
    left join (
        select prdt_cd, min(tag_price) as tag_price
        from prcs.dw_ord
        where tag_price is not null
        group by prdt_cd
    ) o1 on o1.prdt_cd = p.prdt_cd
    left join (
        select po_no, sum(ord_qty) as po_qty_sum
        from prcs.dw_ord
        group by po_no
    ) o2 on o2.po_no = a.po_no
    where a.sesn like '%N%'
      and a.brd_cd in ('M', 'I', 'X')
      and b.currency in ('USD', 'KRW')
)
select 
    period_label as "기간",
    brd_cd as "브랜드",
    sesn as "시즌",
    part_cd as "스타일",
    vtext2 as "중분류",
    item_nm as "아이템명",
    po_no as "PO",
    tag_price as "TAG",
    po_qty_sum as "발주수량",
    stor_qty_sum as "입고수량",
    first_stor_dt as "최초입고일",
    last_stor_dt as "최종입고일",
    cost_quotation_no as "원가견적번호",
    currency as "발주통화",
    mfac_compy_nm as "제조업체",
    quotation_submit_dt as "견적서제출일자",
    -- USD 금액 (기존)
    sum(case when type1 = 100 then mfac_offer_cost_amt_curr else 0 end) as "본사협의단가_금액(USD)_원자재",
    sum(case when type1 = 200 then mfac_offer_cost_amt_curr else 0 end) as "본사협의단가_금액(USD)_아트웍",
    sum(case when type1 = 300 then mfac_offer_cost_amt_curr else 0 end) as "본사협의단가_금액(USD)_부자재",
    sum(case when type1 = 350 then mfac_offer_cost_amt_curr else 0 end) as "본사협의단가_금액(USD)_택/라벨",
    sum(case when type1 = 400 then mfac_offer_cost_amt_curr else 0 end) as "본사협의단가_금액(USD)_공임",
    sum(case when type1 = 700 then mfac_nego_cost_amt else 0 end)/1280 as "(USD)본사공급자재",
    sum(case when type1 = 500 and type2 = 'AAA' then mfac_offer_cost_amt_curr else 0 end) as "본사협의단가_금액(USD)_정상마진",
    sum(case when type1 = 500 and type2 <> 'AAA' then mfac_offer_cost_amt_curr else 0 end) as "본사협의단가_금액(USD)_기타마진/경비",
    -- KRW 금액(기존)
    sum(case when type1 = 100 then mfac_nego_cost_amt else 0 end) as "본사협의단가_T_금액(KRW)_원자재",
    sum(case when type1 = 200 then mfac_nego_cost_amt else 0 end) as "본사협의단가_T_금액(KRW)_아트웍",
    sum(case when type1 = 300 then mfac_nego_cost_amt else 0 end) as "본사협의단가_T_금액(KRW)_부자재",
    sum(case when type1 = 350 then mfac_nego_cost_amt else 0 end) as "본사협의단가_T_금액(KRW)_택/라벨",
    sum(case when type1 = 400 then mfac_nego_cost_amt else 0 end) as "본사협의단가_T_금액(KRW)_공임",
    sum(case when type1 = 700 then mfac_nego_cost_amt else 0 end) as "본사협의단가_T_금액(KRW)_본사공급자재",
    sum(case when type1 = 500 and type2 = 'AAA' then mfac_nego_cost_amt else 0 end) as "본사협의단가_T_금액(KRW)_정상마진",
    sum(case when type1 = 500 and type2 <> 'AAA' then mfac_nego_cost_amt else 0 end) as "본사협의단가_T_금액(KRW)_기타마진/경비",
    -- USD 총금액
    coalesce(po_qty_sum,0) * coalesce(sum(case when type1 in (100,300,350,700) then mfac_offer_cost_amt_curr else 0 end),0) as "USD_재료계(원/부/택/본공)_총금액(단가×수량)",
    coalesce(po_qty_sum,0) * coalesce(sum(case when type1 = 200 then mfac_offer_cost_amt_curr else 0 end),0) as "USD_아트웍_총금액(단가×수량)",
    coalesce(po_qty_sum,0) * coalesce(sum(case when type1 = 400 then mfac_offer_cost_amt_curr else 0 end),0) as "USD_공임_총금액(단가×수량)",
    coalesce(po_qty_sum,0) * coalesce(sum(case when type1 = 500 and type2 = 'AAA' then mfac_offer_cost_amt_curr else 0 end),0) as "USD_정상마진_총금액(단가×수량)",
    coalesce(po_qty_sum,0) * coalesce(sum(case when type1 = 500 and (type2 <> 'AAA' or type2 is null) then mfac_offer_cost_amt_curr else 0 end),0) as "USD_경비_총금액(단가×수량)",
    -- KRW 총금액
    coalesce(po_qty_sum,0) * coalesce(sum(case when type1 in (100,300,350,700) then mfac_nego_cost_amt else 0 end),0) as "KRW_재료계(원/부/택/본공)_총금액(단가×수량)",
    coalesce(po_qty_sum,0) * coalesce(sum(case when type1 = 200 then mfac_nego_cost_amt else 0 end),0) as "KRW_아트웍_총금액(단가×수량)",
    coalesce(po_qty_sum,0) * coalesce(sum(case when type1 = 400 then mfac_nego_cost_amt else 0 end),0) as "KRW_공임_총금액(단가×수량)",
    coalesce(po_qty_sum,0) * coalesce(sum(case when type1 = 500 and type2 = 'AAA' then mfac_nego_cost_amt else 0 end),0) as "KRW_정상마진_총금액(단가×수량)",
    coalesce(po_qty_sum,0) * coalesce(sum(case when type1 = 500 and (type2 <> 'AAA' or type2 is null) then mfac_nego_cost_amt else 0 end),0) as "KRW_경비_총금액(단가×수량)"
from main
group by 
    period_label, brd_cd, sesn, part_cd, vtext2, item_nm, po_no, tag_price, 
    po_qty_sum, stor_qty_sum, first_stor_dt, last_stor_dt, 
    cost_quotation_no, currency, mfac_compy_nm, quotation_submit_dt
order by period_label desc, brd_cd, sesn desc, part_cd, po_no

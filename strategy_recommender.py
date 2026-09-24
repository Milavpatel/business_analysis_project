"""
Multi-factor strategy recommendation engine.
Uses a score-based approach: every strategy computes a fitness score from the
input metrics. The highest-scoring strategy is returned, ensuring the output
always reflects the most pressing business reality.
"""


def _safe_float(val, default: float = 0.0) -> float:
    try:
        if val is None:
            return default
        return float(val)
    except (ValueError, TypeError):
        return default


def recommend_strategy_multi_factor(row: dict) -> tuple:
    # ── Extract & derive metrics ──────────────────────────────────────────────
    rg   = _safe_float(row.get('revenue_growth'),     0.0)   # revenue growth rate
    cg   = _safe_float(row.get('customer_growth'),    0.0)   # customer growth rate
    pm   = _safe_float(row.get('profit_margin'),      0.0)   # profit margin
    cr   = _safe_float(row.get('churn_rate'),         0.0)   # monthly churn rate
    ms   = _safe_float(row.get('marketing_spend'),    0.0)   # marketing spend $
    cvr  = _safe_float(row.get('conversion_rate'),    0.0)   # lead → customer conversion
    aov  = _safe_float(row.get('aov'),                0.0)   # average order value $
    cac  = _safe_float(row.get('cac'),                0.0)   # customer acquisition cost $
    clv  = _safe_float(row.get('clv'),                0.0)   # customer lifetime value $
    mgr  = _safe_float(row.get('market_growth_rate'), 0.0)   # market growth rate
    comp = _safe_float(row.get('competitor_growth'),  0.0)   # competitor growth rate

    # Derived ratios
    clv_cac   = (clv / cac)  if cac  > 0  else 10.0
    net_growth = rg - cr                          # net retention-adjusted growth
    mkt_lag    = mgr - rg                         # positive = losing market share
    comp_delta = comp - rg                        # positive = competitors outpacing you
    paid_eff   = rg / (ms / 50_000) if ms > 0 else 1.0   # revenue growth per $50k spend

    # Clamp helper to avoid division quirks
    def _pct(v): return f"{v*100:.1f}%"
    def _usd(v): return f"${v:,.0f}"

    # ── Strategy definitions ──────────────────────────────────────────────────
    # Each entry: (score_function → float, name, explanation_template)
    # Scores are additive; highest wins. Negative scores are clipped to 0
    # so a strategy never wins just by having the fewest bad conditions.

    candidates = []

    # ── 1. Turnaround / Crisis ─────────────────────────────────────────────────
    score = 0
    if rg  < -0.05: score += 5
    if pm  < 0:     score += 5
    if cr  > 0.15:  score += 4
    if cg  < -0.05: score += 4
    if net_growth < -0.10: score += 3
    candidates.append((
        score,
        "Business Turnaround",
        f"Multiple critical signals: revenue {_pct(rg)}, margins {_pct(pm)}, churn {_pct(cr)}. "
        f"Immediate triage: (1) cut all non-essential spend to extend runway, "
        f"(2) focus 100% on your top 20% of customers generating most revenue, "
        f"(3) freeze new acquisition — fix retention first, "
        f"(4) re-validate product-market fit with a 5-customer deep-dive this week. "
        f"Turnarounds are won in 90-day sprints, not strategy decks."
    ))

    # ── 2. Retention Crisis ────────────────────────────────────────────────────
    score = 0
    if cr  > 0.10:  score += 6
    if cr  > 0.15:  score += 4
    if net_growth < 0: score += 3
    if cg  < 0.02:  score += 3
    if clv_cac < 2: score += 2
    candidates.append((
        score,
        "Retention Crisis Response",
        f"Churn of {_pct(cr)} is unsustainable — net growth is {_pct(net_growth)}. "
        f"You're filling a leaky bucket. Immediate actions: "
        f"(1) deploy proactive outreach to all accounts showing early churn signals, "
        f"(2) launch win-back campaigns for recently churned users, "
        f"(3) invest in onboarding improvements to hit value faster, "
        f"(4) introduce loyalty incentives and annual-plan discounts. "
        f"Reducing churn from {_pct(cr)} to 5% doubles your effective LTV to ${clv * (0.10/max(cr,0.001)):.0f}."
    ))

    # ── 12. Customer Success Investment ──────────────────────────────────────────
    score = 0
    if 0.04 < cr <= 0.10: score += 5
    if clv_cac >= 3:       score += 2   # only boost if unit econ are fine
    if cg > 0.03:          score += 2
    if rg > 0.02:          score += 1
    candidates.append((
        score,
        "Customer Success Investment",
        f"Churn at {_pct(cr)} is the single biggest drag on your {_pct(rg)} growth rate. "
        f"With CLV:CAC of {clv_cac:.1f}x, every retained customer is high-value. "
        f"Build a proactive CS function: assign health scores to all accounts, "
        f"automate 30/60/90-day check-in sequences, and create a power-user community. "
        f"Reducing churn by just 2pp would add ~{_pct(0.02 * clv / max(cac,1))} to effective unit economics."
    ))

    # ── 4. Margin Recovery ────────────────────────────────────────────────────
    score = 0
    if pm   < 0.10:  score += 5
    if pm   < 0.05:  score += 4
    if pm   < 0:     score += 5
    if rg   > 0.03:  score += 3    # growing but unprofitable = urgent
    if ms   > 20000: score += 1
    candidates.append((
        score,
        "Margin Recovery",
        f"Revenue growing at {_pct(rg)} but margins are only {_pct(pm)} — "
        f"growth without profitability burns cash fast. "
        f"Three levers: (1) pricing — a 10% price increase at 50% gross margin "
        f"drops entirely to net profit; (2) COGS audit — renegotiate top 3 vendor contracts; "
        f"(3) operational automation — identify the 2-3 manual processes consuming the most labor. "
        f"Target {_pct(0.15)} operating margin within 2 quarters."
    ))

    # ── 5. Unit Economics Recovery ────────────────────────────────────────────
    score = 0
    if cac > 0 and clv_cac < 2.0: score += 9
    if cac > 0 and clv_cac < 1.0: score += 6
    if cr  > 0.05: score += 1
    candidates.append((
        score,
        "Unit Economics Recovery",
        f"CLV:CAC of {clv_cac:.1f}x is critically below the 3x benchmark. "
        f"You spend {_usd(cac)} to acquire a customer worth {_usd(clv)}. "
        f"Fix both sides simultaneously: "
        f"(1) CAC reduction — shift 30% of {_usd(ms)}/mo spend to referrals and SEO (CAC < $50); "
        f"(2) CLV growth — launch upsell sequences, extend average contract length, "
        f"and add premium tiers. "
        f"A 3x CLV improvement on your current CAC of {_usd(cac)} adds {_pct(clv_cac * 0.3)} to unit economics."
    ))

    # ── 6. Marketing Funnel Optimization ─────────────────────────────────────
    score = 0
    if ms  > 10_000 and cvr < 0.025: score += 6
    if ms  > 20_000 and cvr < 0.015: score += 4
    if cac > 300:                     score += 3
    candidates.append((
        score,
        "Marketing Funnel Optimization",
        f"Spending {_usd(ms)}/mo with only {_pct(cvr)} conversion is inefficient — "
        f"your funnel is leaking. Diagnosis: (1) run heatmaps and session recordings on "
        f"top landing pages, (2) A/B test headline and CTA on your highest-traffic page this week, "
        f"(3) add a free trial or freemium tier to lower commitment friction, "
        f"(4) retarget bounced visitors (5-10x cheaper than cold acquisition). "
        f"A 2x conversion improvement halves your {_usd(cac)} CAC overnight."
    ))

    # ── 7. Organic / CAC Reduction ────────────────────────────────────────────
    score = 0
    if cac  > 250: score += 3
    if cac  > 400: score += 3
    if ms   > 15_000: score += 2
    if paid_eff < 0.8: score += 4
    if cvr  < 0.02:    score += 2
    candidates.append((
        score,
        "Organic Growth Shift",
        f"Paid CAC of {_usd(cac)} with {_usd(ms)}/mo spend is capital-intensive. "
        f"Shift 30% of budget to organic channels that compound: "
        f"(1) SEO content targeting buyer-intent keywords (CAC < {_usd(80)}), "
        f"(2) a referral program at 20% of one month's revenue for successful referrals, "
        f"(3) integration marketplace listings (Zapier, Salesforce AppExchange), "
        f"(4) community-led growth via Slack/Discord. "
        f"Organic customers have 3x higher LTV and 60% lower CAC than paid."
    ))

    # ── 8. Competitive Defense ────────────────────────────────────────────────
    score = 0
    if comp_delta > 0.06: score += 6
    if comp_delta > 0.10: score += 4
    if rg < 0.05:         score += 2
    if mkt_lag > 0.05:    score += 2
    candidates.append((
        score,
        "Competitive Defense",
        f"Competitors growing at {_pct(comp)} vs your {_pct(rg)} — "
        f"you're losing {_pct(comp_delta)} relative market share per year. "
        f"Competitive playbook: (1) conduct win/loss analysis on last 20 deals lost, "
        f"(2) ship the top 3 competitor features your churned customers asked for, "
        f"(3) offer annual-plan lock-ins with a 15% discount before competitors reach them, "
        f"(4) build switching costs through deep integrations and data portability lock-in."
    ))

    # ── 9. Market Capture ─────────────────────────────────────────────────────
    score = 0
    if mkt_lag > 0.04:  score += 5
    if mgr   > 0.06:    score += 3
    if comp_delta <= 0: score += 2    # market is growing but not necessarily competitors
    if pm > 0.10:       score += 2
    candidates.append((
        score,
        "Market Capture",
        f"Market growing at {_pct(mgr)} but your revenue only at {_pct(rg)} — "
        f"you're ceding {_pct(mkt_lag)} market share annually. "
        f"This is a timing-sensitive opportunity. Accelerate: "
        f"(1) expand to 2-3 new customer segments or geographies within 60 days, "
        f"(2) launch aggressive partnership / reseller programs, "
        f"(3) increase marketing spend by 40% focused on awareness, "
        f"(4) consider product bundling to increase deal size and stickiness."
    ))

    # ── 10. Scale Operations ──────────────────────────────────────────────────
    score = 0
    if rg  > 0.10: score += 3
    if pm  > 0.15: score += 3
    if cr  < 0.05: score += 3
    if clv_cac > 3: score += 3
    if cg  > 0.08: score += 2
    candidates.append((
        score,
        "Scale Operations",
        f"Strong fundamentals: {_pct(rg)} revenue growth, {_pct(pm)} margins, "
        f"{_pct(cr)} churn, {clv_cac:.1f}x CLV:CAC — you've found product-market fit. "
        f"Now build the machine: (1) hire 2 AEs and a CS manager in Q1, "
        f"(2) automate onboarding to handle 3x volume without headcount growth, "
        f"(3) implement a CRM-driven lead scoring and routing process, "
        f"(4) build partnerships with 3-5 complementary SaaS tools for inbound referrals."
    ))

    # ── 11. Aggressive Growth ─────────────────────────────────────────────────
    score = 0
    if rg  > 0.20: score += 4
    if cg  > 0.20: score += 3
    if pm  > 0.20: score += 3
    if cr  < 0.03: score += 3
    if clv_cac > 5: score += 3
    if comp_delta < -0.05: score += 2   # outpacing competitors
    candidates.append((
        score,
        "Aggressive Growth Mode",
        f"All systems green: {_pct(rg)} revenue growth, {_pct(pm)} margins, "
        f"CLV:CAC {clv_cac:.1f}x, churn only {_pct(cr)}. "
        f"This is the moment to go all-in before the window closes. "
        f"(1) 2-3x marketing spend — every dollar is ROI-positive at this CAC/CLV, "
        f"(2) hire sales aggressively, speed of execution is your moat, "
        f"(3) expand to adjacent markets and enterprise tier, "
        f"(4) lock in customers with multi-year contracts at a discount while they're happy."
    ))

    # ── 12. Pricing Power ─────────────────────────────────────────────────────
    score = 0
    if cvr  > 0.04:  score += 3
    if cr   < 0.05:  score += 3
    if aov  < 150:   score += 4
    if pm   > 0.10:  score += 2
    candidates.append((
        score,
        "Pricing Power Unlock",
        f"Strong conversion ({_pct(cvr)}) and low churn ({_pct(cr)}) prove customers "
        f"love your product — yet AOV of {_usd(aov)} suggests underpricing. "
        f"Price increase playbook: (1) test 20-25% price increase on all new sign-ups "
        f"(existing customers grandfathered), (2) introduce a premium tier with 3 "
        f"high-value features, (3) add usage-based pricing above a base tier, "
        f"(4) offer annual plans at 20% discount to convert monthlies. "
        f"A 20% AOV increase at current volume adds {_pct(0.20 * rg)} to revenue instantly."
    ))

    # ── 13. Product-Led Growth ────────────────────────────────────────────────
    score = 0
    if cvr  > 0.05: score += 3
    if aov  < 80:   score += 4
    if cg   > 0.10: score += 2
    if ms   < 10000: score += 2
    candidates.append((
        score,
        "Product-Led Value Expansion",
        f"High conversion ({_pct(cvr)}) and fast customer growth ({_pct(cg)}) "
        f"with low AOV ({_usd(aov)}) = viral product, weak monetization. "
        f"(1) map your 'power user' behavior and gate it behind a paid tier, "
        f"(2) add usage dashboards showing users the value they'd lose if they downgrade, "
        f"(3) create an in-app upsell triggered when users hit a feature limit, "
        f"(4) introduce team/org plans — the B2B multiplier on AOV is typically 5-10x."
    ))

    # ── 14. Segment Expansion ─────────────────────────────────────────────────
    score = 0
    if rg  > 0.08:  score += 2
    if pm  > 0.15:  score += 2
    if cg  < rg * 0.7 and rg > 0.05: score += 4  # revenue/customer growing, customer count slow
    if cr  < 0.06:  score += 2
    if mkt_lag < 0.02: score += 2
    candidates.append((
        score,
        "Segment Expansion",
        f"Revenue growing {_pct(rg)} with {_pct(pm)} margins and low churn — "
        f"core market is maturing. Revenue-per-customer is rising (healthy), "
        f"but new customer growth ({_pct(cg)}) is slowing. "
        f"Time to expand the TAM: (1) identify the top 3 adjacent verticals where "
        f"your product solves a similar pain, (2) build 3 vertical-specific landing pages, "
        f"(3) recruit 1-2 design partners per new segment, "
        f"(4) consider white-label or OEM partnerships to enter new channels."
    ))

    # ── 15. Market Leadership Consolidation ───────────────────────────────────
    score = 0
    if rg  > comp + 0.05 and rg > 0.10: score += 5
    if pm  > 0.15: score += 3
    if cr  < 0.04: score += 2
    candidates.append((
        score,
        "Market Leadership Consolidation",
        f"You're growing {_pct(rg)} vs competitor {_pct(comp)} — a {_pct(rg - comp)} "
        f"leadership advantage. Now consolidate: "
        f"(1) invest in brand authority — publish benchmark reports, host a conference, "
        f"become the category reference point, "
        f"(2) build a partner ecosystem that creates switching costs, "
        f"(3) consider acqui-hires or tuck-in acquisitions of feature competitors, "
        f"(4) introduce enterprise SLAs and compliance certifications (SOC2, ISO) "
        f"to lock out smaller competitors."
    ))

    # ── 16. Capital-Efficient Growth ──────────────────────────────────────────
    score = 0
    if cac  > 400: score += 5
    if cac  > 300: score += 2
    if ms   > 25_000 and rg < 0.10: score += 5
    if pm   < 0.08: score += 3
    candidates.append((
        score,
        "Capital-Efficient Growth",
        f"Burning {_usd(ms)}/mo on marketing with only {_pct(rg)} growth "
        f"and {_pct(pm)} margins signals inefficient capital allocation. "
        f"Pivot to efficiency: (1) cut 30% of bottom-performing ad spend immediately, "
        f"(2) set a payback period target of ≤12 months (currently {cac/(max(aov, 1.0)*max(cvr,0.001)*12):.0f} months), "
        f"(3) launch a customer referral program (target CAC < {_usd(cac*0.2)}), "
        f"(4) shift KPI from 'revenue growth' to 'revenue per dollar spent'."
    ))

    # ── 17. Operational Excellence ────────────────────────────────────────────
    score = 0
    if rg  > 0.08:  score += 2
    if pm  > 0.05 and pm < 0.15: score += 3
    if cg  > 0.05:  score += 2
    if cr  < 0.07:  score += 2
    if clv_cac > 2: score += 2
    candidates.append((
        score,
        "Operational Excellence",
        f"Decent growth ({_pct(rg)}) but margins of {_pct(pm)} are below potential. "
        f"The gap between growth and profitability is operational. "
        f"(1) map every customer-facing process and eliminate 3 manual handoffs, "
        f"(2) implement revenue operations — align sales, marketing, and CS on one dashboard, "
        f"(3) automate billing, dunning, and renewal workflows, "
        f"(4) set OKRs that directly tie team output to unit economics. "
        f"Operational improvements compound: each 1pp margin gain = {_pct(0.01*rg/max(pm,0.01))} "
        f"proportional profitability improvement."
    ))

    # ── 18. Steady-State Optimization (always scores > 0, acts as floor) ──────
    candidates.append((
        0.5,
        "Steady-State Optimization",
        f"Metrics are broadly balanced: {_pct(rg)} revenue growth, {_pct(pm)} margins, "
        f"{_pct(cr)} churn, CLV:CAC {clv_cac:.1f}x. "
        f"In steady state, compound small wins: "
        f"(1) run a structured A/B test on pricing this quarter, "
        f"(2) identify the single metric with the highest growth leverage and OKR around it, "
        f"(3) survey your top 10% of customers for expansion revenue opportunities, "
        f"(4) benchmark against industry peers and close the biggest gap."
    ))

    # ── Pick winner ───────────────────────────────────────────────────────────
    best_score, best_name, best_explanation = max(candidates, key=lambda x: x[0])
    return (best_name, best_explanation)

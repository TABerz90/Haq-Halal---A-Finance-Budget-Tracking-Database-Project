import React, { useEffect, useState } from 'react';
import {
  BarChart, Bar, LineChart, Line,
  XAxis, YAxis, Tooltip, ResponsiveContainer,
  CartesianGrid, Legend, PieChart, Pie, Cell
} from 'recharts';
import api from '../api/axios';
import { useAuth } from '../context/AuthContext';

const fmt    = (n) => 'PKR ' + Number(n || 0).toLocaleString('en-PK', { maximumFractionDigits: 0 });
const fmtPct = (n) => (n >= 0 ? '+' : '') + Number(n || 0).toFixed(1) + '%';

const PIE_COLORS = ['#2d8c5e','#d4a827','#dc2626','#3b82f6','#8b5cf6','#ec4899','#14b8a6','#f97316'];

function SectionCard({ title, children }) {
  return (
    <div className="card" style={{ padding: 24, marginBottom: 20 }}>
      <div className="section-title" style={{ marginBottom: 18 }}>{title}</div>
      {children}
    </div>
  );
}

export default function Analytics() {
  const { user } = useAuth();
  const uid = user?.user_id;

  const [trend,      setTrend]      = useState([]);
  const [topCats,    setTopCats]    = useState([]);
  const [budgets,    setBudgets]    = useState([]);
  const [loading,    setLoading]    = useState(true);
  const [period,     setPeriod]     = useState(6); // months to show

  useEffect(() => {
    if (!uid) return;
    Promise.all([
      api.get(`/dashboard/${uid}/monthly-trend`),
      api.get(`/dashboard/${uid}/top-categories`),
      api.get(`/dashboard/${uid}/budget-status`),
    ]).then(([t, c, b]) => {
      setTrend(t.data);
      setTopCats(c.data);
      setBudgets(b.data);
    }).finally(() => setLoading(false));
  }, [uid]);

  if (loading) return <div className="spinner" />;

  // Slice trend data by selected period
  const trendData = trend.slice(-period);

  // Compute totals from trend
  const totalIncome   = trendData.reduce((s, r) => s + parseFloat(r.total_income   || 0), 0);
  const totalExpenses = trendData.reduce((s, r) => s + parseFloat(r.total_expenses || 0), 0);
  const totalSavings  = totalIncome - totalExpenses;
  const savingsRate   = totalIncome > 0 ? (totalSavings / totalIncome * 100) : 0;

  // YoY: compare last month vs same month last year (from trend data)
  const lastMonth     = trendData[trendData.length - 1];
  const sameLastYear  = trendData[trendData.length - 13] || null;
  const yoyIncome     = sameLastYear ? ((lastMonth?.total_income - sameLastYear?.total_income) / sameLastYear?.total_income * 100) : null;
  const yoyExpenses   = sameLastYear ? ((lastMonth?.total_expenses - sameLastYear?.total_expenses) / sameLastYear?.total_expenses * 100) : null;

  // Savings rate line data
  const savingsLineData = trendData.map(r => ({
    month: r.month,
    savings_rate: r.total_income > 0
      ? parseFloat(((r.total_income - r.total_expenses) / r.total_income * 100).toFixed(1))
      : 0,
    net_savings: parseFloat(r.net_savings || 0),
  }));

  // Budget health breakdown
  const budgetHealth = {
    good:    budgets.filter(b => b.status === 'Under Budget').length,
    warning: budgets.filter(b => b.status === 'Near Limit').length,
    over:    budgets.filter(b => b.status === 'Over Budget').length,
  };
  const budgetPieData = [
    { name: 'On track',   value: budgetHealth.good    },
    { name: 'Near limit', value: budgetHealth.warning  },
    { name: 'Over budget',value: budgetHealth.over     },
  ].filter(d => d.value > 0);

  return (
    <div style={{ maxWidth: 1100 }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 28 }}>
        <div>
          <h1 className="page-title">Analytics</h1>
          <p style={{ color: 'var(--text-secondary)', fontSize: 14, marginTop: 4 }}>
            Financial insights and trends
          </p>
        </div>
        {/* Period selector */}
        <div style={{ display: 'flex', gap: 6 }}>
          {[3, 6, 12].map(p => (
            <button
              key={p}
              onClick={() => setPeriod(p)}
              style={{
                padding: '6px 14px', borderRadius: 'var(--radius-md)',
                fontSize: 13, fontWeight: 500,
                background: period === p ? 'var(--accent)' : 'var(--bg-muted)',
                color: period === p ? '#fff' : 'var(--text-secondary)',
                border: `1px solid ${period === p ? 'var(--accent)' : 'var(--border)'}`,
                cursor: 'pointer', transition: 'all 0.15s',
              }}
            >
              {p}M
            </button>
          ))}
        </div>
      </div>

      {/* Summary stat cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 14, marginBottom: 24 }}>
        {[
          { label: `Total income (${period}mo)`,   value: fmt(totalIncome),   color: 'var(--green-600)' },
          { label: `Total expenses (${period}mo)`,  value: fmt(totalExpenses), color: 'var(--red-500)'   },
          { label: `Net savings (${period}mo)`,     value: fmt(totalSavings),  color: totalSavings >= 0 ? 'var(--green-600)' : 'var(--red-500)' },
          { label: 'Avg savings rate',              value: savingsRate.toFixed(1) + '%', color: savingsRate >= 20 ? 'var(--green-600)' : 'var(--gold-500)' },
        ].map(card => (
          <div key={card.label} className="card" style={{ padding: '18px 20px' }}>
            <div style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 6 }}>{card.label}</div>
            <div style={{ fontFamily: 'var(--font-display)', fontSize: 22, fontWeight: 600, color: card.color }}>
              {card.value}
            </div>
          </div>
        ))}
      </div>

      {/* Income vs Expenses bar chart */}
      <SectionCard title={`Income vs expenses — last ${period} months`}>
        {trendData.length === 0 ? (
          <div className="empty-state"><p>No data for this period</p></div>
        ) : (
          <ResponsiveContainer width="100%" height={240}>
            <BarChart data={trendData} barGap={4}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
              <XAxis dataKey="month" tick={{ fontSize: 12, fill: 'var(--text-muted)' }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: 12, fill: 'var(--text-muted)' }} axisLine={false} tickLine={false} tickFormatter={v => `${(v/1000).toFixed(0)}k`} />
              <Tooltip
                contentStyle={{ borderRadius: 8, border: '1px solid var(--border)', fontSize: 13 }}
                formatter={(v, n) => [fmt(v), n === 'total_income' ? 'Income' : 'Expenses']}
              />
              <Legend formatter={v => v === 'total_income' ? 'Income' : 'Expenses'} />
              <Bar dataKey="total_income"   name="total_income"   fill="var(--green-200)" stroke="var(--green-500)" strokeWidth={1} radius={[4,4,0,0]} />
              <Bar dataKey="total_expenses" name="total_expenses" fill="var(--red-100)"   stroke="var(--red-500)"   strokeWidth={1} radius={[4,4,0,0]} />
            </BarChart>
          </ResponsiveContainer>
        )}
      </SectionCard>

      {/* Savings rate line chart */}
      <SectionCard title="Savings rate trend (%)">
        {savingsLineData.length === 0 ? (
          <div className="empty-state"><p>No data available</p></div>
        ) : (
          <ResponsiveContainer width="100%" height={200}>
            <LineChart data={savingsLineData}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
              <XAxis dataKey="month" tick={{ fontSize: 12, fill: 'var(--text-muted)' }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: 12, fill: 'var(--text-muted)' }} axisLine={false} tickLine={false} tickFormatter={v => v + '%'} />
              <Tooltip
                contentStyle={{ borderRadius: 8, border: '1px solid var(--border)', fontSize: 13 }}
                formatter={(v) => [v + '%', 'Savings rate']}
              />
              <Line
                type="monotone" dataKey="savings_rate"
                stroke="var(--green-500)" strokeWidth={2.5}
                dot={{ r: 4, fill: 'var(--green-500)', strokeWidth: 0 }}
                activeDot={{ r: 6 }}
              />
            </LineChart>
          </ResponsiveContainer>
        )}
      </SectionCard>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20, marginBottom: 20 }}>

        {/* Top spending categories */}
        <SectionCard title="Top spending categories — this month">
          {topCats.length === 0 ? (
            <div className="empty-state"><p>No expense data this month</p></div>
          ) : (
            <>
              <ResponsiveContainer width="100%" height={200}>
                <PieChart>
                  <Pie
                    data={topCats} dataKey="total_spent" nameKey="category_name"
                    cx="50%" cy="50%" outerRadius={80} innerRadius={40}
                    paddingAngle={3}
                  >
                    {topCats.map((_, i) => (
                      <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip formatter={(v) => fmt(v)} contentStyle={{ borderRadius: 8, border: '1px solid var(--border)', fontSize: 13 }} />
                </PieChart>
              </ResponsiveContainer>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginTop: 8 }}>
                {topCats.map((cat, i) => (
                  <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <div style={{ width: 10, height: 10, borderRadius: '50%', background: PIE_COLORS[i % PIE_COLORS.length], flexShrink: 0 }} />
                    <span style={{ fontSize: 13, flex: 1 }}>{cat.category_name}</span>
                    <span style={{ fontSize: 13, fontWeight: 500, color: 'var(--red-500)' }}>{fmt(cat.total_spent)}</span>
                  </div>
                ))}
              </div>
            </>
          )}
        </SectionCard>

        {/* Budget health */}
        <SectionCard title="Budget health overview">
          {budgets.length === 0 ? (
            <div className="empty-state"><p>No budgets set</p></div>
          ) : (
            <>
              {/* Pie */}
              {budgetPieData.length > 0 && (
                <ResponsiveContainer width="100%" height={160}>
                  <PieChart>
                    <Pie data={budgetPieData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={70} innerRadius={35} paddingAngle={3}>
                      <Cell fill="var(--green-500)" />
                      <Cell fill="var(--gold-400)" />
                      <Cell fill="var(--red-500)" />
                    </Pie>
                    <Tooltip contentStyle={{ borderRadius: 8, border: '1px solid var(--border)', fontSize: 13 }} />
                  </PieChart>
                </ResponsiveContainer>
              )}
              {/* Legend */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginTop: 12 }}>
                {[
                  { label: 'On track',    count: budgetHealth.good,    color: 'var(--green-500)' },
                  { label: 'Near limit',  count: budgetHealth.warning,  color: 'var(--gold-400)'  },
                  { label: 'Over budget', count: budgetHealth.over,     color: 'var(--red-500)'   },
                ].map(row => (
                  <div key={row.label} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <div style={{ width: 10, height: 10, borderRadius: '50%', background: row.color, flexShrink: 0 }} />
                    <span style={{ fontSize: 13, flex: 1 }}>{row.label}</span>
                    <span style={{ fontSize: 13, fontWeight: 500 }}>{row.count} budget{row.count !== 1 ? 's' : ''}</span>
                  </div>
                ))}
              </div>
            </>
          )}
        </SectionCard>
      </div>

      {/* YoY comparison — only show if we have enough data */}
      {sameLastYear && (
        <SectionCard title="Year-over-year comparison (last month vs same month last year)">
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
            {[
              { label: 'Income change',   value: yoyIncome,   positive: yoyIncome >= 0   },
              { label: 'Expense change',  value: yoyExpenses, positive: yoyExpenses <= 0  },
            ].map(item => (
              <div key={item.label} style={{
                padding: '16px 20px', borderRadius: 'var(--radius-md)',
                background: item.positive ? 'var(--green-50)' : 'var(--red-100)',
                border: `1px solid ${item.positive ? 'var(--green-100)' : 'var(--red-100)'}`,
              }}>
                <div style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 6 }}>{item.label}</div>
                <div style={{ fontFamily: 'var(--font-display)', fontSize: 26, fontWeight: 600, color: item.positive ? 'var(--green-600)' : 'var(--red-500)' }}>
                  {fmtPct(item.value)}
                </div>
              </div>
            ))}
          </div>
        </SectionCard>
      )}

      {/* All budgets table */}
      <SectionCard title="All budgets — current month">
        {budgets.length === 0 ? (
          <div className="empty-state"><p>No budgets found</p></div>
        ) : (
          <table className="data-table">
            <thead>
              <tr><th>Category</th><th>Budgeted</th><th>Spent</th><th>Remaining</th><th>Used</th><th>Status</th></tr>
            </thead>
            <tbody>
              {budgets.map((b, i) => {
                const pct = parseFloat(b.percentage_used) || 0;
                const cls = pct >= 100 ? 'badge badge-danger' : pct >= parseFloat(b.alert_threshold) ? 'badge badge-warning' : 'badge badge-good';
                const barCls = pct >= 100 ? 'progress-danger' : pct >= parseFloat(b.alert_threshold) ? 'progress-warning' : 'progress-good';
                return (
                  <tr key={i}>
                    <td style={{ fontWeight: 500 }}>{b.category_name}</td>
                    <td>{fmt(b.budgeted_amount)}</td>
                    <td className="amount-expense">{fmt(b.actual_spent)}</td>
                    <td className={parseFloat(b.remaining_amount) >= 0 ? 'amount-income' : 'amount-expense'}>{fmt(b.remaining_amount)}</td>
                    <td style={{ width: 120 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <div className="progress-bar" style={{ flex: 1 }}>
                          <div className={`progress-bar-fill ${barCls}`} style={{ width: `${Math.min(pct, 100)}%` }} />
                        </div>
                        <span style={{ fontSize: 12, color: 'var(--text-muted)', whiteSpace: 'nowrap' }}>{pct.toFixed(0)}%</span>
                      </div>
                    </td>
                    <td><span className={cls}>{b.status}</span></td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </SectionCard>
    </div>
  );
}

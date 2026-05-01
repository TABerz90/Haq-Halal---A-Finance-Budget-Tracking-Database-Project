import React, { useEffect, useState } from 'react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts';
import api from '../api/axios';
import { useAuth } from '../context/AuthContext';

function StatCard({ label, value, sub, accent }) {
  return (
    <div className="card" style={{ padding: '20px 24px' }}>
      <div style={{ fontSize: 13, color: 'var(--text-secondary)', marginBottom: 8 }}>{label}</div>
      <div style={{ fontFamily: 'var(--font-display)', fontSize: 28, fontWeight: 600, color: accent || 'var(--text-primary)' }}>
        {value}
      </div>
      {sub && <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 4 }}>{sub}</div>}
    </div>
  );
}

const fmt = (n) => 'PKR ' + Number(n || 0).toLocaleString('en-PK', { maximumFractionDigits: 0 });

export default function Dashboard() {
  const { user } = useAuth();
  const uid = user?.user_id;

  const [summary,    setSummary]    = useState(null);
  const [trend,      setTrend]      = useState([]);
  const [topCats,    setTopCats]    = useState([]);
  const [alerts,     setAlerts]     = useState([]);
  const [budgets,    setBudgets]    = useState([]);
  const [loading,    setLoading]    = useState(true);

  useEffect(() => {
    if (!uid) return;
    // Roll over last month's budgets and sync alerts before loading data,
    // so counts and budget status are always current on page load.
    Promise.all([
      api.post(`/budgets/rollover/${uid}`).catch(() => {}),
      api.post(`/alerts/sync/${uid}`).catch(() => {}),
    ]).finally(() => {
      Promise.all([
        api.get(`/dashboard/${uid}`),
        api.get(`/dashboard/${uid}/monthly-trend`),
        api.get(`/dashboard/${uid}/top-categories`),
        api.get(`/dashboard/${uid}/alerts`),
        api.get(`/dashboard/${uid}/budget-status`),
      ]).then(([s, t, c, a, b]) => {
        setSummary(s.data);
        setTrend(t.data);
        setTopCats(c.data);
        setAlerts(a.data.slice(0, 3));
        setBudgets(b.data.slice(0, 4));
      }).finally(() => setLoading(false));
    });
  }, [uid]);

  if (loading) return <div className="spinner" />;

  return (
    <div style={{ maxWidth: 1100 }}>
      {/* Header */}
      <div style={{ marginBottom: 28 }}>
        <h1 className="page-title">Good day, {user?.full_name?.split(' ')[0]} 👋</h1>
        <p style={{ color: 'var(--text-secondary)', fontSize: 14, marginTop: 4 }}>
          Here's your financial overview
        </p>
      </div>

      {/* Stat cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 14, marginBottom: 28 }}>
        <StatCard label="Total balance" value={fmt(summary?.total_balance)} sub={`${summary?.active_accounts || 0} active accounts`} accent="var(--green-600)" />
        <StatCard label="This month's transactions" value={summary?.transactions_this_month || 0} />
        <StatCard label="Unread alerts" value={summary?.unread_alerts || 0} accent={summary?.unread_alerts > 0 ? 'var(--red-500)' : undefined} />
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 320px', gap: 20, marginBottom: 20 }}>
        {/* Monthly trend chart */}
        <div className="card" style={{ padding: 24 }}>
          <div style={{ marginBottom: 16 }}>
            <span className="section-title">6-month trend</span>
          </div>
          {trend.length === 0 ? (
            <div className="empty-state"><p>No transaction data yet</p></div>
          ) : (
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={trend} barGap={4}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
                <XAxis dataKey="month" tick={{ fontSize: 12, fill: 'var(--text-muted)' }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 12, fill: 'var(--text-muted)' }} axisLine={false} tickLine={false} tickFormatter={v => `${(v/1000).toFixed(0)}k`} />
                <Tooltip
                  contentStyle={{ borderRadius: 8, border: '1px solid var(--border)', fontSize: 13 }}
                  formatter={(v, n) => [fmt(v), n === 'total_income' ? 'Income' : 'Expenses']}
                />
                <Bar dataKey="total_income"   fill="var(--green-200)" radius={[4,4,0,0]} name="Income" />
                <Bar dataKey="total_expenses" fill="var(--red-100)"   radius={[4,4,0,0]} name="Expenses" stroke="var(--red-500)" strokeWidth={1} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>

        {/* Top spending categories */}
        <div className="card" style={{ padding: 24 }}>
          <div style={{ marginBottom: 16 }}><span className="section-title">Top spending — this month</span></div>
          {topCats.length === 0 ? (
            <div className="empty-state"><p>No expenses this month</p></div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              {topCats.map((cat, i) => (
                <div key={i}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                    <span style={{ fontSize: 13, fontWeight: 500 }}>{cat.category_name}</span>
                    <span style={{ fontSize: 13, color: 'var(--red-500)' }}>{fmt(cat.total_spent)}</span>
                  </div>
                  <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>{cat.transaction_count} transactions</div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20 }}>
        {/* Budget overview */}
        <div className="card" style={{ padding: 24 }}>
          <div style={{ marginBottom: 16 }}><span className="section-title">Budget status</span></div>
          {budgets.length === 0 ? (
            <div className="empty-state"><p>No budgets set</p></div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              {budgets.map((b, i) => {
                const pct = Math.min(parseFloat(b.percentage_used) || 0, 100);
                const cls = pct >= 100 ? 'progress-danger' : pct >= 85 ? 'progress-warning' : 'progress-good';
                return (
                  <div key={i}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 5 }}>
                      <span style={{ fontSize: 13, fontWeight: 500 }}>{b.category_name}</span>
                      <span style={{ fontSize: 12, color: 'var(--text-secondary)' }}>{pct.toFixed(0)}%</span>
                    </div>
                    <div className="progress-bar">
                      <div className={`progress-bar-fill ${cls}`} style={{ width: `${pct}%` }} />
                    </div>
                    <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 3 }}>
                      {fmt(b.actual_spent)} / {fmt(b.budgeted_amount)}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Unread alerts */}
        <div className="card" style={{ padding: 24 }}>
          <div style={{ marginBottom: 16 }}><span className="section-title">Recent alerts</span></div>
          {alerts.length === 0 ? (
            <div className="empty-state"><p>No unread alerts</p></div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {alerts.map((a) => (
                <div key={a.alert_id} style={{
                  padding: '10px 12px', borderRadius: 'var(--radius-md)',
                  background: a.alert_type === 'Exceeded' ? 'var(--red-100)' : '#fef3c7',
                  fontSize: 13,
                }}>
                  <div style={{ fontWeight: 500, color: a.alert_type === 'Exceeded' ? 'var(--red-500)' : '#92400e' }}>
                    {a.alert_type} — {a.category_name}
                  </div>
                  <div style={{ fontSize: 12, marginTop: 2, opacity: 0.8 }}>{a.alert_message}</div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

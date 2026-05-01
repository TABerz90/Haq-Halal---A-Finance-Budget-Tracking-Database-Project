import React, { useEffect, useState } from 'react';
import api from '../api/axios';
import { useAuth } from '../context/AuthContext';

const fmt = (n) => 'PKR ' + Number(n || 0).toLocaleString('en-PK', { maximumFractionDigits: 2 });
const EMPTY = { account_name: '', account_type: 'Bank', current_balance: '', currency_code: 'PKR' };

export function AccountsPage() {
  const { user } = useAuth();
  const uid = user?.user_id;
  const [accounts, setAccounts] = useState([]);
  const [modal, setModal]       = useState(false);
  const [editing, setEditing]   = useState(null);
  const [form, setForm]         = useState(EMPTY);
  const [error, setError]       = useState('');
  const [saving, setSaving]     = useState(false);

  const load = () => api.get(`/accounts/user/${uid}`).then(r => setAccounts(r.data));
  useEffect(() => { if (uid) load(); }, [uid]);

  const openCreate = () => { setEditing(null); setForm(EMPTY); setError(''); setModal(true); };
  const openEdit   = (a) => { setEditing(a); setForm({ account_name: a.account_name, account_type: a.account_type, current_balance: a.current_balance, currency_code: a.currency_code }); setError(''); setModal(true); };

  const save = async (e) => {
    e.preventDefault(); setSaving(true); setError('');
    try {
      if (editing) await api.put(`/accounts/${editing.account_id}`, { ...form, is_active: 1 });
      else         await api.post('/accounts', { ...form, user_id: uid, current_balance: parseFloat(form.current_balance) || 0 });
      setModal(false); load();
    } catch (err) { setError(err.response?.data?.error || 'Failed to save.'); }
    finally { setSaving(false); }
  };

  const del = async (id) => {
    if (!window.confirm('Deactivate this account?')) return;
    await api.delete(`/accounts/${id}`); load();
  };

  const TYPE_ICONS = { Bank: '🏦', Cash: '💵', 'Digital Wallet': '📱', 'Credit Card': '💳' };

  return (
    <div style={{ maxWidth: 800 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
        <h1 className="page-title">Accounts</h1>
        <button className="btn btn-primary" onClick={openCreate}>+ Add account</button>
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: 14 }}>
        {accounts.length === 0 ? (
          <div className="empty-state"><div className="empty-state-icon">◉</div><p>No accounts yet</p></div>
        ) : accounts.map(a => (
          <div key={a.account_id} className="card" style={{ padding: 20 }}>
            <div style={{ fontSize: 28, marginBottom: 8 }}>{TYPE_ICONS[a.account_type] || '◉'}</div>
            <div style={{ fontWeight: 500, marginBottom: 2 }}>{a.account_name}</div>
            <div style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 12 }}>{a.account_type}</div>
            <div style={{ fontFamily: 'var(--font-display)', fontSize: 22, color: 'var(--green-600)', fontWeight: 600 }}>{fmt(a.current_balance)}</div>
            <div style={{ display: 'flex', gap: 6, marginTop: 14 }}>
              <button className="btn btn-secondary btn-sm" onClick={() => openEdit(a)}>Edit</button>
              <button className="btn btn-danger btn-sm" onClick={() => del(a.account_id)}>Remove</button>
            </div>
          </div>
        ))}
      </div>
      {modal && (
        <div className="modal-overlay" onClick={e => e.target === e.currentTarget && setModal(false)}>
          <div className="modal">
            <div className="modal-title">{editing ? 'Edit account' : 'New account'}</div>
            {error && <div className="error-msg">{error}</div>}
            <form onSubmit={save} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              <div className="form-group"><label className="form-label">Account name</label>
                <input className="input-field" value={form.account_name} onChange={e => setForm(f => ({ ...f, account_name: e.target.value }))} required /></div>
              <div className="form-group"><label className="form-label">Account type</label>
                <select className="input-field" value={form.account_type} onChange={e => setForm(f => ({ ...f, account_type: e.target.value }))}>
                  {['Bank', 'Cash', 'Digital Wallet', 'Credit Card'].map(t => <option key={t}>{t}</option>)}</select></div>
              {!editing && <div className="form-group"><label className="form-label">Opening balance (PKR)</label>
                <input className="input-field" type="number" step="0.01" value={form.current_balance} onChange={e => setForm(f => ({ ...f, current_balance: e.target.value }))} /></div>}
              <div className="modal-actions">
                <button type="button" className="btn btn-secondary" onClick={() => setModal(false)}>Cancel</button>
                <button type="submit" className="btn btn-primary" disabled={saving}>{saving ? 'Saving…' : 'Save'}</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

// categories
const CAT_EMPTY = { category_name: '', category_type: 'Expense', description: '' };

export function CategoriesPage() {
  const { user } = useAuth();
  const uid = user?.user_id;
  const [categories, setCategories] = useState([]);
  const [modal, setModal] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm]   = useState(CAT_EMPTY);
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  const load = () => api.get(`/categories/user/${uid}`).then(r => setCategories(r.data));
  useEffect(() => { if (uid) load(); }, [uid]);

  const openCreate = () => { setEditing(null); setForm(CAT_EMPTY); setError(''); setModal(true); };
  const openEdit   = (c) => { setEditing(c); setForm({ category_name: c.category_name, category_type: c.category_type, description: c.description || '' }); setError(''); setModal(true); };

  const save = async (e) => {
    e.preventDefault(); setSaving(true); setError('');
    try {
      if (editing) await api.put(`/categories/${editing.category_id}`, form);
      else         await api.post('/categories', { ...form, user_id: uid });
      setModal(false); load();
    } catch (err) { setError(err.response?.data?.error || 'Failed to save.'); }
    finally { setSaving(false); }
  };

  const del = async (id) => {
    if (!window.confirm('Delete this category?')) return;
    await api.delete(`/categories/${id}`); load();
  };

  const income  = categories.filter(c => c.category_type === 'Income');
  const expense = categories.filter(c => c.category_type === 'Expense');

  return (
    <div style={{ maxWidth: 800 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
        <h1 className="page-title">Categories</h1>
        <button className="btn btn-primary" onClick={openCreate}>+ Add category</button>
      </div>
      {[['Income', income], ['Expense', expense]].map(([label, cats]) => (
        <div key={label} style={{ marginBottom: 24 }}>
          <div className="section-title" style={{ marginBottom: 10 }}>{label}</div>
          <div className="card" style={{ overflow: 'hidden' }}>
            {cats.length === 0 ? <div className="empty-state" style={{ padding: 24 }}><p>No {label.toLowerCase()} categories</p></div> :
              <table className="data-table"><thead><tr><th>Name</th><th>Description</th><th></th></tr></thead>
                <tbody>{cats.map(c => (
                  <tr key={c.category_id}>
                    <td style={{ fontWeight: 500 }}>{c.category_name}</td>
                    <td style={{ color: 'var(--text-secondary)', fontSize: 13 }}>{c.description || '—'}</td>
                    <td style={{ textAlign: 'right' }}>
                      <div style={{ display: 'flex', gap: 6, justifyContent: 'flex-end' }}>
                        <button className="btn btn-secondary btn-sm" onClick={() => openEdit(c)}>Edit</button>
                        <button className="btn btn-danger btn-sm" onClick={() => del(c.category_id)}>Delete</button>
                      </div>
                    </td>
                  </tr>
                ))}</tbody>
              </table>}
          </div>
        </div>
      ))}
      {modal && (
        <div className="modal-overlay" onClick={e => e.target === e.currentTarget && setModal(false)}>
          <div className="modal">
            <div className="modal-title">{editing ? 'Edit category' : 'New category'}</div>
            {error && <div className="error-msg">{error}</div>}
            <form onSubmit={save} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              <div className="form-group"><label className="form-label">Name</label>
                <input className="input-field" value={form.category_name} onChange={e => setForm(f => ({ ...f, category_name: e.target.value }))} required /></div>
              <div className="form-group"><label className="form-label">Type</label>
                <select className="input-field" value={form.category_type} onChange={e => setForm(f => ({ ...f, category_type: e.target.value }))}>
                  <option value="Expense">Expense</option><option value="Income">Income</option></select></div>
              <div className="form-group"><label className="form-label">Description</label>
                <input className="input-field" value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} placeholder="Optional" /></div>
              <div className="modal-actions">
                <button type="button" className="btn btn-secondary" onClick={() => setModal(false)}>Cancel</button>
                <button type="submit" className="btn btn-primary" disabled={saving}>{saving ? 'Saving…' : 'Save'}</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

// budgets
const BUD_EMPTY = { category_id: '', budget_amount: '', budget_month: '', alert_threshold: 90 };

export function BudgetsPage() {
  const { user } = useAuth();
  const uid = user?.user_id;
  const [budgets, setBudgets]       = useState([]);
  const [categories, setCategories] = useState([]);
  const [modal, setModal]           = useState(false);
  const [editing, setEditing]       = useState(null);
  const [form, setForm]             = useState(BUD_EMPTY);
  const [error, setError]           = useState('');
  const [saving, setSaving]         = useState(false);
  const [rollingOver, setRollingOver] = useState(false);
  const [rolloverMsg, setRolloverMsg] = useState('');

  const load = () => api.get(`/budgets/user/${uid}`).then(r => setBudgets(r.data));
  useEffect(() => {
    if (!uid) return;
    load();
    api.get(`/categories/user/${uid}`).then(r => setCategories(r.data.filter(c => c.category_type === 'Expense')));
  }, [uid]);

  const openCreate = () => { setEditing(null); setForm({ ...BUD_EMPTY, budget_month: new Date().toISOString().slice(0, 7) + '-01' }); setError(''); setModal(true); };
  const openEdit   = (b) => { setEditing(b); setForm({ category_id: b.category_id, budget_amount: b.budget_amount, budget_month: b.budget_month?.split('T')[0] || b.budget_month, alert_threshold: b.alert_threshold }); setError(''); setModal(true); };

  const save = async (e) => {
    e.preventDefault(); setSaving(true); setError('');
    try {
      if (editing) await api.put(`/budgets/${editing.budget_id}`, { budget_amount: parseFloat(form.budget_amount), alert_threshold: parseFloat(form.alert_threshold) });
      else         await api.post('/budgets', { ...form, user_id: uid, budget_amount: parseFloat(form.budget_amount), alert_threshold: parseFloat(form.alert_threshold) });
      setModal(false); load();
    } catch (err) { setError(err.response?.data?.error || 'Failed to save.'); }
    finally { setSaving(false); }
  };

  const del = async (id) => { if (!window.confirm('Delete this budget?')) return; await api.delete(`/budgets/${id}`); load(); };

  const rollover = async () => {
    setRollingOver(true); setRolloverMsg('');
    try {
      const r = await api.post(`/budgets/rollover/${uid}`);
      const n = r.data.budgets_created;
      setRolloverMsg(n > 0
        ? `${n} budget${n !== 1 ? 's' : ''} rolled over to this month.`
        : 'All budgets are already set for this month.');
      if (n > 0) load();
    } catch (err) { setRolloverMsg(err.response?.data?.error || 'Rollover failed.'); }
    finally { setRollingOver(false); }
  };

  const thisMonth = new Date().toISOString().slice(0, 7);
  const hasThisMonth = budgets.some(b => (b.budget_month || '').slice(0, 7) === thisMonth);

  return (
    <div style={{ maxWidth: 900 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: rolloverMsg ? 12 : 24 }}>
        <h1 className="page-title">Budgets</h1>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          {!hasThisMonth && (
            <button className="btn btn-secondary" onClick={rollover} disabled={rollingOver}>
              {rollingOver ? 'Rolling over…' : 'Roll over to this month'}
            </button>
          )}
          <button className="btn btn-primary" onClick={openCreate}>+ Set budget</button>
        </div>
      </div>
      {rolloverMsg && (
        <div style={{
          marginBottom: 16, padding: '10px 14px', borderRadius: 'var(--radius-md)', fontSize: 13,
          background: rolloverMsg.includes('failed') ? 'var(--red-100)' : 'var(--green-50)',
          color: rolloverMsg.includes('failed') ? 'var(--red-500)' : 'var(--green-600)',
          border: `1px solid ${rolloverMsg.includes('failed') ? 'var(--red-500)' : 'var(--green-100)'}`,
        }}>{rolloverMsg}</div>
      )}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: 14 }}>
        {budgets.length === 0 ? <div className="empty-state"><div className="empty-state-icon">◎</div><p>No budgets set yet</p></div>
          : budgets.map(b => {
          const rawPct  = parseFloat(b.percentage_used) || 0;
          const pct     = Math.min(rawPct, 100);
          const cls       = rawPct >= 100 ? 'progress-danger' : rawPct >= parseFloat(b.alert_threshold) ? 'progress-warning' : 'progress-good';
          const statusCls = rawPct >= 100 ? 'badge badge-danger' : rawPct >= parseFloat(b.alert_threshold) ? 'badge badge-warning' : 'badge badge-good';
          const carryover = parseFloat(b.carryover_amount) || 0;
          const monthly   = parseFloat(b.monthly_spent)    || 0;
          return (
            <div key={b.budget_id} className="card" style={{ padding: 20 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 10 }}>
                <div style={{ fontWeight: 500 }}>{b.category_name}</div>
                <span className={statusCls}>{rawPct >= 100 ? 'Over' : rawPct >= parseFloat(b.alert_threshold) ? 'Near limit' : 'On track'}</span>
              </div>
              {carryover > 0 && (
                <div style={{
                  fontSize: 12, marginBottom: 8, padding: '5px 8px',
                  background: 'var(--red-100)', borderRadius: 'var(--radius-sm)',
                  color: 'var(--red-500)', display: 'flex', justifyContent: 'space-between',
                }}>
                  <span>Carried over from last month</span>
                  <span style={{ fontWeight: 600 }}>PKR {Number(carryover).toLocaleString()}</span>
                </div>
              )}
              <div style={{ marginBottom: 8 }}>
                <div className="progress-bar"><div className={`progress-bar-fill ${cls}`} style={{ width: `${pct}%` }} /></div>
              </div>
              <div style={{ fontSize: 13, color: 'var(--text-secondary)', marginBottom: carryover > 0 ? 4 : 8 }}>
                PKR {Number(b.actual_spent).toLocaleString()} / PKR {Number(b.budget_amount).toLocaleString()}
                <span style={{ marginLeft: 6, color: 'var(--text-muted)', fontSize: 12 }}>({rawPct.toFixed(0)}%)</span>
              </div>
              {carryover > 0 && (
                <div style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 8 }}>
                  PKR {Number(monthly).toLocaleString()} this month + PKR {Number(carryover).toLocaleString()} carryover
                </div>
              )}
              <div style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 12 }}>
                {new Date(b.budget_month).toLocaleString('default', { month: 'long', year: 'numeric' })} · Alert at {b.alert_threshold}%
              </div>
              <div style={{ display: 'flex', gap: 6 }}>
                <button className="btn btn-secondary btn-sm" onClick={() => openEdit(b)}>Edit</button>
                <button className="btn btn-danger btn-sm" onClick={() => del(b.budget_id)}>Delete</button>
              </div>
            </div>
          );
        })}
      </div>
      {modal && (
        <div className="modal-overlay" onClick={e => e.target === e.currentTarget && setModal(false)}>
          <div className="modal">
            <div className="modal-title">{editing ? 'Edit budget' : 'New budget'}</div>
            {error && <div className="error-msg">{error}</div>}
            <form onSubmit={save} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              {!editing && <>
                <div className="form-group"><label className="form-label">Category</label>
                  <select className="input-field" value={form.category_id} onChange={e => setForm(f => ({ ...f, category_id: e.target.value }))} required>
                    <option value="">Select expense category</option>
                    {categories.map(c => <option key={c.category_id} value={c.category_id}>{c.category_name}</option>)}
                  </select></div>
                <div className="form-group"><label className="form-label">Month</label>
                  <input className="input-field" type="month" value={form.budget_month?.slice(0, 7)}
                    onChange={e => setForm(f => ({ ...f, budget_month: e.target.value + '-01' }))} required /></div>
              </>}
              <div className="form-group"><label className="form-label">Budget amount (PKR)</label>
                <input className="input-field" type="number" min="1" step="0.01" value={form.budget_amount} onChange={e => setForm(f => ({ ...f, budget_amount: e.target.value }))} required /></div>
              <div className="form-group"><label className="form-label">Alert threshold (%)</label>
                <input className="input-field" type="number" min="0" max="100" value={form.alert_threshold} onChange={e => setForm(f => ({ ...f, alert_threshold: e.target.value }))} /></div>
              <div className="modal-actions">
                <button type="button" className="btn btn-secondary" onClick={() => setModal(false)}>Cancel</button>
                <button type="submit" className="btn btn-primary" disabled={saving}>{saving ? 'Saving…' : 'Save'}</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

// recurringTransactions
export function RecurringPage() {
  const { user } = useAuth();
  const uid = user?.user_id;
  const [items, setItems]           = useState([]);
  const [accounts, setAccounts]     = useState([]);
  const [categories, setCategories] = useState([]);
  const [modal, setModal]           = useState(false);
  const [form, setForm]             = useState({ account_id: '', category_id: '', transaction_type: 'Expense', amount: '', frequency: 'Monthly', start_date: '', description: '', payment_method: '' });
  const [error, setError]           = useState('');
  const [saving, setSaving]         = useState(false);

  const load = () => api.get(`/recurring/user/${uid}`).then(r => setItems(r.data));
  useEffect(() => {
    if (!uid) return;
    load();
    api.get(`/accounts/user/${uid}`).then(r => setAccounts(r.data));
    api.get(`/categories/user/${uid}`).then(r => setCategories(r.data));
  }, [uid]);

  const save = async (e) => {
    e.preventDefault(); setSaving(true); setError('');
    try {
      await api.post('/recurring', { ...form, user_id: uid, amount: parseFloat(form.amount) });
      setModal(false); load();
    } catch (err) { setError(err.response?.data?.error || 'Failed to save.'); }
    finally { setSaving(false); }
  };

  const toggle = async (r) => {
    await api.put(`/recurring/${r.recurring_id}`, { ...r, is_active: r.is_active ? 0 : 1, amount: r.amount, frequency: r.frequency });
    load();
  };

  const del = async (id) => { if (!window.confirm('Delete recurring transaction?')) return; await api.delete(`/recurring/${id}`); load(); };

  return (
    <div style={{ maxWidth: 900 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
        <h1 className="page-title">Recurring</h1>
        <button className="btn btn-primary" onClick={() => { setForm({ account_id: '', category_id: '', transaction_type: 'Expense', amount: '', frequency: 'Monthly', start_date: new Date().toISOString().split('T')[0], description: '', payment_method: '' }); setError(''); setModal(true); }}>+ Add recurring</button>
      </div>
      <div className="card" style={{ overflow: 'hidden' }}>
        <table className="data-table"><thead><tr><th>Description</th><th>Type</th><th>Amount</th><th>Frequency</th><th>Next due</th><th>Status</th><th></th></tr></thead>
          <tbody>
            {items.length === 0 ? <tr><td colSpan={7}><div className="empty-state"><div className="empty-state-icon">↺</div><p>No recurring transactions</p></div></td></tr>
              : items.map(r => (
              <tr key={r.recurring_id} style={{ opacity: r.is_active ? 1 : 0.5 }}>
                <td style={{ fontWeight: 500 }}>{r.description || r.category_name}</td>
                <td><span className={r.transaction_type === 'Income' ? 'badge badge-income' : 'badge badge-expense'}>{r.transaction_type}</span></td>
                <td><span className={r.transaction_type === 'Income' ? 'amount-income' : 'amount-expense'}>PKR {Number(r.amount).toLocaleString()}</span></td>
                <td style={{ fontSize: 13, color: 'var(--text-secondary)' }}>{r.frequency}</td>
                <td style={{ fontSize: 13, color: 'var(--text-secondary)' }}>{r.next_due_date ? new Date(r.next_due_date).toLocaleDateString('en-PK') : '—'}</td>
                <td><span className={r.is_active ? 'badge badge-good' : 'badge'}>{r.is_active ? 'Active' : 'Paused'}</span></td>
                <td>
                  <div style={{ display: 'flex', gap: 6, justifyContent: 'flex-end' }}>
                    <button className="btn btn-secondary btn-sm" onClick={() => toggle(r)}>{r.is_active ? 'Pause' : 'Resume'}</button>
                    <button className="btn btn-danger btn-sm" onClick={() => del(r.recurring_id)}>Delete</button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {modal && (
        <div className="modal-overlay" onClick={e => e.target === e.currentTarget && setModal(false)}>
          <div className="modal">
            <div className="modal-title">New recurring transaction</div>
            {error && <div className="error-msg">{error}</div>}
            <form onSubmit={save} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                <div className="form-group"><label className="form-label">Type</label>
                  <select className="input-field" value={form.transaction_type} onChange={e => setForm(f => ({ ...f, transaction_type: e.target.value }))}><option value="Expense">Expense</option><option value="Income">Income</option></select></div>
                <div className="form-group"><label className="form-label">Frequency</label>
                  <select className="input-field" value={form.frequency} onChange={e => setForm(f => ({ ...f, frequency: e.target.value }))}>
                    {['Daily','Weekly','Monthly','Yearly'].map(x => <option key={x}>{x}</option>)}</select></div>
              </div>
              <div className="form-group"><label className="form-label">Account</label>
                <select className="input-field" value={form.account_id} onChange={e => setForm(f => ({ ...f, account_id: e.target.value }))} required>
                  <option value="">Select</option>{accounts.map(a => <option key={a.account_id} value={a.account_id}>{a.account_name}</option>)}</select></div>
              <div className="form-group"><label className="form-label">Category</label>
                <select className="input-field" value={form.category_id} onChange={e => setForm(f => ({ ...f, category_id: e.target.value }))} required>
                  <option value="">Select</option>{categories.filter(c => c.category_type === form.transaction_type).map(c => <option key={c.category_id} value={c.category_id}>{c.category_name}</option>)}</select></div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                <div className="form-group"><label className="form-label">Amount (PKR)</label>
                  <input className="input-field" type="number" min="0.01" step="0.01" value={form.amount} onChange={e => setForm(f => ({ ...f, amount: e.target.value }))} required /></div>
                <div className="form-group"><label className="form-label">Start date</label>
                  <input className="input-field" type="date" value={form.start_date} onChange={e => setForm(f => ({ ...f, start_date: e.target.value }))} required /></div>
              </div>
              <div className="form-group"><label className="form-label">Description</label>
                <input className="input-field" value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} /></div>
              <div className="modal-actions">
                <button type="button" className="btn btn-secondary" onClick={() => setModal(false)}>Cancel</button>
                <button type="submit" className="btn btn-primary" disabled={saving}>{saving ? 'Saving…' : 'Create'}</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

// transfers
export function TransfersPage() {
  const { user } = useAuth();
  const uid = user?.user_id;
  const [transfers, setTransfers] = useState([]);
  const [accounts, setAccounts]   = useState([]);
  const [modal, setModal]         = useState(false);
  const [form, setForm]           = useState({ from_account_id: '', to_account_id: '', amount: '', transfer_date: '', description: '' });
  const [error, setError]         = useState('');
  const [saving, setSaving]       = useState(false);

  const load = () => api.get(`/transfers/user/${uid}`).then(r => setTransfers(r.data));
  useEffect(() => { if (!uid) return; load(); api.get(`/accounts/user/${uid}`).then(r => setAccounts(r.data)); }, [uid]);

  const save = async (e) => {
    e.preventDefault(); setSaving(true); setError('');
    try {
      await api.post('/transfers', { ...form, user_id: uid, amount: parseFloat(form.amount) });
      setModal(false); load();
    } catch (err) { setError(err.response?.data?.error || 'Transfer failed.'); }
    finally { setSaving(false); }
  };

  return (
    <div style={{ maxWidth: 900 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
        <h1 className="page-title">Transfers</h1>
        <button className="btn btn-primary" onClick={() => { setForm({ from_account_id: '', to_account_id: '', amount: '', transfer_date: new Date().toISOString().split('T')[0], description: '' }); setError(''); setModal(true); }}>+ New transfer</button>
      </div>
      <div className="card" style={{ overflow: 'hidden' }}>
        <table className="data-table"><thead><tr><th>Date</th><th>From</th><th>To</th><th>Amount</th><th>Description</th></tr></thead>
          <tbody>
            {transfers.length === 0 ? <tr><td colSpan={5}><div className="empty-state"><div className="empty-state-icon">⇌</div><p>No transfers yet</p></div></td></tr>
              : transfers.map(t => (
              <tr key={t.transfer_id}>
                <td style={{ fontSize: 13, color: 'var(--text-secondary)' }}>{new Date(t.transfer_date).toLocaleDateString('en-PK')}</td>
                <td style={{ fontWeight: 500 }}>{t.from_account}</td>
                <td style={{ fontWeight: 500 }}>{t.to_account}</td>
                <td className="amount-expense">PKR {Number(t.amount).toLocaleString()}</td>
                <td style={{ fontSize: 13, color: 'var(--text-secondary)' }}>{t.description || '—'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {modal && (
        <div className="modal-overlay" onClick={e => e.target === e.currentTarget && setModal(false)}>
          <div className="modal">
            <div className="modal-title">New transfer</div>
            {error && <div className="error-msg">{error}</div>}
            <form onSubmit={save} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              <div className="form-group"><label className="form-label">From account</label>
                <select className="input-field" value={form.from_account_id} onChange={e => setForm(f => ({ ...f, from_account_id: e.target.value }))} required>
                  <option value="">Select</option>{accounts.map(a => <option key={a.account_id} value={a.account_id}>{a.account_name} — PKR {Number(a.current_balance).toLocaleString()}</option>)}</select></div>
              <div className="form-group"><label className="form-label">To account</label>
                <select className="input-field" value={form.to_account_id} onChange={e => setForm(f => ({ ...f, to_account_id: e.target.value }))} required>
                  <option value="">Select</option>{accounts.filter(a => a.account_id !== parseInt(form.from_account_id)).map(a => <option key={a.account_id} value={a.account_id}>{a.account_name}</option>)}</select></div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                <div className="form-group"><label className="form-label">Amount (PKR)</label>
                  <input className="input-field" type="number" min="0.01" step="0.01" value={form.amount} onChange={e => setForm(f => ({ ...f, amount: e.target.value }))} required /></div>
                <div className="form-group"><label className="form-label">Date</label>
                  <input className="input-field" type="date" value={form.transfer_date} onChange={e => setForm(f => ({ ...f, transfer_date: e.target.value }))} required /></div>
              </div>
              <div className="form-group"><label className="form-label">Description</label>
                <input className="input-field" value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} placeholder="Optional" /></div>
              <div className="modal-actions">
                <button type="button" className="btn btn-secondary" onClick={() => setModal(false)}>Cancel</button>
                <button type="submit" className="btn btn-primary" disabled={saving}>{saving ? 'Processing…' : 'Transfer'}</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

// budgetAlerts
export function AlertsPage() {
  const { user } = useAuth();
  const uid = user?.user_id;
  const [alerts, setAlerts] = useState([]);

  const load = async () => {
    await api.post(`/alerts/sync/${uid}`).catch(() => {});
    const r = await api.get(`/alerts/user/${uid}`);
    setAlerts(r.data);
  };
  useEffect(() => { if (uid) load(); }, [uid]);

  const markRead   = async (id) => { await api.put(`/alerts/${id}/read`);          load(); };
  const markAllRead = async () => { await api.put(`/alerts/user/${uid}/read-all`); load(); };
  const del        = async (id) => { await api.delete(`/alerts/${id}`);            load(); };

  const unread = alerts.filter(a => !a.is_read);

  return (
    <div style={{ maxWidth: 800 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
        <div>
          <h1 className="page-title">Alerts</h1>
          <p style={{ color: 'var(--text-secondary)', fontSize: 14, marginTop: 4 }}>{unread.length} unread</p>
        </div>
        {unread.length > 0 && <button className="btn btn-secondary" onClick={markAllRead}>Mark all as read</button>}
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        {alerts.length === 0 ? <div className="empty-state"><div className="empty-state-icon">◈</div><p>No alerts</p></div>
          : alerts.map(a => (
          <div key={a.alert_id} className="card" style={{
            padding: '16px 20px', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start',
            opacity: a.is_read ? 0.55 : 1,
            borderLeft: `3px solid ${a.alert_type === 'Exceeded' ? 'var(--red-500)' : 'var(--gold-400)'}`,
          }}>
            <div>
              <div style={{ fontWeight: 500, marginBottom: 3 }}>
                <span className={a.alert_type === 'Exceeded' ? 'badge badge-danger' : 'badge badge-warning'} style={{ marginRight: 8 }}>{a.alert_type}</span>
                {a.category_name}
              </div>
              <div style={{ fontSize: 13, color: 'var(--text-secondary)', marginBottom: 4 }}>{a.alert_message}</div>
              <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>
                {a.percentage_used}% used · {a.days_old === 0 ? 'Today' : `${a.days_old}d ago`}
              </div>
            </div>
            <div style={{ display: 'flex', gap: 6, flexShrink: 0, marginLeft: 12 }}>
              {!a.is_read && <button className="btn btn-secondary btn-sm" onClick={() => markRead(a.alert_id)}>Mark read</button>}
              <button className="btn btn-danger btn-sm" onClick={() => del(a.alert_id)}>Dismiss</button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

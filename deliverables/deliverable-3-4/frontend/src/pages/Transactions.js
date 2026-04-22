// src/pages/Transactions.js
import React, { useEffect, useState, useCallback } from 'react';
import api from '../api/axios';
import { useAuth } from '../context/AuthContext';

const fmt = (n) => 'PKR ' + Number(n || 0).toLocaleString('en-PK', { maximumFractionDigits: 2 });

const EMPTY_FORM = {
  account_id: '', category_id: '', transaction_type: 'Expense',
  amount: '', transaction_date: '', description: '', payment_method: '',
};

export default function Transactions() {
  const { user } = useAuth();
  const uid = user?.user_id;

  const [transactions, setTransactions] = useState([]);
  const [pagination,   setPagination]   = useState({ page: 1, limit: 20, total: 0, totalPages: 1 });
  const [accounts,     setAccounts]     = useState([]);
  const [categories,   setCategories]   = useState([]);
  const [loading,      setLoading]      = useState(true);
  const [modal,        setModal]        = useState(false);
  const [editing,      setEditing]      = useState(null);
  const [form,         setForm]         = useState(EMPTY_FORM);
  const [saving,       setSaving]       = useState(false);
  const [error,        setError]        = useState('');

  // Filters
  const [filters, setFilters] = useState({ search: '', type: '', category_id: '', date_from: '', date_to: '' });

  const fetchTransactions = useCallback(async (page = 1) => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ page, limit: 20 });
      if (filters.search)      params.set('search', filters.search);
      if (filters.type)        params.set('type', filters.type);
      if (filters.category_id) params.set('category_id', filters.category_id);
      if (filters.date_from)   params.set('date_from', filters.date_from);
      if (filters.date_to)     params.set('date_to', filters.date_to);

      const res = await api.get(`/transactions/user/${uid}?${params}`);
      setTransactions(res.data.data);
      setPagination(res.data.pagination);
    } catch { /* handled globally */ }
    finally { setLoading(false); }
  }, [uid, filters]);

  useEffect(() => {
    if (!uid) return;
    api.get(`/accounts/user/${uid}`).then(r => setAccounts(r.data));
    api.get(`/categories/user/${uid}`).then(r => setCategories(r.data));
  }, [uid]);

  useEffect(() => { fetchTransactions(1); }, [filters, fetchTransactions]);

  const openCreate = () => {
    setEditing(null);
    setForm({ ...EMPTY_FORM, transaction_date: new Date().toISOString().split('T')[0] });
    setError('');
    setModal(true);
  };

  const openEdit = (tx) => {
    setEditing(tx);
    setForm({
      account_id:       tx.account_id,
      category_id:      tx.category_id || '',
      transaction_type: tx.transaction_type,
      amount:           tx.amount,
      transaction_date: tx.transaction_date?.split('T')[0] || tx.transaction_date,
      description:      tx.description || '',
      payment_method:   tx.payment_method || '',
    });
    setError('');
    setModal(true);
  };

  const saveTransaction = async (e) => {
    e.preventDefault();
    setSaving(true); setError('');
    try {
      const payload = { ...form, user_id: uid, amount: parseFloat(form.amount) };
      if (editing) {
        await api.put(`/transactions/${editing.transaction_id}`, payload);
      } else {
        await api.post('/transactions', payload);
      }
      setModal(false);
      fetchTransactions(pagination.page);
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to save transaction.');
    } finally { setSaving(false); }
  };

  const deleteTransaction = async (id) => {
    if (!window.confirm('Delete this transaction?')) return;
    await api.delete(`/transactions/${id}`);
    fetchTransactions(pagination.page);
  };

  const filteredCategories = categories.filter(c => !form.transaction_type || c.category_type === form.transaction_type);

  return (
    <div style={{ maxWidth: 1000 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 24 }}>
        <div>
          <h1 className="page-title">Transactions</h1>
          <p style={{ color: 'var(--text-secondary)', fontSize: 14, marginTop: 4 }}>
            {pagination.total} total records
          </p>
        </div>
        <button className="btn btn-primary" onClick={openCreate}>+ Add transaction</button>
      </div>

      {/* Filters */}
      <div className="card" style={{ padding: '14px 18px', marginBottom: 20, display: 'flex', gap: 10, flexWrap: 'wrap', alignItems: 'center' }}>
        <input
          className="input-field" placeholder="Search…" style={{ maxWidth: 180 }}
          value={filters.search}
          onChange={e => setFilters(f => ({ ...f, search: e.target.value }))}
        />
        <select className="input-field" style={{ maxWidth: 140 }} value={filters.type}
          onChange={e => setFilters(f => ({ ...f, type: e.target.value }))}>
          <option value="">All types</option>
          <option value="Income">Income</option>
          <option value="Expense">Expense</option>
        </select>
        <select className="input-field" style={{ maxWidth: 160 }} value={filters.category_id}
          onChange={e => setFilters(f => ({ ...f, category_id: e.target.value }))}>
          <option value="">All categories</option>
          {categories.map(c => <option key={c.category_id} value={c.category_id}>{c.category_name}</option>)}
        </select>
        <input className="input-field" type="date" style={{ maxWidth: 150 }} value={filters.date_from}
          onChange={e => setFilters(f => ({ ...f, date_from: e.target.value }))} />
        <input className="input-field" type="date" style={{ maxWidth: 150 }} value={filters.date_to}
          onChange={e => setFilters(f => ({ ...f, date_to: e.target.value }))} />
        <button className="btn btn-secondary btn-sm" onClick={() => setFilters({ search: '', type: '', category_id: '', date_from: '', date_to: '' })}>
          Clear
        </button>
      </div>

      {/* Table */}
      <div className="card" style={{ overflow: 'hidden' }}>
        {loading ? <div className="spinner" /> : (
          <>
            <table className="data-table">
              <thead>
                <tr>
                  <th>Date</th>
                  <th>Description</th>
                  <th>Category</th>
                  <th>Account</th>
                  <th>Amount</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {transactions.length === 0 ? (
                  <tr><td colSpan={6}><div className="empty-state"><div className="empty-state-icon">⇄</div><p>No transactions found</p></div></td></tr>
                ) : transactions.map(tx => (
                  <tr key={tx.transaction_id}>
                    <td style={{ whiteSpace: 'nowrap', color: 'var(--text-secondary)', fontSize: 13 }}>
                      {new Date(tx.transaction_date).toLocaleDateString('en-PK')}
                    </td>
                    <td style={{ maxWidth: 200, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {tx.description || '—'}
                    </td>
                    <td>{tx.category_name || '—'}</td>
                    <td style={{ fontSize: 13, color: 'var(--text-secondary)' }}>{tx.account_name}</td>
                    <td>
                      <span className={tx.transaction_type === 'Income' ? 'amount-income' : 'amount-expense'}>
                        {tx.transaction_type === 'Income' ? '+' : '-'}{fmt(tx.amount)}
                      </span>
                    </td>
                    <td style={{ textAlign: 'right' }}>
                      <div style={{ display: 'flex', gap: 6, justifyContent: 'flex-end' }}>
                        <button className="btn btn-secondary btn-sm" onClick={() => openEdit(tx)}>Edit</button>
                        <button className="btn btn-danger btn-sm" onClick={() => deleteTransaction(tx.transaction_id)}>Delete</button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>

            {/* Pagination */}
            <div className="pagination">
              <button disabled={pagination.page === 1} onClick={() => fetchTransactions(pagination.page - 1)}>‹ Prev</button>
              {Array.from({ length: Math.min(pagination.totalPages, 7) }, (_, i) => i + 1).map(p => (
                <button key={p} className={pagination.page === p ? 'active' : ''} onClick={() => fetchTransactions(p)}>{p}</button>
              ))}
              <button disabled={pagination.page === pagination.totalPages} onClick={() => fetchTransactions(pagination.page + 1)}>Next ›</button>
            </div>
          </>
        )}
      </div>

      {/* Modal */}
      {modal && (
        <div className="modal-overlay" onClick={e => e.target === e.currentTarget && setModal(false)}>
          <div className="modal">
            <div className="modal-title">{editing ? 'Edit transaction' : 'New transaction'}</div>
            {error && <div className="error-msg">{error}</div>}
            <form onSubmit={saveTransaction} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                <div className="form-group">
                  <label className="form-label">Type</label>
                  <select className="input-field" value={form.transaction_type}
                    onChange={e => setForm(f => ({ ...f, transaction_type: e.target.value, category_id: '' }))}>
                    <option value="Expense">Expense</option>
                    <option value="Income">Income</option>
                  </select>
                </div>
                <div className="form-group">
                  <label className="form-label">Amount (PKR)</label>
                  <input className="input-field" type="number" min="0.01" step="0.01"
                    value={form.amount} onChange={e => setForm(f => ({ ...f, amount: e.target.value }))} required />
                </div>
              </div>
              <div className="form-group">
                <label className="form-label">Account</label>
                <select className="input-field" value={form.account_id}
                  onChange={e => setForm(f => ({ ...f, account_id: e.target.value }))} required>
                  <option value="">Select account</option>
                  {accounts.map(a => <option key={a.account_id} value={a.account_id}>{a.account_name}</option>)}
                </select>
              </div>
              <div className="form-group">
                <label className="form-label">Category</label>
                <select className="input-field" value={form.category_id}
                  onChange={e => setForm(f => ({ ...f, category_id: e.target.value }))}>
                  <option value="">Select category</option>
                  {filteredCategories.map(c => <option key={c.category_id} value={c.category_id}>{c.category_name}</option>)}
                </select>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                <div className="form-group">
                  <label className="form-label">Date</label>
                  <input className="input-field" type="date" value={form.transaction_date}
                    onChange={e => setForm(f => ({ ...f, transaction_date: e.target.value }))} required />
                </div>
                <div className="form-group">
                  <label className="form-label">Payment method</label>
                  <select className="input-field" value={form.payment_method}
                    onChange={e => setForm(f => ({ ...f, payment_method: e.target.value }))}>
                    <option value="">Select</option>
                    {['Cash', 'Debit Card', 'Credit Card', 'Bank Transfer', 'Digital Wallet'].map(m =>
                      <option key={m} value={m}>{m}</option>)}
                  </select>
                </div>
              </div>
              <div className="form-group">
                <label className="form-label">Description</label>
                <input className="input-field" value={form.description}
                  onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
                  placeholder="Optional note" />
              </div>
              <div className="modal-actions">
                <button type="button" className="btn btn-secondary" onClick={() => setModal(false)}>Cancel</button>
                <button type="submit" className="btn btn-primary" disabled={saving}>
                  {saving ? 'Saving…' : editing ? 'Save changes' : 'Add transaction'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

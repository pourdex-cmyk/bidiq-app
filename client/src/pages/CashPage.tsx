import { useEffect, useState } from 'react';
import { Plus, Wallet } from 'lucide-react';
import api from '@/services/api';
import PageWrapper from '@/components/layout/PageWrapper';
import PageHeader from '@/components/layout/PageHeader';
import Card from '@/components/ui/Card';
import Button from '@/components/ui/Button';
import Table from '@/components/ui/Table';
import Badge from '@/components/ui/Badge';
import Tabs from '@/components/ui/Tabs';
import { formatCurrency, formatDate } from '@/utils/format';

export default function CashPage() {
  const [accounts, setAccounts] = useState<any[]>([]);
  const [transactions, setTransactions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState('accounts');

  useEffect(() => {
    Promise.all([
      api.get('/v1/cash/accounts'),
      api.get('/v1/cash/transactions', { params: { limit: 50 } }),
    ]).then(([a, t]) => {
      setAccounts(a.data.data || []);
      setTransactions(t.data.data || []);
    }).finally(() => setLoading(false));
  }, []);

  const totalBalance = accounts.reduce((s, a) => s + (a.current_balance || 0), 0);

  return (
    <PageWrapper>
      <PageHeader title="Cash Management" subtitle={`Total balance: ${formatCurrency(totalBalance)}`}
        actions={<Button iconLeft={<Plus className="w-4 h-4" />} variant="secondary">Add Transaction</Button>} />

      <Tabs tabs={[{ id: 'accounts', label: 'Accounts', count: accounts.length }, { id: 'transactions', label: 'Transactions', count: transactions.length }]} active={tab} onChange={setTab} />

      {tab === 'accounts' && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {accounts.map((a) => (
            <Card key={a.id} className="space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-semibold text-[var(--text-primary)]">{a.name}</p>
                  {a.institution && <p className="text-xs text-[var(--text-tertiary)]">{a.institution}</p>}
                </div>
                <Badge size="sm" variant="info" className="capitalize">{a.account_type?.replace('_', ' ')}</Badge>
              </div>
              <div>
                <p className="text-xs text-[var(--text-tertiary)]">Balance</p>
                <p className="text-xl font-mono font-semibold text-[var(--text-primary)]">{formatCurrency(a.current_balance)}</p>
              </div>
              {a.account_number_last4 && <p className="text-xs text-[var(--text-tertiary)]">••••{a.account_number_last4}</p>}
            </Card>
          ))}
          {accounts.length === 0 && <p className="text-sm text-[var(--text-tertiary)] col-span-3 py-8 text-center">No accounts</p>}
        </div>
      )}

      {tab === 'transactions' && (
        <Table
          columns={[
            { key: 'transaction_date', header: 'Date', render: (r: any) => formatDate(r.transaction_date) },
            { key: 'description', header: 'Description' },
            { key: 'cash_accounts', header: 'Account', render: (r: any) => r.cash_accounts?.name || '—' },
            { key: 'category', header: 'Category', render: (r: any) => <span className="capitalize text-xs">{r.category?.replace('_', ' ')}</span> },
            { key: 'amount', header: 'Amount', align: 'right', render: (r: any) => (
              <span className={`font-mono font-medium ${r.transaction_type === 'credit' ? 'text-success' : 'text-danger'}`}>
                {r.transaction_type === 'credit' ? '+' : '-'}{formatCurrency(r.amount)}
              </span>
            )},
            { key: 'is_reconciled', header: 'Reconciled', render: (r: any) => r.is_reconciled ? <Badge size="sm" variant="success" dot>Yes</Badge> : <Badge size="sm" variant="default">No</Badge> },
          ]}
          data={transactions}
          loading={loading}
          emptyText="No transactions"
        />
      )}
    </PageWrapper>
  );
}

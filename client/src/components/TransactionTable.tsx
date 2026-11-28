import React from 'react';
import { Receipt } from 'lucide-react';
import { Link } from 'react-router-dom';
import { Transaction } from '../types/wepay';
import { formatCustomAnswerValue, formatDate, formatNaira } from '../utils/formatters';
import { StatusBadge } from './ui/StatusBadge';

interface TransactionTableProps {
  transactions: Transaction[];
  showCollectionColumn?: boolean;
  showQuantityColumn?: boolean;
}

function getDisplayResponses(tx: Transaction): Array<{ label: string; value: string }> {
  if (tx.customFieldAnswers && tx.customFieldAnswers.length > 0) {
    return tx.customFieldAnswers.map((ans) => ({
      label: ans.label,
      value: formatCustomAnswerValue(ans.value),
    }));
  }
  if (tx.customResponses) {
    return Object.entries(tx.customResponses).map(([label, val]) => ({
      label,
      value: formatCustomAnswerValue(val),
    }));
  }
  return [];
}

export const TransactionTable: React.FC<TransactionTableProps> = ({
  transactions,
  showCollectionColumn = false,
  showQuantityColumn = true,
}) => {
  return (
    <>
      {/* Desktop / Tablet High-Density Table */}
      <div className="hidden md:block bg-white border border-slate-200 rounded-xl overflow-hidden shadow-lg shadow-slate-900/15">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-50 text-xs font-semibold text-slate-600">
                <th className="py-3 px-4">Contributor</th>
                {showCollectionColumn && <th className="py-3 px-4">Collection</th>}
                <th className="py-3 px-4">Reference</th>
                {showQuantityColumn && <th className="py-3 px-4 text-right">Qty</th>}
                <th className="py-3 px-4 text-right">Contributed</th>
                <th className="py-3 px-4 text-right">Fee</th>
                <th className="py-3 px-4 text-right">Total Paid</th>
                <th className="py-3 px-4">Status</th>
                <th className="py-3 px-4">Date</th>
                <th className="py-3 px-4 text-right">Receipt</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 text-sm">
              {transactions.map((tx) => {
                const answers = getDisplayResponses(tx);
                return (
                  <tr key={tx._id} className="hover:bg-slate-50/80 transition-colors">
                    <td className="py-3 px-4 align-top">
                      <p className="font-medium text-slate-900">{tx.contributorName}</p>
                      <p className="text-xs text-slate-500 mt-0.5">
                        {tx.contributorEmail} · {tx.contributorPhone}
                      </p>
                      {answers.length > 0 && (
                        <div className="mt-1.5 space-y-0.5 text-xs text-slate-600">
                          {answers.map((ans, idx) => (
                            <div key={`${ans.label}-${idx}`}>
                              <span className="text-slate-400">{ans.label}:</span>{' '}
                              <span className="font-medium text-slate-700">{ans.value}</span>
                            </div>
                          ))}
                        </div>
                      )}
                    </td>
                    {showCollectionColumn && (
                      <td className="py-3 px-4 align-top">
                        <Link
                          to={`/dashboard/collections/${tx.collectionId}`}
                          className="font-medium text-slate-800 hover:text-teal-700 transition-colors"
                        >
                          {tx.collectionTitle || 'Collection'}
                        </Link>
                      </td>
                    )}
                    <td className="py-3 px-4 align-top font-mono-num text-xs text-slate-700">
                      <div>{tx.txnRef}</div>
                      {tx.interswitchRef && (
                        <div className="text-slate-400 mt-0.5">{tx.interswitchRef}</div>
                      )}
                    </td>
                    {showQuantityColumn && (
                      <td className="py-3 px-4 align-top text-right font-mono-num text-slate-700">
                        {tx.quantity ?? 1}
                      </td>
                    )}
                    <td className="py-3 px-4 align-top text-right font-mono-num text-slate-800">
                      {formatNaira(tx.baseAmount)}
                    </td>
                    <td className="py-3 px-4 align-top text-right font-mono-num text-slate-500">
                      {formatNaira(tx.feeAmount)}
                    </td>
                    <td className="py-3 px-4 align-top text-right font-mono-num font-semibold text-slate-900">
                      {formatNaira(tx.totalPaid)}
                    </td>
                    <td className="py-3 px-4 align-top">
                      <StatusBadge status={tx.status} />
                    </td>
                    <td className="py-3 px-4 align-top text-xs text-slate-600 whitespace-nowrap">
                      {formatDate(tx.paidAt || tx.createdAt, true)}
                    </td>
                    <td className="py-3 px-4 align-top text-right">
                      <Link
                        to={`/receipt/${tx.receiptCode}`}
                        className="inline-flex items-center gap-1 text-xs font-medium text-teal-700 hover:text-teal-800 whitespace-nowrap"
                      >
                        <Receipt className="h-3.5 w-3.5" />
                        <span>View</span>
                      </Link>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Mobile Responsive Transaction Cards */}
      <div className="md:hidden space-y-3">
        {transactions.map((tx) => {
          const answers = getDisplayResponses(tx);
          return (
            <div
              key={tx._id}
              className="bg-white border border-slate-200 rounded-xl p-4 space-y-3 shadow-lg shadow-slate-900/15"
            >
              <div className="flex items-start justify-between gap-2">
                <div>
                  <p className="font-semibold text-slate-900 text-sm">{tx.contributorName}</p>
                  <p className="text-xs text-slate-500 mt-0.5">{tx.contributorEmail}</p>
                  <p className="text-xs text-slate-500">{tx.contributorPhone}</p>
                </div>
                <StatusBadge status={tx.status} />
              </div>

              {showCollectionColumn && tx.collectionTitle && (
                <p className="text-xs font-medium text-slate-700">{tx.collectionTitle}</p>
              )}

              {answers.length > 0 && (
                <div className="pt-2 border-t border-slate-100 space-y-1 text-xs">
                  {answers.map((ans, idx) => (
                    <div key={`${ans.label}-${idx}`} className="flex justify-between gap-3">
                      <span className="text-slate-500">{ans.label}</span>
                      <span className="font-medium text-slate-800 text-right">{ans.value}</span>
                    </div>
                  ))}
                </div>
              )}

            <div className="grid grid-cols-2 gap-2 pt-2 border-t border-slate-100 text-xs">
              <div>
                <span className="text-slate-500 block">Total Paid</span>
                <span className="font-mono-num font-semibold text-sm text-slate-900">
                  {formatNaira(tx.totalPaid)}
                </span>
              </div>
              <div className="text-right">
                <span className="text-slate-500 block">Contributed / Fee</span>
                <span className="font-mono-num text-slate-700">
                  {formatNaira(tx.baseAmount)} + {formatNaira(tx.feeAmount)}
                </span>
              </div>
            </div>

              <div className="flex items-center justify-between pt-2 border-t border-slate-100 text-xs text-slate-500">
                <span className="font-mono-num truncate max-w-[180px]">{tx.txnRef}</span>
                <Link
                  to={`/receipt/${tx.receiptCode}`}
                  className="inline-flex items-center gap-1 font-medium text-teal-700"
                >
                  <Receipt className="h-3.5 w-3.5" />
                  <span>Receipt</span>
                </Link>
              </div>
            </div>
          );
        })}
      </div>
    </>
  );
};

'use client';

import { useEffect, useState } from 'react';
import { useParams, useSearchParams, useRouter } from 'next/navigation';

interface TradeData {
  symbol: string;
  action: 'buy' | 'sell';
  quantity: number;
  isOption: boolean;
  optionSymbol?: string;
  estimatedTotal?: number;
  confidence?: number;
  reason?: string;
}

interface Approval {
  id: string;
  tradeData: TradeData;
  reasonRequired: string;
  status: string;
  expiresAt: string;
  createdAt: string;
}

export default function ApprovalPage() {
  const params = useParams();
  const searchParams = useSearchParams();
  const router = useRouter();
  const id = params.id as string;
  const action = searchParams.get('action');
  
  const [approval, setApproval] = useState<Approval | null>(null);
  const [loading, setLoading] = useState(true);
  const [responding, setResponding] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  useEffect(() => {
    fetchApproval();
  }, [id]);

  useEffect(() => {
    // Auto-respond if action is in URL (from email click)
    if (action && approval && approval.status === 'pending') {
      if (action === 'approve' || action === 'reject') {
        handleResponse(action);
      }
    }
  }, [action, approval]);

  async function fetchApproval() {
    try {
      const res = await fetch(`/api/approvals/${id}`);
      if (!res.ok) {
        throw new Error('Approval not found');
      }
      const data = await res.json();
      setApproval(data.approval);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  async function handleResponse(responseAction: 'approve' | 'reject') {
    setResponding(true);
    setError(null);
    
    try {
      const res = await fetch('/api/approvals/respond', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ approvalId: id, action: responseAction }),
      });
      
      const data = await res.json();
      
      if (!res.ok) {
        throw new Error(data.error || 'Failed to respond');
      }
      
      setSuccess(responseAction === 'approve' 
        ? '✅ Trade approved and executed!' 
        : '❌ Trade rejected.');
      setApproval(data.approval);
      
    } catch (err: any) {
      setError(err.message);
    } finally {
      setResponding(false);
    }
  }

  function getTimeRemaining(expiresAt: string): string {
    const diff = new Date(expiresAt).getTime() - Date.now();
    if (diff <= 0) return 'Expired';
    const hours = Math.floor(diff / (1000 * 60 * 60));
    const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
    return hours > 0 ? `${hours}h ${minutes}m` : `${minutes}m`;
  }

  function getReasonText(reason: string): string {
    const reasons: Record<string, string> = {
      'options_trade': 'Options trade',
      'large_position': 'Large position (>10% of portfolio)',
      'new_symbol': 'First time trading this symbol',
      'day_trade': 'Day trade (0DTE)',
      'short_position': 'Short position',
    };
    return reasons[reason] || reason;
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center">
        <div className="text-white text-xl">Loading...</div>
      </div>
    );
  }

  if (error && !approval) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center">
        <div className="bg-red-900/50 text-red-200 p-6 rounded-lg max-w-md">
          <h2 className="text-xl font-bold mb-2">Error</h2>
          <p>{error}</p>
          <button 
            onClick={() => router.push('/dashboard')}
            className="mt-4 px-4 py-2 bg-gray-700 rounded hover:bg-gray-600"
          >
            Go to Dashboard
          </button>
        </div>
      </div>
    );
  }

  if (!approval) return null;

  const trade = approval.tradeData;
  const isPending = approval.status === 'pending';
  const timeRemaining = getTimeRemaining(approval.expiresAt);

  return (
    <div className="min-h-screen bg-gray-900 py-12 px-4">
      <div className="max-w-lg mx-auto">
        <div className="bg-gray-800 rounded-xl shadow-2xl overflow-hidden">
          {/* Header */}
          <div className="bg-gradient-to-r from-blue-600 to-purple-600 px-6 py-4">
            <h1 className="text-2xl font-bold text-white">Trade Approval</h1>
            <p className="text-blue-100 text-sm">Review and respond to this trade</p>
          </div>

          {/* Trade Details */}
          <div className="p-6">
            <div className="bg-gray-700/50 rounded-lg p-4 mb-6">
              <div className="flex items-center justify-between mb-3">
                <span className={`px-3 py-1 rounded-full text-sm font-medium ${
                  trade.action === 'buy' ? 'bg-green-500/20 text-green-400' : 'bg-red-500/20 text-red-400'
                }`}>
                  {trade.action.toUpperCase()}
                </span>
                <span className={`px-3 py-1 rounded-full text-sm ${
                  isPending ? 'bg-yellow-500/20 text-yellow-400' : 
                  approval.status === 'approved' ? 'bg-green-500/20 text-green-400' :
                  'bg-red-500/20 text-red-400'
                }`}>
                  {approval.status.toUpperCase()}
                </span>
              </div>

              <h2 className="text-3xl font-bold text-white mb-1">
                {trade.isOption && trade.optionSymbol ? trade.optionSymbol : trade.symbol}
              </h2>
              <p className="text-gray-400">
                {trade.quantity} {trade.isOption ? 'contracts' : 'shares'}
              </p>

              {trade.estimatedTotal && (
                <p className="text-2xl text-white mt-3">
                  ${trade.estimatedTotal.toLocaleString()}
                </p>
              )}

              {trade.confidence && (
                <div className="mt-3 flex items-center gap-2">
                  <span className="text-gray-400">Confidence:</span>
                  <span className="text-white font-medium">{trade.confidence}%</span>
                </div>
              )}

              {trade.reason && (
                <p className="mt-3 text-gray-300 text-sm">{trade.reason}</p>
              )}
            </div>

            {/* Reason for approval */}
            <div className="bg-yellow-500/10 border border-yellow-500/30 rounded-lg p-4 mb-6">
              <p className="text-yellow-400 text-sm">
                ⚠️ Requires approval: {getReasonText(approval.reasonRequired)}
              </p>
            </div>

            {/* Time remaining */}
            {isPending && (
              <div className="bg-blue-500/10 border border-blue-500/30 rounded-lg p-4 mb-6">
                <p className="text-blue-400 text-sm">
                  ⏰ Auto-executes in <strong>{timeRemaining}</strong> if no response
                </p>
              </div>
            )}

            {/* Success/Error messages */}
            {success && (
              <div className="bg-green-500/20 border border-green-500/30 rounded-lg p-4 mb-6">
                <p className="text-green-400">{success}</p>
              </div>
            )}

            {error && (
              <div className="bg-red-500/20 border border-red-500/30 rounded-lg p-4 mb-6">
                <p className="text-red-400">{error}</p>
              </div>
            )}

            {/* Action buttons */}
            {isPending && (
              <div className="flex gap-4">
                <button
                  onClick={() => handleResponse('approve')}
                  disabled={responding}
                  className="flex-1 bg-green-600 hover:bg-green-500 disabled:bg-green-800 
                           text-white font-bold py-3 px-6 rounded-lg transition-colors"
                >
                  {responding ? 'Processing...' : '✓ Approve'}
                </button>
                <button
                  onClick={() => handleResponse('reject')}
                  disabled={responding}
                  className="flex-1 bg-red-600 hover:bg-red-500 disabled:bg-red-800 
                           text-white font-bold py-3 px-6 rounded-lg transition-colors"
                >
                  {responding ? 'Processing...' : '✗ Reject'}
                </button>
              </div>
            )}

            {!isPending && (
              <button
                onClick={() => router.push('/dashboard')}
                className="w-full bg-gray-700 hover:bg-gray-600 text-white font-medium 
                         py-3 px-6 rounded-lg transition-colors"
              >
                Go to Dashboard
              </button>
            )}
          </div>
        </div>

        {/* Settings link */}
        <p className="text-center text-gray-500 text-sm mt-6">
          <a href="/settings/approvals" className="hover:text-gray-300 underline">
            Manage approval settings
          </a>
        </p>
      </div>
    </div>
  );
}

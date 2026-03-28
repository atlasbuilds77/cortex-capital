'use client';

import { useState } from 'react';
import {
  Search,
  Filter,
  MoreHorizontal,
  Eye,
  Ban,
  ArrowUpCircle,
  ChevronDown,
  ChevronUp,
  Check,
  X,
} from 'lucide-react';

type SortField = 'name' | 'email' | 'tier' | 'aum' | 'joinedAt' | 'status';
type SortDirection = 'asc' | 'desc';

// TODO: Replace with API call to fetch users
const users = [
  {
    id: 1,
    name: 'John Smith',
    email: 'john.s@example.com',
    avatar: 'JS',
    tier: 'Partner',
    status: 'active',
    brokerConnected: true,
    aum: 125000,
    joinedAt: '2024-01-15',
    lastActive: '2 hours ago',
  },
  {
    id: 2,
    name: 'Sarah Johnson',
    email: 'sarah.j@example.com',
    avatar: 'SJ',
    tier: 'Operator',
    status: 'active',
    brokerConnected: true,
    aum: 45000,
    joinedAt: '2024-02-20',
    lastActive: '5 minutes ago',
  },
  {
    id: 3,
    name: 'Mike Wilson',
    email: 'mike.w@example.com',
    avatar: 'MW',
    tier: 'Scout',
    status: 'active',
    brokerConnected: false,
    aum: 0,
    joinedAt: '2024-03-10',
    lastActive: '1 day ago',
  },
  {
    id: 4,
    name: 'Emma Davis',
    email: 'emma.d@example.com',
    avatar: 'ED',
    tier: 'Partner',
    status: 'active',
    brokerConnected: true,
    aum: 890000,
    joinedAt: '2023-11-05',
    lastActive: '30 minutes ago',
  },
  {
    id: 5,
    name: 'Alex Chen',
    email: 'alex.c@example.com',
    avatar: 'AC',
    tier: 'Operator',
    status: 'suspended',
    brokerConnected: true,
    aum: 32000,
    joinedAt: '2024-01-28',
    lastActive: '1 week ago',
  },
  {
    id: 6,
    name: 'Lisa Park',
    email: 'lisa.p@example.com',
    avatar: 'LP',
    tier: 'Partner',
    status: 'active',
    brokerConnected: true,
    aum: 234000,
    joinedAt: '2023-12-18',
    lastActive: '1 hour ago',
  },
  {
    id: 7,
    name: 'David Brown',
    email: 'david.b@example.com',
    avatar: 'DB',
    tier: 'Scout',
    status: 'pending',
    brokerConnected: false,
    aum: 0,
    joinedAt: '2024-03-18',
    lastActive: 'Never',
  },
  {
    id: 8,
    name: 'Jennifer Lee',
    email: 'jennifer.l@example.com',
    avatar: 'JL',
    tier: 'Operator',
    status: 'active',
    brokerConnected: true,
    aum: 67000,
    joinedAt: '2024-02-05',
    lastActive: '3 hours ago',
  },
];

const tierColors: Record<string, string> = {
  Scout: 'bg-slate-500/20 text-slate-300',
  Operator: 'bg-purple-500/20 text-purple-300',
  Partner: 'bg-amber-500/20 text-amber-300',
};

const statusColors: Record<string, string> = {
  active: 'bg-green-500/20 text-green-300',
  suspended: 'bg-red-500/20 text-red-300',
  pending: 'bg-yellow-500/20 text-yellow-300',
};

export default function UsersPage() {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedTier, setSelectedTier] = useState<string>('all');
  const [selectedStatus, setSelectedStatus] = useState<string>('all');
  const [sortField, setSortField] = useState<SortField>('joinedAt');
  const [sortDirection, setSortDirection] = useState<SortDirection>('desc');
  const [openDropdown, setOpenDropdown] = useState<number | null>(null);

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('asc');
    }
  };

  const filteredUsers = users
    .filter((user) => {
      const matchesSearch =
        user.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        user.email.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesTier = selectedTier === 'all' || user.tier === selectedTier;
      const matchesStatus = selectedStatus === 'all' || user.status === selectedStatus;
      return matchesSearch && matchesTier && matchesStatus;
    })
    .sort((a, b) => {
      let comparison = 0;
      switch (sortField) {
        case 'name':
          comparison = a.name.localeCompare(b.name);
          break;
        case 'email':
          comparison = a.email.localeCompare(b.email);
          break;
        case 'tier':
          comparison = a.tier.localeCompare(b.tier);
          break;
        case 'aum':
          comparison = a.aum - b.aum;
          break;
        case 'joinedAt':
          comparison = new Date(a.joinedAt).getTime() - new Date(b.joinedAt).getTime();
          break;
        case 'status':
          comparison = a.status.localeCompare(b.status);
          break;
      }
      return sortDirection === 'asc' ? comparison : -comparison;
    });

  const SortIcon = ({ field }: { field: SortField }) => {
    if (sortField !== field) return <ChevronDown className="w-4 h-4 text-gray-500" />;
    return sortDirection === 'asc' ? (
      <ChevronUp className="w-4 h-4 text-purple-400" />
    ) : (
      <ChevronDown className="w-4 h-4 text-purple-400" />
    );
  };

  return (
    <div className="space-y-6">
      {/* Header with filters */}
      <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
          <input
            type="text"
            placeholder="Search users..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 bg-slate-900/50 border border-purple-500/20 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-purple-500/50"
          />
        </div>
        <div className="flex gap-3">
          <select
            value={selectedTier}
            onChange={(e) => setSelectedTier(e.target.value)}
            className="px-4 py-2.5 bg-slate-900/50 border border-purple-500/20 rounded-lg text-white focus:outline-none focus:border-purple-500/50"
            aria-label="Filter by tier"
          >
            <option value="all">All Tiers</option>
            <option value="Scout">Scout</option>
            <option value="Operator">Operator</option>
            <option value="Partner">Partner</option>
          </select>
          <select
            value={selectedStatus}
            onChange={(e) => setSelectedStatus(e.target.value)}
            className="px-4 py-2.5 bg-slate-900/50 border border-purple-500/20 rounded-lg text-white focus:outline-none focus:border-purple-500/50"
          >
            <option value="all">All Status</option>
            <option value="active">Active</option>
            <option value="suspended">Suspended</option>
            <option value="pending">Pending</option>
          </select>
        </div>
      </div>

      {/* Stats cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: 'Total Users', value: users.length, color: 'purple' },
          { label: 'Active', value: users.filter((u) => u.status === 'active').length, color: 'green' },
          { label: 'Broker Connected', value: users.filter((u) => u.brokerConnected).length, color: 'blue' },
          { label: 'Total AUM', value: `$${(users.reduce((sum, u) => sum + u.aum, 0) / 1000000).toFixed(2)}M`, color: 'cyan' },
        ].map((stat) => (
          <div
            key={stat.label}
            className="rounded-lg bg-slate-900/50 border border-purple-500/20 p-4"
          >
            <p className="text-sm text-gray-400">{stat.label}</p>
            <p className={`text-2xl font-bold text-${stat.color}-400 mt-1`}>{stat.value}</p>
          </div>
        ))}
      </div>

      {/* Users table */}
      <div className="rounded-xl bg-slate-900/50 backdrop-blur-xl border border-purple-500/20 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-purple-500/20">
                <th
                  className="px-6 py-4 text-left text-sm font-medium text-gray-400 cursor-pointer hover:text-white"
                  onClick={() => handleSort('name')}
                >
                  <div className="flex items-center gap-2">
                    User <SortIcon field="name" />
                  </div>
                </th>
                <th
                  className="px-6 py-4 text-left text-sm font-medium text-gray-400 cursor-pointer hover:text-white"
                  onClick={() => handleSort('tier')}
                >
                  <div className="flex items-center gap-2">
                    Tier <SortIcon field="tier" />
                  </div>
                </th>
                <th
                  className="px-6 py-4 text-left text-sm font-medium text-gray-400 cursor-pointer hover:text-white"
                  onClick={() => handleSort('status')}
                >
                  <div className="flex items-center gap-2">
                    Status <SortIcon field="status" />
                  </div>
                </th>
                <th className="px-6 py-4 text-left text-sm font-medium text-gray-400">
                  Broker
                </th>
                <th
                  className="px-6 py-4 text-left text-sm font-medium text-gray-400 cursor-pointer hover:text-white"
                  onClick={() => handleSort('aum')}
                >
                  <div className="flex items-center gap-2">
                    AUM <SortIcon field="aum" />
                  </div>
                </th>
                <th
                  className="px-6 py-4 text-left text-sm font-medium text-gray-400 cursor-pointer hover:text-white"
                  onClick={() => handleSort('joinedAt')}
                >
                  <div className="flex items-center gap-2">
                    Joined <SortIcon field="joinedAt" />
                  </div>
                </th>
                <th className="px-6 py-4 text-right text-sm font-medium text-gray-400">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-purple-500/10">
              {filteredUsers.map((user) => (
                <tr key={user.id} className="hover:bg-white/5 transition-colors">
                  <td className="px-6 py-4">
                    <div className="flex items-center space-x-3">
                      <div className="w-10 h-10 bg-purple-600 rounded-full flex items-center justify-center text-sm font-bold text-white">
                        {user.avatar}
                      </div>
                      <div>
                        <p className="text-white font-medium">{user.name}</p>
                        <p className="text-gray-500 text-sm">{user.email}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <span className={`px-3 py-1 rounded-full text-xs font-medium ${tierColors[user.tier]}`}>
                      {user.tier}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <span className={`px-3 py-1 rounded-full text-xs font-medium capitalize ${statusColors[user.status]}`}>
                      {user.status}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    {user.brokerConnected ? (
                      <Check className="w-5 h-5 text-green-400" />
                    ) : (
                      <X className="w-5 h-5 text-gray-500" />
                    )}
                  </td>
                  <td className="px-6 py-4">
                    <span className="text-white font-mono">
                      ${user.aum.toLocaleString()}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <div>
                      <p className="text-white text-sm">{new Date(user.joinedAt).toLocaleDateString()}</p>
                      <p className="text-gray-500 text-xs">{user.lastActive}</p>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="relative flex justify-end">
                      <button
                        onClick={() => setOpenDropdown(openDropdown === user.id ? null : user.id)}
                        className="p-2 hover:bg-white/10 rounded-lg transition-colors"
                      >
                        <MoreHorizontal className="w-5 h-5 text-gray-400" />
                      </button>
                      {openDropdown === user.id && (
                        <div className="absolute right-0 top-full mt-1 w-48 bg-slate-800 border border-purple-500/20 rounded-lg shadow-xl z-10">
                          <button className="w-full flex items-center space-x-2 px-4 py-3 hover:bg-white/5 text-left text-white text-sm">
                            <Eye className="w-4 h-4" />
                            <span>View Details</span>
                          </button>
                          <button className="w-full flex items-center space-x-2 px-4 py-3 hover:bg-white/5 text-left text-white text-sm">
                            <ArrowUpCircle className="w-4 h-4" />
                            <span>Upgrade Tier</span>
                          </button>
                          <button className="w-full flex items-center space-x-2 px-4 py-3 hover:bg-white/5 text-left text-red-400 text-sm">
                            <Ban className="w-4 h-4" />
                            <span>{user.status === 'suspended' ? 'Unsuspend' : 'Suspend'}</span>
                          </button>
                        </div>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        <div className="flex items-center justify-between px-6 py-4 border-t border-purple-500/20">
          <p className="text-sm text-gray-400">
            Showing {filteredUsers.length} of {users.length} users
          </p>
          <div className="flex space-x-2">
            <button className="px-4 py-2 bg-slate-800 border border-purple-500/20 rounded-lg text-gray-400 hover:text-white hover:bg-slate-700 transition-colors">
              Previous
            </button>
            <button className="px-4 py-2 bg-purple-600 rounded-lg text-white font-medium">
              1
            </button>
            <button className="px-4 py-2 bg-slate-800 border border-purple-500/20 rounded-lg text-gray-400 hover:text-white hover:bg-slate-700 transition-colors">
              2
            </button>
            <button className="px-4 py-2 bg-slate-800 border border-purple-500/20 rounded-lg text-gray-400 hover:text-white hover:bg-slate-700 transition-colors">
              Next
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

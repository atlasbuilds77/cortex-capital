'use client';

import { Card, AreaChart, DonutChart, BarList, Title, Metric, Text, Flex, BadgeDelta, Grid, Col } from '@tremor/react';
import { Users, DollarSign, TrendingUp, CreditCard, Activity, ArrowUpRight, ArrowDownRight } from 'lucide-react';

const userGrowthData = [
  { date: 'Jan', users: 120 },
  { date: 'Feb', users: 145 },
  { date: 'Mar', users: 178 },
  { date: 'Apr', users: 234 },
  { date: 'May', users: 289 },
  { date: 'Jun', users: 356 },
  { date: 'Jul', users: 412 },
  { date: 'Aug', users: 489 },
  { date: 'Sep', users: 534 },
  { date: 'Oct', users: 612 },
  { date: 'Nov', users: 689 },
  { date: 'Dec', users: 756 },
];

const revenueData = [
  { date: 'Jan', revenue: 12400 },
  { date: 'Feb', revenue: 14500 },
  { date: 'Mar', revenue: 17800 },
  { date: 'Apr', revenue: 23400 },
  { date: 'May', revenue: 28900 },
  { date: 'Jun', revenue: 35600 },
  { date: 'Jul', revenue: 41200 },
  { date: 'Aug', revenue: 48900 },
  { date: 'Sep', revenue: 53400 },
  { date: 'Oct', revenue: 61200 },
  { date: 'Nov', revenue: 68900 },
  { date: 'Dec', revenue: 75600 },
];

const subscriptionData = [
  { name: 'Recovery ($29/mo)', value: 0 },
  { name: 'Scout ($49/mo)', value: 0 },
  { name: 'Operator ($99/mo)', value: 0 },
];

// Our actual 7 AI agents from the Cortex Capital system
const agents = [
  { name: 'ANALYST', role: 'Market Analysis', description: 'Analyzes market conditions and trends', status: 'active' },
  { name: 'STRATEGIST', role: 'Strategy Planning', description: 'Develops trading strategies based on analysis', status: 'active' },
  { name: 'EXECUTOR', role: 'Trade Execution', description: 'Executes trades with optimal timing', status: 'active' },
  { name: 'REPORTER', role: 'Performance Reporting', description: 'Generates reports and insights', status: 'active' },
  { name: 'OPTIONS_STRATEGIST', role: 'Options Analysis', description: 'Specializes in options flow and strategies', status: 'active' },
  { name: 'DAY_TRADER', role: 'Intraday Trading', description: 'Handles short-term day trading opportunities', status: 'active' },
  { name: 'MOMENTUM', role: 'Momentum Plays', description: 'Identifies and trades momentum setups', status: 'active' },
];

const stats = [
  {
    title: 'Total Users',
    metric: '0',
    delta: 'Pre-launch',
    deltaType: 'neutral' as const,
    icon: Users,
    color: 'purple',
  },
  {
    title: 'Active Subscriptions',
    metric: '0',
    delta: 'Pre-launch',
    deltaType: 'neutral' as const,
    icon: CreditCard,
    color: 'blue',
  },
  {
    title: 'Paper Trading AUM',
    metric: '$98,863',
    delta: 'Alpaca Paper',
    deltaType: 'increase' as const,
    icon: DollarSign,
    color: 'green',
  },
  {
    title: 'MRR Target',
    metric: '$5,000',
    delta: 'Goal',
    deltaType: 'neutral' as const,
    icon: TrendingUp,
    color: 'cyan',
  },
];

export default function AdminDashboard() {
  return (
    <div className="space-y-6">
      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {stats.map((stat) => (
          <div
            key={stat.title}
            className="relative overflow-hidden rounded-xl bg-slate-900/50 backdrop-blur-xl border border-purple-500/20 p-6"
          >
            <div className="flex items-start justify-between">
              <div>
                <p className="text-sm text-gray-400">{stat.title}</p>
                <p className="mt-2 text-3xl font-bold text-white">{stat.metric}</p>
                <div className="mt-2 flex items-center space-x-1">
                  {stat.deltaType === 'increase' ? (
                    <ArrowUpRight className="w-4 h-4 text-green-400" />
                  ) : stat.deltaType === 'neutral' ? (
                    <Activity className="w-4 h-4 text-blue-400" />
                  ) : (
                    <ArrowDownRight className="w-4 h-4 text-red-400" />
                  )}
                  <span className={`text-sm ${stat.deltaType === 'increase' ? 'text-green-400' : stat.deltaType === 'neutral' ? 'text-blue-400' : 'text-red-400'}`}>
                    {stat.delta}
                  </span>
                </div>
              </div>
              <div className="p-3 rounded-lg bg-slate-800">
                <stat.icon className={`w-6 h-6 text-${stat.color}-400`} />
              </div>
            </div>
            {/* Decorative gradient */}
            <div className={`absolute -bottom-2 -right-2 w-24 h-24 bg-${stat.color}-500/10 blur-2xl rounded-full`} />
          </div>
        ))}
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* User Growth Chart */}
        <div className="rounded-xl bg-slate-900/50 backdrop-blur-xl border border-purple-500/20 p-6">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h3 className="text-lg font-semibold text-white">User Growth</h3>
              <p className="text-sm text-gray-400">Monthly active users over time</p>
            </div>
            <div className="flex items-center space-x-2 text-sm">
              <span className="w-3 h-3 rounded-full bg-purple-500"></span>
              <span className="text-gray-400">Users</span>
            </div>
          </div>
          <AreaChart
            className="h-64"
            data={userGrowthData}
            index="date"
            categories={['users']}
            colors={['violet']}
            showAnimation={true}
            showLegend={false}
            showGridLines={false}
            curveType="natural"
          />
        </div>

        {/* Revenue Chart */}
        <div className="rounded-xl bg-slate-900/50 backdrop-blur-xl border border-purple-500/20 p-6">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h3 className="text-lg font-semibold text-white">Revenue</h3>
              <p className="text-sm text-gray-400">Monthly recurring revenue</p>
            </div>
            <div className="px-3 py-1 rounded-full bg-green-500/20 text-green-400 text-xs font-medium">
              ARR: $907K
            </div>
          </div>
          <AreaChart
            className="h-64"
            data={revenueData}
            index="date"
            categories={['revenue']}
            colors={['cyan']}
            showAnimation={true}
            showLegend={false}
            showGridLines={false}
            curveType="natural"
            valueFormatter={(value) => `$${(value / 1000).toFixed(1)}K`}
          />
        </div>
      </div>

      {/* Bottom Row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Subscription Distribution */}
        <div className="rounded-xl bg-slate-900/50 backdrop-blur-xl border border-purple-500/20 p-6">
          <h3 className="text-lg font-semibold text-white mb-2">Subscriptions by Tier</h3>
          <p className="text-sm text-gray-400 mb-6">Active subscription distribution</p>
          <DonutChart
            className="h-48"
            data={subscriptionData}
            category="value"
            index="name"
            colors={['slate', 'violet', 'indigo', 'cyan']}
            showAnimation={true}
            valueFormatter={(value) => `${value} users`}
          />
          <div className="mt-4 space-y-2">
            {subscriptionData.map((item, i) => (
              <div key={item.name} className="flex items-center justify-between text-sm">
                <div className="flex items-center space-x-2">
                  <span className={`w-2 h-2 rounded-full ${
                    ['bg-slate-500', 'bg-violet-500', 'bg-indigo-500', 'bg-cyan-500'][i]
                  }`}></span>
                  <span className="text-gray-400">{item.name}</span>
                </div>
                <span className="text-white font-medium">{item.value}</span>
              </div>
            ))}
          </div>
        </div>

        {/* AI Agents Status */}
        <div className="lg:col-span-2 rounded-xl bg-slate-900/50 backdrop-blur-xl border border-purple-500/20 p-6">
          <h3 className="text-lg font-semibold text-white mb-2">AI Agents</h3>
          <p className="text-sm text-gray-400 mb-6">7 autonomous agents powering the system</p>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {agents.map((agent) => (
              <div key={agent.name} className="flex items-center space-x-4 p-3 rounded-lg bg-slate-800/50">
                <div className={`w-3 h-3 rounded-full ${agent.status === 'active' ? 'bg-green-500' : 'bg-gray-500'}`} />
                <div className="flex-1">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-white font-medium font-mono text-sm">{agent.name}</span>
                    <span className="text-xs text-gray-500">{agent.role}</span>
                  </div>
                  <p className="text-xs text-gray-400">{agent.description}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Recent Activity */}
      <div className="rounded-xl bg-slate-900/50 backdrop-blur-xl border border-purple-500/20 p-6">
        <h3 className="text-lg font-semibold text-white mb-4">Recent Activity</h3>
        <div className="space-y-4">
          {[
            { action: 'New user registered', user: 'john.s@example.com', time: '2 minutes ago', type: 'user' },
            { action: 'Subscription upgraded to Operator', user: 'sarah.j@example.com', time: '15 minutes ago', type: 'upgrade' },
            { action: 'Broker connected', user: 'mike.w@example.com', time: '1 hour ago', type: 'broker' },
            { action: 'Agent MOMENTUM started', user: 'alex.c@example.com', time: '2 hours ago', type: 'agent' },
            { action: 'Withdrawal processed', user: 'emma.d@example.com', time: '3 hours ago', type: 'withdrawal' },
          ].map((item, i) => (
            <div key={i} className="flex items-center justify-between py-3 border-b border-purple-500/10 last:border-0">
              <div className="flex items-center space-x-3">
                <div className={`w-2 h-2 rounded-full ${
                  item.type === 'user' ? 'bg-blue-500' :
                  item.type === 'upgrade' ? 'bg-green-500' :
                  item.type === 'broker' ? 'bg-purple-500' :
                  item.type === 'agent' ? 'bg-cyan-500' :
                  'bg-yellow-500'
                }`} />
                <div>
                  <p className="text-white text-sm">{item.action}</p>
                  <p className="text-gray-500 text-xs">{item.user}</p>
                </div>
              </div>
              <span className="text-gray-500 text-xs">{item.time}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

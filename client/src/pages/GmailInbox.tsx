import React, { useState, useEffect } from 'react';
import { Mail, Zap, BarChart3, Settings, Plus, Play, Pause, Trash2, Edit, Clock, User, ChevronRight, Sparkles, Search, Filter } from 'lucide-react';

const AiAutomationDashboard = () => {
  const [activeTab, setActiveTab] = useState('inbox');
  const [emails, setEmails] = useState([
    { id: 1, from: 'john@example.com', subject: 'Meeting Request', snippet: 'Can we schedule a meeting next week to discuss...', date: new Date(), unread: true, labels: ['INBOX'] },
    { id: 2, from: 'sarah@company.com', subject: 'Project Update', snippet: 'The latest project milestone has been completed...', date: new Date(Date.now() - 3600000), unread: true, labels: ['INBOX'] },
    { id: 3, from: 'notifications@service.com', subject: 'Weekly Report', snippet: 'Your weekly analytics report is ready...', date: new Date(Date.now() - 7200000), unread: false, labels: ['INBOX'] }
  ]);
  
  const [automations, setAutomations] = useState([
    { id: 1, name: 'Auto-reply to Inquiries', trigger: 'New email with keyword "inquiry"', action: 'Send AI-generated response', status: 'active', executions: 24 },
    { id: 2, name: 'Categorize Support Emails', trigger: 'Email to support@', action: 'Label and prioritize', status: 'active', executions: 156 },
    { id: 3, name: 'Meeting Scheduler', trigger: 'Meeting request detected', action: 'Extract details & suggest times', status: 'paused', executions: 8 }
  ]);

  const [stats, setStats] = useState({
    emailsProcessed: 1247,
    automationsActive: 5,
    timeSaved: '23h',
    responseRate: 94
  });

  const toggleAutomation = (id) => {
    setAutomations(automations.map(auto => 
      auto.id === id ? { ...auto, status: auto.status === 'active' ? 'paused' : 'active' } : auto
    ));
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50">
      {/* Header */}
      <header className="bg-white border-b border-gray-200 sticky top-0 z-50 backdrop-blur-sm bg-white/90">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-gradient-to-br from-blue-600 to-indigo-600 rounded-xl flex items-center justify-center">
                <Sparkles className="w-6 h-6 text-white" />
              </div>
              <div>
                <h1 className="text-2xl font-bold bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent">
                  AI Automation Hub
                </h1>
                <p className="text-xs text-gray-500">Intelligent Email Workflow</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <button className="px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-100 rounded-lg transition-colors">
                <Settings className="w-4 h-4 inline mr-2" />
                Settings
              </button>
              <button className="px-4 py-2 bg-gradient-to-r from-blue-600 to-indigo-600 text-white text-sm font-medium rounded-lg hover:from-blue-700 hover:to-indigo-700 transition-all shadow-lg shadow-blue-500/30">
                <Plus className="w-4 h-4 inline mr-2" />
                New Automation
              </button>
            </div>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100 hover:shadow-md transition-shadow">
            <div className="flex items-center justify-between mb-4">
              <div className="w-12 h-12 bg-blue-100 rounded-xl flex items-center justify-center">
                <Mail className="w-6 h-6 text-blue-600" />
              </div>
              <span className="text-2xl font-bold text-gray-900">{stats.emailsProcessed}</span>
            </div>
            <h3 className="text-sm font-medium text-gray-600">Emails Processed</h3>
            <p className="text-xs text-green-600 mt-1">↑ 12% vs last week</p>
          </div>

          <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100 hover:shadow-md transition-shadow">
            <div className="flex items-center justify-between mb-4">
              <div className="w-12 h-12 bg-indigo-100 rounded-xl flex items-center justify-center">
                <Zap className="w-6 h-6 text-indigo-600" />
              </div>
              <span className="text-2xl font-bold text-gray-900">{stats.automationsActive}</span>
            </div>
            <h3 className="text-sm font-medium text-gray-600">Active Automations</h3>
            <p className="text-xs text-gray-500 mt-1">Running smoothly</p>
          </div>

          <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100 hover:shadow-md transition-shadow">
            <div className="flex items-center justify-between mb-4">
              <div className="w-12 h-12 bg-emerald-100 rounded-xl flex items-center justify-center">
                <Clock className="w-6 h-6 text-emerald-600" />
              </div>
              <span className="text-2xl font-bold text-gray-900">{stats.timeSaved}</span>
            </div>
            <h3 className="text-sm font-medium text-gray-600">Time Saved</h3>
            <p className="text-xs text-green-600 mt-1">This month</p>
          </div>

          <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100 hover:shadow-md transition-shadow">
            <div className="flex items-center justify-between mb-4">
              <div className="w-12 h-12 bg-purple-100 rounded-xl flex items-center justify-center">
                <BarChart3 className="w-6 h-6 text-purple-600" />
              </div>
              <span className="text-2xl font-bold text-gray-900">{stats.responseRate}%</span>
            </div>
            <h3 className="text-sm font-medium text-gray-600">Response Rate</h3>
            <p className="text-xs text-green-600 mt-1">↑ 5% improvement</p>
          </div>
        </div>

        {/* Navigation Tabs */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 mb-8">
          <div className="border-b border-gray-200">
            <nav className="flex gap-1 p-2">
              {[
                { id: 'inbox', label: 'Inbox', icon: Mail },
                { id: 'automations', label: 'Automations', icon: Zap },
                { id: 'analytics', label: 'Analytics', icon: BarChart3 }
              ].map(tab => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`flex items-center gap-2 px-6 py-3 text-sm font-medium rounded-xl transition-all ${
                    activeTab === tab.id
                      ? 'bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow-lg shadow-blue-500/30'
                      : 'text-gray-600 hover:bg-gray-50'
                  }`}
                >
                  <tab.icon className="w-4 h-4" />
                  {tab.label}
                </button>
              ))}
            </nav>
          </div>

          {/* Inbox Tab */}
          {activeTab === 'inbox' && (
            <div className="p-6">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-xl font-bold text-gray-900">Recent Emails</h2>
                <div className="flex gap-2">
                  <div className="relative">
                    <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                    <input
                      type="text"
                      placeholder="Search emails..."
                      className="pl-10 pr-4 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                  <button className="px-4 py-2 border border-gray-200 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors">
                    <Filter className="w-4 h-4 inline mr-2" />
                    Filter
                  </button>
                </div>
              </div>

              <div className="space-y-3">
                {emails.map(email => (
                  <div
                    key={email.id}
                    className={`group p-4 rounded-xl border transition-all hover:shadow-md cursor-pointer ${
                      email.unread
                        ? 'bg-blue-50 border-blue-200 hover:bg-blue-100'
                        : 'bg-white border-gray-200 hover:bg-gray-50'
                    }`}
                  >
                    <div className="flex items-start gap-4">
                      <div className={`w-10 h-10 rounded-full flex items-center justify-center text-sm font-semibold ${
                        email.unread ? 'bg-blue-600 text-white' : 'bg-gray-200 text-gray-600'
                      }`}>
                        {email.from[0].toUpperCase()}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between mb-1">
                          <h3 className={`font-semibold text-sm ${email.unread ? 'text-gray-900' : 'text-gray-700'}`}>
                            {email.subject}
                          </h3>
                          <div className="flex items-center gap-2 text-xs text-gray-500">
                            <Clock className="w-3 h-3" />
                            {email.date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          </div>
                        </div>
                        <div className="flex items-center gap-2 mb-2">
                          <User className="w-3 h-3 text-gray-400" />
                          <span className="text-sm text-gray-600">{email.from}</span>
                          {email.unread && (
                            <span className="px-2 py-0.5 bg-blue-600 text-white text-xs font-medium rounded-full">
                              New
                            </span>
                          )}
                        </div>
                        <p className="text-sm text-gray-600 line-clamp-1">{email.snippet}</p>
                      </div>
                      <ChevronRight className="w-5 h-5 text-gray-400 group-hover:text-gray-600 transition-colors" />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Automations Tab */}
          {activeTab === 'automations' && (
            <div className="p-6">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-xl font-bold text-gray-900">Your Automations</h2>
                <button className="px-4 py-2 bg-gradient-to-r from-blue-600 to-indigo-600 text-white text-sm font-medium rounded-lg hover:from-blue-700 hover:to-indigo-700 transition-all shadow-lg shadow-blue-500/30">
                  <Plus className="w-4 h-4 inline mr-2" />
                  Create Automation
                </button>
              </div>

              <div className="space-y-4">
                {automations.map(automation => (
                  <div
                    key={automation.id}
                    className="bg-white border border-gray-200 rounded-xl p-5 hover:shadow-md transition-all"
                  >
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex items-start gap-3 flex-1">
                        <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${
                          automation.status === 'active' ? 'bg-green-100' : 'bg-gray-100'
                        }`}>
                          <Zap className={`w-5 h-5 ${
                            automation.status === 'active' ? 'text-green-600' : 'text-gray-400'
                          }`} />
                        </div>
                        <div className="flex-1">
                          <h3 className="font-semibold text-gray-900 mb-1">{automation.name}</h3>
                          <div className="space-y-1">
                            <div className="flex items-center gap-2 text-sm text-gray-600">
                              <span className="font-medium">Trigger:</span>
                              <span>{automation.trigger}</span>
                            </div>
                            <div className="flex items-center gap-2 text-sm text-gray-600">
                              <span className="font-medium">Action:</span>
                              <span>{automation.action}</span>
                            </div>
                          </div>
                          <div className="flex items-center gap-4 mt-3">
                            <span className={`px-3 py-1 rounded-full text-xs font-medium ${
                              automation.status === 'active'
                                ? 'bg-green-100 text-green-700'
                                : 'bg-gray-100 text-gray-600'
                            }`}>
                              {automation.status === 'active' ? '● Active' : '○ Paused'}
                            </span>
                            <span className="text-xs text-gray-500">
                              {automation.executions} executions
                            </span>
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => toggleAutomation(automation.id)}
                          className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                          title={automation.status === 'active' ? 'Pause' : 'Resume'}
                        >
                          {automation.status === 'active' ? (
                            <Pause className="w-4 h-4 text-gray-600" />
                          ) : (
                            <Play className="w-4 h-4 text-gray-600" />
                          )}
                        </button>
                        <button className="p-2 hover:bg-gray-100 rounded-lg transition-colors" title="Edit">
                          <Edit className="w-4 h-4 text-gray-600" />
                        </button>
                        <button className="p-2 hover:bg-red-50 rounded-lg transition-colors" title="Delete">
                          <Trash2 className="w-4 h-4 text-red-600" />
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Analytics Tab */}
          {activeTab === 'analytics' && (
            <div className="p-6">
              <h2 className="text-xl font-bold text-gray-900 mb-6">Performance Analytics</h2>
              
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
                <div className="bg-gradient-to-br from-blue-50 to-indigo-50 rounded-xl p-6 border border-blue-100">
                  <h3 className="font-semibold text-gray-900 mb-4">Email Processing Trends</h3>
                  <div className="space-y-4">
                    {['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'].map((day, idx) => (
                      <div key={day}>
                        <div className="flex items-center justify-between text-sm mb-1">
                          <span className="text-gray-600">{day}</span>
                          <span className="font-semibold text-gray-900">{250 - idx * 20}</span>
                        </div>
                        <div className="w-full bg-white rounded-full h-2 overflow-hidden">
                          <div
                            className="bg-gradient-to-r from-blue-600 to-indigo-600 h-full rounded-full transition-all"
                            style={{ width: `${100 - idx * 10}%` }}
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="bg-gradient-to-br from-purple-50 to-pink-50 rounded-xl p-6 border border-purple-100">
                  <h3 className="font-semibold text-gray-900 mb-4">Top Automations</h3>
                  <div className="space-y-3">
                    {automations.slice(0, 3).map((auto, idx) => (
                      <div key={auto.id} className="flex items-center gap-3 bg-white rounded-lg p-3">
                        <div className="w-8 h-8 bg-purple-100 rounded-lg flex items-center justify-center">
                          <span className="font-bold text-purple-600 text-sm">#{idx + 1}</span>
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-gray-900 truncate">{auto.name}</p>
                          <p className="text-xs text-gray-500">{auto.executions} executions</p>
                        </div>
                        <Zap className="w-4 h-4 text-purple-600" />
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              <div className="bg-gradient-to-br from-emerald-50 to-teal-50 rounded-xl p-6 border border-emerald-100">
                <h3 className="font-semibold text-gray-900 mb-4">Success Metrics</h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  <div className="text-center">
                    <div className="text-3xl font-bold text-emerald-600 mb-1">98.5%</div>
                    <div className="text-sm text-gray-600">Success Rate</div>
                  </div>
                  <div className="text-center">
                    <div className="text-3xl font-bold text-teal-600 mb-1">1.2s</div>
                    <div className="text-sm text-gray-600">Avg Response Time</div>
                  </div>
                  <div className="text-center">
                    <div className="text-3xl font-bold text-cyan-600 mb-1">847</div>
                    <div className="text-sm text-gray-600">Tasks Completed</div>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default AiAutomationDashboard;
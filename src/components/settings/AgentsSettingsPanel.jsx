import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Save, Bot, Calculator, FileSearch } from 'lucide-react';
import { CompanySettings } from '@/api/entities';
import { useAuth } from '@/components/auth/AuthProvider';
import { useGlobalData } from '@/components/GlobalDataContext';

export default function AgentsSettingsPanel() {
  const { user } = useAuth();
  const { companyData, refreshData } = useGlobalData();
  const [agents, setAgents] = useState([
    {
      id: 'auditor',
      name: 'Auditor',
      description: 'Reviews jobs and invoices for errors, inconsistencies, and potential issues',
      icon: FileSearch,
      enabled: false
    },
    {
      id: 'accountant',
      name: 'Accountant',
      description: 'Manages financial data, generates reports, and tracks payments',
      icon: Calculator,
      enabled: false
    }
  ]);
  const [isSaving, setIsSaving] = useState(false);

  // Load settings on mount
  useEffect(() => {
    const loadSettings = async () => {
      try {
        const settings = await CompanySettings.filter({ setting_key: 'ai_agents' });
        if (settings.length > 0 && settings[0].setting_value?.agents) {
          const savedAgents = settings[0].setting_value.agents;
          setAgents(prev => prev.map(agent => {
            const savedAgent = savedAgents.find(a => a.id === agent.id);
            return savedAgent ? { ...agent, enabled: savedAgent.enabled } : agent;
          }));
        }
      } catch (error) {
        console.error('Error loading agent settings:', error);
      }
    };
    loadSettings();
  }, []);

  const toggleAgent = (agentId) => {
    setAgents(prev => prev.map(agent =>
      agent.id === agentId ? { ...agent, enabled: !agent.enabled } : agent
    ));
  };

  const handleSave = async () => {
    if (!user?.company_id) {
      alert('No company associated with user');
      return;
    }

    setIsSaving(true);
    try {
      // Save agents as simplified array (without icon)
      const agentsToSave = agents.map(({ id, name, description, enabled }) => ({
        id,
        name,
        description,
        enabled
      }));

      const existingSettings = await CompanySettings.filter({ setting_key: 'ai_agents' });
      if (existingSettings.length > 0) {
        await CompanySettings.update(existingSettings[0].id, {
          setting_value: { agents: agentsToSave }
        });
      } else {
        await CompanySettings.create({
          setting_key: 'ai_agents',
          setting_value: { agents: agentsToSave }
        });
      }

      await refreshData();
      alert('Agent settings saved successfully!');
    } catch (error) {
      console.error('Error saving agent settings:', error);
      alert('Failed to save agent settings');
    }
    setIsSaving(false);
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Bot className="w-5 h-5" />
            AI Agents
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-slate-600 mb-6">
            Enable AI agents to help automate and enhance your workflow. You can toggle individual agents on or off.
          </p>

          <div className="space-y-4">
            {agents.map((agent) => {
              const IconComponent = agent.icon;
              return (
                <div
                  key={agent.id}
                  className="flex items-start justify-between p-4 border border-slate-200 rounded-lg hover:border-slate-300 transition-colors"
                >
                  <div className="flex items-start gap-3 flex-1">
                    <div className="mt-1">
                      <IconComponent className="w-5 h-5 text-slate-600" />
                    </div>
                    <div className="space-y-1">
                      <div className="font-medium text-slate-900">{agent.name}</div>
                      <p className="text-sm text-slate-500">{agent.description}</p>
                    </div>
                  </div>
                  <Switch
                    checked={agent.enabled}
                    onCheckedChange={() => toggleAgent(agent.id)}
                  />
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      <div className="flex justify-end">
        <Button onClick={handleSave} disabled={isSaving} className="gap-2">
          <Save className="w-4 h-4" />
          {isSaving ? 'Saving...' : 'Save Agent Settings'}
        </Button>
      </div>
    </div>
  );
}

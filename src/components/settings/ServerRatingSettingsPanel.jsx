import React, { useState, useEffect } from 'react';
import { CompanySettings } from '@/api/entities';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Slider } from '@/components/ui/slider';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/components/ui/use-toast';
import {
  Loader2,
  Save,
  Star,
  Clock,
  DollarSign,
  FileSignature,
  Target,
  CheckCircle,
  Smartphone,
  Info
} from 'lucide-react';

const defaultWeights = {
  completion_time: 3,
  profit_margin: 3,
  affidavit_turnaround: 3,
  first_attempt_timing: 3,
  acceptance_rate: 0,
  mobile_app_usage: 0
};

const ratingFactors = [
  {
    key: 'completion_time',
    label: 'Completion Time',
    description: 'How quickly servers complete assigned jobs. Faster completion = higher rating.',
    icon: Clock,
    available: true,
    color: 'blue'
  },
  {
    key: 'profit_margin',
    label: 'Profit Margin',
    description: 'Difference between client billing and server pay. Higher margin = higher rating.',
    icon: DollarSign,
    available: true,
    color: 'green'
  },
  {
    key: 'affidavit_turnaround',
    label: 'Affidavit Turnaround',
    description: 'Time from service completion to signed affidavit. Faster turnaround = higher rating.',
    icon: FileSignature,
    available: true,
    color: 'purple'
  },
  {
    key: 'first_attempt_timing',
    label: '1st Attempt Timing',
    description: 'Meeting first attempt deadlines (routine: 3 days, rush: 1 day). On-time = higher rating.',
    icon: Target,
    available: true,
    color: 'orange'
  },
  {
    key: 'acceptance_rate',
    label: 'Acceptance Rate',
    description: 'Rate of accepting vs declining assigned jobs. Higher acceptance = higher rating.',
    icon: CheckCircle,
    available: false,
    color: 'slate'
  },
  {
    key: 'mobile_app_usage',
    label: 'Mobile App Usage',
    description: 'Photo documentation and GPS tracking via mobile app. More usage = higher rating.',
    icon: Smartphone,
    available: false,
    color: 'slate'
  }
];

export default function ServerRatingSettingsPanel() {
  const { toast } = useToast();
  const [weights, setWeights] = useState(defaultWeights);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [settingsId, setSettingsId] = useState(null);

  useEffect(() => {
    const fetchSettings = async () => {
      setIsLoading(true);
      try {
        const result = await CompanySettings.filter({ setting_key: 'server_rating_weights' });
        if (result && result.length > 0) {
          const fetched = result[0];
          setWeights({ ...defaultWeights, ...fetched.setting_value.weights });
          setSettingsId(fetched.id);
        }
      } catch (error) {
        console.error("Error fetching server rating settings:", error);
      }
      setIsLoading(false);
    };
    fetchSettings();
  }, []);

  const handleSave = async () => {
    setIsSaving(true);
    try {
      const dataToSave = {
        setting_key: 'server_rating_weights',
        setting_value: {
          weights,
          updated_at: new Date().toISOString()
        }
      };

      if (settingsId) {
        await CompanySettings.update(settingsId, dataToSave);
      } else {
        const newSetting = await CompanySettings.create(dataToSave);
        setSettingsId(newSetting.id);
      }

      toast({
        title: "Settings Saved",
        description: "Server rating settings saved successfully!"
      });
    } catch (error) {
      console.error("Error saving settings:", error);
      toast({
        title: "Error",
        description: "Failed to save settings: " + error.message,
        variant: "destructive"
      });
    }
    setIsSaving(false);
  };

  const handleWeightChange = (key, value) => {
    setWeights(prev => ({
      ...prev,
      [key]: value[0]
    }));
  };

  const getWeightLabel = (value) => {
    const labels = ['Off', 'Low', 'Medium', 'High', 'Very High', 'Maximum'];
    return labels[value] || 'Unknown';
  };

  const getColorClasses = (color, available) => {
    if (!available) return 'bg-slate-100 text-slate-400';

    const colors = {
      blue: 'bg-blue-100 text-blue-600',
      green: 'bg-green-100 text-green-600',
      purple: 'bg-purple-100 text-purple-600',
      orange: 'bg-orange-100 text-orange-600',
      slate: 'bg-slate-100 text-slate-400'
    };
    return colors[color] || colors.slate;
  };

  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-64">
        <Loader2 className="w-8 h-8 animate-spin text-slate-400" />
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto space-y-8">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold flex items-center gap-2">
            <Star className="w-6 h-6 text-amber-500" />
            Server Rating
          </h2>
          <p className="text-slate-600">
            Customize how server performance ratings are calculated. Higher weights = more impact on the rating.
          </p>
        </div>
        <Button onClick={handleSave} disabled={isSaving} className="gap-2">
          {isSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
          {isSaving ? 'Saving...' : 'Save Changes'}
        </Button>
      </div>

      {/* Info Card */}
      <Card className="bg-blue-50 border-blue-200">
        <CardContent className="p-4">
          <div className="flex items-start gap-3">
            <Info className="w-5 h-5 text-blue-600 mt-0.5" />
            <div className="text-sm text-blue-800">
              <p className="font-medium mb-1">How Rating Works</p>
              <p>Each factor contributes to a server's overall rating (0-5 stars). Set weights from 0 (disabled) to 5 (maximum impact). The final rating is a weighted average of all enabled factors.</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Rating Factors */}
      <div className="space-y-4">
        {ratingFactors.map((factor) => {
          const Icon = factor.icon;
          const currentWeight = weights[factor.key];

          return (
            <Card
              key={factor.key}
              className={`transition-all ${!factor.available ? 'opacity-60' : ''}`}
            >
              <CardContent className="p-6">
                <div className="flex items-start gap-4">
                  {/* Icon */}
                  <div className={`w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0 ${getColorClasses(factor.color, factor.available)}`}>
                    <Icon className="w-6 h-6" />
                  </div>

                  {/* Content */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <h3 className="font-semibold text-slate-900">{factor.label}</h3>
                      {!factor.available && (
                        <Badge variant="secondary" className="text-xs">Coming Soon</Badge>
                      )}
                    </div>
                    <p className="text-sm text-slate-500 mb-4">{factor.description}</p>

                    {/* Slider */}
                    <div className="flex items-center gap-4">
                      <div className="flex-1">
                        <Slider
                          min={0}
                          max={5}
                          step={1}
                          value={[currentWeight]}
                          onValueChange={(value) => handleWeightChange(factor.key, value)}
                          disabled={!factor.available}
                          className={!factor.available ? 'opacity-50' : ''}
                        />
                        {/* Scale Labels */}
                        <div className="flex justify-between mt-1 text-xs text-slate-400">
                          <span>Off</span>
                          <span>Low</span>
                          <span>Med</span>
                          <span>High</span>
                          <span>V.High</span>
                          <span>Max</span>
                        </div>
                      </div>

                      {/* Current Value */}
                      <div className="w-20 text-right">
                        <span className={`inline-flex items-center justify-center w-10 h-10 rounded-lg font-bold text-lg ${
                          factor.available && currentWeight > 0
                            ? 'bg-slate-900 text-white'
                            : 'bg-slate-200 text-slate-400'
                        }`}>
                          {currentWeight}
                        </span>
                        <p className="text-xs text-slate-500 mt-1">{getWeightLabel(currentWeight)}</p>
                      </div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Summary */}
      <Card className="bg-slate-50">
        <CardContent className="p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="font-medium text-slate-700">Active Factors</p>
              <p className="text-sm text-slate-500">
                {ratingFactors.filter(f => f.available && weights[f.key] > 0).length} of {ratingFactors.filter(f => f.available).length} available factors enabled
              </p>
            </div>
            <Button onClick={handleSave} disabled={isSaving} className="gap-2">
              {isSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
              {isSaving ? 'Saving...' : 'Save Changes'}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

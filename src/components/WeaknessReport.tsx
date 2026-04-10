import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { SubjectStrength, TopicStrength } from '@/hooks/useWeaknessAnalysis';
import { AlertTriangle, TrendingUp, Zap, Shield, Star } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { Button } from './ui/button';

const levelConfig = {
  critical: { color: 'text-destructive', bg: 'bg-destructive/10 border-destructive/30', icon: '🔴', bar: 'bg-destructive', label: 'Critical' },
  weak: { color: 'text-warning', bg: 'bg-warning/10 border-warning/30', icon: '🟠', bar: 'bg-warning', label: 'Needs Work' },
  average: { color: 'text-info', bg: 'bg-info/10 border-info/30', icon: '🟡', bar: 'bg-info', label: 'Average' },
  strong: { color: 'text-success', bg: 'bg-success/10 border-success/30', icon: '🟢', bar: 'bg-success', label: 'Strong' },
  excellent: { color: 'text-secondary', bg: 'bg-secondary/10 border-secondary/30', icon: '⭐', bar: 'bg-secondary', label: 'Excellent' },
};

interface Props {
  subjects: SubjectStrength[];
  weakTopics: TopicStrength[];
  overallAccuracy: number;
  hasEnoughData: boolean;
  compact?: boolean;
}

export const WeaknessReport: React.FC<Props> = ({ subjects, weakTopics, overallAccuracy, hasEnoughData, compact }) => {
  const navigate = useNavigate();

  if (!hasEnoughData) {
    return (
      <Card className="border-0 shadow-md">
        <CardContent className="p-6 text-center">
          <div className="w-14 h-14 rounded-2xl gradient-primary flex items-center justify-center mx-auto mb-4">
            <Zap className="h-7 w-7 text-primary-foreground" />
          </div>
          <p className="font-display font-semibold text-foreground mb-1">No data yet</p>
          <p className="text-sm text-muted-foreground mb-4">Take at least 2 quizzes to unlock your personalized weakness analysis.</p>
          <Button variant="hero" size="sm" onClick={() => navigate('/quiz')}>Take a Quiz Now</Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {/* Subject grid */}
      <div className={`grid gap-3 ${compact ? 'grid-cols-1' : 'grid-cols-1 md:grid-cols-2'}`}>
        {subjects.map(s => {
          const cfg = levelConfig[s.level];
          return (
            <div key={s.subject} className={`p-4 rounded-xl border ${cfg.bg} transition-all hover:scale-[1.01]`}>
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <span className="text-lg">{cfg.icon}</span>
                  <span className="font-semibold text-foreground text-sm">{s.subject}</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${cfg.bg} ${cfg.color} border ${cfg.bg.includes('border') ? '' : ''}`}>{cfg.label}</span>
                  <span className={`text-lg font-display font-bold ${cfg.color}`}>{s.accuracy}%</span>
                </div>
              </div>
              <div className="w-full bg-muted rounded-full h-2 overflow-hidden">
                <div
                  className={`h-2 rounded-full transition-all duration-700 ${cfg.bar}`}
                  style={{ width: `${s.accuracy}%` }}
                />
              </div>
              <div className="flex items-center justify-between mt-1.5">
                <span className="text-xs text-muted-foreground">{s.totalCorrect}/{s.totalQuestions} correct</span>
                <span className="text-xs text-muted-foreground">{s.quizCount} quiz{s.quizCount !== 1 ? 'zes' : ''}</span>
              </div>
              {/* Topic breakdowns if any */}
              {!compact && s.topicBreakdown.length > 0 && (
                <div className="mt-3 space-y-1.5 border-t border-border/50 pt-2">
                  {s.topicBreakdown.slice(0, 3).map(t => (
                    <div key={t.topic} className="flex items-center justify-between">
                      <span className="text-xs text-muted-foreground truncate mr-2">{t.topic}</span>
                      <div className="flex items-center gap-1.5">
                        <div className="w-16 bg-muted rounded-full h-1 overflow-hidden">
                          <div className={`h-1 rounded-full ${levelConfig[t.level].bar}`} style={{ width: `${t.accuracy}%` }} />
                        </div>
                        <span className={`text-xs font-medium ${levelConfig[t.level].color}`}>{t.accuracy}%</span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Critical topics */}
      {weakTopics.length > 0 && (
        <div className="p-4 rounded-xl border bg-destructive/5 border-destructive/20">
          <div className="flex items-center gap-2 mb-3">
            <AlertTriangle className="h-4 w-4 text-destructive" />
            <p className="font-semibold text-sm text-foreground">Topics Needing Immediate Attention</p>
          </div>
          <div className="flex flex-wrap gap-2">
            {weakTopics.slice(0, 8).map(t => (
              <span
                key={`${t.subject}-${t.topic}`}
                className={`text-xs px-2.5 py-1 rounded-full border font-medium ${levelConfig[t.level].bg} ${levelConfig[t.level].color}`}
              >
                {t.topic} ({t.accuracy}%)
              </span>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

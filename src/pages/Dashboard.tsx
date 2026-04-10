import React, { useEffect, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useNavigate } from 'react-router-dom';
import {
  BookOpen, PenTool, MessageSquare, BarChart3, Layers,
  TrendingUp, Clock, Target, Flame, Brain
} from 'lucide-react';
import { useWeaknessAnalysis } from '@/hooks/useWeaknessAnalysis';
import { WeaknessReport } from '@/components/WeaknessReport';

const Dashboard: React.FC = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [profile, setProfile] = useState<any>(null);
  const [stats, setStats] = useState({ quizzes: 0, studyHours: 0, accuracy: 0, streak: 0 });
  const [todayPlans, setTodayPlans] = useState<any[]>([]);
  const weakness = useWeaknessAnalysis();

  useEffect(() => {
    if (!user) return;
    const fetchData = async () => {
      const { data: profileData } = await supabase
        .from('profiles')
        .select('*')
        .eq('user_id', user.id)
        .single();
      setProfile(profileData);

      const { data: attempts } = await supabase
        .from('quiz_attempts')
        .select('*')
        .eq('user_id', user.id);

      const totalQuizzes = attempts?.length || 0;
      const totalCorrect = attempts?.reduce((sum, a) => sum + a.score, 0) || 0;
      const totalQuestions = attempts?.reduce((sum, a) => sum + a.total_questions, 0) || 1;

      const { data: sessions } = await supabase
        .from('study_sessions')
        .select('*')
        .eq('user_id', user.id);
      const totalMinutes = sessions?.reduce((sum, s) => sum + s.duration_minutes, 0) || 0;

      setStats({
        quizzes: totalQuizzes,
        studyHours: Math.round(totalMinutes / 60 * 10) / 10,
        accuracy: totalQuestions > 0 ? Math.round((totalCorrect / totalQuestions) * 100) : 0,
        streak: Math.min(totalQuizzes, 7),
      });

      const today = new Date().toISOString().split('T')[0];
      const { data: plans } = await supabase
        .from('study_plans')
        .select('*')
        .eq('user_id', user.id)
        .eq('scheduled_date', today)
        .order('created_at');
      setTodayPlans(plans || []);
    };
    fetchData();
  }, [user]);

  const displayName = profile?.display_name || user?.email?.split('@')[0] || 'Student';

  const statCards = [
    { icon: PenTool, label: 'Quizzes Taken', value: stats.quizzes, color: 'text-primary' },
    { icon: Clock, label: 'Study Hours', value: stats.studyHours, color: 'text-secondary' },
    { icon: Target, label: 'Accuracy', value: `${stats.accuracy}%`, color: 'text-success' },
    { icon: Flame, label: 'Day Streak', value: stats.streak, color: 'text-accent' },
  ];

  const quickActions = [
    { icon: BookOpen, label: 'Study Plan', to: '/study-plan', desc: 'View your schedule' },
    { icon: PenTool, label: 'Take Quiz', to: '/quiz', desc: 'Practice questions' },
    { icon: Layers, label: 'Revision', to: '/revision', desc: 'Flashcards & review' },
    { icon: MessageSquare, label: 'AI Tutor', to: '/ai-tutor', desc: 'Ask doubts' },
    { icon: BarChart3, label: 'Analytics', to: '/analytics', desc: 'Track progress' },
  ];

  return (
    <div className="space-y-8 max-w-6xl mx-auto animate-fade-in">
      {/* Welcome */}
      <div className="gradient-hero rounded-2xl p-8 text-primary-foreground">
        <h1 className="text-3xl font-display font-bold">Welcome back, {displayName}! 👋</h1>
        <p className="mt-2 text-primary-foreground/80">
          {profile?.exam_goal ? `Preparing for: ${profile.exam_goal}` : 'Ready to ace your exams? Let\'s get started!'}
        </p>
        {weakness.hasEnoughData && weakness.weakSubjects.length > 0 && (
          <div className="mt-3 flex items-center gap-2 text-sm text-primary-foreground/90">
            <Brain className="h-4 w-4" />
            <span>Focus areas: <strong>{weakness.weakSubjects.map(s => s.subject).join(', ')}</strong></span>
          </div>
        )}
        {!profile?.diagnostic_completed && (
          <Button variant="secondary" className="mt-4" onClick={() => navigate('/quiz?diagnostic=true')}>
            Take Diagnostic Test
          </Button>
        )}
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {statCards.map(({ icon: Icon, label, value, color }) => (
          <Card key={label} className="border-0 shadow-md">
            <CardContent className="p-5">
              <div className="flex items-center gap-3">
                <div className={`rounded-lg bg-muted p-2 ${color}`}>
                  <Icon className="h-5 w-5" />
                </div>
                <div>
                  <p className="text-2xl font-display font-bold text-foreground">{value}</p>
                  <p className="text-xs text-muted-foreground">{label}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Weakness Quick View */}
      {weakness.hasEnoughData && (
        <Card className="border-0 shadow-md">
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="font-display flex items-center gap-2">
              <Brain className="h-5 w-5 text-primary" /> Your Strength Map
            </CardTitle>
            <Button variant="outline" size="sm" onClick={() => navigate('/study-plan')}>
              Generate Smart Plan →
            </Button>
          </CardHeader>
          <CardContent>
            <WeaknessReport
              subjects={weakness.subjects}
              weakTopics={weakness.weakTopics}
              overallAccuracy={weakness.overallAccuracy}
              hasEnoughData={weakness.hasEnoughData}
              compact
            />
          </CardContent>
        </Card>
      )}

      {/* Today's plan */}
      <Card className="border-0 shadow-md">
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="font-display">Today's Study Plan</CardTitle>
          <Button variant="outline" size="sm" onClick={() => navigate('/study-plan')}>View All</Button>
        </CardHeader>
        <CardContent>
          {todayPlans.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <BookOpen className="h-10 w-10 mx-auto mb-3 opacity-40" />
              <p>No study plans for today.</p>
              <Button variant="hero" size="sm" className="mt-3" onClick={() => navigate('/study-plan')}>
                Create Study Plan
              </Button>
            </div>
          ) : (
            <div className="space-y-3">
              {todayPlans.map(plan => (
                <div key={plan.id} className="flex items-center gap-4 p-4 rounded-lg bg-muted/50">
                  <div className="flex-1">
                    <p className="font-medium text-foreground">{plan.title}</p>
                    <p className="text-sm text-muted-foreground">{plan.subject} • {plan.duration_minutes} min</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className={`text-xs px-2 py-1 rounded-full ${
                      plan.status === 'completed' ? 'bg-success/10 text-success' :
                      plan.status === 'in_progress' ? 'bg-info/10 text-info' :
                      'bg-muted text-muted-foreground'
                    }`}>
                      {plan.status}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Quick actions */}
      <div>
        <h2 className="text-lg font-display font-semibold mb-4 text-foreground">Quick Actions</h2>
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
          {quickActions.map(({ icon: Icon, label, to, desc }) => (
            <Card
              key={to}
              className="border-0 shadow-md cursor-pointer hover:shadow-lg transition-shadow group"
              onClick={() => navigate(to)}
            >
              <CardContent className="p-5 text-center">
                <div className="rounded-xl bg-muted p-3 w-fit mx-auto mb-3 group-hover:gradient-primary group-hover:text-primary-foreground transition-colors">
                  <Icon className="h-6 w-6" />
                </div>
                <p className="font-medium text-sm text-foreground">{label}</p>
                <p className="text-xs text-muted-foreground mt-1">{desc}</p>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </div>
  );
};

export default Dashboard;

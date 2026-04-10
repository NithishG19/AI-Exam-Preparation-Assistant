import React, { useEffect, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, LineChart, Line, PieChart, Pie, Cell } from 'recharts';
import { TrendingUp, Target, Clock, BookOpen } from 'lucide-react';

const COLORS = ['hsl(249, 76%, 55%)', 'hsl(172, 66%, 50%)', 'hsl(38, 92%, 55%)', 'hsl(152, 60%, 45%)', 'hsl(210, 80%, 55%)', 'hsl(0, 72%, 55%)'];

const AnalyticsPage: React.FC = () => {
  const { user } = useAuth();
  const [attempts, setAttempts] = useState<any[]>([]);
  const [sessions, setSessions] = useState<any[]>([]);

  useEffect(() => {
    if (!user) return;
    const fetch = async () => {
      const { data: att } = await supabase.from('quiz_attempts').select('*').eq('user_id', user.id).order('created_at');
      setAttempts(att || []);
      const { data: sess } = await supabase.from('study_sessions').select('*').eq('user_id', user.id).order('created_at');
      setSessions(sess || []);
    };
    fetch();
  }, [user]);

  // Subject-wise accuracy
  const subjectStats: Record<string, { correct: number; total: number }> = {};
  attempts.forEach(a => {
    if (!subjectStats[a.subject]) subjectStats[a.subject] = { correct: 0, total: 0 };
    subjectStats[a.subject].correct += a.score;
    subjectStats[a.subject].total += a.total_questions;
  });
  const subjectData = Object.entries(subjectStats).map(([subject, { correct, total }]) => ({
    subject,
    accuracy: total > 0 ? Math.round((correct / total) * 100) : 0,
  }));

  // Progress over time
  const progressData = attempts.map((a, i) => ({
    quiz: `Quiz ${i + 1}`,
    score: Math.round((a.score / a.total_questions) * 100),
  }));

  // Study time by subject
  const studyTimeBySubject: Record<string, number> = {};
  sessions.forEach(s => {
    studyTimeBySubject[s.subject] = (studyTimeBySubject[s.subject] || 0) + s.duration_minutes;
  });
  const studyTimePie = Object.entries(studyTimeBySubject).map(([name, value]) => ({ name, value }));

  // Overall stats
  const totalQuizzes = attempts.length;
  const avgAccuracy = attempts.length > 0
    ? Math.round(attempts.reduce((s, a) => s + (a.score / a.total_questions) * 100, 0) / attempts.length)
    : 0;
  const totalStudyMins = sessions.reduce((s, a) => s + a.duration_minutes, 0);
  const totalStudyHours = Math.round(totalStudyMins / 60 * 10) / 10;

  // Weak topics
  const weakSubjects = subjectData.filter(s => s.accuracy < 60).map(s => s.subject);

  return (
    <div className="max-w-6xl mx-auto space-y-6 animate-fade-in">
      <div>
        <h1 className="text-2xl font-display font-bold text-foreground">Performance Analytics</h1>
        <p className="text-muted-foreground">Track your progress and identify weak areas</p>
      </div>

      {/* Overview stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { icon: Target, label: 'Avg Accuracy', value: `${avgAccuracy}%`, color: 'text-primary' },
          { icon: BookOpen, label: 'Quizzes Taken', value: totalQuizzes, color: 'text-secondary' },
          { icon: Clock, label: 'Study Hours', value: totalStudyHours, color: 'text-success' },
          { icon: TrendingUp, label: 'Subjects', value: subjectData.length, color: 'text-accent' },
        ].map(({ icon: Icon, label, value, color }) => (
          <Card key={label} className="border-0 shadow-md">
            <CardContent className="p-5">
              <div className="flex items-center gap-3">
                <div className={`rounded-lg bg-muted p-2 ${color}`}><Icon className="h-5 w-5" /></div>
                <div>
                  <p className="text-2xl font-display font-bold text-foreground">{value}</p>
                  <p className="text-xs text-muted-foreground">{label}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Subject accuracy */}
        <Card className="border-0 shadow-md">
          <CardHeader><CardTitle className="font-display text-lg">Subject-wise Accuracy</CardTitle></CardHeader>
          <CardContent>
            {subjectData.length === 0 ? (
              <p className="text-center text-muted-foreground py-8">Take some quizzes to see data</p>
            ) : (
              <ResponsiveContainer width="100%" height={250}>
                <BarChart data={subjectData}>
                  <XAxis dataKey="subject" tick={{ fontSize: 12 }} />
                  <YAxis domain={[0, 100]} tick={{ fontSize: 12 }} />
                  <Tooltip />
                  <Bar dataKey="accuracy" fill="hsl(249, 76%, 55%)" radius={[6, 6, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>

        {/* Progress over time */}
        <Card className="border-0 shadow-md">
          <CardHeader><CardTitle className="font-display text-lg">Quiz Score Trend</CardTitle></CardHeader>
          <CardContent>
            {progressData.length === 0 ? (
              <p className="text-center text-muted-foreground py-8">Take some quizzes to see data</p>
            ) : (
              <ResponsiveContainer width="100%" height={250}>
                <LineChart data={progressData}>
                  <XAxis dataKey="quiz" tick={{ fontSize: 12 }} />
                  <YAxis domain={[0, 100]} tick={{ fontSize: 12 }} />
                  <Tooltip />
                  <Line type="monotone" dataKey="score" stroke="hsl(172, 66%, 50%)" strokeWidth={2} dot={{ r: 4 }} />
                </LineChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>

        {/* Study time pie */}
        <Card className="border-0 shadow-md">
          <CardHeader><CardTitle className="font-display text-lg">Study Time Distribution</CardTitle></CardHeader>
          <CardContent>
            {studyTimePie.length === 0 ? (
              <p className="text-center text-muted-foreground py-8">Study more to see data</p>
            ) : (
              <ResponsiveContainer width="100%" height={250}>
                <PieChart>
                  <Pie data={studyTimePie} cx="50%" cy="50%" outerRadius={80} dataKey="value" label={({ name, value }) => `${name}: ${value}m`}>
                    {studyTimePie.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>

        {/* Weak areas & recommendations */}
        <Card className="border-0 shadow-md">
          <CardHeader><CardTitle className="font-display text-lg">Recommendations</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            {weakSubjects.length > 0 ? (
              <>
                <p className="text-sm text-muted-foreground">Focus on these weak areas:</p>
                {weakSubjects.map(s => (
                  <div key={s} className="p-3 rounded-lg bg-destructive/5 border border-destructive/20">
                    <p className="font-medium text-foreground text-sm">📌 {s}</p>
                    <p className="text-xs text-muted-foreground mt-1">Accuracy below 60%. Practice more questions in this subject.</p>
                  </div>
                ))}
              </>
            ) : attempts.length > 0 ? (
              <div className="p-3 rounded-lg bg-success/5 border border-success/20">
                <p className="font-medium text-foreground text-sm">🎉 Great job!</p>
                <p className="text-xs text-muted-foreground mt-1">All subjects above 60% accuracy. Keep it up!</p>
              </div>
            ) : (
              <p className="text-center text-muted-foreground py-8">Take quizzes to get recommendations</p>
            )}

            <div className="pt-3 space-y-2">
              <p className="text-sm font-medium text-foreground">Study Resources</p>
              {['Khan Academy - Free courses', 'MIT OpenCourseWare', 'Coursera - Practice sets'].map(r => (
                <div key={r} className="p-2 rounded bg-muted/50 text-sm text-muted-foreground">📚 {r}</div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default AnalyticsPage;
